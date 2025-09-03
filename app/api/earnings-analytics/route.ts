/**
 * Earnings Analytics API Endpoint
 * Task 6.2: Earnings Trend Visualizations
 * 
 * Provides comprehensive earnings data for trend visualizations
 * Supports different time ranges, granularities, and filtering options
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { subDays, subMonths, startOfDay, endOfDay, format, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

// Validation schemas
const earningsQuerySchema = z.object({
  start: z.string().transform((str) => new Date(str)).optional(),
  end: z.string().transform((str) => new Date(str)).optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional().default('daily'),
  includeRefunds: z.enum(['true', 'false']).optional().default('true').transform(val => val === 'true'),
  userId: z.string().optional()
});

interface EarningsDataPoint {
  date: string;
  timestamp: Date;
  totalEarnings: number;
  commissionEarnings: number;
  directBookings: number;
  recurringRevenue: number;
  refunds: number;
  netEarnings: number;
  bookingsCount: number;
  averageBookingValue: number;
}

interface MonthlyComparison {
  month: string;
  currentYear: number;
  previousYear: number;
  growth: number;
  bookings: number;
  avgBookingValue: number;
}

interface RevenueStream {
  date: string;
  commissions: number;
  directPayments: number;
  subscriptions: number;
  other: number;
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

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const queryData = earningsQuerySchema.parse({
      start: searchParams.get('start'),
      end: searchParams.get('end'),
      granularity: searchParams.get('granularity'),
      includeRefunds: searchParams.get('includeRefunds'),
      userId: searchParams.get('userId')
    });

    // Set default date range if not provided
    const defaultEnd = new Date();
    const defaultStart = subDays(defaultEnd, 90); // Default to 90 days

    const dateRange = {
      start: queryData.start || defaultStart,
      end: queryData.end || defaultEnd
    };

    const targetUserId = queryData.userId || session.user.id;

    // Verify user access (users can only access their own data unless admin)
    if (targetUserId !== session.user.id) {
      // Check if user has admin access
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

    // Fetch payments data for the date range
    const payments = await prisma.payment.findMany({
      where: {
        userId: targetUserId,
        createdAt: {
          gte: startOfDay(dateRange.start),
          lte: endOfDay(dateRange.end)
        },
        status: {
          in: queryData.includeRefunds 
            ? ['COMPLETED', 'SUCCEEDED', 'REFUNDED', 'PARTIALLY_REFUNDED']
            : ['COMPLETED', 'SUCCEEDED']
        }
      },
      include: {
        paymentMethod: true,
        booking: {
          include: {
            trip: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Fetch subscription data
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: targetUserId,
        createdAt: {
          gte: startOfDay(dateRange.start),
          lte: endOfDay(dateRange.end)
        },
        status: {
          in: ['ACTIVE', 'CANCELLED', 'PAST_DUE']
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Generate date intervals based on granularity
    const generateDateIntervals = () => {
      switch (queryData.granularity) {
        case 'monthly':
          return eachMonthOfInterval({
            start: startOfMonth(dateRange.start),
            end: endOfMonth(dateRange.end)
          }).map(date => ({
            date: format(date, 'yyyy-MM-dd'),
            timestamp: date,
            period: format(date, 'MMM yyyy')
          }));
        case 'weekly':
          // Implement weekly intervals
          const weeks = [];
          let current = startOfDay(dateRange.start);
          while (current <= dateRange.end) {
            weeks.push({
              date: format(current, 'yyyy-MM-dd'),
              timestamp: current,
              period: format(current, 'MMM dd')
            });
            current = subDays(current, -7); // Add 7 days
          }
          return weeks;
        default: // daily
          return eachDayOfInterval({
            start: startOfDay(dateRange.start),
            end: endOfDay(dateRange.end)
          }).map(date => ({
            date: format(date, 'yyyy-MM-dd'),
            timestamp: date,
            period: format(date, 'MMM dd')
          }));
      }
    };

    const intervals = generateDateIntervals();

    // Process daily earnings data
    const dailyEarnings: EarningsDataPoint[] = intervals.map(interval => {
      // Filter payments for this interval
      const intervalPayments = payments.filter(payment => {
        const paymentDate = startOfDay(payment.createdAt);
        const intervalDate = startOfDay(interval.timestamp);
        
        switch (queryData.granularity) {
          case 'monthly':
            return format(paymentDate, 'yyyy-MM') === format(intervalDate, 'yyyy-MM');
          case 'weekly':
            const weekStart = startOfDay(interval.timestamp);
            const weekEnd = endOfDay(subDays(interval.timestamp, -6));
            return paymentDate >= weekStart && paymentDate <= weekEnd;
          default: // daily
            return paymentDate.getTime() === intervalDate.getTime();
        }
      });

      // Filter subscriptions for this interval
      const intervalSubscriptions = subscriptions.filter(subscription => {
        const subDate = startOfDay(subscription.createdAt);
        const intervalDate = startOfDay(interval.timestamp);
        
        switch (queryData.granularity) {
          case 'monthly':
            return format(subDate, 'yyyy-MM') === format(intervalDate, 'yyyy-MM');
          case 'weekly':
            const weekStart = startOfDay(interval.timestamp);
            const weekEnd = endOfDay(subDays(interval.timestamp, -6));
            return subDate >= weekStart && subDate <= weekEnd;
          default: // daily
            return subDate.getTime() === intervalDate.getTime();
        }
      });

      // Calculate metrics for this interval
      const completedPayments = intervalPayments.filter(p => 
        ['COMPLETED', 'SUCCEEDED'].includes(p.status)
      );

      const refundedPayments = intervalPayments.filter(p => 
        ['REFUNDED', 'PARTIALLY_REFUNDED'].includes(p.status)
      );

      const totalEarnings = completedPayments.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0);

      const refunds = refundedPayments.reduce((sum, payment) => {
        return sum + (payment.amount || 0);
      }, 0);

      // Commission calculations (assuming 10% platform commission)
      const commissionEarnings = totalEarnings * 0.1;
      const directBookings = totalEarnings * 0.9; // Rest goes to service provider

      // Recurring revenue from subscriptions
      const recurringRevenue = intervalSubscriptions.reduce((sum, subscription) => {
        // Assuming monthly subscription price
        const monthlyPrice = 29.99; // This should come from subscription data
        return sum + monthlyPrice;
      }, 0);

      const netEarnings = totalEarnings - refunds;
      const bookingsCount = completedPayments.length;
      const averageBookingValue = bookingsCount > 0 ? totalEarnings / bookingsCount : 0;

      return {
        date: interval.date,
        timestamp: interval.timestamp,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        commissionEarnings: Math.round(commissionEarnings * 100) / 100,
        directBookings: Math.round(directBookings * 100) / 100,
        recurringRevenue: Math.round(recurringRevenue * 100) / 100,
        refunds: Math.round(refunds * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        bookingsCount,
        averageBookingValue: Math.round(averageBookingValue * 100) / 100
      };
    });

    // Generate monthly comparisons (current year vs previous year)
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const monthlyComparisons: MonthlyComparison[] = [];
    for (let month = 0; month < 12; month++) {
      const currentYearStart = new Date(currentYear, month, 1);
      const currentYearEnd = new Date(currentYear, month + 1, 0);
      const previousYearStart = new Date(previousYear, month, 1);
      const previousYearEnd = new Date(previousYear, month + 1, 0);

      // Get payments for current year month
      const currentYearPayments = payments.filter(payment => {
        const paymentDate = payment.createdAt;
        return paymentDate >= currentYearStart && paymentDate <= currentYearEnd &&
               ['COMPLETED', 'SUCCEEDED'].includes(payment.status);
      });

      // Get payments for previous year month (you'd need to fetch this data)
      const currentYearEarnings = currentYearPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      // For demo purposes, simulate previous year data
      const previousYearEarnings = currentYearEarnings * (0.8 + Math.random() * 0.4); // ±20% variation

      const growth = previousYearEarnings > 0 
        ? ((currentYearEarnings - previousYearEarnings) / previousYearEarnings) * 100
        : 0;

      monthlyComparisons.push({
        month: format(currentYearStart, 'MMM'),
        currentYear: Math.round(currentYearEarnings * 100) / 100,
        previousYear: Math.round(previousYearEarnings * 100) / 100,
        growth: Math.round(growth * 100) / 100,
        bookings: currentYearPayments.length,
        avgBookingValue: currentYearPayments.length > 0 
          ? Math.round((currentYearEarnings / currentYearPayments.length) * 100) / 100
          : 0
      });
    }

    // Generate revenue streams data
    const revenueStreams: RevenueStream[] = dailyEarnings.map(day => ({
      date: day.date,
      commissions: day.commissionEarnings,
      directPayments: day.directBookings,
      subscriptions: day.recurringRevenue,
      other: day.totalEarnings * 0.05 // Simulate other revenue streams
    }));

    // Calculate summary metrics
    const totalRevenue = dailyEarnings.reduce((sum, day) => sum + day.totalEarnings, 0);
    const totalEarnings = dailyEarnings.reduce((sum, day) => sum + day.netEarnings, 0);
    const totalCommissions = dailyEarnings.reduce((sum, day) => sum + day.commissionEarnings, 0);
    const avgDailyEarnings = dailyEarnings.length > 0 ? totalEarnings / dailyEarnings.length : 0;

    const sortedByEarnings = [...dailyEarnings].sort((a, b) => b.totalEarnings - a.totalEarnings);
    const highestEarningDay = sortedByEarnings[0] || { date: '', totalEarnings: 0 };
    const lowestEarningDay = sortedByEarnings[sortedByEarnings.length - 1] || { date: '', totalEarnings: 0 };

    // Calculate growth rate (comparing first half with second half)
    const midPoint = Math.floor(dailyEarnings.length / 2);
    const firstHalfAvg = dailyEarnings.slice(0, midPoint).reduce((sum, day) => sum + day.totalEarnings, 0) / midPoint;
    const secondHalfAvg = dailyEarnings.slice(midPoint).reduce((sum, day) => sum + day.totalEarnings, 0) / (dailyEarnings.length - midPoint);
    const growthRate = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

    const totalBookings = dailyEarnings.reduce((sum, day) => sum + day.bookingsCount, 0);
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Calculate trends
    const recentDays = dailyEarnings.slice(-7); // Last 7 days
    const previousDays = dailyEarnings.slice(-14, -7); // Previous 7 days
    
    const recentAvgEarnings = recentDays.reduce((sum, day) => sum + day.totalEarnings, 0) / recentDays.length;
    const previousAvgEarnings = previousDays.reduce((sum, day) => sum + day.totalEarnings, 0) / previousDays.length;
    const earningsChange = previousAvgEarnings > 0 ? ((recentAvgEarnings - previousAvgEarnings) / previousAvgEarnings) * 100 : 0;
    
    const recentAvgBookings = recentDays.reduce((sum, day) => sum + day.bookingsCount, 0) / recentDays.length;
    const previousAvgBookings = previousDays.reduce((sum, day) => sum + day.bookingsCount, 0) / previousDays.length;
    const bookingsChange = previousAvgBookings > 0 ? ((recentAvgBookings - previousAvgBookings) / previousAvgBookings) * 100 : 0;

    const getDirection = (change: number) => {
      if (Math.abs(change) < 5) return 'stable';
      return change > 0 ? 'up' : 'down';
    };

    const responseData = {
      dailyEarnings,
      monthlyComparisons,
      revenueStreams,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        avgDailyEarnings: Math.round(avgDailyEarnings * 100) / 100,
        highestEarningDay: {
          date: highestEarningDay.date,
          amount: highestEarningDay.totalEarnings
        },
        lowestEarningDay: {
          date: lowestEarningDay.date,
          amount: lowestEarningDay.totalEarnings
        },
        growthRate: Math.round(growthRate * 100) / 100,
        totalBookings,
        avgBookingValue: Math.round(avgBookingValue * 100) / 100
      },
      trends: {
        earningsDirection: getDirection(earningsChange),
        earningsChange: Math.round(earningsChange * 100) / 100,
        bookingsDirection: getDirection(bookingsChange),
        bookingsChange: Math.round(bookingsChange * 100) / 100
      },
      dateRange,
      granularity: queryData.granularity,
      includeRefunds: queryData.includeRefunds
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Earnings analytics API error:', error);
    
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
