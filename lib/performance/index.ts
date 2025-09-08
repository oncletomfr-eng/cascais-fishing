/**
 * Performance Monitoring System
 * Export all performance monitoring functionality
 */

// Import for internal use
import { MetricsCollector } from './metrics-collector';
import { initWebVitalsMonitoring } from './core-web-vitals';

// Metrics Collection System
export {
  MetricsCollector,
  PerformanceTimer,
  measurePerformance,
  withPerformanceTracking,
  withDatabaseMetrics,
  type PerformanceMetric,
  type TimingMetric,
  type DatabaseMetric,
  type BusinessMetric,
  type SystemMetric
} from './metrics-collector';

// Core Web Vitals Monitoring
export {
  CoreWebVitalsMonitor,
  getWebVitalsMetrics,
  useWebVitals,
  type WebVitalMetric,
  type NavigationTiming
} from './core-web-vitals';

// Re-export initWebVitalsMonitoring (already imported above)
export { initWebVitalsMonitoring };

// Performance Dashboard Component
export { default as PerformanceDashboard } from '../../components/performance/PerformanceDashboard';

// Utility functions for common performance monitoring patterns

/**
 * Initialize the complete performance monitoring system
 */
export function initPerformanceMonitoring(options?: {
  enableWebVitals?: boolean;
  enableServerMetrics?: boolean;
  collectSystemMetrics?: boolean;
  systemMetricsInterval?: number;
}) {
  const {
    enableWebVitals = true,
    enableServerMetrics = true,
    collectSystemMetrics = true,
    systemMetricsInterval = 30000 // 30 seconds
  } = options || {};

  console.log('🚀 Initializing Performance Monitoring System...');

  // Initialize Web Vitals monitoring (client-side only)
  if (enableWebVitals && typeof window !== 'undefined') {
    initWebVitalsMonitoring();
    console.log('✅ Core Web Vitals monitoring enabled');
  }

  // Initialize server metrics collection
  if (enableServerMetrics && typeof process !== 'undefined') {
    console.log('✅ Server metrics collection enabled');
  }

  // Start system metrics collection
  if (collectSystemMetrics && typeof process !== 'undefined') {
    const interval = setInterval(() => {
      const systemMetric = MetricsCollector.collectSystemMetrics();
      MetricsCollector.recordSystem(systemMetric);
    }, systemMetricsInterval);

    // Clean up interval on process exit
    process.on('exit', () => clearInterval(interval));
    process.on('SIGINT', () => {
      clearInterval(interval);
      process.exit(0);
    });

    console.log(`✅ System metrics collection started (${systemMetricsInterval}ms interval)`);
  }

  console.log('🎉 Performance Monitoring System initialized successfully!');
}

/**
 * Create a performance-monitored API handler
 */
export function withApiPerformanceMonitoring<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  operationName: string
) {
  return withPerformanceTracking(handler, `api_${operationName}`, {
    operationType: 'api_request',
    operation: operationName
  });
}

/**
 * Create a performance-monitored database operation
 */
export function withDbPerformanceMonitoring<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  queryType: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION',
  tableName?: string
) {
  return withDatabaseMetrics(operation, queryType, tableName);
}

/**
 * Record a custom business metric
 */
export function recordBusinessMetric(
  name: string,
  value: number,
  unit: 'ms' | 'count' | 'percentage' | 'bytes' = 'count',
  metadata?: {
    operation?: string;
    resource?: string;
    success?: boolean;
    userId?: string;
    [key: string]: any;
  }
) {
  MetricsCollector.recordBusiness({
    name,
    value,
    unit,
    timestamp: new Date(),
    businessOperation: metadata?.operation || name,
    labels: metadata,
    context: {
      operation: metadata?.operation,
      resource: metadata?.resource,
      userId: metadata?.userId
    }
  });
}

/**
 * Record a custom timing metric
 */
export function recordTimingMetric(
  name: string,
  startTime: number,
  endTime: number,
  metadata?: {
    operation?: string;
    resource?: string;
    success?: boolean;
    [key: string]: any;
  }
) {
  const duration = endTime - startTime;
  
  MetricsCollector.recordTiming({
    name,
    value: duration,
    unit: 'ms',
    timestamp: new Date(),
    startTime,
    endTime,
    duration,
    labels: metadata,
    context: {
      operation: metadata?.operation,
      resource: metadata?.resource
    }
  });
}

/**
 * Get performance summary for a specific metric
 */
export function getPerformanceSummary(
  metricName: string,
  timeWindowMs: number = 5 * 60 * 1000 // 5 minutes default
) {
  return MetricsCollector.getMetricSummary(metricName, timeWindowMs);
}

/**
 * Get recent metrics for analysis
 */
export function getRecentMetrics(
  timeWindowMs: number = 5 * 60 * 1000, // 5 minutes default
  metricName?: string
) {
  const startTime = new Date(Date.now() - timeWindowMs);
  return MetricsCollector.getMetrics(metricName, startTime);
}

/**
 * Clear all performance metrics (useful for testing)
 */
export function clearPerformanceMetrics() {
  return MetricsCollector.clearMetrics();
}

/**
 * Performance monitoring middleware for Next.js API routes
 */
export function createPerformanceMiddleware(options?: {
  slowRequestThreshold?: number;
  enableLogging?: boolean;
}) {
  const {
    slowRequestThreshold = 1000, // 1 second
    enableLogging = true
  } = options || {};

  return function performanceMiddleware<T extends any[]>(
    handler: (...args: T) => Promise<Response>
  ) {
    return async (...args: T): Promise<Response> => {
      const timer = MetricsCollector.startTimer('api_request', {
        endpoint: 'unknown', // Can be enhanced to extract actual endpoint
        method: 'unknown'    // Can be enhanced to extract actual method
      });

      try {
        const response = await handler(...args);
        const duration = timer.end({ 
          success: true,
          statusCode: response.status
        }).duration;

        // Log slow requests
        if (enableLogging && duration > slowRequestThreshold) {
          console.warn(`⚠️ Slow API request detected: ${duration.toFixed(2)}ms`);
        }

        return response;
      } catch (error) {
        timer.end({ 
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    };
  };
}
