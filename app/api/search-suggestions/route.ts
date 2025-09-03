/**
 * Search Suggestions API Endpoint
 * Task 7.3: Global Search Functionality
 * 
 * Provides intelligent search suggestions with auto-complete
 * capabilities across transaction data and search history
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const searchSuggestionsQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.string().transform(str => parseInt(str, 10)).optional().default('10')
});

// Search suggestion interface
interface SearchSuggestion {
  id: string;
  type: 'transaction' | 'customer' | 'amount' | 'date' | 'payment_method' | 'recent';
  text: string;
  description?: string;
  count?: number;
  metadata?: Record<string, any>;
}

// Helper function to generate customer suggestions
async function getCustomerSuggestions(query: string, userId: string, limit: number): Promise<SearchSuggestion[]> {
  try {
    const customers = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } }
            ]
          },
          // Only customers who have made payments
          {
            payments: {
              some: {
                status: { in: ['COMPLETED', 'SUCCEEDED', 'PENDING', 'PROCESSING'] }
              }
            }
          }
        ]
      },
      include: {
        _count: {
          select: { payments: true }
        }
      },
      take: limit,
      orderBy: [
        { payments: { _count: 'desc' } },
        { name: 'asc' }
      ]
    });

    return customers.map((customer, index) => ({
      id: `customer_${customer.id}_${index}`,
      type: 'customer' as const,
      text: `customer:${customer.name}`,
      description: `${customer.email} • ${customer._count.payments} transactions`,
      count: customer._count.payments,
      metadata: {
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email
      }
    }));
  } catch (error) {
    console.error('Error fetching customer suggestions:', error);
    return [];
  }
}

// Helper function to generate transaction ID suggestions
async function getTransactionSuggestions(query: string, userId: string, limit: number): Promise<SearchSuggestion[]> {
  try {
    const transactions = await prisma.payment.findMany({
      where: {
        AND: [
          {
            OR: [
              { id: { contains: query, mode: 'insensitive' } },
              { stripePaymentId: { contains: query, mode: 'insensitive' } }
            ]
          },
          // Access control based on user role
          userId ? { userId } : {}
        ]
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    return transactions.map((transaction, index) => ({
      id: `transaction_${transaction.id}_${index}`,
      type: 'transaction' as const,
      text: transaction.id,
      description: `${transaction.user?.name || 'Unknown'} • €${(transaction.amount / 100).toFixed(2)} • ${transaction.status}`,
      metadata: {
        transactionId: transaction.id,
        amount: transaction.amount,
        status: transaction.status,
        customerName: transaction.user?.name
      }
    }));
  } catch (error) {
    console.error('Error fetching transaction suggestions:', error);
    return [];
  }
}

// Helper function to generate amount-based suggestions
async function getAmountSuggestions(query: string, userId: string): Promise<SearchSuggestion[]> {
  const suggestions: SearchSuggestion[] = [];
  
  // Parse numeric query
  const numericQuery = parseFloat(query);
  if (!isNaN(numericQuery) && numericQuery > 0) {
    const amountInCents = Math.round(numericQuery * 100);
    
    suggestions.push(
      {
        id: `amount_exact_${numericQuery}`,
        type: 'amount',
        text: `amount:${numericQuery}`,
        description: `Exact amount €${numericQuery.toFixed(2)}`
      },
      {
        id: `amount_greater_${numericQuery}`,
        type: 'amount',
        text: `amount:>${numericQuery}`,
        description: `Amount greater than €${numericQuery.toFixed(2)}`
      },
      {
        id: `amount_less_${numericQuery}`,
        type: 'amount',
        text: `amount:<${numericQuery}`,
        description: `Amount less than €${numericQuery.toFixed(2)}`
      }
    );
  }

  return suggestions;
}

// Helper function to generate date suggestions
function getDateSuggestions(query: string): SearchSuggestion[] {
  const suggestions: SearchSuggestion[] = [];
  const today = new Date();
  
  // Common date patterns
  const datePatterns = [
    {
      key: 'today',
      text: 'date:today',
      description: 'Transactions from today',
      match: ['today', 'tod']
    },
    {
      key: 'yesterday',
      text: 'date:yesterday',
      description: 'Transactions from yesterday',
      match: ['yesterday', 'yest']
    },
    {
      key: 'week',
      text: 'date:week',
      description: 'Transactions from this week',
      match: ['week', 'this week']
    },
    {
      key: 'month',
      text: 'date:month',
      description: 'Transactions from this month',
      match: ['month', 'this month']
    },
    {
      key: 'year',
      text: 'date:year',
      description: 'Transactions from this year',
      match: ['year', 'this year']
    }
  ];

  // Check if query matches any date pattern
  const lowerQuery = query.toLowerCase();
  datePatterns.forEach((pattern, index) => {
    if (pattern.match.some(match => match.includes(lowerQuery) || lowerQuery.includes(match))) {
      suggestions.push({
        id: `date_${pattern.key}_${index}`,
        type: 'date',
        text: pattern.text,
        description: pattern.description
      });
    }
  });

  // If query looks like a date (YYYY, YYYY-MM, or YYYY-MM-DD)
  if (/^\d{4}(-\d{1,2}(-\d{1,2})?)?$/.test(query)) {
    suggestions.push({
      id: `date_custom_${query}`,
      type: 'date',
      text: `date:${query}`,
      description: `Transactions from ${query}`
    });
  }

  return suggestions;
}

// Helper function to generate payment method suggestions
function getPaymentMethodSuggestions(query: string): SearchSuggestion[] {
  const paymentMethods = [
    { value: 'card', label: 'Credit Card', keywords: ['card', 'credit', 'debit'] },
    { value: 'bank_transfer', label: 'Bank Transfer', keywords: ['bank', 'transfer', 'wire'] },
    { value: 'paypal', label: 'PayPal', keywords: ['paypal', 'pp'] },
    { value: 'crypto', label: 'Cryptocurrency', keywords: ['crypto', 'bitcoin', 'btc', 'eth'] },
    { value: 'other', label: 'Other Methods', keywords: ['other', 'misc'] }
  ];

  const lowerQuery = query.toLowerCase();
  return paymentMethods
    .filter(method => 
      method.keywords.some(keyword => keyword.includes(lowerQuery) || lowerQuery.includes(keyword))
    )
    .map((method, index) => ({
      id: `payment_${method.value}_${index}`,
      type: 'payment_method' as const,
      text: `payment:${method.value}`,
      description: `Transactions using ${method.label}`
    }));
}

// Helper function to generate status suggestions
function getStatusSuggestions(query: string): SearchSuggestion[] {
  const statuses = [
    { value: 'completed', label: 'Completed', keywords: ['completed', 'success', 'done'] },
    { value: 'pending', label: 'Pending', keywords: ['pending', 'waiting'] },
    { value: 'failed', label: 'Failed', keywords: ['failed', 'error', 'declined'] },
    { value: 'cancelled', label: 'Cancelled', keywords: ['cancelled', 'canceled', 'void'] },
    { value: 'processing', label: 'Processing', keywords: ['processing', 'proc'] },
    { value: 'refunded', label: 'Refunded', keywords: ['refunded', 'refund'] }
  ];

  const lowerQuery = query.toLowerCase();
  return statuses
    .filter(status => 
      status.keywords.some(keyword => keyword.includes(lowerQuery) || lowerQuery.includes(keyword))
    )
    .map((status, index) => ({
      id: `status_${status.value}_${index}`,
      type: 'transaction' as const,
      text: `status:${status.value}`,
      description: `${status.label} transactions`
    }));
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
    const queryData = searchSuggestionsQuerySchema.parse({
      q: searchParams.get('q'),
      limit: searchParams.get('limit')
    });

    const { q: query, limit } = queryData;
    const userId = session.user.id;

    // Check if user is admin (can access all data)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isAdmin = currentUser?.role === 'ADMIN';
    const targetUserId = isAdmin ? '' : userId; // Empty string for admin = access all

    // Generate different types of suggestions based on query
    const suggestions: SearchSuggestion[] = [];

    // 1. Customer suggestions (name/email matching)
    if (query.length >= 2) {
      const customerSuggestions = await getCustomerSuggestions(query, targetUserId, Math.min(limit, 3));
      suggestions.push(...customerSuggestions);
    }

    // 2. Transaction ID suggestions
    if (query.length >= 3) {
      const transactionSuggestions = await getTransactionSuggestions(query, targetUserId, Math.min(limit, 3));
      suggestions.push(...transactionSuggestions);
    }

    // 3. Amount-based suggestions
    const amountSuggestions = getAmountSuggestions(query, targetUserId);
    suggestions.push(...amountSuggestions);

    // 4. Date suggestions
    const dateSuggestions = getDateSuggestions(query);
    suggestions.push(...dateSuggestions);

    // 5. Payment method suggestions
    const paymentMethodSuggestions = getPaymentMethodSuggestions(query);
    suggestions.push(...paymentMethodSuggestions);

    // 6. Status suggestions
    const statusSuggestions = getStatusSuggestions(query);
    suggestions.push(...statusSuggestions);

    // Sort suggestions by relevance and limit results
    const sortedSuggestions = suggestions
      .slice(0, limit)
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.text.toLowerCase().includes(query.toLowerCase());
        const bExact = b.text.toLowerCase().includes(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then prioritize by type (customer > transaction > others)
        const typeOrder = ['customer', 'transaction', 'amount', 'date', 'payment_method'];
        const aOrder = typeOrder.indexOf(a.type);
        const bOrder = typeOrder.indexOf(b.type);
        if (aOrder !== bOrder) return aOrder - bOrder;
        
        // Finally by count (if available)
        return (b.count || 0) - (a.count || 0);
      });

    return NextResponse.json({
      suggestions: sortedSuggestions,
      query,
      total: sortedSuggestions.length
    });

  } catch (error) {
    console.error('Search suggestions API error:', error);
    
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
    { error: 'Method not allowed. Use GET for search suggestions.' },
    { status: 405 }
  );
}
