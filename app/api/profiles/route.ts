import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// TypeScript interfaces
interface FisherProfileExtended {
  id: string;
  userId: string;
  user?: {
    id: string;
    name?: string;
    image?: string;
  };
  experienceLevel: string;
  bio?: string;
  rating: number;
  level: number;
  completedTrips: number;
  country?: string;
  city?: string;
  position?: number;
}

// Валидация запроса для создания/обновления профиля
const UpdateProfileSchema = z.object({
  userId: z.string(),
  bio: z.string().max(500).optional(),
  specialties: z.array(z.enum(['DEEP_SEA', 'SHORE', 'FLY_FISHING', 'SPORT_FISHING'])).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  favoriteLocation: z.string().max(200).optional(),
  
  // 🎯 Новые поля системы репутации
  mentorRating: z.number().min(1).max(10).optional(),
  teamworkRating: z.number().min(1).max(10).optional(),
  reliabilityRating: z.number().min(1).max(10).optional(),
  respectRating: z.number().min(1).max(10).optional(),
  totalWeightCaught: z.number().min(0).optional(),
  averageTripDuration: z.number().min(0).optional(),
  successRate: z.number().min(0).max(100).optional(),
  favoriteLocations: z.array(z.string()).optional(),
  fishingZones: z.array(z.string()).optional(),
  
  // JSON поля для сложных данных
  experienceStats: z.record(z.any()).optional(),
  certificates: z.array(z.record(z.any())).optional(),
  fishingPreferences: z.record(z.any()).optional(),
  catchRecords: z.array(z.record(z.any())).optional(),
  techniqueSkills: z.array(z.record(z.any())).optional(),
  seasonalActivity: z.record(z.any()).optional(),
  reviewBreakdown: z.record(z.any()).optional(),
});

/**
 * GET /api/profiles - Получить профили рыболовов
 * 
 * Query params:
 * - userId?: string - конкретный пользователь
 * - limit?: number - количество профилей (default: 20)
 * - orderBy?: 'rating' | 'level' | 'completedTrips' | 'createdAt' - сортировка
 * - country?: string - фильтр по стране
 * - experienceLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT' - фильтр по уровню опыта
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
    const orderBy = searchParams.get('orderBy') || 'rating';
    const country = searchParams.get('country');
    const experienceLevel = searchParams.get('experienceLevel');

    // Если запрашивается конкретный пользователь
    if (userId) {
      const profile = await prisma.fisherProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
          badges: {
            include: {
              fisherProfile: false, // Избегаем циклической ссылки
            },
            orderBy: {
              earnedAt: 'desc',
            },
          },
        },
      });

      if (!profile) {
        return NextResponse.json(
          { error: 'Profile not found' },
          { status: 404 }
        );
      }

      // Получаем достижения пользователя
      const achievements = await prisma.userAchievement.findMany({
        where: { userId },
        include: {
          achievement: true,
        },
        orderBy: {
          unlockedAt: 'desc',
        },
      });

      const profileExtended: FisherProfileExtended = {
        ...profile,
        achievements,
      };

      return NextResponse.json(profileExtended);
    }

    // Фильтры для множественного запроса
    const where: any = {
      isActive: true,
    };

    if (country && country !== 'ALL') {
      where.country = country;
    }

    if (experienceLevel && experienceLevel !== 'ALL') {
      where.experienceLevel = experienceLevel;
    }

    // Определяем сортировку
    let orderByClause: any = { rating: 'desc' };
    switch (orderBy) {
      case 'level':
        orderByClause = { level: 'desc' };
        break;
      case 'completedTrips':
        orderByClause = { completedTrips: 'desc' };
        break;
      case 'createdAt':
        orderByClause = { createdAt: 'desc' };
        break;
    }

    // Получаем профили
    const profiles = await prisma.fisherProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: false, // Не показываем email в списке
          },
        },
        badges: {
          take: 5, // Показываем только топ-5 достижений
          orderBy: {
            earnedAt: 'desc',
          },
        },
        _count: {
          select: {
            badges: true,
          },
        },
      },
      orderBy: orderByClause,
      take: limit,
    });

    // Фильтруем профили с валидными пользователями и добавляем позицию в рейтинге
    const profilesExtended: FisherProfileExtended[] = profiles
      .filter(profile => profile.user) // Фильтруем только профили с валидными пользователями
      .map((profile, index) => ({
        ...profile,
        user: {
          ...profile.user!,
          name: profile.user!.name || 'Неизвестный пользователь',
        },
        position: orderBy === 'rating' ? index + 1 : undefined,
      }));

    return NextResponse.json(profilesExtended);

  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profiles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles - Создать профиль рыболова
 * 
 * Body:
 * - userId: string - ID пользователя
 * - bio?: string - биография
 * - specialties?: FishingSpecialty[] - специализации
 * - country?: string - страна
 * - city?: string - город
 * - latitude?: number - широта
 * - longitude?: number - долгота
 * - favoriteLocation?: string - любимое место для рыбалки
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = UpdateProfileSchema.parse(body);

    // Проверяем, существует ли пользователь
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Проверяем, нет ли уже профиля
    const existingProfile = await prisma.fisherProfile.findUnique({
      where: { userId: data.userId },
    });

    if (existingProfile) {
      return NextResponse.json(
        { error: 'Profile already exists' },
        { status: 409 }
      );
    }

    // Генерируем секретный код для пользователя
    const secretCode = generateSecretCode();

    // Создаем профиль
    const profile = await prisma.fisherProfile.create({
      data: {
        userId: data.userId,
        bio: data.bio,
        specialties: data.specialties || [],
        country: data.country,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        favoriteLocation: data.favoriteLocation,
        secretCode,
        experienceLevel: 'BEGINNER',
        rating: 5.0,
        level: 1,
        activeDays: 1,
        lastActiveAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        badges: true,
      },
    });

    // Инициализируем достижения для нового пользователя
    await initializeUserAchievements(data.userId);

    return NextResponse.json(profile, { status: 201 });

  } catch (error) {
    console.error('Error creating profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profiles - Обновить профиль рыболова
 * 
 * Body: тот же что и для POST
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = UpdateProfileSchema.parse(body);

    // Проверяем существование профиля
    const existingProfile = await prisma.fisherProfile.findUnique({
      where: { userId: data.userId },
    });

    if (!existingProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Обновляем профиль
    const profile = await prisma.fisherProfile.update({
      where: { userId: data.userId },
      data: {
        bio: data.bio,
        specialties: data.specialties,
        country: data.country,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        favoriteLocation: data.favoriteLocation,
        lastActiveAt: new Date(),
        
        // 🎯 Новые поля системы репутации
        ...(data.mentorRating && { mentorRating: data.mentorRating }),
        ...(data.teamworkRating && { teamworkRating: data.teamworkRating }),
        ...(data.reliabilityRating && { reliabilityRating: data.reliabilityRating }),
        ...(data.respectRating && { respectRating: data.respectRating }),
        ...(data.totalWeightCaught !== undefined && { totalWeightCaught: data.totalWeightCaught }),
        ...(data.averageTripDuration !== undefined && { averageTripDuration: data.averageTripDuration }),
        ...(data.successRate !== undefined && { successRate: data.successRate }),
        ...(data.favoriteLocations && { favoriteLocations: data.favoriteLocations }),
        ...(data.fishingZones && { fishingZones: data.fishingZones }),
        
        // JSON поля для сложных данных 
        ...(data.experienceStats && { experienceStats: data.experienceStats }),
        ...(data.certificates && { certificates: data.certificates }),
        ...(data.fishingPreferences && { fishingPreferences: data.fishingPreferences }),
        ...(data.catchRecords && { catchRecords: data.catchRecords }),
        ...(data.techniqueSkills && { techniqueSkills: data.techniqueSkills }),
        ...(data.seasonalActivity && { seasonalActivity: data.seasonalActivity }),
        ...(data.reviewBreakdown && { reviewBreakdown: data.reviewBreakdown }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
        badges: {
          orderBy: {
            earnedAt: 'desc',
          },
        },
      },
    });

    return NextResponse.json(profile);

  } catch (error) {
    console.error('Error updating profile:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

/**
 * Генерирует уникальный секретный код для пользователя
 */
function generateSecretCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Исключены похожие символы
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Инициализирует достижения для нового пользователя
 */
async function initializeUserAchievements(userId: string) {
  try {
    // Вызываем POST endpoint достижений для инициализации
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/achievements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      console.error('Failed to initialize achievements for user:', userId);
    }
  } catch (error) {
    console.error('Error initializing achievements:', error);
    // Не блокируем создание профиля если инициализация достижений не удалась
  }
}