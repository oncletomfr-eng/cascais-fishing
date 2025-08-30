import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  UpdateReputationRequest, 
  ReputationSummary, 
  SocialRatings,
  ExperienceStats,
  Certificate 
} from '@/lib/types/reputation';

// 📊 Схемы валидации для API
const UpdateRatingSchema = z.object({
  userId: z.string(),
  rating: z.object({
    mentorRating: z.number().min(1).max(10).optional(),
    teamworkRating: z.number().min(1).max(10).optional(),
    reliabilityRating: z.number().min(1).max(10).optional(),
    respectRating: z.number().min(1).max(10).optional(),
  }).optional(),
  reviewerId: z.string(),
  tripId: z.string().optional(),
  comment: z.string().max(500).optional(),
});

const AddCertificateSchema = z.object({
  userId: z.string(),
  certificate: z.object({
    name: z.string(),
    issuer: z.string(),
    dateIssued: z.string(),
    expiryDate: z.string().optional(),
    category: z.enum(['SAFETY', 'TECHNIQUE', 'GUIDE', 'CAPTAIN', 'MARINE', 'ECOLOGY']),
    level: z.string().optional(),
    certificateNumber: z.string().optional(),
    description: z.string().optional(),
  }),
});

/**
 * GET /api/reputation - Получить сводку репутации пользователя
 * 
 * Query params:
 * - userId: string - ID пользователя 
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Получаем профиль со всеми данными репутации
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        badges: true,
      }
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Вычисляем общую репутацию
    const socialRatings = {
      mentorRating: profile.mentorRating ? Number(profile.mentorRating) : null,
      teamworkRating: profile.teamworkRating ? Number(profile.teamworkRating) : null,
      reliabilityRating: profile.reliabilityRating ? Number(profile.reliabilityRating) : null,
      respectRating: profile.respectRating ? Number(profile.respectRating) : null,
      totalReviews: profile.totalReviews,
    };

    // Общий рейтинг как среднее социальных рейтингов (только если все поля заполнены)
    const hasRatings = socialRatings.mentorRating !== null && 
                       socialRatings.teamworkRating !== null && 
                       socialRatings.reliabilityRating !== null && 
                       socialRatings.respectRating !== null;
    
    const overallRating = hasRatings ? (
      socialRatings.mentorRating! + 
      socialRatings.teamworkRating! + 
      socialRatings.reliabilityRating! + 
      socialRatings.respectRating!
    ) / 4 : null;

    // Определяем сильные стороны (рейтинг >= 7)
    const strongPoints: string[] = [];
    if (socialRatings.mentorRating && socialRatings.mentorRating >= 7) strongPoints.push('Отличный наставник новичков');
    if (socialRatings.teamworkRating && socialRatings.teamworkRating >= 7) strongPoints.push('Превосходная работа в команде');
    if (socialRatings.reliabilityRating && socialRatings.reliabilityRating >= 7) strongPoints.push('Высокая надежность');
    if (socialRatings.respectRating && socialRatings.respectRating >= 7) strongPoints.push('Соблюдает правила и экологию');

    // Определяем области для улучшения (рейтинг < 5)
    const improvementAreas: string[] = [];
    if (socialRatings.mentorRating && socialRatings.mentorRating < 5) improvementAreas.push('Навыки наставничества');
    if (socialRatings.teamworkRating && socialRatings.teamworkRating < 5) improvementAreas.push('Командная работа');
    if (socialRatings.reliabilityRating && socialRatings.reliabilityRating < 5) improvementAreas.push('Надежность');
    if (socialRatings.respectRating && socialRatings.respectRating < 5) improvementAreas.push('Соблюдение правил');

    // Уровень рекомендации на основе общего рейтинга
    let recommendationLevel: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'CAUTION';
    if (!overallRating) recommendationLevel = 'NEUTRAL';
    else if (overallRating >= 8) recommendationLevel = 'HIGHLY_RECOMMENDED';
    else if (overallRating >= 6) recommendationLevel = 'RECOMMENDED';
    else if (overallRating >= 4) recommendationLevel = 'NEUTRAL';
    else recommendationLevel = 'CAUTION';

    // Счет доверия (0-100)
    const trustScore = overallRating ? Math.min(100, Math.round(
      (overallRating * 10) + 
      (profile.completedTrips * 2) + 
      (profile.totalReviews * 5) +
      (profile.level * 3)
    )) : null;

    const reputationSummary: ReputationSummary = {
      overallRating,
      strongPoints,
      improvementAreas,
      recommendationLevel,
      trustScore,
    };

    return NextResponse.json({
      profile: {
        ...profile,
        socialRatings,
      },
      reputation: reputationSummary,
    });

  } catch (error) {
    console.error('Error fetching reputation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reputation' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reputation - Добавить рейтинг пользователю
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = UpdateRatingSchema.parse(body);

    // Проверяем существование профиля получателя рейтинга
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId: data.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Проверяем, что reviewer не оценивает сам себя
    if (data.userId === data.reviewerId) {
      return NextResponse.json(
        { error: 'Cannot rate yourself' },
        { status: 400 }
      );
    }

    // Обновляем рейтинги (используем weighted average)
    const updates: any = {};
    const currentReviews = profile.totalReviews;
    const newTotalReviews = currentReviews + 1;

    if (data.rating?.mentorRating) {
      const currentRating = Number(profile.mentorRating);
      const newRating = ((currentRating * currentReviews) + data.rating.mentorRating) / newTotalReviews;
      updates.mentorRating = Number(newRating.toFixed(1));
    }

    if (data.rating?.teamworkRating) {
      const currentRating = Number(profile.teamworkRating);
      const newRating = ((currentRating * currentReviews) + data.rating.teamworkRating) / newTotalReviews;
      updates.teamworkRating = Number(newRating.toFixed(1));
    }

    if (data.rating?.reliabilityRating) {
      const currentRating = Number(profile.reliabilityRating);
      const newRating = ((currentRating * currentReviews) + data.rating.reliabilityRating) / newTotalReviews;
      updates.reliabilityRating = Number(newRating.toFixed(1));
    }

    if (data.rating?.respectRating) {
      const currentRating = Number(profile.respectRating);
      const newRating = ((currentRating * currentReviews) + data.rating.respectRating) / newTotalReviews;
      updates.respectRating = Number(newRating.toFixed(1));
    }

    // Обновляем общий счетчик отзывов
    updates.totalReviews = newTotalReviews;

    // Обновляем профиль
    const updatedProfile = await prisma.fisherProfile.update({
      where: { userId: data.userId },
      data: updates,
    });

    // Создаем запись в Reviews если указан tripId
    if (data.tripId && data.comment) {
      await prisma.review.create({
        data: {
          tripId: data.tripId,
          fromUserId: data.reviewerId,
          toUserId: data.userId,
          rating: Math.round(
            ((data.rating?.mentorRating || 0) +
             (data.rating?.teamworkRating || 0) +
             (data.rating?.reliabilityRating || 0) +
             (data.rating?.respectRating || 0)) / 4
          ),
          comment: data.comment,
        },
      });
    }

    return NextResponse.json({
      message: 'Rating updated successfully',
      profile: updatedProfile,
    });

  } catch (error) {
    console.error('Error updating rating:', error);
    return NextResponse.json(
      { error: 'Failed to update rating' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reputation - Добавить сертификат
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const data = AddCertificateSchema.parse(body);

    // Находим профиль
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId: data.userId },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Получаем текущие сертификаты
    const currentCertificates = (profile.certificates as any[]) || [];

    // Создаем новый сертификат
    const newCertificate = {
      id: `cert_${Date.now()}`,
      ...data.certificate,
      dateIssued: new Date(data.certificate.dateIssued),
      expiryDate: data.certificate.expiryDate ? new Date(data.certificate.expiryDate) : undefined,
      verified: false, // Требует верификации администратором
    };

    // Добавляем к списку сертификатов
    const updatedCertificates = [...currentCertificates, newCertificate];

    // Обновляем профиль
    const updatedProfile = await prisma.fisherProfile.update({
      where: { userId: data.userId },
      data: {
        certificates: updatedCertificates,
      },
    });

    return NextResponse.json({
      message: 'Certificate added successfully',
      certificate: newCertificate,
    });

  } catch (error) {
    console.error('Error adding certificate:', error);
    return NextResponse.json(
      { error: 'Failed to add certificate' },
      { status: 500 }
    );
  }
}
