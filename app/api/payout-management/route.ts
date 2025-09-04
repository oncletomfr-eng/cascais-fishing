/**
 * Payout Management API Endpoint
 * Task 8.3: Payout Schedule Management
 * 
 * Comprehensive API for managing captain payouts, schedules, and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfMonth, endOfMonth, addDays, addWeeks, addMonths, format, parseISO } from 'date-fns';

// Validation schemas
const payoutScheduleSchema = z.object({
  scheduleType: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'MANUAL']),
  isActive: z.boolean().optional().default(true),
  minimumPayoutAmount: z.number().min(1000), // Минимум €10
  autoPayoutEnabled: z.boolean().optional().default(false),
  payoutDay: z.number().min(1).max(31).optional(),
  defaultPaymentMethodId: z.string().optional(),
  notifyBeforePayoutDays: z.number().min(0).max(30).optional().default(3),
  emailNotifications: z.boolean().optional().default(true),
  smsNotifications: z.boolean().optional().default(false)
});

const createPayoutSchema = z.object({
  captainId: z.string(),
  amount: z.number().min(1000), // Минимум €10
  periodStart: z.string(),
  periodEnd: z.string(),
  scheduleType: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'MANUAL']),
  paymentMethodId: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional()
});

const updatePayoutStatusSchema = z.object({
  payoutId: z.string(),
  status: z.enum(['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ON_HOLD']),
  reason: z.string().optional(),
  notes: z.string().optional()
});

// Get captain payout schedule
async function getCaptainPayoutSchedule(captainId: string) {
  return await prisma.payoutSchedule.findUnique({
    where: { captainId },
    include: {
      defaultPaymentMethod: {
        select: {
          id: true,
          type: true,
          cardLast4: true,
          cardBrand: true
        }
      }
    }
  });
}

// Get captain payouts with filters
async function getCaptainPayouts(
  captainId: string,
  status?: string,
  startDate?: string,
  endDate?: string,
  limit: number = 50
) {
  const whereClause: any = {
    captainId: captainId
  };

  if (status && status !== 'all') {
    whereClause.status = status;
  }

  if (startDate && endDate) {
    whereClause.periodStart = {
      gte: parseISO(startDate),
      lte: parseISO(endDate)
    };
  }

  const payouts = await prisma.payout.findMany({
    where: whereClause,
    include: {
      paymentMethod: {
        select: {
          id: true,
          type: true,
          cardLast4: true,
          cardBrand: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit
  });

  return payouts;
}

// Calculate pending commission amount for captain
async function calculatePendingCommissions(captainId: string) {
  try {
    // Get successful payments for captain trips that haven't been paid out yet
    const payments = await prisma.payment.findMany({
      where: {
        trip: { captainId },
        status: { in: ['SUCCEEDED', 'COMPLETED'] },
        // Add condition to exclude already paid out commissions
        id: {
          notIn: await prisma.payout.findMany({
            where: { captainId },
            select: { relatedPaymentIds: true }
          }).then(payouts => 
            payouts.flatMap(p => p.relatedPaymentIds)
          )
        }
      },
      include: {
        trip: true
      }
    });

    const totalPendingAmount = payments.reduce((total, payment) => {
      const commissionAmount = payment.commissionAmount || 0;
      return total + commissionAmount;
    }, 0);

    return {
      totalAmount: totalPendingAmount,
      paymentCount: payments.length,
      payments: payments.map(p => ({
        id: p.id,
        amount: p.amount,
        commissionAmount: p.commissionAmount,
        date: p.createdAt,
        tripId: p.tripId
      }))
    };
  } catch (error) {
    console.error('Error calculating pending commissions:', error);
    return { totalAmount: 0, paymentCount: 0, payments: [] };
  }
}

// Create automatic payout based on schedule
async function createScheduledPayout(captainId: string, schedule: any) {
  try {
    const pendingCommissions = await calculatePendingCommissions(captainId);
    
    if (pendingCommissions.totalAmount < schedule.minimumPayoutAmount) {
      return null; // Not enough to create payout
    }

    // Calculate period based on schedule type
    let periodStart: Date;
    let periodEnd: Date;

    const now = new Date();
    
    switch (schedule.scheduleType) {
      case 'WEEKLY':
        periodEnd = now;
        periodStart = addDays(now, -7);
        break;
      case 'BIWEEKLY':
        periodEnd = now;
        periodStart = addDays(now, -14);
        break;
      case 'MONTHLY':
        periodEnd = endOfMonth(now);
        periodStart = startOfMonth(now);
        break;
      case 'QUARTERLY':
        periodEnd = now;
        periodStart = addMonths(now, -3);
        break;
      default:
        return null;
    }

    // Create payout
    const payout = await prisma.payout.create({
      data: {
        captainId,
        amount: pendingCommissions.totalAmount,
        currency: 'EUR',
        commissionAmount: pendingCommissions.totalAmount,
        commissionRate: 15.0, // Default rate, should be calculated based on tier
        periodStart,
        periodEnd,
        status: schedule.autoPayoutEnabled ? 'APPROVED' : 'PENDING',
        scheduleType: schedule.scheduleType,
        paymentMethodId: schedule.defaultPaymentMethodId,
        description: `${schedule.scheduleType} payout for ${format(periodStart, 'MMM yyyy')}`,
        relatedPaymentIds: pendingCommissions.payments.map(p => p.id)
      }
    });

    return payout;
  } catch (error) {
    console.error('Error creating scheduled payout:', error);
    return null;
  }
}

// Update payout status with logging
async function updatePayoutStatus(
  payoutId: string,
  newStatus: string,
  performedBy: string,
  reason?: string,
  notes?: string,
  request?: NextRequest
) {
  const currentPayout = await prisma.payout.findUnique({
    where: { id: payoutId }
  });

  if (!currentPayout) {
    throw new Error('Payout not found');
  }

  // Update payout
  const updatedPayout = await prisma.payout.update({
    where: { id: payoutId },
    data: {
      status: newStatus as any,
      ...(newStatus === 'APPROVED' && {
        approvedAt: new Date(),
        approvedBy: performedBy
      }),
      ...(newStatus === 'REJECTED' && {
        rejectedAt: new Date(),
        rejectedBy: performedBy,
        rejectionReason: reason
      }),
      ...(newStatus === 'COMPLETED' && {
        processedAt: new Date(),
        processedBy: performedBy
      }),
      ...(notes && { notes })
    }
  });

  // Log the change
  await prisma.payoutHistoryLog.create({
    data: {
      payoutId,
      action: 'UPDATED',
      previousStatus: currentPayout.status as any,
      newStatus: newStatus as any,
      performedBy,
      reason,
      changeDetails: {
        notes,
        timestamp: new Date().toISOString()
      },
      ipAddress: request?.ip || request?.headers.get('x-forwarded-for'),
      userAgent: request?.headers.get('user-agent')
    }
  });

  return updatedPayout;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const captainId = searchParams.get('captainId') || session.user.id;

    // Verify permission to access captain data
    if (captainId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    switch (action) {
      case 'dashboard': {
        // Get comprehensive payout dashboard data
        const [schedule, recentPayouts, pendingCommissions, payoutStats] = await Promise.all([
          getCaptainPayoutSchedule(captainId),
          getCaptainPayouts(captainId, undefined, undefined, undefined, 10),
          calculatePendingCommissions(captainId),
          prisma.payout.groupBy({
            by: ['status'],
            where: { captainId },
            _count: true,
            _sum: { amount: true }
          })
        ]);

        return NextResponse.json({
          schedule,
          recentPayouts,
          pendingCommissions,
          payoutStats: payoutStats.reduce((acc, stat) => {
            acc[stat.status] = {
              count: stat._count,
              totalAmount: stat._sum.amount || 0
            };
            return acc;
          }, {} as Record<string, any>)
        });
      }

      case 'payouts': {
        // Get payouts with filters
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const limit = parseInt(searchParams.get('limit') || '50');

        const payouts = await getCaptainPayouts(captainId, status || undefined, startDate || undefined, endDate || undefined, limit);
        
        return NextResponse.json({ payouts });
      }

      case 'schedule': {
        // Get payout schedule
        const schedule = await getCaptainPayoutSchedule(captainId);
        return NextResponse.json({ schedule });
      }

      case 'pending-commissions': {
        // Get pending commission details
        const pendingCommissions = await calculatePendingCommissions(captainId);
        return NextResponse.json(pendingCommissions);
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Payout management GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'create-payout': {
        // Create manual payout
        if (session.user.role !== 'ADMIN' && session.user.role !== 'CAPTAIN') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = createPayoutSchema.parse(body);
        
        const payout = await prisma.payout.create({
          data: {
            ...data,
            periodStart: parseISO(data.periodStart),
            periodEnd: parseISO(data.periodEnd),
            currency: 'EUR',
            commissionAmount: data.amount,
            commissionRate: 15.0, // Should be calculated based on captain tier
            status: 'PENDING'
          }
        });

        // Log creation
        await prisma.payoutHistoryLog.create({
          data: {
            payoutId: payout.id,
            action: 'CREATED',
            newStatus: 'PENDING',
            performedBy: session.user.id,
            ipAddress: request.ip || request.headers.get('x-forwarded-for'),
            userAgent: request.headers.get('user-agent')
          }
        });

        return NextResponse.json({ payout });
      }

      case 'update-schedule': {
        // Update payout schedule
        const captainId = body.captainId || session.user.id;
        
        if (captainId !== session.user.id && session.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const data = payoutScheduleSchema.parse(body);

        const schedule = await prisma.payoutSchedule.upsert({
          where: { captainId },
          create: {
            captainId,
            ...data
          },
          update: data,
          include: {
            defaultPaymentMethod: {
              select: {
                id: true,
                type: true,
                cardLast4: true,
                cardBrand: true
              }
            }
          }
        });

        return NextResponse.json({ schedule });
      }

      case 'update-status': {
        // Update payout status (Admin only)
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const data = updatePayoutStatusSchema.parse(body);
        
        const updatedPayout = await updatePayoutStatus(
          data.payoutId,
          data.status,
          session.user.id,
          data.reason,
          data.notes,
          request
        );

        return NextResponse.json({ payout: updatedPayout });
      }

      case 'process-scheduled': {
        // Process scheduled payouts (Admin/System only)
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const captainId = body.captainId;
        const schedule = await getCaptainPayoutSchedule(captainId);

        if (!schedule || !schedule.isActive) {
          return NextResponse.json({ error: 'No active schedule found' }, { status: 400 });
        }

        const payout = await createScheduledPayout(captainId, schedule);

        if (!payout) {
          return NextResponse.json({ error: 'Insufficient commission amount' }, { status: 400 });
        }

        return NextResponse.json({ payout });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Payout management POST API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
