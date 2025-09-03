import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

/**
 * Payment Confirmation API
 * Task 5.3: Payment Intent Management - Confirmation Flow
 * 
 * Handles payment confirmation, 3D Secure authentication, and status updates
 */

// Request validation schema
const ConfirmPaymentSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment Intent ID is required'),
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  returnUrl: z.string().url().optional(),
});

type ConfirmPaymentRequest = z.infer<typeof ConfirmPaymentSchema>;

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
      console.warn('🚫 Unauthorized payment confirmation attempt');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ConfirmPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.warn('⚠️ Invalid payment confirmation request:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const { paymentIntentId, paymentMethodId, savePaymentMethod, returnUrl } = validationResult.data;

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

    // Retrieve the payment intent to verify ownership
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.customer !== user.stripeCustomerId) {
      console.error('❌ Payment intent ownership verification failed');
      return NextResponse.json(
        { error: 'Payment intent not found or access denied' },
        { status: 404 }
      );
    }

    // If payment intent is already confirmed, return current status
    if (paymentIntent.status === 'succeeded') {
      console.log('✅ Payment already confirmed:', paymentIntentId);
      
      // Update our database record
      await prisma.payment.updateMany({
        where: { 
          stripePaymentId: paymentIntentId,
          userId: user.id,
        },
        data: { 
          status: 'SUCCEEDED',
          paidAt: new Date(paymentIntent.created * 1000),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          confirmationMethod: paymentIntent.confirmation_method,
        },
      });
    }

    // Prepare confirmation parameters
    const confirmationParams: any = {
      return_url: returnUrl || `${process.env.NEXTAUTH_URL}/payment/success`,
    };

    // Add payment method if provided
    if (paymentMethodId) {
      confirmationParams.payment_method = paymentMethodId;
    }

    // Handle payment method saving
    if (savePaymentMethod) {
      confirmationParams.setup_future_usage = 'on_session';
    }

    // Confirm the payment intent
    console.log('🔄 Confirming payment intent:', paymentIntentId);
    const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
      paymentIntentId,
      confirmationParams
    );

    console.log('✅ Payment intent confirmation result:', {
      id: confirmedPaymentIntent.id,
      status: confirmedPaymentIntent.status,
      confirmationMethod: confirmedPaymentIntent.confirmation_method,
      nextAction: confirmedPaymentIntent.next_action?.type,
    });

    // Update our database record based on the result
    const statusMapping = {
      'requires_payment_method': 'PENDING',
      'requires_confirmation': 'PENDING',
      'requires_action': 'PENDING',
      'processing': 'PROCESSING',
      'requires_capture': 'PROCESSING',
      'succeeded': 'SUCCEEDED',
      'canceled': 'CANCELLED',
    };

    const dbStatus = statusMapping[confirmedPaymentIntent.status as keyof typeof statusMapping] || 'PENDING';
    
    await prisma.payment.updateMany({
      where: { 
        stripePaymentId: paymentIntentId,
        userId: user.id,
      },
      data: { 
        status: dbStatus,
        paidAt: confirmedPaymentIntent.status === 'succeeded' 
          ? new Date(confirmedPaymentIntent.created * 1000) 
          : null,
        updatedAt: new Date(),
        metadata: {
          confirmation_method: confirmedPaymentIntent.confirmation_method,
          last_payment_error: confirmedPaymentIntent.last_payment_error,
          next_action: confirmedPaymentIntent.next_action?.type,
        },
      },
    });

    // Handle different confirmation outcomes
    const response = {
      success: true,
      paymentIntent: {
        id: confirmedPaymentIntent.id,
        status: confirmedPaymentIntent.status,
        amount: confirmedPaymentIntent.amount,
        currency: confirmedPaymentIntent.currency,
        confirmationMethod: confirmedPaymentIntent.confirmation_method,
        clientSecret: confirmedPaymentIntent.client_secret,
      },
    };

    // Add next action if required (for 3D Secure, etc.)
    if (confirmedPaymentIntent.next_action) {
      (response as any).nextAction = {
        type: confirmedPaymentIntent.next_action.type,
        redirectToUrl: confirmedPaymentIntent.next_action.redirect_to_url?.url,
      };
    }

    // Add error details if payment failed
    if (confirmedPaymentIntent.last_payment_error) {
      (response as any).lastPaymentError = {
        code: confirmedPaymentIntent.last_payment_error.code,
        message: confirmedPaymentIntent.last_payment_error.message,
        type: confirmedPaymentIntent.last_payment_error.type,
      };
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Payment confirmation error:', error);

    // Handle Stripe-specific errors
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      
      // Special handling for 3D Secure and authentication errors
      if (stripeError.payment_intent) {
        return NextResponse.json({
          error: 'Payment requires additional authentication',
          paymentIntent: {
            id: stripeError.payment_intent.id,
            status: stripeError.payment_intent.status,
            clientSecret: stripeError.payment_intent.client_secret,
          },
          requiresAction: true,
          nextAction: stripeError.payment_intent.next_action,
        }, { status: 402 }); // 402 Payment Required
      }

      return NextResponse.json(
        {
          error: 'Payment confirmation failed',
          message: stripeError.message,
          type: stripeError.type,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check payment confirmation status
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

    // Get user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify ownership
    if (paymentIntent.customer !== user.stripeCustomerId) {
      return NextResponse.json(
        { error: 'Payment intent not found or access denied' },
        { status: 404 }
      );
    }

    // Get payment record from our database
    const payment = await prisma.payment.findFirst({
      where: { 
        stripePaymentId: paymentIntentId,
        userId: user.id,
      },
    });

    console.log('📋 Retrieved payment confirmation status:', paymentIntentId);

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        created: paymentIntent.created,
        confirmationMethod: paymentIntent.confirmation_method,
        nextAction: paymentIntent.next_action,
        lastPaymentError: paymentIntent.last_payment_error,
      },
      payment: payment ? {
        id: payment.id,
        status: payment.status,
        paidAt: payment.paidAt,
      } : null,
    });

  } catch (error) {
    console.error('❌ Payment confirmation status error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment confirmation status error',
          message: stripeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve payment confirmation status' },
      { status: 500 }
    );
  }
}
