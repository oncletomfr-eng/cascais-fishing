import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { FishSpecies, LunarPhaseType } from '@prisma/client';

// Схема валидации параметров запроса
const QuerySchema = z.object({
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  latitude: z.string().transform((str) => parseFloat(str)).optional(),
  longitude: z.string().transform((str) => parseFloat(str)).optional(),
  radius: z.string().transform((str) => parseFloat(str)).optional(),
  species: z.string().optional(),
  lunarPhase: z.string().optional(),
  minWeight: z.string().transform((str) => parseFloat(str)).optional(),
  analysisType: z.enum(['summary', 'detailed', 'correlations', 'trends']).optional(),
  groupBy: z.enum(['date', 'species', 'lunar_phase', 'month', 'season']).optional(),
  limit: z.string().transform((str) => parseInt(str)).optional()
});

/**
 * GET /api/marine-calendar/historical-data
 * Получить исторические данные об уловах с анализом
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Валидация параметров (преобразуем null в undefined для optional полей)
    const params = QuerySchema.safeParse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      latitude: searchParams.get('latitude') || undefined,
      longitude: searchParams.get('longitude') || undefined,
      radius: searchParams.get('radius') || undefined,
      species: searchParams.get('species') || undefined,
      lunarPhase: searchParams.get('lunarPhase') || undefined,
      minWeight: searchParams.get('minWeight') || undefined,
      analysisType: searchParams.get('analysisType') || undefined,
      groupBy: searchParams.get('groupBy') || undefined,
      limit: searchParams.get('limit') || undefined
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
      lunarPhase,
      minWeight
    } = params.data;
    
    // Применяем default значения
    const radius = params.data.radius || 10; // км по умолчанию
    const analysisType = params.data.analysisType || 'summary';
    const groupBy = params.data.groupBy || 'date';
    const limit = params.data.limit || 100;
    
    // Строим базовый запрос
    const whereConditions: any = {};
    
    // Фильтр по датам
    if (startDate || endDate) {
      whereConditions.date = {};
      if (startDate) whereConditions.date.gte = startDate;
      if (endDate) whereConditions.date.lte = endDate;
    }
    
    // Фильтр по весу
    if (minWeight) {
      whereConditions.totalWeight = { gte: minWeight };
    }
    
    // Фильтр по лунной фазе
    if (lunarPhase) {
      whereConditions.lunarPhase = {
        type: lunarPhase.toUpperCase() as LunarPhaseType
      };
    }
    
    // Фильтр по видам рыб
    if (species) {
      const targetSpecies = species.split(',').map(s => s.trim().toUpperCase() as FishSpecies);
      // В реальности нужно искать в JSON поле catches, но для упрощения пропустим
    }
    
    // Получаем данные из базы
    const catchRecords = await prisma.catchRecord.findMany({
      where: whereConditions,
      include: {
        lunarPhase: true,
        angler: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'desc' },
      take: Math.min(limit, 500) // Максимум 500 записей для производительности
    });
    
    // Применяем географический фильтр (упрощенно)
    let filteredRecords = catchRecords;
    if (latitude && longitude) {
      filteredRecords = catchRecords.filter(record => {
        const recordLocation = record.location as any;
        if (!recordLocation?.latitude || !recordLocation?.longitude) return true;
        
        const distance = calculateDistance(
          latitude,
          longitude,
          recordLocation.latitude,
          recordLocation.longitude
        );
        
        return distance <= radius;
      });
    }
    
    // Выполняем анализ в зависимости от типа
    let analysisResult;
    switch (analysisType) {
      case 'summary':
        analysisResult = await generateSummaryAnalysis(filteredRecords);
        break;
      case 'detailed':
        analysisResult = await generateDetailedAnalysis(filteredRecords);
        break;
      case 'correlations':
        analysisResult = await generateCorrelationAnalysis(filteredRecords);
        break;
      case 'trends':
        analysisResult = await generateTrendAnalysis(filteredRecords, groupBy);
        break;
      default:
        analysisResult = await generateSummaryAnalysis(filteredRecords);
    }
    
    return NextResponse.json({
      period: startDate && endDate ? { startDate, endDate } : null,
      location: latitude && longitude ? { latitude, longitude, radius } : null,
      filters: {
        species: species || null,
        lunarPhase: lunarPhase || null,
        minWeight: minWeight || null
      },
      analysisType,
      groupBy,
      data: analysisResult,
      metadata: {
        totalRecords: filteredRecords.length,
        originalRecords: catchRecords.length,
        filteredByLocation: latitude && longitude,
        calculatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Ошибка получения исторических данных:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marine-calendar/historical-data
 * Добавить новую запись об улове
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const bodySchema = z.object({
      date: z.string().transform((str) => new Date(str)),
      location: z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        depth: z.number().optional(),
        distanceFromShore: z.number().optional()
      }),
      catches: z.array(z.object({
        species: z.nativeEnum(FishSpecies),
        count: z.number().min(0),
        totalWeight: z.number().min(0),
        averageSize: z.number().min(0).optional(),
        timeOfCatch: z.string().transform((str) => new Date(str)).optional(),
        depth: z.number().optional(),
        bait: z.string().optional()
      })).min(1),
      weather: z.object({
        airTemperature: z.number().optional(),
        waterTemperature: z.number().optional(),
        windSpeed: z.number().optional(),
        windDirection: z.string().optional(),
        pressure: z.number().optional(),
        seaState: z.number().min(1).max(10).optional()
      }).optional(),
      tackle: z.array(z.object({
        type: z.string(),
        description: z.string(),
        effectiveness: z.number().min(1).max(10).optional()
      })).optional(),
      techniques: z.array(z.string()).optional(),
      duration: z.number().optional(), // минуты
      success: z.boolean().optional().default(true),
      notes: z.string().optional(),
      verified: z.boolean().optional().default(false),
      dataSource: z.string().optional().default('USER_REPORT')
    });
    
    const params = bodySchema.safeParse(body);
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const {
      date,
      location,
      catches,
      weather,
      tackle,
      techniques,
      duration,
      success,
      notes,
      verified,
      dataSource
    } = params.data;
    
    // Получаем или создаем лунную фазу для даты
    let lunarPhase = await prisma.lunarPhase.findUnique({
      where: { date }
    });
    
    if (!lunarPhase) {
      // Если нет в базе, создаем базовую запись
      // В реальности здесь должен быть вызов лунного сервиса
      lunarPhase = await prisma.lunarPhase.create({
        data: {
          date,
          type: 'FULL_MOON', // Placeholder
          angle: 180,
          illumination: 100,
          distanceKm: 384400,
          apparentDiameter: 0.52
        }
      });
    }
    
    // Рассчитываем общие показатели улова
    const totalWeight = catches.reduce((sum, c) => sum + c.totalWeight, 0);
    const totalCount = catches.reduce((sum, c) => sum + c.count, 0);
    
    // Создаем запись об улове
    const catchRecord = await prisma.catchRecord.create({
      data: {
        date,
        location: location as any,
        lunarPhaseId: lunarPhase.id,
        catches: catches as any,
        totalWeight,
        totalCount,
        weatherData: weather as any,
        tackleUsed: tackle as any,
        techniques: techniques || [],
        duration,
        success,
        notes,
        verified,
        dataSource: dataSource as any,
        confidence: verified ? 1.0 : 0.8
      },
      include: {
        lunarPhase: true
      }
    });
    
    // Обновляем статистику пользователя (если указан)
    // В реальности здесь нужна аутентификация
    
    return NextResponse.json({
      message: 'Запись об улове успешно создана',
      catchRecord: {
        id: catchRecord.id,
        date: catchRecord.date,
        totalWeight: catchRecord.totalWeight,
        totalCount: catchRecord.totalCount,
        success: catchRecord.success,
        lunarPhase: catchRecord.lunarPhase.type
      }
    });
    
  } catch (error) {
    console.error('Ошибка создания записи об улове:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// Вспомогательные функции для анализа

/**
 * Сводный анализ
 */
async function generateSummaryAnalysis(records: any[]) {
  const totalRecords = records.length;
  if (totalRecords === 0) {
    return {
      totalRecords: 0,
      summary: 'Нет данных для анализа'
    };
  }
  
  const totalWeight = records.reduce((sum, r) => sum + r.totalWeight, 0);
  const avgWeight = totalWeight / totalRecords;
  const successfulTrips = records.filter(r => r.success).length;
  const successRate = (successfulTrips / totalRecords) * 100;
  
  // Анализ по лунным фазам
  const lunarStats: Record<string, { count: number; avgWeight: number; successRate: number }> = {};
  records.forEach(record => {
    const phase = record.lunarPhase?.type || 'UNKNOWN';
    if (!lunarStats[phase]) {
      lunarStats[phase] = { count: 0, avgWeight: 0, successRate: 0 };
    }
    lunarStats[phase].count++;
    lunarStats[phase].avgWeight += record.totalWeight;
    if (record.success) lunarStats[phase].successRate++;
  });
  
  Object.keys(lunarStats).forEach(phase => {
    const stats = lunarStats[phase];
    stats.avgWeight = stats.avgWeight / stats.count;
    stats.successRate = (stats.successRate / stats.count) * 100;
  });
  
  // Лучшая лунная фаза
  const bestPhase = Object.entries(lunarStats)
    .sort(([, a], [, b]) => b.avgWeight - a.avgWeight)[0];
  
  return {
    totalRecords,
    totalWeight: Math.round(totalWeight * 100) / 100,
    averageWeight: Math.round(avgWeight * 100) / 100,
    successRate: Math.round(successRate),
    lunarPhaseAnalysis: lunarStats,
    bestLunarPhase: bestPhase ? {
      phase: bestPhase[0],
      avgWeight: Math.round(bestPhase[1].avgWeight * 100) / 100,
      successRate: Math.round(bestPhase[1].successRate)
    } : null,
    dateRange: {
      earliest: records.sort((a, b) => a.date.getTime() - b.date.getTime())[0]?.date,
      latest: records.sort((a, b) => b.date.getTime() - a.date.getTime())[0]?.date
    }
  };
}

/**
 * Детальный анализ
 */
async function generateDetailedAnalysis(records: any[]) {
  const summary = await generateSummaryAnalysis(records);
  
  // Анализ по месяцам
  const monthlyStats: Record<number, { count: number; avgWeight: number }> = {};
  records.forEach(record => {
    const month = record.date.getMonth();
    if (!monthlyStats[month]) {
      monthlyStats[month] = { count: 0, avgWeight: 0 };
    }
    monthlyStats[month].count++;
    monthlyStats[month].avgWeight += record.totalWeight;
  });
  
  Object.keys(monthlyStats).forEach(month => {
    const stats = monthlyStats[parseInt(month)];
    stats.avgWeight = stats.avgWeight / stats.count;
  });
  
  // Анализ по времени суток (если есть данные)
  const hourlyStats: Record<number, number> = {};
  records.forEach(record => {
    const hour = record.date.getHours();
    hourlyStats[hour] = (hourlyStats[hour] || 0) + 1;
  });
  
  return {
    ...summary,
    monthlyBreakdown: monthlyStats,
    hourlyDistribution: hourlyStats,
    topCatches: records
      .sort((a, b) => b.totalWeight - a.totalWeight)
      .slice(0, 10)
      .map(r => ({
        date: r.date,
        weight: r.totalWeight,
        count: r.totalCount,
        lunarPhase: r.lunarPhase?.type,
        location: r.location
      }))
  };
}

/**
 * Корреляционный анализ
 */
async function generateCorrelationAnalysis(records: any[]) {
  // Корреляция лунных фаз с успехом
  const lunarCorrelation = calculateLunarCorrelation(records);
  
  // Корреляция сезонов с активностью
  const seasonalCorrelation = calculateSeasonalCorrelation(records);
  
  // Корреляция погоды с успехом (если есть данные)
  const weatherCorrelation = calculateWeatherCorrelation(records);
  
  return {
    lunarPhaseCorrelation: lunarCorrelation,
    seasonalCorrelation: seasonalCorrelation,
    weatherCorrelation: weatherCorrelation,
    insights: generateCorrelationInsights(lunarCorrelation, seasonalCorrelation, weatherCorrelation)
  };
}

/**
 * Трендовый анализ
 */
async function generateTrendAnalysis(records: any[], groupBy: string) {
  const grouped: Record<string, any[]> = {};
  
  records.forEach(record => {
    let key: string;
    switch (groupBy) {
      case 'date':
        key = record.date.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'season':
        key = getSeason(record.date.getMonth());
        break;
      case 'lunar_phase':
        key = record.lunarPhase?.type || 'UNKNOWN';
        break;
      default:
        key = record.date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(record);
  });
  
  const trends = Object.entries(grouped).map(([key, records]) => ({
    period: key,
    recordCount: records.length,
    totalWeight: records.reduce((sum, r) => sum + r.totalWeight, 0),
    avgWeight: records.reduce((sum, r) => sum + r.totalWeight, 0) / records.length,
    successRate: (records.filter(r => r.success).length / records.length) * 100
  }));
  
  return {
    groupBy,
    trends: trends.sort((a, b) => a.period.localeCompare(b.period)),
    summary: {
      bestPeriod: trends.sort((a, b) => b.avgWeight - a.avgWeight)[0],
      mostActivePeriod: trends.sort((a, b) => b.recordCount - a.recordCount)[0]
    }
  };
}

// Вспомогательные функции

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateLunarCorrelation(records: any[]): any {
  const phaseStats: Record<string, { total: number; successful: number; avgWeight: number }> = {};
  
  records.forEach(record => {
    const phase = record.lunarPhase?.type || 'UNKNOWN';
    if (!phaseStats[phase]) {
      phaseStats[phase] = { total: 0, successful: 0, avgWeight: 0 };
    }
    
    phaseStats[phase].total++;
    if (record.success) phaseStats[phase].successful++;
    phaseStats[phase].avgWeight += record.totalWeight;
  });
  
  Object.keys(phaseStats).forEach(phase => {
    phaseStats[phase].avgWeight = phaseStats[phase].avgWeight / phaseStats[phase].total;
  });
  
  return phaseStats;
}

function calculateSeasonalCorrelation(records: any[]): any {
  const seasonStats: Record<string, { total: number; avgWeight: number }> = {};
  
  records.forEach(record => {
    const season = getSeason(record.date.getMonth());
    if (!seasonStats[season]) {
      seasonStats[season] = { total: 0, avgWeight: 0 };
    }
    
    seasonStats[season].total++;
    seasonStats[season].avgWeight += record.totalWeight;
  });
  
  Object.keys(seasonStats).forEach(season => {
    seasonStats[season].avgWeight = seasonStats[season].avgWeight / seasonStats[season].total;
  });
  
  return seasonStats;
}

function calculateWeatherCorrelation(records: any[]): any {
  // Упрощенный анализ погоды
  const weatherData = records.filter(r => r.weatherData);
  if (weatherData.length === 0) return null;
  
  return {
    recordsWithWeather: weatherData.length,
    avgWeightInGoodWeather: 'Нужны дополнительные данные для анализа'
  };
}

function generateCorrelationInsights(lunar: any, seasonal: any, weather: any): string[] {
  const insights = [];
  
  // Лунные инсайты
  const bestLunarPhase = Object.entries(lunar)
    .sort(([, a], [, b]) => (b as any).avgWeight - (a as any).avgWeight)[0];
  
  if (bestLunarPhase) {
    insights.push(`Лучшие результаты показывает ${bestLunarPhase[0]} (средний вес ${(bestLunarPhase[1] as any).avgWeight.toFixed(1)} кг)`);
  }
  
  // Сезонные инсайты
  const bestSeason = Object.entries(seasonal)
    .sort(([, a], [, b]) => (b as any).avgWeight - (a as any).avgWeight)[0];
  
  if (bestSeason) {
    insights.push(`Наиболее продуктивный сезон: ${bestSeason[0]}`);
  }
  
  return insights;
}

function getSeason(month: number): string {
  if (month >= 2 && month <= 4) return 'Весна';
  if (month >= 5 && month <= 7) return 'Лето';
  if (month >= 8 && month <= 10) return 'Осень';
  return 'Зима';
}
