/**
 * Transaction Detail Modal Component
 * Task 7.4: Transaction Detail Modal
 * 
 * Comprehensive transaction detail view with full information,
 * timeline, related actions, and administrative capabilities
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Avatar,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Alert,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Close as CloseIcon,
  Receipt as ReceiptIcon,
  Person as PersonIcon,
  CreditCard as CreditCardIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  Restore as RestoreIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  MoreVert as MoreVertIcon,
  History as HistoryIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Comment as CommentIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  AccountBalance as AccountBalanceIcon,
  Security as SecurityIcon,
  Link as LinkIcon,
  FileCopy as FileCopyIcon
} from '@mui/icons-material';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { toast } from 'sonner';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab';
import { Transaction } from './TransactionManagement';

// Transaction detail interfaces
export interface TransactionEvent {
  id: string;
  type: 'status_change' | 'payment' | 'refund' | 'dispute' | 'note' | 'system' | 'admin';
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
  severity?: 'info' | 'success' | 'warning' | 'error';
}

export interface TransactionNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  isInternal: boolean;
  isVisible: boolean;
  category: 'general' | 'customer_service' | 'technical' | 'financial' | 'compliance';
}

export interface RelatedTransaction {
  id: string;
  type: 'refund' | 'chargeback' | 'dispute' | 'adjustment';
  status: string;
  amount: number;
  createdAt: Date;
  description: string;
  reference?: string;
}

interface TransactionDetailModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onTransactionUpdate?: (updatedTransaction: Transaction) => void;
  onRefund?: (transactionId: string, amount?: number, reason?: string) => void;
  onDispute?: (transactionId: string, reason: string) => void;
  onStatusChange?: (transactionId: string, newStatus: string, reason?: string) => void;
  onNoteAdd?: (transactionId: string, note: Omit<TransactionNote, 'id' | 'createdAt'>) => void;
  readonly?: boolean;
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
      id={`transaction-tabpanel-${index}`}
      aria-labelledby={`transaction-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export function TransactionDetailModal({
  open,
  onClose,
  transaction,
  onTransactionUpdate,
  onRefund,
  onDispute,
  onStatusChange,
  onNoteAdd,
  readonly = false,
  className = ''
}: TransactionDetailModalProps) {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [notes, setNotes] = useState<TransactionNote[]>([]);
  const [relatedTransactions, setRelatedTransactions] = useState<RelatedTransaction[]>([]);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<TransactionNote['category']>('general');
  const [newNoteInternal, setNewNoteInternal] = useState(false);

  // Reset state when transaction changes
  useEffect(() => {
    if (transaction?.id) {
      setActiveTab(0);
      setShowSensitiveData(false);
      setEditingNote(null);
      setNewNoteContent('');
      
      // Load transaction events, notes, and related transactions
      loadTransactionData(transaction.id);
    }
  }, [transaction?.id]);

  // Load additional transaction data
  const loadTransactionData = useCallback(async (transactionId: string) => {
    setLoading(true);
    try {
      const [eventsRes, notesRes, relatedRes] = await Promise.all([
        fetch(`/api/transactions/${transactionId}/events`),
        fetch(`/api/transactions/${transactionId}/notes`),
        fetch(`/api/transactions/${transactionId}/related`)
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.events || []);
      }

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        setNotes(notesData.notes || []);
      }

      if (relatedRes.ok) {
        const relatedData = await relatedRes.json();
        setRelatedTransactions(relatedData.transactions || []);
      }
    } catch (error) {
      console.error('Failed to load transaction data:', error);
      toast.error('Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Get status color and icon
  const getStatusDisplay = useCallback((status: string) => {
    const statusMap = {
      'completed': { color: 'success', icon: CheckCircleIcon, label: 'Completed' },
      'pending': { color: 'warning', icon: ScheduleIcon, label: 'Pending' },
      'failed': { color: 'error', icon: ErrorIcon, label: 'Failed' },
      'cancelled': { color: 'default', icon: CancelIcon, label: 'Cancelled' },
      'processing': { color: 'info', icon: ScheduleIcon, label: 'Processing' },
      'refunded': { color: 'secondary', icon: RestoreIcon, label: 'Refunded' }
    };
    
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Handle action menu
  const handleActionMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setActionMenuAnchor(event.currentTarget);
  }, []);

  const closeActionMenu = useCallback(() => {
    setActionMenuAnchor(null);
  }, []);

  // Handle refund
  const handleRefund = useCallback(() => {
    if (!transaction) return;
    
    const amount = prompt('Enter refund amount (EUR):');
    const reason = prompt('Enter refund reason:');
    
    if (amount && reason) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        onRefund?.(transaction.id, numAmount, reason);
        closeActionMenu();
      } else {
        toast.error('Invalid refund amount');
      }
    }
  }, [transaction, onRefund]);

  // Handle dispute
  const handleDispute = useCallback(() => {
    if (!transaction) return;
    
    const reason = prompt('Enter dispute reason:');
    if (reason) {
      onDispute?.(transaction.id, reason);
      closeActionMenu();
    }
  }, [transaction, onDispute]);

  // Handle status change
  const handleStatusChange = useCallback((newStatus: string) => {
    if (!transaction) return;
    
    const reason = prompt(`Change status to ${newStatus}. Enter reason:`);
    if (reason) {
      onStatusChange?.(transaction.id, newStatus, reason);
      closeActionMenu();
    }
  }, [transaction, onStatusChange]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
    closeActionMenu();
  }, []);

  // Handle export PDF
  const handleExportPDF = useCallback(() => {
    if (!transaction) return;
    
    // TODO: Implement PDF export
    toast.info('PDF export functionality coming soon');
    closeActionMenu();
  }, [transaction]);

  // Handle copy transaction ID
  const handleCopyTransactionId = useCallback(() => {
    if (!transaction) return;
    
    navigator.clipboard.writeText(transaction.id);
    toast.success('Transaction ID copied to clipboard');
  }, [transaction]);

  // Add note
  const handleAddNote = useCallback(async () => {
    if (!transaction || !newNoteContent.trim()) return;
    
    const noteData = {
      content: newNoteContent.trim(),
      createdBy: 'current-user', // TODO: Get from session
      createdByName: 'Current User', // TODO: Get from session
      isInternal: newNoteInternal,
      isVisible: true,
      category: newNoteCategory
    };
    
    try {
      onNoteAdd?.(transaction.id, noteData);
      
      // Add to local state optimistically
      const newNote: TransactionNote = {
        ...noteData,
        id: `temp_${Date.now()}`,
        createdAt: new Date()
      };
      setNotes(prev => [newNote, ...prev]);
      
      // Reset form
      setNewNoteContent('');
      setNewNoteCategory('general');
      setNewNoteInternal(false);
      
      toast.success('Note added successfully');
    } catch (error) {
      console.error('Failed to add note:', error);
      toast.error('Failed to add note');
    }
  }, [transaction, newNoteContent, newNoteCategory, newNoteInternal, onNoteAdd]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  }, []);

  // Get payment method display
  const getPaymentMethodDisplay = useCallback((paymentMethod: any) => {
    if (!paymentMethod) return 'Unknown';
    
    if (paymentMethod.type === 'card') {
      return `${paymentMethod.brand || 'Card'} ****${paymentMethod.last4 || '0000'}`;
    }
    
    return paymentMethod.details || paymentMethod.type || 'Unknown';
  }, []);

  if (!transaction) {
    return null;
  }

  const statusDisplay = getStatusDisplay(transaction.status);
  const StatusIcon = statusDisplay.icon;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      className={className}
      PaperProps={{
        sx: { minHeight: '80vh', maxHeight: '90vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ReceiptIcon color="primary" />
            <Box>
              <Typography variant="h6">Transaction Details</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="body2" color="textSecondary">
                  ID: {transaction.transactionId}
                </Typography>
                <IconButton
                  size="small"
                  onClick={handleCopyTransactionId}
                  title="Copy Transaction ID"
                >
                  <FileCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<StatusIcon />}
              label={statusDisplay.label}
              color={statusDisplay.color as any}
              size="small"
            />
            
            {!readonly && (
              <IconButton
                onClick={handleActionMenu}
                size="small"
                title="Transaction Actions"
              >
                <MoreVertIcon />
              </IconButton>
            )}
            
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
            <Tab label="Overview" icon={<InfoIcon />} iconPosition="start" />
            <Tab label="Timeline" icon={<HistoryIcon />} iconPosition="start" />
            <Tab label="Notes" icon={<CommentIcon />} iconPosition="start" 
                 badge={notes.length > 0 ? notes.length : undefined} />
            <Tab label="Related" icon={<LinkIcon />} iconPosition="start" 
                 badge={relatedTransactions.length > 0 ? relatedTransactions.length : undefined} />
            <Tab label="Technical" icon={<SecurityIcon />} iconPosition="start" />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Overview Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              {/* Transaction Summary */}
              <Grid item xs={12} md={8}>
                <Card>
                  <CardHeader
                    title="Transaction Summary"
                    avatar={<Avatar><ReceiptIcon /></Avatar>}
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Amount</Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(transaction.amount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Net Amount</Typography>
                        <Typography variant="h6">
                          {formatCurrency(transaction.netAmount)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Fees</Typography>
                        <Typography variant="body1">
                          {formatCurrency(transaction.fees.total)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">Date</Typography>
                        <Typography variant="body1">
                          {format(new Date(transaction.date), 'PPpp')}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary">Description</Typography>
                        <Typography variant="body1">
                          {transaction.description}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Customer Information */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardHeader
                    title="Customer"
                    avatar={<Avatar><PersonIcon /></Avatar>}
                  />
                  <CardContent>
                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Name</Typography>
                        <Typography variant="body1">{transaction.customer.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Email</Typography>
                        <Typography variant="body1">{transaction.customer.email}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Customer ID</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {transaction.customer.id}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Payment Method */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader
                    title="Payment Method"
                    avatar={<Avatar><CreditCardIcon /></Avatar>}
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body1">
                          {getPaymentMethodDisplay(transaction.paymentMethod)}
                        </Typography>
                        <Chip
                          label={transaction.paymentMethod?.type || 'Unknown'}
                          size="small"
                          variant="outlined"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      
                      {showSensitiveData && transaction.paymentMethod && (
                        <Alert severity="info" size="small">
                          <Typography variant="caption">
                            Sensitive payment data would be displayed here for authorized users
                          </Typography>
                        </Alert>
                      )}
                      
                      <FormControlLabel
                        control={
                          <Switch
                            checked={showSensitiveData}
                            onChange={(e) => setShowSensitiveData(e.target.checked)}
                            size="small"
                          />
                        }
                        label="Show sensitive data"
                        sx={{ mt: 1 }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Fee Breakdown */}
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader
                    title="Fee Breakdown"
                    avatar={<Avatar><MoneyIcon /></Avatar>}
                  />
                  <CardContent>
                    <Stack spacing={1}>
                      {transaction.fees.breakdown.map((fee, index) => (
                        <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{fee.description}</Typography>
                          <Typography variant="body2">{formatCurrency(fee.amount)}</Typography>
                        </Box>
                      ))}
                      <Divider />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                        <Typography variant="body2">Total Fees</Typography>
                        <Typography variant="body2">{formatCurrency(transaction.fees.total)}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Timeline Tab */}
          <TabPanel value={activeTab} index={1}>
            <Card>
              <CardHeader title="Transaction Timeline" />
              <CardContent>
                <Timeline>
                  {events.map((event, index) => (
                    <TimelineItem key={event.id}>
                      <TimelineSeparator>
                        <TimelineDot color={event.severity || 'primary'}>
                          {event.type === 'status_change' && <ScheduleIcon fontSize="small" />}
                          {event.type === 'payment' && <MoneyIcon fontSize="small" />}
                          {event.type === 'refund' && <RestoreIcon fontSize="small" />}
                          {event.type === 'dispute' && <WarningIcon fontSize="small" />}
                          {event.type === 'note' && <CommentIcon fontSize="small" />}
                          {event.type === 'system' && <InfoIcon fontSize="small" />}
                          {event.type === 'admin' && <SecurityIcon fontSize="small" />}
                        </TimelineDot>
                        {index < events.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2">{event.title}</Typography>
                          <Typography variant="body2" color="textSecondary">
                            {event.description}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {format(new Date(event.timestamp), 'PPpp')} • {event.userName || 'System'}
                          </Typography>
                        </Box>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                  
                  {events.length === 0 && (
                    <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                      No timeline events available
                    </Typography>
                  )}
                </Timeline>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Notes Tab */}
          <TabPanel value={activeTab} index={2}>
            <Stack spacing={3}>
              {/* Add New Note */}
              {!readonly && (
                <Card>
                  <CardHeader title="Add Note" />
                  <CardContent>
                    <Stack spacing={2}>
                      <TextField
                        multiline
                        rows={3}
                        placeholder="Enter note content..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        fullWidth
                      />
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                          select
                          label="Category"
                          value={newNoteCategory}
                          onChange={(e) => setNewNoteCategory(e.target.value as TransactionNote['category'])}
                          size="small"
                          sx={{ minWidth: 150 }}
                        >
                          <MenuItem value="general">General</MenuItem>
                          <MenuItem value="customer_service">Customer Service</MenuItem>
                          <MenuItem value="technical">Technical</MenuItem>
                          <MenuItem value="financial">Financial</MenuItem>
                          <MenuItem value="compliance">Compliance</MenuItem>
                        </TextField>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={newNoteInternal}
                              onChange={(e) => setNewNoteInternal(e.target.checked)}
                              size="small"
                            />
                          }
                          label="Internal only"
                        />
                        <Button
                          variant="contained"
                          onClick={handleAddNote}
                          disabled={!newNoteContent.trim()}
                          startIcon={<AddIcon />}
                        >
                          Add Note
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* Notes List */}
              <Card>
                <CardHeader title="Notes" />
                <CardContent>
                  <Stack spacing={2}>
                    {notes.map((note) => (
                      <Paper key={note.id} sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box>
                            <Typography variant="body2">{note.content}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1, alignItems: 'center' }}>
                              <Chip label={note.category} size="small" variant="outlined" />
                              {note.isInternal && (
                                <Chip label="Internal" size="small" color="warning" />
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="textSecondary">
                              {note.createdByName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block">
                              {format(new Date(note.createdAt), 'PP')}
                            </Typography>
                          </Box>
                        </Box>
                      </Paper>
                    ))}
                    
                    {notes.length === 0 && (
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                        No notes available
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </TabPanel>

          {/* Related Transactions Tab */}
          <TabPanel value={activeTab} index={3}>
            <Card>
              <CardHeader title="Related Transactions" />
              <CardContent>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Type</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Date</TableCell>
                        <TableCell>Description</TableCell>
                        <TableCell>Reference</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatedTransactions.map((related) => (
                        <TableRow key={related.id}>
                          <TableCell>
                            <Chip label={related.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>
                            <Chip label={related.status} size="small" />
                          </TableCell>
                          <TableCell>{formatCurrency(related.amount)}</TableCell>
                          <TableCell>{format(new Date(related.createdAt), 'PP')}</TableCell>
                          <TableCell>{related.description}</TableCell>
                          <TableCell>
                            {related.reference && (
                              <Typography variant="body2" fontFamily="monospace">
                                {related.reference}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {relatedTransactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>
                              No related transactions found
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </TabPanel>

          {/* Technical Tab */}
          <TabPanel value={activeTab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Technical Details" />
                  <CardContent>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Transaction ID</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {transaction.id}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">External ID</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {transaction.transactionId}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Created At</Typography>
                        <Typography variant="body2">
                          {format(new Date(transaction.date), 'PPpp')}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="body2" color="textSecondary">Updated At</Typography>
                        <Typography variant="body2">
                          {format(new Date(transaction.date), 'PPpp')} {/* TODO: Add updatedAt field */}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="Metadata" />
                  <CardContent>
                    <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                      <pre style={{ fontSize: '12px', margin: 0 }}>
                        {JSON.stringify(transaction.metadata, null, 2)}
                      </pre>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 2, pb: 1 }}>
          <Box>
            <Button startIcon={<PrintIcon />} onClick={handlePrint} size="small">
              Print
            </Button>
            <Button startIcon={<DownloadIcon />} onClick={handleExportPDF} size="small" sx={{ ml: 1 }}>
              Export PDF
            </Button>
          </Box>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </Box>
      </DialogActions>

      {/* Action Menu */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={closeActionMenu}
      >
        <MenuItem onClick={handleRefund}>
          <RestoreIcon sx={{ mr: 1 }} fontSize="small" />
          Initiate Refund
        </MenuItem>
        <MenuItem onClick={handleDispute}>
          <WarningIcon sx={{ mr: 1 }} fontSize="small" />
          Report Dispute
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleStatusChange('completed')}>
          <CheckCircleIcon sx={{ mr: 1 }} fontSize="small" />
          Mark Completed
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('failed')}>
          <ErrorIcon sx={{ mr: 1 }} fontSize="small" />
          Mark Failed
        </MenuItem>
        <MenuItem onClick={() => handleStatusChange('cancelled')}>
          <CancelIcon sx={{ mr: 1 }} fontSize="small" />
          Mark Cancelled
        </MenuItem>
      </Menu>
    </Dialog>
  );
}

export default TransactionDetailModal;
