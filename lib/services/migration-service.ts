import { FishSpecies } from '@prisma/client';
import { 
  MigrationPattern,
  MigrationType,
  MigrationEvent,
  FishingLocation,
  TemperatureRange,
  DepthRange,
  SeasonalAvailability,
  DateRange
} from '../types/marine-calendar';

/**
 * Сервис для расчета миграционных маршрутов рыб по сезонам
 * Анализирует температурные данные, течения и биологические циклы
 */
export class MigrationService {
  
  // Константы для Кашкайша и португальского побережья
  private readonly CASCAIS_COORDS = { latitude: 38.6979, longitude: -9.4215 };
  private readonly ATLANTIC_CONDITIONS = {
    averageWaterTemp: { summer: 20, winter: 15 },
    thermalLayers: [
      { depth: 0, tempVariation: 5 }, // Поверхностные воды - больше вариации
      { depth: 50, tempVariation: 2 }, // Средние глубины
      { depth: 200, tempVariation: 1 } // Глубокие воды - стабильная температура
    ]
  };

  /**
   * Данные о миграционных паттернах основных видов рыб в Атлантике
   */
  private readonly SPECIES_MIGRATION_DATA: Record<FishSpecies, MigrationPattern> = {
    [FishSpecies.TUNA]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'Север (к Скандинавии)',
      autumnDirection: 'Юг (к Средиземноморью)',
      peakDates: [
        { startDate: new Date(2024, 4, 1), endDate: new Date(2024, 5, 15), description: 'Весенняя миграция на север' },
        { startDate: new Date(2024, 8, 15), endDate: new Date(2024, 10, 30), description: 'Осенняя миграция на юг' }
      ],
      migrationDepths: [20, 30, 40, 50] // Предпочитают верхние слои
    },
    
    [FishSpecies.SARDINE]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'Север (вдоль побережья)',
      autumnDirection: 'Юг (к африканскому побережью)',
      peakDates: [
        { startDate: new Date(2024, 2, 15), endDate: new Date(2024, 4, 30), description: 'Весенний ход сардины' },
        { startDate: new Date(2024, 9, 1), endDate: new Date(2024, 11, 15), description: 'Осенняя концентрация' }
      ],
      migrationDepths: [10, 20, 30] // Поверхностные воды
    },

    [FishSpecies.MACKEREL]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'К побережью для нереста',
      autumnDirection: 'В открытый океан',
      peakDates: [
        { startDate: new Date(2024, 3, 1), endDate: new Date(2024, 6, 30), description: 'Нерестовая миграция' },
        { startDate: new Date(2024, 8, 1), endDate: new Date(2024, 10, 15), description: 'Откат в океан' }
      ],
      migrationDepths: [15, 25, 35, 45]
    },

    [FishSpecies.SEABASS]: {
      type: MigrationType.ANADROMOUS,
      springDirection: 'В эстуарии и лагуны',
      autumnDirection: 'В открытое море',
      peakDates: [
        { startDate: new Date(2024, 3, 15), endDate: new Date(2024, 5, 30), description: 'Миграция для нереста' },
        { startDate: new Date(2024, 9, 15), endDate: new Date(2024, 11, 30), description: 'Возвращение в море' }
      ],
      migrationDepths: [5, 15, 25] // Предпочитают мелководье
    },

    [FishSpecies.DORADO]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'Следует за течениями на север',
      autumnDirection: 'Южные воды Атлантики',
      peakDates: [
        { startDate: new Date(2024, 5, 1), endDate: new Date(2024, 7, 31), description: 'Пик присутствия у Португалии' },
        { startDate: new Date(2024, 9, 1), endDate: new Date(2024, 10, 31), description: 'Осенний проход' }
      ],
      migrationDepths: [20, 40, 60] // Средние глубины
    },

    [FishSpecies.BLUE_MARLIN]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'Северная Атлантика',
      autumnDirection: 'Тропические воды',
      peakDates: [
        { startDate: new Date(2024, 6, 1), endDate: new Date(2024, 8, 31), description: 'Летнее присутствие' }
      ],
      migrationDepths: [50, 100, 150, 200] // Глубоководный вид
    },

    [FishSpecies.SWORDFISH]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'К континентальному шельфу',
      autumnDirection: 'Глубоководные районы',
      peakDates: [
        { startDate: new Date(2024, 5, 15), endDate: new Date(2024, 9, 15), description: 'Летняя активность у берегов' }
      ],
      migrationDepths: [100, 200, 300, 500] // Очень глубоко
    },

    // Добавим данные для остальных видов
    [FishSpecies.SEABREAM]: {
      type: MigrationType.RESIDENT,
      springDirection: 'Местные перемещения к рифам',
      autumnDirection: 'Глубокие воды зимовки',
      peakDates: [
        { startDate: new Date(2024, 4, 1), endDate: new Date(2024, 9, 30), description: 'Активный сезон' }
      ],
      migrationDepths: [10, 20, 30, 40]
    },

    [FishSpecies.GROUPER]: {
      type: MigrationType.RESIDENT,
      springDirection: 'К рифам для размножения',
      autumnDirection: 'Глубокие укрытия',
      peakDates: [
        { startDate: new Date(2024, 3, 15), endDate: new Date(2024, 6, 15), description: 'Нерестовый период' }
      ],
      migrationDepths: [30, 50, 80, 120]
    },

    // Для остальных видов используем базовые паттерны
    [FishSpecies.BONITO]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'Север вдоль побережья',
      autumnDirection: 'Юг в теплые воды',
      peakDates: [
        { startDate: new Date(2024, 5, 1), endDate: new Date(2024, 8, 31), description: 'Летний сезон' }
      ],
      migrationDepths: [20, 30, 50]
    },

    [FishSpecies.ALBACORE]: {
      type: MigrationType.OCEANODROMOUS,
      springDirection: 'Следует за планктоном на север',
      autumnDirection: 'Субтропические воды',
      peakDates: [
        { startDate: new Date(2024, 6, 1), endDate: new Date(2024, 9, 30), description: 'Пик у португальских берегов' }
      ],
      migrationDepths: [40, 60, 80, 100]
    },

    // Остальные виды получают упрощенные паттерны
    ...Object.fromEntries(
      [FishSpecies.MAHI_MAHI, FishSpecies.WHITE_MARLIN, FishSpecies.SAILFISH, 
       FishSpecies.RED_SNAPPER, FishSpecies.JOHN_DORY, FishSpecies.SOLE, 
       FishSpecies.TURBOT, FishSpecies.AMBERJACK, FishSpecies.CONGER_EEL, 
       FishSpecies.OCTOPUS, FishSpecies.CUTTLEFISH, FishSpecies.MIXED_SPECIES].map(species => [
        species, 
        {
          type: MigrationType.RESIDENT,
          springDirection: 'К побережью',
          autumnDirection: 'Глубокие воды',
          peakDates: [
            { startDate: new Date(2024, 4, 1), endDate: new Date(2024, 9, 30), description: 'Активный период' }
          ],
          migrationDepths: [20, 40, 60]
        }
      ])
    )
  };

  /**
   * Получить миграционный паттерн для вида
   */
  getMigrationPattern(species: FishSpecies): MigrationPattern {
    return this.SPECIES_MIGRATION_DATA[species];
  }

  /**
   * Рассчитать вероятность миграционного события
   */
  calculateMigrationProbability(
    species: FishSpecies,
    date: Date,
    waterTemperature: number,
    location: FishingLocation
  ): number {
    const pattern = this.getMigrationPattern(species);
    const month = date.getMonth();
    const day = date.getDate();
    
    // Базовая вероятность на основе сезона
    let baseProbability = 0.3;
    
    // Проверяем, попадает ли дата в пиковые периоды
    for (const period of pattern.peakDates) {
      if (date >= period.startDate && date <= period.endDate) {
        baseProbability = 0.8;
        break;
      }
    }
    
    // Корректировка по температуре воды
    const tempMultiplier = this.getTemperatureMultiplier(species, waterTemperature);
    
    // Корректировка по местоположению
    const locationMultiplier = this.getLocationMultiplier(species, location);
    
    // Сезонная корректировка
    const seasonMultiplier = this.getSeasonMultiplier(species, month);
    
    const finalProbability = Math.min(1.0, baseProbability * tempMultiplier * locationMultiplier * seasonMultiplier);
    
    return Math.round(finalProbability * 100) / 100; // Округляем до 2 знаков
  }

  /**
   * Получить предстоящие миграционные события
   */
  async getUpcomingMigrationEvents(
    startDate: Date,
    endDate: Date,
    location: FishingLocation,
    targetSpecies?: FishSpecies[]
  ): Promise<MigrationEvent[]> {
    const events: MigrationEvent[] = [];
    const speciesToCheck = targetSpecies || Object.values(FishSpecies);
    
    for (const species of speciesToCheck) {
      const pattern = this.getMigrationPattern(species);
      
      for (const period of pattern.peakDates) {
        // Проверяем пересечение периодов
        if (this.periodsOverlap(
          { startDate, endDate },
          { startDate: period.startDate, endDate: period.endDate }
        )) {
          
          // Определяем тип события на основе даты
          const eventType = this.determineEventType(period, startDate, endDate);
          
          // Рассчитываем среднюю температуру воды для сезона
          const avgWaterTemp = this.getSeasonalWaterTemperature(period.startDate.getMonth());
          
          // Рассчитываем вероятность
          const probability = this.calculateMigrationProbability(
            species,
            period.startDate,
            avgWaterTemp,
            location
          );
          
          events.push({
            species,
            eventType,
            date: period.startDate,
            probability,
            location: location,
            direction: eventType === 'arrival' ? pattern.springDirection : pattern.autumnDirection,
            depth: pattern.migrationDepths[0], // Предпочитаемая глубина
            waterTemperature: avgWaterTemp,
            dataSource: 'Migration Service Calculation',
            confidence: 0.75,
            description: `${period.description} - ${this.getEventTypeDescription(eventType)}`
          });
        }
      }
    }
    
    return events.sort((a, b) => b.probability - a.probability);
  }

  /**
   * Получить рекомендации по местам ловли на основе миграций
   */
  getMigrationBasedRecommendations(
    species: FishSpecies,
    date: Date,
    baseLocation: FishingLocation
  ): {
    recommendedDepths: number[];
    bestLocations: string[];
    tactics: string[];
    probability: number;
  } {
    const pattern = this.getMigrationPattern(species);
    const avgTemp = this.getSeasonalWaterTemperature(date.getMonth());
    const probability = this.calculateMigrationProbability(species, date, avgTemp, baseLocation);
    
    // Рекомендуемые глубины
    const recommendedDepths = [...pattern.migrationDepths];
    
    // Лучшие места в зависимости от типа миграции
    const bestLocations = this.getBestLocationsByMigrationType(pattern.type, date.getMonth());
    
    // Тактики ловли
    const tactics = this.getMigrationTactics(species, pattern.type, date.getMonth());
    
    return {
      recommendedDepths,
      bestLocations,
      tactics,
      probability
    };
  }

  /**
   * Получить сезонную доступность видов
   */
  getSeasonalAvailability(species: FishSpecies): SeasonalAvailability {
    const pattern = this.getMigrationPattern(species);
    
    // Определяем лучшие месяцы на основе пиковых дат
    const bestMonths: number[] = [];
    const availableMonths: number[] = [];
    
    pattern.peakDates.forEach(period => {
      const startMonth = period.startDate.getMonth();
      const endMonth = period.endDate.getMonth();
      
      // Добавляем все месяцы в диапазоне как доступные
      let currentMonth = startMonth;
      while (true) {
        availableMonths.push(currentMonth);
        if (currentMonth === endMonth) break;
        currentMonth = (currentMonth + 1) % 12;
      }
      
      // Средние месяцы периода считаем лучшими
      const midMonth = Math.round((startMonth + endMonth) / 2) % 12;
      bestMonths.push(midMonth);
    });
    
    return {
      bestMonths: [...new Set(bestMonths)], // Убираем дубликаты
      availableMonths: [...new Set(availableMonths)],
      peakPeriods: pattern.peakDates
    };
  }

  /**
   * Анализ влияния температуры воды на миграции
   */
  analyzeTemperatureImpact(
    species: FishSpecies,
    currentTemp: number,
    historicalTemps: { date: Date; temperature: number }[]
  ): {
    temperaturePreference: TemperatureRange;
    currentSuitability: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendation: string;
  } {
    // Получаем предпочтения вида по температуре
    const tempPreference = this.getSpeciesTemperaturePreference(species);
    
    // Оцениваем текущую пригодность
    const currentSuitability = this.calculateTemperatureSuitability(currentTemp, tempPreference);
    
    // Анализируем тренд
    const trend = this.analyzeTrend(historicalTemps);
    
    // Формируем рекомендацию
    const recommendation = this.generateTemperatureRecommendation(
      species,
      currentTemp,
      tempPreference,
      trend
    );
    
    return {
      temperaturePreference: tempPreference,
      currentSuitability,
      trend,
      recommendation
    };
  }

  // Приватные вспомогательные методы

  private getTemperatureMultiplier(species: FishSpecies, waterTemp: number): number {
    const preference = this.getSpeciesTemperaturePreference(species);
    
    if (waterTemp >= preference.minTemp && waterTemp <= preference.maxTemp) {
      // В оптимальном диапазоне
      if (waterTemp >= preference.optimalTemp - 2 && waterTemp <= preference.optimalTemp + 2) {
        return 1.2; // Бонус за оптимальную температуру
      }
      return 1.0;
    } else {
      // Вне оптимального диапазона
      const deviation = Math.min(
        Math.abs(waterTemp - preference.minTemp),
        Math.abs(waterTemp - preference.maxTemp)
      );
      return Math.max(0.3, 1.0 - (deviation / 10)); // Штраф за отклонение
    }
  }

  private getLocationMultiplier(species: FishSpecies, location: FishingLocation): number {
    const pattern = this.getMigrationPattern(species);
    
    // Базовая оценка на основе расстояния от берега
    let multiplier = 1.0;
    
    if (pattern.type === MigrationType.ANADROMOUS && location.distanceFromShore < 5) {
      multiplier = 1.3; // Близко к берегу для проходных видов
    } else if (pattern.type === MigrationType.OCEANODROMOUS && location.distanceFromShore > 10) {
      multiplier = 1.2; // Далеко от берега для океанских видов
    } else if (pattern.type === MigrationType.RESIDENT) {
      multiplier = 1.1; // Местные виды менее зависимы от локации
    }
    
    return multiplier;
  }

  private getSeasonMultiplier(species: FishSpecies, month: number): number {
    const pattern = this.getMigrationPattern(species);
    
    // Проверяем, попадает ли месяц в активный период
    for (const period of pattern.peakDates) {
      const startMonth = period.startDate.getMonth();
      const endMonth = period.endDate.getMonth();
      
      if (month >= startMonth && month <= endMonth) {
        return 1.0; // Активный период
      }
    }
    
    return 0.6; // Неактивный период
  }

  private getSeasonalWaterTemperature(month: number): number {
    // Упрощенная модель температуры воды у берегов Португалии
    const tempMap = [
      15, 15, 16, 17, 18, 20, // Зима-весна
      22, 23, 22, 20, 18, 16  // Лето-осень
    ];
    return tempMap[month] || 18;
  }

  private determineEventType(
    period: DateRange,
    queryStart: Date,
    queryEnd: Date
  ): 'arrival' | 'peak' | 'departure' {
    const periodDuration = period.endDate.getTime() - period.startDate.getTime();
    const midPoint = new Date(period.startDate.getTime() + periodDuration / 2);
    
    if (queryStart <= period.startDate) return 'arrival';
    if (queryEnd >= period.endDate) return 'departure';
    if (queryStart <= midPoint && queryEnd >= midPoint) return 'peak';
    
    return queryStart < midPoint ? 'arrival' : 'departure';
  }

  private periodsOverlap(period1: DateRange, period2: DateRange): boolean {
    return period1.startDate <= period2.endDate && period2.startDate <= period1.endDate;
  }

  private getEventTypeDescription(type: string): string {
    const descriptions = {
      arrival: 'прибытие в регион',
      peak: 'пик активности',
      departure: 'отбытие из региона'
    };
    return descriptions[type as keyof typeof descriptions] || 'миграционное событие';
  }

  private getBestLocationsByMigrationType(type: MigrationType, month: number): string[] {
    const baseLocations = [
      'Каскаишская банка',
      'Рифы у мыса Рока',
      'Глубоководные каньоны',
      'Прибрежная зона Эшторила'
    ];
    
    switch (type) {
      case MigrationType.ANADROMOUS:
        return ['Устья рек', 'Лагуны', 'Прибрежные заливы', ...baseLocations.slice(0, 2)];
      case MigrationType.OCEANODROMOUS:
        return ['Открытый океан', 'Континентальный шельф', ...baseLocations];
      case MigrationType.RESIDENT:
        return baseLocations;
      default:
        return baseLocations;
    }
  }

  private getMigrationTactics(species: FishSpecies, type: MigrationType, month: number): string[] {
    const baseTactics = ['Троллинг вдоль миграционных путей', 'Использование эхолота'];
    
    switch (type) {
      case MigrationType.ANADROMOUS:
        return [...baseTactics, 'Ловля в устьях рек', 'Использование натуральных приманок'];
      case MigrationType.OCEANODROMOUS:
        return [...baseTactics, 'Глубоководный троллинг', 'Следование за стаями', 'Поиск птичьих базаров'];
      case MigrationType.RESIDENT:
        return ['Ловля у структур', 'Изучение рельефа дна', 'Постоянные места'];
      default:
        return baseTactics;
    }
  }

  private getSpeciesTemperaturePreference(species: FishSpecies): TemperatureRange {
    const preferences: Record<FishSpecies, TemperatureRange> = {
      [FishSpecies.TUNA]: { minTemp: 18, maxTemp: 26, optimalTemp: 22 },
      [FishSpecies.DORADO]: { minTemp: 20, maxTemp: 28, optimalTemp: 24 },
      [FishSpecies.SARDINE]: { minTemp: 14, maxTemp: 22, optimalTemp: 18 },
      [FishSpecies.MACKEREL]: { minTemp: 12, maxTemp: 20, optimalTemp: 16 },
      [FishSpecies.SEABASS]: { minTemp: 10, maxTemp: 24, optimalTemp: 17 },
      [FishSpecies.BLUE_MARLIN]: { minTemp: 22, maxTemp: 30, optimalTemp: 26 },
      [FishSpecies.SWORDFISH]: { minTemp: 18, maxTemp: 28, optimalTemp: 23 },
      // Для остальных видов используем средние значения
      ...Object.fromEntries(
        Object.values(FishSpecies)
          .filter(s => ![FishSpecies.TUNA, FishSpecies.DORADO, FishSpecies.SARDINE, 
                        FishSpecies.MACKEREL, FishSpecies.SEABASS, FishSpecies.BLUE_MARLIN,
                        FishSpecies.SWORDFISH].includes(s))
          .map(species => [species, { minTemp: 15, maxTemp: 25, optimalTemp: 20 }])
      )
    };
    
    return preferences[species];
  }

  private calculateTemperatureSuitability(currentTemp: number, preference: TemperatureRange): number {
    if (currentTemp < preference.minTemp || currentTemp > preference.maxTemp) {
      return 0.2; // Очень низкая пригодность
    }
    
    const optimalRange = 2; // ±2°C от оптимальной
    if (Math.abs(currentTemp - preference.optimalTemp) <= optimalRange) {
      return 1.0; // Максимальная пригодность
    }
    
    const distanceFromOptimal = Math.abs(currentTemp - preference.optimalTemp);
    const maxDistance = Math.max(
      preference.optimalTemp - preference.minTemp,
      preference.maxTemp - preference.optimalTemp
    );
    
    return Math.max(0.3, 1.0 - (distanceFromOptimal / maxDistance));
  }

  private analyzeTrend(historicalTemps: { date: Date; temperature: number }[]): 'increasing' | 'decreasing' | 'stable' {
    if (historicalTemps.length < 2) return 'stable';
    
    const recentTemps = historicalTemps.slice(-7); // Последние 7 дней
    const oldTemps = historicalTemps.slice(0, 7); // Первые 7 дней
    
    const recentAvg = recentTemps.reduce((sum, t) => sum + t.temperature, 0) / recentTemps.length;
    const oldAvg = oldTemps.reduce((sum, t) => sum + t.temperature, 0) / oldTemps.length;
    
    const difference = recentAvg - oldAvg;
    
    if (difference > 0.5) return 'increasing';
    if (difference < -0.5) return 'decreasing';
    return 'stable';
  }

  private generateTemperatureRecommendation(
    species: FishSpecies,
    currentTemp: number,
    preference: TemperatureRange,
    trend: 'increasing' | 'decreasing' | 'stable'
  ): string {
    const suitability = this.calculateTemperatureSuitability(currentTemp, preference);
    
    if (suitability >= 0.8) {
      return `Отличные температурные условия для ${species}. ${trend === 'stable' ? 'Стабильная температура способствует активности.' : `Тренд ${trend === 'increasing' ? 'повышения' : 'понижения'} может ${trend === 'increasing' ? 'усилить' : 'снизить'} активность.`}`;
    } else if (suitability >= 0.5) {
      return `Умеренно подходящие условия. Рекомендуется искать ${currentTemp < preference.optimalTemp ? 'более теплые' : 'более прохладные'} воды.`;
    } else {
      return `Неблагоприятная температура воды. Рассмотрите другие виды рыб или смените глубину ловли.`;
    }
  }
}

// Экспорт singleton экземпляра
export const migrationService = new MigrationService();

// Экспорт класса
export default MigrationService;
