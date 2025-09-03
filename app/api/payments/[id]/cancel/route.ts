import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

/**
 * Payment Cancellation API
 * Task 5.3: Payment Intent Management - Cancellation Handling
 * 
 * Allows users to cancel payments that haven't been processed yet
 */

interface PaymentCancelParams {
  id: string;
}

// Request validation schema
const CancelPaymentSchema = z.object({
  reason: z.enum([
    'duplicate', 
    'fraudulent', 
    'requested_by_customer',
    'abandoned'
  ]).default('requested_by_customer'),
  cancellationReason: z.string().optional(),
});

type CancelPaymentRequest = z.infer<typeof CancelPaymentSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: PaymentCancelParams }
) {
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

    const paymentId = params.id;
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = CancelPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const { reason, cancellationReason } = validationResult.data;

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

    // Find payment in our database
    const payment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { id: paymentId },
          { stripePaymentId: paymentId }
        ],
        userId: user.id,
      },
    });

    if (!payment || !payment.stripePaymentId) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check if payment can be cancelled
    if (!['PENDING', 'PROCESSING'].includes(payment.status)) {
      return NextResponse.json(
        { 
          error: 'Payment cannot be cancelled',
          message: `Payment is in ${payment.status} status and cannot be cancelled`,
          currentStatus: payment.status 
        },
        { status: 400 }
      );
    }

    // Get current status from Stripe
    let stripePaymentIntent;
    try {
      stripePaymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
    } catch (error) {
      console.error('❌ Failed to retrieve payment intent for cancellation:', error);
      return NextResponse.json(
        { error: 'Failed to retrieve payment status from payment processor' },
        { status: 500 }
      );
    }

    // Check if Stripe payment can be cancelled
    const cancellableStatuses = [
      'requires_payment_method',
      'requires_confirmation',
      'requires_action',
      'requires_capture'
    ];

    if (!cancellableStatuses.includes(stripePaymentIntent.status)) {
      return NextResponse.json(
        { 
          error: 'Payment cannot be cancelled',
          message: `Payment is in ${stripePaymentIntent.status} status and cannot be cancelled`,
          stripeStatus: stripePaymentIntent.status 
        },
        { status: 400 }
      );
    }

    // Cancel the payment intent in Stripe
    console.log('🚫 Cancelling payment intent:', payment.stripePaymentId);
    let cancelledPaymentIntent;
    
    try {
      cancelledPaymentIntent = await stripe.paymentIntents.cancel(
        payment.stripePaymentId,
        { 
          cancellation_reason: reason,
        }
      );
    } catch (error) {
      console.error('❌ Failed to cancel payment intent in Stripe:', error);
      
      if (error && typeof error === 'object' && 'type' in error) {
        const stripeError = error as any;
        return NextResponse.json(
          {
            error: 'Payment cancellation failed',
            message: stripeError.message,
            type: stripeError.type,
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to cancel payment in payment processor' },
        { status: 500 }
      );
    }

    // Update our database record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date(),
        metadata: {
          ...((payment.metadata as any) || {}),
          cancellation: {
            cancelled_at: new Date().toISOString(),
            reason,
            cancellation_reason: cancellationReason,
            cancelled_by: user.id,
            stripe_status_before_cancellation: stripePaymentIntent.status,
            stripe_status_after_cancellation: cancelledPaymentIntent.status,
          }
        },
      },
    });

    console.log('✅ Payment cancelled successfully:', {
      paymentId: payment.id,
      stripeId: payment.stripePaymentId,
      reason,
      cancelledBy: user.id,
    });

    // Return cancellation confirmation
    return NextResponse.json({
      success: true,
      message: 'Payment cancelled successfully',
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        cancelledAt: updatedPayment.updatedAt,
      },
      stripePaymentIntent: {
        id: cancelledPaymentIntent.id,
        status: cancelledPaymentIntent.status,
        cancellationReason: cancelledPaymentIntent.cancellation_reason,
      },
      refund: {
        eligible: false, // Since payment wasn't processed, no refund needed
        message: 'No refund necessary as payment was not processed'
      }
    });

  } catch (error) {
    console.error('❌ Payment cancellation error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment cancellation failed',
          message: stripeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to cancel payment' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if payment can be cancelled
 */
export async function GET(
  request: NextRequest,
  { params }: { params: PaymentCancelParams }
) {
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

    const paymentId = params.id;
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
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

    // Find payment
    const payment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { id: paymentId },
          { stripePaymentId: paymentId }
        ],
        userId: user.id,
      },
    });

    if (!payment || !payment.stripePaymentId) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Check database status
    const dbCancellable = ['PENDING', 'PROCESSING'].includes(payment.status);

    // Check Stripe status if possible
    let stripeCancellable = false;
    let stripeStatus = null;
    
    try {
      const stripePaymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
      stripeStatus = stripePaymentIntent.status;
      
      const cancellableStatuses = [
        'requires_payment_method',
        'requires_confirmation', 
        'requires_action',
        'requires_capture'
      ];
      
      stripeCancellable = cancellableStatuses.includes(stripePaymentIntent.status);
    } catch (error) {
      console.warn('⚠️ Failed to check Stripe status for cancellation check:', error);
    }

    const canCancel = dbCancellable && (stripeCancellable || stripeStatus === null);

    console.log('🔍 Cancellation eligibility check:', {
      paymentId: payment.id,
      dbStatus: payment.status,
      stripeStatus,
      dbCancellable,
      stripeCancellable,
      canCancel,
    });

    return NextResponse.json({
      success: true,
      cancellable: canCancel,
      payment: {
        id: payment.id,
        status: payment.status,
        stripeStatus,
      },
      reasons: {
        database: dbCancellable ? null : `Payment status is ${payment.status}`,
        stripe: stripeCancellable || stripeStatus === null ? null : `Stripe status is ${stripeStatus}`,
      },
      availableReasons: [
        { value: 'requested_by_customer', label: 'Requested by customer' },
        { value: 'duplicate', label: 'Duplicate payment' },
        { value: 'fraudulent', label: 'Fraudulent' },
        { value: 'abandoned', label: 'Abandoned' },
      ]
    });

  } catch (error) {
    console.error('❌ Cancellation check error:', error);
    return NextResponse.json(
      { error: 'Failed to check cancellation eligibility' },
      { status: 500 }
    );
  }
}
