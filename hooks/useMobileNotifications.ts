'use client';

/**
 * Mobile Notifications Hook
 * Task 14.2: Integration with existing notification systems
 * 
 * Provides a unified interface for mobile-optimized notifications
 * Integrates with existing booking notifications and SSE systems
 */

import { useState, useEffect, useCallback } from 'react';
import { MobileNotification, NotificationType } from '@/components/notifications/MobileNotificationSystem';
import { useBookingNotifications } from './useBookingNotifications';

export interface MobileNotificationSettings {
  enableHaptics: boolean;
  enableSounds: boolean;
  position: 'top' | 'bottom' | 'center';
  maxVisible: number;
  defaultDuration: number;
}

export interface NotificationTemplate {
  type: NotificationType;
  title: string;
  message?: string;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
  actionText?: string;
}

const DEFAULT_SETTINGS: MobileNotificationSettings = {
  enableHaptics: true,
  enableSounds: true,
  position: 'top',
  maxVisible: 5,
  defaultDuration: 5000
};

// Predefined notification templates for common scenarios
const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Booking notifications
  booking_confirmed: {
    type: 'success',
    title: 'Booking Confirmed',
    message: 'Your fishing trip has been confirmed!',
    actionText: 'View Details',
    hapticEnabled: true,
    soundEnabled: true
  },
  booking_cancelled: {
    type: 'warning',
    title: 'Booking Cancelled',
    message: 'Your fishing trip has been cancelled.',
    actionText: 'Rebook',
    hapticEnabled: true,
    soundEnabled: true
  },
  payment_completed: {
    type: 'success',
    title: 'Payment Complete',
    message: 'Payment processed successfully.',
    hapticEnabled: true,
    soundEnabled: false
  },
  trip_status_changed: {
    type: 'info',
    title: 'Trip Status Updated',
    message: 'Check the latest status of your trip.',
    actionText: 'View',
    hapticEnabled: false,
    soundEnabled: true
  },
  participant_approved: {
    type: 'success',
    title: 'Welcome Aboard!',
    message: 'You have been approved to join the trip.',
    actionText: 'Join Chat',
    hapticEnabled: true,
    soundEnabled: true
  },
  weather_alert: {
    type: 'warning',
    title: 'Weather Alert',
    message: 'Weather conditions have changed for your trip.',
    actionText: 'Check Weather',
    hapticEnabled: true,
    soundEnabled: true
  },
  // Chat notifications
  new_message: {
    type: 'info',
    title: 'New Message',
    hapticEnabled: false, // Avoid haptic spam for frequent messages
    soundEnabled: false   // Let chat system handle sounds
  },
  mention_received: {
    type: 'info',
    title: 'You were mentioned',
    actionText: 'Reply',
    hapticEnabled: true,
    soundEnabled: true
  },
  // System notifications
  connection_lost: {
    type: 'error',
    title: 'Connection Lost',
    message: 'Trying to reconnect...',
    hapticEnabled: false,
    soundEnabled: false
  },
  connection_restored: {
    type: 'success',
    title: 'Connected',
    message: 'Connection restored.',
    hapticEnabled: false,
    soundEnabled: false
  },
  // App notifications
  update_available: {
    type: 'info',
    title: 'Update Available',
    message: 'A new version is ready to install.',
    actionText: 'Update',
    hapticEnabled: false,
    soundEnabled: false
  },
  offline_mode: {
    type: 'warning',
    title: 'Offline Mode',
    message: 'You are currently offline. Some features may be limited.',
    hapticEnabled: false,
    soundEnabled: false
  }
};

export function useMobileNotifications(initialSettings?: Partial<MobileNotificationSettings>) {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);
  const [settings, setSettings] = useState<MobileNotificationSettings>({
    ...DEFAULT_SETTINGS,
    ...initialSettings
  });

  // Add notification function
  const addNotification = useCallback((notification: Omit<MobileNotification, 'id'>) => {
    const id = `mobile_notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: MobileNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? settings.defaultDuration,
      soundEnabled: notification.soundEnabled ?? settings.enableSounds,
      hapticEnabled: notification.hapticEnabled ?? settings.enableHaptics
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, settings.maxVisible - 1)]);
    return id;
  }, [settings]);

  // Integration with existing booking notifications
  const bookingNotifications = useBookingNotifications();

  // Subscribe to booking events and convert them to mobile notifications
  useEffect(() => {
    // Check if bookingNotifications has events to subscribe to
    if (bookingNotifications.notifications && Array.isArray(bookingNotifications.notifications)) {
      // Process existing notifications
      bookingNotifications.notifications.forEach((notification: any) => {
        if (notification.type && NOTIFICATION_TEMPLATES[notification.type]) {
          const template = NOTIFICATION_TEMPLATES[notification.type];
          addNotification({
            ...template,
            message: notification.message || template.message,
            onAction: notification.actionUrl ? () => window.location.href = notification.actionUrl : undefined,
            avatar: notification.userAvatar
          });
        }
      });
    }
  }, [bookingNotifications.notifications, addNotification]);

  // Quick notification functions using templates
  const showBookingConfirmed = useCallback((details?: { tripName?: string; date?: string; action?: () => void }) => {
    return addNotification({
      ...NOTIFICATION_TEMPLATES.booking_confirmed,
      message: details?.tripName 
        ? `Your ${details.tripName} trip${details.date ? ` on ${details.date}` : ''} has been confirmed!`
        : NOTIFICATION_TEMPLATES.booking_confirmed.message,
      onAction: details?.action
    });
  }, [addNotification]);

  const showPaymentCompleted = useCallback((amount?: string) => {
    return addNotification({
      ...NOTIFICATION_TEMPLATES.payment_completed,
      message: amount 
        ? `Payment of ${amount} processed successfully.`
        : NOTIFICATION_TEMPLATES.payment_completed.message
    });
  }, [addNotification]);

  const showWeatherAlert = useCallback((conditions?: string, action?: () => void) => {
    return addNotification({
      ...NOTIFICATION_TEMPLATES.weather_alert,
      message: conditions 
        ? `Weather alert: ${conditions}`
        : NOTIFICATION_TEMPLATES.weather_alert.message,
      onAction: action
    });
  }, [addNotification]);

  const showParticipantApproved = useCallback((tripName?: string, action?: () => void) => {
    return addNotification({
      ...NOTIFICATION_TEMPLATES.participant_approved,
      message: tripName 
        ? `You have been approved to join ${tripName}!`
        : NOTIFICATION_TEMPLATES.participant_approved.message,
      onAction: action
    });
  }, [addNotification]);

  const showNewMessage = useCallback((sender: string, preview?: string, avatar?: string, action?: () => void) => {
    return addNotification({
      ...NOTIFICATION_TEMPLATES.new_message,
      title: `New message from ${sender}`,
      message: preview,
      avatar,
      onAction: action,
      duration: 3000 // Shorter duration for chat messages
    });
  }, [addNotification]);

  const showMentionReceived = useCallback((sender: string, preview?: string, avatar?: string, action?: () => void) => {
    return addNotification({
      ...NOTIFICATION_TEMPLATES.mention_received,
      title: `${sender} mentioned you`,
      message: preview,
      avatar,
      onAction: action
    });
  }, [addNotification]);

  const showConnectionStatus = useCallback((isConnected: boolean) => {
    const template = isConnected 
      ? NOTIFICATION_TEMPLATES.connection_restored 
      : NOTIFICATION_TEMPLATES.connection_lost;
    
    return addNotification({
      ...template,
      duration: isConnected ? 2000 : 0 // Auto-hide success, keep error visible
    });
  }, [addNotification]);

  // Dismiss notification
  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<MobileNotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Get settings for persistence
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('mobileNotificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save notification settings:', error);
    }
  }, [settings]);

  // Load settings from persistence
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('mobileNotificationSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('Failed to load notification settings:', error);
    }
  }, []);

  // Auto-save settings when changed
  useEffect(() => {
    saveSettings();
  }, [settings, saveSettings]);

  // Notification permission request
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  return {
    // State
    notifications,
    settings,
    
    // Core functions
    addNotification,
    dismissNotification,
    clearAllNotifications,
    updateSettings,
    
    // Template-based shortcuts
    showBookingConfirmed,
    showPaymentCompleted,
    showWeatherAlert,
    showParticipantApproved,
    showNewMessage,
    showMentionReceived,
    showConnectionStatus,
    
    // Utility functions
    requestNotificationPermission,
    saveSettings,
    
    // Integration points
    bookingNotifications
  };
}

export default useMobileNotifications;
