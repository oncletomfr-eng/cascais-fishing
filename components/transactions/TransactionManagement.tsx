/**
 * Transaction Management System
 * Task 7.1: Transaction List with MUI DataGrid
 * 
 * Comprehensive transaction management interface with MUI X DataGrid Pro,
 * server-side pagination, sorting, and advanced data management capabilities
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DataGridPro,
  GridColDef,
  GridRowsProp,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel,
  GridRowSelectionModel,
  GridActionsCellItem,
  GridRowId,
  GridRowParams,
  GridToolbar,
  GridSlots,
  GridEventListener,
  useGridApiRef,
  GridRowModes,
  GridRowModesModel
} from '@mui/x-data-grid-pro';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Paper,
  Stack,
  Alert,
  Skeleton,
  Badge
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Receipt as ReceiptIcon,
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  AccountBalance,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { TransactionFiltersPanel, TransactionFilters, FilterPreset } from './TransactionFiltersPanel';
import { GlobalSearchBar, SearchQuery, SearchSuggestion } from './GlobalSearchBar';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';

// Types for transaction data
export interface Transaction {
  id: string;
  transactionId: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing' | 'refunded';
  type: 'payment' | 'refund' | 'dispute' | 'transfer' | 'fee';
  paymentMethod: {
    type: 'card' | 'bank_transfer' | 'paypal' | 'crypto' | 'other';
    last4?: string;
    brand?: string;
    details: string;
  };
  customer: {
    id: string;
    name: string;
    email: string;
  };
  description?: string;
  metadata?: Record<string, any>;
  refundable: boolean;
  disputable: boolean;
  fees: number;
  netAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface TransactionManagementProps {
  onTransactionSelect?: (transaction: Transaction) => void;
  onBulkAction?: (action: string, transactionIds: string[]) => void;
  onExport?: (filters: any) => void;
  className?: string;
}

// Status color mapping
const statusColors = {
  pending: '#ff9800',
  completed: '#4caf50', 
  failed: '#f44336',
  cancelled: '#9e9e9e',
  processing: '#2196f3',
  refunded: '#ff5722'
} as const;

// Payment method icons
const getPaymentMethodIcon = (type: string) => {
  switch (type) {
    case 'card': return <CreditCardIcon />;
    case 'bank_transfer': return <BankIcon />;
    case 'paypal': return <AccountBalance />;
    default: return <ReceiptIcon />;
  }
};

// Format currency
const formatCurrency = (amount: number, currency: string = 'EUR') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100); // Assuming amounts are in cents
};

export function TransactionManagement({
  onTransactionSelect,
  onBulkAction,
  onExport,
  className = ''
}: TransactionManagementProps) {
  const { data: session } = useSession();
  const apiRef = useGridApiRef();

  // State management
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowSelectionModel, setRowSelectionModel] = useState<any>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  // Pagination & sorting state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25
  });
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'date', sort: 'desc' }
  ]);
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<TransactionFilters>({
    status: [],
    type: [],
    paymentMethod: [],
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    customerSearch: '',
    transactionIdSearch: ''
  });
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>([]);

  // Global search state
  const globalSearch = useGlobalSearch({
    onSearchExecute: (query: SearchQuery, searchText: string) => {
      // Apply search to the data fetching
      setSearchQuery(searchText);
      setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset to first page
      
      // Add result count to search history after fetching
      // This will be updated when we get the actual results
    },
    onSearchClear: () => {
      setSearchQuery('');
    }
  });

  // Row count for server-side pagination
  const [rowCount, setRowCount] = useState(0);
  
  // Fetch transactions data
  const fetchTransactions = useCallback(async () => {
    if (!session?.user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: paginationModel.page.toString(),
        pageSize: paginationModel.pageSize.toString(),
        ...(sortModel.length > 0 && {
          sortField: sortModel[0].field,
          sortOrder: sortModel[0].sort || 'asc'
        }),
        // Legacy search and filters (for backward compatibility)
        ...(searchQuery && { search: searchQuery }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
        // Advanced filters
        ...(advancedFilters.status.length > 0 && { 
          advancedStatus: advancedFilters.status.join(',') 
        }),
        ...(advancedFilters.type.length > 0 && { 
          advancedType: advancedFilters.type.join(',') 
        }),
        ...(advancedFilters.paymentMethod.length > 0 && { 
          paymentMethod: advancedFilters.paymentMethod.join(',') 
        }),
        ...(advancedFilters.dateRange.start && { 
          dateFrom: advancedFilters.dateRange.start.toISOString() 
        }),
        ...(advancedFilters.dateRange.end && { 
          dateTo: advancedFilters.dateRange.end.toISOString() 
        }),
        ...(advancedFilters.amountRange.min !== null && { 
          amountMin: advancedFilters.amountRange.min.toString() 
        }),
        ...(advancedFilters.amountRange.max !== null && { 
          amountMax: advancedFilters.amountRange.max.toString() 
        }),
        ...(advancedFilters.customerSearch.trim() && { 
          customerSearch: advancedFilters.customerSearch 
        }),
        ...(advancedFilters.transactionIdSearch.trim() && { 
          transactionIdSearch: advancedFilters.transactionIdSearch 
        })
      });

      const response = await fetch(`/api/transactions?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform data to match our Transaction interface
      const transformedTransactions: Transaction[] = data.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date || t.createdAt),
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
        paymentMethod: {
          type: t.paymentMethod?.type || 'other',
          last4: t.paymentMethod?.last4,
          brand: t.paymentMethod?.brand,
          details: t.paymentMethod?.details || `${t.paymentMethod?.brand || 'Payment'} ${t.paymentMethod?.last4 ? `****${t.paymentMethod.last4}` : ''}`
        },
        customer: {
          id: t.customer?.id || t.userId || 'unknown',
          name: t.customer?.name || t.customerName || 'Unknown',
          email: t.customer?.email || t.customerEmail || 'N/A'
        }
      }));

      setTransactions(transformedTransactions);
      setRowCount(data.totalCount || transformedTransactions.length);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      setError(errorMessage);
      toast.error('Failed to load transactions', {
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user, paginationModel, sortModel, searchQuery, statusFilter, typeFilter, advancedFilters, globalSearch.searchValue]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Update search history with result count after fetching
  useEffect(() => {
    if (globalSearch.searchValue && rowCount > 0) {
      // Update the most recent search in history with result count
      globalSearch.addToHistory(globalSearch.searchValue, rowCount);
    }
  }, [rowCount, globalSearch.searchValue, globalSearch.addToHistory]);

  // Handle row selection
  const handleRowSelectionChange = useCallback((newSelection: GridRowSelectionModel) => {
    setRowSelectionModel(newSelection);
  }, []);

  // Handle pagination changes
  const handlePaginationChange = useCallback((model: GridPaginationModel) => {
    setPaginationModel(model);
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((model: GridSortModel) => {
    setSortModel(model);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((model: GridFilterModel) => {
    setFilterModel(model);
  }, []);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset to first page
  }, []);

  // Handle status filter change
  const handleStatusFilterChange = useCallback((status: string) => {
    setStatusFilter(status);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  // Handle type filter change
  const handleTypeFilterChange = useCallback((type: string) => {
    setTypeFilter(type);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  // Handle row actions
  const handleViewTransaction = useCallback((id: GridRowId) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction && onTransactionSelect) {
      onTransactionSelect(transaction);
    }
  }, [transactions, onTransactionSelect]);

  const handleEditTransaction = useCallback((id: GridRowId) => {
    setRowModesModel(prev => ({
      ...prev,
      [id]: { mode: GridRowModes.Edit }
    }));
  }, []);

  const handleRefundTransaction = useCallback((id: GridRowId) => {
    const transaction = transactions.find(t => t.id === id);
    if (transaction?.refundable) {
      // TODO: Implement refund functionality
      toast.info('Refund functionality will be implemented in bulk operations');
    }
  }, [transactions]);

  // Column definitions
  const columns: GridColDef<Transaction>[] = useMemo(() => [
    {
      field: 'transactionId',
      headerName: 'Transaction ID',
      width: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontFamily="monospace">
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'date',
      headerName: 'Date',
      type: 'dateTime',
      width: 160,
      valueGetter: (value, row) => row.date,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2">
            {format(params.value, 'MMM dd, yyyy')}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {format(params.value, 'HH:mm:ss')}
          </Typography>
        </Box>
      )
    },
    {
      field: 'amount',
      headerName: 'Amount',
      type: 'number',
      width: 120,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Box textAlign="right">
          <Typography variant="body2" fontWeight="medium">
            {formatCurrency(params.row.amount, params.row.currency)}
          </Typography>
          {params.row.fees > 0 && (
            <Typography variant="caption" color="textSecondary">
              Fee: {formatCurrency(params.row.fees, params.row.currency)}
            </Typography>
          )}
        </Box>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.value.toUpperCase()}
          size="small"
          sx={{
            backgroundColor: statusColors[params.value as keyof typeof statusColors] + '20',
            color: statusColors[params.value as keyof typeof statusColors],
            border: `1px solid ${statusColors[params.value as keyof typeof statusColors]}40`,
            fontWeight: 'medium'
          }}
        />
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {params.value === 'payment' ? <ReceiptIcon fontSize="small" /> :
           params.value === 'refund' ? <RestoreIcon fontSize="small" /> :
           params.value === 'dispute' ? <ErrorIcon fontSize="small" /> :
           <AssignmentIcon fontSize="small" />}
          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
            {params.value}
          </Typography>
        </Box>
      )
    },
    {
      field: 'paymentMethod',
      headerName: 'Payment Method',
      width: 180,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getPaymentMethodIcon(params.value.type)}
          <Box>
            <Typography variant="body2">
              {params.value.details}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
              {params.value.type.replace('_', ' ')}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: 'customer',
      headerName: 'Customer',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value.name}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {params.value.email}
          </Typography>
        </Box>
      )
    },
    {
      field: 'description',
      headerName: 'Description',
      width: 200,
      renderCell: (params) => (
        <Tooltip title={params.value || 'No description'} arrow>
          <Typography
            variant="body2"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%'
            }}
          >
            {params.value || 'No description'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            key="view"
            icon={<VisibilityIcon />}
            label="View Details"
            onClick={() => handleViewTransaction(params.id)}
          />
        ];

        if (params.row.status !== 'completed') {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<EditIcon />}
              label="Edit"
              onClick={() => handleEditTransaction(params.id)}
            />
          );
        }

        if (params.row.refundable) {
          actions.push(
            <GridActionsCellItem
              key="refund"
              icon={<RestoreIcon />}
              label="Refund"
              onClick={() => handleRefundTransaction(params.id)}
            />
          );
        }

        return actions;
      }
    }
  ], [handleViewTransaction, handleEditTransaction, handleRefundTransaction]);

  // Handle advanced filters change
  const handleAdvancedFiltersChange = useCallback((filters: TransactionFilters) => {
    setAdvancedFilters(filters);
    setPaginationModel(prev => ({ ...prev, page: 0 })); // Reset to first page
  }, []);

  // Handle filter preset save
  const handleFilterPresetSave = useCallback((preset: Omit<FilterPreset, 'id' | 'createdAt' | 'userId'>) => {
    const newPreset: FilterPreset = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
      createdAt: new Date(),
      userId: session?.user?.id || 'unknown'
    };
    setFilterPresets(prev => [...prev, newPreset]);
    // TODO: Save to backend/localStorage
  }, [session?.user?.id]);

  // Handle filter preset load
  const handleFilterPresetLoad = useCallback((preset: FilterPreset) => {
    setAdvancedFilters(preset.filters);
  }, []);

  // Handle filter preset delete
  const handleFilterPresetDelete = useCallback((presetId: string) => {
    setFilterPresets(prev => prev.filter(p => p.id !== presetId));
    // TODO: Delete from backend/localStorage
  }, []);

  // Handle global search suggestion selection
  const handleSearchSuggestionSelect = useCallback((suggestion: SearchSuggestion) => {
    // Parse the suggestion and apply appropriate filters
    if (suggestion.type === 'customer' && suggestion.metadata?.customerId) {
      // Set customer filter
      setAdvancedFilters(prev => ({
        ...prev,
        customerSearch: suggestion.metadata?.customerName || ''
      }));
    } else if (suggestion.type === 'transaction' && suggestion.metadata?.transactionId) {
      // Set transaction ID search
      setAdvancedFilters(prev => ({
        ...prev,
        transactionIdSearch: suggestion.metadata?.transactionId || ''
      }));
    } else if (suggestion.type === 'amount' && suggestion.metadata?.amount) {
      // Set amount filter
      const amount = suggestion.metadata?.amount || 0;
      setAdvancedFilters(prev => ({
        ...prev,
        amountRange: {
          min: amount / 100,
          max: amount / 100
        }
      }));
    }
    
    // Reset pagination
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, []);

  // Handle advanced search query parsing for filters
  const handleAdvancedSearchQuery = useCallback((query: SearchQuery) => {
    if (!query.operator || !query.field || !query.value) return;

    const newFilters = { ...advancedFilters };
    
    switch (query.field) {
      case 'customer':
        newFilters.customerSearch = query.value;
        break;
      case 'amount':
        // Parse amount operators like >100, <50, =75
        const amountMatch = query.value.match(/^([<>=]?)(\d+(?:\.\d+)?)$/);
        if (amountMatch) {
          const [, operator, amount] = amountMatch;
          const numAmount = parseFloat(amount);
          
          switch (operator) {
            case '>':
              newFilters.amountRange = { min: numAmount, max: null };
              break;
            case '<':
              newFilters.amountRange = { min: null, max: numAmount };
              break;
            case '=':
            default:
              newFilters.amountRange = { min: numAmount, max: numAmount };
              break;
          }
        }
        break;
      case 'status':
        if (!newFilters.status.includes(query.value)) {
          newFilters.status = [query.value];
        }
        break;
      case 'payment':
        if (!newFilters.paymentMethod.includes(query.value)) {
          newFilters.paymentMethod = [query.value];
        }
        break;
      case 'date':
        // Handle date queries like 2024-01-01, today, week, etc.
        if (query.value === 'today') {
          const today = new Date();
          newFilters.dateRange = {
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
          };
        } else if (query.value === 'week') {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          newFilters.dateRange = {
            start: startOfWeek,
            end: today
          };
        } else if (query.value === 'month') {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          newFilters.dateRange = {
            start: startOfMonth,
            end: today
          };
        } else if (/^\d{4}(-\d{1,2}(-\d{1,2})?)?$/.test(query.value)) {
          // Handle YYYY, YYYY-MM, or YYYY-MM-DD formats
          const dateStr = query.value;
          const startDate = new Date(dateStr);
          let endDate = new Date(dateStr);
          
          if (dateStr.length === 4) { // YYYY
            endDate = new Date(parseInt(dateStr) + 1, 0, 1);
          } else if (dateStr.length === 7) { // YYYY-MM
            const [year, month] = dateStr.split('-');
            endDate = new Date(parseInt(year), parseInt(month), 1);
          } else { // YYYY-MM-DD
            endDate.setHours(23, 59, 59, 999);
          }
          
          newFilters.dateRange = { start: startDate, end: endDate };
        }
        break;
    }
    
    setAdvancedFilters(newFilters);
  }, [advancedFilters]);

  // Update global search to use advanced query parsing
  const enhancedGlobalSearch = {
    ...globalSearch,
    executeSearch: useCallback((customQuery?: SearchQuery) => {
      const query = customQuery || globalSearch.parseQuery(globalSearch.searchValue);
      
      if (globalSearch.isValidQuery(query.text)) {
        // Handle advanced search operators
        handleAdvancedSearchQuery(query);
        
        // Add to history with result count (will be updated when results come back)
        globalSearch.addToHistory(query.text);
        
        // Execute the original search
        globalSearch.executeSearch(query);
      }
    }, [globalSearch, handleAdvancedSearchQuery])
  };

  // Custom toolbar component
  const CustomToolbar = () => (
    <Box sx={{ p: 2, pb: 0 }}>
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="h6" component="h2">
            Transaction Management
          </Typography>
          <Badge badgeContent={rowCount} color="primary" max={9999}>
            <Chip label="Total" variant="outlined" size="small" />
          </Badge>
        </Stack>

        <Stack direction="row" spacing={2} alignItems="center">
          {/* Global Search Bar */}
          <Box sx={{ minWidth: 400, flexGrow: 1, maxWidth: 600 }}>
            <GlobalSearchBar
              value={globalSearch.searchValue}
              onChange={globalSearch.setSearchValue}
              onSearch={enhancedGlobalSearch.executeSearch}
              onSuggestionSelect={handleSearchSuggestionSelect}
              loading={globalSearch.isSearching}
              placeholder="Search transactions... Try: customer:john, amount:>100, status:completed"
            />
          </Box>

          {/* Legacy Status Filter (kept for backward compatibility) */}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => handleStatusFilterChange(e.target.value)}
            >
              <MenuItem value="all">All Status</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>

          {/* Type Filter */}
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => handleTypeFilterChange(e.target.value)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="payment">Payment</MenuItem>
              <MenuItem value="refund">Refund</MenuItem>
              <MenuItem value="dispute">Dispute</MenuItem>
              <MenuItem value="transfer">Transfer</MenuItem>
              <MenuItem value="fee">Fee</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchTransactions}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* Bulk Actions */}
      {Array.isArray(rowSelectionModel) && rowSelectionModel.length > 0 && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: 'primary.main', borderRadius: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" color="primary.contrastText">
              {rowSelectionModel.length} transaction{rowSelectionModel.length !== 1 ? 's' : ''} selected
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="secondary"
              startIcon={<DownloadIcon />}
              onClick={() => onExport?.({ selectedIds: rowSelectionModel })}
            >
              Export Selected
            </Button>
            <Button
              size="small"
              variant="outlined"
              sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}
              onClick={() => onBulkAction?.('bulk_action', Array.isArray(rowSelectionModel) ? rowSelectionModel.map(String) : [])}
            >
              Bulk Actions
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );

  if (error) {
    return (
      <Card className={className}>
        <CardContent>
          <Alert severity="error" action={
            <Button color="inherit" size="small" onClick={fetchTransactions}>
              Retry
            </Button>
          }>
            <Typography variant="h6">Error Loading Transactions</Typography>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {/* Advanced Filters Panel */}
      <Box sx={{ mb: 3 }}>
        <TransactionFiltersPanel
          filters={advancedFilters}
          onFiltersChange={handleAdvancedFiltersChange}
          onPresetSave={handleFilterPresetSave}
          onPresetLoad={handleFilterPresetLoad}
          onPresetDelete={handleFilterPresetDelete}
          presets={filterPresets}
          loading={loading}
        />
      </Box>

      {/* Transaction DataGrid */}
      <Card sx={{ height: 800 }}>
        <DataGridPro
          apiRef={apiRef}
          rows={transactions}
          columns={columns}
          loading={loading}
          rowCount={rowCount}
          pageSizeOptions={[25, 50, 100, 250]}
          paginationModel={paginationModel}
          paginationMode="server"
          sortingMode="server"
          filterMode="server"
          onPaginationModelChange={handlePaginationChange}
          onSortModelChange={handleSortChange}
          onFilterModelChange={handleFilterChange}
          checkboxSelection
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={handleRowSelectionChange}
          disableRowSelectionOnClick
          slots={{
            toolbar: CustomToolbar
          }}
          slotProps={{
            loadingOverlay: {
              variant: 'skeleton',
              noRowsVariant: 'skeleton',
            },
          }}
          rowModesModel={rowModesModel}
          onRowModesModelChange={setRowModesModel}
          sx={{
            '& .MuiDataGrid-main': {
              borderRadius: 1,
            },
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: 'action.hover',
            },
            '& .MuiDataGrid-columnHeader': {
              backgroundColor: 'background.paper',
              fontSize: '0.875rem',
              fontWeight: 600,
            }
          }}
        />
      </Card>
    </motion.div>
  );
}

export default TransactionManagement;
