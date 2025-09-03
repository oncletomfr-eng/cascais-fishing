import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * Payment Analytics API
 * Task 6: Payment Dashboard Core - Analytics Backend
 * 
 * Provides comprehensive payment analytics including revenue overview,
 * earnings trends, commission breakdowns, and performance metrics
 */

// Validation schema following existing patterns
const analyticsParamsSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().optional(),
  includeProjections: z.boolean().default(true),
  groupBy: z.enum(['day', 'week', 'month', 'quarter']).default('month'),
  includeCommissions: z.boolean().default(true),
  includeBreakdowns: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    console.log('💰 Payment Analytics API request:', Object.fromEntries(searchParams));

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate parameters
    const params = {
      period: searchParams.get('period') || 'month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      includeProjections: searchParams.get('includeProjections') !== 'false',
      groupBy: searchParams.get('groupBy') || 'month',
      includeCommissions: searchParams.get('includeCommissions') !== 'false',
      includeBreakdowns: searchParams.get('includeBreakdowns') !== 'false',
    };

    const validationResult = analyticsParamsSchema.safeParse(params);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid parameters', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      );
    }

    const { period, startDate, endDate, userId, includeProjections, groupBy, includeCommissions, includeBreakdowns } = validationResult.data;

    // Check access permissions
    if (userId && session.user.id !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Calculate date range
    const dateRange = calculateDateRange(period, startDate, endDate);
    
    // Get comprehensive payment analytics
    const analytics = await getPaymentAnalytics(
      dateRange.start,
      dateRange.end,
      userId,
      groupBy,
      includeProjections,
      includeCommissions,
      includeBreakdowns
    );

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        userId,
        includeProjections,
        includeCommissions,
        includeBreakdowns,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Payment Analytics API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate date range based on period
 */
function calculateDateRange(period: string, startDate?: string, endDate?: string) {
  const end = endDate ? new Date(endDate) : new Date();
  let start: Date;

  if (startDate) {
    start = new Date(startDate);
  } else {
    switch (period) {
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(end.getFullYear(), end.getMonth(), 1);
        break;
      case 'quarter':
        start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        start = new Date(end.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(end.getFullYear(), end.getMonth(), 1);
    }
  }

  return { start, end };
}

/**
 * Get comprehensive payment analytics
 */
async function getPaymentAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string,
  groupBy: string = 'month',
  includeProjections: boolean = true,
  includeCommissions: boolean = true,
  includeBreakdowns: boolean = true
) {
  const whereCondition: any = {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (userId) {
    whereCondition.userId = userId;
  }

  // Core payment data
  const payments = await prisma.payment.findMany({
    where: whereCondition,
    include: {
      user: {
        select: { id: true, name: true, email: true }
      },
      subscription: {
        select: { tier: true }
      },
      trip: {
        select: { id: true, date: true, description: true }
      },
    },
    orderBy: { createdAt: 'desc' }
  });

  // Revenue overview calculations
  const totalRevenue = payments
    .filter(p => p.status === 'SUCCEEDED')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalCommissions = payments
    .filter(p => p.status === 'SUCCEEDED' && p.commissionAmount)
    .reduce((sum, payment) => sum + (payment.commissionAmount || 0), 0);

  const netRevenue = totalRevenue - totalCommissions;

  // Payment type breakdown
  const paymentsByType = payments.reduce((acc, payment) => {
    if (!acc[payment.type]) {
      acc[payment.type] = {
        count: 0,
        amount: 0,
        commissions: 0
      };
    }
    acc[payment.type].count++;
    if (payment.status === 'SUCCEEDED') {
      acc[payment.type].amount += payment.amount;
      acc[payment.type].commissions += payment.commissionAmount || 0;
    }
    return acc;
  }, {} as any);

  // Status breakdown
  const paymentsByStatus = payments.reduce((acc, payment) => {
    if (!acc[payment.status]) {
      acc[payment.status] = { count: 0, amount: 0 };
    }
    acc[payment.status].count++;
    acc[payment.status].amount += payment.amount;
    return acc;
  }, {} as any);

  // Time series data for charts
  const timeSeries = generateTimeSeries(payments, groupBy, startDate, endDate);

  // Commission analysis
  let commissionBreakdown = null;
  if (includeCommissions) {
    commissionBreakdown = {
      totalCommissions,
      averageCommissionRate: payments.length > 0 
        ? payments.reduce((sum, p) => sum + (p.commissionRate || 0), 0) / payments.length 
        : 0,
      commissionsByTier: payments.reduce((acc, payment) => {
        if (payment.subscription && payment.commissionAmount) {
          const tier = payment.subscription.tier;
          if (!acc[tier]) acc[tier] = 0;
          acc[tier] += payment.commissionAmount;
        }
        return acc;
      }, {} as any),
      commissionTrend: generateCommissionTrend(payments, groupBy),
    };
  }

  // Growth calculations
  const previousPeriodStart = new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime()));
  const previousPeriodPayments = await prisma.payment.findMany({
    where: {
      ...whereCondition,
      createdAt: {
        gte: previousPeriodStart,
        lt: startDate,
      },
    },
  });

  const previousRevenue = previousPeriodPayments
    .filter(p => p.status === 'SUCCEEDED')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const revenueGrowth = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : totalRevenue > 0 ? 100 : 0;

  // Projections
  let projections = null;
  if (includeProjections) {
    projections = generateProjections(payments, timeSeries);
  }

  return {
    overview: {
      totalRevenue,
      netRevenue,
      totalCommissions,
      totalPayments: payments.length,
      successfulPayments: payments.filter(p => p.status === 'SUCCEEDED').length,
      averagePaymentAmount: payments.length > 0 ? totalRevenue / payments.filter(p => p.status === 'SUCCEEDED').length : 0,
      revenueGrowth,
      conversionRate: payments.length > 0 ? (payments.filter(p => p.status === 'SUCCEEDED').length / payments.length) * 100 : 0,
    },
    timeSeries,
    breakdowns: includeBreakdowns ? {
      byType: paymentsByType,
      byStatus: paymentsByStatus,
    } : null,
    commissionAnalysis: commissionBreakdown,
    projections,
    recentPayments: payments.slice(0, 10), // Last 10 payments for recent activity
    trends: {
      dailyAverage: totalRevenue / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      peakDay: findPeakDay(timeSeries),
      paymentMethods: getPaymentMethodStats(payments),
    }
  };
}

/**
 * Generate time series data for charts
 */
function generateTimeSeries(payments: any[], groupBy: string, startDate: Date, endDate: Date) {
  const series: any[] = [];
  const interval = getTimeInterval(groupBy);
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + interval);
    
    const periodPayments = payments.filter(p => {
      const paymentDate = new Date(p.createdAt);
      return paymentDate >= currentDate && paymentDate < nextDate;
    });
    
    const periodRevenue = periodPayments
      .filter(p => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const periodCommissions = periodPayments
      .filter(p => p.status === 'SUCCEEDED')
      .reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
    
    series.push({
      date: currentDate.toISOString(),
      revenue: periodRevenue,
      commissions: periodCommissions,
      netRevenue: periodRevenue - periodCommissions,
      paymentCount: periodPayments.length,
      successfulPayments: periodPayments.filter(p => p.status === 'SUCCEEDED').length,
    });
    
    currentDate = nextDate;
  }
  
  return series;
}

/**
 * Generate commission trend analysis
 */
function generateCommissionTrend(payments: any[], groupBy: string) {
  // Implementation similar to timeSeries but focused on commission analysis
  return payments.reduce((acc, payment) => {
    if (payment.commissionAmount) {
      const date = new Date(payment.createdAt).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = { total: 0, count: 0 };
      acc[date].total += payment.commissionAmount;
      acc[date].count++;
    }
    return acc;
  }, {} as any);
}

/**
 * Generate projections based on historical data
 */
function generateProjections(payments: any[], timeSeries: any[]) {
  if (timeSeries.length < 3) return null;

  // Simple linear regression for revenue projection
  const revenueData = timeSeries.map((point, index) => ({ x: index, y: point.revenue }));
  const { slope, intercept } = linearRegression(revenueData);
  
  const nextPeriodRevenue = slope * timeSeries.length + intercept;
  
  return {
    nextPeriodRevenue: Math.max(0, nextPeriodRevenue),
    trend: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
    confidence: Math.min(100, Math.max(0, 100 - Math.abs(slope) * 10)), // Simplified confidence
    recommendations: generateRecommendations(payments, timeSeries, slope),
  };
}

/**
 * Simple linear regression
 */
function linearRegression(data: { x: number; y: number }[]) {
  const n = data.length;
  const sumX = data.reduce((sum, point) => sum + point.x, 0);
  const sumY = data.reduce((sum, point) => sum + point.y, 0);
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Generate recommendations based on trends
 */
function generateRecommendations(payments: any[], timeSeries: any[], trend: number) {
  const recommendations = [];
  
  if (trend < -100) {
    recommendations.push('Consider reviewing pricing strategy');
    recommendations.push('Focus on customer retention initiatives');
  } else if (trend > 100) {
    recommendations.push('Great growth! Consider scaling marketing efforts');
    recommendations.push('Prepare for increased operational capacity');
  }
  
  const failureRate = payments.filter(p => p.status === 'FAILED').length / payments.length;
  if (failureRate > 0.1) {
    recommendations.push('High failure rate detected - review payment flow');
  }
  
  return recommendations;
}

/**
 * Find peak day from time series
 */
function findPeakDay(timeSeries: any[]) {
  if (timeSeries.length === 0) return null;
  
  return timeSeries.reduce((peak, current) => 
    current.revenue > peak.revenue ? current : peak
  );
}

/**
 * Get payment method statistics
 */
function getPaymentMethodStats(payments: any[]) {
  return payments.reduce((acc, payment) => {
    if (payment.paymentMethod) {
      const type = payment.paymentMethod.type || 'unknown';
      if (!acc[type]) acc[type] = { count: 0, amount: 0 };
      acc[type].count++;
      if (payment.status === 'SUCCEEDED') {
        acc[type].amount += payment.amount;
      }
    }
    return acc;
  }, {} as any);
}

/**
 * Get time interval in days
 */
function getTimeInterval(groupBy: string): number {
  switch (groupBy) {
    case 'day': return 1;
    case 'week': return 7;
    case 'month': return 30;
    case 'quarter': return 90;
    default: return 30;
  }
}
