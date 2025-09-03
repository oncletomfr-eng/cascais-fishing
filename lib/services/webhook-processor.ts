/**
 * Enhanced Webhook Processing Service
 * Task 5.4: Webhook Processing System
 * 
 * Provides retry logic, event logging, notification sending,
 * and comprehensive webhook event management
 */

import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { webhookNotificationService } from './webhook-notifications';
import Stripe from 'stripe';

/**
 * Webhook Event Log for tracking and debugging
 */
export interface WebhookEventLog {
  id: string;
  eventType: string;
  eventId: string;
  status: 'received' | 'processing' | 'success' | 'failed' | 'retrying';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  processingTime?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Webhook Processor Configuration
 */
interface WebhookProcessorConfig {
  maxRetryAttempts: number;
  retryDelayMs: number;
  enableNotifications: boolean;
  enableEventLogging: boolean;
  timeoutMs: number;
}

const DEFAULT_CONFIG: WebhookProcessorConfig = {
  maxRetryAttempts: 3,
  retryDelayMs: 1000, // 1 second base delay
  enableNotifications: true,
  enableEventLogging: true,
  timeoutMs: 30000, // 30 seconds
};

/**
 * Enhanced Webhook Processor Class
 */
export class WebhookProcessor {
  private config: WebhookProcessorConfig;

  constructor(config: Partial<WebhookProcessorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process webhook event with retry logic and comprehensive error handling
   */
  async processEvent(
    event: Stripe.Event, 
    signature: string,
    rawBody: string
  ): Promise<{ success: boolean; eventLog?: WebhookEventLog; error?: string }> {
    const startTime = Date.now();
    let eventLog: WebhookEventLog | null = null;

    try {
      // Log event receipt
      if (this.config.enableEventLogging) {
        eventLog = await this.createEventLog(event);
      }

      // Verify signature
      const isValidSignature = this.verifySignature(rawBody, signature);
      if (!isValidSignature) {
        throw new Error('Invalid webhook signature');
      }

      // Process event with retry logic
      const result = await this.processWithRetry(event, eventLog);
      
      // Update processing time
      if (eventLog) {
        const processingTime = Date.now() - startTime;
        await this.updateEventLog(eventLog.id, {
          status: result.success ? 'success' : 'failed',
          processingTime,
          lastError: result.error,
        });
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (eventLog) {
        await this.updateEventLog(eventLog.id, {
          status: 'failed',
          lastError: errorMessage,
          processingTime: Date.now() - startTime,
        });
      }

      console.error('❌ Webhook processing failed:', {
        eventType: event.type,
        eventId: event.id,
        error: errorMessage,
      });

      return { success: false, error: errorMessage, eventLog: eventLog || undefined };
    }
  }

  /**
   * Process event with retry logic
   */
  private async processWithRetry(
    event: Stripe.Event, 
    eventLog?: WebhookEventLog | null
  ): Promise<{ success: boolean; error?: string }> {
    let attempts = 0;
    let lastError: string | undefined;

    while (attempts < this.config.maxRetryAttempts) {
      attempts++;
      
      try {
        // Update attempt count
        if (eventLog) {
          await this.updateEventLog(eventLog.id, {
            status: attempts === 1 ? 'processing' : 'retrying',
            attempts,
          });
        }

        // Process the event
        await this.handleEventByType(event);
        
        console.log(`✅ Webhook processed successfully: ${event.type} (attempt ${attempts})`);
        return { success: true };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Webhook processing attempt ${attempts} failed:`, {
          eventType: event.type,
          eventId: event.id,
          error: lastError,
        });

        // If this wasn't the last attempt, wait before retrying
        if (attempts < this.config.maxRetryAttempts) {
          const delay = this.calculateRetryDelay(attempts);
          console.log(`⏳ Retrying webhook in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    console.error(`💥 Webhook processing failed after ${attempts} attempts:`, {
      eventType: event.type,
      eventId: event.id,
      error: lastError,
    });

    return { success: false, error: lastError };
  }

  /**
   * Handle event by type with comprehensive processing
   */
  private async handleEventByType(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.processing':
        await this.handlePaymentProcessing(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.requires_action':
        await this.handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;

      case 'charge.dispute.created':
        await this.handleChargeDispute(event.data.object as Stripe.Dispute);
        break;

      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`🔔 Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Enhanced payment success handler
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await prisma.payment.update({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
          metadata: {
            ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
            stripe_payment_method: paymentIntent.payment_method,
            amount_received: paymentIntent.amount_received,
            webhook_processed_at: new Date().toISOString(),
          }
        },
        include: {
          user: true,
          trip: true,
        }
      });

      console.log('✅ Payment success processed:', {
        paymentId: payment.id,
        userId: payment.userId,
        amount: payment.amount,
      });

      // Send notification
      if (this.config.enableNotifications && payment.user?.email) {
        await this.sendPaymentNotification('success', payment);
      }

      // Handle specific payment types
      await this.handlePaymentTypeSpecificActions(payment, 'success');

    } catch (error) {
      console.error('❌ Error processing payment success:', error);
      
      // Fallback: try to find payment by metadata
      await this.handlePaymentFallback(paymentIntent, 'SUCCEEDED');
      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Enhanced payment failed handler
   */
  private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const payment = await prisma.payment.update({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
            failure_code: paymentIntent.last_payment_error?.code,
            failure_message: paymentIntent.last_payment_error?.message,
            decline_code: paymentIntent.last_payment_error?.decline_code,
            webhook_processed_at: new Date().toISOString(),
          }
        },
        include: {
          user: true,
          trip: true,
        }
      });

      console.log('✅ Payment failure processed:', {
        paymentId: payment.id,
        userId: payment.userId,
        failureCode: paymentIntent.last_payment_error?.code,
      });

      // Send notification
      if (this.config.enableNotifications && payment.user?.email) {
        await this.sendPaymentNotification('failed', payment);
      }

      // Handle specific payment types
      await this.handlePaymentTypeSpecificActions(payment, 'failed');

    } catch (error) {
      console.error('❌ Error processing payment failure:', error);
      await this.handlePaymentFallback(paymentIntent, 'FAILED');
      throw error;
    }
  }

  /**
   * Handle payment canceled
   */
  private async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.updatePaymentStatus(paymentIntent, 'CANCELED', {
      canceled_at: new Date().toISOString(),
      cancellation_reason: paymentIntent.cancellation_reason,
    });
  }

  /**
   * Handle payment processing
   */
  private async handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.updatePaymentStatus(paymentIntent, 'PENDING', {
      processing_started_at: new Date().toISOString(),
    });
  }

  /**
   * Handle payment requires action (3D Secure, etc.)
   */
  private async handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    await this.updatePaymentStatus(paymentIntent, 'REQUIRES_ACTION', {
      requires_action_at: new Date().toISOString(),
      next_action: paymentIntent.next_action?.type,
    });
  }

  /**
   * Handle charge dispute
   */
  private async handleChargeDispute(dispute: Stripe.Dispute): Promise<void> {
    try {
      // Find payment by charge ID
      const chargeId = dispute.charge as string;
      
      // Create dispute record
      await prisma.paymentDispute.create({
        data: {
          stripeDisputeId: dispute.id,
          chargeId: chargeId,
          amount: dispute.amount,
          reason: dispute.reason,
          status: dispute.status,
          evidence: dispute.evidence ? JSON.stringify(dispute.evidence) : null,
          metadata: JSON.stringify(dispute.metadata || {}),
        }
      });

      console.log('✅ Dispute created:', dispute.id);
    } catch (error) {
      console.error('❌ Error handling dispute:', error);
      throw error;
    }
  }

  /**
   * Handle checkout session completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      console.log('🛒 Checkout completed:', session.id);
      
      // Update customer data if needed
      if (session.customer) {
        await this.syncCustomerData(session.customer as string);
      }
      
      // Handle subscription if present
      if (session.subscription) {
        await this.handleSubscriptionFromCheckout(session);
      }
    } catch (error) {
      console.error('❌ Error handling checkout completion:', error);
      throw error;
    }
  }

  /**
   * Generic payment status update
   */
  private async updatePaymentStatus(
    paymentIntent: Stripe.PaymentIntent, 
    status: string, 
    additionalMetadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await prisma.payment.update({
        where: { stripePaymentId: paymentIntent.id },
        data: {
          status,
          metadata: {
            ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
            webhook_processed_at: new Date().toISOString(),
            ...additionalMetadata,
          }
        }
      });

      console.log(`✅ Payment status updated to ${status}:`, paymentIntent.id);
    } catch (error) {
      console.error(`❌ Error updating payment status to ${status}:`, error);
      throw error;
    }
  }

  /**
   * Send payment notification to user
   */
  private async sendPaymentNotification(
    type: 'success' | 'failed' | 'canceled',
    payment: any
  ): Promise<void> {
    try {
      if (!payment.user?.email) {
        console.warn('⚠️ No user email found for payment notification');
        return;
      }

      const notificationType = type === 'success' 
        ? 'payment_success' 
        : type === 'failed' 
          ? 'payment_failed' 
          : 'payment_canceled';

      await webhookNotificationService.sendPaymentNotification({
        type: notificationType as any,
        userId: payment.userId,
        paymentId: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        userEmail: payment.user.email,
        userName: payment.user.name || payment.user.email,
        metadata: {
          paymentType: payment.type,
          tripId: payment.tripId,
          subscriptionId: payment.subscriptionId,
        }
      });

      console.log(`✅ ${type} notification sent to:`, payment.user.email);
      
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      // Don't throw error - notification failure shouldn't fail webhook processing
    }
  }

  /**
   * Handle payment type specific actions
   */
  private async handlePaymentTypeSpecificActions(
    payment: any,
    status: 'success' | 'failed' | 'canceled'
  ): Promise<void> {
    try {
      switch (payment.type) {
        case 'TOUR_BOOKING':
          await this.handleTourBookingPayment(payment, status);
          break;
        case 'SUBSCRIPTION':
          await this.handleSubscriptionPayment(payment, status);
          break;
        case 'COURSE_PURCHASE':
          await this.handleCoursePayment(payment, status);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling payment type specific actions:', error);
      // Don't throw - this shouldn't fail the main webhook processing
    }
  }

  /**
   * Fallback payment handling
   */
  private async handlePaymentFallback(
    paymentIntent: Stripe.PaymentIntent,
    status: string
  ): Promise<void> {
    if (paymentIntent.metadata?.payment_id) {
      try {
        await prisma.payment.update({
          where: { id: paymentIntent.metadata.payment_id },
          data: {
            status,
            stripePaymentId: paymentIntent.id,
            metadata: {
              webhook_fallback_processed: true,
              webhook_processed_at: new Date().toISOString(),
            }
          }
        });
        console.log('✅ Payment updated via fallback method');
      } catch (fallbackError) {
        console.error('❌ Fallback payment update failed:', fallbackError);
      }
    }
  }

  /**
   * Create event log entry
   */
  private async createEventLog(event: Stripe.Event): Promise<WebhookEventLog> {
    try {
      const eventLog = await prisma.webhookEventLog.create({
        data: {
          eventType: event.type,
          eventId: event.id,
          status: 'RECEIVED',
          attempts: 0,
          maxAttempts: this.config.maxRetryAttempts,
          metadata: {
            created: event.created,
            livemode: event.livemode,
            object_id: (event.data.object as any).id,
          },
        }
      });

      console.log('📝 Event logged in database:', eventLog.id);
      return eventLog as WebhookEventLog;
    } catch (error) {
      console.error('❌ Error creating event log:', error);
      // Return a fallback log for processing to continue
      return {
        id: `fallback_${event.id}_${Date.now()}`,
        eventType: event.type,
        eventId: event.id,
        status: 'received',
        attempts: 0,
        maxAttempts: this.config.maxRetryAttempts,
        metadata: {
          created: event.created,
          livemode: event.livemode,
          object_id: (event.data.object as any).id,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Update event log
   */
  private async updateEventLog(
    logId: string,
    updates: Partial<WebhookEventLog>
  ): Promise<void> {
    try {
      await prisma.webhookEventLog.update({
        where: { id: logId },
        data: {
          status: updates.status as any,
          attempts: updates.attempts,
          lastError: updates.lastError,
          processingTime: updates.processingTime,
          updatedAt: new Date(),
        }
      });

      console.log('📝 Event log updated in database:', logId);
    } catch (error) {
      console.error('❌ Error updating event log:', error);
      // Log the update attempt but don't fail the webhook processing
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(rawBody: string, signature: string): boolean {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        return false;
      }

      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number): number {
    return this.config.retryDelayMs * Math.pow(2, attempt - 1);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Placeholder methods for specific payment types
  private async handleTourBookingPayment(payment: any, status: string): Promise<void> {
    console.log(`🎣 Tour booking payment ${status}:`, payment.id);
  }

  private async handleSubscriptionPayment(payment: any, status: string): Promise<void> {
    console.log(`💎 Subscription payment ${status}:`, payment.id);
  }

  private async handleCoursePayment(payment: any, status: string): Promise<void> {
    console.log(`📚 Course payment ${status}:`, payment.id);
  }

  private async syncCustomerData(customerId: string): Promise<void> {
    console.log(`👤 Syncing customer data:`, customerId);
  }

  private async handleSubscriptionFromCheckout(session: Stripe.Checkout.Session): Promise<void> {
    console.log(`📋 Processing subscription from checkout:`, session.id);
  }
}

/**
 * Export singleton instance
 */
export const webhookProcessor = new WebhookProcessor();
