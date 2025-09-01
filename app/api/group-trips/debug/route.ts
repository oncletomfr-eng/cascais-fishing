'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Starting group trips debug endpoint');
    
    // Простейший тест подключения к базе
    const testQuery = await prisma.groupTrip.count();
    console.log('📊 Total group trips in database:', testQuery);
    
    return NextResponse.json({
      success: true,
      message: 'Group Trips API debugging endpoint',
      stats: {
        totalTrips: testQuery
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ DEBUG Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    }, { status: 500 });
  }
}
