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
    try {
      const dbStartTime = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStartTime;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
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
          latency: `${dbLatency}ms`
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
