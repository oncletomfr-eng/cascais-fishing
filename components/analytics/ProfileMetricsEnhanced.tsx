'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import {
  TrendingUp, TrendingDown, Star, Target, Award, Users, Calendar,
  Clock, CheckCircle, AlertCircle, BarChart3, Activity, Trophy,
  Lightbulb, RefreshCw, Eye, ArrowUp, ArrowDown, Minus, Zap,
  Crown, Medal, Flame, Fish, MapPin, MessageSquare, ThumbsUp,
  BookOpen, Compass, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Enhanced interfaces for comprehensive analytics
interface ProfileCompletionMetrics {
  overall: number
  sections: {
    basic: { completed: boolean; weight: number; label: string }
    experience: { completed: boolean; weight: number; label: string }
    specialties: { completed: boolean; weight: number; label: string }
    bio: { completed: boolean; weight: number; label: string }
    location: { completed: boolean; weight: number; label: string }
    preferences: { completed: boolean; weight: number; label: string }
    achievements: { completed: boolean; weight: number; label: string }
  }
  trends: Array<{
    date: string
    completion: number
  }>
}

interface ReliabilityBreakdown {
  overall: number
  factors: {
    tripCompletion: { score: number; weight: number; label: string; impact: string }
    punctuality: { score: number; weight: number; label: string; impact: string }
    communication: { score: number; weight: number; label: string; impact: string }
    preparedness: { score: number; weight: number; label: string; impact: string }
    teamwork: { score: number; weight: number; label: string; impact: string }
  }
  history: Array<{
    date: string
    score: number
    incidents: number
  }>
  recommendations: string[]
}

interface PeerComparison {
  userRank: number
  totalUsers: number
  percentile: number
  similarProfiles: Array<{
    id: string
    name: string
    experience: string
    rating: number
    completedTrips: number
    reliability: number
    isAnonymous: boolean
  }>
  competitiveMetrics: {
    rating: { user: number; peers: number; rank: number }
    trips: { user: number; peers: number; rank: number }  
    reliability: { user: number; peers: number; rank: number }
    achievements: { user: number; peers: number; rank: number }
  }
}

interface HistoricalAnalysis {
  trends: {
    rating: Array<{ date: string; value: number; change: number }>
    activity: Array<{ date: string; bookings: number; completed: number }>
    reliability: Array<{ date: string; score: number; incidents: number }>
    achievements: Array<{ date: string; earned: number; total: number }>
  }
  milestones: Array<{
    date: string
    type: 'rating' | 'trips' | 'achievement' | 'reliability'
    title: string
    description: string
    impact: 'positive' | 'negative' | 'neutral'
  }>
  seasonalPatterns: {
    bestMonths: string[]
    activityPeaks: Array<{ month: string; activity: number }>
    performanceVariation: { min: number; max: number; avg: number }
  }
}

interface SmartRecommendations {
  priority: 'high' | 'medium' | 'low'
  categories: {
    profile: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
    activity: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
    skills: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
    social: Array<{ id: string; title: string; description: string; effort: string; impact: string }>
  }
  personalized: Array<{
    id: string
    title: string
    description: string
    reason: string
    steps: string[]
    timeframe: string
    expectedOutcome: string
  }>
}

interface EnhancedProfileMetrics {
  completion: ProfileCompletionMetrics
  reliability: ReliabilityBreakdown  
  peerComparison: PeerComparison
  historicalAnalysis: HistoricalAnalysis
  recommendations: SmartRecommendations
}

interface ProfileMetricsEnhancedProps {
  userId?: string
  className?: string
}

// Color schemes for charts
const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#10b981', 
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  teal: '#14b8a6'
}

// Utility functions
const getCompletionColor = (percentage: number) => {
  if (percentage >= 90) return 'text-green-600 bg-green-50 border-green-200'
  if (percentage >= 70) return 'text-blue-600 bg-blue-50 border-blue-200'
  if (percentage >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
  return 'text-red-600 bg-red-50 border-red-200'
}

const getReliabilityLevel = (score: number) => {
  if (score >= 95) return { level: 'Exceptional', color: 'text-green-700', icon: Crown }
  if (score >= 85) return { level: 'Excellent', color: 'text-green-600', icon: Medal }
  if (score >= 70) return { level: 'Good', color: 'text-blue-600', icon: Trophy }
  if (score >= 50) return { level: 'Fair', color: 'text-yellow-600', icon: Star }
  return { level: 'Needs Improvement', color: 'text-red-600', icon: AlertCircle }
}

const formatTrend = (change: number) => {
  if (Math.abs(change) < 0.1) return { icon: Minus, color: 'text-gray-500', text: 'No change' }
  if (change > 0) return { icon: TrendingUp, color: 'text-green-600', text: `+${change.toFixed(1)}%` }
  return { icon: TrendingDown, color: 'text-red-600', text: `${change.toFixed(1)}%` }
}

export default function ProfileMetricsEnhanced({
  userId,
  className
}: ProfileMetricsEnhancedProps) {
  const [metrics, setMetrics] = useState<EnhancedProfileMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<string>('3months')
  const [refreshing, setRefreshing] = useState(false)

  // Load enhanced metrics
  const loadMetrics = async (showToast = false) => {
    try {
      setIsLoading(!metrics)
      if (metrics) setRefreshing(true)
      setError(null)

      const params = new URLSearchParams({
        timeframe,
        ...(userId && { userId })
      })

      const response = await fetch(`/api/profiles/enhanced-metrics?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to load enhanced metrics')
      }

      const result = await response.json()
      setMetrics(result.data)
      
    } catch (err) {
      console.error('Error loading enhanced metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
      
      // Mock data for development
      setMetrics(getMockMetrics())
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [userId, timeframe])

  if (isLoading && !metrics) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
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

  if (error || !metrics) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Error Loading Metrics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadMetrics()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Enhanced Profile Metrics
          </h2>
          <p className="text-muted-foreground">
            Advanced analytics, comparisons, and personalized insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMetrics(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="completion" className="space-y-6">
        <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-5">
          <TabsTrigger value="completion" className="gap-1">
            <CheckCircle className="w-4 h-4" />
            Completion
          </TabsTrigger>
          <TabsTrigger value="reliability" className="gap-1">
            <Medal className="w-4 h-4" />
            Reliability
          </TabsTrigger>
          <TabsTrigger value="peers" className="gap-1">
            <Users className="w-4 h-4" />
            Peer Compare
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <Activity className="w-4 h-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-1">
            <Lightbulb className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Profile Completion Tab */}
        <TabsContent value="completion" className="space-y-6">
          <ProfileCompletionAnalysis completion={metrics.completion} />
        </TabsContent>

        {/* Reliability Tab */}
        <TabsContent value="reliability" className="space-y-6">
          <ReliabilityAnalysis reliability={metrics.reliability} />
        </TabsContent>

        {/* Peer Comparison Tab */}
        <TabsContent value="peers" className="space-y-6">
          <PeerComparisonAnalysis comparison={metrics.peerComparison} />
        </TabsContent>

        {/* Historical Analysis Tab */}
        <TabsContent value="history" className="space-y-6">
          <HistoricalAnalysisView analysis={metrics.historicalAnalysis} />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsView recommendations={metrics.recommendations} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Profile Completion Analysis Component
function ProfileCompletionAnalysis({ completion }: { completion: ProfileCompletionMetrics }) {
  const completionColor = getCompletionColor(completion.overall)

  return (
    <div className="space-y-6">
      {/* Overall Completion */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-500" />
                Profile Completion
              </span>
              <Badge className={completionColor}>
                {completion.overall}% Complete
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={completion.overall} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(completion.sections).map(([key, section]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {section.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium">{section.label}</span>
                    </div>
                    <Badge variant={section.completed ? "default" : "secondary"} className="text-xs">
                      {section.weight}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Completion Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Completion Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={completion.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="completion" 
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// Reliability Analysis Component  
function ReliabilityAnalysis({ reliability }: { reliability: ReliabilityBreakdown }) {
  const reliabilityInfo = getReliabilityLevel(reliability.overall)
  const ReliabilityIcon = reliabilityInfo.icon

  return (
    <div className="space-y-6">
      {/* Overall Reliability Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ReliabilityIcon className={`w-5 h-5 ${reliabilityInfo.color}`} />
              Reliability Score
            </span>
            <Badge className={reliabilityInfo.color}>
              {reliabilityInfo.level}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{reliability.overall}%</div>
              <Progress value={reliability.overall} className="h-3" />
            </div>
            
            {/* Factor Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {Object.entries(reliability.factors).map(([key, factor]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{factor.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {factor.score}% (weight: {factor.weight}%)
                    </span>
                  </div>
                  <Progress value={factor.score} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    Impact: {factor.impact}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reliability History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-500" />
            Reliability History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reliability.history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke={CHART_COLORS.primary}
                name="Reliability Score"
              />
              <Line 
                type="monotone" 
                dataKey="incidents" 
                stroke={CHART_COLORS.danger}
                name="Incidents"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {reliability.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Improvement Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reliability.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Sparkles className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Mock data function for development
function getMockMetrics(): EnhancedProfileMetrics {
  return {
    completion: {
      overall: 78,
      sections: {
        basic: { completed: true, weight: 20, label: 'Basic Info' },
        experience: { completed: true, weight: 15, label: 'Experience Level' },
        specialties: { completed: true, weight: 15, label: 'Specialties' },
        bio: { completed: false, weight: 10, label: 'Bio' },
        location: { completed: true, weight: 10, label: 'Location' },
        preferences: { completed: false, weight: 15, label: 'Preferences' },
        achievements: { completed: true, weight: 15, label: 'Achievements' }
      },
      trends: [
        { date: '2024-07', completion: 45 },
        { date: '2024-08', completion: 60 },
        { date: '2024-09', completion: 78 }
      ]
    },
    reliability: {
      overall: 87,
      factors: {
        tripCompletion: { score: 92, weight: 30, label: 'Trip Completion', impact: 'High positive impact' },
        punctuality: { score: 85, weight: 20, label: 'Punctuality', impact: 'Medium positive impact' },
        communication: { score: 90, weight: 20, label: 'Communication', impact: 'High positive impact' },
        preparedness: { score: 80, weight: 15, label: 'Preparedness', impact: 'Medium impact' },
        teamwork: { score: 88, weight: 15, label: 'Teamwork', impact: 'High positive impact' }
      },
      history: [
        { date: '2024-07', score: 85, incidents: 1 },
        { date: '2024-08', score: 86, incidents: 0 },
        { date: '2024-09', score: 87, incidents: 0 }
      ],
      recommendations: [
        'Consider adding equipment preparation checklist',
        'Improve pre-trip communication timing'
      ]
    },
    peerComparison: {
      userRank: 142,
      totalUsers: 1250,
      percentile: 88,
      similarProfiles: [
        { id: '1', name: 'Alex M.', experience: 'INTERMEDIATE', rating: 4.8, completedTrips: 25, reliability: 92, isAnonymous: true },
        { id: '2', name: 'Sarah K.', experience: 'INTERMEDIATE', rating: 4.6, completedTrips: 28, reliability: 89, isAnonymous: true }
      ],
      competitiveMetrics: {
        rating: { user: 4.7, peers: 4.3, rank: 145 },
        trips: { user: 22, peers: 18, rank: 180 },
        reliability: { user: 87, peers: 82, rank: 120 },
        achievements: { user: 15, peers: 12, rank: 95 }
      }
    },
    historicalAnalysis: {
      trends: {
        rating: [
          { date: '2024-07', value: 4.5, change: 0.1 },
          { date: '2024-08', value: 4.6, change: 0.1 },
          { date: '2024-09', value: 4.7, change: 0.1 }
        ],
        activity: [
          { date: '2024-07', bookings: 8, completed: 7 },
          { date: '2024-08', bookings: 10, completed: 9 },
          { date: '2024-09', bookings: 12, completed: 11 }
        ],
        reliability: [
          { date: '2024-07', score: 85, incidents: 1 },
          { date: '2024-08', score: 86, incidents: 0 },
          { date: '2024-09', score: 87, incidents: 0 }
        ],
        achievements: [
          { date: '2024-07', earned: 2, total: 12 },
          { date: '2024-08', earned: 1, total: 13 },
          { date: '2024-09', earned: 2, total: 15 }
        ]
      },
      milestones: [
        {
          date: '2024-08-15',
          type: 'achievement',
          title: 'Expert Angler',
          description: 'Earned Expert Angler badge for consistent performance',
          impact: 'positive'
        }
      ],
      seasonalPatterns: {
        bestMonths: ['July', 'August', 'September'],
        activityPeaks: [
          { month: 'July', activity: 85 },
          { month: 'August', activity: 92 }
        ],
        performanceVariation: { min: 4.3, max: 4.8, avg: 4.6 }
      }
    },
    recommendations: {
      priority: 'medium',
      categories: {
        profile: [
          { id: '1', title: 'Complete Bio', description: 'Add personal bio to increase bookings', effort: 'Low', impact: 'Medium' }
        ],
        activity: [
          { id: '2', title: 'Increase Trip Frequency', description: 'Aim for 2 trips per month', effort: 'Medium', impact: 'High' }
        ],
        skills: [
          { id: '3', title: 'Learn Deep Sea Techniques', description: 'Expand to deep sea fishing', effort: 'High', impact: 'High' }
        ],
        social: [
          { id: '4', title: 'Engage More in Community', description: 'Participate in forum discussions', effort: 'Low', impact: 'Medium' }
        ]
      },
      personalized: [
        {
          id: '1',
          title: 'Optimize Your Summer Performance',
          description: 'Based on your seasonal patterns, summer is your peak season',
          reason: 'Historical data shows 15% better performance in summer months',
          steps: ['Book more summer trips', 'Share summer tips', 'Build summer connections'],
          timeframe: '2-3 months',
          expectedOutcome: 'Potential 0.2 rating increase and 20% more bookings'
        }
      ]
    }
  }
}

// Peer Comparison Component (to be continued...)
function PeerComparisonAnalysis({ comparison }: { comparison: PeerComparison }) {
  return (
    <div className="space-y-6">
      {/* Rank Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Your Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div>
              <div className="text-3xl font-bold">#{comparison.userRank}</div>
              <div className="text-muted-foreground">
                out of {comparison.totalUsers.toLocaleString()} users
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Top {(100 - comparison.percentile)}%
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Similar Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Similar Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {comparison.similarProfiles.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <div className="font-medium">{profile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {profile.experience} • {profile.completedTrips} trips
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{profile.rating}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {profile.reliability}% reliability
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Competitive Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Competitive Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(comparison.competitiveMetrics).map(([key, metric]) => (
              <div key={key} className="space-y-2">
                <h4 className="font-medium capitalize">{key}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>You:</span>
                    <span className="font-bold">{metric.user}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Peer Average:</span>
                    <span>{metric.peers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Your Rank:</span>
                    <Badge variant="outline">#{metric.rank}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Historical Analysis Component
function HistoricalAnalysisView({ analysis }: { analysis: HistoricalAnalysis }) {
  return (
    <div className="space-y-6">
      {/* Performance Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="rating" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="rating">Rating</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="reliability">Reliability</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rating">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analysis.trends.rating}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={CHART_COLORS.primary} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>
            
            <TabsContent value="activity">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analysis.trends.activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill={CHART_COLORS.primary} name="Bookings" />
                  <Bar dataKey="completed" fill={CHART_COLORS.success} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="reliability">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={analysis.trends.reliability}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke={CHART_COLORS.success} />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="achievements">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analysis.trends.achievements}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="total" stroke={CHART_COLORS.purple} fill={CHART_COLORS.purple} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-500" />
            Major Milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.milestones.map((milestone, index) => (
              <div key={index} className="flex items-start gap-4 p-4 rounded-lg border">
                <div className={cn(
                  "w-2 h-2 rounded-full mt-2",
                  milestone.impact === 'positive' ? 'bg-green-500' : 
                  milestone.impact === 'negative' ? 'bg-red-500' : 'bg-gray-500'
                )} />
                <div className="space-y-1">
                  <div className="font-medium">{milestone.title}</div>
                  <div className="text-sm text-muted-foreground">{milestone.description}</div>
                  <div className="text-xs text-muted-foreground">{milestone.date}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Seasonal Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Best Performance Months</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.seasonalPatterns.bestMonths.map((month) => (
                  <Badge key={month} variant="outline">{month}</Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Activity Peaks</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analysis.seasonalPatterns.activityPeaks}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="activity" fill={CHART_COLORS.teal} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Recommendations Component
function RecommendationsView({ recommendations }: { recommendations: SmartRecommendations }) {
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof recommendations.categories>('profile')
  
  return (
    <div className="space-y-6">
      {/* Personalized Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Personalized Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.personalized.map((rec) => (
              <div key={rec.id} className="p-4 rounded-lg border-l-4 border-l-purple-500 bg-purple-50/50">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                  </div>
                  
                  <div className="text-sm">
                    <span className="font-medium">Why: </span>
                    <span className="text-muted-foreground">{rec.reason}</span>
                  </div>
                  
                  <div>
                    <span className="font-medium text-sm">Action Steps:</span>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                      {rec.steps.map((step, index) => (
                        <li key={index}>• {step}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      <span className="font-medium">Timeline:</span> {rec.timeframe}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Expected: {rec.expectedOutcome}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            Improvement Areas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>
            
            {Object.entries(recommendations.categories).map(([category, items]) => (
              <TabsContent key={category} value={category} className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                    <div className="text-right space-x-2">
                      <Badge variant="outline" className="text-xs">
                        {item.effort} effort
                      </Badge>
                      <Badge className="text-xs">
                        {item.impact} impact
                      </Badge>
                    </div>
                  </div>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
