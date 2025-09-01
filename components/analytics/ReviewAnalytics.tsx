/**
 * Review Analytics - Comprehensive review and rating analytics dashboard
 * Part of Task 13.3: Rating & Review Analytics
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, AreaChart, Area
} from 'recharts'
import {
  Star, TrendingUp, TrendingDown, MessageSquare, 
  Heart, ThumbsUp, AlertTriangle, CheckCircle,
  Users, Clock, Target, BarChart3, RefreshCw,
  ArrowUp, ArrowDown, Minus, Activity, Sparkles,
  Award, Filter, Calendar, BookOpen, Lightbulb,
  Zap, Eye, Brain, Smile, Frown, Meh
} from 'lucide-react'
import { toast } from 'sonner'

// Enhanced interfaces for review analytics
interface ReviewAnalytics {
  overview: {
    totalReviews: number
    periodRange: {
      startDate: string
      endDate: string
    }
    averageRating: number
    groupBy: string
  }
  ratingDistributions: {
    distribution: Record<string, number>
    percentages: Record<string, number>
    statistics: {
      mean: number
      median: number
      mode: number
      total: number
      satisfactionRate: number
    }
    satisfaction: {
      levels: {
        veryPositive: number
        positive: number
        neutral: number
        negative: number
        veryNegative: number
      }
      rate: number
      positiveReviews: number
      negativeReviews: number
    }
  }
  sentimentAnalysis: {
    overview: {
      total: number
      withComments: number
      averageConfidence: number
    }
    sentimentDistribution: {
      positive: number
      negative: number
      neutral: number
    }
    sentimentByRating: Record<number, {
      total: number
      positive: number
      negative: number
      neutral: number
    }>
    topKeywords: {
      positive: string[]
      negative: string[]
      neutral: string[]
    }
    insights: Array<{
      type: string
      message: string
    }>
  }
  ratingTrends: {
    timeSeries: Array<{
      period: string
      totalReviews: number
      averageRating: number
      ratingDistribution: Record<string, number>
    }>
    trends: {
      direction: 'improving' | 'declining' | 'stable'
      slope: number
      correlation: number
      volatility: number
    }
    insights: Array<{
      type: string
      message: string
    }>
  }
  improvementInsights: {
    suggestions: Array<{
      type: string
      priority: 'high' | 'medium' | 'low'
      title: string
      description: string
      actionItems: string[]
      impact: 'high' | 'medium' | 'low'
      effort: 'high' | 'medium' | 'low'
    }>
    summary: {
      totalSuggestions: number
      highPriority: number
      mediumPriority: number
      lowPriority: number
    }
  }
  responseMetrics: {
    overview: {
      totalCompletedTrips: number
      totalParticipants: number
      totalReviews: number
      responseRate: number
    }
    engagement: {
      averageTimeToReview: number
      reviewsWithin7Days: number
      reviewsWithin30Days: number
      lateReviews: number
    }
    trends: {
      monthlyResponseRates: Array<{
        month: string
        totalParticipants: number
        totalReviews: number
        responseRate: number
      }>
    }
  }
  qualityScores: {
    overview: {
      averageQuality: number
      totalReviews: number
    }
    distribution: {
      excellent: number
      good: number
      average: number
      poor: number
    }
    factors: {
      withComments: number
      withHelpfulVotes: number
      timelyReviews: number
      verified: number
    }
  }
  impactAnalysis: {
    overview: {
      totalTripsAnalyzed: number
      tripsWithReviews: number
      ratingBookingCorrelation: number
    }
    insights: {
      highRatedTripsBookingRate: number
      lowRatedTripsBookingRate: number
      noReviewsBookingRate: number
    }
    recommendations: Array<{
      type: string
      message: string
      priority: string
    }>
  } | null
  comparativeAnalysis: {
    user: {
      averageRating: number
      totalReviews: number
      averageHelpful: number
    }
    platform: {
      averageRating: number
      totalReviews: number
      averageHelpful: number
    }
    comparison: {
      ratingDifference: number
      reviewsPercentile: number
      helpfulnessDifference: number
    }
  } | null
}

interface ReviewAnalyticsProps {
  userId?: string
  className?: string
  period?: string
  includeSentiment?: boolean
  includeImpact?: boolean
  autoRefresh?: boolean
}

// Chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const RATING_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#22c55e']
const SENTIMENT_COLORS = { positive: '#22c55e', negative: '#ef4444', neutral: '#6b7280' }

// Utility functions
const formatPercentage = (value: number) => `${value.toFixed(1)}%`
const formatNumber = (value: number) => value.toLocaleString()
const formatRating = (value: number) => value.toFixed(2)

const getTrendIcon = (value: number) => {
  if (value > 0) return <ArrowUp className="w-4 h-4 text-green-600" />
  if (value < 0) return <ArrowDown className="w-4 h-4 text-red-600" />
  return <Minus className="w-4 h-4 text-gray-600" />
}

const getTrendColor = (value: number) => {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

const getSentimentIcon = (sentiment: string) => {
  switch (sentiment) {
    case 'positive': return <Smile className="w-4 h-4 text-green-600" />
    case 'negative': return <Frown className="w-4 h-4 text-red-600" />
    case 'neutral': return <Meh className="w-4 h-4 text-gray-600" />
    default: return <Meh className="w-4 h-4 text-gray-600" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'destructive'
    case 'medium': return 'secondary'
    case 'low': return 'outline'
    default: return 'outline'
  }
}

const getQualityLabel = (score: number) => {
  if (score >= 80) return { label: 'Excellent', color: 'text-green-600' }
  if (score >= 60) return { label: 'Good', color: 'text-blue-600' }
  if (score >= 40) return { label: 'Average', color: 'text-yellow-600' }
  return { label: 'Poor', color: 'text-red-600' }
}

export default function ReviewAnalytics({
  userId,
  className = '',
  period = 'month',
  includeSentiment = true,
  includeImpact = true,
  autoRefresh = false
}: ReviewAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [refreshing, setRefreshing] = useState(false)

  // Load analytics data
  const loadAnalytics = async (showToast = false) => {
    try {
      setIsLoading(!analytics)
      if (analytics) setRefreshing(true)
      setError(null)

      const params = new URLSearchParams({
        period: selectedPeriod,
        includeSentiment: includeSentiment.toString(),
        includeImpact: includeImpact.toString(),
        ...(userId && { userId })
      })

      const response = await fetch(`/api/review-analytics?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load review analytics')
      }

      if (result.success) {
        setAnalytics(result.data)
        if (showToast) {
          toast.success('Review analytics updated! ⭐')
        }
      } else {
        throw new Error(result.error || 'Invalid response')
      }
    } catch (err) {
      console.error('Error loading review analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      if (showToast) {
        toast.error('Failed to update review analytics')
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Effects
  useEffect(() => {
    loadAnalytics()
  }, [userId, selectedPeriod, includeSentiment, includeImpact])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAnalytics()
      }, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (isLoading && !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadAnalytics(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (!analytics) return null

  // Prepare chart data
  const ratingDistributionData = Object.entries(analytics.ratingDistributions.distribution).map(([rating, count]) => ({
    rating: `${rating} Star${rating !== '1' ? 's' : ''}`,
    count,
    percentage: analytics.ratingDistributions.percentages[rating],
    fill: RATING_COLORS[parseInt(rating) - 1]
  }))

  const sentimentData = Object.entries(analytics.sentimentAnalysis.sentimentDistribution).map(([sentiment, count]) => ({
    name: sentiment.charAt(0).toUpperCase() + sentiment.slice(1),
    value: count,
    fill: SENTIMENT_COLORS[sentiment as keyof typeof SENTIMENT_COLORS]
  }))

  const trendsData = analytics.ratingTrends.timeSeries.map(item => ({
    period: item.period,
    rating: item.averageRating,
    reviews: item.totalReviews
  }))

  const responseRateData = analytics.responseMetrics.trends.monthlyResponseRates.map(item => ({
    month: item.month,
    responseRate: item.responseRate,
    reviews: item.totalReviews,
    participants: item.totalParticipants
  }))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-500" />
            Review & Rating Analytics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive review analysis with sentiment insights and improvement recommendations
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="quarter">Quarter</SelectItem>
              <SelectItem value="year">Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.overview.totalReviews)}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Response Rate: {formatPercentage(analytics.responseMetrics.overview.responseRate)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  {formatRating(analytics.overview.averageRating)}
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                </p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4">
              <Progress value={analytics.ratingDistributions.statistics.satisfactionRate} className="h-2" />
              <p className="text-sm text-muted-foreground mt-1">
                {formatPercentage(analytics.ratingDistributions.statistics.satisfactionRate)} satisfaction
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quality Score</p>
                <p className="text-2xl font-bold">{formatRating(analytics.qualityScores.overview.averageQuality)}</p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-4">
              <Badge variant={getQualityLabel(analytics.qualityScores.overview.averageQuality).label.toLowerCase() as any}>
                {getQualityLabel(analytics.qualityScores.overview.averageQuality).label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sentiment</p>
                <p className="text-2xl font-bold text-green-600">
                  {analytics.sentimentAnalysis.sentimentDistribution.positive}
                </p>
              </div>
              <Smile className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-1">
                <span className="text-green-600">{analytics.sentimentAnalysis.sentimentDistribution.positive}</span>
                <span className="text-gray-600">{analytics.sentimentAnalysis.sentimentDistribution.neutral}</span>
                <span className="text-red-600">{analytics.sentimentAnalysis.sentimentDistribution.negative}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="distributions" className="space-y-6">
        <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-7">
          <TabsTrigger value="distributions" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Ratings
          </TabsTrigger>
          <TabsTrigger value="sentiment" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Sentiment
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="quality" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="response" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Response
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="impact" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Impact
          </TabsTrigger>
        </TabsList>

        {/* Rating Distributions Tab */}
        <TabsContent value="distributions">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rating Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Rating Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={ratingDistributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="rating" />
                      <YAxis />
                      <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Reviews' : name]} />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rating Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Rating Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-2xl font-bold">{formatRating(analytics.ratingDistributions.statistics.mean)}</div>
                      <div className="text-sm text-muted-foreground">Mean Rating</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{analytics.ratingDistributions.statistics.median}</div>
                      <div className="text-sm text-muted-foreground">Median Rating</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{analytics.ratingDistributions.statistics.mode}</div>
                      <div className="text-sm text-muted-foreground">Most Common</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{formatPercentage(analytics.ratingDistributions.statistics.satisfactionRate)}</div>
                      <div className="text-sm text-muted-foreground">Satisfaction</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Very Positive (5⭐)</span>
                        <span>{analytics.ratingDistributions.satisfaction.levels.veryPositive}</span>
                      </div>
                      <Progress value={(analytics.ratingDistributions.satisfaction.levels.veryPositive / analytics.overview.totalReviews) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Positive (4⭐)</span>
                        <span>{analytics.ratingDistributions.satisfaction.levels.positive}</span>
                      </div>
                      <Progress value={(analytics.ratingDistributions.satisfaction.levels.positive / analytics.overview.totalReviews) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span>Neutral (3⭐)</span>
                        <span>{analytics.ratingDistributions.satisfaction.levels.neutral}</span>
                      </div>
                      <Progress value={(analytics.ratingDistributions.satisfaction.levels.neutral / analytics.overview.totalReviews) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Sentiment Analysis Tab */}
        <TabsContent value="sentiment">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {includeSentiment && analytics.sentimentAnalysis ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sentiment Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={sentimentData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value}`}
                          outerRadius={80}
                        >
                          {sentimentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Sentiment Insights */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sentiment Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="flex items-center justify-center mb-2">
                          <Smile className="w-8 h-8 text-green-500" />
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {analytics.sentimentAnalysis.sentimentDistribution.positive}
                        </div>
                        <div className="text-sm text-muted-foreground">Positive</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-2">
                          <Meh className="w-8 h-8 text-gray-500" />
                        </div>
                        <div className="text-2xl font-bold text-gray-600">
                          {analytics.sentimentAnalysis.sentimentDistribution.neutral}
                        </div>
                        <div className="text-sm text-muted-foreground">Neutral</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-center mb-2">
                          <Frown className="w-8 h-8 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-600">
                          {analytics.sentimentAnalysis.sentimentDistribution.negative}
                        </div>
                        <div className="text-sm text-muted-foreground">Negative</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Top Positive Keywords</h4>
                        <div className="flex flex-wrap gap-1">
                          {analytics.sentimentAnalysis.topKeywords.positive.slice(0, 8).map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-green-700 bg-green-100">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {analytics.sentimentAnalysis.topKeywords.negative.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Areas for Improvement</h4>
                          <div className="flex flex-wrap gap-1">
                            {analytics.sentimentAnalysis.topKeywords.negative.slice(0, 6).map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-red-700 bg-red-100">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sentiment Analysis Disabled</h3>
                  <p className="text-muted-foreground">Enable sentiment analysis to see detailed insights about review emotions and keywords.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>

        {/* Rating Trends Tab */}
        <TabsContent value="trends">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Rating Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 5]} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'rating' ? `${Number(value).toFixed(2)} ⭐` : value, 
                        name === 'rating' ? 'Average Rating' : 'Reviews'
                      ]}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rating" 
                      stroke={CHART_COLORS[0]} 
                      strokeWidth={3}
                      name="Average Rating"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="reviews" 
                      stroke={CHART_COLORS[1]} 
                      strokeWidth={2}
                      name="Number of Reviews"
                      yAxisId="right"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    {analytics.ratingTrends.trends.direction === 'improving' ? (
                      <TrendingUp className="w-8 h-8 text-green-600" />
                    ) : analytics.ratingTrends.trends.direction === 'declining' ? (
                      <TrendingDown className="w-8 h-8 text-red-600" />
                    ) : (
                      <Minus className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div className="text-2xl font-bold capitalize">
                    {analytics.ratingTrends.trends.direction}
                  </div>
                  <div className="text-sm text-muted-foreground">Trend Direction</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {formatRating(Math.abs(analytics.ratingTrends.trends.slope))}
                  </div>
                  <div className="text-sm text-muted-foreground">Trend Slope</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {formatRating(analytics.ratingTrends.trends.volatility)}
                  </div>
                  <div className="text-sm text-muted-foreground">Volatility</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Quality Scores Tab */}
        <TabsContent value="quality">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quality Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{analytics.qualityScores.distribution.excellent}</div>
                        <div className="text-sm text-muted-foreground">Excellent (80-100)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{analytics.qualityScores.distribution.good}</div>
                        <div className="text-sm text-muted-foreground">Good (60-79)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600">{analytics.qualityScores.distribution.average}</div>
                        <div className="text-sm text-muted-foreground">Average (40-59)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">{analytics.qualityScores.distribution.poor}</div>
                        <div className="text-sm text-muted-foreground">Poor (0-39)</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quality Factors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>With Comments</span>
                      <Badge variant="outline">
                        {analytics.qualityScores.factors.withComments}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Helpful Votes</span>
                      <Badge variant="outline">
                        {analytics.qualityScores.factors.withHelpfulVotes}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Timely Reviews</span>
                      <Badge variant="outline">
                        {analytics.qualityScores.factors.timelyReviews}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Verified</span>
                      <Badge variant="outline">
                        {analytics.qualityScores.factors.verified}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {formatRating(analytics.qualityScores.overview.averageQuality)}
                      </div>
                      <div className="text-sm text-muted-foreground">Average Quality Score</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Response Metrics Tab */}
        <TabsContent value="response">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Response Rate Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={responseRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'responseRate' ? `${Number(value).toFixed(1)}%` : value,
                      name === 'responseRate' ? 'Response Rate' : name
                    ]} />
                    <Area 
                      type="monotone" 
                      dataKey="responseRate" 
                      stroke={CHART_COLORS[0]} 
                      fill={CHART_COLORS[0]}
                      name="Response Rate (%)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {formatPercentage(analytics.responseMetrics.overview.responseRate)}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Response Rate</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {formatRating(analytics.responseMetrics.engagement.averageTimeToReview)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Days to Review</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {analytics.responseMetrics.engagement.reviewsWithin7Days}
                  </div>
                  <div className="text-sm text-muted-foreground">Reviews Within 7 Days</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {analytics.responseMetrics.engagement.lateReviews}
                  </div>
                  <div className="text-sm text-muted-foreground">Late Reviews (30+ days)</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Improvement Insights Tab */}
        <TabsContent value="insights">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {analytics.improvementInsights.summary.highPriority}
                  </div>
                  <div className="text-sm text-muted-foreground">High Priority</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {analytics.improvementInsights.summary.mediumPriority}
                  </div>
                  <div className="text-sm text-muted-foreground">Medium Priority</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.improvementInsights.summary.lowPriority}
                  </div>
                  <div className="text-sm text-muted-foreground">Low Priority</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {analytics.improvementInsights.suggestions.map((suggestion, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{suggestion.title}</h3>
                          <Badge variant={getPriorityColor(suggestion.priority) as any}>
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">{suggestion.description}</p>
                      </div>
                      <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Recommended Actions:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        {suggestion.actionItems.map((action, actionIndex) => (
                          <li key={actionIndex}>{action}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span className="text-sm">Impact: {suggestion.impact}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Effort: {suggestion.effort}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* Impact Analysis Tab */}
        <TabsContent value="impact">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {includeImpact && analytics.impactAnalysis ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Review Impact on Bookings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          {formatPercentage(analytics.impactAnalysis.insights.highRatedTripsBookingRate)}
                        </div>
                        <div className="text-sm text-muted-foreground">High-Rated Trips Booking Rate</div>
                        <div className="text-xs text-muted-foreground mt-1">(4+ stars)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">
                          {formatPercentage(analytics.impactAnalysis.insights.lowRatedTripsBookingRate)}
                        </div>
                        <div className="text-sm text-muted-foreground">Low-Rated Trips Booking Rate</div>
                        <div className="text-xs text-muted-foreground mt-1">(≤2.5 stars)</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-gray-600">
                          {formatPercentage(analytics.impactAnalysis.insights.noReviewsBookingRate)}
                        </div>
                        <div className="text-sm text-muted-foreground">No Reviews Booking Rate</div>
                        <div className="text-xs text-muted-foreground mt-1">(No data)</div>
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t">
                      <div className="text-center">
                        <h4 className="font-medium mb-2">Rating-Booking Correlation</h4>
                        <div className="text-2xl font-bold">
                          {formatRating(analytics.impactAnalysis.overview.ratingBookingCorrelation)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {analytics.impactAnalysis.overview.ratingBookingCorrelation > 0.5 ? 'Strong positive' :
                           analytics.impactAnalysis.overview.ratingBookingCorrelation > 0.3 ? 'Moderate positive' :
                           analytics.impactAnalysis.overview.ratingBookingCorrelation > -0.3 ? 'Weak' :
                           'Negative'} correlation
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {analytics.impactAnalysis.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Impact Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.impactAnalysis.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                            <Zap className="w-5 h-5 text-blue-500 mt-0.5" />
                            <div>
                              <p className="font-medium">{rec.message}</p>
                              <Badge variant={getPriorityColor(rec.priority) as any} className="mt-1">
                                {rec.priority}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Impact Analysis Disabled</h3>
                  <p className="text-muted-foreground">Enable impact analysis to see how reviews affect future bookings and business performance.</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
