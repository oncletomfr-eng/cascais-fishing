'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Users, 
  Fish, 
  Calendar,
  MapPin,
  Clock,
  Waves
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TripChatSystem, ChatToggleButton, useTripChat } from '@/components/chat/TripChatSystem';
import { GroupTripCardWithChat } from '@/components/group-trips/GroupTripCardWithChat';
import { GroupTripDisplay } from '@/lib/types/group-events';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Вспомогательные функции для преобразования данных
function getTimeSlotDisplay(timeSlot: string): string {
  const timeSlots: Record<string, string> = {
    'MORNING_9AM': 'Утром (09:00-13:00)',
    'AFTERNOON_2PM': 'Днём (14:00-18:00)',
    'EVENING_6PM': 'Вечером (18:00-22:00)'
  };
  return timeSlots[timeSlot] || 'Неизвестное время';
}

function getDisplayStatus(status: string, currentParticipants: number, maxParticipants: number): string {
  if (status === 'CONFIRMED') return 'confirmed';
  if (currentParticipants >= maxParticipants) return 'almost_full';
  if (currentParticipants >= maxParticipants * 0.75) return 'almost_full';
  return 'forming';
}

function generateSocialProof(participantCount: number, status: string): string | undefined {
  if (status === 'CONFIRMED') {
    return `${participantCount} участников подтверждены!`;
  }
  if (participantCount > 2) {
    return `${participantCount} участника уже записались`;
  }
  return undefined;
}

function generateRecentActivity(participants: any[]): string | undefined {
  if (participants && participants.length > 0) {
    const latest = participants[participants.length - 1];
    const name = latest.user?.name || 'Участник';
    return `${name} присоединился недавно`;
  }
  return undefined;
}

function getUrgencyLevel(spotsRemaining: number): 'low' | 'medium' | 'high' | 'critical' {
  if (spotsRemaining <= 1) return 'critical';
  if (spotsRemaining <= 2) return 'high';
  if (spotsRemaining <= 3) return 'medium';
  return 'low';
}

function getDemoTrips(): GroupTripDisplay[] {
  return [
    {
      tripId: 'demo-trip-fallback',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      timeSlot: 'MORNING_9AM',
      timeDisplay: 'Утром (09:00-13:00)',
      maxParticipants: 8,
      minRequired: 6,
      pricePerPerson: 95,
      currentParticipants: 1,
      spotsRemaining: 7,
      status: 'forming',
      participants: [],
      socialProof: undefined,
      recentActivity: undefined,
      urgencyLevel: 'low',
      meetingPoint: 'Cascais Marina',
      description: 'Демо данные (ошибка API)',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];
}

// Главная страница демонстрации чата
export default function ChatDemoPage() {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [trips, setTrips] = useState<GroupTripDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, toggleChat, unreadCount } = useTripChat(selectedTripId || undefined);

  // Загрузка реальных данных из API
  useEffect(() => {
    async function loadTrips() {
      try {
        const response = await fetch('/api/group-trips');
        if (response.ok) {
          const data = await response.json();
          
          // Преобразуем данные API в формат GroupTripDisplay
          const transformedTrips: GroupTripDisplay[] = data.trips?.map((trip: any) => ({
            tripId: trip.id,
            date: new Date(trip.date),
            timeSlot: trip.timeSlot,
            timeDisplay: getTimeSlotDisplay(trip.timeSlot),
            maxParticipants: trip.maxParticipants,
            minRequired: trip.minRequired || 6,
            pricePerPerson: trip.pricePerPerson || 95,
            currentParticipants: trip.participants?.length || 0,
            spotsRemaining: trip.maxParticipants - (trip.participants?.length || 0),
            status: getDisplayStatus(trip.status, trip.participants?.length || 0, trip.maxParticipants),
            participants: trip.participants?.map((p: any) => ({
              id: p.id,
              name: p.user?.name || 'Участник',
              avatar: p.user?.image || '',
              joinedAt: new Date(p.createdAt),
              isReal: true,
              country: 'PT'
            })) || [],
            socialProof: generateSocialProof(trip.participants?.length || 0, trip.status),
            recentActivity: generateRecentActivity(trip.participants),
            urgencyLevel: getUrgencyLevel(trip.maxParticipants - (trip.participants?.length || 0)),
            meetingPoint: 'Cascais Marina',
            description: trip.description || 'Групповая рыбалка',
            createdAt: new Date(trip.createdAt),
            updatedAt: new Date(trip.updatedAt)
          })) || [];

          setTrips(transformedTrips);
        }
      } catch (error) {
        console.error('Ошибка загрузки поездок:', error);
        // Fallback к демо данным при ошибке
        setTrips(getDemoTrips());
      } finally {
        setLoading(false);
      }
    }

    loadTrips();
  }, []);

  const handleTripJoin = (tripId: string) => {
    console.log('Joining trip:', tripId);
    // В реальности здесь был бы вызов API для присоединения к поездке
  };

  const handleChatOpen = (tripId: string) => {
    setSelectedTripId(tripId);
    if (!isOpen) {
      toggleChat();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Waves className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Встроенный чат для групповых поездок
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Демонстрация системы чата Stream Chat для координации участников рыболовных туров
          </p>
        </motion.div>

        {/* Предупреждение о настройке */}
        <Alert className="mb-8 max-w-4xl mx-auto">
          <MessageCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Настройка для работы чата:</strong> Для полной функциональности требуется настройка Stream Chat credentials в переменных окружения:
            <code className="block mt-2 text-xs bg-gray-100 p-2 rounded">
              NEXT_PUBLIC_STREAM_API_KEY="your_stream_api_key"<br/>
              STREAM_SECRET_KEY="your_stream_secret_key"
            </code>
          </AlertDescription>
        </Alert>

        {/* Статистика */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto"
        >
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-lg">Участники</h3>
              <p className="text-3xl font-bold text-blue-600">
                {trips.reduce((sum, trip) => sum + trip.currentParticipants, 0)}
              </p>
              <p className="text-sm text-gray-600">В активных поездках</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-lg">Чат-каналы</h3>
              <p className="text-3xl font-bold text-green-600">
                {trips.filter(trip => trip.status === 'confirmed').length}
              </p>
              <p className="text-sm text-gray-600">Активных чатов</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Fish className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h3 className="font-semibold text-lg">Поездки</h3>
              <p className="text-3xl font-bold text-orange-600">{trips.length}</p>
              <p className="text-sm text-gray-600">Доступно сегодня</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Список поездок с чатом */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-blue-600" />
            Активные групповые поездки
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600">Загрузка групповых поездок...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {trips.map((trip, index) => (
                <motion.div
                  key={trip.tripId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <GroupTripCardWithChat
                    trip={trip}
                    onJoinRequest={handleTripJoin}
                    onChatOpen={handleChatOpen}
                    showChatButton={true}
                    className="h-full"
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Инструкции */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="h-5 w-5 mr-2" />
              Как использовать чат
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">✅ Для подтвержденных поездок:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Кнопка чата доступна на карточке</li>
                  <li>• Автоматическое создание группового канала</li>
                  <li>• Координация встречи и деталей</li>
                  <li>• Обмен контактами между участниками</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-orange-600 mb-2">⏳ Для формирующихся поездок:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Чат станет доступен после подтверждения</li>
                  <li>• Минимум 6 участников для активации</li>
                  <li>• Уведомления при достижении лимита</li>
                  <li>• Автоматический переход в групповой чат</li>
                </ul>
              </div>
            </div>

            <Separator />

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">🎣 Функции группового чата:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <ul className="text-blue-700 space-y-1">
                  <li>• Обмен сообщениями в реальном времени</li>
                  <li>• Отправка фотографий и документов</li>
                  <li>• Реакции и ответы на сообщения</li>
                  <li>• Индикаторы набора текста</li>
                </ul>
                <ul className="text-blue-700 space-y-1">
                  <li>• Информация о капитане и маршруте</li>
                  <li>• Погодные условия и советы</li>
                  <li>• Координация транспорта</li>
                  <li>• Отчеты о улове (после поездки)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Chat Button */}
      {!isOpen && (
        <ChatToggleButton 
          onClick={toggleChat}
          unreadCount={unreadCount}
        />
      )}

      {/* Chat System */}
      <TripChatSystem
        tripId={selectedTripId || undefined}
        isOpen={isOpen}
        onToggle={toggleChat}
      />
    </div>
  );
}
