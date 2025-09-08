/**
 * Structured Logging System
 * Enterprise-grade JSON logging with consistent format
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

export interface LogContext {
  // Request context
  correlationId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // Application context
  service: string;
  version?: string;
  environment?: string;
  
  // Business context
  operation?: string;
  resource?: string;
  resourceId?: string;
  
  // Performance context
  duration?: number;
  memoryUsage?: number;
  
  // Error context
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string | number;
  };
  
  // Custom metadata
  metadata?: Record<string, any>;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  
  // Additional fields for enterprise logging
  hostname?: string;
  pid?: number;
  
  // Tracing fields
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

class StructuredLogger {
  private serviceName: string;
  private version: string;
  private environment: string;
  private minLogLevel: LogLevel;
  
  constructor(options: {
    serviceName: string;
    version?: string;
    environment?: string;
    minLogLevel?: LogLevel;
  }) {
    this.serviceName = options.serviceName;
    this.version = options.version || process.env.npm_package_version || '1.0.0';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.minLogLevel = options.minLogLevel || LogLevel.INFO;
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentIndex = levels.indexOf(this.minLogLevel);
    const targetIndex = levels.indexOf(level);
    return targetIndex <= currentIndex;
  }
  
  private createLogEntry(
    level: LogLevel,
    message: string,
    context: Partial<LogContext> = {}
  ): StructuredLogEntry {
    const baseContext: LogContext = {
      service: this.serviceName,
      version: this.version,
      environment: this.environment,
      ...context
    };
    
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: baseContext,
      hostname: process.env.HOSTNAME || 'unknown',
      pid: process.pid
    };
  }
  
  private write(logEntry: StructuredLogEntry): void {
    if (!this.shouldLog(logEntry.level)) {
      return;
    }
    
    // In production, this would go to a proper logging service
    // For now, we'll use console with structured JSON
    const logString = JSON.stringify(logEntry, null, 0);
    
    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.DEBUG:
      case LogLevel.TRACE:
        console.debug(logString);
        break;
      default:
        console.log(logString);
    }
  }
  
  error(message: string, context?: Partial<LogContext>): void;
  error(error: Error, context?: Partial<LogContext>): void;
  error(messageOrError: string | Error, context: Partial<LogContext> = {}): void {
    let message: string;
    let errorContext: Partial<LogContext> = { ...context };
    
    if (messageOrError instanceof Error) {
      message = messageOrError.message;
      errorContext.error = {
        name: messageOrError.name,
        message: messageOrError.message,
        stack: messageOrError.stack,
        code: (messageOrError as any).code
      };
    } else {
      message = messageOrError;
    }
    
    this.write(this.createLogEntry(LogLevel.ERROR, message, errorContext));
  }
  
  warn(message: string, context?: Partial<LogContext>): void {
    this.write(this.createLogEntry(LogLevel.WARN, message, context));
  }
  
  info(message: string, context?: Partial<LogContext>): void {
    this.write(this.createLogEntry(LogLevel.INFO, message, context));
  }
  
  debug(message: string, context?: Partial<LogContext>): void {
    this.write(this.createLogEntry(LogLevel.DEBUG, message, context));
  }
  
  trace(message: string, context?: Partial<LogContext>): void {
    this.write(this.createLogEntry(LogLevel.TRACE, message, context));
  }
  
  // Convenience methods for common use cases
  apiRequest(method: string, path: string, context?: Partial<LogContext>): void {
    this.info(`API Request: ${method} ${path}`, {
      operation: 'api_request',
      resource: path,
      ...context,
      metadata: {
        method,
        path,
        ...context?.metadata
      }
    });
  }
  
  apiResponse(method: string, path: string, statusCode: number, duration: number, context?: Partial<LogContext>): void {
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    this.write(this.createLogEntry(level, `API Response: ${method} ${path} ${statusCode}`, {
      operation: 'api_response',
      resource: path,
      duration,
      ...context,
      metadata: {
        method,
        path,
        statusCode,
        duration,
        ...context?.metadata
      }
    }));
  }
  
  databaseQuery(query: string, duration: number, context?: Partial<LogContext>): void {
    // Don't log the actual query in production for security
    const sanitizedQuery = this.environment === 'production' ? 
      query.split(' ')[0] || 'UNKNOWN' : 
      query.substring(0, 100) + (query.length > 100 ? '...' : '');
      
    this.debug(`Database Query: ${sanitizedQuery}`, {
      operation: 'database_query',
      duration,
      ...context,
      metadata: {
        queryType: query.split(' ')[0]?.toUpperCase() || 'UNKNOWN',
        duration,
        ...context?.metadata
      }
    });
  }
  
  userAction(userId: string, action: string, resource?: string, context?: Partial<LogContext>): void {
    this.info(`User Action: ${action}${resource ? ` on ${resource}` : ''}`, {
      userId,
      operation: 'user_action',
      resource,
      ...context,
      metadata: {
        action,
        resource,
        ...context?.metadata
      }
    });
  }
  
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: Partial<LogContext>): void {
    const level = severity === 'critical' || severity === 'high' ? LogLevel.ERROR : 
                 severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
                 
    this.write(this.createLogEntry(level, `Security Event: ${event}`, {
      operation: 'security_event',
      ...context,
      metadata: {
        event,
        severity,
        ...context?.metadata
      }
    }));
  }
  
  // Performance logging
  performanceMetric(metric: string, value: number, unit: string, context?: Partial<LogContext>): void {
    this.info(`Performance Metric: ${metric} = ${value}${unit}`, {
      operation: 'performance_metric',
      ...context,
      metadata: {
        metric,
        value,
        unit,
        ...context?.metadata
      }
    });
  }
}

// Create global logger instances
export const logger = new StructuredLogger({
  serviceName: 'cascais-fishing',
  minLogLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
});

// Specialized loggers for different parts of the application
export const apiLogger = new StructuredLogger({
  serviceName: 'cascais-fishing-api',
  minLogLevel: LogLevel.INFO
});

export const dbLogger = new StructuredLogger({
  serviceName: 'cascais-fishing-db',
  minLogLevel: LogLevel.DEBUG
});

export const authLogger = new StructuredLogger({
  serviceName: 'cascais-fishing-auth',
  minLogLevel: LogLevel.INFO
});

export const chatLogger = new StructuredLogger({
  serviceName: 'cascais-fishing-chat',
  minLogLevel: LogLevel.INFO
});

// Export types for use in other modules
export type { LogContext, StructuredLogEntry };
