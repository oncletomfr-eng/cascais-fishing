/**
 * Transactions API Endpoint
 * Task 7.1: Transaction List with MUI DataGrid
 * 
 * Comprehensive transaction management API with server-side pagination,
 * sorting, filtering, and search capabilities for MUI X DataGrid Pro
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfDay, endOfDay } from 'date-fns';

// Validation schemas
const transactionsQuerySchema = z.object({
  page: z.string().transform(str => parseInt(str, 10)).default('0'),
  pageSize: z.string().transform(str => parseInt(str, 10)).default('25'),
  sortField: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['pending', 'completed', 'failed', 'cancelled', 'processing', 'refunded']).optional(),
  type: z.enum(['payment', 'refund', 'dispute', 'transfer', 'fee']).optional(),
  paymentMethod: z.string().optional(),
  dateFrom: z.string().transform(str => new Date(str)).optional(),
  dateTo: z.string().transform(str => new Date(str)).optional(),
  amountMin: z.string().transform(str => parseFloat(str)).optional(),
  amountMax: z.string().transform(str => parseFloat(str)).optional(),
  customerId: z.string().optional()
});

// Helper function to build where clause
function buildWhereClause(filters: any, userId: string) {
  const where: any = {
    userId: userId,
    // Only include successful payments and related transactions
    status: {
      in: ['PENDING', 'COMPLETED', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PROCESSING', 'REQUIRES_ACTION']
    }
  };

  // Status filter
  if (filters.status) {
    const statusMap: Record<string, string[]> = {
      'pending': ['PENDING', 'REQUIRES_ACTION'],
      'completed': ['COMPLETED', 'SUCCEEDED'],
      'failed': ['FAILED'],
      'cancelled': ['CANCELLED'],
      'processing': ['PROCESSING'],
      'refunded': ['REFUNDED'] // This might need to be handled differently based on your schema
    };
    
    if (statusMap[filters.status]) {
      where.status = { in: statusMap[filters.status] };
    }
  }

  // Date range filter
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = startOfDay(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.createdAt.lte = endOfDay(filters.dateTo);
    }
  }

  // Amount range filter
  if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
    where.amount = {};
    if (filters.amountMin !== undefined) {
      where.amount.gte = Math.round(filters.amountMin * 100); // Convert to cents
    }
    if (filters.amountMax !== undefined) {
      where.amount.lte = Math.round(filters.amountMax * 100); // Convert to cents
    }
  }

  // Customer filter
  if (filters.customerId) {
    where.userId = filters.customerId;
  }

  return where;
}

// Helper function to build search clause
function buildSearchClause(searchQuery: string) {
  if (!searchQuery) return {};

  return {
    OR: [
      { id: { contains: searchQuery, mode: 'insensitive' } },
      { stripePaymentIntentId: { contains: searchQuery, mode: 'insensitive' } },
      { description: { contains: searchQuery, mode: 'insensitive' } },
      // Search in booking information
      { booking: { 
        trip: {
          title: { contains: searchQuery, mode: 'insensitive' }
        }
      }},
      // Search in user information  
      { user: {
        OR: [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { email: { contains: searchQuery, mode: 'insensitive' } }
        ]
      }}
    ]
  };
}

// Helper function to map database payment to transaction format
function mapPaymentToTransaction(payment: any): any {
  // Determine transaction type based on amount and status
  const getTransactionType = (payment: any) => {
    if (payment.amount < 0) return 'refund';
    if (payment.status === 'FAILED') return 'payment';
    if (payment.description?.toLowerCase().includes('dispute')) return 'dispute';
    if (payment.description?.toLowerCase().includes('fee')) return 'fee';
    return 'payment';
  };

  // Map payment status to transaction status
  const getTransactionStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': 'pending',
      'REQUIRES_ACTION': 'pending',
      'COMPLETED': 'completed',
      'SUCCEEDED': 'completed', 
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'PROCESSING': 'processing',
      'REFUNDED': 'refunded'
    };
    return statusMap[status] || 'pending';
  };

  // Extract payment method info
  const getPaymentMethodInfo = (payment: any) => {
    if (payment.paymentMethod) {
      return {
        type: payment.paymentMethod.type?.toLowerCase() || 'card',
        last4: payment.paymentMethod.cardLast4 || payment.paymentMethod.last4,
        brand: payment.paymentMethod.cardBrand || payment.paymentMethod.brand,
        details: payment.paymentMethod.cardBrand && payment.paymentMethod.cardLast4 
          ? `${payment.paymentMethod.cardBrand} ****${payment.paymentMethod.cardLast4}`
          : payment.paymentMethod.type || 'Payment Method'
      };
    }

    // Fallback based on Stripe payment method ID
    if (payment.stripePaymentMethodId) {
      if (payment.stripePaymentMethodId.startsWith('pm_')) {
        return {
          type: 'card',
          details: 'Credit Card',
          brand: 'card'
        };
      }
    }

    return {
      type: 'other',
      details: 'Unknown Payment Method'
    };
  };

  // Calculate fees (simplified - you might have more complex fee logic)
  const calculateFees = (amount: number) => {
    // Stripe fees: 2.9% + €0.30
    return Math.round(amount * 0.029 + 30);
  };

  const fees = calculateFees(payment.amount || 0);
  const netAmount = (payment.amount || 0) - fees;

  return {
    id: payment.id,
    transactionId: payment.stripePaymentIntentId || payment.id,
    date: payment.createdAt,
    amount: payment.amount || 0,
    currency: payment.currency || 'EUR',
    status: getTransactionStatus(payment.status),
    type: getTransactionType(payment),
    paymentMethod: getPaymentMethodInfo(payment),
    customer: {
      id: payment.userId || payment.user?.id || 'unknown',
      name: payment.user?.name || payment.customerName || 'Unknown Customer',
      email: payment.user?.email || payment.customerEmail || 'N/A'
    },
    description: payment.description || `Payment for ${payment.booking?.trip?.title || 'service'}`,
    metadata: payment.metadata || {},
    refundable: payment.status === 'COMPLETED' || payment.status === 'SUCCEEDED',
    disputable: payment.status === 'COMPLETED' || payment.status === 'SUCCEEDED',
    fees: fees,
    netAmount: netAmount,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt
  };
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
    const queryData = transactionsQuerySchema.parse({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      sortField: searchParams.get('sortField'),
      sortOrder: searchParams.get('sortOrder'),
      search: searchParams.get('search'),
      status: searchParams.get('status'),
      type: searchParams.get('type'),
      paymentMethod: searchParams.get('paymentMethod'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      amountMin: searchParams.get('amountMin'),
      amountMax: searchParams.get('amountMax'),
      customerId: searchParams.get('customerId')
    });

    const targetUserId = session.user.id;

    // Verify user access (users can only access their own data unless admin)
    let accessibleUserIds = [targetUserId];
    
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    // If admin, can access all transactions or filter by specific customer
    if (currentUser?.role === 'ADMIN') {
      if (queryData.customerId) {
        accessibleUserIds = [queryData.customerId];
      } else {
        // For admin, we'll modify the query to not restrict by userId
        accessibleUserIds = [];
      }
    }

    // Build base where clause
    const baseWhere = accessibleUserIds.length > 0 
      ? buildWhereClause(queryData, accessibleUserIds[0])
      : buildWhereClause({ ...queryData, userId: undefined }, '');

    // Remove userId restriction for admin viewing all transactions
    if (currentUser?.role === 'ADMIN' && !queryData.customerId) {
      delete baseWhere.userId;
    }

    // Add search conditions
    const searchWhere = buildSearchClause(queryData.search || '');
    
    const where = queryData.search 
      ? { ...baseWhere, ...searchWhere }
      : baseWhere;

    // Build order clause
    const orderBy: any = [];
    if (queryData.sortField && queryData.sortOrder) {
      // Map frontend field names to database field names
      const fieldMap: Record<string, string> = {
        'date': 'createdAt',
        'amount': 'amount',
        'status': 'status',
        'transactionId': 'id'
      };
      
      const dbField = fieldMap[queryData.sortField] || queryData.sortField;
      orderBy.push({ [dbField]: queryData.sortOrder });
    } else {
      // Default sort by creation date, newest first
      orderBy.push({ createdAt: 'desc' });
    }

    // Calculate pagination
    const skip = queryData.page * queryData.pageSize;
    const take = Math.min(queryData.pageSize, 250); // Max 250 records per page

    // Fetch transactions with includes for related data
    const [transactions, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              name: true, 
              email: true
            }
          },
          paymentMethod: {
            select: {
              type: true,
              cardBrand: true,
              cardLast4: true,
              last4: true,
              brand: true
            }
          },
          booking: {
            select: {
              id: true,
              trip: {
                select: {
                  id: true,
                  title: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          }
        }
      }),
      prisma.payment.count({ where })
    ]);

    // Transform payments to transaction format
    const transformedTransactions = transactions.map(mapPaymentToTransaction);

    // Calculate summary statistics
    const summary = {
      totalTransactions: totalCount,
      totalAmount: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
      totalFees: transformedTransactions.reduce((sum, t) => sum + t.fees, 0),
      statusBreakdown: transactions.reduce((acc: Record<string, number>, t) => {
        const status = mapPaymentToTransaction(t).status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      averageAmount: totalCount > 0 
        ? transactions.reduce((sum, t) => sum + (t.amount || 0), 0) / totalCount
        : 0
    };

    return NextResponse.json({
      transactions: transformedTransactions,
      totalCount,
      page: queryData.page,
      pageSize: queryData.pageSize,
      totalPages: Math.ceil(totalCount / queryData.pageSize),
      hasNextPage: (queryData.page + 1) * queryData.pageSize < totalCount,
      hasPreviousPage: queryData.page > 0,
      summary
    });

  } catch (error) {
    console.error('Transactions API error:', error);
    
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
    { error: 'Method not allowed. Use GET to fetch transactions.' },
    { status: 405 }
  );
}
