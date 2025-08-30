import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/**
 * Тестовый endpoint для проверки Stripe webhooks
 * Этот endpoint помогает протестировать webhooks локально
 */

export async function GET() {
  try {
    // Проверяем настройку Stripe
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    
    // Получаем информацию о webhooks (если настроены)
    let webhooksInfo = null;
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 5 });
      webhooksInfo = webhooks.data.map(wh => ({
        id: wh.id,
        url: wh.url,
        status: wh.status,
        events: wh.enabled_events.slice(0, 5) // Показываем первые 5 событий
      }));
    } catch (error) {
      webhooksInfo = { error: 'Cannot fetch webhooks - check API keys' };
    }

    return NextResponse.json({
      success: true,
      status: 'Stripe Webhooks Configuration Check',
      configuration: {
        stripe_secret_key: hasStripeKey ? '✅ Configured' : '❌ Missing',
        webhook_secret: hasWebhookSecret ? '✅ Configured' : '❌ Missing STRIPE_WEBHOOK_SECRET',
        webhook_endpoint: '/api/stripe-webhooks'
      },
      current_webhooks: webhooksInfo,
      test_instructions: {
        local_testing: 'Use Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe-webhooks',
        production_setup: 'Add webhook endpoint in Stripe Dashboard: https://dashboard.stripe.com/webhooks',
        required_events: [
          'payment_intent.succeeded',
          'payment_intent.payment_failed', 
          'payment_intent.canceled',
          'charge.dispute.created'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Webhook test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      help: 'Check your STRIPE_SECRET_KEY environment variable'
    }, { status: 500 });
  }
}

/**
 * POST - Симуляция webhook события для тестирования
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_type = 'payment_intent.succeeded', payment_intent_id } = body;

    if (!payment_intent_id) {
      return NextResponse.json({
        error: 'payment_intent_id is required for simulation'
      }, { status: 400 });
    }

    // Получаем PaymentIntent из Stripe
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    } catch (error) {
      return NextResponse.json({
        error: 'PaymentIntent not found in Stripe'
      }, { status: 404 });
    }

    // Симулируем webhook событие
    const simulatedEvent = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: event_type,
      data: {
        object: paymentIntent
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      request: { id: null, idempotency_key: null }
    };

    console.log('🧪 Simulating webhook event:', {
      type: event_type,
      payment_intent: payment_intent_id,
      amount: paymentIntent.amount
    });

    // Вызываем наш webhook handler (симуляция)
    const webhookResponse = await fetch(`${request.nextUrl.origin}/api/stripe-webhooks`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'simulated_signature_for_testing'
      },
      body: JSON.stringify(simulatedEvent)
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook simulation completed',
      simulated_event: {
        type: event_type,
        payment_intent_id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      },
      webhook_response: {
        status: webhookResponse.status,
        ok: webhookResponse.ok
      }
    });

  } catch (error) {
    console.error('❌ Webhook simulation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Simulation failed'
    }, { status: 500 });
  }
}
