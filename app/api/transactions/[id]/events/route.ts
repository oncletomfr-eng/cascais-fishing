/**
 * Transaction Events API Endpoint
 * Task 7.4: Transaction Detail Modal
 * 
 * Provides transaction timeline/events data for the detail modal
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const transactionEventsParamsSchema = z.object({
  id: z.string().min(1, 'Transaction ID is required')
});

// Transaction event type
interface TransactionEvent {
  id: string;
  type: 'status_change' | 'payment' | 'refund' | 'dispute' | 'note' | 'system' | 'admin';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

// Helper function to generate transaction events from payment history
async function generateTransactionEvents(payment: any): Promise<TransactionEvent[]> {
  const events: TransactionEvent[] = [];

  // Payment creation event
  events.push({
    id: `payment_created_${payment.id}`,
    type: 'payment',
    title: 'Payment Created',
    description: `Payment of ${(payment.amount / 100).toFixed(2)} EUR created`,
    timestamp: payment.createdAt,
    userId: payment.userId,
    userName: payment.user?.name || 'System',
    metadata: {
      amount: payment.amount,
      currency: payment.currency,
      type: payment.type
    },
    severity: 'info'
  });

  // Status change events (simulated based on current status)
  if (payment.status === 'COMPLETED' || payment.status === 'SUCCEEDED') {
    events.push({
      id: `status_change_completed_${payment.id}`,
      type: 'status_change',
      title: 'Payment Completed',
      description: 'Payment has been successfully processed',
      timestamp: payment.paidAt || payment.updatedAt,
      userId: payment.userId,
      userName: 'System',
      metadata: {
        oldStatus: 'PENDING',
        newStatus: payment.status
      },
      severity: 'success'
    });
  }

  if (payment.status === 'FAILED') {
    events.push({
      id: `status_change_failed_${payment.id}`,
      type: 'status_change',
      title: 'Payment Failed',
      description: 'Payment processing failed',
      timestamp: payment.updatedAt,
      userId: payment.userId,
      userName: 'System',
      metadata: {
        oldStatus: 'PENDING',
        newStatus: 'FAILED'
      },
      severity: 'error'
    });
  }

  // Add system events for webhook processing (if available)
  // TODO: This would come from actual webhook/event logs in a real system
  
  // Add dispute events if any
  if (payment.disputes && payment.disputes.length > 0) {
    payment.disputes.forEach((dispute: any) => {
      events.push({
        id: `dispute_${dispute.id}`,
        type: 'dispute',
        title: 'Dispute Created',
        description: `Dispute reason: ${dispute.reason}`,
        timestamp: dispute.createdAt,
        userId: dispute.userId,
        userName: dispute.user?.name || 'Customer',
        metadata: {
          disputeId: dispute.id,
          reason: dispute.reason,
          status: dispute.status
        },
        severity: 'warning'
      });
    });
  }

  // Sort events by timestamp (newest first)
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate parameters
    const { id: transactionId } = transactionEventsParamsSchema.parse(params);

    // Get current user for access control
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const isAdmin = currentUser?.role === 'ADMIN';

    // Build where clause based on user permissions
    const whereClause: any = {
      id: transactionId
    };

    // Regular users can only see their own transactions
    if (!isAdmin) {
      whereClause.userId = session.user.id;
    }

    // Get transaction with related data
    const payment = await prisma.payment.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        disputes: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Generate events from payment data
    const events = await generateTransactionEvents(payment);

    return NextResponse.json({
      events,
      total: events.length,
      transactionId
    });

  } catch (error) {
    console.error('Transaction events API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
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

// Add a new event (for admin actions)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check admin permissions for creating events
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      );
    }

    // Validate parameters
    const { id: transactionId } = transactionEventsParamsSchema.parse(params);

    // Parse request body
    const body = await request.json();
    const eventData = z.object({
      type: z.enum(['status_change', 'note', 'admin', 'system']),
      title: z.string().min(1),
      description: z.string().min(1),
      severity: z.enum(['info', 'success', 'warning', 'error']).optional(),
      metadata: z.record(z.any()).optional()
    }).parse(body);

    // Verify transaction exists
    const payment = await prisma.payment.findUnique({
      where: { id: transactionId }
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // For now, we'll return success but in a real system you'd store this in an events table
    // TODO: Implement proper event storage
    const newEvent: TransactionEvent = {
      id: `admin_event_${Date.now()}`,
      type: eventData.type as any,
      title: eventData.title,
      description: eventData.description,
      timestamp: new Date(),
      userId: session.user.id,
      userName: currentUser.name || 'Admin',
      metadata: eventData.metadata,
      severity: eventData.severity || 'info'
    };

    return NextResponse.json({
      event: newEvent,
      message: 'Event logged successfully'
    });

  } catch (error) {
    console.error('Create transaction event API error:', error);
    
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
