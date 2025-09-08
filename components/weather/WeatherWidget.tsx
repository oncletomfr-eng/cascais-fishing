'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  WindIcon,
  EyeIcon,
  ThermometerIcon,
  CompassIcon,
  WavesIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  MapPinIcon
} from 'lucide-react';

import { WeatherData, WeatherLocation, FishingConditions } from '@/lib/types/weather';
import { weatherService } from '@/lib/services/weather';
import WeatherErrorBoundary from '@/components/error-boundaries/WeatherErrorBoundary';

interface WeatherWidgetProps {
  location?: WeatherLocation;
  showFishingConditions?: boolean;
  showMarineData?: boolean;
  className?: string;
  onLocationChange?: (location: WeatherLocation) => void;
}

function WeatherWidgetCore({
  location,
  showFishingConditions = true,
  showMarineData = true,
  className = '',
  onLocationChange
}: WeatherWidgetProps) {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [fishingConditions, setFishingConditions] = useState<FishingConditions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Default location (Cascais, Portugal)
  const defaultLocation: WeatherLocation = {
    latitude: 38.7223,
    longitude: -9.1393,
    name: 'Cascais, Portugal'
  };

  const currentLocation = location || defaultLocation;

  // Fetch weather data
  const fetchWeatherData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await weatherService.getWeatherData(currentLocation);
      setWeatherData(data);
      
      if (showFishingConditions) {
        const conditions = weatherService.assessFishingConditions(data);
        setFishingConditions(conditions);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      setError('Не удалось загрузить данные о погоде');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and refresh
  useEffect(() => {
    fetchWeatherData();
  }, [currentLocation.latitude, currentLocation.longitude]);

  // Auto-refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(fetchWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weatherData) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <AlertTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 mb-4">{error || 'Ошибка загрузки данных'}</p>
          <Button onClick={fetchWeatherData} variant="outline" size="sm">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { current, marine, hourly, daily } = weatherData;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPinIcon className="h-4 w-4 text-blue-600" />
            {currentLocation.name}
          </CardTitle>
          <Button
            onClick={fetchWeatherData}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-xs text-muted-foreground">
            Обновлено: {lastUpdated.toLocaleTimeString('ru-RU')}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="current">Сейчас</TabsTrigger>
            <TabsTrigger value="forecast">Прогноз</TabsTrigger>
            {showFishingConditions && (
              <TabsTrigger value="fishing">Рыбалка</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            <CurrentWeatherDisplay current={current} marine={marine} showMarineData={showMarineData} />
          </TabsContent>

          <TabsContent value="forecast" className="space-y-4">
            <ForecastDisplay hourly={hourly.slice(0, 12)} daily={daily.slice(0, 5)} />
          </TabsContent>

          {showFishingConditions && fishingConditions && (
            <TabsContent value="fishing" className="space-y-4">
              <FishingConditionsDisplay conditions={fishingConditions} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Current weather display component
function CurrentWeatherDisplay({ 
  current, 
  marine, 
  showMarineData 
}: { 
  current: WeatherData['current']; 
  marine?: WeatherData['marine']; 
  showMarineData: boolean;
}) {
  const getWeatherIcon = (description: string, isDay: boolean) => {
    if (description.includes('rain') || description.includes('drizzle')) {
      return <CloudRainIcon className="h-8 w-8 text-blue-500" />;
    }
    if (description.includes('cloud')) {
      return <CloudIcon className="h-8 w-8 text-gray-500" />;
    }
    if (isDay) {
      return <SunIcon className="h-8 w-8 text-yellow-500" />;
    }
    return <CloudIcon className="h-8 w-8 text-gray-400" />;
  };

  return (
    <div className="space-y-4">
      {/* Main weather info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getWeatherIcon(current.weatherDescription, current.isDay)}
          <div>
            <div className="text-2xl font-bold">{Math.round(current.temperature)}°C</div>
            <div className="text-sm text-muted-foreground">{current.weatherDescription}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Ощущается как</div>
          <div className="text-lg font-semibold">{Math.round(current.feelsLike)}°C</div>
        </div>
      </div>

      {/* Weather details grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <WindIcon className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-sm font-medium">{current.windSpeed} м/с</div>
            <div className="text-xs text-muted-foreground">Ветер</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CompassIcon className="h-4 w-4 text-green-500" />
          <div>
            <div className="text-sm font-medium">{current.windDirection}°</div>
            <div className="text-xs text-muted-foreground">Направление</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThermometerIcon className="h-4 w-4 text-red-500" />
          <div>
            <div className="text-sm font-medium">{current.humidity}%</div>
            <div className="text-xs text-muted-foreground">Влажность</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EyeIcon className="h-4 w-4 text-purple-500" />
          <div>
            <div className="text-sm font-medium">{(current.visibility / 1000).toFixed(1)} км</div>
            <div className="text-xs text-muted-foreground">Видимость</div>
          </div>
        </div>
      </div>

      {/* Marine conditions */}
      {showMarineData && marine && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t pt-4"
        >
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <WavesIcon className="h-4 w-4 text-blue-600" />
            Морские условия
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm font-medium">{marine.waveHeight.toFixed(1)} м</div>
              <div className="text-xs text-muted-foreground">Высота волн</div>
            </div>
            <div>
              <div className="text-sm font-medium">{marine.wavePeriod.toFixed(1)} с</div>
              <div className="text-xs text-muted-foreground">Период волн</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Forecast display component
function ForecastDisplay({ 
  hourly, 
  daily 
}: { 
  hourly: WeatherData['hourly']; 
  daily: WeatherData['daily'];
}) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-3">Почасовой прогноз</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {hourly.map((hour, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 text-center p-2 bg-gray-50 rounded-lg min-w-[80px]"
            >
              <div className="text-xs text-muted-foreground">
                {hour.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm font-medium">{Math.round(hour.temperature)}°</div>
              <div className="text-xs text-blue-600">{hour.windSpeed} м/с</div>
              {hour.precipitationProbability > 0 && (
                <div className="text-xs text-blue-500">{hour.precipitationProbability}%</div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold mb-3">На несколько дней</h4>
        <div className="space-y-2">
          {daily.map((day, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-medium">
                  {day.date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' })}
                </div>
                <div className="text-sm text-muted-foreground">{day.weatherDescription}</div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {Math.round(day.temperatureMax)}° / {Math.round(day.temperatureMin)}°
                </div>
                <div className="text-sm text-blue-600">{day.windSpeedMax} м/с</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Fishing conditions display component
function FishingConditionsDisplay({ conditions }: { conditions: FishingConditions }) {
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'dangerous': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConditionEmoji = (condition: string) => {
    switch (condition) {
      case 'excellent': return '🎣';
      case 'good': return '👍';
      case 'fair': return '⚠️';
      case 'poor': return '👎';
      case 'dangerous': return '🚫';
      default: return '❓';
    }
  };

  return (
    <div className="space-y-4">
      {/* Overall score */}
      <div className="text-center">
        <div className="text-3xl mb-2">{getConditionEmoji(conditions.overall)}</div>
        <Badge className={`${getConditionColor(conditions.overall)} text-lg px-4 py-2`}>
          {conditions.overall === 'excellent' && 'Отлично'}
          {conditions.overall === 'good' && 'Хорошо'}
          {conditions.overall === 'fair' && 'Удовлетворительно'}
          {conditions.overall === 'poor' && 'Плохо'}
          {conditions.overall === 'dangerous' && 'Опасно'}
        </Badge>
        <div className="text-sm text-muted-foreground mt-2">
          Оценка: {conditions.score}/100
        </div>
      </div>

      {/* Factors */}
      <div>
        <h4 className="font-semibold mb-3">Факторы</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Ветер</span>
            <Badge className={getConditionColor(conditions.factors.windConditions)} size="sm">
              {conditions.factors.windConditions}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Волны</span>
            <Badge className={getConditionColor(conditions.factors.waveConditions)} size="sm">
              {conditions.factors.waveConditions}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Видимость</span>
            <Badge className={getConditionColor(conditions.factors.visibility)} size="sm">
              {conditions.factors.visibility}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Осадки</span>
            <Badge className={getConditionColor(conditions.factors.precipitation)} size="sm">
              {conditions.factors.precipitation}
            </Badge>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {conditions.recommendations.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Рекомендации</h4>
          <ul className="text-sm space-y-1">
            {conditions.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {conditions.warnings.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-orange-600">Предупреждения</h4>
          <ul className="text-sm space-y-1">
            {conditions.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2">
                <AlertTriangleIcon className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Best times */}
      {conditions.bestTimes.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Лучшее время для рыбалки</h4>
          <div className="flex flex-wrap gap-2">
            {conditions.bestTimes.slice(0, 4).map((time, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Export the main component wrapped in error boundary
export default function WeatherWidget(props: WeatherWidgetProps) {
  return (
    <WeatherErrorBoundary 
      className={props.className}
      showRefresh={true}
      onRetry={() => window.location.reload()}
    >
      <WeatherWidgetCore {...props} />
    </WeatherErrorBoundary>
  );
}
