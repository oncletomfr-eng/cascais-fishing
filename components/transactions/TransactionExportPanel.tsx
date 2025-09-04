/**
 * Transaction Export Panel Component
 * Task 7.6: Export Integration & Reporting
 * 
 * Integrates transaction management with existing DataExportReporting system
 * providing transaction-specific export options and reporting features
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Divider,
  Stack,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Switch,
  FormControlLabel,
  FormGroup,
  Checkbox,
  Grid,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Visibility as VisibilityIcon,
  SelectAll as SelectAllIcon,
  FilterList as FilterListIcon,
  DateRange as DateRangeIcon,
  Assessment as ReportIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Share as ShareIcon,
  Email as EmailIcon,
  Cloud as CloudIcon,
  GetApp as GetAppIcon
} from '@mui/icons-material';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Transaction } from './TransactionManagement';
import { TransactionFilters } from './TransactionFiltersPanel';

// Export interfaces
export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  dataType: 'transactions' | 'summary' | 'detailed';
  includeDetails: boolean;
  includeCharts: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: {
    status?: string[];
    paymentMethods?: string[];
    minAmount?: number;
    maxAmount?: number;
    customerSearch?: string;
    transactionIdSearch?: string;
  };
  groupBy?: 'day' | 'week' | 'month' | 'year';
  selectedTransactionIds?: string[];
  exportScope: 'all' | 'filtered' | 'visible' | 'selected';
}

export interface ExportProgress {
  id: string;
  status: 'preparing' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalRecords?: number;
  processedRecords?: number;
  downloadUrl?: string;
  filename?: string;
  error?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'pdf' | 'excel';
  filters: ExportOptions;
  lastRun?: Date;
  nextRun: Date;
  isActive: boolean;
  recipients: string[];
}

interface TransactionExportPanelProps {
  transactions: Transaction[];
  selectedTransactions: Transaction[];
  appliedFilters: TransactionFilters;
  visibleTransactionIds: string[];
  onExport?: (options: ExportOptions) => Promise<void>;
  className?: string;
}

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`export-tabpanel-${index}`}
      aria-labelledby={`export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export function TransactionExportPanel({
  transactions,
  selectedTransactions,
  appliedFilters,
  visibleTransactionIds,
  onExport,
  className = ''
}: TransactionExportPanelProps) {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [exportDialog, setExportDialog] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [quickExportMenuAnchor, setQuickExportMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Export options state
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'excel'>('csv');
  const [exportDataType, setExportDataType] = useState<'transactions' | 'summary' | 'detailed'>('transactions');
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'visible' | 'selected'>('filtered');
  const [includeDetails, setIncludeDetails] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [customDateRange, setCustomDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  // Calculate export statistics
  const exportStats = useMemo(() => {
    let targetTransactions: Transaction[] = [];
    
    switch (exportScope) {
      case 'all':
        targetTransactions = transactions;
        break;
      case 'selected':
        targetTransactions = selectedTransactions;
        break;
      case 'visible':
        targetTransactions = transactions.filter(t => visibleTransactionIds.includes(t.id));
        break;
      case 'filtered':
      default:
        // Apply current filters to determine filtered transactions
        targetTransactions = transactions; // TODO: Apply actual filtering logic
        break;
    }

    const totalAmount = targetTransactions.reduce((sum, t) => sum + t.amount, 0);
    const avgAmount = targetTransactions.length > 0 ? totalAmount / targetTransactions.length : 0;
    
    const statusCounts = targetTransactions.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      count: targetTransactions.length,
      totalAmount,
      avgAmount,
      statusCounts,
      dateRange: {
        start: targetTransactions.length > 0 
          ? new Date(Math.min(...targetTransactions.map(t => new Date(t.date).getTime())))
          : new Date(),
        end: targetTransactions.length > 0 
          ? new Date(Math.max(...targetTransactions.map(t => new Date(t.date).getTime())))
          : new Date()
      }
    };
  }, [transactions, selectedTransactions, visibleTransactionIds, exportScope]);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Handle quick export menu
  const handleQuickExportMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setQuickExportMenuAnchor(event.currentTarget);
  }, []);

  const closeQuickExportMenu = useCallback(() => {
    setQuickExportMenuAnchor(null);
  }, []);

  // Quick export handlers
  const handleQuickExport = useCallback(async (format: 'csv' | 'pdf' | 'excel', scope: ExportOptions['exportScope']) => {
    const options: ExportOptions = {
      format,
      dataType: 'transactions',
      includeDetails: scope === 'selected' || scope === 'visible',
      includeCharts: false,
      dateRange: {
        start: exportStats.dateRange.start,
        end: exportStats.dateRange.end
      },
      exportScope: scope,
      selectedTransactionIds: scope === 'selected' ? selectedTransactions.map(t => t.id) : undefined,
      filters: appliedFilters
    };

    try {
      await executeExport(options);
      closeQuickExportMenu();
    } catch (error) {
      console.error('Quick export failed:', error);
      toast.error('Export failed');
    }
  }, [exportStats, selectedTransactions, appliedFilters]);

  // Execute export
  const executeExport = useCallback(async (options: ExportOptions) => {
    try {
      setExportProgress({
        id: `export_${Date.now()}`,
        status: 'preparing',
        progress: 0
      });

      // Call the export API
      const response = await fetch('/api/data-export/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: options.format,
          dataType: options.dataType === 'transactions' ? 'payments' : options.dataType,
          dateRange: {
            start: options.dateRange.start.toISOString(),
            end: options.dateRange.end.toISOString()
          },
          includeDetails: options.includeDetails,
          includeCharts: options.includeCharts,
          groupBy: options.groupBy || 'day',
          filters: {
            status: options.filters?.status,
            paymentMethods: options.filters?.paymentMethods,
            minAmount: options.filters?.minAmount,
            maxAmount: options.filters?.maxAmount
          },
          selectedTransactionIds: options.selectedTransactionIds
        })
      });

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      // Update progress
      setExportProgress(prev => prev ? {
        ...prev,
        status: 'processing',
        progress: 50
      } : null);

      // Get the file blob
      const blob = await response.blob();
      const totalRecords = parseInt(response.headers.get('X-Export-Records') || '0');
      
      // Create download URL
      const downloadUrl = URL.createObjectURL(blob);
      const contentDisposition = response.headers.get('Content-Disposition') || '';
      const filename = contentDisposition.match(/filename="([^"]+)"/)?.[1] || `export.${options.format}`;

      // Complete export
      setExportProgress({
        id: `export_${Date.now()}`,
        status: 'completed',
        progress: 100,
        totalRecords,
        processedRecords: totalRecords,
        downloadUrl,
        filename
      });

      // Trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
        setExportProgress(null);
      }, 5000);

      toast.success(`Export completed: ${filename}`);
      onExport?.(options);

    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(prev => prev ? {
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      } : null);
      toast.error('Export failed');
    }
  }, [onExport]);

  // Handle advanced export
  const handleAdvancedExport = useCallback(() => {
    const options: ExportOptions = {
      format: exportFormat,
      dataType: exportDataType,
      includeDetails,
      includeCharts,
      dateRange: {
        start: new Date(customDateRange.start),
        end: new Date(customDateRange.end)
      },
      exportScope,
      groupBy,
      selectedTransactionIds: exportScope === 'selected' ? selectedTransactions.map(t => t.id) : undefined,
      filters: appliedFilters
    };

    executeExport(options);
    setExportDialog(false);
  }, [
    exportFormat, 
    exportDataType, 
    includeDetails, 
    includeCharts, 
    customDateRange, 
    exportScope, 
    groupBy, 
    selectedTransactions, 
    appliedFilters, 
    executeExport
  ]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  }, []);

  // Get format icon
  const getFormatIcon = useCallback((format: string) => {
    switch (format) {
      case 'csv': return <CsvIcon />;
      case 'pdf': return <PdfIcon />;
      case 'excel': return <ExcelIcon />;
      default: return <FileDownloadIcon />;
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DownloadIcon color="primary" />
              <Typography variant="h6">Transaction Export</Typography>
            </Box>
          }
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleQuickExportMenu}
                size="small"
              >
                Quick Export
              </Button>
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => setExportDialog(true)}
                size="small"
              >
                Advanced
              </Button>
            </Stack>
          }
        />

        <CardContent>
          {/* Export Statistics */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Export Preview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="primary">
                    {exportStats.count.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Transactions
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(exportStats.totalAmount)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Amount
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="info.main">
                    {formatCurrency(exportStats.avgAmount)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Average Amount
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h6" color="warning.main">
                    {Object.keys(exportStats.statusCounts).length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Status Types
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Box>

          {/* Export Progress */}
          <AnimatePresence>
            {exportProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert
                  severity={
                    exportProgress.status === 'completed' ? 'success' :
                    exportProgress.status === 'failed' ? 'error' : 'info'
                  }
                  sx={{ mb: 2 }}
                  action={
                    exportProgress.downloadUrl && (
                      <Button
                        size="small"
                        startIcon={<GetAppIcon />}
                        href={exportProgress.downloadUrl}
                        download={exportProgress.filename}
                      >
                        Download
                      </Button>
                    )
                  }
                >
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">
                        Export {exportProgress.status}
                      </Typography>
                      {exportProgress.totalRecords && (
                        <Typography variant="body2">
                          {exportProgress.processedRecords || 0} / {exportProgress.totalRecords} records
                        </Typography>
                      )}
                    </Box>
                    
                    {exportProgress.status !== 'completed' && exportProgress.status !== 'failed' && (
                      <LinearProgress
                        variant="determinate"
                        value={exportProgress.progress}
                        sx={{ mb: 1 }}
                      />
                    )}
                    
                    {exportProgress.error && (
                      <Typography variant="body2" color="error.main">
                        Error: {exportProgress.error}
                      </Typography>
                    )}
                  </Box>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Export Scope Selector */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Export Scope
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip
                label={`All (${transactions.length})`}
                variant={exportScope === 'all' ? 'filled' : 'outlined'}
                onClick={() => setExportScope('all')}
                clickable
              />
              <Chip
                label={`Filtered (${exportStats.count})`}
                variant={exportScope === 'filtered' ? 'filled' : 'outlined'}
                onClick={() => setExportScope('filtered')}
                clickable
              />
              <Chip
                label={`Visible (${visibleTransactionIds.length})`}
                variant={exportScope === 'visible' ? 'filled' : 'outlined'}
                onClick={() => setExportScope('visible')}
                clickable
              />
              <Chip
                label={`Selected (${selectedTransactions.length})`}
                variant={exportScope === 'selected' ? 'filled' : 'outlined'}
                onClick={() => setExportScope('selected')}
                clickable
                disabled={selectedTransactions.length === 0}
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Quick Export Menu */}
      <Menu
        anchorEl={quickExportMenuAnchor}
        open={Boolean(quickExportMenuAnchor)}
        onClose={closeQuickExportMenu}
      >
        <MenuItem onClick={() => handleQuickExport('csv', exportScope)}>
          <ListItemIcon><CsvIcon /></ListItemIcon>
          <ListItemText primary="Export to CSV" />
        </MenuItem>
        <MenuItem onClick={() => handleQuickExport('excel', exportScope)}>
          <ListItemIcon><ExcelIcon /></ListItemIcon>
          <ListItemText primary="Export to Excel" />
        </MenuItem>
        <MenuItem onClick={() => handleQuickExport('pdf', exportScope)}>
          <ListItemIcon><PdfIcon /></ListItemIcon>
          <ListItemText primary="Export to PDF" />
        </MenuItem>
      </Menu>

      {/* Advanced Export Dialog */}
      <Dialog
        open={exportDialog}
        onClose={() => setExportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Advanced Export Options</Typography>
            <IconButton onClick={() => setExportDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label="Format & Scope" />
              <Tab label="Data Options" />
              <Tab label="Filters & Grouping" />
            </Tabs>
          </Box>

          {/* Format & Scope Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Export Format</InputLabel>
                  <Select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as any)}
                    label="Export Format"
                  >
                    <MenuItem value="csv">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CsvIcon /> CSV (Comma Separated Values)
                      </Box>
                    </MenuItem>
                    <MenuItem value="excel">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ExcelIcon /> Excel (XLSX)
                      </Box>
                    </MenuItem>
                    <MenuItem value="pdf">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PdfIcon /> PDF (Portable Document)
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Data Type</InputLabel>
                  <Select
                    value={exportDataType}
                    onChange={(e) => setExportDataType(e.target.value as any)}
                    label="Data Type"
                  >
                    <MenuItem value="transactions">Transaction Details</MenuItem>
                    <MenuItem value="summary">Summary Report</MenuItem>
                    <MenuItem value="detailed">Detailed Analysis</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Export Scope
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    label={`All Transactions (${transactions.length})`}
                    variant={exportScope === 'all' ? 'filled' : 'outlined'}
                    onClick={() => setExportScope('all')}
                    clickable
                  />
                  <Chip
                    label={`Current Filter (${exportStats.count})`}
                    variant={exportScope === 'filtered' ? 'filled' : 'outlined'}
                    onClick={() => setExportScope('filtered')}
                    clickable
                  />
                  <Chip
                    label={`Visible Rows (${visibleTransactionIds.length})`}
                    variant={exportScope === 'visible' ? 'filled' : 'outlined'}
                    onClick={() => setExportScope('visible')}
                    clickable
                  />
                  <Chip
                    label={`Selected Rows (${selectedTransactions.length})`}
                    variant={exportScope === 'selected' ? 'filled' : 'outlined'}
                    onClick={() => setExportScope('selected')}
                    clickable
                    disabled={selectedTransactions.length === 0}
                  />
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Data Options Tab */}
          <TabPanel value={activeTab} index={1}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeDetails}
                        onChange={(e) => setIncludeDetails(e.target.checked)}
                      />
                    }
                    label="Include Detailed Transaction Information"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={includeCharts}
                        onChange={(e) => setIncludeCharts(e.target.checked)}
                      />
                    }
                    label="Include Charts and Visualizations (PDF only)"
                  />
                </FormGroup>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="End Date"
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Filters & Grouping Tab */}
          <TabPanel value={activeTab} index={2}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Group By</InputLabel>
                  <Select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as any)}
                    label="Group By"
                  >
                    <MenuItem value="day">Daily</MenuItem>
                    <MenuItem value="week">Weekly</MenuItem>
                    <MenuItem value="month">Monthly</MenuItem>
                    <MenuItem value="year">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info">
                  <Typography variant="body2">
                    Current filters and search parameters will be automatically applied to the export.
                  </Typography>
                </Alert>
              </Grid>
            </Grid>
          </TabPanel>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdvancedExport}
            variant="contained"
            startIcon={getFormatIcon(exportFormat)}
          >
            Export {exportFormat.toUpperCase()}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default TransactionExportPanel;
