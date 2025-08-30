'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Moon, 
  Fish, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  Clock, 
  Thermometer,
  Wind,
  Eye,
  Waves,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { MigrationEventsPanel } from '@/components/marine-calendar/MigrationEventsPanel';
import { HistoricalDataChart } from '@/components/marine-calendar/HistoricalDataChart';

interface RealMarineCalendarProps {
  initialDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

interface RealFishingConditions {
  date: Date;
  location: any;
  weather: {
    temperature: {
      air: number;
      water: number;
    };
    wind: {
      speed: number;
      direction: number;
      description: string;
    };
    atmospheric: {
      pressure: number;
      humidity: number;
      visibility: number;
      cloudCover: number;
    };
    marine: {
      waveHeight: number;
      condition: string;
    };
  };
  lunar: {
    phase: string;
    illumination: number;
    rise: Date | null;
    set: Date | null;
    influence: any;
    distance: number;
    chinese: any;
  } | null;
  fishing: {
    activity: string;
    impact: string;
    optimalTimes: string[];
    recommendation: string;
    overallRating: number;
  };
  tides: any;
  forecast: any[] | null;
  metadata: any;
}

export default function RealMarineCalendarPage({ 
  initialDate = new Date(),
  location = {
    latitude: 38.7071,
    longitude: -9.4212,
    name: 'Cascais, Portugal'
  }
}: RealMarineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [fishingConditions, setFishingConditions] = useState<RealFishingConditions | null>(null);
  const [migrationEvents, setMigrationEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMigrations, setLoadingMigrations] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(location);
  const [includeForecast, setIncludeForecast] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Загрузка реальных данных
  const fetchRealFishingConditions = async (date: Date, loc: typeof location, forecast: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        date: date.toISOString(),
        latitude: loc.latitude.toString(),
        longitude: loc.longitude.toString(),
        includeForecast: forecast.toString()
      });
      
      console.log('Запрос к реальному API:', `/api/marine-calendar/fishing-conditions-real?${params}`);
      
      const response = await fetch(`/api/marine-calendar/fishing-conditions-real?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Получены реальные данные:', data);
      
      setFishingConditions(data);
    } catch (error) {
      console.error('Ошибка загрузки реальных данных:', error);
      setError((error as any).message || 'Произошла неизвестная ошибка');
      setFishingConditions(null);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка миграционных событий
  const fetchMigrationEvents = async (date: Date, loc: typeof location) => {
    try {
      setLoadingMigrations(true);
      
      // Установим период поиска: используем 2024 год для демо данных  
      const startDate = new Date('2024-07-01T00:00:00.000Z');
      const endDate = new Date('2024-09-30T23:59:59.000Z');
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        latitude: loc.latitude.toString(),
        longitude: loc.longitude.toString(),
        species: 'TUNA,SARDINE,MACKEREL,SEABASS,SEABREAM,DORADO' // Основные виды
      });
      
      console.log('Запрос миграционных событий:', `/api/marine-calendar/migration-events?${params}`);
      
      const response = await fetch(`/api/marine-calendar/migration-events?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Получены данные о миграциях:', data);
      
      setMigrationEvents(data.events || []);
    } catch (error) {
      console.error('Ошибка загрузки миграционных событий:', error);
      setMigrationEvents([]);
    } finally {
      setLoadingMigrations(false);
    }
  };

  // Загрузка данных при монтировании и изменении параметров
  useEffect(() => {
    fetchRealFishingConditions(currentDate, selectedLocation, includeForecast);
    fetchMigrationEvents(currentDate, selectedLocation);
  }, [currentDate, selectedLocation.latitude, selectedLocation.longitude, includeForecast]);

  // Функция обновления данных
  const handleRefresh = () => {
    fetchRealFishingConditions(currentDate, selectedLocation, includeForecast);
    fetchMigrationEvents(currentDate, selectedLocation);
  };

  // Функция смены даты
  const handleDateChange = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + days);
    setCurrentDate(newDate);
  };

  // Получить цвет для рейтинга
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  // Получить описание фазы луны на русском
  const getLunarPhaseRu = (phase: string) => {
    const phases = {
      'new': 'Новолуние',
      'first_quarter': 'Первая четверть',
      'full': 'Полнолуние', 
      'last_quarter': 'Последняя четверть'
    };
    return phases[phase] || phase;
  };

  // Получить описание активности рыбы на русском
  const getFishActivityRu = (activity: string) => {
    const activities = {
      'very_high': 'Очень высокая',
      'high': 'Высокая',
      'moderate': 'Умеренная',
      'low': 'Низкая',
      'very_low': 'Очень низкая'
    };
    return activities[activity] || activity;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Fish className="h-8 w-8 text-blue-600" />
              Реальный морской календарь
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Данные от реальных API: OpenWeatherMap, Astronomy Engine, NOAA
            </p>
          </div>
          
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Обновить
          </Button>
        </div>
        
        {/* Контролы даты */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDateChange(-1)}
              disabled={loading}
            >
              ← Вчера
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              disabled={loading}
            >
              Сегодня
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDateChange(1)}
              disabled={loading}
            >
              Завтра →
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="font-medium">
              {currentDate.toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{selectedLocation.name}</span>
          </div>
        </div>
        
        {/* Переключатель прогноза */}
        <div className="flex items-center gap-2">
          <input 
            type="checkbox"
            id="includeForecast"
            checked={includeForecast}
            onChange={(e) => setIncludeForecast(e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="includeForecast" className="text-sm">
            Включить прогноз на 3 дня
          </Label>
        </div>
      </div>

      {/* Состояния загрузки и ошибок */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Загрузка данных от внешних сервисов...</span>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <span className="font-medium">Ошибка:</span>
              <span>{error}</span>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm" 
              className="mt-3 border-red-300 text-red-600 hover:bg-red-50"
            >
              Попробовать снова
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Основные данные */}
      {fishingConditions && !loading && (
        <div className="grid gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="weather">Погода</TabsTrigger>
              <TabsTrigger value="lunar">Лунный календарь</TabsTrigger>
              <TabsTrigger value="forecast">Прогноз</TabsTrigger>
              <TabsTrigger value="migrations" className="flex items-center gap-2">
                <Fish className="h-4 w-4" /> Миграции
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Аналитика
              </TabsTrigger>
            </TabsList>

            {/* Обзор */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Общий рейтинг */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Общий рейтинг
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      <span className={cn('text-4xl', getRatingColor(fishingConditions.fishing.overallRating))}>
                        {fishingConditions.fishing.overallRating}
                      </span>
                      <span className="text-gray-500">/10</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Активность рыбы: {getFishActivityRu(fishingConditions.fishing.activity)}
                    </p>
                    <Badge 
                      variant={
                        fishingConditions.fishing.impact === 'very_positive' || fishingConditions.fishing.impact === 'positive' 
                          ? 'default' 
                          : fishingConditions.fishing.impact === 'negative' || fishingConditions.fishing.impact === 'very_negative'
                            ? 'destructive'
                            : 'secondary'
                      }
                      className="mt-2"
                    >
                      {fishingConditions.fishing.impact.replace('_', ' ')}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Температуры */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      Температура
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Воздух:</span>
                        <span className="font-medium">{fishingConditions.weather.temperature.air}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Вода:</span>
                        <span className="font-medium">{fishingConditions.weather.temperature.water}°C</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Лунная фаза */}
                {fishingConditions.lunar && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Лунная фаза
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="font-medium">
                          {getLunarPhaseRu(fishingConditions.lunar.phase)}
                        </div>
                        <div className="text-sm text-gray-600">
                          Освещенность: {fishingConditions.lunar.illumination}%
                        </div>
                        <div className="text-sm text-gray-600">
                          Расстояние: {Math.round(fishingConditions.lunar.distance / 1000)} тыс. км
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Рекомендации */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fish className="h-5 w-5" />
                    Рекомендации для рыбалки
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm">
                    {fishingConditions.fishing.recommendation}
                  </p>
                  
                  {fishingConditions.fishing.optimalTimes.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Лучшее время для рыбалки:
                      </h4>
                      <div className="flex gap-2 flex-wrap">
                        {fishingConditions.fishing.optimalTimes.map((time, index) => (
                          <Badge key={index} variant="outline">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Погодные данные */}
            <TabsContent value="weather" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wind className="h-4 w-4" />
                      Ветер
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        {fishingConditions.weather.wind.speed} м/с
                      </div>
                      <p className="text-sm text-gray-600">
                        {fishingConditions.weather.wind.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Направление: {fishingConditions.weather.wind.direction}°
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      Волны
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {fishingConditions.weather.marine.waveHeight} м
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {fishingConditions.weather.marine.condition}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Видимость
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {fishingConditions.weather.atmospheric.visibility} км
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Облачность: {fishingConditions.weather.atmospheric.cloudCover}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      Атмосферное давление
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {fishingConditions.weather.atmospheric.pressure} гПа
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Влажность: {fishingConditions.weather.atmospheric.humidity}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Лунный календарь */}
            <TabsContent value="lunar" className="space-y-6">
              {fishingConditions.lunar ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Moon className="h-5 w-5" />
                        Лунная информация
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Фаза</p>
                          <p className="font-medium">{getLunarPhaseRu(fishingConditions.lunar.phase)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Освещенность</p>
                          <p className="font-medium">{fishingConditions.lunar.illumination}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Восход</p>
                          <p className="font-medium">
                            {fishingConditions.lunar.rise 
                              ? new Date(fishingConditions.lunar.rise).toLocaleTimeString('ru-RU', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : '—'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Заход</p>
                          <p className="font-medium">
                            {fishingConditions.lunar.set 
                              ? new Date(fishingConditions.lunar.set).toLocaleTimeString('ru-RU', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })
                              : '—'
                            }
                          </p>
                        </div>
                      </div>
                      
                      {fishingConditions.lunar.influence && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-2">Влияние на рыбалку</h4>
                          <p className="text-sm text-gray-600">
                            {fishingConditions.lunar.influence.description}
                          </p>
                          {fishingConditions.lunar.influence.recommendation && (
                            <p className="text-sm text-blue-600 mt-2">
                              💡 {fishingConditions.lunar.influence.recommendation}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {fishingConditions.lunar.chinese && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Китайский лунный календарь</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600">Год:</span>
                            <span className="ml-2 font-medium">{fishingConditions.lunar.chinese.year}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Месяц:</span>
                            <span className="ml-2 font-medium">{fishingConditions.lunar.chinese.month}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">День:</span>
                            <span className="ml-2 font-medium">{fishingConditions.lunar.chinese.day}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Животное:</span>
                            <span className="ml-2 font-medium">{fishingConditions.lunar.chinese.animal}</span>
                          </div>
                        </div>
                        
                        {fishingConditions.lunar.chinese.favorableActivities?.length > 0 && (
                          <div className="border-t pt-3">
                            <h5 className="font-medium text-green-600 mb-1">Благоприятно:</h5>
                            <p className="text-sm text-gray-600">
                              {fishingConditions.lunar.chinese.favorableActivities.join(', ')}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    Данные о лунной фазе недоступны
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Прогноз */}
            <TabsContent value="forecast" className="space-y-6">
              {fishingConditions.forecast && fishingConditions.forecast.length > 0 ? (
                <div className="grid gap-4">
                  {fishingConditions.forecast.map((day, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          {new Date(day.date).toLocaleDateString('ru-RU', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-600">Рейтинг</p>
                            <p className={cn('text-lg font-bold', getRatingColor(day.rating))}>
                              {day.rating}/10
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Температура</p>
                            <p className="font-medium">{day.conditions.temperature}°C</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Ветер</p>
                            <p className="font-medium">{day.conditions.wind} м/с</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Луна</p>
                            <p className="font-medium">{getLunarPhaseRu(day.conditions.lunar)}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-600 mb-2">{day.summary}</p>
                          {day.bestTimes && day.bestTimes.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {day.bestTimes.slice(0, 3).map((time, timeIndex) => (
                                <Badge key={timeIndex} variant="outline" className="text-xs">
                                  {time}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-gray-500">
                    <p>Прогноз недоступен</p>
                    <p className="text-sm mt-2">Включите опцию "Включить прогноз" для получения данных</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Миграционные события */}
            <TabsContent value="migrations" className="space-y-6">
              {loadingMigrations ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4" />
                    <p>Загрузка миграционных событий...</p>
                  </CardContent>
                </Card>
              ) : (
                <MigrationEventsPanel 
                  events={migrationEvents}
                  location={selectedLocation}
                  targetSpecies={['TUNA', 'SARDINE', 'MACKEREL', 'SEABASS', 'SEABREAM', 'DORADO']}
                />
              )}
            </TabsContent>

            {/* Историческая аналитика */}
            <TabsContent value="analytics" className="space-y-6">
              <HistoricalDataChart 
                location={selectedLocation}
                dateRange={{
                  start: new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate()),
                  end: currentDate
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Метаинформация */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Источники данных</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="font-medium">Погода:</span>
                  <span className="ml-1 text-gray-600">{fishingConditions.metadata.apis.weather}</span>
                </div>
                <div>
                  <span className="font-medium">Лунные данные:</span>
                  <span className="ml-1 text-gray-600">{fishingConditions.metadata.apis.lunar}</span>
                </div>
                <div>
                  <span className="font-medium">Приливы:</span>
                  <span className="ml-1 text-gray-600">{fishingConditions.metadata.apis.tides}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Данные обновлены: {new Date(fishingConditions.metadata.calculatedAt).toLocaleString('ru-RU')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
