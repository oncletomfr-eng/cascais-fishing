/**
 * Profile Statistics Overview - Comprehensive user profile statistics and analytics
 * Part of Task 13.1: Profile Statistics Overview
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp, TrendingDown, Fish, Star, Target, Award,
  Users, Calendar, Clock, CheckCircle, XCircle,
  AlertCircle, BarChart3, Activity, Trophy,
  Sparkles, RefreshCw, Eye, ArrowUp, ArrowDown,
  Minus, Zap, Crown
} from 'lucide-react'
import { toast } from 'sonner'

// Enhanced interfaces for comprehensive analytics
interface ProfileAnalytics {
  profile: {
    id: string
    experience: string
    rating: number
    completedTrips: number
    reliability: number
    totalReviews: number
    isActive: boolean
    lastActiveAt: string
  }
  metrics: {
    bookings: {
      total: number
      completed: number
      cancelled: number
    }
    reviews: {
      received: number
      given: number
      averageRating: number
    }
    approvals: {
      applied: number
      approved: number
      rejected: number
      pending: number
    }
    badges: {
      earned: number
      categories: Record<string, number>
    }
  }
  comparison?: {
    platform: {
      avgRating: number
      avgCompletedTrips: number
      avgReliability: number
    }
    user: {
      rating: number
      completedTrips: number
      reliability: number
    }
  }
  timeSeries?: Array<{
    date: string
    bookings: number
  }>
  predictions?: {
    nextMonthBookings: number
    ratingTrend: string
    recommendedActions: string[]
  }
  recentActivity?: {
    bookings: any[]
    reviews: any[]
    badges: any[]
  }
}

interface ProfileStatisticsOverviewProps {
  userId?: string
  className?: string
  showComparisons?: boolean
  showPredictions?: boolean
  autoRefresh?: boolean
}

// Utility functions
const formatExperience = (experience: string): { label: string; color: string; icon: React.ComponentType<{ className?: string }> } => {
  const experiences = {
    BEGINNER: { label: 'Новичок', color: 'text-green-600', icon: Users },
    INTERMEDIATE: { label: 'Опытный', color: 'text-blue-600', icon: Fish },
    ADVANCED: { label: 'Продвинутый', color: 'text-purple-600', icon: Trophy },
    EXPERT: { label: 'Эксперт', color: 'text-orange-600', icon: Crown },
    MASTER: { label: 'Мастер', color: 'text-red-600', icon: Award }
  }
  return experiences[experience as keyof typeof experiences] || experiences.BEGINNER
}

const getComparisonTrend = (userValue: number, platformValue: number): {
  trend: 'up' | 'down' | 'equal'
  percentage: number
  icon: React.ComponentType<{ className?: string }>
  color: string
} => {
  const diff = ((userValue - platformValue) / platformValue) * 100
  
  if (Math.abs(diff) < 2) {
    return { trend: 'equal', percentage: 0, icon: Minus, color: 'text-gray-600' }
  } else if (diff > 0) {
    return { trend: 'up', percentage: Math.abs(diff), icon: ArrowUp, color: 'text-green-600' }
  } else {
    return { trend: 'down', percentage: Math.abs(diff), icon: ArrowDown, color: 'text-red-600' }
  }
}

const getCompletionRate = (completed: number, total: number): number => {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

const getPerformanceLevel = (value: number, max: number): {
  level: string
  color: string
  percentage: number
} => {
  const percentage = Math.min(100, (value / max) * 100)
  
  if (percentage >= 90) {
    return { level: 'Отлично', color: 'text-green-600', percentage }
  } else if (percentage >= 70) {
    return { level: 'Хорошо', color: 'text-blue-600', percentage }
  } else if (percentage >= 50) {
    return { level: 'Средне', color: 'text-yellow-600', percentage }
  } else {
    return { level: 'Требует внимания', color: 'text-red-600', percentage }
  }
}

export default function ProfileStatisticsOverview({
  userId,
  className = '',
  showComparisons = true,
  showPredictions = false,
  autoRefresh = false
}: ProfileStatisticsOverviewProps) {
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<string>('month')
  const [refreshing, setRefreshing] = useState(false)

  // Load analytics data
  const loadAnalytics = async (showToast = false) => {
    try {
      setIsLoading(!analytics) // Only show loading spinner on initial load
      if (analytics) setRefreshing(true)
      setError(null)

      const params = new URLSearchParams({
        period,
        includeComparisons: showComparisons.toString(),
        includePredictions: showPredictions.toString(),
        ...(userId && { userId })
      })

      const response = await fetch(`/api/profiles/analytics?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load analytics')
      }

      if (result.success) {
        setAnalytics(result.data)
        if (showToast) {
          toast.success('Analytics updated! 📊')
        }
      } else {
        throw new Error(result.error || 'Invalid response')
      }
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      if (showToast) {
        toast.error('Failed to update analytics')
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Auto refresh effect
  useEffect(() => {
    loadAnalytics()
  }, [userId, period, showComparisons, showPredictions])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAnalytics()
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (isLoading && !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeleton */}
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
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
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

  const { profile, metrics, comparison, predictions } = analytics

  // Calculate completion rates and performance indicators
  const bookingCompletionRate = getCompletionRate(metrics.bookings.completed, metrics.bookings.total)
  const approvalSuccessRate = getCompletionRate(metrics.approvals.approved, metrics.approvals.applied)
  const reviewGivenRate = getCompletionRate(metrics.reviews.given, metrics.bookings.completed)

  // Performance levels
  const ratingPerformance = getPerformanceLevel(profile.rating, 5)
  const reliabilityPerformance = getPerformanceLevel(profile.reliability, 100)
  const activityPerformance = getPerformanceLevel(metrics.bookings.total, 20)

  // Experience info
  const experienceInfo = formatExperience(profile.experience)
  const ExperienceIcon = experienceInfo.icon

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Profile Statistics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive analytics and performance overview
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
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

      {/* Profile Overview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExperienceIcon className={`w-5 h-5 ${experienceInfo.color}`} />
              Profile Overview
              <Badge variant="secondary" className={experienceInfo.color}>
                {experienceInfo.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Core Stats */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Rating</span>
                    <span className={`font-bold ${ratingPerformance.color}`}>
                      {profile.rating.toFixed(1)}/5.0
                    </span>
                  </div>
                  <Progress value={ratingPerformance.percentage} className="h-2" />
                  <span className={`text-xs ${ratingPerformance.color}`}>
                    {ratingPerformance.level}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reliability</span>
                    <span className={`font-bold ${reliabilityPerformance.color}`}>
                      {profile.reliability}%
                    </span>
                  </div>
                  <Progress value={reliabilityPerformance.percentage} className="h-2" />
                  <span className={`text-xs ${reliabilityPerformance.color}`}>
                    {reliabilityPerformance.level}
                  </span>
                </div>
              </div>

              {/* Activity Stats */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Activity Level</span>
                    <span className={`font-bold ${activityPerformance.color}`}>
                      {metrics.bookings.total} trips
                    </span>
                  </div>
                  <Progress value={activityPerformance.percentage} className="h-2" />
                  <span className={`text-xs ${activityPerformance.color}`}>
                    {activityPerformance.level}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Reviews</span>
                    <span className="font-bold">
                      {profile.totalReviews} received
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.reviews.given} given to others
                  </div>
                </div>
              </div>

              {/* Badges & Achievements */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Achievements</span>
                  <Badge variant="outline">{metrics.badges.earned}</Badge>
                </div>
                
                <div className="space-y-1">
                  {Object.entries(metrics.badges.categories).map(([category, count]) => (
                    <div key={category} className="flex justify-between text-xs">
                      <span className="capitalize">{category.toLowerCase()}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Statistics Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Booking Completion Rate */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Fish className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Completion Rate</span>
              </div>
              {comparison && (
                <ComparisonIndicator 
                  userValue={bookingCompletionRate} 
                  platformValue={comparison.platform.avgCompletedTrips > 0 ? 
                    (comparison.platform.avgCompletedTrips / metrics.bookings.total) * 100 : 50} 
                />
              )}
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{bookingCompletionRate}%</div>
              <Progress value={bookingCompletionRate} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {metrics.bookings.completed} of {metrics.bookings.total} trips completed
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Success Rate */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Approval Rate</span>
              </div>
              <Badge variant={approvalSuccessRate >= 80 ? "default" : "destructive"} className="text-xs">
                {approvalSuccessRate >= 80 ? "Good" : "Needs Work"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{approvalSuccessRate}%</div>
              <Progress value={approvalSuccessRate} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {metrics.approvals.approved} of {metrics.approvals.applied} applications approved
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Engagement */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                <span className="text-sm font-medium">Review Engagement</span>
              </div>
              <Badge variant={reviewGivenRate >= 70 ? "default" : "secondary"} className="text-xs">
                {reviewGivenRate >= 70 ? "Active" : "Passive"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{reviewGivenRate}%</div>
              <Progress value={reviewGivenRate} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Reviews given for completed trips
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Streak */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">Activity Level</span>
              </div>
              <Badge variant={profile.isActive ? "default" : "secondary"} className="text-xs">
                {profile.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{metrics.bookings.total}</div>
              <div className="text-xs text-muted-foreground">
                Total bookings this {period}
              </div>
              <div className="text-xs text-muted-foreground">
                Last active: {new Date(profile.lastActiveAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Section */}
      {showComparisons && comparison && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-green-500" />
                Platform Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ComparisonMetric
                  title="Rating"
                  userValue={comparison.user.rating}
                  platformValue={comparison.platform.avgRating}
                  format={(v) => `${v.toFixed(1)}/5.0`}
                  icon={Star}
                />
                <ComparisonMetric
                  title="Completed Trips"
                  userValue={comparison.user.completedTrips}
                  platformValue={comparison.platform.avgCompletedTrips}
                  format={(v) => v.toString()}
                  icon={Fish}
                />
                <ComparisonMetric
                  title="Reliability"
                  userValue={comparison.user.reliability}
                  platformValue={comparison.platform.avgReliability}
                  format={(v) => `${v.toFixed(1)}%`}
                  icon={Target}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Predictions Section */}
      {showPredictions && predictions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Predictions & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Next Month Forecast</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Expected Bookings</span>
                        <Badge variant="outline">{predictions.nextMonthBookings}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Rating Trend</span>
                        <Badge variant={predictions.ratingTrend === 'improving' ? 'default' : 'secondary'}>
                          {predictions.ratingTrend}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Recommended Actions</h4>
                    <div className="space-y-1">
                      {predictions.recommendedActions.length > 0 ? (
                        predictions.recommendedActions.map((action, index) => (
                          <div key={index} className="text-sm text-muted-foreground">
                            • {action}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-green-600">
                          ✓ Keep up the great work!
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// Helper component for comparison indicators
interface ComparisonIndicatorProps {
  userValue: number
  platformValue: number
}

function ComparisonIndicator({ userValue, platformValue }: ComparisonIndicatorProps) {
  const { trend, percentage, icon: Icon, color } = getComparisonTrend(userValue, platformValue)
  
  if (trend === 'equal') return null
  
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon className="w-3 h-3" />
      <span className="text-xs font-medium">
        {percentage.toFixed(0)}%
      </span>
    </div>
  )
}

// Helper component for detailed comparison metrics
interface ComparisonMetricProps {
  title: string
  userValue: number
  platformValue: number
  format: (value: number) => string
  icon: React.ComponentType<{ className?: string }>
}

function ComparisonMetric({ title, userValue, platformValue, format, icon: Icon }: ComparisonMetricProps) {
  const { trend, percentage, color } = getComparisonTrend(userValue, platformValue)
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="font-medium">{title}</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">You</span>
          <span className="font-bold">{format(userValue)}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Platform Avg</span>
          <span className="text-sm">{format(platformValue)}</span>
        </div>
        
        {trend !== 'equal' && (
          <div className={`flex items-center justify-center gap-1 ${color} p-2 rounded-md bg-muted/50`}>
            <span className="text-xs font-medium">
              {trend === 'up' ? `+${percentage.toFixed(0)}%` : `-${percentage.toFixed(0)}%`} vs platform
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
