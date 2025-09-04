/**
 * Commission Analytics API Endpoint
 * Task 8.2: Commission History & Trend Analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfMonth, endOfMonth, subMonths, format, eachMonthOfInterval } from 'date-fns';

const analyticsRequestSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter']).optional().default('month')
});

// Get commission analytics data
async function getCommissionAnalytics(captainId: string, startDate: Date, endDate: Date) {
  try {
    const payments = await prisma.payment.findMany({
      where: {
        trip: { captainId },
        status: { in: ['SUCCEEDED', 'COMPLETED'] },
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        trip: { select: { id: true, captainId: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Generate monthly intervals
    const intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    
    const data = intervals.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthPayments = payments.filter(p => 
        p.createdAt >= monthStart && p.createdAt <= monthEnd
      );

      const totalCommissions = monthPayments.reduce((sum, p) => 
        sum + (p.commissionAmount || Math.round((p.amount || 0) * 0.175)), 0
      );
      
      return {
        date: format(month, 'yyyy-MM-dd'),
        period: format(month, 'MMM yyyy'),
        totalCommissions,
        commissionCount: monthPayments.length,
        averageCommission: monthPayments.length > 0 ? totalCommissions / monthPayments.length : 0,
        commissionRate: 17.5,
        grossRevenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        netEarnings: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0) - totalCommissions
      };
    });

    // Calculate summary
    const totalCommissions = data.reduce((sum, d) => sum + d.totalCommissions, 0);
    const totalTransactions = data.reduce((sum, d) => sum + d.commissionCount, 0);
    const peakPeriod = data.reduce((peak, d) => 
      d.totalCommissions > peak.amount ? { period: d.period, amount: d.totalCommissions } : peak,
      { period: 'N/A', amount: 0 }
    );

    const last2 = data.slice(-2);
    const commissionTrend = last2.length === 2 ? {
      current: last2[1].totalCommissions,
      previous: last2[0].totalCommissions,
      change: last2[1].totalCommissions - last2[0].totalCommissions,
      changePercent: last2[0].totalCommissions > 0 ? 
        ((last2[1].totalCommissions - last2[0].totalCommissions) / last2[0].totalCommissions) * 100 : 0,
      trend: last2[1].totalCommissions > last2[0].totalCommissions ? 'up' as const :
             last2[1].totalCommissions < last2[0].totalCommissions ? 'down' as const : 'flat' as const
    } : { current: 0, previous: 0, change: 0, changePercent: 0, trend: 'flat' as const };

    const summary = {
      totalCommissions,
      averageCommission: totalTransactions > 0 ? totalCommissions / totalTransactions : 0,
      peakPeriod,
      growthRate: 0,
      transactionCount: totalTransactions,
      commissionTrend,
      revenueTrend: commissionTrend
    };

    return { data, summary };
  } catch (error) {
    console.error('Error fetching commission analytics:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : subMonths(new Date(), 12);
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date();

    const { data, summary } = await getCommissionAnalytics(session.user.id, startDate, endDate);

    return NextResponse.json({
      data,
      summary,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: 'month'
      }
    });

  } catch (error) {
    console.error('Commission analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate: startDateParam, endDate: endDateParam } = analyticsRequestSchema.parse(body);

    const startDate = startDateParam ? new Date(startDateParam) : subMonths(new Date(), 12);
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    const { data, summary } = await getCommissionAnalytics(session.user.id, startDate, endDate);

    return NextResponse.json({
      data,
      summary,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: 'month'
      }
    });

  } catch (error) {
    console.error('Commission analytics POST API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}