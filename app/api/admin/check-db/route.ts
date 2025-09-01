import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    console.log('🔍 Checking database connection and tables...');
    
    // Check if database is connected
    const dbCheck = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    
    // Check what tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('📊 Tables found:', tables);
    
    // Check if specific tables exist
    const groupTripTableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'group_trips'
    `;
    
    const userTableCheck = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `;
    
    return NextResponse.json({
      success: true,
      database: {
        connected: true,
        tables: tables,
        hasGroupTrips: Array.isArray(groupTripTableCheck) && groupTripTableCheck.length > 0,
        hasUsers: Array.isArray(userTableCheck) && userTableCheck.length > 0
      },
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Database check failed',
      details: error instanceof Error ? error.message : String(error),
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
