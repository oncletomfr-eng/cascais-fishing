/**
 * Commission Tracking API Endpoint
 * Task 8.1: Commission Rate Display & Calculator
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Handles commission rate calculations, tier management, and history tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

// Validation schemas
const commissionCalculationSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  tierOverride: z.string().optional() // Override tier for calculation
});

const commissionHistorySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['pending', 'paid', 'processing']).optional(),
  limit: z.number().min(1).max(100).optional().default(50)
});

// Commission tier definitions (should match frontend)
interface CommissionTier {
  id: string;
  name: string;
  displayName: string;
  commissionRate: number;
  minimumEarnings: number; // Monthly minimum in cents
  features: string[];
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
    features: ['Basic commission tracking', 'Monthly payouts', 'Standard support'],
    color: '#9E9E9E'
  },
  {
    id: 'professional',
    name: 'professional',
    displayName: 'Professional',
    commissionRate: 17.5,
    minimumEarnings: 150000, // €1500
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
    features: ['Real-time analytics', 'Weekly payouts', 'Dedicated support', 'Advanced tax tools', 'Custom reporting'],
    color: '#FF9800'
  }
];

// Calculate captain's current tier based on monthly earnings
function calculateCurrentTier(monthlyEarnings: number): CommissionTier {
  // Find highest tier that captain qualifies for
  const qualifiedTiers = COMMISSION_TIERS
    .filter(tier => monthlyEarnings >= tier.minimumEarnings)
    .sort((a, b) => b.minimumEarnings - a.minimumEarnings);
  
  return qualifiedTiers[0] || COMMISSION_TIERS[0]; // Default to starter if no qualification
}

// Calculate commission for a transaction
function calculateCommission(amount: number, commissionRate: number) {
  const commissionAmount = Math.round(amount * (commissionRate / 100));
  const platformFee = Math.round(amount * 0.029 + 30); // Stripe + platform fee
  const netEarnings = amount - platformFee - commissionAmount;
  
  return {
    grossAmount: amount,
    commissionRate,
    commissionAmount,
    platformFee,
    netEarnings
  };
}

// Get captain's monthly earnings from payments
async function getMonthlyEarnings(captainId: string): Promise<number> {
  const startOfCurrentMonth = startOfMonth(new Date());
  const endOfCurrentMonth = endOfMonth(new Date());
  
  try {
    const result = await prisma.payment.aggregate({
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
      _sum: {
        amount: true
      }
    });
    
    return result._sum.amount || 0;
  } catch (error) {
    console.error('Error calculating monthly earnings:', error);
    return 0;
  }
}

// Get total commissions earned
async function getTotalCommissions(captainId: string): Promise<number> {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        trip: {
          captainId: captainId
        },
        status: {
          in: ['SUCCEEDED', 'COMPLETED']
        }
      },
      select: {
        amount: true,
        commissionAmount: true,
        commissionRate: true
      }
    });
    
    // Calculate total commissions
    let totalCommissions = 0;
    for (const payment of payments) {
      if (payment.commissionAmount) {
        totalCommissions += payment.commissionAmount;
      } else {
        // Fallback calculation if commission not stored
        const monthlyEarnings = await getMonthlyEarnings(captainId);
        const tier = calculateCurrentTier(monthlyEarnings);
        totalCommissions += Math.round(payment.amount * (tier.commissionRate / 100));
      }
    }
    
    return totalCommissions;
  } catch (error) {
    console.error('Error calculating total commissions:', error);
    return 0;
  }
}

// Get pending payouts
async function getPendingPayouts(captainId: string): Promise<number> {
  try {
    // TODO: Implement actual payout tracking
    // For now, calculate based on recent unpaid commissions
    const recentPayments = await prisma.payment.findMany({
      where: {
        trip: {
          captainId: captainId
        },
        status: {
          in: ['SUCCEEDED', 'COMPLETED']
        },
        createdAt: {
          gte: subMonths(new Date(), 1) // Last month
        }
      },
      select: {
        amount: true,
        commissionAmount: true
      }
    });
    
    let pendingCommissions = 0;
    const monthlyEarnings = await getMonthlyEarnings(captainId);
    const tier = calculateCurrentTier(monthlyEarnings);
    
    for (const payment of recentPayments) {
      if (payment.commissionAmount) {
        pendingCommissions += payment.commissionAmount;
      } else {
        pendingCommissions += Math.round(payment.amount * (tier.commissionRate / 100));
      }
    }
    
    return pendingCommissions;
  } catch (error) {
    console.error('Error calculating pending payouts:', error);
    return 0;
  }
}

// Get commission history
async function getCommissionHistory(
  captainId: string, 
  startDate?: string, 
  endDate?: string,
  status?: string,
  limit: number = 50
) {
  try {
    const whereClause: any = {
      trip: {
        captainId: captainId
      },
      status: {
        in: ['SUCCEEDED', 'COMPLETED']
      }
    };
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        trip: {
          select: {
            id: true,
            description: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
    
    // Get current tier for commission calculation
    const monthlyEarnings = await getMonthlyEarnings(captainId);
    const currentTier = calculateCurrentTier(monthlyEarnings);
    
    return payments.map(payment => ({
      id: payment.id,
      date: payment.createdAt,
      amount: payment.amount,
      commissionRate: payment.commissionRate || currentTier.commissionRate,
      commissionAmount: payment.commissionAmount || Math.round(payment.amount * (currentTier.commissionRate / 100)),
      transactionId: payment.stripePaymentId || payment.id,
      tripDescription: payment.trip?.description || 'Fishing Trip',
      status: 'paid' // TODO: Implement actual payout status tracking
    }));
  } catch (error) {
    console.error('Error fetching commission history:', error);
    return [];
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

    // Get user ID (captain ID)
    const captainId = session.user.id;
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'dashboard': {
        // Get comprehensive dashboard data
        const [
          monthlyEarnings, 
          totalCommissions, 
          pendingPayouts,
          recentHistory
        ] = await Promise.all([
          getMonthlyEarnings(captainId),
          getTotalCommissions(captainId),
          getPendingPayouts(captainId),
          getCommissionHistory(captainId, undefined, undefined, undefined, 10)
        ]);
        
        const currentTier = calculateCurrentTier(monthlyEarnings);
        
        return NextResponse.json({
          currentTier,
          monthlyEarnings,
          totalCommissions,
          pendingPayouts,
          recentHistory,
          availableTiers: COMMISSION_TIERS
        });
      }
      
      case 'history': {
        // Get commission history with filters
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');
        
        const history = await getCommissionHistory(
          captainId, 
          startDate || undefined, 
          endDate || undefined,
          status || undefined,
          limit
        );
        
        return NextResponse.json({ history });
      }
      
      case 'tiers': {
        // Get all available tiers with current qualification status
        const monthlyEarnings = await getMonthlyEarnings(captainId);
        const currentTier = calculateCurrentTier(monthlyEarnings);
        
        const tiersWithStatus = COMMISSION_TIERS.map(tier => ({
          ...tier,
          isQualified: monthlyEarnings >= tier.minimumEarnings,
          isCurrent: tier.id === currentTier.id
        }));
        
        return NextResponse.json({ 
          tiers: tiersWithStatus,
          currentTier,
          monthlyEarnings
        });
      }
      
      default: {
        // Default: return basic commission info
        const monthlyEarnings = await getMonthlyEarnings(captainId);
        const currentTier = calculateCurrentTier(monthlyEarnings);
        
        return NextResponse.json({
          currentTier,
          monthlyEarnings
        });
      }
    }

  } catch (error) {
    console.error('Commission tracking API error:', error);
    
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

    // Get request body
    const body = await request.json();
    
    // Get query parameters for action
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'calculate': {
        // Commission calculation
        const { amount, tierOverride } = commissionCalculationSchema.parse(body);
        
        let tier: CommissionTier;
        if (tierOverride) {
          tier = COMMISSION_TIERS.find(t => t.id === tierOverride) || COMMISSION_TIERS[0];
        } else {
          const monthlyEarnings = await getMonthlyEarnings(session.user.id);
          tier = calculateCurrentTier(monthlyEarnings);
        }
        
        const calculation = calculateCommission(amount * 100, tier.commissionRate); // Convert to cents
        
        return NextResponse.json({
          ...calculation,
          tier,
          grossAmount: calculation.grossAmount / 100, // Convert back to euros for display
          commissionAmount: calculation.commissionAmount / 100,
          platformFee: calculation.platformFee / 100,
          netEarnings: calculation.netEarnings / 100
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Commission tracking POST API error:', error);
    
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
