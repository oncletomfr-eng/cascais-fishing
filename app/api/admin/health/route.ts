import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
  };
}

// Critical tables that must exist
const CRITICAL_TABLES = [
  'users',
  'group_trips', 
  'bookings',
  'fisher_profiles'
];

export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const startTime = Date.now();
  
  try {
    console.log('🏥 Starting comprehensive health check...');
    
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
        responseTime: true
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
    }

    // Database connectivity and health check
    const dbStartTime = Date.now();
    try {
      // Basic connection test
      await prisma.$queryRaw`SELECT 1 as connection_test`;
      
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
      let poolStats = null;
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
        console.warn('⚠️ Could not retrieve connection pool stats:', poolError);
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
        console.warn('⚠️ Missing critical tables:', missingTables);
      }

    } catch (dbError) {
      console.error('❌ Database health check failed:', dbError);
      
      healthResponse.services.database = {
        status: 'unhealthy',
        responseTime: Date.now() - dbStartTime,
        error: dbError instanceof Error ? dbError.message : String(dbError)
      };
      
      healthResponse.status = 'unhealthy';
      healthResponse.checks.database = false;
      healthResponse.checks.criticalTables = false;
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

    console.log(`✅ Health check completed in ${totalResponseTime}ms - Status: ${healthResponse.status}`);

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
    console.error('💥 Health check system error:', error);
    
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
        responseTime: false
      }
    };

    return NextResponse.json(errorResponse, { status: 503 });
  } finally {
    // Always disconnect from Prisma
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.warn('⚠️ Prisma disconnect warning:', disconnectError);
    }
  }
}
