/**
 * Data Export API Endpoint
 * Task 6.4: Data Export & Reporting System
 * 
 * Handles data export requests in CSV, PDF, and Excel formats
 * Supports comprehensive filtering, grouping, and chart inclusion
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { format, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';

// Validation schema
const exportRequestSchema = z.object({
  format: z.enum(['csv', 'pdf', 'excel']),
  dataType: z.enum(['payments', 'earnings', 'commissions', 'all', 'transactions', 'summary', 'detailed']),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }),
  includeDetails: z.boolean().default(true),
  includeCharts: z.boolean().default(false),
  groupBy: z.enum(['day', 'week', 'month', 'year']).optional().default('day'),
  selectedTransactionIds: z.array(z.string()).optional(),
  exportScope: z.enum(['all', 'filtered', 'visible', 'selected']).optional().default('filtered'),
  filters: z.object({
    status: z.array(z.string()).optional(),
    paymentMethods: z.array(z.string()).optional(),
    captainTiers: z.array(z.string()).optional(),
    serviceTypes: z.array(z.string()).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    customerSearch: z.string().optional(),
    transactionIdSearch: z.string().optional()
  }).optional()
});

interface ProcessedExportData {
  payments: any[];
  earnings: any[];
  commissions: any[];
  summary: {
    totalRecords: number;
    dateRange: { start: Date; end: Date };
    totalAmount: number;
    averageAmount: number;
  };
}

// Generate CSV content
function generateCSV(data: any[], headers: string[]): string {
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

// Generate Excel content (simplified - in production, use a library like xlsx)
function generateExcel(data: ProcessedExportData, options: any): Buffer {
  // This is a simplified implementation
  // In production, use libraries like xlsx or exceljs
  const workbookContent = {
    sheets: [] as any[]
  };

  if (options.dataType === 'all' || options.dataType === 'payments') {
    workbookContent.sheets.push({
      name: 'Payments',
      data: data.payments
    });
  }

  if (options.dataType === 'all' || options.dataType === 'earnings') {
    workbookContent.sheets.push({
      name: 'Earnings',
      data: data.earnings
    });
  }

  if (options.dataType === 'all' || options.dataType === 'commissions') {
    workbookContent.sheets.push({
      name: 'Commissions', 
      data: data.commissions
    });
  }

  // Convert to buffer (simplified)
  return Buffer.from(JSON.stringify(workbookContent), 'utf-8');
}

// Generate PDF content (simplified - in production, use a library like puppeteer or jsPDF)
function generatePDF(data: ProcessedExportData, options: any): Buffer {
  // This is a simplified implementation
  // In production, use libraries like puppeteer, jsPDF, or PDFKit
  
  const pdfContent = {
    title: `${options.dataType.toUpperCase()} Report`,
    dateRange: `${format(data.summary.dateRange.start, 'MMM dd, yyyy')} - ${format(data.summary.dateRange.end, 'MMM dd, yyyy')}`,
    summary: data.summary,
    charts: options.includeCharts,
    data: options.dataType === 'all' ? {
      payments: data.payments.slice(0, 100), // Limit for PDF
      earnings: data.earnings.slice(0, 100),
      commissions: data.commissions.slice(0, 100)
    } : data[options.dataType as keyof ProcessedExportData]
  };

  // Convert to buffer (simplified)
  return Buffer.from(JSON.stringify(pdfContent), 'utf-8');
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

    // Parse and validate request body
    const body = await request.json();
    const exportOptions = exportRequestSchema.parse(body);

    const targetUserId = session.user.id;

    // Validate date range
    if (exportOptions.dateRange.start >= exportOptions.dateRange.end) {
      return NextResponse.json(
        { error: 'Invalid date range' },
        { status: 400 }
      );
    }

    // Check for reasonable date range (max 2 years)
    const daysDiff = Math.ceil(
      (exportOptions.dateRange.end.getTime() - exportOptions.dateRange.start.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    if (daysDiff > 730) { // 2 years
      return NextResponse.json(
        { error: 'Date range too large. Maximum 2 years allowed.' },
        { status: 400 }
      );
    }

    // Build where clause for payments
    const whereClause: any = {
      userId: targetUserId,
      createdAt: {
        gte: startOfDay(exportOptions.dateRange.start),
        lte: endOfDay(exportOptions.dateRange.end)
      },
      status: {
        in: ['COMPLETED', 'SUCCEEDED']
      }
    };

    // Handle export scope and selected transactions
    if (exportOptions.exportScope === 'selected' && exportOptions.selectedTransactionIds?.length) {
      whereClause.id = { in: exportOptions.selectedTransactionIds };
    }

    // Apply filters
    if (exportOptions.filters) {
      if (exportOptions.filters.status?.length) {
        whereClause.status = { in: exportOptions.filters.status.map(s => s.toUpperCase()) };
      }
      
      if (exportOptions.filters.minAmount !== undefined || exportOptions.filters.maxAmount !== undefined) {
        whereClause.amount = {};
        if (exportOptions.filters.minAmount !== undefined) {
          whereClause.amount.gte = exportOptions.filters.minAmount * 100; // Convert to cents
        }
        if (exportOptions.filters.maxAmount !== undefined) {
          whereClause.amount.lte = exportOptions.filters.maxAmount * 100; // Convert to cents
        }
      }

      // Add customer search filter
      if (exportOptions.filters.customerSearch) {
        whereClause.trip = {
          captain: {
            OR: [
              { name: { contains: exportOptions.filters.customerSearch, mode: 'insensitive' } },
              { email: { contains: exportOptions.filters.customerSearch, mode: 'insensitive' } }
            ]
          }
        };
      }

      // Add transaction ID search filter
      if (exportOptions.filters.transactionIdSearch) {
        whereClause.OR = [
          { id: { contains: exportOptions.filters.transactionIdSearch, mode: 'insensitive' } },
          { stripePaymentId: { contains: exportOptions.filters.transactionIdSearch, mode: 'insensitive' } }
        ];
      }

      // Add payment method filter
      if (exportOptions.filters.paymentMethods?.length) {
        whereClause.paymentMethod = {
          type: { in: exportOptions.filters.paymentMethods }
        };
      }
    }

    // Fetch payments data
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        trip: {
          include: {
            captain: true // Captain info from GroupTrip
          }
        },
        user: true // Payment creator
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10000 // Reasonable limit
    });

    // Process data based on export options
    const processedData: ProcessedExportData = {
      payments: [],
      earnings: [],
      commissions: [],
      summary: {
        totalRecords: 0,
        dateRange: exportOptions.dateRange,
        totalAmount: 0,
        averageAmount: 0
      }
    };

    // Process payments data
    if (exportOptions.dataType === 'all' || 
        exportOptions.dataType === 'payments' || 
        exportOptions.dataType === 'transactions' ||
        exportOptions.dataType === 'detailed') {
      processedData.payments = payments.map(payment => ({
        id: payment.id,
        transactionId: payment.stripePaymentId || payment.id,
        date: format(payment.createdAt, 'yyyy-MM-dd'),
        time: format(payment.createdAt, 'HH:mm:ss'),
        timestamp: payment.createdAt,
        amount: (payment.amount || 0) / 100, // Convert from cents
        currency: payment.currency || 'EUR',
        status: payment.status,
        paymentMethod: 'N/A', // TODO: Implement payment method details
        paymentMethodType: 'N/A', // TODO: Implement payment method type
        last4: 'N/A', // TODO: Implement last4 digits
        description: payment.description || '',
        tripId: payment.tripId,
        captainId: payment.trip?.captainId,
        captainName: payment.trip?.captain?.name || 'N/A',
        captainEmail: payment.trip?.captain?.email || 'N/A',
        fees: ((payment.amount || 0) * 0.029 + 30) / 100, // Stripe fees estimate
        netAmount: ((payment.amount || 0) - ((payment.amount || 0) * 0.029 + 30)) / 100,
        type: payment.type,
        commissionAmount: (payment.commissionAmount || 0) / 100,
        commissionRate: payment.commissionRate || 0,
        ...(exportOptions.includeDetails && {
          stripePaymentId: payment.stripePaymentId,
          stripeInvoiceId: payment.stripeInvoiceId,
          subscriptionId: payment.subscriptionId,
          metadata: payment.metadata,
          createdAt: payment.createdAt.toISOString(),
          updatedAt: payment.updatedAt.toISOString(),
          paidAt: payment.paidAt?.toISOString() || null,
          paymentCreatedBy: payment.user?.name || 'N/A'
        })
      }));
    }

    // Process earnings data (aggregate by time period)
    if (exportOptions.dataType === 'all' || exportOptions.dataType === 'earnings') {
      const intervals = exportOptions.groupBy === 'month'
        ? eachMonthOfInterval({ start: exportOptions.dateRange.start, end: exportOptions.dateRange.end })
        : eachDayOfInterval({ start: exportOptions.dateRange.start, end: exportOptions.dateRange.end });

      processedData.earnings = intervals.map(date => {
        const periodStart = exportOptions.groupBy === 'month' ? startOfMonth(date) : startOfDay(date);
        const periodEnd = exportOptions.groupBy === 'month' ? endOfMonth(date) : endOfDay(date);

        const periodPayments = payments.filter(payment => {
          const paymentDate = payment.createdAt;
          return paymentDate >= periodStart && paymentDate <= periodEnd;
        });

        const totalAmount = periodPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100;
        const fees = periodPayments.reduce((sum, payment) => sum + ((payment.amount || 0) * 0.029 + 30), 0) / 100;
        const netEarnings = totalAmount - fees;

        return {
          date: format(date, exportOptions.groupBy === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd'),
          period: exportOptions.groupBy === 'month' ? format(date, 'MMM yyyy') : format(date, 'MMM dd'),
          totalRevenue: totalAmount,
          fees: fees,
          netEarnings: netEarnings,
          transactionCount: periodPayments.length,
          averageTransaction: periodPayments.length > 0 ? totalAmount / periodPayments.length : 0
        };
      });
    }

    // Process commissions data
    if (exportOptions.dataType === 'all' || exportOptions.dataType === 'commissions') {
      const commissionData = new Map();

      payments.forEach(payment => {
        const captainId = payment.trip?.captainId || 'unknown';
        const amount = payment.amount || 0;
        const commission = payment.commissionAmount || (amount * 0.15); // Use actual commission or default 15%
        const date = format(payment.createdAt, 'yyyy-MM-dd');

        const key = `${captainId}-${date}`;
        if (!commissionData.has(key)) {
          commissionData.set(key, {
            date,
            captainId,
            captainName: payment.trip?.captain?.name || 'Unknown',
            totalAmount: 0,
            commissionAmount: 0,
            transactionCount: 0,
            averageCommissionRate: payment.commissionRate || 15
          });
        }

        const entry = commissionData.get(key);
        entry.totalAmount += amount / 100;
        entry.commissionAmount += commission / 100;
        entry.transactionCount += 1;
      });

      processedData.commissions = Array.from(commissionData.values()).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    // Calculate summary
    const totalAmount = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0) / 100;
    processedData.summary = {
      totalRecords: payments.length,
      dateRange: exportOptions.dateRange,
      totalAmount,
      averageAmount: payments.length > 0 ? totalAmount / payments.length : 0
    };

    // Generate export file based on format
    let fileBuffer: Buffer;
    let contentType: string;
    let fileExtension: string;
    let filename: string;

    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    const baseFilename = `${exportOptions.dataType}-export-${timestamp}`;

    switch (exportOptions.format) {
      case 'csv': {
        let csvContent = '';
        
        if (exportOptions.dataType === 'payments' || 
            exportOptions.dataType === 'transactions' || 
            exportOptions.dataType === 'detailed' || 
            exportOptions.dataType === 'all') {
          const baseHeaders = ['id', 'transactionId', 'date', 'time', 'amount', 'currency', 'status', 'paymentMethod', 'type', 'captainName'];
          const detailedHeaders = exportOptions.includeDetails 
            ? [...baseHeaders, 'stripePaymentId', 'captainEmail', 'fees', 'netAmount', 'commissionAmount', 'commissionRate', 'paymentCreatedBy', 'createdAt', 'paidAt']
            : baseHeaders;
          
          csvContent += `TRANSACTION DATA\n`;
          csvContent += generateCSV(processedData.payments, detailedHeaders);
          csvContent += '\n\n';
        }

        if (exportOptions.dataType === 'earnings' || exportOptions.dataType === 'all') {
          const headers = ['date', 'totalRevenue', 'fees', 'netEarnings', 'transactionCount'];
          csvContent += `EARNINGS DATA\n`;
          csvContent += generateCSV(processedData.earnings, headers);
          csvContent += '\n\n';
        }

        if (exportOptions.dataType === 'commissions' || exportOptions.dataType === 'all') {
          const headers = ['date', 'captainName', 'totalAmount', 'commissionAmount', 'transactionCount'];
          csvContent += `COMMISSIONS DATA\n`;
          csvContent += generateCSV(processedData.commissions, headers);
        }

        fileBuffer = Buffer.from(csvContent, 'utf-8');
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      }

      case 'excel': {
        fileBuffer = generateExcel(processedData, exportOptions);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        fileExtension = 'xlsx';
        break;
      }

      case 'pdf': {
        fileBuffer = generatePDF(processedData, exportOptions);
        contentType = 'application/pdf';
        fileExtension = 'pdf';
        break;
      }

      default:
        throw new Error('Unsupported export format');
    }

    filename = `${baseFilename}.${fileExtension}`;

    // Store export in history (simplified - in production, store in database)
    // This would typically create a record in an exports table

    // Return the file
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
        'X-Export-Records': processedData.summary.totalRecords.toString(),
        'X-Export-Size': fileBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('Data export API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid export parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Export failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to export data.' },
    { status: 405 }
  );
}
