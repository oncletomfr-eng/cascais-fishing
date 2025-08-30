/**
 * Smart Recommendations Service v2.0
 * Оптимизировано на основе документации OpenAI API
 * Откалиброванные промпты для рыболовного контекста Кашкайш
 */

import { OpenAI } from 'openai';
import {
  FishSpecies,
  FishingTechnique,
  WindDirection,
  SkillLevelRequired,
  UserRole,
  WeatherCondition,
  PrismaClient,
  RecommendationType
} from '@prisma/client';

// Инициализация OpenAI клиента с оптимизированными настройками
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Конфигурация для рыболовного контекста
const FISHING_CONFIG = {
  // Температура (°C) - оптимальные диапазоны для видов рыб у берегов Кашкайш
  SPECIES_TEMPERATURE_RANGES: {
    SEABASS: [12, 22],        // Морской окунь
    DORADO: [18, 26],         // Дорадо
    TUNA: [20, 28],           // Тунец
    SARDINE: [14, 20],        // Сардина
    MACKEREL: [12, 18],       // Скумбрия
    SOLE: [8, 16],            // Камбала
    BREAM: [15, 23],          // Лещ
    GROUPER: [16, 24],        // Групер
    BASS: [14, 20],           // Бас
    COD: [6, 14],             // Треска
    ANCHOVY: [16, 22],        // Анчоус
    SALMON: [8, 16],          // Лосось
    MULLET: [14, 22],         // Кефаль
    FLOUNDER: [8, 18],        // Камбала-флаундер
    WHITING: [10, 16]         // Путассу
  },
  
  // Ветер (м/с) - влияние на активность рыб
  WIND_CONDITIONS: {
    CALM: [0, 3],             // Штиль - отлично для поверхностной рыбы
    LIGHT: [3, 7],            // Легкий ветер - универсально хорошо
    MODERATE: [7, 12],        // Умеренный - хорошо для глубоководной рыбы
    STRONG: [12, 18],         // Сильный - только опытным рыбакам
    STORM: [18, 999]          // Шторм - опасно
  },
  
  // Давление (гПа) - критичный фактор клева
  PRESSURE_RANGES: {
    HIGH: [1020, 1040],       // Высокое - слабый клев
    NORMAL: [1000, 1020],     // Нормальное - хороший клев
    LOW: [980, 1000],         // Низкое - отличный клев перед непогодой
    VERY_LOW: [950, 980]      // Очень низкое - буря, не рыбачить
  }
};

const prisma = new PrismaClient();

export class SmartRecommendationsServiceV2 {

  /**
   * Генерирует погодные AI рекомендации с улучшенными промптами
   * Оптимизировано согласно OpenAI API best practices
   */
  async generateWeatherAIRecommendations(weatherData: {
    temperature: number;
    windSpeed: number;
    windDirection: WindDirection;
    pressure: number;
    humidity: number;
    cloudCover: number;
    location: { lat: number; lon: number };
  }): Promise<{
    recommendation: string;
    recommendedSpecies: FishSpecies[];
    recommendedTechniques: FishingTechnique[];
    confidenceLevel: number;
    reasoning: string;
    optimalTime: { start: number; end: number };
    recommendedDepth: number;
  }> {

    // Системный промпт - оптимизирован для четкого контекста
    const systemPrompt = `Вы - опытный португальский капитан рыболовного судна с 25-летним стажем работы в водах у Кашкайш, Атлантического океана. 

ВАША ЭКСПЕРТИЗА:
- Знание поведения рыб в Атлантике у берегов Португалии
- Понимание влияния погоды на клев различных видов рыб
- Опыт рыбалки в различных погодных условиях
- Знание лучших техник и времени для каждого вида рыб

ДОСТУПНЫЕ ВИДЫ РЫБ: ${Object.values(FishSpecies).join(', ')}
ДОСТУПНЫЕ ТЕХНИКИ: ${Object.values(FishingTechnique).join(', ')}

ОТВЕЧАЙТЕ СТРОГО В JSON ФОРМАТЕ без дополнительного текста:
{
  "recommendation": "Краткий совет на русском (максимум 100 символов)",
  "species": ["ВИДА1", "ВИДА2"], 
  "techniques": ["ТЕХНИКА1"],
  "reasoning": "Детальное объяснение выбора (200-300 символов)",
  "confidence": 0.85,
  "optimal_depth": 12.5,
  "optimal_time_start": 6,
  "optimal_time_end": 10
}`;

    // Пользовательский промпт с конкретными данными
    const userPrompt = `Проанализируйте погодные условия для рыбалки:

ПОГОДА СЕЙЧАС (Кашкайш, Атлантика):
🌡️ Температура: ${weatherData.temperature}°C
💨 Ветер: ${weatherData.windSpeed} м/с, ${weatherData.windDirection}
📈 Давление: ${weatherData.pressure} гПа
💧 Влажность: ${weatherData.humidity}%
☁️ Облачность: ${Math.round(weatherData.cloudCover * 100)}%

На основе этих условий дайте экспертную рекомендацию.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Используем более экономичную модель
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user', 
            content: userPrompt
          }
        ],
        temperature: 0.3, // Низкая температура для более предсказуемых ответов
        max_tokens: 400,
        response_format: { type: "json_object" }, // Принудительный JSON
        presence_penalty: 0.1, // Небольшой штраф за повторения
        frequency_penalty: 0.1,
        // Используем prompt caching для экономии токенов
        // user: `fishing_weather_${weatherData.location.lat}_${weatherData.location.lon}`
      });

      const result = response.choices[0].message.content;
      if (!result) {
        throw new Error('Пустой ответ от OpenAI');
      }

      const parsed = JSON.parse(result);

      // Валидация и маппинг ответа
      const recommendation = {
        recommendation: parsed.recommendation || 'Рекомендация недоступна',
        recommendedSpecies: (parsed.species || []).filter((s: string) => 
          Object.values(FishSpecies).includes(s as FishSpecies)
        ) as FishSpecies[],
        recommendedTechniques: (parsed.techniques || []).filter((t: string) => 
          Object.values(FishingTechnique).includes(t as FishingTechnique)
        ) as FishingTechnique[],
        confidenceLevel: Math.max(0.1, Math.min(0.95, parsed.confidence || 0.5)),
        reasoning: parsed.reasoning || 'Анализ на основе погодных условий',
        optimalTime: {
          start: Math.max(0, Math.min(23, parsed.optimal_time_start || 6)),
          end: Math.max(1, Math.min(24, parsed.optimal_time_end || 18))
        },
        recommendedDepth: Math.max(0, parsed.optimal_depth || 10)
      };

      // Сохраняем рекомендацию в БД для анализа
      await this.saveWeatherRecommendation({
        weatherData,
        recommendation: recommendation.recommendation,
        species: recommendation.recommendedSpecies,
        techniques: recommendation.recommendedTechniques,
        confidence: recommendation.confidenceLevel,
        tokensUsed: response.usage?.total_tokens || 0
      });

      return recommendation;

    } catch (error: any) {
      console.error('❌ Ошибка генерации AI рекомендации:', error);
      
      // Обработка конкретных ошибок OpenAI
      if (error?.code === 'insufficient_quota') {
        throw new Error('Превышена квота OpenAI API. Пожалуйста, проверьте баланс на platform.openai.com');
      }
      
      if (error?.code === 'rate_limit_exceeded') {
        throw new Error('Превышен лимит запросов. Попробуйте позже.');
      }

      // Fallback рекомендация на основе простых правил
      return this.generateFallbackRecommendation(weatherData);
    }
  }

  /**
   * Fallback рекомендации при недоступности OpenAI API
   */
  private generateFallbackRecommendation(weatherData: any): any {
    console.log('🔄 Используем fallback рекомендации...');
    
    let species: FishSpecies[] = [];
    let techniques: FishingTechnique[] = [];
    let recommendation = '';
    let confidence = 0.6;
    
    // Простые правила на основе температуры
    if (weatherData.temperature >= 20) {
      species = [FishSpecies.DORADO, FishSpecies.TUNA];
      techniques = [FishingTechnique.TROLLING];
      recommendation = 'При теплой воде хорошо идет дорадо на троллинг';
    } else if (weatherData.temperature >= 15) {
      species = [FishSpecies.SEABASS, FishSpecies.MACKEREL];
      techniques = [FishingTechnique.JIGGING];
      recommendation = 'При умеренной температуре попробуйте окуня на джиг';
    } else {
      species = [FishSpecies.COD, FishSpecies.FLOUNDER];
      techniques = [FishingTechnique.BOTTOM_FISHING];
      recommendation = 'В прохладной воде лучше донная рыбалка';
    }

    // Корректировка по ветру
    if (weatherData.windSpeed > 10) {
      techniques = [FishingTechnique.BOTTOM_FISHING];
      recommendation += ' (сильный ветер - лучше донные снасти)';
      confidence = 0.4;
    }

    return {
      recommendation,
      recommendedSpecies: species,
      recommendedTechniques: techniques,
      confidenceLevel: confidence,
      reasoning: 'Рекомендация основана на базовых правилах (AI недоступен)',
      optimalTime: { start: 6, end: 12 },
      recommendedDepth: 8
    };
  }

  /**
   * Сохранение рекомендации в БД для анализа и улучшения
   */
  private async saveWeatherRecommendation(data: {
    weatherData: any;
    recommendation: string;
    species: FishSpecies[];
    techniques: FishingTechnique[];
    confidence: number;
    tokensUsed: number;
  }): Promise<void> {
    try {
      await prisma.smartRecommendation.create({
        data: {
          type: 'WEATHER_AI',
          title: 'Погодная AI рекомендация',
          description: data.recommendation,
          aiGeneratedText: data.recommendation,
          recommendedSpecies: data.species,
          recommendedTechniques: data.techniques,
          confidenceScore: data.confidence,
          weatherConditions: {
            temperature: data.weatherData.temperature,
            windSpeed: data.weatherData.windSpeed,
            windDirection: data.weatherData.windDirection,
            pressure: data.weatherData.pressure,
            humidity: data.weatherData.humidity,
            cloudCover: data.weatherData.cloudCover,
            location: data.weatherData.location,
            tokensUsed: data.tokensUsed,
            timestamp: new Date().toISOString()
          },
          triggerContext: {
            service: 'SmartRecommendationsServiceV2',
            version: '2.0',
            model: 'gpt-4o-mini'
          },
          validFrom: new Date(),
          isActive: true
        }
      });
    } catch (error) {
      console.error('⚠️ Не удалось сохранить рекомендацию в БД:', error);
      // Не прерываем выполнение из-за ошибки БД
    }
  }

  /**
   * Получение статистики использования OpenAI API
   */
  async getUsageStats(): Promise<{
    totalRecommendations: number;
    totalTokensUsed: number;
    averageConfidence: number;
    lastWeekUsage: number;
  }> {
    try {
      const stats = await prisma.smartRecommendation.aggregate({
        where: {
          type: 'WEATHER_AI',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Последняя неделя
          }
        },
        _count: true,
        _avg: {
          confidenceScore: true
        }
      });

      const weeklyStats = await prisma.smartRecommendation.count({
        where: {
          type: 'WEATHER_AI',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      // Подсчет токенов из metadata
      const recommendations = await prisma.smartRecommendation.findMany({
        where: {
          type: 'WEATHER_AI',
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          weatherConditions: true
        }
      });

      const totalTokensUsed = recommendations.reduce((total, rec) => {
        const tokens = (rec.weatherConditions as any)?.tokensUsed || 0;
        return total + tokens;
      }, 0);

      return {
        totalRecommendations: stats._count || 0,
        totalTokensUsed,
        averageConfidence: stats._avg.confidenceScore || 0,
        lastWeekUsage: weeklyStats
      };

    } catch (error) {
      console.error('❌ Ошибка получения статистики:', error);
      return {
        totalRecommendations: 0,
        totalTokensUsed: 0,
        averageConfidence: 0,
        lastWeekUsage: 0
      };
    }
  }

  /**
   * Проверка состояния OpenAI API и квоты
   */
  async checkAPIHealth(): Promise<{
    status: 'healthy' | 'quota_exceeded' | 'rate_limited' | 'error';
    message: string;
    canMakeRequests: boolean;
  }> {
    try {
      const testResponse = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Скажи просто "OK"'
          }
        ],
        max_tokens: 5,
        temperature: 0
      });

      if (testResponse.choices[0].message.content) {
        return {
          status: 'healthy',
          message: 'OpenAI API работает нормально',
          canMakeRequests: true
        };
      }

      return {
        status: 'error',
        message: 'Получен пустой ответ от OpenAI',
        canMakeRequests: false
      };

    } catch (error: any) {
      console.error('❌ Проверка здоровья API:', error);

      if (error?.code === 'insufficient_quota') {
        return {
          status: 'quota_exceeded',
          message: 'Превышена квота OpenAI. Пополните баланс на platform.openai.com',
          canMakeRequests: false
        };
      }

      if (error?.code === 'rate_limit_exceeded') {
        return {
          status: 'rate_limited',
          message: 'Превышен лимит запросов. Попробуйте позже',
          canMakeRequests: false
        };
      }

      return {
        status: 'error',
        message: `Ошибка API: ${error?.message || 'Неизвестная ошибка'}`,
        canMakeRequests: false
      };
    }
  }
}

export const smartRecommendationsServiceV2 = new SmartRecommendationsServiceV2();
