import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaClient, ApprovalStatus } from '@/lib/generated/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { emailService } from '@/lib/email-service'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const prisma = new PrismaClient()

// Schema для валидации запроса на обновление статуса одобрения
const approvalUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectedReason: z.string().optional()
})

/**
 * PATCH /api/participant-approvals/[id] - Обновление статуса одобрения участника капитаном
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Processing approval update for:', params.id)
    
    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📋 Request body:', body)

    // Валидируем данные запроса
    const validationResult = approvalUpdateSchema.safeParse(body)
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

    const { status, rejectedReason } = validationResult.data

    // Получаем заявку на одобрение с данными о поездке
    const approval = await prisma.participantApproval.findUnique({
      where: { id: params.id },
      include: {
        trip: {
          select: {
            id: true,
            captainId: true,
            status: true,
            date: true,
            timeSlot: true
          }
        },
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            fisherProfile: {
              select: {
                experience: true,
                rating: true,
                completedTrips: true,
                reliability: true
              }
            }
          }
        }
      }
    })

    if (!approval) {
      console.error('❌ Approval not found:', params.id)
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      )
    }

    // Проверяем авторизацию: только капитан поездки может одобрять участников
    if (!approval.trip.captainId || approval.trip.captainId !== session.user.id) {
      console.error('❌ Authorization failed. Captain:', approval.trip.captainId, 'User:', session.user.id)
      return NextResponse.json(
        { success: false, error: 'Only trip captain can approve participants' },
        { status: 403 }
      )
    }

    // Проверяем, что заявка еще не обработана
    if (approval.status !== ApprovalStatus.PENDING) {
      console.error('❌ Approval already processed:', approval.status)
      return NextResponse.json(
        { success: false, error: 'Approval already processed' },
        { status: 409 }
      )
    }

    // Обновляем статус одобрения
    const updatedApproval = await prisma.participantApproval.update({
      where: { id: params.id },
      data: {
        status: status as ApprovalStatus,
        approvedBy: session.user.id,
        processedAt: new Date(),
        rejectedReason: status === 'REJECTED' ? rejectedReason : null
      },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            fisherProfile: true
          }
        },
        trip: {
          select: {
            id: true,
            date: true,
            timeSlot: true,
            maxParticipants: true,
            minRequired: true,
            status: true,
            bookings: {
              where: { status: 'CONFIRMED' },
              select: { participants: true }
            }
          }
        }
      }
    })

    console.log('✅ Approval updated:', updatedApproval.id, 'Status:', updatedApproval.status)

    // Если участник одобрен, создаем групповое бронирование
    if (status === 'APPROVED') {
      console.log('🎯 Creating group booking for approved participant')
      
      const groupBooking = await prisma.groupBooking.create({
        data: {
          tripId: approval.tripId,
          userId: approval.participantId,
          participants: 1, // По умолчанию 1 участник при одобрении
          totalPrice: updatedApproval.trip.pricePerPerson || 95.00,
          contactName: approval.participant.name || 'Unknown',
          contactPhone: 'Approved by captain', // Placeholder
          contactEmail: approval.participant.email,
          status: 'CONFIRMED'
        }
      })

      console.log('✅ Group booking created:', groupBooking.id)

      // Проверяем, нужно ли обновить статус поездки
      const totalParticipants = updatedApproval.trip.bookings.reduce(
        (sum, booking) => sum + booking.participants, 
        0
      ) + 1 // +1 за только что одобренного участника

      if (totalParticipants >= updatedApproval.trip.minRequired && 
          updatedApproval.trip.status === 'FORMING') {
        
        await prisma.groupTrip.update({
          where: { id: approval.tripId },
          data: { status: 'CONFIRMED' }
        })

        console.log('🎉 Trip confirmed due to reaching minimum participants:', totalParticipants)
      }

      // Обновляем репутационную систему участника
      if (approval.participant.fisherProfile) {
        await updateParticipantReputation(approval.participantId, 'APPROVED')
      }
    } else if (status === 'REJECTED') {
      // Если отклонен, обновляем репутацию (опционально)
      if (approval.participant.fisherProfile) {
        await updateParticipantReputation(approval.participantId, 'REJECTED')
      }
    }

    // Отправляем email уведомление участнику
    await sendApprovalEmailNotification(updatedApproval, status, rejectedReason);

    // Инвалидируем кэш для обновления UI
    revalidatePath('/admin/trips')
    revalidatePath(`/trip/${approval.tripId}`)

    return NextResponse.json({
      success: true,
      data: {
        approval: {
          id: updatedApproval.id,
          status: updatedApproval.status,
          processedAt: updatedApproval.processedAt,
          rejectedReason: updatedApproval.rejectedReason,
          approvedBy: updatedApproval.approvedBy
        },
        participant: {
          id: updatedApproval.participant.id,
          name: updatedApproval.participant.name,
          email: updatedApproval.participant.email
        },
        trip: {
          id: updatedApproval.trip.id,
          status: updatedApproval.trip.status
        }
      },
      message: status === 'APPROVED' 
        ? 'Participant approved and added to trip' 
        : 'Participant application rejected'
    })

  } catch (error) {
    console.error('❌ Error processing approval:', error)
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
 * GET /api/participant-approvals/[id] - Получение информации об одобрении
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Fetching approval details for:', params.id)

    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const approval = await prisma.participantApproval.findUnique({
      where: { id: params.id },
      include: {
        participant: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            fisherProfile: {
              select: {
                experience: true,
                rating: true,
                completedTrips: true,
                reliability: true,
                specialties: true,
                bio: true,
                badges: {
                  select: {
                    name: true,
                    description: true,
                    icon: true,
                    category: true,
                    earnedAt: true
                  }
                }
              }
            }
          }
        },
        trip: {
          select: {
            id: true,
            date: true,
            timeSlot: true,
            captainId: true,
            maxParticipants: true,
            minRequired: true,
            status: true,
            description: true,
            meetingPoint: true,
            captain: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!approval) {
      return NextResponse.json(
        { success: false, error: 'Approval not found' },
        { status: 404 }
      )
    }

    // Проверяем права доступа (капитан поездки или сам участник)
    const isAuthorized = approval.trip.captainId === session.user.id || 
                        approval.participantId === session.user.id

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: approval
    })

  } catch (error) {
    console.error('❌ Error fetching approval:', error)
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
 * Обновление репутации участника на основе результата одобрения
 */
async function updateParticipantReputation(
  participantId: string, 
  approvalResult: 'APPROVED' | 'REJECTED'
) {
  try {
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId: participantId }
    })

    if (!profile) return

    let reliabilityChange = 0
    
    if (approvalResult === 'APPROVED') {
      // Положительно влияет на надежность
      reliabilityChange = Math.min(2, 100 - Number(profile.reliability))
    } else if (approvalResult === 'REJECTED') {
      // Негативно влияет на надежность
      reliabilityChange = -Math.min(5, Number(profile.reliability))
    }

    if (reliabilityChange !== 0) {
      await prisma.fisherProfile.update({
        where: { userId: participantId },
        data: {
          reliability: Math.max(0, Math.min(100, Number(profile.reliability) + reliabilityChange)),
          lastActiveAt: new Date()
        }
      })

      console.log(`📊 Updated reliability for ${participantId}: ${reliabilityChange > 0 ? '+' : ''}${reliabilityChange}`)
    }

  } catch (error) {
    console.error('❌ Error updating participant reputation:', error)
  }
}

/**
 * Отправляет email уведомление участнику об изменении статуса заявки
 */
async function sendApprovalEmailNotification(
  approval: any,
  status: ApprovalStatus,
  rejectedReason?: string
) {
  try {
    if (!approval.participant?.email) {
      console.log('⚠️ Participant email not found, skipping notification');
      return;
    }

    const tripDate = format(new Date(approval.trip.date), 'dd MMMM yyyy', { locale: ru });
    const tripDetailsUrl = `${process.env.NEXTAUTH_URL}/trip/${approval.tripId}`;

    await emailService.sendParticipantApprovalNotification({
      participantEmail: approval.participant.email,
      participantName: approval.participant.name || 'Участник',
      captainName: approval.trip.captain?.name || 'Капитан',
      tripTitle: approval.trip.description || 'Рыболовная поездка',
      tripDate,
      status,
      rejectedReason,
      tripDetailsUrl
    });

    console.log(`📧 Approval notification sent to ${approval.participant.email} (${status})`);

  } catch (error) {
    console.error('Error sending approval email notification:', error);
  }
}