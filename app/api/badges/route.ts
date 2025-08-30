import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaClient, BadgeCategory, FishingExperience } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema для создания badge
const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(255),
  category: z.enum(['ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL']),
  requiredValue: z.number().min(0).optional()
})

/**
 * POST /api/badges - Создание нового badge (только для админов)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🆕 Creating new badge')

    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Проверяем права админа
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    console.log('📋 Request body:', body)

    // Валидируем данные
    const validationResult = createBadgeSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ Validation error:', validationResult.error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const badgeData = validationResult.data

    // Создаем badge (временно создаем для системного профиля)
    // В реальной системе нужно было бы создавать badge template отдельно
    const systemProfile = await prisma.fisherProfile.findFirst({
      where: { user: { role: 'ADMIN' } }
    })

    if (!systemProfile) {
      return NextResponse.json(
        { success: false, error: 'System profile not found' },
        { status: 500 }
      )
    }

    const badge = await prisma.fisherBadge.create({
      data: {
        profileId: systemProfile.id,
        name: badgeData.name,
        description: badgeData.description || '',
        icon: badgeData.icon,
        category: badgeData.category as BadgeCategory,
        requiredValue: badgeData.requiredValue
      }
    })

    console.log('✅ Badge created:', badge.id)
    
    return NextResponse.json({
      success: true,
      data: badge,
      message: 'Badge created successfully'
    })
    
  } catch (error) {
    console.error('❌ Error creating badge:', error)
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
 * GET /api/badges - Получение списка доступных badges и пользовательских badges
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const category = searchParams.get('category')
    
    console.log('🔍 Fetching badges:', { userId, category })

    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let whereCondition: any = {}
    
    if (category && ['ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL'].includes(category)) {
      whereCondition.category = category as BadgeCategory
    }

    // Если запрашиваются badges конкретного пользователя
    if (userId) {
      // Проверяем права доступа
      const canAccess = session.user.id === userId || session.user.role === 'ADMIN'
      if (!canAccess) {
      return NextResponse.json(
          { success: false, error: 'Access denied' },
        { status: 403 }
        )
      }

      const userProfile = await prisma.fisherProfile.findUnique({
        where: { userId },
        select: { id: true }
      })

      if (!userProfile) {
        return NextResponse.json(
          { success: false, error: 'User profile not found' },
          { status: 404 }
        )
      }

      whereCondition.profileId = userProfile.id
    }

    const badges = await prisma.fisherBadge.findMany({
      where: whereCondition,
      include: {
        profile: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        }
      },
      orderBy: [
        { earnedAt: 'desc' },
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    console.log(`✅ Found ${badges.length} badges`)

    // Группируем badges по категориям для удобства
    const badgesByCategory = badges.reduce((acc, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = []
      }
      acc[badge.category].push(badge)
      return acc
    }, {} as Record<string, any[]>)
    
    return NextResponse.json({
      success: true,
      data: {
        badges,
        badgesByCategory,
        stats: {
          total: badges.length,
          achievement: badges.filter(b => b.category === 'ACHIEVEMENT').length,
          milestone: badges.filter(b => b.category === 'MILESTONE').length,
          special: badges.filter(b => b.category === 'SPECIAL').length,
          seasonal: badges.filter(b => b.category === 'SEASONAL').length
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Error fetching badges:', error)
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
 * Автоматическое назначение badges на основе активности пользователя
 */
export async function awardBadgesBasedOnActivity(userId: string) {
  try {
    console.log('🏆 Checking badges for user:', userId)

    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
      include: {
        badges: true,
        user: {
          include: {
            groupBookings: {
              where: { status: 'CONFIRMED' },
              select: { id: true, createdAt: true }
            },
            reviewsReceived: {
              where: { verified: true },
              select: { rating: true }
            }
          }
        }
      }
    })

    if (!profile) {
      console.log('❌ Profile not found for user:', userId)
      return []
    }

    const existingBadgeNames = profile.badges.map(badge => badge.name)
    const newBadges: any[] = []

    // Badge за первое бронирование
    if (profile.user.groupBookings.length >= 1 && !existingBadgeNames.includes('First Trip')) {
      const badge = await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'First Trip',
          description: 'Completed your first fishing trip!',
          icon: '🎣',
          category: BadgeCategory.MILESTONE,
          requiredValue: 1
        }
      })
      newBadges.push(badge)
      console.log('🏆 Awarded "First Trip" badge')
      
      // Отправляем email уведомление о новом достижении
      await sendBadgeAwardedNotification(userId, badge)
    }

    // Badge за 5 поездок
    if (profile.completedTrips >= 5 && !existingBadgeNames.includes('Regular Fisher')) {
      const badge = await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'Regular Fisher',
          description: 'Completed 5+ fishing trips',
          icon: '🐟',
          category: BadgeCategory.MILESTONE,
          requiredValue: 5
        }
      })
      newBadges.push(badge)
      console.log('🏆 Awarded "Regular Fisher" badge')
      
      // Отправляем email уведомление о новом достижении
      await sendBadgeAwardedNotification(userId, badge)
    }

    // Badge за 10 поездок
    if (profile.completedTrips >= 10 && !existingBadgeNames.includes('Experienced Angler')) {
      const badge = await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'Experienced Angler',
          description: 'Completed 10+ fishing trips',
          icon: '🎯',
          category: BadgeCategory.MILESTONE,
          requiredValue: 10
        }
      })
      newBadges.push(badge)
      console.log('🏆 Awarded "Experienced Angler" badge')
      
      // Отправляем email уведомление о новом достижении
      await sendBadgeAwardedNotification(userId, badge)
    }

    // Badge за высокий рейтинг (4.5+)
    if (profile.rating >= 4.5 && profile.totalReviews >= 3 && 
        !existingBadgeNames.includes('Highly Rated')) {
      const badge = await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'Highly Rated',
          description: 'Maintained 4.5+ star rating',
          icon: '⭐',
          category: BadgeCategory.ACHIEVEMENT,
          requiredValue: null
        }
      })
      newBadges.push(badge)
      console.log('🏆 Awarded "Highly Rated" badge')
      
      // Отправляем email уведомление о новом достижении
      await sendBadgeAwardedNotification(userId, badge)
    }

    // Badge за высокую надежность (95%+)
    if (profile.reliability >= 95 && profile.completedTrips >= 5 && 
        !existingBadgeNames.includes('Reliable Fisher')) {
      const badge = await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'Reliable Fisher',
          description: '95%+ reliability score',
          icon: '🛡️',
          category: BadgeCategory.ACHIEVEMENT,
          requiredValue: null
        }
      })
      newBadges.push(badge)
      console.log('🏆 Awarded "Reliable Fisher" badge')
    }

    // Badge за экспертный уровень
    if (profile.experience === FishingExperience.EXPERT && 
        !existingBadgeNames.includes('Master Angler')) {
      const badge = await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'Master Angler',
          description: 'Reached Expert fishing level',
          icon: '👑',
          category: BadgeCategory.SPECIAL,
          requiredValue: null
        }
      })
      newBadges.push(badge)
      console.log('🏆 Awarded "Master Angler" badge')
    }

    // Сезонный badge (пример - winter fishing)
    const now = new Date()
    const isWinter = now.getMonth() === 11 || now.getMonth() === 0 || now.getMonth() === 1
    
    if (isWinter && profile.user.groupBookings.length >= 1 && 
        !existingBadgeNames.includes('Winter Fisher')) {
      
      // Проверяем, есть ли зимние бронирования
      const winterBookings = profile.user.groupBookings.filter(booking => {
        const bookingMonth = booking.createdAt.getMonth()
        return bookingMonth === 11 || bookingMonth === 0 || bookingMonth === 1
      })
      
      if (winterBookings.length >= 1) {
        const badge = await prisma.fisherBadge.create({
          data: {
            profileId: profile.id,
            name: 'Winter Fisher',
            description: 'Went fishing during winter season',
            icon: '❄️',
            category: BadgeCategory.SEASONAL,
            requiredValue: null
          }
        })
        newBadges.push(badge)
        console.log('🏆 Awarded "Winter Fisher" badge')
      }
    }

    console.log(`✅ Awarded ${newBadges.length} new badges to user ${userId}`)
    return newBadges

  } catch (error) {
    console.error('❌ Error awarding badges:', error)
    return []
  }
}

/**
 * Отправляет email уведомление о получении нового достижения
 */
async function sendBadgeAwardedNotification(userId: string, badge: any) {
  try {
    // Получаем пользователя с профилем
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        fisherProfile: {
          include: {
            badges: true
          }
        }
      }
    });

    if (!user?.email) {
      console.log('⚠️ User email not found, skipping badge notification');
      return;
    }

    const profileUrl = `${process.env.NEXTAUTH_URL}/profile`;
    const totalBadges = user.fisherProfile?.badges.length || 1;

    await emailService.sendBadgeAwardedNotification({
      userEmail: user.email,
      userName: user.name || 'Участник',
      badge: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        category: badge.category
      },
      totalBadges,
      profileUrl
    });

    console.log(`📧 Badge notification sent to ${user.email} (${badge.name})`);

  } catch (error) {
    console.error('Error sending badge notification:', error);
  }
}

// Функция экспортирована выше как named export