import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe, isStripeConfigured, formatAmountForStripe } from '@/lib/stripe';
import { z } from 'zod';

/**
 * Payment Retry API
 * Task 5.3: Payment Intent Management - Retry Logic
 * 
 * Allows users to retry failed payments with improved error handling
 */

interface PaymentRetryParams {
  id: string;
}

// Request validation schema
const RetryPaymentSchema = z.object({
  paymentMethodId: z.string().optional(),
  savePaymentMethod: z.boolean().default(false),
  returnUrl: z.string().url().optional(),
  createNew: z.boolean().default(false), // Whether to create new payment intent
});

type RetryPaymentRequest = z.infer<typeof RetryPaymentSchema>;

export async function POST(
  request: NextRequest,
  { params }: { params: PaymentRetryParams }
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
    const validationResult = RetryPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
        },
        { status: 400 }
      );
    }

    const { paymentMethodId, savePaymentMethod, returnUrl, createNew } = validationResult.data;

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

    // Find the original payment
    const originalPayment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { id: paymentId },
          { stripePaymentId: paymentId }
        ],
        userId: user.id,
      },
    });

    if (!originalPayment) {
      return NextResponse.json(
        { error: 'Original payment not found' },
        { status: 404 }
      );
    }

    // Check if payment can be retried
    const retryableStatuses = ['FAILED', 'CANCELLED'];
    if (!retryableStatuses.includes(originalPayment.status)) {
      return NextResponse.json(
        { 
          error: 'Payment cannot be retried',
          message: `Payment is in ${originalPayment.status} status and cannot be retried`,
          currentStatus: originalPayment.status 
        },
        { status: 400 }
      );
    }

    let paymentIntent;
    let isNewPaymentIntent = false;

    // Decision: retry existing or create new payment intent
    if (createNew || !originalPayment.stripePaymentId) {
      console.log('🔄 Creating new payment intent for retry');
      
      // Create a new payment intent with the same parameters
      paymentIntent = await stripe.paymentIntents.create({
        amount: originalPayment.amount,
        currency: originalPayment.currency.toLowerCase(),
        customer: user.stripeCustomerId!,
        description: originalPayment.description || 'Cascais Fishing Payment (Retry)',
        metadata: {
          ...((originalPayment.metadata as any) || {}),
          original_payment_id: originalPayment.id,
          retry_attempt: new Date().toISOString(),
          retried_by: user.id,
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        setup_future_usage: savePaymentMethod ? 'on_session' : undefined,
        receipt_email: user.email!,
      });
      
      isNewPaymentIntent = true;

    } else {
      console.log('🔄 Attempting to retry existing payment intent');
      
      try {
        // Try to retrieve the existing payment intent
        const existingPaymentIntent = await stripe.paymentIntents.retrieve(originalPayment.stripePaymentId);
        
        if (existingPaymentIntent.status === 'canceled' || existingPaymentIntent.status === 'succeeded') {
          // If cancelled or succeeded, create a new one
          throw new Error('Payment intent cannot be reused');
        }
        
        paymentIntent = existingPaymentIntent;
        
      } catch (error) {
        console.log('⚠️ Existing payment intent cannot be reused, creating new one:', error);
        
        // Create new payment intent
        paymentIntent = await stripe.paymentIntents.create({
          amount: originalPayment.amount,
          currency: originalPayment.currency.toLowerCase(),
          customer: user.stripeCustomerId!,
          description: originalPayment.description || 'Cascais Fishing Payment (Retry)',
          metadata: {
            ...((originalPayment.metadata as any) || {}),
            original_payment_id: originalPayment.id,
            retry_attempt: new Date().toISOString(),
            retried_by: user.id,
            retry_reason: 'previous_payment_intent_unusable',
          },
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never',
          },
          setup_future_usage: savePaymentMethod ? 'on_session' : undefined,
          receipt_email: user.email!,
        });
        
        isNewPaymentIntent = true;
      }
    }

    // Update the original payment record or create a new one
    let updatedPayment;

    if (isNewPaymentIntent) {
      // Create a new payment record for the retry
      updatedPayment = await prisma.payment.create({
        data: {
          userId: user.id,
          tripId: originalPayment.tripId,
          stripePaymentId: paymentIntent.id,
          type: originalPayment.type,
          amount: originalPayment.amount,
          currency: originalPayment.currency,
          status: 'PENDING',
          commissionAmount: originalPayment.commissionAmount,
          commissionRate: originalPayment.commissionRate,
          description: originalPayment.description,
          metadata: {
            ...((originalPayment.metadata as any) || {}),
            original_payment_id: originalPayment.id,
            is_retry: true,
            retry_attempt: new Date().toISOString(),
            retry_count: ((originalPayment.metadata as any)?.retry_count || 0) + 1,
          },
        },
      });
      
      // Mark original as retried
      await prisma.payment.update({
        where: { id: originalPayment.id },
        data: { 
          status: originalPayment.status, // Keep original status
          updatedAt: new Date(),
          metadata: {
            ...((originalPayment.metadata as any) || {}),
            retried: true,
            retried_at: new Date().toISOString(),
            retry_payment_id: updatedPayment.id,
          },
        },
      });
      
    } else {
      // Update the existing payment record
      updatedPayment = await prisma.payment.update({
        where: { id: originalPayment.id },
        data: { 
          status: 'PENDING',
          updatedAt: new Date(),
          metadata: {
            ...((originalPayment.metadata as any) || {}),
            retry_attempt: new Date().toISOString(),
            retry_count: ((originalPayment.metadata as any)?.retry_count || 0) + 1,
          },
        },
      });
    }

    console.log('✅ Payment retry prepared:', {
      originalPaymentId: originalPayment.id,
      newPaymentId: updatedPayment.id,
      stripePaymentId: paymentIntent.id,
      isNewPaymentIntent,
      retryCount: ((updatedPayment.metadata as any)?.retry_count || 1),
    });

    // If payment method provided, attempt immediate confirmation
    if (paymentMethodId) {
      console.log('🔄 Attempting immediate confirmation with provided payment method');
      
      try {
        const confirmationParams: any = {
          payment_method: paymentMethodId,
          return_url: returnUrl || `${process.env.NEXTAUTH_URL}/payment/success`,
        };

        const confirmedPaymentIntent = await stripe.paymentIntents.confirm(
          paymentIntent.id,
          confirmationParams
        );

        // Update status based on confirmation result
        const statusMapping = {
          'requires_payment_method': 'PENDING',
          'requires_confirmation': 'PENDING',
          'requires_action': 'PENDING',
          'processing': 'PROCESSING',
          'requires_capture': 'PROCESSING',
          'succeeded': 'SUCCEEDED',
          'canceled': 'CANCELLED',
        };

        const newStatus = statusMapping[confirmedPaymentIntent.status as keyof typeof statusMapping] || 'PENDING';
        
        await prisma.payment.update({
          where: { id: updatedPayment.id },
          data: { 
            status: newStatus,
            paidAt: confirmedPaymentIntent.status === 'succeeded' 
              ? new Date(confirmedPaymentIntent.created * 1000) 
              : null,
            updatedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: 'Payment retry confirmed successfully',
          payment: {
            id: updatedPayment.id,
            status: newStatus,
            originalPaymentId: originalPayment.id,
            isNewPaymentIntent,
          },
          paymentIntent: {
            id: confirmedPaymentIntent.id,
            status: confirmedPaymentIntent.status,
            clientSecret: confirmedPaymentIntent.client_secret,
            nextAction: confirmedPaymentIntent.next_action,
          },
        });

      } catch (confirmError) {
        console.warn('⚠️ Immediate confirmation failed, returning for client-side handling:', confirmError);
        // Continue to return the payment intent for client-side confirmation
      }
    }

    // Return payment intent for client-side confirmation
    return NextResponse.json({
      success: true,
      message: 'Payment retry prepared successfully',
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        originalPaymentId: originalPayment.id,
        isNewPaymentIntent,
        retryCount: ((updatedPayment.metadata as any)?.retry_count || 1),
      },
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });

  } catch (error) {
    console.error('❌ Payment retry error:', error);

    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any;
      return NextResponse.json(
        {
          error: 'Payment retry failed',
          message: stripeError.message,
          type: stripeError.type,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to retry payment' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check retry eligibility and history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: PaymentRetryParams }
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

    // Find payment and any retries
    const payment = await prisma.payment.findFirst({
      where: { 
        OR: [
          { id: paymentId },
          { stripePaymentId: paymentId }
        ],
        userId: user.id,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Find all retry attempts
    const retryAttempts = await prisma.payment.findMany({
      where: { 
        userId: user.id,
        metadata: {
          path: ['original_payment_id'],
          equals: payment.id
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Check retry eligibility
    const canRetry = ['FAILED', 'CANCELLED'].includes(payment.status);
    const retryCount = ((payment.metadata as any)?.retry_count || 0) + retryAttempts.length;
    const maxRetries = 5; // Configurable limit

    console.log('🔍 Retry eligibility check:', {
      paymentId: payment.id,
      status: payment.status,
      canRetry,
      retryCount,
      maxRetries,
    });

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        createdAt: payment.createdAt,
      },
      retryEligibility: {
        canRetry: canRetry && retryCount < maxRetries,
        reason: !canRetry 
          ? `Payment status is ${payment.status}` 
          : retryCount >= maxRetries 
            ? `Maximum retry attempts (${maxRetries}) reached`
            : null,
        retryCount,
        maxRetries,
      },
      retryHistory: retryAttempts.map(attempt => ({
        id: attempt.id,
        status: attempt.status,
        createdAt: attempt.createdAt,
        stripePaymentId: attempt.stripePaymentId,
      })),
      recommendations: {
        createNew: retryCount > 2, // Recommend new payment intent after multiple failures
        contactSupport: retryCount >= maxRetries,
      }
    });

  } catch (error) {
    console.error('❌ Retry eligibility check error:', error);
    return NextResponse.json(
      { error: 'Failed to check retry eligibility' },
      { status: 500 }
    );
  }
}
