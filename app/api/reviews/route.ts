import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendGroupTripConfirmed } from '@/lib/services/email-service';


/**
 * GET /api/reviews - получение отзывов или pending review opportunities
 * Query параметры:
 * - tripId: получить отзывы для конкретной поездки
 * - userId: получить отзывы для конкретного пользователя (полученные)
 * - fromUserId: получить отзывы, оставленные пользователем
 * - pending: завершенные поездки без отзывов для аутентифицированного пользователя (true/false)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tripId = url.searchParams.get('tripId');
    const userId = url.searchParams.get('userId');
    const fromUserId = url.searchParams.get('fromUserId');
    const pending = url.searchParams.get('pending') === 'true';

    // 🔄 Handle pending review opportunities
    if (pending) {
      const session = await auth();
      if (!session?.user?.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Authentication required for pending reviews' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get completed trips where user participated but hasn't left reviews for other participants
      const completedTrips = await prisma.groupTrip.findMany({
        where: {
          date: { lt: new Date() }, // Trip completed
          bookings: {
            some: {
              userId: session.user.id,
              status: 'CONFIRMED'
            }
          }
        },
        include: {
          bookings: {
            where: { 
              status: 'CONFIRMED',
              userId: { not: session.user.id } // Other participants
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  email: true
                }
              }
            }
          }
        }
      });

      // Find participants the user hasn't reviewed yet
      const pendingReviews = [];
      for (const trip of completedTrips) {
        for (const booking of trip.bookings) {
          if (!booking.user) continue;
          
          // Check if user already reviewed this participant for this trip
          const existingReview = await prisma.review.findUnique({
            where: {
              tripId_fromUserId_toUserId: {
                tripId: trip.id,
                fromUserId: session.user.id,
                toUserId: booking.user.id
              }
            }
          });

          if (!existingReview) {
            pendingReviews.push({
              tripId: trip.id,
              tripTitle: trip.title || trip.description,
              tripDate: trip.date,
              timeSlot: trip.timeSlot,
              participant: booking.user
            });
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          pendingReviews,
          count: pendingReviews.length
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
 * Send review reminders via separate endpoint to avoid conflicts
 * PUT /api/reviews - отправить напоминания о возможности оставить отзыв
 * Body: { action: 'send_reminders', tripId?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { action, tripId } = await request.json();

    if (action === 'send_reminders') {
      const result = await sendReviewReminders(tripId);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in review PUT:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Send review reminders to participants of completed trips
 */
async function sendReviewReminders(specificTripId?: string) {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let whereClause: any = {
      date: { 
        lt: oneDayAgo, // Trip completed at least 24 hours ago
        gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Not more than 7 days ago
      },
      status: 'CONFIRMED'
    };

    if (specificTripId) {
      whereClause.id = specificTripId;
    }

    const completedTrips = await prisma.groupTrip.findMany({
      where: whereClause,
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          include: { user: true }
        }
      }
    });

    let emailsSent = 0;
    let errors = 0;

    for (const trip of completedTrips) {
      const participants = trip.bookings.filter(b => b.user?.email);
      
      for (const booking of participants) {
        if (!booking.user?.email) continue;

        // Count pending reviews for this participant
        const otherParticipants = participants.filter(p => p.user?.id !== booking.user?.id);
        let pendingCount = 0;

        for (const otherBooking of otherParticipants) {
          const existingReview = await prisma.review.findUnique({
            where: {
              tripId_fromUserId_toUserId: {
                tripId: trip.id,
                fromUserId: booking.user!.id,
                toUserId: otherBooking.user!.id
              }
            }
          });
          if (!existingReview) pendingCount++;
        }

        // Send email if there are pending reviews
        if (pendingCount > 0) {
          try {
            const emailResult = await sendGroupTripConfirmed(booking.user.email, {
              customerName: booking.user.name || 'Участник',
              confirmationCode: `REVIEW-${trip.id}`,
              date: new Date(trip.date).toLocaleDateString('ru-RU'),
              time: trip.timeSlot || 'Завершена',
              totalParticipants: pendingCount,
              customerPhone: ''
            });

            if (emailResult.success) {
              console.log(`📧 Review reminder sent to: ${booking.user.email}`);
              emailsSent++;
            } else {
              console.warn(`⚠️ Failed to send review reminder to ${booking.user.email}:`, emailResult.error);
              errors++;
            }
          } catch (emailError) {
            console.error(`❌ Review reminder email error for ${booking.user.email}:`, emailError);
            errors++;
          }
        }
      }
    }

    return {
      emailsSent,
      errors,
      tripsProcessed: completedTrips.length,
      message: `Processed ${completedTrips.length} trips, sent ${emailsSent} reminders`
    };

  } catch (error) {
    console.error('❌ Error sending review reminders:', error);
    return { emailsSent: 0, errors: 1, tripsProcessed: 0, error: error.message };
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