import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logger, dbLogger, getCorrelationId, getRequestId } from '@/lib/logging';
import { withLogging, withDatabaseLogging, logSecurityEvent } from '@/lib/logging/middleware';
import { MetricsCollector, getRecentMetrics } from '@/lib/performance';
import { withCache, CachePresets } from '@/lib/cache/api-cache';

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  responseTime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      connectionPool?: {
        total: number;
        active: number;
        idle: number;
      };
      tables?: {
        count: number;
        critical: string[];
        missing: string[];
      };
      error?: string;
    };
    api: {
      status: 'healthy';
      responseTime: number;
      memory: {
        used: number;
        total: number;
        percentage: number;
      };
    };
    performance: {
      status: 'healthy' | 'degraded' | 'critical';
      metrics: {
        totalCollected: number;
        recentMetrics: number;
        avgResponseTime?: number;
        errorRate?: number;
        systemLoad?: number;
      };
      webVitals?: {
        enabled: boolean;
        clientMetrics: number;
      };
    };
    environment: {
      nodeVersion: string;
      platform: string;
      uptime: number;
      env: string;
    };
  };
  checks: {
    database: boolean;
    criticalTables: boolean;
    memoryUsage: boolean;
    responseTime: boolean;
    performanceMonitoring: boolean;
  };
}

// Critical tables that must exist
const CRITICAL_TABLES = [
  'users',
  'group_trips', 
  'bookings',
  'fisher_profiles'
];

async function handleHealthCheck(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now();
  const correlationId = getCorrelationId();
  const requestId = getRequestId();
  
  try {
    logger.info('Starting comprehensive health check', {
      operation: 'health_check_start',
      correlationId,
      requestId,
      metadata: {
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }
    });
    
    // Initialize response
    const healthResponse: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      responseTime: 0,
      services: {
        database: {
          status: 'unhealthy'
        },
        api: {
          status: 'healthy',
          responseTime: 0,
          memory: {
            used: 0,
            total: 0,
            percentage: 0
          }
        },
        performance: {
          status: 'healthy',
          metrics: {
            totalCollected: 0,
            recentMetrics: 0
          },
          webVitals: {
            enabled: false,
            clientMetrics: 0
          }
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: Math.floor(process.uptime()),
          env: process.env.NODE_ENV || 'unknown'
        }
      },
      checks: {
        database: false,
        criticalTables: false,
        memoryUsage: true,
        responseTime: true,
        performanceMonitoring: true
      }
    };

    // Memory usage check
    const memUsage = process.memoryUsage();
    healthResponse.services.api.memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    // Check if memory usage is acceptable (< 90%)
    if (healthResponse.services.api.memory.percentage > 90) {
      healthResponse.checks.memoryUsage = false;
      healthResponse.status = 'degraded';
      logger.warn('High memory usage detected', {
        operation: 'memory_check',
        correlationId,
        requestId,
        metadata: {
          memoryPercentage: healthResponse.services.api.memory.percentage,
          usedMB: healthResponse.services.api.memory.used,
          totalMB: healthResponse.services.api.memory.total
        }
      });
    }

    // Database connectivity and health check
    const dbStartTime = Date.now();
    try {
      // Basic connection test with logging
      await withDatabaseLogging(
        () => prisma.$queryRaw`SELECT 1 as connection_test`,
        'connection_test'
      )();
      
      // Get all tables (cast to text for PostgreSQL compatibility)
      const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
        SELECT table_name::text as table_name
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `;

      const tableNames = tables.map(t => t.table_name);
      const missingTables = CRITICAL_TABLES.filter(table => !tableNames.includes(table));

      // Database connection pool stats (PostgreSQL specific)
      let poolStats: { total: number; active: number; idle: number } | undefined = undefined;
      try {
        const poolQuery = await prisma.$queryRaw<Array<{
          total_conns: number;
          active_conns: number;
          idle_conns: number;
        }>>`
          SELECT 
            (SELECT setting::int FROM pg_settings WHERE name = 'max_connections')::int as total_conns,
            (SELECT count(*)::int FROM pg_stat_activity WHERE state = 'active') as active_conns,
            (SELECT count(*)::int FROM pg_stat_activity WHERE state = 'idle') as idle_conns
        `;
        
        if (poolQuery.length > 0) {
          poolStats = {
            total: poolQuery[0].total_conns,
            active: poolQuery[0].active_conns,
            idle: poolQuery[0].idle_conns
          };
        }
      } catch (poolError) {
        logger.warn('Could not retrieve connection pool stats', {
          operation: 'pool_stats_check',
          correlationId,
          requestId,
          error: {
            name: poolError instanceof Error ? poolError.name : 'Unknown',
            message: poolError instanceof Error ? poolError.message : String(poolError)
          }
        });
      }

      healthResponse.services.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStartTime,
        connectionPool: poolStats,
        tables: {
          count: tableNames.length,
          critical: CRITICAL_TABLES,
          missing: missingTables
        }
      };

      healthResponse.checks.database = true;
      healthResponse.checks.criticalTables = missingTables.length === 0;

      if (missingTables.length > 0) {
        healthResponse.status = 'degraded';
        logger.warn('Missing critical database tables', {
          operation: 'critical_tables_check',
          correlationId,
          requestId,
          metadata: {
            missingTables,
            totalTables: tableNames.length,
            criticalTablesCount: CRITICAL_TABLES.length
          }
        });
      }

    } catch (dbError) {
      dbLogger.error('Database health check failed', {
        operation: 'database_health_check',
        correlationId,
        requestId,
        duration: Date.now() - dbStartTime,
        error: {
          name: dbError instanceof Error ? dbError.name : 'Unknown',
          message: dbError instanceof Error ? dbError.message : String(dbError),
          stack: dbError instanceof Error ? dbError.stack : undefined
        }
      });
      
      healthResponse.services.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStartTime,
        error: dbError instanceof Error ? dbError.message : String(dbError)
      };
      
      healthResponse.status = 'unhealthy';
      healthResponse.checks.database = false;
      healthResponse.checks.criticalTables = false;
    }

    // Performance monitoring check
    try {
      const recentMetrics = getRecentMetrics(60000); // Last minute
      const systemMetric = MetricsCollector.collectSystemMetrics();
      
      // Calculate performance statistics
      const responseTimeMetrics = recentMetrics.filter(m => 
        m.unit === 'ms' && (m.name.includes('response') || m.name.includes('duration'))
      );
      const errorMetrics = recentMetrics.filter(m => 
        m.labels && m.labels.success !== undefined && String(m.labels.success) === 'false'
      );
      
      const avgResponseTime = responseTimeMetrics.length > 0 
        ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
        : undefined;
      
      const errorRate = recentMetrics.length > 0 
        ? (errorMetrics.length / recentMetrics.length) * 100
        : 0;
      
      const systemLoad = systemMetric.system.heapUsed && systemMetric.system.heapTotal
        ? (systemMetric.system.heapUsed / systemMetric.system.heapTotal) * 100
        : 0;
      
      // Determine performance status
      let performanceStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (avgResponseTime && avgResponseTime > 2000 || errorRate > 10 || systemLoad > 90) {
        performanceStatus = 'critical';
        healthResponse.status = healthResponse.status === 'healthy' ? 'degraded' : healthResponse.status;
      } else if (avgResponseTime && avgResponseTime > 1000 || errorRate > 5 || systemLoad > 70) {
        performanceStatus = 'degraded';
        if (healthResponse.status === 'healthy') {
          healthResponse.status = 'degraded';
        }
      }
      
      healthResponse.services.performance = {
        status: performanceStatus,
        metrics: {
          totalCollected: recentMetrics.length,
          recentMetrics: recentMetrics.filter(m => 
            Date.now() - new Date(m.timestamp).getTime() < 60000
          ).length,
          avgResponseTime,
          errorRate,
          systemLoad
        },
        webVitals: {
          enabled: typeof window !== 'undefined',
          clientMetrics: recentMetrics.filter(m => m.name.startsWith('client_')).length
        }
      };
      
      healthResponse.checks.performanceMonitoring = true;
      
      logger.debug('Performance monitoring health check completed', {
        operation: 'performance_health_check',
        correlationId,
        requestId,
        metadata: {
          performanceStatus,
          metricsCount: recentMetrics.length,
          avgResponseTime,
          errorRate,
          systemLoad
        }
      });
      
    } catch (perfError) {
      logger.warn('Performance monitoring health check failed', {
        operation: 'performance_health_check_error',
        correlationId,
        requestId,
        error: {
          name: perfError instanceof Error ? perfError.name : 'Unknown',
          message: perfError instanceof Error ? perfError.message : String(perfError)
        }
      });
      
      healthResponse.services.performance = {
        status: 'critical',
        metrics: {
          totalCollected: 0,
          recentMetrics: 0
        },
        webVitals: {
          enabled: false,
          clientMetrics: 0
        }
      };
      
      healthResponse.checks.performanceMonitoring = false;
      if (healthResponse.status === 'healthy') {
        healthResponse.status = 'degraded';
      }
    }

    // Calculate total response time
    const totalResponseTime = Date.now() - startTime;
    healthResponse.responseTime = totalResponseTime;
    healthResponse.services.api.responseTime = totalResponseTime;

    // Response time check (warn if > 1000ms)
    if (totalResponseTime > 1000) {
      healthResponse.checks.responseTime = false;
      if (healthResponse.status === 'healthy') {
        healthResponse.status = 'degraded';
      }
    }

    logger.info('Health check completed', {
      operation: 'health_check_complete',
      correlationId,
      requestId,
      duration: totalResponseTime,
      metadata: {
        status: healthResponse.status,
        databaseStatus: healthResponse.services.database.status,
        memoryPercentage: healthResponse.services.api.memory.percentage,
        checksPassedCount: Object.values(healthResponse.checks).filter(check => check === true).length,
        totalChecks: Object.keys(healthResponse.checks).length
      }
    });

    // Log performance metrics
    logger.performanceMetric('health_check_duration', totalResponseTime, 'ms', {
      operation: 'health_check_performance',
      correlationId,
      requestId
    });

    // Return appropriate HTTP status
    const httpStatus = healthResponse.status === 'healthy' ? 200 : 
                      healthResponse.status === 'degraded' ? 200 : 503;

    return NextResponse.json(healthResponse, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    logger.error('Health check system error', {
      operation: 'health_check_system_error',
      correlationId,
      requestId,
      duration: Date.now() - startTime,
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Health check system failure',
        stack: error instanceof Error ? error.stack : undefined
      }
    });

    // Log security event for system failures
    logSecurityEvent('health_check_system_failure', 'medium', {
      correlationId,
      requestId,
      duration: Date.now() - startTime
    });
    
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(), 
      uptime: Math.floor(process.uptime()),
      responseTime: Date.now() - startTime,
      services: {
        database: {
          status: 'unhealthy',
          error: 'Health check system failure'
        },
        api: {
          status: 'healthy',
          responseTime: Date.now() - startTime,
          memory: { used: 0, total: 0, percentage: 0 }
        },
        performance: {
          status: 'critical',
          metrics: {
            totalCollected: 0,
            recentMetrics: 0
          },
          webVitals: {
            enabled: false,
            clientMetrics: 0
          }
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: Math.floor(process.uptime()),
          env: process.env.NODE_ENV || 'unknown'
        }
      },
      checks: {
        database: false,
        criticalTables: false,
        memoryUsage: false,
        responseTime: false,
        performanceMonitoring: false
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  } finally {
    // Always disconnect from Prisma
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      logger.warn('Prisma disconnect warning', {
        operation: 'prisma_disconnect',
        correlationId,
        requestId,
        error: {
          name: disconnectError instanceof Error ? disconnectError.name : 'Unknown',
          message: disconnectError instanceof Error ? disconnectError.message : String(disconnectError)
        }
      });
    }
  }
}

// Health-specific cache preset (30 seconds to balance freshness vs performance)
const HEALTH_CACHE_CONFIG = { ttl: 30, staleWhileRevalidate: 60 };

// Export with logging and caching middleware
export const GET = withCache(
  withLogging(handleHealthCheck),
  HEALTH_CACHE_CONFIG
);
