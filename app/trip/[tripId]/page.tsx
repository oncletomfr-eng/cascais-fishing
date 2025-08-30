/**
 * Страница детального просмотра групповой рыболовной поездки
 * Включает интегрированный чат (Фаза 3) и всю информацию о поездке
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { TripChatSystem } from '@/components/chat/TripChatSystem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorDisplay } from '@/components/ui/error-display';
import { DEFAULT_FISHING_FEATURES } from '@/lib/types/chat';
import type { GroupTripDisplay } from '@/lib/types/group-events';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Euro, 
  MessageCircle,
  Phone,
  Mail,
  Star,
  Fish,
  Waves,
  Sun,
  ArrowLeft
} from 'lucide-react';

interface TripParticipant {
  id: string;
  name: string;
  image?: string;
  joinedAt: Date;
  experience?: string;
}

interface TripDetails extends GroupTripDisplay {
  participants: TripParticipant[];
  captain: {
    id: string;
    name: string;
    image?: string;
    phone?: string;
    email?: string;
    rating?: number;
    experience?: string;
  };
  weather?: {
    temperature: number;
    windSpeed: number;
    conditions: string;
    isFavorable: boolean;
  };
  equipment?: string[];
  meetingInstructions?: string;
  cancellationPolicy?: string;
}

export default function TripDetailPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const tripId = params?.tripId as string;

  const [showChat, setShowChat] = React.useState(false);

  // Получение детальной информации о поездке
  const { 
    data: trip, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['trip-details', tripId],
    queryFn: async (): Promise<TripDetails> => {
      const response = await fetch(`/api/group-trips/${tripId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trip details');
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch trip details');
      }
      return data.data;
    },
    enabled: !!tripId,
    staleTime: 2 * 60 * 1000, // 2 минуты
    retry: 3,
    refetchOnWindowFocus: true
  });

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка сессии..." />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <ErrorDisplay
            title="Требуется авторизация"
            message="Для просмотра деталей поездки необходимо войти в систему"
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Загрузка информации о поездке..." />
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <ErrorDisplay
            title="Поездка не найдена"
            message="Не удалось загрузить информацию о поездке"
            showRetry
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  const isParticipant = trip.participants.some(p => p.id === session.user.id);
  const isCaptain = trip.captain.id === session.user.id;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Назад</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              🎣 Групповая рыбалка #{tripId.slice(-8)}
            </h1>
            <div className="flex items-center space-x-2">
              <Badge variant={trip.status === 'confirmed' ? 'success' : 'secondary'}>
                {trip.status === 'confirmed' ? 'Подтверждена' : 'Формируется'}
              </Badge>
              {trip.urgencyLevel === 'high' && (
                <Badge variant="destructive">Срочно</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Левая колонка - Информация о поездке */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Основная информация */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Информация о поездке</span>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{trip.currentParticipants}/{trip.maxParticipants}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{trip.date.toLocaleDateString('ru-RU', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</p>
                      <p className="text-sm text-gray-500">Дата поездки</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{trip.timeDisplay}</p>
                      <p className="text-sm text-gray-500">Время отправления</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">{trip.meetingPoint}</p>
                      <p className="text-sm text-gray-500">Место встречи</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Euro className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">€{trip.pricePerPerson}</p>
                      <p className="text-sm text-gray-500">За человека</p>
                    </div>
                  </div>
                </div>

                {/* Инструкции встречи */}
                {trip.meetingInstructions && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">📋 Инструкции встречи</h4>
                    <p className="text-blue-700 text-sm">{trip.meetingInstructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Информация о капитане */}
            <Card>
              <CardHeader>
                <CardTitle>👨‍✈️ Капитан</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <img 
                    src={trip.captain.image || '/api/placeholder/60/60'} 
                    alt={trip.captain.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{trip.captain.name}</h3>
                    <p className="text-gray-600">{trip.captain.experience}</p>
                    
                    {trip.captain.rating && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm font-medium">{trip.captain.rating}</span>
                        <span className="text-sm text-gray-500">рейтинг</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-4 mt-3">
                      {trip.captain.phone && (
                        <Button variant="outline" size="sm" className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>Позвонить</span>
                        </Button>
                      )}
                      {trip.captain.email && (
                        <Button variant="outline" size="sm" className="flex items-center space-x-2">
                          <Mail className="w-4 h-4" />
                          <span>Написать</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Участники */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>👥 Участники ({trip.currentParticipants}/{trip.maxParticipants})</span>
                  <div className="text-sm text-gray-500">
                    {trip.spotsRemaining} мест свободно
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {trip.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <img 
                        src={participant.image || '/api/placeholder/40/40'}
                        alt={participant.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium">{participant.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{participant.experience}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Пустые места */}
                  {Array.from({ length: trip.spotsRemaining }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-gray-500">Свободное место</p>
                        <p className="text-xs text-gray-400">Ожидает участника</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка */}
          <div className="space-y-6">
            
            {/* Действия */}
            <Card>
              <CardHeader>
                <CardTitle>⚡ Действия</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isParticipant && !isCaptain && (
                  <Button className="w-full" size="lg">
                    Присоединиться к поездке
                  </Button>
                )}
                
                {(isParticipant || isCaptain) && (
                  <Button 
                    variant="outline" 
                    className="w-full flex items-center justify-center space-x-2"
                    onClick={() => setShowChat(!showChat)}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{showChat ? 'Скрыть чат' : 'Открыть чат'}</span>
                  </Button>
                )}
                
                <Button variant="outline" className="w-full">
                  Поделиться поездкой
                </Button>
              </CardContent>
            </Card>

            {/* Погода */}
            {trip.weather && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {trip.weather.isFavorable ? <Sun className="w-5 h-5 text-yellow-500" /> : <Waves className="w-5 h-5 text-blue-500" />}
                    <span>Прогноз погоды</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Температура:</span>
                    <span className="font-medium">{trip.weather.temperature}°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Ветер:</span>
                    <span className="font-medium">{trip.weather.windSpeed} м/с</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Условия:</span>
                    <span className="font-medium">{trip.weather.conditions}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${trip.weather.isFavorable ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                    <span className="text-sm">{trip.weather.isFavorable ? 'Благоприятные условия' : 'Условия средние'}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Снаряжение */}
            {trip.equipment && (
              <Card>
                <CardHeader>
                  <CardTitle>⚙️ Снаряжение включено</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {trip.equipment.map((item, index) => (
                      <li key={index} className="flex items-center space-x-2 text-sm">
                        <span className="text-green-600">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Политика отмены */}
            {trip.cancellationPolicy && (
              <Card>
                <CardHeader>
                  <CardTitle>📄 Условия отмены</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{trip.cancellationPolicy}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Чат система (показывается только участникам и капитану) */}
        {showChat && (isParticipant || isCaptain) && (
          <div className="mt-8">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5" />
                    <span>Чат поездки</span>
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowChat(false)}
                  >
                    ✕
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full pb-0">
                <div className="h-full bg-white rounded-lg overflow-hidden">
                  <TripChatSystem
                    tripId={tripId}
                    userId={session.user.id!}
                    userToken="demo-token"
                    userName={session.user.name || undefined}
                    userImage={session.user.image || undefined}
                    features={DEFAULT_FISHING_FEATURES}
                    className="h-full"
                    onChannelReady={(channel) => {
                      console.log('✅ Trip chat ready:', channel.id);
                    }}
                    onError={(error) => {
                      console.error('❌ Trip chat error:', error);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
