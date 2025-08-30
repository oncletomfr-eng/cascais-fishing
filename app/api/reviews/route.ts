import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@/lib/generated/prisma';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

/**
 * GET /api/reviews - получение отзывов
 * Query параметры:
 * - tripId: получить отзывы для конкретной поездки
 * - userId: получить отзывы для конкретного пользователя (полученные)
 * - fromUserId: получить отзывы, оставленные пользователем
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tripId = url.searchParams.get('tripId');
    const userId = url.searchParams.get('userId');
    const fromUserId = url.searchParams.get('fromUserId');

    let whereClause: any = {};

    if (tripId) {
      whereClause.tripId = tripId;
    }

    if (userId) {
      whereClause.toUserId = userId;
    }

    if (fromUserId) {
      whereClause.fromUserId = fromUserId;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        trip: {
          select: {
            id: true,
            date: true,
            timeSlot: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return new Response(
      JSON.stringify({ success: true, reviews }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch reviews' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * POST /api/reviews - создание нового отзыва
 * Body: { tripId, toUserId, rating, comment }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { tripId, toUserId, rating, comment } = await request.json();

    // Валидация данных
    if (!tripId || !toUserId || !rating) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rating must be between 1 and 5' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (session.user.id === toUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot review yourself' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем, существует ли поездка и был ли пользователь участником
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            userId: { in: [session.user.id, toUserId] },
            status: 'CONFIRMED'
          },
          select: { userId: true }
        }
      }
    });

    if (!trip) {
      return new Response(
        JSON.stringify({ success: false, error: 'Trip not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем, что оба пользователя были участниками поездки
    const participantIds = trip.bookings.map(b => b.userId);
    const bothParticipated = participantIds.includes(session.user.id) && 
                           participantIds.includes(toUserId);

    if (!bothParticipated) {
      return new Response(
        JSON.stringify({ success: false, error: 'Both users must have participated in the trip' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем, что поездка уже завершена (дата прошла)
    const tripDate = new Date(trip.date);
    const now = new Date();
    if (tripDate > now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Trip has not completed yet' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Проверяем, не оставил ли пользователь уже отзыв об этом участнике для этой поездки
    const existingReview = await prisma.review.findUnique({
      where: {
        tripId_fromUserId_toUserId: {
          tripId,
          fromUserId: session.user.id,
          toUserId
        }
      }
    });

    if (existingReview) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review already exists' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Создаем отзыв
    const review = await prisma.review.create({
      data: {
        tripId,
        fromUserId: session.user.id,
        toUserId,
        rating,
        comment,
        verified: true // Автоматически верифицированный, так как участники подтверждены
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        toUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        trip: {
          select: {
            id: true,
            date: true,
            timeSlot: true,
            title: true
          }
        }
      }
    });

    // Обновляем рейтинг получателя отзыва
    await updateUserRating(toUserId);

    // Проверяем достижения для обеих сторон
    await awardReviewBadges(session.user.id, toUserId);

    console.log(`✅ Review created: ${session.user.id} → ${toUserId} (${rating}⭐)`);

    // Инвалидируем кэш
    revalidatePath('/profile');
    revalidatePath(`/profile/${toUserId}`);

    return new Response(
      JSON.stringify({ success: true, review }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error creating review:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create review' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * PATCH /api/reviews/[id] - отметить отзыв как полезный
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { reviewId, helpful } = await request.json();

    if (!reviewId || typeof helpful !== 'boolean') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return new Response(
        JSON.stringify({ success: false, error: 'Review not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Пользователь не может отмечать свои отзывы как полезные
    if (review.fromUserId === session.user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot mark own review as helpful' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Обновляем счетчик полезности
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        helpful: helpful ? review.helpful + 1 : Math.max(0, review.helpful - 1)
      }
    });

    return new Response(
      JSON.stringify({ success: true, helpful: updatedReview.helpful }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error updating review helpful count:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update review' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Обновляет средний рейтинг пользователя на основе полученных отзывов
 */
async function updateUserRating(userId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        toUserId: userId,
        verified: true
      },
      select: {
        rating: true
      }
    });

    if (reviews.length === 0) {
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const roundedRating = Math.round(averageRating * 10) / 10; // Округление до 1 знака

    // Обновляем профиль пользователя
    await prisma.fisherProfile.updateMany({
      where: { userId },
      data: {
        rating: roundedRating,
        totalReviews: reviews.length
      }
    });

    console.log(`📊 Updated rating for user ${userId}: ${roundedRating} (${reviews.length} reviews)`);

  } catch (error) {
    console.error('Error updating user rating:', error);
  }
}

/**
 * Проверяет и назначает badges связанные с отзывами
 */
async function awardReviewBadges(reviewerId: string, revieweeId: string) {
  try {
    // Импортируем функцию награждения badges
    const { awardBadgesBasedOnActivity } = await import('../badges/route');

    // Проверяем достижения для того, кто оставил отзыв
    await awardBadgesBasedOnActivity(reviewerId);

    // Проверяем достижения для того, кто получил отзыв
    await awardBadgesBasedOnActivity(revieweeId);

  } catch (error) {
    console.error('Error awarding review badges:', error);
  }
}