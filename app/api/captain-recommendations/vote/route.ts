import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// POST - проголосовать за полезность рекомендации капитана
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { recommendationId, voteType } = body;

    if (!recommendationId || !voteType) {
      return NextResponse.json({ 
        message: 'recommendationId and voteType are required' 
      }, { status: 400 });
    }

    if (!['helpful', 'not_helpful'].includes(voteType)) {
      return NextResponse.json({ 
        message: 'voteType must be "helpful" or "not_helpful"' 
      }, { status: 400 });
    }

    // Проверяем, существует ли рекомендация
    const recommendation = await prisma.captainRecommendation.findUnique({
      where: { id: recommendationId }
    });

    if (!recommendation) {
      return NextResponse.json({ 
        message: 'Recommendation not found' 
      }, { status: 404 });
    }

    // Проверяем, не голосовал ли пользователь уже
    const existingVote = await prisma.captainRecommendationVote.findUnique({
      where: {
        userId_recommendationId: {
          userId: session.user.id,
          recommendationId: recommendationId,
        }
      }
    });

    if (existingVote) {
      // Если пользователь уже голосовал, обновляем его голос
      if (existingVote.isHelpful !== (voteType === 'helpful')) {
        await prisma.$transaction([
          // Обновляем голос
          prisma.captainRecommendationVote.update({
            where: {
              userId_recommendationId: {
                userId: session.user.id,
                recommendationId: recommendationId,
              }
            },
            data: {
              isHelpful: voteType === 'helpful',
              updatedAt: new Date(),
            }
          }),
          // Обновляем счетчики в рекомендации
          prisma.captainRecommendation.update({
            where: { id: recommendationId },
            data: voteType === 'helpful' 
              ? { 
                  helpfulVotes: { increment: 1 },
                  notHelpfulVotes: { decrement: 1 }
                }
              : {
                  helpfulVotes: { decrement: 1 },
                  notHelpfulVotes: { increment: 1 }
                }
          })
        ]);
      }
    } else {
      // Создаем новый голос
      await prisma.$transaction([
        prisma.captainRecommendationVote.create({
          data: {
            userId: session.user.id,
            recommendationId: recommendationId,
            isHelpful: voteType === 'helpful',
          }
        }),
        prisma.captainRecommendation.update({
          where: { id: recommendationId },
          data: voteType === 'helpful' 
            ? { helpfulVotes: { increment: 1 } }
            : { notHelpfulVotes: { increment: 1 } }
        })
      ]);
    }

    // Получаем обновленную рекомендацию
    const updatedRecommendation = await prisma.captainRecommendation.findUnique({
      where: { id: recommendationId },
      select: {
        id: true,
        helpfulVotes: true,
        notHelpfulVotes: true,
      }
    });

    return NextResponse.json({
      success: true,
      voteType,
      recommendation: updatedRecommendation,
    });

  } catch (error) {
    console.error('Error voting for captain recommendation:', error);
    return NextResponse.json(
      { message: 'Failed to record vote', error },
      { status: 500 }
    );
  }
}

// GET - получить голос пользователя за конкретную рекомендацию
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const recommendationId = searchParams.get('recommendationId');

    if (!recommendationId) {
      return NextResponse.json({ 
        message: 'recommendationId is required' 
      }, { status: 400 });
    }

    const vote = await prisma.captainRecommendationVote.findUnique({
      where: {
        userId_recommendationId: {
          userId: session.user.id,
          recommendationId: recommendationId,
        }
      }
    });

    return NextResponse.json({
      success: true,
      vote: vote ? {
        voteType: vote.isHelpful ? 'helpful' : 'not_helpful',
        votedAt: vote.createdAt,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching user vote:', error);
    return NextResponse.json(
      { message: 'Failed to fetch vote', error },
      { status: 500 }
    );
  }
}
