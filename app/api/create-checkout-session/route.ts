import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, createStripeCustomer } from '@/lib/stripe';
import { isStripeConfigured } from '@/lib/stripe-config';
import Stripe from 'stripe';

/**
 * Create Stripe Checkout Session API
 * Based on Context7 Stripe Node.js documentation and t3dotgg best practices
 * Implements proper customer creation and session management
 */

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      console.error('❌ Stripe not configured properly');
      return NextResponse.json({
        success: false,
        error: 'Payment processing temporarily unavailable - Stripe not configured',
        code: 'STRIPE_NOT_CONFIGURED',
        action: 'Add Stripe environment variables in Vercel Dashboard',
        required: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET']
      }, { status: 503 });
    }

    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      priceId,
      mode = 'subscription', // 'subscription' | 'payment'
      successUrl,
      cancelUrl,
      metadata = {}
    } = body;

    // Validate required parameters
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get or create Stripe customer (t3dotgg pattern)
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      console.log('📋 Creating new Stripe customer for user:', user.id);
      
      const customer = await createStripeCustomer(
        user.email!,
        user.name || undefined,
        {
          userId: user.id,
          internal_user_id: user.id, // For webhook processing
        }
      );

      stripeCustomerId = customer.id;

      // Store customer ID in database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId }
      });

      console.log('✅ Created and stored Stripe customer:', stripeCustomerId);
    }

    // Create checkout session configuration (Context7 best practices)
    const checkoutSessionConfig: Stripe.Checkout.SessionCreateParams = {
      // Customer association (critical for webhooks)
      customer: stripeCustomerId,
      
      // Payment mode
      mode,
      
      // Line items
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      
      // Success and cancel URLs
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/pricing`,
      
      // Metadata for tracking
      metadata: {
        userId: user.id,
        userEmail: user.email!,
        priceId,
        mode,
        ...metadata
      },
      
      // Customer details pre-filling
      customer_update: {
        address: 'auto',
        name: 'auto',
      },
      
      // Payment methods
      payment_method_types: ['card'],
      
      // Billing configuration
      billing_address_collection: 'required',
      
      // Tax calculation (if enabled in Stripe)
      automatic_tax: {
        enabled: false, // Set to true if you have tax calculation enabled
      },
    };

    // Subscription-specific configuration
    if (mode === 'subscription') {
      checkoutSessionConfig.subscription_data = {
        metadata: {
          userId: user.id,
          userEmail: user.email!,
        },
        // Trial period if needed
        // trial_period_days: 7,
      };

      // Customer portal configuration
      checkoutSessionConfig.customer_creation = 'always';
    }

    // Payment mode specific configuration
    if (mode === 'payment') {
      checkoutSessionConfig.payment_intent_data = {
        metadata: {
          userId: user.id,
          userEmail: user.email!,
          type: 'one_time_payment',
        },
        // Setup future usage for saved payment methods
        setup_future_usage: 'on_session',
      };
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionConfig);

    console.log('✅ Created checkout session:', {
      sessionId: checkoutSession.id,
      customerId: stripeCustomerId,
      userId: user.id,
      priceId,
      mode
    });

    // Store checkout session reference (optional, for tracking)
    await prisma.payment.create({
      data: {
        userId: user.id,
        type: mode === 'subscription' ? 'SUBSCRIPTION' : 'TOUR_BOOKING',
        amount: 0, // Will be updated via webhook
        currency: 'EUR',
        status: 'PENDING',
        stripePaymentId: checkoutSession.payment_intent as string || checkoutSession.id,
        metadata: {
          checkout_session_id: checkoutSession.id,
          price_id: priceId,
          mode,
          created_via: 'checkout_session'
        }
      }
    });

    return NextResponse.json({
      success: true,
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      customerId: stripeCustomerId
    });

  } catch (error) {
    console.error('❌ Checkout session creation error:', error);
    
    // Stripe-specific error handling
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: 'Payment processing error',
          details: error.message,
          code: error.code
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve existing checkout sessions
export async function GET(request: NextRequest) {
  try {
    // Проверяем наличие Stripe API ключей
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder_for_build_only') {
      console.error('❌ STRIPE_SECRET_KEY not configured properly');
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 503 }
      );
    }

    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Retrieve checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription', 'payment_intent']
    });

    console.log('📋 Retrieved checkout session:', sessionId);

    return NextResponse.json({
      success: true,
      session: {
        id: checkoutSession.id,
        status: checkoutSession.status,
        payment_status: checkoutSession.payment_status,
        customer_email: checkoutSession.customer_details?.email,
        amount_total: checkoutSession.amount_total,
        currency: checkoutSession.currency,
        subscription_id: checkoutSession.subscription,
        payment_intent_id: checkoutSession.payment_intent,
      }
    });

  } catch (error) {
    console.error('❌ Checkout session retrieval error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: 'Session retrieval error',
          details: error.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve checkout session' },
      { status: 500 }
    );
  }
}
