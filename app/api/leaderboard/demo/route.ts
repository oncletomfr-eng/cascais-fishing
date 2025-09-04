import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { leaderboardRealtime } from '@/lib/services/leaderboard-realtime';

/**
 * Demo/Test endpoint for Enhanced Leaderboard Engine
 * Task 21.3: Leaderboard Engine Backend - Demo and Testing
 * 
 * Позволяет симулировать различные события и тестировать leaderboard engine
 */

const LeaderboardDemoSchema = z.object({
  userId: z.string().cuid().optional(),
  demoType: z.enum([
    'get_leaderboard',
    'simulate_achievement_unlock',
    'simulate_trip_completion', 
    'simulate_experience_gain',
    'simulate_rating_update',
    'bulk_user_simulation',
    'cache_operations',
    'real_time_update_test'
  ]),
  params: z.record(z.any()).optional().default({})
});

/**
 * POST /api/leaderboard/demo - Симуляция leaderboard событий
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, demoType, params } = LeaderboardDemoSchema.parse(body);

    console.log(`📊 Leaderboard Demo: ${demoType}${userId ? ` for user ${userId}` : ''}`);

    let result;

    switch (demoType) {
      case 'get_leaderboard':
        result = await demonstrateGetLeaderboard(params);
        break;
        
      case 'simulate_achievement_unlock':
        if (!userId) throw new Error('userId required for achievement simulation');
        result = await simulateAchievementUnlock(userId, params);
        break;
        
      case 'simulate_trip_completion':
        if (!userId) throw new Error('userId required for trip simulation');
        result = await simulateTripCompletion(userId, params);
        break;
        
      case 'simulate_experience_gain':
        if (!userId) throw new Error('userId required for experience simulation');
        result = await simulateExperienceGain(userId, params);
        break;
        
      case 'simulate_rating_update':
        if (!userId) throw new Error('userId required for rating simulation');
        result = await simulateRatingUpdate(userId, params);
        break;
        
      case 'bulk_user_simulation':
        result = await simulateBulkUserUpdates(params);
        break;
        
      case 'cache_operations':
        result = await demonstrateCacheOperations(params);
        break;
        
      case 'real_time_update_test':
        if (!userId) throw new Error('userId required for real-time test');
        result = await testRealTimeUpdates(userId, params);
        break;
        
      default:
        throw new Error('Invalid demo type');
    }

    return NextResponse.json({
      success: true,
      demoType,
      userId,
      result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in leaderboard demo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: error.message || 'Leaderboard demo failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/leaderboard/demo - Получить список доступных демо операций
 */
export async function GET() {
  const demoOptions = {
    get_leaderboard: {
      description: 'Получить leaderboard с различными параметрами для демонстрации engine capabilities',
      params: {
        category: 'composite | rating | activity | achievements | fish_master | trip_expert | etc',
        algorithm: 'composite | rating | activity | achievements | specialized | seasonal',
        timeframe: 'all_time | yearly | monthly | weekly | daily',
        limit: 'number (1-100)',
        bypass_cache: 'boolean'
      },
      example: {
        category: 'composite',
        algorithm: 'composite', 
        timeframe: 'all_time',
        limit: 20,
        bypass_cache: true
      }
    },
    
    simulate_achievement_unlock: {
      description: 'Симулирует разблокировку достижения и обновление leaderboard',
      requiresUserId: true,
      params: {
        achievementType: 'TUNA_MASTER | MARLIN_LEGEND | etc',
        notify: 'boolean (default: true)'
      },
      example: {
        achievementType: 'TUNA_MASTER',
        notify: true
      }
    },
    
    simulate_trip_completion: {
      description: 'Симулирует завершение поездки и обновление activity/trip leaderboards',
      requiresUserId: true,
      params: {
        tripCount: 'number (default: 1)',
        fishCaught: 'number (default: 5)',
        newSpecies: 'number (default: 1)',
        rating: 'number 0-5 (default: 4.5)'
      },
      example: {
        tripCount: 2,
        fishCaught: 10,
        newSpecies: 2,
        rating: 5.0
      }
    },
    
    simulate_experience_gain: {
      description: 'Симулирует получение опыта и level up',
      requiresUserId: true,
      params: {
        experienceGain: 'number (default: 500)',
        levelUp: 'boolean (default: false)'
      },
      example: {
        experienceGain: 1000,
        levelUp: true
      }
    },
    
    simulate_rating_update: {
      description: 'Симулирует изменение рейтинга пользователя',
      requiresUserId: true,
      params: {
        newRating: 'number 0-5 (required)',
        reviewsCount: 'number (default: 1)'
      },
      example: {
        newRating: 4.8,
        reviewsCount: 3
      }
    },
    
    bulk_user_simulation: {
      description: 'Создает множественные updates для тестирования performance',
      params: {
        userCount: 'number (default: 10)',
        operationsPerUser: 'number (default: 3)',
        operationTypes: 'array of operation types'
      },
      example: {
        userCount: 20,
        operationsPerUser: 5,
        operationTypes: ['achievement', 'trip', 'experience']
      }
    },
    
    cache_operations: {
      description: 'Демонстрирует cache operations и statistics',
      params: {
        operation: 'stats | clear | test_performance',
        testCategories: 'array of categories to test'
      },
      example: {
        operation: 'stats',
        testCategories: ['composite', 'activity', 'achievements']
      }
    },
    
    real_time_update_test: {
      description: 'Тестирует real-time updates и SSE notifications',
      requiresUserId: true,
      params: {
        eventSequence: 'array of events to simulate',
        delay: 'number (ms between events, default: 1000)'
      },
      example: {
        eventSequence: ['achievement', 'badge', 'trip', 'rating'],
        delay: 2000
      }
    }
  };

  return NextResponse.json({
    success: true,
    availableOperations: Object.keys(demoOptions),
    demoOptions,
    usage: {
      endpoint: 'POST /api/leaderboard/demo',
      requiredFields: ['demoType'],
      optionalFields: ['userId', 'params']
    },
    engineEndpoint: 'GET /api/leaderboard/engine',
    sseEndpoint: 'GET /api/achievements/notifications?userId=YOUR_USER_ID',
    cachingNote: 'Leaderboard engine includes intelligent caching with configurable TTL',
    realTimeNote: 'Real-time updates are sent via SSE when positions change significantly'
  });
}

// Demo implementation functions

async function demonstrateGetLeaderboard(params: any) {
  const leaderboardParams = {
    category: params.category || 'composite',
    algorithm: params.algorithm || 'composite',
    timeframe: params.timeframe || 'all_time',
    limit: params.limit || 20,
    bypass_cache: params.bypass_cache || false
  };

  console.log('📊 Demonstrating leaderboard retrieval with params:', leaderboardParams);

  const result = await leaderboardRealtime.getLeaderboard(leaderboardParams);

  return {
    leaderboardParams,
    fromCache: result.fromCache,
    playersCount: result.leaderboard?.length || 0,
    topPlayers: result.leaderboard?.slice(0, 5).map((p: any) => ({
      position: p.position,
      name: p.name,
      score: p.compositeScore,
      level: p.level
    })),
    metadata: result.metadata,
    cacheStats: leaderboardRealtime.getCacheStats()
  };
}

async function simulateAchievementUnlock(userId: string, params: any) {
  const achievementType = params.achievementType || 'TUNA_MASTER';
  const notify = params.notify !== false;

  console.log(`🏆 Simulating achievement unlock: ${achievementType} for user ${userId}`);

  // Update leaderboard
  const { updateLeaderboardForAchievement } = await import('@/lib/services/leaderboard-realtime');
  await updateLeaderboardForAchievement(userId, achievementType);

  return {
    achievementType,
    notify,
    leaderboardUpdated: true,
    message: `Simulated ${achievementType} achievement unlock for user ${userId}`,
    cacheStats: leaderboardRealtime.getCacheStats()
  };
}

async function simulateTripCompletion(userId: string, params: any) {
  const tripData = {
    tripCount: params.tripCount || 1,
    fishCaught: params.fishCaught || 5,
    newSpecies: params.newSpecies || 1,
    rating: params.rating || 4.5
  };

  console.log(`🚤 Simulating trip completion for user ${userId}:`, tripData);

  // Update user profile to reflect trip completion
  await prisma.fisherProfile.upsert({
    where: { userId },
    update: {
      completedTrips: { increment: tripData.tripCount },
      totalFishCaught: { increment: tripData.fishCaught },
      rating: tripData.rating,
      lastActiveAt: new Date()
    },
    create: {
      userId,
      experienceLevel: 'BEGINNER',
      level: 1,
      experiencePoints: 100,
      completedTrips: tripData.tripCount,
      totalFishCaught: tripData.fishCaught,
      rating: tripData.rating,
      activeDays: 1,
      lastActiveAt: new Date()
    }
  });

  // Update leaderboard
  const { updateLeaderboardForTrip } = await import('@/lib/services/leaderboard-realtime');
  await updateLeaderboardForTrip(userId, tripData);

  return {
    tripData,
    profileUpdated: true,
    leaderboardUpdated: true,
    message: `Simulated trip completion for user ${userId}`,
    cacheStats: leaderboardRealtime.getCacheStats()
  };
}

async function simulateExperienceGain(userId: string, params: any) {
  const experienceGain = params.experienceGain || 500;
  const levelUp = params.levelUp || false;

  console.log(`✨ Simulating experience gain: +${experienceGain} XP for user ${userId}`);

  // Update user profile
  const profile = await prisma.fisherProfile.findUnique({
    where: { userId }
  });

  const currentExp = profile?.experiencePoints || 0;
  const currentLevel = profile?.level || 1;
  const newExp = currentExp + experienceGain;
  const newLevel = levelUp ? currentLevel + 1 : Math.max(currentLevel, Math.floor(newExp / 1000) + 1);

  await prisma.fisherProfile.upsert({
    where: { userId },
    update: {
      experiencePoints: newExp,
      level: newLevel,
      lastActiveAt: new Date()
    },
    create: {
      userId,
      experienceLevel: 'BEGINNER',
      level: newLevel,
      experiencePoints: newExp,
      activeDays: 1,
      lastActiveAt: new Date()
    }
  });

  // Update leaderboard
  const { updateLeaderboardForExperience } = await import('@/lib/services/leaderboard-realtime');
  await updateLeaderboardForExperience(userId, experienceGain);

  return {
    experienceGain,
    levelUp: newLevel > currentLevel,
    oldLevel: currentLevel,
    newLevel,
    oldExp: currentExp,
    newExp,
    leaderboardUpdated: true,
    message: `Simulated experience gain for user ${userId}`,
    cacheStats: leaderboardRealtime.getCacheStats()
  };
}

async function simulateRatingUpdate(userId: string, params: any) {
  if (!params.newRating) {
    throw new Error('newRating parameter is required');
  }

  const newRating = params.newRating;
  const reviewsCount = params.reviewsCount || 1;

  console.log(`⭐ Simulating rating update: ${newRating} for user ${userId}`);

  // Get current rating
  const profile = await prisma.fisherProfile.findUnique({
    where: { userId }
  });

  const oldRating = profile?.rating || 0;

  // Update user profile
  await prisma.fisherProfile.upsert({
    where: { userId },
    update: {
      rating: newRating,
      totalReviews: { increment: reviewsCount },
      lastActiveAt: new Date()
    },
    create: {
      userId,
      experienceLevel: 'BEGINNER',
      level: 1,
      experiencePoints: 0,
      rating: newRating,
      totalReviews: reviewsCount,
      activeDays: 1,
      lastActiveAt: new Date()
    }
  });

  // Update leaderboard
  const { updateLeaderboardForRating } = await import('@/lib/services/leaderboard-realtime');
  await updateLeaderboardForRating(userId, newRating, oldRating);

  return {
    oldRating,
    newRating,
    reviewsCount,
    ratingChange: newRating - oldRating,
    leaderboardUpdated: true,
    message: `Simulated rating update for user ${userId}`,
    cacheStats: leaderboardRealtime.getCacheStats()
  };
}

async function simulateBulkUserUpdates(params: any) {
  const userCount = params.userCount || 10;
  const operationsPerUser = params.operationsPerUser || 3;
  const operationTypes = params.operationTypes || ['achievement', 'trip', 'experience'];

  console.log(`🔄 Simulating bulk updates for ${userCount} users with ${operationsPerUser} operations each`);

  // Get random users for simulation
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    take: userCount
  });

  const results = [];

  for (const user of users) {
    const userResults = [];

    for (let i = 0; i < operationsPerUser; i++) {
      const operationType = operationTypes[Math.floor(Math.random() * operationTypes.length)];

      try {
        switch (operationType) {
          case 'achievement':
            await simulateAchievementUnlock(user.id, {
              achievementType: ['TUNA_MASTER', 'SEABASS_EXPERT', 'TROLLING_EXPERT'][Math.floor(Math.random() * 3)],
              notify: false
            });
            userResults.push({ type: 'achievement', success: true });
            break;

          case 'trip':
            await simulateTripCompletion(user.id, {
              tripCount: Math.floor(Math.random() * 3) + 1,
              fishCaught: Math.floor(Math.random() * 10) + 1,
              rating: 3 + Math.random() * 2 // 3-5 rating
            });
            userResults.push({ type: 'trip', success: true });
            break;

          case 'experience':
            await simulateExperienceGain(user.id, {
              experienceGain: Math.floor(Math.random() * 1000) + 100
            });
            userResults.push({ type: 'experience', success: true });
            break;
        }
      } catch (error) {
        userResults.push({ type: operationType, success: false, error: error.message });
      }
    }

    results.push({
      userId: user.id,
      userName: user.name,
      operations: userResults
    });
  }

  return {
    userCount,
    operationsPerUser,
    operationTypes,
    results,
    totalOperations: userCount * operationsPerUser,
    successfulOperations: results.reduce((sum, user) => 
      sum + user.operations.filter(op => op.success).length, 0
    ),
    cacheStats: leaderboardRealtime.getCacheStats(),
    message: `Completed bulk simulation for ${userCount} users`
  };
}

async function demonstrateCacheOperations(params: any) {
  const operation = params.operation || 'stats';
  const testCategories = params.testCategories || ['composite', 'activity', 'achievements'];

  console.log(`🗄️ Demonstrating cache operations: ${operation}`);

  let result: any = {};

  switch (operation) {
    case 'stats':
      result = {
        cacheStats: leaderboardRealtime.getCacheStats(),
        operation: 'stats'
      };
      break;

    case 'clear':
      leaderboardRealtime.clearCache();
      result = {
        message: 'Cache cleared',
        cacheStats: leaderboardRealtime.getCacheStats(),
        operation: 'clear'
      };
      break;

    case 'test_performance':
      // Test cache performance by requesting same leaderboard multiple times
      const testResults = [];
      
      for (const category of testCategories) {
        const startTime = Date.now();
        
        // First request (should be fresh)
        const result1 = await leaderboardRealtime.getLeaderboard({
          category,
          algorithm: 'composite',
          timeframe: 'all_time',
          limit: 20,
          bypass_cache: true
        });
        
        const firstRequestTime = Date.now() - startTime;
        
        // Second request (should be cached)
        const startTime2 = Date.now();
        const result2 = await leaderboardRealtime.getLeaderboard({
          category,
          algorithm: 'composite',
          timeframe: 'all_time',
          limit: 20,
          bypass_cache: false
        });
        
        const secondRequestTime = Date.now() - startTime2;
        
        testResults.push({
          category,
          firstRequest: {
            time: firstRequestTime,
            fromCache: result1.fromCache
          },
          secondRequest: {
            time: secondRequestTime,
            fromCache: result2.fromCache
          },
          speedImprovement: Math.round((firstRequestTime / secondRequestTime) * 100) / 100
        });
      }
      
      result = {
        testResults,
        cacheStats: leaderboardRealtime.getCacheStats(),
        operation: 'test_performance'
      };
      break;
  }

  return result;
}

async function testRealTimeUpdates(userId: string, params: any) {
  const eventSequence = params.eventSequence || ['achievement', 'badge', 'trip'];
  const delay = params.delay || 1000;

  console.log(`⚡ Testing real-time updates for user ${userId}:`, eventSequence);

  const results = [];

  for (let i = 0; i < eventSequence.length; i++) {
    const eventType = eventSequence[i];
    
    try {
      let eventResult;
      
      switch (eventType) {
        case 'achievement':
          eventResult = await simulateAchievementUnlock(userId, {
            achievementType: 'TUNA_MASTER',
            notify: true
          });
          break;
          
        case 'trip':
          eventResult = await simulateTripCompletion(userId, {
            tripCount: 1,
            fishCaught: 5,
            rating: 4.5
          });
          break;
          
        case 'experience':
          eventResult = await simulateExperienceGain(userId, {
            experienceGain: 500
          });
          break;
          
        case 'rating':
          eventResult = await simulateRatingUpdate(userId, {
            newRating: 4.0 + Math.random()
          });
          break;
          
        default:
          eventResult = { message: `Unknown event type: ${eventType}` };
      }
      
      results.push({
        step: i + 1,
        eventType,
        success: true,
        result: eventResult,
        timestamp: new Date().toISOString()
      });
      
      // Wait between events if not the last one
      if (i < eventSequence.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      results.push({
        step: i + 1,
        eventType,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  return {
    userId,
    eventSequence,
    delay,
    results,
    totalEvents: eventSequence.length,
    successfulEvents: results.filter(r => r.success).length,
    cacheStats: leaderboardRealtime.getCacheStats(),
    message: `Completed real-time update test sequence`
  };
}
