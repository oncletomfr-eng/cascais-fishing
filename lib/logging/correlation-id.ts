/**
 * Request Correlation ID System
 * Trace requests through all application layers
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// Conditionally import AsyncLocalStorage only on server
let AsyncLocalStorage: any;
let correlationStorage: any;

// Server-side only - check for Node.js environment more strictly
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
  // Use dynamic import to prevent client-side bundling
  try {
    // Only import on server-side
    AsyncLocalStorage = eval('require')('async_hooks').AsyncLocalStorage;
    correlationStorage = new AsyncLocalStorage();
  } catch (error) {
    // Fallback for environments without async_hooks
    console.warn('async_hooks not available, correlation tracking will be limited');
  }
}

// Store for correlation context
export interface CorrelationContext {
  correlationId: string;
  requestId: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
  path?: string;
  method?: string;
  userAgent?: string;
  ipAddress?: string;
}

// Export correlationStorage (will be undefined on client-side)
export { correlationStorage };

// Header names for correlation IDs
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  return `corr_${uuidv4()}`;
}

/**
 * Generate a new request ID
 */
export function generateRequestId(): string {
  return `req_${uuidv4()}`;
}

/**
 * Extract correlation context from request headers
 */
export function extractCorrelationContext(request: NextRequest): Partial<CorrelationContext> {
  // Try to get existing correlation ID from headers
  const existingCorrelationId = request.headers.get(CORRELATION_ID_HEADER);
  const existingRequestId = request.headers.get(REQUEST_ID_HEADER);
  
  // Get client IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  return {
    correlationId: existingCorrelationId || generateCorrelationId(),
    requestId: existingRequestId || generateRequestId(),
    startTime: Date.now(),
    path: request.nextUrl.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || 'unknown',
    ipAddress
  };
}

/**
 * Get current correlation context from async local storage
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage?.getStore();
}

/**
 * Get correlation ID from current context
 */
export function getCorrelationId(): string | undefined {
  return getCorrelationContext()?.correlationId;
}

/**
 * Get request ID from current context
 */
export function getRequestId(): string | undefined {
  return getCorrelationContext()?.requestId;
}

/**
 * Get user ID from current context
 */
export function getUserId(): string | undefined {
  return getCorrelationContext()?.userId;
}

/**
 * Update correlation context with additional information
 */
export function updateCorrelationContext(updates: Partial<CorrelationContext>): void {
  const currentContext = getCorrelationContext();
  if (currentContext) {
    Object.assign(currentContext, updates);
  }
}

/**
 * Run code within a correlation context
 */
export function runWithCorrelationContext<T>(
  context: CorrelationContext,
  callback: () => T
): T {
  return correlationStorage ? correlationStorage.run(context, callback) : callback();
}

/**
 * Middleware function to establish correlation context for API routes
 */
export function withCorrelationId<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return async (...args: T): Promise<Response> => {
    const request = args[0] as NextRequest;
    
    // Extract or create correlation context
    const partialContext = extractCorrelationContext(request);
    const context: CorrelationContext = {
      correlationId: partialContext.correlationId!,
      requestId: partialContext.requestId!,
      startTime: partialContext.startTime!,
      path: partialContext.path,
      method: partialContext.method,
      userAgent: partialContext.userAgent,
      ipAddress: partialContext.ipAddress
    };
    
    // Run the handler within correlation context
    return correlationStorage ? correlationStorage.run(context, async () => {
      try {
        const response = await handler(...args);
        
        // Add correlation headers to response
        const headers = new Headers(response.headers);
        headers.set(CORRELATION_ID_HEADER, context.correlationId);
        headers.set(REQUEST_ID_HEADER, context.requestId);
        headers.set('x-response-time', `${Date.now() - context.startTime}ms`);
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        // Ensure correlation headers are added even on error
        const errorResponse = NextResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
        
        errorResponse.headers.set(CORRELATION_ID_HEADER, context.correlationId);
        errorResponse.headers.set(REQUEST_ID_HEADER, context.requestId);
        errorResponse.headers.set('x-response-time', `${Date.now() - context.startTime}ms`);
        
        throw error;
      }
    }) : handler(...args);
  };
}

/**
 * Helper to create correlation-aware database operations
 */
export function withCorrelationLogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const context = getCorrelationContext();
    const startTime = Date.now();
    
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      // This could integrate with the structured logger
      if (context) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'debug',
          message: `Database Operation: ${operationName}`,
          correlationId: context.correlationId,
          requestId: context.requestId,
          operation: operationName,
          duration,
          success: true
        }));
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (context) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Database Operation Failed: ${operationName}`,
          correlationId: context.correlationId,
          requestId: context.requestId,
          operation: operationName,
          duration,
          success: false,
          error: {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        }));
      }
      
      throw error;
    }
  };
}

/**
 * Express-style middleware for correlation IDs (for compatibility)
 */
export function correlationIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationId = req.headers[CORRELATION_ID_HEADER] || generateCorrelationId();
    const requestId = req.headers[REQUEST_ID_HEADER] || generateRequestId();
    
    // Attach to request object
    req.correlationId = correlationId;
    req.requestId = requestId;
    
    // Set response headers
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    res.setHeader(REQUEST_ID_HEADER, requestId);
    
    // Create context for this request
    const context: CorrelationContext = {
      correlationId,
      requestId,
      startTime: Date.now(),
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'] || 'unknown',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown'
    };
    
    if (correlationStorage) {
      correlationStorage.run(context, () => {
        next();
      });
    } else {
      next();
    }
  };
}

/**
 * Utility to get correlation headers for external API calls
 */
export function getCorrelationHeaders(): Record<string, string> {
  const context = getCorrelationContext();
  const headers: Record<string, string> = {};
  
  if (context) {
    headers[CORRELATION_ID_HEADER] = context.correlationId;
    headers[REQUEST_ID_HEADER] = context.requestId;
  }
  
  return headers;
}

/**
 * Create a child correlation ID for sub-operations
 */
export function createChildCorrelationId(): string {
  const parentContext = getCorrelationContext();
  if (parentContext) {
    return `${parentContext.correlationId}_child_${uuidv4().substring(0, 8)}`;
  }
  return generateCorrelationId();
}

/**
 * Integration with Next.js middleware
 */
export function enhanceMiddlewareWithCorrelation(
  middleware: (request: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const context = {
      ...extractCorrelationContext(request),
      correlationId: extractCorrelationContext(request).correlationId!,
      requestId: extractCorrelationContext(request).requestId!,
      startTime: Date.now()
    };
    
    return correlationStorage ? correlationStorage.run(context as CorrelationContext, async () => {
      const response = await middleware(request);
      
      // Add correlation headers to response
      response.headers.set(CORRELATION_ID_HEADER, context.correlationId);
      response.headers.set(REQUEST_ID_HEADER, context.requestId);
      response.headers.set('x-response-time', `${Date.now() - context.startTime}ms`);
      
      return response;
    }) : middleware(request);
  };
}
