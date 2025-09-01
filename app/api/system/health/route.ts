import { NextResponse } from 'next/server';
import { validateProductionConfig } from '@/lib/config/websocket';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Проверка конфигурации
    const configValidation = validateProductionConfig();
    
    // Проверка подключения к базе данных
    let dbStatus = 'unknown';
    let dbLatency = 0;
    let dbError = '';
    let dbDetails = {};
    
    try {
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStartTime;
      dbStatus = 'connected';
      
      // Дополнительная проверка - проверим что таблицы существуют
      const tableCount = await prisma.$queryRaw`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      dbDetails = {
        latency: `${dbLatency}ms`,
        tablesCount: Number((tableCount as any)[0]?.count || 0),
        connectionUrl: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@') : 'not set'
      };
      
    } catch (error) {
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : String(error);
      dbDetails = {
        error: dbError,
        connectionUrl: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@') : 'not set',
        suggestion: 'Check DATABASE_URL and network connectivity'
      };
      console.error('Database health check failed:', error);
    }
    
    // Проверка количества активных поездок
    let activeTripsCount = 0;
    try {
      activeTripsCount = await prisma.groupTrip.count({
        where: {
          date: {
            gte: new Date()
          },
          status: {
            not: 'CANCELLED'
          }
        }
      });
    } catch (error) {
      console.error('Failed to count active trips:', error);
    }
    
    // Проверка количества пользователей
    let usersCount = 0;
    try {
      usersCount = await prisma.user.count();
    } catch (error) {
      console.error('Failed to count users:', error);
    }
    
    const responseTime = Date.now() - startTime;
    
    const healthData = {
      status: configValidation.isValid && dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbStatus,
          ...dbDetails
        },
        configuration: {
          status: configValidation.isValid ? 'valid' : 'invalid',
          errors: configValidation.errors,
          warnings: configValidation.warnings
        }
      },
      stats: {
        activeTrips: activeTripsCount,
        totalUsers: usersCount
      }
    };
    
    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthData, { status: statusCode });
    
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
