import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  AchievementTrigger,
  ALL_ACHIEVEMENTS,
  AchievementWithProgress,
  SetAchievementProgressResponse
} from '@/lib/types/achievements';

/**
 * Real-Time Achievement Progress Tracking API
 * Task 21.1: Achievement Progress Tracking API - Enhanced with real-time capabilities
 * 
 * Automatically tracks user actions and updates achievement progress in real-time
 */

// Валидация для автоматического отслеживания достижений
const AchievementTriggerSchema = z.object({
  userId: z.string().cuid(),
  event: z.enum([
    'trip_completed',
    'fish_caught', 
    'technique_used',
    'review_left',
    'event_created',
    'user_helped',
    'location_visited'
  ]),
  data: z.record(z.any()),
});

// Валидация для manual tracking
const ManualTrackSchema = z.object({
  userId: z.string().cuid(),
  achievementType: z.string(),
  increment: z.number().min(1).default(1),
  notify: z.boolean().default(true)
});

/**
 * POST /api/achievements/track - Автоматическое отслеживание достижений по событиям
 * 
 * Body:
 * - userId: string - ID пользователя
 * - event: string - тип события
 * - data: object - данные события
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, event, data } = AchievementTriggerSchema.parse(body);

    console.log(`🎯 Processing achievement trigger: ${event} for user ${userId}`);

    // Получаем пользователя и проверяем его существование
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'user_not_found'
      }, { status: 404 });
    }

    // Определяем какие достижения нужно обновить на основе события
    const achievementsToUpdate = await determineAchievementsToUpdate(event, data);
    
    if (achievementsToUpdate.length === 0) {
      console.log(`ℹ️ No achievements to update for event: ${event}`);
      return NextResponse.json({
        success: true,
        message: 'No achievements affected by this event',
        updated: []
      });
    }

    // Обновляем прогресс достижений
    const updatedAchievements = await Promise.all(
      achievementsToUpdate.map(async ({ achievementType, increment }) => {
        return await updateAchievementProgress(userId, achievementType, increment);
      })
    );

    // Фильтруем только успешные обновления
    const successfulUpdates = updatedAchievements.filter(result => result.success);
    const newlyUnlocked = successfulUpdates.filter(result => result.newlyUnlocked);

    // Отправляем real-time уведомления о новых достижениях
    if (newlyUnlocked.length > 0) {
      await sendRealTimeNotifications(userId, newlyUnlocked);
    }

    console.log(`✅ Updated ${successfulUpdates.length} achievements, ${newlyUnlocked.length} newly unlocked`);

    return NextResponse.json({
      success: true,
      updated: successfulUpdates,
      newlyUnlocked: newlyUnlocked.length,
      message: `Processed ${achievementsToUpdate.length} achievement updates`
    });

  } catch (error) {
    console.error('❌ Error tracking achievements:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to track achievements'
    }, { status: 500 });
  }
}

/**
 * PUT /api/achievements/track - Ручное отслеживание конкретного достижения
 * 
 * Body:
 * - userId: string - ID пользователя
 * - achievementType: string - тип достижения
 * - increment: number - на сколько увеличить прогресс
 * - notify: boolean - отправлять ли уведомления
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, achievementType, increment, notify } = ManualTrackSchema.parse(body);

    console.log(`🎯 Manual tracking: ${achievementType} +${increment} for user ${userId}`);

    // Обновляем прогресс конкретного достижения
    const result = await updateAchievementProgress(userId, achievementType, increment);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: result.status || 400 });
    }

    // Отправляем уведомление если достижение разблокировано
    if (result.newlyUnlocked && notify) {
      await sendRealTimeNotifications(userId, [result]);
    }

    console.log(`✅ Manual achievement update completed: ${achievementType}`);

    return NextResponse.json({
      success: true,
      achievement: result.achievement,
      newlyUnlocked: result.newlyUnlocked
    });

  } catch (error) {
    console.error('❌ Error in manual achievement tracking:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Failed to manually track achievement'
    }, { status: 500 });
  }
}

/**
 * Определяет какие достижения нужно обновить на основе события
 */
async function determineAchievementsToUpdate(
  event: string, 
  data: Record<string, any>
): Promise<Array<{ achievementType: string; increment: number }>> {
  const updates: Array<{ achievementType: string; increment: number }> = [];

  switch (event) {
    case 'fish_caught':
      // Достижения за виды рыб
      if (data.fishSpecies) {
        const speciesMap: Record<string, string> = {
          'tuna': 'TUNA_MASTER',
          'dorado': 'DORADO_HUNTER', 
          'seabass': 'SEABASS_EXPERT',
          'marlin': 'MARLIN_LEGEND'
        };
        
        const achievementType = speciesMap[data.fishSpecies.toLowerCase()];
        if (achievementType) {
          updates.push({ achievementType, increment: 1 });
        }
      }
      
      // Коллекционер видов - отслеживаем уникальные виды
      if (data.isNewSpecies) {
        updates.push({ achievementType: 'SPECIES_COLLECTOR', increment: 1 });
      }
      break;

    case 'technique_used':
      // Достижения за техники
      const techniqueMap: Record<string, string> = {
        'trolling': 'TROLLING_EXPERT',
        'jigging': 'JIGGING_MASTER',
        'bottom_fishing': 'BOTTOM_FISHING_PRO',
        'fly_fishing': 'FLY_FISHING_ARTIST'
      };
      
      const technique = data.technique?.toLowerCase();
      if (technique && techniqueMap[technique]) {
        updates.push({ achievementType: techniqueMap[technique], increment: 1 });
      }
      
      // Универсал техник - отслеживаем уникальные техники
      if (data.isNewTechnique) {
        updates.push({ achievementType: 'TECHNIQUE_VERSATILE', increment: 1 });
      }
      break;

    case 'trip_completed':
      // Социальные достижения
      if (data.wasReliable === true) {
        updates.push({ achievementType: 'RELIABLE_FISHER', increment: 1 });
      }
      
      // Географические достижения  
      const locationMap: Record<string, string> = {
        'reef': 'REEF_EXPLORER',
        'deep_sea': 'DEEP_SEA_ADVENTURER',
        'coastal': 'COASTAL_SPECIALIST'
      };
      
      const location = data.locationType?.toLowerCase();
      if (location && locationMap[location]) {
        updates.push({ achievementType: locationMap[location], increment: 1 });
      }
      break;

    case 'review_left':
      updates.push({ achievementType: 'REVIEW_MASTER', increment: 1 });
      break;

    case 'event_created':
      updates.push({ achievementType: 'GROUP_ORGANIZER', increment: 1 });
      break;

    case 'user_helped':
      if (data.helpType === 'newbie_mentoring') {
        updates.push({ achievementType: 'NEWBIE_MENTOR', increment: 1 });
      }
      break;

    case 'location_visited':
      // Путешественник - уникальные локации
      if (data.isNewLocation) {
        updates.push({ achievementType: 'WORLD_TRAVELER', increment: 1 });
      }
      
      // Местный эксперт - одна локация
      if (data.locationId) {
        updates.push({ achievementType: 'LOCAL_EXPERT', increment: 1 });
      }
      break;
  }

  return updates;
}

/**
 * Обновляет прогресс конкретного достижения
 */
async function updateAchievementProgress(
  userId: string, 
  achievementType: string, 
  increment: number
) {
  try {
    // Находим достижение
    const achievement = await prisma.achievement.findUnique({
      where: { type: achievementType as any }
    });

    if (!achievement) {
      return {
        success: false,
        error: 'achievement_not_found',
        status: 404
      };
    }

    // Находим или создаем запись прогресса пользователя
    let userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id
        }
      }
    });

    if (!userAchievement) {
      userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          progress: 0,
          unlocked: false
        }
      });
    }

    // Проверяем, не разблокировано ли уже достижение
    if (userAchievement.unlocked) {
      return {
        success: true,
        newlyUnlocked: false,
        achievement: null,
        message: 'Already unlocked'
      };
    }

    // Вычисляем новый прогресс
    const newProgress = Math.min(
      userAchievement.progress + increment, 
      achievement.maxProgress
    );
    
    // Проверяем, нужно ли разблокировать
    const shouldUnlock = newProgress >= achievement.maxProgress;
    const wasUnlocked = userAchievement.unlocked;

    // Обновляем прогресс
    const updatedUserAchievement = await prisma.userAchievement.update({
      where: { id: userAchievement.id },
      data: {
        progress: newProgress,
        unlocked: shouldUnlock,
        unlockedAt: shouldUnlock && !wasUnlocked ? new Date() : userAchievement.unlockedAt
      }
    });

    // Формируем результат
    const achievementWithProgress: AchievementWithProgress = {
      ...achievement,
      userProgress: updatedUserAchievement,
      unlocked: updatedUserAchievement.unlocked,
      progress: updatedUserAchievement.progress,
      progressPercent: Math.min(100, (updatedUserAchievement.progress / achievement.maxProgress) * 100)
    };

    // Логируем если достижение разблокировано
    if (shouldUnlock && !wasUnlocked) {
      console.log(`🏆 Achievement unlocked: ${achievement.name} for user ${userId}`);
      
      // Обновляем статистику пользователя
      await updateUserExperience(userId, achievement.rarity);
    }

    return {
      success: true,
      newlyUnlocked: shouldUnlock && !wasUnlocked,
      achievement: achievementWithProgress,
      progressDelta: increment
    };

  } catch (error) {
    console.error(`❌ Error updating achievement ${achievementType}:`, error);
    return {
      success: false,
      error: 'update_failed',
      status: 500
    };
  }
}

/**
 * Обновляет опыт пользователя при разблокировке достижения
 */
async function updateUserExperience(userId: string, rarity: any) {
  try {
    // Определяем бонус опыта по редкости
    const experienceBonus = {
      'COMMON': 50,
      'UNCOMMON': 100,
      'RARE': 200,
      'EPIC': 400,
      'LEGENDARY': 800,
      'MYTHIC': 1600
    }[rarity] || 100;

    // Обновляем профиль рыболова
    await prisma.fisherProfile.upsert({
      where: { userId },
      update: {
        experiencePoints: { increment: experienceBonus },
        lastActiveAt: new Date()
      },
      create: {
        userId,
        experienceLevel: 'BEGINNER',
        experiencePoints: experienceBonus,
        level: 1,
        activeDays: 1,
        lastActiveAt: new Date()
      }
    });

    console.log(`✨ Added ${experienceBonus} XP for ${rarity} achievement unlock`);
  } catch (error) {
    console.error('❌ Error updating user experience:', error);
  }
}

/**
 * Отправляет real-time уведомления о разблокированных достижениях
 */
async function sendRealTimeNotifications(userId: string, achievements: any[]) {
  try {
    // Отправляем через SSE систему
    const achievementData = achievements.map(a => ({
      name: a.achievement?.name || 'Unknown Achievement',
      description: a.achievement?.description,
      icon: a.achievement?.icon || '🏆',
      rarity: a.achievement?.rarity || 'COMMON',
      progressPercent: 100
    }));

    if (achievementData.length > 0) {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          type: 'achievement_unlocked',
          data: {
            achievements: achievementData,
            totalUnlocked: achievementData.length
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`📢 Achievement notifications sent: ${result.sent} connections`);
      } else {
        console.error('❌ Failed to send achievement notifications');
      }
    }

    // Теперь также проверяем badges для разблокированных достижений
    await checkBadgesForUnlockedAchievements(userId, achievements);
    
    // Обновляем leaderboard для разблокированных достижений
    await updateLeaderboardForAchievements(userId, achievements);
  } catch (error) {
    console.error('❌ Error sending real-time notifications:', error);
  }
}

/**
 * Проверяет и присваивает badges после разблокировки достижений
 */
async function checkBadgesForUnlockedAchievements(userId: string, achievements: any[]) {
  try {
    const { checkBadgesAfterAchievement } = await import('@/lib/services/badge-integration');
    
    // Проверяем badges для каждого разблокированного достижения
    for (const achievement of achievements) {
      if (achievement.achievement?.type) {
        console.log(`🎖️ Checking badges for achievement: ${achievement.achievement.type}`);
        
        const result = await checkBadgesAfterAchievement(
          userId,
          achievement.achievement.type,
          {
            notify: true,
            reason: `Achievement unlocked: ${achievement.achievement.name}`
          }
        );

        if (result.success && result.badgesAwarded > 0) {
          console.log(`🏆 Awarded ${result.badgesAwarded} badges for achievement ${achievement.achievement.type}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error checking badges for unlocked achievements:', error);
  }
}

/**
 * Обновляет leaderboard после разблокировки достижений
 */
async function updateLeaderboardForAchievements(userId: string, achievements: any[]) {
  try {
    const { updateLeaderboardForAchievement } = await import('@/lib/services/leaderboard-realtime');
    
    // Обновляем leaderboard для каждого разблокированного достижения
    for (const achievement of achievements) {
      if (achievement.achievement?.type) {
        console.log(`📊 Updating leaderboard for achievement: ${achievement.achievement.type}`);
        
        await updateLeaderboardForAchievement(userId, achievement.achievement.type);
      }
    }
  } catch (error) {
    console.error('❌ Error updating leaderboard for achievements:', error);
  }
}
