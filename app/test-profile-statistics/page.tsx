'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import ProfileMetricsEnhanced from '@/components/analytics/ProfileMetricsEnhanced'
import { Loader2, RefreshCw, TrendingUp, Users, Award } from 'lucide-react'

// Enhanced Profile Statistics Demo Page
// Part of Task 15: Profile Statistics & Metrics

interface EnhancedMetrics {
  completion: {
    overall: number
    sections: Record<string, { completed: boolean; weight: number; label: string }>
    trends: Array<{ date: string; completion: number }>
  }
  reliability: {
    overall: number
    factors: Record<string, { score: number; weight: number; label: string; impact: string }>
    history: Array<{ date: string; score: number; incidents: number }>
    recommendations: string[]
  }
  peerComparison: {
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
  historicalAnalysis: {
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
  recommendations: {
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
}

interface DebugInfo {
  userId: string
  timeframe: string
  lastUpdated: Date | null
  apiResponseTime: number | null
  dataPoints: number
}

export default function TestProfileStatisticsPage() {
  const [metrics, setMetrics] = useState<EnhancedMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [timeframe, setTimeframe] = useState('3months')
  const [selectedTab, setSelectedTab] = useState('overview')
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    userId: 'demo-user-123',
    timeframe: '3months',
    lastUpdated: null,
    apiResponseTime: null,
    dataPoints: 0
  })

  const loadMetrics = async () => {
    setLoading(true)
    const startTime = Date.now()
    
    try {
      const response = await fetch(`/api/profiles/enhanced-metrics?timeframe=${timeframe}`)
      const result = await response.json()
      
      if (result.success) {
        setMetrics(result.data)
        setDebugInfo(prev => ({
          ...prev,
          lastUpdated: new Date(),
          apiResponseTime: Date.now() - startTime,
          dataPoints: calculateDataPoints(result.data),
          timeframe
        }))
        toast({ title: '✅ Profile metrics loaded successfully' })
      } else {
        throw new Error(result.error || 'Failed to load metrics')
      }
    } catch (error) {
      console.error('Failed to load profile metrics:', error)
      toast({ 
        title: '❌ Failed to load metrics', 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateDataPoints = (data: EnhancedMetrics): number => {
    return (
      data.completion.trends.length +
      data.reliability.history.length +
      data.historicalAnalysis.trends.rating.length +
      data.historicalAnalysis.trends.activity.length +
      data.historicalAnalysis.milestones.length
    )
  }

  useEffect(() => {
    loadMetrics()
  }, [timeframe])

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe)
    toast({ title: `🔄 Switching to ${newTimeframe} view` })
  }

  const simulateUserAction = (action: string) => {
    toast({ title: `🎯 Simulating: ${action}` })
    // In a real app, this would trigger actual data changes
    setTimeout(() => {
      loadMetrics()
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2 text-4xl font-bold text-blue-600">
            <TrendingUp className="h-10 w-10" />
            <span>Profile Statistics & Metrics</span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Task 15 Demo: Comprehensive profile analytics with completion tracking, 
            reliability scoring, peer comparison, and intelligent recommendations
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Task 15: Profile Statistics & Metrics
            </Badge>
            <Badge variant="outline">Enhanced Analytics</Badge>
            <Badge variant="outline">Real-time Metrics</Badge>
          </div>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Profile Analytics Controls</span>
            </CardTitle>
            <CardDescription>
              Configure timeframe and simulate user actions to test the enhanced metrics system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Timeframe:</span>
                <Select value={timeframe} onValueChange={handleTimeframeChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => loadMetrics()}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Refresh Data
                </Button>
                <Button
                  onClick={() => simulateUserAction('Profile Update')}
                  variant="outline"
                  size="sm"
                >
                  Simulate Profile Update
                </Button>
                <Button
                  onClick={() => simulateUserAction('Trip Completion')}
                  variant="outline"
                  size="sm"
                >
                  Simulate Trip Completion
                </Button>
                <Button
                  onClick={() => simulateUserAction('Achievement Earned')}
                  variant="outline"
                  size="sm"
                >
                  <Award className="h-4 w-4 mr-1" />
                  Simulate Achievement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Enhanced Metrics Overview</TabsTrigger>
            <TabsTrigger value="debug">Debug Information</TabsTrigger>
            <TabsTrigger value="features">Feature Showcase</TabsTrigger>
          </TabsList>

          {/* Enhanced Metrics Overview */}
          <TabsContent value="overview" className="space-y-6">
            {metrics ? (
              <ProfileMetricsEnhanced
                userId={debugInfo.userId}
                timeframe={timeframe}
                data={metrics}
              />
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
                  <p className="text-lg font-medium">Loading Enhanced Profile Metrics...</p>
                  <p className="text-muted-foreground">
                    Gathering completion rates, reliability scores, peer comparisons, and personalized recommendations
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Debug Information */}
          <TabsContent value="debug" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>API Debug Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="font-medium">User ID:</span>
                      <code className="text-sm bg-slate-100 px-2 py-1 rounded">{debugInfo.userId}</code>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Timeframe:</span>
                      <Badge>{debugInfo.timeframe}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Last Updated:</span>
                      <span className="text-sm text-muted-foreground">
                        {debugInfo.lastUpdated ? debugInfo.lastUpdated.toLocaleTimeString() : 'Not loaded'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">API Response Time:</span>
                      <span className="text-sm">
                        {debugInfo.apiResponseTime ? `${debugInfo.apiResponseTime}ms` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Data Points:</span>
                      <Badge variant="secondary">{debugInfo.dataPoints}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Metrics Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics ? (
                    <div className="grid gap-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Profile Completion:</span>
                        <Badge variant={metrics.completion.overall >= 80 ? 'default' : 'secondary'}>
                          {metrics.completion.overall}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Reliability Score:</span>
                        <Badge variant={metrics.reliability.overall >= 85 ? 'default' : 'secondary'}>
                          {metrics.reliability.overall}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Peer Percentile:</span>
                        <Badge>{metrics.peerComparison.percentile}th</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Recommendations:</span>
                        <Badge variant="outline">
                          {Object.values(metrics.recommendations.categories).reduce((acc, cat) => acc + cat.length, 0)} items
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Historical Milestones:</span>
                        <Badge variant="outline">{metrics.historicalAnalysis.milestones.length} achieved</Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Load metrics to see summary</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Raw Data Preview */}
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Raw Data Preview</CardTitle>
                  <CardDescription>First few entries from each data category</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-slate-50 p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify({
                      completion: {
                        overall: metrics.completion.overall,
                        trends: metrics.completion.trends.slice(0, 3),
                      },
                      reliability: {
                        overall: metrics.reliability.overall,
                        topFactor: Object.entries(metrics.reliability.factors)[0]
                      },
                      peerComparison: {
                        rank: metrics.peerComparison.userRank,
                        totalUsers: metrics.peerComparison.totalUsers,
                        sampleProfile: metrics.peerComparison.similarProfiles[0]
                      },
                      recommendations: {
                        priority: metrics.recommendations.priority,
                        samplePersonalized: metrics.recommendations.personalized[0]?.title
                      }
                    }, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Feature Showcase */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Completion Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Real-time completion percentage</li>
                    <li>• Section-by-section breakdown</li>
                    <li>• Historical completion trends</li>
                    <li>• Weight-based scoring system</li>
                    <li>• Progress visualization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Reliability Scoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Multi-factor reliability analysis</li>
                    <li>• Trip completion tracking</li>
                    <li>• Punctuality and communication metrics</li>
                    <li>• Historical reliability trends</li>
                    <li>• Improvement recommendations</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Peer Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Ranking among similar profiles</li>
                    <li>• Percentile positioning</li>
                    <li>• Anonymous peer profiles</li>
                    <li>• Competitive metrics analysis</li>
                    <li>• Performance benchmarking</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historical Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Multi-dimensional trend analysis</li>
                    <li>• Milestone tracking and celebration</li>
                    <li>• Seasonal pattern recognition</li>
                    <li>• Performance variation insights</li>
                    <li>• Long-term progress visualization</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Smart Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• AI-powered improvement suggestions</li>
                    <li>• Categorized recommendation system</li>
                    <li>• Effort/impact analysis</li>
                    <li>• Personalized action plans</li>
                    <li>• Expected outcome predictions</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Real-time Updates</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li>• Live metric recalculation</li>
                    <li>• Instant feedback on changes</li>
                    <li>• Dynamic recommendation updates</li>
                    <li>• Responsive data visualization</li>
                    <li>• Optimized API performance</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-8">
          <p>
            Profile Statistics & Metrics Demo | Task 15 Complete | 
            Enhanced analytics with completion tracking, reliability scoring, peer comparison, and AI recommendations
          </p>
        </div>
      </div>
    </div>
  )
}
