/**
 * Payment Dashboard Testing Page
 * Task 6: Payment Dashboard Core - Demo & Testing
 * 
 * Comprehensive testing interface for payment analytics dashboard components
 * including KPI cards, charts, and real-time data updates
 */

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PaymentKPICards } from '@/components/analytics/PaymentKPICards';
import { EarningsTrendCharts } from '@/components/analytics/EarningsTrendCharts';
import { usePaymentAnalytics, usePaymentKPIs } from '@/hooks/usePaymentAnalytics';
import useEarningsAnalytics from '@/hooks/useEarningsAnalytics';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  CreditCard,
  Users,
  TestTube,
  RefreshCw,
  AlertCircle,
  Settings,
  Calendar,
  Download,
  Play,
  Pause,
  Eye,
  PieChart,
  Activity
} from 'lucide-react';

export default function PaymentDashboardTestPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // State for demo controls
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedGroupBy, setSelectedGroupBy] = useState<'day' | 'week' | 'month' | 'quarter'>('day');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);
  const [showAnimations, setShowAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Analytics hooks
  const paymentAnalytics = usePaymentAnalytics({
    initialParams: {
      period: selectedPeriod,
      groupBy: selectedGroupBy,
      includeProjections: true,
      includeCommissions: true,
      includeBreakdowns: true,
    },
    autoRefresh: autoRefreshEnabled,
    refreshInterval: 30000, // 30 seconds
    onError: (error) => {
      toast({
        title: 'Analytics Error',
        description: error,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      if (autoRefreshEnabled) {
        toast({
          title: 'Data refreshed',
          description: 'Payment analytics updated automatically',
        });
      }
    }
  });

  // Specific KPI hook for comparison
  const kpiData = usePaymentKPIs({
    period: selectedPeriod,
  });

  // Earnings analytics hook for trend charts
  const earningsAnalytics = useEarningsAnalytics({
    dateRange: {
      start: new Date(Date.now() - (selectedPeriod === 'week' ? 7 : selectedPeriod === 'month' ? 30 : selectedPeriod === 'quarter' ? 90 : 365) * 24 * 60 * 60 * 1000),
      end: new Date()
    },
    granularity: selectedGroupBy === 'day' ? 'daily' : selectedGroupBy === 'week' ? 'weekly' : 'monthly',
    autoRefresh: autoRefreshEnabled,
    refreshInterval: 30000, // 30 seconds
  });

  // Handle parameter changes
  const handlePeriodChange = (period: 'week' | 'month' | 'quarter' | 'year') => {
    setSelectedPeriod(period);
    paymentAnalytics.setParams({ period });
  };

  const handleGroupByChange = (groupBy: 'day' | 'week' | 'month' | 'quarter') => {
    setSelectedGroupBy(groupBy);
    paymentAnalytics.setParams({ groupBy });
  };

  const handleRefresh = () => {
    paymentAnalytics.refresh();
  };

  const toggleAutoRefresh = () => {
    const newValue = !autoRefreshEnabled;
    setAutoRefreshEnabled(newValue);
    toast({
      title: newValue ? 'Auto-refresh enabled' : 'Auto-refresh disabled',
      description: newValue ? 'Dashboard will update every 30 seconds' : 'Manual refresh only',
    });
  };

  // Generate mock data for testing when no real data
  const generateMockData = () => {
    return {
      totalRevenue: 125000,
      netRevenue: 106250,
      totalCommissions: 18750,
      totalPayments: 89,
      successfulPayments: 82,
      averagePaymentAmount: 1404,
      revenueGrowth: 12.5,
      conversionRate: 92.1,
    };
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to test the payment dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Payment Dashboard Testing
              </h1>
              <p className="text-muted-foreground">
                Task 6 Demo - Revenue Overview, KPI Cards, and Analytics Components
              </p>
            </div>
          </div>

          {/* Status Info */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <Badge variant={paymentAnalytics.loading ? 'default' : 'secondary'}>
              {paymentAnalytics.loading ? 'Loading...' : 'Ready'}
            </Badge>
            <Badge variant={autoRefreshEnabled ? 'default' : 'outline'}>
              {autoRefreshEnabled ? 'Auto-refresh ON' : 'Manual refresh'}
            </Badge>
            {paymentAnalytics.lastUpdated && (
              <span className="text-muted-foreground">
                Last updated: {paymentAnalytics.lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Dashboard Controls
            </CardTitle>
            <CardDescription>
              Configure analytics parameters and display options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Period Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Period</label>
                <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Group By Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Group By</label>
                <Select value={selectedGroupBy} onValueChange={handleGroupByChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="quarter">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleRefresh} 
                    disabled={paymentAnalytics.loading}
                    size="sm"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${paymentAnalytics.loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    onClick={toggleAutoRefresh}
                    variant={autoRefreshEnabled ? 'default' : 'outline'}
                    size="sm"
                  >
                    {autoRefreshEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Display</label>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAnimations(!showAnimations)}
                    variant={showAnimations ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Animate
                  </Button>
                  <Button
                    onClick={() => setCompactMode(!compactMode)}
                    variant={compactMode ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Dashboard Tabs */}
        <Tabs defaultValue="kpis" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 max-w-2xl mx-auto">
            <TabsTrigger value="kpis" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              KPI Cards
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Charts
            </TabsTrigger>
            <TabsTrigger value="breakdowns" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Breakdowns
            </TabsTrigger>
            <TabsTrigger value="mock" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Mock Data
            </TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Debug
            </TabsTrigger>
          </TabsList>

          {/* KPI Cards Tab */}
          <TabsContent value="kpis" className="space-y-6">
            <PaymentKPICards
              data={paymentAnalytics.overview}
              loading={paymentAnalytics.loading}
              error={paymentAnalytics.error}
              period={selectedPeriod}
              onRefresh={handleRefresh}
              showAnimations={showAnimations}
              compactMode={compactMode}
            />

            {/* Comparison with separate hook */}
            <Card>
              <CardHeader>
                <CardTitle>Hook Comparison</CardTitle>
                <CardDescription>
                  Comparing main analytics hook vs dedicated KPI hook
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-2">Main Analytics Hook</h4>
                    <div className="text-sm space-y-1">
                      <div>Loading: {paymentAnalytics.loading ? 'Yes' : 'No'}</div>
                      <div>Error: {paymentAnalytics.error || 'None'}</div>
                      <div>Total Revenue: €{((paymentAnalytics.overview?.totalRevenue || 0) / 100).toFixed(2)}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Dedicated KPI Hook</h4>
                    <div className="text-sm space-y-1">
                      <div>Loading: {kpiData.loading ? 'Yes' : 'No'}</div>
                      <div>Error: {kpiData.error || 'None'}</div>
                      <div>Total Revenue: €{((kpiData.kpis?.totalRevenue || 0) / 100).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts" className="space-y-6">
            {earningsAnalytics.data ? (
              <EarningsTrendCharts
                data={earningsAnalytics.data.dailyEarnings}
                monthlyData={earningsAnalytics.data.monthlyComparisons}
                revenueStreams={earningsAnalytics.data.revenueStreams}
                loading={earningsAnalytics.loading}
                onDateRangeChange={(start, end) => {
                  earningsAnalytics.updateDateRange(start, end);
                }}
                onRefresh={() => {
                  earningsAnalytics.refresh();
                  handleRefresh();
                }}
                onExport={(format, chartType) => {
                  toast({
                    title: 'Export started',
                    description: `Exporting ${chartType} chart as ${format}`,
                  });
                }}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Earnings Trend Charts
                  </CardTitle>
                  <CardDescription>
                    Interactive charts for monthly/weekly earnings trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {earningsAnalytics.loading ? (
                    <div className="flex items-center justify-center h-64">
                      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : earningsAnalytics.error ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Error loading earnings data: {earningsAnalytics.error}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No earnings data available. Try adjusting the date range or refreshing the data.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Data status info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Earnings Data Status</CardTitle>
                <CardDescription>
                  Current status and details of earnings analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Loading State</div>
                    <Badge variant={earningsAnalytics.loading ? 'default' : 'secondary'}>
                      {earningsAnalytics.loading ? 'Loading...' : 'Ready'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Data Points</div>
                    <div className="text-sm text-muted-foreground">
                      {earningsAnalytics.data?.dailyEarnings?.length || 0} data points
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Last Updated</div>
                    <div className="text-sm text-muted-foreground">
                      {earningsAnalytics.lastUpdated ? 
                        earningsAnalytics.lastUpdated.toLocaleTimeString() : 
                        'Never'
                      }
                    </div>
                  </div>
                </div>

                {earningsAnalytics.data?.summary && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Summary Metrics</h4>
                    <div className="grid gap-2 md:grid-cols-2 text-sm">
                      <div>Total Revenue: €{(earningsAnalytics.data.summary.totalRevenue / 100).toFixed(2)}</div>
                      <div>Total Earnings: €{(earningsAnalytics.data.summary.totalEarnings / 100).toFixed(2)}</div>
                      <div>Growth Rate: {earningsAnalytics.data.summary.growthRate.toFixed(1)}%</div>
                      <div>Total Bookings: {earningsAnalytics.data.summary.totalBookings}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breakdowns Tab - Placeholder */}
          <TabsContent value="breakdowns" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Commission Breakdown Analysis
                </CardTitle>
                <CardDescription>
                  Payment type and commission analysis visualization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Breakdown components will be implemented in subtask 6.3. Available data:
                  </AlertDescription>
                </Alert>
                
                {paymentAnalytics.breakdowns && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Breakdown Data Preview</h4>
                    <pre className="text-xs overflow-auto max-h-40">
                      {JSON.stringify(paymentAnalytics.breakdowns, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mock Data Tab */}
          <TabsContent value="mock" className="space-y-6">
            <PaymentKPICards
              data={generateMockData()}
              loading={false}
              error={null}
              period={selectedPeriod}
              onRefresh={() => toast({ title: 'Mock data refreshed' })}
              showAnimations={showAnimations}
              compactMode={compactMode}
            />

            <Card>
              <CardHeader>
                <CardTitle>Mock Data Testing</CardTitle>
                <CardDescription>
                  Test KPI components with generated mock data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  This tab shows the KPI cards with mock data to test styling, animations, and functionality
                  without requiring real payment data in the database.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Debug Tab */}
          <TabsContent value="debug" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
                <CardDescription>
                  Raw data and analytics hook state for debugging
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Parameters */}
                <div>
                  <h4 className="font-medium mb-2">Current Parameters</h4>
                  <pre className="text-xs p-3 bg-muted rounded overflow-auto">
                    {JSON.stringify(paymentAnalytics.currentParams, null, 2)}
                  </pre>
                </div>

                {/* Raw Analytics Data */}
                {paymentAnalytics.data && (
                  <div>
                    <h4 className="font-medium mb-2">Raw Analytics Data</h4>
                    <pre className="text-xs p-3 bg-muted rounded overflow-auto max-h-60">
                      {JSON.stringify(paymentAnalytics.data, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Error Information */}
                {paymentAnalytics.error && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Error Details</h4>
                    <div className="text-sm p-3 bg-red-50 border border-red-200 rounded">
                      {paymentAnalytics.error}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
