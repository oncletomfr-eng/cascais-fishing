import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { realWeatherService } from '@/lib/services/real-weather-service';
import { realLunarService } from '@/lib/services/real-lunar-service';

// Схема валидации параметров запроса
const QuerySchema = z.object({
  date: z.string().transform((str) => new Date(str)),
  latitude: z.string().transform((str) => parseFloat(str)).optional(),
  longitude: z.string().transform((str) => parseFloat(str)).optional(),
  includeForecast: z.string().transform((str) => str === 'true').optional().default(false)
});

/**
 * GET /api/marine-calendar/fishing-conditions-real
 * Получить реальные условия рыбалки с использованием внешних API
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Валидация параметров
    const params = QuerySchema.safeParse({
      date: searchParams.get('date'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      includeForecast: searchParams.get('includeForecast')
    });
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const { date, latitude, longitude, includeForecast } = params.data;
    
    // Проверяем, что дата не слишком далеко в прошлом или будущем
    const now = new Date();
    const maxPastDays = 7;
    const maxFutureDays = 14;
    
    const daysDifference = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference < -maxPastDays) {
      return NextResponse.json(
        { error: `Исторические данные доступны только за последние ${maxPastDays} дней` },
        { status: 400 }
      );
    }
    
    if (daysDifference > maxFutureDays) {
      return NextResponse.json(
        { error: `Прогноз доступен только на ${maxFutureDays} дней вперед` },
        { status: 400 }
      );
    }
    
    // Настраиваем местоположение
    let location = {
      latitude: 38.7071,  // Cascais по умолчанию
      longitude: -9.4212,
      name: 'Cascais, Portugal'
    };
    
    if (latitude && longitude) {
      location = {
        latitude,
        longitude,
        name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      };
    }
    
    console.log(`Получение условий рыбалки для ${location.name} на ${date.toISOString().split('T')[0]}`);
    
    // Параллельно получаем данные от разных сервисов
    const [fishingConditions, lunarPhases] = await Promise.all([
      realWeatherService.getFishingConditions(date),
      realLunarService.getLunarPhases(date, date)
    ]);
    
    // Находим лунную фазу для этой даты
    const todayLunarPhase = lunarPhases.find(phase => 
      phase.date.toDateString() === date.toDateString()
    ) || lunarPhases[0]; // Ближайшая фаза, если точного совпадения нет
    
    // Объединяем данные
    const combinedConditions = {
      date,
      location,
      weather: {
        temperature: {
          air: fishingConditions.airTemperature,
          water: fishingConditions.waterTemperature
        },
        wind: {
          speed: fishingConditions.windSpeed,
          direction: fishingConditions.windDirection,
          description: getWindDescription(fishingConditions.windSpeed)
        },
        atmospheric: {
          pressure: fishingConditions.pressure,
          humidity: fishingConditions.humidity,
          visibility: fishingConditions.visibility,
          cloudCover: fishingConditions.cloudCover
        },
        marine: {
          waveHeight: fishingConditions.waveHeight,
          condition: fishingConditions.weatherDescription
        }
      },
      lunar: todayLunarPhase ? {
        phase: todayLunarPhase.type,
        illumination: todayLunarPhase.illumination,
        rise: todayLunarPhase.rise,
        set: todayLunarPhase.set,
        influence: todayLunarPhase.influence,
        distance: todayLunarPhase.distance,
        chinese: todayLunarPhase.chineseLunarData
      } : null,
      fishing: {
        activity: fishingConditions.fishActivity,
        impact: fishingConditions.fishingImpact,
        optimalTimes: fishingConditions.optimalTimes,
        recommendation: fishingConditions.recommendation,
        overallRating: calculateOverallRating(fishingConditions, todayLunarPhase)
      },
      tides: fishingConditions.tidalInfluence,
      forecast: includeForecast ? await generateExtendedForecast(date, location) : null,
      metadata: {
        calculatedAt: new Date(),
        dataSource: 'real_apis',
        apis: {
          weather: 'OpenWeatherMap',
          lunar: 'Astronomy Engine + Lunar JavaScript',
          tides: 'NOAA (fallback for demo)'
        }
      }
    };
    
    return NextResponse.json(combinedConditions);
    
  } catch (error) {
    console.error('Ошибка получения реальных условий рыбалки:', error);
    
    // Возвращаем детали ошибки в development режиме
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Ошибка получения данных от внешних сервисов',
        details: isDevelopment ? error.message : undefined,
        fallback: true
      },
      { status: 500 }
    );
  }
}

/**
 * Получить описание ветра на основе скорости
 */
function getWindDescription(windSpeed: number): string {
  if (windSpeed < 1) return 'Штиль';
  else if (windSpeed < 4) return 'Тихий ветер';
  else if (windSpeed < 8) return 'Легкий ветер';
  else if (windSpeed < 12) return 'Слабый ветер';
  else if (windSpeed < 18) return 'Умеренный ветер';
  else if (windSpeed < 25) return 'Свежий ветер';
  else if (windSpeed < 32) return 'Сильный ветер';
  else return 'Шторм';
}

/**
 * Рассчитать общий рейтинг условий рыбалки (1-10)
 */
function calculateOverallRating(fishingConditions: any, lunarPhase: any): number {
  let score = 5; // Базовая оценка
  
  // Оценка активности рыбы
  const activityScores = {
    'very_high': 10,
    'high': 8,
    'moderate': 6,
    'low': 4,
    'very_low': 2
  };
  score += (activityScores[fishingConditions.fishActivity] || 5) - 5;
  
  // Оценка влияния на рыбалку
  const impactScores = {
    'very_positive': 2,
    'positive': 1,
    'neutral': 0,
    'negative': -1,
    'very_negative': -2
  };
  score += impactScores[fishingConditions.fishingImpact] || 0;
  
  // Оценка лунного влияния
  if (lunarPhase?.influence) {
    const lunarImpactScores = {
      'very_positive': 1,
      'positive': 0.5,
      'neutral': 0,
      'negative': -0.5,
      'very_negative': -1
    };
    score += lunarImpactScores[lunarPhase.influence.fishingImpact] || 0;
  }
  
  // Нормализуем к диапазону 1-10
  return Math.max(1, Math.min(10, Math.round(score)));
}

/**
 * Генерирует расширенный прогноз на несколько дней
 */
async function generateExtendedForecast(startDate: Date, location: any): Promise<any[]> {
  try {
    const forecast = [];
    const currentDate = new Date(startDate);
    
    // Прогноз на 3 дня вперед
    for (let i = 0; i < 3; i++) {
      const forecastDate = new Date(currentDate);
      forecastDate.setDate(currentDate.getDate() + i + 1);
      
      const [dayConditions, dayLunar] = await Promise.all([
        realWeatherService.getFishingConditions(forecastDate),
        realLunarService.getLunarPhases(forecastDate, forecastDate)
      ]);
      
      const lunarPhase = dayLunar[0]; // Первая (и единственная) фаза на этот день
      
      forecast.push({
        date: forecastDate,
        rating: calculateOverallRating(dayConditions, lunarPhase),
        summary: generateDaySummary(dayConditions, lunarPhase),
        bestTimes: dayConditions.optimalTimes,
        conditions: {
          temperature: dayConditions.airTemperature,
          wind: dayConditions.windSpeed,
          lunar: lunarPhase?.type || 'unknown'
        }
      });
    }
    
    return forecast;
  } catch (error) {
    console.error('Ошибка генерации прогноза:', error);
    return [];
  }
}

/**
 * Генерирует краткое описание дня
 */
function generateDaySummary(conditions: any, lunarPhase: any): string {
  const parts = [];
  
  // Оценка общих условий
  if (conditions.fishingImpact === 'very_positive') {
    parts.push('Отличные условия');
  } else if (conditions.fishingImpact === 'positive') {
    parts.push('Хорошие условия');
  } else if (conditions.fishingImpact === 'negative') {
    parts.push('Сложные условия');
  } else {
    parts.push('Обычные условия');
  }
  
  // Лунная фаза
  if (lunarPhase) {
    const phaseNames = {
      'new': 'новолуние',
      'first_quarter': 'первая четверть',
      'full': 'полнолуние',
      'last_quarter': 'последняя четверть'
    };
    parts.push(`(${phaseNames[lunarPhase.type] || lunarPhase.type})`);
  }
  
  // Погодные условия
  if (conditions.windSpeed > 15) {
    parts.push('сильный ветер');
  } else if (conditions.windSpeed < 5) {
    parts.push('тихая погода');
  }
  
  return parts.join(', ');
}
