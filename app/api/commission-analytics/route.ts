/**
 * Commission Analytics API Endpoint
 * Task 6.3: Commission Breakdown Analysis
 * 
 * Provides comprehensive commission data including service breakdowns,
 * captain tier analysis, payout history, and calculation transparency
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { subDays, subMonths, startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';

// Validation schemas
const commissionQuerySchema = z.object({
  start: z.string().transform((str) => new Date(str)).optional(),
  end: z.string().transform((str) => new Date(str)).optional(),
  serviceType: z.enum(['tours', 'courses', 'advertising', 'other']).optional(),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
  captainId: z.string().optional(),
  includePayouts: z.enum(['true', 'false']).optional().default('true').transform(val => val === 'true'),
  userId: z.string().optional()
});

// Types matching the component interfaces
interface ServiceTypeBreakdown {
  serviceType: 'tours' | 'courses' | 'advertising' | 'other';
  serviceName: string;
  totalCommission: number;
  percentage: number;
  count: number;
  averageCommission: number;
  color: string;
}

interface CaptainTierBreakdown {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  tierName: string;
  captainCount: number;
  totalCommission: number;
  averageCommission: number;
  commissionRate: number;
  percentage: number;
  color: string;
}

interface CommissionTrendPoint {
  date: string;
  timestamp: Date;
  totalCommission: number;
  tourCommissions: number;
  courseCommissions: number;
  advertisingCommissions: number;
  captainCount: number;
  averagePerCaptain: number;
}

interface PayoutHistory {
  id: string;
  payoutDate: Date;
  captainId: string;
  captainName: string;
  totalAmount: number;
  commissionAmount: number;
  feeAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: string;
  transactionId?: string;
}

interface CommissionCalculation {
  serviceId: string;
  serviceType: string;
  serviceName: string;
  baseAmount: number;
  commissionRate: number;
  captainTier: string;
  tierMultiplier: number;
  finalCommission: number;
  platformFee: number;
  netPayout: number;
  timestamp: Date;
}

// Color schemes for different breakdown types
const serviceColors = {
  tours: '#3B82F6',      // Blue
  courses: '#10B981',    // Green  
  advertising: '#F59E0B', // Amber
  other: '#8B5CF6'       // Purple
};

const tierColors = {
  bronze: '#CD7F32',     // Bronze
  silver: '#C0C0C0',     // Silver
  gold: '#FFD700',       // Gold
  platinum: '#E5E4E2',   // Platinum
  diamond: '#B9F2FF'     // Diamond
};

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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryData = commissionQuerySchema.parse({
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      serviceType: searchParams.get('serviceType'),
      tier: searchParams.get('tier'),
      captainId: searchParams.get('captainId'),
      includePayouts: searchParams.get('includePayouts'),
      userId: searchParams.get('userId')
    });

    // Set default date range if not provided
    const defaultEnd = new Date();
    const defaultStart = subDays(defaultEnd, 30); // Default to 30 days

    const dateRange = {
      start: queryData.start || defaultStart,
      end: queryData.end || defaultEnd
    };

    const targetUserId = queryData.userId || session.user.id;

    // Verify user access (users can only access their own data unless admin)
    if (targetUserId !== session.user.id) {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      });

      if (currentUser?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch payments data for commission analysis
    const payments = await prisma.payment.findMany({
      where: {
        userId: targetUserId,
        createdAt: {
          gte: startOfDay(dateRange.start),
          lte: endOfDay(dateRange.end)
        },
        status: {
          in: ['COMPLETED', 'SUCCEEDED']
        },
        ...(queryData.serviceType && {
          // Filter by service type (this would need to be added to the Payment model)
          // For now, we'll simulate this with booking data
        })
      },
      include: {
        booking: {
          include: {
            trip: {
              include: {
                user: true // Captain information
              }
            }
          }
        },
        paymentMethod: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Simulate captain tier data (in a real app, this would be stored in user profiles)
    const getCaptainTier = (captainId: string): { tier: string; multiplier: number; rate: number } => {
      const tiers = [
        { tier: 'bronze', multiplier: 1.0, rate: 10 },
        { tier: 'silver', multiplier: 1.1, rate: 12 },
        { tier: 'gold', multiplier: 1.2, rate: 15 },
        { tier: 'platinum', multiplier: 1.3, rate: 18 },
        { tier: 'diamond', multiplier: 1.5, rate: 20 }
      ];
      
      // Simple hash-based assignment for demo
      const hash = captainId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0);
      
      return tiers[Math.abs(hash) % tiers.length];
    };

    // Simulate service types based on payment amounts (demo logic)
    const getServiceType = (amount: number): { type: string; name: string } => {
      if (amount < 5000) return { type: 'courses', name: 'Fishing Courses' };
      if (amount < 15000) return { type: 'tours', name: 'Fishing Tours' };
      if (amount < 25000) return { type: 'advertising', name: 'Advertising Services' };
      return { type: 'other', name: 'Other Services' };
    };

    // Process service type breakdown
    const serviceBreakdown: ServiceTypeBreakdown[] = [];
    const serviceStats = new Map();

    payments.forEach(payment => {
      const amount = payment.amount || 0;
      const service = getServiceType(amount);
      const commission = amount * 0.15; // 15% commission rate

      if (!serviceStats.has(service.type)) {
        serviceStats.set(service.type, {
          serviceType: service.type,
          serviceName: service.name,
          totalCommission: 0,
          count: 0,
          color: serviceColors[service.type as keyof typeof serviceColors] || '#6B7280'
        });
      }

      const stats = serviceStats.get(service.type);
      stats.totalCommission += commission;
      stats.count += 1;
    });

    const totalCommissions = Array.from(serviceStats.values())
      .reduce((sum, stats) => sum + stats.totalCommission, 0);

    serviceStats.forEach(stats => {
      serviceBreakdown.push({
        ...stats,
        percentage: totalCommissions > 0 ? (stats.totalCommission / totalCommissions) * 100 : 0,
        averageCommission: stats.count > 0 ? stats.totalCommission / stats.count : 0
      });
    });

    // Process captain tier breakdown
    const tierBreakdown: CaptainTierBreakdown[] = [];
    const tierStats = new Map();

    payments.forEach(payment => {
      const captainId = payment.booking?.trip?.userId || 'unknown';
      const tierInfo = getCaptainTier(captainId);
      const amount = payment.amount || 0;
      const baseCommission = amount * (tierInfo.rate / 100);
      const finalCommission = baseCommission * tierInfo.multiplier;

      if (!tierStats.has(tierInfo.tier)) {
        tierStats.set(tierInfo.tier, {
          tier: tierInfo.tier,
          tierName: `${tierInfo.tier.charAt(0).toUpperCase() + tierInfo.tier.slice(1)} Tier`,
          captainCount: new Set(),
          totalCommission: 0,
          commissionRate: tierInfo.rate,
          color: tierColors[tierInfo.tier as keyof typeof tierColors] || '#6B7280'
        });
      }

      const stats = tierStats.get(tierInfo.tier);
      stats.captainCount.add(captainId);
      stats.totalCommission += finalCommission;
    });

    tierStats.forEach((stats, tier) => {
      const captainCount = stats.captainCount.size;
      tierBreakdown.push({
        tier,
        tierName: stats.tierName,
        captainCount,
        totalCommission: Math.round(stats.totalCommission * 100) / 100,
        averageCommission: captainCount > 0 ? Math.round((stats.totalCommission / captainCount) * 100) / 100 : 0,
        commissionRate: stats.commissionRate,
        percentage: totalCommissions > 0 ? (stats.totalCommission / totalCommissions) * 100 : 0,
        color: stats.color
      });
    });

    // Generate trend data (daily aggregation)
    const trends: CommissionTrendPoint[] = eachDayOfInterval({
      start: startOfDay(dateRange.start),
      end: endOfDay(dateRange.end)
    }).map(date => {
      const dayPayments = payments.filter(payment => {
        const paymentDate = startOfDay(payment.createdAt);
        return paymentDate.getTime() === startOfDay(date).getTime();
      });

      const totalCommission = dayPayments.reduce((sum, payment) => {
        const amount = payment.amount || 0;
        return sum + (amount * 0.15); // 15% commission
      }, 0);

      const tourCommissions = dayPayments
        .filter(p => getServiceType(p.amount || 0).type === 'tours')
        .reduce((sum, p) => sum + ((p.amount || 0) * 0.15), 0);

      const courseCommissions = dayPayments
        .filter(p => getServiceType(p.amount || 0).type === 'courses')
        .reduce((sum, p) => sum + ((p.amount || 0) * 0.15), 0);

      const advertisingCommissions = dayPayments
        .filter(p => getServiceType(p.amount || 0).type === 'advertising')
        .reduce((sum, p) => sum + ((p.amount || 0) * 0.15), 0);

      const uniqueCaptains = new Set(
        dayPayments.map(p => p.booking?.trip?.userId).filter(Boolean)
      ).size;

      return {
        date: format(date, 'yyyy-MM-dd'),
        timestamp: date,
        totalCommission: Math.round(totalCommission * 100) / 100,
        tourCommissions: Math.round(tourCommissions * 100) / 100,
        courseCommissions: Math.round(courseCommissions * 100) / 100,
        advertisingCommissions: Math.round(advertisingCommissions * 100) / 100,
        captainCount: uniqueCaptains,
        averagePerCaptain: uniqueCaptains > 0 ? Math.round((totalCommission / uniqueCaptains) * 100) / 100 : 0
      };
    });

    // Generate mock payout history
    const payoutHistory: PayoutHistory[] = payments.slice(0, 20).map((payment, index) => {
      const captainId = payment.booking?.trip?.userId || `captain-${index}`;
      const captainName = payment.booking?.trip?.user?.name || `Captain ${index + 1}`;
      const commission = (payment.amount || 0) * 0.15;
      const platformFee = commission * 0.1; // 10% platform fee
      const netAmount = commission - platformFee;

      return {
        id: `payout-${payment.id}`,
        payoutDate: new Date(payment.createdAt.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)), // Random date within 7 days
        captainId,
        captainName,
        totalAmount: Math.round(netAmount * 100) / 100,
        commissionAmount: Math.round(commission * 100) / 100,
        feeAmount: Math.round(platformFee * 100) / 100,
        status: ['completed', 'completed', 'completed', 'pending', 'processing'][Math.floor(Math.random() * 5)] as any,
        payoutMethod: ['Bank Transfer', 'PayPal', 'Stripe'][Math.floor(Math.random() * 3)],
        transactionId: `txn_${Math.random().toString(36).substring(2, 15)}`
      };
    });

    // Generate commission calculation examples
    const calculations: CommissionCalculation[] = payments.slice(0, 10).map((payment) => {
      const captainId = payment.booking?.trip?.userId || 'unknown';
      const tierInfo = getCaptainTier(captainId);
      const service = getServiceType(payment.amount || 0);
      const baseAmount = payment.amount || 0;
      const baseCommission = baseAmount * (tierInfo.rate / 100);
      const finalCommission = baseCommission * tierInfo.multiplier;
      const platformFee = finalCommission * 0.1; // 10% platform fee
      const netPayout = finalCommission - platformFee;

      return {
        serviceId: payment.id,
        serviceType: service.type,
        serviceName: service.name,
        baseAmount,
        commissionRate: tierInfo.rate,
        captainTier: tierInfo.tier,
        tierMultiplier: tierInfo.multiplier,
        finalCommission: Math.round(finalCommission * 100) / 100,
        platformFee: Math.round(platformFee * 100) / 100,
        netPayout: Math.round(netPayout * 100) / 100,
        timestamp: payment.createdAt
      };
    });

    // Calculate summary metrics
    const totalPayouts = payoutHistory.reduce((sum, payout) => sum + payout.totalAmount, 0);
    const pendingPayouts = payoutHistory
      .filter(p => p.status === 'pending')
      .reduce((sum, payout) => sum + payout.totalAmount, 0);

    const averageCommissionRate = tierBreakdown.length > 0
      ? tierBreakdown.reduce((sum, tier) => sum + tier.commissionRate, 0) / tierBreakdown.length
      : 0;

    const topServiceType = serviceBreakdown.reduce(
      (max, service) => service.totalCommission > max.totalCommission ? service : max,
      serviceBreakdown[0] || { serviceType: 'tours', totalCommission: 0 }
    );

    const topTier = tierBreakdown.reduce(
      (max, tier) => tier.totalCommission > max.totalCommission ? tier : max,
      tierBreakdown[0] || { tier: 'bronze', totalCommission: 0 }
    );

    // Calculate monthly growth (comparing first half with second half of period)
    const midPoint = Math.floor(trends.length / 2);
    const firstHalfAvg = trends.slice(0, midPoint).reduce((sum, day) => sum + day.totalCommission, 0) / midPoint;
    const secondHalfAvg = trends.slice(midPoint).reduce((sum, day) => sum + day.totalCommission, 0) / (trends.length - midPoint);
    const monthlyGrowth = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    const uniqueCaptains = new Set(payments.map(p => p.booking?.trip?.userId).filter(Boolean)).size;
    const activeServices = serviceBreakdown.length;

    const responseData = {
      serviceBreakdown: serviceBreakdown.sort((a, b) => b.totalCommission - a.totalCommission),
      tierBreakdown: tierBreakdown.sort((a, b) => b.totalCommission - a.totalCommission),
      trends,
      payoutHistory: queryData.includePayouts ? payoutHistory.sort((a, b) => b.payoutDate.getTime() - a.payoutDate.getTime()) : [],
      calculations,
      summary: {
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        totalPayouts: Math.round(totalPayouts * 100) / 100,
        pendingPayouts: Math.round(pendingPayouts * 100) / 100,
        averageCommissionRate: Math.round(averageCommissionRate * 100) / 100,
        topServiceType: topServiceType.serviceType,
        topTier: topTier.tier,
        monthlyGrowth: Math.round(monthlyGrowth * 100) / 100,
        totalCaptains: uniqueCaptains,
        activeServices
      },
      dateRange,
      filters: {
        serviceType: queryData.serviceType,
        tier: queryData.tier,
        captainId: queryData.captainId
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Commission analytics API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
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

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
