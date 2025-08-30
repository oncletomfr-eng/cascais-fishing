'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Cloud, AlertTriangle, Waves, Wind, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWeatherAlerts } from '@/lib/hooks/useWeather';
import { WeatherAlert, WeatherLocation } from '@/lib/types/weather';
import WeatherNotificationSettingsComponent, { useWeatherNotificationSettings } from './WeatherNotificationSettings';
import { cn } from '@/lib/utils';

interface WeatherNotificationBellProps {
  location?: WeatherLocation;
  className?: string;
  showBadge?: boolean;
  autoCheck?: boolean;
  checkInterval?: number; // minutes
}

const DEFAULT_LOCATION: WeatherLocation = {
  latitude: 38.7223,
  longitude: -9.1393,
  name: 'Cascais Marina'
};

const ALERT_ICONS = {
  general: AlertTriangle,
  wind: Wind,
  wave: Waves,
  temperature: Cloud,
  precipitation: Cloud,
  storm: AlertTriangle,
  fog: Cloud
};

const SEVERITY_COLORS = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  severe: 'text-orange-500',
  emergency: 'text-red-500'
};

export default function WeatherNotificationBell({
  location = DEFAULT_LOCATION,
  className,
  showBadge = true,
  autoCheck = true,
  checkInterval = 30 // Check every 30 minutes
}: WeatherNotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  const { alerts, isLoading, refreshAlerts } = useWeatherAlerts(location);

  // Track new alerts
  useEffect(() => {
    if (alerts.length > 0 && lastCheckTime) {
      const newAlerts = alerts.filter(alert => 
        alert.startTime > lastCheckTime && alert.isActive
      );
      if (newAlerts.length > 0) {
        setHasNewAlerts(true);
      }
    }
  }, [alerts, lastCheckTime]);

  // Auto-check for alerts
  useEffect(() => {
    if (!autoCheck) return;

    const checkAndUpdateTime = async () => {
      await refreshAlerts();
      setLastCheckTime(new Date());
    };

    // Initial check
    checkAndUpdateTime();

    // Set up interval for periodic checks
    const interval = setInterval(checkAndUpdateTime, checkInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoCheck, checkInterval, refreshAlerts]);

  // Reset new alerts indicator when popover is opened
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && hasNewAlerts) {
      setHasNewAlerts(false);
    }
  };

  // Active alerts (currently happening)
  const activeAlerts = alerts.filter(alert => alert.isActive);
  const urgentAlerts = activeAlerts.filter(alert => 
    alert.severity === 'severe' || alert.severity === 'emergency'
  );

  // Determine bell appearance
  const hasUrgentAlerts = urgentAlerts.length > 0;
  const hasAnyAlerts = activeAlerts.length > 0;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative h-10 w-10 rounded-full hover:bg-muted/50",
            hasUrgentAlerts && "text-red-500 hover:text-red-600",
            hasAnyAlerts && !hasUrgentAlerts && "text-yellow-500 hover:text-yellow-600",
            className
          )}
          disabled={isLoading}
        >
          <motion.div
            animate={hasUrgentAlerts ? { rotate: [0, 10, -10, 0] } : {}}
            transition={{ duration: 0.5, repeat: hasUrgentAlerts ? Infinity : 0, repeatDelay: 2 }}
          >
            {hasAnyAlerts ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </motion.div>

          {/* Notification badge */}
          <AnimatePresence>
            {showBadge && (hasNewAlerts || activeAlerts.length > 0) && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge
                  variant={hasUrgentAlerts ? "destructive" : "secondary"}
                  className={cn(
                    "h-5 w-5 rounded-full p-0 text-xs font-bold flex items-center justify-center",
                    hasUrgentAlerts && "bg-red-500 text-white",
                    !hasUrgentAlerts && activeAlerts.length > 0 && "bg-yellow-500 text-white"
                  )}
                >
                  {activeAlerts.length > 9 ? '9+' : activeAlerts.length}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulsing dot for urgent alerts */}
          {hasUrgentAlerts && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Погодные предупреждения
              </CardTitle>
              <div className="flex gap-1">
                <WeatherNotificationSettingsComponent
                  trigger={
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Settings className="h-3 w-3" />
                    </Button>
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {location.name} • {lastCheckTime ? 
                `Обновлено ${lastCheckTime.toLocaleTimeString()}` : 
                'Загрузка...'
              }
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Проверка погодных условий...
              </div>
            ) : activeAlerts.length === 0 ? (
              <div className="p-4 text-center">
                <div className="text-green-600 mb-2">
                  <Bell className="h-8 w-8 mx-auto" />
                </div>
                <div className="text-sm font-medium text-green-600 mb-1">
                  Условия благоприятные
                </div>
                <div className="text-xs text-muted-foreground">
                  Нет активных предупреждений
                </div>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {activeAlerts.map((alert, index) => (
                  <AlertItem key={alert.id} alert={alert} isLast={index === activeAlerts.length - 1} />
                ))}
              </div>
            )}

            {/* Refresh button */}
            <div className="border-t p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={refreshAlerts}
                disabled={isLoading}
              >
                {isLoading ? 'Обновление...' : 'Обновить предупреждения'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}

interface AlertItemProps {
  alert: WeatherAlert;
  isLast: boolean;
}

function AlertItem({ alert, isLast }: AlertItemProps) {
  const IconComponent = ALERT_ICONS[alert.type] || AlertTriangle;
  const severityColor = SEVERITY_COLORS[alert.severity];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors",
        !isLast && "border-b"
      )}
    >
      <div className="flex gap-3">
        <div className={cn("flex-shrink-0 mt-0.5", severityColor)}>
          <IconComponent className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium leading-tight">
              {alert.title}
            </h4>
            <Badge
              variant={alert.severity === 'severe' || alert.severity === 'emergency' ? 'destructive' : 'secondary'}
              className="text-xs px-1 py-0 h-4"
            >
              {getSeverityLabel(alert.severity)}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {alert.description}
          </p>
          
          <div className="text-xs text-muted-foreground mt-2">
            {formatAlertTime(alert.startTime, alert.endTime)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getSeverityLabel(severity: WeatherAlert['severity']): string {
  switch (severity) {
    case 'info': return 'Инфо';
    case 'warning': return 'Предупреждение';
    case 'severe': return 'Опасно';
    case 'emergency': return 'Экстремально';
    default: return 'Инфо';
  }
}

function formatAlertTime(startTime: Date, endTime?: Date): string {
  const now = new Date();
  const start = new Date(startTime);
  
  if (start > now) {
    return `Начнется в ${start.toLocaleTimeString()}`;
  }
  
  if (endTime) {
    const end = new Date(endTime);
    if (end > now) {
      return `До ${end.toLocaleTimeString()}`;
    } else {
      return 'Завершено';
    }
  }
  
  return 'Активно сейчас';
}
