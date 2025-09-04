import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { format, startOfYear, endOfYear, startOfQuarter, endOfQuarter, isWithinInterval } from 'date-fns';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Validation schemas
const taxReportGenerationSchema = z.object({
  taxYear: z.number().min(2020).max(new Date().getFullYear() + 1),
  reportType: z.enum(['ANNUAL', 'QUARTERLY', 'MONTHLY', 'CUSTOM']),
  quarterNumber: z.number().min(1).max(4).optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  captainIds: z.array(z.string()).optional(), // Specific captains or all
});

const taxDocumentGenerationSchema = z.object({
  captainId: z.string(),
  taxYear: z.number().min(2020).max(new Date().getFullYear() + 1),
  documentType: z.enum(['FORM_1099_MISC', 'FORM_1099_K', 'ANNUAL_SUMMARY']),
  forceRegenerate: z.boolean().default(false),
});

const taxDocumentStatusSchema = z.object({
  documentId: z.string(),
  status: z.enum(['DRAFT', 'GENERATED', 'VALIDATED', 'APPROVED', 'SENT', 'RECEIVED', 'FILED', 'CORRECTED', 'CANCELLED']),
  notes: z.string().optional(),
});

// Helper functions

async function getTaxDashboardData(taxYear: number) {
  const yearStart = startOfYear(new Date(taxYear, 0, 1));
  const yearEnd = endOfYear(new Date(taxYear, 0, 1));

  // Get all payouts for the tax year
  const payouts = await prisma.payout.findMany({
    where: {
      taxYear: taxYear,
      status: 'COMPLETED',
    },
    include: {
      captain: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Get tax documents summary
  const taxDocuments = await prisma.taxDocument.findMany({
    where: {
      taxYear: taxYear,
    },
    include: {
      captain: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Calculate summary statistics
  const totalGrossCommissions = payouts.reduce((sum, payout) => sum + payout.commissionAmount, 0);
  const totalPayouts = payouts.reduce((sum, payout) => sum + payout.amount, 0);
  const totalCaptains = new Set(payouts.map(p => p.captainId)).size;
  const totalDocuments = taxDocuments.length;

  // Documents by status
  const documentsByStatus = taxDocuments.reduce((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Monthly breakdown
  const monthlyData = Array.from({ length: 12 }, (_, month) => {
    const monthStart = new Date(taxYear, month, 1);
    const monthEnd = new Date(taxYear, month + 1, 0);
    
    const monthPayouts = payouts.filter(payout => 
      isWithinInterval(payout.periodEnd, { start: monthStart, end: monthEnd })
    );
    
    return {
      month: format(monthStart, 'MMM'),
      monthNumber: month + 1,
      commissions: monthPayouts.reduce((sum, p) => sum + p.commissionAmount, 0) / 100,
      payouts: monthPayouts.reduce((sum, p) => sum + p.amount, 0) / 100,
      captains: new Set(monthPayouts.map(p => p.captainId)).size,
      transactions: monthPayouts.length,
    };
  });

  return {
    taxYear,
    summary: {
      totalGrossCommissions: totalGrossCommissions / 100,
      totalPayouts: totalPayouts / 100,
      totalCaptains,
      totalDocuments,
      documentsByStatus,
    },
    monthlyData,
    recentDocuments: taxDocuments
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10)
      .map(doc => ({
        id: doc.id,
        documentType: doc.documentType,
        formType: doc.formType,
        captainName: doc.captain.name,
        totalAmount: doc.totalAmount / 100,
        status: doc.status,
        generatedAt: doc.generatedAt,
        createdAt: doc.createdAt,
      })),
  };
}

async function generateTaxReport(params: z.infer<typeof taxReportGenerationSchema>, userId: string) {
  const { taxYear, reportType, quarterNumber, periodStart, periodEnd, captainIds } = params;
  
  // Determine period dates
  let start: Date, end: Date;
  
  if (reportType === 'ANNUAL') {
    start = startOfYear(new Date(taxYear, 0, 1));
    end = endOfYear(new Date(taxYear, 0, 1));
  } else if (reportType === 'QUARTERLY' && quarterNumber) {
    start = startOfQuarter(new Date(taxYear, (quarterNumber - 1) * 3, 1));
    end = endOfQuarter(new Date(taxYear, (quarterNumber - 1) * 3, 1));
  } else if (reportType === 'CUSTOM' && periodStart && periodEnd) {
    start = new Date(periodStart);
    end = new Date(periodEnd);
  } else {
    throw new Error('Invalid report period parameters');
  }

  // Get payouts for the period
  const payoutsQuery = {
    where: {
      periodStart: { gte: start },
      periodEnd: { lte: end },
      status: 'COMPLETED',
      ...(captainIds && captainIds.length > 0 && { captainId: { in: captainIds } }),
    },
    include: {
      captain: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  };

  const payouts = await prisma.payout.findMany(payoutsQuery);

  // Calculate report statistics
  const totalGrossCommissions = payouts.reduce((sum, p) => sum + p.commissionAmount, 0);
  const totalNetCommissions = totalGrossCommissions; // Can be adjusted for withholdings
  const totalWithholdings = 0; // Calculate if withholdings are implemented
  const totalPayouts = payouts.reduce((sum, p) => sum + p.amount, 0);
  const totalCaptains = new Set(payouts.map(p => p.captainId)).size;
  const totalTransactions = payouts.length;

  // Create report summary
  const reportSummary = {
    period: {
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
      type: reportType,
    },
    statistics: {
      totalGrossCommissions: totalGrossCommissions / 100,
      totalNetCommissions: totalNetCommissions / 100,
      totalWithholdings: totalWithholdings / 100,
      totalPayouts: totalPayouts / 100,
      totalCaptains,
      totalTransactions,
    },
    captainBreakdown: Object.values(
      payouts.reduce((acc, payout) => {
        const captainId = payout.captainId;
        if (!acc[captainId]) {
          acc[captainId] = {
            captainId,
            captainName: payout.captain.name,
            captainEmail: payout.captain.email,
            totalCommissions: 0,
            totalPayouts: 0,
            transactionCount: 0,
          };
        }
        acc[captainId].totalCommissions += payout.commissionAmount;
        acc[captainId].totalPayouts += payout.amount;
        acc[captainId].transactionCount += 1;
        return acc;
      }, {} as Record<string, any>)
    ).map((captain: any) => ({
      ...captain,
      totalCommissions: captain.totalCommissions / 100,
      totalPayouts: captain.totalPayouts / 100,
    })),
  };

  // Create or update tax report
  const taxReport = await prisma.taxReport.create({
    data: {
      taxYear,
      reportType: reportType as any,
      quarterNumber,
      periodStart: start,
      periodEnd: end,
      status: 'COMPLETED',
      totalGrossCommissions,
      totalNetCommissions,
      totalWithholdings,
      totalPayouts,
      totalCaptains,
      totalTransactions,
      totalDocumentsGenerated: 0, // Will be updated when documents are generated
      generatedAt: new Date(),
      generatedBy: userId,
      reportSummary,
    },
  });

  // Log the action
  await prisma.taxAuditLog.create({
    data: {
      taxReportId: taxReport.id,
      action: 'GENERATED',
      eventType: 'REPORT_MANAGEMENT',
      performedBy: userId,
      description: `Generated ${reportType.toLowerCase()} tax report for ${taxYear}`,
      newData: { reportId: taxReport.id, period: { start, end } },
    },
  });

  return taxReport;
}

async function generate1099MISCDocument(params: z.infer<typeof taxDocumentGenerationSchema>, userId: string) {
  const { captainId, taxYear, documentType, forceRegenerate } = params;

  // Check if document already exists
  const existingDocument = await prisma.taxDocument.findUnique({
    where: {
      captainId_taxYear_documentType: {
        captainId,
        taxYear,
        documentType: documentType as any,
      },
    },
  });

  if (existingDocument && !forceRegenerate) {
    return existingDocument;
  }

  // Get captain information
  const captain = await prisma.user.findUnique({
    where: { id: captainId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!captain) {
    throw new Error('Captain not found');
  }

  // Get all completed payouts for the tax year
  const payouts = await prisma.payout.findMany({
    where: {
      captainId,
      taxYear,
      status: 'COMPLETED',
    },
    orderBy: {
      periodEnd: 'asc',
    },
  });

  if (payouts.length === 0) {
    throw new Error('No completed payouts found for this captain and tax year');
  }

  // Calculate 1099-MISC amounts
  const totalAmount = payouts.reduce((sum, payout) => sum + payout.commissionAmount, 0);
  
  // For 1099-MISC, most commission income goes in Box 7 (Nonemployee Compensation)
  const box7Amount = totalAmount; // All commission income
  
  // Create or update tax document
  const documentData = {
    taxReportId: null, // Can be linked to a report later
    captainId,
    documentType: documentType as any,
    formType: '1099-MISC',
    taxYear,
    totalAmount,
    box7Amount, // Nonemployee Compensation (primary for our use case)
    status: 'GENERATED' as any,
    generatedAt: new Date(),
    recipientName: captain.name || 'Unknown',
    payerName: 'Cascais Fishing Platform',
    payerAddress: {
      street: 'Rua Example, 123',
      city: 'Cascais',
      state: 'Lisbon',
      zipCode: '2750-000',
      country: 'Portugal',
    },
    isValidated: false,
  };

  let taxDocument;
  if (existingDocument && forceRegenerate) {
    taxDocument = await prisma.taxDocument.update({
      where: { id: existingDocument.id },
      data: documentData,
    });
  } else {
    taxDocument = await prisma.taxDocument.create({
      data: documentData,
    });
  }

  // Log the action
  await prisma.taxAuditLog.create({
    data: {
      taxDocumentId: taxDocument.id,
      action: forceRegenerate ? 'UPDATED' : 'GENERATED',
      eventType: 'DOCUMENT_MANAGEMENT',
      performedBy: userId,
      description: `${forceRegenerate ? 'Regenerated' : 'Generated'} ${documentType} for captain ${captain.name} (${taxYear})`,
      newData: { 
        documentId: taxDocument.id, 
        totalAmount: totalAmount / 100,
        payoutCount: payouts.length,
      },
    },
  });

  return taxDocument;
}

async function updateTaxDocumentStatus(params: z.infer<typeof taxDocumentStatusSchema>, userId: string) {
  const { documentId, status, notes } = params;

  const document = await prisma.taxDocument.findUnique({
    where: { id: documentId },
    include: {
      captain: {
        select: { name: true },
      },
    },
  });

  if (!document) {
    throw new Error('Tax document not found');
  }

  const previousStatus = document.status;
  
  const updatedDocument = await prisma.taxDocument.update({
    where: { id: documentId },
    data: {
      status: status as any,
      ...(status === 'SENT' && { sentAt: new Date() }),
      ...(status === 'RECEIVED' && { receivedAt: new Date() }),
    },
  });

  // Log the status change
  await prisma.taxAuditLog.create({
    data: {
      taxDocumentId: documentId,
      action: 'UPDATED',
      eventType: 'DOCUMENT_MANAGEMENT',
      performedBy: userId,
      description: `Updated ${document.formType} status from ${previousStatus} to ${status}${notes ? ` - ${notes}` : ''}`,
      previousData: { status: previousStatus },
      newData: { status, notes },
    },
  });

  return updatedDocument;
}

async function generatePDF1099MISC(taxDocument: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const page = pdfDoc.addPage([612, 792]); // Standard letter size
  
  // Header
  page.drawText('Form 1099-MISC', {
    x: 50,
    y: 750,
    size: 16,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(`Miscellaneous Income - ${taxDocument.taxYear}`, {
    x: 50,
    y: 725,
    size: 12,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  // Payer information
  page.drawText('PAYER:', {
    x: 50,
    y: 680,
    size: 10,
    font: boldFont,
  });
  
  page.drawText(taxDocument.payerName || 'Cascais Fishing Platform', {
    x: 50,
    y: 665,
    size: 10,
    font: font,
  });
  
  // Recipient information
  page.drawText('RECIPIENT:', {
    x: 350,
    y: 680,
    size: 10,
    font: boldFont,
  });
  
  page.drawText(taxDocument.recipientName, {
    x: 350,
    y: 665,
    size: 10,
    font: font,
  });
  
  // Box 7 - Nonemployee Compensation (main field for our use case)
  if (taxDocument.box7Amount && taxDocument.box7Amount > 0) {
    page.drawText('7. Nonemployee compensation', {
      x: 50,
      y: 600,
      size: 10,
      font: font,
    });
    
    page.drawText(`$${(taxDocument.box7Amount / 100).toFixed(2)}`, {
      x: 250,
      y: 600,
      size: 12,
      font: boldFont,
    });
  }
  
  // Total amount
  page.drawText('Total Amount:', {
    x: 50,
    y: 550,
    size: 10,
    font: boldFont,
  });
  
  page.drawText(`$${(taxDocument.totalAmount / 100).toFixed(2)}`, {
    x: 150,
    y: 550,
    size: 12,
    font: boldFont,
  });
  
  // Footer
  page.drawText('This is a computer-generated document.', {
    x: 50,
    y: 50,
    size: 8,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  return await pdfDoc.save();
}

// API handlers

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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const taxYear = parseInt(searchParams.get('taxYear') || new Date().getFullYear().toString());

    switch (action) {
      case 'dashboard': {
        const dashboardData = await getTaxDashboardData(taxYear);
        return NextResponse.json(dashboardData);
      }

      case 'reports': {
        const reportType = searchParams.get('reportType') || 'ANNUAL';
        const status = searchParams.get('status');
        
        const reports = await prisma.taxReport.findMany({
          where: {
            taxYear,
            ...(reportType !== 'ALL' && { reportType: reportType as any }),
            ...(status && { status: status as any }),
          },
          include: {
            _count: {
              select: {
                taxDocuments: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return NextResponse.json(reports);
      }

      case 'documents': {
        const captainId = searchParams.get('captainId');
        const documentType = searchParams.get('documentType');
        const status = searchParams.get('status');
        
        const documents = await prisma.taxDocument.findMany({
          where: {
            taxYear,
            ...(captainId && { captainId }),
            ...(documentType && { documentType: documentType as any }),
            ...(status && { status: status as any }),
          },
          include: {
            captain: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return NextResponse.json(documents.map(doc => ({
          ...doc,
          totalAmount: doc.totalAmount / 100,
          box7Amount: doc.box7Amount ? doc.box7Amount / 100 : null,
        })));
      }

      case 'download-pdf': {
        const documentId = searchParams.get('documentId');
        if (!documentId) {
          return NextResponse.json(
            { error: 'Document ID required' },
            { status: 400 }
          );
        }

        const document = await prisma.taxDocument.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          return NextResponse.json(
            { error: 'Document not found' },
            { status: 404 }
          );
        }

        const pdfBytes = await generatePDF1099MISC(document);
        
        return new NextResponse(pdfBytes, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="1099-MISC-${document.taxYear}-${document.captainId}.pdf"`,
          },
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Tax reporting GET API error:', error);
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const body = await request.json();

    switch (action) {
      case 'generate-report': {
        const params = taxReportGenerationSchema.parse(body);
        const report = await generateTaxReport(params, user.id);
        return NextResponse.json(report);
      }

      case 'generate-1099-misc': {
        const params = taxDocumentGenerationSchema.parse(body);
        const document = await generate1099MISCDocument(params, user.id);
        return NextResponse.json({
          ...document,
          totalAmount: document.totalAmount / 100,
          box7Amount: document.box7Amount ? document.box7Amount / 100 : null,
        });
      }

      case 'update-document-status': {
        const params = taxDocumentStatusSchema.parse(body);
        const document = await updateTaxDocumentStatus(params, user.id);
        return NextResponse.json({
          ...document,
          totalAmount: document.totalAmount / 100,
          box7Amount: document.box7Amount ? document.box7Amount / 100 : null,
        });
      }

      case 'bulk-generate-1099': {
        const { taxYear, captainIds } = body;
        
        if (!taxYear || !Array.isArray(captainIds) || captainIds.length === 0) {
          return NextResponse.json(
            { error: 'Tax year and captain IDs are required' },
            { status: 400 }
          );
        }

        const results = [];
        for (const captainId of captainIds) {
          try {
            const document = await generate1099MISCDocument({
              captainId,
              taxYear,
              documentType: 'FORM_1099_MISC',
              forceRegenerate: false,
            }, user.id);
            
            results.push({
              captainId,
              success: true,
              documentId: document.id,
            });
          } catch (error) {
            results.push({
              captainId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        return NextResponse.json({ results });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Tax reporting POST API error:', error);
    
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
