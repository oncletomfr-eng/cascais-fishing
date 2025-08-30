import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// TypeScript interfaces
interface AchievementWithProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlocked: boolean;
  progress: number;
  progressPercent: number;
}

interface FetchUserAchievementsResponse {
  achievements: AchievementWithProgress[];
  stats: {
    total: number;
    unlocked: number;
    progress: number;
  };
}

// Валидация запроса для получения достижений пользователя
const FetchUserAchievementsSchema = z.object({
  userId: z.string().optional(),
  category: z.enum([
    'ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL', 
    'FISH_SPECIES', 'TECHNIQUE', 'SOCIAL', 'GEOGRAPHY'
  ]).optional(),
  unlockedOnly: z.boolean().optional().default(false),
});

/**
 * GET /api/achievements - Получить достижения пользователя
 * 
 * Query params:
 * - userId: string (required) - ID пользователя
 * - category?: BadgeCategory - фильтр по категории
 * - unlockedOnly?: boolean - только разблокированные
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      userId: searchParams.get('userId'),
      category: searchParams.get('category') || undefined,
      unlockedOnly: searchParams.get('unlockedOnly') === 'true',
    };

    // Валидация параметров
    const validatedQuery = FetchUserAchievementsSchema.parse(query);

    // Получаем пользователя и его достижения
    const user = await prisma.user.findUnique({
      where: { id: validatedQuery.userId },
      include: {
        achievements: {
          include: {
            achievement: true,
          },
          ...(validatedQuery.category && {
            where: {
              achievement: {
                category: validatedQuery.category,
              },
            },
          }),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Получаем все существующие достижения из базы
    const allAchievements = await prisma.achievement.findMany({
      where: validatedQuery.category 
        ? { category: validatedQuery.category }
        : undefined,
      orderBy: [
        { category: 'asc' },
        { rarity: 'desc' },
        { name: 'asc' },
      ],
    });

    // Создаем Map для быстрого доступа к пользовательским достижениям
    const userAchievementsMap = new Map(
      user.achievements.map(ua => [ua.achievementId, ua])
    );

    // Формируем результат с прогрессом
    const achievementsWithProgress: AchievementWithProgress[] = allAchievements
      .map(achievement => {
        const userAchievement = userAchievementsMap.get(achievement.id);
        const progress = userAchievement?.progress || 0;
        const unlocked = userAchievement?.unlocked || false;
        
        return {
          ...achievement,
          userProgress: userAchievement,
          unlocked,
          progress,
          progressPercent: Math.min(100, (progress / achievement.maxProgress) * 100),
        };
      })
      .filter(achievement => 
        !validatedQuery.unlockedOnly || achievement.unlocked
      );

    // Статистика
    const totalAchievements = achievementsWithProgress.length;
    const unlockedAchievements = achievementsWithProgress.filter(a => a.unlocked).length;
    const totalProgressPercent = totalAchievements > 0 
      ? (unlockedAchievements / totalAchievements) * 100 
      : 0;

    const response: FetchUserAchievementsResponse = {
      achievements: achievementsWithProgress,
      stats: {
        total: totalAchievements,
        unlocked: unlockedAchievements,
        progress: Math.round(totalProgressPercent),
      },
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching user achievements:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch user achievements' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/achievements - Инициализировать достижения для нового пользователя
 * 
 * Body:
 * - userId: string - ID пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = z.object({
      userId: z.string(),
    }).parse(body);

    // Проверяем существование пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Создаем все достижения если их нет в базе (используем существующие в БД)
    const existingAchievements = await prisma.achievement.findMany();

    // Получаем все достижения
    const allAchievements = existingAchievements;

    // Проверяем какие достижения уже есть у пользователя
    const existingUserAchievements = await prisma.userAchievement.findMany({
      where: { userId },
    });
    const existingAchievementIds = new Set(existingUserAchievements.map(ua => ua.achievementId));

    // Создаем записи для отслеживания прогресса новых достижений
    const userAchievementsToCreate = allAchievements
      .filter(achievement => !existingAchievementIds.has(achievement.id))
      .map(achievement => ({
        userId,
        achievementId: achievement.id,
        progress: 0,
        unlocked: false,
      }));

    if (userAchievementsToCreate.length > 0) {
      await prisma.userAchievement.createMany({
        data: userAchievementsToCreate,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Achievements initialized',
      created: {
        achievements: 0,
        userAchievements: userAchievementsToCreate.length,
      },
    });

  } catch (error) {
    console.error('Error initializing achievements:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initialize achievements' },
      { status: 500 }
    );
  }
}
