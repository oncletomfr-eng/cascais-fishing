'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  CheckCircle,
  Users,
  Calendar,
  PlayCircle,
  RotateCcw
} from 'lucide-react';
import { TripsFeedComponent } from '@/components/group-trips/TripsFeedComponent';
import GroupTripCard from '@/components/group-trips/GroupTripCard';
import { GroupTripDisplay } from '@/lib/types/group-events';
import QueryProvider from '@/components/providers/QueryProvider';

// Мок данные для демонстрации
const MOCK_TRIP: GroupTripDisplay = {
  tripId: 'demo-trip-confetti',
  date: new Date(Date.now() + 86400000 * 3), // через 3 дня
  timeSlot: 'MORNING_9AM',
  timeDisplay: 'Утром (9:00)',
  maxParticipants: 8,
  minRequired: 4,
  pricePerPerson: 95,
  currentParticipants: 6,
  spotsRemaining: 2,
  status: 'almost_full',
  participants: [
    { id: '1', name: 'João Silva', avatar: 'JS', country: '🇵🇹', joinedAt: new Date(), isReal: true },
    { id: '2', name: 'Marie Dubois', avatar: 'MD', country: '🇫🇷', joinedAt: new Date(), isReal: true },
    { id: '3', name: 'Hans Mueller', avatar: 'HM', country: '🇩🇪', joinedAt: new Date(), isReal: true },
    { id: '4', name: 'Emma Johnson', avatar: 'EJ', country: '🇬🇧', joinedAt: new Date(), isReal: true },
    { id: '5', name: 'Lars Andersson', avatar: 'LA', country: '🇸🇪', joinedAt: new Date(), isReal: true },
    { id: '6', name: 'Sofia Rodriguez', avatar: 'SR', country: '🇪🇸', joinedAt: new Date(), isReal: true },
  ],
  socialProof: 'João из Португалии, Marie из Франции и еще 4 рыбака уже присоединились!',
  urgencyLevel: 'high',
  meetingPoint: 'Cascais Marina',
  description: 'Демо поездка для тестирования конфетти анимаций',
  createdAt: new Date(),
  updatedAt: new Date()
};

export default function TestConfettiRealtimePage() {
  const [tripStatus, setTripStatus] = useState<'almost_full' | 'confirmed'>('almost_full');
  const [participants, setParticipants] = useState(6);
  const [isAnimating, setIsAnimating] = useState(false);

  // Skip during build to avoid prerendering issues
  if (typeof window === 'undefined') {
    return <div>Loading...</div>;
  }

  // Создаем текущую версию поездки на основе состояния
  const currentTrip: GroupTripDisplay = {
    ...MOCK_TRIP,
    status: tripStatus,
    currentParticipants: participants,
    spotsRemaining: Math.max(0, MOCK_TRIP.maxParticipants - participants),
    urgencyLevel: tripStatus === 'confirmed' ? 'medium' : 'high'
  };

  const handleConfirmTrip = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Эмулируем получение последних участников
    setTimeout(() => {
      setParticipants(8);
      setTripStatus('confirmed');
      setIsAnimating(false);
    }, 1000);
  };

  const resetDemo = () => {
    setTripStatus('almost_full');
    setParticipants(6);
    setIsAnimating(false);
  };

  return (
    <QueryProvider>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl sm:text-4xl font-bold text-center mb-8 text-gray-900"
        >
          🎊 Реал-тайм тест конфетти при подтверждении группы
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center text-gray-600 mb-8 max-w-3xl mx-auto"
        >
          Демонстрация того, как конфетти анимации срабатывают при изменении статуса групповой поездки на "подтверждена". 
          Анимации запускаются автоматически через useEffect при изменении статуса.
        </motion.p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Панель управления */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                  <PlayCircle className="w-6 h-6 text-blue-500" /> 
                  Управление демо
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📊 Текущий статус:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Участников:</span>
                      <span className="font-mono">{participants}/8</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Статус:</span>
                      <Badge className={
                        tripStatus === 'confirmed' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : 'bg-orange-100 text-orange-800 border-orange-200'
                      }>
                        {tripStatus === 'confirmed' ? 'Подтверждена' : 'Почти полная'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Свободных мест:</span>
                      <span className="font-mono">{Math.max(0, 8 - participants)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleConfirmTrip}
                    disabled={tripStatus === 'confirmed' || isAnimating}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    {isAnimating ? (
                      <>⏳ Набираем последних участников...</>
                    ) : tripStatus === 'confirmed' ? (
                      <>
                        <Trophy className="w-4 h-4 mr-2" />
                        Группа подтверждена!
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Подтвердить группу (триггер конфетти)
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={resetDemo} 
                    variant="outline" 
                    className="w-full"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Сбросить демо
                  </Button>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-900 mb-2">💡 Как это работает:</h4>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Карточка GroupTripCard отслеживает изменения статуса</li>
                    <li>• При изменении на "confirmed" запускается конфетти</li>
                    <li>• Используется canvas-confetti с кастомными цветами</li>
                    <li>• Celebration + fireFromElement для двойного эффекта</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Демо карточка */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Демо карточка поездки
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GroupTripCard
                  trip={currentTrip}
                  onJoinRequest={(tripId) => {
                    console.log('Join request for trip:', tripId);
                  }}
                  showParticipants={true}
                  showWeather={false}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Информация о интеграции */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-12"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl text-center">
                🎉 Интеграция конфетти анимаций
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">📍 Где реализовано:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>✅ <strong>GroupTripCard.tsx</strong> - конфетти при изменении статуса</li>
                    <li>✅ <strong>TripsFeedComponent.tsx</strong> - конфетти через WebSocket обновления</li>
                    <li>✅ <strong>useConfetti.ts</strong> - центральный хук с presets</li>
                    <li>✅ <strong>canvas-confetti</strong> - установлена библиотека с типами</li>
                    <li>✅ <strong>Тестовые страницы</strong> - /test-confetti, /test-confetti-realtime</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-3">🎯 Результат:</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>🎊 <strong>Peak-End Rule</strong> - яркий финал при подтверждении</li>
                    <li>😊 <strong>Положительные эмоции</strong> - увеличение конверсий</li>
                    <li>🏆 <strong>Celebration момент</strong> - социальное доказательство</li>
                    <li>🔄 <strong>Мотивация</strong> - к повторным бронированиям</li>
                    <li>⚡ <strong>Реал-тайм триггеры</strong> - через WebSocket</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 border-t pt-6 text-center">
                <p className="text-sm text-gray-500">
                  <strong>✅ Готово к production:</strong> Все конфетти анимации из ТЗ реализованы в реальности. 
                  UX оптимизация завершена и протестирована.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </QueryProvider>
  );
}
