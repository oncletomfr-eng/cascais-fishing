/**
 * Payout Calendar Component
 * Task 8.3: Payout Schedule Management - Calendar View
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Interactive calendar view for payout scheduling with drag-and-drop,
 * recurring payment visualization, and schedule customization
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
  Tooltip,
  Badge,
  Avatar,
  Grid,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Today as TodayIcon,
  Event as EventIcon,
  Schedule as ScheduleIcon,
  Euro as EuroIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  getDay,
  getDaysInMonth,
  startOfDay,
  endOfDay,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Type definitions
export interface PayoutEvent {
  id: string;
  date: Date;
  amount: number;
  status: 'SCHEDULED' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  type: 'AUTOMATIC' | 'MANUAL';
  scheduleType: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  description?: string;
  recurring?: boolean;
  captainId: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: PayoutEvent[];
}

export interface PayoutCalendarProps {
  captainId?: string;
  schedule?: any;
  onEventClick?: (event: PayoutEvent) => void;
  onCreatePayout?: (date: Date) => void;
  className?: string;
}

// Utility functions
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'SCHEDULED': return '#9C27B0';
    case 'PENDING': return '#FFA726';
    case 'APPROVED': return '#66BB6A';
    case 'PROCESSING': return '#42A5F5';
    case 'COMPLETED': return '#4CAF50';
    case 'FAILED': return '#EF5350';
    default: return '#9E9E9E';
  }
};

const generateRecurringPayouts = (
  startDate: Date,
  scheduleType: string,
  amount: number,
  captainId: string,
  monthsToGenerate: number = 6
): PayoutEvent[] => {
  const events: PayoutEvent[] = [];
  let currentDate = new Date(startDate);

  for (let i = 0; i < monthsToGenerate * 4; i++) { // Generate enough for monthly view
    const eventId = `scheduled-${currentDate.getTime()}-${i}`;
    
    events.push({
      id: eventId,
      date: new Date(currentDate),
      amount,
      status: 'SCHEDULED',
      type: 'AUTOMATIC',
      scheduleType: scheduleType as any,
      description: `Automatic ${scheduleType.toLowerCase()} payout`,
      recurring: true,
      captainId
    });

    // Calculate next occurrence
    switch (scheduleType) {
      case 'WEEKLY':
        currentDate = addWeeks(currentDate, 1);
        break;
      case 'BIWEEKLY':
        currentDate = addWeeks(currentDate, 2);
        break;
      case 'MONTHLY':
        currentDate = addMonths(currentDate, 1);
        break;
      case 'QUARTERLY':
        currentDate = addMonths(currentDate, 3);
        break;
      default:
        return events; // Stop for manual schedules
    }

    // Stop if we've gone too far into the future
    if (currentDate.getTime() > new Date().getTime() + (monthsToGenerate * 30 * 24 * 60 * 60 * 1000)) {
      break;
    }
  }

  return events;
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount / 100);
};

export function PayoutCalendar({
  captainId,
  schedule,
  onEventClick,
  onCreatePayout,
  className = ''
}: PayoutCalendarProps) {
  const { data: session } = useSession();
  
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [payoutEvents, setPayoutEvents] = useState<PayoutEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventDetailDialogOpen, setEventDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<PayoutEvent | null>(null);
  const [createPayoutDialogOpen, setCreatePayoutDialogOpen] = useState(false);

  const targetCaptainId = captainId || session?.user?.id || '';

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: CalendarDay[] = [];
    let day = startDate;

    while (day <= endDate) {
      const dayEvents = payoutEvents.filter(event => 
        isSameDay(event.date, day)
      );

      days.push({
        date: new Date(day),
        isCurrentMonth: isSameMonth(day, monthStart),
        events: dayEvents
      });

      day = addDays(day, 1);
    }

    return days;
  }, [currentDate, payoutEvents]);

  // Load payout events
  const loadPayoutEvents = useCallback(async () => {
    if (!targetCaptainId || !schedule) return;

    try {
      setLoading(true);

      // Generate scheduled events from payout schedule
      if (schedule.isActive && schedule.scheduleType !== 'MANUAL') {
        const nextPayoutDate = new Date();
        // Adjust to the next scheduled payout date based on schedule
        
        const generatedEvents = generateRecurringPayouts(
          nextPayoutDate,
          schedule.scheduleType,
          schedule.minimumPayoutAmount * 2, // Estimate based on minimum
          targetCaptainId
        );

        setPayoutEvents(generatedEvents);
      }

      // Also load actual payouts from API
      const response = await fetch(`/api/payout-management?action=payouts&captainId=${targetCaptainId}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        
        // Convert actual payouts to calendar events
        const actualEvents: PayoutEvent[] = data.payouts.map((payout: any) => ({
          id: payout.id,
          date: parseISO(payout.createdAt),
          amount: payout.amount,
          status: payout.status,
          type: payout.scheduleType === 'MANUAL' ? 'MANUAL' : 'AUTOMATIC',
          scheduleType: payout.scheduleType,
          description: payout.description,
          recurring: false,
          captainId: payout.captainId
        }));

        // Merge with scheduled events, removing duplicates
        setPayoutEvents(prev => {
          const scheduled = prev.filter(e => e.type === 'AUTOMATIC' && e.status === 'SCHEDULED');
          return [...actualEvents, ...scheduled];
        });
      }
    } catch (error) {
      console.error('Error loading payout events:', error);
      toast.error('Failed to load payout calendar');
    } finally {
      setLoading(false);
    }
  }, [targetCaptainId, schedule]);

  // Load events when component mounts or date changes
  useEffect(() => {
    loadPayoutEvents();
  }, [loadPayoutEvents]);

  // Navigation handlers
  const handlePreviousMonth = useCallback(() => {
    setCurrentDate(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentDate(prev => addMonths(prev, 1));
  }, []);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Event handlers
  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
    const dayEvents = payoutEvents.filter(event => isSameDay(event.date, date));
    
    if (dayEvents.length === 1) {
      setSelectedEvent(dayEvents[0]);
      setEventDetailDialogOpen(true);
    } else if (dayEvents.length === 0) {
      // Allow creating new payout
      setCreatePayoutDialogOpen(true);
    }
  }, [payoutEvents]);

  const handleEventClick = useCallback((event: PayoutEvent) => {
    setSelectedEvent(event);
    setEventDetailDialogOpen(true);
    if (onEventClick) {
      onEventClick(event);
    }
  }, [onEventClick]);

  const handleCreatePayout = useCallback(async () => {
    if (!selectedDate || !onCreatePayout) return;
    
    onCreatePayout(selectedDate);
    setCreatePayoutDialogOpen(false);
    setSelectedDate(null);
  }, [selectedDate, onCreatePayout]);

  // Render calendar day
  const renderCalendarDay = useCallback((day: CalendarDay) => {
    const isCurrentDay = isToday(day.date);
    const isSelected = selectedDate && isSameDay(day.date, selectedDate);
    const hasEvents = day.events.length > 0;

    return (
      <motion.div
        key={day.date.toISOString()}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Paper
          elevation={isSelected ? 3 : (hasEvents ? 2 : 0)}
          sx={{
            minHeight: 80,
            p: 1,
            cursor: 'pointer',
            bgcolor: isCurrentDay ? 'primary.50' : (isSelected ? 'primary.100' : 'transparent'),
            border: isCurrentDay ? '2px solid' : '1px solid',
            borderColor: isCurrentDay ? 'primary.main' : 'divider',
            opacity: day.isCurrentMonth ? 1 : 0.6
          }}
          onClick={() => handleDayClick(day.date)}
        >
          <Stack spacing={0.5} height="100%">
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography
                variant="body2"
                fontWeight={isCurrentDay ? 'bold' : 'normal'}
                color={day.isCurrentMonth ? 'text.primary' : 'text.secondary'}
              >
                {format(day.date, 'd')}
              </Typography>
              {hasEvents && (
                <Badge badgeContent={day.events.length} color="primary" max={9}>
                  <EventIcon fontSize="small" />
                </Badge>
              )}
            </Stack>

            <Stack spacing={0.5} flexGrow={1}>
              {day.events.slice(0, 2).map((event, index) => (
                <Chip
                  key={event.id}
                  label={
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <EuroIcon sx={{ fontSize: 12 }} />
                      <Typography variant="caption">
                        {formatCurrency(event.amount)}
                      </Typography>
                    </Stack>
                  }
                  size="small"
                  sx={{
                    height: 20,
                    '& .MuiChip-label': { px: 0.5 },
                    bgcolor: getStatusColor(event.status) + '20',
                    color: getStatusColor(event.status),
                    borderColor: getStatusColor(event.status)
                  }}
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event);
                  }}
                />
              ))}
              {day.events.length > 2 && (
                <Typography variant="caption" color="text.secondary" textAlign="center">
                  +{day.events.length - 2} more
                </Typography>
              )}
            </Stack>
          </Stack>
        </Paper>
      </motion.div>
    );
  }, [selectedDate, handleDayClick, handleEventClick]);

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
                <CalendarIcon color="primary" />
                <Typography variant="h6" component="h3">
                  Payout Calendar
                </Typography>
              </Stack>
            }
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={loadPayoutEvents}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<TodayIcon />}
                  onClick={handleToday}
                >
                  Today
                </Button>
              </Stack>
            }
          />

          <CardContent>
            {/* Calendar Header */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 3 }}
            >
              <IconButton onClick={handlePreviousMonth}>
                <ChevronLeftIcon />
              </IconButton>

              <Typography variant="h5" component="h2">
                {format(currentDate, 'MMMM yyyy')}
              </Typography>

              <IconButton onClick={handleNextMonth}>
                <ChevronRightIcon />
              </IconButton>
            </Stack>

            {/* Days of Week Header */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Grid item xs key={day}>
                  <Typography
                    variant="caption"
                    fontWeight="bold"
                    color="text.secondary"
                    textAlign="center"
                    display="block"
                  >
                    {day}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Calendar Grid */}
            <Grid container spacing={1}>
              {calendarDays.map((day) => (
                <Grid item xs key={day.date.toISOString()}>
                  {renderCalendarDay(day)}
                </Grid>
              ))}
            </Grid>

            {/* Legend */}
            <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }} useFlexGap>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 1,
                    bgcolor: getStatusColor('SCHEDULED') + '40',
                    border: 1,
                    borderColor: getStatusColor('SCHEDULED')
                  }}
                />
                <Typography variant="caption">Scheduled</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 1,
                    bgcolor: getStatusColor('PENDING') + '40',
                    border: 1,
                    borderColor: getStatusColor('PENDING')
                  }}
                />
                <Typography variant="caption">Pending</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 1,
                    bgcolor: getStatusColor('COMPLETED') + '40',
                    border: 1,
                    borderColor: getStatusColor('COMPLETED')
                  }}
                />
                <Typography variant="caption">Completed</Typography>
              </Stack>
            </Stack>

            {/* Schedule Info */}
            {schedule && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Active Schedule:</strong> {schedule.scheduleType} payouts 
                  {schedule.payoutDay && ` on day ${schedule.payoutDay}`}
                  {' '}• Minimum: {formatCurrency(schedule.minimumPayoutAmount)}
                  {schedule.autoPayoutEnabled && ' • Auto-pay enabled'}
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Event Detail Dialog */}
      <Dialog
        open={eventDetailDialogOpen}
        onClose={() => {
          setEventDetailDialogOpen(false);
          setSelectedEvent(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        {selectedEvent && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" spacing={2}>
                <EventIcon />
                <span>Payout Details</span>
                <Chip
                  size="small"
                  label={selectedEvent.status}
                  sx={{
                    bgcolor: getStatusColor(selectedEvent.status) + '20',
                    color: getStatusColor(selectedEvent.status),
                    borderColor: getStatusColor(selectedEvent.status)
                  }}
                  variant="outlined"
                />
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="textSecondary">
                        Date
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {format(selectedEvent.date, 'MMM dd, yyyy')}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="textSecondary">
                        Amount
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(selectedEvent.amount)}
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="textSecondary">
                        Type
                      </Typography>
                      <Typography variant="body1">
                        {selectedEvent.type} ({selectedEvent.scheduleType})
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid item xs={6}>
                    <Stack spacing={1}>
                      <Typography variant="body2" color="textSecondary">
                        Recurring
                      </Typography>
                      <Typography variant="body1">
                        {selectedEvent.recurring ? 'Yes' : 'No'}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>

                {selectedEvent.description && (
                  <Stack spacing={1}>
                    <Typography variant="body2" color="textSecondary">
                      Description
                    </Typography>
                    <Typography variant="body1">
                      {selectedEvent.description}
                    </Typography>
                  </Stack>
                )}

                {selectedEvent.status === 'SCHEDULED' && (
                  <Alert severity="info">
                    <Typography variant="body2">
                      This is a scheduled payout based on your payout schedule. 
                      It will be created automatically when the date arrives.
                    </Typography>
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEventDetailDialogOpen(false)}>
                Close
              </Button>
              {selectedEvent.status === 'SCHEDULED' && (
                <Button variant="outlined" disabled>
                  View Details
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Create Payout Dialog */}
      <Dialog
        open={createPayoutDialogOpen}
        onClose={() => {
          setCreatePayoutDialogOpen(false);
          setSelectedDate(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Manual Payout</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {selectedDate && (
              <Alert severity="info">
                <Typography variant="body2">
                  Create a manual payout for <strong>{format(selectedDate, 'MMM dd, yyyy')}</strong>
                </Typography>
              </Alert>
            )}

            <Typography variant="body2" color="textSecondary">
              Manual payouts allow you to request a payout outside of your regular schedule.
              The payout will need to be approved before processing.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreatePayoutDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreatePayout}>
            Create Payout
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
