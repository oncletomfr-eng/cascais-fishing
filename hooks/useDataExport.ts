/**
 * Data Export Hook
 * Task 6.4: Data Export & Reporting System
 * 
 * Hook for managing data export functionality, scheduled reports,
 * and export history with comprehensive error handling and progress tracking
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';

// Import types from the component
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  dataType: 'payments' | 'earnings' | 'commissions' | 'all';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeDetails: boolean;
  includeCharts: boolean;
  groupBy?: 'day' | 'week' | 'month' | 'year';
  filters?: {
    status?: string[];
    paymentMethods?: string[];
    captainTiers?: string[];
    serviceTypes?: string[];
    minAmount?: number;
    maxAmount?: number;
  };
}

export interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  format: 'csv' | 'pdf' | 'excel';
  dataType: 'payments' | 'earnings' | 'commissions' | 'all';
  recipients: string[];
  isActive: boolean;
  nextRun: Date;
  lastRun?: Date;
  createdAt: Date;
  options: ExportOptions;
}

export interface ExportHistory {
  id: string;
  filename: string;
  format: 'csv' | 'pdf' | 'excel';
  dataType: string;
  fileSize: number;
  recordCount: number;
  exportedAt: Date;
  downloadUrl?: string;
  status: 'processing' | 'completed' | 'failed' | 'expired';
  error?: string;
}

interface UseDataExportOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseDataExportReturn {
  // Export functionality
  exportData: (options: ExportOptions) => Promise<void>;
  isExporting: boolean;
  exportProgress: number;
  exportError: string | null;

  // Scheduled reports
  scheduledReports: ScheduledReport[];
  createScheduledReport: (report: Omit<ScheduledReport, 'id' | 'createdAt'>) => Promise<void>;
  updateScheduledReport: (id: string, updates: Partial<ScheduledReport>) => Promise<void>;
  deleteScheduledReport: (id: string) => Promise<void>;
  
  // Export history
  exportHistory: ExportHistory[];
  clearExportHistory: () => Promise<void>;
  downloadExport: (id: string) => Promise<void>;
  
  // General state
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const defaultOptions: UseDataExportOptions = {
  autoRefresh: true,
  refreshInterval: 30000 // 30 seconds
};

export function useDataExport(
  options: UseDataExportOptions = {}
): UseDataExportReturn {
  const mergedOptions = { ...defaultOptions, ...options };
  const { data: session } = useSession();

  // State
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportHistory[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch scheduled reports and export history
  const fetchData = useCallback(async () => {
    if (!session?.user) {
      setScheduledReports([]);
      setExportHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [reportsResponse, historyResponse] = await Promise.all([
        fetch('/api/data-export/scheduled-reports', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/data-export/history', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (!reportsResponse.ok) {
        throw new Error(`Failed to fetch scheduled reports: ${reportsResponse.statusText}`);
      }

      if (!historyResponse.ok) {
        throw new Error(`Failed to fetch export history: ${historyResponse.statusText}`);
      }

      const [reportsData, historyData] = await Promise.all([
        reportsResponse.json(),
        historyResponse.json()
      ]);

      // Transform dates
      const transformedReports = reportsData.map((report: any) => ({
        ...report,
        nextRun: new Date(report.nextRun),
        lastRun: report.lastRun ? new Date(report.lastRun) : undefined,
        createdAt: new Date(report.createdAt),
        options: {
          ...report.options,
          dateRange: {
            start: new Date(report.options.dateRange.start),
            end: new Date(report.options.dateRange.end)
          }
        }
      }));

      const transformedHistory = historyData.map((item: any) => ({
        ...item,
        exportedAt: new Date(item.exportedAt)
      }));

      setScheduledReports(transformedReports);
      setExportHistory(transformedHistory);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      console.error('Data export fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // Export data function
  const exportData = useCallback(async (exportOptions: ExportOptions) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportError(null);

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 800);

      const response = await fetch('/api/data-export/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...exportOptions,
          dateRange: {
            start: exportOptions.dateRange.start.toISOString(),
            end: exportOptions.dateRange.end.toISOString()
          }
        })
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed: ${response.statusText}`);
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // JSON response with download URL or processing info
        const data = await response.json();
        setExportProgress(100);
        
        if (data.downloadUrl) {
          // Immediate download
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = data.filename || `export-${Date.now()}.${exportOptions.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Direct file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Extract filename from content-disposition header or create default
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition
          ? contentDisposition.split('filename=')[1]?.replace(/['"]/g, '')
          : `export-${Date.now()}.${exportOptions.format}`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setExportProgress(100);
      }

      // Refresh history after successful export
      setTimeout(() => {
        fetchData();
        setExportProgress(0);
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Export failed';
      setExportError(errorMessage);
      setExportProgress(0);
      throw err;
    } finally {
      setIsExporting(false);
    }
  }, [session?.user, fetchData]);

  // Create scheduled report
  const createScheduledReport = useCallback(async (report: Omit<ScheduledReport, 'id' | 'createdAt'>) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch('/api/data-export/scheduled-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...report,
          options: {
            ...report.options,
            dateRange: {
              start: report.options.dateRange.start.toISOString(),
              end: report.options.dateRange.end.toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create scheduled report');
      }

      const newReport = await response.json();
      
      // Transform dates and add to state
      const transformedReport = {
        ...newReport,
        nextRun: new Date(newReport.nextRun),
        lastRun: newReport.lastRun ? new Date(newReport.lastRun) : undefined,
        createdAt: new Date(newReport.createdAt),
        options: {
          ...newReport.options,
          dateRange: {
            start: new Date(newReport.options.dateRange.start),
            end: new Date(newReport.options.dateRange.end)
          }
        }
      };

      setScheduledReports(prev => [...prev, transformedReport]);
    } catch (err) {
      console.error('Create scheduled report error:', err);
      throw err;
    }
  }, [session?.user]);

  // Update scheduled report
  const updateScheduledReport = useCallback(async (id: string, updates: Partial<ScheduledReport>) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`/api/data-export/scheduled-reports/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update scheduled report');
      }

      const updatedReport = await response.json();
      
      setScheduledReports(prev => prev.map(report => 
        report.id === id 
          ? {
              ...updatedReport,
              nextRun: new Date(updatedReport.nextRun),
              lastRun: updatedReport.lastRun ? new Date(updatedReport.lastRun) : undefined,
              createdAt: new Date(updatedReport.createdAt),
              options: {
                ...updatedReport.options,
                dateRange: {
                  start: new Date(updatedReport.options.dateRange.start),
                  end: new Date(updatedReport.options.dateRange.end)
                }
              }
            }
          : report
      ));
    } catch (err) {
      console.error('Update scheduled report error:', err);
      throw err;
    }
  }, [session?.user]);

  // Delete scheduled report
  const deleteScheduledReport = useCallback(async (id: string) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`/api/data-export/scheduled-reports/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete scheduled report');
      }

      setScheduledReports(prev => prev.filter(report => report.id !== id));
    } catch (err) {
      console.error('Delete scheduled report error:', err);
      throw err;
    }
  }, [session?.user]);

  // Clear export history
  const clearExportHistory = useCallback(async () => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch('/api/data-export/history', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to clear export history');
      }

      setExportHistory([]);
    } catch (err) {
      console.error('Clear export history error:', err);
      throw err;
    }
  }, [session?.user]);

  // Download export
  const downloadExport = useCallback(async (id: string) => {
    if (!session?.user) {
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`/api/data-export/download/${id}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from export history
      const exportItem = exportHistory.find(item => item.id === id);
      link.download = exportItem?.filename || `export-${id}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download export error:', err);
      throw err;
    }
  }, [session?.user, exportHistory]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!mergedOptions.autoRefresh || !mergedOptions.refreshInterval) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, mergedOptions.refreshInterval);

    return () => clearInterval(interval);
  }, [fetchData, mergedOptions.autoRefresh, mergedOptions.refreshInterval]);

  // Refresh data when browser tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mergedOptions.autoRefresh) {
        fetchData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, mergedOptions.autoRefresh]);

  return {
    // Export functionality
    exportData,
    isExporting,
    exportProgress,
    exportError,

    // Scheduled reports
    scheduledReports,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
    
    // Export history
    exportHistory,
    clearExportHistory,
    downloadExport,
    
    // General state
    loading,
    error,
    refresh: fetchData,
    lastUpdated
  };
}

export default useDataExport;
