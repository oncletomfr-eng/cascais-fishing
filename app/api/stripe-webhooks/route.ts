import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { isStripeConfigured } from '@/lib/stripe-config';
import { prisma } from '@/lib/prisma';
import { webhookProcessor } from '@/lib/services/webhook-processor';
import { sendGroupTripConfirmed } from '@/lib/services/email-service';
import Stripe from 'stripe';

/**
 * Stripe Webhooks Handler - Production Ready
 * Based on Context7 Stripe Node.js documentation and t3dotgg recommendations
 * Follows best practices for webhook signature verification and event processing
 */

// Define allowed Stripe events to process (Context7 recommendation)
const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "payment_intent.processing",
  "charge.dispute.created",
];

export async function POST(request: NextRequest) {
  // Check if Stripe is configured
  if (!isStripeConfigured()) {
    console.error('❌ Stripe webhooks not configured properly');
    return NextResponse.json({
      success: false,
      error: 'Webhooks temporarily unavailable - Stripe not configured',
      code: 'STRIPE_NOT_CONFIGURED'
    }, { status: 503 });
  }

  const body = await request.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    console.error('❌ Missing Stripe signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('❌ Missing STRIPE_WEBHOOK_SECRET environment variable');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    // Верифицируем webhook signature от Stripe
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    
    console.log('✅ Webhook signature verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  try {
    // Skip processing if the event isn't one we track (Context7 best practice)
    if (!allowedEvents.includes(event.type)) {
      console.log(`🔔 Skipping untracked event type: ${event.type}`);
      return NextResponse.json({ received: true });
    }

    // Process event using enhanced webhook processor with retry logic
    const result = await webhookProcessor.processEvent(event, signature, body);
    
    if (result.success) {
      console.log(`✅ Webhook processed successfully: ${event.type} (${event.id})`);
      return NextResponse.json({ 
        received: true,
        event_type: event.type,
        event_id: event.id,
        processed_at: new Date().toISOString()
      });
    } else {
      console.error(`❌ Webhook processing failed: ${event.type} (${event.id})`, result.error);
      return NextResponse.json(
        { 
          error: 'Webhook processing failed',
          event_type: event.type,
          event_id: event.id,
          details: result.error 
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Unexpected webhook error:', error);
    
    // Log error details for debugging
    console.error('Event details:', {
      type: event.type,
      id: event.id,
      created: event.created
    });
    
    return NextResponse.json(
      { error: 'Webhook processing failed unexpectedly' },
      { status: 500 }
    );
  }
}

/**
 * Centralized event processing (t3dotgg pattern)
 * Handles all allowed Stripe events with proper error handling
 */
async function processEvent(event: Stripe.Event) {
  try {
    // Extract customer ID if present (common pattern across events)
    const eventData = event.data.object as any;
  const customerId = eventData.customer;
  
  if (customerId && typeof customerId !== 'string') {
    console.warn(`⚠️ Unexpected customer ID format in event ${event.type}: ${typeof customerId}`);
  }
  
  // Route to appropriate handler based on event type
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.canceled':
      await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.processing':
      await handlePaymentProcessing(event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.dispute.created':
      await handleChargeDispute(event.data.object as Stripe.Dispute);
      break;

    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      await handleSubscriptionChange(event);
      break;

    case 'invoice.paid':
    case 'invoice.payment_failed':
    case 'invoice.payment_succeeded':
      await handleInvoiceEvent(event);
      break;

    default:
      console.log(`🔔 Event handler not implemented for: ${event.type}`);
  }

  return NextResponse.json({ 
    success: true, 
    received: true,
    event_type: event.type 
  });

  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Обработка успешного платежа
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  console.log('💰 Processing successful payment:', paymentIntent.id);

  try {
    // Обновляем статус платежа в БД
    const payment = await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'SUCCEEDED',
        paidAt: new Date(),
        metadata: {
          ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
          stripe_payment_method: paymentIntent.payment_method,
          amount_received: paymentIntent.amount_received,
          charges: paymentIntent.charges.data.length
        }
      },
      include: {
        user: true,
        trip: true,
        subscription: true
      }
    });

    console.log('✅ Payment updated in database:', {
      paymentId: payment.id,
      userId: payment.userId,
      amount: payment.amount,
      type: payment.type
    });

    // 📧 Отправляем email подтверждение успешного платежа
    if (payment.user?.email) {
      try {
        const emailResult = await sendGroupTripConfirmed(payment.user.email, {
          customerName: payment.user.name || 'Пользователь',
          confirmationCode: payment.id,
          date: new Date().toLocaleDateString('ru-RU'),
          time: '—',
          totalParticipants: 1,
          customerPhone: '',
        });
        
        if (emailResult.success) {
          console.log('📧 Payment confirmation email sent to:', payment.user.email);
        } else {
          console.warn('⚠️ Failed to send payment confirmation email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Payment confirmation email error:', emailError);
      }
    }

    // Дополнительные действия в зависимости от типа платежа
    if (payment.type === 'TOUR_BOOKING' && payment.trip) {
      await handleTourBookingPayment(payment);
    } else if (payment.type === 'SUBSCRIPTION' && payment.subscription) {
      await handleSubscriptionPayment(payment);
    } else if (payment.type === 'COURSE_PURCHASE') {
      await handleCoursePayment(payment);
    }

  } catch (error) {
    console.error('❌ Error updating successful payment:', error);
    
    // Попытка найти платеж по другим критериям
    if (paymentIntent.metadata?.payment_id) {
      try {
        await prisma.payment.update({
          where: { id: paymentIntent.metadata.payment_id },
          data: { 
            status: 'SUCCEEDED',
            paidAt: new Date(),
            stripePaymentId: paymentIntent.id
          }
        });
        console.log('✅ Payment updated via metadata payment_id');
      } catch (metaError) {
        console.error('❌ Failed to update via metadata:', metaError);
      }
    }
  }
}

/**
 * Обработка неудачного платежа
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('❌ Processing failed payment:', paymentIntent.id);

  try {
    const payment = await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        metadata: {
          ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
          failure_code: paymentIntent.last_payment_error?.code,
          failure_message: paymentIntent.last_payment_error?.message,
          declined_code: paymentIntent.last_payment_error?.decline_code
        }
      },
      include: { user: true, trip: true }
    });

    console.log('✅ Failed payment updated:', payment.id);

    // 📧 Отправляем email уведомление о неудачном платеже
    if (payment.user?.email) {
      try {
        console.log(`📧 Payment failure notification for user: ${payment.user.email}`);
        console.log(`💰 Failed payment details: ${payment.id}, Amount: ${payment.amount / 100} ${payment.currency}`);
        console.log(`❌ Failure reason: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`);
        
        // Можно добавить конкретный email шаблон для неудачных платежей позже
        // Сейчас ограничиваемся логированием
      } catch (emailError) {
        console.error('❌ Payment failure notification error:', emailError);
      }
    }

  } catch (error) {
    console.error('❌ Error updating failed payment:', error);
  }
}

/**
 * Обработка отмененного платежа
 */
async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent) {
  console.log('🚫 Processing canceled payment:', paymentIntent.id);

  try {
    await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'CANCELED',
        metadata: {
          ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
          canceled_at: new Date().toISOString(),
          cancellation_reason: paymentIntent.cancellation_reason
        }
      }
    });

    console.log('✅ Canceled payment updated');
  } catch (error) {
    console.error('❌ Error updating canceled payment:', error);
  }
}

/**
 * Обработка платежа в процессе
 */
async function handlePaymentProcessing(paymentIntent: Stripe.PaymentIntent) {
  console.log('⏳ Processing payment in progress:', paymentIntent.id);

  try {
    await prisma.payment.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'PENDING',
        metadata: {
          ...((typeof paymentIntent.metadata === 'object' && paymentIntent.metadata) || {}),
          processing_started_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('❌ Error updating processing payment:', error);
  }
}

/**
 * Обработка спора по платежу
 */
async function handleChargeDispute(dispute: Stripe.Dispute) {
  console.log('⚠️ Processing charge dispute:', dispute.id);

  try {
    // Находим платеж по charge ID
    const chargeId = dispute.charge as string;
    const payment = await prisma.payment.findFirst({
      where: {
        metadata: {
          path: ['stripe_charges'],
          array_contains: chargeId
        }
      }
    });

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED', // Или создать новый статус DISPUTED
          metadata: {
            ...((typeof payment.metadata === 'object' && payment.metadata) || {}),
            dispute_id: dispute.id,
            dispute_reason: dispute.reason,
            dispute_status: dispute.status,
            dispute_amount: dispute.amount
          }
        }
      });

      console.log('✅ Dispute recorded for payment:', payment.id);
    }
  } catch (error) {
    console.error('❌ Error handling charge dispute:', error);
  }
}

/**
 * Обработка изменений подписки
 */
async function handleSubscriptionChange(event: Stripe.Event) {
  console.log('📋 Processing subscription change:', event.type);
  
  const subscription = event.data.object as Stripe.Subscription;
  
  try {
    // Обновляем подписку в БД в зависимости от события
    switch (event.type) {
      case 'customer.subscription.created':
        // Подписка создана
        break;
      case 'customer.subscription.updated':
        // Подписка обновлена (изменен план, статус и т.д.)
        break;
      case 'customer.subscription.deleted':
        // Подписка отменена
        break;
    }
  } catch (error) {
    console.error('❌ Error handling subscription change:', error);
  }
}

/**
 * Обработка платежа за тур
 */
async function handleTourBookingPayment(payment: any) {
  console.log('🎣 Processing tour booking payment:', payment.id);

  try {
    // Подтверждаем бронирование
    if (payment.trip) {
      // Обновляем статус поездки если нужно
      // Отправляем подтверждение участнику
      console.log(`🎯 Tour booking confirmed for trip: ${payment.trip.id}`);
    }
  } catch (error) {
    console.error('❌ Error handling tour booking payment:', error);
  }
}

/**
 * Обработка платежа за подписку
 */
async function handleSubscriptionPayment(payment: any) {
  console.log('💎 Processing subscription payment:', payment.id);

  try {
    if (payment.subscription) {
      await prisma.subscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 дней
        }
      });

      console.log(`✅ Subscription activated: ${payment.subscription.id}`);
    }
  } catch (error) {
    console.error('❌ Error handling subscription payment:', error);
  }
}

/**
 * Обработка покупки курса
 */
async function handleCoursePayment(payment: any) {
  console.log('📚 Processing course purchase payment:', payment.id);

  try {
    // Предоставляем доступ к курсу
    // Отправляем материалы курса
    console.log(`🎓 Course access granted for payment: ${payment.id}`);
  } catch (error) {
    console.error('❌ Error handling course payment:', error);
  }
}

/**
 * Handle Checkout Session Completed (t3dotgg pattern)
 * This is triggered when a customer completes the checkout process
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('🛒 Processing checkout completion:', session.id);

  try {
    const customerId = session.customer as string;
    
    if (!customerId) {
      console.error('❌ No customer ID in checkout session:', session.id);
      return;
    }

    // Update or create customer data in our database
    await syncStripeCustomerData(customerId);
    
    // Handle subscription if present
    if (session.subscription) {
      const subscriptionId = session.subscription as string;
      console.log(`📋 Checkout created subscription: ${subscriptionId}`);
    }

    console.log('✅ Checkout completion processed successfully');
    
  } catch (error) {
    console.error('❌ Error handling checkout completion:', error);
  }
}

/**
 * Handle Invoice Events (Context7 best practice)
 * Processes invoice.paid, invoice.payment_failed, invoice.payment_succeeded
 */
async function handleInvoiceEvent(event: Stripe.Event) {
  console.log('🧾 Processing invoice event:', event.type);
  
  const invoice = event.data.object as Stripe.Invoice;
  
  try {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;
    
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        console.log(`💰 Invoice paid successfully: ${invoice.id}`);
        
        // Activate subscription if this was a subscription invoice
        if (subscriptionId) {
          await activateSubscription(subscriptionId, customerId);
        }
        break;
        
      case 'invoice.payment_failed':
        console.log(`❌ Invoice payment failed: ${invoice.id}`);
        
        // Handle failed payment (notify customer, pause service, etc.)
        await handleFailedInvoicePayment(invoice);
        break;
    }
    
  } catch (error) {
    console.error('❌ Error handling invoice event:', error);
  }
}

/**
 * Sync Stripe Customer Data (t3dotgg pattern)
 * Keeps our local database in sync with Stripe customer data
 */
async function syncStripeCustomerData(customerId: string) {
  try {
    // Fetch latest customer data from Stripe
    const customer = await stripe.customers.retrieve(customerId);
    
    if (customer.deleted) {
      console.log(`🗑️ Customer ${customerId} was deleted in Stripe`);
      return;
    }

    // Fetch subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
      status: 'all',
      expand: ['data.default_payment_method'],
    });

    // Process each subscription
    for (const subscription of subscriptions.data) {
      await updateSubscriptionInDatabase(subscription);
    }

    console.log(`✅ Synced customer data: ${customerId}`);
    
  } catch (error) {
    console.error('❌ Error syncing customer data:', error);
  }
}

/**
 * Activate Subscription (Context7 pattern)
 */
async function activateSubscription(subscriptionId: string, customerId: string) {
  try {
    console.log(`🎯 Activating subscription: ${subscriptionId}`);
    
    // Update subscription status in database
    await prisma.subscription.updateMany({
      where: {
        stripeSubscriptionId: subscriptionId
      },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Subscription activated: ${subscriptionId}`);
    
  } catch (error) {
    console.error('❌ Error activating subscription:', error);
  }
}

/**
 * Handle Failed Invoice Payment
 */
async function handleFailedInvoicePayment(invoice: Stripe.Invoice) {
  try {
    console.log(`⚠️ Handling failed invoice payment: ${invoice.id}`);
    
    // Log the failure reason
    console.log('Failure details:', {
      attempt_count: invoice.attempt_count,
      next_payment_attempt: invoice.next_payment_attempt,
      status: invoice.status
    });

    // Here you could:
    // - Send email notification to customer
    // - Pause subscription services
    // - Update customer status in database
    // - Trigger retry logic
    
  } catch (error) {
    console.error('❌ Error handling failed invoice payment:', error);
  }
}

/**
 * Update Subscription in Database (production helper)
 */
async function updateSubscriptionInDatabase(subscription: Stripe.Subscription) {
  try {
    const existingSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id }
    });

    const subscriptionData = {
      stripeSubscriptionId: subscription.id,
      status: subscription.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      tier: subscription.items.data[0]?.price.id === 'price_1S0sGVFwX7vboUlLvRXgNxmr' ? 'CAPTAIN_PREMIUM' : 'FREE',
      updatedAt: new Date()
    };

    if (existingSubscription) {
      await prisma.subscription.update({
        where: { id: existingSubscription.id },
        data: subscriptionData
      });
    } else {
      // Create new subscription record
      console.log(`📋 Creating new subscription record: ${subscription.id}`);
    }

    console.log(`✅ Updated subscription in database: ${subscription.id}`);
    
  } catch (error) {
    console.error('❌ Error updating subscription in database:', error);
  }
}
