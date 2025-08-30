'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Bell, BellOff, Save, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export interface WeatherNotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  windSpeedThreshold: number; // m/s
  waveHeightThreshold: number; // meters
  visibilityThreshold: number; // km
  checkInterval: number; // minutes
  alertTypes: {
    wind: boolean;
    wave: boolean;
    visibility: boolean;
    temperature: boolean;
    fishing: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

const DEFAULT_SETTINGS: WeatherNotificationSettings = {
  enabled: true,
  browserNotifications: false,
  windSpeedThreshold: 15,
  waveHeightThreshold: 2.0,
  visibilityThreshold: 5,
  checkInterval: 30,
  alertTypes: {
    wind: true,
    wave: true,
    visibility: true,
    temperature: false,
    fishing: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
};

interface WeatherNotificationSettingsProps {
  trigger?: React.ReactNode;
  onSettingsChange?: (settings: WeatherNotificationSettings) => void;
}

export default function WeatherNotificationSettingsComponent({
  trigger,
  onSettingsChange
}: WeatherNotificationSettingsProps) {
  const [settings, setSettings] = useState<WeatherNotificationSettings>(DEFAULT_SETTINGS);
  const [isOpen, setIsOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('weather-notification-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }, []);

  // Check browser notification permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Уведомления не поддерживаются в этом браузере');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Разрешение на уведомления получено');
        updateSettings({ browserNotifications: true });
      } else {
        toast.error('Разрешение на уведомления отклонено');
        updateSettings({ browserNotifications: false });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast.error('Ошибка при запросе разрешений');
    }
  };

  const updateSettings = (newSettings: Partial<WeatherNotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    setHasChanges(true);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('weather-notification-settings', JSON.stringify(settings));
      setHasChanges(false);
      onSettingsChange?.(settings);
      toast.success('Настройки сохранены');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Ошибка при сохранении настроек');
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
    toast.success('Настройки сброшены к значениям по умолчанию');
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Settings className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Настройки уведомлений
          </DialogTitle>
          <DialogDescription>
            Настройте погодные уведомления и предупреждения для рыбалки
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main toggle */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">
                    Погодные уведомления
                  </Label>
                  <div className="text-xs text-muted-foreground">
                    Включить все уведомления
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Browser notifications */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      Браузерные уведомления
                    </Label>
                    <div className="text-xs text-muted-foreground">
                      Показывать уведомления в браузере
                    </div>
                  </div>
                  <Switch
                    checked={settings.browserNotifications && notificationPermission === 'granted'}
                    onCheckedChange={(checked) => {
                      if (checked && notificationPermission !== 'granted') {
                        requestNotificationPermission();
                      } else {
                        updateSettings({ browserNotifications: checked });
                      }
                    }}
                    disabled={!settings.enabled}
                  />
                </div>

                {notificationPermission === 'denied' && (
                  <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                    Уведомления заблокированы. Разрешите в настройках браузера.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Alert thresholds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Пороги предупреждений</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">
                  Скорость ветра: {settings.windSpeedThreshold} м/с
                </Label>
                <Slider
                  value={[settings.windSpeedThreshold]}
                  onValueChange={([value]) => updateSettings({ windSpeedThreshold: value })}
                  max={25}
                  min={5}
                  step={1}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Высота волн: {settings.waveHeightThreshold} м
                </Label>
                <Slider
                  value={[settings.waveHeightThreshold]}
                  onValueChange={([value]) => updateSettings({ waveHeightThreshold: value })}
                  max={5}
                  min={0.5}
                  step={0.1}
                  disabled={!settings.enabled}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">
                  Видимость: {settings.visibilityThreshold} км
                </Label>
                <Slider
                  value={[settings.visibilityThreshold]}
                  onValueChange={([value]) => updateSettings({ visibilityThreshold: value })}
                  max={20}
                  min={1}
                  step={1}
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Alert types */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Типы предупреждений</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries({
                wind: 'Ветер',
                wave: 'Волны',
                visibility: 'Видимость',
                temperature: 'Температура',
                fishing: 'Условия для рыбалки'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch
                    checked={settings.alertTypes[key as keyof typeof settings.alertTypes]}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        alertTypes: {
                          ...settings.alertTypes,
                          [key]: checked
                        }
                      })
                    }
                    disabled={!settings.enabled}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Check interval */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label className="text-sm">
                  Интервал проверки: {settings.checkInterval} мин
                </Label>
                <Slider
                  value={[settings.checkInterval]}
                  onValueChange={([value]) => updateSettings({ checkInterval: value })}
                  max={120}
                  min={5}
                  step={5}
                  disabled={!settings.enabled}
                />
                <div className="text-xs text-muted-foreground">
                  Как часто проверять погодные условия
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quiet hours */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Тихие часы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Включить тихие часы</Label>
                <Switch
                  checked={settings.quietHours.enabled}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      quietHours: { ...settings.quietHours, enabled: checked }
                    })
                  }
                  disabled={!settings.enabled}
                />
              </div>

              {settings.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">От</Label>
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={(e) =>
                        updateSettings({
                          quietHours: { ...settings.quietHours, start: e.target.value }
                        })
                      }
                      className="w-full px-2 py-1 text-sm border rounded"
                      disabled={!settings.enabled}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">До</Label>
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={(e) =>
                        updateSettings({
                          quietHours: { ...settings.quietHours, end: e.target.value }
                        })
                      }
                      className="w-full px-2 py-1 text-sm border rounded"
                      disabled={!settings.enabled}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              onClick={saveSettings}
              disabled={!hasChanges}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              Сохранить
            </Button>
            <Button
              variant="outline"
              onClick={resetSettings}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Сброс
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use weather notification settings
export function useWeatherNotificationSettings() {
  const [settings, setSettings] = useState<WeatherNotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('weather-notification-settings');
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }, []);

  const updateSettings = (newSettings: WeatherNotificationSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('weather-notification-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  return { settings, updateSettings };
}
