/**
 * Earnings Trend Visualizations Component
 * Task 6.2: Earnings Trend Visualizations
 * 
 * Interactive charts for monthly/weekly earnings trends using Recharts library
 * Features line charts, bar charts, area charts with date range picker and zoom functionality
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Brush, ReferenceLine, ReferenceArea, ZoomableMap
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar as CalendarIcon,
  ZoomIn,
  ZoomOut,
  Download,
  RefreshCw,
  BarChart3,
  LineChart as LineChartIcon,
  AreaChart as AreaChartIcon,
  Filter,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Percent,
  Users,
  Target,
  Eye,
  EyeOff,
  Settings2,
  Maximize2,
  TrendingUp as TrendUpIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

// Types for earnings data
interface EarningsDataPoint {
  date: string;
  timestamp: Date;
  totalEarnings: number;
  commissionEarnings: number;
  directBookings: number;
  recurringRevenue: number;
  refunds: number;
  netEarnings: number;
  bookingsCount: number;
  averageBookingValue: number;
}

interface MonthlyComparison {
  month: string;
  currentYear: number;
  previousYear: number;
  growth: number;
  bookings: number;
  avgBookingValue: number;
}

interface RevenueStream {
  date: string;
  commissions: number;
  directPayments: number;
  subscriptions: number;
  other: number;
}

interface EarningsTrendChartsProps {
  data: EarningsDataPoint[];
  monthlyData: MonthlyComparison[];
  revenueStreams: RevenueStream[];
  loading?: boolean;
  onDateRangeChange?: (start: Date, end: Date) => void;
  onRefresh?: () => void;
  onExport?: (format: 'png' | 'svg' | 'pdf', chartType: string) => void;
  className?: string;
}

const defaultDateRange = {
  start: subMonths(new Date(), 6),
  end: new Date()
};

// Color schemes
const chartColors = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  orange: '#F97316'
};

const revenueStreamColors = {
  commissions: chartColors.primary,
  directPayments: chartColors.secondary,
  subscriptions: chartColors.purple,
  other: chartColors.accent
};

export function EarningsTrendCharts({
  data,
  monthlyData,
  revenueStreams,
  loading = false,
  onDateRangeChange,
  onRefresh,
  onExport,
  className = ''
}: EarningsTrendChartsProps) {
  // State management
  const [activeTab, setActiveTab] = useState('trends');
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState({
    totalEarnings: true,
    commissionEarnings: true,
    directBookings: true,
    recurringRevenue: false,
    netEarnings: false
  });
  const [comparisonPeriod, setComparisonPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filtered data based on date range
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  }, [data, dateRange]);

  // Chart configuration
  const chartConfig = {
    colors: [
      chartColors.primary,
      chartColors.secondary,
      chartColors.accent,
      chartColors.purple,
      chartColors.pink
    ],
    strokeWidth: 2,
    dot: false,
    animate: true,
    grid: showGrid
  };

  // Handle date range changes
  const handleDateRangeChange = useCallback((start: Date, end: Date) => {
    setDateRange({ start, end });
    onDateRangeChange?.(start, end);
  }, [onDateRangeChange]);

  // Quick date range selections
  const quickRanges = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'Last 90 Days', days: 90 },
    { label: 'Last 6 Months', days: 180 },
    { label: 'Last Year', days: 365 }
  ];

  const selectQuickRange = useCallback((days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    handleDateRangeChange(start, end);
  }, [handleDateRangeChange]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      >
        <p className="font-medium text-gray-900 dark:text-gray-100 mb-2">
          {format(new Date(label), 'MMM dd, yyyy')}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              ${entry.value?.toLocaleString()}
            </span>
          </div>
        ))}
      </motion.div>
    );
  };

  // Earnings trend chart
  const EarningsTrendChart = () => {
    const ChartComponent = chartType === 'line' ? LineChart : 
                          chartType === 'area' ? AreaChart : BarChart;

    return (
      <ResponsiveContainer width="100%" height={400}>
        <ChartComponent data={filteredData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          
          {selectedMetrics.totalEarnings && (
            chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="totalEarnings"
                name="Total Earnings"
                stroke={chartColors.primary}
                strokeWidth={chartConfig.strokeWidth}
                dot={chartConfig.dot}
                animationDuration={1000}
              />
            ) : chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="totalEarnings"
                name="Total Earnings"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.3}
                strokeWidth={chartConfig.strokeWidth}
              />
            ) : (
              <Bar
                dataKey="totalEarnings"
                name="Total Earnings"
                fill={chartColors.primary}
                radius={[4, 4, 0, 0]}
              />
            )
          )}

          {selectedMetrics.commissionEarnings && (
            chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="commissionEarnings"
                name="Commission Earnings"
                stroke={chartColors.secondary}
                strokeWidth={chartConfig.strokeWidth}
                dot={chartConfig.dot}
                animationDuration={1200}
              />
            ) : chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="commissionEarnings"
                name="Commission Earnings"
                stroke={chartColors.secondary}
                fill={chartColors.secondary}
                fillOpacity={0.3}
                strokeWidth={chartConfig.strokeWidth}
              />
            ) : (
              <Bar
                dataKey="commissionEarnings"
                name="Commission Earnings"
                fill={chartColors.secondary}
                radius={[4, 4, 0, 0]}
              />
            )
          )}

          {selectedMetrics.directBookings && (
            chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="directBookings"
                name="Direct Bookings"
                stroke={chartColors.accent}
                strokeWidth={chartConfig.strokeWidth}
                dot={chartConfig.dot}
                animationDuration={1400}
              />
            ) : chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="directBookings"
                name="Direct Bookings"
                stroke={chartColors.accent}
                fill={chartColors.accent}
                fillOpacity={0.3}
                strokeWidth={chartConfig.strokeWidth}
              />
            ) : (
              <Bar
                dataKey="directBookings"
                name="Direct Bookings"
                fill={chartColors.accent}
                radius={[4, 4, 0, 0]}
              />
            )
          )}

          {selectedMetrics.recurringRevenue && (
            chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="recurringRevenue"
                name="Recurring Revenue"
                stroke={chartColors.purple}
                strokeWidth={chartConfig.strokeWidth}
                dot={chartConfig.dot}
                animationDuration={1600}
              />
            ) : chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="recurringRevenue"
                name="Recurring Revenue"
                stroke={chartColors.purple}
                fill={chartColors.purple}
                fillOpacity={0.3}
                strokeWidth={chartConfig.strokeWidth}
              />
            ) : (
              <Bar
                dataKey="recurringRevenue"
                name="Recurring Revenue"
                fill={chartColors.purple}
                radius={[4, 4, 0, 0]}
              />
            )
          )}

          {selectedMetrics.netEarnings && (
            chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="netEarnings"
                name="Net Earnings"
                stroke={chartColors.pink}
                strokeWidth={chartConfig.strokeWidth}
                dot={chartConfig.dot}
                animationDuration={1800}
              />
            ) : chartType === 'area' ? (
              <Area
                type="monotone"
                dataKey="netEarnings"
                name="Net Earnings"
                stroke={chartColors.pink}
                fill={chartColors.pink}
                fillOpacity={0.3}
                strokeWidth={chartConfig.strokeWidth}
              />
            ) : (
              <Bar
                dataKey="netEarnings"
                name="Net Earnings"
                fill={chartColors.pink}
                radius={[4, 4, 0, 0]}
              />
            )
          )}

          {filteredData.length > 20 && (
            <Brush
              dataKey="date"
              height={30}
              stroke={chartColors.primary}
              tickFormatter={(value) => format(new Date(value), 'MMM')}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  // Monthly comparison chart
  const MonthlyComparisonChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <Bar
          dataKey="currentYear"
          name="Current Year"
          fill={chartColors.primary}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="previousYear"
          name="Previous Year"
          fill={chartColors.secondary}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  // Revenue streams chart
  const RevenueStreamsChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={revenueStreams} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
        <Area
          type="monotone"
          dataKey="commissions"
          name="Commissions"
          stackId="1"
          stroke={revenueStreamColors.commissions}
          fill={revenueStreamColors.commissions}
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="directPayments"
          name="Direct Payments"
          stackId="1"
          stroke={revenueStreamColors.directPayments}
          fill={revenueStreamColors.directPayments}
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="subscriptions"
          name="Subscriptions"
          stackId="1"
          stroke={revenueStreamColors.subscriptions}
          fill={revenueStreamColors.subscriptions}
          fillOpacity={0.8}
        />
        <Area
          type="monotone"
          dataKey="other"
          name="Other"
          stackId="1"
          stroke={revenueStreamColors.other}
          fill={revenueStreamColors.other}
          fillOpacity={0.8}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header with controls */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Earnings Trends
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Interactive visualization of your earnings over time
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Date range picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-auto">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {quickRanges.map((range) => (
                    <Button
                      key={range.label}
                      variant="ghost"
                      size="sm"
                      onClick={() => selectQuickRange(range.days)}
                      className="justify-start"
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
                <Separator />
                <Calendar
                  mode="range"
                  selected={{
                    from: dateRange.start,
                    to: dateRange.end
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      handleDateRangeChange(range.from, range.to);
                    }
                  }}
                  numberOfMonths={2}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Chart type selector */}
          <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4" />
                  Line
                </div>
              </SelectItem>
              <SelectItem value="area">
                <div className="flex items-center gap-2">
                  <AreaChartIcon className="w-4 h-4" />
                  Area
                </div>
              </SelectItem>
              <SelectItem value="bar">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Bar
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport?.('png', activeTab)}
          >
            <Download className="w-4 h-4" />
          </Button>

          {/* Fullscreen toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendUpIcon className="w-4 h-4" />
            Earnings Trends
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Monthly Comparison
          </TabsTrigger>
          <TabsTrigger value="streams" className="flex items-center gap-2">
            <AreaChartIcon className="w-4 h-4" />
            Revenue Streams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col lg:flex-row gap-4 justify-between">
                <div>
                  <CardTitle className="text-lg">Earnings Over Time</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Track your earnings trends and patterns
                  </p>
                </div>

                {/* Metrics toggle */}
                <div className="flex flex-wrap gap-4">
                  {Object.entries(selectedMetrics).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Switch
                        id={key}
                        checked={value}
                        onCheckedChange={(checked) =>
                          setSelectedMetrics(prev => ({ ...prev, [key]: checked }))
                        }
                      />
                      <Label htmlFor={key} className="text-xs capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <EarningsTrendChart />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Comparison</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Compare current year performance with previous year
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <MonthlyComparisonChart />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="streams" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Streams</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Breakdown of different revenue sources over time
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <RevenueStreamsChart />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chart controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chart Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-grid"
                checked={showGrid}
                onCheckedChange={setShowGrid}
              />
              <Label htmlFor="show-grid" className="text-sm">Show Grid</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-legend"
                checked={showLegend}
                onCheckedChange={setShowLegend}
              />
              <Label htmlFor="show-legend" className="text-sm">Show Legend</Label>
            </div>

            {zoomDomain && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoomDomain(null)}
              >
                <ZoomOut className="w-4 h-4 mr-2" />
                Reset Zoom
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default EarningsTrendCharts;
