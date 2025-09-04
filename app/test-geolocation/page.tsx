'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, 
  Navigation, 
  Globe, 
  CheckCircle, 
  ArrowLeft,
  Compass,
  Fish,
  RefreshCw,
  X
} from 'lucide-react';
import Link from 'next/link';
import { GeolocationPicker } from '@/components/geolocation/GeolocationPicker';
import { GeolocationData } from '@/lib/types/marine-calendar';

export default function TestGeolocationPage() {
  const [selectedLocation, setSelectedLocation] = useState<GeolocationData | null>(null);
  const [fishingConditions, setFishingConditions] = useState<any>(null);
  const [isLoadingConditions, setIsLoadingConditions] = useState(false);

  // Получение данных рыбалки для выбранного местоположения
  const fetchFishingConditions = async (location: GeolocationData) => {
    setIsLoadingConditions(true);
    try {
      const response = await fetch(
        `/api/marine-calendar/fishing-conditions-real?` +
        `date=${new Date().toISOString()}&` +
        `latitude=${location.latitude}&` +
        `longitude=${location.longitude}&` +
        `includeForecast=false`
      );
      
      const data = await response.json();
      if (response.ok) {
        setFishingConditions(data);
      } else {
        console.error('Ошибка получения условий рыбалки:', data.error);
        setFishingConditions(null);
      }
    } catch (error) {
      console.error('Ошибка запроса условий рыбалки:', error);
      setFishingConditions(null);
    } finally {
      setIsLoadingConditions(false);
    }
  };

  const handleLocationChange = (location: GeolocationData) => {
    setSelectedLocation(location);
    // Автоматически получаем условия рыбалки при изменении местоположения
    fetchFishingConditions(location);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    if (rating >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getActivityBadge = (activity: string) => {
    const colors = {
      'very_high': 'bg-green-500',
      'high': 'bg-green-400',
      'moderate': 'bg-yellow-400',
      'low': 'bg-orange-400',
      'very_low': 'bg-red-400'
    };
    
    const labels = {
      'very_high': 'Очень высокая',
      'high': 'Высокая',
      'moderate': 'Умеренная',
      'low': 'Низкая',
      'very_low': 'Очень низкая'
    };

    return (
      <Badge className={`${colors[activity as keyof typeof colors] || 'bg-gray-400'} text-white`}>
        {labels[activity as keyof typeof labels] || activity}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* Заголовок */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/test-marine-calendar-real">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Назад к календарю
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Compass className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Тест геолокации</h1>
                  <p className="text-sm text-gray-600">Google Maps API + Морской календарь</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Левая колонка: Выбор местоположения */}
          <div>
            <GeolocationPicker
              currentLocation={
                selectedLocation ? {
                  latitude: selectedLocation.latitude,
                  longitude: selectedLocation.longitude,
                  address: selectedLocation.address
                } : undefined
              }
              onLocationChange={handleLocationChange}
              title="Выбор местоположения для рыбалки"
              description="Выберите точку, чтобы получить условия для рыбалки"
            />

            {/* Информация о выбранном местоположении */}
            {selectedLocation && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Детали местоположения
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Адрес</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedLocation.address || 'Адрес не определен'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Широта</Label>
                      <p className="text-sm font-mono">{selectedLocation.latitude.toFixed(6)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Долгота</Label>
                      <p className="text-sm font-mono">{selectedLocation.longitude.toFixed(6)}</p>
                    </div>
                  </div>
                  {selectedLocation.city && (
                    <div>
                      <Label className="text-sm font-medium">Регион</Label>
                      <p className="text-sm text-muted-foreground">
                        {selectedLocation.city}
                        {selectedLocation.region && `, ${selectedLocation.region}`}
                        {selectedLocation.country && `, ${selectedLocation.country}`}
                      </p>
                    </div>
                  )}
                  {selectedLocation.accuracy && (
                    <div>
                      <Label className="text-sm font-medium">Точность</Label>
                      <p className="text-sm text-muted-foreground">
                        ±{Math.round(selectedLocation.accuracy)} метров
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Правая колонка: Условия рыбалки */}
          <div>
            {selectedLocation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fish className="w-5 h-5" />
                    Условия рыбалки
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingConditions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Загрузка условий рыбалки...</p>
                      </div>
                    </div>
                  ) : fishingConditions ? (
                    <div className="space-y-4">
                      {/* Общий рейтинг */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Рейтинг рыбалки</span>
                        <div className="text-right">
                          <span className={`text-2xl font-bold ${getRatingColor(fishingConditions.fishing?.overallRating || 0)}`}>
                            {fishingConditions.fishing?.overallRating || 'N/A'}
                          </span>
                          <span className="text-muted-foreground text-sm">/10</span>
                        </div>
                      </div>

                      {/* Активность рыбы */}
                      {fishingConditions.fishing?.activity && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Активность рыбы</span>
                          {getActivityBadge(fishingConditions.fishing.activity)}
                        </div>
                      )}

                      <Separator />

                      {/* Погодные условия */}
                      {fishingConditions.weather && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium">Погода</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Воздух</span>
                              <p className="font-medium">{fishingConditions.weather.temperature?.air}°C</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Вода</span>
                              <p className="font-medium">{fishingConditions.weather.temperature?.water}°C</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Ветер</span>
                              <p className="font-medium">{fishingConditions.weather.wind?.speed} м/с</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Давление</span>
                              <p className="font-medium">{fishingConditions.weather.atmospheric?.pressure} гПа</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Приливы */}
                      {fishingConditions.tides && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Приливы</h4>
                          <div className="text-sm">
                            <p><span className="text-muted-foreground">Тип:</span> {fishingConditions.tides.type}</p>
                            <p><span className="text-muted-foreground">Уровень:</span> {fishingConditions.tides.currentLevel}м</p>
                          </div>
                        </div>
                      )}

                      <Separator />

                      {/* Рекомендации */}
                      {fishingConditions.fishing?.recommendation && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Рекомендации</h4>
                          <p className="text-sm text-muted-foreground">
                            {fishingConditions.fishing.recommendation}
                          </p>
                        </div>
                      )}

                      {/* Оптимальное время */}
                      {fishingConditions.fishing?.optimalTimes && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Лучшее время</h4>
                          <div className="flex gap-2 flex-wrap">
                            {fishingConditions.fishing.optimalTimes.map((time: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {time}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Источники данных */}
                      {fishingConditions.metadata?.apis && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Источники:</span> {Object.values(fishingConditions.metadata.apis).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Выберите местоположение для получения условий рыбалки</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedLocation && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center text-muted-foreground">
                    <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="font-medium mb-2">Выберите местоположение</h3>
                    <p className="text-sm">
                      Используйте поиск или геолокацию браузера, чтобы получить данные о рыбалке
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
