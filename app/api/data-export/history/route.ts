/**
 * Export History API Endpoint
 * Task 6.4: Data Export & Reporting System
 * 
 * Manages export history tracking and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { format } from 'date-fns';

// Export history interface
interface ExportHistory {
  id: string;
  userId: string;
  filename: string;
  format: 'csv' | 'pdf' | 'excel';
  dataType: string;
  fileSize: number;
  recordCount: number;
  exportedAt: Date;
  downloadUrl?: string;
  status: 'processing' | 'completed' | 'failed' | 'expired';
  error?: string;
  expiresAt?: Date;
}

// Mock database for export history (in production, use actual database)
const exportHistory: ExportHistory[] = [
  // Mock data for demonstration
  {
    id: 'export_1',
    userId: 'user_1', // This should match actual user IDs
    filename: 'payments-export-2024-01-01.csv',
    format: 'csv',
    dataType: 'payments',
    fileSize: 1024 * 15, // 15 KB
    recordCount: 125,
    exportedAt: new Date('2024-01-01T10:30:00Z'),
    status: 'completed',
    downloadUrl: '/api/data-export/download/export_1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  },
  {
    id: 'export_2',
    userId: 'user_1',
    filename: 'earnings-report-2024-01-02.pdf',
    format: 'pdf',
    dataType: 'earnings',
    fileSize: 1024 * 250, // 250 KB
    recordCount: 30,
    exportedAt: new Date('2024-01-02T14:15:00Z'),
    status: 'completed',
    downloadUrl: '/api/data-export/download/export_2',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
  },
  {
    id: 'export_3',
    userId: 'user_1',
    filename: 'commissions-export-2024-01-03.xlsx',
    format: 'excel',
    dataType: 'commissions',
    fileSize: 1024 * 75, // 75 KB
    recordCount: 45,
    exportedAt: new Date('2024-01-03T09:45:00Z'),
    status: 'processing',
    expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // 6 days from now
  },
  {
    id: 'export_4',
    userId: 'user_1',
    filename: 'all-data-export-2023-12-30.xlsx',
    format: 'excel',
    dataType: 'all',
    fileSize: 1024 * 500, // 500 KB
    recordCount: 200,
    exportedAt: new Date('2023-12-30T16:20:00Z'),
    status: 'expired',
    expiresAt: new Date('2024-01-06T16:20:00Z') // Already expired
  },
  {
    id: 'export_5',
    userId: 'user_1',
    filename: 'payments-export-failed.csv',
    format: 'csv',
    dataType: 'payments',
    fileSize: 0,
    recordCount: 0,
    exportedAt: new Date('2024-01-04T11:00:00Z'),
    status: 'failed',
    error: 'Database connection timeout'
  }
];

// Helper function to clean up expired exports
function cleanupExpiredExports(userId: string): void {
  const now = new Date();
  const userExports = exportHistory.filter(exp => exp.userId === userId);
  
  userExports.forEach(exp => {
    if (exp.expiresAt && exp.expiresAt < now && exp.status === 'completed') {
      exp.status = 'expired';
      exp.downloadUrl = undefined;
    }
  });
}

// Helper function to create mock export history entry
function createExportHistoryEntry(
  userId: string,
  format: string,
  dataType: string,
  recordCount: number,
  fileSize: number
): ExportHistory {
  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
  const filename = `${dataType}-export-${timestamp}.${format}`;
  const id = `export_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

  return {
    id,
    userId,
    filename,
    format: format as any,
    dataType,
    fileSize,
    recordCount,
    exportedAt: new Date(),
    status: 'completed',
    downloadUrl: `/api/data-export/download/${id}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  };
}

// GET - Retrieve export history
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const format = searchParams.get('format');

    // Clean up expired exports
    cleanupExpiredExports(userId);

    // Filter exports for current user
    let userExports = exportHistory.filter(exp => exp.userId === userId);

    // Apply filters
    if (status) {
      userExports = userExports.filter(exp => exp.status === status);
    }

    if (format) {
      userExports = userExports.filter(exp => exp.format === format);
    }

    // Sort by export date (newest first)
    userExports.sort((a, b) => b.exportedAt.getTime() - a.exportedAt.getTime());

    // Apply pagination
    const paginatedExports = userExports.slice(offset, offset + limit);

    // Calculate summary stats
    const summary = {
      total: userExports.length,
      completed: userExports.filter(exp => exp.status === 'completed').length,
      processing: userExports.filter(exp => exp.status === 'processing').length,
      failed: userExports.filter(exp => exp.status === 'failed').length,
      expired: userExports.filter(exp => exp.status === 'expired').length,
      totalSize: userExports.reduce((sum, exp) => sum + exp.fileSize, 0),
      totalRecords: userExports.reduce((sum, exp) => sum + exp.recordCount, 0)
    };

    return NextResponse.json({
      exports: paginatedExports,
      summary,
      pagination: {
        limit,
        offset,
        total: userExports.length,
        hasMore: offset + limit < userExports.length
      }
    });

  } catch (error) {
    console.error('Get export history API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve export history' },
      { status: 500 }
    );
  }
}

// POST - Add new export to history (typically called by export process)
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
    const body = await request.json();

    const {
      format,
      dataType,
      recordCount,
      fileSize,
      status = 'completed',
      error: exportError
    } = body;

    // Create new export history entry
    const newEntry = createExportHistoryEntry(userId, format, dataType, recordCount, fileSize);
    
    if (status !== 'completed') {
      newEntry.status = status;
      if (exportError) {
        newEntry.error = exportError;
      }
      if (status === 'failed') {
        newEntry.downloadUrl = undefined;
        newEntry.expiresAt = undefined;
      }
    }

    // Add to history
    exportHistory.push(newEntry);

    return NextResponse.json(newEntry, { status: 201 });

  } catch (error) {
    console.error('Add export history API error:', error);
    return NextResponse.json(
      { error: 'Failed to add export to history' },
      { status: 500 }
    );
  }
}

// DELETE - Clear export history
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
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('all') === 'true';
    const olderThan = searchParams.get('olderThan'); // ISO date string

    // Count items to be deleted
    let itemsToDelete: ExportHistory[];
    
    if (clearAll) {
      itemsToDelete = exportHistory.filter(exp => exp.userId === userId);
    } else if (olderThan) {
      const cutoffDate = new Date(olderThan);
      itemsToDelete = exportHistory.filter(exp => 
        exp.userId === userId && exp.exportedAt < cutoffDate
      );
    } else {
      // Default: clear only expired and failed exports
      itemsToDelete = exportHistory.filter(exp => 
        exp.userId === userId && (exp.status === 'expired' || exp.status === 'failed')
      );
    }

    // Remove items from history
    itemsToDelete.forEach(item => {
      const index = exportHistory.findIndex(exp => exp.id === item.id);
      if (index !== -1) {
        exportHistory.splice(index, 1);
      }
    });

    return NextResponse.json({
      message: `Cleared ${itemsToDelete.length} export records`,
      deletedCount: itemsToDelete.length,
      deletedItems: itemsToDelete.map(item => ({
        id: item.id,
        filename: item.filename,
        status: item.status
      }))
    });

  } catch (error) {
    console.error('Clear export history API error:', error);
    return NextResponse.json(
      { error: 'Failed to clear export history' },
      { status: 500 }
    );
  }
}
