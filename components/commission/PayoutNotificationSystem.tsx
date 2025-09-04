/**
 * Payout Notification System Component
 * Task 8.3: Payout Schedule Management - Notifications & Reminders
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Comprehensive notification system for payout reminders, status updates,
 * and automated communication with captains about their payouts
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
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Badge,
  Tooltip,
  Grid,
  Paper,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsActive as ActiveNotificationIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Schedule as ScheduleIcon,
  Send as SendIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Person as PersonIcon,
  Euro as EuroIcon,
  AccessTime as TimeIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format, parseISO, addDays, isBefore } from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Interface definitions
export interface NotificationRule {
  id: string;
  captainId: string;
  type: 'PAYOUT_SCHEDULED' | 'PAYOUT_APPROVED' | 'PAYOUT_PROCESSING' | 'PAYOUT_COMPLETED' | 'PAYOUT_FAILED' | 'PAYOUT_REMINDER';
  isActive: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  
  // For reminders
  daysBefore?: number;
  
  // Template customization
  emailTemplate?: string;
  smsTemplate?: string;
  
  // Conditions
  minimumAmount?: number;
  onlyManualPayouts?: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface NotificationHistory {
  id: string;
  captainId: string;
  captain?: {
    name?: string;
    email: string;
  };
  payoutId: string;
  type: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'PENDING';
  sentAt: string;
  deliveredAt?: string;
  errorMessage?: string;
  
  // Message details
  subject?: string;
  content: string;
  
  // Related payout info
  payoutAmount: number;
  payoutStatus: string;
}

export interface PayoutNotificationSystemProps {
  captainId?: string;
  onNotificationSent?: () => void;
  className?: string;
}

// Utility functions
const getNotificationTypeLabel = (type: string): string => {
  switch (type) {
    case 'PAYOUT_SCHEDULED': return 'Payout Scheduled';
    case 'PAYOUT_APPROVED': return 'Payout Approved';
    case 'PAYOUT_PROCESSING': return 'Payout Processing';
    case 'PAYOUT_COMPLETED': return 'Payout Completed';
    case 'PAYOUT_FAILED': return 'Payout Failed';
    case 'PAYOUT_REMINDER': return 'Payout Reminder';
    default: return type.replace(/_/g, ' ');
  }
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'PAYOUT_SCHEDULED': return <ScheduleIcon />;
    case 'PAYOUT_APPROVED': return <CheckIcon />;
    case 'PAYOUT_PROCESSING': return <TimeIcon />;
    case 'PAYOUT_COMPLETED': return <CheckIcon />;
    case 'PAYOUT_FAILED': return <ErrorIcon />;
    case 'PAYOUT_REMINDER': return <NotificationsIcon />;
    default: return <InfoIcon />;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SENT': return '#2196F3';
    case 'DELIVERED': return '#4CAF50';
    case 'FAILED': return '#F44336';
    case 'PENDING': return '#FF9800';
    default: return '#9E9E9E';
  }
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount / 100);
};

// Default notification templates
const DEFAULT_EMAIL_TEMPLATES = {
  PAYOUT_SCHEDULED: {
    subject: 'Payout Scheduled for {{date}}',
    body: `Dear {{captainName}},

Your payout of {{amount}} has been scheduled for {{date}}.

Payout Details:
- Amount: {{amount}}
- Period: {{periodStart}} - {{periodEnd}}
- Commission Rate: {{commissionRate}}%

The payout will be processed according to your selected payment method.

Best regards,
Cascais Fishing Team`
  },
  PAYOUT_APPROVED: {
    subject: 'Payout Approved - {{amount}}',
    body: `Dear {{captainName}},

Great news! Your payout of {{amount}} has been approved and will be processed shortly.

The funds will be transferred to your default payment method within 1-3 business days.

Best regards,
Cascais Fishing Team`
  },
  PAYOUT_COMPLETED: {
    subject: 'Payout Completed - {{amount}}',
    body: `Dear {{captainName}},

Your payout of {{amount}} has been successfully processed and transferred to your account.

You should see the funds in your account within 1-3 business days depending on your bank.

Thank you for being part of Cascais Fishing!

Best regards,
Cascais Fishing Team`
  }
};

export function PayoutNotificationSystem({
  captainId,
  onNotificationSent,
  className = ''
}: PayoutNotificationSystemProps) {
  const { data: session } = useSession();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');
  
  // Dialog states
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [testNotificationDialogOpen, setTestNotificationDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<NotificationRule | null>(null);
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistory | null>(null);
  
  // Form states
  const [ruleForm, setRuleForm] = useState({
    type: 'PAYOUT_REMINDER' as const,
    isActive: true,
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    daysBefore: 3,
    minimumAmount: 0,
    onlyManualPayouts: false,
    emailTemplate: '',
    smsTemplate: ''
  });

  const targetCaptainId = captainId || session?.user?.id || '';
  const isAdmin = session?.user?.role === 'ADMIN';

  // Load notification data
  const fetchNotificationData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load notification rules
      const rulesResponse = await fetch(
        `/api/notifications/payout-rules?captainId=${targetCaptainId}`
      );
      if (rulesResponse.ok) {
        const rulesData = await rulesResponse.json();
        setNotificationRules(rulesData.rules || []);
      }
      
      // Load notification history
      const historyResponse = await fetch(
        `/api/notifications/payout-history?captainId=${targetCaptainId}&limit=50`
      );
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setNotificationHistory(historyData.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notification data:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setLoading(false);
    }
  }, [targetCaptainId]);

  // Load data on component mount
  useEffect(() => {
    if (targetCaptainId) {
      fetchNotificationData();
    }
  }, [fetchNotificationData, targetCaptainId]);

  // Handle saving notification rule
  const handleSaveRule = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/payout-rules', {
        method: selectedRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...ruleForm,
          captainId: targetCaptainId,
          ...(selectedRule && { ruleId: selectedRule.id })
        })
      });

      if (!response.ok) throw new Error('Failed to save notification rule');

      toast.success(`Notification rule ${selectedRule ? 'updated' : 'created'} successfully`);
      setRuleDialogOpen(false);
      setSelectedRule(null);
      fetchNotificationData();
    } catch (error) {
      console.error('Error saving notification rule:', error);
      toast.error('Failed to save notification rule');
    }
  }, [ruleForm, targetCaptainId, selectedRule, fetchNotificationData]);

  // Handle sending test notification
  const handleSendTestNotification = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: targetCaptainId,
          type: ruleForm.type,
          emailEnabled: ruleForm.emailEnabled,
          smsEnabled: ruleForm.smsEnabled
        })
      });

      if (!response.ok) throw new Error('Failed to send test notification');

      toast.success('Test notification sent successfully');
      setTestNotificationDialogOpen(false);
      onNotificationSent?.();
      fetchNotificationData();
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    }
  }, [ruleForm, targetCaptainId, onNotificationSent, fetchNotificationData]);

  // Handle deleting notification rule
  const handleDeleteRule = useCallback(async (ruleId: string) => {
    try {
      const response = await fetch('/api/notifications/payout-rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleId, captainId: targetCaptainId })
      });

      if (!response.ok) throw new Error('Failed to delete notification rule');

      toast.success('Notification rule deleted');
      fetchNotificationData();
    } catch (error) {
      console.error('Error deleting notification rule:', error);
      toast.error('Failed to delete notification rule');
    }
  }, [targetCaptainId, fetchNotificationData]);

  // Render notification rules
  const renderNotificationRules = useCallback(() => {
    if (notificationRules.length === 0) {
      return (
        <Alert severity="info">
          <Typography variant="body2">
            No notification rules configured. Create rules to receive automatic notifications about your payouts.
          </Typography>
        </Alert>
      );
    }

    return (
      <List>
        {notificationRules.map((rule, index) => (
          <React.Fragment key={rule.id}>
            <ListItem>
              <ListItemIcon>
                <Avatar
                  sx={{
                    bgcolor: rule.isActive ? 'primary.main' : 'grey.300'
                  }}
                >
                  {getNotificationIcon(rule.type)}
                </Avatar>
              </ListItemIcon>

              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body1" fontWeight="medium">
                      {getNotificationTypeLabel(rule.type)}
                    </Typography>
                    
                    {!rule.isActive && (
                      <Chip label="Disabled" size="small" variant="outlined" />
                    )}
                  </Stack>
                }
                secondary={
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {rule.emailEnabled && <EmailIcon fontSize="small" />}
                      {rule.smsEnabled && <SmsIcon fontSize="small" />}
                      {rule.pushEnabled && <NotificationsIcon fontSize="small" />}
                    </Stack>
                    
                    {rule.daysBefore && (
                      <Typography variant="caption" color="textSecondary">
                        Send {rule.daysBefore} days before payout
                      </Typography>
                    )}
                    
                    {rule.minimumAmount && rule.minimumAmount > 0 && (
                      <Typography variant="caption" color="textSecondary">
                        Only for payouts ≥ {formatCurrency(rule.minimumAmount)}
                      </Typography>
                    )}
                  </Stack>
                }
              />

              <ListItemSecondaryAction>
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Edit">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedRule(rule);
                        setRuleForm({
                          type: rule.type as any,
                          isActive: rule.isActive,
                          emailEnabled: rule.emailEnabled,
                          smsEnabled: rule.smsEnabled,
                          pushEnabled: rule.pushEnabled,
                          daysBefore: rule.daysBefore || 3,
                          minimumAmount: rule.minimumAmount || 0,
                          onlyManualPayouts: rule.onlyManualPayouts || false,
                          emailTemplate: rule.emailTemplate || '',
                          smsTemplate: rule.smsTemplate || ''
                        });
                        setRuleDialogOpen(true);
                      }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Delete">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>
            {index < notificationRules.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  }, [notificationRules, handleDeleteRule]);

  // Render notification history
  const renderNotificationHistory = useCallback(() => {
    if (notificationHistory.length === 0) {
      return (
        <Alert severity="info">
          <Typography variant="body2">
            No notification history available.
          </Typography>
        </Alert>
      );
    }

    return (
      <Timeline>
        {notificationHistory.slice(0, 20).map((notification) => (
          <TimelineItem key={notification.id}>
            <TimelineSeparator>
              <TimelineDot
                sx={{
                  bgcolor: getStatusColor(notification.status)
                }}
              >
                {notification.channel === 'EMAIL' ? <EmailIcon /> :
                 notification.channel === 'SMS' ? <SmsIcon /> :
                 <NotificationsIcon />}
              </TimelineDot>
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Stack spacing={1}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="medium">
                      {getNotificationTypeLabel(notification.type)}
                    </Typography>
                    <Chip
                      label={notification.status}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(notification.status) + '20',
                        color: getStatusColor(notification.status)
                      }}
                      variant="outlined"
                    />
                  </Stack>
                  
                  <Typography variant="caption" color="textSecondary">
                    {notification.channel} • {format(parseISO(notification.sentAt), 'MMM dd, HH:mm')}
                    {' '}• Payout: {formatCurrency(notification.payoutAmount)}
                  </Typography>
                  
                  {notification.subject && (
                    <Typography variant="body2">
                      <strong>Subject:</strong> {notification.subject}
                    </Typography>
                  )}
                  
                  {notification.errorMessage && (
                    <Alert severity="error" size="small">
                      <Typography variant="caption">
                        {notification.errorMessage}
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </Paper>
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
    );
  }, [notificationHistory]);

  if (loading) {
    return (
      <Box className={className}>
        <Card>
          <CardHeader title="Loading notifications..." />
          <CardContent>
            <Typography>Loading...</Typography>
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
                <NotificationsIcon color="primary" />
                <Typography variant="h6" component="h3">
                  Payout Notifications
                </Typography>
              </Stack>
            }
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={fetchNotificationData}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSelectedRule(null);
                    setRuleForm({
                      type: 'PAYOUT_REMINDER',
                      isActive: true,
                      emailEnabled: true,
                      smsEnabled: false,
                      pushEnabled: true,
                      daysBefore: 3,
                      minimumAmount: 0,
                      onlyManualPayouts: false,
                      emailTemplate: '',
                      smsTemplate: ''
                    });
                    setRuleDialogOpen(true);
                  }}
                >
                  Add Rule
                </Button>
              </Stack>
            }
          />

          <CardContent>
            {/* Tab Navigation */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button
                variant={activeTab === 'rules' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('rules')}
                startIcon={<SettingsIcon />}
              >
                Notification Rules
              </Button>
              <Button
                variant={activeTab === 'history' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('history')}
                startIcon={<HistoryIcon />}
              >
                History
                {notificationHistory.length > 0 && (
                  <Badge badgeContent={notificationHistory.length} color="primary" sx={{ ml: 1 }} />
                )}
              </Button>
            </Stack>

            {/* Tab Content */}
            {activeTab === 'rules' && renderNotificationRules()}
            {activeTab === 'history' && renderNotificationHistory()}
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Rule Dialog */}
      <Dialog
        open={ruleDialogOpen}
        onClose={() => setRuleDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRule ? 'Edit Notification Rule' : 'Add Notification Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Notification Type</InputLabel>
                <Select
                  value={ruleForm.type}
                  label="Notification Type"
                  onChange={(e) =>
                    setRuleForm(prev => ({
                      ...prev,
                      type: e.target.value as any
                    }))
                  }
                >
                  <MenuItem value="PAYOUT_REMINDER">Payout Reminder</MenuItem>
                  <MenuItem value="PAYOUT_SCHEDULED">Payout Scheduled</MenuItem>
                  <MenuItem value="PAYOUT_APPROVED">Payout Approved</MenuItem>
                  <MenuItem value="PAYOUT_PROCESSING">Payout Processing</MenuItem>
                  <MenuItem value="PAYOUT_COMPLETED">Payout Completed</MenuItem>
                  <MenuItem value="PAYOUT_FAILED">Payout Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {ruleForm.type === 'PAYOUT_REMINDER' && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Days Before Payout"
                  value={ruleForm.daysBefore}
                  onChange={(e) =>
                    setRuleForm(prev => ({
                      ...prev,
                      daysBefore: parseInt(e.target.value) || 3
                    }))
                  }
                  inputProps={{ min: 1, max: 30 }}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Notification Channels</Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleForm.emailEnabled}
                      onChange={(e) =>
                        setRuleForm(prev => ({
                          ...prev,
                          emailEnabled: e.target.checked
                        }))
                      }
                    />
                  }
                  label="Email Notifications"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleForm.smsEnabled}
                      onChange={(e) =>
                        setRuleForm(prev => ({
                          ...prev,
                          smsEnabled: e.target.checked
                        }))
                      }
                    />
                  }
                  label="SMS Notifications (Coming Soon)"
                  disabled
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleForm.pushEnabled}
                      onChange={(e) =>
                        setRuleForm(prev => ({
                          ...prev,
                          pushEnabled: e.target.checked
                        }))
                      }
                    />
                  }
                  label="Push Notifications (Coming Soon)"
                  disabled
                />
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <Stack spacing={2}>
                <Typography variant="subtitle2">Conditions (Optional)</Typography>
                
                <TextField
                  fullWidth
                  type="number"
                  label="Minimum Payout Amount (€)"
                  value={ruleForm.minimumAmount / 100}
                  onChange={(e) =>
                    setRuleForm(prev => ({
                      ...prev,
                      minimumAmount: Math.round(parseFloat(e.target.value || '0') * 100)
                    }))
                  }
                  helperText="Only send notifications for payouts above this amount"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={ruleForm.onlyManualPayouts}
                      onChange={(e) =>
                        setRuleForm(prev => ({
                          ...prev,
                          onlyManualPayouts: e.target.checked
                        }))
                      }
                    />
                  }
                  label="Only for Manual Payouts"
                />
              </Stack>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleForm.isActive}
                    onChange={(e) =>
                      setRuleForm(prev => ({
                        ...prev,
                        isActive: e.target.checked
                      }))
                    }
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="outlined"
            onClick={() => setTestNotificationDialogOpen(true)}
          >
            Test Notification
          </Button>
          <Button variant="contained" onClick={handleSaveRule}>
            {selectedRule ? 'Update' : 'Create'} Rule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Notification Dialog */}
      <Dialog
        open={testNotificationDialogOpen}
        onClose={() => setTestNotificationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Send Test Notification</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                This will send a test {getNotificationTypeLabel(ruleForm.type).toLowerCase()} notification
                using your current settings.
              </Typography>
            </Alert>

            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Channels:</strong>
              </Typography>
              {ruleForm.emailEnabled && (
                <Typography variant="caption" color="textSecondary">
                  • Email notification will be sent
                </Typography>
              )}
              {ruleForm.smsEnabled && (
                <Typography variant="caption" color="textSecondary">
                  • SMS notification will be sent
                </Typography>
              )}
              {!ruleForm.emailEnabled && !ruleForm.smsEnabled && (
                <Typography variant="caption" color="error">
                  No notification channels selected
                </Typography>
              )}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestNotificationDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendTestNotification}
            disabled={!ruleForm.emailEnabled && !ruleForm.smsEnabled}
          >
            Send Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
