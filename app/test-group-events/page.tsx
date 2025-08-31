'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TripsFeedComponent } from '@/components/group-trips/TripsFeedComponent';
import QueryProvider from '@/components/providers/QueryProvider';
import { useQuery } from '@tanstack/react-query';

/**
 * Тестовая страница для проверки работы групповых событий с реальными данными
 */
export default function TestGroupEventsPage() {
  // Получаем реальные данные из API
  const { data: tripsData, isLoading, error } = useQuery({
    queryKey: ['group-trips', 'test-page'],
    queryFn: async () => {
      const response = await fetch('/api/group-trips?limit=6');
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      const data = await response.json();
      return data.success ? data.data.trips : [];
    },
    retry: 2,
    staleTime: 1 * 60 * 1000, // 1 минута
    refetchInterval: 30 * 1000 // Обновление каждые 30 секунд
  });

  const trips = tripsData || [];
  
  const handleTripSelect = (trip: any) => {
    console.log('🎣 Selected trip:', trip);
    alert(`Выбрана поездка: ${trip.tripId} на ${trip.date}`);
  };

  return (
    <QueryProvider>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
        {/* Simple Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-blue-600 mb-4">
            🎣 Тестовая страница групповых событий
          </h1>
          <p className="text-lg text-gray-600">
            Проверка работы TripsFeedComponent с реальными данными из API
          </p>
          
          {/* Status Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className={`w-2 h-2 rounded-full ${
              isLoading ? 'bg-yellow-500 animate-pulse' : 
              error ? 'bg-red-500' : 
              'bg-green-500 animate-pulse'
            }`}></div>
            <span className="text-sm text-gray-500">
              {isLoading ? 'Загрузка данных...' :
               error ? 'Ошибка загрузки' :
               `Система запущена (${trips.length} поездок)`}
            </span>
          </div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div 
            className="max-w-2xl mx-auto mb-8 p-4 bg-red-50 border border-red-200 rounded-lg"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <p className="text-red-700">
              Ошибка загрузки данных: {(error as Error).message}
            </p>
            <p className="text-sm text-red-600 mt-2">
              Убедитесь, что сервер запущен и база данных настроена
            </p>
          </motion.div>
        )}

        {/* Trips Feed */}
        <div className="max-w-6xl mx-auto">
          <TripsFeedComponent
            trips={trips}
            onTripSelect={handleTripSelect}
            realTimeUpdates={true} // Включаем WebSocket для реальных данных
            enableSocialProof={true}
            showWeatherInfo={false}
          />
        </div>
      </main>
    </QueryProvider>
  );
}
