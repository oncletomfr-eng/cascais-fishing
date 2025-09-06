'use server'

import { auth } from '@/auth'
import { BadgeCategory, FishingExperience } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { awardBadgesBasedOnActivity } from '@/app/api/badges/route'
import prisma from '@/lib/prisma'

/**
 * Создание или обновление профиля рыболова
 */
export async function createOrUpdateFisherProfile(formData: {
  experience: string
  bio?: string
  specialties?: string[]
}) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Проверяем, существует ли профиль
    const existingProfile = await prisma.fisherProfile.findUnique({
      where: { userId: session.user.id }
    })

    let profile
    
    if (existingProfile) {
      // Обновляем существующий профиль
      profile = await prisma.fisherProfile.update({
        where: { userId: session.user.id },
        data: {
          experience: formData.experience as FishingExperience,
          bio: formData.bio || '',
          specialties: formData.specialties || [],
          lastActiveAt: new Date()
        }
      })
    } else {
      // Создаем новый профиль
      profile = await prisma.fisherProfile.create({
        data: {
          userId: session.user.id,
          experience: formData.experience as any,
          bio: formData.bio || '',
          specialties: formData.specialties || [],
          rating: 5.0,
          completedTrips: 0,
          totalReviews: 0,
          reliability: 100,
          isActive: true,
          lastActiveAt: new Date()
        }
      })

      // Награждаем новичка за создание профиля
      await prisma.fisherBadge.create({
        data: {
          profileId: profile.id,
          name: 'Welcome Aboard',
          description: 'Создал профиль рыболова',
          icon: '🎣',
          category: BadgeCategory.MILESTONE
        }
      })
    }

    // Обновляем badges на основе новой информации
    await awardBadgesBasedOnActivity(session.user.id)

    revalidatePath('/profiles')
    return { success: true, profile }

  } catch (error) {
    console.error('Error creating/updating profile:', error)
    throw new Error('Failed to create or update profile')
  }
}

/**
 * Подача заявки на участие в групповой поездке
 */
export async function submitParticipantApplication(
  tripId: string,
  message?: string
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Проверяем, существует ли поездка
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { participants: true, userId: true }
        },
        participantApprovals: {
          where: { participantId: session.user.id },
          select: { id: true, status: true }
        }
      }
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    if (trip.status !== 'FORMING') {
      throw new Error('Trip is not accepting new participants')
    }

    // Проверяем, что участник еще не подавал заявку
    const existingApproval = trip.participantApprovals.find(
      approval => approval.status === 'PENDING' || approval.status === 'APPROVED'
    )

    if (existingApproval) {
      throw new Error(
        existingApproval.status === 'PENDING' 
          ? 'Application already pending' 
          : 'Already approved for this trip'
      )
    }

    // Проверяем, что участник уже не забронирован напрямую
    const existingBooking = trip.bookings.find(booking => booking.userId === session.user.id)
    if (existingBooking) {
      throw new Error('Already booked for this trip')
    }

    // Проверяем, что есть места
    const currentParticipants = trip.bookings.reduce(
      (sum, booking) => sum + booking.participants, 
      0
    )

    if (currentParticipants >= trip.maxParticipants) {
      throw new Error('Trip is full')
    }

    // Создаем заявку на одобрение
    const approval = await prisma.participantApproval.create({
      data: {
        tripId,
        participantId: session.user.id,
        message: message || null,
        status: 'PENDING'
      },
      include: {
        participant: {
          select: {
            name: true,
            email: true
          }
        },
        trip: {
          select: {
            date: true,
            timeSlot: true,
            captain: {
              select: { name: true }
            }
          }
        }
      }
    })

    // Обновляем активность профиля участника
    await prisma.fisherProfile.updateMany({
      where: { userId: session.user.id },
      data: { lastActiveAt: new Date() }
    })

    // Награждаем badges за активность
    await awardBadgesBasedOnActivity(session.user.id)

    revalidatePath(`/trip/${tripId}`)
    revalidatePath('/admin/trips')

    return { success: true, approval }

  } catch (error) {
    console.error('Error submitting application:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to submit application')
  }
}

/**
 * Прямое бронирование для опытных пользователей
 */
export async function createDirectBooking(
  tripId: string,
  participants: number = 1
) {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Получаем профиль пользователя для проверки права на прямое бронирование
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!profile) {
      throw new Error('Profile required for booking')
    }

    // Проверяем, может ли пользователь бронировать напрямую
    const canBookDirectly = 
      profile.completedTrips >= 3 && 
      profile.reliability >= 85 && 
      profile.isActive &&
      (profile.totalReviews === 0 || profile.rating >= 4.0)

    if (!canBookDirectly) {
      throw new Error('Direct booking not allowed - approval required')
    }

    // Проверяем поездку
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { participants: true }
        }
      }
    })

    if (!trip) {
      throw new Error('Trip not found')
    }

    if (trip.status !== 'FORMING') {
      throw new Error('Trip is not accepting bookings')
    }

    // Проверяем доступность мест
    const currentParticipants = trip.bookings.reduce(
      (sum, booking) => sum + booking.participants, 
      0
    )

    if (currentParticipants + participants > trip.maxParticipants) {
      throw new Error('Not enough spots available')
    }

    // Создаем бронирование
    const booking = await prisma.groupBooking.create({
      data: {
        tripId,
        userId: session.user.id,
        participants,
        totalPrice: trip.pricePerPerson * participants,
        contactName: session.user.name || '',
        contactPhone: '', // Можно добавить поле для телефона
        contactEmail: session.user.email || '',
        status: 'CONFIRMED'
      }
    })

    // Обновляем статус поездки если набран минимум
    const newTotalParticipants = currentParticipants + participants
    if (newTotalParticipants >= trip.minRequired && trip.status === 'FORMING') {
      await prisma.groupTrip.update({
        where: { id: tripId },
        data: { status: 'CONFIRMED' }
      })
    }

    // Обновляем статистику профиля
    await prisma.fisherProfile.update({
      where: { userId: session.user.id },
      data: {
        lastActiveAt: new Date(),
        // Можно добавить счетчик планируемых поездок
      }
    })

    // Награждаем badges
    await awardBadgesBasedOnActivity(session.user.id)

    revalidatePath(`/trip/${tripId}`)
    revalidatePath('/bookings')

    return { success: true, booking }

  } catch (error) {
    console.error('Error creating direct booking:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to create booking')
  }
}

/**
 * Обновление репутации пользователя после завершения поездки
 */
export async function updateUserReputationAfterTrip(
  userId: string,
  tripResult: 'COMPLETED' | 'CANCELLED' | 'NO_SHOW',
  additionalData?: {
    wasOnTime?: boolean
    hadEquipment?: boolean
    followedRules?: boolean
  }
) {
  try {
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    let reliabilityChange = 0
    let completedTripsChange = 0

    switch (tripResult) {
      case 'COMPLETED':
        reliabilityChange = Math.min(2, 100 - Number(profile.reliability))
        completedTripsChange = 1
        
        // Дополнительные бонусы за хорошее поведение
        if (additionalData?.wasOnTime) reliabilityChange += 1
        if (additionalData?.hadEquipment) reliabilityChange += 1
        if (additionalData?.followedRules) reliabilityChange += 1
        break
        
      case 'CANCELLED':
        // Нейтральное влияние - поездка отменилась не по вине участника
        break
        
      case 'NO_SHOW':
        reliabilityChange = -Math.min(10, Number(profile.reliability))
        break
    }

    // Обновляем профиль
    await prisma.fisherProfile.update({
      where: { userId },
      data: {
        reliability: Math.max(0, Math.min(100, Number(profile.reliability) + reliabilityChange)),
        completedTrips: profile.completedTrips + completedTripsChange,
        lastActiveAt: new Date()
      }
    })

    // Обновляем badges
    if (tripResult === 'COMPLETED') {
      await awardBadgesBasedOnActivity(userId)
    }

    console.log(`Updated reputation for ${userId}: reliability ${reliabilityChange > 0 ? '+' : ''}${reliabilityChange}`)

    return { success: true }

  } catch (error) {
    console.error('Error updating reputation:', error)
    throw new Error('Failed to update reputation')
  }
}

/**
 * Получение рекомендаций для пользователя на основе профиля
 */
export async function getUserRecommendations(userId: string) {
  try {
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            groupBookings: {
              where: { status: 'CONFIRMED' },
              include: {
                trip: {
                  select: {
                    date: true,
                    timeSlot: true,
                    description: true
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        }
      }
    })

    if (!profile) {
      return { recommendations: [], reasons: [] }
    }

    const recommendations = []
    const reasons = []

    // Рекомендации на основе опыта
    if (profile.experience === 'BEGINNER') {
      recommendations.push('Попробуйте утренние поездки - они обычно более спокойные')
      reasons.push('Основано на вашем уровне опыта: Новичок')
    }

    if (profile.experience === 'EXPERT') {
      recommendations.push('Рассмотрите поездки в открытом море для лучшего улова')
      reasons.push('Основано на вашем экспертном уровне')
    }

    // Рекомендации на основе активности
    if (profile.completedTrips >= 5) {
      recommendations.push('Попробуйте новые места для рыбалки')
      reasons.push(`У вас уже ${profile.completedTrips} завершенных поездок`)
    }

    // Рекомендации на основе специализаций
    if (profile.specialties.includes('Спиннинг')) {
      recommendations.push('Ищите поездки с фокусом на хищную рыбу')
      reasons.push('Основано на вашей специализации: Спиннинг')
    }

    // Рекомендации на основе сезона
    const month = new Date().getMonth()
    if (month >= 11 || month <= 1) { // Зима
      recommendations.push('Зимние поездки отлично подходят для морской рыбалки')
      reasons.push('Сезонная рекомендация для зимнего периода')
    }

    return { recommendations, reasons }

  } catch (error) {
    console.error('Error getting recommendations:', error)
    return { recommendations: [], reasons: [] }
  }
}

/**
 * Создание custom badge для особых достижений
 */
export async function awardCustomBadge(
  userId: string,
  badgeData: {
    name: string
    description: string
    icon: string
    category: 'ACHIEVEMENT' | 'MILESTONE' | 'SPECIAL' | 'SEASONAL'
  }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Admin access required')
  }

  try {
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId }
    })

    if (!profile) {
      throw new Error('Profile not found')
    }

    // Проверяем, что такой badge еще не существует
    const existingBadge = await prisma.fisherBadge.findFirst({
      where: {
        profileId: profile.id,
        name: badgeData.name
      }
    })

    if (existingBadge) {
      throw new Error('Badge already exists')
    }

    const badge = await prisma.fisherBadge.create({
      data: {
        profileId: profile.id,
        name: badgeData.name,
        description: badgeData.description,
        icon: badgeData.icon,
        category: badgeData.category as BadgeCategory
      }
    })

    return { success: true, badge }

  } catch (error) {
    console.error('Error awarding custom badge:', error)
    throw new Error(error instanceof Error ? error.message : 'Failed to award badge')
  }
}
