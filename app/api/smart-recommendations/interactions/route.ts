import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient, RecommendationInteractionType } from '@prisma/client';

const prisma = new PrismaClient();

// POST - записать взаимодействие пользователя с рекомендацией
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { 
      recommendationId, 
      interactionType, 
      sessionId, 
      deviceType, 
      userAgent, 
      result, 
      satisfaction, 
      feedback 
    } = body;

    if (!recommendationId || !interactionType) {
      return NextResponse.json({ 
        message: 'recommendationId and interactionType are required' 
      }, { status: 400 });
    }

    // Проверяем, существует ли рекомендация
    const recommendation = await prisma.smartRecommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return NextResponse.json({ 
        message: 'Recommendation not found' 
      }, { status: 404 });
    }

    // Записываем взаимодействие
    const interaction = await prisma.recommendationInteraction.create({
      data: {
        userId: session.user.id,
        recommendationId,
        interactionType: interactionType as RecommendationInteractionType,
        sessionId,
        deviceType,
        userAgent: userAgent || req.headers.get('user-agent') || undefined,
        result,
        satisfaction,
        feedback,
      },
    });

    // Обновляем статистику рекомендации
    await updateRecommendationStats(recommendationId, interactionType);

    return NextResponse.json({
      success: true,
      interaction,
    });

  } catch (error) {
    console.error('Error recording recommendation interaction:', error);
    return NextResponse.json(
      { message: 'Failed to record interaction', error },
      { status: 500 }
    );
  }
}

// GET - получить статистику взаимодействий пользователя
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const recommendationId = searchParams.get('recommendationId');
    
    let where: any = {
      userId: session.user.id,
    };

    if (recommendationId) {
      where.recommendationId = recommendationId;
    }

    const interactions = await prisma.recommendationInteraction.findMany({
      where,
      include: {
        recommendation: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Группируем статистику по типам взаимодействий
    const stats = interactions.reduce((acc, interaction) => {
      const type = interaction.interactionType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      interactions,
      stats,
      total: interactions.length,
    });

  } catch (error) {
    console.error('Error fetching recommendation interactions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch interactions', error },
      { status: 500 }
    );
  }
}

// Вспомогательная функция для обновления статистики рекомендаций
async function updateRecommendationStats(recommendationId: string, interactionType: string) {
  const updates: any = {};

  switch (interactionType) {
    case RecommendationInteractionType.VIEW:
      updates.impressions = { increment: 1 };
      break;
    case RecommendationInteractionType.CLICK:
      updates.clicks = { increment: 1 };
      break;
    case RecommendationInteractionType.BOOK:
      updates.conversions = { increment: 1 };
      break;
  }

  if (Object.keys(updates).length > 0) {
    await prisma.smartRecommendation.update({
      where: { id: recommendationId },
      data: updates,
    });
  }
}
