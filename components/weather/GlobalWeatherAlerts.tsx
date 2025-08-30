'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Wind, Waves, Cloud, ThermometerIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useWeatherAlerts } from '@/lib/hooks/useWeather';
import { useWeatherNotificationSettings } from './WeatherNotificationSettings';
import { WeatherAlert, WeatherLocation } from '@/lib/types/weather';
import { cn } from '@/lib/utils';

const DEFAULT_LOCATION: WeatherLocation = {
  latitude: 38.7223,
  longitude: -9.1393,
  name: 'Cascais Marina'
};

const ALERT_ICONS = {
  general: AlertTriangle,
  wind: Wind,
  wave: Waves,
  temperature: ThermometerIcon,
  precipitation: Cloud,
  storm: AlertTriangle,
  fog: Cloud
};

interface GlobalWeatherAlertsProps {
  location?: WeatherLocation;
  className?: string;
  maxVisible?: number;
  autoHide?: boolean;
  hideDelay?: number; // seconds
}

export default function GlobalWeatherAlerts({
  location = DEFAULT_LOCATION,
  className,
  maxVisible = 3,
  autoHide = false,
  hideDelay = 10
}: GlobalWeatherAlertsProps) {
  const { alerts } = useWeatherAlerts(location);
  const { settings } = useWeatherNotificationSettings();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [visibleAlerts, setVisibleAlerts] = useState<WeatherAlert[]>([]);

  // Filter alerts based on settings and severity
  useEffect(() => {
    if (!settings.enabled) {
      setVisibleAlerts([]);
      return;
    }

    const filteredAlerts = alerts.filter(alert => {
      // Only show active alerts
      if (!alert.isActive) return false;
      
      // Check if alert was dismissed
      if (dismissedAlerts.has(alert.id)) return false;
      
      // Only show severe/emergency alerts in global view
      if (alert.severity !== 'severe' && alert.severity !== 'emergency') {
        return false;
      }
      
      // Check alert type settings
      const alertTypeEnabled = settings.alertTypes[alert.type as keyof typeof settings.alertTypes];
      if (alertTypeEnabled === false) return false;
      
      // Check quiet hours
      if (settings.quietHours.enabled) {
        const now = new Date();
        const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                           now.getMinutes().toString().padStart(2, '0');
        
        const start = settings.quietHours.start;
        const end = settings.quietHours.end;
        
        // Handle quiet hours crossing midnight
        if (start > end) {
          if (currentTime >= start || currentTime <= end) {
            return false;
          }
        } else {
          if (currentTime >= start && currentTime <= end) {
            return false;
          }
        }
      }
      
      return true;
    });

    // Limit visible alerts
    setVisibleAlerts(filteredAlerts.slice(0, maxVisible));
  }, [alerts, settings, dismissedAlerts, maxVisible]);

  // Auto-dismiss alerts after delay
  useEffect(() => {
    if (!autoHide || visibleAlerts.length === 0) return;

    const timers = visibleAlerts.map(alert => 
      setTimeout(() => {
        dismissAlert(alert.id);
      }, hideDelay * 1000)
    );

    return () => timers.forEach(timer => clearTimeout(timer));
  }, [visibleAlerts, autoHide, hideDelay]);

  // Send browser notifications for new critical alerts
  useEffect(() => {
    if (!settings.browserNotifications || typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    visibleAlerts.forEach(alert => {
      // Only send notification once per alert
      if (!dismissedAlerts.has(`notified-${alert.id}`)) {
        new Notification(`⚠️ ${alert.title}`, {
          body: alert.description,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: alert.id,
          requireInteraction: alert.severity === 'emergency'
        });
        
        // Mark as notified
        setDismissedAlerts(prev => new Set(prev).add(`notified-${alert.id}`));
      }
    });
  }, [visibleAlerts, settings.browserNotifications, dismissedAlerts]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const dismissAllAlerts = () => {
    const allIds = visibleAlerts.map(alert => alert.id);
    setDismissedAlerts(prev => {
      const newSet = new Set(prev);
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed top-16 right-4 z-50 space-y-2 max-w-sm", className)}>
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map((alert, index) => (
          <GlobalAlertItem
            key={alert.id}
            alert={alert}
            index={index}
            onDismiss={() => dismissAlert(alert.id)}
          />
        ))}
      </AnimatePresence>
      
      {/* Dismiss all button */}
      {visibleAlerts.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="flex justify-end"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissAllAlerts}
            className="text-xs"
          >
            Скрыть все ({visibleAlerts.length})
          </Button>
        </motion.div>
      )}
    </div>
  );
}

interface GlobalAlertItemProps {
  alert: WeatherAlert;
  index: number;
  onDismiss: () => void;
}

function GlobalAlertItem({ alert, index, onDismiss }: GlobalAlertItemProps) {
  const IconComponent = ALERT_ICONS[alert.type] || AlertTriangle;

  const alertVariant = alert.severity === 'emergency' ? 'destructive' : 
                      alert.severity === 'severe' ? 'destructive' : 'default';

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        x: 0, 
        scale: 1,
        transition: { delay: index * 0.1 }
      }}
      exit={{ 
        opacity: 0, 
        x: 300, 
        scale: 0.9,
        transition: { duration: 0.2 }
      }}
      layout
      className="w-full"
    >
      <Alert 
        variant={alertVariant}
        className={cn(
          "relative shadow-lg border-l-4",
          alert.severity === 'emergency' && "border-l-red-600 bg-red-50 dark:bg-red-950/30",
          alert.severity === 'severe' && "border-l-orange-500 bg-orange-50 dark:bg-orange-950/30",
          // Add a subtle pulse animation for emergency alerts
          alert.severity === 'emergency' && "animate-pulse"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 mt-1",
            alert.severity === 'emergency' && "text-red-600",
            alert.severity === 'severe' && "text-orange-600"
          )}>
            <IconComponent className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <AlertTitle className="text-sm font-semibold leading-tight">
              {alert.title}
            </AlertTitle>
            <AlertDescription className="text-xs mt-1 leading-relaxed">
              {alert.description}
            </AlertDescription>
            
            {/* Alert time info */}
            <div className="text-xs opacity-70 mt-2">
              {formatAlertTimeGlobal(alert.startTime, alert.endTime)}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0 opacity-70 hover:opacity-100"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Alert>
    </motion.div>
  );
}

function formatAlertTimeGlobal(startTime: Date, endTime?: Date): string {
  const now = new Date();
  const start = new Date(startTime);
  
  if (start > now) {
    const diffMinutes = Math.round((start.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes < 60) {
      return `Через ${diffMinutes} мин`;
    } else {
      return `В ${start.toLocaleTimeString()}`;
    }
  }
  
  if (endTime) {
    const end = new Date(endTime);
    if (end > now) {
      const diffMinutes = Math.round((end.getTime() - now.getTime()) / (1000 * 60));
      if (diffMinutes < 60) {
        return `Ещё ${diffMinutes} мин`;
      } else {
        return `До ${end.toLocaleTimeString()}`;
      }
    }
  }
  
  return 'Сейчас';
}
