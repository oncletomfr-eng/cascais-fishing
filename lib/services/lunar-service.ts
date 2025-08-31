import { 
  SearchMoonQuarter,
  MoonPhase,
  MakeTime,
  SearchMoonPhase,
  FindMoonPhase,
  MoonIllumination,
  Moon
} from 'astronomy-engine';
import { Solar, Lunar } from 'lunar-javascript';
import { 
  LunarPhase, 
  FishingConditions,
  LunarInfluence,
  FishActivityLevel,
  FishingImpactLevel,
  ChineseLunarDay,
  MarineCalendarConfig
} from '../types/marine-calendar';
import type { LunarPhaseType } from '@prisma/client';

/**
 * Сервис для расчета лунных фаз и их влияния на рыбалку
 * Использует astronomy-engine для точных астрономических расчетов
 * и lunar-javascript для китайского лунного календаря
 */
export class LunarService {
  private config: MarineCalendarConfig;
  
  constructor(config?: Partial<MarineCalendarConfig>) {
    this.config = {
      timezone: 'UTC',
      units: {
        temperature: 'celsius',
        distance: 'metric',
        weight: 'kg'
      },
      locale: 'ru',
      includeChineseLunar: true,
      historicalDataDepth: 365,
      ...config
    };
  }

  /**
   * Рассчитать лунную фазу для конкретной даты
   */
  async calculateLunarPhase(date: Date): Promise<LunarPhase> {
    const time = MakeTime(date);
    
    // Получение фазы луны в градусах (0-360)
    const phaseAngle = MoonPhase(time);
    
    // Получение освещенности луны (0-1)
    const illuminationInfo = MoonIllumination(time);
    const illumination = illuminationInfo.phase_fraction * 100; // Процент
    
    // Получение расстояния до луны и видимого диаметра
    const moonPos = Moon(time);
    const distanceKm = moonPos.distance_km;
    const apparentDiameter = moonPos.angular_diameter * (Math.PI / 180); // Конвертируем в радианы, потом в градусы

    // Определение типа фазы
    const phaseType = this.determinePhaseType(phaseAngle);
    
    return {
      type: phaseType,
      nameRu: this.getPhaseNameRu(phaseType),
      nameEn: this.getPhaseNameEn(phaseType),
      angle: phaseAngle,
      illumination: illumination,
      dateTime: date,
    };
  }

  /**
   * Получить китайские лунные данные
   */
  getChineseLunarData(date: Date): ChineseLunarDay | null {
    if (!this.config.includeChineseLunar) return null;

    try {
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();
      
      // Получение благоприятных и неблагоприятных действий
      const lunarDay = lunar.getDay();
      const dayInfo = lunarDay ? {
        // Это упрощенная версия - полную информацию можно получить из API lunar-javascript
        auspiciousActivities: this.getFishingAuspiciousActivities(lunar),
        inauspiciousActivities: this.getFishingInauspiciousActivities(lunar)
      } : { auspiciousActivities: [], inauspiciousActivities: [] };

      return {
        year: lunar.getYearInChinese(),
        month: lunar.getMonthInChinese(),
        day: lunar.getDayInChinese(),
        auspiciousActivities: dayInfo.auspiciousActivities,
        inauspiciousActivities: dayInfo.inauspiciousActivities,
        zodiacSign: lunar.getYearShengXiao(),
        element: lunar.getYearNaYin()
      };
    } catch (error) {
      console.error('Ошибка получения китайских лунных данных:', error);
      return null;
    }
  }

  /**
   * Рассчитать влияние лунной фазы на рыбалку
   */
  calculateLunarInfluence(lunarPhase: LunarPhase): LunarInfluence {
    const { type, illumination, angle } = lunarPhase;
    
    // Базовая сила влияния в зависимости от фазы
    let strength = this.getPhaseInfluenceStrength(type);
    
    // Корректировка по освещенности
    strength *= this.getIlluminationMultiplier(illumination);
    
    // Определение активности рыбы
    const fishActivity = this.determineFishActivity(strength);
    
    // Рекомендуемые снасти
    const recommendedTackle = this.getRecommendedTackle(type, fishActivity);
    
    // Описание влияния
    const description = this.getInfluenceDescription(type, strength, fishActivity);
    
    return {
      strength: Math.round(strength * 10) / 10, // Округляем до 1 знака
      description,
      fishActivity,
      recommendedTackle
    };
  }

  /**
   * Получить лучшие часы для рыбалки на основе лунной фазы
   */
  getBestFishingHours(date: Date, lunarPhase: LunarPhase): { start: Date; end: Date; description: string; rating: number }[] {
    const hours: { start: Date; end: Date; description: string; rating: number }[] = [];
    
    // Время восхода и заката луны (упрощенно)
    const moonTimes = this.calculateMoonTimes(date);
    
    // Основные периоды активности
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);
    
    // Рассвет (за час до восхода солнца)
    const dawn = new Date(baseDate);
    dawn.setHours(6, 0, 0, 0); // Примерно 6:00 для Кашкайша
    hours.push({
      start: new Date(dawn.getTime() - 60 * 60 * 1000),
      end: new Date(dawn.getTime() + 60 * 60 * 1000),
      description: 'Рассветная активность',
      rating: this.getRatingForPhase(lunarPhase.type, 'dawn')
    });

    // Закат (час после заката солнца)
    const dusk = new Date(baseDate);
    dusk.setHours(19, 30, 0, 0); // Примерно 19:30 для Кашкайша
    hours.push({
      start: new Date(dusk.getTime() - 30 * 60 * 1000),
      end: new Date(dusk.getTime() + 90 * 60 * 1000),
      description: 'Вечерняя активность',
      rating: this.getRatingForPhase(lunarPhase.type, 'dusk')
    });

    // Полуночные часы (если подходящая фаза)
    if ([LunarPhaseType.FULL_MOON, LunarPhaseType.NEW_MOON].includes(lunarPhase.type)) {
      const midnight = new Date(baseDate);
      midnight.setHours(23, 0, 0, 0);
      hours.push({
        start: midnight,
        end: new Date(midnight.getTime() + 2 * 60 * 60 * 1000),
        description: `Ночная активность (${lunarPhase.type === LunarPhaseType.FULL_MOON ? 'полнолуние' : 'новолуние'})`,
        rating: this.getRatingForPhase(lunarPhase.type, 'midnight')
      });
    }

    return hours.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Определить тип фазы по углу
   */
  private determinePhaseType(angle: number): LunarPhaseType {
    // Нормализуем угол к диапазону 0-360
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

  /**
   * Получить название фазы на русском
   */
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

  /**
   * Получить название фазы на английском
   */
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

  /**
   * Получить силу влияния фазы (базовое значение)
   */
  private getPhaseInfluenceStrength(type: LunarPhaseType): number {
    const strengths = {
      [LunarPhaseType.NEW_MOON]: 8.5,        // Очень высокая активность
      [LunarPhaseType.WAXING_CRESCENT]: 6.0, // Средняя активность
      [LunarPhaseType.FIRST_QUARTER]: 7.5,   // Высокая активность
      [LunarPhaseType.WAXING_GIBBOUS]: 6.5,  // Умеренно высокая
      [LunarPhaseType.FULL_MOON]: 9.0,       // Максимальная активность
      [LunarPhaseType.WANING_GIBBOUS]: 7.0,  // Высокая активность
      [LunarPhaseType.LAST_QUARTER]: 7.5,    // Высокая активность
      [LunarPhaseType.WANING_CRESCENT]: 5.5  // Умеренная активность
    };
    return strengths[type];
  }

  /**
   * Получить мультипликатор освещенности
   */
  private getIlluminationMultiplier(illumination: number): number {
    // Очень темные и очень светлые периоды лучше для рыбалки
    if (illumination < 10 || illumination > 90) {
      return 1.1; // +10%
    } else if (illumination > 45 && illumination < 55) {
      return 0.9; // -10% (средняя освещенность менее оптимальна)
    }
    return 1.0;
  }

  /**
   * Определить активность рыбы
   */
  private determineFishActivity(strength: number): FishActivityLevel {
    if (strength >= 8.5) return FishActivityLevel.VERY_HIGH;
    if (strength >= 7.0) return FishActivityLevel.HIGH;
    if (strength >= 5.5) return FishActivityLevel.MODERATE;
    if (strength >= 4.0) return FishActivityLevel.LOW;
    return FishActivityLevel.VERY_LOW;
  }

  /**
   * Получить рекомендуемые снасти
   */
  private getRecommendedTackle(type: LunarPhaseType, activity: FishActivityLevel): string[] {
    const baseTackle = ['Спиннинг', 'Донная снасть', 'Поплавочная удочка'];
    
    if (type === LunarPhaseType.FULL_MOON) {
      return [...baseTackle, 'Ночная ловля', 'Светящиеся приманки', 'Тихие воблеры'];
    }
    
    if (type === LunarPhaseType.NEW_MOON) {
      return [...baseTackle, 'Яркие приманки', 'Шумовые воблеры', 'Джиг с погремушкой'];
    }
    
    if (activity === FishActivityLevel.VERY_HIGH) {
      return [...baseTackle, 'Быстрая проводка', 'Активные приманки', 'Троллинг'];
    }
    
    if (activity === FishActivityLevel.LOW) {
      return ['Донная снасть', 'Медленная проводка', 'Натуральные приманки', 'Фидер'];
    }
    
    return baseTackle;
  }

  /**
   * Получить описание влияния
   */
  private getInfluenceDescription(type: LunarPhaseType, strength: number, activity: FishActivityLevel): string {
    const phaseDescriptions = {
      [LunarPhaseType.NEW_MOON]: 'Новолуние создает идеальные условия для ночной рыбалки. Рыба активна из-за минимальной освещенности.',
      [LunarPhaseType.WAXING_CRESCENT]: 'Растущий месяц способствует увеличению активности рыбы, особенно в вечерние часы.',
      [LunarPhaseType.FIRST_QUARTER]: 'Первая четверть - отличное время для рыбалки. Умеренное лунное освещение привлекает добычу.',
      [LunarPhaseType.WAXING_GIBBOUS]: 'Растущая луна создает хорошие условия, рыба готовится к максимальной активности полнолуния.',
      [LunarPhaseType.FULL_MOON]: 'Полнолуние - пик активности! Максимальное влияние на поведение рыбы и планктон.',
      [LunarPhaseType.WANING_GIBBOUS]: 'После полнолуния рыба остается активной, но постепенно снижает интенсивность.',
      [LunarPhaseType.LAST_QUARTER]: 'Последняя четверть дает хорошие результаты, особенно для опытных рыболовов.',
      [LunarPhaseType.WANING_CRESCENT]: 'Убывающий месяц требует более терпеливого подхода, но может принести неожиданные трофеи.'
    };
    
    const activityDescription = {
      [FishActivityLevel.VERY_HIGH]: 'Рыба очень активна, хватает практически любую приманку.',
      [FishActivityLevel.HIGH]: 'Высокая активность рыбы, отличные шансы на хороший улов.',
      [FishActivityLevel.MODERATE]: 'Умеренная активность, требуется правильный выбор приманки.',
      [FishActivityLevel.LOW]: 'Низкая активность, рекомендуется терпеливая ловля на дне.',
      [FishActivityLevel.VERY_LOW]: 'Очень низкая активность, лучше перенести рыбалку.'
    };
    
    return `${phaseDescriptions[type]} ${activityDescription[activity]}`;
  }

  /**
   * Получить рейтинг для конкретного времени суток и фазы
   */
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

  /**
   * Рассчитать времена восхода и заката луны (упрощенно)
   */
  private calculateMoonTimes(date: Date): { moonrise: Date; moonset: Date } {
    // Упрощенный расчет - в реальном приложении нужно использовать точные астрономические формулы
    const baseDate = new Date(date);
    
    const moonrise = new Date(baseDate);
    moonrise.setHours(20, 30, 0, 0); // Примерное время
    
    const moonset = new Date(baseDate);
    moonset.setHours(6, 30, 0, 0); // Примерное время
    
    return { moonrise, moonset };
  }

  /**
   * Получить благоприятные действия для рыбалки из китайского календаря
   */
  private getFishingAuspiciousActivities(lunar: any): string[] {
    // Упрощенная версия - в реальности нужно анализировать полную информацию из lunar-javascript
    const activities = [
      'Ловля крупной рыбы',
      'Использование живца',
      'Рыбалка на глубине',
      'Ночная ловля',
      'Троллинг',
      'Спиннинг'
    ];
    
    // Случайно выбираем 2-4 активности (в реальности - на основе календарных данных)
    const selectedCount = Math.floor(Math.random() * 3) + 2;
    return activities.slice(0, selectedCount);
  }

  /**
   * Получить неблагоприятные действия для рыбалки
   */
  private getFishingInauspiciousActivities(lunar: any): string[] {
    const activities = [
      'Шумные приманки',
      'Яркое освещение',
      'Быстрая смена мест',
      'Ловля в одиночку'
    ];
    
    const selectedCount = Math.floor(Math.random() * 2) + 1;
    return activities.slice(0, selectedCount);
  }

  /**
   * Получить прогноз лунных фаз на период
   */
  async getLunarPhasesForPeriod(startDate: Date, endDate: Date): Promise<LunarPhase[]> {
    const phases: LunarPhase[] = [];
    const currentDate = new Date(startDate);
    
    // Рассчитываем фазы для каждого дня в периоде
    while (currentDate <= endDate) {
      const phase = await this.calculateLunarPhase(new Date(currentDate));
      phases.push(phase);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return phases;
  }

  /**
   * Найти ближайшие значимые лунные события
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

    const startTime = MakeTime(fromDate);
    const endDate = new Date(fromDate.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    try {
      // Поиск четвертей луны
      let quarterSearch = SearchMoonQuarter(startTime);
      
      while (quarterSearch.time.date <= endDate) {
        const eventDate = quarterSearch.time.date;
        
        if (quarterSearch.quarter === 0) { // Новолуние
          events.newMoons.push(eventDate);
        } else if (quarterSearch.quarter === 2) { // Полнолуние
          events.fullMoons.push(eventDate);
        } else { // Четверти
          events.quarters.push(eventDate);
        }
        
        // Искать следующее событие
        quarterSearch = SearchMoonQuarter(MakeTime(new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)));
      }
    } catch (error) {
      console.error('Ошибка поиска лунных событий:', error);
    }
    
    return events;
  }
}

// Экспорт singleton экземпляра для удобства использования
export const lunarService = new LunarService();

// Экспорт класса для создания кастомных экземпляров
export default LunarService;
