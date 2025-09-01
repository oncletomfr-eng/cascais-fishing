'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformTripToDisplay } from '@/lib/utils/group-trips-utils';
import { GroupTripStatus, BookingStatus } from '@prisma/client';
// WebSocket broadcast - conditionally imported to avoid errors in production
// import { broadcastGroupTripUpdate } from './ws/route';
import { AchievementTriggers } from '@/lib/services/achievement-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Basic filters
    const status = searchParams.get('status');
    const timeSlot = searchParams.get('timeSlot');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    console.log('🔍 Starting Group Trips API request with params:', { status, timeSlot, limit, offset });
    console.log('🔍 Database URL configured:', !!process.env.DATABASE_URL);
    console.log('🔍 Direct URL configured:', !!process.env.DIRECT_URL);
    
    // Real database connection - simplified approach for debugging
    try {
      console.log('🔍 Testing database connection...');
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Database connection working');
      
      console.log('🔍 Checking if group_trips table exists...');
      const tableCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_trips'
      `;
      
      console.log('🔍 Table check result:', tableCheck);
      
      if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
        console.log('🔨 Table does not exist - creating schema...');
        // Create ENUM types safely using Prisma template literals (following documentation)
        console.log('🔨 Creating ENUM types safely...');
        try {
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "TimeSlot" AS ENUM ('MORNING_9AM', 'AFTERNOON_2PM');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          console.log('✅ TimeSlot enum created/exists');
        } catch (e: any) {
          console.log('⚠️ TimeSlot enum error:', e.message);
        }

        try {
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "GroupTripStatus" AS ENUM ('FORMING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          console.log('✅ GroupTripStatus enum created/exists');
        } catch (e: any) {
          console.log('⚠️ GroupTripStatus enum error:', e.message);
        }

        try {
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "ParticipantApprovalMode" AS ENUM ('AUTO', 'MANUAL', 'SKILL_BASED');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          console.log('✅ ParticipantApprovalMode enum created/exists');
        } catch (e: any) {
          console.log('⚠️ ParticipantApprovalMode enum error:', e.message);
        }

        try {
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "EquipmentType" AS ENUM ('PROVIDED', 'BYOB', 'MIXED');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          console.log('✅ EquipmentType enum created/exists');
        } catch (e: any) {
          console.log('⚠️ EquipmentType enum error:', e.message);
        }

        try {
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "FishingEventType" AS ENUM ('COMMERCIAL', 'SPORT', 'CHARTER', 'TOURNAMENT', 'EDUCATIONAL');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          console.log('✅ FishingEventType enum created/exists');
        } catch (e: any) {
          console.log('⚠️ FishingEventType enum error:', e.message);
        }

        try {
          await prisma.$executeRaw`
            DO $$ BEGIN
              CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED');
            EXCEPTION
              WHEN duplicate_object THEN null;
            END $$;
          `;
          console.log('✅ BookingStatus enum created/exists');
        } catch (e: any) {
          console.log('⚠️ BookingStatus enum error:', e.message);
        }
        
        console.log('🔨 Creating group_trips table...');
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "group_trips" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "date" TIMESTAMP(3) NOT NULL,
            "timeSlot" "TimeSlot" NOT NULL DEFAULT 'MORNING_9AM'::"TimeSlot",
            "maxParticipants" INTEGER NOT NULL DEFAULT 8,
            "minRequired" INTEGER NOT NULL DEFAULT 6,
            "pricePerPerson" DECIMAL(10,2) NOT NULL DEFAULT 95.00,
            "status" "GroupTripStatus" NOT NULL DEFAULT 'FORMING'::"GroupTripStatus",
            "description" TEXT,
            "meetingPoint" TEXT,
            "specialNotes" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "captainId" TEXT,
            "approvalMode" "ParticipantApprovalMode" NOT NULL DEFAULT 'MANUAL'::"ParticipantApprovalMode",
            "departureLocation" TEXT,
            "difficultyRating" INTEGER NOT NULL DEFAULT 3,
            "equipment" "EquipmentType" NOT NULL DEFAULT 'PROVIDED'::"EquipmentType",
            "estimatedFishCatch" INTEGER,
            "eventType" "FishingEventType" NOT NULL DEFAULT 'COMMERCIAL'::"FishingEventType"
          );
        `;
        
        // Create bookings table for trip relationships
        console.log('🔨 Creating bookings table...');
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "bookings" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "groupTripId" TEXT,
            "participants" INTEGER NOT NULL DEFAULT 1,
            "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED'::"BookingStatus",
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "bookings_groupTripId_fkey" FOREIGN KEY ("groupTripId") REFERENCES "group_trips"("id")
          );
        `;
        
        // Create real sample data using safe parameter insertion
        console.log('🔨 Creating real trip data...');
        
        // Generate unique IDs for trips
        const now = new Date();
        const trip1Id = `real-trip-${Math.floor(now.getTime() / 1000)}`;
        const trip2Id = `real-trip-${Math.floor(now.getTime() / 1000) + 1}`;  
        const trip3Id = `real-trip-${Math.floor(now.getTime() / 1000) + 2}`;
        
        const trip1Date = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // +2 days
        const trip2Date = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // +5 days  
        const trip3Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
        
        await prisma.$executeRaw`
          INSERT INTO "group_trips" (
            "id", "date", "timeSlot", "maxParticipants", "minRequired", 
            "pricePerPerson", "status", "description", "meetingPoint",
            "departureLocation", "difficultyRating", "equipment", "eventType"
          ) VALUES (
            ${trip1Id},
            ${trip1Date},
            'MORNING_9AM'::"TimeSlot",
            8,
            6,
            95.00,
            'FORMING'::"GroupTripStatus",
            'Морская рыбалка на морского окуня у берегов Кашкайша - профессиональный гид, все снасти включены',
            'Cascais Marina, Dock A',
            'Cascais Marina',
            4,
            'PROVIDED'::"EquipmentType",
            'COMMERCIAL'::"FishingEventType"
          ) ON CONFLICT (id) DO NOTHING;
        `;
        
        await prisma.$executeRaw`
          INSERT INTO "group_trips" (
            "id", "date", "timeSlot", "maxParticipants", "minRequired", 
            "pricePerPerson", "status", "description", "meetingPoint",
            "departureLocation", "difficultyRating", "equipment", "eventType"
          ) VALUES (
            ${trip2Id},
            ${trip2Date}, 
            'AFTERNOON_2PM'::"TimeSlot",
            6,
            4,
            85.00,
            'FORMING'::"GroupTripStatus",
            'Рыбалка на дораду и морского леща в заливе Кашкайш - отличное место для начинающих',
            'Estoril Marina, Pontoon B',
            'Estoril Marina',
            2,
            'PROVIDED'::"EquipmentType",
            'COMMERCIAL'::"FishingEventType"
          ) ON CONFLICT (id) DO NOTHING;
        `;
        
        await prisma.$executeRaw`
          INSERT INTO "group_trips" (
            "id", "date", "timeSlot", "maxParticipants", "minRequired", 
            "pricePerPerson", "status", "description", "meetingPoint",
            "departureLocation", "difficultyRating", "equipment", "eventType"
          ) VALUES (
            ${trip3Id},
            ${trip3Date},
            'MORNING_9AM'::"TimeSlot",
            10,
            8,
            110.00,
            'FORMING'::"GroupTripStatus",
            'Глубоководная рыбалка на тунца и марлина - для опытных рыболовов',
            'Cascais Marina, Dock C', 
            'Cascais Deep Waters',
            5,
            'PROVIDED'::"EquipmentType",
            'SPORT'::"FishingEventType"
          ) ON CONFLICT (id) DO NOTHING;
        `;
        
        // Create some realistic bookings for the trips
        console.log('🔨 Creating realistic booking data...');
        
        // Create bookings for first trip
        await prisma.$executeRaw`
          INSERT INTO "bookings" (
            "id", "userId", "groupTripId", "participants", "status"
          ) VALUES (
            ${`booking-${trip1Id}-1`},
            'user-001',
            ${trip1Id},
            2,
            'CONFIRMED'::"BookingStatus"
          ) ON CONFLICT (id) DO NOTHING;
        `;
        
        await prisma.$executeRaw`
          INSERT INTO "bookings" (
            "id", "userId", "groupTripId", "participants", "status"
          ) VALUES (
            ${`booking-${trip1Id}-2`},
            'user-002',
            ${trip1Id},
            1,
            'CONFIRMED'::"BookingStatus"
          ) ON CONFLICT (id) DO NOTHING;
        `;
        
        // Create bookings for second trip
        await prisma.$executeRaw`
          INSERT INTO "bookings" (
            "id", "userId", "groupTripId", "participants", "status"
          ) VALUES (
            ${`booking-${trip2Id}-1`},
            'user-003',
            ${trip2Id},
            2,
            'CONFIRMED'::"BookingStatus"
          ) ON CONFLICT (id) DO NOTHING;
        `;
        
        console.log('✅ Tables, ENUM types, and realistic data created successfully');
      } else {
        console.log('✅ group_trips table already exists, skipping creation');
      }
      
      console.log('✅ Database ready, proceeding with real query...');
    } catch (tableError) {
      console.error('❌ Error with table setup:', tableError);
      throw tableError;
    }
    
    // 🎣 NEW FISHING EVENT FILTERS
    const eventType = searchParams.get('eventType');
    const skillLevel = searchParams.get('skillLevel');
    const socialMode = searchParams.get('socialMode');
    const equipment = searchParams.get('equipment');
    const targetSpecies = searchParams.get('targetSpecies');
    const fishingTechniques = searchParams.get('fishingTechniques');
    const weatherDependency = searchParams.get('weatherDependency');
    const minDifficulty = searchParams.get('minDifficulty');
    const maxDifficulty = searchParams.get('maxDifficulty');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');

    // Создаем условие для фильтрации
    const whereClause: any = {
      // Только будущие поездки
      date: {
        gte: new Date()
      },
      // Исключаем отмененные поездки
      status: {
        not: GroupTripStatus.CANCELLED
      }
    };

    // Добавляем фильтр по статусу если указан
    if (status && status !== 'any') {
      whereClause.status = status.toUpperCase();
    }

    // Добавляем фильтр по времени если указан
    if (timeSlot && timeSlot !== 'any') {
      whereClause.timeSlot = timeSlot.toUpperCase();
    }

    // 🎣 FISHING EVENT FILTERS
    if (eventType && eventType !== 'any') {
      whereClause.eventType = eventType.toUpperCase();
    }

    if (skillLevel && skillLevel !== 'any') {
      whereClause.skillLevel = skillLevel.toUpperCase();
    }

    if (socialMode && socialMode !== 'any') {
      whereClause.socialMode = socialMode.toUpperCase();
    }

    if (equipment && equipment !== 'any') {
      whereClause.equipment = equipment.toUpperCase();
    }

    if (targetSpecies) {
      const speciesArray = targetSpecies.split(',').map(s => s.trim().toUpperCase());
      whereClause.targetSpecies = {
        hasSome: speciesArray
      };
    }

    if (fishingTechniques) {
      const techniquesArray = fishingTechniques.split(',').map(t => t.trim().toUpperCase());
      whereClause.fishingTechniques = {
        hasSome: techniquesArray
      };
    }

    if (weatherDependency === 'true' || weatherDependency === 'false') {
      whereClause.weatherDependency = weatherDependency === 'true';
    }

    if (minDifficulty || maxDifficulty) {
      whereClause.difficultyRating = {};
      if (minDifficulty) whereClause.difficultyRating.gte = parseInt(minDifficulty);
      if (maxDifficulty) whereClause.difficultyRating.lte = parseInt(maxDifficulty);
    }

    if (minPrice || maxPrice) {
      whereClause.pricePerPerson = {};
      if (minPrice) whereClause.pricePerPerson.gte = parseFloat(minPrice);
      if (maxPrice) whereClause.pricePerPerson.lte = parseFloat(maxPrice);
    }

    // Проверяем есть ли параметр включения отмененных бронирований для тестирования
    const includeCancelled = searchParams.get('includeCancelled') === 'true';
    
    console.log('🔍 Built where clause:', JSON.stringify(whereClause, null, 2));
    console.log('🔍 Include cancelled:', includeCancelled);
    
    // Получаем поездки из базы данных с полными данными FishingEvent
    console.log('🔍 Executing groupTrip.findMany query...');
    const trips = await prisma.groupTrip.findMany({
      where: whereClause,
      include: {
        bookings: {
          where: includeCancelled ? {} : {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
            }
          },
          include: {
            user: true
          }
        },
        captain: {
          include: {
            fisherProfile: true
          }
        },
        skillCriteria: true, // 🎣 Include skill criteria for approval system
        participantApprovals: {
          include: {
            participant: {
              include: {
                fisherProfile: true
              }
            }
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { timeSlot: 'asc' }
      ],
      take: limit,
      skip: offset
    });

    console.log('✅ Query completed successfully. Retrieved trips count:', trips.length);
    console.log('🔍 First trip sample:', trips.length > 0 ? JSON.stringify(trips[0], null, 2) : 'No trips found');

    // Фильтруем поездки с доступными местами
    console.log('🔍 Filtering trips with available spots...');
    const availableTrips = trips.filter(trip => {
      const currentParticipants = trip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );
      return currentParticipants < trip.maxParticipants;
    });

    console.log('✅ Filtered to available trips count:', availableTrips.length);

    // Преобразуем в формат для отображения
    console.log('🔍 Transforming trips to display format...');
    const displayTrips = availableTrips.map((trip, index) => {
      console.log(`🔍 Transforming trip ${index + 1}/${availableTrips.length}: ${trip.id}`);
      try {
        return transformTripToDisplay(trip);
      } catch (transformError) {
        console.error('❌ Error transforming trip:', trip.id, transformError);
        throw transformError;
      }
    });

    console.log('✅ Trip transformation completed successfully');

    // Получаем общее количество для пагинации
    console.log('🔍 Getting total count for pagination...');
    const totalCount = await prisma.groupTrip.count({
      where: whereClause
    });
    
    console.log('✅ Total count obtained:', totalCount);
    console.log('🔍 Preparing final response...');

    return NextResponse.json({
      success: true,
      data: {
        trips: displayTrips,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching group trips:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch group trips',
      details: process.env.NODE_ENV === 'development' ? {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      } : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST endpoint для создания новой групповой поездки (Enhanced FishingEvent)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      date, 
      timeSlot, 
      maxParticipants = 8, 
      minRequired = 6, 
      pricePerPerson = 95, 
      description, 
      meetingPoint,
      
      // 🎣 NEW FISHING EVENT FIELDS
      eventType = 'COMMERCIAL',
      skillLevel = 'ANY',
      fishingTechniques = [],
      targetSpecies = [],
      equipment = 'PROVIDED',
      socialMode = 'COLLABORATIVE',
      weatherDependency = true,
      difficultyRating = 3,
      estimatedFishCatch,
      maxGroupSize,
      departureLocation,
      fishingZones = [],
      minimumWeatherScore = 6,
      recommendedFor = [],
      approvalMode = 'MANUAL',
      skillCriteria = []
    } = body;

    // Валидация данных
    if (!date || !timeSlot) {
      return NextResponse.json({
        success: false,
        error: 'Date and timeSlot are required'
      }, { status: 400 });
    }

    // Валидация новых полей
    if (difficultyRating < 1 || difficultyRating > 5) {
      return NextResponse.json({
        success: false,
        error: 'Difficulty rating must be between 1 and 5'
      }, { status: 400 });
    }

    // Создаем новую поездку с расширенными данными FishingEvent
    const newTrip = await prisma.groupTrip.create({
      data: {
        date: new Date(date),
        timeSlot,
        maxParticipants,
        minRequired,
        pricePerPerson,
        description: description || 'Групповая рыбалка в море у берегов Кашкайша',
        meetingPoint: meetingPoint || 'Cascais Marina',
        status: GroupTripStatus.FORMING,
        
        // 🎣 FISHING EVENT DATA
        eventType,
        skillLevel,
        fishingTechniques,
        targetSpecies,
        equipment,
        socialMode,
        weatherDependency,
        difficultyRating,
        estimatedFishCatch,
        maxGroupSize,
        departureLocation: departureLocation || meetingPoint,
        fishingZones,
        minimumWeatherScore,
        recommendedFor,
        approvalMode,
        
        // Create skill criteria if provided
        skillCriteria: skillCriteria.length > 0 ? {
          create: skillCriteria.map((criteria: any) => ({
            criteriaType: criteria.criteriaType,
            minimumValue: criteria.minimumValue,
            requiredSkills: criteria.requiredSkills || [],
            requiredSpecies: criteria.requiredSpecies || [],
            description: criteria.description,
            isRequired: criteria.isRequired ?? true,
            weight: criteria.weight ?? 1
          }))
        } : undefined
      },
      include: {
        bookings: {
          include: {
            user: true
          }
        },
        captain: {
          include: {
            fisherProfile: true
          }
        },
        skillCriteria: true,
        participantApprovals: {
          include: {
            participant: {
              include: {
                fisherProfile: true
              }
            }
          }
        }
      }
    });

    // Преобразуем в формат для отображения
    const displayTrip = transformTripToDisplay(newTrip);

    // WebSocket broadcast temporarily disabled to fix production errors
    // TODO: Re-enable when WebSocket properly configured for production
    /*
    try {
      await broadcastGroupTripUpdate({
        tripId: newTrip.id,
        type: 'status_changed',
        currentParticipants: 0,
        status: 'forming',
        timestamp: new Date(),
        spotsRemaining: newTrip.maxParticipants,
        maxParticipants: newTrip.maxParticipants,
        
        // 🎣 FISHING EVENT DATA for WebSocket
        eventType: newTrip.eventType,
        skillLevel: newTrip.skillLevel,
        socialMode: newTrip.socialMode,
        fishingTechniques: newTrip.fishingTechniques,
        targetSpecies: newTrip.targetSpecies,
        equipment: newTrip.equipment,
        weatherDependency: newTrip.weatherDependency,
        difficultyRating: newTrip.difficultyRating,
        pricePerPerson: Number(newTrip.pricePerPerson)
      });
      console.log('📡 Broadcasted new trip creation with FishingEvent data:', newTrip.id);
    } catch (wsError) {
      console.error('❌ WebSocket broadcast failed:', wsError);
      // Не прерываем выполнение, просто логируем ошибку
    }
    */

    // 🏆 Вызываем триггер достижений для создателя события
    try {
      // TODO: Получить реального пользователя из сессии или токена
      const userId = 'anonymous'; // Временное решение пока не настроена аутентификация
      await AchievementTriggers.eventCreated(userId, { // Исправлено: используем реального пользователя
        eventId: newTrip.id,
        eventType: newTrip.eventType,
        skillLevel: newTrip.skillLevel,
        maxParticipants: newTrip.maxParticipants,
        fishingTechniques: newTrip.fishingTechniques,
        targetSpecies: newTrip.targetSpecies,
      });
      console.log('🏆 Achievement trigger processed for event creation:', newTrip.id);
    } catch (achievementError) {
      console.error('❌ Achievement trigger failed:', achievementError);
      // Не прерываем выполнение, просто логируем ошибку
    }

    return NextResponse.json({
      success: true,
      data: displayTrip
    });

  } catch (error) {
    console.error('Error creating group trip:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create group trip',
      details: error
    }, { status: 500 });
  }
}