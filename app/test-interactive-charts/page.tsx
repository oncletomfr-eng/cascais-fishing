/**
 * Interactive Charts Demo Page
 * Task 14: Interactive Chart Components - Demo and Testing Interface
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  BarChart3, PieChart, LineChart, Grid3X3, 
  Settings, RefreshCw, Download, Palette,
  TrendingUp, Activity, Target, Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

import {
  InteractiveLineChart,
  InteractivePieChart,
  InteractiveBarChart,
  InteractiveHeatMap,
  BOOKING_TREND_CONFIG,
  SPECIES_BREAKDOWN_CONFIG,
  TIME_SLOT_COMPARISON_CONFIG,
  SEASONAL_ACTIVITY_CONFIG,
  CHART_COLORS
} from '@/components/charts'

interface DemoSettings {
  showAnimations: boolean
  enableExport: boolean
  showTooltips: boolean
  showLegends: boolean
  darkMode: boolean
  responsiveMode: boolean
}

export default function InteractiveChartsDemo() {
  const [settings, setSettings] = useState<DemoSettings>({
    showAnimations: true,
    enableExport: true,
    showTooltips: true,
    showLegends: true,
    darkMode: false,
    responsiveMode: true
  })

  // Sample data for different chart types
  const sampleData = useMemo(() => ({
    // Line chart data - booking trends over time
    bookingTrends: [
      { name: '2024-01-01', date: '2024-01-01', bookings: 15, revenue: 1425, cancellations: 2 },
      { name: '2024-01-02', date: '2024-01-02', bookings: 22, revenue: 2090, cancellations: 1 },
      { name: '2024-01-03', date: '2024-01-03', bookings: 18, revenue: 1710, cancellations: 3 },
      { name: '2024-01-04', date: '2024-01-04', bookings: 28, revenue: 2660, cancellations: 2 },
      { name: '2024-01-05', date: '2024-01-05', bookings: 35, revenue: 3325, cancellations: 1 },
      { name: '2024-01-06', date: '2024-01-06', bookings: 42, revenue: 3990, cancellations: 4 },
      { name: '2024-01-07', date: '2024-01-07', bookings: 38, revenue: 3610, cancellations: 2 },
      { name: '2024-01-08', date: '2024-01-08', bookings: 45, revenue: 4275, cancellations: 3 },
      { name: '2024-01-09', date: '2024-01-09', bookings: 52, revenue: 4940, cancellations: 1 },
      { name: '2024-01-10', date: '2024-01-10', bookings: 48, revenue: 4560, cancellations: 5 },
      { name: '2024-01-11', date: '2024-01-11', bookings: 55, revenue: 5225, cancellations: 2 },
      { name: '2024-01-12', date: '2024-01-12', bookings: 61, revenue: 5795, cancellations: 3 },
      { name: '2024-01-13', date: '2024-01-13', bookings: 58, revenue: 5510, cancellations: 4 },
      { name: '2024-01-14', date: '2024-01-14', bookings: 65, revenue: 6175, cancellations: 2 }
    ],

    // Pie chart data - species breakdown
    speciesBreakdown: [
      { name: 'Sea Bass', value: 145, percentage: 32.1 },
      { name: 'Dorado', value: 98, percentage: 21.7 },
      { name: 'Mackerel', value: 87, percentage: 19.3 },
      { name: 'Tuna', value: 65, percentage: 14.4 },
      { name: 'Sardine', value: 35, percentage: 7.8 },
      { name: 'Other', value: 21, percentage: 4.7 }
    ],

    // Bar chart data - time slot preferences
    timeSlotPreferences: [
      { name: 'Early Morning (6AM)', slot: 'Early Morning (6AM)', bookings: 45, satisfaction: 4.8, revenue: 4275 },
      { name: 'Morning (9AM)', slot: 'Morning (9AM)', bookings: 78, satisfaction: 4.6, revenue: 7410 },
      { name: 'Late Morning (11AM)', slot: 'Late Morning (11AM)', bookings: 92, satisfaction: 4.7, revenue: 8740 },
      { name: 'Afternoon (2PM)', slot: 'Afternoon (2PM)', bookings: 156, satisfaction: 4.9, revenue: 14820 },
      { name: 'Late Afternoon (4PM)', slot: 'Late Afternoon (4PM)', bookings: 134, satisfaction: 4.5, revenue: 12730 },
      { name: 'Evening (6PM)', slot: 'Evening (6PM)', bookings: 87, satisfaction: 4.4, revenue: 8265 },
      { name: 'Sunset (7PM)', slot: 'Sunset (7PM)', bookings: 98, satisfaction: 4.9, revenue: 9310 }
    ],

    // Heat map data - seasonal activity patterns
    seasonalActivity: [
      [12, 15, 18, 22, 28, 35, 42, 38, 32, 28, 20, 15], // January
      [18, 22, 25, 30, 35, 42, 48, 45, 38, 32, 25, 20], // February
      [25, 30, 35, 42, 48, 55, 62, 58, 52, 45, 35, 28], // March
      [35, 42, 48, 55, 62, 68, 75, 72, 65, 58, 48, 38], // April
      [48, 55, 62, 68, 75, 82, 88, 85, 78, 72, 62, 52], // May
      [62, 68, 75, 82, 88, 95, 102, 98, 92, 85, 75, 65], // June
      [75, 82, 88, 95, 102, 108, 115, 112, 105, 98, 88, 78], // July
      [82, 88, 95, 102, 108, 115, 122, 118, 112, 105, 95, 85], // August
      [68, 75, 82, 88, 95, 102, 108, 105, 98, 92, 82, 72], // September
      [55, 62, 68, 75, 82, 88, 95, 92, 85, 78, 68, 58], // October
      [42, 48, 55, 62, 68, 75, 82, 78, 72, 65, 55, 45], // November
      [28, 35, 42, 48, 55, 62, 68, 65, 58, 52, 42, 32]  // December
    ]
  }), [])

  const heatMapLabels = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    times: ['6AM', '7AM', '8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM']
  }

  const updateSetting = (key: keyof DemoSettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    toast.info(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value ? 'enabled' : 'disabled'}`)
  }

  const chartExportConfig = settings.enableExport ? {
    formats: ['png', 'svg', 'jpg'] as ('png' | 'svg' | 'jpg')[]
  } : undefined

  const commonChartProps = {
    loading: false,
    error: null,
    export: chartExportConfig,
    accessibility: {
      focusable: true,
      tabIndex: 0
    },
    animation: settings.showAnimations ? { duration: 500, easing: 'ease-in-out' as const } : { duration: 0 }
  }

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
              Interactive Charts Library
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive library of interactive chart components with line charts for trends, 
              pie charts for breakdowns, bar charts for comparisons, and heat maps for patterns.
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
            { label: 'Chart Types', value: '4', icon: BarChart3, color: 'text-blue-600' },
            { label: 'Interactive Features', value: '15+', icon: Target, color: 'text-green-600' },
            { label: 'Export Formats', value: '3', icon: Download, color: 'text-purple-600' },
            { label: 'Accessibility', value: '100%', icon: Sparkles, color: 'text-yellow-600' }
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

        {/* Settings Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Demo Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(settings).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => updateSetting(key as keyof DemoSettings, checked)}
                  />
                  <Label htmlFor={key} className="text-sm capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chart Demonstrations */}
        <Tabs defaultValue="line" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
            <TabsTrigger value="line" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Line Charts
            </TabsTrigger>
            <TabsTrigger value="pie" className="flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Pie Charts
            </TabsTrigger>
            <TabsTrigger value="bar" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Bar Charts
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Heat Maps
            </TabsTrigger>
          </TabsList>

          {/* Line Charts Tab */}
          <TabsContent value="line" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Interactive Line Charts</h2>
                <p className="text-muted-foreground mb-4">
                  Perfect for showing trends over time with booking data, revenue tracking, and cancellation patterns.
                  Features include moving averages, zoom controls, and predictive analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic line chart */}
                <InteractiveLineChart
                  data={sampleData.bookingTrends}
                  config={{
                    ...BOOKING_TREND_CONFIG,
                    showTooltip: settings.showTooltips,
                    showLegend: settings.showLegends,
                    colors: CHART_COLORS.primary.slice(0, 1)
                  }}
                  title="Daily Bookings Trend"
                  description="Track booking patterns and identify growth opportunities"
                  xAxisKey="date"
                  yAxisKeys={['bookings']}
                  showBrush={true}
                  showZoom={true}
                  {...commonChartProps}
                />

                {/* Multi-series line chart */}
                <InteractiveLineChart
                  data={sampleData.bookingTrends}
                  config={{
                    ...BOOKING_TREND_CONFIG,
                    showTooltip: settings.showTooltips,
                    showLegend: settings.showLegends,
                    area: true
                  }}
                  title="Revenue vs Cancellations"
                  description="Compare revenue trends with cancellation patterns"
                  xAxisKey="date"
                  yAxisKeys={['revenue', 'cancellations']}
                  predictive={true}
                  {...commonChartProps}
                />
              </div>
            </motion.div>
          </TabsContent>

          {/* Pie Charts Tab */}
          <TabsContent value="pie" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Interactive Pie Charts</h2>
                <p className="text-muted-foreground mb-4">
                  Ideal for showing proportional data like species distributions, technique preferences, 
                  and market share analysis. Features segment highlighting, sorting, and detailed breakdowns.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic pie chart */}
                <InteractivePieChart
                  data={sampleData.speciesBreakdown}
                  config={{
                    ...SPECIES_BREAKDOWN_CONFIG,
                    showTooltip: settings.showTooltips,
                    showLegend: settings.showLegends
                  }}
                  title="Fish Species Distribution"
                  description="Most popular fish species caught by our guests"
                  showPercentage={true}
                  {...commonChartProps}
                />

                {/* Donut chart variant */}
                <InteractivePieChart
                  data={sampleData.speciesBreakdown.slice(0, 4)} // Top 4 species
                  config={{
                    ...SPECIES_BREAKDOWN_CONFIG,
                    innerRadius: 60,
                    showTooltip: settings.showTooltips,
                    showLegend: settings.showLegends,
                    colors: CHART_COLORS.secondary
                  }}
                  title="Top 4 Species (Donut)"
                  description="Donut chart variation showing top species only"
                  showPercentage={true}
                  {...commonChartProps}
                />
              </div>
            </motion.div>
          </TabsContent>

          {/* Bar Charts Tab */}
          <TabsContent value="bar" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Interactive Bar Charts</h2>
                <p className="text-muted-foreground mb-4">
                  Perfect for comparing categories like time slot preferences, satisfaction ratings, 
                  and revenue comparisons. Supports grouping, stacking, and horizontal/vertical orientations.
                </p>
              </div>

              <div className="space-y-6">
                {/* Single series bar chart */}
                <InteractiveBarChart
                  data={sampleData.timeSlotPreferences}
                  config={{
                    ...TIME_SLOT_COMPARISON_CONFIG,
                    showTooltip: settings.showTooltips,
                    showLegend: settings.showLegends
                  }}
                  title="Time Slot Popularity"
                  description="Booking frequency by time of day"
                  xAxisKey="name"
                  yAxisKeys={['bookings']}
                  {...commonChartProps}
                />

                {/* Multi-series grouped bar chart */}
                <InteractiveBarChart
                  data={sampleData.timeSlotPreferences}
                  config={{
                    ...TIME_SLOT_COMPARISON_CONFIG,
                    showTooltip: settings.showTooltips,
                    showLegend: settings.showLegends,
                    colors: CHART_COLORS.primary.slice(0, 3)
                  }}
                  title="Time Slot Analysis (Grouped)"
                  description="Compare bookings, satisfaction, and revenue by time slot"
                  xAxisKey="name"
                  yAxisKeys={['bookings', 'satisfaction', 'revenue']}
                  grouped={true}
                  {...commonChartProps}
                />
              </div>
            </motion.div>
          </TabsContent>

          {/* Heat Maps Tab */}
          <TabsContent value="heatmap" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Interactive Heat Maps</h2>
                <p className="text-muted-foreground mb-4">
                  Excellent for visualizing patterns in two-dimensional data like seasonal activity, 
                  time-based trends, and correlation matrices. Features cell selection, color scaling, and zoom controls.
                </p>
              </div>

              <InteractiveHeatMap
                data={sampleData.seasonalActivity}
                config={{
                  ...SEASONAL_ACTIVITY_CONFIG,
                  showTooltip: settings.showTooltips
                }}
                title="Seasonal Activity Patterns"
                description="Booking activity intensity by month and time of day"
                xAxisLabels={heatMapLabels.times}
                yAxisLabels={heatMapLabels.months}
                valueFormatter={(value) => `${value} bookings`}
                {...commonChartProps}
              />
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Features Summary */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Chart Library Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">✅ Interactive Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Hover tooltips with detailed information</li>
                  <li>• Click interactions and selections</li>
                  <li>• Zoom and brush controls</li>
                  <li>• Dynamic data filtering</li>
                  <li>• Real-time updates</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">📊 Chart Types</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Line charts (single/multi-series)</li>
                  <li>• Area charts with gradients</li>
                  <li>• Pie and donut charts</li>
                  <li>• Bar charts (grouped/stacked)</li>
                  <li>• Heat maps with color scaling</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-600">🎨 Customization</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Multiple color palettes</li>
                  <li>• Responsive design</li>
                  <li>• Export functionality (PNG/SVG/JPG)</li>
                  <li>• Accessibility support</li>
                  <li>• Animation controls</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
