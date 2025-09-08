/**
 * Performance Metrics API Endpoint
 * Serves performance metrics for the dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { MetricsCollector, PerformanceMetric } from '@/lib/performance/metrics-collector';
import { logger } from '@/lib/logging';
import { withLogging } from '@/lib/logging/middleware';
import { withCache, CachePresets } from '@/lib/cache/api-cache';

interface PerformanceMetricsResponse {
  metrics: PerformanceMetric[];
  systemStatus: {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    lastUpdated: string;
  };
  summary: {
    totalMetrics: number;
    timeWindow: number;
    avgResponseTime?: number;
    errorRate?: number;
    throughput?: number;
  };
}

async function handleGetMetrics(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const timeWindow = parseInt(searchParams.get('timeWindow') || '300000'); // 5 minutes default
    const metricName = searchParams.get('name');
    const limit = parseInt(searchParams.get('limit') || '100');

    logger.info('Performance metrics requested', {
      operation: 'get_performance_metrics',
      metadata: {
        timeWindow,
        metricName,
        limit,
        endpoint: '/api/performance/metrics'
      }
    });

    // Get metrics from collector
    const startTime = new Date(Date.now() - timeWindow);
    const endTime = new Date();
    
    let metrics = MetricsCollector.getMetrics(metricName || undefined, startTime, endTime);
    
    // Apply limit
    if (metrics.length > limit) {
      metrics = metrics.slice(-limit); // Keep most recent
    }

    // Collect current system metrics
    const systemMetric = MetricsCollector.collectSystemMetrics();
    MetricsCollector.recordSystem(systemMetric);

    // Analyze system status
    const systemStatus = analyzeSystemStatus(metrics, systemMetric);

    // Calculate summary statistics
    const summary = calculateSummary(metrics, timeWindow);

    logger.debug('Performance metrics retrieved', {
      operation: 'get_performance_metrics_success',
      metadata: {
        metricsCount: metrics.length,
        systemStatus: systemStatus.status,
        summaryAvgResponseTime: summary.avgResponseTime
      }
    });

    const response: PerformanceMetricsResponse = {
      metrics,
      systemStatus,
      summary
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve performance metrics', {
      operation: 'get_performance_metrics_error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    return NextResponse.json(
      {
        error: 'Failed to retrieve performance metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Analyze system status based on metrics
 */
function analyzeSystemStatus(
  metrics: PerformanceMetric[], 
  systemMetric: any
): {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  lastUpdated: string;
} {
  const issues: string[] = [];
  let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

  // Check memory usage
  const memoryPercentage = systemMetric.system.heapUsed / systemMetric.system.heapTotal * 100;
  if (memoryPercentage > 90) {
    issues.push(`High memory usage: ${memoryPercentage.toFixed(1)}%`);
    status = 'critical';
  } else if (memoryPercentage > 70) {
    issues.push(`Elevated memory usage: ${memoryPercentage.toFixed(1)}%`);
    if (status === 'healthy') status = 'degraded';
  }

  // Check average response times
  const recentMetrics = metrics.filter(m => 
    m.name.includes('response') || m.name.includes('duration')
  );
  
  if (recentMetrics.length > 0) {
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
    
    if (avgResponseTime > 2000) {
      issues.push(`Slow response times: ${avgResponseTime.toFixed(0)}ms average`);
      status = 'critical';
    } else if (avgResponseTime > 1000) {
      issues.push(`Elevated response times: ${avgResponseTime.toFixed(0)}ms average`);
      if (status === 'healthy') status = 'degraded';
    }
  }

  // Check error rates
  const errorMetrics = metrics.filter(m => 
    m.name.includes('error') || (m.labels && m.labels.success === 'false')
  );
  
  const errorRate = errorMetrics.length / Math.max(metrics.length, 1) * 100;
  if (errorRate > 10) {
    issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
    status = 'critical';
  } else if (errorRate > 5) {
    issues.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
    if (status === 'healthy') status = 'degraded';
  }

  return {
    status,
    issues,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Calculate performance summary statistics
 */
function calculateSummary(metrics: PerformanceMetric[], timeWindow: number) {
  const responseTimeMetrics = metrics.filter(m => 
    m.unit === 'ms' && (m.name.includes('response') || m.name.includes('duration'))
  );

  const errorMetrics = metrics.filter(m => 
    m.labels && m.labels.success === 'false'
  );

  let avgResponseTime: number | undefined;
  if (responseTimeMetrics.length > 0) {
    avgResponseTime = responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length;
  }

  const errorRate = errorMetrics.length / Math.max(metrics.length, 1) * 100;
  const throughput = (metrics.length / timeWindow) * 1000; // Requests per second

  return {
    totalMetrics: metrics.length,
    timeWindow,
    avgResponseTime,
    errorRate,
    throughput
  };
}

// POST endpoint for receiving client-side metrics
async function handlePostMetrics(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    
    logger.info('Client metrics received', {
      operation: 'receive_client_metrics',
      metadata: {
        metricsCount: Array.isArray(body) ? body.length : 1,
        endpoint: '/api/performance/metrics'
      }
    });

    // Process client-side metrics (Web Vitals, etc.)
    if (Array.isArray(body)) {
      for (const metric of body) {
        MetricsCollector.recordBusiness({
          name: `client_${metric.name}`,
          value: metric.value,
          unit: metric.unit || 'ms',
          timestamp: new Date(),
          businessOperation: 'web_vitals',
          context: {
            operation: 'client_metrics',
            resource: 'web_vitals'
          },
          labels: {
            rating: metric.rating,
            navigationType: metric.navigationType,
            url: metric.url
          }
        });
      }
    } else {
      // Single metric
      MetricsCollector.recordBusiness({
        name: `client_${body.name}`,
        value: body.value,
        unit: body.unit || 'ms',
        timestamp: new Date(),
        businessOperation: 'web_vitals',
        context: {
          operation: 'client_metrics',
          resource: 'web_vitals'
        },
        labels: {
          rating: body.rating,
          navigationType: body.navigationType,
          url: body.url
        }
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Failed to process client metrics', {
      operation: 'receive_client_metrics_error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      { error: 'Failed to process metrics' },
      { status: 500 }
    );
  }
}

// Performance metrics cache config - balance freshness with performance  
const PERFORMANCE_METRICS_CACHE = { ttl: 60, staleWhileRevalidate: 120, vary: ['authorization'] };

// Export wrapped handlers with caching for GET requests
export const GET = withCache(
  withLogging(handleGetMetrics), 
  PERFORMANCE_METRICS_CACHE
);
export const POST = withLogging(handlePostMetrics);
