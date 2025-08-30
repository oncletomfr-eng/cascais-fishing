'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  MapPin, 
  Waves, 
  Filter,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Sparkles,
  Fish,
  Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useGroupTripsWebSocket } from '@/lib/hooks/useGroupTripsWebSocket';
import { getWebSocketConfig } from '@/lib/config/websocket';
import { useConfetti } from '@/lib/hooks/useConfetti';
import { useWeather } from '@/lib/hooks/useWeather';
import WeatherBadge from '@/components/weather/WeatherBadge';
import { WeatherLocation } from '@/lib/types/weather';
import {
  GroupTripDisplay,
  TripFilters,
  TripSortBy,
  TripsFeedProps,
  ParticipantDisplay
} from '@/lib/types/group-events';
import { formatDistanceToNow, format } from 'date-fns';

// Главный компонент ленты событий
export function TripsFeedComponent({
  trips: initialTrips = [],
  filters = {
    experience: 'any',
    timeSlot: 'any',
    status: 'any',
    spotsLeft: 10
  },
  sortBy = 'chronological',
  onTripSelect,
  realTimeUpdates = true,
  showWeatherInfo = true,
  enableSocialProof = true,
  className
}: TripsFeedProps) {
  const [trips, setTrips] = useState<GroupTripDisplay[]>(initialTrips);
  const [filteredTrips, setFilteredTrips] = useState<GroupTripDisplay[]>(initialTrips);
  const [activeFilters, setActiveFilters] = useState<TripFilters>(filters);
  const [showFilters, setShowFilters] = useState(false);
  const { fireCelebration } = useConfetti();
  
  // WebSocket для реал-тайм обновлений
  const wsConfig = getWebSocketConfig();
  const { 
    connectionStatus, 
    lastUpdate, 
    subscribe, 
    unsubscribe,
    error 
  } = useGroupTripsWebSocket({
    url: wsConfig.wsUrl,
    enabled: realTimeUpdates
  });

  // Подписка на обновления поездок
  useEffect(() => {
    if (realTimeUpdates && trips.length > 0) {
      const tripIds = trips.map(trip => trip.tripId);
      subscribe(tripIds);

      return () => {
        unsubscribe(tripIds);
      };
    }
  }, [trips, realTimeUpdates, subscribe, unsubscribe]);

  // Обновление поездок при получении WebSocket сообщений
  useEffect(() => {
    if (lastUpdate && realTimeUpdates) {
      setTrips(prevTrips => 
        prevTrips.map(trip => {
          if (trip.tripId === lastUpdate.tripId) {
            // Проверяем, стала ли поездка подтвержденной
            const wasNotConfirmed = trip.status !== 'confirmed';
            const isNowConfirmed = lastUpdate.status === 'confirmed';
            
            // Запускаем конфетти если статус изменился на confirmed
            if (wasNotConfirmed && isNowConfirmed) {
              // Запускаем celebration анимацию с небольшой задержкой
              setTimeout(() => {
                fireCelebration();
              }, 300);
            }
            
            return { 
              ...trip, 
              currentParticipants: lastUpdate.currentParticipants,
              spotsRemaining: lastUpdate.spotsRemaining,
              status: lastUpdate.status,
              updatedAt: lastUpdate.timestamp
            };
          }
          return trip;
        })
      );
    }
  }, [lastUpdate, realTimeUpdates, fireCelebration]);

  // Фильтрация и сортировка поездок
  const processedTrips = useMemo(() => {
    let filtered = trips.filter(trip => {
      // Фильтр по опыту (skill level)
      if (activeFilters.experience !== 'any') {
        const skillMatch = 
          (activeFilters.experience === 'beginner' && trip.skillLevel === 'BEGINNER') ||
          (activeFilters.experience === 'intermediate' && trip.skillLevel === 'INTERMEDIATE') ||
          (activeFilters.experience === 'advanced' && trip.skillLevel === 'ADVANCED') ||
          (activeFilters.experience === 'expert' && trip.skillLevel === 'EXPERT') ||
          trip.skillLevel === 'ANY';
        if (!skillMatch) return false;
      }
      
      // Фильтр по времени
      if (activeFilters.timeSlot !== 'any') {
        const isMatch = 
          (activeFilters.timeSlot === 'morning' && trip.timeSlot === 'MORNING_9AM') ||
          (activeFilters.timeSlot === 'afternoon' && trip.timeSlot === 'AFTERNOON_2PM');
        if (!isMatch) return false;
      }
      
      // Фильтр по статусу
      if (activeFilters.status !== 'any' && trip.status !== activeFilters.status) {
        return false;
      }
      
      // 🎣 NEW FISHING EVENT FILTERS
      // Фильтр по типу события
      if (activeFilters.eventType && activeFilters.eventType !== 'any') {
        if (trip.eventType.toLowerCase() !== activeFilters.eventType) {
          return false;
        }
      }
      
      // Фильтр по целевым видам рыб
      if (activeFilters.targetSpecies && activeFilters.targetSpecies.length > 0) {
        const hasMatchingSpecies = activeFilters.targetSpecies.some(species => 
          trip.targetSpecies?.includes(species.toUpperCase())
        );
        if (!hasMatchingSpecies) return false;
      }
      
      // Фильтр по техникам рыбалки
      if (activeFilters.fishingTechniques && activeFilters.fishingTechniques.length > 0) {
        const hasMatchingTechnique = activeFilters.fishingTechniques.some(technique => 
          trip.fishingTechniques?.includes(technique.toUpperCase())
        );
        if (!hasMatchingTechnique) return false;
      }
      
      // Фильтр по социальному режиму
      if (activeFilters.socialMode && activeFilters.socialMode !== 'any') {
        if (trip.socialMode?.toLowerCase() !== activeFilters.socialMode) {
          return false;
        }
      }
      
      // Фильтр по снаряжению
      if (activeFilters.equipment && activeFilters.equipment !== 'any') {
        if (trip.equipment?.toLowerCase() !== activeFilters.equipment) {
          return false;
        }
      }
      
      // Фильтр по сложности
      if (activeFilters.difficultyRange) {
        if (trip.difficultyRating < activeFilters.difficultyRange.min || 
            trip.difficultyRating > activeFilters.difficultyRange.max) {
          return false;
        }
      }
      
      // Фильтр по погодной зависимости
      if (activeFilters.weatherDependency !== undefined) {
        if (trip.weatherDependency !== activeFilters.weatherDependency) {
          return false;
        }
      }
      
      // Фильтр по цене
      if (activeFilters.priceRange) {
        if (trip.pricePerPerson < activeFilters.priceRange.min || 
            trip.pricePerPerson > activeFilters.priceRange.max) {
          return false;
        }
      }
      
      // Фильтр по доступным местам
      if (trip.spotsRemaining > activeFilters.spotsLeft) {
        return false;
      }
      
      return true;
    });
    
    // Сортировка
    switch (sortBy) {
      case 'chronological':
        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      case 'popularity':
        return filtered.sort((a, b) => b.currentParticipants - a.currentParticipants);
      
      case 'almost_full':
        return filtered.sort((a, b) => a.spotsRemaining - b.spotsRemaining);
      
      case 'urgency_desc':
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return filtered.sort((a, b) => urgencyOrder[b.urgencyLevel] - urgencyOrder[a.urgencyLevel]);
      
      default:
        return filtered;
    }
  }, [trips, activeFilters, sortBy]);

  // Обновление отфильтрованных поездок
  useEffect(() => {
    setFilteredTrips(processedTrips);
  }, [processedTrips]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок с реал-тайм индикатором */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="flex items-center space-x-2">
            <Waves className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              Групповые поездки
            </h2>
          </div>
          
          {realTimeUpdates && (
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              )}>
                {connectionStatus === 'connected' && (
                  <motion.div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  />
                )}
              </div>
              <span className="text-xs sm:text-sm text-gray-500 capitalize hidden sm:inline">
                {connectionStatus}
              </span>
            </div>
          )}
      </div>

        {/* Кнопка фильтров */}
            <Button 
              variant="outline" 
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 w-full sm:w-auto"
          size="sm"
            >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Фильтры</span>
          <span className="sm:hidden">Фильтры</span>
          {showFilters && <span className="ml-1">✕</span>}
            </Button>
      </div>

      {/* Быстрая статистика */}
      <QuickStats trips={filteredTrips} />

      {/* Панель фильтров */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-lg p-4"
          >
            <FiltersPanel 
              filters={activeFilters}
              onFiltersChange={setActiveFilters}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Лента поездок */}
      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredTrips.map((trip, index) => (
              <motion.div
                key={trip.tripId}
              layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
                transition={{ 
                duration: 0.3,
                  delay: index * 0.1,
                layout: { duration: 0.3 }
                }}
              >
              <EnhancedGroupTripCard
                  trip={trip}
                onJoinRequest={() => onTripSelect(trip)}
                showWeather={showWeatherInfo}
                  showParticipants={enableSocialProof}
                />
              </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Пустое состояние */}
      {filteredTrips.length === 0 && (
        <EmptyState 
          hasFilters={Object.values(activeFilters).some(v => v !== 'any' && v !== 10)} 
          onClearFilters={() => setActiveFilters({
            experience: 'any',
            timeSlot: 'any', 
            status: 'any',
            spotsLeft: 10
          })}
        />
      )}

      {/* Ошибка WebSocket */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span className="text-red-800">
              Проблема с подключением: {error.message}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Компонент быстрой статистики
function QuickStats({ trips }: { trips: GroupTripDisplay[] }) {
  const stats = useMemo(() => ({
    total: trips.length,
    confirmed: trips.filter(t => t.status === 'confirmed').length,
    almostFull: trips.filter(t => t.status === 'almost_full').length,
    totalParticipants: trips.reduce((sum, t) => sum + t.currentParticipants, 0)
  }), [trips]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={Calendar}
        label="Всего поездок"
        value={stats.total}
        color="blue"
      />
      <StatCard
        icon={Trophy}
        label="Подтверждено"
        value={stats.confirmed}
        color="green"
      />
      <StatCard
        icon={AlertTriangle}
        label="Почти заполнены"
        value={stats.almostFull}
        color="orange"
      />
      <StatCard
        icon={Users}
        label="Участников"
        value={stats.totalParticipants}
        color="purple"
      />
    </div>
  );
}

// Компонент карточки статистики
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color: string; 
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center space-x-3">
        <div className={cn(
          "p-2 rounded-lg",
          color === 'blue' && "bg-blue-100 text-blue-600",
          color === 'green' && "bg-green-100 text-green-600", 
          color === 'orange' && "bg-orange-100 text-orange-600",
          color === 'purple' && "bg-purple-100 text-purple-600"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </div>
    </Card>
  );
}

// 🎣 Enhanced FiltersPanel with FishingEvent support
function FiltersPanel({ 
  filters, 
  onFiltersChange 
}: { 
  filters: TripFilters;
  onFiltersChange: (filters: TripFilters) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Row 1: Basic filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Фильтр опыта */}
        <div>
          <label className="block text-sm font-medium mb-2">Уровень навыков</label>
          <select
            value={filters.experience}
            onChange={(e) => onFiltersChange({
              ...filters,
              experience: e.target.value as any
            })}
            className="w-full p-2 border rounded-md"
          >
            <option value="any">Любой</option>
            <option value="beginner">Новичок</option>
            <option value="intermediate">Средний</option>
            <option value="advanced">Продвинутый</option>
            <option value="expert">Эксперт</option>
          </select>
        </div>

        {/* Фильтр времени */}
        <div>
          <label className="block text-sm font-medium mb-2">Время</label>
          <select
            value={filters.timeSlot}
            onChange={(e) => onFiltersChange({
              ...filters,
              timeSlot: e.target.value as any
            })}
            className="w-full p-2 border rounded-md"
          >
            <option value="any">Любое</option>
            <option value="morning">Утром</option>
            <option value="afternoon">После обеда</option>
          </select>
        </div>
        
        {/* Фильтр статуса */}
        <div>
          <label className="block text-sm font-medium mb-2">Статус</label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({
              ...filters,
              status: e.target.value as any
            })}
            className="w-full p-2 border rounded-md"
          >
            <option value="any">Любой</option>
            <option value="forming">Набор</option>
            <option value="almost_full">Почти заполнено</option>
            <option value="confirmed">Подтверждено</option>
          </select>
        </div>
        
        {/* Фильтр свободных мест */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Мест доступно: {filters.spotsLeft}
          </label>
          <input
            type="range"
            min="1"
            max="8"
            value={filters.spotsLeft}
            onChange={(e) => onFiltersChange({
              ...filters,
              spotsLeft: Number(e.target.value)
            })}
            className="w-full"
          />
        </div>
      </div>

      {/* Row 2: 🎣 Fishing Event Filters */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
          <Fish className="h-4 w-4" />
          Фильтры рыбалки
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Тип события */}
          <div>
            <label className="block text-sm font-medium mb-2">Тип события</label>
            <select
              value={filters.eventType || 'any'}
              onChange={(e) => onFiltersChange({
                ...filters,
                eventType: e.target.value === 'any' ? undefined : e.target.value as any
              })}
              className="w-full p-2 border rounded-md"
            >
              <option value="any">Любой</option>
              <option value="commercial">Коммерческая</option>
              <option value="tournament">Турнир</option>
              <option value="learning">Обучение</option>
              <option value="community">Сообщество</option>
            </select>
          </div>
          
          {/* Социальный режим */}
          <div>
            <label className="block text-sm font-medium mb-2">Формат</label>
            <select
              value={filters.socialMode || 'any'}
              onChange={(e) => onFiltersChange({
                ...filters,
                socialMode: e.target.value === 'any' ? undefined : e.target.value as any
              })}
              className="w-full p-2 border rounded-md"
            >
              <option value="any">Любой</option>
              <option value="competitive">Соревновательный</option>
              <option value="collaborative">Совместный</option>
              <option value="educational">Обучающий</option>
              <option value="recreational">Отдых</option>
              <option value="family">Семейный</option>
            </select>
          </div>
          
          {/* Снаряжение */}
          <div>
            <label className="block text-sm font-medium mb-2">Снаряжение</label>
            <select
              value={filters.equipment || 'any'}
              onChange={(e) => onFiltersChange({
                ...filters,
                equipment: e.target.value === 'any' ? undefined : e.target.value as any
              })}
              className="w-full p-2 border rounded-md"
            >
              <option value="any">Любое</option>
              <option value="provided">Предоставляется</option>
              <option value="bring_own">Свое</option>
              <option value="rental_available">Есть аренда</option>
              <option value="partially_provided">Частично</option>
            </select>
          </div>
        </div>
      </div>

      {/* Row 3: Advanced Filters */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Сложность */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Сложность: {filters.difficultyRange?.min || 1} - {filters.difficultyRange?.max || 5}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="1"
                max="5"
                value={filters.difficultyRange?.min || 1}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  difficultyRange: {
                    min: Number(e.target.value),
                    max: filters.difficultyRange?.max || 5
                  }
                })}
                className="flex-1"
              />
              <input
                type="range"
                min="1"
                max="5"
                value={filters.difficultyRange?.max || 5}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  difficultyRange: {
                    min: filters.difficultyRange?.min || 1,
                    max: Number(e.target.value)
                  }
                })}
                className="flex-1"
              />
            </div>
          </div>
          
          {/* Погодная зависимость */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="weatherDependency"
              checked={filters.weatherDependency === true}
              onChange={(e) => onFiltersChange({
                ...filters,
                weatherDependency: e.target.checked ? true : undefined
              })}
              className="rounded"
            />
            <label htmlFor="weatherDependency" className="text-sm">
              Только независимые от погоды
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

// Усовершенствованная карточка поездки с социальными триггерами
function EnhancedGroupTripCard({ 
  trip, 
  onJoinRequest,
  showWeather = true,
  showParticipants = true
}: {
  trip: GroupTripDisplay;
  onJoinRequest: () => void;
  showWeather?: boolean;
  showParticipants?: boolean;
}) {
  const progressPercent = (trip.currentParticipants / trip.maxParticipants) * 100;
  const isUrgent = trip.urgencyLevel === 'high' || trip.urgencyLevel === 'critical';
  const isAlmostFull = trip.spotsRemaining <= 2;

  // Weather integration for the trip location
  const tripLocation: WeatherLocation = {
    latitude: 38.7223, // Cascais coordinates (default)
    longitude: -9.1393,
    name: trip.meetingPoint || 'Cascais Marina'
  };

  const { weatherData, fishingConditions } = useWeather({
    location: tripLocation,
    enableMarine: true,
    enableFishingAssessment: true,
    autoRefresh: false // Don't auto-refresh to avoid too many requests
  });

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
      isUrgent && "ring-2 ring-orange-400",
      trip.status === 'confirmed' && "ring-2 ring-green-400"
    )}>
      {/* Индикатор срочности */}
      {isUrgent && (
        <motion.div
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="absolute top-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 text-xs font-semibold"
        >
          <div className="flex items-center space-x-1">
            <Sparkles className="h-3 w-3" />
            <span>Срочно!</span>
          </div>
        </motion.div>
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Fish className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {trip.timeDisplay}
              </span>
            </div>
            <h3 className="font-semibold text-lg">
              {format(trip.date, 'dd MMM yyyy')}
            </h3>
          </div>
          
          <StatusBadge status={trip.status} />
        </div>
        
        {/* Прогресс-бар заполнения */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {trip.currentParticipants} из {trip.maxParticipants} участников
            </span>
            <span className={cn(
              "font-medium",
              isAlmostFull ? "text-orange-600" : "text-green-600"
            )}>
              {trip.spotsRemaining} мест
            </span>
      </div>
      
          <Progress 
            value={progressPercent} 
            className={cn(
              "h-2",
              isAlmostFull && "progress-urgent"
            )}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Участники (аватары) */}
        {showParticipants && trip.participants.length > 0 && (
          <ParticipantAvatars participants={trip.participants} />
        )}

        {/* Социальное подтверждение */}
        {trip.socialProof && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {trip.socialProof}
              </span>
            </div>
          </motion.div>
        )}

        {/* Последняя активность */}
        {trip.recentActivity && (
          <div className="text-xs text-gray-500">
            <Clock className="inline h-3 w-3 mr-1" />
            {trip.recentActivity}
                </div>
        )}

        {/* Информация о встрече */}
        {trip.meetingPoint && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="h-4 w-4 mr-2" />
            {trip.meetingPoint}
                </div>
        )}

        {/* Погодная информация */}
        {showWeather && weatherData && (
          <div className="border-t pt-3">
            <WeatherBadge
              weather={weatherData.current}
              marine={weatherData.marine}
              fishingConditions={fishingConditions}
              variant="compact"
              showTooltip={true}
              className="justify-start"
            />
          </div>
        )}
                
        {/* Цена и кнопка */}
        <div className="flex items-center justify-between pt-2">
                <div>
            <span className="text-2xl font-bold text-blue-600">
              €{trip.pricePerPerson}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              за участника
            </span>
                </div>
                
          <Button
            onClick={onJoinRequest}
            disabled={trip.status === 'confirmed' && trip.spotsRemaining === 0}
            className={cn(
              "transition-all duration-200",
              isUrgent && "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
              trip.status === 'confirmed' && "bg-green-600 hover:bg-green-700"
            )}
          >
            {trip.status === 'confirmed' ? 'Подтверждено' : 'Присоединиться'}
          </Button>
                </div>
      </CardContent>

      {/* Анимация пульсации для срочных поездок */}
      {isUrgent && (
        <motion.div
          className="absolute inset-0 bg-orange-400/10 pointer-events-none"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
            </Card>
  );
}

// Компонент аватаров участников
function ParticipantAvatars({ 
  participants 
}: { 
  participants: ParticipantDisplay[] 
}) {
  const visibleParticipants = participants.slice(0, 4);
  const hiddenCount = Math.max(0, participants.length - 4);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        <AnimatePresence>
          {visibleParticipants.map((participant, index) => (
    <motion.div 
              key={participant.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarImage src={participant.avatar} />
                <AvatarFallback className="text-xs">
                  {participant.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
    </motion.div>
          ))}
        </AnimatePresence>
        
        {hiddenCount > 0 && (
          <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-xs text-gray-600">+{hiddenCount}</span>
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-600">
        {participants.length} участник{participants.length !== 1 ? 'ов' : ''}
      </div>
    </div>
  );
}

// Компонент значка статуса
function StatusBadge({ status }: { status: string }) {
  const config = {
    'forming': { label: 'Набор', color: 'blue' },
    'almost_full': { label: 'Почти заполнено', color: 'orange' },
    'confirmed': { label: 'Подтверждено', color: 'green' },
    'cancelled': { label: 'Отменено', color: 'red' }
  };

  const { label, color } = config[status as keyof typeof config] || config.forming;
  
  return (
    <Badge variant={color === 'green' ? 'default' : 'secondary'} className={cn(
      color === 'blue' && "bg-blue-100 text-blue-800",
      color === 'orange' && "bg-orange-100 text-orange-800", 
      color === 'green' && "bg-green-100 text-green-800",
      color === 'red' && "bg-red-100 text-red-800"
    )}>
      {label}
    </Badge>
  );
}

// Компонент пустого состояния
function EmptyState({ 
  hasFilters, 
  onClearFilters 
}: { 
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Fish className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {hasFilters ? 'Нет поездок по заданным фильтрам' : 'Нет активных поездок'}
      </h3>
      <p className="text-gray-600 mb-4">
        {hasFilters 
          ? 'Попробуйте изменить фильтры для поиска подходящих поездок' 
          : 'Скоро появятся новые групповые поездки'
        }
      </p>
      {hasFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Сбросить фильтры
        </Button>
      )}
    </div>
  );
}