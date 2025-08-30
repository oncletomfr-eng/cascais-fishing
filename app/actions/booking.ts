'use server';

import { z } from 'zod';
import { BookingResponse } from '@/lib/types/booking';
import { 
  privateBookingSchema, 
  groupBookingSchema, 
  BOOKING_CONSTANTS 
} from '@/lib/schemas/booking';
import { prisma } from '@/lib/prisma';
import { 
  BookingStatus, 
  GroupTripStatus, 
  TimeSlot,
  Prisma
} from '@/lib/generated/prisma';
import {
  sendPrivateBookingConfirmation,
  sendGroupBookingConfirmation,
  sendGroupTripConfirmed,
} from '@/lib/services/email-service';
import { EMAIL_CONFIG } from '@/lib/config/email';

// Типы для server actions
interface SubmitBookingParams {
  formData: FormData;
  bookingType: 'private' | 'group';
}

// Конвертер времени в enum
function timeToEnum(time: string): TimeSlot {
  switch (time) {
    case '09:00':
      return TimeSlot.MORNING_9AM;
    case '14:00':
      return TimeSlot.AFTERNOON_2PM;
    default:
      throw new Error(`Invalid time slot: ${time}`);
  }
}

/**
 * Обработка приватного бронирования
 */
export async function submitPrivateBooking(formData: FormData): Promise<BookingResponse> {
  try {
    // Валидация данных
    const rawData = {
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      participants: Number(formData.get('participants')),
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || undefined,
    };

    const validationResult = privateBookingSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Ошибка валидации данных',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const booking = validationResult.data;

    // Создаем запись в базе данных
    const privateBooking = await prisma.privateBooking.create({
      data: {
        date: new Date(booking.date),
        timeSlot: timeToEnum(booking.time),
        participants: booking.participants,
        contactName: booking.name,
        contactPhone: booking.phone,
        contactEmail: booking.email,
        totalPrice: new Prisma.Decimal(BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE),
        status: BookingStatus.CONFIRMED,
      },
    });

    const confirmationCode = generateConfirmationCode(privateBooking.id);

    // Отправляем уведомления
    await sendPrivateBookingNotification({
      customerName: booking.name,
      customerEmail: booking.email,
      customerPhone: booking.phone,
      confirmationCode,
      date: booking.date,
      time: booking.time,
      participants: booking.participants,
      totalPrice: BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE,
    });

    return {
      success: true,
      message: 'Приватное бронирование успешно создано!',
      data: {
        bookingId: privateBooking.id,
        confirmationCode,
        totalPrice: BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE,
      },
    };

  } catch (error) {
    console.error('Error in submitPrivateBooking:', error);
    return {
      success: false,
      message: 'Произошла ошибка при обработке бронирования. Попробуйте еще раз.',
    };
  }
}

/**
 * Обработка группового бронирования
 */
export async function submitGroupBooking(formData: FormData): Promise<BookingResponse> {
  try {
    // Валидация данных
    const rawData = {
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      participants: Number(formData.get('participants')),
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string || undefined,
      selectedTripId: formData.get('selectedTripId') as string || undefined,
    };

    const validationResult = groupBookingSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      return {
        success: false,
        message: 'Ошибка валидации данных',
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const booking = validationResult.data;
    let tripId = booking.selectedTripId;
    let trip;

    // Если tripId не указан, создаем новую группу
    if (!tripId) {
      trip = await prisma.groupTrip.create({
        data: {
          date: new Date(booking.date),
          timeSlot: timeToEnum(booking.time),
          maxParticipants: BOOKING_CONSTANTS.GROUP_BOOKING.MAX_CAPACITY,
          minRequired: BOOKING_CONSTANTS.GROUP_BOOKING.MIN_PARTICIPANTS_TO_CONFIRM,
          pricePerPerson: new Prisma.Decimal(BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON),
          status: GroupTripStatus.FORMING,
        },
      });
      tripId = trip.id;
    } else {
      // Получаем существующую поездку с участниками
      trip = await prisma.groupTrip.findUnique({
        where: { id: tripId },
        include: {
          bookings: true,
        },
      });

      if (!trip) {
        return {
          success: false,
          message: 'Поездка не найдена',
        };
      }
    }

    // Проверяем вместимость
    const currentParticipants = trip.bookings?.reduce(
      (total, booking) => total + booking.participants,
      0
    ) || 0;

    if (currentParticipants + booking.participants > trip.maxParticipants) {
      return {
        success: false,
        message: 'В поездке недостаточно свободных мест',
      };
    }

    // Создаем групповое бронирование
    const totalPrice = booking.participants * Number(trip.pricePerPerson);
    
    const groupBooking = await prisma.groupBooking.create({
      data: {
        tripId: trip.id,
        participants: booking.participants,
        totalPrice: new Prisma.Decimal(totalPrice),
        contactName: booking.name,
        contactPhone: booking.phone,
        contactEmail: booking.email,
        status: BookingStatus.PENDING,
      },
    });

    // Обновляем статус поездки
    const newTotalParticipants = currentParticipants + booking.participants;
    const wasForming = trip.status === GroupTripStatus.FORMING;
    
    if (newTotalParticipants >= trip.minRequired && wasForming) {
      await prisma.groupTrip.update({
        where: { id: trip.id },
        data: { status: GroupTripStatus.CONFIRMED },
      });

      // Обновляем статусы всех бронирований на CONFIRMED
      await prisma.groupBooking.updateMany({
        where: { tripId: trip.id },
        data: { status: BookingStatus.CONFIRMED },
      });

      trip.status = GroupTripStatus.CONFIRMED;
    }

    const confirmationCode = generateConfirmationCode(groupBooking.id);

    // Отправляем уведомления новому участнику
    const statusMessage = trip.status === GroupTripStatus.CONFIRMED 
      ? 'Поездка подтверждена! Все детали будут отправлены за день до выхода.'
      : `Вы добавлены в группу! Осталось ${trip.minRequired - newTotalParticipants} мест до подтверждения поездки.`;

    const date = trip.date.toISOString().split('T')[0];
    const time = trip.timeSlot === TimeSlot.MORNING_9AM ? '09:00' : '14:00';

    await sendGroupBookingNotification({
      customerName: booking.name,
      customerEmail: booking.email,
      customerPhone: booking.phone,
      confirmationCode,
      date,
      time,
      participants: booking.participants,
      totalPrice,
      tripStatus: trip.status === GroupTripStatus.CONFIRMED ? 'confirmed' : 'forming',
      currentParticipants: newTotalParticipants,
      requiredParticipants: trip.minRequired,
      maxCapacity: trip.maxParticipants,
    });

    // Если поездка только что подтвердилась, уведомляем всех участников
    if (trip.status === GroupTripStatus.CONFIRMED && wasForming) {
      await notifyAllParticipants(trip.id);
    }

    return {
      success: true,
      tripId: trip.id,
      status: trip.status.toLowerCase() as any,
      message: statusMessage,
      data: {
        bookingId: groupBooking.id,
        confirmationCode,
        totalPrice,
      },
    };

  } catch (error) {
    console.error('Error in submitGroupBooking:', error);
    return {
      success: false,
      message: 'Произошла ошибка при обработке бронирования. Попробуйте еще раз.',
    };
  }
}

/**
 * Получение доступных групповых поездок
 */
export async function getAvailableGroupTrips(date?: string, time?: string) {
  try {
    const whereClause: any = {
      status: {
        in: [GroupTripStatus.FORMING, GroupTripStatus.CONFIRMED],
      },
      date: {
        gte: new Date(), // Только будущие поездки
      },
    };

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereClause.date = {
        gte: targetDate,
        lt: nextDay,
      };
    }

    if (time) {
      whereClause.timeSlot = timeToEnum(time);
    }

    const trips = await prisma.groupTrip.findMany({
      where: whereClause,
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { timeSlot: 'asc' },
      ],
    });

    // Фильтруем поездки с доступными местами
    const availableTrips = trips.filter(trip => {
      const currentParticipants = trip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );
      return currentParticipants < trip.maxParticipants;
    });

    // Преобразуем в формат, совместимый с frontend
    return availableTrips.map(trip => {
      const currentParticipants = trip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );

      return {
        tripId: trip.id,
        date: trip.date.toISOString().split('T')[0],
        time: trip.timeSlot === TimeSlot.MORNING_9AM ? '09:00' : '14:00',
        participants: trip.bookings.map(booking => ({
          id: booking.id,
          contactInfo: {
            name: booking.contactName,
            phone: booking.contactPhone,
            email: booking.contactEmail,
          },
          participantCount: booking.participants,
          bookedAt: booking.createdAt,
        })),
        status: trip.status.toLowerCase(),
        minRequired: trip.minRequired,
        maxCapacity: trip.maxParticipants,
        pricePerPerson: Number(trip.pricePerPerson),
        currentParticipants,
        availableSpots: trip.maxParticipants - currentParticipants,
        createdAt: trip.createdAt,
      };
    });
  } catch (error) {
    console.error('Error in getAvailableGroupTrips:', error);
    return [];
  }
}

/**
 * Отправка уведомления для приватного бронирования
 */
async function sendPrivateBookingNotification(
  bookingData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    confirmationCode: string;
    date: string;
    time: string;
    participants: number;
    totalPrice: number;
  }
): Promise<void> {
  try {
    // Логируем для WhatsApp (пока заглушка)
    console.log(`📱 WhatsApp для ${bookingData.customerPhone}: Приватное бронирование ${bookingData.confirmationCode}`);
    
    // Отправляем email если есть адрес
    if (bookingData.customerEmail) {
      await sendPrivateBookingConfirmation(bookingData.customerEmail, {
        customerName: bookingData.customerName,
        confirmationCode: bookingData.confirmationCode,
        date: bookingData.date,
        time: bookingData.time,
        participants: bookingData.participants,
        totalPrice: bookingData.totalPrice,
        customerPhone: bookingData.customerPhone,
      });
      
      console.log(`📧 Email отправлен на ${bookingData.customerEmail}`);
    } else {
      console.log(`📧 Email не отправлен - адрес не указан`);
    }
  } catch (error) {
    console.error('Error sending private booking notification:', error);
  }
}

/**
 * Отправка уведомления для группового бронирования
 */
async function sendGroupBookingNotification(
  bookingData: {
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    confirmationCode: string;
    date: string;
    time: string;
    participants: number;
    totalPrice: number;
    tripStatus: 'forming' | 'confirmed';
    currentParticipants: number;
    requiredParticipants: number;
    maxCapacity: number;
  }
): Promise<void> {
  try {
    // Логируем для WhatsApp (пока заглушка)  
    console.log(`📱 WhatsApp для ${bookingData.customerPhone}: Групповое бронирование ${bookingData.confirmationCode}`);
    
    // Отправляем email если есть адрес
    if (bookingData.customerEmail) {
      await sendGroupBookingConfirmation(bookingData.customerEmail, {
        customerName: bookingData.customerName,
        confirmationCode: bookingData.confirmationCode,
        date: bookingData.date,
        time: bookingData.time,
        participants: bookingData.participants,
        totalPrice: bookingData.totalPrice,
        customerPhone: bookingData.customerPhone,
        tripStatus: bookingData.tripStatus,
        currentParticipants: bookingData.currentParticipants,
        requiredParticipants: bookingData.requiredParticipants,
        maxCapacity: bookingData.maxCapacity,
      });
      
      console.log(`📧 Email отправлен на ${bookingData.customerEmail}`);
    } else {
      console.log(`📧 Email не отправлен - адрес не указан`);
    }
  } catch (error) {
    console.error('Error sending group booking notification:', error);
  }
}

/**
 * Уведомление всех участников о подтверждении поездки
 */
async function notifyAllParticipants(tripId: string): Promise<void> {
  try {
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
        },
      },
    });

    if (!trip) return;

    const totalParticipants = trip.bookings.reduce(
      (total, booking) => total + booking.participants,
      0
    );

    const date = trip.date.toISOString().split('T')[0];
    const time = trip.timeSlot === TimeSlot.MORNING_9AM ? '09:00' : '14:00';

    // Отправляем email всем участникам
    const emailPromises = trip.bookings.map(async (booking) => {
      try {
        const confirmationCode = generateConfirmationCode(booking.id);
        
        // Логируем WhatsApp (пока заглушка)
        console.log(`📱 WhatsApp для ${booking.contactPhone}: Поездка подтверждена! Trip: ${tripId}`);
        
        // Отправляем email если есть адрес
        if (booking.contactEmail) {
          await sendGroupTripConfirmed(booking.contactEmail, {
            customerName: booking.contactName,
            confirmationCode,
            date,
            time,
            totalParticipants,
            customerPhone: booking.contactPhone,
          });
          
          console.log(`📧 Email о подтверждении отправлен на ${booking.contactEmail}`);
        } else {
          console.log(`📧 Email не отправлен для ${booking.contactName} - адрес не указан`);
        }
      } catch (error) {
        console.error(`Error notifying participant ${booking.contactName}:`, error);
      }
    });

    await Promise.allSettled(emailPromises);
  } catch (error) {
    console.error('Error in notifyAllParticipants:', error);
  }
}

/**
 * Генерация кода подтверждения
 */
function generateConfirmationCode(bookingId: string): string {
  const hash = bookingId.substring(0, 6);
  return hash.toUpperCase();
}

/**
 * Утилита для расчета цены
 */
export async function calculateBookingPrice(
  bookingType: 'private' | 'group',
  participants: number
): Promise<{ total: number; perPerson: number }> {
  if (bookingType === 'private') {
    return {
      total: BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE,
      perPerson: BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE / participants,
    };
  } else {
    const total = participants * BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON;
    return {
      total,
      perPerson: BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON,
    };
  }
}

/**
 * Получение статуса поездки
 */
export async function getTripStatus(tripId: string) {
  try {
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
            },
          },
        },
      },
    });
    
    if (!trip) {
      return null;
    }

    const currentParticipants = trip.bookings.reduce(
      (total, booking) => total + booking.participants,
      0
    );

    return {
      tripId,
      status: trip.status.toLowerCase(),
      currentParticipants,
      requiredParticipants: trip.minRequired,
      maxCapacity: trip.maxParticipants,
      availableSpots: trip.maxParticipants - currentParticipants,
      isConfirmed: trip.status === GroupTripStatus.CONFIRMED,
    };
  } catch (error) {
    console.error('Error in getTripStatus:', error);
    return null;
  }
}
