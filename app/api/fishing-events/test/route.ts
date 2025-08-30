'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Simple test endpoint to verify database and new schema works
export async function GET(request: NextRequest) {
  try {
    // Test basic database connection
    const tripCount = await prisma.groupTrip.count();
    
    // Test fetching with new fields
    const trips = await prisma.groupTrip.findMany({
      take: 1,
      select: {
        id: true,
        date: true,
        timeSlot: true,
        eventType: true,
        skillLevel: true,
        fishingTechniques: true,
        targetSpecies: true,
        equipment: true,
        socialMode: true,
        difficultyRating: true,
        fishingZones: true,
        recommendedFor: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalTrips: tripCount,
        sampleTrip: trips[0] || null,
        newFieldsWorking: true
      }
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Database test failed'
    });
  }
}

// Simple test POST to create minimal event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const newTrip = await prisma.groupTrip.create({
      data: {
        date: new Date(body.date || '2025-03-01'),
        timeSlot: body.timeSlot || 'MORNING_9AM',
        maxParticipants: body.maxParticipants || 8,
        minRequired: body.minRequired || 6,
        pricePerPerson: body.pricePerPerson || 95,
        description: body.description || 'Test fishing event'
        // All other fields will use defaults from schema
      },
      select: {
        id: true,
        date: true,
        timeSlot: true,
        eventType: true,
        skillLevel: true,
        equipment: true,
        difficultyRating: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      data: newTrip
    });

  } catch (error) {
    console.error('Create test trip error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create test trip'
    });
  }
}
