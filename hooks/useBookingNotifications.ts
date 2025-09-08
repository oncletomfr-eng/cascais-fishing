import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { BookingSSEEvent } from '@/app/api/booking-notifications/sse/route';

/**
 * React Hook for Real-time Booking Notifications
 * Task 12.3: Enhance booking notifications via SSE
 * 
 * Provides real-time booking status updates, payment confirmations,
 * participant approvals, and other booking-related events
 */

export interface BookingNotificationPreferences {
  receivePaymentUpdates?: boolean;
  receiveStatusUpdates?: boolean;
  receiveReminders?: boolean;
  receiveWeatherAlerts?: boolean;
}

export interface BookingConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  quality: 'good' | 'poor' | 'unknown';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
}

export interface UseBookingNotificationsOptions {
  bookingIds?: string[];
  tripIds?: string[];
  eventTypes?: string[];
  preferences?: BookingNotificationPreferences;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  heartbeatTimeout?: number;
}

export interface BookingNotificationState {
  // Connection state
  connectionStatus: BookingConnectionStatus;
  isConnected: boolean;
  
  // Notifications
  notifications: BookingSSEEvent[];
  unreadCount: number;
  
  // Event handlers
  onBookingConfirmed: (handler: (event: BookingSSEEvent) => void) => () => void;
  onPaymentUpdate: (handler: (event: BookingSSEEvent) => void) => () => void;
  onStatusUpdate: (handler: (event: BookingSSEEvent) => void) => () => void;
  onParticipantUpdate: (handler: (event: BookingSSEEvent) => void) => () => void;
  onReminder: (handler: (event: BookingSSEEvent) => void) => () => void;
  onWeatherAlert: (handler: (event: BookingSSEEvent) => void) => () => void;
  
  // Actions
  subscribeToBookings: (bookingIds: string[]) => Promise<void>;
  unsubscribeFromBookings: (bookingIds: string[]) => Promise<void>;
  subscribeToTrips: (tripIds: string[]) => Promise<void>;
  unsubscribeFromTrips: (tripIds: string[]) => Promise<void>;
  updatePreferences: (preferences: BookingNotificationPreferences) => Promise<void>;
  markAsRead: (eventId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useBookingNotifications(
  options: UseBookingNotificationsOptions = {}
): BookingNotificationState {
  const { data: session, status } = useSession();
  
  const {
    bookingIds = [],
    tripIds = [],
    eventTypes = ['booking_confirmed', 'payment_completed', 'trip_status_changed', 'participant_approved'],
    preferences = {
      receivePaymentUpdates: true,
      receiveStatusUpdates: true,
      receiveReminders: true,
      receiveWeatherAlerts: true
    },
    autoReconnect = true,
    maxReconnectAttempts = 5,
    heartbeatTimeout = 45000 // 45 seconds
  } = options;

  // State management
  const [connectionStatus, setConnectionStatus] = useState<BookingConnectionStatus>({
    status: 'disconnected',
    quality: 'unknown',
    lastHeartbeat: null,
    reconnectAttempts: 0
  });
  
  const [notifications, setNotifications] = useState<BookingSSEEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readEventIds, setReadEventIds] = useState<Set<string>>(new Set());

  // Refs for managing connections and handlers
  const eventSourceRef = useRef<EventSource | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event handler registries
  const bookingConfirmedHandlers = useRef<Set<(event: BookingSSEEvent) => void>>(new Set());
  const paymentHandlers = useRef<Set<(event: BookingSSEEvent) => void>>(new Set());
  const statusHandlers = useRef<Set<(event: BookingSSEEvent) => void>>(new Set());
  const participantHandlers = useRef<Set<(event: BookingSSEEvent) => void>>(new Set());
  const reminderHandlers = useRef<Set<(event: BookingSSEEvent) => void>>(new Set());
  const weatherHandlers = useRef<Set<(event: BookingSSEEvent) => void>>(new Set());

  // Handle SSE events
  const handleSSEEvent = useCallback((eventType: string, data: string) => {
    try {
      const event: BookingSSEEvent = JSON.parse(data);
      
      console.log(`📋 Received booking SSE event: ${eventType}`, event);

      // Add to notifications list
      setNotifications(prev => {
        const updated = [event, ...prev].slice(0, 50); // Keep last 50 notifications
        return updated;
      });

      // Update unread count if not already read
      if (!readEventIds.has(event.id)) {
        setUnreadCount(prev => prev + 1);
      }

      // Route to specific handlers based on event type
      switch (eventType) {
        case 'booking-connected':
          setConnectionStatus(prev => ({
            ...prev,
            status: 'connected',
            quality: 'good',
            reconnectAttempts: 0
          }));
          clientIdRef.current = event.data.clientId;
          break;

        case 'booking-heartbeat':
          setConnectionStatus(prev => ({
            ...prev,
            quality: event.data.connectionQuality || 'good',
            lastHeartbeat: new Date()
          }));
          
          // Reset heartbeat timeout
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
          }
          heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('📋 Booking SSE heartbeat timeout');
            setConnectionStatus(prev => ({ ...prev, quality: 'poor' }));
          }, heartbeatTimeout);
          break;

        case 'booking-booking_confirmed':
          bookingConfirmedHandlers.current.forEach(handler => handler(event));
          break;

        case 'booking-payment_completed':
        case 'booking-payment_failed':
        case 'booking-refund_processed':
          paymentHandlers.current.forEach(handler => handler(event));
          break;

        case 'booking-trip_status_changed':
        case 'booking-booking_cancelled':
          statusHandlers.current.forEach(handler => handler(event));
          break;

        case 'booking-participant_approved':
        case 'booking-participant_rejected':
          participantHandlers.current.forEach(handler => handler(event));
          break;

        case 'booking-reminder_sent':
          reminderHandlers.current.forEach(handler => handler(event));
          break;

        case 'booking-weather_alert':
          weatherHandlers.current.forEach(handler => handler(event));
          break;
      }
    } catch (error) {
      console.error('📋 Error parsing booking SSE event:', error);
    }
  }, [heartbeatTimeout, readEventIds]);

  // Connect to Booking SSE
  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) return;

    console.log('📋 Connecting to Booking SSE...');
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

    // Build query parameters
    const params = new URLSearchParams();
    if (bookingIds.length > 0) params.append('bookings', bookingIds.join(','));
    if (tripIds.length > 0) params.append('trips', tripIds.join(','));
    if (eventTypes.length > 0) params.append('events', eventTypes.join(','));
    
    // Add preferences
    if (!preferences.receivePaymentUpdates) params.append('payments', 'false');
    if (!preferences.receiveStatusUpdates) params.append('status', 'false');
    if (!preferences.receiveReminders) params.append('reminders', 'false');
    if (!preferences.receiveWeatherAlerts) params.append('weather', 'false');

    const sseUrl = `/api/booking-notifications/sse?${params.toString()}`;
    const eventSource = new EventSource(sseUrl);
    
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('📋 Booking SSE connection opened');
    };

    eventSource.onerror = (error) => {
      console.error('📋 Booking SSE connection error:', error);
      setConnectionStatus(prev => ({ 
        ...prev, 
        status: 'error',
        quality: 'poor' 
      }));

      // Auto-reconnect logic
      if (autoReconnect && connectionStatus.reconnectAttempts < maxReconnectAttempts) {
        setConnectionStatus(prev => ({ 
          ...prev, 
          status: 'reconnecting',
          reconnectAttempts: prev.reconnectAttempts + 1
        }));
        
        reconnectTimeoutRef.current = setTimeout(() => {
          disconnect();
          connect();
        }, Math.min(1000 * Math.pow(2, connectionStatus.reconnectAttempts), 30000)); // Exponential backoff
      }
    };

    // Register event listeners for all booking event types
    const eventTypes = [
      'booking-connected', 'booking-heartbeat', 'booking-booking_confirmed',
      'booking-payment_completed', 'booking-payment_failed', 'booking-refund_processed',
      'booking-trip_status_changed', 'booking-booking_cancelled',
      'booking-participant_approved', 'booking-participant_rejected',
      'booking-reminder_sent', 'booking-weather_alert'
    ];

    eventTypes.forEach(eventType => {
      eventSource.addEventListener(eventType, (event) => {
        handleSSEEvent(eventType, (event as MessageEvent).data);
      });
    });

  }, [session?.user?.id, bookingIds, tripIds, eventTypes, preferences, autoReconnect, 
      maxReconnectAttempts, connectionStatus.reconnectAttempts, handleSSEEvent]);

  // Disconnect from Booking SSE
  const disconnect = useCallback(() => {
    console.log('📋 Disconnecting from Booking SSE...');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    clientIdRef.current = null;
    
    setConnectionStatus({
      status: 'disconnected',
      quality: 'unknown',
      lastHeartbeat: null,
      reconnectAttempts: 0
    });
  }, []);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // API request helper
  const bookingSSERequest = useCallback(async (action: string, data: any) => {
    if (!clientIdRef.current) {
      throw new Error('Not connected to Booking SSE');
    }

    const response = await fetch('/api/booking-notifications/sse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: clientIdRef.current,
        action,
        ...data
      })
    });

    if (!response.ok) {
      throw new Error(`Booking SSE request failed: ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Subscription management functions
  const subscribeToBookings = useCallback(async (newBookingIds: string[]) => {
    await bookingSSERequest('subscribe_bookings', { bookingIds: newBookingIds });
  }, [bookingSSERequest]);

  const unsubscribeFromBookings = useCallback(async (oldBookingIds: string[]) => {
    await bookingSSERequest('unsubscribe_bookings', { bookingIds: oldBookingIds });
  }, [bookingSSERequest]);

  const subscribeToTrips = useCallback(async (newTripIds: string[]) => {
    await bookingSSERequest('subscribe_trips', { tripIds: newTripIds });
  }, [bookingSSERequest]);

  const unsubscribeFromTrips = useCallback(async (oldTripIds: string[]) => {
    await bookingSSERequest('unsubscribe_trips', { tripIds: oldTripIds });
  }, [bookingSSERequest]);

  const updatePreferences = useCallback(async (newPreferences: BookingNotificationPreferences) => {
    await bookingSSERequest('update_preferences', { preferences: newPreferences });
  }, [bookingSSERequest]);

  // Notification management
  const markAsRead = useCallback((eventId: string) => {
    setReadEventIds(prev => new Set(prev).add(eventId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = new Set(notifications.map(n => n.id));
    setReadEventIds(allIds);
    setUnreadCount(0);
  }, [notifications]);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setReadEventIds(new Set());
  }, []);

  // Event handler registration functions
  const onBookingConfirmed = useCallback((handler: (event: BookingSSEEvent) => void) => {
    bookingConfirmedHandlers.current.add(handler);
    return () => bookingConfirmedHandlers.current.delete(handler);
  }, []);

  const onPaymentUpdate = useCallback((handler: (event: BookingSSEEvent) => void) => {
    paymentHandlers.current.add(handler);
    return () => paymentHandlers.current.delete(handler);
  }, []);

  const onStatusUpdate = useCallback((handler: (event: BookingSSEEvent) => void) => {
    statusHandlers.current.add(handler);
    return () => statusHandlers.current.delete(handler);
  }, []);

  const onParticipantUpdate = useCallback((handler: (event: BookingSSEEvent) => void) => {
    participantHandlers.current.add(handler);
    return () => participantHandlers.current.delete(handler);
  }, []);

  const onReminder = useCallback((handler: (event: BookingSSEEvent) => void) => {
    reminderHandlers.current.add(handler);
    return () => reminderHandlers.current.delete(handler);
  }, []);

  const onWeatherAlert = useCallback((handler: (event: BookingSSEEvent) => void) => {
    weatherHandlers.current.add(handler);
    return () => weatherHandlers.current.delete(handler);
  }, []);

  // Auto-connect when session is available
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [status, session?.user?.id, connect, disconnect]);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus.status === 'connected',
    
    // Notifications
    notifications,
    unreadCount,
    
    // Event handlers
    onBookingConfirmed,
    onPaymentUpdate,
    onStatusUpdate,
    onParticipantUpdate,
    onReminder,
    onWeatherAlert,
    
    // Actions
    subscribeToBookings,
    unsubscribeFromBookings,
    subscribeToTrips,
    unsubscribeFromTrips,
    updatePreferences,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    
    // Connection management
    connect,
    disconnect,
    reconnect
  };
}
