/**
 * Individual Scheduled Report API Endpoint
 * Task 6.4: Data Export & Reporting System
 * 
 * Manages individual scheduled report operations (update, delete, get)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { z } from 'zod';

// Validation schema for updates
const updateScheduledReportSchema = z.object({
  name: z.string().min(1, 'Report name is required').optional(),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'quarterly']).optional(),
  format: z.enum(['csv', 'pdf', 'excel']).optional(),
  dataType: z.enum(['payments', 'earnings', 'commissions', 'all']).optional(),
  recipients: z.array(z.string().email('Invalid email address')).optional(),
  isActive: z.boolean().optional(),
  options: z.object({
    format: z.enum(['csv', 'pdf', 'excel']).optional(),
    dataType: z.enum(['payments', 'earnings', 'commissions', 'all']).optional(),
    dateRange: z.object({
      start: z.string().transform(str => new Date(str)),
      end: z.string().transform(str => new Date(str))
    }).optional(),
    includeDetails: z.boolean().optional(),
    includeCharts: z.boolean().optional(),
    groupBy: z.enum(['day', 'week', 'month', 'year']).optional(),
    filters: z.object({
      status: z.array(z.string()).optional(),
      paymentMethods: z.array(z.string()).optional(),
      captainTiers: z.array(z.string()).optional(),
      serviceTypes: z.array(z.string()).optional(),
      minAmount: z.number().optional(),
      maxAmount: z.number().optional()
    }).optional()
  }).optional()
}).partial();

// Mock database interface (same as in main route)
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

// Import the in-memory storage from the main route (in production, use shared database)
const scheduledReports: ScheduledReport[] = [];

// Helper function to calculate next run date
function calculateNextRun(frequency: string, currentDate: Date = new Date()): Date {
  const nextRun = new Date(currentDate);
  
  switch (frequency) {
    case 'daily':
      nextRun.setDate(currentDate.getDate() + 1);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'weekly':
      const daysUntilMonday = (8 - currentDate.getDay()) % 7 || 7;
      nextRun.setDate(currentDate.getDate() + daysUntilMonday);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'monthly':
      nextRun.setMonth(currentDate.getMonth() + 1, 1);
      nextRun.setHours(8, 0, 0, 0);
      break;
    case 'quarterly':
      const currentQuarter = Math.floor(currentDate.getMonth() / 3);
      const nextQuarterStartMonth = (currentQuarter + 1) * 3;
      nextRun.setMonth(nextQuarterStartMonth, 1);
      nextRun.setHours(8, 0, 0, 0);
      break;
    default:
      nextRun.setDate(currentDate.getDate() + 1);
  }
  
  return nextRun;
}

// GET - Get specific scheduled report
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

    const userId = session.user.id;
    const reportId = params.id;

    // Find the report
    const report = scheduledReports.find(
      r => r.id === reportId && r.userId === userId
    );

    if (!report) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(report);

  } catch (error) {
    console.error('Get scheduled report API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve scheduled report' },
      { status: 500 }
    );
  }
}

// PATCH - Update scheduled report
export async function PATCH(
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

    const userId = session.user.id;
    const reportId = params.id;

    // Find the report
    const reportIndex = scheduledReports.findIndex(
      r => r.id === reportId && r.userId === userId
    );

    if (reportIndex === -1) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const updates = updateScheduledReportSchema.parse(body);

    // Get current report
    const currentReport = scheduledReports[reportIndex];

    // Check for name conflicts if name is being updated
    if (updates.name && updates.name !== currentReport.name) {
      const existingReport = scheduledReports.find(
        report => report.userId === userId && 
                  report.name === updates.name && 
                  report.id !== reportId
      );

      if (existingReport) {
        return NextResponse.json(
          { error: 'A report with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Calculate new next run date if frequency changed
    let nextRun = currentReport.nextRun;
    if (updates.frequency && updates.frequency !== currentReport.frequency) {
      nextRun = calculateNextRun(updates.frequency);
    }

    // Apply updates
    const updatedReport: ScheduledReport = {
      ...currentReport,
      ...updates,
      nextRun,
      options: updates.options ? {
        ...currentReport.options,
        ...updates.options
      } : currentReport.options
    };

    // Update in storage
    scheduledReports[reportIndex] = updatedReport;

    return NextResponse.json(updatedReport);

  } catch (error) {
    console.error('Update scheduled report API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid update data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    );
  }
}

// DELETE - Delete specific scheduled report
export async function DELETE(
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

    const userId = session.user.id;
    const reportId = params.id;

    // Find the report
    const reportIndex = scheduledReports.findIndex(
      r => r.id === reportId && r.userId === userId
    );

    if (reportIndex === -1) {
      return NextResponse.json(
        { error: 'Scheduled report not found' },
        { status: 404 }
      );
    }

    // Remove the report
    const deletedReport = scheduledReports.splice(reportIndex, 1)[0];

    return NextResponse.json({
      message: 'Scheduled report deleted successfully',
      deletedReport: {
        id: deletedReport.id,
        name: deletedReport.name
      }
    });

  } catch (error) {
    console.error('Delete scheduled report API error:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
}
