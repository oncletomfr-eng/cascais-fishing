import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';

/**
 * Individual Payment Method Management API
 * Task 5.5: Payment Method Storage & Management
 * 
 * Handles update and deletion of specific payment methods
 * with proper authorization and Stripe synchronization
 */

interface PaymentMethodParams {
  id: string;
}

// Request validation schema for updating payment method
const UpdatePaymentMethodSchema = z.object({
  isDefault: z.boolean().optional(),
  billingName: z.string().optional(),
  billingEmail: z.string().email().optional(),
});

type UpdatePaymentMethodRequest = z.infer<typeof UpdatePaymentMethodSchema>;

/**
 * GET /api/payment-methods/[id]
 * Get details of a specific payment method
 */
export async function GET(
  request: NextRequest,
  { params }: { params: PaymentMethodParams }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        stripePaymentMethodId: true,
        type: true,
        isDefault: true,
        cardLast4: true,
        cardBrand: true,
        cardExpMonth: true,
        cardExpYear: true,
        billingName: true,
        billingEmail: true,
        billingCountry: true,
        billingCity: true,
        billingPostalCode: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            createdAt: true,
            description: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 transactions
        }
      }
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentMethod
    });

  } catch (error) {
    console.error('❌ Error fetching payment method:', error);
    return NextResponse.json({
      error: 'Failed to fetch payment method'
    }, { status: 500 });
  }
}

/**
 * PUT /api/payment-methods/[id]
 * Update a specific payment method
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: PaymentMethodParams }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UpdatePaymentMethodSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify the payment method belongs to the user
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (!existingPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // If setting as default, remove default from other methods
    if (validatedData.isDefault === true) {
      await prisma.paymentMethod.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
          id: { not: params.id } // Exclude current method
        },
        data: { isDefault: false }
      });
    }

    // Update the payment method
    const updatedPaymentMethod = await prisma.paymentMethod.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        stripePaymentMethodId: true,
        type: true,
        isDefault: true,
        cardLast4: true,
        cardBrand: true,
        cardExpMonth: true,
        cardExpYear: true,
        billingName: true,
        billingEmail: true,
        billingCountry: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Update billing details in Stripe if provided
    if (validatedData.billingName || validatedData.billingEmail) {
      try {
        await stripe.paymentMethods.update(existingPaymentMethod.stripePaymentMethodId, {
          billing_details: {
            name: validatedData.billingName || undefined,
            email: validatedData.billingEmail || undefined,
          }
        });
        
        console.log('✅ Updated billing details in Stripe:', existingPaymentMethod.stripePaymentMethodId);
      } catch (stripeError) {
        console.warn('⚠️ Failed to update Stripe billing details:', stripeError);
        // Don't fail the request if Stripe update fails
      }
    }

    console.log('✅ Payment method updated:', {
      id: updatedPaymentMethod.id,
      userId: user.id,
      isDefault: updatedPaymentMethod.isDefault,
      last4: updatedPaymentMethod.cardLast4
    });

    return NextResponse.json({
      success: true,
      paymentMethod: updatedPaymentMethod,
      message: 'Payment method updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating payment method:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to update payment method'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/payment-methods/[id]
 * Delete a specific payment method
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: PaymentMethodParams }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find the payment method and verify ownership
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        status: 'ACTIVE'
      },
      include: {
        payments: {
          where: { status: 'PENDING' },
          select: { id: true }
        }
      }
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found' },
        { status: 404 }
      );
    }

    // Check if there are pending payments using this method
    if (paymentMethod.payments.length > 0) {
      return NextResponse.json({
        error: 'Cannot delete payment method with pending payments',
        details: 'Please wait for pending payments to complete or cancel them first'
      }, { status: 409 });
    }

    // Detach payment method from Stripe customer
    try {
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      console.log('✅ Detached payment method from Stripe:', paymentMethod.stripePaymentMethodId);
    } catch (stripeError: any) {
      if (stripeError.code === 'resource_missing') {
        console.warn('⚠️ Payment method already detached from Stripe:', paymentMethod.stripePaymentMethodId);
      } else {
        console.error('❌ Failed to detach from Stripe:', stripeError);
        // Don't fail the deletion if Stripe detach fails
      }
    }

    // If this was the default method, set another method as default
    if (paymentMethod.isDefault) {
      const nextPaymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          id: { not: params.id }
        },
        orderBy: { lastUsedAt: 'desc' }
      });

      if (nextPaymentMethod) {
        await prisma.paymentMethod.update({
          where: { id: nextPaymentMethod.id },
          data: { isDefault: true }
        });
        
        console.log('✅ Set new default payment method:', nextPaymentMethod.id);
      }
    }

    // Mark as inactive instead of hard delete to preserve payment history
    await prisma.paymentMethod.update({
      where: { id: params.id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date(),
        metadata: {
          ...((typeof paymentMethod.metadata === 'object' && paymentMethod.metadata) || {}),
          deleted_at: new Date().toISOString(),
          deleted_by_user: true,
        }
      }
    });

    console.log('✅ Payment method deleted:', {
      id: paymentMethod.id,
      userId: user.id,
      stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
      last4: paymentMethod.cardLast4
    });

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting payment method:', error);
    return NextResponse.json({
      error: 'Failed to delete payment method'
    }, { status: 500 });
  }
}
