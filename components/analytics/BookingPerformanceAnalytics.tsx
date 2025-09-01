/**
 * Booking Performance Analytics - Comprehensive booking analytics dashboard
 * Part of Task 13.2: Booking Performance Analytics
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
  FunnelChart, Funnel, LabelList, AreaChart, Area
} from 'recharts'
import {
  TrendingUp, TrendingDown, Filter as FunnelIcon, 
  Calendar, Clock, Euro, AlertTriangle, CheckCircle,
  XCircle, Users, Target, BarChart3, RefreshCw,
  ArrowUp, ArrowDown, Minus, Activity, Sparkles,
  CreditCard, Timer, Award, Filter
} from 'lucide-react'
import { toast } from 'sonner'

// Enhanced interfaces for booking analytics
interface BookingAnalytics {
  overview: {
    totalBookings: number
    periodRange: {
      startDate: string
      endDate: string
    }
    groupBy: string
  }
  funnelAnalysis: {
    stages: {
      created: number
      pending: number
      confirmed: number
      completed: number
      cancelled: number
    }
    conversions: {
      pendingToConfirmed: number
      confirmedToCompleted: number
      overallSuccess: number
    }
    dropOffPoints: {
      pendingDropoff: number
      completionDropoff: number
      cancellationRate: number
    }
  }
  conversionRates: {
    byCohort: Array<{
      cohort: string
      totalBookings: number
      confirmationRate: number
      completionRate: number
    }>
    byTimeSlot: Array<{
      timeSlot: string
      totalBookings: number
      confirmationRate: number
      completionRate: number
    }>
    overall: {
      totalBookings: number
      confirmationRate: number
      completionRate: number
    }
  }
  cancellationAnalysis: {
    overview: {
      totalCancellations: number
      cancellationRate: number
      averageDaysBeforeTrip: number
    }
    patterns: {
      byTiming: {
        lastMinute: number
        earlyCancel: number
        midRange: number
      }
      byPriceLevel: Record<string, number>
      byTimeSlot: Record<string, number>
    }
    monthlyTrends: Array<{
      month: string
      cancellations: number
    }>
  }
  seasonalTrends: {
    timeSeries: Array<{
      period: string
      totalBookings: number
      confirmedBookings: number
      revenue: number
      averageValue: number
      confirmationRate: number
    }>
    trends: {
      averageBookingsPerPeriod: number
      totalRevenue: number
      growthRate: number
    }
  }
  valueAnalytics: {
    overview: {
      totalRevenue: number
      averageBookingValue: number
      averageParticipants: number
      totalConfirmedBookings: number
    }
    distribution: {
      byPriceTier: {
        budget: number
        standard: number
        premium: number
      }
      byParticipantCount: Record<string, number>
      byTimeSlot: Record<string, number>
    }
    metrics: {
      medianBookingValue: number
      revenuePerBooking: number
      participantUtilization: number
    }
  }
  timeToBookMetrics: {
    bookingAdvance: {
      average: number
      median: number
      distribution: {
        sameDay: number
        withinWeek: number
        withinMonth: number
        moreThanMonth: number
      }
    }
    confirmationTime: {
      averageHours: number
      medianHours: number
      within24h: number
      within48h: number
    } | null
  }
  successRates: {
    overall: {
      confirmationRate: number
      completionRate: number
      cancellationRate: number
      successRate: number
    }
    breakdown: {
      total: number
      confirmed: number
      completed: number
      cancelled: number
      pending: number
    }
  }
  periodComparison: {
    current: number
    previous: number
    growth: number
    difference: number
  }
  projections: {
    nextMonth: {
      expectedBookings: number
      confidence: string
    }
    nextQuarter: {
      expectedBookings: number
      confidence: string
    }
  } | null
}

interface BookingPerformanceAnalyticsProps {
  userId?: string
  className?: string
  period?: string
  showProjections?: boolean
  autoRefresh?: boolean
}

// Chart colors
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const FUNNEL_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']

// Utility functions
const formatCurrency = (amount: number) => `€${amount.toFixed(0)}`
const formatPercentage = (value: number) => `${value.toFixed(1)}%`
const formatNumber = (value: number) => value.toLocaleString()

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

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'high': return 'text-green-600'
    case 'medium': return 'text-yellow-600'
    case 'low': return 'text-red-600'
    default: return 'text-gray-600'
  }
}

export default function BookingPerformanceAnalytics({
  userId,
  className = '',
  period = 'month',
  showProjections = true,
  autoRefresh = false
}: BookingPerformanceAnalyticsProps) {
  const [analytics, setAnalytics] = useState<BookingAnalytics | null>(null)
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
        includeProjections: showProjections.toString(),
        ...(userId && { userId })
      })

      const response = await fetch(`/api/booking-analytics?${params}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load booking analytics')
      }

      if (result.success) {
        setAnalytics(result.data)
        if (showToast) {
          toast.success('Booking analytics updated! 📊')
        }
      } else {
        throw new Error(result.error || 'Invalid response')
      }
    } catch (err) {
      console.error('Error loading booking analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
      if (showToast) {
        toast.error('Failed to update booking analytics')
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Effects
  useEffect(() => {
    loadAnalytics()
  }, [userId, selectedPeriod, showProjections])

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
  const funnelData = [
    { name: 'Created', value: analytics.funnelAnalysis.stages.created, fill: FUNNEL_COLORS[0] },
    { name: 'Confirmed', value: analytics.funnelAnalysis.stages.confirmed, fill: FUNNEL_COLORS[1] },
    { name: 'Completed', value: analytics.funnelAnalysis.stages.completed, fill: FUNNEL_COLORS[2] }
  ]

  const conversionData = analytics.conversionRates.byTimeSlot.map(slot => ({
    timeSlot: slot.timeSlot,
    confirmationRate: slot.confirmationRate,
    completionRate: slot.completionRate,
    totalBookings: slot.totalBookings
  }))

  const seasonalData = analytics.seasonalTrends.timeSeries.map(item => ({
    period: item.period,
    bookings: item.totalBookings,
    revenue: item.revenue,
    confirmationRate: item.confirmationRate
  }))

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Booking Performance Analytics
          </h2>
          <p className="text-muted-foreground">
            Comprehensive booking funnel, conversion, and performance analysis
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
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{formatNumber(analytics.overview.totalBookings)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center">
              {getTrendIcon(analytics.periodComparison.growth)}
              <span className={`ml-1 text-sm ${getTrendColor(analytics.periodComparison.growth)}`}>
                {formatPercentage(Math.abs(analytics.periodComparison.growth))} vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(analytics.successRates.overall.successRate)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4">
              <Progress value={analytics.successRates.overall.successRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(analytics.valueAnalytics.overview.totalRevenue)}</p>
              </div>
              <Euro className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Avg: {formatCurrency(analytics.valueAnalytics.overview.averageBookingValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cancellation Rate</p>
                <p className="text-2xl font-bold">{formatPercentage(analytics.cancellationAnalysis.overview.cancellationRate)}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <div className="mt-4">
              <Badge variant={analytics.cancellationAnalysis.overview.cancellationRate < 10 ? "default" : "destructive"}>
                {analytics.cancellationAnalysis.overview.cancellationRate < 10 ? "Good" : "High"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="funnel" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-6">
          <TabsTrigger value="funnel" className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4" />
            Funnel
          </TabsTrigger>
          <TabsTrigger value="conversion" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Conversion
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="value" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Value
          </TabsTrigger>
          <TabsTrigger value="timing" className="flex items-center gap-2">
            <Timer className="w-4 h-4" />
            Timing
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Booking Funnel Tab */}
        <TabsContent value="funnel">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Funnel Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                      <Tooltip />
                      <Funnel
                        dataKey="value"
                        data={funnelData}
                        isAnimationActive
                      >
                        <LabelList position="center" fill="#fff" stroke="none" />
                      </Funnel>
                    </FunnelChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Conversion Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Pending → Confirmed</span>
                      <span className="font-bold">
                        {formatPercentage(analytics.funnelAnalysis.conversions.pendingToConfirmed)}
                      </span>
                    </div>
                    <Progress value={analytics.funnelAnalysis.conversions.pendingToConfirmed} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Confirmed → Completed</span>
                      <span className="font-bold">
                        {formatPercentage(analytics.funnelAnalysis.conversions.confirmedToCompleted)}
                      </span>
                    </div>
                    <Progress value={analytics.funnelAnalysis.conversions.confirmedToCompleted} className="h-2" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span>Overall Success</span>
                      <span className="font-bold text-green-600">
                        {formatPercentage(analytics.funnelAnalysis.conversions.overallSuccess)}
                      </span>
                    </div>
                    <Progress value={analytics.funnelAnalysis.conversions.overallSuccess} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Drop-off Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {analytics.funnelAnalysis.dropOffPoints.pendingDropoff}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending Drop-offs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {analytics.funnelAnalysis.dropOffPoints.completionDropoff}
                    </div>
                    <div className="text-sm text-muted-foreground">Completion Drop-offs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {formatPercentage(analytics.funnelAnalysis.dropOffPoints.cancellationRate)}
                    </div>
                    <div className="text-sm text-muted-foreground">Cancellation Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Conversion Analysis Tab */}
        <TabsContent value="conversion">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Time Slot Conversion */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion by Time Slot</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={conversionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeSlot" />
                      <YAxis />
                      <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
                      <Legend />
                      <Bar dataKey="confirmationRate" fill={CHART_COLORS[0]} name="Confirmation %" />
                      <Bar dataKey="completionRate" fill={CHART_COLORS[1]} name="Completion %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Cohort Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Conversion by User Cohort</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.conversionRates.byCohort.map((cohort, index) => (
                      <div key={cohort.cohort} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="capitalize">{cohort.cohort.replace(/_/g, ' ')}</span>
                          <span className="text-sm text-muted-foreground">
                            {cohort.totalBookings} bookings
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Confirmation: {formatPercentage(cohort.confirmationRate)}</span>
                          </div>
                          <Progress value={cohort.confirmationRate} className="h-1" />
                          <div className="flex justify-between text-xs">
                            <span>Completion: {formatPercentage(cohort.completionRate)}</span>
                          </div>
                          <Progress value={cohort.completionRate} className="h-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Seasonal Trends Tab */}
        <TabsContent value="seasonal">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle>Booking & Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={seasonalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(Number(value)) : value, 
                        name
                      ]}
                    />
                    <Legend />
                    <Area 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="bookings" 
                      stackId="1" 
                      stroke={CHART_COLORS[0]} 
                      fill={CHART_COLORS[0]}
                      name="Bookings"
                    />
                    <Area 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="2" 
                      stroke={CHART_COLORS[1]} 
                      fill={CHART_COLORS[1]}
                      name="Revenue (€)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(analytics.seasonalTrends.trends.averageBookingsPerPeriod)}
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Bookings/Period</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-2xl font-bold">
                    {formatCurrency(analytics.seasonalTrends.trends.totalRevenue)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Revenue</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 text-center">
                  <div className={`text-2xl font-bold ${getTrendColor(analytics.seasonalTrends.trends.growthRate)}`}>
                    {formatPercentage(analytics.seasonalTrends.trends.growthRate)}
                  </div>
                  <div className="text-sm text-muted-foreground">Growth Rate</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Value Analytics Tab */}
        <TabsContent value="value">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Price Tier Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Price Tier</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        dataKey="value"
                        data={[
                          { name: 'Budget (<€80)', value: analytics.valueAnalytics.distribution.byPriceTier.budget },
                          { name: 'Standard (€80-120)', value: analytics.valueAnalytics.distribution.byPriceTier.standard },
                          { name: 'Premium (>€120)', value: analytics.valueAnalytics.distribution.byPriceTier.premium }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                      >
                        {[0, 1, 2].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Value Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Value Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Average Booking Value</span>
                    <span className="font-bold">
                      {formatCurrency(analytics.valueAnalytics.overview.averageBookingValue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Median Booking Value</span>
                    <span className="font-bold">
                      {formatCurrency(analytics.valueAnalytics.metrics.medianBookingValue)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Average Participants</span>
                    <span className="font-bold">
                      {analytics.valueAnalytics.overview.averageParticipants.toFixed(1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Revenue per Booking</span>
                    <span className="font-bold">
                      {formatCurrency(analytics.valueAnalytics.metrics.revenuePerBooking)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>

        {/* Time Metrics Tab */}
        <TabsContent value="timing">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Booking Advance Times */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Advance Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Same Day</span>
                      <Badge variant="outline">
                        {analytics.timeToBookMetrics.bookingAdvance.distribution.sameDay}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Within Week</span>
                      <Badge variant="outline">
                        {analytics.timeToBookMetrics.bookingAdvance.distribution.withinWeek}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Within Month</span>
                      <Badge variant="outline">
                        {analytics.timeToBookMetrics.bookingAdvance.distribution.withinMonth}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>More Than Month</span>
                      <Badge variant="outline">
                        {analytics.timeToBookMetrics.bookingAdvance.distribution.moreThanMonth}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {analytics.timeToBookMetrics.bookingAdvance.average.toFixed(1)} days
                      </div>
                      <div className="text-sm text-muted-foreground">Average Advance</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Confirmation Times */}
              {analytics.timeToBookMetrics.confirmationTime && (
                <Card>
                  <CardHeader>
                    <CardTitle>Confirmation Response Time</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {analytics.timeToBookMetrics.confirmationTime.averageHours.toFixed(1)}h
                      </div>
                      <div className="text-sm text-muted-foreground">Average Response Time</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Within 24h</span>
                        <Badge variant="default">
                          {analytics.timeToBookMetrics.confirmationTime.within24h}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Within 48h</span>
                        <Badge variant="outline">
                          {analytics.timeToBookMetrics.confirmationTime.within48h}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Insights & Projections Tab */}
        <TabsContent value="insights">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Cancellation Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium">Timing Patterns</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Last Minute</span>
                        <span>{analytics.cancellationAnalysis.patterns.byTiming.lastMinute}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Early Cancel</span>
                        <span>{analytics.cancellationAnalysis.patterns.byTiming.earlyCancel}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Mid-Range</span>
                        <span>{analytics.cancellationAnalysis.patterns.byTiming.midRange}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Price Level Impact</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.cancellationAnalysis.patterns.byPriceLevel).map(([level, count]) => (
                        <div key={level} className="flex justify-between text-sm">
                          <span className="capitalize">{level}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Time Slot Impact</h4>
                    <div className="space-y-1">
                      {Object.entries(analytics.cancellationAnalysis.patterns.byTimeSlot).map(([slot, count]) => (
                        <div key={slot} className="flex justify-between text-sm">
                          <span>{slot}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Projections */}
            {showProjections && analytics.projections && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-500" />
                    Performance Projections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="text-center space-y-2">
                      <div className="text-2xl font-bold">
                        {analytics.projections.nextMonth.expectedBookings}
                      </div>
                      <div className="text-sm text-muted-foreground">Expected Next Month</div>
                      <Badge 
                        variant={analytics.projections.nextMonth.confidence === 'high' ? 'default' : 'outline'}
                        className={getConfidenceColor(analytics.projections.nextMonth.confidence)}
                      >
                        {analytics.projections.nextMonth.confidence} confidence
                      </Badge>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <div className="text-2xl font-bold">
                        {analytics.projections.nextQuarter.expectedBookings}
                      </div>
                      <div className="text-sm text-muted-foreground">Expected Next Quarter</div>
                      <Badge 
                        variant={analytics.projections.nextQuarter.confidence === 'high' ? 'default' : 'outline'}
                        className={getConfidenceColor(analytics.projections.nextQuarter.confidence)}
                      >
                        {analytics.projections.nextQuarter.confidence} confidence
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
