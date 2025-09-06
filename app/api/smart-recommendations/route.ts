import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { smartRecommendationsService } from '@/lib/services/smart-recommendations-service';
import { smartRecommendationsServiceV2 } from '@/lib/services/smart-recommendations-service-v2';
import { collaborativeFilteringService } from '@/lib/services/collaborative-filtering-service';
import prisma from '@/lib/prisma';
import { RecommendationType } from '@prisma/client';

// GET - получить персонализированные рекомендации
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    const typesParam = searchParams.get('types');
    const types = typesParam ? typesParam.split(',') as RecommendationType[] : undefined;

    const recommendations = await smartRecommendationsService.getPersonalizedRecommendations(
      session.user.id,
      limit,
      types
    );

    return NextResponse.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });

  } catch (error) {
    console.error('Error fetching smart recommendations:', error);
    return NextResponse.json(
      { message: 'Failed to fetch recommendations', error: error?.toString() },
      { status: 500 }
    );
  }
}

// POST - сгенерировать новые рекомендации
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, weatherData, currentTripId } = body;

    let result;

    switch (type) {
      case 'weather_ai':
        if (!weatherData) {
          return NextResponse.json({ message: 'Weather data required' }, { status: 400 });
        }
        // Используем улучшенную версию с откалиброванными промптами
        result = await smartRecommendationsServiceV2.generateWeatherAIRecommendations(weatherData);
        break;

      case 'history_based':
        result = await smartRecommendationsService.generateHistoryBasedRecommendations(
          session.user.id, 
          currentTripId
        );
        break;

      case 'social_captain':
        // Получаем профиль пользователя для определения skill level
        const userProfile = await getUserProfile(session.user.id);
        result = await smartRecommendationsService.generateSocialRecommendations(
          userProfile.skillLevel,
          userProfile.role
        );
        break;

      case 'collaborative_filtering':
        // Запускаем collaborative filtering алгоритм
        await collaborativeFilteringService.processCollaborativeFiltering();
        result = await collaborativeFilteringService.getRecommendationsForUser(session.user.id);
        break;

      default:
        return NextResponse.json({ message: 'Invalid recommendation type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      result,
      type,
    });

  } catch (error) {
    console.error('Error generating smart recommendations:', error);
    return NextResponse.json(
      { message: 'Failed to generate recommendations', error: error?.toString() },
      { status: 500 }
    );
  }
}

// Вспомогательная функция для получения профиля пользователя
async function getUserProfile(userId: string) {

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fisherProfile: true,
      },
    });

    return {
      role: user?.role || 'PARTICIPANT',
      skillLevel: user?.fisherProfile?.experienceLevel || 'BEGINNER',
    };
  } finally {
    await prisma.$disconnect();
  }
}
