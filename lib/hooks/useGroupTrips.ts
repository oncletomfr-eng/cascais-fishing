'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GroupTripDisplay,
  GroupTripStats,
  TripFilters,
  TripSortBy,
  UseGroupTripsReturn,
} from '@/lib/types/group-events';

// API Response Interface
interface GroupTripsAPIResponse {
  success: boolean;
  data: {
    trips: any[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  error?: string;
}

// API функция для получения групповых поездок
async function fetchGroupTrips(
  filters?: TripFilters,
  sortBy?: TripSortBy,
  limit?: number,
  offset?: number
): Promise<GroupTripsAPIResponse> {
  const params = new URLSearchParams();
  
  if (limit) params.append('limit', limit.toString());
  if (offset) params.append('offset', offset.toString());
  if (sortBy) params.append('sort', sortBy);
  
  // Добавляем базовые фильтры
  if (filters?.timeSlot && filters.timeSlot !== 'any') params.append('timeSlot', filters.timeSlot);
  if (filters?.status && filters.status !== 'any') params.append('status', filters.status);
  if (filters?.experience && filters.experience !== 'any') params.append('experience', filters.experience);
  if (filters?.dateRange) {
    params.append('startDate', filters.dateRange.start.toISOString());
    params.append('endDate', filters.dateRange.end.toISOString());
  }
  
  // 🎣 NEW FISHING EVENT FILTERS
  if (filters?.eventType && filters.eventType !== 'any') params.append('eventType', filters.eventType);
  if (filters?.socialMode && filters.socialMode !== 'any') params.append('socialMode', filters.socialMode);
  if (filters?.equipment && filters.equipment !== 'any') params.append('equipment', filters.equipment);
  if (filters?.weatherDependency && filters.weatherDependency !== 'any') {
    params.append('weatherDependency', filters.weatherDependency.toString());
  }
  
  // Array filters
  if (filters?.targetSpecies && filters.targetSpecies.length > 0) {
    params.append('targetSpecies', filters.targetSpecies.join(','));
  }
  if (filters?.fishingTechniques && filters.fishingTechniques.length > 0) {
    params.append('fishingTechniques', filters.fishingTechniques.join(','));
  }
  
  // Range filters
  if (filters?.difficultyRange) {
    params.append('difficultyMin', filters.difficultyRange.min.toString());
    params.append('difficultyMax', filters.difficultyRange.max.toString());
  }
  if (filters?.priceRange) {
    params.append('priceMin', filters.priceRange.min.toString());
    params.append('priceMax', filters.priceRange.max.toString());
  }

  const url = `/api/group-trips${params.toString() ? `?${params.toString()}` : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Реальный хук для работы с групповыми поездками через TanStack Query
 * Заменяет mockGroupTrips.ts на реальные API calls
 */
export function useGroupTrips(
  initialFilters?: TripFilters,
  initialSort: TripSortBy = 'chronological',
  limit: number = 20
): UseGroupTripsReturn {
  const queryClient = useQueryClient();
  // Локальное состояние для фильтров и сортировки
  const [filters, setFilters] = useState<TripFilters>(initialFilters || {
    experience: 'any',
    timeSlot: 'any',
    status: 'any',
    spotsLeft: 0,
  });
  const [sortBy, setSortBy] = useState<TripSortBy>(initialSort);
  const [offset, setOffset] = useState<number>(0);
  const allTripsRef = useRef<GroupTripDisplay[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Основной query для получения данных
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['group-trips', filters, sortBy, limit, offset],
    queryFn: () => fetchGroupTrips(filters, sortBy, limit, offset),
    staleTime: 30 * 1000, // 30 секунд - более агрессивное обновление
    refetchInterval: 2 * 60 * 1000, // Автообновление каждые 2 минуты
    refetchOnWindowFocus: true, // Обновлять при фокусе окна
    refetchOnReconnect: true, // Обновлять при подключении
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Извлекаем и преобразуем данные из ответа API
  const trips = useMemo(() => {
    if (!data?.success || !data.data?.trips) return offset === 0 ? [] : allTripsRef.current;
    
    // Преобразуем данные из API в ожидаемый формат GroupTripDisplay
    const newTrips = data.data.trips.map((trip: any): GroupTripDisplay => {
      const now = new Date();
      const tripDate = new Date(trip.date);
      const daysUntilTrip = Math.ceil((tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Преобразуем timeSlot из API формата в ожидаемый формат
      let timeSlot: 'MORNING_9AM' | 'AFTERNOON_2PM' = 'MORNING_9AM';
      if (trip.timeSlot === 'AFTERNOON_2PM' || trip.timeSlot === 'afternoon') {
        timeSlot = 'AFTERNOON_2PM';
      }
      
      // Рассчитываем прогресс
      const progress = trip.maxParticipants > 0 ? Math.round((trip.currentParticipants / trip.maxParticipants) * 100) : 0;
      
      // Определяем urgency level
      let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
      if (daysUntilTrip <= 1) urgencyLevel = 'high';
      else if (daysUntilTrip <= 3) urgencyLevel = 'medium';
      
      // Определяем статус
      let status: 'forming' | 'almost_full' | 'confirmed' = 'forming';
      if (progress >= 90) status = 'confirmed';
      else if (progress >= 70) status = 'almost_full';
      
      // Преобразуем участников в аватары
      const participantAvatars = (trip.participants || []).map((participant: any, index: number) => ({
        id: participant.id || `participant-${index}`,
        initials: participant.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'UN',
        joinedAt: new Date(participant.joinedAt || participant.createdAt || trip.createdAt),
        participantCount: participant.participantCount || 1,
        countryCode: participant.countryCode,
      }));
      
      return {
        tripId: trip.tripId,
        date: tripDate,
        timeSlot,
        timeDisplay: timeSlot === 'MORNING_9AM' ? '09:00' : '14:00',
        
        // Trip Configuration  
        maxParticipants: trip.maxParticipants || 8,
        minRequired: trip.minRequired || 6,
        pricePerPerson: trip.pricePerPerson || 95,
        
        // Current State
        currentParticipants: trip.currentParticipants || 0,
        spotsRemaining: (trip.maxParticipants || 8) - (trip.currentParticipants || 0),
        status,
        
        // Social Elements
        participants: participantAvatars,
        socialProof: trip.socialProof,
        recentActivity: trip.recentActivity,
        urgencyLevel,
        
        // Trip Details
        description: trip.description || 'Групповая рыбалка',
        meetingPoint: trip.meetingPoint || 'Cascais Marina',
        specialNotes: trip.specialNotes,
        
        // 🎣 FISHING EVENT FIELDS
        eventType: trip.eventType || 'COMMERCIAL',
        skillLevel: trip.skillLevel || 'ANY', 
        socialMode: trip.socialMode || 'COLLABORATIVE',
        fishingTechniques: trip.fishingTechniques || [],
        targetSpecies: trip.targetSpecies || [],
        equipment: trip.equipment || 'PROVIDED',
        weatherDependency: trip.weatherDependency ?? true,
        difficultyRating: trip.difficultyRating || 3,
        estimatedFishCatch: trip.estimatedFishCatch,
        maxGroupSize: trip.maxGroupSize,
        departureLocation: trip.departureLocation || trip.meetingPoint || 'Cascais Marina',
        fishingZones: trip.fishingZones || [],
        minimumWeatherScore: trip.minimumWeatherScore || 6,
        recommendedFor: trip.recommendedFor || [],
        approvalMode: trip.approvalMode || 'MANUAL',
        
        // Timestamps
        createdAt: new Date(trip.createdAt),
        updatedAt: new Date(trip.updatedAt),
      };
    });

    // Обновляем состояние accumulated trips для пагинации
    if (offset === 0) {
      // Первая загрузка - заменяем все данные
      allTripsRef.current = newTrips;
      return newTrips;
    } else {
      // Загрузка дополнительных данных - добавляем к существующим
      const updatedTrips = [...allTripsRef.current, ...newTrips];
      allTripsRef.current = updatedTrips;
      return updatedTrips;
    }
  }, [data, offset]);

  const stats = useMemo((): GroupTripStats => {
    if (!data?.success || !data.data?.trips) {
      return {
        totalActiveTrips: 0,
        totalParticipants: 0,
        confirmedTrips: 0,
        formingTrips: 0,
        averageParticipants: 0,
        countriesRepresented: 0,
      };
    }

    const trips = data.data.trips;
    const totalActiveTrips = trips.length;
    const totalParticipants = trips.reduce((sum: number, trip: any) => sum + (trip.currentParticipants || 0), 0);
    const confirmedTrips = trips.filter((trip: any) => {
      const progress = (trip.currentParticipants || 0) / (trip.maxParticipants || 8) * 100;
      return progress >= 90;
    }).length;
    const formingTrips = totalActiveTrips - confirmedTrips;
    const averageParticipants = totalActiveTrips > 0 ? Math.round(totalParticipants / totalActiveTrips) : 0;
    
    // Подсчет стран (заглушка, так как данные могут не содержать информацию о странах)
    const countriesSet = new Set();
    trips.forEach((trip: any) => {
      (trip.participants || []).forEach((participant: any) => {
        if (participant.countryCode) {
          countriesSet.add(participant.countryCode);
        }
      });
    });
    
    return {
      totalActiveTrips,
      totalParticipants,
      confirmedTrips,
      formingTrips,
      averageParticipants,
      countriesRepresented: countriesSet.size || 1, // Минимум 1, так как есть поездки
    };
  }, [data]);

  // Обработчики для фильтров и сортировки
  const handleSetFilters = useCallback((newFilters: Partial<TripFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setOffset(0); // Сбрасываем пагинацию при изменении фильтров
    allTripsRef.current = []; // Очищаем накопленные данные
  }, []);

  const handleSetSort = useCallback((newSort: TripSortBy) => {
    setSortBy(newSort);
    setOffset(0); // Сбрасываем пагинацию при изменении сортировки
    allTripsRef.current = []; // Очищаем накопленные данные
  }, []);

  // Функция обновления данных
  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Функция для загрузки дополнительных данных (пагинация)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !data?.data?.pagination?.hasMore) return;
    
    try {
      setIsLoadingMore(true);
      const newOffset = offset + limit;
      setOffset(newOffset);
      
      console.log(`📄 Загружаем следующую страницу: offset=${newOffset}, limit=${limit}`);
    } catch (error) {
      console.error('❌ Ошибка загрузки дополнительных данных:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, data?.data?.pagination?.hasMore, offset, limit]);

  const hasMore = useMemo(() => {
    return data?.data?.pagination?.hasMore || false;
  }, [data?.data?.pagination?.hasMore]);

  // Функция для инвалидации всех кэшей group-trips
  const invalidateGroupTrips = useCallback(async () => {
    await queryClient.invalidateQueries({ 
      queryKey: ['group-trips'],
      refetchType: 'all' // Принудительно обновить все активные и неактивные запросы
    });
  }, [queryClient]);

  return {
    // Данные
    trips,
    stats,
    
    // Состояние загрузки
    isLoading,
    isError,
    error: error as Error | null,
    isEmpty: trips.length === 0,
    
    // Действия
    refresh,
    loadMore,
    invalidateGroupTrips, // Новая функция для инвалидации кэша
    
    // Фильтры и сортировка
    filters,
    setFilters: handleSetFilters,
    sortBy,
    setSortBy: handleSetSort,
    
    // Пагинация
    hasMore,
    isLoadingMore,
  };
}

export default useGroupTrips;