import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { z } from 'zod';

/**
 * Payment Methods Management API
 * Task 5.5: Payment Method Storage & Management
 * 
 * Handles CRUD operations for user's saved payment methods
 * with PCI compliant data handling and Stripe synchronization
 */

// Request validation schema for saving payment method
const SavePaymentMethodSchema = z.object({
  stripePaymentMethodId: z.string().min(1, 'Stripe Payment Method ID is required'),
  isDefault: z.boolean().optional().default(false),
  billingName: z.string().optional(),
  billingEmail: z.string().email().optional(),
});

type SavePaymentMethodRequest = z.infer<typeof SavePaymentMethodSchema>;

/**
 * GET /api/payment-methods
 * Retrieve all saved payment methods for the authenticated user
 */
export async function GET(request: NextRequest) {
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
      select: { id: true, stripeCustomerId: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get saved payment methods from database
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { 
        userId: user.id,
        status: 'ACTIVE' 
      },
      orderBy: [
        { isDefault: 'desc' }, // Default methods first
        { lastUsedAt: 'desc' }, // Then by last used
        { createdAt: 'desc' }   // Then by creation date
      ],
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
      }
    });

    // Sync with Stripe to ensure data consistency
    if (user.stripeCustomerId) {
      try {
        await syncPaymentMethodsWithStripe(user.id, user.stripeCustomerId);
      } catch (syncError) {
        console.warn('⚠️ Failed to sync with Stripe, returning cached data:', syncError);
      }
    }

    return NextResponse.json({
      success: true,
      paymentMethods,
      count: paymentMethods.length
    });

  } catch (error) {
    console.error('❌ Error fetching payment methods:', error);
    return NextResponse.json({
      error: 'Failed to fetch payment methods'
    }, { status: 500 });
  }
}

/**
 * POST /api/payment-methods
 * Save a new payment method for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = SavePaymentMethodSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, stripeCustomerId: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Retrieve payment method from Stripe to get complete data
    const stripePaymentMethod = await stripe.paymentMethods.retrieve(
      validatedData.stripePaymentMethodId
    );

    // If this payment method doesn't belong to the user's customer, attach it
    if (user.stripeCustomerId && stripePaymentMethod.customer !== user.stripeCustomerId) {
      await stripe.paymentMethods.attach(validatedData.stripePaymentMethodId, {
        customer: user.stripeCustomerId,
      });
    }

    // Get updated payment method data from Stripe
    const attachedPaymentMethod = await stripe.paymentMethods.retrieve(
      validatedData.stripePaymentMethodId
    );

    // Extract PCI compliant card data
    const cardData = attachedPaymentMethod.card ? {
      cardLast4: attachedPaymentMethod.card.last4,
      cardBrand: attachedPaymentMethod.card.brand,
      cardExpMonth: attachedPaymentMethod.card.exp_month,
      cardExpYear: attachedPaymentMethod.card.exp_year,
      cardFingerprint: attachedPaymentMethod.card.fingerprint,
    } : {};

    // Extract billing address data
    const billingData = attachedPaymentMethod.billing_details ? {
      billingName: attachedPaymentMethod.billing_details.name || validatedData.billingName,
      billingEmail: attachedPaymentMethod.billing_details.email || validatedData.billingEmail,
      billingCountry: attachedPaymentMethod.billing_details.address?.country,
      billingCity: attachedPaymentMethod.billing_details.address?.city,
      billingPostalCode: attachedPaymentMethod.billing_details.address?.postal_code,
    } : {};

    // If this should be the default method, update existing defaults
    if (validatedData.isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      });
    }

    // Save payment method to database
    const savedPaymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: user.id,
        stripePaymentMethodId: validatedData.stripePaymentMethodId,
        type: mapStripeTypeToEnum(attachedPaymentMethod.type),
        isDefault: validatedData.isDefault,
        ...cardData,
        ...billingData,
        status: 'ACTIVE',
        metadata: {
          stripe_type: attachedPaymentMethod.type,
          stripe_created: attachedPaymentMethod.created,
        }
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
      }
    });

    console.log('✅ Payment method saved:', {
      id: savedPaymentMethod.id,
      userId: user.id,
      type: savedPaymentMethod.type,
      isDefault: savedPaymentMethod.isDefault,
      last4: savedPaymentMethod.cardLast4
    });

    return NextResponse.json({
      success: true,
      paymentMethod: savedPaymentMethod,
      message: 'Payment method saved successfully'
    });

  } catch (error) {
    console.error('❌ Error saving payment method:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to save payment method'
    }, { status: 500 });
  }
}

/**
 * Sync payment methods with Stripe to ensure consistency
 */
async function syncPaymentMethodsWithStripe(userId: string, stripeCustomerId: string): Promise<void> {
  try {
    // Get payment methods from Stripe
    const stripePaymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      limit: 100,
    });

    // Get existing payment methods from database
    const existingPaymentMethods = await prisma.paymentMethod.findMany({
      where: { userId },
      select: { stripePaymentMethodId: true, id: true }
    });

    const existingStripeIds = new Set(
      existingPaymentMethods.map(pm => pm.stripePaymentMethodId)
    );

    // Add new payment methods from Stripe that aren't in our database
    for (const stripePaymentMethod of stripePaymentMethods.data) {
      if (!existingStripeIds.has(stripePaymentMethod.id)) {
        const cardData = stripePaymentMethod.card ? {
          cardLast4: stripePaymentMethod.card.last4,
          cardBrand: stripePaymentMethod.card.brand,
          cardExpMonth: stripePaymentMethod.card.exp_month,
          cardExpYear: stripePaymentMethod.card.exp_year,
          cardFingerprint: stripePaymentMethod.card.fingerprint,
        } : {};

        const billingData = stripePaymentMethod.billing_details ? {
          billingName: stripePaymentMethod.billing_details.name,
          billingEmail: stripePaymentMethod.billing_details.email,
          billingCountry: stripePaymentMethod.billing_details.address?.country,
          billingCity: stripePaymentMethod.billing_details.address?.city,
          billingPostalCode: stripePaymentMethod.billing_details.address?.postal_code,
        } : {};

        await prisma.paymentMethod.create({
          data: {
            userId,
            stripePaymentMethodId: stripePaymentMethod.id,
            type: mapStripeTypeToEnum(stripePaymentMethod.type),
            ...cardData,
            ...billingData,
            status: 'ACTIVE',
            metadata: {
              stripe_type: stripePaymentMethod.type,
              stripe_created: stripePaymentMethod.created,
              synced_from_stripe: true,
            }
          }
        });

        console.log('✅ Synced payment method from Stripe:', stripePaymentMethod.id);
      }
    }

    // Mark payment methods as inactive if they no longer exist in Stripe
    const stripePaymentMethodIds = new Set(
      stripePaymentMethods.data.map(pm => pm.id)
    );

    for (const existingPaymentMethod of existingPaymentMethods) {
      if (!stripePaymentMethodIds.has(existingPaymentMethod.stripePaymentMethodId)) {
        await prisma.paymentMethod.update({
          where: { id: existingPaymentMethod.id },
          data: { status: 'INACTIVE' }
        });

        console.log('⚠️ Marked payment method as inactive:', existingPaymentMethod.stripePaymentMethodId);
      }
    }

  } catch (error) {
    console.error('❌ Error syncing payment methods with Stripe:', error);
    throw error;
  }
}

/**
 * Map Stripe payment method type to our enum
 */
function mapStripeTypeToEnum(stripeType: string): string {
  const typeMapping: Record<string, string> = {
    'card': 'CARD',
    'sepa_debit': 'SEPA_DEBIT',
    'ideal': 'IDEAL',
    'bancontact': 'BANCONTACT',
    'giropay': 'GIROPAY',
    'sofort': 'SOFORT',
    'paypal': 'PAYPAL',
  };
  
  return typeMapping[stripeType] || 'CARD';
}
