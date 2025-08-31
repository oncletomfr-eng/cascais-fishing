import { LunarPhase, LunarInfluence, FishActivityLevel } from '../types/marine-calendar';
import type { LunarPhaseType } from '@prisma/client';

/**
 * Упрощенный сервис для расчета лунных фаз (без внешних библиотек)
 * Для тестирования и демонстрации функциональности
 */
export class SimpleLunarService {
  
  /**
   * Рассчитать приблизительную лунную фазу для даты (упрощенный алгоритм)
   */
  async calculateLunarPhase(date: Date): Promise<LunarPhase> {
    // Упрощенный расчет на основе даты (каждые 29.5 дней цикл)
    const lunarCycleLength = 29.53058867; // дней
    const knownNewMoon = new Date('2025-01-29T00:00:00Z').getTime(); // Известное новолуние
    
    const daysSinceKnownNewMoon = (date.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
    const currentCyclePosition = ((daysSinceKnownNewMoon % lunarCycleLength) + lunarCycleLength) % lunarCycleLength;
    
    // Определяем фазу и угол
    const angle = (currentCyclePosition / lunarCycleLength) * 360;
    const phaseType = this.determinePhaseType(angle);
    
    // Рассчитываем освещенность (0-100%)
    const illumination = 50 * (1 - Math.cos(angle * Math.PI / 180));
    
    return {
      type: phaseType,
      nameRu: this.getPhaseNameRu(phaseType),
      nameEn: this.getPhaseNameEn(phaseType),
      angle: Math.round(angle * 10) / 10,
      illumination: Math.round(illumination * 10) / 10,
      dateTime: date
    };
  }

  /**
   * Рассчитать влияние лунной фазы на рыбалку
   */
  calculateLunarInfluence(lunarPhase: LunarPhase): LunarInfluence {
    const { type, illumination } = lunarPhase;
    
    // Базовая сила влияния
    let strength = this.getPhaseInfluenceStrength(type);
    
    // Корректировка по освещенности
    if (illumination < 10 || illumination > 90) {
      strength *= 1.1; // Крайние фазы лучше
    }
    
    const fishActivity = this.determineFishActivity(strength);
    const recommendedTackle = this.getRecommendedTackle(type, fishActivity);
    const description = this.getInfluenceDescription(type, strength, fishActivity);
    
    return {
      strength: Math.round(strength * 10) / 10,
      description,
      fishActivity,
      recommendedTackle
    };
  }

  /**
   * Получить лучшие часы для рыбалки
   */
  getBestFishingHours(date: Date, lunarPhase: LunarPhase): { start: Date; end: Date; description: string; rating: number }[] {
    const hours = [];
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);
    
    // Рассвет (6:00-8:00)
    const dawn = new Date(baseDate);
    dawn.setHours(6, 0, 0, 0);
    hours.push({
      start: dawn,
      end: new Date(dawn.getTime() + 2 * 60 * 60 * 1000),
      description: 'Рассветная активность',
      rating: this.getRatingForPhase(lunarPhase.type, 'dawn')
    });

    // Закат (19:00-21:00)
    const dusk = new Date(baseDate);
    dusk.setHours(19, 0, 0, 0);
    hours.push({
      start: dusk,
      end: new Date(dusk.getTime() + 2 * 60 * 60 * 1000),
      description: 'Вечерняя активность',
      rating: this.getRatingForPhase(lunarPhase.type, 'dusk')
    });

    // Ночные часы для полнолуния/новолуния
    if ([LunarPhaseType.FULL_MOON, LunarPhaseType.NEW_MOON].includes(lunarPhase.type)) {
      const midnight = new Date(baseDate);
      midnight.setHours(23, 0, 0, 0);
      hours.push({
        start: midnight,
        end: new Date(midnight.getTime() + 3 * 60 * 60 * 1000),
        description: `Ночная активность (${lunarPhase.type === LunarPhaseType.FULL_MOON ? 'полнолуние' : 'новолуние'})`,
        rating: this.getRatingForPhase(lunarPhase.type, 'midnight')
      });
    }

    return hours.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Получить прогноз лунных фаз на период
   */
  async getLunarPhasesForPeriod(startDate: Date, endDate: Date): Promise<LunarPhase[]> {
    const phases: LunarPhase[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const phase = await this.calculateLunarPhase(new Date(currentDate));
      phases.push(phase);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return phases;
  }

  /**
   * Найти ближайшие значимые лунные события (упрощенно)
   */
  async getUpcomingLunarEvents(fromDate: Date, daysAhead: number = 30): Promise<{
    newMoons: Date[];
    fullMoons: Date[];
    quarters: Date[];
  }> {
    const events = {
      newMoons: [] as Date[],
      fullMoons: [] as Date[],
      quarters: [] as Date[]
    };

    // Упрощенный поиск - проверяем каждый день
    for (let i = 0; i < daysAhead; i++) {
      const checkDate = new Date(fromDate.getTime() + i * 24 * 60 * 60 * 1000);
      const phase = await this.calculateLunarPhase(checkDate);
      
      if (phase.type === LunarPhaseType.NEW_MOON && !this.hasDateInArray(events.newMoons, checkDate)) {
        events.newMoons.push(checkDate);
      } else if (phase.type === LunarPhaseType.FULL_MOON && !this.hasDateInArray(events.fullMoons, checkDate)) {
        events.fullMoons.push(checkDate);
      } else if ([LunarPhaseType.FIRST_QUARTER, LunarPhaseType.LAST_QUARTER].includes(phase.type) && !this.hasDateInArray(events.quarters, checkDate)) {
        events.quarters.push(checkDate);
      }
    }
    
    return events;
  }

  // Приватные методы

  private determinePhaseType(angle: number): LunarPhaseType {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    if (normalizedAngle < 22.5 || normalizedAngle >= 337.5) {
      return LunarPhaseType.NEW_MOON;
    } else if (normalizedAngle < 67.5) {
      return LunarPhaseType.WAXING_CRESCENT;
    } else if (normalizedAngle < 112.5) {
      return LunarPhaseType.FIRST_QUARTER;
    } else if (normalizedAngle < 157.5) {
      return LunarPhaseType.WAXING_GIBBOUS;
    } else if (normalizedAngle < 202.5) {
      return LunarPhaseType.FULL_MOON;
    } else if (normalizedAngle < 247.5) {
      return LunarPhaseType.WANING_GIBBOUS;
    } else if (normalizedAngle < 292.5) {
      return LunarPhaseType.LAST_QUARTER;
    } else {
      return LunarPhaseType.WANING_CRESCENT;
    }
  }

  private getPhaseNameRu(type: LunarPhaseType): string {
    const names = {
      [LunarPhaseType.NEW_MOON]: 'Новолуние',
      [LunarPhaseType.WAXING_CRESCENT]: 'Растущий месяц',
      [LunarPhaseType.FIRST_QUARTER]: 'Первая четверть',
      [LunarPhaseType.WAXING_GIBBOUS]: 'Растущая луна',
      [LunarPhaseType.FULL_MOON]: 'Полнолуние',
      [LunarPhaseType.WANING_GIBBOUS]: 'Убывающая луна',
      [LunarPhaseType.LAST_QUARTER]: 'Последняя четверть',
      [LunarPhaseType.WANING_CRESCENT]: 'Убывающий месяц'
    };
    return names[type];
  }

  private getPhaseNameEn(type: LunarPhaseType): string {
    const names = {
      [LunarPhaseType.NEW_MOON]: 'New Moon',
      [LunarPhaseType.WAXING_CRESCENT]: 'Waxing Crescent',
      [LunarPhaseType.FIRST_QUARTER]: 'First Quarter',
      [LunarPhaseType.WAXING_GIBBOUS]: 'Waxing Gibbous',
      [LunarPhaseType.FULL_MOON]: 'Full Moon',
      [LunarPhaseType.WANING_GIBBOUS]: 'Waning Gibbous',
      [LunarPhaseType.LAST_QUARTER]: 'Last Quarter',
      [LunarPhaseType.WANING_CRESCENT]: 'Waning Crescent'
    };
    return names[type];
  }

  private getPhaseInfluenceStrength(type: LunarPhaseType): number {
    const strengths = {
      [LunarPhaseType.NEW_MOON]: 8.5,
      [LunarPhaseType.WAXING_CRESCENT]: 6.0,
      [LunarPhaseType.FIRST_QUARTER]: 7.5,
      [LunarPhaseType.WAXING_GIBBOUS]: 6.5,
      [LunarPhaseType.FULL_MOON]: 9.0,
      [LunarPhaseType.WANING_GIBBOUS]: 7.0,
      [LunarPhaseType.LAST_QUARTER]: 7.5,
      [LunarPhaseType.WANING_CRESCENT]: 5.5
    };
    return strengths[type];
  }

  private determineFishActivity(strength: number): FishActivityLevel {
    if (strength >= 8.5) return FishActivityLevel.VERY_HIGH;
    if (strength >= 7.0) return FishActivityLevel.HIGH;
    if (strength >= 5.5) return FishActivityLevel.MODERATE;
    if (strength >= 4.0) return FishActivityLevel.LOW;
    return FishActivityLevel.VERY_LOW;
  }

  private getRecommendedTackle(type: LunarPhaseType, activity: FishActivityLevel): string[] {
    const baseTackle = ['Спиннинг', 'Донная снасть', 'Поплавочная удочка'];
    
    if (type === LunarPhaseType.FULL_MOON) {
      return [...baseTackle, 'Ночная ловля', 'Светящиеся приманки'];
    }
    
    if (type === LunarPhaseType.NEW_MOON) {
      return [...baseTackle, 'Яркие приманки', 'Шумовые воблеры'];
    }
    
    if (activity === FishActivityLevel.VERY_HIGH) {
      return [...baseTackle, 'Быстрая проводка', 'Активные приманки'];
    }
    
    return baseTackle;
  }

  private getInfluenceDescription(type: LunarPhaseType, strength: number, activity: FishActivityLevel): string {
    const phaseDescriptions = {
      [LunarPhaseType.NEW_MOON]: 'Новолуние создает отличные условия для рыбалки. Минимальная освещенность активизирует рыбу.',
      [LunarPhaseType.WAXING_CRESCENT]: 'Растущий месяц способствует повышению активности рыбы.',
      [LunarPhaseType.FIRST_QUARTER]: 'Первая четверть - хорошее время для рыбалки.',
      [LunarPhaseType.WAXING_GIBBOUS]: 'Растущая луна создает благоприятные условия.',
      [LunarPhaseType.FULL_MOON]: 'Полнолуние - максимальное влияние на поведение рыбы!',
      [LunarPhaseType.WANING_GIBBOUS]: 'После полнолуния рыба остается достаточно активной.',
      [LunarPhaseType.LAST_QUARTER]: 'Последняя четверть дает стабильные результаты.',
      [LunarPhaseType.WANING_CRESCENT]: 'Убывающий месяц требует более терпеливого подхода.'
    };
    
    const activityText = activity === FishActivityLevel.VERY_HIGH ? 'Рыба очень активна!' :
      activity === FishActivityLevel.HIGH ? 'Высокая активность рыбы.' :
      activity === FishActivityLevel.MODERATE ? 'Умеренная активность.' :
      'Низкая активность, нужно терпение.';
    
    return `${phaseDescriptions[type]} ${activityText}`;
  }

  private getRatingForPhase(type: LunarPhaseType, timeOfDay: 'dawn' | 'dusk' | 'midnight'): number {
    const ratings = {
      [LunarPhaseType.NEW_MOON]: { dawn: 8, dusk: 9, midnight: 10 },
      [LunarPhaseType.WAXING_CRESCENT]: { dawn: 6, dusk: 7, midnight: 5 },
      [LunarPhaseType.FIRST_QUARTER]: { dawn: 7, dusk: 8, midnight: 6 },
      [LunarPhaseType.WAXING_GIBBOUS]: { dawn: 6, dusk: 7, midnight: 7 },
      [LunarPhaseType.FULL_MOON]: { dawn: 7, dusk: 8, midnight: 10 },
      [LunarPhaseType.WANING_GIBBOUS]: { dawn: 7, dusk: 8, midnight: 7 },
      [LunarPhaseType.LAST_QUARTER]: { dawn: 8, dusk: 7, midnight: 6 },
      [LunarPhaseType.WANING_CRESCENT]: { dawn: 6, dusk: 6, midnight: 4 }
    };
    
    return ratings[type][timeOfDay];
  }

  private hasDateInArray(dates: Date[], targetDate: Date): boolean {
    return dates.some(date => 
      date.getFullYear() === targetDate.getFullYear() &&
      date.getMonth() === targetDate.getMonth() &&
      date.getDate() === targetDate.getDate()
    );
  }
}

// Экспорт singleton экземпляра
export const simpleLunarService = new SimpleLunarService();
export default SimpleLunarService;
