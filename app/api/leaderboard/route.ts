import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// TypeScript interfaces
interface LeaderboardPlayer {
  position: number;
  userId: string;
  name: string;
  avatar?: string | null;
  rating: number;
  level: number;
  completedTrips: number;
  totalFishCaught: number;
  achievementsCount: number;
  isAnonymous?: boolean;
}

interface FetchLeaderboardResponse {
  players: LeaderboardPlayer[];
  currentUserPosition?: number;
  totalPlayers: number;
}

// Валидация запроса для получения рейтинга
const FetchLeaderboardSchema = z.object({
  orderBy: z.enum(['rating', 'level', 'completedTrips', 'totalFishCaught', 'achievementsCount']),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
  limit: z.number().min(1).max(100).default(50),
  showNearestTo: z.string().cuid().optional(),
});

/**
 * GET /api/leaderboard - Получить рейтинг игроков
 * 
 * Query params:
 * - orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount'
 * - order?: 'ASC' | 'DESC' (default: 'DESC')
 * - limit?: number (default: 50, max: 100)
 * - showNearestTo?: string - userId для показа ближайших игроков
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = {
      orderBy: searchParams.get('orderBy') as any,
      order: (searchParams.get('order') || 'DESC') as 'ASC' | 'DESC',
      limit: Number(searchParams.get('limit')) || 50,
      showNearestTo: searchParams.get('showNearestTo') || undefined,
    };

    // Валидация параметров
    const validatedQuery = FetchLeaderboardSchema.parse(query);

    // Получаем сессию пользователя для проверки приватности
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // Подготавливаем запрос для сортировки
    const orderByField = getOrderByField(validatedQuery.orderBy);
    
    // Получаем профили с учетом настроек приватности
    const profiles = await prisma.fisherProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            badges: true,
          },
        },
      },
      orderBy: orderByField,
      take: validatedQuery.limit,
      where: {
        isActive: true,
        // Фильтруем профили по настройкам приватности
        OR: [
          // Публичные профили
          { leaderboardVisibility: 'PUBLIC' },
          // Анонимные профили (показываем их тоже)  
          { leaderboardVisibility: 'ANONYMOUS' },
          // Если пользователь авторизован, показываем его собственный профиль
          ...(currentUserId ? [{ userId: currentUserId }] : []),
          // TODO: добавить логику для друзей когда будет система друзей
        ],
      },
    });

    // Формируем данные игроков для рейтинга
    const players: LeaderboardPlayer[] = profiles
      .filter(profile => profile.user) // Фильтруем только профили с валидными пользователями
      .map((profile, index) => {
        // Проверяем анонимность профиля
        const isAnonymous = profile.leaderboardVisibility === 'ANONYMOUS' && 
                           profile.userId !== currentUserId;
        
        return {
          position: index + 1,
          userId: profile.userId,
          name: isAnonymous ? 'Анонимный игрок' : (profile.user.name || 'Неизвестный пользователь'),
          avatar: isAnonymous ? null : (profile.user.image || null),
          rating: Number(profile.rating),
          level: profile.level,
          completedTrips: profile.completedTrips,
          totalFishCaught: profile.totalFishCaught,
          achievementsCount: profile._count?.badges || 0,
          isAnonymous,
        };
      });

    // Если нужно показать ближайших игроков к конкретному пользователю
    let currentUserPosition: number | undefined;
    if (validatedQuery.showNearestTo) {
      currentUserPosition = await getCurrentUserPosition(
        validatedQuery.showNearestTo,
        orderByField
      );
    }

    // Общее количество игроков
    const totalPlayers = await prisma.fisherProfile.count({
      where: {
        isActive: true,
      },
    });

    const response: FetchLeaderboardResponse = {
      players,
      currentUserPosition,
      totalPlayers,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leaderboard/player-rating - Получить позицию конкретного игрока и ближайших
 * 
 * Body:
 * - userId: string - ID пользователя
 * - orderBy: string - критерий сортировки
 * - order?: string - порядок сортировки
 * - showNearest?: number - количество ближайших игроков (по умолчанию 5)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, orderBy, order = 'DESC', showNearest = 5 } = z.object({
      userId: z.string().cuid(),
      orderBy: z.enum(['rating', 'level', 'completedTrips', 'totalFishCaught', 'achievementsCount']),
      order: z.enum(['ASC', 'DESC']).default('DESC'),
      showNearest: z.number().min(1).max(10).default(5),
    }).parse(body);

    const orderByField = getOrderByField(orderBy);
    
    // Получаем профиль игрока
    const playerProfile = await prisma.fisherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            badges: true,
          },
        },
      },
    });

    if (!playerProfile) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Получаем позицию игрока
    const position = await getCurrentUserPosition(userId, orderByField);
    
    // Получаем игроков выше текущего игрока
    const abovePlayers = await getPlayersAroundPosition(
      orderByField,
      position - showNearest,
      showNearest,
      order
    );

    // Получаем игроков ниже текущего игрока
    const belowPlayers = await getPlayersAroundPosition(
      orderByField,
      position + 1,
      showNearest,
      order
    );

    // Формируем данные текущего игрока
    const player: LeaderboardPlayer = {
      position: position || 0,
      userId: playerProfile.userId,
      name: playerProfile.user?.name || 'Неизвестный пользователь',
      avatar: playerProfile.user?.image || null,
      rating: Number(playerProfile.rating),
      level: playerProfile.level,
      completedTrips: playerProfile.completedTrips,
      totalFishCaught: playerProfile.totalFishCaught,
      achievementsCount: playerProfile._count?.badges || 0,
    };

    return NextResponse.json({
      player,
      fields: [orderBy], // Поля, используемые для сортировки
      abovePlayers,
      belowPlayers,
    });

  } catch (error) {
    console.error('Error fetching player rating:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch player rating' },
      { status: 500 }
    );
  }
}

/**
 * Преобразует строковое значение orderBy в Prisma orderBy объект
 */
function getOrderByField(orderBy: string) {
  switch (orderBy) {
    case 'rating':
      return { rating: 'desc' as const };
    case 'level':
      return { level: 'desc' as const };
    case 'completedTrips':
      return { completedTrips: 'desc' as const };
    case 'totalFishCaught':
      return { totalFishCaught: 'desc' as const };
    case 'achievementsCount':
      return { badges: { _count: 'desc' as const } };
    default:
      return { rating: 'desc' as const };
  }
}

/**
 * Получает позицию текущего пользователя в рейтинге
 */
async function getCurrentUserPosition(userId: string, orderByField: any): Promise<number | undefined> {
  try {
    // Получаем профиль пользователя
    const userProfile = await prisma.fisherProfile.findUnique({
      where: { userId },
    });

    if (!userProfile) return undefined;

    // Считаем количество игроков с лучшими результатами
    let betterPlayersCount = 0;

    if ('rating' in orderByField) {
      betterPlayersCount = await prisma.fisherProfile.count({
        where: {
          rating: { gt: userProfile.rating },
          isActive: true,
        },
      });
    } else if ('level' in orderByField) {
      betterPlayersCount = await prisma.fisherProfile.count({
        where: {
          level: { gt: userProfile.level },
          isActive: true,
        },
      });
    } else if ('completedTrips' in orderByField) {
      betterPlayersCount = await prisma.fisherProfile.count({
        where: {
          completedTrips: { gt: userProfile.completedTrips },
          isActive: true,
        },
      });
    } else if ('totalFishCaught' in orderByField) {
      betterPlayersCount = await prisma.fisherProfile.count({
        where: {
          totalFishCaught: { gt: userProfile.totalFishCaught },
          isActive: true,
        },
      });
    }

    return betterPlayersCount + 1;
  } catch (error) {
    console.error('Error getting user position:', error);
    return undefined;
  }
}

/**
 * Получает игроков вокруг определенной позиции
 */
async function getPlayersAroundPosition(
  orderByField: any,
  startPosition: number,
  count: number,
  order: 'ASC' | 'DESC'
): Promise<LeaderboardPlayer[]> {
  try {
    if (startPosition < 1) return [];

    const profiles = await prisma.fisherProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            badges: true,
          },
        },
      },
      orderBy: orderByField,
      skip: startPosition - 1,
      take: count,
    });

    return profiles
      .filter(profile => profile.user) // Фильтруем только профили с валидными пользователями
      .map((profile, index) => ({
        position: startPosition + index,
        userId: profile.userId,
        name: profile.user.name || 'Неизвестный пользователь',
        avatar: profile.user.image || null,
        rating: Number(profile.rating),
        level: profile.level,
        completedTrips: profile.completedTrips,
        totalFishCaught: profile.totalFishCaught,
        achievementsCount: profile._count?.badges || 0,
      }));
  } catch (error) {
    console.error('Error getting players around position:', error);
    return [];
  }
}
