import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    console.log('🔨 Starting database table creation...');
    
    // Test database connection first
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Push database schema using Prisma
    // Note: This is dangerous in production, but needed for initial setup
    
    console.log('🔨 Creating tables with Prisma db push...');
    
    // Since we can't run db push from here, we'll create essential tables manually
    // Create Users table first
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT,
        "email" TEXT,
        "emailVerified" TIMESTAMP(3),
        "image" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "isActive" BOOLEAN NOT NULL DEFAULT true
      );
    `;
    
    console.log('✅ Users table created');
    
    // Create GroupTrip table
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
        "specialNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "captainId" TEXT,
        "approvalMode" TEXT NOT NULL DEFAULT 'MANUAL',
        "departureLocation" TEXT,
        "difficultyRating" INTEGER NOT NULL DEFAULT 3,
        "equipment" TEXT NOT NULL DEFAULT 'PROVIDED',
        "estimatedFishCatch" INTEGER,
        "eventType" TEXT NOT NULL DEFAULT 'COMMERCIAL',
        "fishingTechniques" TEXT[] DEFAULT '{}',
        "fishingZones" TEXT[] DEFAULT '{}',
        "maxGroupSize" INTEGER,
        "minimumWeatherScore" INTEGER NOT NULL DEFAULT 6,
        "recommendedFor" TEXT[] DEFAULT '{}',
        "skillLevel" TEXT NOT NULL DEFAULT 'ANY',
        "socialMode" TEXT NOT NULL DEFAULT 'COLLABORATIVE',
        "targetSpecies" TEXT[] DEFAULT '{}',
        "weatherDependency" BOOLEAN NOT NULL DEFAULT true
      );
    `;
    
    console.log('✅ GroupTrip table created');
    
    // Create some sample data
    const sampleTrip = await prisma.$executeRaw`
      INSERT INTO "group_trips" (
        "id", "date", "timeSlot", "maxParticipants", "minRequired", 
        "pricePerPerson", "status", "description", "meetingPoint"
      ) VALUES (
        'trip-sample-1',
        '2025-02-05 09:00:00',
        'MORNING_9AM',
        8,
        6,
        95.00,
        'FORMING',
        'Морская рыбалка у берегов Кашкайша - отличная возможность поймать морского окуня и дораду',
        'Cascais Marina'
      ) ON CONFLICT (id) DO NOTHING;
    `;
    
    console.log('✅ Sample trip data inserted');
    
    // Verify tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'group_trips')
      ORDER BY table_name;
    `;
    
    console.log('✅ Database setup completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      tables: tables,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database setup failed',
      details: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : undefined
    }, { status: 500 });
  }
}
