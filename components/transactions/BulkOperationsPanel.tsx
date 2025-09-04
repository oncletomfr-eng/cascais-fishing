/**
 * Bulk Operations Panel Component
 * Task 7.5: Bulk Operations System
 * 
 * Comprehensive bulk operations management for transaction operations
 * with safety checks, progress tracking, and role-based permissions
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Divider,
  Stack,
  Chip,
  Badge,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  TextField,
  Checkbox,
  FormControlLabel,
  Paper,
  Tooltip,
  Grid,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  AttachMoney as MoneyIcon,
  Comment as CommentIcon,
  Label as LabelIcon,
  Visibility as VisibilityIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Transaction } from './TransactionManagement';

// Bulk operation interfaces
export interface BulkOperation {
  id: string;
  type: 'status_update' | 'refund' | 'export' | 'add_note' | 'assign_tag' | 'delete';
  name: string;
  description: string;
  icon: React.ReactNode;
  requiresConfirmation: boolean;
  adminOnly?: boolean;
  destructive?: boolean;
}

export interface BulkOperationProgress {
  operationId: string;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  startedAt: Date;
  completedAt?: Date;
  errors: BulkOperationError[];
  canRollback?: boolean;
}

export interface BulkOperationError {
  transactionId: string;
  error: string;
  severity: 'warning' | 'error';
}

export interface BulkOperationHistory {
  id: string;
  operationType: string;
  operationName: string;
  transactionCount: number;
  executedBy: string;
  executedAt: Date;
  status: string;
  results: {
    successful: number;
    failed: number;
    errors: string[];
  };
  canRollback: boolean;
}

interface BulkOperationsPanelProps {
  selectedTransactions: Transaction[];
  onSelectionClear: () => void;
  onOperationExecute?: (operation: BulkOperation, params?: any) => Promise<void>;
  onProgressUpdate?: (progress: BulkOperationProgress) => void;
  isAdmin?: boolean;
  className?: string;
}

// Available bulk operations
const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'status_update',
    type: 'status_update',
    name: 'Update Status',
    description: 'Change status of selected transactions',
    icon: <EditIcon />,
    requiresConfirmation: true
  },
  {
    id: 'process_refunds',
    type: 'refund',
    name: 'Process Refunds',
    description: 'Initiate refunds for selected transactions',
    icon: <RestoreIcon />,
    requiresConfirmation: true,
    destructive: true
  },
  {
    id: 'export_selected',
    type: 'export',
    name: 'Export Selected',
    description: 'Export selected transactions to file',
    icon: <DownloadIcon />,
    requiresConfirmation: false
  },
  {
    id: 'add_notes',
    type: 'add_note',
    name: 'Add Notes',
    description: 'Add notes to selected transactions',
    icon: <CommentIcon />,
    requiresConfirmation: false
  },
  {
    id: 'assign_tags',
    type: 'assign_tag',
    name: 'Assign Tags',
    description: 'Assign tags to selected transactions',
    icon: <LabelIcon />,
    requiresConfirmation: false
  },
  {
    id: 'delete_transactions',
    type: 'delete',
    name: 'Delete Transactions',
    description: 'Permanently delete selected transactions',
    icon: <DeleteIcon />,
    requiresConfirmation: true,
    adminOnly: true,
    destructive: true
  }
];

export function BulkOperationsPanel({
  selectedTransactions,
  onSelectionClear,
  onOperationExecute,
  onProgressUpdate,
  isAdmin = false,
  className = ''
}: BulkOperationsPanelProps) {
  // State management
  const [expanded, setExpanded] = useState(true);
  const [currentOperation, setCurrentOperation] = useState<BulkOperation | null>(null);
  const [operationProgress, setOperationProgress] = useState<BulkOperationProgress | null>(null);
  const [confirmationDialog, setConfirmationDialog] = useState<{
    open: boolean;
    operation: BulkOperation | null;
    params?: any;
  }>({ open: false, operation: null });
  const [operationHistory, setOperationHistory] = useState<BulkOperationHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Operation parameters state
  const [statusUpdateValue, setStatusUpdateValue] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [tagValue, setTagValue] = useState('');

  // Filter available operations based on admin status
  const availableOperations = useMemo(() => {
    return BULK_OPERATIONS.filter(operation => 
      !operation.adminOnly || isAdmin
    );
  }, [isAdmin]);

  // Calculate selection summary
  const selectionSummary = useMemo(() => {
    const total = selectedTransactions.length;
    const totalAmount = selectedTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const statusCounts = selectedTransactions.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const refundableCount = selectedTransactions.filter(t => t.refundable).length;
    
    return {
      total,
      totalAmount,
      statusCounts,
      refundableCount
    };
  }, [selectedTransactions]);

  // Handle operation start
  const handleOperationStart = useCallback((operation: BulkOperation) => {
    if (operation.requiresConfirmation) {
      setConfirmationDialog({ 
        open: true, 
        operation,
        params: getOperationParams(operation)
      });
    } else {
      executeOperation(operation);
    }
  }, []);

  // Get operation parameters
  const getOperationParams = useCallback((operation: BulkOperation) => {
    switch (operation.type) {
      case 'status_update':
        return { newStatus: statusUpdateValue };
      case 'refund':
        return { 
          amount: refundAmount ? parseFloat(refundAmount) : null,
          reason: refundReason 
        };
      case 'add_note':
        return { content: noteContent };
      case 'assign_tag':
        return { tag: tagValue };
      default:
        return {};
    }
  }, [statusUpdateValue, refundAmount, refundReason, noteContent, tagValue]);

  // Execute operation
  const executeOperation = useCallback(async (operation: BulkOperation, params?: any) => {
    try {
      setCurrentOperation(operation);
      
      // Create initial progress
      const initialProgress: BulkOperationProgress = {
        operationId: `${operation.id}_${Date.now()}`,
        status: 'queued',
        totalItems: selectedTransactions.length,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        startedAt: new Date(),
        errors: []
      };
      
      setOperationProgress(initialProgress);
      onProgressUpdate?.(initialProgress);

      // Start operation
      await onOperationExecute?.(operation, params || getOperationParams(operation));

      toast.success(`${operation.name} initiated for ${selectedTransactions.length} transactions`);
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast.error(`Failed to start ${operation.name}`);
      
      if (operationProgress) {
        const failedProgress = {
          ...operationProgress,
          status: 'failed' as const,
          completedAt: new Date()
        };
        setOperationProgress(failedProgress);
        onProgressUpdate?.(failedProgress);
      }
    }
  }, [selectedTransactions, onOperationExecute, onProgressUpdate, getOperationParams, operationProgress]);

  // Handle confirmation
  const handleConfirmOperation = useCallback(() => {
    if (confirmationDialog.operation) {
      executeOperation(confirmationDialog.operation, confirmationDialog.params);
      setConfirmationDialog({ open: false, operation: null });
    }
  }, [confirmationDialog, executeOperation]);

  // Cancel operation
  const handleCancelOperation = useCallback(() => {
    if (operationProgress?.status === 'running') {
      const cancelledProgress = {
        ...operationProgress,
        status: 'cancelled' as const,
        completedAt: new Date()
      };
      setOperationProgress(cancelledProgress);
      onProgressUpdate?.(cancelledProgress);
      toast.info('Operation cancelled');
    }
    setCurrentOperation(null);
  }, [operationProgress, onProgressUpdate]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  }, []);

  // Get operation color
  const getOperationColor = useCallback((operation: BulkOperation) => {
    if (operation.destructive) return 'error';
    if (operation.adminOnly) return 'warning';
    return 'primary';
  }, []);

  // Render operation parameters form
  const renderOperationForm = useCallback((operation: BulkOperation) => {
    switch (operation.type) {
      case 'status_update':
        return (
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={statusUpdateValue}
              onChange={(e) => setStatusUpdateValue(e.target.value)}
              label="New Status"
            >
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
        );
      
      case 'refund':
        return (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Refund Amount (EUR)"
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              size="small"
              fullWidth
              helperText="Leave empty for full refund"
            />
            <TextField
              label="Refund Reason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              size="small"
              fullWidth
              required
            />
          </Stack>
        );
      
      case 'add_note':
        return (
          <TextField
            label="Note Content"
            multiline
            rows={3}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            required
          />
        );
      
      case 'assign_tag':
        return (
          <TextField
            label="Tag Name"
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            required
          />
        );
      
      default:
        return null;
    }
  }, [statusUpdateValue, refundAmount, refundReason, noteContent, tagValue]);

  if (selectedTransactions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">
                Bulk Operations
              </Typography>
              <Badge badgeContent={selectionSummary.total} color="primary">
                <Chip label="Selected" variant="outlined" size="small" />
              </Badge>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Operation History">
                <IconButton
                  size="small"
                  onClick={() => setShowHistory(!showHistory)}
                  color={showHistory ? 'primary' : 'default'}
                >
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
              
              <Tooltip title="Clear Selection">
                <IconButton size="small" onClick={onSelectionClear}>
                  <CloseIcon />
                </IconButton>
              </Tooltip>
              
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
          </Box>

          <Collapse in={expanded}>
            {/* Selection Summary */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {selectionSummary.total}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Transactions
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(selectionSummary.totalAmount)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Amount
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">
                      {selectionSummary.refundableCount}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Refundable
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                      {Object.entries(selectionSummary.statusCounts).map(([status, count]) => (
                        <Chip
                          key={status}
                          label={`${status}: ${count}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Current Operation Progress */}
            <AnimatePresence>
              {operationProgress && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert
                    severity={
                      operationProgress.status === 'completed' ? 'success' :
                      operationProgress.status === 'failed' ? 'error' :
                      operationProgress.status === 'cancelled' ? 'warning' : 'info'
                    }
                    sx={{ mb: 2 }}
                    action={
                      operationProgress.status === 'running' && (
                        <IconButton size="small" onClick={handleCancelOperation}>
                          <StopIcon />
                        </IconButton>
                      )
                    }
                  >
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">
                          {currentOperation?.name} - {operationProgress.status}
                        </Typography>
                        <Typography variant="body2">
                          {operationProgress.processedItems} / {operationProgress.totalItems}
                        </Typography>
                      </Box>
                      
                      {operationProgress.status === 'running' && (
                        <LinearProgress
                          variant="determinate"
                          value={(operationProgress.processedItems / operationProgress.totalItems) * 100}
                          sx={{ mb: 1 }}
                        />
                      )}
                      
                      {operationProgress.status === 'completed' && (
                        <Typography variant="body2" color="success.main">
                          ✅ {operationProgress.successfulItems} successful, {operationProgress.failedItems} failed
                        </Typography>
                      )}
                      
                      {operationProgress.errors.length > 0 && (
                        <Typography variant="body2" color="error.main">
                          {operationProgress.errors.length} errors occurred
                        </Typography>
                      )}
                    </Box>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Operation Parameters Forms */}
            <Box sx={{ mb: 2 }}>
              <Grid container spacing={2}>
                {availableOperations.slice(0, 3).map((operation) => (
                  <Grid item xs={12} md={4} key={operation.id}>
                    <Box>
                      {renderOperationForm(operation)}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Bulk Actions */}
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {availableOperations.map((operation) => (
                <Button
                  key={operation.id}
                  variant={operation.destructive ? 'outlined' : 'contained'}
                  color={getOperationColor(operation) as any}
                  size="small"
                  startIcon={operation.icon}
                  onClick={() => handleOperationStart(operation)}
                  disabled={currentOperation !== null}
                >
                  {operation.name}
                </Button>
              ))}
            </Stack>

            {/* Operation History */}
            <Collapse in={showHistory}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Recent Operations
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Operation</TableCell>
                        <TableCell>Items</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {operationHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            <Typography variant="body2" color="textSecondary">
                              No operations history
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        operationHistory.map((hist) => (
                          <TableRow key={hist.id}>
                            <TableCell>{hist.operationName}</TableCell>
                            <TableCell>{hist.transactionCount}</TableCell>
                            <TableCell>
                              <Chip label={hist.status} size="small" />
                            </TableCell>
                            <TableCell>
                              {format(hist.executedAt, 'PP')}
                            </TableCell>
                            <TableCell>
                              {hist.canRollback && (
                                <Tooltip title="Rollback">
                                  <IconButton size="small">
                                    <RestoreIcon />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Collapse>
          </Collapse>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmationDialog.open}
        onClose={() => setConfirmationDialog({ open: false, operation: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Confirm {confirmationDialog.operation?.name}
        </DialogTitle>
        <DialogContent>
          <Alert 
            severity={confirmationDialog.operation?.destructive ? 'error' : 'warning'}
            sx={{ mb: 2 }}
          >
            {confirmationDialog.operation?.destructive ? (
              <Typography>
                ⚠️ This is a destructive operation that cannot be undone.
              </Typography>
            ) : (
              <Typography>
                Please confirm this bulk operation.
              </Typography>
            )}
          </Alert>
          
          <Typography variant="body1" gutterBottom>
            {confirmationDialog.operation?.description}
          </Typography>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            This operation will affect {selectedTransactions.length} transactions.
          </Typography>

          {/* Impact Preview */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Impact Preview:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="info" />
                </ListItemIcon>
                <ListItemText
                  primary={`${selectedTransactions.length} transactions will be processed`}
                  secondary={`Total value: ${formatCurrency(selectionSummary.totalAmount)}`}
                />
              </ListItem>
              
              {confirmationDialog.operation?.type === 'refund' && (
                <ListItem>
                  <ListItemIcon>
                    <WarningIcon color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${selectionSummary.refundableCount} transactions are refundable`}
                    secondary={`${selectedTransactions.length - selectionSummary.refundableCount} will be skipped`}
                  />
                </ListItem>
              )}
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationDialog({ open: false, operation: null })}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmOperation}
            variant="contained"
            color={confirmationDialog.operation?.destructive ? 'error' : 'primary'}
          >
            Confirm {confirmationDialog.operation?.name}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default BulkOperationsPanel;
