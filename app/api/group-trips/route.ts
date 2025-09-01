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
    
    // Temporary fix: Check if group_trips table exists first
    try {
      const tableCheck = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_trips'
      `;
      
      if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
        console.warn('⚠️ group_trips table does not exist, returning empty data');
        return NextResponse.json({
          success: true,
          data: {
            trips: [],
            pagination: {
              total: 0,
              limit,
              offset,
              hasMore: false
            }
          },
          warning: 'Database not fully initialized - group_trips table missing'
        });
      }
    } catch (tableCheckError) {
      console.error('❌ Error checking table existence:', tableCheckError);
      // Continue with normal flow - maybe table exists but query failed
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
    
    // Получаем поездки из базы данных с полными данными FishingEvent
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

    // Фильтруем поездки с доступными местами
    const availableTrips = trips.filter(trip => {
      const currentParticipants = trip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );
      return currentParticipants < trip.maxParticipants;
    });

    // Преобразуем в формат для отображения
    const displayTrips = availableTrips.map(trip => transformTripToDisplay(trip));

    // Получаем общее количество для пагинации
    const totalCount = await prisma.groupTrip.count({
      where: whereClause
    });

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
    console.error('Error fetching group trips:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch group trips'
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