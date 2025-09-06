import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
// TEMPORARILY DISABLED: badges excluded from deployment to solve 250MB limit
// import { awardBadgesBasedOnActivity } from '@/app/api/badges/route'

const prisma = new PrismaClient()

// Schema для параметров аналитики
const analyticsParamsSchema = z.object({
  userId: z.string().cuid().optional(),
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
  includeComparisons: z.boolean().default(true),
  includePredictions: z.boolean().default(false)
})

/**
 * GET /api/profiles/analytics - Получение расширенной аналитики профилей
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    console.log('📊 Fetching profile analytics:', Object.fromEntries(searchParams))

    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Парсим параметры
    const params = {
      userId: searchParams.get('userId') || undefined,
      period: searchParams.get('period') || 'month',
      includeComparisons: searchParams.get('includeComparisons') === 'true',
      includePredictions: searchParams.get('includePredictions') === 'true'
    }

    const validationResult = analyticsParamsSchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid parameters', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { userId, period, includeComparisons, includePredictions } = validationResult.data

    // Если запрашивается аналитика конкретного пользователя
    if (userId) {
      // Проверяем права доступа
      const canAccess = session.user.id === userId || session.user.role === 'ADMIN'
      if (!canAccess) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        )
      }

      const analytics = await getUserAnalytics(userId, period, includeComparisons, includePredictions)
      return NextResponse.json({
        success: true,
        data: analytics
      })
    }

    // Общая аналитика (только для админов)
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required for general analytics' },
        { status: 403 }
      )
    }

    const generalAnalytics = await getGeneralAnalytics(period, includeComparisons)
    return NextResponse.json({
      success: true,
      data: generalAnalytics
    })

  } catch (error) {
    console.error('❌ Error fetching analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/profiles/analytics - Обновление аналитики и пересчет badges
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Triggering analytics update')

    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { userId, updateBadges = true } = body

    const targetUserId = userId || session.user.id

    // Проверяем права доступа
    const canUpdate = session.user.id === targetUserId || session.user.role === 'ADMIN'
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    console.log('🎯 Updating analytics for user:', targetUserId)

    // Обновляем статистику профиля
    const updatedProfile = await updateUserStatistics(targetUserId)
    if (!updatedProfile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      )
    }

    // TEMPORARILY DISABLED: badges excluded from deployment to solve 250MB limit
    let newBadges: any[] = []
    if (updateBadges) {
      // newBadges = await awardBadgesBasedOnActivity(targetUserId)
      console.log('⚠️ Badge awarding disabled - badges API excluded from deployment')
    }

    // Получаем обновленную аналитику
    const analytics = await getUserAnalytics(targetUserId, 'month', true, false)

    return NextResponse.json({
      success: true,
      data: {
        profile: updatedProfile,
        newBadges,
        analytics
      },
      message: `Analytics updated. ${newBadges.length} new badges awarded.`
    })

  } catch (error) {
    console.error('❌ Error updating analytics:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Получение детальной аналитики пользователя
 */
async function getUserAnalytics(
  userId: string, 
  period: string, 
  includeComparisons: boolean,
  includePredictions: boolean
) {
  // Определяем временной диапазон
  const now = new Date()
  const periodStart = getPeriodStart(period, now)

  // Основная информация о профиле
  const profile = await prisma.fisherProfile.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          groupBookings: {
            where: {
              status: 'CONFIRMED',
              createdAt: { gte: periodStart }
            },
            include: {
              trip: {
                select: {
                  date: true,
                  timeSlot: true,
                  status: true
                }
              }
            }
          },
          reviewsReceived: {
            where: {
              verified: true,
              createdAt: { gte: periodStart }
            },
            select: {
              rating: true,
              comment: true,
              createdAt: true,
              fromUser: {
                select: { name: true }
              }
            }
          },
          reviewsGiven: {
            where: { createdAt: { gte: periodStart } },
            select: {
              rating: true,
              createdAt: true
            }
          },
          participantApprovals: {
            where: { appliedAt: { gte: periodStart } },
            select: {
              status: true,
              appliedAt: true,
              processedAt: true,
              trip: {
                select: {
                  date: true,
                  captain: {
                    select: { name: true }
                  }
                }
              }
            }
          }
        }
      },
      badges: {
        where: { earnedAt: { gte: periodStart } },
        orderBy: { earnedAt: 'desc' }
      }
    }
  })

  if (!profile) return null

  // Базовые метрики
  const metrics = {
    bookings: {
      total: profile.user.groupBookings.length,
      completed: profile.user.groupBookings.filter(b => 
        b.trip.status === 'COMPLETED'
      ).length,
      cancelled: profile.user.groupBookings.filter(b => 
        b.trip.status === 'CANCELLED'
      ).length
    },
    reviews: {
      received: profile.user.reviewsReceived.length,
      given: profile.user.reviewsGiven.length,
      averageRating: profile.user.reviewsReceived.length > 0
        ? profile.user.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / profile.user.reviewsReceived.length
        : 0
    },
    approvals: {
      applied: profile.user.participantApprovals.length,
      approved: profile.user.participantApprovals.filter(a => a.status === 'APPROVED').length,
      rejected: profile.user.participantApprovals.filter(a => a.status === 'REJECTED').length,
      pending: profile.user.participantApprovals.filter(a => a.status === 'PENDING').length
    },
    badges: {
      earned: profile.badges.length,
      categories: profile.badges.reduce((acc, badge) => {
        acc[badge.category] = (acc[badge.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }
  }

  // Динамика по времени (помесячно/понедельно)
  const timeSeriesData = await generateTimeSeries(userId, period, periodStart)

  // Сравнение с другими пользователями (если включено)
  let comparison = null
  if (includeComparisons) {
    comparison = await getComparisonData(profile, periodStart)
  }

  // Предсказания (если включено)
  let predictions = null
  if (includePredictions) {
    predictions = await generatePredictions(profile, metrics)
  }

  return {
    profile: {
      id: profile.id,
      experience: profile.experience,
      rating: Number(profile.rating),
      completedTrips: profile.completedTrips,
      reliability: Number(profile.reliability),
      totalReviews: profile.totalReviews,
      isActive: profile.isActive,
      lastActiveAt: profile.lastActiveAt
    },
    metrics,
    timeSeries: timeSeriesData,
    comparison,
    predictions,
    recentActivity: {
      bookings: profile.user.groupBookings.slice(0, 5),
      reviews: profile.user.reviewsReceived.slice(0, 5),
      badges: profile.badges.slice(0, 3)
    }
  }
}

/**
 * Получение общей аналитики платформы
 */
async function getGeneralAnalytics(period: string, includeComparisons: boolean) {
  const now = new Date()
  const periodStart = getPeriodStart(period, now)

  // Общие статистики
  const [
    totalProfiles,
    activeProfiles,
    totalBookings,
    totalReviews,
    totalBadges
  ] = await Promise.all([
    prisma.fisherProfile.count(),
    prisma.fisherProfile.count({
      where: { 
        lastActiveAt: { gte: periodStart },
        isActive: true 
      }
    }),
    prisma.groupBooking.count({
      where: { 
        status: 'CONFIRMED',
        createdAt: { gte: periodStart }
      }
    }),
    prisma.review.count({
      where: { 
        verified: true,
        createdAt: { gte: periodStart }
      }
    }),
    prisma.fisherBadge.count({
      where: { earnedAt: { gte: periodStart } }
    })
  ])

  // Распределение по уровням опыта
  const experienceDistribution = await prisma.fisherProfile.groupBy({
    by: ['experience'],
    _count: { experience: true },
    where: { isActive: true }
  })

  // Топ пользователи по рейтингу
  const topRatedUsers = await prisma.fisherProfile.findMany({
    where: {
      isActive: true,
      totalReviews: { gte: 3 }
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true
        }
      }
    },
    orderBy: [
      { rating: 'desc' },
      { totalReviews: 'desc' }
    ],
    take: 10
  })

  // Статистика badges
  const badgeStats = await prisma.fisherBadge.groupBy({
    by: ['category'],
    _count: { category: true },
    where: { earnedAt: { gte: periodStart } }
  })

  return {
    overview: {
      totalProfiles,
      activeProfiles,
      totalBookings,
      totalReviews,
      totalBadges,
      activityRate: totalProfiles > 0 ? (activeProfiles / totalProfiles * 100) : 0
    },
    distributions: {
      experience: experienceDistribution,
      badges: badgeStats
    },
    topUsers: topRatedUsers.map(profile => ({
      id: profile.user.id,
      name: profile.user.name,
      image: profile.user.image,
      rating: Number(profile.rating),
      completedTrips: profile.completedTrips,
      reliability: Number(profile.reliability)
    }))
  }
}

/**
 * Обновление статистики пользователя
 */
async function updateUserStatistics(userId: string) {
  const profile = await prisma.fisherProfile.findUnique({
    where: { userId },
    include: {
      user: {
        include: {
          groupBookings: {
            where: { status: 'CONFIRMED' },
            select: { id: true }
          },
          reviewsReceived: {
            where: { verified: true },
            select: { rating: true }
          }
        }
      }
    }
  })

  if (!profile) return null

  // Пересчитываем статистику
  const completedTrips = profile.user.groupBookings.length
  const reviews = profile.user.reviewsReceived
  const totalReviews = reviews.length
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    : 5.0

  // Обновляем профиль
  const updatedProfile = await prisma.fisherProfile.update({
    where: { userId },
    data: {
      completedTrips,
      totalReviews,
      rating: averageRating,
      lastActiveAt: new Date()
    }
  })

  console.log('📊 Updated statistics for user:', userId, {
    completedTrips,
    totalReviews,
    rating: averageRating
  })

  return updatedProfile
}

/**
 * Генерация временных рядов данных
 */
async function generateTimeSeries(userId: string, period: string, startDate: Date) {
  // Упрощенная реализация - можно расширить
  const bookings = await prisma.groupBooking.findMany({
    where: {
      userId,
      status: 'CONFIRMED',
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true
    },
    orderBy: { createdAt: 'asc' }
  })

  // Группируем по периодам
  const grouped = bookings.reduce((acc, booking) => {
    const key = formatDateForPeriod(booking.createdAt, period)
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(grouped).map(([date, count]) => ({
    date,
    bookings: count
  }))
}

/**
 * Получение данных для сравнения
 */
async function getComparisonData(profile: any, startDate: Date) {
  // Средние показатели по платформе
  const avgStats = await prisma.fisherProfile.aggregate({
    _avg: {
      rating: true,
      completedTrips: true,
      reliability: true
    },
    where: {
      isActive: true,
      totalReviews: { gte: 3 }
    }
  })

  return {
    platform: {
      avgRating: Number(avgStats._avg.rating || 0),
      avgCompletedTrips: Number(avgStats._avg.completedTrips || 0),
      avgReliability: Number(avgStats._avg.reliability || 0)
    },
    user: {
      rating: Number(profile.rating),
      completedTrips: profile.completedTrips,
      reliability: Number(profile.reliability)
    }
  }
}

/**
 * Генерация предсказаний (упрощенная версия)
 */
async function generatePredictions(profile: any, metrics: any) {
  // Простые предсказания на основе текущих трендов
  const bookingTrend = metrics.bookings.total > 0 ? 'growing' : 'stable'
  
  return {
    nextMonthBookings: Math.max(1, Math.round(metrics.bookings.total * 1.2)),
    ratingTrend: profile.rating >= 4.5 ? 'stable' : 'improving',
    recommendedActions: [
      ...(profile.rating < 4.0 ? ['Focus on improving service quality'] : []),
      ...(profile.reliability < 90 ? ['Work on punctuality and reliability'] : []),
      ...(metrics.bookings.total < 3 ? ['Increase booking activity'] : [])
    ]
  }
}

/**
 * Утилиты для работы с периодами
 */
function getPeriodStart(period: string, now: Date): Date {
  switch (period) {
    case 'week':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case 'month':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    case 'quarter':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case 'year':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case 'all':
      return new Date(2020, 0, 1) // Начало проекта
    default:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
  }
}

function formatDateForPeriod(date: Date, period: string): string {
  switch (period) {
    case 'week':
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    case 'quarter':
    case 'year':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    default:
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  }
}
