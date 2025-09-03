/**
 * Data Export & Reporting System Component
 * Task 6.4: Data Export & Reporting System
 * 
 * Comprehensive data export functionality for payments, earnings, and tax reporting
 * Supports CSV, PDF, and Excel exports with scheduled report generation
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
  Calendar as CalendarIcon,
  Clock,
  Mail,
  Send,
  RefreshCw,
  Settings2,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  FileDown,
  Archive,
  Zap,
  BarChart3,
  PieChart,
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  Receipt,
  BookOpen,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit,
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';

// Types for export functionality
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

interface DataExportReportingProps {
  onExport?: (options: ExportOptions) => Promise<void>;
  scheduledReports?: ScheduledReport[];
  exportHistory?: ExportHistory[];
  onScheduleReport?: (report: Omit<ScheduledReport, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateScheduledReport?: (id: string, updates: Partial<ScheduledReport>) => Promise<void>;
  onDeleteScheduledReport?: (id: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

const defaultDateRange = {
  start: subMonths(new Date(), 1),
  end: new Date()
};

// Available data types for export
const dataTypes = [
  { value: 'payments', label: 'Payment Transactions', icon: CreditCard, description: 'All payment records and transactions' },
  { value: 'earnings', label: 'Earnings Data', icon: DollarSign, description: 'Revenue and earnings analytics' },
  { value: 'commissions', label: 'Commission Reports', icon: PieChart, description: 'Commission breakdowns and calculations' },
  { value: 'all', label: 'Complete Dataset', icon: Archive, description: 'All data combined in separate sheets' }
];

// Export formats with capabilities
const exportFormats = [
  { 
    value: 'csv', 
    label: 'CSV', 
    icon: FileText, 
    description: 'Comma-separated values for spreadsheet apps',
    supports: ['data'],
    maxRecords: 100000
  },
  { 
    value: 'excel', 
    label: 'Excel', 
    icon: FileSpreadsheet, 
    description: 'Excel workbook with formatted sheets and charts',
    supports: ['data', 'charts', 'formatting'],
    maxRecords: 50000
  },
  { 
    value: 'pdf', 
    label: 'PDF', 
    icon: FileDown, 
    description: 'Professional report with charts and summaries',
    supports: ['data', 'charts', 'formatting', 'branding'],
    maxRecords: 10000
  }
];

// Frequency options for scheduled reports
const frequencyOptions = [
  { value: 'daily', label: 'Daily', description: 'Every day at 8:00 AM' },
  { value: 'weekly', label: 'Weekly', description: 'Every Monday at 8:00 AM' },
  { value: 'monthly', label: 'Monthly', description: 'First day of each month' },
  { value: 'quarterly', label: 'Quarterly', description: 'First day of each quarter' }
];

export function DataExportReporting({
  onExport,
  scheduledReports = [],
  exportHistory = [],
  onScheduleReport,
  onUpdateScheduledReport,
  onDeleteScheduledReport,
  loading = false,
  className = ''
}: DataExportReportingProps) {
  // State management
  const [activeTab, setActiveTab] = useState('export');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dataType: 'payments',
    dateRange: defaultDateRange,
    includeDetails: true,
    includeCharts: false,
    groupBy: 'day'
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Scheduled report form state
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState<Partial<ScheduledReport>>({
    name: '',
    description: '',
    frequency: 'monthly',
    format: 'pdf',
    dataType: 'all',
    recipients: [],
    isActive: true,
    options: exportOptions
  });
  
  // Filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    paymentMethods: [],
    captainTiers: [],
    serviceTypes: [],
    minAmount: '',
    maxAmount: ''
  });

  // Handle export option changes
  const updateExportOptions = useCallback((updates: Partial<ExportOptions>) => {
    setExportOptions(prev => ({
      ...prev,
      ...updates,
      ...(updates.filters && { filters: { ...prev.filters, ...updates.filters } })
    }));
  }, []);

  // Handle export execution
  const handleExport = useCallback(async () => {
    if (!onExport) return;

    try {
      setIsExporting(true);
      setExportProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);

      await onExport({
        ...exportOptions,
        ...(showAdvancedFilters && { filters }),
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      toast.success('Export completed successfully!', {
        description: `${exportOptions.dataType} data exported as ${exportOptions.format.toUpperCase()}`
      });

    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  }, [exportOptions, filters, showAdvancedFilters, onExport]);

  // Handle scheduled report creation
  const handleScheduleReport = useCallback(async () => {
    if (!onScheduleReport || !scheduleForm.name) return;

    try {
      await onScheduleReport({
        ...scheduleForm as Omit<ScheduledReport, 'id' | 'createdAt'>,
        nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        options: { ...exportOptions, ...(showAdvancedFilters && { filters }) }
      });

      setShowScheduleForm(false);
      setScheduleForm({
        name: '',
        description: '',
        frequency: 'monthly',
        format: 'pdf',
        dataType: 'all',
        recipients: [],
        isActive: true,
        options: exportOptions
      });

      toast.success('Scheduled report created successfully!');
    } catch (error) {
      toast.error('Failed to create scheduled report');
    }
  }, [scheduleForm, exportOptions, filters, showAdvancedFilters, onScheduleReport]);

  // Get estimated record count and file size
  const estimatedMetrics = useMemo(() => {
    const daysDiff = Math.ceil(
      (exportOptions.dateRange.end.getTime() - exportOptions.dateRange.start.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    
    // Rough estimates based on data type and date range
    let baseRecords = 0;
    switch (exportOptions.dataType) {
      case 'payments': baseRecords = daysDiff * 15; break;
      case 'earnings': baseRecords = daysDiff * 3; break;
      case 'commissions': baseRecords = daysDiff * 8; break;
      case 'all': baseRecords = daysDiff * 26; break;
    }

    // Apply grouping factor
    const groupingFactor = {
      'day': 1,
      'week': 0.14,
      'month': 0.03,
      'year': 0.003
    }[exportOptions.groupBy || 'day'];

    const estimatedRecords = Math.max(1, Math.floor(baseRecords * groupingFactor));
    
    // Estimate file size based on format
    let bytesPerRecord = 150; // Base CSV
    if (exportOptions.format === 'excel') bytesPerRecord = 200;
    if (exportOptions.format === 'pdf') bytesPerRecord = 300;
    if (exportOptions.includeDetails) bytesPerRecord *= 1.5;
    if (exportOptions.includeCharts) bytesPerRecord *= 1.2;

    const estimatedSize = estimatedRecords * bytesPerRecord;

    return {
      records: estimatedRecords,
      size: estimatedSize,
      sizeFormatted: formatFileSize(estimatedSize)
    };
  }, [exportOptions]);

  // Format file size helper
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Quick date range selections
  const quickRanges = [
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', custom: () => ({ start: startOfMonth(new Date()), end: new Date() }) },
    { label: 'Last Month', custom: () => ({ 
      start: startOfMonth(subMonths(new Date(), 1)), 
      end: endOfMonth(subMonths(new Date(), 1)) 
    }) },
    { label: 'Last 90 Days', days: 90 },
    { label: 'This Year', custom: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }) }
  ];

  const selectQuickRange = useCallback((range: typeof quickRanges[0]) => {
    if (range.custom) {
      const customRange = range.custom();
      updateExportOptions({ dateRange: customRange });
    } else if (range.days) {
      const end = new Date();
      const start = subDays(end, range.days);
      updateExportOptions({ dateRange: { start, end } });
    }
  }, [updateExportOptions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Data Export & Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Export payment data and schedule automated reports
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => setShowScheduleForm(true)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Schedule Report
          </Button>
        </div>
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Data
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Scheduled Reports
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Export History
          </TabsTrigger>
        </TabsList>

        {/* Export Data Tab */}
        <TabsContent value="export" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Export Configuration */}
            <div className="lg:col-span-2 space-y-6">
              {/* Data Type Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Data Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dataTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <div
                          key={type.value}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            exportOptions.dataType === type.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                          onClick={() => updateExportOptions({ dataType: type.value as any })}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5 text-blue-600" />
                            <div>
                              <div className="font-medium">{type.label}</div>
                              <div className="text-sm text-gray-500">{type.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Format Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Format</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {exportFormats.map((format) => {
                      const Icon = format.icon;
                      return (
                        <div
                          key={format.value}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            exportOptions.format === format.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                          onClick={() => updateExportOptions({ format: format.value as any })}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5 text-blue-600" />
                              <div>
                                <div className="font-medium">{format.label}</div>
                                <div className="text-sm text-gray-500">{format.description}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                Max: {format.maxRecords.toLocaleString()} records
                              </div>
                              <div className="text-xs text-gray-500">
                                {format.supports.join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Date Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Date Range</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Quick selections */}
                    <div className="flex flex-wrap gap-2">
                      {quickRanges.map((range) => (
                        <Button
                          key={range.label}
                          variant="outline"
                          size="sm"
                          onClick={() => selectQuickRange(range)}
                        >
                          {range.label}
                        </Button>
                      ))}
                    </div>

                    {/* Custom date picker */}
                    <div className="flex gap-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[200px] justify-start">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {format(exportOptions.dateRange.start, 'MMM dd, yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={exportOptions.dateRange.start}
                            onSelect={(date) => date && updateExportOptions({
                              dateRange: { ...exportOptions.dateRange, start: date }
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <span className="flex items-center text-gray-500">to</span>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[200px] justify-start">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {format(exportOptions.dateRange.end, 'MMM dd, yyyy')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={exportOptions.dateRange.end}
                            onSelect={(date) => date && updateExportOptions({
                              dateRange: { ...exportOptions.dateRange, end: date }
                            })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Options */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="include-details">Include Detailed Data</Label>
                        <p className="text-sm text-gray-500">Export all fields and transaction details</p>
                      </div>
                      <Switch
                        id="include-details"
                        checked={exportOptions.includeDetails}
                        onCheckedChange={(checked) => updateExportOptions({ includeDetails: checked })}
                      />
                    </div>

                    {exportOptions.format !== 'csv' && (
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="include-charts">Include Charts</Label>
                          <p className="text-sm text-gray-500">Add visualizations to the report</p>
                        </div>
                        <Switch
                          id="include-charts"
                          checked={exportOptions.includeCharts}
                          onCheckedChange={(checked) => updateExportOptions({ includeCharts: checked })}
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="group-by">Group Data By</Label>
                      <Select
                        value={exportOptions.groupBy}
                        onValueChange={(value) => updateExportOptions({ groupBy: value as any })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Daily</SelectItem>
                          <SelectItem value="week">Weekly</SelectItem>
                          <SelectItem value="month">Monthly</SelectItem>
                          <SelectItem value="year">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Advanced Filters Toggle */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center gap-2"
                      >
                        <Filter className="w-4 h-4" />
                        Advanced Filters
                        {showAdvancedFilters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>

                    {/* Advanced Filters */}
                    {showAdvancedFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 pt-4 border-t"
                      >
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Min Amount</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={filters.minAmount}
                              onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Max Amount</Label>
                            <Input
                              type="number"
                              placeholder="10000.00"
                              value={filters.maxAmount}
                              onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Summary & Action */}
            <div className="space-y-6">
              {/* Export Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Export Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Format:</span>
                        <Badge variant="secondary">{exportOptions.format.toUpperCase()}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Data Type:</span>
                        <span className="capitalize">{exportOptions.dataType}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Period:</span>
                        <span>
                          {Math.ceil((exportOptions.dateRange.end.getTime() - exportOptions.dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Est. Records:</span>
                        <span>{estimatedMetrics.records.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Est. Size:</span>
                        <span>{estimatedMetrics.sizeFormatted}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Export Progress */}
                    {isExporting && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Exporting...</span>
                          <span>{Math.round(exportProgress)}%</span>
                        </div>
                        <Progress value={exportProgress} />
                      </div>
                    )}

                    {/* Export Button */}
                    <Button
                      onClick={handleExport}
                      disabled={isExporting || loading}
                      className="w-full"
                      size="lg"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Export Data
                        </>
                      )}
                    </Button>

                    {/* Warnings */}
                    {estimatedMetrics.records > 50000 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Large export detected. Consider using filters to reduce data size.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Scheduled Reports Tab */}
        <TabsContent value="scheduled" className="mt-6">
          <div className="space-y-6">
            {scheduledReports.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Scheduled Reports
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                    Create automated reports to be delivered on a regular schedule
                  </p>
                  <Button onClick={() => setShowScheduleForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Your First Report
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scheduledReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{report.name}</CardTitle>
                        <Badge variant={report.isActive ? 'default' : 'secondary'}>
                          {report.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600">{report.description}</p>
                        
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Frequency:</span>
                            <span className="capitalize">{report.frequency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Format:</span>
                            <Badge variant="outline" className="text-xs">
                              {report.format.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Next Run:</span>
                            <span>{format(report.nextRun, 'MMM dd, HH:mm')}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateScheduledReport?.(report.id, { isActive: !report.isActive })}
                          >
                            {report.isActive ? 'Pause' : 'Resume'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteScheduledReport?.(report.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Export History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Export History</CardTitle>
            </CardHeader>
            <CardContent>
              {exportHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No export history available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exportHistory.map((export_) => (
                    <div key={export_.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          export_.status === 'completed' ? 'bg-green-100 text-green-600' :
                          export_.status === 'processing' ? 'bg-blue-100 text-blue-600' :
                          export_.status === 'failed' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {export_.status === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                           export_.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                           export_.status === 'failed' ? <AlertTriangle className="w-5 h-5" /> :
                           <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="font-medium">{export_.filename}</div>
                          <div className="text-sm text-gray-500">
                            {export_.recordCount.toLocaleString()} records • {formatFileSize(export_.fileSize)} • {format(export_.exportedAt, 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {export_.status === 'completed' && export_.downloadUrl && (
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Schedule Report Modal */}
      {showScheduleForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Schedule New Report</h3>
              
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="report-name">Report Name</Label>
                    <Input
                      id="report-name"
                      placeholder="Monthly Revenue Report"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={scheduleForm.frequency}
                      onValueChange={(value) => setScheduleForm(prev => ({ ...prev, frequency: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this report..."
                    value={scheduleForm.description}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipients">Email Recipients</Label>
                  <Input
                    id="recipients"
                    placeholder="email1@example.com, email2@example.com"
                    onChange={(e) => setScheduleForm(prev => ({ 
                      ...prev, 
                      recipients: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                    }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleScheduleReport}
                  disabled={!scheduleForm.name}
                >
                  Schedule Report
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default DataExportReporting;
