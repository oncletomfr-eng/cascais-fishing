'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangleIcon,
  BellIcon,
  XIcon,
  CloudRainIcon,
  WindIcon,
  WavesIcon,
  EyeOffIcon,
  ThermometerIcon
} from 'lucide-react';

import { WeatherAlert, WeatherLocation } from '@/lib/types/weather';
import { useWeatherAlerts } from '@/lib/hooks/useWeather';

interface WeatherNotificationsProps {
  location?: WeatherLocation;
  onAlertClick?: (alert: WeatherAlert) => void;
  className?: string;
}

export default function WeatherNotifications({
  location,
  onAlertClick,
  className = ''
}: WeatherNotificationsProps) {
  const { alerts, isLoading } = useWeatherAlerts(location);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Show browser notifications for new alerts
  useEffect(() => {
    if (notificationPermission === 'granted' && alerts.length > 0) {
      alerts.forEach(alert => {
        if (!dismissedAlerts.has(alert.id)) {
          const notification = new Notification(alert.title, {
            body: alert.description,
            icon: getAlertIcon(alert.type),
            tag: alert.id,
            requireInteraction: alert.severity === 'severe' || alert.severity === 'emergency'
          });

          notification.onclick = () => {
            onAlertClick?.(alert);
            notification.close();
          };

          // Auto-close after 10 seconds unless it's a severe alert
          if (alert.severity !== 'severe' && alert.severity !== 'emergency') {
            setTimeout(() => notification.close(), 10000);
          }
        }
      });
    }
  }, [alerts, notificationPermission, dismissedAlerts, onAlertClick]);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  };

  const activeAlerts = alerts.filter(alert => 
    alert.isActive && !dismissedAlerts.has(alert.id)
  );

  if (isLoading || activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence>
        {activeAlerts.map((alert, index) => (
          <WeatherAlertCard
            key={alert.id}
            alert={alert}
            index={index}
            onDismiss={() => dismissAlert(alert.id)}
            onClick={() => onAlertClick?.(alert)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Individual alert card component
function WeatherAlertCard({
  alert,
  index,
  onDismiss,
  onClick
}: {
  alert: WeatherAlert;
  index: number;
  onDismiss: () => void;
  onClick?: () => void;
}) {
  const getSeverityColor = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'info': return 'border-blue-200 bg-blue-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'severe': return 'border-orange-200 bg-orange-50';
      case 'emergency': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityBadge = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'info': return <Badge className="bg-blue-100 text-blue-800">Информация</Badge>;
      case 'warning': return <Badge className="bg-yellow-100 text-yellow-800">Предупреждение</Badge>;
      case 'severe': return <Badge className="bg-orange-100 text-orange-800">Серьёзно</Badge>;
      case 'emergency': return <Badge className="bg-red-100 text-red-800">Критично</Badge>;
      default: return null;
    }
  };

  const getTypeIcon = (type: WeatherAlert['type']) => {
    const iconClass = "h-5 w-5";
    
    switch (type) {
      case 'wind': return <WindIcon className={`${iconClass} text-blue-600`} />;
      case 'wave': return <WavesIcon className={`${iconClass} text-cyan-600`} />;
      case 'storm': return <CloudRainIcon className={`${iconClass} text-purple-600`} />;
      case 'fog': return <EyeOffIcon className={`${iconClass} text-gray-600`} />;
      case 'temperature': return <ThermometerIcon className={`${iconClass} text-red-600`} />;
      default: return <AlertTriangleIcon className={`${iconClass} text-orange-600`} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ delay: index * 0.1 }}
    >
      <Alert className={`${getSeverityColor(alert.severity)} border-l-4 cursor-pointer`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1" onClick={onClick}>
            {getTypeIcon(alert.type)}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{alert.title}</h4>
                {getSeverityBadge(alert.severity)}
              </div>
              <AlertDescription className="text-sm">
                {alert.description}
              </AlertDescription>
              {alert.location.name && (
                <p className="text-xs text-muted-foreground mt-1">
                  📍 {alert.location.name}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                🕐 {alert.startTime.toLocaleTimeString('ru-RU')}
                {alert.endTime && ` - ${alert.endTime.toLocaleTimeString('ru-RU')}`}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    </motion.div>
  );
}

// Floating notification bell for the header
export function WeatherNotificationBell({
  location,
  className = ''
}: {
  location?: WeatherLocation;
  className?: string;
}) {
  const { alerts } = useWeatherAlerts(location);
  const [showNotifications, setShowNotifications] = useState(false);

  const activeAlerts = alerts.filter(alert => alert.isActive);
  const hasHighPriorityAlerts = activeAlerts.some(alert => 
    alert.severity === 'severe' || alert.severity === 'emergency'
  );

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative"
      >
        <BellIcon className={`h-5 w-5 ${hasHighPriorityAlerts ? 'text-red-600' : 'text-orange-600'}`} />
        {activeAlerts.length > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`absolute -top-1 -right-1 h-4 w-4 rounded-full text-xs font-bold text-white flex items-center justify-center ${
              hasHighPriorityAlerts ? 'bg-red-600' : 'bg-orange-600'
            }`}
          >
            {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
          </motion.span>
        )}
        {hasHighPriorityAlerts && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="absolute inset-0 rounded-full bg-red-600 opacity-20"
          />
        )}
      </Button>

      {/* Dropdown notifications */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 z-50"
          >
            <Card className="shadow-lg border">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BellIcon className="h-4 w-4" />
                  Погодные уведомления
                </h3>
                <WeatherNotifications
                  location={location}
                  onAlertClick={() => setShowNotifications(false)}
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper function to get icon for notification
function getAlertIcon(type: WeatherAlert['type']): string {
  switch (type) {
    case 'wind': return '💨';
    case 'wave': return '🌊';
    case 'storm': return '⛈️';
    case 'fog': return '🌫️';
    case 'temperature': return '🌡️';
    default: return '⚠️';
  }
}
