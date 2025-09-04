import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { badgeIntegration } from '@/lib/services/badge-integration';

/**
 * Demo/Test endpoint для Badge Award System
 * Task 21.2: Badge Award System Backend - Demo and Testing
 * 
 * Позволяет симулировать различные события для тестирования системы badges
 */

const BadgeDemoSchema = z.object({
  userId: z.string().cuid(),
  demoType: z.enum([
    'full_badge_check',
    'achievement_unlock_simulation',
    'trip_completion_simulation',
    'profile_update_simulation',
    'manual_badge_award',
    'batch_badge_test'
  ]),
  params: z.record(z.any()).optional().default({})
});

/**
 * POST /api/badges/demo - Симуляция событий для тестирования badge system
 * 
 * Body:
 * - userId: string - ID пользователя
 * - demoType: string - тип демо-события
 * - params: object - параметры события
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, demoType, params } = BadgeDemoSchema.parse(body);

    console.log(`🎖️ Badge Demo: Simulating ${demoType} for user ${userId}`);

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
      case 'full_badge_check':
        result = await simulateFullBadgeCheck(userId, params);
        break;
        
      case 'achievement_unlock_simulation':
        result = await simulateAchievementUnlockBadges(userId, params);
        break;
        
      case 'trip_completion_simulation':
        result = await simulateTripCompletionBadges(userId, params);
        break;
        
      case 'profile_update_simulation':
        result = await simulateProfileUpdateBadges(userId, params);
        break;
        
      case 'manual_badge_award':
        result = await simulateManualBadgeAward(userId, params);
        break;
        
      case 'batch_badge_test':
        result = await simulateBatchBadgeTest(userId, params);
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'invalid_demo_type'
        }, { status: 400 });
    }

    console.log(`✅ Badge demo completed: ${demoType}`, result);

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
    console.error('❌ Error in badge demo endpoint:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Badge demo simulation failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/badges/demo - Получить список доступных badge demo-симуляций
 */
export async function GET() {
  const demoOptions = {
    full_badge_check: {
      description: 'Выполняет полную проверку всех badges для пользователя',
      params: {
        notify: 'boolean (default: true)'
      },
      example: {
        notify: true
      }
    },
    achievement_unlock_simulation: {
      description: 'Симулирует разблокировку достижения и проверяет связанные badges',
      params: {
        achievementType: 'TUNA_MASTER | MARLIN_LEGEND | SPECIES_COLLECTOR | etc'
      },
      example: {
        achievementType: 'TUNA_MASTER'
      }
    },
    trip_completion_simulation: {
      description: 'Симулирует завершение поездки и проверяет trip-related badges',
      params: {
        tripId: 'string',
        locationType: 'reef | deep_sea | coastal',
        wasReliable: 'boolean',
        fishCaught: 'array of fish objects',
        techniquesUsed: 'array of technique names'
      },
      example: {
        tripId: 'demo-trip-123',
        locationType: 'reef',
        wasReliable: true,
        fishCaught: [
          { species: 'tuna', isNewSpecies: true }
        ],
        techniquesUsed: ['trolling']
      }
    },
    profile_update_simulation: {
      description: 'Симулирует обновление профиля пользователя и проверяет profile badges',
      params: {
        experienceLevel: 'BEGINNER | INTERMEDIATE | EXPERT',
        rating: 'number 0-5',
        reliability: 'number 0-100',
        completedTrips: 'number'
      },
      example: {
        experienceLevel: 'EXPERT',
        rating: 4.8,
        reliability: 98,
        completedTrips: 25
      }
    },
    manual_badge_award: {
      description: 'Ручное присвоение конкретного badge',
      params: {
        badgeName: 'string (badge template name)',
        reason: 'string (optional)'
      },
      example: {
        badgeName: 'Marlin Legend Badge',
        reason: 'Demo manual award'
      }
    },
    batch_badge_test: {
      description: 'Тестирует множественное присвоение badges одновременно',
      params: {
        badgeNames: 'array of badge names',
        simulateConditions: 'boolean - simulate meeting conditions'
      },
      example: {
        badgeNames: ['First Trip', 'Regular Fisher', 'Highly Rated'],
        simulateConditions: true
      }
    }
  };

  return NextResponse.json({
    success: true,
    availableSimulations: Object.keys(demoOptions),
    demoOptions,
    usage: {
      endpoint: 'POST /api/badges/demo',
      requiredFields: ['userId', 'demoType'],
      optionalFields: ['params']
    },
    sseEndpoint: 'GET /api/achievements/notifications?userId=YOUR_USER_ID',
    integrationNote: 'Badge notifications are sent through the same SSE endpoint as achievements',
    message: 'Connect to SSE endpoint first to see real-time badge notifications'
  });
}

// Функции симуляции badge событий

async function simulateFullBadgeCheck(userId: string, params: any) {
  const notify = params.notify !== false;
  
  return await badgeIntegration.performFullBadgeCheck(userId, {
    notify,
    reason: 'Full badge check demo'
  });
}

async function simulateAchievementUnlockBadges(userId: string, params: any) {
  const achievementType = params.achievementType || 'TUNA_MASTER';
  
  return await badgeIntegration.checkBadgesAfterAchievement(userId, achievementType, {
    notify: params.notify !== false,
    reason: `Demo achievement unlock: ${achievementType}`
  });
}

async function simulateTripCompletionBadges(userId: string, params: any) {
  const tripData = {
    tripId: params.tripId || `demo-trip-${Date.now()}`,
    locationType: params.locationType || 'reef',
    wasReliable: params.wasReliable ?? true,
    fishCaught: params.fishCaught || [
      { species: 'tuna', isNewSpecies: true }
    ],
    techniquesUsed: params.techniquesUsed || ['trolling']
  };

  // Симулируем также обновление профиля для trip count
  const fisherProfile = await prisma.fisherProfile.findUnique({
    where: { userId },
    select: { completedTrips: true }
  });

  if (fisherProfile) {
    await prisma.fisherProfile.update({
      where: { userId },
      data: {
        completedTrips: { increment: 1 },
        lastActiveAt: new Date()
      }
    });
  }

  return await badgeIntegration.checkBadgesAfterTripCompletion(userId, tripData, {
    notify: params.notify !== false,
    reason: `Demo trip completion: ${tripData.tripId}`
  });
}

async function simulateProfileUpdateBadges(userId: string, params: any) {
  const updates = {
    experienceLevel: params.experienceLevel,
    rating: params.rating,
    reliability: params.reliability,
    completedTrips: params.completedTrips
  };

  // Симулируем обновление профиля в базе
  const updateData: any = {};
  if (updates.experienceLevel) updateData.experienceLevel = updates.experienceLevel;
  if (updates.rating !== undefined) updateData.rating = updates.rating;
  if (updates.reliability !== undefined) updateData.reliability = updates.reliability;
  if (updates.completedTrips !== undefined) updateData.completedTrips = updates.completedTrips;

  if (Object.keys(updateData).length > 0) {
    await prisma.fisherProfile.upsert({
      where: { userId },
      update: {
        ...updateData,
        lastActiveAt: new Date()
      },
      create: {
        userId,
        experienceLevel: updateData.experienceLevel || 'BEGINNER',
        rating: updateData.rating || 0,
        reliability: updateData.reliability || 100,
        completedTrips: updateData.completedTrips || 0,
        level: 1,
        experiencePoints: 0,
        activeDays: 1,
        lastActiveAt: new Date()
      }
    });
  }

  return await badgeIntegration.checkBadgesAfterProfileUpdate(userId, updates, {
    notify: params.notify !== false,
    reason: 'Demo profile update'
  });
}

async function simulateManualBadgeAward(userId: string, params: any) {
  const badgeName = params.badgeName || 'First Trip';
  const reason = params.reason || 'Demo manual award';

  return await badgeIntegration.awardSpecificBadge(userId, badgeName, reason, {
    notify: params.notify !== false
  });
}

async function simulateBatchBadgeTest(userId: string, params: any) {
  const badgeNames = params.badgeNames || ['First Trip', 'Regular Fisher', 'Achievement Hunter'];
  const simulateConditions = params.simulateConditions ?? true;
  
  const results = [];

  // Если нужно симулировать условия
  if (simulateConditions) {
    // Создаем/обновляем профиль с условиями для получения badges
    await prisma.fisherProfile.upsert({
      where: { userId },
      update: {
        completedTrips: 15,
        rating: 4.8,
        reliability: 98,
        experienceLevel: 'EXPERT',
        experiencePoints: 5000,
        level: 10,
        lastActiveAt: new Date()
      },
      create: {
        userId,
        completedTrips: 15,
        rating: 4.8,
        reliability: 98,
        experienceLevel: 'EXPERT',
        experiencePoints: 5000,
        level: 10,
        activeDays: 30,
        lastActiveAt: new Date()
      }
    });

    // Создаем несколько achievements если их нет
    const existingAchievements = await prisma.userAchievement.count({
      where: { userId, unlocked: true }
    });

    if (existingAchievements < 5) {
      // Создаем base achievements если их нет
      const achievementTypes = ['TUNA_MASTER', 'SEABASS_EXPERT', 'TROLLING_EXPERT', 'RELIABLE_FISHER', 'REVIEW_MASTER'];
      
      for (const type of achievementTypes) {
        const achievement = await prisma.achievement.findUnique({
          where: { type: type as any }
        });

        if (achievement) {
          await prisma.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId,
                achievementId: achievement.id
              }
            },
            update: {
              unlocked: true,
              progress: achievement.maxProgress,
              unlockedAt: new Date()
            },
            create: {
              userId,
              achievementId: achievement.id,
              unlocked: true,
              progress: achievement.maxProgress,
              unlockedAt: new Date()
            }
          });
        }
      }
    }
  }

  // Теперь проверяем badges
  for (const badgeName of badgeNames) {
    try {
      const result = await badgeIntegration.awardSpecificBadge(userId, badgeName, 'Batch test award', {
        notify: false // Не отправляем уведомления для каждого отдельно
      });
      results.push({
        badgeName,
        ...result
      });
    } catch (error) {
      results.push({
        badgeName,
        success: false,
        error: error.message
      });
    }
  }

  // Отправляем одно общее уведомление
  if (results.some(r => r.success)) {
    const successfulBadges = results.filter(r => r.success).map(r => r.badge);
    if (successfulBadges.length > 0 && params.notify !== false) {
      // Отправляем уведомление о всех успешных badges
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            type: 'badges_awarded',
            data: {
              badges: successfulBadges,
              totalAwarded: successfulBadges.length
            }
          })
        });
      } catch (error) {
        console.error('❌ Error sending batch badge notifications:', error);
      }
    }
  }

  return {
    batchResults: results,
    totalProcessed: badgeNames.length,
    successfulAwards: results.filter(r => r.success).length,
    simulatedConditions: simulateConditions
  };
}
