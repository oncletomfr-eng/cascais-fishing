/**
 * Performance Metrics Collection System
 * Business logic timing and database query performance monitoring
 */

import { logger, getCorrelationId, getRequestId } from '@/lib/logging';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage' | 'ratio';
  timestamp: Date;
  labels?: Record<string, string | number>;
  context?: {
    correlationId?: string;
    requestId?: string;
    userId?: string;
    operation?: string;
    resource?: string;
  };
}

export interface TimingMetric extends PerformanceMetric {
  startTime: number;
  endTime: number;
  duration: number;
  unit: 'ms';
}

export interface DatabaseMetric extends PerformanceMetric {
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION';
  tableName?: string;
  recordsAffected?: number;
  connectionPoolSize?: number;
  activeConnections?: number;
}

export interface BusinessMetric extends PerformanceMetric {
  businessOperation: string;
  successRate?: number;
  errorRate?: number;
  throughput?: number;
}

export interface SystemMetric extends PerformanceMetric {
  metricType: 'memory' | 'cpu' | 'disk' | 'network';
  system: {
    heapUsed?: number;
    heapTotal?: number;
    rss?: number;
    external?: number;
    uptime?: number;
  };
}

/**
 * Performance Timer for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;
  private endTime?: number;
  private labels: Record<string, string | number>;
  private context: {
    correlationId?: string;
    requestId?: string;
    userId?: string;
    operation?: string;
    resource?: string;
  };

  constructor(
    private name: string,
    labels: Record<string, string | number> = {},
    context?: {
      correlationId?: string;
      requestId?: string;
      userId?: string;
      operation?: string;
      resource?: string;
    }
  ) {
    this.startTime = performance.now();
    this.labels = labels;
    this.context = {
      correlationId: context?.correlationId || getCorrelationId(),
      requestId: context?.requestId || getRequestId(),
      ...context
    };
  }

  /**
   * End the timer and record the metric
   */
  end(additionalLabels?: Record<string, string | number>): TimingMetric {
    this.endTime = performance.now();
    const duration = this.endTime - this.startTime;

    const metric: TimingMetric = {
      name: this.name,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      startTime: this.startTime,
      endTime: this.endTime,
      duration,
      labels: { ...this.labels, ...additionalLabels },
      context: this.context
    };

    // Record to metrics collector
    MetricsCollector.recordTiming(metric);

    return metric;
  }

  /**
   * Get current elapsed time without ending the timer
   */
  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

/**
 * Main metrics collection system
 */
export class MetricsCollector {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 10000; // Keep only recent metrics in memory
  private static timers: Map<string, PerformanceTimer> = new Map();

  /**
   * Start a performance timer
   */
  static startTimer(
    name: string,
    labels?: Record<string, string | number>,
    context?: {
      correlationId?: string;
      requestId?: string;
      userId?: string;
      operation?: string;
      resource?: string;
    }
  ): PerformanceTimer {
    const timer = new PerformanceTimer(name, labels, context);
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, timer);
    
    return timer;
  }

  /**
   * Record a timing metric
   */
  static recordTiming(metric: TimingMetric): void {
    this.addMetric(metric);
    
    // Log to structured logger
    logger.performanceMetric(metric.name, metric.duration, 'ms', {
      correlationId: metric.context?.correlationId,
      requestId: metric.context?.requestId,
      userId: metric.context?.userId,
      operation: metric.context?.operation,
      resource: metric.context?.resource,
      metadata: {
        labels: metric.labels,
        timestamp: metric.timestamp.toISOString()
      }
    });
  }

  /**
   * Record a database metric
   */
  static recordDatabase(metric: DatabaseMetric): void {
    this.addMetric(metric);
    
    // Log to structured logger
    logger.databaseQuery(
      `${metric.queryType}${metric.tableName ? ` ON ${metric.tableName}` : ''}`,
      metric.value,
      {
        correlationId: metric.context?.correlationId,
        requestId: metric.context?.requestId,
        operation: 'database_performance',
        resource: metric.tableName,
        metadata: {
          queryType: metric.queryType,
          recordsAffected: metric.recordsAffected,
          connectionPoolSize: metric.connectionPoolSize,
          activeConnections: metric.activeConnections,
          labels: metric.labels,
          timestamp: metric.timestamp.toISOString()
        }
      }
    );
  }

  /**
   * Record a business logic metric
   */
  static recordBusiness(metric: BusinessMetric): void {
    this.addMetric(metric);
    
    logger.performanceMetric(metric.name, metric.value, metric.unit, {
      correlationId: metric.context?.correlationId,
      requestId: metric.context?.requestId,
      userId: metric.context?.userId,
      operation: 'business_performance',
      resource: metric.businessOperation,
      metadata: {
        businessOperation: metric.businessOperation,
        successRate: metric.successRate,
        errorRate: metric.errorRate,
        throughput: metric.throughput,
        labels: metric.labels,
        timestamp: metric.timestamp.toISOString()
      }
    });
  }

  /**
   * Record a system metric
   */
  static recordSystem(metric: SystemMetric): void {
    this.addMetric(metric);
    
    logger.performanceMetric(metric.name, metric.value, metric.unit, {
      correlationId: metric.context?.correlationId,
      requestId: metric.context?.requestId,
      operation: 'system_performance',
      metadata: {
        metricType: metric.metricType,
        system: metric.system,
        labels: metric.labels,
        timestamp: metric.timestamp.toISOString()
      }
    });
  }

  /**
   * Add metric to collection with memory management
   */
  private static addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS + 1000); // Remove oldest 1000
    }
  }

  /**
   * Get metrics by name and time range
   */
  static getMetrics(
    name?: string,
    startTime?: Date,
    endTime?: Date
  ): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (startTime || endTime) {
      filtered = filtered.filter(m => {
        const metricTime = m.timestamp.getTime();
        const afterStart = !startTime || metricTime >= startTime.getTime();
        const beforeEnd = !endTime || metricTime <= endTime.getTime();
        return afterStart && beforeEnd;
      });
    }

    return filtered;
  }

  /**
   * Get performance summary statistics
   */
  static getMetricSummary(
    name: string,
    timeWindow: number = 5 * 60 * 1000 // 5 minutes default
  ): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
  } | null {
    const cutoff = new Date(Date.now() - timeWindow);
    const metrics = this.getMetrics(name, cutoff);

    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;

    return {
      count,
      min: values[0],
      max: values[count - 1],
      avg: values.reduce((a, b) => a + b, 0) / count,
      median: values[Math.floor(count / 2)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)]
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  static clearMetrics(): void {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Get current system metrics
   */
  static collectSystemMetrics(): SystemMetric {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    return {
      name: 'system_metrics',
      value: memUsage.heapUsed,
      unit: 'bytes',
      timestamp: new Date(),
      metricType: 'memory',
      system: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        uptime
      },
      context: {
        correlationId: getCorrelationId(),
        requestId: getRequestId()
      }
    };
  }
}

/**
 * Decorator for automatic function performance monitoring
 */
export function measurePerformance(metricName?: string, labels?: Record<string, string | number>) {
  return function <T extends (...args: any[]) => any>(
    target: any,
    propertyName: string,
    descriptor?: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> | void {
    // Handle case where descriptor might be undefined (experimental decorators)
    if (!descriptor) {
      descriptor = Object.getOwnPropertyDescriptor(target, propertyName) as TypedPropertyDescriptor<T>;
    }
    
    if (!descriptor || typeof descriptor.value !== 'function') {
      console.warn(`Performance decorator: Cannot decorate ${propertyName} - not a method`);
      return descriptor || {};
    }

    const method = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = function (...args: any[]) {
      const timer = MetricsCollector.startTimer(name, {
        method: propertyName,
        class: target.constructor.name,
        ...labels
      });

      try {
        const result = method.apply(this, args);
        
        // Handle async methods
        if (result && typeof result.then === 'function') {
          return result
            .then((value: any) => {
              timer.end({ success: true });
              return value;
            })
            .catch((error: any) => {
              timer.end({ success: false, error: error.message || 'Unknown error' });
              throw error;
            });
        } else {
          timer.end({ success: true });
          return result;
        }
      } catch (error) {
        timer.end({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        throw error;
      }
    } as T;

    return descriptor;
  };
}

/**
 * Higher-order function for measuring async operations
 */
export function withPerformanceTracking<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  metricName: string,
  labels?: Record<string, string | number>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const timer = MetricsCollector.startTimer(metricName, labels);
    
    try {
      const result = await fn(...args);
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  };
}

/**
 * Database operation wrapper with performance tracking
 */
export function withDatabaseMetrics<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  queryType: DatabaseMetric['queryType'],
  tableName?: string
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = performance.now();
    const correlationId = getCorrelationId();
    const requestId = getRequestId();
    
    try {
      const result = await operation(...args);
      const duration = performance.now() - startTime;
      
      MetricsCollector.recordDatabase({
        name: 'database_operation',
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        queryType,
        tableName,
        recordsAffected: Array.isArray(result) ? result.length : 1,
        context: {
          correlationId,
          requestId,
          operation: 'database_query',
          resource: tableName
        }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      MetricsCollector.recordDatabase({
        name: 'database_operation_error',
        value: duration,
        unit: 'ms',
        timestamp: new Date(),
        queryType,
        tableName,
        context: {
          correlationId,
          requestId,
          operation: 'database_query_error',
          resource: tableName
        },
        labels: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      
      throw error;
    }
  };
}
