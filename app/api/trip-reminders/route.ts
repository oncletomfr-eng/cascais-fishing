import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { sendGroupTripConfirmed } from '@/lib/services/email-service';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * POST /api/trip-reminders - отправить напоминания о предстоящих поездках
 * Body: { action: 'send_24h_reminders', tripId?: string }
 * 
 * Автоматически находит поездки, которые начинаются через 24 часа,
 * и отправляет напоминания всем подтвержденным участникам
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { action, tripId } = await request.json();

    if (action === 'send_24h_reminders') {
      const result = await send24HourReminders(tripId);
      return NextResponse.json({
        success: true,
        ...result
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Error in trip reminders:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send reminders'
    }, { status: 500 });
  }
}

/**
 * GET /api/trip-reminders - получить список поездок для напоминаний
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const status = searchParams.get('status') || 'pending';

    const now = new Date();
    const targetTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    // Find trips that are coming up in the specified timeframe
    const upcomingTrips = await prisma.groupTrip.findMany({
      where: {
        date: {
          gte: now,
          lte: targetTime
        },
        status: {
          in: ['CONFIRMED', 'FORMING']
        }
      },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          include: { user: true }
        },
        captain: true
      },
      orderBy: { date: 'asc' }
    });

    const tripsWithReminders = upcomingTrips.map(trip => ({
      id: trip.id,
      title: trip.title || trip.description,
      date: trip.date,
      timeSlot: trip.timeSlot,
      status: trip.status,
      participantCount: trip.bookings.length,
      participants: trip.bookings.map(b => ({
        id: b.user?.id,
        name: b.user?.name,
        email: b.user?.email
      })).filter(p => p.email),
      captain: trip.captain ? {
        id: trip.captain.id,
        name: trip.captain.name,
        email: trip.captain.email
      } : null,
      hoursUntilTrip: Math.round((trip.date.getTime() - now.getTime()) / (60 * 60 * 1000))
    }));

    return NextResponse.json({
      success: true,
      trips: tripsWithReminders,
      count: tripsWithReminders.length,
      targetHours: hours
    });

  } catch (error) {
    console.error('Error fetching trip reminders:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch trips'
    }, { status: 500 });
  }
}

/**
 * Send 24-hour reminders to participants of upcoming trips
 */
async function send24HourReminders(specificTripId?: string) {
  try {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const twentyThreeHoursFromNow = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    let whereClause: any = {
      date: {
        gte: twentyThreeHoursFromNow,
        lte: twentyFourHoursFromNow
      },
      status: {
        in: ['CONFIRMED', 'FORMING']
      }
    };

    if (specificTripId) {
      whereClause.id = specificTripId;
    }

    const upcomingTrips = await prisma.groupTrip.findMany({
      where: whereClause,
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          include: { user: true }
        },
        captain: true
      }
    });

    let emailsSent = 0;
    let errors = 0;

    for (const trip of upcomingTrips) {
      const participants = trip.bookings.filter(b => b.user?.email);
      
      // Send reminder to each participant
      for (const booking of participants) {
        if (!booking.user?.email) continue;

        try {
          const emailResult = await sendGroupTripConfirmed(booking.user.email, {
            customerName: booking.user.name || 'Участник',
            confirmationCode: trip.id,
            date: format(new Date(trip.date), 'dd MMMM yyyy', { locale: ru }),
            time: trip.timeSlot || 'Время уточняется',
            totalParticipants: participants.length,
            customerPhone: trip.captain?.fisherProfile?.phone || ''
          });

          if (emailResult.success) {
            console.log(`📧 24h reminder sent to: ${booking.user.email} for trip ${trip.id}`);
            emailsSent++;
          } else {
            console.warn(`⚠️ Failed to send 24h reminder to ${booking.user.email}:`, emailResult.error);
            errors++;
          }
        } catch (emailError) {
          console.error(`❌ 24h reminder email error for ${booking.user.email}:`, emailError);
          errors++;
        }
      }

      // Also send reminder to captain
      if (trip.captain?.email) {
        try {
          const emailResult = await sendGroupTripConfirmed(trip.captain.email, {
            customerName: trip.captain.name || 'Капитан',
            confirmationCode: `CAPTAIN-${trip.id}`,
            date: format(new Date(trip.date), 'dd MMMM yyyy', { locale: ru }),
            time: trip.timeSlot || 'Время уточняется',
            totalParticipants: participants.length,
            customerPhone: ''
          });

          if (emailResult.success) {
            console.log(`📧 Captain 24h reminder sent to: ${trip.captain.email} for trip ${trip.id}`);
            emailsSent++;
          } else {
            console.warn(`⚠️ Failed to send captain 24h reminder to ${trip.captain.email}:`, emailResult.error);
            errors++;
          }
        } catch (emailError) {
          console.error(`❌ Captain 24h reminder email error for ${trip.captain.email}:`, emailError);
          errors++;
        }
      }
    }

    return {
      emailsSent,
      errors,
      tripsProcessed: upcomingTrips.length,
      message: `Processed ${upcomingTrips.length} trips, sent ${emailsSent} 24h reminders`
    };

  } catch (error) {
    console.error('❌ Error sending 24h reminders:', error);
    return { emailsSent: 0, errors: 1, tripsProcessed: 0, error: error.message };
  }
}
