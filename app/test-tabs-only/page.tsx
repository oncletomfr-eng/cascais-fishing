'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Fish, BarChart3, Loader2 } from 'lucide-react';
import { MigrationEventsPanel } from '@/components/marine-calendar/MigrationEventsPanel';
import { HistoricalDataChart } from '@/components/marine-calendar/HistoricalDataChart';

export default function TestTabsOnlyPage() {
  const [migrationEvents, setMigrationEvents] = useState<any[]>([]);
  const [loadingMigrations, setLoadingMigrations] = useState(false);

  const location = {
    latitude: 38.7071,
    longitude: -9.4212,
    name: 'Cascais, Portugal'
  };

  // Загрузка миграционных событий
  const fetchMigrationEvents = async () => {
    try {
      setLoadingMigrations(true);
      
      const startDate = new Date('2024-07-01T00:00:00.000Z');
      const endDate = new Date('2024-09-30T23:59:59.000Z');
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        species: 'TUNA,SARDINE,MACKEREL,SEABASS,SEABREAM,DORADO'
      });
      
      console.log('Запрос миграционных событий:', `/api/marine-calendar/migration-events?${params}`);
      
      const response = await fetch(`/api/marine-calendar/migration-events?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
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

  useEffect(() => {
    fetchMigrationEvents();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Тест новых табов - Миграции и Аналитика</h1>
      
      <Tabs defaultValue="migrations" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="migrations" className="flex items-center gap-2">
            <Fish className="h-4 w-4" /> Миграции
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Аналитика
          </TabsTrigger>
        </TabsList>

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
              location={location}
              targetSpecies={['TUNA', 'SARDINE', 'MACKEREL', 'SEABASS', 'SEABREAM', 'DORADO']}
            />
          )}
        </TabsContent>

        {/* Историческая аналитика */}
        <TabsContent value="analytics" className="space-y-6">
          <HistoricalDataChart 
            location={location}
            dateRange={{
              start: new Date(2023, 0, 1), // 1 января 2023
              end: new Date(2024, 11, 31) // 31 декабря 2024
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
