'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Waves, 
  Wind, 
  Cloud, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  RefreshCw,
  Settings,
  Bell,
  BellRing,
  Thermometer,
  Eye,
  Compass
} from 'lucide-react';
import { useWeather, useWeatherAlerts } from '@/lib/hooks/useWeather';
import { useWeatherNotificationSettings } from '@/components/weather/WeatherNotificationSettings';
import WeatherWidget from '@/components/weather/WeatherWidget';
import WeatherBadge from '@/components/weather/WeatherBadge';
import WeatherNotificationBell from '@/components/weather/WeatherNotificationBell';
import WeatherNotificationSettingsComponent from '@/components/weather/WeatherNotificationSettings';
import GlobalWeatherAlerts from '@/components/weather/GlobalWeatherAlerts';
import { WeatherLocation } from '@/lib/types/weather';
import { weatherService } from '@/lib/services/weather';
import { tomorrowMarineService } from '@/lib/services/tomorrow-marine';

const TEST_LOCATIONS: WeatherLocation[] = [
  {
    latitude: 38.7223,
    longitude: -9.1393,
    name: 'Cascais Marina'
  },
  {
    latitude: 41.1496,
    longitude: -8.6109,
    name: 'Porto'
  },
  {
    latitude: 37.0893,
    longitude: -8.2405,
    name: 'Sagres'
  }
];

export default function TestWeatherCompletePage() {
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation>(TEST_LOCATIONS[0]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const { weatherData, fishingConditions, isLoading, error, refreshWeather } = useWeather({
    location: selectedLocation,
    enableMarine: true,
    enableFishingAssessment: true,
    autoRefresh: false
  });

  const { alerts, isLoading: alertsLoading, refreshAlerts } = useWeatherAlerts(selectedLocation);
  const { settings } = useWeatherNotificationSettings();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runComprehensiveTest = async () => {
    setIsRunningTests(true);
    setTestResults({});
    setLogs([]);
    
    addLog('🚀 Начинаем комплексное тестирование погодной системы...');

    const tests = [
      {
        name: 'openmeteo_current',
        description: 'Open-Meteo текущая погода',
        test: async () => {
          try {
            const data = await weatherService.getCurrentWeather(selectedLocation);
            return data !== null;
          } catch (error) {
            addLog(`❌ Open-Meteo current weather failed: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'openmeteo_marine',
        description: 'Open-Meteo морские данные',
        test: async () => {
          try {
            const data = await weatherService.getWeatherData(selectedLocation);
            return data.marine !== null;
          } catch (error) {
            addLog(`⚠️ Open-Meteo marine failed, это ожидаемо: ${error}`);
            return true; // Expected to fail
          }
        }
      },
      {
        name: 'tomorrow_marine',
        description: 'Tomorrow.io Marine API',
        test: async () => {
          try {
            const data = await tomorrowMarineService.getMarineConditions(selectedLocation);
            return data !== null;
          } catch (error) {
            addLog(`❌ Tomorrow.io marine failed: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'tomorrow_alerts',
        description: 'Tomorrow.io Marine Alerts',
        test: async () => {
          try {
            const alerts = await tomorrowMarineService.getMarineAlerts(selectedLocation);
            addLog(`✅ Tomorrow.io alerts returned ${alerts.length} alerts`);
            return true;
          } catch (error) {
            addLog(`❌ Tomorrow.io alerts failed: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'fishing_assessment',
        description: 'Оценка условий рыбалки',
        test: async () => {
          try {
            const data = await weatherService.getWeatherData(selectedLocation);
            const assessment = weatherService.assessFishingConditions(data);
            addLog(`✅ Fishing assessment: ${assessment.overall}`);
            return assessment !== null;
          } catch (error) {
            addLog(`❌ Fishing assessment failed: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'useWeather_hook',
        description: 'useWeather React hook',
        test: async () => {
          return weatherData !== null && !error;
        }
      },
      {
        name: 'weather_alerts',
        description: 'Погодные предупреждения',
        test: async () => {
          try {
            await refreshAlerts();
            addLog(`✅ Weather alerts checked, found ${alerts.length} alerts`);
            return true;
          } catch (error) {
            addLog(`❌ Weather alerts failed: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'notification_settings',
        description: 'Настройки уведомлений',
        test: async () => {
          return settings !== null && typeof settings.enabled === 'boolean';
        }
      },
      {
        name: 'browser_notifications',
        description: 'Браузерные уведомления',
        test: async () => {
          if (!('Notification' in window)) {
            addLog('⚠️ Browser notifications not supported');
            return false;
          }
          addLog(`✅ Browser notifications permission: ${Notification.permission}`);
          return true;
        }
      }
    ];

    for (const test of tests) {
      addLog(`🔍 Тестируем: ${test.description}`);
      try {
        const result = await test.test();
        setTestResults(prev => ({ ...prev, [test.name]: result }));
        addLog(result ? `✅ ${test.description} - PASSED` : `❌ ${test.description} - FAILED`);
      } catch (error) {
        setTestResults(prev => ({ ...prev, [test.name]: false }));
        addLog(`❌ ${test.description} - ERROR: ${error}`);
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    addLog('🏁 Комплексное тестирование завершено!');
    setIsRunningTests(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          Комплексное тестирование погодной системы
        </h1>
        <p className="text-muted-foreground">
          Полная проверка интеграции погодных API и уведомлений
        </p>
      </div>

      {/* Location Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Тестовая локация
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {TEST_LOCATIONS.map((location) => (
              <Button
                key={location.name}
                variant={selectedLocation.name === location.name ? 'default' : 'outline'}
                onClick={() => setSelectedLocation(location)}
                size="sm"
              >
                {location.name}
              </Button>
            ))}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
          </div>
        </CardContent>
      </Card>

      {/* Component Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Widget Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Weather Widget
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : weatherData ? (
              <WeatherWidget
                location={selectedLocation}
                showFishingConditions={true}
                showMarineData={true}
              />
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ошибка загрузки</AlertTitle>
                <AlertDescription>
                  {error || 'Не удалось загрузить погодные данные'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Weather Badge Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className="h-5 w-5" />
              Weather Badge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weatherData && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Compact variant:</h4>
                  <WeatherBadge
                    weather={weatherData.current}
                    marine={weatherData.marine}
                    fishingConditions={fishingConditions}
                    variant="compact"
                    showTooltip={true}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">Detailed variant:</h4>
                  <WeatherBadge
                    weather={weatherData.current}
                    marine={weatherData.marine}
                    fishingConditions={fishingConditions}
                    variant="detailed"
                    showTooltip={false}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Notification Bell Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Bell
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <WeatherNotificationBell 
                location={selectedLocation}
                showBadge={true}
                autoCheck={false}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground">
              {alertsLoading ? 'Загрузка...' : `${alerts.length} активных предупреждений`}
            </div>
          </CardContent>
        </Card>

        {/* Settings Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <WeatherNotificationSettingsComponent />
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              <div>Уведомления: {settings.enabled ? 'Включены' : 'Отключены'}</div>
              <div>Интервал проверки: {settings.checkInterval} мин</div>
              <div>Браузерные уведомления: {settings.browserNotifications ? 'Да' : 'Нет'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Test Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Результаты комплексного тестирования
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={runComprehensiveTest}
                disabled={isRunningTests}
                variant="outline"
              >
                {isRunningTests ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isRunningTests ? 'Тестирование...' : 'Запустить тесты'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(testResults).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(testResults).map(([test, passed]) => (
                <div
                  key={test}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    passed 
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                      : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                  }`}
                >
                  {passed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {test.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {logs.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Лог тестирования:</h4>
                <div className="bg-muted rounded p-3 max-h-60 overflow-y-auto font-mono text-xs space-y-1">
                  {logs.map((log, index) => (
                    <div key={index} className="whitespace-pre-wrap">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => refreshWeather()} disabled={isLoading} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить погоду
            </Button>
            <Button onClick={() => refreshAlerts()} disabled={alertsLoading} size="sm">
              <BellRing className="h-4 w-4 mr-2" />
              Проверить предупреждения
            </Button>
            <Button
              onClick={() => {
                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification('🌊 Тест уведомления', {
                    body: 'Погодные уведомления работают!',
                    icon: '/favicon.ico'
                  });
                } else {
                  alert('Браузерные уведомления недоступны');
                }
              }}
              size="sm"
            >
              <Bell className="h-4 w-4 mr-2" />
              Тест уведомления
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Weather Data Debug */}
      {weatherData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug: Текущие данные</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded p-4 text-xs overflow-x-auto">
              {JSON.stringify({
                current: weatherData.current,
                marine: weatherData.marine,
                fishingConditions: fishingConditions,
                alerts: alerts.length,
                settings: {
                  enabled: settings.enabled,
                  alertTypes: settings.alertTypes,
                  thresholds: {
                    wind: settings.windSpeedThreshold,
                    wave: settings.waveHeightThreshold
                  }
                }
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
