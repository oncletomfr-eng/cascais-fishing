import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    console.log('🔨 Setting up database tables...');
    
    // Create essential tables using raw SQL
    console.log('🔨 Creating group_trips table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "group_trips" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "date" TIMESTAMP(3) NOT NULL,
        "timeSlot" TEXT NOT NULL DEFAULT 'MORNING_9AM',
        "maxParticipants" INTEGER NOT NULL DEFAULT 8,
        "minRequired" INTEGER NOT NULL DEFAULT 6,
        "pricePerPerson" DECIMAL(10,2) NOT NULL DEFAULT 95.00,
        "status" TEXT NOT NULL DEFAULT 'FORMING',
        "description" TEXT,
        "meetingPoint" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Create sample trip
    console.log('🔨 Creating sample trip...');
    await prisma.$executeRaw`
      INSERT INTO "group_trips" (
        "id", "date", "timeSlot", "maxParticipants", "minRequired", 
        "pricePerPerson", "status", "description", "meetingPoint"
      ) VALUES (
        'sample-trip-' || EXTRACT(EPOCH FROM NOW())::TEXT,
        NOW() + INTERVAL '2 days',
        'MORNING_9AM',
        8,
        6,
        95.00,
        'FORMING',
        'Морская рыбалка у берегов Кашкайша',
        'Cascais Marina'
      );
    `;
    
    // Verify setup
    const tripCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "group_trips"`;
    console.log('✅ Database setup completed');
    
    return NextResponse.json({
      success: true,
      message: 'Database setup completed',
      tripCount: tripCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
