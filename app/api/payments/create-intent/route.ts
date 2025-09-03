import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { 
  stripe, 
  isStripeConfigured, 
  formatAmountForStripe, 
  type SupportedCurrency 
} from '@/lib/stripe';
import { z } from 'zod';

/**
 * Payment Intent Creation API
 * Task 5.3: Payment Intent Management
 * 
 * Creates Stripe Payment Intents for the new Payment Elements integration
 * Handles authentication, amount validation, and customer management
 */

// Request validation schema
const CreatePaymentIntentSchema = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large'), // €10,000 maximum
  currency: z.enum(['eur', 'usd', 'gbp']).default('eur'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentSchema>;

export async function POST(request: NextRequest) {
  try {
    // Check Stripe configuration
    if (!isStripeConfigured()) {
      console.error('❌ Stripe not configured');
      return NextResponse.json(
        { error: 'Payment processing is not available' },
        { status: 503 }
      );
    }

    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      console.warn('🚫 Unauthorized payment intent creation attempt');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CreatePaymentIntentSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('⚠️ Invalid payment intent request:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const { amount, currency, description, metadata = {} } = validationResult.data;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      console.error('❌ User not found:', session.user.email);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      console.log('📋 Creating new Stripe customer for user:', user.id);
      
      const customer = await stripe.customers.create({
        email: user.email!,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
          internal_user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      // Store customer ID in database
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      });

      console.log('✅ Created and stored Stripe customer:', stripeCustomerId);
    }

    // Convert amount to Stripe format (cents)
    const stripeAmount = formatAmountForStripe(amount, currency);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: stripeAmount,
      currency,
      customer: stripeCustomerId,
      description: description || 'Cascais Fishing Payment',
      metadata: {
        userId: user.id,
        userEmail: user.email!,
        originalAmount: amount.toString(),
        ...metadata,
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // For embedded payments
      },
      // Setup for future usage (save payment methods)
      setup_future_usage: 'on_session',
      // Receipt email
      receipt_email: user.email!,
    });

    console.log('✅ Created payment intent:', {
      paymentIntentId: paymentIntent.id,
      amount: stripeAmount,
      currency,
      customerId: stripeCustomerId,
      userId: user.id,
    });

    // Store payment intent in database for tracking
    await prisma.payment.create({
      data: {
        userId: user.id,
        type: 'TOUR_BOOKING', // Default type, can be updated based on metadata
        amount: stripeAmount,
        currency: currency.toUpperCase() as any,
        status: 'PENDING',
        stripePaymentId: paymentIntent.id,
        metadata: {
          payment_intent_id: paymentIntent.id,
          customer_id: stripeCustomerId,
          original_amount: amount,
          description,
          created_via: 'payment_elements',
          ...metadata,
        },
      },
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      customerId: stripeCustomerId,
    });

  } catch (error) {
    console.error('❌ Payment intent creation error:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment processing error',
          message: stripeError.message,
          type: stripeError.type,
        },
        { status: 400 }
      );
    }

    // Handle database errors
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as any;
      console.error('Database error code:', dbError.code);
    }

    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve payment intent status
 */
export async function GET(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is not available' },
        { status: 503 }
      );
    }

    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Payment intent ID required' },
        { status: 400 }
      );
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify the payment intent belongs to the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || paymentIntent.customer !== user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Payment intent not found or access denied' },
        { status: 404 }
      );
    }

    console.log('📋 Retrieved payment intent:', paymentIntentId);

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        created: paymentIntent.created,
        last_payment_error: paymentIntent.last_payment_error,
      },
    });

  } catch (error) {
    console.error('❌ Payment intent retrieval error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment retrieval error',
          message: stripeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve payment intent' },
      { status: 500 }
    );
  }
}
