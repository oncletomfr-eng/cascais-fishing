'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, ScatterChart, Scatter
} from 'recharts'
import {
  Clock, Calendar, Activity, TrendingUp, TrendingDown, Filter,
  Download, Share2, RefreshCw, ArrowUp, ArrowDown, Minus,
  Trophy, Star, Calendar as CalendarIcon, FileText, Fish,
  CheckCircle, Award, Users, Target, BarChart3, Zap, Crown,
  Sparkles, Heart, MapPin, Timer, Flame, Gauge, Eye
} from 'lucide-react'
import { toast } from 'sonner'

interface ActivityEvent {
  id: string
  type: 'registration' | 'booking' | 'achievement' | 'badge' | 'review_given' | 'review_received' | 
        'diary_entry' | 'catch_record' | 'approval' | 'milestone'
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

interface ActivityTimelineProps {
  userId?: string
  period?: 'week' | 'month' | 'quarter' | 'year' | 'all'
  includeHeatmap?: boolean
  includePatterns?: boolean
  autoRefresh?: boolean
  className?: string
}

const ACTIVITY_TYPE_CONFIG = {
  registration: { icon: '🎣', label: 'Registration', color: '#8B5CF6' },
  booking: { icon: '📅', label: 'Bookings', color: '#3B82F6' },
  achievement: { icon: '🏆', label: 'Achievements', color: '#F59E0B' },
  badge: { icon: '🏅', label: 'Badges', color: '#10B981' },
  review_given: { icon: '⭐', label: 'Reviews Given', color: '#6366F1' },
  review_received: { icon: '📝', label: 'Reviews Received', color: '#EC4899' },
  diary_entry: { icon: '📔', label: 'Diary Entries', color: '#84CC16' },
  catch_record: { icon: '🐟', label: 'Catch Records', color: '#06B6D4' },
  approval: { icon: '✅', label: 'Approvals', color: '#14B8A6' },
  milestone: { icon: '🎯', label: 'Milestones', color: '#F97316' }
} as const

const IMPORTANCE_COLORS = {
  low: '#94A3B8',
  medium: '#3B82F6', 
  high: '#F59E0B'
}

const HEATMAP_COLORS = ['#f3f4f6', '#d1fae5', '#86efac', '#22c55e', '#15803d'] // 0-4 levels

export default function ActivityTimeline({
  userId,
  period = 'month',
  includeHeatmap = true,
  includePatterns = true,
  autoRefresh = false,
  className = ''
}: ActivityTimelineProps) {
  const { data: session } = useSession()
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>([])
  const [filterByImportance, setFilterByImportance] = useState<string[]>(['low', 'medium', 'high'])
  const [viewMode, setViewMode] = useState<'timeline' | 'patterns' | 'heatmap' | 'milestones'>('timeline')
  const [showFilters, setShowFilters] = useState(false)

  const currentUserId = userId || session?.user?.id

  const fetchTimelineData = useCallback(async () => {
    if (!currentUserId) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        userId: currentUserId,
        period: selectedPeriod,
        includeHeatmap: includeHeatmap.toString(),
        includePatterns: includePatterns.toString(),
        ...(selectedActivityTypes.length > 0 && { 
          activityTypes: selectedActivityTypes.join(',') 
        })
      })

      const response = await fetch(`/api/activity-timeline?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch timeline data')
      }

      // Convert string dates back to Date objects
      const processedData = {
        ...result.data,
        events: result.data.events.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        })),
        milestones: result.data.milestones.map((milestone: any) => ({
          ...milestone,
          date: new Date(milestone.date)
        }))
      }

      setTimelineData(processedData)
      
    } catch (err) {
      console.error('Timeline fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      toast.error('Failed to load activity timeline')
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, selectedPeriod, selectedActivityTypes, includeHeatmap, includePatterns])

  useEffect(() => {
    fetchTimelineData()
  }, [fetchTimelineData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchTimelineData()
    }, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [autoRefresh, fetchTimelineData])

  const filteredEvents = useMemo(() => {
    if (!timelineData) return []

    return timelineData.events.filter(event => {
      // Filter by importance
      if (!filterByImportance.includes(event.importance)) return false
      
      // Filter by activity types (if any selected)
      if (selectedActivityTypes.length > 0 && !selectedActivityTypes.includes(event.type)) {
        return false
      }

      return true
    })
  }, [timelineData, filterByImportance, selectedActivityTypes])

  const exportTimeline = useCallback((format: 'json' | 'csv') => {
    if (!timelineData) return

    const data = filteredEvents.map(event => ({
      date: event.timestamp.toISOString(),
      type: event.type,
      title: event.title,
      description: event.description || '',
      importance: event.importance,
      category: event.category
    }))

    let content: string
    let filename: string

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `activity-timeline-${new Date().toISOString().split('T')[0]}.json`
    } else {
      const headers = ['Date', 'Type', 'Title', 'Description', 'Importance', 'Category']
      const csvRows = [
        headers.join(','),
        ...data.map(row => [
          row.date,
          row.type,
          `"${row.title.replace(/"/g, '""')}"`,
          `"${row.description.replace(/"/g, '""')}"`,
          row.importance,
          row.category
        ].join(','))
      ]
      content = csvRows.join('\n')
      filename = `activity-timeline-${new Date().toISOString().split('T')[0]}.csv`
    }

    const blob = new Blob([content], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Timeline exported as ${format.toUpperCase()}`)
  }, [timelineData, filteredEvents])

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return timestamp.toLocaleDateString()
    }
  }

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case 'high': return <Flame className="w-4 h-4 text-orange-500" />
      case 'medium': return <Zap className="w-4 h-4 text-blue-500" />
      default: return <Eye className="w-4 h-4 text-gray-400" />
    }
  }

  if (!currentUserId) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Please log in to view activity timeline</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-destructive">Error loading timeline: {error}</p>
          <Button onClick={fetchTimelineData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className={`space-y-6 ${className}`}>
        {/* Header with controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Activity Timeline
                </CardTitle>
                <CardDescription>
                  Your fishing journey and engagement patterns over time
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTimelineData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Summary Stats */}
          {timelineData && (
            <CardContent className="border-t">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {timelineData.summary.totalEvents}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {timelineData.summary.activityStreak}
                  </div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {timelineData.summary.engagementScore}%
                  </div>
                  <div className="text-sm text-muted-foreground">Engagement</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {timelineData.milestones.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Milestones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">
                    {Object.keys(timelineData.summary.eventsByType).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Activity Types</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-teal-600">
                    {timelineData.patterns.peakHours[0]?.hour || 'N/A'}:00
                  </div>
                  <div className="text-sm text-muted-foreground">Peak Hour</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filters & Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Period Selection */}
                    <div className="space-y-2">
                      <Label>Time Period</Label>
                      <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="week">Last Week</SelectItem>
                          <SelectItem value="month">Last Month</SelectItem>
                          <SelectItem value="quarter">Last Quarter</SelectItem>
                          <SelectItem value="year">Last Year</SelectItem>
                          <SelectItem value="all">All Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* View Mode */}
                    <div className="space-y-2">
                      <Label>View Mode</Label>
                      <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="timeline">Timeline View</SelectItem>
                          <SelectItem value="patterns">Activity Patterns</SelectItem>
                          <SelectItem value="heatmap">Activity Heatmap</SelectItem>
                          <SelectItem value="milestones">Milestones</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Export Options */}
                    <div className="space-y-2">
                      <Label>Export</Label>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportTimeline('json')}
                          disabled={!timelineData}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          JSON
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => exportTimeline('csv')}
                          disabled={!timelineData}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          CSV
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Activity Type Filters */}
                  <div className="space-y-2">
                    <Label>Activity Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
                        <div key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={type}
                            checked={selectedActivityTypes.length === 0 || selectedActivityTypes.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedActivityTypes(prev => 
                                  prev.includes(type) ? prev : [...prev, type]
                                )
                              } else {
                                setSelectedActivityTypes(prev => prev.filter(t => t !== type))
                              }
                            }}
                            className="rounded"
                          />
                          <label htmlFor={type} className="text-sm flex items-center gap-1 cursor-pointer">
                            <span>{config.icon}</span>
                            {config.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Importance Filters */}
                  <div className="space-y-2">
                    <Label>Importance Level</Label>
                    <div className="flex gap-4">
                      {['high', 'medium', 'low'].map(importance => (
                        <div key={importance} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`importance-${importance}`}
                            checked={filterByImportance.includes(importance)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterByImportance(prev => [...prev, importance])
                              } else {
                                setFilterByImportance(prev => prev.filter(i => i !== importance))
                              }
                            }}
                            className="rounded"
                          />
                          <label 
                            htmlFor={`importance-${importance}`} 
                            className="text-sm flex items-center gap-1 cursor-pointer capitalize"
                          >
                            {getImportanceIcon(importance)}
                            {importance}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Loading activity timeline...</span>
              </div>
            </CardContent>
          </Card>
        ) : timelineData ? (
          <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="patterns" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Patterns
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Heatmap
              </TabsTrigger>
              <TabsTrigger value="milestones" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Milestones
              </TabsTrigger>
            </TabsList>

            {/* Timeline View */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>
                    Chronological view of your fishing activities and achievements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {filteredEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No activities found for the selected filters
                      </div>
                    ) : (
                      filteredEvents.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start space-x-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div 
                            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg"
                            style={{ backgroundColor: event.color }}
                          >
                            {event.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              <div className="flex items-center space-x-2">
                                {getImportanceIcon(event.importance)}
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(event.timestamp)}
                                </span>
                              </div>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {event.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {ACTIVITY_TYPE_CONFIG[event.type]?.label || event.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs capitalize">
                                {event.category}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patterns View */}
            <TabsContent value="patterns" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Daily Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Daily Activity</CardTitle>
                    <CardDescription>Activity count and intensity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={timelineData.patterns.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#3B82F6" 
                          fill="#3B82F6" 
                          fillOpacity={0.3}
                          name="Events"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="intensity" 
                          stroke="#F59E0B" 
                          fill="#F59E0B" 
                          fillOpacity={0.3}
                          name="Intensity"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly Pattern */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Weekly Pattern</CardTitle>
                    <CardDescription>Activity distribution by day of week</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={timelineData.patterns.weeklyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip />
                        <Bar dataKey="count" fill="#10B981" name="Events" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Peak Hours */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Peak Hours</CardTitle>
                    <CardDescription>Most active hours of the day</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={timelineData.patterns.peakHours.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hour" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value}:00`}
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          labelFormatter={(value) => `${value}:00`}
                          formatter={(value: any, name) => [
                            name === 'count' ? value : `${value}%`,
                            name === 'count' ? 'Events' : 'Percentage'
                          ]}
                        />
                        <Bar dataKey="count" fill="#8B5CF6" name="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Monthly Growth */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Monthly Growth</CardTitle>
                    <CardDescription>Activity growth rate by month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={timelineData.patterns.monthlyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => value.slice(5)} // Show MM-DD
                        />
                        <YAxis tick={{ fontSize: 12 }} />
                        <RechartsTooltip 
                          labelFormatter={(value) => `Month: ${value}`}
                          formatter={(value: any, name) => [
                            name === 'growthRate' ? `${value}%` : value,
                            name === 'growthRate' ? 'Growth Rate' : 'Events'
                          ]}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#06B6D4" 
                          strokeWidth={2}
                          name="count"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="growthRate" 
                          stroke="#EC4899" 
                          strokeWidth={2}
                          name="growthRate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Heatmap View */}
            <TabsContent value="heatmap" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity Heatmap</CardTitle>
                  <CardDescription>
                    Visual representation of daily activity intensity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-xs text-center font-medium p-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {timelineData.heatmap.map((day, index) => {
                      const dayOfWeek = new Date(day.date).getDay()
                      const shouldShow = index === 0 || dayOfWeek === 0 || index % 7 === 0
                      
                      return (
                        <Tooltip key={day.date}>
                          <TooltipTrigger>
                            <div
                              className="w-4 h-4 rounded-sm border border-gray-200 cursor-pointer hover:border-gray-400 transition-colors"
                              style={{ 
                                backgroundColor: HEATMAP_COLORS[day.level]
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div className="font-medium">
                                {new Date(day.date).toLocaleDateString()}
                              </div>
                              <div>{day.events} events</div>
                              <div>Intensity: {day.value}/10</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>Less active</span>
                    <div className="flex gap-1">
                      {HEATMAP_COLORS.map((color, index) => (
                        <div
                          key={index}
                          className="w-3 h-3 rounded-sm border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span>More active</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Milestones View */}
            <TabsContent value="milestones" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Major Milestones</CardTitle>
                  <CardDescription>
                    Key achievements and important moments in your fishing journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timelineData.milestones.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No milestones found for the selected period
                      </div>
                    ) : (
                      timelineData.milestones.map((milestone, index) => (
                        <motion.div
                          key={milestone.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start space-x-4 p-4 rounded-lg border bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20"
                        >
                          <div className="flex-shrink-0">
                            {milestone.importance === 'high' ? (
                              <Crown className="w-8 h-8 text-yellow-600" />
                            ) : milestone.importance === 'medium' ? (
                              <Award className="w-8 h-8 text-blue-600" />
                            ) : (
                              <Star className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-lg">{milestone.title}</h4>
                              <span className="text-sm text-muted-foreground">
                                {milestone.date.toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-1">
                              {milestone.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="secondary" className="capitalize">
                                {milestone.type.replace('_', ' ')}
                              </Badge>
                              <Badge 
                                variant={milestone.importance === 'high' ? 'default' : 'outline'}
                                className="capitalize"
                              >
                                {milestone.importance} Impact
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No timeline data available</p>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
