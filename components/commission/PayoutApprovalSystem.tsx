/**
 * Payout Approval System Component
 * Task 8.3: Payout Schedule Management - Approval Workflow
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Administrative interface for reviewing, approving, and processing payouts
 * with comprehensive approval workflow, batch operations, and audit trails
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
  Button,
  IconButton,
  Stack,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Paper,
  Tabs,
  Tab,
  Badge
} from '@mui/material';
import {
  Gavel as ApprovalIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Pending as PendingIcon,
  Schedule as ScheduleIcon,
  Euro as EuroIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  BatchPrediction as BatchIcon,
  AssignmentTurnedIn as ProcessIcon,
  AccessTime as TimeIcon,
  AccountBalance as BankIcon,
  Security as SecurityIcon,
  Notes as NotesIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Interface definitions
export interface PayoutForApproval {
  id: string;
  captainId: string;
  captain: {
    id: string;
    name?: string;
    email: string;
  };
  amount: number;
  currency: string;
  commissionAmount: number;
  commissionRate: number;
  periodStart: string;
  periodEnd: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'ON_HOLD';
  scheduleType: string;
  paymentMethod?: {
    type: string;
    cardLast4?: string;
    cardBrand?: string;
  };
  description?: string;
  notes?: string;
  relatedPaymentIds: string[];
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

export interface ApprovalStats {
  totalPending: number;
  totalPendingAmount: number;
  totalApproved: number;
  totalApprovedAmount: number;
  totalProcessed: number;
  totalProcessedAmount: number;
  avgProcessingTime: number;
}

export interface PayoutApprovalSystemProps {
  className?: string;
}

// Utility functions
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PENDING': return '#FFA726';
    case 'APPROVED': return '#66BB6A';
    case 'PROCESSING': return '#42A5F5';
    case 'COMPLETED': return '#4CAF50';
    case 'FAILED': return '#EF5350';
    case 'CANCELLED': return '#BDBDBD';
    case 'ON_HOLD': return '#FF7043';
    default: return '#9E9E9E';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount / 100);
};

const getPriorityScore = (payout: PayoutForApproval): number => {
  let score = 0;
  
  // Amount-based priority
  if (payout.amount > 100000) score += 3; // > €1000
  else if (payout.amount > 50000) score += 2; // > €500
  else score += 1;
  
  // Age-based priority
  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(payout.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceCreation > 7) score += 3;
  else if (daysSinceCreation > 3) score += 2;
  else score += 1;
  
  // Schedule type priority
  if (payout.scheduleType === 'MANUAL') score += 1;
  
  return score;
};

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
      id={`approval-tabpanel-${index}`}
      aria-labelledby={`approval-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function PayoutApprovalSystem({ className = '' }: PayoutApprovalSystemProps) {
  const { data: session } = useSession();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutForApproval[]>([]);
  const [stats, setStats] = useState<ApprovalStats>({
    totalPending: 0,
    totalPendingAmount: 0,
    totalApproved: 0,
    totalApprovedAmount: 0,
    totalProcessed: 0,
    totalProcessedAmount: 0,
    avgProcessingTime: 0
  });
  
  // Filter and pagination
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  
  // Dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutForApproval | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [batchActionDialogOpen, setBatchActionDialogOpen] = useState(false);
  const [batchAction, setBatchAction] = useState<'approve' | 'reject' | 'hold'>('approve');
  
  // Check admin access
  const isAdmin = session?.user?.role === 'ADMIN';
  
  if (!isAdmin) {
    return (
      <Alert severity="error">
        <Typography>Administrative access required to manage payouts.</Typography>
      </Alert>
    );
  }

  // Load payouts data
  const fetchPayoutsData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all payouts for approval (admin endpoint)
      const response = await fetch('/api/admin/payouts?include=captain');
      if (!response.ok) throw new Error('Failed to fetch payouts data');
      
      const data = await response.json();
      setPayouts(data.payouts || []);
      
      // Calculate stats
      const pendingPayouts = data.payouts.filter((p: any) => p.status === 'PENDING');
      const approvedPayouts = data.payouts.filter((p: any) => p.status === 'APPROVED');
      const processedPayouts = data.payouts.filter((p: any) => ['COMPLETED', 'PROCESSING'].includes(p.status));
      
      setStats({
        totalPending: pendingPayouts.length,
        totalPendingAmount: pendingPayouts.reduce((sum: number, p: any) => sum + p.amount, 0),
        totalApproved: approvedPayouts.length,
        totalApprovedAmount: approvedPayouts.reduce((sum: number, p: any) => sum + p.amount, 0),
        totalProcessed: processedPayouts.length,
        totalProcessedAmount: processedPayouts.reduce((sum: number, p: any) => sum + p.amount, 0),
        avgProcessingTime: 0 // TODO: Calculate average processing time
      });
      
    } catch (error) {
      console.error('Error fetching payouts data:', error);
      toast.error('Failed to load payouts data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchPayoutsData();
  }, [fetchPayoutsData]);

  // Filter payouts based on status and other criteria
  const filteredPayouts = useMemo(() => {
    let filtered = payouts;
    
    if (statusFilter && statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Sort by priority score (highest first)
    filtered.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));
    
    return filtered;
  }, [payouts, statusFilter]);

  // Pagination
  const paginatedPayouts = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredPayouts.slice(start, start + rowsPerPage);
  }, [filteredPayouts, page, rowsPerPage]);

  // Handle single payout approval
  const handleApprovePayout = useCallback(async (payout: PayoutForApproval) => {
    try {
      const response = await fetch('/api/payout-management?action=update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: payout.id,
          status: 'APPROVED',
          notes: approvalNotes
        })
      });

      if (!response.ok) throw new Error('Failed to approve payout');

      toast.success(`Payout ${formatCurrency(payout.amount)} approved`);
      setApprovalDialogOpen(false);
      setApprovalNotes('');
      fetchPayoutsData();
    } catch (error) {
      console.error('Error approving payout:', error);
      toast.error('Failed to approve payout');
    }
  }, [approvalNotes, fetchPayoutsData]);

  // Handle single payout rejection
  const handleRejectPayout = useCallback(async (payout: PayoutForApproval) => {
    try {
      if (!rejectionReason.trim()) {
        toast.error('Rejection reason is required');
        return;
      }

      const response = await fetch('/api/payout-management?action=update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payoutId: payout.id,
          status: 'CANCELLED',
          reason: rejectionReason
        })
      });

      if (!response.ok) throw new Error('Failed to reject payout');

      toast.success(`Payout ${formatCurrency(payout.amount)} rejected`);
      setRejectionDialogOpen(false);
      setRejectionReason('');
      fetchPayoutsData();
    } catch (error) {
      console.error('Error rejecting payout:', error);
      toast.error('Failed to reject payout');
    }
  }, [rejectionReason, fetchPayoutsData]);

  // Handle batch operations
  const handleBatchAction = useCallback(async () => {
    if (!selectedPayouts.length) {
      toast.error('No payouts selected');
      return;
    }

    try {
      const promises = selectedPayouts.map(payoutId =>
        fetch('/api/payout-management?action=update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payoutId,
            status: batchAction === 'approve' ? 'APPROVED' : 
                   batchAction === 'reject' ? 'CANCELLED' : 'ON_HOLD',
            reason: batchAction === 'reject' ? rejectionReason : undefined,
            notes: batchAction === 'approve' ? approvalNotes : undefined
          })
        })
      );

      await Promise.all(promises);

      toast.success(`${selectedPayouts.length} payouts ${batchAction}d successfully`);
      setBatchActionDialogOpen(false);
      setSelectedPayouts([]);
      setRejectionReason('');
      setApprovalNotes('');
      fetchPayoutsData();
    } catch (error) {
      console.error('Error processing batch action:', error);
      toast.error('Failed to process batch action');
    }
  }, [selectedPayouts, batchAction, rejectionReason, approvalNotes, fetchPayoutsData]);

  // Handle row selection
  const handleSelectPayout = useCallback((payoutId: string, selected: boolean) => {
    setSelectedPayouts(prev =>
      selected
        ? [...prev, payoutId]
        : prev.filter(id => id !== payoutId)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setSelectedPayouts(selected ? paginatedPayouts.map(p => p.id) : []);
  }, [paginatedPayouts]);

  if (loading) {
    return (
      <Box className={className}>
        <Card>
          <CardHeader title="Loading payouts..." />
          <CardContent>
            <LinearProgress />
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader
            title={
              <Stack direction="row" alignItems="center" spacing={2}>
                <ApprovalIcon color="primary" />
                <Typography variant="h5" component="h2">
                  Payout Approval System
                </Typography>
              </Stack>
            }
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchPayoutsData}
                >
                  Refresh
                </Button>
                {selectedPayouts.length > 0 && (
                  <Button
                    variant="contained"
                    startIcon={<BatchIcon />}
                    onClick={() => setBatchActionDialogOpen(true)}
                  >
                    Batch Actions ({selectedPayouts.length})
                  </Button>
                )}
              </Stack>
            }
          />
          
          <CardContent>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'warning.main' }}>
                        <PendingIcon />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" variant="body2">
                          Pending Approval
                        </Typography>
                        <Typography variant="h6">
                          {stats.totalPending}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatCurrency(stats.totalPendingAmount)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'success.main' }}>
                        <ApproveIcon />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" variant="body2">
                          Approved
                        </Typography>
                        <Typography variant="h6">
                          {stats.totalApproved}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatCurrency(stats.totalApprovedAmount)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <ProcessIcon />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" variant="body2">
                          Processed
                        </Typography>
                        <Typography variant="h6">
                          {stats.totalProcessed}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {formatCurrency(stats.totalProcessedAmount)}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Avatar sx={{ bgcolor: 'info.main' }}>
                        <TimeIcon />
                      </Avatar>
                      <Box>
                        <Typography color="textSecondary" variant="body2">
                          Avg Processing
                        </Typography>
                        <Typography variant="h6">
                          {stats.avgProcessingTime}h
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Response time
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Filter Bar */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status Filter</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status Filter"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="PROCESSING">Processing</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="FAILED">Failed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                  <MenuItem value="ON_HOLD">On Hold</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="body2" color="textSecondary">
                {filteredPayouts.length} payouts found
              </Typography>
            </Stack>

            {/* Payouts Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedPayouts.length === paginatedPayouts.length && paginatedPayouts.length > 0}
                        indeterminate={selectedPayouts.length > 0 && selectedPayouts.length < paginatedPayouts.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableCell>
                    <TableCell>Captain</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedPayouts.map((payout) => {
                    const priorityScore = getPriorityScore(payout);
                    const isSelected = selectedPayouts.includes(payout.id);
                    
                    return (
                      <TableRow key={payout.id} hover selected={isSelected}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => handleSelectPayout(payout.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{ width: 32, height: 32 }}>
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {payout.captain.name || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {payout.captain.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {formatCurrency(payout.amount)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {payout.commissionRate}% comm.
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(parseISO(payout.periodStart), 'MMM dd')} - {format(parseISO(payout.periodEnd), 'dd, yyyy')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={payout.status}
                            sx={{
                              bgcolor: getStatusColor(payout.status) + '20',
                              color: getStatusColor(payout.status),
                              borderColor: getStatusColor(payout.status)
                            }}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={priorityScore > 6 ? 'High' : priorityScore > 4 ? 'Medium' : 'Low'}
                            color={priorityScore > 6 ? 'error' : priorityScore > 4 ? 'warning' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {format(parseISO(payout.createdAt), 'MMM dd, HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1}>
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedPayout(payout);
                                  // Open details dialog
                                }}
                              >
                                <VisibilityIcon />
                              </IconButton>
                            </Tooltip>
                            
                            {payout.status === 'PENDING' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setApprovalDialogOpen(true);
                                    }}
                                  >
                                    <ApproveIcon />
                                  </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedPayout(payout);
                                      setRejectionDialogOpen(true);
                                    }}
                                  >
                                    <RejectIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredPayouts.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <ApproveIcon color="success" />
            <span>Approve Payout</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedPayout && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  You are about to approve a payout of <strong>{formatCurrency(selectedPayout.amount)}</strong> 
                  {' '}to <strong>{selectedPayout.captain.name || selectedPayout.captain.email}</strong>.
                </Typography>
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={3}
                label="Approval Notes (Optional)"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
              />

              <Typography variant="body2" color="textSecondary">
                Once approved, the payout will be queued for processing. The captain will be notified of the approval.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={() => selectedPayout && handleApprovePayout(selectedPayout)}
          >
            Approve Payout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog
        open={rejectionDialogOpen}
        onClose={() => setRejectionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <RejectIcon color="error" />
            <span>Reject Payout</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedPayout && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="warning">
                <Typography variant="body2">
                  You are about to reject a payout of <strong>{formatCurrency(selectedPayout.amount)}</strong> 
                  {' '}to <strong>{selectedPayout.captain.name || selectedPayout.captain.email}</strong>.
                </Typography>
              </Alert>

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Rejection Reason (Required)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejection..."
                error={!rejectionReason.trim()}
                helperText={!rejectionReason.trim() ? 'Rejection reason is required' : ''}
              />

              <Typography variant="body2" color="textSecondary">
                The captain will be notified of the rejection with your provided reason.
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => selectedPayout && handleRejectPayout(selectedPayout)}
            disabled={!rejectionReason.trim()}
          >
            Reject Payout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Batch Action Dialog */}
      <Dialog
        open={batchActionDialogOpen}
        onClose={() => setBatchActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <BatchIcon />
            <span>Batch Action</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                You have selected <strong>{selectedPayouts.length} payouts</strong> for batch processing.
              </Typography>
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Action</InputLabel>
              <Select
                value={batchAction}
                label="Action"
                onChange={(e) => setBatchAction(e.target.value as any)}
              >
                <MenuItem value="approve">Approve All</MenuItem>
                <MenuItem value="reject">Reject All</MenuItem>
                <MenuItem value="hold">Put on Hold</MenuItem>
              </Select>
            </FormControl>

            {batchAction === 'approve' && (
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Approval Notes (Optional)"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add notes for all approved payouts..."
              />
            )}

            {batchAction === 'reject' && (
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Rejection Reason (Required)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide reason for rejecting all selected payouts..."
                error={!rejectionReason.trim()}
                helperText={!rejectionReason.trim() ? 'Rejection reason is required for batch rejection' : ''}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchActionDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBatchAction}
            disabled={batchAction === 'reject' && !rejectionReason.trim()}
            color={batchAction === 'approve' ? 'success' : batchAction === 'reject' ? 'error' : 'warning'}
          >
            {batchAction === 'approve' ? 'Approve' : batchAction === 'reject' ? 'Reject' : 'Hold'} {selectedPayouts.length} Payouts
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
