import { NextRequest, NextResponse } from 'next/server';
import { collaborativeFilteringService } from '@/lib/services/collaborative-filtering-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - получить рекомендации для тестового пользователя
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'participant-1';

    console.log(`🔍 Getting CF recommendations for user: ${userId}`);

    const recommendations = await collaborativeFilteringService.getRecommendationsForUser(userId);

    return NextResponse.json({
      success: true,
      userId: userId,
      recommendations: recommendations,
      count: recommendations.length,
      algorithm: 'user_based_collaborative_filtering'
    });

  } catch (error) {
    console.error('Error fetching CF recommendations:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch recommendations', 
        error: error?.toString() 
      },
      { status: 500 }
    );
  }
}

// POST - запустить полный процесс collaborative filtering
export async function POST(req: NextRequest) {
  try {
    console.log('🚀 Starting full Collaborative Filtering process...');

    // Запускаем полный процесс collaborative filtering
    await collaborativeFilteringService.processCollaborativeFiltering();

    // Получаем статистику
    const totalRecommendations = await prisma.smartRecommendation.count({
      where: {
        type: 'COLLABORATIVE'
      }
    });

    const uniqueUsers = await prisma.smartRecommendation.findMany({
      where: {
        type: 'COLLABORATIVE'
      },
      select: {
        targetUserId: true
      },
      distinct: ['targetUserId']
    });

    // Получаем примеры рекомендаций
    const sampleRecommendations = await prisma.smartRecommendation.findMany({
      where: {
        type: 'COLLABORATIVE'
      },
      include: {
        recommendedTrip: {
          select: {
            id: true,
            description: true,
            pricePerPerson: true,
            maxParticipants: true,
            status: true
          }
        }
      },
      take: 3
    });

    return NextResponse.json({
      success: true,
      message: 'Collaborative Filtering process completed successfully',
      statistics: {
        totalRecommendations,
        usersWithRecommendations: uniqueUsers.length,
        averageRecommendationsPerUser: totalRecommendations > 0 ? 
          (totalRecommendations / uniqueUsers.length).toFixed(1) : 0
      },
      sampleRecommendations: sampleRecommendations.map(rec => ({
        userId: rec.targetUserId,
        tripDescription: rec.recommendedTrip?.description,
        score: rec.relevanceScore,
        reason: rec.description
      })),
      algorithm: 'user_based_collaborative_filtering',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error running CF process:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to run collaborative filtering', 
        error: error?.toString() 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
