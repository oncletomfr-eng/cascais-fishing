import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Схема валидации для обновления настроек приватности
const PrivacySettingsSchema = z.object({
  leaderboardVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'ANONYMOUS']).optional(),
  profileVisibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE', 'LIMITED']).optional(),
  showInCompetitions: z.boolean().optional(),
  showRankingHistory: z.boolean().optional(),
  allowAchievementSharing: z.boolean().optional(),
  anonymousMode: z.boolean().optional(),
  visibleToFriendsOnly: z.boolean().optional(),
  competitionOptOuts: z.array(z.string()).optional(),
});

type PrivacySettingsData = z.infer<typeof PrivacySettingsSchema>;

/**
 * GET /api/privacy-settings - Получить текущие настройки приватности пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Получаем профиль рыболова с настройками приватности
    const fisherProfile = await prisma.fisherProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        leaderboardVisibility: true,
        profileVisibility: true,
        showInCompetitions: true,
        showRankingHistory: true,
        allowAchievementSharing: true,
        anonymousMode: true,
        visibleToFriendsOnly: true,
        competitionOptOuts: true,
      },
    });

    if (!fisherProfile) {
      return NextResponse.json(
        { error: 'Fisher profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: fisherProfile
    });

  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/privacy-settings - Обновить настройки приватности пользователя
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = PrivacySettingsSchema.parse(body);

    // Обновляем настройки приватности профиля
    const updatedProfile = await prisma.fisherProfile.update({
      where: { userId: session.user.id },
      data: validatedData,
      select: {
        leaderboardVisibility: true,
        profileVisibility: true,
        showInCompetitions: true,
        showRankingHistory: true,
        allowAchievementSharing: true,
        anonymousMode: true,
        visibleToFriendsOnly: true,
        competitionOptOuts: true,
      },
    });

    return NextResponse.json({
      settings: updatedProfile
    });

  } catch (error) {
    console.error('Error updating privacy settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/privacy-settings/reset - Сбросить настройки приватности к значениям по умолчанию
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      // Сбрасываем настройки к значениям по умолчанию
      const resetProfile = await prisma.fisherProfile.update({
        where: { userId: session.user.id },
        data: {
          leaderboardVisibility: 'PUBLIC',
          profileVisibility: 'PUBLIC', 
          showInCompetitions: true,
          showRankingHistory: true,
          allowAchievementSharing: true,
          anonymousMode: false,
          visibleToFriendsOnly: false,
          competitionOptOuts: [],
        },
        select: {
          leaderboardVisibility: true,
          profileVisibility: true,
          showInCompetitions: true,
          showRankingHistory: true,
          allowAchievementSharing: true,
          anonymousMode: true,
          visibleToFriendsOnly: true,
          competitionOptOuts: true,
        },
      });

      return NextResponse.json({
        settings: resetProfile
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error resetting privacy settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
