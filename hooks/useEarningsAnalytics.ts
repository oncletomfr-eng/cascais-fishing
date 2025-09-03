/**
 * Earnings Analytics Hook
 * Task 6.2: Earnings Trend Visualizations
 * 
 * Hook for fetching and managing earnings analytics data for trend visualizations
 * Handles data transformation, caching, and real-time updates
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// Types for earnings analytics data
export interface EarningsDataPoint {
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

export interface MonthlyComparison {
  month: string;
  currentYear: number;
  previousYear: number;
  growth: number;
  bookings: number;
  avgBookingValue: number;
}

export interface RevenueStream {
  date: string;
  commissions: number;
  directPayments: number;
  subscriptions: number;
  other: number;
}

export interface EarningsAnalyticsData {
  dailyEarnings: EarningsDataPoint[];
  monthlyComparisons: MonthlyComparison[];
  revenueStreams: RevenueStream[];
  summary: {
    totalRevenue: number;
    totalEarnings: number;
    totalCommissions: number;
    avgDailyEarnings: number;
    highestEarningDay: {
      date: string;
      amount: number;
    };
    lowestEarningDay: {
      date: string;
      amount: number;
    };
    growthRate: number;
    totalBookings: number;
    avgBookingValue: number;
  };
  trends: {
    earningsDirection: 'up' | 'down' | 'stable';
    earningsChange: number;
    bookingsDirection: 'up' | 'down' | 'stable';
    bookingsChange: number;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface UseEarningsAnalyticsOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval?: number;
  granularity?: 'daily' | 'weekly' | 'monthly';
  autoRefresh?: boolean;
  includeRefunds?: boolean;
}

interface UseEarningsAnalyticsReturn {
  data: EarningsAnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateDateRange: (start: Date, end: Date) => void;
  updateGranularity: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  exportData: (format: 'json' | 'csv' | 'xlsx') => Promise<void>;
  lastUpdated: Date | null;
}

const defaultOptions: UseEarningsAnalyticsOptions = {
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  granularity: 'daily',
  autoRefresh: true,
  includeRefunds: true
};

export function useEarningsAnalytics(
  options: UseEarningsAnalyticsOptions = {}
): UseEarningsAnalyticsReturn {
  const mergedOptions = { ...defaultOptions, ...options };
  const { data: session } = useSession();

  // State
  const [data, setData] = useState<EarningsAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentDateRange, setCurrentDateRange] = useState(
    mergedOptions.dateRange || {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      end: new Date()
    }
  );
  const [granularity, setGranularity] = useState(mergedOptions.granularity || 'daily');

  // Fetch earnings analytics data
  const fetchEarningsData = useCallback(async () => {
    if (!session?.user) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start: currentDateRange.start.toISOString(),
        end: currentDateRange.end.toISOString(),
        granularity,
        includeRefunds: mergedOptions.includeRefunds ? 'true' : 'false'
      });

      const response = await fetch(`/api/earnings-analytics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch earnings data: ${response.statusText}`);
      }

      const analyticsData = await response.json();

      // Transform and process data
      const processedData: EarningsAnalyticsData = {
        ...analyticsData,
        dailyEarnings: analyticsData.dailyEarnings?.map((item: any) => ({
          ...item,
          timestamp: new Date(item.date)
        })) || [],
        dateRange: currentDateRange
      };

      setData(processedData);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch earnings data';
      setError(errorMessage);
      console.error('Earnings analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user, currentDateRange, granularity, mergedOptions.includeRefunds]);

  // Update date range
  const updateDateRange = useCallback((start: Date, end: Date) => {
    setCurrentDateRange({ start, end });
  }, []);

  // Update granularity
  const updateGranularity = useCallback((newGranularity: 'daily' | 'weekly' | 'monthly') => {
    setGranularity(newGranularity);
  }, []);

  // Export data
  const exportData = useCallback(async (format: 'json' | 'csv' | 'xlsx') => {
    if (!data) {
      throw new Error('No data available to export');
    }

    try {
      const params = new URLSearchParams({
        format,
        start: currentDateRange.start.toISOString(),
        end: currentDateRange.end.toISOString(),
        granularity
      });

      const response = await fetch(`/api/earnings-analytics/export?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `earnings-analytics-${format}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      throw err;
    }
  }, [data, currentDateRange, granularity]);

  // Initial data fetch
  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!mergedOptions.autoRefresh || !mergedOptions.refreshInterval) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEarningsData();
      }
    }, mergedOptions.refreshInterval);

    return () => clearInterval(interval);
  }, [fetchEarningsData, mergedOptions.autoRefresh, mergedOptions.refreshInterval]);

  // Refresh data when browser tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mergedOptions.autoRefresh) {
        fetchEarningsData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchEarningsData, mergedOptions.autoRefresh]);

  // Memoized computed values
  const computedData = useMemo(() => {
    if (!data) return null;

    // Add additional computed metrics here if needed
    return {
      ...data,
      // Example: calculate additional derived metrics
      avgWeeklyEarnings: data.dailyEarnings.length > 0 
        ? data.dailyEarnings.reduce((sum, item) => sum + item.totalEarnings, 0) / Math.max(1, data.dailyEarnings.length / 7)
        : 0,
      topPerformingDay: data.dailyEarnings.reduce(
        (max, item) => item.totalEarnings > max.totalEarnings ? item : max,
        data.dailyEarnings[0] || { date: '', totalEarnings: 0 }
      ),
      consistencyScore: data.dailyEarnings.length > 1
        ? 1 - (standardDeviation(data.dailyEarnings.map(d => d.totalEarnings)) / 
               Math.max(1, data.dailyEarnings.reduce((sum, d) => sum + d.totalEarnings, 0) / data.dailyEarnings.length))
        : 0
    };
  }, [data]);

  return {
    data: computedData,
    loading,
    error,
    refresh: fetchEarningsData,
    updateDateRange,
    updateGranularity,
    exportData,
    lastUpdated
  };
}

// Helper function to calculate standard deviation
function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

export default useEarningsAnalytics;
