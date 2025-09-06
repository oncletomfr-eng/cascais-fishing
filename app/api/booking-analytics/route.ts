/**
 * Booking Performance Analytics API - Comprehensive booking analytics endpoint
 * Part of Task 13.2: Booking Performance Analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { BookingStatus, GroupTripStatus } from '@prisma/client'
import { z } from 'zod'
import { subMonths, startOfMonth, endOfMonth, format, differenceInDays, differenceInHours } from 'date-fns'


// Schema for analytics parameters
const analyticsParamsSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().cuid().optional(),
  includeProjections: z.boolean().default(true),
  groupBy: z.enum(['day', 'week', 'month']).default('month')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    console.log('📊 Booking Analytics API request:', Object.fromEntries(searchParams))

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
      period: searchParams.get('period') || 'month',
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      includeProjections: searchParams.get('includeProjections') !== 'false',
      groupBy: searchParams.get('groupBy') || 'month'
    }

    const validationResult = analyticsParamsSchema.safeParse(params)
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

    const { period, startDate, endDate, userId, includeProjections, groupBy } = validationResult.data

    // Check access permissions
    if (userId && session.user.id !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate date range
    const dateRange = calculateDateRange(period, startDate, endDate)
    
    // Get comprehensive booking analytics
    const analytics = await getBookingAnalytics(
      dateRange.start,
      dateRange.end,
      userId,
      groupBy,
      includeProjections
    )

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        userId,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Booking Analytics API error:', error)
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
 * Get comprehensive booking analytics
 */
async function getBookingAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string,
  groupBy: 'day' | 'week' | 'month' = 'month',
  includeProjections = true
) {
  console.log('📊 Generating booking analytics for period:', { startDate, endDate, userId, groupBy })

  // Base query conditions
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate
    },
    ...(userId && { userId })
  }

  // Get all bookings with related data
  const bookings = await prisma.groupBooking.findMany({
    where: whereClause,
    include: {
      trip: {
        select: {
          id: true,
          date: true,
          timeSlot: true,
          pricePerPerson: true,
          status: true,
          maxParticipants: true,
          departureLocation: true,
          createdAt: true
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  console.log(`📊 Found ${bookings.length} bookings for analysis`)

  // Calculate booking funnel
  const funnelData = calculateBookingFunnel(bookings)

  // Calculate conversion rates
  const conversionRates = calculateConversionRates(bookings)

  // Analyze cancellation patterns
  const cancellationAnalysis = analyzeCancellationPatterns(bookings)

  // Generate seasonal trends
  const seasonalTrends = generateSeasonalTrends(bookings, groupBy)

  // Calculate booking value analytics
  const valueAnalytics = calculateBookingValueAnalytics(bookings)

  // Analyze time-to-book metrics
  const timeToBookMetrics = calculateTimeToBookMetrics(bookings)

  // Calculate success rates
  const successRates = calculateBookingSuccessRates(bookings)

  // Generate period comparison
  const periodComparison = await generatePeriodComparison(startDate, endDate, userId)

  // Generate projections if requested
  let projections = null
  if (includeProjections) {
    projections = generateBookingProjections(bookings, seasonalTrends)
  }

  return {
    overview: {
      totalBookings: bookings.length,
      periodRange: { startDate, endDate },
      groupBy
    },
    funnelAnalysis: funnelData,
    conversionRates,
    cancellationAnalysis,
    seasonalTrends,
    valueAnalytics,
    timeToBookMetrics,
    successRates,
    periodComparison,
    projections
  }
}

/**
 * Calculate booking funnel stages
 */
function calculateBookingFunnel(bookings: any[]) {
  const stages = {
    created: bookings.length,
    pending: bookings.filter(b => b.status === BookingStatus.PENDING).length,
    confirmed: bookings.filter(b => b.status === BookingStatus.CONFIRMED).length,
    completed: bookings.filter(b => 
      b.status === BookingStatus.CONFIRMED && 
      b.trip.status === GroupTripStatus.COMPLETED
    ).length,
    cancelled: bookings.filter(b => b.status === BookingStatus.CANCELLED).length
  }

  // Calculate conversion rates between stages
  const conversions = {
    pendingToConfirmed: stages.pending > 0 ? (stages.confirmed / stages.pending) * 100 : 0,
    confirmedToCompleted: stages.confirmed > 0 ? (stages.completed / stages.confirmed) * 100 : 0,
    overallSuccess: stages.created > 0 ? (stages.completed / stages.created) * 100 : 0
  }

  return {
    stages,
    conversions,
    dropOffPoints: {
      pendingDropoff: stages.created - stages.confirmed,
      completionDropoff: stages.confirmed - stages.completed,
      cancellationRate: stages.created > 0 ? (stages.cancelled / stages.created) * 100 : 0
    }
  }
}

/**
 * Calculate conversion rates by different sources
 */
function calculateConversionRates(bookings: any[]) {
  // Group by user creation time to infer acquisition cohorts
  const cohortAnalysis = bookings.reduce((acc, booking) => {
    const userAge = differenceInDays(booking.createdAt, booking.user.createdAt)
    let cohort: string
    
    if (userAge <= 7) cohort = 'new_users_1week'
    else if (userAge <= 30) cohort = 'new_users_1month'
    else if (userAge <= 90) cohort = 'users_3months'
    else cohort = 'experienced_users'

    if (!acc[cohort]) {
      acc[cohort] = { total: 0, confirmed: 0, completed: 0 }
    }
    
    acc[cohort].total++
    if (booking.status === BookingStatus.CONFIRMED) acc[cohort].confirmed++
    if (booking.status === BookingStatus.CONFIRMED && booking.trip.status === GroupTripStatus.COMPLETED) {
      acc[cohort].completed++
    }
    
    return acc
  }, {} as Record<string, { total: number; confirmed: number; completed: number }>)

  // Calculate rates
  const cohortRates = Object.entries(cohortAnalysis).map(([cohort, data]) => ({
    cohort,
    totalBookings: data.total,
    confirmationRate: data.total > 0 ? (data.confirmed / data.total) * 100 : 0,
    completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0
  }))

  // Time slot analysis
  const timeSlotAnalysis = bookings.reduce((acc, booking) => {
    const timeSlot = booking.trip.timeSlot || 'unknown'
    if (!acc[timeSlot]) {
      acc[timeSlot] = { total: 0, confirmed: 0, completed: 0 }
    }
    
    acc[timeSlot].total++
    if (booking.status === BookingStatus.CONFIRMED) acc[timeSlot].confirmed++
    if (booking.status === BookingStatus.CONFIRMED && booking.trip.status === GroupTripStatus.COMPLETED) {
      acc[timeSlot].completed++
    }
    
    return acc
  }, {} as Record<string, { total: number; confirmed: number; completed: number }>)

  const timeSlotRates = Object.entries(timeSlotAnalysis).map(([timeSlot, data]) => ({
    timeSlot,
    totalBookings: data.total,
    confirmationRate: data.total > 0 ? (data.confirmed / data.total) * 100 : 0,
    completionRate: data.total > 0 ? (data.completed / data.total) * 100 : 0
  }))

  return {
    byCohort: cohortRates,
    byTimeSlot: timeSlotRates,
    overall: {
      totalBookings: bookings.length,
      confirmationRate: bookings.length > 0 ? 
        (bookings.filter(b => b.status === BookingStatus.CONFIRMED).length / bookings.length) * 100 : 0,
      completionRate: bookings.length > 0 ? 
        (bookings.filter(b => 
          b.status === BookingStatus.CONFIRMED && 
          b.trip.status === GroupTripStatus.COMPLETED
        ).length / bookings.length) * 100 : 0
    }
  }
}

/**
 * Analyze cancellation patterns
 */
function analyzeCancellationPatterns(bookings: any[]) {
  const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED)
  
  // Time-based cancellation analysis
  const cancellationTiming = cancelledBookings.map(booking => ({
    daysBeforeTrip: differenceInDays(booking.trip.date, booking.createdAt),
    hoursAfterBooking: differenceInHours(booking.updatedAt, booking.createdAt),
    timeSlot: booking.trip.timeSlot,
    priceLevel: booking.trip.pricePerPerson > 120 ? 'premium' : 
                 booking.trip.pricePerPerson > 80 ? 'standard' : 'budget'
  }))

  // Common cancellation reasons (inferred from patterns)
  const reasonPatterns = {
    lastMinute: cancelledBookings.filter(b => 
      differenceInDays(b.trip.date, b.updatedAt || b.createdAt) <= 2
    ).length,
    earlyCancel: cancelledBookings.filter(b => 
      differenceInDays(b.trip.date, b.updatedAt || b.createdAt) > 7
    ).length,
    priceRelated: cancelledBookings.filter(b => 
      b.trip.pricePerPerson > 100
    ).length
  }

  // Monthly cancellation trends
  const monthlyTrends = cancelledBookings.reduce((acc, booking) => {
    const month = format(booking.createdAt, 'yyyy-MM')
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    overview: {
      totalCancellations: cancelledBookings.length,
      cancellationRate: bookings.length > 0 ? (cancelledBookings.length / bookings.length) * 100 : 0,
      averageDaysBeforeTrip: cancellationTiming.length > 0 ? 
        cancellationTiming.reduce((sum, c) => sum + c.daysBeforeTrip, 0) / cancellationTiming.length : 0
    },
    patterns: {
      byTiming: {
        lastMinute: reasonPatterns.lastMinute,
        earlyCancel: reasonPatterns.earlyCancel,
        midRange: cancelledBookings.length - reasonPatterns.lastMinute - reasonPatterns.earlyCancel
      },
      byPriceLevel: cancellationTiming.reduce((acc, c) => {
        acc[c.priceLevel] = (acc[c.priceLevel] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byTimeSlot: cancellationTiming.reduce((acc, c) => {
        acc[c.timeSlot] = (acc[c.timeSlot] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    },
    monthlyTrends: Object.entries(monthlyTrends).map(([month, count]) => ({
      month,
      cancellations: count
    }))
  }
}

/**
 * Generate seasonal booking trends
 */
function generateSeasonalTrends(bookings: any[], groupBy: 'day' | 'week' | 'month') {
  // Group bookings by time period
  const timeSeriesData = bookings.reduce((acc, booking) => {
    let key: string
    
    switch (groupBy) {
      case 'day':
        key = format(booking.createdAt, 'yyyy-MM-dd')
        break
      case 'week':
        key = format(booking.createdAt, 'yyyy-[W]ww')
        break
      case 'month':
      default:
        key = format(booking.createdAt, 'yyyy-MM')
        break
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        totalBookings: 0,
        confirmedBookings: 0,
        revenue: 0,
        averageValue: 0
      }
    }

    acc[key].totalBookings++
    if (booking.status === BookingStatus.CONFIRMED) {
      acc[key].confirmedBookings++
    }
    
    const bookingValue = (booking.trip.pricePerPerson || 95) * booking.participants
    acc[key].revenue += bookingValue

    return acc
  }, {} as Record<string, any>)

  // Calculate averages and trends
  const timeSeriesArray = Object.values(timeSeriesData).map((data: any) => ({
    ...data,
    averageValue: data.totalBookings > 0 ? data.revenue / data.totalBookings : 0,
    confirmationRate: data.totalBookings > 0 ? (data.confirmedBookings / data.totalBookings) * 100 : 0
  }))

  return {
    timeSeries: timeSeriesArray.sort((a, b) => a.period.localeCompare(b.period)),
    seasonalPatterns: analyzeLongtermSeasonalPatterns(bookings),
    trends: {
      averageBookingsPerPeriod: timeSeriesArray.length > 0 ? 
        timeSeriesArray.reduce((sum, d) => sum + d.totalBookings, 0) / timeSeriesArray.length : 0,
      totalRevenue: timeSeriesArray.reduce((sum, d) => sum + d.revenue, 0),
      growthRate: calculateGrowthRate(timeSeriesArray)
    }
  }
}

/**
 * Calculate booking value analytics
 */
function calculateBookingValueAnalytics(bookings: any[]) {
  const confirmedBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED)
  
  const values = confirmedBookings.map(booking => ({
    bookingValue: (booking.trip.pricePerPerson || 95) * booking.participants,
    pricePerPerson: booking.trip.pricePerPerson || 95,
    participants: booking.participants,
    timeSlot: booking.trip.timeSlot
  }))

  const totalRevenue = values.reduce((sum, v) => sum + v.bookingValue, 0)
  const averageBookingValue = values.length > 0 ? totalRevenue / values.length : 0
  const averageParticipants = values.length > 0 ? 
    values.reduce((sum, v) => sum + v.participants, 0) / values.length : 0

  // Price tier analysis
  const priceTiers = {
    budget: values.filter(v => v.pricePerPerson < 80).length,
    standard: values.filter(v => v.pricePerPerson >= 80 && v.pricePerPerson <= 120).length,
    premium: values.filter(v => v.pricePerPerson > 120).length
  }

  return {
    overview: {
      totalRevenue,
      averageBookingValue,
      averageParticipants,
      totalConfirmedBookings: confirmedBookings.length
    },
    distribution: {
      byPriceTier: priceTiers,
      byParticipantCount: values.reduce((acc, v) => {
        const key = v.participants.toString()
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byTimeSlot: values.reduce((acc, v) => {
        acc[v.timeSlot] = (acc[v.timeSlot] || 0) + v.bookingValue
        return acc
      }, {} as Record<string, number>)
    },
    metrics: {
      medianBookingValue: calculateMedian(values.map(v => v.bookingValue)),
      revenuePerBooking: averageBookingValue,
      participantUtilization: averageParticipants
    }
  }
}

/**
 * Calculate time-to-book metrics
 */
function calculateTimeToBookMetrics(bookings: any[]) {
  const timeMetrics = bookings.map(booking => ({
    daysInAdvance: differenceInDays(booking.trip.date, booking.createdAt),
    hoursToConfirmation: booking.status === BookingStatus.CONFIRMED && booking.updatedAt ? 
      differenceInHours(booking.updatedAt, booking.createdAt) : null,
    timeSlot: booking.trip.timeSlot,
    status: booking.status
  }))

  const confirmedMetrics = timeMetrics.filter(m => m.hoursToConfirmation !== null)
  
  return {
    bookingAdvance: {
      average: timeMetrics.length > 0 ? 
        timeMetrics.reduce((sum, m) => sum + m.daysInAdvance, 0) / timeMetrics.length : 0,
      median: calculateMedian(timeMetrics.map(m => m.daysInAdvance)),
      distribution: {
        sameDay: timeMetrics.filter(m => m.daysInAdvance === 0).length,
        withinWeek: timeMetrics.filter(m => m.daysInAdvance <= 7 && m.daysInAdvance > 0).length,
        withinMonth: timeMetrics.filter(m => m.daysInAdvance <= 30 && m.daysInAdvance > 7).length,
        moreThanMonth: timeMetrics.filter(m => m.daysInAdvance > 30).length
      }
    },
    confirmationTime: confirmedMetrics.length > 0 ? {
      averageHours: confirmedMetrics.reduce((sum, m) => sum + (m.hoursToConfirmation || 0), 0) / confirmedMetrics.length,
      medianHours: calculateMedian(confirmedMetrics.map(m => m.hoursToConfirmation || 0)),
      within24h: confirmedMetrics.filter(m => (m.hoursToConfirmation || 0) <= 24).length,
      within48h: confirmedMetrics.filter(m => (m.hoursToConfirmation || 0) <= 48).length
    } : null
  }
}

/**
 * Calculate booking success rates
 */
function calculateBookingSuccessRates(bookings: any[]) {
  const totalBookings = bookings.length
  const confirmedBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED).length
  const completedBookings = bookings.filter(b => 
    b.status === BookingStatus.CONFIRMED && 
    b.trip.status === GroupTripStatus.COMPLETED
  ).length
  const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED).length

  return {
    overall: {
      confirmationRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
      completionRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0,
      cancellationRate: totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0,
      successRate: totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0
    },
    breakdown: {
      total: totalBookings,
      confirmed: confirmedBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      pending: bookings.filter(b => b.status === BookingStatus.PENDING).length
    }
  }
}

/**
 * Helper functions
 */
function calculateDateRange(period: string, startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return {
      start: new Date(startDate),
      end: new Date(endDate)
    }
  }

  const now = new Date()
  switch (period) {
    case 'week':
      return { start: subMonths(now, 0.25), end: now }
    case 'month':
      return { start: subMonths(now, 1), end: now }
    case 'quarter':
      return { start: subMonths(now, 3), end: now }
    case 'year':
      return { start: subMonths(now, 12), end: now }
    case 'all':
      return { start: new Date(2020, 0, 1), end: now }
    default:
      return { start: subMonths(now, 1), end: now }
  }
}

function analyzeLongtermSeasonalPatterns(bookings: any[]) {
  const monthlyPatterns = bookings.reduce((acc, booking) => {
    const month = format(booking.createdAt, 'MM')
    acc[month] = (acc[month] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(monthlyPatterns).map(([month, count]) => ({
    month: parseInt(month),
    bookings: count,
    monthName: format(new Date(2024, parseInt(month) - 1, 1), 'MMMM')
  }))
}

function calculateGrowthRate(timeSeriesData: any[]) {
  if (timeSeriesData.length < 2) return 0
  
  const first = timeSeriesData[0].totalBookings
  const last = timeSeriesData[timeSeriesData.length - 1].totalBookings
  
  return first > 0 ? ((last - first) / first) * 100 : 0
}

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0
  
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid]
}

async function generatePeriodComparison(startDate: Date, endDate: Date, userId?: string) {
  // Compare with previous period of same length
  const periodLength = differenceInDays(endDate, startDate)
  const previousStart = new Date(startDate.getTime() - (periodLength * 24 * 60 * 60 * 1000))
  const previousEnd = startDate

  const whereClause = {
    createdAt: {
      gte: previousStart,
      lte: previousEnd
    },
    ...(userId && { userId })
  }

  const previousBookings = await prisma.groupBooking.count({
    where: whereClause
  })

  const currentBookings = await prisma.groupBooking.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      ...(userId && { userId })
    }
  })

  return {
    current: currentBookings,
    previous: previousBookings,
    growth: previousBookings > 0 ? ((currentBookings - previousBookings) / previousBookings) * 100 : 0,
    difference: currentBookings - previousBookings
  }
}

function generateBookingProjections(bookings: any[], seasonalTrends: any) {
  if (bookings.length === 0) return null

  const averageMonthlyBookings = seasonalTrends.trends.averageBookingsPerPeriod
  const growthRate = seasonalTrends.trends.growthRate
  
  // Simple projection based on trends
  const nextMonthProjection = Math.round(averageMonthlyBookings * (1 + growthRate / 100))
  const nextQuarterProjection = Math.round(nextMonthProjection * 3)
  
  return {
    nextMonth: {
      expectedBookings: nextMonthProjection,
      confidence: bookings.length >= 30 ? 'high' : bookings.length >= 10 ? 'medium' : 'low'
    },
    nextQuarter: {
      expectedBookings: nextQuarterProjection,
      confidence: bookings.length >= 100 ? 'high' : bookings.length >= 30 ? 'medium' : 'low'
    }
  }
}
