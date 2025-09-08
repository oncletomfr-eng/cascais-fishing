'use client';

/**
 * Mobile Notification System
 * Task 14.2: Touch-friendly notification interactions for mobile devices
 * 
 * Features:
 * - Touch-friendly notification banners
 * - Haptic feedback integration
 * - Swipe-to-dismiss gestures
 * - Position optimization for mobile screens
 * - Accessibility support
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
export type NotificationType = 'success' | 'warning' | 'error' | 'info';
export type NotificationPosition = 'top' | 'bottom' | 'center';

export interface MobileNotification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // in ms, 0 for persistent
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  timestamp?: Date;
  avatar?: string;
  soundEnabled?: boolean;
  hapticEnabled?: boolean;
}

export interface MobileNotificationSystemProps {
  notifications: MobileNotification[];
  position?: NotificationPosition;
  maxVisible?: number;
  enableHaptics?: boolean;
  enableSounds?: boolean;
  onNotificationDismiss: (id: string) => void;
  onSettingsToggle?: () => void;
  className?: string;
}

// Haptic feedback utility
const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50]
    };
    navigator.vibrate(patterns[type]);
  }
};

// Sound notification utility
const playNotificationSound = (type: NotificationType) => {
  // Create different audio tones for different notification types
  if ('AudioContext' in window || 'webkitAudioContext' in window) {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContext();
    
    const frequencies = {
      success: 800,
      info: 600,
      warning: 500,
      error: 400
    };
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  }
};

// Individual mobile notification component
function MobileNotificationItem({
  notification,
  onDismiss,
  enableHaptics = true,
  enableSounds = true
}: {
  notification: MobileNotification;
  onDismiss: (id: string) => void;
  enableHaptics?: boolean;
  enableSounds?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Auto-dismiss after duration
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(notification.id);
      }, notification.duration);
      
      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onDismiss]);

  // Play sound and haptic on mount
  useEffect(() => {
    if (enableSounds && notification.soundEnabled !== false) {
      playNotificationSound(notification.type);
    }
    
    if (enableHaptics && notification.hapticEnabled !== false) {
      triggerHapticFeedback(notification.type === 'error' ? 'heavy' : 'medium');
    }
  }, [notification.id, notification.type, enableSounds, enableHaptics]);

  const handleDismiss = useCallback(() => {
    if (enableHaptics) {
      triggerHapticFeedback('light');
    }
    onDismiss(notification.id);
    notification.onDismiss?.();
  }, [notification.id, notification.onDismiss, onDismiss, enableHaptics]);

  const handleAction = useCallback(() => {
    if (enableHaptics) {
      triggerHapticFeedback('medium');
    }
    notification.onAction?.();
    onDismiss(notification.id);
  }, [notification.onAction, notification.id, onDismiss, enableHaptics]);

  // Swipe to dismiss
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      handleDismiss();
    }
  }, [handleDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'error': return <AlertCircle size={20} />;
      case 'info': return <Info size={20} />;
    }
  };

  const getTypeClasses = () => {
    switch (notification.type) {
      case 'success': 
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning': 
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': 
        return 'bg-red-50 border-red-200 text-red-800';
      case 'info': 
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <motion.div
      ref={notificationRef}
      initial={{ opacity: 0, x: 300, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        ...(isDragging && { rotate: Math.random() * 4 - 2 })
      }}
      exit={{ 
        opacity: 0, 
        x: 300, 
        scale: 0.8,
        transition: { duration: 0.2 }
      }}
      drag="x"
      dragConstraints={{ left: -200, right: 200 }}
      dragElastic={0.2}
      onDragStart={() => {
        setIsDragging(true);
        if (enableHaptics) triggerHapticFeedback('light');
      }}
      onDragEnd={(_, info) => {
        setIsDragging(false);
        handleDragEnd(_, info);
      }}
      className={cn(
        "mobile-notification-item",
        "relative p-4 mb-3 rounded-lg border-l-4 shadow-lg",
        "backdrop-blur-sm",
        "touch-manipulation",
        "cursor-grab active:cursor-grabbing",
        "max-w-sm w-full",
        getTypeClasses(),
        isDragging && "shadow-2xl z-50"
      )}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Background for swipe indication */}
      <div 
        className="absolute inset-0 bg-red-100 rounded-lg flex items-center justify-end pr-4 opacity-0"
        style={{
          opacity: isDragging && Math.abs(0) > 50 ? 0.8 : 0
        }}
      >
        <X size={20} className="text-red-600" />
      </div>

      <div className="flex items-start gap-3 relative z-10">
        {/* Icon or Avatar */}
        <div className="flex-shrink-0 mt-0.5">
          {notification.avatar ? (
            <img
              src={notification.avatar}
              alt=""
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="p-1 rounded-full bg-current bg-opacity-10">
              {getIcon()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight mb-1">
            {notification.title}
          </h4>
          
          {notification.message && (
            <p className="text-sm opacity-80 leading-relaxed mb-2">
              {notification.message}
            </p>
          )}

          {/* Action Button */}
          {notification.actionText && (
            <button
              onClick={handleAction}
              className={cn(
                "inline-block text-xs font-medium px-3 py-1.5 rounded",
                "bg-current bg-opacity-20 hover:bg-opacity-30",
                "transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50",
                "min-h-[32px] min-w-[32px]" // Touch target size
              )}
            >
              {notification.actionText}
            </button>
          )}

          {/* Timestamp */}
          {notification.timestamp && (
            <div className="text-xs opacity-60 mt-1">
              {notification.timestamp.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          )}
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className={cn(
            "flex-shrink-0 p-1 rounded-full",
            "hover:bg-current hover:bg-opacity-20",
            "focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50",
            "transition-all duration-200",
            "min-h-[32px] min-w-[32px]" // Touch target size
          )}
          aria-label="Dismiss notification"
        >
          <X size={16} />
        </button>
      </div>

      {/* Swipe hint for first notification */}
      {notification.id.endsWith('_first') && (
        <div className="absolute -bottom-6 right-4 text-xs opacity-50 animate-pulse">
          ← Swipe to dismiss
        </div>
      )}
    </motion.div>
  );
}

// Main mobile notification system
export function MobileNotificationSystem({
  notifications,
  position = 'top',
  maxVisible = 5,
  enableHaptics = true,
  enableSounds = true,
  onNotificationDismiss,
  onSettingsToggle,
  className
}: MobileNotificationSystemProps) {
  const [soundsEnabled, setSoundsEnabled] = useState(enableSounds);
  const [hapticsEnabled, setHapticsEnabled] = useState(enableHaptics);
  
  const visibleNotifications = notifications.slice(0, maxVisible);
  const hiddenCount = notifications.length - visibleNotifications.length;

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'top-4 left-4 right-4';
      case 'bottom':
        return 'bottom-4 left-4 right-4';
      case 'center':
        return 'top-1/2 left-4 right-4 transform -translate-y-1/2';
    }
  };

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-none",
        getPositionClasses(),
        className
      )}
      style={{
        // Ensure safe area support
        paddingTop: position === 'top' ? 'env(safe-area-inset-top, 0)' : undefined,
        paddingBottom: position === 'bottom' ? 'env(safe-area-inset-bottom, 0)' : undefined,
      }}
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification) => (
          <div key={notification.id} className="pointer-events-auto">
            <MobileNotificationItem
              notification={notification}
              onDismiss={onNotificationDismiss}
              enableHaptics={hapticsEnabled}
              enableSounds={soundsEnabled}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* Hidden notifications indicator */}
      {hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-2"
        >
          <div className="inline-block bg-gray-800 text-white text-xs px-3 py-1 rounded-full">
            +{hiddenCount} more notifications
          </div>
        </motion.div>
      )}

      {/* Settings Toggle */}
      {onSettingsToggle && (
        <div className="flex justify-end mt-2 pointer-events-auto">
          <button
            onClick={onSettingsToggle}
            className={cn(
              "p-2 bg-gray-800 text-white rounded-full shadow-lg",
              "hover:bg-gray-700 transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500",
              "min-h-[44px] min-w-[44px]"
            )}
            aria-label="Notification settings"
          >
            <Settings size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

// Hook for managing mobile notifications
export function useMobileNotifications() {
  const [notifications, setNotifications] = useState<MobileNotification[]>([]);

  const addNotification = useCallback((notification: Omit<MobileNotification, 'id'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: MobileNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [newNotification, ...prev]);
    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications
  };
}

export default MobileNotificationSystem;
