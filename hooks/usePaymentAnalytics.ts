/**
 * Payment Analytics Hook
 * Task 6: Payment Dashboard Core - React Hook
 * 
 * React hook for fetching and managing payment analytics data
 * with real-time updates, caching, and error handling
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

// Types matching our API
export interface PaymentOverview {
  totalRevenue: number;
  netRevenue: number;
  totalCommissions: number;
  totalPayments: number;
  successfulPayments: number;
  averagePaymentAmount: number;
  revenueGrowth: number;
  conversionRate: number;
}

export interface PaymentTimeSeries {
  date: string;
  revenue: number;
  commissions: number;
  netRevenue: number;
  paymentCount: number;
  successfulPayments: number;
}

export interface PaymentBreakdowns {
  byType: Record<string, { count: number; amount: number; commissions: number }>;
  byStatus: Record<string, { count: number; amount: number }>;
}

export interface CommissionAnalysis {
  totalCommissions: number;
  averageCommissionRate: number;
  commissionsByTier: Record<string, number>;
  commissionTrend: Record<string, { total: number; count: number }>;
}

export interface PaymentProjections {
  nextPeriodRevenue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
  recommendations: string[];
}

export interface PaymentTrends {
  dailyAverage: number;
  peakDay: PaymentTimeSeries | null;
  paymentMethods: Record<string, { count: number; amount: number }>;
}

export interface PaymentAnalyticsData {
  overview: PaymentOverview;
  timeSeries: PaymentTimeSeries[];
  breakdowns: PaymentBreakdowns | null;
  commissionAnalysis: CommissionAnalysis | null;
  projections: PaymentProjections | null;
  recentPayments: any[];
  trends: PaymentTrends;
}

export interface PaymentAnalyticsParams {
  period?: 'week' | 'month' | 'quarter' | 'year';
  startDate?: string;
  endDate?: string;
  userId?: string;
  includeProjections?: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  includeCommissions?: boolean;
  includeBreakdowns?: boolean;
}

export interface UsePaymentAnalyticsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  initialParams?: PaymentAnalyticsParams;
  onError?: (error: string) => void;
  onSuccess?: (data: PaymentAnalyticsData) => void;
}

export interface UsePaymentAnalyticsReturn {
  // Data
  data: PaymentAnalyticsData | null;
  overview: PaymentOverview | null;
  timeSeries: PaymentTimeSeries[];
  breakdowns: PaymentBreakdowns | null;
  commissionAnalysis: CommissionAnalysis | null;
  projections: PaymentProjections | null;
  trends: PaymentTrends | null;
  
  // State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  fetchAnalytics: (params?: PaymentAnalyticsParams) => Promise<void>;
  refresh: () => Promise<void>;
  setParams: (params: Partial<PaymentAnalyticsParams>) => void;
  
  // Current params
  currentParams: PaymentAnalyticsParams;
}

export function usePaymentAnalytics(options: UsePaymentAnalyticsOptions = {}): UsePaymentAnalyticsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 60000, // 1 minute
    initialParams = {},
    onError,
    onSuccess
  } = options;

  const { toast } = useToast();

  // State
  const [data, setData] = useState<PaymentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentParams, setCurrentParams] = useState<PaymentAnalyticsParams>({
    period: 'month',
    includeProjections: true,
    groupBy: 'day',
    includeCommissions: true,
    includeBreakdowns: true,
    ...initialParams
  });

  // Build API URL with parameters
  const buildApiUrl = useCallback((params: PaymentAnalyticsParams) => {
    const url = new URL('/api/payment-analytics', window.location.origin);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });
    
    return url.toString();
  }, []);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async (params?: PaymentAnalyticsParams) => {
    const fetchParams = params || currentParams;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(buildApiUrl(fetchParams));
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch payment analytics');
      }

      if (!result.success) {
        throw new Error(result.error || 'Analytics request failed');
      }

      setData(result.data);
      setLastUpdated(new Date());
      
      onSuccess?.(result.data);
      
      // Show success toast on manual refresh
      if (params) {
        toast({
          title: 'Analytics updated',
          description: 'Payment analytics data has been refreshed',
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      onError?.(errorMessage);
      
      toast({
        title: 'Analytics error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [currentParams, buildApiUrl, onError, onSuccess, toast]);

  // Refresh current data
  const refresh = useCallback(() => {
    return fetchAnalytics(currentParams);
  }, [fetchAnalytics, currentParams]);

  // Update parameters
  const setParams = useCallback((newParams: Partial<PaymentAnalyticsParams>) => {
    setCurrentParams(prev => {
      const updated = { ...prev, ...newParams };
      // Automatically fetch when params change
      fetchAnalytics(updated);
      return updated;
    });
  }, [fetchAnalytics]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    fetchAnalytics(currentParams);
  }, []); // Only run on mount

  // Memoized derived data
  const overview = useMemo(() => data?.overview || null, [data]);
  const timeSeries = useMemo(() => data?.timeSeries || [], [data]);
  const breakdowns = useMemo(() => data?.breakdowns || null, [data]);
  const commissionAnalysis = useMemo(() => data?.commissionAnalysis || null, [data]);
  const projections = useMemo(() => data?.projections || null, [data]);
  const trends = useMemo(() => data?.trends || null, [data]);

  return {
    // Data
    data,
    overview,
    timeSeries,
    breakdowns,
    commissionAnalysis,
    projections,
    trends,
    
    // State
    loading,
    error,
    lastUpdated,
    
    // Actions
    fetchAnalytics,
    refresh,
    setParams,
    
    // Current params
    currentParams,
  };
}

// Utility hook for specific metrics
export function usePaymentKPIs(params?: PaymentAnalyticsParams) {
  const { overview, loading, error, refresh } = usePaymentAnalytics({
    initialParams: params,
    autoRefresh: false,
  });

  return {
    kpis: overview,
    loading,
    error,
    refresh,
  };
}

// Utility hook for time series charts
export function usePaymentTimeSeries(params?: PaymentAnalyticsParams) {
  const { timeSeries, trends, loading, error, refresh } = usePaymentAnalytics({
    initialParams: { groupBy: 'day', ...params },
    autoRefresh: false,
  });

  return {
    timeSeries,
    trends,
    loading,
    error,
    refresh,
  };
}

// Utility hook for commission analysis
export function useCommissionAnalysis(params?: PaymentAnalyticsParams) {
  const { commissionAnalysis, loading, error, refresh } = usePaymentAnalytics({
    initialParams: { includeCommissions: true, ...params },
    autoRefresh: false,
  });

  return {
    commissionAnalysis,
    loading,
    error,
    refresh,
  };
}
