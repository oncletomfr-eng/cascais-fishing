import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { ApprovalStatus } from '@prisma/client'
import { z } from 'zod'


// Schema для создания заявки на одобрение
const createApprovalSchema = z.object({
  tripId: z.string().cuid(),
  message: z.string().optional()
})

// Schema для фильтрации заявок
const filterSchema = z.object({
  tripId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  captainId: z.string().cuid().optional(),
  participantId: z.string().cuid().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0)
})

/**
 * POST /api/participant-approvals - Создание заявки на участие в групповой поездке
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🆕 Creating new participant approval request')

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

    // Валидируем данные
    const validationResult = createApprovalSchema.safeParse(body)
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

    const { tripId, message } = validationResult.data

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
      console.error('❌ Trip not found:', tripId)
      return NextResponse.json(
        { success: false, error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Проверяем, что поездка еще набирает участников
    if (trip.status !== 'FORMING') {
      console.error('❌ Trip is not forming:', trip.status)
      return NextResponse.json(
        { success: false, error: 'Trip is not accepting new participants' },
        { status: 409 }
      )
    }

    // Проверяем, что участник еще не подавал заявку
    const existingApproval = trip.participantApprovals.find(
      approval => approval.status === 'PENDING' || approval.status === 'APPROVED'
    )

    if (existingApproval) {
      console.error('❌ Already applied:', existingApproval.id, existingApproval.status)
      return NextResponse.json(
        { 
          success: false, 
          error: existingApproval.status === 'PENDING' 
            ? 'Application already pending' 
            : 'Already approved for this trip'
        },
        { status: 409 }
      )
    }

    // Проверяем, что участник уже не забронирован напрямую
    const existingBooking = trip.bookings.find(booking => booking.userId === session.user.id)
    if (existingBooking) {
      console.error('❌ Already booked:', session.user.id)
      return NextResponse.json(
        { success: false, error: 'Already booked for this trip' },
        { status: 409 }
      )
    }

    // Проверяем, что есть места
    const currentParticipants = trip.bookings.reduce(
      (sum, booking) => sum + booking.participants, 
      0
    )

    if (currentParticipants >= trip.maxParticipants) {
      console.error('❌ Trip is full:', currentParticipants, '/', trip.maxParticipants)
      return NextResponse.json(
        { success: false, error: 'Trip is full' },
        { status: 409 }
      )
    }

    // Создаем заявку на одобрение
    const approval = await prisma.participantApproval.create({
      data: {
        tripId,
        participantId: session.user.id,
        message: message || null,
        status: ApprovalStatus.PENDING
      },
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
                reliability: true
              }
            }
          }
        },
        trip: {
          select: {
            id: true,
            date: true,
            timeSlot: true,
            description: true,
            meetingPoint: true,
            captain: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log('✅ Approval created:', approval.id)

    // Обновляем активность профиля участника
    await prisma.fisherProfile.updateMany({
      where: { userId: session.user.id },
      data: { lastActiveAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: approval,
      message: 'Application submitted successfully'
    })

  } catch (error) {
    console.error('❌ Error creating approval:', error)
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
 * GET /api/participant-approvals - Получение списка заявок на одобрение
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    console.log('🔍 Fetching participant approvals with params:', Object.fromEntries(searchParams))

    // Проверяем аутентификацию
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Парсим и валидируем параметры фильтрации
    const filterParams = {
      tripId: searchParams.get('tripId') || undefined,
      status: searchParams.get('status') || undefined,
      captainId: searchParams.get('captainId') || undefined,
      participantId: searchParams.get('participantId') || undefined,
      limit: parseInt(searchParams.get('limit') || '20'),
      offset: parseInt(searchParams.get('offset') || '0')
    }

    const validationResult = filterSchema.safeParse(filterParams)
    if (!validationResult.success) {
      console.error('❌ Filter validation error:', validationResult.error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid filter parameters', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const filters = validationResult.data

    // Строим WHERE условие для запроса
    const whereCondition: any = {}

    if (filters.tripId) {
      whereCondition.tripId = filters.tripId
    }

    if (filters.status) {
      whereCondition.status = filters.status as ApprovalStatus
    }

    if (filters.participantId) {
      whereCondition.participantId = filters.participantId
    }

    if (filters.captainId) {
      whereCondition.trip = {
        captainId: filters.captainId
      }
    }

    // Если пользователь не админ, показываем только его данные
    if (session.user.role !== 'ADMIN') {
      // Капитан видит заявки на свои поездки
      // Участник видит свои заявки
      whereCondition.OR = [
        { participantId: session.user.id },
        { trip: { captainId: session.user.id } }
      ]
    }

    console.log('🔍 Where condition:', JSON.stringify(whereCondition, null, 2))

    // Выполняем запрос
    const [approvals, totalCount] = await Promise.all([
      prisma.participantApproval.findMany({
        where: whereCondition,
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
                  specialties: true
                }
              }
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
              description: true,
              meetingPoint: true,
              captain: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              bookings: {
                where: { status: 'CONFIRMED' },
                select: { participants: true }
              }
            }
          }
        },
        orderBy: [
          { appliedAt: 'desc' },
          { status: 'asc' }
        ],
        skip: filters.offset,
        take: filters.limit
      }),
      prisma.participantApproval.count({
        where: whereCondition
      })
    ])

    console.log(`✅ Found ${approvals.length} approvals (total: ${totalCount})`)

    // Обогащаем данные о текущем количестве участников
    const enrichedApprovals = approvals.map(approval => {
      const currentParticipants = approval.trip.bookings.reduce(
        (sum, booking) => sum + booking.participants, 
        0
      )

      return {
        ...approval,
        trip: {
          ...approval.trip,
          currentParticipants,
          availableSpots: approval.trip.maxParticipants - currentParticipants
        }
      }
    })

    // Группируем по статусу для статистики
    const stats = {
      total: totalCount,
      pending: approvals.filter(a => a.status === 'PENDING').length,
      approved: approvals.filter(a => a.status === 'APPROVED').length,
      rejected: approvals.filter(a => a.status === 'REJECTED').length
    }

    return NextResponse.json({
      success: true,
      data: {
        approvals: enrichedApprovals,
        stats,
        pagination: {
          total: totalCount,
          offset: filters.offset,
          limit: filters.limit,
          hasMore: filters.offset + filters.limit < totalCount
        }
      }
    })

  } catch (error) {
    console.error('❌ Error fetching approvals:', error)
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