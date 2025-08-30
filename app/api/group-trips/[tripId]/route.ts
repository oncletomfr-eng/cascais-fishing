'use server';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transformTripToDisplay } from '@/lib/utils/group-trips-utils';
import { BookingStatus } from '@/lib/generated/prisma';
import { broadcastGroupTripUpdate } from '../ws/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;

    if (!tripId) {
      return NextResponse.json({
        success: false,
        error: 'Trip ID is required'
      }, { status: 400 });
    }

    // Получаем поездку из базы данных
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
            }
          },
          include: {
            user: true
          }
        },
        captain: true,
        reviews: {
          include: {
            fromUser: true,
            toUser: true
          }
        }
      }
    });

    if (!trip) {
      return NextResponse.json({
        success: false,
        error: 'Trip not found'
      }, { status: 404 });
    }

    // Преобразуем в расширенный формат для детальной страницы
    const displayTrip = {
      ...transformTripToDisplay(trip),
      // Дополнительные данные для детальной страницы
      captain: trip.captain ? {
        id: trip.captain.id,
        name: trip.captain.name,
        image: trip.captain.image,
        email: trip.captain.email
      } : null,
      reviews: trip.reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        fromUser: {
          id: review.fromUser.id,
          name: review.fromUser.name,
          image: review.fromUser.image
        },
        toUser: {
          id: review.toUser.id,
          name: review.toUser.name,
          image: review.toUser.image
        },
        createdAt: review.createdAt,
        verified: review.verified
      })),
      // Расширенная информация об участниках
      detailedParticipants: trip.bookings.map(booking => ({
        id: booking.id,
        contactName: booking.contactName,
        contactPhone: booking.contactPhone,
        participants: booking.participants,
        status: booking.status,
        createdAt: booking.createdAt,
        user: booking.user ? {
          id: booking.user.id,
          name: booking.user.name,
          image: booking.user.image,
          email: booking.user.email
        } : null
      })),
      // Дополнительные поля
      specialNotes: trip.specialNotes,
      meetingInstructions: 'Встречаемся у главного входа в марину за 15 минут до отправления. Возьмите с собой солнцезащитный крем и удобную обувь.',
      cancellationPolicy: 'Бесплатная отмена за 24 часа до поездки. При отмене менее чем за 24 часа возврат составляет 50%.',
      includedServices: [
        'Профессиональный гид',
        'Рыболовное оборудование',
        'Приманки и наживка',
        'Спасательные жилеты',
        'Напитки на борту',
        'Чистка улова'
      ],
      whatToBring: [
        'Солнцезащитный крем',
        'Удобная обувь',
        'Шляпа или кепка',
        'Камера для фото',
        'Личные лекарства'
      ]
    };

    return NextResponse.json({
      success: true,
      data: displayTrip
    });

  } catch (error) {
    console.error('Error fetching trip details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trip details'
    }, { status: 500 });
  }
}

// PUT endpoint для обновления поездки
export async function PUT(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;
    const body = await request.json();

    const updatedTrip = await prisma.groupTrip.update({
      where: { id: tripId },
      data: body,
      include: {
        bookings: {
          include: {
            user: true
          }
        },
        captain: true
      }
    });

    const displayTrip = transformTripToDisplay(updatedTrip);

    // Отправляем WebSocket обновление
    try {
      const currentParticipants = updatedTrip.bookings.reduce(
        (total: number, booking: any) => total + booking.participants,
        0
      );
      const spotsRemaining = updatedTrip.maxParticipants - currentParticipants;
      
      let status: 'forming' | 'almost_full' | 'confirmed' = 'forming';
      if (updatedTrip.status === 'CONFIRMED' || currentParticipants >= updatedTrip.minRequired) {
        status = 'confirmed';
      } else if (spotsRemaining <= 2) {
        status = 'almost_full';
      }
      
      await broadcastGroupTripUpdate({
        tripId: updatedTrip.id,
        type: 'status_changed',
        currentParticipants,
        status,
        timestamp: new Date(),
        spotsRemaining,
        maxParticipants: updatedTrip.maxParticipants
      });
      console.log('📡 Broadcasted trip update:', updatedTrip.id);
    } catch (wsError) {
      console.error('❌ WebSocket broadcast failed:', wsError);
    }

    return NextResponse.json({
      success: true,
      data: displayTrip
    });

  } catch (error) {
    console.error('Error updating trip:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update trip'
    }, { status: 500 });
  }
}

// POST endpoint для присоединения к поездке
export async function POST(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const { tripId } = params;
    const body = await request.json();
    const { participants = 1, contactName, contactPhone, contactEmail, specialRequests } = body;

    if (!contactName || !contactPhone) {
      return NextResponse.json({
        success: false,
        error: 'Contact name and phone are required'
      }, { status: 400 });
    }

    // Проверяем, что поездка существует и доступна
    const trip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
            }
          }
        }
      }
    });

    if (!trip) {
      return NextResponse.json({
        success: false,
        error: 'Trip not found'
      }, { status: 404 });
    }

    // Проверяем доступность мест
    const currentParticipants = trip.bookings.reduce(
      (total, booking) => total + booking.participants,
      0
    );
    const availableSpots = trip.maxParticipants - currentParticipants;

    if (participants > availableSpots) {
      return NextResponse.json({
        success: false,
        error: `Not enough spots available. Only ${availableSpots} spots left.`
      }, { status: 400 });
    }

    // Создаем новое бронирование
    const newBooking = await prisma.groupBooking.create({
      data: {
        tripId,
        participants,
        totalPrice: trip.pricePerPerson.mul(participants),
        contactName,
        contactPhone,
        contactEmail,
        specialRequests,
        status: BookingStatus.CONFIRMED // Автоматически подтверждаем для групповых поездок
      }
    });

    // Получаем обновленные данные поездки
    const updatedTrip = await prisma.groupTrip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
            }
          },
          include: {
            user: true
          }
        },
        captain: true
      }
    });

    if (updatedTrip) {
      // Рассчитываем новое состояние поездки
      const newCurrentParticipants = updatedTrip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );
      const spotsRemaining = updatedTrip.maxParticipants - newCurrentParticipants;
      
      let status: 'forming' | 'almost_full' | 'confirmed' = 'forming';
      if (updatedTrip.status === 'CONFIRMED' || newCurrentParticipants >= updatedTrip.minRequired) {
        status = 'confirmed';
        // Обновляем статус в БД если достигли минимального количества
        if (updatedTrip.status !== 'CONFIRMED') {
          await prisma.groupTrip.update({
            where: { id: tripId },
            data: { status: 'CONFIRMED' }
          });
        }
      } else if (spotsRemaining <= 2) {
        status = 'almost_full';
      }

      // Отправляем WebSocket обновление
      try {
        await broadcastGroupTripUpdate({
          tripId: updatedTrip.id,
          type: 'participant_joined',
          currentParticipants: newCurrentParticipants,
          status,
          timestamp: new Date(),
          spotsRemaining,
          maxParticipants: updatedTrip.maxParticipants,
          participantName: contactName
        });
        console.log('📡 Broadcasted participant joined:', updatedTrip.id, contactName);
      } catch (wsError) {
        console.error('❌ WebSocket broadcast failed:', wsError);
      }

      const displayTrip = transformTripToDisplay(updatedTrip);
      
      return NextResponse.json({
        success: true,
        message: 'Successfully joined the trip!',
        data: {
          booking: newBooking,
          trip: displayTrip
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the trip!',
      data: { booking: newBooking }
    });

  } catch (error) {
    console.error('Error joining trip:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to join trip'
    }, { status: 500 });
  }
}
