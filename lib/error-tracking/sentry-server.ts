import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';

// Server-side error tracking utilities

export interface ServerErrorContext {
  endpoint: string;
  method: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  headers?: Record<string, string>;
  body?: any;
}

/**
 * Captures server-side errors with rich context
 */
export function captureServerError(
  error: Error,
  context: ServerErrorContext,
  level: 'error' | 'warning' | 'fatal' = 'error'
) {
  if (!process.env.SENTRY_DSN) {
    console.error('🚨 Server Error (Sentry not configured):', {
      error: error.message,
      context,
      stack: error.stack
    });
    return;
  }

  Sentry.withScope((scope) => {
    // Set error level
    scope.setLevel(level);
    
    // Set tags for filtering and organization
    scope.setTag('component', 'server');
    scope.setTag('endpoint', context.endpoint);
    scope.setTag('method', context.method);
    scope.setTag('app', 'cascais-fishing');
    
    // Set user context if available
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    
    // Set request context
    scope.setContext('request', {
      endpoint: context.endpoint,
      method: context.method,
      userAgent: context.userAgent,
      ip: context.ip,
      requestId: context.requestId,
      headers: context.headers,
    });
    
    // Set additional context
    scope.setContext('environment', {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      timestamp: new Date().toISOString(),
    });
    
    // Add request body if available (be careful with sensitive data)
    if (context.body && typeof context.body === 'object') {
      // Filter out sensitive fields
      const sanitizedBody = { ...context.body };
      delete sanitizedBody.password;
      delete sanitizedBody.token;
      delete sanitizedBody.secret;
      
      scope.setContext('requestBody', sanitizedBody);
    }
    
    // Capture the exception
    Sentry.captureException(error);
    
    console.log('✅ Server error captured by Sentry:', {
      message: error.message,
      endpoint: context.endpoint,
      method: context.method,
      level
    });
  });
}

/**
 * API Route wrapper with automatic error tracking
 */
export function withErrorTracking<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  endpoint?: string
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      const errorContext: ServerErrorContext = {
        endpoint: endpoint || request.nextUrl.pathname,
        method: request.method,
        userAgent: request.headers.get('user-agent') || undefined,
        ip: request.ip || 
            request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            undefined,
        requestId: request.headers.get('x-request-id') || undefined,
        headers: {
          'content-type': request.headers.get('content-type') || 'unknown',
          'referer': request.headers.get('referer') || 'unknown',
          'accept': request.headers.get('accept') || 'unknown',
        }
      };
      
      // Try to get request body for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const bodyText = await request.text();
          if (bodyText) {
            errorContext.body = JSON.parse(bodyText);
          }
        } catch (bodyError) {
          // Failed to parse body, skip it
          console.warn('Failed to parse request body for error tracking:', bodyError);
        }
      }
      
      // Capture the error with context
      captureServerError(error as Error, errorContext);
      
      // Return error response
      const message = error instanceof Error ? error.message : 'Internal server error';
      
      return NextResponse.json(
        { 
          success: false, 
          error: message,
          ...(process.env.NODE_ENV === 'development' && {
            details: error instanceof Error ? error.stack : undefined
          })
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Database error handler with specific context
 */
export function captureDatabaseError(
  error: Error,
  operation: string,
  table?: string,
  query?: string,
  userId?: string
) {
  const context: ServerErrorContext = {
    endpoint: `database:${operation}`,
    method: 'DATABASE',
    userId,
  };
  
  Sentry.withScope((scope) => {
    scope.setTag('component', 'database');
    scope.setTag('operation', operation);
    if (table) scope.setTag('table', table);
    
    scope.setContext('database', {
      operation,
      table,
      query: query?.substring(0, 200), // Limit query length for security
      timestamp: new Date().toISOString(),
    });
    
    if (userId) {
      scope.setUser({ id: userId });
    }
    
    Sentry.captureException(error);
  });
  
  console.log('🗄️ Database error captured:', {
    operation,
    table,
    message: error.message
  });
}

/**
 * Performance monitoring for API endpoints
 */
export function startServerTransaction(
  name: string,
  operation: string = 'api.request'
) {
  if (!process.env.SENTRY_DSN) {
    return { finish: () => {} };
  }
  
  const transaction = Sentry.startTransaction({
    name,
    op: operation,
    tags: {
      component: 'server',
      app: 'cascais-fishing'
    }
  });
  
  Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));
  
  return transaction;
}

/**
 * Log performance metrics
 */
export function logServerPerformance(
  endpoint: string,
  method: string,
  duration: number,
  statusCode: number
) {
  if (duration > 3000) { // Log slow requests
    Sentry.addBreadcrumb({
      message: 'Slow API request detected',
      category: 'performance',
      level: 'warning',
      data: {
        endpoint,
        method,
        duration,
        statusCode,
        threshold: 3000
      }
    });
  }
  
  // Add performance data to Sentry
  Sentry.setContext('performance', {
    endpoint,
    method,
    duration,
    statusCode,
    timestamp: new Date().toISOString()
  });
}

/**
 * Capture warning messages with context
 */
export function captureServerWarning(
  message: string,
  context?: Partial<ServerErrorContext>,
  extra?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    scope.setLevel('warning');
    scope.setTag('component', 'server');
    scope.setTag('app', 'cascais-fishing');
    
    if (context) {
      scope.setContext('warning', context);
    }
    
    if (extra) {
      scope.setContext('extra', extra);
    }
    
    Sentry.captureMessage(message, 'warning');
  });
  
  console.warn('⚠️ Server warning captured:', message, context);
}
