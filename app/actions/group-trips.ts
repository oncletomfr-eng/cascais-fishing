'use server';

import { PrismaClient, GroupTripStatus, BookingStatus } from '@/lib/generated/prisma';
import { revalidatePath } from 'next/cache';
import { GroupTripUpdate } from '@/lib/types/group-events';
import { transformTripToDisplay } from '@/lib/utils/group-trips-utils';
import { auth } from '@/auth';

const prisma = new PrismaClient();

/**
 * Создание бронирования в групповой поездке
 */
export async function createGroupBooking(
  tripId: string,
  bookingData: {
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
    participants: number;
    specialRequests?: string;
  }
) {
  try {
    console.log('🎫 Creating group booking:', { tripId, ...bookingData });
    
    // Проверка аутентификации
    const session = await auth();
    console.log('🔧 Session check:', { hasSession: !!session, userId: session?.user?.id });
    
    // Если пользователь аутентифицирован, используем его ID
    // Если нет - продолжаем без userId для анонимных бронирований
    const userId = session?.user?.id;
    
    // Получаем информацию о поездке
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: BookingStatus.CONFIRMED
          }
        }
      }
    });
    
    if (!trip) {
      throw new Error('Trip not found');
    }
    
    if (trip.status === GroupTripStatus.CANCELLED) {
      throw new Error('Trip is cancelled');
    }
    
    // Проверяем доступность мест
    const currentParticipants = trip.bookings.reduce(
      (sum, booking) => sum + booking.participants, 
      0
    );
    
    const availableSpots = trip.maxParticipants - currentParticipants;
    
    if (bookingData.participants > availableSpots) {
      throw new Error(`Only ${availableSpots} spots available`);
    }
    
    // Рассчитываем цену
    const totalPrice = Number(trip.pricePerPerson) * bookingData.participants;
    
    // Создаем бронирование
    const newBooking = await prisma.groupBooking.create({
      data: {
        tripId,
        participants: bookingData.participants,
        totalPrice,
        contactName: bookingData.contactName,
        contactPhone: bookingData.contactPhone,
        contactEmail: bookingData.contactEmail,
        specialRequests: bookingData.specialRequests,
        status: BookingStatus.CONFIRMED, // Автоподтверждение для групп
        userId: userId // Связываем с аутентифицированным пользователем, если есть
      }
    });
    
    // Обновляем количество участников
    const newParticipantCount = currentParticipants + bookingData.participants;
    
    // Проверяем, нужно ли подтвердить поездку
    let updatedTrip = trip;
    if (newParticipantCount >= trip.minRequired && trip.status === GroupTripStatus.FORMING) {
      updatedTrip = await prisma.groupTrip.update({
        where: { id: tripId },
        data: { status: GroupTripStatus.CONFIRMED },
        include: {
          bookings: {
            where: {
              status: BookingStatus.CONFIRMED
            }
          }
        }
      });
    }
    
    // Создаем WebSocket обновление
    const wsUpdate: GroupTripUpdate = {
      tripId,
      type: 'participant_joined',
      currentParticipants: newParticipantCount,
      status: determineDisplayStatus(
        updatedTrip.status,
        newParticipantCount,
        trip.minRequired,
        trip.maxParticipants - newParticipantCount
      ),
      timestamp: new Date(),
      spotsRemaining: trip.maxParticipants - newParticipantCount,
      maxParticipants: trip.maxParticipants,
      participantName: bookingData.contactName
    };
    
    // Отправляем WebSocket обновление
    try {
      await broadcastTripUpdate(wsUpdate);
    } catch (wsError) {
      console.warn('⚠️ WebSocket broadcast failed:', wsError);
      // Не падаем если WebSocket недоступен
    }
    
    // Revalidate соответствующие страницы
    revalidatePath('/');
    revalidatePath('/group-events');
    revalidatePath('/test-group-events');
    
    console.log('✅ Group booking created:', newBooking.id);
    
    return {
      success: true,
      bookingId: newBooking.id,
      tripId,
      totalPrice,
      message: 'Booking created successfully',
      tripStatus: updatedTrip.status
    };
    
  } catch (error) {
    console.error('❌ Error creating group booking:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create booking'
    };
  }
}

/**
 * Отмена бронирования в группе
 */
export async function cancelGroupBooking(bookingId: string) {
  try {
    console.log('❌ Cancelling group booking:', bookingId);
    
    // Получаем бронирование
    const booking = await prisma.groupBooking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            bookings: {
              where: {
                status: BookingStatus.CONFIRMED,
                id: { not: bookingId }
              }
            }
          }
        }
      }
    });
    
    if (!booking) {
      throw new Error('Booking not found');
    }
    
    // Отменяем бронирование
    await prisma.groupBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED }
    });
    
    // Пересчитываем участников
    const remainingParticipants = booking.trip.bookings.reduce(
      (sum, b) => sum + b.participants, 
      0
    );
    
    // Проверяем, нужно ли вернуть поездку в статус FORMING
    let updatedTrip = booking.trip;
    if (remainingParticipants < booking.trip.minRequired && booking.trip.status === GroupTripStatus.CONFIRMED) {
      updatedTrip = await prisma.groupTrip.update({
        where: { id: booking.tripId },
        data: { status: GroupTripStatus.FORMING },
        include: {
          bookings: {
            where: {
              status: BookingStatus.CONFIRMED
            }
          }
        }
      });
    }
    
    // Создаем WebSocket обновление
    const wsUpdate: GroupTripUpdate = {
      tripId: booking.tripId,
      type: 'participant_left',
      currentParticipants: remainingParticipants,
      status: determineDisplayStatus(
        updatedTrip.status,
        remainingParticipants,
        booking.trip.minRequired,
        booking.trip.maxParticipants - remainingParticipants
      ),
      timestamp: new Date(),
      spotsRemaining: booking.trip.maxParticipants - remainingParticipants,
      maxParticipants: booking.trip.maxParticipants
    };
    
    // Отправляем WebSocket обновление
    try {
      await broadcastTripUpdate(wsUpdate);
    } catch (wsError) {
      console.warn('⚠️ WebSocket broadcast failed:', wsError);
    }
    
    // Revalidate страницы
    revalidatePath('/');
    revalidatePath('/group-events');
    revalidatePath('/test-group-events');
    
    console.log('✅ Group booking cancelled');
    
    return {
      success: true,
      message: 'Booking cancelled successfully'
    };
    
  } catch (error) {
    console.error('❌ Error cancelling group booking:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel booking'
    };
  }
}

/**
 * Получение деталей групповой поездки
 */
export async function getGroupTripDetails(tripId: string) {
  try {
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: BookingStatus.CONFIRMED
          },
          select: {
            id: true,
            participants: true,
            contactName: true,
            contactPhone: true,
            createdAt: true
          }
        }
      }
    });
    
    if (!trip) {
      throw new Error('Trip not found');
    }
    
    return {
      success: true,
      data: transformTripToDisplay(trip)
    };
    
  } catch (error) {
    console.error('❌ Error fetching trip details:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch trip'
    };
  }
}

/**
 * Создание новой групповой поездки
 */
export async function createGroupTrip(tripData: {
  date: Date;
  timeSlot: 'MORNING_9AM' | 'AFTERNOON_2PM';
  maxParticipants?: number;
  minRequired?: number;
  pricePerPerson?: number;
  description?: string;
  meetingPoint?: string;
  specialNotes?: string;
}) {
  try {
    console.log('🆕 Creating new group trip:', tripData);
    
    const newTrip = await prisma.groupTrip.create({
      data: {
        date: tripData.date,
        timeSlot: tripData.timeSlot,
        maxParticipants: tripData.maxParticipants || 8,
        minRequired: tripData.minRequired || 6,
        pricePerPerson: tripData.pricePerPerson || 95.00,
        description: tripData.description,
        meetingPoint: tripData.meetingPoint || 'Cascais Marina',
        specialNotes: tripData.specialNotes
      },
      include: {
        bookings: true
      }
    });
    
    console.log('✅ Group trip created:', newTrip.id);
    
    // Revalidate страницы
    revalidatePath('/');
    revalidatePath('/group-events');
    revalidatePath('/test-group-events');
    
    return {
      success: true,
      tripId: newTrip.id,
      data: transformTripToDisplay(newTrip),
      message: 'Trip created successfully'
    };
    
  } catch (error) {
    console.error('❌ Error creating group trip:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create trip'
    };
  }
}

/**
 * Определение статуса для отображения (вспомогательная функция)
 */
function determineDisplayStatus(
  prismaStatus: GroupTripStatus,
  currentParticipants: number,
  minRequired: number,
  spotsRemaining: number
): GroupTripUpdate['status'] {
  if (prismaStatus === GroupTripStatus.CANCELLED) return 'cancelled';
  if (prismaStatus === GroupTripStatus.CONFIRMED) return 'confirmed';
  if (currentParticipants >= minRequired) return 'confirmed';
  if (spotsRemaining <= 2) return 'almost_full';
  return 'forming';
}

/**
 * Отправка WebSocket обновления (интеграция с WebSocket endpoint)
 */
async function broadcastTripUpdate(update: GroupTripUpdate) {
  try {
    // Делаем POST запрос к WebSocket endpoint для отправки обновления
    const response = await fetch(`http://localhost:3000/api/group-trips/ws`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('📡 WebSocket broadcast result:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to broadcast WebSocket update:', error);
    throw error;
  }
}
