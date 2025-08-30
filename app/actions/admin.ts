'use server'

import { prisma } from '@/lib/prisma'
import { checkAdminAuth } from '@/lib/auth-helpers'
import { BookingStatus, GroupTripStatus, TimeSlot, Prisma } from '@/lib/generated/prisma'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { revalidatePath } from 'next/cache'

// Note: AdminLogin/Logout is now handled by NextAuth.js

/**
 * Получение статистики для дашборда
 */
export async function getDashboardStats() {
  const isAuthenticated = await checkAdminAuth()
  if (!isAuthenticated) {
    throw new Error('Unauthorized')
  }

  try {
    // Temporary mock data while database is not set up
    console.log('⚠️  Using mock data for dashboard stats (database not configured)')
    
    // Mock данные для демонстрации админ панели
    const totalPrivateBookings = 25
    const pendingPrivateBookings = 3
    const confirmedPrivateBookings = 18
    const todayPrivateBookings = 2

    const totalGroupBookings = 42
    const pendingGroupBookings = 7  
    const confirmedGroupBookings = 28
    const todayGroupBookings = 5

    const weeklyPrivateRevenue = 2400
    const weeklyGroupRevenue = 1680
    const weeklyRevenue = weeklyPrivateRevenue + weeklyGroupRevenue

    return {
      totalBookings: totalPrivateBookings + totalGroupBookings,
      pendingBookings: pendingPrivateBookings + pendingGroupBookings,
      confirmedBookings: confirmedPrivateBookings + confirmedGroupBookings,
      todayBookings: todayPrivateBookings + todayGroupBookings,
      weeklyRevenue: Math.round(weeklyRevenue),
      
      // Дополнительные данные для расширенной статистики
      totalPrivateBookings,
      totalGroupBookings,
      pendingPrivateBookings,
      pendingGroupBookings,
      confirmedPrivateBookings,
      confirmedGroupBookings,
      todayPrivateBookings,
      todayGroupBookings,
      weeklyPrivateRevenue,
      weeklyGroupRevenue
    }

  } catch (error) {
    console.error('Error getting dashboard stats:', error)
    throw new Error('Failed to load dashboard statistics')
  }
}

/**
 * Получение всех бронирований для таблицы
 */
export async function getAllBookings(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
  type?: 'private' | 'group'
}) {
  const isAuthenticated = await checkAdminAuth()
  if (!isAuthenticated) {
    throw new Error('Unauthorized')
  }

  try {
    console.log('⚠️  Using mock data for all bookings (database not configured)')
    
    // Mock данные для демонстрации
    const mockPrivateBookings = filters?.type === 'group' ? [] : [
      {
        id: 'private-1',
        customerName: 'João Silva',
        customerEmail: 'joao@example.com', 
        customerPhone: '+351 934 027 852',
        date: new Date('2025-02-01'),
        numberOfPeople: 4,
        timeSlot: 'MORNING' as TimeSlot,
        status: 'CONFIRMED' as BookingStatus,
        totalPrice: 400,
        createdAt: new Date('2025-01-25'),
        updatedAt: new Date('2025-01-25')
      },
      {
        id: 'private-2', 
        customerName: 'Maria Santos',
        customerEmail: 'maria@example.com',
        customerPhone: '+351 912 345 678',
        date: new Date('2025-02-03'),
        numberOfPeople: 2,
        timeSlot: 'AFTERNOON' as TimeSlot,
        status: 'PENDING' as BookingStatus,
        totalPrice: 400,
        createdAt: new Date('2025-01-26'),
        updatedAt: new Date('2025-01-26')
      }
    ]
    
    const mockGroupBookings = filters?.type === 'private' ? [] : [
      {
        id: 'group-1',
        customerName: 'Hans Mueller',
        customerEmail: 'hans@example.com',
        customerPhone: '+49 123 456 789', 
        numberOfPeople: 2,
        status: 'CONFIRMED' as BookingStatus,
        totalPrice: 190,
        createdAt: new Date('2025-01-27'),
        updatedAt: new Date('2025-01-27'),
        trip: {
          id: 'trip-1',
          date: new Date('2025-02-05'),
          timeSlot: 'MORNING' as TimeSlot,
          status: 'ACTIVE' as GroupTripStatus
        }
      },
      {
        id: 'group-2',
        customerName: 'James Wilson', 
        customerEmail: 'james@example.com',
        customerPhone: '+1 555 123 4567',
        numberOfPeople: 1,
        status: 'PENDING' as BookingStatus,
        totalPrice: 95,
        createdAt: new Date('2025-01-28'),
        updatedAt: new Date('2025-01-28'),
        trip: {
          id: 'trip-2',
          date: new Date('2025-02-07'),
          timeSlot: 'AFTERNOON' as TimeSlot,
          status: 'ACTIVE' as GroupTripStatus
        }
      }
    ]

    const [privateBookings, groupBookings] = [mockPrivateBookings, mockGroupBookings]

    // Преобразование в единый формат
    const allBookings = [
      ...privateBookings.map(booking => ({
        id: booking.id,
        type: 'private' as const,
        status: booking.status,
        date: booking.date,
        timeSlot: booking.timeSlot,
        participants: booking.participants,
        contactName: booking.contactName,
        contactPhone: booking.contactPhone,
        contactEmail: booking.contactEmail,
        totalPrice: Number(booking.totalPrice),
        specialRequests: booking.specialRequests,
        createdAt: booking.createdAt,
        // Поля специфичные для приватных бронирований
        tripDetails: null
      })),
      ...groupBookings.map(booking => ({
        id: booking.id,
        type: 'group' as const,
        status: booking.status,
        date: booking.trip.date,
        timeSlot: booking.trip.timeSlot,
        participants: booking.participants,
        contactName: booking.contactName,
        contactPhone: booking.contactPhone,
        contactEmail: booking.contactEmail,
        totalPrice: Number(booking.totalPrice),
        specialRequests: booking.specialRequests,
        createdAt: booking.createdAt,
        // Поля специфичные для групповых бронирований
        tripDetails: {
          tripId: booking.trip.id,
          tripStatus: booking.trip.status,
          maxParticipants: booking.trip.maxParticipants,
          minRequired: booking.trip.minRequired,
          pricePerPerson: Number(booking.trip.pricePerPerson)
        }
      }))
    ]

    // Сортировка по дате создания
    allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return allBookings

  } catch (error) {
    console.error('Error getting all bookings:', error)
    throw new Error('Failed to load bookings')
  }
}

/**
 * Обновление статуса бронирования
 */
export async function updateBookingStatus(
  bookingId: string,
  bookingType: 'private' | 'group',
  newStatus: BookingStatus
) {
  const isAuthenticated = await checkAdminAuth()
  if (!isAuthenticated) {
    throw new Error('Unauthorized')
  }

  try {
    if (bookingType === 'private') {
      await prisma.privateBooking.update({
        where: { id: bookingId },
        data: { status: newStatus }
      })
    } else {
      await prisma.groupBooking.update({
        where: { id: bookingId },
        data: { status: newStatus }
      })

      // Если подтверждаем групповое бронирование, проверяем статус поездки
      if (newStatus === BookingStatus.CONFIRMED) {
        const booking = await prisma.groupBooking.findUnique({
          where: { id: bookingId },
          include: {
            trip: {
              include: { bookings: true }
            }
          }
        })

        if (booking?.trip) {
          const confirmedBookings = booking.trip.bookings.filter(
            b => b.status === BookingStatus.CONFIRMED
          )
          const totalParticipants = confirmedBookings.reduce(
            (sum, b) => sum + b.participants, 0
          )

          // Подтверждаем поездку если достигнут минимум участников
          if (totalParticipants >= booking.trip.minRequired && 
              booking.trip.status === GroupTripStatus.FORMING) {
            await prisma.groupTrip.update({
              where: { id: booking.trip.id },
              data: { status: GroupTripStatus.CONFIRMED }
            })
          }
        }
      }
    }

    revalidatePath('/admin/bookings')
    return { success: true, message: 'Status updated successfully' }

  } catch (error) {
    console.error('Error updating booking status:', error)
    return { success: false, message: 'Failed to update status' }
  }
}

/**
 * Получение детальной информации о бронировании
 */
export async function getBookingDetails(bookingId: string, bookingType: 'private' | 'group') {
  const isAuthenticated = await checkAdminAuth()
  if (!isAuthenticated) {
    throw new Error('Unauthorized')
  }

  try {
    if (bookingType === 'private') {
      const booking = await prisma.privateBooking.findUnique({
        where: { id: bookingId }
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      return {
        ...booking,
        totalPrice: Number(booking.totalPrice),
        type: 'private'
      }
    } else {
      const booking = await prisma.groupBooking.findUnique({
        where: { id: bookingId },
        include: {
          trip: {
            include: {
              bookings: {
                select: {
                  id: true,
                  participants: true,
                  contactName: true,
                  status: true
                }
              }
            }
          }
        }
      })

      if (!booking) {
        throw new Error('Booking not found')
      }

      return {
        ...booking,
        totalPrice: Number(booking.totalPrice),
        type: 'group',
        trip: {
          ...booking.trip,
          pricePerPerson: Number(booking.trip.pricePerPerson)
        }
      }
    }

  } catch (error) {
    console.error('Error getting booking details:', error)
    throw new Error('Failed to load booking details')
  }
}
