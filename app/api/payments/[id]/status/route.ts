import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured } from '@/lib/stripe';

/**
 * Payment Status Tracking API
 * Task 5.3: Payment Intent Management - Status Tracking
 * 
 * Provides detailed payment status information and history tracking
 */

interface PaymentStatusParams {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: PaymentStatusParams }
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

    // Find payment in our database
    const payment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { id: paymentId },
          { stripePaymentId: paymentId }
        ],
        userId: user.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        trip: {
          select: { 
            id: true, 
            date: true, 
            pricePerPerson: true,
            description: true 
          }
        }
      }
    });

    if (!payment || !payment.stripePaymentId) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Get fresh status from Stripe
    let stripePaymentIntent: any = null;
    let stripeError: any = null;

    try {
      stripePaymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);
    } catch (error) {
      console.warn('⚠️ Failed to retrieve from Stripe:', error);
      stripeError = error;
    }

    // Update our database record if Stripe data is available and different
    if (stripePaymentIntent && stripePaymentIntent.status) {
      const statusMapping = {
        'requires_payment_method': 'PENDING',
        'requires_confirmation': 'PENDING',
        'requires_action': 'PENDING',
        'processing': 'PROCESSING',
        'requires_capture': 'PROCESSING',
        'succeeded': 'SUCCEEDED',
        'canceled': 'CANCELLED',
      };

      const newStatus = statusMapping[stripePaymentIntent.status as keyof typeof statusMapping];
      
      if (newStatus && newStatus !== payment.status) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { 
            status: newStatus,
            paidAt: stripePaymentIntent.status === 'succeeded' 
              ? new Date(stripePaymentIntent.created * 1000) 
              : payment.paidAt,
            updatedAt: new Date(),
            metadata: {
              ...((payment.metadata as any) || {}),
              last_status_check: new Date().toISOString(),
              stripe_status: stripePaymentIntent.status,
            },
          },
        });
        
        // Refresh payment data
        payment.status = newStatus;
        if (stripePaymentIntent.status === 'succeeded' && !payment.paidAt) {
          payment.paidAt = new Date(stripePaymentIntent.created * 1000);
        }
      }
    }

    // Build comprehensive status response
    const statusInfo = {
      // Database payment info
      payment: {
        id: payment.id,
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        paidAt: payment.paidAt,
        commissionAmount: payment.commissionAmount,
        commissionRate: payment.commissionRate,
        metadata: payment.metadata,
        trip: payment.trip,
      },
      
      // Stripe payment intent info (if available)
      stripePaymentIntent: stripePaymentIntent ? {
        id: stripePaymentIntent.id,
        status: stripePaymentIntent.status,
        amount: stripePaymentIntent.amount,
        currency: stripePaymentIntent.currency,
        created: stripePaymentIntent.created,
        confirmationMethod: stripePaymentIntent.confirmation_method,
        nextAction: stripePaymentIntent.next_action,
        lastPaymentError: stripePaymentIntent.last_payment_error,
        charges: stripePaymentIntent.charges?.data?.map((charge: any) => ({
          id: charge.id,
          status: charge.status,
          amount: charge.amount,
          created: charge.created,
          failureCode: charge.failure_code,
          failureMessage: charge.failure_message,
          receiptUrl: charge.receipt_url,
        })) || [],
      } : null,

      // Status analysis
      statusAnalysis: {
        isSuccessful: payment.status === 'SUCCEEDED',
        isPending: ['PENDING', 'PROCESSING'].includes(payment.status),
        isFailed: payment.status === 'FAILED',
        isCancelled: payment.status === 'CANCELLED',
        requiresAction: stripePaymentIntent?.status === 'requires_action',
        canRetry: ['FAILED', 'CANCELLED'].includes(payment.status),
        canCancel: ['PENDING', 'PROCESSING'].includes(payment.status),
        hasErrors: !!stripePaymentIntent?.last_payment_error,
      },

      // Error information
      errors: {
        stripeError: stripeError ? {
          type: stripeError.type,
          message: stripeError.message,
          code: stripeError.code,
        } : null,
        lastPaymentError: stripePaymentIntent?.last_payment_error || null,
      }
    };

    console.log('📊 Payment status retrieved:', {
      paymentId: payment.id,
      stripeId: payment.stripePaymentId,
      status: payment.status,
      stripeStatus: stripePaymentIntent?.status,
      requiresAction: statusInfo.statusAnalysis.requiresAction,
    });

    return NextResponse.json({
      success: true,
      ...statusInfo,
    });

  } catch (error) {
    console.error('❌ Payment status tracking error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment status retrieval failed',
          message: stripeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retrieve payment status' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to manually sync payment status with Stripe
 */
export async function POST(
  request: NextRequest,
  { params }: { params: PaymentStatusParams }
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
    const body = await request.json();
    const { forceSync = false } = body;

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

    // Force sync with Stripe
    const stripePaymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentId);

    const statusMapping = {
      'requires_payment_method': 'PENDING',
      'requires_confirmation': 'PENDING',
      'requires_action': 'PENDING',
      'processing': 'PROCESSING',
      'requires_capture': 'PROCESSING',
      'succeeded': 'SUCCEEDED',
      'canceled': 'CANCELLED',
    };

    const newStatus = statusMapping[stripePaymentIntent.status as keyof typeof statusMapping] || 'PENDING';

    // Update our database
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: newStatus,
        paidAt: stripePaymentIntent.status === 'succeeded' 
          ? new Date(stripePaymentIntent.created * 1000) 
          : payment.paidAt,
        updatedAt: new Date(),
        metadata: {
          ...((payment.metadata as any) || {}),
          manual_sync: new Date().toISOString(),
          stripe_status: stripePaymentIntent.status,
          force_sync: forceSync,
        },
      },
    });

    console.log('🔄 Payment status manually synced:', {
      paymentId: payment.id,
      oldStatus: payment.status,
      newStatus: updatedPayment.status,
      stripeStatus: stripePaymentIntent.status,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment status synchronized',
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        previousStatus: payment.status,
      },
      stripeStatus: stripePaymentIntent.status,
    });

  } catch (error) {
    console.error('❌ Payment status sync error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment status sync failed',
          message: stripeError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to sync payment status' },
      { status: 500 }
    );
  }
}
