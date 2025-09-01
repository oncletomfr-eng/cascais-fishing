/**
 * Analytics Dashboard Test Page - Testing interface for enhanced profile statistics
 * Part of Task 13.1: Profile Statistics Overview
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  BarChart3, Users, TrendingUp, Eye, Settings,
  Sparkles, Trophy, Target, RefreshCw, Star
} from 'lucide-react'
import ProfileStatisticsOverview from '@/components/analytics/ProfileStatisticsOverview'
import BookingPerformanceAnalytics from '@/components/analytics/BookingPerformanceAnalytics'
import ReviewAnalytics from '@/components/analytics/ReviewAnalytics'
import { ProfileAnalyticsDashboard } from '@/components/profiles/ProfileAnalyticsDashboard'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface DemoSettings {
  showComparisons: boolean
  showPredictions: boolean
  autoRefresh: boolean
  showBookingProjections: boolean
  includeSentiment: boolean
  includeImpact: boolean
  userId?: string
}

export default function AnalyticsDashboardTestPage() {
  const { data: session } = useSession()
  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
    showComparisons: true,
    showPredictions: false,
    autoRefresh: false,
    showBookingProjections: true,
    includeSentiment: true,
    includeImpact: true,
    userId: session?.user?.id
  })

  const updateSetting = (key: keyof DemoSettings, value: boolean) => {
    setDemoSettings(prev => ({ ...prev, [key]: value }))
    toast.info(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`)
  }

  const testFeatures = [
    {
      title: "Enhanced Statistics Cards",
      description: "Comprehensive user profile metrics with completion rates, activity levels, and performance indicators",
      status: "✅ Implemented",
      color: "text-green-600"
    },
    {
      title: "Visual Progress Bars", 
      description: "Interactive progress indicators for rating, reliability, completion rates, and activity levels",
      status: "✅ Implemented",
      color: "text-green-600"
    },
    {
      title: "Platform Comparisons",
      description: "Compare user metrics against platform averages with trend indicators and percentage differences",
      status: "✅ Implemented",
      color: "text-green-600"
    },
    {
      title: "Booking Performance Analytics",
      description: "Comprehensive booking funnel analysis with conversion rates, cancellation patterns, and seasonal trends",
      status: "✅ Task 13.2 Complete",
      color: "text-green-600"
    },
    {
      title: "Review & Rating Analytics",
      description: "Advanced sentiment analysis, rating distributions, quality scores, improvement insights, and impact analysis",
      status: "✅ Task 13.3 Complete",
      color: "text-green-600"
    },
    {
      title: "Performance Indicators",
      description: "Smart categorization of performance levels (Excellent, Good, Average, Needs Attention)",
      status: "✅ Implemented",
      color: "text-green-600"
    },
    {
      title: "Real-time Updates",
      description: "Live data refresh with loading states, error handling, and optional auto-refresh",
      status: "✅ Implemented",
      color: "text-green-600"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-4">
              <BarChart3 className="w-10 h-10 text-blue-500" />
              Analytics Dashboard Demo
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive analytics suite with profile statistics, booking performance analysis, 
              review sentiment analysis, quality scoring, improvement insights, and predictive analytics.
            </p>
          </motion.div>
        </div>

        {/* Quick stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {[
            { label: 'Analytics Components', value: '3', icon: BarChart3, color: 'text-blue-600' },
            { label: 'Chart Types', value: '12+', icon: Target, color: 'text-green-600' },
            { label: 'Analytics Features', value: '20+', icon: TrendingUp, color: 'text-purple-600' },
            { label: 'Insight Categories', value: '7', icon: Trophy, color: 'text-yellow-600' }
          ].map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>

        {/* Main content */}
        <Tabs defaultValue="enhanced" className="space-y-6">
          <TabsList className="grid w-full max-w-5xl mx-auto grid-cols-6">
            <TabsTrigger value="enhanced" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Booking
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Review
            </TabsTrigger>
            <TabsTrigger value="original" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Original
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Enhanced Analytics Tab */}
          <TabsContent value="enhanced">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Enhanced Profile Statistics</h2>
                <p className="text-muted-foreground mb-4">
                  Task 13.1 implementation with comprehensive user statistics, performance indicators, 
                  and platform comparisons.
                </p>
                
                {/* Settings toggles */}
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="comparisons"
                      checked={demoSettings.showComparisons}
                      onCheckedChange={(checked) => updateSetting('showComparisons', checked)}
                    />
                    <label htmlFor="comparisons" className="text-sm font-medium">
                      Platform Comparisons
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="predictions"
                      checked={demoSettings.showPredictions}
                      onCheckedChange={(checked) => updateSetting('showPredictions', checked)}
                    />
                    <label htmlFor="predictions" className="text-sm font-medium">
                      Predictions & Recommendations
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="autoRefresh"
                      checked={demoSettings.autoRefresh}
                      onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                    />
                    <label htmlFor="autoRefresh" className="text-sm font-medium">
                      Auto Refresh (30s)
                    </label>
                  </div>
                </div>
              </div>

              <ProfileStatisticsOverview 
                userId={demoSettings.userId}
                showComparisons={demoSettings.showComparisons}
                showPredictions={demoSettings.showPredictions}
                autoRefresh={demoSettings.autoRefresh}
              />
            </motion.div>
          </TabsContent>

          {/* Booking Performance Tab */}
          <TabsContent value="booking">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Booking Performance Analytics</h2>
                <p className="text-muted-foreground mb-4">
                  Task 13.2 implementation with comprehensive booking funnel analysis, conversion rates, 
                  cancellation patterns, and seasonal trends.
                </p>
                
                {/* Settings toggles */}
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="bookingProjections"
                      checked={demoSettings.showBookingProjections}
                      onCheckedChange={(checked) => updateSetting('showBookingProjections', checked)}
                    />
                    <label htmlFor="bookingProjections" className="text-sm font-medium">
                      Show Projections
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="bookingAutoRefresh"
                      checked={demoSettings.autoRefresh}
                      onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                    />
                    <label htmlFor="bookingAutoRefresh" className="text-sm font-medium">
                      Auto Refresh (1min)
                    </label>
                  </div>
                </div>
              </div>

              <BookingPerformanceAnalytics 
                userId={demoSettings.userId}
                period="month"
                showProjections={demoSettings.showBookingProjections}
                autoRefresh={demoSettings.autoRefresh}
              />
            </motion.div>
          </TabsContent>

          {/* Review Analytics Tab */}
          <TabsContent value="review">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Review & Rating Analytics</h2>
                <p className="text-muted-foreground mb-4">
                  Task 13.3 implementation with comprehensive review sentiment analysis, rating distributions, 
                  quality scores, improvement insights, and impact on bookings.
                </p>
                
                {/* Settings toggles */}
                <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="reviewSentiment"
                      checked={demoSettings.includeSentiment}
                      onCheckedChange={(checked) => updateSetting('includeSentiment', checked)}
                    />
                    <label htmlFor="reviewSentiment" className="text-sm font-medium">
                      Sentiment Analysis
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="reviewImpact"
                      checked={demoSettings.includeImpact}
                      onCheckedChange={(checked) => updateSetting('includeImpact', checked)}
                    />
                    <label htmlFor="reviewImpact" className="text-sm font-medium">
                      Impact Analysis
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="reviewAutoRefresh"
                      checked={demoSettings.autoRefresh}
                      onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                    />
                    <label htmlFor="reviewAutoRefresh" className="text-sm font-medium">
                      Auto Refresh (1min)
                    </label>
                  </div>
                </div>
              </div>

              <ReviewAnalytics 
                userId={demoSettings.userId}
                period="month"
                includeSentiment={demoSettings.includeSentiment}
                includeImpact={demoSettings.includeImpact}
                autoRefresh={demoSettings.autoRefresh}
              />
            </motion.div>
          </TabsContent>

          {/* Original Dashboard Tab */}
          <TabsContent value="original">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Original Profile Analytics</h2>
                <p className="text-muted-foreground">
                  Existing ProfileAnalyticsDashboard component for comparison.
                </p>
              </div>

              <ProfileAnalyticsDashboard userId={demoSettings.userId} />
            </motion.div>
          </TabsContent>

          {/* Features Overview Tab */}
          <TabsContent value="features">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Task 13.1 Features</h2>
                <p className="text-muted-foreground">
                  Comprehensive overview of implemented analytics features.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {testFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{feature.title}</CardTitle>
                          <Badge variant="outline" className={feature.color}>
                            {feature.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">{feature.description}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Implementation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Implementation Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">✅ Completed Features</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• Comprehensive profile statistics with completion rates</li>
                        <li>• Visual progress bars for all key metrics</li>
                        <li>• Platform comparison with trend indicators</li>
                        <li>• Performance level categorization system</li>
                        <li>• Responsive grid layout with animations</li>
                        <li>• Real-time data refresh capabilities</li>
                        <li>• Advanced API integration with /api/profiles/analytics</li>
                        <li>• Error handling and loading states</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">🎯 Key Metrics</h4>
                      <ul className="space-y-2 text-sm">
                        <li>• <strong>Booking Completion Rate:</strong> Shows % of completed vs total trips</li>
                        <li>• <strong>Approval Success Rate:</strong> Application approval percentage</li>
                        <li>• <strong>Review Engagement:</strong> Reviews given vs trips taken</li>
                        <li>• <strong>Activity Level:</strong> Overall booking activity assessment</li>
                        <li>• <strong>Platform Comparisons:</strong> User vs average performance</li>
                        <li>• <strong>Performance Indicators:</strong> Excellence → Needs Attention</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" />
                    Demo Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-4">Feature Toggles</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Platform Comparisons</label>
                          <p className="text-xs text-muted-foreground">
                            Compare user metrics against platform averages
                          </p>
                        </div>
                        <Switch 
                          checked={demoSettings.showComparisons}
                          onCheckedChange={(checked) => updateSetting('showComparisons', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Predictions & Recommendations</label>
                          <p className="text-xs text-muted-foreground">
                            Show AI-powered predictions and suggested actions
                          </p>
                        </div>
                        <Switch 
                          checked={demoSettings.showPredictions}
                          onCheckedChange={(checked) => updateSetting('showPredictions', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Auto Refresh</label>
                          <p className="text-xs text-muted-foreground">
                            Automatically refresh data every 30 seconds
                          </p>
                        </div>
                        <Switch 
                          checked={demoSettings.autoRefresh}
                          onCheckedChange={(checked) => updateSetting('autoRefresh', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Booking Projections</label>
                          <p className="text-xs text-muted-foreground">
                            Show AI-powered booking forecasts and trends
                          </p>
                        </div>
                        <Switch 
                          checked={demoSettings.showBookingProjections}
                          onCheckedChange={(checked) => updateSetting('showBookingProjections', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Sentiment Analysis</label>
                          <p className="text-xs text-muted-foreground">
                            Analyze review emotions and keywords
                          </p>
                        </div>
                        <Switch 
                          checked={demoSettings.includeSentiment}
                          onCheckedChange={(checked) => updateSetting('includeSentiment', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-sm font-medium">Review Impact Analysis</label>
                          <p className="text-xs text-muted-foreground">
                            Analyze how reviews affect future bookings
                          </p>
                        </div>
                        <Switch 
                          checked={demoSettings.includeImpact}
                          onCheckedChange={(checked) => updateSetting('includeImpact', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">API Configuration</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current User ID:</span>
                        <code className="bg-muted px-2 py-1 rounded">
                          {session?.user?.id || 'Not logged in'}
                        </code>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>API Endpoint:</span>
                        <code className="bg-muted px-2 py-1 rounded">
                          /api/profiles/analytics
                        </code>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Session Status:</span>
                        <Badge variant={session ? "default" : "destructive"}>
                          {session ? "Authenticated" : "Not authenticated"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">🚀 Analytics Dashboard Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Task 13.1: Profile Statistics Overview - ✅ Complete</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-4">
                        Comprehensive statistics, performance indicators, platform comparisons, and responsive layout.
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Task 13.2: Booking Performance Analytics - ✅ Complete</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-4">
                        Booking funnel analysis, conversion rates, cancellation patterns, seasonal trends, 
                        value analytics, and predictive insights.
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Task 13.3: Review & Rating Analytics - ✅ Complete</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-4">
                        Sentiment analysis, rating distributions, quality scores, improvement insights,
                        response metrics, and impact analysis on bookings.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
