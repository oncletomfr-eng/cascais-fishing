/**
 * Transaction Advanced Filters Panel
 * Task 7.2: Advanced Filtering System
 * 
 * Comprehensive filtering interface with multiple filter types,
 * date ranges, filter presets, and URL-based filter sharing
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Button,
  TextField,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Slider,
  Divider,
  Stack,
  Paper,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  Badge,
  Autocomplete
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  CreditCard as CreditCardIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Bookmark as BookmarkIcon,
  Share as ShareIcon,
  Link as LinkIcon
} from '@mui/icons-material';
// Note: Using standard HTML date inputs instead of @mui/x-date-pickers to avoid additional dependencies
import { format, subDays, subMonths, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { toast } from 'sonner';

// Filter interfaces
export interface DateRangeFilter {
  start: Date | null;
  end: Date | null;
  preset?: string;
}

export interface AmountRangeFilter {
  min: number | null;
  max: number | null;
}

export interface TransactionFilters {
  status: string[];
  type: string[];
  paymentMethod: string[];
  dateRange: DateRangeFilter;
  amountRange: AmountRangeFilter;
  customerSearch: string;
  transactionIdSearch: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: TransactionFilters;
  isDefault: boolean;
  createdAt: Date;
  userId: string;
}

interface TransactionFiltersPanelProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onPresetSave?: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'userId'>) => void;
  onPresetLoad?: (preset: FilterPreset) => void;
  onPresetDelete?: (presetId: string) => void;
  presets?: FilterPreset[];
  loading?: boolean;
  className?: string;
}

// Filter options configuration
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: '#ff9800', icon: ScheduleIcon },
  { value: 'completed', label: 'Completed', color: '#4caf50', icon: CheckCircleIcon },
  { value: 'failed', label: 'Failed', color: '#f44336', icon: ErrorIcon },
  { value: 'cancelled', label: 'Cancelled', color: '#9e9e9e', icon: CancelIcon },
  { value: 'processing', label: 'Processing', color: '#2196f3', icon: ScheduleIcon },
  { value: 'refunded', label: 'Refunded', color: '#ff5722', icon: RestoreIcon }
];

const TYPE_OPTIONS = [
  { value: 'payment', label: 'Payment', icon: CreditCardIcon },
  { value: 'refund', label: 'Refund', icon: RestoreIcon },
  { value: 'dispute', label: 'Dispute', icon: ErrorIcon },
  { value: 'transfer', label: 'Transfer', icon: AssignmentIcon },
  { value: 'fee', label: 'Fee', icon: MoneyIcon }
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'crypto', label: 'Cryptocurrency' },
  { value: 'other', label: 'Other' }
];

// Date range presets
const DATE_PRESETS = [
  { key: 'today', label: 'Today', getValue: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { key: 'yesterday', label: 'Yesterday', getValue: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
  { key: 'last7days', label: 'Last 7 Days', getValue: () => ({ start: startOfDay(subDays(new Date(), 7)), end: endOfDay(new Date()) }) },
  { key: 'last30days', label: 'Last 30 Days', getValue: () => ({ start: startOfDay(subDays(new Date(), 30)), end: endOfDay(new Date()) }) },
  { key: 'thisWeek', label: 'This Week', getValue: () => ({ start: startOfWeek(new Date()), end: endOfWeek(new Date()) }) },
  { key: 'thisMonth', label: 'This Month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { key: 'lastMonth', label: 'Last Month', getValue: () => ({ 
    start: startOfMonth(subMonths(new Date(), 1)), 
    end: endOfMonth(subMonths(new Date(), 1)) 
  }) },
  { key: 'thisQuarter', label: 'This Quarter', getValue: () => ({ start: startOfQuarter(new Date()), end: endOfQuarter(new Date()) }) },
  { key: 'thisYear', label: 'This Year', getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }) },
  { key: 'lastYear', label: 'Last Year', getValue: () => ({ 
    start: startOfYear(subYears(new Date(), 1)), 
    end: endOfYear(subYears(new Date(), 1)) 
  }) }
];

// Default filters
const DEFAULT_FILTERS: TransactionFilters = {
  status: [],
  type: [],
  paymentMethod: [],
  dateRange: { start: null, end: null },
  amountRange: { min: null, max: null },
  customerSearch: '',
  transactionIdSearch: ''
};

export function TransactionFiltersPanel({
  filters,
  onFiltersChange,
  onPresetSave,
  onPresetLoad,
  onPresetDelete,
  presets = [],
  loading = false,
  className = ''
}: TransactionFiltersPanelProps) {
  // Local state for UI
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count++;
    if (filters.type.length > 0) count++;
    if (filters.paymentMethod.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    if (filters.customerSearch.trim()) count++;
    if (filters.transactionIdSearch.trim()) count++;
    return count;
  }, [filters]);

  // Handle filter updates
  const updateFilters = useCallback((updates: Partial<TransactionFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  // Handle status filter change
  const handleStatusChange = useCallback((status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatuses });
  }, [filters.status, updateFilters]);

  // Handle type filter change
  const handleTypeChange = useCallback((type: string) => {
    const newTypes = filters.type.includes(type)
      ? filters.type.filter(t => t !== type)
      : [...filters.type, type];
    updateFilters({ type: newTypes });
  }, [filters.type, updateFilters]);

  // Handle payment method filter change
  const handlePaymentMethodChange = useCallback((method: string) => {
    const newMethods = filters.paymentMethod.includes(method)
      ? filters.paymentMethod.filter(m => m !== method)
      : [...filters.paymentMethod, method];
    updateFilters({ paymentMethod: newMethods });
  }, [filters.paymentMethod, updateFilters]);

  // Handle date preset selection
  const handleDatePreset = useCallback((presetKey: string) => {
    const preset = DATE_PRESETS.find(p => p.key === presetKey);
    if (preset) {
      const range = preset.getValue();
      updateFilters({ 
        dateRange: { 
          start: range.start, 
          end: range.end, 
          preset: presetKey 
        } 
      });
    }
  }, [updateFilters]);

  // Handle custom date change
  const handleDateChange = useCallback((field: 'start' | 'end', date: Date | null) => {
    updateFilters({ 
      dateRange: { 
        ...filters.dateRange, 
        [field]: date,
        preset: undefined // Clear preset when custom dates are set
      } 
    });
  }, [filters.dateRange, updateFilters]);

  // Handle amount range change
  const handleAmountRangeChange = useCallback((field: 'min' | 'max', value: number | null) => {
    updateFilters({ 
      amountRange: { 
        ...filters.amountRange, 
        [field]: value 
      } 
    });
  }, [filters.amountRange, updateFilters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    onFiltersChange(DEFAULT_FILTERS);
    toast.success('All filters cleared');
  }, [onFiltersChange]);

  // Save preset
  const savePreset = useCallback(() => {
    if (!presetName.trim() || !onPresetSave) return;

    onPresetSave({
      name: presetName.trim(),
      description: presetDescription.trim(),
      filters: filters,
      isDefault: false
    });

    setPresetName('');
    setPresetDescription('');
    setShowPresetForm(false);
    toast.success('Filter preset saved');
  }, [presetName, presetDescription, filters, onPresetSave]);

  // Load preset
  const loadPreset = useCallback((preset: FilterPreset) => {
    onPresetLoad?.(preset);
    toast.success(`Loaded preset: ${preset.name}`);
  }, [onPresetLoad]);

  // Delete preset
  const deletePreset = useCallback((presetId: string) => {
    onPresetDelete?.(presetId);
    toast.success('Preset deleted');
  }, [onPresetDelete]);

  // Generate shareable URL
  const generateShareableUrl = useCallback(() => {
    const params = new URLSearchParams();
    
    if (filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }
    if (filters.type.length > 0) {
      params.set('type', filters.type.join(','));
    }
    if (filters.paymentMethod.length > 0) {
      params.set('payment_method', filters.paymentMethod.join(','));
    }
    if (filters.dateRange.start) {
      params.set('date_from', filters.dateRange.start.toISOString());
    }
    if (filters.dateRange.end) {
      params.set('date_to', filters.dateRange.end.toISOString());
    }
    if (filters.amountRange.min !== null) {
      params.set('amount_min', filters.amountRange.min.toString());
    }
    if (filters.amountRange.max !== null) {
      params.set('amount_max', filters.amountRange.max.toString());
    }
    if (filters.customerSearch) {
      params.set('customer', filters.customerSearch);
    }
    if (filters.transactionIdSearch) {
      params.set('transaction_id', filters.transactionIdSearch);
    }

    const url = new URL(window.location.href);
    url.search = params.toString();
    
    navigator.clipboard.writeText(url.toString());
    toast.success('Shareable URL copied to clipboard');
  }, [filters]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
        <Card>
          <CardHeader 
            title={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <FilterListIcon />
                <Typography variant="h6">Advanced Filters</Typography>
                {activeFilterCount > 0 && (
                  <Badge badgeContent={activeFilterCount} color="primary">
                    <Chip label="Active" size="small" color="primary" />
                  </Badge>
                )}
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {activeFilterCount > 0 && (
                  <>
                    <Button
                      size="small"
                      startIcon={<ShareIcon />}
                      onClick={generateShareableUrl}
                      variant="outlined"
                    >
                      Share
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ClearIcon />}
                      onClick={clearAllFilters}
                      variant="outlined"
                      color="error"
                    >
                      Clear All
                    </Button>
                  </>
                )}
                <IconButton
                  onClick={() => setIsExpanded(!isExpanded)}
                  size="small"
                >
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            }
            sx={{ pb: 1 }}
          />

          <Collapse in={isExpanded}>
            <CardContent sx={{ pt: 0 }}>
              <Stack spacing={3} divider={<Divider />}>
                {/* Quick Search */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Quick Search</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Customer Name/Email"
                      value={filters.customerSearch}
                      onChange={(e) => updateFilters({ customerSearch: e.target.value })}
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Transaction ID"
                      value={filters.transactionIdSearch}
                      onChange={(e) => updateFilters({ transactionIdSearch: e.target.value })}
                      size="small"
                      fullWidth
                    />
                  </Stack>
                </Box>

                {/* Status Filters */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Status</Typography>
                  <FormGroup row>
                    {STATUS_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <FormControlLabel
                          key={option.value}
                          control={
                            <Checkbox
                              checked={filters.status.includes(option.value)}
                              onChange={() => handleStatusChange(option.value)}
                              size="small"
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconComponent sx={{ fontSize: 16, color: option.color }} />
                              {option.label}
                            </Box>
                          }
                        />
                      );
                    })}
                  </FormGroup>
                </Box>

                {/* Type Filters */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Transaction Type</Typography>
                  <FormGroup row>
                    {TYPE_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <FormControlLabel
                          key={option.value}
                          control={
                            <Checkbox
                              checked={filters.type.includes(option.value)}
                              onChange={() => handleTypeChange(option.value)}
                              size="small"
                            />
                          }
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <IconComponent sx={{ fontSize: 16 }} />
                              {option.label}
                            </Box>
                          }
                        />
                      );
                    })}
                  </FormGroup>
                </Box>

                {/* Payment Method Filters */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Payment Method</Typography>
                  <FormGroup row>
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <FormControlLabel
                        key={option.value}
                        control={
                          <Checkbox
                            checked={filters.paymentMethod.includes(option.value)}
                            onChange={() => handlePaymentMethodChange(option.value)}
                            size="small"
                          />
                        }
                        label={option.label}
                      />
                    ))}
                  </FormGroup>
                </Box>

                {/* Date Range */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Date Range</Typography>
                  
                  {/* Date Presets */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary" gutterBottom>Quick Presets:</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {DATE_PRESETS.map((preset) => (
                        <Chip
                          key={preset.key}
                          label={preset.label}
                          size="small"
                          variant={filters.dateRange.preset === preset.key ? 'filled' : 'outlined'}
                          color={filters.dateRange.preset === preset.key ? 'primary' : 'default'}
                          onClick={() => handleDatePreset(preset.key)}
                          clickable
                        />
                      ))}
                    </Box>
                  </Box>

                  {/* Custom Date Range */}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Start Date"
                      type="date"
                      value={filters.dateRange.start ? format(filters.dateRange.start, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        handleDateChange('start', date);
                      }}
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      value={filters.dateRange.end ? format(filters.dateRange.end, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : null;
                        handleDateChange('end', date);
                      }}
                      size="small"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  </Stack>
                </Box>

                {/* Amount Range */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>Amount Range (EUR)</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Min Amount"
                      type="number"
                      value={filters.amountRange.min || ''}
                      onChange={(e) => handleAmountRangeChange('min', e.target.value ? parseFloat(e.target.value) : null)}
                      size="small"
                      InputProps={{ startAdornment: '€' }}
                      fullWidth
                    />
                    <TextField
                      label="Max Amount"
                      type="number"
                      value={filters.amountRange.max || ''}
                      onChange={(e) => handleAmountRangeChange('max', e.target.value ? parseFloat(e.target.value) : null)}
                      size="small"
                      InputProps={{ startAdornment: '€' }}
                      fullWidth
                    />
                  </Stack>
                </Box>

                {/* Filter Presets */}
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2">Filter Presets</Typography>
                    <Button
                      size="small"
                      startIcon={<SaveIcon />}
                      onClick={() => setShowPresetForm(true)}
                      disabled={activeFilterCount === 0}
                    >
                      Save Current Filters
                    </Button>
                  </Box>

                  {/* Save Preset Form */}
                  <Collapse in={showPresetForm}>
                    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                      <Stack spacing={2}>
                        <TextField
                          label="Preset Name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          size="small"
                          fullWidth
                        />
                        <TextField
                          label="Description (Optional)"
                          value={presetDescription}
                          onChange={(e) => setPresetDescription(e.target.value)}
                          size="small"
                          multiline
                          rows={2}
                          fullWidth
                        />
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            onClick={() => setShowPresetForm(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={savePreset}
                            disabled={!presetName.trim()}
                          >
                            Save Preset
                          </Button>
                        </Stack>
                      </Stack>
                    </Paper>
                  </Collapse>

                  {/* Preset List */}
                  {presets.length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {presets.map((preset) => (
                        <Paper
                          key={preset.id}
                          sx={{ 
                            p: 1, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            border: preset.isDefault ? '2px solid' : '1px solid',
                            borderColor: preset.isDefault ? 'primary.main' : 'divider'
                          }}
                        >
                          <BookmarkIcon 
                            fontSize="small" 
                            color={preset.isDefault ? 'primary' : 'action'} 
                          />
                          <Box>
                            <Typography variant="caption" fontWeight="medium">
                              {preset.name}
                            </Typography>
                            {preset.description && (
                              <Typography variant="caption" color="textSecondary" display="block">
                                {preset.description}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <IconButton
                              size="small"
                              onClick={() => loadPreset(preset)}
                              title="Load Preset"
                            >
                              <RestoreIcon fontSize="small" />
                            </IconButton>
                            {!preset.isDefault && (
                              <IconButton
                                size="small"
                                onClick={() => deletePreset(preset.id)}
                                title="Delete Preset"
                                color="error"
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                      No saved presets. Save your current filters to create a preset.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Collapse>

          {/* Active Filters Summary (Always Visible) */}
          {activeFilterCount > 0 && !isExpanded && (
            <CardContent sx={{ pt: 0, pb: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {filters.status.map((status) => {
                  const option = STATUS_OPTIONS.find(o => o.value === status);
                  return (
                    <Chip
                      key={status}
                      label={option?.label || status}
                      size="small"
                      onDelete={() => handleStatusChange(status)}
                      color="primary"
                      variant="outlined"
                    />
                  );
                })}
                {filters.type.map((type) => {
                  const option = TYPE_OPTIONS.find(o => o.value === type);
                  return (
                    <Chip
                      key={type}
                      label={option?.label || type}
                      size="small"
                      onDelete={() => handleTypeChange(type)}
                      color="secondary"
                      variant="outlined"
                    />
                  );
                })}
                {filters.paymentMethod.map((method) => {
                  const option = PAYMENT_METHOD_OPTIONS.find(o => o.value === method);
                  return (
                    <Chip
                      key={method}
                      label={option?.label || method}
                      size="small"
                      onDelete={() => handlePaymentMethodChange(method)}
                      color="info"
                      variant="outlined"
                    />
                  );
                })}
                {(filters.dateRange.start || filters.dateRange.end) && (
                  <Chip
                    label={`Date: ${filters.dateRange.start ? format(filters.dateRange.start, 'MMM dd') : '...'} - ${filters.dateRange.end ? format(filters.dateRange.end, 'MMM dd') : '...'}`}
                    size="small"
                    onDelete={() => updateFilters({ dateRange: { start: null, end: null } })}
                    color="success"
                    variant="outlined"
                  />
                )}
                {(filters.amountRange.min !== null || filters.amountRange.max !== null) && (
                  <Chip
                    label={`Amount: €${filters.amountRange.min || 0} - €${filters.amountRange.max || '∞'}`}
                    size="small"
                    onDelete={() => updateFilters({ amountRange: { min: null, max: null } })}
                    color="warning"
                    variant="outlined"
                  />
                )}
              </Box>
            </CardContent>
          )}
        </Card>
      </motion.div>
  );
}

export default TransactionFiltersPanel;
