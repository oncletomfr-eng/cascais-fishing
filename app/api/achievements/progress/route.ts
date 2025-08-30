import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@prisma/client';
import { 
  SetAchievementProgressRequest,
  SetAchievementProgressResponse,
  AchievementWithProgress,
} from '@/lib/types/achievements';

// Валидация запроса для установки прогресса достижения
const SetProgressSchema = z.object({
  userId: z.string().cuid(),
  achievementType: z.string(),
  progress: z.number().min(0),
});

/**
 * POST /api/achievements/progress - Установить прогресс достижения
 * 
 * Body:
 * - userId: string - ID пользователя
 * - achievementType: AchievementType - тип достижения
 * - progress: number - новый прогресс (0 или больше)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, achievementType, progress } = SetProgressSchema.parse(body);

    // Находим достижение
    const achievement = await prisma.achievement.findUnique({
      where: { type: achievementType as any },
    });

    if (!achievement) {
      const response: SetAchievementProgressResponse = {
        success: false,
        error: 'achievement_not_found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Находим или создаем запись прогресса пользователя
    let userAchievement = await prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
    });

    if (!userAchievement) {
      // Создаем новую запись прогресса
      userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          progress: 0,
          unlocked: false,
        },
      });
    }

    // Проверяем, не разблокировано ли уже достижение
    if (userAchievement.unlocked) {
      const response: SetAchievementProgressResponse = {
        success: false,
        error: 'already_unlocked',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Проверяем, изменился ли прогресс
    if (userAchievement.progress === progress) {
      const achievementWithProgress: AchievementWithProgress = {
        ...achievement,
        userProgress: userAchievement,
        unlocked: userAchievement.unlocked,
        progress: userAchievement.progress,
        progressPercent: Math.min(100, (userAchievement.progress / achievement.maxProgress) * 100),
      };

      const response: SetAchievementProgressResponse = {
        success: true,
        achievement: achievementWithProgress,
      };
      return NextResponse.json(response);
    }

    // Валидируем прогресс
    if (progress < 0) {
      const response: SetAchievementProgressResponse = {
        success: false,
        error: 'progress_invalid',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Определяем, нужно ли разблокировать достижение
    const shouldUnlock = progress >= achievement.maxProgress;
    const finalProgress = Math.min(progress, achievement.maxProgress);

    // Обновляем прогресс
    const updatedUserAchievement = await prisma.userAchievement.update({
      where: {
        id: userAchievement.id,
      },
      data: {
        progress: finalProgress,
        unlocked: shouldUnlock,
        unlockedAt: shouldUnlock ? new Date() : userAchievement.unlockedAt,
      },
    });

    // Если достижение разблокировано, обновляем статистику пользователя
    if (shouldUnlock && !userAchievement.unlocked) {
      await updateUserStats(userId, 'achievement_unlocked');
      
      // Логируем разблокировку
      console.log(`🏆 Achievement unlocked: ${achievement.name} for user ${userId}`);
    }

    // Формируем ответ
    const achievementWithProgress: AchievementWithProgress = {
      ...achievement,
      userProgress: updatedUserAchievement,
      unlocked: updatedUserAchievement.unlocked,
      progress: updatedUserAchievement.progress,
      progressPercent: Math.min(100, (updatedUserAchievement.progress / achievement.maxProgress) * 100),
    };

    const response: SetAchievementProgressResponse = {
      success: true,
      achievement: achievementWithProgress,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error setting achievement progress:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    const response: SetAchievementProgressResponse = {
      success: false,
      error: 'user_not_found',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * PUT /api/achievements/progress - Увеличить прогресс достижения на указанную величину
 * 
 * Body:
 * - userId: string - ID пользователя  
 * - achievementType: AchievementType - тип достижения
 * - increment: number - на сколько увеличить прогресс
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, achievementType, increment } = z.object({
      userId: z.string().cuid(),
      achievementType: z.string(),
      increment: z.number().min(1),
    }).parse(body);

    // Получаем текущий прогресс
    const userAchievement = await prisma.userAchievement.findFirst({
      where: {
        userId,
        achievement: {
          type: achievementType as any,
        },
      },
      include: {
        achievement: true,
      },
    });

    if (!userAchievement) {
      const response: SetAchievementProgressResponse = {
        success: false,
        error: 'achievement_not_found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Увеличиваем прогресс
    const newProgress = userAchievement.progress + increment;
    
    // Используем POST endpoint для установки нового прогресса
    const setProgressRequest: SetAchievementProgressRequest = {
      userId,
      achievementType: achievementType as any,
      progress: newProgress,
    };

    // Рекурсивно вызываем POST метод
    const postRequest = new NextRequest(request.url.replace('PUT', 'POST'), {
      method: 'POST',
      body: JSON.stringify(setProgressRequest),
      headers: request.headers,
    });

    return await POST(postRequest);

  } catch (error) {
    console.error('Error incrementing achievement progress:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    const response: SetAchievementProgressResponse = {
      success: false,
      error: 'user_not_found',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

/**
 * Обновляет статистику пользователя при разблокировке достижений
 */
async function updateUserStats(userId: string, event: 'achievement_unlocked') {
  try {
    // Находим или создаем профиль рыболова
    let fisherProfile = await prisma.fisherProfile.findUnique({
      where: { userId },
    });

    if (!fisherProfile) {
      fisherProfile = await prisma.fisherProfile.create({
        data: {
          userId,
          experienceLevel: 'BEGINNER',
          activeDays: 1,
          lastActiveAt: new Date(),
        },
      });
    }

    // Обновляем очки опыта и уровень при разблокировке достижения
    if (event === 'achievement_unlocked') {
      const experienceBonus = 100; // Бонус за разблокировку достижения
      const newExperiencePoints = fisherProfile.experiencePoints + experienceBonus;
      
      // Простая формула уровня: level = floor(experiencePoints / 1000) + 1
      const newLevel = Math.floor(newExperiencePoints / 1000) + 1;
      
      await prisma.fisherProfile.update({
        where: { userId },
        data: {
          experiencePoints: newExperiencePoints,
          level: Math.max(fisherProfile.level, newLevel),
          lastActiveAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error updating user stats:', error);
    // Не блокируем основную операцию если обновление статистики не удалось
  }
}
