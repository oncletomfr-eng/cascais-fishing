import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔍 Debug DB endpoint called');
    
    // Basic connection test
    console.log('🔍 Testing basic connection...');
    const connectionTest = await prisma.$queryRaw`SELECT 1 as connected, NOW() as timestamp`;
    console.log('✅ Connection test result:', connectionTest);
    
    // Check environment variables
    console.log('🔍 Environment check...');
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DIRECT_URL: !!process.env.DIRECT_URL,
      DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
    };
    console.log('🔍 Environment status:', envCheck);
    
    // Check available tables
    console.log('🔍 Checking available tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('🔍 Available tables:', tables);
    
    // Check available enums
    console.log('🔍 Checking available enum types...');
    const enums = await prisma.$queryRaw`
      SELECT typname as enum_name, 
             array_agg(enumlabel ORDER BY enumsortorder) as enum_values
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      GROUP BY typname
      ORDER BY typname
    `;
    console.log('🔍 Available enums:', enums);
    
    return NextResponse.json({
      success: true,
      debug: {
        connection: connectionTest,
        environment: envCheck,
        tables: tables,
        enums: enums,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('❌ Debug DB error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      name: error.name,
      code: error.code,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
