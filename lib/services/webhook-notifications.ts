/**
 * Webhook Notification Service
 * Task 5.4: Payment event notifications system
 * 
 * Handles sending notifications for webhook events including emails, 
 * push notifications, and real-time updates via SSE
 */

import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export interface NotificationConfig {
  enableEmail: boolean;
  enablePush: boolean;
  enableSSE: boolean;
  fromEmail: string;
  adminEmails: string[];
}

const DEFAULT_CONFIG: NotificationConfig = {
  enableEmail: true,
  enablePush: false,
  enableSSE: true,
  fromEmail: 'noreply@cascais-fishing.com',
  adminEmails: ['admin@cascais-fishing.com'],
};

/**
 * Notification types for different webhook events
 */
export interface PaymentNotification {
  type: 'payment_success' | 'payment_failed' | 'payment_canceled' | 'payment_disputed';
  userId: string;
  paymentId: string;
  amount: number;
  currency: string;
  userEmail: string;
  userName?: string;
  metadata?: Record<string, any>;
}

export interface WebhookSystemNotification {
  type: 'webhook_failure' | 'webhook_retry_exhausted' | 'webhook_system_alert';
  eventType: string;
  eventId: string;
  error?: string;
  attempts?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Enhanced Webhook Notification Service
 */
export class WebhookNotificationService {
  private config: NotificationConfig;

  constructor(config: Partial<NotificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Send payment-related notification
   */
  async sendPaymentNotification(notification: PaymentNotification): Promise<void> {
    try {
      console.log(`📧 Sending ${notification.type} notification to ${notification.userEmail}`);

      // Send email notification
      if (this.config.enableEmail && resend) {
        await this.sendPaymentEmail(notification);
      }

      // Send SSE notification for real-time updates
      if (this.config.enableSSE) {
        await this.sendSSENotification(notification);
      }

      // Log notification
      await this.logNotification('payment', notification);

    } catch (error) {
      console.error('❌ Error sending payment notification:', error);
      // Don't throw error - notification failure shouldn't fail webhook processing
    }
  }

  /**
   * Send webhook system notification to admins
   */
  async sendSystemNotification(notification: WebhookSystemNotification): Promise<void> {
    try {
      console.log(`🚨 Sending system notification: ${notification.type} (${notification.severity})`);

      // Send email to admins for high/critical severity
      if (this.config.enableEmail && ['high', 'critical'].includes(notification.severity) && resend) {
        await this.sendSystemEmail(notification);
      }

      // Log system notification
      await this.logNotification('system', notification);

    } catch (error) {
      console.error('❌ Error sending system notification:', error);
    }
  }

  /**
   * Send payment success email
   */
  private async sendPaymentEmail(notification: PaymentNotification): Promise<void> {
    if (!resend) {
      console.warn('⚠️ Resend not configured, skipping email');
      return;
    }

    const emailContent = this.generatePaymentEmailContent(notification);
    
    try {
      await resend.emails.send({
        from: this.config.fromEmail,
        to: notification.userEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      console.log('✅ Payment email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send payment email:', error);
    }
  }

  /**
   * Send system alert email to admins
   */
  private async sendSystemEmail(notification: WebhookSystemNotification): Promise<void> {
    if (!resend) {
      console.warn('⚠️ Resend not configured, skipping system email');
      return;
    }

    const emailContent = this.generateSystemEmailContent(notification);
    
    try {
      await resend.emails.send({
        from: this.config.fromEmail,
        to: this.config.adminEmails,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      console.log('✅ System alert email sent successfully');
    } catch (error) {
      console.error('❌ Failed to send system email:', error);
    }
  }

  /**
   * Send SSE notification for real-time updates
   */
  private async sendSSENotification(notification: PaymentNotification | WebhookSystemNotification): Promise<void> {
    try {
      // This would integrate with your SSE system
      // For now, we'll just log the intent to send SSE notification
      console.log('📡 SSE notification sent:', {
        type: notification.type,
        timestamp: new Date().toISOString()
      });

      // In a real implementation, you would:
      // 1. Find active SSE connections for the user
      // 2. Send real-time notification
      // 3. Update any real-time dashboards
    } catch (error) {
      console.error('❌ Failed to send SSE notification:', error);
    }
  }

  /**
   * Generate payment email content
   */
  private generatePaymentEmailContent(notification: PaymentNotification): { subject: string; html: string } {
    const amount = (notification.amount / 100).toFixed(2);
    const userName = notification.userName || 'Valued Customer';

    switch (notification.type) {
      case 'payment_success':
        return {
          subject: '✅ Payment Successful - Cascais Fishing',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">Payment Successful!</h2>
              <p>Dear ${userName},</p>
              <p>Your payment has been successfully processed.</p>
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <strong>Payment Details:</strong><br>
                Amount: ${amount} ${notification.currency.toUpperCase()}<br>
                Payment ID: ${notification.paymentId}<br>
                Date: ${new Date().toLocaleString()}
              </div>
              <p>Thank you for choosing Cascais Fishing!</p>
              <p>Best regards,<br>The Cascais Fishing Team</p>
            </div>
          `
        };

      case 'payment_failed':
        return {
          subject: '❌ Payment Failed - Cascais Fishing',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Payment Failed</h2>
              <p>Dear ${userName},</p>
              <p>We were unable to process your payment.</p>
              <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <strong>Payment Details:</strong><br>
                Amount: ${amount} ${notification.currency.toUpperCase()}<br>
                Payment ID: ${notification.paymentId}<br>
                Date: ${new Date().toLocaleString()}
              </div>
              <p>Please try again or contact our support team if the problem persists.</p>
              <p>Best regards,<br>The Cascais Fishing Team</p>
            </div>
          `
        };

      case 'payment_canceled':
        return {
          subject: '🚫 Payment Canceled - Cascais Fishing',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">Payment Canceled</h2>
              <p>Dear ${userName},</p>
              <p>Your payment has been canceled.</p>
              <div style="background: #fefbf3; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <strong>Payment Details:</strong><br>
                Amount: ${amount} ${notification.currency.toUpperCase()}<br>
                Payment ID: ${notification.paymentId}<br>
                Date: ${new Date().toLocaleString()}
              </div>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>The Cascais Fishing Team</p>
            </div>
          `
        };

      case 'payment_disputed':
        return {
          subject: '⚠️ Payment Disputed - Cascais Fishing',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">Payment Disputed</h2>
              <p>Dear ${userName},</p>
              <p>A dispute has been raised for your payment. Our team will investigate this matter.</p>
              <div style="background: #fefbf3; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <strong>Payment Details:</strong><br>
                Amount: ${amount} ${notification.currency.toUpperCase()}<br>
                Payment ID: ${notification.paymentId}<br>
                Date: ${new Date().toLocaleString()}
              </div>
              <p>We will keep you updated on the progress of the dispute resolution.</p>
              <p>Best regards,<br>The Cascais Fishing Team</p>
            </div>
          `
        };

      default:
        return {
          subject: '📧 Payment Notification - Cascais Fishing',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Payment Notification</h2>
              <p>Dear ${userName},</p>
              <p>There has been an update to your payment.</p>
              <p>Payment ID: ${notification.paymentId}</p>
              <p>Best regards,<br>The Cascais Fishing Team</p>
            </div>
          `
        };
    }
  }

  /**
   * Generate system email content
   */
  private generateSystemEmailContent(notification: WebhookSystemNotification): { subject: string; html: string } {
    const severityColor = {
      low: '#10b981',
      medium: '#f59e0b', 
      high: '#f97316',
      critical: '#dc2626'
    }[notification.severity];

    return {
      subject: `🚨 ${notification.severity.toUpperCase()} Alert: Webhook ${notification.type}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${severityColor};">Webhook System Alert</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <strong>Alert Details:</strong><br>
            Type: ${notification.type}<br>
            Event Type: ${notification.eventType}<br>
            Event ID: ${notification.eventId}<br>
            Severity: ${notification.severity.toUpperCase()}<br>
            ${notification.attempts ? `Attempts: ${notification.attempts}<br>` : ''}
            ${notification.error ? `Error: ${notification.error}<br>` : ''}
            Timestamp: ${new Date().toLocaleString()}
          </div>
          <p>Please investigate this issue in the webhook monitoring dashboard.</p>
          <p>System Administrator</p>
        </div>
      `
    };
  }

  /**
   * Log notification for audit trail
   */
  private async logNotification(
    category: 'payment' | 'system',
    notification: PaymentNotification | WebhookSystemNotification
  ): Promise<void> {
    try {
      // In a real implementation, you might want to create a notifications table
      // For now, we'll just console log with structured data
      console.log('📝 Notification logged:', {
        category,
        type: notification.type,
        timestamp: new Date().toISOString(),
        ...(category === 'payment' ? {
          userId: (notification as PaymentNotification).userId,
          paymentId: (notification as PaymentNotification).paymentId
        } : {
          eventId: (notification as WebhookSystemNotification).eventId,
          severity: (notification as WebhookSystemNotification).severity
        })
      });
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
  }

  /**
   * Send bulk notifications (for batch processing)
   */
  async sendBulkNotifications(notifications: (PaymentNotification | WebhookSystemNotification)[]): Promise<void> {
    console.log(`📧 Sending ${notifications.length} bulk notifications`);
    
    const results = await Promise.allSettled(
      notifications.map(notification => {
        if ('userId' in notification) {
          return this.sendPaymentNotification(notification);
        } else {
          return this.sendSystemNotification(notification);
        }
      })
    );

    const failed = results.filter(result => result.status === 'rejected').length;
    const succeeded = results.length - failed;

    console.log(`📊 Bulk notifications completed: ${succeeded} succeeded, ${failed} failed`);
  }
}

/**
 * Export singleton instance
 */
export const webhookNotificationService = new WebhookNotificationService();
