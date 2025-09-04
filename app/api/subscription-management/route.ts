/**
 * Subscription Management API Endpoint  
 * Task 8.5: Captain Subscription Tier Integration
 * 
 * Taking the role of Senior Backend Developer specializing in Subscription Management
 * 
 * Handles subscription tier upgrades, downgrades, and tier-based commission rate management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';

// Validation schemas
const tierUpgradeSchema = z.object({
  targetTier: z.enum(['starter', 'professional', 'premium']),
  billingPeriod: z.enum(['monthly', 'quarterly', 'yearly']).optional().default('monthly')
});

const tierAnalyticsSchema = z.object({
  captainId: z.string().optional(),
  includeProjections: z.boolean().optional().default(true)
});

// Commission tier definitions (matches frontend and commission API)
interface CommissionTier {
  id: string;
  name: string;
  displayName: string;
  commissionRate: number;
  minimumEarnings: number;
  features: string[];
  subscriptionPrice: number; // Monthly price in cents
  color: string;
  popular?: boolean;
}

const COMMISSION_TIERS: CommissionTier[] = [
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    commissionRate: 20.0,
    minimumEarnings: 50000, // €500
    subscriptionPrice: 0, // Free tier
    features: ['Basic commission tracking', 'Monthly payouts', 'Standard support'],
    color: '#9E9E9E'
  },
  {
    id: 'professional',
    name: 'professional', 
    displayName: 'Professional',
    commissionRate: 17.5,
    minimumEarnings: 150000, // €1500
    subscriptionPrice: 2900, // €29/month
    features: ['Advanced analytics', 'Bi-weekly payouts', 'Priority support', 'Tax reporting'],
    color: '#2196F3',
    popular: true
  },
  {
    id: 'premium',
    name: 'premium',
    displayName: 'Premium',
    commissionRate: 15.0,
    minimumEarnings: 300000, // €3000
    subscriptionPrice: 4900, // €49/month
    features: ['Real-time analytics', 'Weekly payouts', 'Dedicated support', 'Advanced tax tools', 'Custom reporting'],
    color: '#FF9800'
  }
];

// Map subscription tier enum to commission tier
function mapSubscriptionTierToCommissionTier(subscriptionTier: string): CommissionTier {
  switch (subscriptionTier) {
    case 'CAPTAIN_PREMIUM':
      return COMMISSION_TIERS.find(t => t.id === 'premium') || COMMISSION_TIERS[0];
    case 'CAPTAIN_PROFESSIONAL':
      return COMMISSION_TIERS.find(t => t.id === 'professional') || COMMISSION_TIERS[0];
    default:
      return COMMISSION_TIERS[0]; // Starter/Free
  }
}

// Get captain's monthly earnings
async function getMonthlyEarnings(captainId: string): Promise<number> {
  const startOfCurrentMonth = startOfMonth(new Date());
  const endOfCurrentMonth = endOfMonth(new Date());

  try {
    const payments = await prisma.payment.findMany({
      where: {
        trip: {
          captainId: captainId
        },
        status: {
          in: ['SUCCEEDED', 'COMPLETED']
        },
        createdAt: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      select: {
        amount: true
      }
    });

    const totalEarnings = payments.reduce((sum, payment) => sum + payment.amount, 0);
    return totalEarnings;

  } catch (error) {
    console.error('Error calculating monthly earnings:', error);
    return 0;
  }
}

// Calculate tier qualification based on earnings
function calculateCurrentTier(monthlyEarnings: number): CommissionTier {
  const qualifiedTiers = COMMISSION_TIERS
    .filter(tier => monthlyEarnings >= tier.minimumEarnings)
    .sort((a, b) => b.minimumEarnings - a.minimumEarnings);
  
  return qualifiedTiers[0] || COMMISSION_TIERS[0];
}

// Get subscription analytics for captain
async function getSubscriptionAnalytics(captainId: string, includeProjections: boolean = true) {
  try {
    // Get current subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: captainId,
        status: 'ACTIVE'
      }
    });

    // Get monthly earnings
    const monthlyEarnings = await getMonthlyEarnings(captainId);
    
    // Determine current tier (based on earnings and subscription)
    const earnings-basedTier = calculateCurrentTier(monthlyEarnings);
    const subscriptionTier = subscription ? mapSubscriptionTierToCommissionTier(subscription.tier) : COMMISSION_TIERS[0];
    
    // Use the better of the two (lower commission rate = better)
    const currentTier = subscriptionTier.commissionRate <= earnings-basedTier.commissionRate 
      ? subscriptionTier 
      : earnings-basedTier;

    // Calculate tier analytics
    const tiersWithAnalytics = COMMISSION_TIERS.map(tier => {
      const isQualified = monthlyEarnings >= tier.minimumEarnings || 
                         (subscription && tier.subscriptionPrice > 0); // Can upgrade via subscription
      const isCurrent = tier.id === currentTier.id;

      // Calculate upgrade recommendations
      let upgradeRecommendation = null;
      if (isQualified && !isCurrent && tier.commissionRate < currentTier.commissionRate) {
        const currentCommission = monthlyEarnings * (currentTier.commissionRate / 100);
        const newCommission = monthlyEarnings * (tier.commissionRate / 100);
        const monthlySavings = Math.max(0, currentCommission - newCommission);
        const subscriptionCost = tier.subscriptionPrice;
        
        // Only recommend if savings > subscription cost
        if (monthlySavings > subscriptionCost) {
          upgradeRecommendation = {
            potentialSavings: monthlySavings - subscriptionCost,
            netBenefit: monthlySavings - subscriptionCost,
            subscriptionCost: subscriptionCost,
            breakEvenPoint: subscriptionCost > 0 ? Math.ceil(subscriptionCost / (monthlySavings - subscriptionCost)) : 0
          };
        }
      }

      return {
        ...tier,
        isQualified,
        isCurrent,
        upgradeRecommendation
      };
    });

    // Calculate projections if requested
    let projections = null;
    if (includeProjections) {
      const nextTier = COMMISSION_TIERS
        .filter(tier => tier.minimumEarnings > monthlyEarnings)
        .sort((a, b) => a.minimumEarnings - b.minimumEarnings)[0];

      projections = {
        nextTier,
        progressToNext: nextTier ? Math.min((monthlyEarnings / nextTier.minimumEarnings) * 100, 100) : 100,
        requiredIncrease: nextTier ? Math.max(0, nextTier.minimumEarnings - monthlyEarnings) : 0,
        estimatedTimeToNext: nextTier ? estimateTimeToNextTier(monthlyEarnings, nextTier.minimumEarnings, captainId) : null
      };
    }

    return {
      currentTier,
      monthlyEarnings,
      tiers: tiersWithAnalytics,
      subscription,
      projections
    };

  } catch (error) {
    console.error('Error getting subscription analytics:', error);
    throw new Error('Failed to get subscription analytics');
  }
}

// Estimate time to reach next tier based on growth rate
async function estimateTimeToNextTier(currentEarnings: number, targetEarnings: number, captainId: string): Promise<number | null> {
  try {
    // Get last 3 months earnings for trend analysis
    const threeMonthsAgo = subMonths(new Date(), 3);
    
    const historicalEarnings = await prisma.payment.aggregate({
      where: {
        trip: {
          captainId: captainId
        },
        status: {
          in: ['SUCCEEDED', 'COMPLETED'] 
        },
        createdAt: {
          gte: threeMonthsAgo
        }
      },
      _sum: {
        amount: true
      }
    });

    const totalThreeMonths = historicalEarnings._sum.amount || 0;
    const averageMonthly = totalThreeMonths / 3;
    
    if (averageMonthly <= currentEarnings) {
      return null; // No growth or negative growth
    }

    const monthlyGrowth = averageMonthly - currentEarnings;
    const remainingGap = targetEarnings - currentEarnings;
    
    return Math.ceil(remainingGap / monthlyGrowth);

  } catch (error) {
    console.error('Error estimating time to next tier:', error);
    return null;
  }
}

// Upgrade subscription tier
async function upgradeTier(userId: string, targetTier: string, billingPeriod: string = 'monthly') {
  try {
    const tier = COMMISSION_TIERS.find(t => t.id === targetTier);
    if (!tier) {
      throw new Error('Invalid tier');
    }

    // Get or create current subscription
    let subscription = await prisma.subscription.findFirst({
      where: { userId }
    });

    if (!subscription) {
      // Create new subscription
      subscription = await prisma.subscription.create({
        data: {
          userId,
          tier: tier.id === 'premium' ? 'CAPTAIN_PREMIUM' : 'FREE',
          status: tier.subscriptionPrice > 0 ? 'ACTIVE' : 'INACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: addMonths(new Date(), 1),
          metadata: {
            targetTier: tier.id,
            billingPeriod,
            subscriptionPrice: tier.subscriptionPrice
          }
        }
      });
    } else {
      // Update existing subscription
      subscription = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          tier: tier.id === 'premium' ? 'CAPTAIN_PREMIUM' : 'FREE',
          status: tier.subscriptionPrice > 0 ? 'ACTIVE' : 'INACTIVE',
          currentPeriodEnd: addMonths(new Date(), 1),
          metadata: {
            ...subscription.metadata as any,
            targetTier: tier.id,
            billingPeriod,
            subscriptionPrice: tier.subscriptionPrice,
            upgradeDate: new Date().toISOString()
          },
          updatedAt: new Date()
        }
      });
    }

    // TODO: In real implementation, integrate with Stripe:
    // 1. Create or update Stripe subscription
    // 2. Handle payment method and billing
    // 3. Set up webhooks for subscription events
    // 4. Handle proration for upgrades/downgrades

    return subscription;

  } catch (error) {
    console.error('Error upgrading tier:', error);
    throw new Error('Failed to upgrade subscription tier');
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const captainId = searchParams.get('captainId') || session.user.id;
    const includeProjections = searchParams.get('includeProjections') === 'true';

    switch (action) {
      case 'analytics': {
        const analytics = await getSubscriptionAnalytics(captainId, includeProjections);
        return NextResponse.json({ analytics });
      }

      case 'tiers': {
        // Return available tiers with pricing
        return NextResponse.json({ 
          tiers: COMMISSION_TIERS,
          currentUserId: session.user.id
        });
      }

      default: {
        // Default: return basic subscription info
        const analytics = await getSubscriptionAnalytics(captainId, false);
        return NextResponse.json({
          currentTier: analytics.currentTier,
          subscription: analytics.subscription,
          monthlyEarnings: analytics.monthlyEarnings
        });
      }
    }

  } catch (error) {
    console.error('Subscription management GET API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'upgrade': {
        const { targetTier, billingPeriod } = tierUpgradeSchema.parse(body);
        
        const subscription = await upgradeTier(session.user.id, targetTier, billingPeriod);
        
        return NextResponse.json({
          success: true,
          subscription,
          message: `Successfully upgraded to ${targetTier} tier`
        });
      }

      case 'downgrade': {
        // Handle tier downgrade (would set cancelAtPeriodEnd = true)
        const subscription = await prisma.subscription.update({
          where: { 
            userId: session.user.id,
            status: 'ACTIVE'
          },
          data: {
            cancelAtPeriodEnd: true,
            metadata: {
              downgradeRequestedAt: new Date().toISOString(),
              reason: body.reason || 'User requested downgrade'
            }
          }
        });

        return NextResponse.json({
          success: true,
          subscription,
          message: 'Subscription will be downgraded at the end of current period'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Subscription management POST API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
