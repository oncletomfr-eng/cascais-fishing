import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { achievementTracker } from '@/lib/services/achievement-tracker';

/**
 * Demo/Test endpoint для демонстрации Real-Time Achievement System
 * Task 21.1: Achievement Progress Tracking API - Demo and Testing
 * 
 * Позволяет симулировать различные события для тестирования системы достижений
 */

const DemoEventSchema = z.object({
  userId: z.string().cuid(),
  demoType: z.enum([
    'trip_completion',
    'fish_catch_simulation',
    'review_simulation', 
    'event_creation_simulation',
    'user_help_simulation',
    'manual_achievement'
  ]),
  params: z.record(z.any()).optional().default({})
});

/**
 * POST /api/achievements/demo - Симуляция событий для тестирования достижений
 * 
 * Body:
 * - userId: string - ID пользователя
 * - demoType: string - тип демо-события
 * - params: object - параметры события
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, demoType, params } = DemoEventSchema.parse(body);

    console.log(`🎮 Demo: Simulating ${demoType} for user ${userId}`);

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'user_not_found'
      }, { status: 404 });
    }

    let result;

    switch (demoType) {
      case 'trip_completion':
        result = await simulateTripCompletion(userId, params);
        break;
        
      case 'fish_catch_simulation':
        result = await simulateFishCatch(userId, params);
        break;
        
      case 'review_simulation':
        result = await simulateReviewLeft(userId, params);
        break;
        
      case 'event_creation_simulation':
        result = await simulateEventCreation(userId, params);
        break;
        
      case 'user_help_simulation':
        result = await simulateUserHelp(userId, params);
        break;
        
      case 'manual_achievement':
        result = await simulateManualAchievement(userId, params);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'invalid_demo_type'
        }, { status: 400 });
    }

    console.log(`✅ Demo completed: ${demoType}`, result);

    return NextResponse.json({
      success: true,
      demoType,
      userId,
      user: {
        name: user.name,
        email: user.email
      },
      result,
      message: `Successfully simulated ${demoType} for ${user.name || user.email}`
    });

  } catch (error) {
    console.error('❌ Error in demo endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Demo simulation failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/achievements/demo - Получить список доступных демо-симуляций
 */
export async function GET() {
  const demoOptions = {
    trip_completion: {
      description: 'Симулирует завершение рыболовной поездки с различными параметрами',
      params: {
        locationType: 'reef | deep_sea | coastal',
        wasReliable: 'boolean',
        fishCaught: 'array of fish objects',
        techniquesUsed: 'array of technique names',
        isNewLocation: 'boolean'
      },
      example: {
        locationType: 'reef',
        wasReliable: true,
        fishCaught: [
          { species: 'tuna', isNewSpecies: true },
          { species: 'dorado', isNewSpecies: false }
        ],
        techniquesUsed: ['trolling', 'jigging'],
        isNewLocation: true,
        locationId: 'cascais-reef-1'
      }
    },
    fish_catch_simulation: {
      description: 'Симулирует поимку конкретных видов рыб',
      params: {
        fishSpecies: 'tuna | dorado | seabass | marlin',
        isNewSpecies: 'boolean'
      },
      example: {
        fishSpecies: 'marlin',
        isNewSpecies: true
      }
    },
    review_simulation: {
      description: 'Симулирует оставление отзыва о поездке',
      params: {
        rating: 'number 1-5',
        tripId: 'string'
      },
      example: {
        rating: 5,
        tripId: 'trip-123'
      }
    },
    event_creation_simulation: {
      description: 'Симулирует создание группового события',
      params: {
        eventType: 'group | solo | competition',
        participantLimit: 'number'
      },
      example: {
        eventType: 'group',
        participantLimit: 8
      }
    },
    user_help_simulation: {
      description: 'Симулирует помощь другому пользователю',
      params: {
        helpType: 'newbie_mentoring | technical_advice | equipment_sharing',
        helpedUserId: 'string'
      },
      example: {
        helpType: 'newbie_mentoring',
        helpedUserId: 'user-456'
      }
    },
    manual_achievement: {
      description: 'Ручное присвоение прогресса конкретного достижения',
      params: {
        achievementType: 'string',
        increment: 'number'
      },
      example: {
        achievementType: 'TUNA_MASTER',
        increment: 2
      }
    }
  };

  return NextResponse.json({
    success: true,
    availableSimulations: Object.keys(demoOptions),
    demoOptions,
    usage: {
      endpoint: 'POST /api/achievements/demo',
      requiredFields: ['userId', 'demoType'],
      optionalFields: ['params']
    },
    sseEndpoint: 'GET /api/achievements/notifications?userId=YOUR_USER_ID',
    message: 'Connect to SSE endpoint first to see real-time notifications'
  });
}

// Функции симуляции событий

async function simulateTripCompletion(userId: string, params: any) {
  const tripData = {
    tripId: `demo-trip-${Date.now()}`,
    locationType: params.locationType || 'reef',
    wasReliable: params.wasReliable ?? true,
    fishCaught: params.fishCaught || [
      { species: 'tuna', isNewSpecies: true },
      { species: 'seabass', isNewSpecies: false }
    ],
    techniquesUsed: params.techniquesUsed || ['trolling'],
    isNewLocation: params.isNewLocation ?? false,
    locationId: params.locationId || 'demo-location'
  };

  return await achievementTracker.trackTripCompleted(userId, tripData, { immediate: true });
}

async function simulateFishCatch(userId: string, params: any) {
  const fishSpecies = params.fishSpecies || 'tuna';
  const isNewSpecies = params.isNewSpecies ?? true;

  return await achievementTracker.trackTripCompleted(userId, {
    tripId: `demo-fish-trip-${Date.now()}`,
    fishCaught: [{ species: fishSpecies, isNewSpecies }]
  }, { immediate: true });
}

async function simulateReviewLeft(userId: string, params: any) {
  const reviewData = {
    reviewId: `demo-review-${Date.now()}`,
    tripId: params.tripId || `demo-trip-${Date.now()}`,
    rating: params.rating || 5
  };

  return await achievementTracker.trackReviewLeft(userId, reviewData, { immediate: true });
}

async function simulateEventCreation(userId: string, params: any) {
  const eventData = {
    eventId: `demo-event-${Date.now()}`,
    eventType: params.eventType || 'group',
    participantLimit: params.participantLimit || 8
  };

  return await achievementTracker.trackEventCreated(userId, eventData, { immediate: true });
}

async function simulateUserHelp(userId: string, params: any) {
  const helpData = {
    helpedUserId: params.helpedUserId || `demo-user-${Date.now()}`,
    helpType: params.helpType || 'newbie_mentoring',
    tripId: params.tripId
  };

  return await achievementTracker.trackUserHelped(userId, helpData, { immediate: true });
}

async function simulateManualAchievement(userId: string, params: any) {
  const achievementType = params.achievementType || 'TUNA_MASTER';
  const increment = params.increment || 1;

  return await achievementTracker.trackManual(userId, achievementType, increment, { immediate: true });
}
