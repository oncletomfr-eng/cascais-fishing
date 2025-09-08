/**
 * Unified Logging Middleware
 * Combines structured logging, correlation IDs, and request tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  correlationStorage, 
  extractCorrelationContext,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  type CorrelationContext 
} from './correlation-id';
import { apiLogger } from './structured-logger';
import { getToken } from 'next-auth/jwt';

/**
 * Enhanced logging middleware with correlation tracking
 */
export function loggingMiddleware(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse | Response>
) {
  return async (req: NextRequest, context?: any): Promise<NextResponse | Response> => {
    // Extract or generate correlation context
    const partialContext = extractCorrelationContext(req);
    
    // Try to get user information from JWT token
    let userId: string | undefined;
    let sessionId: string | undefined;
    
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        userId = token.sub || token.id as string;
        sessionId = token.sessionId as string;
      }
    } catch (error) {
      // Silently continue if token extraction fails
    }
    
    const correlationContext: CorrelationContext = {
      correlationId: partialContext.correlationId!,
      requestId: partialContext.requestId!,
      startTime: partialContext.startTime!,
      path: partialContext.path,
      method: partialContext.method,
      userAgent: partialContext.userAgent,
      ipAddress: partialContext.ipAddress,
      userId,
      sessionId
    };
    
    return correlationStorage.run(correlationContext, async () => {
      const startTime = Date.now();
      let statusCode = 200;
      let errorMessage: string | undefined;
      
      try {
        // Log incoming request
        apiLogger.apiRequest(correlationContext.method!, correlationContext.path!, {
          correlationId: correlationContext.correlationId,
          requestId: correlationContext.requestId,
          userId: correlationContext.userId,
          ipAddress: correlationContext.ipAddress,
          userAgent: correlationContext.userAgent
        });
        
        // Execute the handler
        const response = await handler(req, context);
        
        // Extract status code from response
        statusCode = response.status;
        
        // Add correlation headers to response
        const headers = new Headers(response.headers);
        headers.set(CORRELATION_ID_HEADER, correlationContext.correlationId);
        headers.set(REQUEST_ID_HEADER, correlationContext.requestId);
        headers.set('x-response-time', `${Date.now() - startTime}ms`);
        
        // Log successful response
        const duration = Date.now() - startTime;
        apiLogger.apiResponse(
          correlationContext.method!, 
          correlationContext.path!, 
          statusCode, 
          duration,
          {
            correlationId: correlationContext.correlationId,
            requestId: correlationContext.requestId,
            userId: correlationContext.userId
          }
        );
        
        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
        
      } catch (error) {
        // Handle errors and log them
        statusCode = 500;
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        const duration = Date.now() - startTime;
        
        // Log error response
        apiLogger.error(error instanceof Error ? error : new Error(errorMessage), {
          correlationId: correlationContext.correlationId,
          requestId: correlationContext.requestId,
          userId: correlationContext.userId,
          operation: 'api_request',
          resource: correlationContext.path,
          duration,
          metadata: {
            method: correlationContext.method,
            path: correlationContext.path,
            statusCode,
            ipAddress: correlationContext.ipAddress,
            userAgent: correlationContext.userAgent
          }
        });
        
        // Create error response with correlation headers
        const errorResponse = NextResponse.json(
          { 
            error: 'Internal Server Error',
            correlationId: correlationContext.correlationId,
            requestId: correlationContext.requestId
          },
          { status: statusCode }
        );
        
        errorResponse.headers.set(CORRELATION_ID_HEADER, correlationContext.correlationId);
        errorResponse.headers.set(REQUEST_ID_HEADER, correlationContext.requestId);
        errorResponse.headers.set('x-response-time', `${Date.now() - startTime}ms`);
        
        return errorResponse;
      }
    });
  };
}

/**
 * Wrapper for API route handlers
 */
export function withLogging<T extends any[]>(
  handler: (...args: T) => Promise<Response>
) {
  return loggingMiddleware(handler as any) as (...args: T) => Promise<Response>;
}

/**
 * Simple request logger for debugging
 */
export function simpleRequestLogger(req: NextRequest): void {
  const method = req.method;
  const url = req.nextUrl.pathname;
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
            req.headers.get('x-real-ip') || 
            'unknown';
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${ip} - ${userAgent.substring(0, 100)}`);
}

/**
 * Performance monitoring wrapper
 */
export function withPerformanceLogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();
      
      apiLogger.performanceMetric('operation_duration', duration, 'ms', {
        operation: operationName,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      apiLogger.performanceMetric('operation_duration', duration, 'ms', {
        operation: operationName,
        success: false,
        error: {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  };
}

/**
 * Database operation logging wrapper
 */
export function withDatabaseLogging<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  operationName: string,
  tableName?: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      const result = await operation(...args);
      const duration = Date.now() - startTime;
      
      apiLogger.databaseQuery(`${operationName}${tableName ? ` ON ${tableName}` : ''}`, duration, {
        operation: 'database_operation',
        resource: tableName,
        metadata: {
          operationType: operationName,
          tableName,
          success: true
        }
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      apiLogger.error(error instanceof Error ? error : new Error('Database operation failed'), {
        operation: 'database_operation',
        resource: tableName,
        duration,
        metadata: {
          operationType: operationName,
          tableName,
          success: false
        }
      });
      
      throw error;
    }
  };
}

/**
 * User action logging helper
 */
export function logUserAction(
  userId: string,
  action: string,
  resource?: string,
  metadata?: Record<string, any>
): void {
  apiLogger.userAction(userId, action, resource, {
    userId,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}

/**
 * Security event logging helper
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata?: Record<string, any>
): void {
  apiLogger.securityEvent(event, severity, {
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata
    }
  });
}
