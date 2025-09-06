import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for activity timeline parameters
const timelineParamsSchema = z.object({
  userId: z.string().cuid().optional(),
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  activityTypes: z.array(z.enum([
    'booking', 'achievement', 'badge', 'review_given', 'review_received', 
    'diary_entry', 'catch_record', 'approval', 'registration', 'milestone'
  ])).optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  includeHeatmap: z.boolean().default(true),
  includePatterns: z.boolean().default(true)
})

// Activity types and their properties
const ACTIVITY_TYPES = {
  registration: { icon: '🎣', color: '#8B5CF6', importance: 'high', category: 'milestone' },
  booking: { icon: '📅', color: '#3B82F6', importance: 'medium', category: 'engagement' },
  achievement: { icon: '🏆', color: '#F59E0B', importance: 'high', category: 'milestone' },
  badge: { icon: '🏅', color: '#10B981', importance: 'high', category: 'milestone' },
  review_given: { icon: '⭐', color: '#6366F1', importance: 'medium', category: 'social' },
  review_received: { icon: '📝', color: '#EC4899', importance: 'medium', category: 'social' },
  diary_entry: { icon: '📔', color: '#84CC16', importance: 'low', category: 'content' },
  catch_record: { icon: '🐟', color: '#06B6D4', importance: 'medium', category: 'content' },
  approval: { icon: '✅', color: '#14B8A6', importance: 'low', category: 'engagement' },
  milestone: { icon: '🎯', color: '#F97316', importance: 'high', category: 'milestone' }
} as const

interface ActivityEvent {
  id: string
  type: keyof typeof ACTIVITY_TYPES
  title: string
  description?: string
  timestamp: Date
  metadata?: Record<string, any>
  importance: 'low' | 'medium' | 'high'
  category: 'milestone' | 'engagement' | 'social' | 'content'
  icon: string
  color: string
}

interface TimelineData {
  events: ActivityEvent[]
  summary: {
    totalEvents: number
    eventsByType: Record<string, number>
    eventsByCategory: Record<string, number>
    mostActiveDay: string
    activityStreak: number
    engagementScore: number
  }
  patterns: {
    dailyActivity: Array<{ date: string; count: number; intensity: number }>
    weeklyActivity: Array<{ day: string; count: number; averageIntensity: number }>
    monthlyActivity: Array<{ month: string; count: number; growthRate: number }>
    peakHours: Array<{ hour: number; count: number; percentage: number }>
  }
  heatmap: Array<{
    date: string
    value: number
    level: 0 | 1 | 2 | 3 | 4
    events: number
  }>
  milestones: Array<{
    id: string
    title: string
    description: string
    date: Date
    type: 'achievement' | 'badge' | 'level_up' | 'anniversary' | 'streak'
    importance: 'high' | 'medium' | 'low'
  }>
}

function calculateDateRange(period: string, startDate?: string, endDate?: string) {
  const now = new Date()
  const end = endDate ? new Date(endDate) : now
  
  let start: Date
  switch (period) {
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case 'quarter':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'year':
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
    default:
      start = new Date('2024-01-01')
  }

  if (startDate) {
    start = new Date(startDate)
  }

  return { start, end }
}

async function getActivityTimeline(
  userId: string,
  startDate: Date,
  endDate: Date,
  activityTypes?: string[],
  groupBy: string = 'day',
  includeHeatmap: boolean = true,
  includePatterns: boolean = true
): Promise<TimelineData> {
  console.log('🕐 Fetching activity timeline for user:', userId, 'from', startDate, 'to', endDate)

  const events: ActivityEvent[] = []

  // Get user registration
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, createdAt: true, name: true }
  })

  if (user && (!activityTypes || activityTypes.includes('registration'))) {
    events.push({
      id: `registration-${user.id}`,
      type: 'registration',
      title: 'Joined Cascais Fishing',
      description: `Welcome ${user.name || 'Fisher'}! Started your fishing journey.`,
      timestamp: user.createdAt,
      importance: 'high',
      category: 'milestone',
      icon: ACTIVITY_TYPES.registration.icon,
      color: ACTIVITY_TYPES.registration.color,
      metadata: { userName: user.name }
    })
  }

  // Get bookings
  if (!activityTypes || activityTypes.includes('booking')) {
    const bookings = await prisma.groupBooking.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        trip: {
          select: { date: true, timeSlot: true, targetSpecies: true, pricePerPerson: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    bookings.forEach(booking => {
      events.push({
        id: `booking-${booking.id}`,
        type: 'booking',
        title: 'New Booking Created',
        description: `Booked fishing trip for ${booking.trip.date.toLocaleDateString()}`,
        timestamp: booking.createdAt,
        importance: 'medium',
        category: 'engagement',
        icon: ACTIVITY_TYPES.booking.icon,
        color: ACTIVITY_TYPES.booking.color,
        metadata: {
          participants: booking.participants,
          status: booking.status,
          timeSlot: booking.trip.timeSlot,
          price: booking.totalPrice
        }
      })
    })
  }

  // Get achievements
  if (!activityTypes || activityTypes.includes('achievement')) {
    const achievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        unlocked: true,
        unlockedAt: { gte: startDate, lte: endDate }
      },
      include: {
        achievement: true
      },
      orderBy: { unlockedAt: 'desc' }
    })

    achievements.forEach(userAchievement => {
      if (userAchievement.unlockedAt) {
        events.push({
          id: `achievement-${userAchievement.id}`,
          type: 'achievement',
          title: `Achievement Unlocked: ${userAchievement.achievement.name}`,
          description: userAchievement.achievement.description,
          timestamp: userAchievement.unlockedAt,
          importance: 'high',
          category: 'milestone',
          icon: ACTIVITY_TYPES.achievement.icon,
          color: ACTIVITY_TYPES.achievement.color,
          metadata: {
            category: userAchievement.achievement.category,
            rarity: userAchievement.achievement.rarity,
            progress: userAchievement.progress,
            maxProgress: userAchievement.achievement.maxProgress
          }
        })
      }
    })
  }

  // Get badges
  if (!activityTypes || activityTypes.includes('badge')) {
    const badges = await prisma.fisherBadge.findMany({
      where: {
        fisherProfile: { userId },
        earnedAt: { gte: startDate, lte: endDate }
      },
      orderBy: { earnedAt: 'desc' }
    })

    badges.forEach(badge => {
      events.push({
        id: `badge-${badge.id}`,
        type: 'badge',
        title: `Badge Earned: ${badge.name}`,
        description: badge.description || 'New badge earned!',
        timestamp: badge.earnedAt,
        importance: 'high',
        category: 'milestone',
        icon: ACTIVITY_TYPES.badge.icon,
        color: ACTIVITY_TYPES.badge.color,
        metadata: {
          category: badge.category,
          rarity: badge.rarity,
          icon: badge.icon,
          requiredValue: badge.requiredValue
        }
      })
    })
  }

  // Get reviews given
  if (!activityTypes || activityTypes.includes('review_given')) {
    const reviewsGiven = await prisma.review.findMany({
      where: {
        fromUserId: userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        toUser: { select: { name: true } },
        trip: { select: { date: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    reviewsGiven.forEach(review => {
      events.push({
        id: `review-given-${review.id}`,
        type: 'review_given',
        title: 'Review Given',
        description: `Reviewed ${review.toUser.name || 'captain'} - ${review.rating}⭐`,
        timestamp: review.createdAt,
        importance: 'medium',
        category: 'social',
        icon: ACTIVITY_TYPES.review_given.icon,
        color: ACTIVITY_TYPES.review_given.color,
        metadata: {
          rating: review.rating,
          verified: review.verified,
          helpful: review.helpful,
          tripDate: review.trip.date
        }
      })
    })
  }

  // Get reviews received
  if (!activityTypes || activityTypes.includes('review_received')) {
    const reviewsReceived = await prisma.review.findMany({
      where: {
        toUserId: userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      include: {
        fromUser: { select: { name: true } },
        trip: { select: { date: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    reviewsReceived.forEach(review => {
      events.push({
        id: `review-received-${review.id}`,
        type: 'review_received',
        title: 'Review Received',
        description: `Received ${review.rating}⭐ from ${review.fromUser.name || 'participant'}`,
        timestamp: review.createdAt,
        importance: 'medium',
        category: 'social',
        icon: ACTIVITY_TYPES.review_received.icon,
        color: ACTIVITY_TYPES.review_received.color,
        metadata: {
          rating: review.rating,
          verified: review.verified,
          helpful: review.helpful,
          comment: review.comment
        }
      })
    })
  }

  // Get diary entries
  if (!activityTypes || activityTypes.includes('diary_entry')) {
    const diaryEntries = await prisma.fishingDiaryEntry.findMany({
      where: {
        userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      orderBy: { createdAt: 'desc' }
    })

    diaryEntries.forEach(entry => {
      events.push({
        id: `diary-${entry.id}`,
        type: 'diary_entry',
        title: 'Diary Entry Added',
        description: entry.title || `Fishing log for ${entry.date.toLocaleDateString()}`,
        timestamp: entry.createdAt,
        importance: 'low',
        category: 'content',
        icon: ACTIVITY_TYPES.diary_entry.icon,
        color: ACTIVITY_TYPES.diary_entry.color,
        metadata: {
          fishingDate: entry.date,
          location: entry.locationName,
          totalCount: entry.totalCount,
          totalWeight: entry.totalWeight,
          rating: entry.rating
        }
      })
    })
  }

  // Get catch records
  if (!activityTypes || activityTypes.includes('catch_record')) {
    const catchRecords = await prisma.catchRecord.findMany({
      where: {
        anglerId: userId,
        createdAt: { gte: startDate, lte: endDate }
      },
      orderBy: { createdAt: 'desc' }
    })

    catchRecords.forEach(record => {
      events.push({
        id: `catch-${record.id}`,
        type: 'catch_record',
        title: 'Catch Recorded',
        description: `Caught ${record.totalCount} fish (${record.totalWeight}kg)`,
        timestamp: record.createdAt,
        importance: 'medium',
        category: 'content',
        icon: ACTIVITY_TYPES.catch_record.icon,
        color: ACTIVITY_TYPES.catch_record.color,
        metadata: {
          totalWeight: record.totalWeight,
          totalCount: record.totalCount,
          success: record.success,
          verified: record.verified,
          techniques: record.techniques,
          duration: record.duration
        }
      })
    })
  }

  // Get approvals
  if (!activityTypes || activityTypes.includes('approval')) {
    const approvals = await prisma.participantApproval.findMany({
      where: {
        participantId: userId,
        status: 'APPROVED',
        processedAt: { gte: startDate, lte: endDate }
      },
      include: {
        trip: { select: { date: true } }
      },
      orderBy: { processedAt: 'desc' }
    })

    approvals.forEach(approval => {
      if (approval.processedAt) {
        events.push({
          id: `approval-${approval.id}`,
          type: 'approval',
          title: 'Trip Application Approved',
          description: `Approved for trip on ${approval.trip.date.toLocaleDateString()}`,
          timestamp: approval.processedAt,
          importance: 'low',
          category: 'engagement',
          icon: ACTIVITY_TYPES.approval.icon,
          color: ACTIVITY_TYPES.approval.color,
          metadata: {
            tripDate: approval.trip.date,
            appliedAt: approval.appliedAt,
            message: approval.message
          }
        })
      }
    })
  }

  // Sort all events by timestamp (most recent first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  // Calculate summary statistics
  const eventsByType = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const eventsByCategory = events.reduce((acc, event) => {
    acc[event.category] = (acc[event.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Calculate activity patterns
  const patterns = includePatterns ? calculateActivityPatterns(events) : {
    dailyActivity: [],
    weeklyActivity: [],
    monthlyActivity: [],
    peakHours: []
  }

  // Calculate heatmap data
  const heatmap = includeHeatmap ? calculateActivityHeatmap(events, startDate, endDate) : []

  // Extract milestones
  const milestones = events
    .filter(event => event.category === 'milestone')
    .map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      date: event.timestamp,
      type: event.type === 'achievement' ? 'achievement' as const : 
            event.type === 'badge' ? 'badge' as const :
            event.type === 'registration' ? 'anniversary' as const : 'level_up' as const,
      importance: event.importance
    }))

  // Calculate engagement metrics
  const engagementScore = calculateEngagementScore(events, eventsByCategory)

  return {
    events,
    summary: {
      totalEvents: events.length,
      eventsByType,
      eventsByCategory,
      mostActiveDay: getMostActiveDay(events),
      activityStreak: calculateActivityStreak(events),
      engagementScore
    },
    patterns,
    heatmap,
    milestones
  }
}

function calculateActivityPatterns(events: ActivityEvent[]) {
  // Group events by day
  const dailyActivity: Record<string, ActivityEvent[]> = {}
  events.forEach(event => {
    const day = event.timestamp.toISOString().split('T')[0]
    if (!dailyActivity[day]) dailyActivity[day] = []
    dailyActivity[day].push(event)
  })

  // Convert to array with intensity calculation
  const dailyActivityArray = Object.entries(dailyActivity).map(([date, dayEvents]) => ({
    date,
    count: dayEvents.length,
    intensity: calculateIntensity(dayEvents)
  })).sort((a, b) => a.date.localeCompare(b.date))

  // Group by day of week
  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]
    const dayEvents = events.filter(event => event.timestamp.getDay() === i)
    return {
      day: dayName,
      count: dayEvents.length,
      averageIntensity: dayEvents.length > 0 ? calculateIntensity(dayEvents) : 0
    }
  })

  // Group by month
  const monthlyActivity: Record<string, ActivityEvent[]> = {}
  events.forEach(event => {
    const month = event.timestamp.toISOString().slice(0, 7) // YYYY-MM
    if (!monthlyActivity[month]) monthlyActivity[month] = []
    monthlyActivity[month].push(event)
  })

  const monthlyActivityArray = Object.entries(monthlyActivity).map(([month, monthEvents], index, arr) => {
    const prevMonthCount = index > 0 ? arr[index - 1][1].length : 0
    const growthRate = prevMonthCount > 0 ? ((monthEvents.length - prevMonthCount) / prevMonthCount * 100) : 0
    return {
      month,
      count: monthEvents.length,
      growthRate: Math.round(growthRate)
    }
  }).sort((a, b) => a.month.localeCompare(b.month))

  // Calculate peak hours
  const hourCounts: Record<number, number> = {}
  events.forEach(event => {
    const hour = event.timestamp.getHours()
    hourCounts[hour] = (hourCounts[hour] || 0) + 1
  })

  const totalEvents = events.length
  const peakHours = Object.entries(hourCounts).map(([hour, count]) => ({
    hour: parseInt(hour),
    count,
    percentage: totalEvents > 0 ? Math.round((count / totalEvents) * 100) : 0
  })).sort((a, b) => b.count - a.count)

  return {
    dailyActivity: dailyActivityArray,
    weeklyActivity,
    monthlyActivity: monthlyActivityArray,
    peakHours
  }
}

function calculateIntensity(events: ActivityEvent[]): number {
  if (events.length === 0) return 0
  
  const importanceWeights = { low: 1, medium: 2, high: 3 }
  const totalWeight = events.reduce((sum, event) => sum + importanceWeights[event.importance], 0)
  
  return Math.min(10, Math.round((totalWeight / events.length) * 3.33)) // Scale to 0-10
}

function calculateActivityHeatmap(events: ActivityEvent[], startDate: Date, endDate: Date) {
  const heatmapData = []
  const currentDate = new Date(startDate)
  
  // Group events by date
  const eventsByDate: Record<string, ActivityEvent[]> = {}
  events.forEach(event => {
    const date = event.timestamp.toISOString().split('T')[0]
    if (!eventsByDate[date]) eventsByDate[date] = []
    eventsByDate[date].push(event)
  })

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayEvents = eventsByDate[dateStr] || []
    const eventCount = dayEvents.length
    const intensity = calculateIntensity(dayEvents)
    
    // Calculate level (0-4) based on event count and intensity
    let level: 0 | 1 | 2 | 3 | 4 = 0
    if (eventCount > 0) {
      if (intensity >= 8) level = 4
      else if (intensity >= 6) level = 3
      else if (intensity >= 4) level = 2
      else level = 1
    }

    heatmapData.push({
      date: dateStr,
      value: intensity,
      level,
      events: eventCount
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return heatmapData
}

function getMostActiveDay(events: ActivityEvent[]): string {
  const dailyCounts: Record<string, number> = {}
  events.forEach(event => {
    const day = event.timestamp.toISOString().split('T')[0]
    dailyCounts[day] = (dailyCounts[day] || 0) + 1
  })

  const mostActiveEntry = Object.entries(dailyCounts).reduce((max, [day, count]) => 
    count > max.count ? { day, count } : max, { day: '', count: 0 })

  return mostActiveEntry.day || new Date().toISOString().split('T')[0]
}

function calculateActivityStreak(events: ActivityEvent[]): number {
  if (events.length === 0) return 0

  const uniqueDays = [...new Set(events.map(event => 
    event.timestamp.toISOString().split('T')[0]
  ))].sort().reverse()

  let streak = 0
  let currentDate = new Date()
  
  for (const day of uniqueDays) {
    const eventDate = new Date(day)
    const daysDiff = Math.floor((currentDate.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff <= streak + 1) {
      streak++
      currentDate = eventDate
    } else {
      break
    }
  }

  return streak
}

function calculateEngagementScore(events: ActivityEvent[], eventsByCategory: Record<string, number>): number {
  if (events.length === 0) return 0

  const categoryWeights = {
    milestone: 3,
    social: 2,
    engagement: 2,
    content: 1
  }

  const weightedScore = Object.entries(eventsByCategory).reduce((score, [category, count]) => {
    const weight = categoryWeights[category as keyof typeof categoryWeights] || 1
    return score + (count * weight)
  }, 0)

  // Normalize to 0-100 scale
  const maxPossibleScore = events.length * 3 // All events being milestones
  return Math.min(100, Math.round((weightedScore / maxPossibleScore) * 100))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    console.log('🕐 Activity Timeline API request:', Object.fromEntries(searchParams))

    // Check authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate parameters
    const params = {
      userId: searchParams.get('userId') || session.user.id,
      period: searchParams.get('period') || 'month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      activityTypes: searchParams.get('activityTypes')?.split(',') || undefined,
      groupBy: searchParams.get('groupBy') || 'day',
      includeHeatmap: searchParams.get('includeHeatmap') !== 'false',
      includePatterns: searchParams.get('includePatterns') !== 'false'
    }

    const validationResult = timelineParamsSchema.safeParse(params)
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid parameters', 
          details: validationResult.error.flatten() 
        },
        { status: 400 }
      )
    }

    const { 
      userId, period, startDate, endDate, activityTypes, 
      groupBy, includeHeatmap, includePatterns 
    } = validationResult.data

    // Check access permissions
    if (userId !== session.user.id && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate date range
    const dateRange = calculateDateRange(period, startDate, endDate)
    
    // Get activity timeline data
    const timelineData = await getActivityTimeline(
      userId,
      dateRange.start,
      dateRange.end,
      activityTypes,
      groupBy,
      includeHeatmap,
      includePatterns
    )

    return NextResponse.json({
      success: true,
      data: timelineData,
      meta: {
        userId,
        period,
        dateRange,
        totalEvents: timelineData.events.length,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Error in activity timeline API:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
