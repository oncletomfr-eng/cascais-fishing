/**
 * Review Analytics API - Comprehensive review and rating analytics endpoint
 * Part of Task 13.3: Rating & Review Analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { subMonths, startOfMonth, endOfMonth, format, differenceInDays } from 'date-fns'


// Schema for analytics parameters
const analyticsParamsSchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  userId: z.string().cuid().optional(),
  includeSentiment: z.boolean().default(true),
  includeImpact: z.boolean().default(true),
  groupBy: z.enum(['day', 'week', 'month']).default('month')
})

// Sentiment analysis keywords (basic approach)
const SENTIMENT_KEYWORDS = {
  positive: [
    'excellent', 'amazing', 'fantastic', 'wonderful', 'great', 'awesome', 
    'perfect', 'outstanding', 'brilliant', 'superb', 'incredible', 'love',
    'best', 'good', 'nice', 'helpful', 'friendly', 'professional', 
    'recommended', 'satisfied', 'happy', 'pleased', 'enjoyed', 'fun',
    'отлично', 'потрясающе', 'замечательно', 'классно', 'супер', 'хорошо',
    'рекомендую', 'доволен', 'понравилось', 'весело', 'профессионально'
  ],
  negative: [
    'terrible', 'awful', 'horrible', 'bad', 'worst', 'disappointing',
    'poor', 'unsatisfied', 'frustrated', 'angry', 'hate', 'problem',
    'issue', 'wrong', 'failed', 'cancelled', 'late', 'rude', 'unprofessional',
    'expensive', 'overpriced', 'waste', 'refund', 'complaint',
    'ужасно', 'плохо', 'проблема', 'не понравилось', 'разочарован', 
    'опоздали', 'дорого', 'грубо', 'непрофессионально', 'жалоба'
  ],
  neutral: [
    'okay', 'average', 'normal', 'standard', 'fine', 'acceptable',
    'нормально', 'средне', 'обычно', 'приемлемо', 'стандартно'
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    console.log('📊 Review Analytics API request:', Object.fromEntries(searchParams))

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
      includeSentiment: searchParams.get('includeSentiment') !== 'false',
      includeImpact: searchParams.get('includeImpact') !== 'false',
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

    const { period, startDate, endDate, userId, includeSentiment, includeImpact, groupBy } = validationResult.data

    // Check access permissions
    if (userId && session.user.id !== userId && (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    // Calculate date range
    const dateRange = calculateDateRange(period, startDate, endDate)
    
    // Get comprehensive review analytics
    const analytics = await getReviewAnalytics(
      dateRange.start,
      dateRange.end,
      userId,
      groupBy,
      includeSentiment,
      includeImpact
    )

    return NextResponse.json({
      success: true,
      data: analytics,
      meta: {
        period,
        dateRange,
        userId,
        includeSentiment,
        includeImpact,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Review Analytics API error:', error)
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
 * Get comprehensive review analytics
 */
async function getReviewAnalytics(
  startDate: Date,
  endDate: Date,
  userId?: string,
  groupBy: 'day' | 'week' | 'month' = 'month',
  includeSentiment = true,
  includeImpact = true
) {
  console.log('📊 Generating review analytics for period:', { startDate, endDate, userId, groupBy })

  // Base query conditions for reviews
  const whereClause = {
    createdAt: {
      gte: startDate,
      lte: endDate
    },
    verified: true, // Only include verified reviews
    ...(userId && { toUserId: userId }) // If userId provided, get reviews received by that user
  }

  // 🚀 OPTIMIZED: First get reviews with minimal data, then batch fetch related data
  const reviews = await prisma.review.findMany({
    where: whereClause,
    select: {
      id: true,
      tripId: true,
      fromUserId: true,
      toUserId: true,
      rating: true,
      comment: true,
      helpful: true,
      createdAt: true,
      verified: true
    },
    orderBy: { createdAt: 'asc' }
  });

  // Then batch fetch related data for better performance
  const userIds = [...new Set([
    ...reviews.map(r => r.fromUserId),
    ...reviews.map(r => r.toUserId)
  ].filter(Boolean))];
  
  const tripIds = [...new Set(reviews.map(r => r.tripId).filter(Boolean))];
  
  // Parallel fetch related data to reduce total query time
  const [users, trips] = await Promise.all([
    userIds.length > 0 ? prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        name: true,
        createdAt: true
      }
    }) : [],
    tripIds.length > 0 ? prisma.groupTrip.findMany({
      where: { id: { in: tripIds } },
      select: {
        id: true,
        date: true,
        timeSlot: true,
        pricePerPerson: true,
        status: true,
        createdAt: true,
        bookings: {
          select: {
            id: true,
            status: true,
            participants: true,
            createdAt: true
          }
        }
      }
    }) : []
  ]);

  // Create lookup maps for efficient data access
  const userMap = new Map(users.map(u => [u.id, u]));
  const tripMap = new Map(trips.map(t => [t.id, t]));

  // Enrich reviews with related data
  const enrichedReviews = reviews.map(review => ({
    ...review,
    fromUser: review.fromUserId ? userMap.get(review.fromUserId) || null : null,
    toUser: review.toUserId ? userMap.get(review.toUserId) || null : null,
    trip: review.tripId ? tripMap.get(review.tripId) || null : null
  }));

  console.log(`📊 Found ${reviews.length} reviews for analysis`)

  // Calculate rating distributions using enriched reviews
  const ratingDistributions = calculateRatingDistributions(enrichedReviews)

  // Perform sentiment analysis if requested
  let sentimentAnalysis = null
  if (includeSentiment) {
    sentimentAnalysis = performSentimentAnalysis(enrichedReviews)
  }

  // Track rating trends over time
  const ratingTrends = generateRatingTrends(enrichedReviews, groupBy)

  // Generate improvement suggestions
  const improvementInsights = generateImprovementSuggestions(enrichedReviews, sentimentAnalysis)

  // Calculate response rates and metrics
  const responseMetrics = await calculateResponseMetrics(startDate, endDate, userId)

  // Calculate review quality scores
  const qualityScores = calculateReviewQualityScores(reviews)

  // Analyze impact on bookings if requested
  let impactAnalysis = null
  if (includeImpact) {
    impactAnalysis = await analyzeReviewImpactOnBookings(startDate, endDate, userId)
  }

  // Generate comparative analysis
  const comparativeAnalysis = await generateComparativeAnalysis(reviews, userId)

  return {
    overview: {
      totalReviews: reviews.length,
      periodRange: { startDate, endDate },
      averageRating: reviews.length > 0 ? 
        reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
      groupBy
    },
    ratingDistributions,
    sentimentAnalysis,
    ratingTrends,
    improvementInsights,
    responseMetrics,
    qualityScores,
    impactAnalysis,
    comparativeAnalysis
  }
}

/**
 * Calculate rating distributions and statistics
 */
function calculateRatingDistributions(reviews: any[]) {
  // Rating distribution by stars
  const distribution = {
    1: reviews.filter(r => r.rating === 1).length,
    2: reviews.filter(r => r.rating === 2).length,
    3: reviews.filter(r => r.rating === 3).length,
    4: reviews.filter(r => r.rating === 4).length,
    5: reviews.filter(r => r.rating === 5).length
  }

  // Calculate percentages
  const total = reviews.length
  const percentages = Object.entries(distribution).reduce((acc, [rating, count]) => {
    acc[rating] = total > 0 ? (count / total) * 100 : 0
    return acc
  }, {} as Record<string, number>)

  // Calculate statistics
  const ratings = reviews.map(r => r.rating)
  const mean = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0
  const median = calculateMedian(ratings)
  const mode = calculateMode(ratings)

  // Calculate satisfaction levels
  const satisfaction = {
    veryPositive: distribution[5], // 5 stars
    positive: distribution[4], // 4 stars  
    neutral: distribution[3], // 3 stars
    negative: distribution[2], // 2 stars
    veryNegative: distribution[1] // 1 star
  }

  const satisfactionRate = total > 0 ? 
    ((satisfaction.veryPositive + satisfaction.positive) / total) * 100 : 0

  return {
    distribution,
    percentages,
    statistics: {
      mean,
      median,
      mode,
      total,
      satisfactionRate
    },
    satisfaction: {
      levels: satisfaction,
      rate: satisfactionRate,
      positiveReviews: satisfaction.veryPositive + satisfaction.positive,
      negativeReviews: satisfaction.negative + satisfaction.veryNegative
    }
  }
}

/**
 * Perform basic sentiment analysis on review comments
 */
function performSentimentAnalysis(reviews: any[]) {
  const reviewsWithComments = reviews.filter(r => r.comment && r.comment.trim().length > 0)
  
  if (reviewsWithComments.length === 0) {
    return {
      overview: { total: 0, withComments: 0 },
      sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
      sentimentByRating: {},
      topKeywords: { positive: [], negative: [], neutral: [] },
      insights: []
    }
  }

  const sentimentResults = reviewsWithComments.map(review => {
    const comment = review.comment.toLowerCase()
    
    // Count positive keywords
    const positiveCount = SENTIMENT_KEYWORDS.positive.reduce((count, keyword) => 
      count + (comment.includes(keyword) ? 1 : 0), 0
    )
    
    // Count negative keywords  
    const negativeCount = SENTIMENT_KEYWORDS.negative.reduce((count, keyword) =>
      count + (comment.includes(keyword) ? 1 : 0), 0
    )
    
    // Count neutral keywords
    const neutralCount = SENTIMENT_KEYWORDS.neutral.reduce((count, keyword) =>
      count + (comment.includes(keyword) ? 1 : 0), 0
    )

    // Determine sentiment
    let sentiment: 'positive' | 'negative' | 'neutral'
    if (positiveCount > negativeCount && positiveCount > neutralCount) {
      sentiment = 'positive'
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      sentiment = 'negative'
    } else {
      sentiment = 'neutral'
    }

    // Consider rating as additional factor
    if (review.rating >= 4 && sentiment === 'neutral') sentiment = 'positive'
    if (review.rating <= 2 && sentiment === 'neutral') sentiment = 'negative'

    return {
      reviewId: review.id,
      rating: review.rating,
      sentiment,
      confidence: Math.max(positiveCount, negativeCount, neutralCount) / 
                 (positiveCount + negativeCount + neutralCount || 1),
      keywords: {
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount
      }
    }
  })

  // Calculate sentiment distribution
  const sentimentDistribution = {
    positive: sentimentResults.filter(r => r.sentiment === 'positive').length,
    negative: sentimentResults.filter(r => r.sentiment === 'negative').length,
    neutral: sentimentResults.filter(r => r.sentiment === 'neutral').length
  }

  // Analyze sentiment by rating
  const sentimentByRating = [1, 2, 3, 4, 5].reduce((acc, rating) => {
    const ratingReviews = sentimentResults.filter(r => r.rating === rating)
    acc[rating] = {
      total: ratingReviews.length,
      positive: ratingReviews.filter(r => r.sentiment === 'positive').length,
      negative: ratingReviews.filter(r => r.sentiment === 'negative').length,
      neutral: ratingReviews.filter(r => r.sentiment === 'neutral').length
    }
    return acc
  }, {} as Record<number, any>)

  // Extract frequent keywords
  const topKeywords = extractTopKeywords(reviewsWithComments)

  // Generate insights
  const insights = generateSentimentInsights(sentimentDistribution, sentimentByRating, reviews.length)

  return {
    overview: {
      total: reviews.length,
      withComments: reviewsWithComments.length,
      averageConfidence: sentimentResults.length > 0 ? 
        sentimentResults.reduce((sum, r) => sum + r.confidence, 0) / sentimentResults.length : 0
    },
    sentimentDistribution,
    sentimentByRating,
    topKeywords,
    insights,
    details: sentimentResults
  }
}

/**
 * Generate rating trends over time
 */
function generateRatingTrends(reviews: any[], groupBy: 'day' | 'week' | 'month') {
  // Group reviews by time period
  const timeSeriesData = reviews.reduce((acc, review) => {
    let key: string
    
    switch (groupBy) {
      case 'day':
        key = format(review.createdAt, 'yyyy-MM-dd')
        break
      case 'week':
        key = format(review.createdAt, 'yyyy-[W]ww')
        break
      case 'month':
      default:
        key = format(review.createdAt, 'yyyy-MM')
        break
    }

    if (!acc[key]) {
      acc[key] = {
        period: key,
        reviews: [],
        totalReviews: 0,
        averageRating: 0,
        ratingSum: 0
      }
    }

    acc[key].reviews.push(review)
    acc[key].totalReviews++
    acc[key].ratingSum += review.rating

    return acc
  }, {} as Record<string, any>)

  // Calculate averages and trends
  const timeSeriesArray = Object.values(timeSeriesData).map((data: any) => ({
    period: data.period,
    totalReviews: data.totalReviews,
    averageRating: data.totalReviews > 0 ? data.ratingSum / data.totalReviews : 0,
    ratingDistribution: {
      1: data.reviews.filter((r: any) => r.rating === 1).length,
      2: data.reviews.filter((r: any) => r.rating === 2).length,
      3: data.reviews.filter((r: any) => r.rating === 3).length,
      4: data.reviews.filter((r: any) => r.rating === 4).length,
      5: data.reviews.filter((r: any) => r.rating === 5).length
    }
  })).sort((a, b) => a.period.localeCompare(b.period))

  // Calculate trend direction
  const trendAnalysis = calculateTrendDirection(timeSeriesArray)

  return {
    timeSeries: timeSeriesArray,
    trends: {
      direction: trendAnalysis.direction,
      slope: trendAnalysis.slope,
      correlation: trendAnalysis.correlation,
      volatility: trendAnalysis.volatility
    },
    insights: generateTrendInsights(timeSeriesArray, trendAnalysis)
  }
}

/**
 * Generate improvement suggestions based on reviews and sentiment
 */
function generateImprovementSuggestions(reviews: any[], sentimentAnalysis: any) {
  const suggestions = []
  const lowRatingReviews = reviews.filter(r => r.rating <= 2)
  const negativeComments = reviews.filter(r => 
    r.comment && sentimentAnalysis?.details?.find((s: any) => 
      s.reviewId === r.id && s.sentiment === 'negative'
    )
  )

  // Rating-based suggestions
  if (lowRatingReviews.length > reviews.length * 0.1) { // More than 10% low ratings
    suggestions.push({
      type: 'rating_improvement',
      priority: 'high',
      title: 'Address Low Rating Patterns',
      description: `${lowRatingReviews.length} reviews (${((lowRatingReviews.length / reviews.length) * 100).toFixed(1)}%) have ratings of 2 stars or below`,
      actionItems: [
        'Review common issues mentioned in low-rated feedback',
        'Implement quality control measures',
        'Follow up with dissatisfied customers',
        'Consider training for service improvement'
      ],
      impact: 'high',
      effort: 'medium'
    })
  }

  // Sentiment-based suggestions
  if (sentimentAnalysis && sentimentAnalysis.sentimentDistribution.negative > sentimentAnalysis.sentimentDistribution.positive * 0.3) {
    suggestions.push({
      type: 'sentiment_improvement',
      priority: 'medium',
      title: 'Improve Customer Sentiment',
      description: 'Negative sentiment detected in review comments',
      actionItems: [
        'Analyze negative feedback themes',
        'Improve communication with customers',
        'Address service quality issues',
        'Implement customer satisfaction monitoring'
      ],
      impact: 'medium',
      effort: 'medium'
    })
  }

  // Response rate suggestions
  suggestions.push({
    type: 'engagement_improvement',
    priority: 'low',
    title: 'Increase Review Response Rate',
    description: 'Encourage more customers to leave reviews',
    actionItems: [
      'Send follow-up emails after trips',
      'Offer incentives for leaving reviews',
      'Make review process easier',
      'Respond to existing reviews to show engagement'
    ],
    impact: 'medium',
    effort: 'low'
  })

  // Quality suggestions
  if (reviews.filter(r => !r.comment || r.comment.trim().length < 20).length > reviews.length * 0.5) {
    suggestions.push({
      type: 'quality_improvement',
      priority: 'low',
      title: 'Encourage Detailed Reviews',
      description: 'Many reviews lack detailed comments',
      actionItems: [
        'Ask specific questions in review prompts',
        'Provide examples of helpful reviews',
        'Offer guided review templates',
        'Follow up for more detailed feedback'
      ],
      impact: 'low',
      effort: 'low'
    })
  }

  return {
    suggestions: suggestions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
    }),
    summary: {
      totalSuggestions: suggestions.length,
      highPriority: suggestions.filter(s => s.priority === 'high').length,
      mediumPriority: suggestions.filter(s => s.priority === 'medium').length,
      lowPriority: suggestions.filter(s => s.priority === 'low').length
    }
  }
}

/**
 * Calculate response rates and engagement metrics
 */
async function calculateResponseMetrics(startDate: Date, endDate: Date, userId?: string) {
  // Get completed trips in the period
  const completedTrips = await prisma.groupTrip.findMany({
    where: {
      status: 'COMPLETED',
      date: {
        gte: startDate,
        lte: endDate
      },
      ...(userId && {
        bookings: {
          some: {
            userId,
            status: 'CONFIRMED'
          }
        }
      })
    },
    include: {
      bookings: {
        where: {
          status: 'CONFIRMED',
          ...(userId && { userId })
        }
      },
      reviews: {
        where: {
          verified: true,
          ...(userId && { toUserId: userId })
        }
      }
    }
  })

  const totalParticipants = completedTrips.reduce((sum, trip) => sum + trip.bookings.length, 0)
  const totalReviews = completedTrips.reduce((sum, trip) => sum + trip.reviews.length, 0)
  
  const responseRate = totalParticipants > 0 ? (totalReviews / totalParticipants) * 100 : 0

  // Calculate time to review (average days between trip completion and review)
  const reviewTimes = completedTrips.flatMap(trip => 
    trip.reviews.map(review => ({
      tripDate: trip.date,
      reviewDate: review.createdAt,
      daysToReview: differenceInDays(review.createdAt, trip.date)
    }))
  )

  const averageTimeToReview = reviewTimes.length > 0 ? 
    reviewTimes.reduce((sum, rt) => sum + rt.daysToReview, 0) / reviewTimes.length : 0

  return {
    overview: {
      totalCompletedTrips: completedTrips.length,
      totalParticipants,
      totalReviews,
      responseRate
    },
    engagement: {
      averageTimeToReview,
      reviewsWithin7Days: reviewTimes.filter(rt => rt.daysToReview <= 7).length,
      reviewsWithin30Days: reviewTimes.filter(rt => rt.daysToReview <= 30).length,
      lateReviews: reviewTimes.filter(rt => rt.daysToReview > 30).length
    },
    trends: {
      monthlyResponseRates: calculateMonthlyResponseRates(completedTrips)
    }
  }
}

/**
 * Calculate review quality scores
 */
function calculateReviewQualityScores(reviews: any[]) {
  const qualityMetrics = reviews.map(review => {
    let qualityScore = 0
    let factors = []

    // Comment length factor
    if (review.comment) {
      const commentLength = review.comment.trim().length
      if (commentLength > 100) {
        qualityScore += 30
        factors.push('detailed_comment')
      } else if (commentLength > 20) {
        qualityScore += 15
        factors.push('basic_comment')
      }
    }

    // Helpful votes factor
    if (review.helpful > 0) {
      qualityScore += Math.min(review.helpful * 10, 40) // Max 40 points for helpfulness
      factors.push('helpful_votes')
    }

    // Recent review factor (reviews within 7 days of trip get bonus)
    const daysAfterTrip = differenceInDays(review.createdAt, review.trip.date)
    if (daysAfterTrip <= 7) {
      qualityScore += 15
      factors.push('timely_review')
    }

    // Verified factor
    if (review.verified) {
      qualityScore += 15
      factors.push('verified')
    }

    // Cap at 100
    qualityScore = Math.min(qualityScore, 100)

    return {
      reviewId: review.id,
      qualityScore,
      factors,
      commentLength: review.comment ? review.comment.trim().length : 0,
      helpfulVotes: review.helpful,
      daysAfterTrip,
      verified: review.verified
    }
  })

  // Calculate averages and distributions
  const averageQuality = qualityMetrics.length > 0 ? 
    qualityMetrics.reduce((sum, qm) => sum + qm.qualityScore, 0) / qualityMetrics.length : 0

  const qualityDistribution = {
    excellent: qualityMetrics.filter(qm => qm.qualityScore >= 80).length, // 80-100
    good: qualityMetrics.filter(qm => qm.qualityScore >= 60 && qm.qualityScore < 80).length, // 60-79
    average: qualityMetrics.filter(qm => qm.qualityScore >= 40 && qm.qualityScore < 60).length, // 40-59
    poor: qualityMetrics.filter(qm => qm.qualityScore < 40).length // 0-39
  }

  return {
    overview: {
      averageQuality,
      totalReviews: qualityMetrics.length
    },
    distribution: qualityDistribution,
    factors: {
      withComments: qualityMetrics.filter(qm => qm.factors.includes('detailed_comment') || qm.factors.includes('basic_comment')).length,
      withHelpfulVotes: qualityMetrics.filter(qm => qm.factors.includes('helpful_votes')).length,
      timelyReviews: qualityMetrics.filter(qm => qm.factors.includes('timely_review')).length,
      verified: qualityMetrics.filter(qm => qm.factors.includes('verified')).length
    },
    metrics: qualityMetrics
  }
}

/**
 * Analyze review impact on future bookings
 */
async function analyzeReviewImpactOnBookings(startDate: Date, endDate: Date, userId?: string) {
  // This is a simplified impact analysis
  // In a real system, you'd want more sophisticated correlation analysis
  
  const impactData = await prisma.groupTrip.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      bookings: {
        where: {
          status: 'CONFIRMED',
          ...(userId && { userId })
        }
      },
      reviews: {
        where: {
          verified: true,
          ...(userId && { toUserId: userId })
        }
      }
    }
  })

  // Correlation between review ratings and subsequent booking rates
  const tripAnalysis = impactData.map(trip => {
    const averageRating = trip.reviews.length > 0 ? 
      trip.reviews.reduce((sum, r) => sum + r.rating, 0) / trip.reviews.length : 0
    
    return {
      tripId: trip.id,
      tripDate: trip.date,
      averageRating,
      totalReviews: trip.reviews.length,
      bookingCount: trip.bookings.length,
      maxParticipants: trip.maxParticipants,
      bookingRate: trip.maxParticipants > 0 ? (trip.bookings.length / trip.maxParticipants) * 100 : 0
    }
  })

  // Calculate correlation between ratings and booking performance
  const ratingBookingCorrelation = calculateCorrelation(
    tripAnalysis.filter(t => t.totalReviews > 0).map(t => t.averageRating),
    tripAnalysis.filter(t => t.totalReviews > 0).map(t => t.bookingRate)
  )

  return {
    overview: {
      totalTripsAnalyzed: tripAnalysis.length,
      tripsWithReviews: tripAnalysis.filter(t => t.totalReviews > 0).length,
      ratingBookingCorrelation
    },
    insights: {
      highRatedTripsBookingRate: calculateAverageBookingRate(tripAnalysis.filter(t => t.averageRating >= 4)),
      lowRatedTripsBookingRate: calculateAverageBookingRate(tripAnalysis.filter(t => t.averageRating <= 2.5)),
      noReviewsBookingRate: calculateAverageBookingRate(tripAnalysis.filter(t => t.totalReviews === 0))
    },
    recommendations: generateImpactRecommendations(ratingBookingCorrelation, tripAnalysis)
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

function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0
  
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid]
}

function calculateMode(numbers: number[]): number {
  if (numbers.length === 0) return 0
  
  const frequency = numbers.reduce((acc, num) => {
    acc[num] = (acc[num] || 0) + 1
    return acc
  }, {} as Record<number, number>)
  
  const maxFreq = Math.max(...Object.values(frequency))
  return Number(Object.keys(frequency).find(key => frequency[Number(key)] === maxFreq)) || 0
}

function extractTopKeywords(reviews: any[]) {
  // This is a simplified keyword extraction
  // In production, you'd want more sophisticated NLP
  
  const allComments = reviews.map(r => r.comment?.toLowerCase() || '').join(' ')
  
  return {
    positive: SENTIMENT_KEYWORDS.positive.filter(keyword => allComments.includes(keyword)).slice(0, 10),
    negative: SENTIMENT_KEYWORDS.negative.filter(keyword => allComments.includes(keyword)).slice(0, 10),
    neutral: SENTIMENT_KEYWORDS.neutral.filter(keyword => allComments.includes(keyword)).slice(0, 5)
  }
}

function generateSentimentInsights(sentimentDistribution: any, sentimentByRating: any, totalReviews: number) {
  const insights = []
  
  const positiveRate = (sentimentDistribution.positive / (sentimentDistribution.positive + sentimentDistribution.negative + sentimentDistribution.neutral)) * 100
  
  if (positiveRate > 70) {
    insights.push({
      type: 'positive',
      message: `Strong positive sentiment (${positiveRate.toFixed(1)}%) indicates high customer satisfaction`
    })
  } else if (positiveRate < 30) {
    insights.push({
      type: 'negative',
      message: `Low positive sentiment (${positiveRate.toFixed(1)}%) suggests need for service improvement`
    })
  }
  
  return insights
}

function calculateTrendDirection(timeSeriesData: any[]) {
  if (timeSeriesData.length < 2) {
    return { direction: 'stable', slope: 0, correlation: 0, volatility: 0 }
  }
  
  const ratings = timeSeriesData.map(d => d.averageRating)
  const indices = timeSeriesData.map((_, i) => i)
  
  // Simple linear regression to determine trend
  const n = ratings.length
  const sumX = indices.reduce((sum, x) => sum + x, 0)
  const sumY = ratings.reduce((sum, y) => sum + y, 0)
  const sumXY = indices.reduce((sum, x, i) => sum + x * ratings[i], 0)
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0)
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const correlation = calculateCorrelation(indices, ratings)
  
  // Calculate volatility (standard deviation of ratings)
  const meanRating = sumY / n
  const volatility = Math.sqrt(ratings.reduce((sum, r) => sum + Math.pow(r - meanRating, 2), 0) / n)
  
  let direction: 'improving' | 'declining' | 'stable'
  if (slope > 0.1) direction = 'improving'
  else if (slope < -0.1) direction = 'declining'
  else direction = 'stable'
  
  return { direction, slope, correlation, volatility }
}

function generateTrendInsights(timeSeriesData: any[], trendAnalysis: any) {
  const insights = []
  
  if (trendAnalysis.direction === 'improving') {
    insights.push({
      type: 'positive',
      message: `Rating trend is improving with an upward slope of ${trendAnalysis.slope.toFixed(3)}`
    })
  } else if (trendAnalysis.direction === 'declining') {
    insights.push({
      type: 'negative',
      message: `Rating trend is declining with a downward slope of ${trendAnalysis.slope.toFixed(3)}`
    })
  }
  
  if (trendAnalysis.volatility > 1) {
    insights.push({
      type: 'warning',
      message: `High rating volatility (${trendAnalysis.volatility.toFixed(2)}) indicates inconsistent service quality`
    })
  }
  
  return insights
}

function calculateMonthlyResponseRates(trips: any[]) {
  const monthlyData = trips.reduce((acc, trip) => {
    const month = format(trip.date, 'yyyy-MM')
    
    if (!acc[month]) {
      acc[month] = { month, totalParticipants: 0, totalReviews: 0 }
    }
    
    acc[month].totalParticipants += trip.bookings.length
    acc[month].totalReviews += trip.reviews.length
    
    return acc
  }, {} as Record<string, any>)
  
  return Object.values(monthlyData).map((data: any) => ({
    ...data,
    responseRate: data.totalParticipants > 0 ? (data.totalReviews / data.totalParticipants) * 100 : 0
  }))
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0
  
  const n = x.length
  const sumX = x.reduce((sum, val) => sum + val, 0)
  const sumY = y.reduce((sum, val) => sum + val, 0)
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
  const sumXX = x.reduce((sum, val) => sum + val * val, 0)
  const sumYY = y.reduce((sum, val) => sum + val * val, 0)
  
  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
  
  return denominator === 0 ? 0 : numerator / denominator
}

function calculateAverageBookingRate(trips: any[]): number {
  if (trips.length === 0) return 0
  return trips.reduce((sum, trip) => sum + trip.bookingRate, 0) / trips.length
}

function generateImpactRecommendations(correlation: number, tripAnalysis: any[]) {
  const recommendations = []
  
  if (correlation > 0.5) {
    recommendations.push({
      type: 'positive_correlation',
      message: 'Strong positive correlation between ratings and bookings. Focus on maintaining high service quality.',
      priority: 'high'
    })
  } else if (correlation < -0.3) {
    recommendations.push({
      type: 'negative_correlation',
      message: 'Negative correlation detected. Poor reviews may be impacting future bookings.',
      priority: 'critical'
    })
  }
  
  return recommendations
}

async function generateComparativeAnalysis(reviews: any[], userId?: string) {
  // Compare user's reviews against platform averages
  if (!userId) {
    return null
  }
  
  // Get platform-wide statistics for comparison
  const platformReviews = await prisma.review.findMany({
    where: { verified: true },
    select: { rating: true, helpful: true, comment: true }
  })
  
  const userStats = {
    averageRating: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0,
    totalReviews: reviews.length,
    averageHelpful: reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.helpful, 0) / reviews.length : 0
  }
  
  const platformStats = {
    averageRating: platformReviews.length > 0 ? platformReviews.reduce((sum, r) => sum + r.rating, 0) / platformReviews.length : 0,
    totalReviews: platformReviews.length,
    averageHelpful: platformReviews.length > 0 ? platformReviews.reduce((sum, r) => sum + r.helpful, 0) / platformReviews.length : 0
  }
  
  return {
    user: userStats,
    platform: platformStats,
    comparison: {
      ratingDifference: userStats.averageRating - platformStats.averageRating,
      reviewsPercentile: platformStats.totalReviews > 0 ? (userStats.totalReviews / platformStats.totalReviews) * 100 : 0,
      helpfulnessDifference: userStats.averageHelpful - platformStats.averageHelpful
    }
  }
}
