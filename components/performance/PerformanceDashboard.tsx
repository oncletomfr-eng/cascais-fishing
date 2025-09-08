/**
 * Performance Dashboard Component
 * Displays performance metrics and trends
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Database, 
  Eye, 
  Globe, 
  MonitorSpeaker,
  RefreshCw,
  TrendingUp,
  Zap
} from 'lucide-react';

// Import our performance monitoring systems
import { WebVitalMetric, getWebVitalsMetrics, useWebVitals } from '@/lib/performance/core-web-vitals';
import { MetricsCollector, PerformanceMetric } from '@/lib/performance/metrics-collector';

interface PerformanceDashboardProps {
  className?: string;
  showRealTime?: boolean;
  refreshInterval?: number;
}

interface MetricSummary {
  name: string;
  current: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  unit: string;
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical';
  issues: string[];
  lastUpdated: Date;
}

const RATING_COLORS = {
  good: 'bg-green-100 text-green-800 border-green-200',
  'needs-improvement': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  poor: 'bg-red-100 text-red-800 border-red-200'
};

const RATING_PROGRESS_COLORS = {
  good: 'bg-green-500',
  'needs-improvement': 'bg-yellow-500',
  poor: 'bg-red-500'
};

export default function PerformanceDashboard({ 
  className = '', 
  showRealTime = true,
  refreshInterval = 5000 
}: PerformanceDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [serverMetrics, setServerMetrics] = useState<PerformanceMetric[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    status: 'healthy',
    issues: [],
    lastUpdated: new Date()
  });

  // Client-side Web Vitals
  const { metrics: webVitalsMetrics, getMetric } = useWebVitals();

  // Fetch server-side metrics
  const fetchServerMetrics = async () => {
    try {
      const response = await fetch('/api/performance/metrics');
      if (response.ok) {
        const data = await response.json();
        setServerMetrics(data.metrics || []);
        setSystemStatus(data.systemStatus || systemStatus);
      }
    } catch (error) {
      console.warn('Failed to fetch server metrics:', error);
    } finally {
      setIsLoading(false);
      setLastRefresh(new Date());
    }
  };

  // Auto-refresh metrics
  useEffect(() => {
    fetchServerMetrics();
    
    if (showRealTime && refreshInterval > 0) {
      const interval = setInterval(fetchServerMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [showRealTime, refreshInterval]);

  // Calculate Web Vitals summary
  const webVitalsSummary: MetricSummary[] = useMemo(() => {
    const vitals: Array<{ name: WebVitalMetric['name']; label: string; unit: string; goodThreshold: number; poorThreshold: number }> = [
      { name: 'LCP', label: 'Largest Contentful Paint', unit: 'ms', goodThreshold: 2500, poorThreshold: 4000 },
      { name: 'FID', label: 'First Input Delay', unit: 'ms', goodThreshold: 100, poorThreshold: 300 },
      { name: 'CLS', label: 'Cumulative Layout Shift', unit: '', goodThreshold: 0.1, poorThreshold: 0.25 },
      { name: 'FCP', label: 'First Contentful Paint', unit: 'ms', goodThreshold: 1800, poorThreshold: 3000 },
      { name: 'TTFB', label: 'Time to First Byte', unit: 'ms', goodThreshold: 800, poorThreshold: 1800 },
      { name: 'INP', label: 'Interaction to Next Paint', unit: 'ms', goodThreshold: 200, poorThreshold: 500 }
    ];

    return vitals.map(vital => {
      const metric = getMetric(vital.name);
      const value = metric?.value || 0;
      
      let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
      if (value > vital.poorThreshold) rating = 'poor';
      else if (value > vital.goodThreshold) rating = 'needs-improvement';

      return {
        name: vital.label,
        current: value,
        trend: 'stable' as const,
        change: 0,
        rating,
        unit: vital.unit
      };
    });
  }, [webVitalsMetrics, getMetric]);

  // Calculate server metrics summary
  const serverMetricsSummary: MetricSummary[] = useMemo(() => {
    const recentMetrics = serverMetrics.filter(m => 
      Date.now() - new Date(m.timestamp).getTime() < 60000 // Last minute
    );

    const metricGroups = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) acc[metric.name] = [];
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    return Object.entries(metricGroups).map(([name, metrics]) => {
      const values = metrics.map(m => m.value);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      return {
        name,
        current: avg,
        trend: 'stable' as const,
        change: 0,
        rating: avg < 500 ? 'good' : avg < 1000 ? 'needs-improvement' : 'poor',
        unit: metrics[0]?.unit || 'ms'
      };
    });
  }, [serverMetrics]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchServerMetrics();
  };

  const formatValue = (value: number, unit: string): string => {
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === 'bytes') return `${(value / 1024 / 1024).toFixed(1)}MB`;
    if (unit === '') return value.toFixed(3);
    return `${Math.round(value)}${unit}`;
  };

  const getStatusIcon = (status: SystemStatus['status']) => {
    switch (status) {
      case 'healthy': return <Activity className="h-4 w-4 text-green-600" />;
      case 'degraded': return <MonitorSpeaker className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <Zap className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor application performance metrics and Core Web Vitals
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {showRealTime && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span>Live</span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center space-x-2">
            {getStatusIcon(systemStatus.status)}
            <span>System Status</span>
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${
              systemStatus.status === 'healthy' ? 'border-green-200 bg-green-50 text-green-700' :
              systemStatus.status === 'degraded' ? 'border-yellow-200 bg-yellow-50 text-yellow-700' :
              'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {systemStatus.status}
          </Badge>
        </CardHeader>
        <CardContent>
          {systemStatus.issues.length > 0 ? (
            <div className="space-y-2">
              {systemStatus.issues.map((issue, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTitle>Performance Issue</AlertTitle>
                  <AlertDescription>{issue}</AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All systems operational. Last checked: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Metrics Tabs */}
      <Tabs defaultValue="web-vitals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="web-vitals" className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Core Web Vitals</span>
          </TabsTrigger>
          <TabsTrigger value="server-metrics" className="flex items-center space-x-2">
            <Database className="h-4 w-4" />
            <span>Server Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Trends</span>
          </TabsTrigger>
        </TabsList>

        {/* Core Web Vitals Tab */}
        <TabsContent value="web-vitals">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {webVitalsSummary.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={RATING_COLORS[metric.rating]}
                  >
                    {metric.rating}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(metric.current, metric.unit)}
                  </div>
                  <Progress 
                    value={Math.min(100, (metric.current / (metric.unit === 'ms' ? 4000 : 1)) * 100)}
                    className={`mt-2 h-2 ${RATING_PROGRESS_COLORS[metric.rating]}`}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Client-side performance metric
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Server Metrics Tab */}
        <TabsContent value="server-metrics">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {serverMetricsSummary.map((metric) => (
              <Card key={metric.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <Badge 
                    variant="outline" 
                    className={RATING_COLORS[metric.rating]}
                  >
                    {metric.rating}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatValue(metric.current, metric.unit)}
                  </div>
                  <Progress 
                    value={Math.min(100, (metric.current / 2000) * 100)}
                    className={`mt-2 h-2 ${RATING_PROGRESS_COLORS[metric.rating]}`}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Server-side performance metric
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {serverMetricsSummary.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Server Metrics</h3>
                <p className="text-muted-foreground text-center">
                  Server metrics will appear here once the application starts collecting data.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance Trends</span>
              </CardTitle>
              <CardDescription>
                Historical performance data and trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Trends Coming Soon</h3>
                <p className="text-muted-foreground">
                  Performance trends and historical analysis will be available once sufficient data is collected.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common performance monitoring and optimization tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col py-4" asChild>
              <a href="/api/admin/health" target="_blank" rel="noopener">
                <Eye className="h-6 w-6 mb-2" />
                <span className="text-sm">Health Check</span>
              </a>
            </Button>
            
            <Button variant="outline" className="h-auto flex-col py-4" onClick={handleRefresh}>
              <RefreshCw className="h-6 w-6 mb-2" />
              <span className="text-sm">Refresh Metrics</span>
            </Button>
            
            <Button variant="outline" className="h-auto flex-col py-4" disabled>
              <BarChart3 className="h-6 w-6 mb-2" />
              <span className="text-sm">Export Report</span>
            </Button>
            
            <Button variant="outline" className="h-auto flex-col py-4" disabled>
              <Zap className="h-6 w-6 mb-2" />
              <span className="text-sm">Optimize</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
