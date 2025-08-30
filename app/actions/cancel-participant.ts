'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { BookingStatus } from '@/lib/generated/prisma'
import { broadcastGroupTripUpdate } from '@/app/api/group-trips/ws/route'

/**
 * 🚫 Отмена участника из групповой поездки
 * Реальная интеграция с базой данных Prisma
 */
export async function cancelParticipant(bookingId: string, reason?: string) {
  if (!bookingId) {
    return {
      success: false,
      error: 'ID бронирования обязательно'
    }
  }

  try {
    console.log(`🚫 Starting participant cancellation for booking: ${bookingId}`)

    // Используем Prisma транзакцию для атомарности операций
    const result = await prisma.$transaction(async (tx) => {
      // 1. Найти и обновить бронирование
      const booking = await tx.groupBooking.findUnique({
        where: { id: bookingId },
        include: { 
          trip: true,
          user: true 
        }
      })

      if (!booking) {
        throw new Error(`Бронирование с ID ${bookingId} не найдено`)
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new Error('Участник уже отменен')
      }

      // 2. Отменить бронирование
      const cancelledBooking = await tx.groupBooking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          specialRequests: reason ? `Отменено: ${reason}` : 'Отменено участником',
          updatedAt: new Date()
        },
        include: {
          trip: true,
          user: true
        }
      })

      // 3. Получить все активные бронирования для пересчета
      const activeBookings = await tx.groupBooking.findMany({
        where: {
          tripId: booking.tripId,
          status: {
            in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
          }
        }
      })

      // 4. Пересчитать текущее количество участников
      const currentParticipants = activeBookings.reduce(
        (total, booking) => total + booking.participants,
        0
      )

      // 5. Определить новый статус поездки
      const spotsRemaining = booking.trip.maxParticipants - currentParticipants
      let newTripStatus = booking.trip.status
      
      // Если стало меньше минимума - поездка формируется
      if (currentParticipants < booking.trip.minRequired && booking.trip.status === 'CONFIRMED') {
        newTripStatus = 'FORMING'
      }

      // 6. Обновить статус поездки если нужно
      let updatedTrip = booking.trip
      if (newTripStatus !== booking.trip.status) {
        updatedTrip = await tx.groupTrip.update({
          where: { id: booking.tripId },
          data: { 
            status: newTripStatus as any,
            updatedAt: new Date()
          }
        })
      }

      return {
        cancelledBooking,
        trip: updatedTrip,
        currentParticipants,
        spotsRemaining,
        activeBookingsCount: activeBookings.length
      }
    })

    console.log(`✅ Participant cancelled successfully:`, {
      bookingId: result.cancelledBooking.id,
      participantName: result.cancelledBooking.contactName,
      tripId: result.trip.id,
      currentParticipants: result.currentParticipants,
      spotsRemaining: result.spotsRemaining
    })

    // 7. Отправить WebSocket событие в реальном времени
    const wsUpdate = await broadcastGroupTripUpdate({
      tripId: result.trip.id,
      type: 'participant_cancelled',
      currentParticipants: result.currentParticipants,
      status: result.currentParticipants >= result.trip.minRequired ? 'confirmed' : 'forming',
      timestamp: new Date(),
      spotsRemaining: result.spotsRemaining,
      maxParticipants: result.trip.maxParticipants,
      cancellationData: {
        participantName: result.cancelledBooking.contactName,
        reason: reason || 'Не указана',
        refundStatus: 'pending',
        spotsFreed: result.cancelledBooking.participants
      }
    })

    console.log(`📡 WebSocket event sent to ${wsUpdate} clients`)

    // 8. Обновить кеш Next.js
    revalidatePath('/group-events')
    revalidatePath(`/trip/${result.trip.id}`)
    revalidateTag('group-trips')
    revalidateTag('bookings')

    console.log('🔄 Cache revalidated')

    return {
      success: true,
      data: {
        cancelledBooking: {
          id: result.cancelledBooking.id,
          contactName: result.cancelledBooking.contactName,
          participants: result.cancelledBooking.participants
        },
        trip: {
          id: result.trip.id,
          currentParticipants: result.currentParticipants,
          spotsRemaining: result.spotsRemaining,
          status: result.currentParticipants >= result.trip.minRequired ? 'confirmed' : 'forming'
        },
        websocketClients: wsUpdate
      }
    }

  } catch (error) {
    console.error('❌ Error cancelling participant:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка при отмене участника'
    }
  }
}

/**
 * 📊 Получить статистику отмен для групповой поездки
 */
export async function getTripCancellationStats(tripId: string) {
  if (!tripId) {
    return {
      success: false,
      error: 'ID поездки обязательно'
    }
  }

  try {
    const stats = await prisma.$transaction(async (tx) => {
      // Получить все бронирования для поездки
      const allBookings = await tx.groupBooking.findMany({
        where: { tripId },
        include: { user: true }
      })

      // Разделить по статусам
      const activeBookings = allBookings.filter(b => 
        b.status === BookingStatus.PENDING || b.status === BookingStatus.CONFIRMED
      )
      const cancelledBookings = allBookings.filter(b => 
        b.status === BookingStatus.CANCELLED
      )

      // Подсчитать участников
      const currentParticipants = activeBookings.reduce((sum, b) => sum + b.participants, 0)
      const cancelledParticipants = cancelledBookings.reduce((sum, b) => sum + b.participants, 0)

      // Получить информацию о поездке
      const trip = await tx.groupTrip.findUnique({ where: { id: tripId } })

      return {
        tripId,
        trip,
        totalBookings: allBookings.length,
        activeBookings: activeBookings.length,
        cancelledBookings: cancelledBookings.length,
        currentParticipants,
        cancelledParticipants,
        spotsRemaining: trip ? trip.maxParticipants - currentParticipants : 0,
        cancellationRate: allBookings.length > 0 ? 
          Math.round((cancelledBookings.length / allBookings.length) * 100) : 0,
        recentCancellations: cancelledBookings
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .slice(0, 5)
          .map(b => ({
            id: b.id,
            contactName: b.contactName,
            participants: b.participants,
            cancelledAt: b.updatedAt,
            reason: b.specialRequests
          }))
      }
    })

    return {
      success: true,
      data: stats
    }

  } catch (error) {
    console.error('❌ Error getting cancellation stats:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка получения статистики отмен'
    }
  }
}

/**
 * 📝 Создать тестовое бронирование для демонстрации отмены
 */
export async function createTestBooking(tripId: string, participantName: string = 'Test Participant') {
  try {
    const testBooking = await prisma.groupBooking.create({
      data: {
        tripId,
        participants: 1,
        totalPrice: 95.00,
        contactName: participantName,
        contactPhone: '+351912345678',
        contactEmail: 'test@example.com',
        status: BookingStatus.CONFIRMED,
        specialRequests: 'Тестовое бронирование для демонстрации отмены'
      },
      include: {
        trip: true
      }
    })

    // Обновить кеш
    revalidatePath('/group-events')
    revalidateTag('group-trips')

    console.log(`✅ Test booking created: ${testBooking.id} for trip ${tripId}`)

    return {
      success: true,
      data: testBooking
    }

  } catch (error) {
    console.error('❌ Error creating test booking:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка создания тестового бронирования'
    }
  }
}
