import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { lunarService } from '@/lib/services/lunar-service';
import { migrationService } from '@/lib/services/migration-service';
import { prisma } from '@/lib/prisma';
import { FishSpecies } from '@prisma/client';

// Схема валидации параметров запроса
const QuerySchema = z.object({
  date: z.string().transform((str) => new Date(str)).optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  latitude: z.string().transform((str) => parseFloat(str)),
  longitude: z.string().transform((str) => parseFloat(str)),
  targetSpecies: z.string().optional(),
  includeHistorical: z.string().transform((str) => str === 'true').optional().default(false)
});

/**
 * GET /api/marine-calendar/fishing-conditions
 * Получить условия рыбалки для конкретной даты и места
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Валидация параметров
    const params = QuerySchema.safeParse({
      date: searchParams.get('date'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      targetSpecies: searchParams.get('targetSpecies'),
      includeHistorical: searchParams.get('includeHistorical')
    });
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const { date, startDate, endDate, latitude, longitude, targetSpecies, includeHistorical } = params.data;
    
    // Определяем период запроса
    let queryStartDate: Date;
    let queryEndDate: Date;
    
    if (date) {
      queryStartDate = date;
      queryEndDate = date;
    } else if (startDate && endDate) {
      queryStartDate = startDate;
      queryEndDate = endDate;
      
      // Проверка максимального периода (30 дней)
      const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDifference > 30) {
        return NextResponse.json(
          { error: 'Максимальный период запроса - 30 дней' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Укажите date или startDate+endDate' },
        { status: 400 }
      );
    }
    
    // Создаем объект локации
    const location = {
      name: `Координаты ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      latitude,
      longitude,
      depths: [10, 20, 30, 50, 80, 120], // Типичные глубины для Кашкайша
      bottomType: 'mixed',
      distanceFromShore: calculateDistanceFromShore(latitude, longitude)
    };
    
    const fishingConditions = await calculateFishingConditions(
      queryStartDate,
      queryEndDate,
      location,
      targetSpecies,
      includeHistorical
    );
    
    return NextResponse.json({
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      location,
      conditions: fishingConditions,
      metadata: {
        calculatedAt: new Date(),
        includeHistorical,
        targetSpecies: targetSpecies || 'all'
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения условий рыбалки:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * Рассчитать условия рыбалки для периода
 */
async function calculateFishingConditions(
  startDate: Date,
  endDate: Date,
  location: any,
  targetSpecies?: string,
  includeHistorical: boolean = false
) {
  const conditions = [];
  const currentDate = new Date(startDate);
  
  // Парсим целевые виды рыб
  const speciesList = targetSpecies 
    ? targetSpecies.split(',').map(s => s.trim().toUpperCase() as FishSpecies)
    : Object.values(FishSpecies);
  
  while (currentDate <= endDate) {
    const dateConditions = await calculateDayConditions(
      new Date(currentDate),
      location,
      speciesList,
      includeHistorical
    );
    
    conditions.push(dateConditions);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return conditions;
}

/**
 * Рассчитать условия рыбалки для одного дня
 */
async function calculateDayConditions(
  date: Date,
  location: any,
  speciesList: FishSpecies[],
  includeHistorical: boolean
) {
  // Получаем лунную фазу
  let lunarPhase = await prisma.lunarPhase.findUnique({
    where: { date }
  });
  
  if (!lunarPhase) {
    // Если нет в базе, рассчитываем
    const calculatedPhase = await lunarService.calculateLunarPhase(date);
    const lunarInfluence = lunarService.calculateLunarInfluence(calculatedPhase);
    
    lunarPhase = await prisma.lunarPhase.create({
      data: {
        date,
        type: calculatedPhase.type,
        angle: calculatedPhase.angle,
        illumination: calculatedPhase.illumination,
        distanceKm: 384400,
        apparentDiameter: 0.52,
        fishingInfluence: lunarInfluence as any
      }
    });
  }
  
  // Получаем лучшие часы для рыбалки
  const calculatedPhase = await lunarService.calculateLunarPhase(date);
  const bestHours = lunarService.getBestFishingHours(date, calculatedPhase);
  
  // Анализируем влияние на разные виды рыб
  const speciesInfluence = await Promise.all(
    speciesList.slice(0, 5).map(async (species) => { // Ограничиваем до 5 видов для производительности
      const recommendations = migrationService.getMigrationBasedRecommendations(
        species,
        date,
        location
      );
      
      return {
        species,
        activity: Math.round(recommendations.probability * 10),
        preferredDepth: recommendations.recommendedDepths.join('-') + ' м',
        bestLocations: recommendations.bestLocations.slice(0, 3),
        recommendedBaits: getRecommendedBaits(species, calculatedPhase.type)
      };
    })
  );
  
  // Рассчитываем общий рейтинг дня
  const overallRating = calculateOverallRating(lunarPhase, speciesInfluence);
  
  // Генерируем рекомендации
  const recommendations = generateDayRecommendations(lunarPhase, speciesInfluence, bestHours);
  
  // Исторические данные (если запрошены)
  let historicalData = null;
  if (includeHistorical) {
    historicalData = await getHistoricalDataForDate(date, location, speciesList);
  }
  
  return {
    date,
    overallRating,
    lunarPhase: {
      type: lunarPhase.type,
      illumination: lunarPhase.illumination,
      influence: lunarPhase.fishingInfluence
    },
    bestHours: bestHours.slice(0, 3), // Топ-3 периода
    speciesInfluence,
    recommendations,
    historicalData,
    tidalInfluence: generateTidalInfluence(date, location), // Упрощенные приливные данные
    weatherImpact: null // Можно интегрировать с погодным API позже
  };
}

/**
 * Рассчитать расстояние от берега (упрощенно)
 */
function calculateDistanceFromShore(latitude: number, longitude: number): number {
  // Упрощенный расчет для побережья Кашкайша
  // В реальности нужно использовать геосервисы
  const cascaisCoast = { lat: 38.6979, lon: -9.4215 };
  
  const latDiff = Math.abs(latitude - cascaisCoast.lat);
  const lonDiff = Math.abs(longitude - cascaisCoast.lon);
  
  // Примерное расстояние в км (очень упрощенно)
  const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff) * 111; // Примерно км на градус
  
  return Math.max(0.5, Math.round(distance * 10) / 10); // Минимум 0.5 км
}

/**
 * Получить рекомендуемые приманки для вида и лунной фазы
 */
function getRecommendedBaits(species: FishSpecies, lunarPhaseType: any): string[] {
  const baseBaits = {
    [FishSpecies.TUNA]: ['Живая скумбрия', 'Крупные воблеры', 'Спиннербейты'],
    [FishSpecies.DORADO]: ['Кальмар', 'Яркие воблеры', 'Джиг-головки'],
    [FishSpecies.SEABASS]: ['Креветки', 'Черви', 'Силиконовые приманки'],
    [FishSpecies.SARDINE]: ['Планктонные имитации', 'Мелкие блесны'],
    [FishSpecies.MACKEREL]: ['Мелкая рыбка', 'Перьевые джиги', 'Блесны']
  };
  
  const speciesBaits = baseBaits[species as keyof typeof baseBaits] || ['Универсальные приманки', 'Натуральная наживка'];
  
  // Корректировка по лунной фазе
  if (lunarPhaseType === 'FULL_MOON') {
    return [...speciesBaits, 'Светящиеся приманки'];
  } else if (lunarPhaseType === 'NEW_MOON') {
    return [...speciesBaits, 'Шумовые приманки'];
  }
  
  return speciesBaits;
}

/**
 * Рассчитать общий рейтинг дня
 */
function calculateOverallRating(lunarPhase: any, speciesInfluence: any[]): number {
  // Базовый рейтинг от лунной фазы
  let rating = 5; // Средний рейтинг
  
  if (lunarPhase.fishingInfluence?.strength) {
    rating = Math.round(lunarPhase.fishingInfluence.strength);
  }
  
  // Корректировка по активности видов
  if (speciesInfluence.length > 0) {
    const avgSpeciesActivity = speciesInfluence.reduce((sum, s) => sum + s.activity, 0) / speciesInfluence.length;
    rating = Math.round((rating + avgSpeciesActivity) / 2);
  }
  
  return Math.max(1, Math.min(10, rating));
}

/**
 * Генерировать рекомендации для дня
 */
function generateDayRecommendations(lunarPhase: any, speciesInfluence: any[], bestHours: any[]): string[] {
  const recommendations = [];
  
  // Рекомендации по лунной фазе
  if (lunarPhase.fishingInfluence?.description) {
    recommendations.push(lunarPhase.fishingInfluence.description);
  }
  
  // Рекомендации по времени
  if (bestHours.length > 0) {
    const bestTime = bestHours[0];
    recommendations.push(`Лучшее время: ${bestTime.description} (${bestTime.start.getHours()}:${String(bestTime.start.getMinutes()).padStart(2, '0')}-${bestTime.end.getHours()}:${String(bestTime.end.getMinutes()).padStart(2, '0')})`);
  }
  
  // Рекомендации по видам
  const topSpecies = speciesInfluence
    .sort((a, b) => b.activity - a.activity)
    .slice(0, 2);
  
  if (topSpecies.length > 0) {
    recommendations.push(`Наиболее активные виды: ${topSpecies.map(s => s.species.toLowerCase().replace('_', ' ')).join(', ')}`);
  }
  
  return recommendations;
}

/**
 * Генерировать упрощенные приливные данные
 */
function generateTidalInfluence(date: Date, location: any) {
  // Упрощенная модель приливов для Атлантики
  const hours = date.getHours();
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  
  // Псевдо-случайные приливы на основе даты
  const tidePhase = (dayOfYear + hours * 0.5) % 12;
  
  const isHighTide = tidePhase < 6;
  const tideHeight = 1.5 + Math.sin(tidePhase / 12 * 2 * Math.PI) * 1.2; // 0.3-2.7м
  
  return {
    type: isHighTide ? 'HIGH_TIDE' : 'LOW_TIDE',
    height: Math.round(tideHeight * 10) / 10,
    strength: Math.round(Math.abs(Math.sin(tidePhase)) * 10),
    nextChange: new Date(date.getTime() + 6 * 60 * 60 * 1000), // Через 6 часов
    fishingImpact: tideHeight > 2.0 ? 'POSITIVE' : tideHeight < 0.8 ? 'NEGATIVE' : 'NEUTRAL'
  };
}

/**
 * Получить исторические данные для даты
 */
async function getHistoricalDataForDate(date: Date, location: any, speciesList: FishSpecies[]) {
  try {
    // Ищем исторические уловы в похожий период (±7 дней) в предыдущие годы
    const startDate = new Date(date);
    startDate.setDate(date.getDate() - 7);
    startDate.setFullYear(date.getFullYear() - 3); // Последние 3 года
    
    const endDate = new Date(date);
    endDate.setDate(date.getDate() + 7);
    endDate.setFullYear(date.getFullYear() - 1); // До прошлого года
    
    const historicalCatches = await prisma.catchRecord.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        // Приблизительная фильтрация по локации (в радиусе ~10км)
        // В реальности нужно использовать геопространственные запросы
      },
      include: {
        lunarPhase: true
      },
      take: 50 // Ограничиваем количество записей
    });
    
    if (historicalCatches.length === 0) {
      return null;
    }
    
    // Анализируем исторические данные
    const totalCatches = historicalCatches.length;
    const avgWeight = historicalCatches.reduce((sum, c) => sum + c.totalWeight, 0) / totalCatches;
    const successRate = historicalCatches.filter(c => c.success).length / totalCatches * 100;
    
    return {
      totalRecords: totalCatches,
      averageWeight: Math.round(avgWeight * 100) / 100,
      successRate: Math.round(successRate),
      bestPreviousDate: historicalCatches.sort((a, b) => b.totalWeight - a.totalWeight)[0]?.date,
      lunarPhaseCorrelation: calculateLunarCorrelation(historicalCatches)
    };
  } catch (error) {
    console.error('Ошибка получения исторических данных:', error);
    return null;
  }
}

/**
 * Рассчитать корреляцию с лунными фазами
 */
function calculateLunarCorrelation(catches: any[]): any {
  if (catches.length < 10) return null;
  
  const phaseStats: Record<string, { count: number; avgWeight: number; totalWeight: number }> = {};
  
  catches.forEach(catchRecord => {
    if (!catchRecord.lunarPhase) return;
    
    const phase = catchRecord.lunarPhase.type;
    if (!phaseStats[phase]) {
      phaseStats[phase] = { count: 0, avgWeight: 0, totalWeight: 0 };
    }
    
    phaseStats[phase].count++;
    phaseStats[phase].totalWeight += catchRecord.totalWeight;
  });
  
  // Рассчитываем средние веса для каждой фазы
  Object.keys(phaseStats).forEach(phase => {
    phaseStats[phase].avgWeight = phaseStats[phase].totalWeight / phaseStats[phase].count;
  });
  
  // Находим лучшую фазу
  const bestPhase = Object.entries(phaseStats)
    .sort(([, a], [, b]) => b.avgWeight - a.avgWeight)[0];
  
  return bestPhase ? {
    bestPhase: bestPhase[0],
    avgWeightInBestPhase: Math.round(bestPhase[1].avgWeight * 100) / 100,
    observationCount: bestPhase[1].count
  } : null;
}
