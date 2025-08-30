'use client';

import React from 'react';
import { MarineCalendar } from '@/components/marine-calendar/MarineCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Moon, Fish, Waves, MapPin } from 'lucide-react';

export default function TestMarineCalendarPage() {
  // Тестовая локация - Кашкайш, Португалия
  const cascaisLocation = {
    latitude: 38.6979,
    longitude: -9.4215,
    name: 'Cascais, Portugal'
  };

  // Целевые виды рыб для теста
  const targetSpecies = ['TUNA', 'DORADO', 'SEABASS', 'SARDINE'];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Заголовок страницы */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">🌊 Морской календарь</h1>
              <p className="text-xl text-blue-100">
                Лунные фазы, миграции рыб и прогноз клёва
              </p>
              <div className="flex items-center space-x-4 mt-4">
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{cascaisLocation.name}</span>
                </Badge>
                <Badge variant="secondary">
                  🐟 {targetSpecies.length} видов рыб
                </Badge>
                <Badge variant="secondary">
                  🌅 Реальные данные
                </Badge>
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center space-y-2">
              <Moon className="h-16 w-16 text-blue-200" />
              <p className="text-sm text-blue-200">Астрономические расчеты</p>
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="container mx-auto px-4 py-8">
        {/* Информационные карточки */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-blue-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-blue-700">
                <Moon className="h-5 w-5" />
                <span>Лунные фазы</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Точные астрономические расчеты лунных фаз и их влияния на активность рыбы. 
                Включает китайский лунный календарь для дополнительных рекомендаций.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">astronomy-engine</Badge>
                <Badge variant="outline" className="text-xs">lunar-javascript</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-green-700">
                <Fish className="h-5 w-5" />
                <span>Миграции рыб</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Прогнозы миграционных маршрутов основных видов рыб по сезонам. 
                Анализ температуры воды, течений и биологических циклов.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">Тунец</Badge>
                <Badge variant="outline" className="text-xs">Дорадо</Badge>
                <Badge variant="outline" className="text-xs">+18 видов</Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-purple-700">
                <Waves className="h-5 w-5" />
                <span>Условия рыбалки</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Комплексный анализ условий для рыбалки: лунное влияние, приливы, 
                миграционная активность и исторические данные.
              </p>
              <div className="mt-3 flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">Рейтинг клёва</Badge>
                <Badge variant="outline" className="text-xs">Лучшие часы</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Функциональные возможности */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🚀 Возможности морского календаря</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Лунный календарь</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Точные фазы луны</li>
                  <li>• Влияние на клёв</li>
                  <li>• Китайский календарь</li>
                  <li>• Лучшие часы</li>
                </ul>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Миграции рыб</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 20+ видов рыб</li>
                  <li>• Сезонные маршруты</li>
                  <li>• Прогноз активности</li>
                  <li>• Глубины ловли</li>
                </ul>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-800 mb-2">Исторические данные</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Записи об уловах</li>
                  <li>• Корреляции</li>
                  <li>• Тренды по годам</li>
                  <li>• Статистика</li>
                </ul>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <h3 className="font-medium text-orange-800 mb-2">Прогнозы</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Рейтинг клёва</li>
                  <li>• Приливы/отливы</li>
                  <li>• Рекомендации</li>
                  <li>• Снасти и приманки</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API статус */}
        <div className="flex justify-center mb-8">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="text-center">🔗 API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Лунные фазы</h4>
                  <p className="text-xs text-gray-600">/api/marine-calendar/lunar-phases</p>
                  <Badge variant="outline" className="text-xs mt-1">GET, POST</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Условия рыбалки</h4>
                  <p className="text-xs text-gray-600">/api/marine-calendar/fishing-conditions</p>
                  <Badge variant="outline" className="text-xs mt-1">GET</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Миграции</h4>
                  <p className="text-xs text-gray-600">/api/marine-calendar/migration-events</p>
                  <Badge variant="outline" className="text-xs mt-1">GET, POST</Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium text-sm mb-1">Исторические данные</h4>
                  <p className="text-xs text-gray-600">/api/marine-calendar/historical-data</p>
                  <Badge variant="outline" className="text-xs mt-1">GET, POST</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Основной компонент морского календаря */}
        <MarineCalendar 
          location={cascaisLocation}
          targetSpecies={targetSpecies}
          initialDate={new Date()}
        />

        {/* Подвал с дополнительной информацией */}
        <div className="mt-16 p-8 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">🌊 Cascais Fishing - Морской календарь</h2>
            <p className="text-gray-700 max-w-3xl mx-auto mb-6">
              Уникальная система прогнозирования рыбалки, основанная на научных данных о лунных циклах, 
              миграциях рыб и морских условиях. Получите максимум от каждой рыболовной поездки с помощью 
              точных прогнозов и рекомендаций.
            </p>
            <div className="flex justify-center space-x-4">
              <Button variant="outline">
                📚 Документация API
              </Button>
              <Button variant="outline">
                🐟 Гид по видам рыб
              </Button>
              <Button variant="outline">
                🌙 О лунных фазах
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
