import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { sendGroupTripConfirmed } from '@/lib/services/email-service';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * POST /api/captain-reports - отправить отчеты капитанам
 * Body: { 
 *   action: 'send_weekly_reports' | 'send_monthly_reports',
 *   captainId?: string 
 * }
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

    const { action, captainId } = await request.json();

    if (action === 'send_weekly_reports') {
      const result = await sendCaptainReports('weekly', captainId);
      return NextResponse.json({
        success: true,
        ...result
      });
    } else if (action === 'send_monthly_reports') {
      const result = await sendCaptainReports('monthly', captainId);
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
    console.error('Error in captain reports:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send reports'
    }, { status: 500 });
  }
}

/**
 * GET /api/captain-reports - получить данные отчетов для капитанов
 * Query params:
 * - period: 'weekly' | 'monthly'
 * - captainId: specific captain (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'weekly';
    const captainId = searchParams.get('captainId');

    const reportData = await generateCaptainReportData(period as 'weekly' | 'monthly', captainId);

    return NextResponse.json({
      success: true,
      ...reportData
    });

  } catch (error) {
    console.error('Error fetching captain reports:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch reports'
    }, { status: 500 });
  }
}

/**
 * Generate and send captain reports
 */
async function sendCaptainReports(period: 'weekly' | 'monthly', specificCaptainId?: string) {
  try {
    const reportData = await generateCaptainReportData(period, specificCaptainId);
    
    let emailsSent = 0;
    let errors = 0;

    for (const captain of reportData.captains) {
      if (!captain.email) continue;

      try {
        // Create email content summary
        const summary = `
📊 Отчет ${period === 'weekly' ? 'за неделю' : 'за месяц'}:
• Всего поездок: ${captain.stats.totalTrips}
• Подтвержденных: ${captain.stats.confirmedTrips}  
• Участников: ${captain.stats.totalParticipants}
• Средний рейтинг: ${captain.stats.averageRating}/5
• Доходы: €${captain.stats.totalEarnings}

${captain.upcomingTrips.length > 0 ? 
  `🔮 Предстоящие поездки:\n${captain.upcomingTrips.map(trip => 
    `• ${format(new Date(trip.date), 'dd MMM', { locale: ru })} - ${trip.participants} чел.`
  ).join('\n')}` : 
  '📅 Нет предстоящих поездок'
}
        `.trim();

        const emailResult = await sendGroupTripConfirmed(captain.email, {
          customerName: captain.name || 'Капитан',
          confirmationCode: `REPORT-${period.toUpperCase()}`,
          date: format(new Date(), 'dd MMMM yyyy', { locale: ru }),
          time: 'Отчет готов',
          totalParticipants: captain.stats.totalParticipants,
          customerPhone: summary
        });

        if (emailResult.success) {
          console.log(`📧 Captain ${period} report sent to: ${captain.email}`);
          emailsSent++;
        } else {
          console.warn(`⚠️ Failed to send captain ${period} report to ${captain.email}:`, emailResult.error);
          errors++;
        }
      } catch (emailError) {
        console.error(`❌ Captain ${period} report email error for ${captain.email}:`, emailError);
        errors++;
      }
    }

    return {
      emailsSent,
      errors,
      captainsProcessed: reportData.captains.length,
      period,
      message: `Sent ${emailsSent} ${period} reports to captains`
    };

  } catch (error) {
    console.error(`❌ Error sending captain ${period} reports:`, error);
    return { emailsSent: 0, errors: 1, captainsProcessed: 0, error: error.message };
  }
}

/**
 * Generate captain report data for specified period
 */
async function generateCaptainReportData(period: 'weekly' | 'monthly', specificCaptainId?: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'weekly') {
    startDate = startOfWeek(now, { weekStartsOn: 1 }); // Start on Monday
    endDate = endOfWeek(now, { weekStartsOn: 1 });
  } else {
    startDate = startOfMonth(now);
    endDate = endOfMonth(now);
  }

  let captainWhere: any = {};
  if (specificCaptainId) {
    captainWhere.id = specificCaptainId;
  }

  // Get all captains with their trips in the period
  const captains = await prisma.user.findMany({
    where: {
      ...captainWhere,
      // Ensure user has captain data and trips
      groupTripsAsCaptain: {
        some: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      }
    },
    include: {
      groupTripsAsCaptain: {
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          bookings: {
            where: { status: 'CONFIRMED' }
          },
          reviews: {
            include: {
              fromUser: true
            }
          }
        }
      },
      fisherProfile: true
    }
  });

  // Get upcoming trips for each captain  
  const upcomingDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Next 30 days

  const captainReports = await Promise.all(
    captains.map(async (captain) => {
      // Calculate stats for the period
      const trips = captain.groupTripsAsCaptain;
      const totalTrips = trips.length;
      const confirmedTrips = trips.filter(t => t.status === 'CONFIRMED').length;
      const totalParticipants = trips.reduce((sum, trip) => sum + trip.bookings.length, 0);
      const totalEarnings = trips.reduce((sum, trip) => 
        sum + (trip.bookings.length * (trip.pricePerPerson || 0)), 0
      );
      
      // Calculate average rating
      const allReviews = trips.flatMap(trip => trip.reviews);
      const averageRating = allReviews.length > 0 
        ? (allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length)
        : 0;

      // Get upcoming trips
      const upcomingTrips = await prisma.groupTrip.findMany({
        where: {
          captainId: captain.id,
          date: {
            gt: now,
            lte: upcomingDate
          },
          status: { in: ['CONFIRMED', 'FORMING'] }
        },
        include: {
          bookings: {
            where: { status: 'CONFIRMED' }
          }
        },
        orderBy: { date: 'asc' }
      });

      return {
        id: captain.id,
        name: captain.name,
        email: captain.email,
        stats: {
          totalTrips,
          confirmedTrips,
          totalParticipants,
          totalEarnings,
          averageRating: Math.round(averageRating * 10) / 10
        },
        upcomingTrips: upcomingTrips.map(trip => ({
          id: trip.id,
          title: trip.title || trip.description,
          date: trip.date,
          participants: trip.bookings.length,
          status: trip.status
        }))
      };
    })
  );

  return {
    period,
    periodStart: startDate,
    periodEnd: endDate,
    captains: captainReports.filter(c => c.stats.totalTrips > 0), // Only captains with activity
    summary: {
      totalCaptains: captainReports.length,
      totalTrips: captainReports.reduce((sum, c) => sum + c.stats.totalTrips, 0),
      totalParticipants: captainReports.reduce((sum, c) => sum + c.stats.totalParticipants, 0),
      totalEarnings: captainReports.reduce((sum, c) => sum + c.stats.totalEarnings, 0)
    }
  };
}
