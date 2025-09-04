/**
 * Payout Schedule Management Component
 * Task 8.3: Payout Schedule Management
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Comprehensive payout schedule management interface with dashboard,
 * calendar view, payment method management, and approval workflows
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
  InputAdornment,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  Skeleton,
  LinearProgress,
  Grid,
  Badge,
  Avatar,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  AccountBalance as BankIcon,
  Euro as EuroIcon,
  Payment as PaymentIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Calendar as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  CreditCard as CreditCardIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { format, addDays, addWeeks, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { PayoutCalendar } from './PayoutCalendar';
import { PaymentMethodManagement } from './PaymentMethodManagement';
import { PayoutNotificationSystem } from './PayoutNotificationSystem';

// Interface definitions
export interface PayoutSchedule {
  id: string;
  captainId: string;
  scheduleType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'MANUAL';
  isActive: boolean;
  minimumPayoutAmount: number;
  autoPayoutEnabled: boolean;
  payoutDay?: number;
  defaultPaymentMethodId?: string;
  defaultPaymentMethod?: {
    id: string;
    type: string;
    cardLast4?: string;
    cardBrand?: string;
  };
  notifyBeforePayoutDays: number;
  emailNotifications: boolean;
  smsNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payout {
  id: string;
  captainId: string;
  amount: number;
  currency: string;
  commissionAmount: number;
  commissionRate: number;
  periodStart: string;
  periodEnd: string;
  status: 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'ON_HOLD';
  scheduleType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'MANUAL';
  paymentMethod?: {
    id: string;
    type: string;
    cardLast4?: string;
    cardBrand?: string;
  };
  description?: string;
  notes?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PendingCommissions {
  totalAmount: number;
  paymentCount: number;
  payments: Array<{
    id: string;
    amount: number;
    commissionAmount: number;
    date: string;
    tripId?: string;
  }>;
}

export interface PayoutScheduleManagementProps {
  captainId?: string;
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'PENDING': return <PendingIcon />;
    case 'APPROVED': return <CheckCircleIcon />;
    case 'PROCESSING': return <AccessTimeIcon />;
    case 'COMPLETED': return <CheckCircleIcon />;
    case 'FAILED': return <ErrorIcon />;
    case 'CANCELLED': return <CancelIcon />;
    case 'ON_HOLD': return <WarningIcon />;
    default: return <InfoIcon />;
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount / 100);
};

const getNextPayoutDate = (schedule: PayoutSchedule): Date => {
  const now = new Date();
  const { scheduleType, payoutDay } = schedule;

  switch (scheduleType) {
    case 'WEEKLY':
      const daysUntilNext = payoutDay ? (payoutDay - now.getDay() + 7) % 7 : 7;
      return addDays(now, daysUntilNext || 7);
    case 'BIWEEKLY':
      return addWeeks(now, 2);
    case 'MONTHLY':
      const nextMonth = addMonths(now, 1);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), payoutDay || 1);
    case 'QUARTERLY':
      return addMonths(now, 3);
    default:
      return now;
  }
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
      id={`payout-tabpanel-${index}`}
      aria-labelledby={`payout-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export function PayoutScheduleManagement({ captainId, className = '' }: PayoutScheduleManagementProps) {
  const { data: session } = useSession();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    schedule?: PayoutSchedule;
    recentPayouts: Payout[];
    pendingCommissions: PendingCommissions;
    payoutStats: Record<string, { count: number; totalAmount: number }>;
  }>({
    recentPayouts: [],
    pendingCommissions: { totalAmount: 0, paymentCount: 0, payments: [] },
    payoutStats: {}
  });
  
  // Dialog states
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutDetailDialogOpen, setPayoutDetailDialogOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  
  // Form states
  const [scheduleForm, setScheduleForm] = useState({
    scheduleType: 'MONTHLY' as const,
    isActive: true,
    minimumPayoutAmount: 5000, // €50
    autoPayoutEnabled: false,
    payoutDay: 1,
    notifyBeforePayoutDays: 3,
    emailNotifications: true,
    smsNotifications: false
  });

  const targetCaptainId = captainId || session?.user?.id || '';

  // Load payout dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payout-management?action=dashboard&captainId=${targetCaptainId}`);
      
      if (!response.ok) throw new Error('Failed to fetch payout data');
      
      const data = await response.json();
      setDashboardData(data);
      
      // Update form with existing schedule
      if (data.schedule) {
        setScheduleForm({
          scheduleType: data.schedule.scheduleType,
          isActive: data.schedule.isActive,
          minimumPayoutAmount: data.schedule.minimumPayoutAmount,
          autoPayoutEnabled: data.schedule.autoPayoutEnabled,
          payoutDay: data.schedule.payoutDay || 1,
          notifyBeforePayoutDays: data.schedule.notifyBeforePayoutDays,
          emailNotifications: data.schedule.emailNotifications,
          smsNotifications: data.schedule.smsNotifications
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  }, [targetCaptainId]);

  // Load data on component mount
  useEffect(() => {
    if (targetCaptainId) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, targetCaptainId]);

  // Save payout schedule
  const handleSaveSchedule = useCallback(async () => {
    try {
      const response = await fetch('/api/payout-management?action=update-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: targetCaptainId,
          ...scheduleForm
        })
      });

      if (!response.ok) throw new Error('Failed to update schedule');

      const data = await response.json();
      toast.success('Payout schedule updated successfully');
      setScheduleDialogOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save payout schedule');
    }
  }, [scheduleForm, targetCaptainId, fetchDashboardData]);

  // Create manual payout
  const handleCreatePayout = useCallback(async () => {
    try {
      if (!dashboardData.pendingCommissions.totalAmount) {
        toast.error('No pending commissions to payout');
        return;
      }

      const response = await fetch('/api/payout-management?action=create-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: targetCaptainId,
          amount: dashboardData.pendingCommissions.totalAmount,
          periodStart: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
          periodEnd: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
          scheduleType: 'MANUAL',
          description: 'Manual payout request'
        })
      });

      if (!response.ok) throw new Error('Failed to create payout');

      toast.success('Payout created successfully');
      setPayoutDialogOpen(false);
      fetchDashboardData();
    } catch (error) {
      console.error('Error creating payout:', error);
      toast.error('Failed to create payout');
    }
  }, [dashboardData.pendingCommissions, targetCaptainId, fetchDashboardData]);

  // Computed values
  const nextPayoutDate = useMemo(() => {
    return dashboardData.schedule ? getNextPayoutDate(dashboardData.schedule) : null;
  }, [dashboardData.schedule]);

  const totalPendingAmount = useMemo(() => {
    return Object.entries(dashboardData.payoutStats)
      .filter(([status]) => ['PENDING', 'APPROVED', 'PROCESSING'].includes(status))
      .reduce((total, [, stats]) => total + stats.totalAmount, 0);
  }, [dashboardData.payoutStats]);

  if (loading) {
    return (
      <Box className={className}>
        <Card>
          <CardHeader title={<Skeleton width={200} />} />
          <CardContent>
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} md={6} lg={3} key={i}>
                  <Skeleton variant="rectangular" height={120} />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 3 }}>
              <Skeleton variant="rectangular" height={400} />
            </Box>
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
                <ScheduleIcon color="primary" />
                <Typography variant="h5" component="h2">
                  Payout Schedule Management
                </Typography>
              </Stack>
            }
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchDashboardData}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SettingsIcon />}
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  Settings
                </Button>
              </Stack>
            }
          />
          
          <CardContent>
            {/* Key Metrics Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6} lg={3}>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <EuroIcon />
                        </Avatar>
                        <Box>
                          <Typography color="textSecondary" variant="body2">
                            Pending Commissions
                          </Typography>
                          <Typography variant="h6">
                            {formatCurrency(dashboardData.pendingCommissions.totalAmount)}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'success.main' }}>
                          <CheckCircleIcon />
                        </Avatar>
                        <Box>
                          <Typography color="textSecondary" variant="body2">
                            This Month Completed
                          </Typography>
                          <Typography variant="h6">
                            {formatCurrency(dashboardData.payoutStats.COMPLETED?.totalAmount || 0)}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'warning.main' }}>
                          <AccessTimeIcon />
                        </Avatar>
                        <Box>
                          <Typography color="textSecondary" variant="body2">
                            Next Payout
                          </Typography>
                          <Typography variant="h6">
                            {nextPayoutDate ? format(nextPayoutDate, 'MMM dd') : 'Not scheduled'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>

              <Grid item xs={12} md={6} lg={3}>
                <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: 'info.main' }}>
                          <ScheduleIcon />
                        </Avatar>
                        <Box>
                          <Typography color="textSecondary" variant="body2">
                            Schedule Type
                          </Typography>
                          <Typography variant="h6">
                            {dashboardData.schedule?.scheduleType || 'Not configured'}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grid>

            {/* Status Alert */}
            {!dashboardData.schedule && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  No payout schedule configured. Click Settings to set up automatic payouts.
                </Typography>
              </Alert>
            )}

            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <HistoryIcon />
                      <span>Recent Payouts</span>
                      <Badge
                        badgeContent={dashboardData.recentPayouts.length}
                        color="primary"
                        max={99}
                      />
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CalendarIcon />
                      <span>Schedule</span>
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PaymentIcon />
                      <span>Payment Methods</span>
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CalendarIcon />
                      <span>Calendar View</span>
                    </Stack>
                  }
                />
                <Tab
                  label={
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <NotificationsIcon />
                      <span>Notifications</span>
                    </Stack>
                  }
                />
              </Tabs>
            </Box>

            {/* Tab Content */}
            <TabPanel value={activeTab} index={0}>
              <PayoutHistoryPanel
                payouts={dashboardData.recentPayouts}
                onPayoutClick={(payout) => {
                  setSelectedPayout(payout);
                  setPayoutDetailDialogOpen(true);
                }}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <SchedulePanel
                schedule={dashboardData.schedule}
                nextPayoutDate={nextPayoutDate}
                onEditSchedule={() => setScheduleDialogOpen(true)}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <PaymentMethodManagement
                captainId={targetCaptainId}
                onMethodChange={() => fetchDashboardData()}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <PayoutCalendar
                captainId={targetCaptainId}
                schedule={dashboardData.schedule}
                onEventClick={(event) => {
                  // Handle calendar event click
                  console.log('Calendar event clicked:', event);
                }}
                onCreatePayout={(date) => {
                  // Handle create payout from calendar
                  setPayoutDialogOpen(true);
                }}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={4}>
              <PayoutNotificationSystem
                captainId={targetCaptainId}
                onNotificationSent={() => fetchDashboardData()}
              />
            </TabPanel>
          </CardContent>
        </Card>

        {/* Floating Action Button */}
        <SpeedDial
          ariaLabel="Payout Actions"
          sx={{ position: 'fixed', bottom: 16, right: 16 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<AddIcon />}
            tooltipTitle="Create Manual Payout"
            onClick={() => setPayoutDialogOpen(true)}
          />
          <SpeedDialAction
            icon={<SettingsIcon />}
            tooltipTitle="Schedule Settings"
            onClick={() => setScheduleDialogOpen(true)}
          />
          <SpeedDialAction
            icon={<DownloadIcon />}
            tooltipTitle="Export Data"
            onClick={() => toast.info('Export feature coming soon')}
          />
        </SpeedDial>
      </motion.div>

      {/* Schedule Configuration Dialog */}
      <Dialog
        open={scheduleDialogOpen}
        onClose={() => setScheduleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <SettingsIcon />
            <span>Payout Schedule Settings</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Schedule Type</InputLabel>
                <Select
                  value={scheduleForm.scheduleType}
                  label="Schedule Type"
                  onChange={(e) =>
                    setScheduleForm(prev => ({
                      ...prev,
                      scheduleType: e.target.value as any
                    }))
                  }
                >
                  <MenuItem value="WEEKLY">Weekly</MenuItem>
                  <MenuItem value="BIWEEKLY">Bi-weekly</MenuItem>
                  <MenuItem value="MONTHLY">Monthly</MenuItem>
                  <MenuItem value="QUARTERLY">Quarterly</MenuItem>
                  <MenuItem value="MANUAL">Manual Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Minimum Payout Amount"
                type="number"
                value={scheduleForm.minimumPayoutAmount / 100}
                onChange={(e) =>
                  setScheduleForm(prev => ({
                    ...prev,
                    minimumPayoutAmount: Math.round(parseFloat(e.target.value) * 100)
                  }))
                }
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>
                }}
              />
            </Grid>

            {scheduleForm.scheduleType !== 'MANUAL' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label={
                    scheduleForm.scheduleType === 'WEEKLY' || scheduleForm.scheduleType === 'BIWEEKLY'
                      ? 'Day of Week (1=Monday, 7=Sunday)'
                      : 'Day of Month'
                  }
                  type="number"
                  value={scheduleForm.payoutDay}
                  onChange={(e) =>
                    setScheduleForm(prev => ({
                      ...prev,
                      payoutDay: parseInt(e.target.value)
                    }))
                  }
                  inputProps={{
                    min: 1,
                    max: scheduleForm.scheduleType === 'WEEKLY' || scheduleForm.scheduleType === 'BIWEEKLY' ? 7 : 31
                  }}
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Notify Before Payout (days)"
                type="number"
                value={scheduleForm.notifyBeforePayoutDays}
                onChange={(e) =>
                  setScheduleForm(prev => ({
                    ...prev,
                    notifyBeforePayoutDays: parseInt(e.target.value)
                  }))
                }
                inputProps={{ min: 0, max: 30 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={scheduleForm.isActive}
                      onChange={(e) =>
                        setScheduleForm(prev => ({
                          ...prev,
                          isActive: e.target.checked
                        }))
                      }
                    />
                  }
                  label="Schedule Active"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={scheduleForm.autoPayoutEnabled}
                      onChange={(e) =>
                        setScheduleForm(prev => ({
                          ...prev,
                          autoPayoutEnabled: e.target.checked
                        }))
                      }
                    />
                  }
                  label="Automatic Payouts (requires admin approval)"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={scheduleForm.emailNotifications}
                      onChange={(e) =>
                        setScheduleForm(prev => ({
                          ...prev,
                          emailNotifications: e.target.checked
                        }))
                      }
                    />
                  }
                  label="Email Notifications"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={scheduleForm.smsNotifications}
                      onChange={(e) =>
                        setScheduleForm(prev => ({
                          ...prev,
                          smsNotifications: e.target.checked
                        }))
                      }
                    />
                  }
                  label="SMS Notifications"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSchedule}>
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Payout Dialog */}
      <Dialog
        open={payoutDialogOpen}
        onClose={() => setPayoutDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Manual Payout</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                This will create a payout request for all pending commissions: {' '}
                <strong>{formatCurrency(dashboardData.pendingCommissions.totalAmount)}</strong>
              </Typography>
            </Alert>

            <Typography variant="body2" color="textSecondary">
              The payout will be processed according to your payment method settings and 
              will require admin approval before processing.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayoutDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreatePayout}
            disabled={!dashboardData.pendingCommissions.totalAmount}
          >
            Create Payout
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payout Detail Dialog */}
      {selectedPayout && (
        <PayoutDetailDialog
          payout={selectedPayout}
          open={payoutDetailDialogOpen}
          onClose={() => {
            setPayoutDetailDialogOpen(false);
            setSelectedPayout(null);
          }}
          onStatusUpdate={() => fetchDashboardData()}
        />
      )}
    </Box>
  );
}

// Sub-components (to be implemented in separate sections)
function PayoutHistoryPanel({ payouts, onPayoutClick }: {
  payouts: Payout[];
  onPayoutClick: (payout: Payout) => void;
}) {
  if (!payouts.length) {
    return (
      <Alert severity="info">
        <Typography>No payouts found. Create your first payout to get started.</Typography>
      </Alert>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Period</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payouts.map((payout) => (
            <TableRow key={payout.id} hover>
              <TableCell>{format(new Date(payout.createdAt), 'MMM dd, yyyy')}</TableCell>
              <TableCell>
                {format(new Date(payout.periodStart), 'MMM dd')} - {format(new Date(payout.periodEnd), 'MMM dd, yyyy')}
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(payout.amount)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  icon={getStatusIcon(payout.status)}
                  label={payout.status}
                  sx={{
                    bgcolor: getStatusColor(payout.status) + '20',
                    color: getStatusColor(payout.status),
                    borderColor: getStatusColor(payout.status)
                  }}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>{payout.scheduleType}</TableCell>
              <TableCell align="center">
                <IconButton
                  size="small"
                  onClick={() => onPayoutClick(payout)}
                >
                  <VisibilityIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SchedulePanel({ schedule, nextPayoutDate, onEditSchedule }: {
  schedule?: PayoutSchedule;
  nextPayoutDate?: Date | null;
  onEditSchedule: () => void;
}) {
  if (!schedule) {
    return (
      <Stack spacing={3} alignItems="center" sx={{ py: 4 }}>
        <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
        <Typography variant="h6" color="textSecondary">
          No payout schedule configured
        </Typography>
        <Button variant="contained" onClick={onEditSchedule}>
          Set Up Schedule
        </Button>
      </Stack>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardHeader title="Current Schedule" />
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="textSecondary">Type</Typography>
                <Typography variant="body1" fontWeight="medium">{schedule.scheduleType}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Status</Typography>
                <Chip
                  size="small"
                  label={schedule.isActive ? 'Active' : 'Inactive'}
                  color={schedule.isActive ? 'success' : 'default'}
                />
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Minimum Amount</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatCurrency(schedule.minimumPayoutAmount)}
                </Typography>
              </Box>
              {schedule.payoutDay && (
                <Box>
                  <Typography variant="body2" color="textSecondary">Payout Day</Typography>
                  <Typography variant="body1" fontWeight="medium">{schedule.payoutDay}</Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardHeader title="Next Payout" />
          <CardContent>
            <Stack spacing={2}>
              {nextPayoutDate ? (
                <>
                  <Typography variant="h4" color="primary">
                    {format(nextPayoutDate, 'MMM dd')}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {format(nextPayoutDate, 'yyyy')}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${Math.ceil((nextPayoutDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days remaining`}
                    color="info"
                  />
                </>
              ) : (
                <Typography color="textSecondary">
                  Manual payouts only
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Stack direction="row" justifyContent="center">
          <Button variant="outlined" onClick={onEditSchedule}>
            Edit Schedule Settings
          </Button>
        </Stack>
      </Grid>
    </Grid>
  );
}


// Payout Detail Dialog Component
function PayoutDetailDialog({ payout, open, onClose, onStatusUpdate }: {
  payout: Payout;
  open: boolean;
  onClose: () => void;
  onStatusUpdate: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <PaymentIcon />
          <span>Payout Details</span>
          <Chip
            size="small"
            icon={getStatusIcon(payout.status)}
            label={payout.status}
            sx={{
              bgcolor: getStatusColor(payout.status) + '20',
              color: getStatusColor(payout.status),
              borderColor: getStatusColor(payout.status)
            }}
            variant="outlined"
          />
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="textSecondary">Amount</Typography>
                <Typography variant="h6">{formatCurrency(payout.amount)}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Commission Rate</Typography>
                <Typography variant="body1">{payout.commissionRate}%</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Schedule Type</Typography>
                <Typography variant="body1">{payout.scheduleType}</Typography>
              </Box>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="textSecondary">Period</Typography>
                <Typography variant="body1">
                  {format(new Date(payout.periodStart), 'MMM dd')} - {format(new Date(payout.periodEnd), 'MMM dd, yyyy')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">Created</Typography>
                <Typography variant="body1">{format(new Date(payout.createdAt), 'MMM dd, yyyy HH:mm')}</Typography>
              </Box>
              {payout.processedAt && (
                <Box>
                  <Typography variant="body2" color="textSecondary">Processed</Typography>
                  <Typography variant="body1">{format(new Date(payout.processedAt), 'MMM dd, yyyy HH:mm')}</Typography>
                </Box>
              )}
            </Stack>
          </Grid>

          {payout.description && (
            <Grid item xs={12}>
              <Box>
                <Typography variant="body2" color="textSecondary">Description</Typography>
                <Typography variant="body1">{payout.description}</Typography>
              </Box>
            </Grid>
          )}

          {payout.notes && (
            <Grid item xs={12}>
              <Box>
                <Typography variant="body2" color="textSecondary">Notes</Typography>
                <Typography variant="body1">{payout.notes}</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
