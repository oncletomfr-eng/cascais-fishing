/**
 * Transaction Notes API Endpoint
 * Task 7.4: Transaction Detail Modal
 * 
 * Manages transaction notes for the detail modal
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const transactionNotesParamsSchema = z.object({
  id: z.string().min(1, 'Transaction ID is required')
});

const createNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
  category: z.enum(['general', 'customer_service', 'technical', 'financial', 'compliance']).default('general'),
  isInternal: z.boolean().default(false),
  isVisible: z.boolean().default(true)
});

// Transaction note interface (matches component interface)
interface TransactionNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  isInternal: boolean;
  isVisible: boolean;
  category: 'general' | 'customer_service' | 'technical' | 'financial' | 'compliance';
}

// Mock notes storage (in real app this would be in database)
const mockNotes = new Map<string, TransactionNote[]>();

// Helper function to get or create notes for transaction
function getTransactionNotes(transactionId: string): TransactionNote[] {
  if (!mockNotes.has(transactionId)) {
    // Generate some sample notes for demonstration
    mockNotes.set(transactionId, [
      {
        id: `note_1_${transactionId}`,
        content: 'Initial payment processing completed successfully.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdBy: 'system',
        createdByName: 'System',
        isInternal: false,
        isVisible: true,
        category: 'general'
      },
      {
        id: `note_2_${transactionId}`,
        content: 'Customer contacted support regarding this transaction. Issue resolved.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdBy: 'support_agent',
        createdByName: 'Support Agent',
        isInternal: false,
        isVisible: true,
        category: 'customer_service'
      }
    ]);
  }
  
  return mockNotes.get(transactionId) || [];
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
    const { id: transactionId } = transactionNotesParamsSchema.parse(params);

    // Get current user for access control
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const isAdmin = currentUser?.role === 'ADMIN';

    // Verify transaction exists and user has access
    const whereClause: any = {
      id: transactionId
    };

    // Regular users can only see their own transactions
    if (!isAdmin) {
      whereClause.userId = session.user.id;
    }

    const payment = await prisma.payment.findFirst({
      where: whereClause
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Get notes for this transaction
    let notes = getTransactionNotes(transactionId);

    // Filter notes based on user permissions
    if (!isAdmin) {
      // Regular users can't see internal notes
      notes = notes.filter(note => !note.isInternal && note.isVisible);
    }

    // Sort notes by creation date (newest first)
    notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      notes,
      total: notes.length,
      transactionId
    });

  } catch (error) {
    console.error('Transaction notes API error:', error);
    
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

// Create a new note
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

    // Validate parameters
    const { id: transactionId } = transactionNotesParamsSchema.parse(params);

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, name: true }
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const isAdmin = currentUser.role === 'ADMIN';

    // Verify transaction exists and user has access
    const whereClause: any = {
      id: transactionId
    };

    // Regular users can only add notes to their own transactions
    if (!isAdmin) {
      whereClause.userId = session.user.id;
    }

    const payment = await prisma.payment.findFirst({
      where: whereClause
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const noteData = createNoteSchema.parse(body);

    // Create new note
    const newNote: TransactionNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      content: noteData.content,
      createdAt: new Date(),
      createdBy: session.user.id,
      createdByName: currentUser.name || 'User',
      isInternal: isAdmin ? noteData.isInternal : false, // Only admins can create internal notes
      isVisible: noteData.isVisible,
      category: noteData.category
    };

    // Add note to transaction
    const existingNotes = getTransactionNotes(transactionId);
    existingNotes.unshift(newNote); // Add to beginning (newest first)
    mockNotes.set(transactionId, existingNotes);

    return NextResponse.json({
      note: newNote,
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('Create transaction note API error:', error);
    
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

// Update a note (admin only)
export async function PUT(
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
    const { id: transactionId } = transactionNotesParamsSchema.parse(params);

    // Check admin permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required for note updates' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { noteId, ...updates } = z.object({
      noteId: z.string(),
      content: z.string().optional(),
      category: z.enum(['general', 'customer_service', 'technical', 'financial', 'compliance']).optional(),
      isInternal: z.boolean().optional(),
      isVisible: z.boolean().optional()
    }).parse(body);

    // Get and update note
    const notes = getTransactionNotes(transactionId);
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex === -1) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    // Update note
    notes[noteIndex] = { ...notes[noteIndex], ...updates };
    mockNotes.set(transactionId, notes);

    return NextResponse.json({
      note: notes[noteIndex],
      message: 'Note updated successfully'
    });

  } catch (error) {
    console.error('Update transaction note API error:', error);
    
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

// Delete a note (admin only)
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

    // Check admin permissions
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (currentUser?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin permissions required for note deletion' },
        { status: 403 }
      );
    }

    // Validate parameters
    const { id: transactionId } = transactionNotesParamsSchema.parse(params);

    // Get noteId from query params
    const { searchParams } = new URL(request.url);
    const noteId = searchParams.get('noteId');
    
    if (!noteId) {
      return NextResponse.json(
        { error: 'Note ID is required' },
        { status: 400 }
      );
    }

    // Remove note
    const notes = getTransactionNotes(transactionId);
    const filteredNotes = notes.filter(note => note.id !== noteId);
    
    if (filteredNotes.length === notes.length) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    mockNotes.set(transactionId, filteredNotes);

    return NextResponse.json({
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete transaction note API error:', error);
    
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
