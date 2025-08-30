'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CloudIcon,
  MapPinIcon,
  TestTubeIcon,
  WavesIcon,
  InfoIcon
} from 'lucide-react';

import WeatherWidget from '@/components/weather/WeatherWidget';
import WeatherBadge from '@/components/weather/WeatherBadge';
import { useWeather, useWeatherAlerts } from '@/lib/hooks/useWeather';
import { WeatherLocation } from '@/lib/types/weather';

export default function TestWeatherPage() {
  const [testLocation, setTestLocation] = useState<WeatherLocation>({
    latitude: 38.7223,
    longitude: -9.1393,
    name: 'Cascais, Portugal'
  });

  const [customLat, setCustomLat] = useState('38.7223');
  const [customLon, setCustomLon] = useState('-9.1393');
  const [customName, setCustomName] = useState('');

  const { weatherData, fishingConditions, isLoading, error, refreshWeather } = useWeather({
    location: testLocation,
    enableMarine: true,
    enableFishingAssessment: true,
    autoRefresh: true
  });

  const { alerts } = useWeatherAlerts(testLocation);

  // Predefined test locations
  const testLocations: WeatherLocation[] = [
    { latitude: 38.7223, longitude: -9.1393, name: 'Cascais, Portugal' },
    { latitude: 40.7128, longitude: -74.0060, name: 'New York, USA' },
    { latitude: 51.5074, longitude: -0.1278, name: 'London, UK' },
    { latitude: 35.6762, longitude: 139.6503, name: 'Tokyo, Japan' },
    { latitude: -33.8688, longitude: 151.2093, name: 'Sydney, Australia' },
    { latitude: 60.1699, longitude: 24.9384, name: 'Helsinki, Finland' },
    { latitude: 25.2048, longitude: 55.2708, name: 'Dubai, UAE' }
  ];

  const handleLocationChange = (location: WeatherLocation) => {
    setTestLocation(location);
    setCustomLat(location.latitude.toString());
    setCustomLon(location.longitude.toString());
    setCustomName(location.name || '');
  };

  const handleCustomLocation = () => {
    const lat = parseFloat(customLat);
    const lon = parseFloat(customLon);
    
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      alert('Пожалуйста, введите корректные координаты');
      return;
    }

    const newLocation: WeatherLocation = {
      latitude: lat,
      longitude: lon,
      name: customName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    };

    setTestLocation(newLocation);
  };

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl sm:text-4xl font-bold text-center mb-8 text-gray-900"
      >
        🌦️ Тестирование погодной интеграции
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center text-gray-600 mb-8 max-w-3xl mx-auto"
      >
        Полное тестирование Open-Meteo API интеграции с морскими условиями и оценкой условий для рыбалки.
        Все данные получаются в реальном времени без использования моковых данных.
      </motion.p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Location selector */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
                Выбор локации
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Предустановленные локации</Label>
                <div className="space-y-2">
                  {testLocations.map((location, index) => (
                    <Button
                      key={index}
                      variant={
                        testLocation.latitude === location.latitude && 
                        testLocation.longitude === location.longitude
                          ? 'default'
                          : 'outline'
                      }
                      className="w-full justify-start text-sm"
                      onClick={() => handleLocationChange(location)}
                    >
                      {location.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-semibold mb-2 block">Произвольная локация</Label>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="lat" className="text-xs">Широта</Label>
                    <Input
                      id="lat"
                      value={customLat}
                      onChange={(e) => setCustomLat(e.target.value)}
                      placeholder="38.7223"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lon" className="text-xs">Долгота</Label>
                    <Input
                      id="lon"
                      value={customLon}
                      onChange={(e) => setCustomLon(e.target.value)}
                      placeholder="-9.1393"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="name" className="text-xs">Название (опционально)</Label>
                    <Input
                      id="name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Мое место"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleCustomLocation} className="w-full">
                    Применить
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Текущая локация:</strong><br />
                  {testLocation.name}<br />
                  {testLocation.latitude.toFixed(4)}, {testLocation.longitude.toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weather widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          <WeatherWidget
            location={testLocation}
            showFishingConditions={true}
            showMarineData={true}
            className="shadow-lg"
          />
        </motion.div>
      </div>

      {/* Weather alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2">
                <InfoIcon className="w-5 h-5 text-orange-600" />
                Погодные предупреждения
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alerts.map((alert, index) => (
                <Alert key={alert.id} className="border-orange-200 bg-orange-50">
                  <AlertDescription>
                    <strong>{alert.title}</strong><br />
                    {alert.description}
                  </AlertDescription>
                </Alert>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Weather badge examples */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="mt-8"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <TestTubeIcon className="w-5 h-5 text-purple-600" />
              Компоненты Weather Badge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Компактный вариант</h3>
              <div className="flex flex-wrap gap-3">
                <WeatherBadge
                  weather={weatherData?.current}
                  fishingConditions={fishingConditions}
                  variant="compact"
                />
                <WeatherBadge
                  weather={weatherData?.current}
                  variant="compact"
                  showTooltip={false}
                />
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-3">Детальный вариант</h3>
              <WeatherBadge
                weather={weatherData?.current}
                marine={weatherData?.marine}
                fishingConditions={fishingConditions}
                variant="detailed"
                showTooltip={false}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* API Integration info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="mt-8"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-center">
              📊 Open-Meteo API Интеграция
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">✅ Реализовано:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• <strong>Current Weather API</strong> - текущие условия</li>
                  <li>• <strong>Marine Forecast API</strong> - морские условия</li>
                  <li>• <strong>Hourly/Daily Forecast</strong> - почасовой/дневной прогноз</li>
                  <li>• <strong>Fishing Assessment</strong> - оценка условий для рыбалки</li>
                  <li>• <strong>Weather Alerts</strong> - автоматические предупреждения</li>
                  <li>• <strong>Real-time Updates</strong> - обновление каждые 10 минут</li>
                  <li>• <strong>Multiple Locations</strong> - поддержка любых координат</li>
                  <li>• <strong>Caching System</strong> - кэширование для производительности</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">🎯 Результаты:</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• <strong>Бесплатный API</strong> - без ключей и лимитов</li>
                  <li>• <strong>Высокое качество</strong> - данные от NOAA, ECMWF</li>
                  <li>• <strong>Морские данные</strong> - волны, периоды, направления</li>
                  <li>• <strong>Оценка для рыбалки</strong> - комплексный анализ</li>
                  <li>• <strong>CORS поддержка</strong> - работает с фронтенда</li>
                  <li>• <strong>TypeScript типы</strong> - полная типизация</li>
                  <li>• <strong>Error handling</strong> - обработка ошибок</li>
                  <li>• <strong>Responsive UI</strong> - адаптивный интерфейс</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 border-t pt-6 text-center">
              <p className="text-sm text-gray-500">
                <strong>✅ Готово к production:</strong> Погодная интеграция полностью реализована и протестирована.
                Все данные получаются в реальном времени из Open-Meteo API.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </main>
  );
}
