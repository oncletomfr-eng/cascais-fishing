/**
 * Scheduled Reports API Endpoint
 * Task 6.4: Data Export & Reporting System
 * 
 * Manages scheduled report creation, retrieval, and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schemas
const scheduledReportSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
  format: z.enum(['csv', 'pdf', 'excel']),
  dataType: z.enum(['payments', 'earnings', 'commissions', 'all']),
  recipients: z.array(z.string().email('Invalid email address')),
  isActive: z.boolean().default(true),
  options: z.object({
    format: z.enum(['csv', 'pdf', 'excel']),
    dataType: z.enum(['payments', 'earnings', 'commissions', 'all']),
    dateRange: z.object({
      start: z.string().transform(str => new Date(str)),
      end: z.string().transform(str => new Date(str))
    }),
    includeDetails: z.boolean().default(true),
    includeCharts: z.boolean().default(false),
    groupBy: z.enum(['day', 'week', 'month', 'year']).optional().default('day'),
    filters: z.object({
      status: z.array(z.string()).optional(),
      paymentMethods: z.array(z.string()).optional(),
      captainTiers: z.array(z.string()).optional(),
      serviceTypes: z.array(z.string()).optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional()
    }).optional()
  })
});

// Mock database for scheduled reports (in production, use actual database)
interface ScheduledReport {
  id: string;
  userId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'csv' | 'pdf' | 'excel';
  dataType: 'payments' | 'earnings' | 'commissions' | 'all';
  recipients: string[];
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  createdAt: Date;
  options: any;
}

// In-memory storage (replace with database in production)
const scheduledReports: ScheduledReport[] = [];

// Calculate next run date based on frequency
function calculateNextRun(frequency: string): Date {
  const now = new Date();
  const nextRun = new Date(now);
  
  switch (frequency) {
    case 'daily':
      nextRun.setDate(now.getDate() + 1);
      nextRun.setHours(8, 0, 0, 0); // 8 AM next day
      break;
    case 'weekly':
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextRun.setDate(now.getDate() + daysUntilMonday);
      nextRun.setHours(8, 0, 0, 0); // 8 AM next Monday
      break;
    case 'monthly':
      nextRun.setMonth(now.getMonth() + 1, 1);
      nextRun.setHours(8, 0, 0, 0); // 8 AM first day of next month
      break;
    case 'quarterly':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const nextQuarterStartMonth = (currentQuarter + 1) * 3;
      nextRun.setMonth(nextQuarterStartMonth, 1);
      nextRun.setHours(8, 0, 0, 0); // 8 AM first day of next quarter
      break;
    default:
      nextRun.setDate(now.getDate() + 1);
  }
  
  return nextRun;
}

// GET - Retrieve scheduled reports
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

    const userId = session.user.id;

    // Filter reports for current user
    const userReports = scheduledReports.filter(report => report.userId === userId);

    // Sort by creation date (newest first)
    const sortedReports = userReports.sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );

    return NextResponse.json(sortedReports);

  } catch (error) {
    console.error('Get scheduled reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scheduled reports' },
      { status: 500 }
    );
  }
}

// POST - Create new scheduled report
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

    const userId = session.user.id;
    
    // Parse and validate request body
    const body = await request.json();
    const reportData = scheduledReportSchema.parse(body);

    // Check for duplicate report names for this user
    const existingReport = scheduledReports.find(
      report => report.userId === userId && report.name === reportData.name
    );

    if (existingReport) {
      return NextResponse.json(
        { error: 'A report with this name already exists' },
        { status: 409 }
      );
    }

    // Create new scheduled report
    const newReport: ScheduledReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      userId,
      name: reportData.name,
      description: reportData.description,
      frequency: reportData.frequency,
      format: reportData.format,
      dataType: reportData.dataType,
      recipients: reportData.recipients,
      isActive: reportData.isActive,
      nextRun: calculateNextRun(reportData.frequency),
      createdAt: new Date(),
      options: reportData.options
    };

    // Add to storage (in production, save to database)
    scheduledReports.push(newReport);

    return NextResponse.json(newReport, { status: 201 });

  } catch (error) {
    console.error('Create scheduled report API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid report data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all scheduled reports for user (bulk delete)
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Remove all reports for this user
    const initialLength = scheduledReports.length;
    scheduledReports.splice(0, scheduledReports.length, 
      ...scheduledReports.filter(report => report.userId !== userId)
    );

    const deletedCount = initialLength - scheduledReports.length;

    return NextResponse.json({ 
      message: `Deleted ${deletedCount} scheduled reports`,
      deletedCount 
    });

  } catch (error) {
    console.error('Delete scheduled reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled reports' },
      { status: 500 }
    );
  }
}
