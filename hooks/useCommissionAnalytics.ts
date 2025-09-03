/**
 * Commission Analytics Hook
 * Task 6.3: Commission Breakdown Analysis
 * 
 * Hook for fetching and managing commission analytics data
 * Handles service type breakdowns, captain tier analysis, and payout history
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// Import types from the component
export interface ServiceTypeBreakdown {
  serviceType: 'tours' | 'courses' | 'advertising' | 'other';
  serviceName: string;
  totalCommission: number;
  percentage: number;
  count: number;
  averageCommission: number;
  color: string;
}

export interface CaptainTierBreakdown {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  tierName: string;
  captainCount: number;
  totalCommission: number;
  averageCommission: number;
  commissionRate: number;
  percentage: number;
  color: string;
}

export interface CommissionTrendPoint {
  date: string;
  timestamp: Date;
  totalCommission: number;
  tourCommissions: number;
  courseCommissions: number;
  advertisingCommissions: number;
  captainCount: number;
  averagePerCaptain: number;
}

export interface PayoutHistory {
  id: string;
  payoutDate: Date;
  captainId: string;
  captainName: string;
  totalAmount: number;
  commissionAmount: number;
  feeAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutMethod: string;
  transactionId?: string;
}

export interface CommissionCalculation {
  serviceId: string;
  serviceType: string;
  serviceName: string;
  baseAmount: number;
  commissionRate: number;
  captainTier: string;
  tierMultiplier: number;
  finalCommission: number;
  platformFee: number;
  netPayout: number;
  timestamp: Date;
}

export interface CommissionAnalyticsData {
  serviceBreakdown: ServiceTypeBreakdown[];
  tierBreakdown: CaptainTierBreakdown[];
  trends: CommissionTrendPoint[];
  payoutHistory: PayoutHistory[];
  calculations: CommissionCalculation[];
  summary: {
    totalCommissions: number;
    totalPayouts: number;
    pendingPayouts: number;
    averageCommissionRate: number;
    topServiceType: string;
    topTier: string;
    monthlyGrowth: number;
    totalCaptains: number;
    activeServices: number;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface UseCommissionAnalyticsOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval?: number;
  autoRefresh?: boolean;
  includePayouts?: boolean;
  captainId?: string;
  serviceType?: string;
  tier?: string;
}

interface UseCommissionAnalyticsReturn {
  data: CommissionAnalyticsData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateDateRange: (start: Date, end: Date) => void;
  updateFilters: (filters: { serviceType?: string; tier?: string; captainId?: string }) => void;
  exportData: (format: 'json' | 'csv' | 'xlsx') => Promise<void>;
  lastUpdated: Date | null;
  retryCount: number;
  isStale: boolean;
}

const defaultOptions: UseCommissionAnalyticsOptions = {
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  autoRefresh: true,
  includePayouts: true
};

export function useCommissionAnalytics(
  options: UseCommissionAnalyticsOptions = {}
): UseCommissionAnalyticsReturn {
  const mergedOptions = { ...defaultOptions, ...options };
  const { data: session } = useSession();

  // State
  const [data, setData] = useState<CommissionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentDateRange, setCurrentDateRange] = useState(
    mergedOptions.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date()
    }
  );
  const [filters, setFilters] = useState({
    serviceType: mergedOptions.serviceType,
    tier: mergedOptions.tier,
    captainId: mergedOptions.captainId
  });

  // Check if data is stale
  const isStale = useMemo(() => {
    if (!lastUpdated) return true;
    const staleThreshold = mergedOptions.refreshInterval || 5 * 60 * 1000;
    return Date.now() - lastUpdated.getTime() > staleThreshold;
  }, [lastUpdated, mergedOptions.refreshInterval]);

  // Fetch commission analytics data
  const fetchCommissionData = useCallback(async () => {
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
        includePayouts: mergedOptions.includePayouts ? 'true' : 'false',
        ...(filters.serviceType && { serviceType: filters.serviceType }),
        ...(filters.tier && { tier: filters.tier }),
        ...(filters.captainId && { captainId: filters.captainId })
      });

      const response = await fetch(`/api/commission-analytics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch commission data: ${response.statusText}`);
      }

      const analyticsData = await response.json();

      // Transform and process data
      const processedData: CommissionAnalyticsData = {
        ...analyticsData,
        trends: analyticsData.trends?.map((item: any) => ({
          ...item,
          timestamp: new Date(item.date)
        })) || [],
        payoutHistory: analyticsData.payoutHistory?.map((item: any) => ({
          ...item,
          payoutDate: new Date(item.payoutDate)
        })) || [],
        calculations: analyticsData.calculations?.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })) || [],
        dateRange: currentDateRange
      };

      setData(processedData);
      setLastUpdated(new Date());
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch commission data';
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
      console.error('Commission analytics fetch error:', err);

      // Exponential backoff for retries
      if (retryCount < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => {
          fetchCommissionData();
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user, currentDateRange, filters, mergedOptions.includePayouts, retryCount]);

  // Update date range
  const updateDateRange = useCallback((start: Date, end: Date) => {
    setCurrentDateRange({ start, end });
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters: { serviceType?: string; tier?: string; captainId?: string }) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
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
        ...(filters.serviceType && { serviceType: filters.serviceType }),
        ...(filters.tier && { tier: filters.tier }),
        ...(filters.captainId && { captainId: filters.captainId })
      });

      const response = await fetch(`/api/commission-analytics/export?${params}`, {
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
      a.download = `commission-analytics-${format}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      throw err;
    }
  }, [data, currentDateRange, filters]);

  // Initial data fetch
  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!mergedOptions.autoRefresh || !mergedOptions.refreshInterval) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && isStale) {
        fetchCommissionData();
      }
    }, mergedOptions.refreshInterval);

    return () => clearInterval(interval);
  }, [fetchCommissionData, mergedOptions.autoRefresh, mergedOptions.refreshInterval, isStale]);

  // Refresh data when browser tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mergedOptions.autoRefresh && isStale) {
        fetchCommissionData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchCommissionData, mergedOptions.autoRefresh, isStale]);

  // Memoized computed values
  const computedData = useMemo(() => {
    if (!data) return null;

    // Add additional computed metrics
    const totalTransactions = data.serviceBreakdown.reduce((sum, service) => sum + service.count, 0);
    const averageTransactionValue = totalTransactions > 0 
      ? data.summary.totalCommissions / totalTransactions 
      : 0;

    const topPerformingTier = data.tierBreakdown.reduce(
      (max, tier) => tier.totalCommission > max.totalCommission ? tier : max,
      data.tierBreakdown[0] || { tier: 'none', totalCommission: 0 }
    );

    const topPerformingService = data.serviceBreakdown.reduce(
      (max, service) => service.totalCommission > max.totalCommission ? service : max,
      data.serviceBreakdown[0] || { serviceType: 'none', totalCommission: 0 }
    );

    // Commission efficiency metrics
    const commissionEfficiency = data.tierBreakdown.map(tier => ({
      tier: tier.tier,
      efficiency: tier.captainCount > 0 ? tier.totalCommission / tier.captainCount : 0
    }));

    return {
      ...data,
      computed: {
        totalTransactions,
        averageTransactionValue,
        topPerformingTier,
        topPerformingService,
        commissionEfficiency,
        payoutCompletionRate: data.payoutHistory.length > 0
          ? (data.payoutHistory.filter(p => p.status === 'completed').length / data.payoutHistory.length) * 100
          : 0,
        pendingPayoutAmount: data.payoutHistory
          .filter(p => p.status === 'pending')
          .reduce((sum, p) => sum + p.totalAmount, 0)
      }
    };
  }, [data]);

  return {
    data: computedData,
    loading,
    error,
    refresh: fetchCommissionData,
    updateDateRange,
    updateFilters,
    exportData,
    lastUpdated,
    retryCount,
    isStale
  };
}

export default useCommissionAnalytics;
