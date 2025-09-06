import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Check what tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    return NextResponse.json({
      success: true,
      tables: tables,
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      databaseUrl: process.env.DATABASE_URL ? 'configured' : 'missing'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
