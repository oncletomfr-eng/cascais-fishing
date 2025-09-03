import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Set Default Payment Method API
 * Task 5.5: Payment Method Storage & Management
 * 
 * Dedicated endpoint for setting a payment method as the default
 * with proper atomic operations and validation
 */

interface PaymentMethodParams {
  id: string;
}

/**
 * POST /api/payment-methods/[id]/set-default
 * Set a specific payment method as the default for the user
 */
export async function POST(
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

    // Verify the payment method belongs to the user and is active
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: user.id,
        status: 'ACTIVE'
      }
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method not found or inactive' },
        { status: 404 }
      );
    }

    // If already default, return success without changes
    if (paymentMethod.isDefault) {
      return NextResponse.json({
        success: true,
        message: 'Payment method is already the default',
        paymentMethod: {
          id: paymentMethod.id,
          isDefault: true,
          cardLast4: paymentMethod.cardLast4,
          cardBrand: paymentMethod.cardBrand
        }
      });
    }

    // Perform atomic update: remove default from all others, set this one as default
    await prisma.$transaction(async (tx) => {
      // Remove default status from all user's payment methods
      await tx.paymentMethod.updateMany({
        where: {
          userId: user.id,
          isDefault: true
        },
        data: { isDefault: false }
      });

      // Set the specified method as default
      await tx.paymentMethod.update({
        where: { id: params.id },
        data: {
          isDefault: true,
          updatedAt: new Date()
        }
      });
    });

    // Get updated payment method data
    const updatedPaymentMethod = await prisma.paymentMethod.findUnique({
      where: { id: params.id },
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
        billingCountry: true,
        status: true,
        updatedAt: true,
      }
    });

    console.log('✅ Set default payment method:', {
      id: params.id,
      userId: user.id,
      last4: paymentMethod.cardLast4,
      brand: paymentMethod.cardBrand
    });

    return NextResponse.json({
      success: true,
      message: 'Default payment method updated successfully',
      paymentMethod: updatedPaymentMethod
    });

  } catch (error) {
    console.error('❌ Error setting default payment method:', error);
    return NextResponse.json({
      error: 'Failed to set default payment method'
    }, { status: 500 });
  }
}
