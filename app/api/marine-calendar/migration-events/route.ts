import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { migrationService } from '@/lib/services/migration-service';
import { prisma } from '@/lib/prisma';
import { FishSpecies } from '@prisma/client';

// Схема валидации параметров запроса
const QuerySchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  latitude: z.string().transform((str) => parseFloat(str)),
  longitude: z.string().transform((str) => parseFloat(str)),
  species: z.string().optional(), // Comma-separated list of species
  eventTypes: z.string().optional(), // arrival,peak,departure
  minProbability: z.string().transform((str) => parseFloat(str)).optional()
});

/**
 * GET /api/marine-calendar/migration-events
 * Получить миграционные события для заданного периода и локации
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Валидация параметров (преобразуем null в undefined для optional полей)
    const params = QuerySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      species: searchParams.get('species') || undefined,
      eventTypes: searchParams.get('eventTypes') || undefined,
      minProbability: searchParams.get('minProbability') || undefined
    });
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const { 
      startDate, 
      endDate, 
      latitude, 
      longitude, 
      species, 
      eventTypes, 
      minProbability 
    } = params.data;
    
    // Проверка диапазона дат (максимум 180 дней)
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 180) {
      return NextResponse.json(
        { error: 'Максимальный период запроса - 180 дней' },
        { status: 400 }
      );
    }
    
    // Создаем объект локации
    const location = {
      name: `Координаты ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
      depths: [10, 20, 30, 50, 80, 120],
      bottomType: 'mixed',
      distanceFromShore: calculateDistanceFromShore(latitude, longitude)
    };
    
    // Парсим целевые виды рыб
    const targetSpecies = species 
      ? species.split(',').map(s => s.trim().toUpperCase() as FishSpecies)
      : undefined;
    
    // Парсим типы событий
    const targetEventTypes = eventTypes
      ? eventTypes.split(',').map(t => t.trim())
      : ['arrival', 'peak', 'departure'];
    
    // Получаем миграционные события из сервиса
    const migrationEvents = await migrationService.getUpcomingMigrationEvents(
      startDate,
      endDate,
      location,
      targetSpecies
    );
    
    // Фильтруем по вероятности и типам событий
    let filteredEvents = migrationEvents.filter(event => {
      const probabilityCheck = minProbability ? event.probability >= minProbability : true;
      const eventTypeCheck = targetEventTypes.includes(event.eventType);
      return probabilityCheck && eventTypeCheck;
    });
    
    // Сортируем по вероятности (убывание) и дате
    filteredEvents = filteredEvents.sort((a, b) => {
      if (b.probability !== a.probability) {
        return b.probability - a.probability;
      }
      return a.date.getTime() - b.date.getTime();
    });
    
    // Получаем дополнительную информацию о видах
    const speciesDetails = await Promise.all(
      [...new Set(filteredEvents.map(e => e.species))].map(async (speciesType) => {
        const pattern = migrationService.getMigrationPattern(speciesType);
        const seasonalAvailability = migrationService.getSeasonalAvailability(speciesType);
        
        // Ищем детали вида в базе данных
        const speciesDetail = await prisma.fishSpeciesDetail.findUnique({
          where: { species: speciesType }
        });
        
        return {
          species: speciesType,
          pattern,
          seasonalAvailability,
          details: speciesDetail ? {
            nameRu: speciesDetail.nameRu,
            nameEn: speciesDetail.nameEn,
            scientificName: speciesDetail.scientificName,
            difficulty: speciesDetail.difficulty,
            gameValue: speciesDetail.gameValue
          } : null
        };
      })
    );
    
    // Группируем события по датам для удобства
    const eventsByDate = groupEventsByDate(filteredEvents);
    
    // Генерируем рекомендации по миграциям
    const recommendations = generateMigrationRecommendations(filteredEvents, location);
    
    // Анализируем миграционные тренды
    const trends = analyzeMigrationTrends(filteredEvents);
    
    return NextResponse.json({
      period: {
        startDate,
        endDate
      },
      location,
      events: filteredEvents,
      eventsByDate,
      speciesDetails,
      recommendations,
      trends,
      metadata: {
        totalEvents: filteredEvents.length,
        uniqueSpecies: [...new Set(filteredEvents.map(e => e.species))].length,
        calculatedAt: new Date(),
        filters: {
          minProbability: minProbability || 0,
          eventTypes: targetEventTypes,
          species: targetSpecies || 'all'
        }
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения миграционных событий:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marine-calendar/migration-events
 * Создать новое миграционное событие или обновить прогноз
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const bodySchema = z.object({
      species: z.nativeEnum(FishSpecies),
      eventType: z.enum(['arrival', 'peak', 'departure']),
      date: z.string().transform((str) => new Date(str)),
      location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        name: z.string().optional()
      }),
      probability: z.number().min(0).max(1).optional(),
      description: z.string().optional(),
      dataSource: z.string().optional(),
      waterTemperature: z.number().optional(),
      depth: z.number().optional()
    });
    
    const params = bodySchema.safeParse(body);
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const {
      species,
      eventType,
      date,
      location,
      probability,
      description,
      dataSource,
      waterTemperature,
      depth
    } = params.data;
    
    // Создаем или обновляем миграционное событие
    const migrationEvent = await prisma.migrationEvent.upsert({
      where: {
        // Уникальная комбинация species + date + eventType + location
        id: `${species}_${date.toISOString().split('T')[0]}_${eventType}_${location.latitude}_${location.longitude}`
      },
      update: {
        probability: probability || 0.5,
        location: location as any,
        waterTemperature,
        depth,
        description: description || `${eventType} для ${species}`,
        dataSource: dataSource || 'API Input',
        confidence: 0.8
      },
      create: {
        species,
        eventType: eventType.toUpperCase() as any,
        date,
        probability: probability || 0.5,
        location: location as any,
        waterTemperature,
        depth,
        description: description || `${eventType} для ${species}`,
        dataSource: dataSource || 'API Input',
        confidence: 0.8
      }
    });
    
    return NextResponse.json({
      message: 'Миграционное событие успешно создано/обновлено',
      event: migrationEvent
    });
    
  } catch (error) {
    console.error('Ошибка создания миграционного события:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Вспомогательные функции

/**
 * Рассчитать расстояние от берега
 */
function calculateDistanceFromShore(latitude: number, longitude: number): number {
  const cascaisCoast = { lat: 38.6979, lon: -9.4215 };
  
  const latDiff = Math.abs(latitude - cascaisCoast.lat);
  const lonDiff = Math.abs(longitude - cascaisCoast.lon);
  
  const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111;
  return Math.max(0.5, Math.round(distance * 10) / 10);
}

/**
 * Группировать события по датам
 */
function groupEventsByDate(events: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {};
  
  events.forEach(event => {
    const dateKey = event.date.toISOString().split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });
  
  return grouped;
}

/**
 * Генерировать рекомендации по миграциям
 */
function generateMigrationRecommendations(events: any[], location: any): string[] {
  const recommendations = [];
  
  // Топ-3 самых вероятных события
  const topEvents = events.slice(0, 3);
  if (topEvents.length > 0) {
    recommendations.push(
      `Наиболее вероятные миграции: ${topEvents.map(e => 
        `${e.species.toLowerCase().replace('_', ' ')} (${Math.round(e.probability * 100)}%)`
      ).join(', ')}`
    );
  }
  
  // Рекомендации по глубинам
  const depths = events
    .filter(e => e.depth)
    .map(e => e.depth)
    .sort((a, b) => a - b);
  
  if (depths.length > 0) {
    const avgDepth = depths.reduce((sum, d) => sum + d, 0) / depths.length;
    recommendations.push(`Рекомендуемая глубина ловли: ${Math.round(avgDepth)}м (диапазон ${depths[0]}-${depths[depths.length - 1]}м)`);
  }
  
  // Сезонные рекомендации
  const currentMonth = new Date().getMonth();
  const seasonalEvents = events.filter(e => 
    e.date.getMonth() === currentMonth || 
    Math.abs(e.date.getMonth() - currentMonth) <= 1
  );
  
  if (seasonalEvents.length > 0) {
    recommendations.push('Текущий сезон благоприятен для миграционной активности');
  }
  
  // Рекомендации по местоположению
  if (location.distanceFromShore < 5) {
    recommendations.push('Близость к берегу: ищите анадромные виды (морской окунь, сардины)');
  } else if (location.distanceFromShore > 15) {
    recommendations.push('Глубоководная зона: фокусируйтесь на океанических видах (тунец, дорадо, марлин)');
  }
  
  return recommendations.slice(0, 5); // Максимум 5 рекомендаций
}

/**
 * Анализировать миграционные тренды
 */
function analyzeMigrationTrends(events: any[]): {
  peakActivity: { month: number; eventCount: number } | null;
  dominantSpecies: { species: string; percentage: number }[];
  seasonalDistribution: Record<number, number>;
  eventTypeDistribution: Record<string, number>;
} {
  if (events.length === 0) {
    return {
      peakActivity: null,
      dominantSpecies: [],
      seasonalDistribution: {},
      eventTypeDistribution: {}
    };
  }
  
  // Анализ пиковой активности по месяцам
  const monthCounts: Record<number, number> = {};
  events.forEach(event => {
    const month = event.date.getMonth();
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });
  
  const peakActivity = Object.entries(monthCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([month, count]) => ({ month: parseInt(month), eventCount: count }))[0] || null;
  
  // Анализ доминирующих видов
  const speciesCounts: Record<string, number> = {};
  events.forEach(event => {
    speciesCounts[event.species] = (speciesCounts[event.species] || 0) + 1;
  });
  
  const dominantSpecies = Object.entries(speciesCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([species, count]) => ({
      species,
      percentage: Math.round((count / events.length) * 100)
    }))
    .slice(0, 5);
  
  // Сезонное распределение
  const seasonalDistribution = monthCounts;
  
  // Распределение типов событий
  const eventTypeDistribution: Record<string, number> = {};
  events.forEach(event => {
    eventTypeDistribution[event.eventType] = (eventTypeDistribution[event.eventType] || 0) + 1;
  });
  
  return {
    peakActivity,
    dominantSpecies,
    seasonalDistribution,
    eventTypeDistribution
  };
}
