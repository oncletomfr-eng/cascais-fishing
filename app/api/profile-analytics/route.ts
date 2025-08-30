import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { PrismaClient } from '@/lib/generated/prisma';
import { addMonths, format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

const prisma = new PrismaClient();

interface MonthlyData {
  month: string;
  bookings: number;
  completed: number;
  cancelled: number;
  rating: number;
}

interface ProfileAnalytics {
  totalBookings: number;
  completedTrips: number;
  averageRating: number;
  reliability: number;
  totalSpent: number;
  favoriteTimeSlots: Array<{ timeSlot: string; count: number }>;
  monthlyTrends: MonthlyData[];
  achievements: {
    totalBadges: number;
    recentBadges: Array<{ name: string; earnedAt: string; icon: string }>;
  };
  socialStats: {
    reviewsGiven: number;
    reviewsReceived: number;
    helpfulVotes: number;
  };
  recommendations: string[];
}

/**
 * GET /api/profile-analytics - получение расширенной аналитики профиля
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId') || userId;

    // Получаем профиль пользователя с полными данными
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId: targetUserId },
      include: {
        badges: {
          orderBy: { earnedAt: 'desc' },
          take: 10
        },
        user: {
          include: {
            groupBookings: {
              include: {
                trip: {
                  select: {
                    timeSlot: true,
                    date: true,
                    pricePerPerson: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' }
            },
            reviewsGiven: {
              where: { verified: true },
              select: {
                id: true,
                rating: true,
                helpful: true,
                createdAt: true
              }
            },
            reviewsReceived: {
              where: { verified: true },
              select: {
                id: true,
                rating: true,
                helpful: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Вычисляем базовую статистику
    const totalBookings = profile.user.groupBookings.length;
    const completedTrips = profile.completedTrips;
    const averageRating = Number(profile.rating);
    const reliability = Number(profile.reliability);

    // Вычисляем общую потраченную сумму
    const totalSpent = profile.user.groupBookings.reduce((sum, booking) => {
      return sum + (booking.trip.pricePerPerson || 95) * booking.participants;
    }, 0);

    // Анализируем любимые временные слоты
    const timeSlotCounts: Record<string, number> = {};
    profile.user.groupBookings.forEach(booking => {
      const slot = booking.trip.timeSlot;
      timeSlotCounts[slot] = (timeSlotCounts[slot] || 0) + 1;
    });

    const favoriteTimeSlots = Object.entries(timeSlotCounts)
      .map(([timeSlot, count]) => ({ timeSlot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Генерируем месячные тренды за последние 12 месяцев
    const monthlyTrends: MonthlyData[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthBookings = profile.user.groupBookings.filter(booking => {
        const bookingDate = new Date(booking.createdAt);
        return bookingDate >= monthStart && bookingDate <= monthEnd;
      });

      const monthReviews = profile.user.reviewsReceived.filter(review => {
        const reviewDate = new Date(review.createdAt);
        return reviewDate >= monthStart && reviewDate <= monthEnd;
      });

      const avgRating = monthReviews.length > 0 
        ? monthReviews.reduce((sum, r) => sum + r.rating, 0) / monthReviews.length
        : 0;

      monthlyTrends.push({
        month: format(date, 'MMM yyyy'),
        bookings: monthBookings.length,
        completed: monthBookings.filter(b => b.status === 'CONFIRMED').length,
        cancelled: monthBookings.filter(b => b.status === 'CANCELLED').length,
        rating: Number(avgRating.toFixed(1))
      });
    }

    // Статистика по достижениям
    const achievements = {
      totalBadges: profile.badges.length,
      recentBadges: profile.badges.slice(0, 5).map(badge => ({
        name: badge.name,
        earnedAt: badge.earnedAt.toISOString(),
        icon: badge.icon
      }))
    };

    // Социальная статистика
    const socialStats = {
      reviewsGiven: profile.user.reviewsGiven.length,
      reviewsReceived: profile.user.reviewsReceived.length,
      helpfulVotes: profile.user.reviewsGiven.reduce((sum, r) => sum + r.helpful, 0)
    };

    // Генерируем персональные рекомендации
    const recommendations = generateRecommendations(profile, {
      totalBookings,
      completedTrips,
      averageRating,
      reliability,
      favoriteTimeSlots
    });

    const analytics: ProfileAnalytics = {
      totalBookings,
      completedTrips,
      averageRating,
      reliability,
      totalSpent,
      favoriteTimeSlots,
      monthlyTrends,
      achievements,
      socialStats,
      recommendations
    };

    return new Response(
      JSON.stringify({ success: true, analytics }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching profile analytics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch analytics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Генерирует персональные рекомендации на основе профиля пользователя
 */
function generateRecommendations(
  profile: any,
  stats: {
    totalBookings: number;
    completedTrips: number;
    averageRating: number;
    reliability: number;
    favoriteTimeSlots: Array<{ timeSlot: string; count: number }>;
  }
): string[] {
  const recommendations: string[] = [];

  // Рекомендации на основе опыта
  if (stats.totalBookings < 3) {
    recommendations.push('Попробуйте забронировать еще несколько поездок, чтобы открыть новые достижения');
  }

  // Рекомендации по времени
  const topTimeSlot = stats.favoriteTimeSlots[0];
  if (topTimeSlot) {
    const timeSlotNames: Record<string, string> = {
      'MORNING_9AM': 'утренних',
      'AFTERNOON_2PM': 'дневных',
      'EVENING_6PM': 'вечерних'
    };
    const slotName = timeSlotNames[topTimeSlot.timeSlot] || topTimeSlot.timeSlot;
    recommendations.push(`Вы предпочитаете ${slotName} поездки - попробуйте другое время для разнообразия`);
  }

  // Рекомендации по рейтингу
  if (stats.averageRating < 4.0 && stats.completedTrips > 0) {
    recommendations.push('Попросите организаторов дать советы для улучшения опыта рыбалки');
  } else if (stats.averageRating >= 4.5) {
    recommendations.push('Отличный рейтинг! Поделитесь опытом с новичками в чате');
  }

  // Рекомендации по надежности
  if (stats.reliability < 90 && stats.totalBookings > 2) {
    recommendations.push('Постарайтесь не отменять бронирования для повышения надежности');
  }

  // Рекомендации по уровню опыта
  if (profile.experience === 'BEGINNER' && stats.completedTrips >= 3) {
    recommendations.push('Пора обновить уровень опыта на "Intermediate" в настройках профиля');
  }

  // Рекомендации по социальной активности
  if (stats.completedTrips > 0 && profile.user.reviewsGiven.length === 0) {
    recommendations.push('Оставьте отзыв о своих поездках, чтобы помочь другим участникам');
  }

  return recommendations.slice(0, 4); // Максимум 4 рекомендации
}
