import * as Astronomy from 'astronomy-engine';
import { Solar, Lunar } from 'lunar-javascript';
import { 
  LunarPhase, 
  LunarPhaseType, 
  FishingConditions, 
  LunarInfluence,
  FishActivityLevel,
  FishingImpactLevel,
  ChineseLunarData,
  MarineCalendarConfig
} from '../types/marine-calendar';

export class RealLunarService {
  private config: MarineCalendarConfig;

  constructor(config?: Partial<MarineCalendarConfig>) {
    this.config = {
      location: {
        latitude: 38.7071,  // Cascais coordinates
        longitude: -9.4212,
        timeZone: 'Europe/Lisbon'
      },
      ...config
    };
  }

  /**
   * Получает точные лунные фазы с использованием astronomy-engine
   */
  async getLunarPhases(startDate: Date, endDate: Date): Promise<LunarPhase[]> {
    const phases: LunarPhase[] = [];
    
    try {
      // Если запрашивается только один день, найти ближайшую фазу
      const isSingleDay = startDate.toDateString() === endDate.toDateString();
      
      if (isSingleDay) {
        // Ищем ближайшую фазу к указанной дате (в пределах ±15 дней)
        const searchStart = new Date(startDate.getTime() - 15 * 24 * 60 * 60 * 1000);
        const searchTime = new Astronomy.AstroTime(searchStart);
        
        // Ищем следующие несколько четвертей, чтобы найти ближайшую
        let quarterInfo = Astronomy.SearchMoonQuarter(searchTime);
        let closestPhase: any = null;
        let minDistance = Number.MAX_VALUE;
        
        for (let i = 0; i < 8; i++) { // Проверяем 8 четвертей (2 месяца)
          if (quarterInfo) {
            const distance = Math.abs(quarterInfo.time.date.getTime() - startDate.getTime());
            if (distance < minDistance) {
              minDistance = distance;
              closestPhase = quarterInfo;
            }
            
            // Получаем следующую четверть
            quarterInfo = Astronomy.NextMoonQuarter(quarterInfo);
          } else {
            break;
          }
        }
        
        if (closestPhase) {
          const chineseData = this.getChineseLunarData(closestPhase.time.date);
          const influence = this.calculateLunarInfluence(closestPhase);
          
          const phase: LunarPhase = {
            date: closestPhase.time.date,
            type: this.mapQuarterToPhaseType(closestPhase.quarter),
            illumination: this.calculateIllumination(closestPhase.time.date),
            angle: Astronomy.MoonPhase(closestPhase.time),
            distance: this.getMoonDistance(closestPhase.time.date),
            apparentDiameter: this.getMoonApparentDiameter(closestPhase.time.date),
            rise: this.getMoonRise(closestPhase.time.date),
            set: this.getMoonSet(closestPhase.time.date),
            influence,
            chineseData
          };
          
          phases.push(phase);
        }
      } else {
        // Для диапазона дат используем оригинальную логику
        let currentTime = new Astronomy.AstroTime(startDate);
        const endTime = new Astronomy.AstroTime(endDate);

        while (currentTime.tt <= endTime.tt) {
          const quarterInfo = Astronomy.SearchMoonQuarter(currentTime);
          
          if (quarterInfo && quarterInfo.time.date <= endDate) {
            const chineseData = this.getChineseLunarData(quarterInfo.time.date);
            const influence = this.calculateLunarInfluence(quarterInfo);
            
            const phase: LunarPhase = {
              date: quarterInfo.time.date,
              type: this.mapQuarterToPhaseType(quarterInfo.quarter),
              illumination: this.calculateIllumination(quarterInfo.time.date),
              angle: Astronomy.MoonPhase(quarterInfo.time),
              distance: this.getMoonDistance(quarterInfo.time.date),
              apparentDiameter: this.getMoonApparentDiameter(quarterInfo.time.date),
              rise: this.getMoonRise(quarterInfo.time.date),
              set: this.getMoonSet(quarterInfo.time.date),
              influence,
              chineseData
            };
            
            phases.push(phase);
            
            // Переходим к следующей четверти
            currentTime = new Astronomy.AstroTime(
              new Date(quarterInfo.time.date.getTime() + 24 * 60 * 60 * 1000)
            );
          } else {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error calculating lunar phases:', error);
      // Возвращаем fallback данные
      return this.getFallbackLunarPhases(startDate, endDate);
    }

    return phases;
  }

  /**
   * Получает китайские лунные данные с использованием lunar-javascript
   */
  private getChineseLunarData(date: Date): ChineseLunarData {
    try {
      const solar = Solar.fromDate(date);
      const lunar = solar.getLunar();
      
      return {
        year: lunar.getYearInGanZhi(),
        month: lunar.getMonthInGanZhi(),
        day: lunar.getDayInGanZhi(),
        hour: lunar.getTimeZhi(),
        dayNumber: lunar.getDay(),
        monthNumber: lunar.getMonth(),
        isLeapMonth: lunar.isLeap ? lunar.isLeap() : false,
        animal: lunar.getYearShengXiao(),
        element: lunar.getDayNaYin(),
        constellation: lunar.getXiu(),
        auspiciousDirection: lunar.getDayPositionDesc(),
        favorableActivities: lunar.getDayYi() || [],
        unfavorableActivities: lunar.getDayJi() || [],
        deityDirection: lunar.getShenWei(),
        lunarFestival: lunar.getFestivals().join(', ') || null
      };
    } catch (error) {
      console.warn('Error getting Chinese lunar data:', error);
      return this.getBasicChineseLunarData(date);
    }
  }

  /**
   * Рассчитывает влияние луны на рыбалку
   */
  private calculateLunarInfluence(quarterInfo: any): LunarInfluence {
    const phaseType = this.mapQuarterToPhaseType(quarterInfo.quarter);
    
    // Определяем уровень активности рыбы на основе фазы луны
    let fishActivity: FishActivityLevel;
    let fishingImpact: FishingImpactLevel;
    let optimalTimes: string[];
    
    switch (phaseType) {
      case 'NEW_MOON':
        fishActivity = 'high';
        fishingImpact = 'very_positive';
        optimalTimes = ['00:00-02:00', '12:00-14:00'];
        break;
      case 'FIRST_QUARTER':
        fishActivity = 'moderate';
        fishingImpact = 'positive';
        optimalTimes = ['06:00-08:00', '18:00-20:00'];
        break;
      case 'FULL_MOON':
        fishActivity = 'very_high';
        fishingImpact = 'very_positive';
        optimalTimes = ['22:00-02:00', '10:00-14:00'];
        break;
      case 'LAST_QUARTER':
        fishActivity = 'moderate';
        fishingImpact = 'neutral';
        optimalTimes = ['05:00-07:00', '17:00-19:00'];
        break;
      default:
        fishActivity = 'low';
        fishingImpact = 'neutral';
        optimalTimes = ['06:00-08:00'];
    }

    return {
      fishActivity,
      fishingImpact,
      optimalTimes,
      description: this.getLunarInfluenceDescription(phaseType),
      tidalInfluence: this.calculateTidalInfluence(phaseType),
      recommendation: this.getFishingRecommendation(phaseType)
    };
  }

  /**
   * Преобразует номер четверти в тип фазы
   */
  private mapQuarterToPhaseType(quarter: number): LunarPhaseType {
    switch (quarter) {
      case 0: return 'NEW_MOON';
      case 1: return 'FIRST_QUARTER';
      case 2: return 'FULL_MOON';
      case 3: return 'LAST_QUARTER';
      default: return 'NEW_MOON';
    }
  }

  /**
   * Рассчитывает освещенность луны
   */
  private calculateIllumination(date: Date): number {
    try {
      const time = new Astronomy.AstroTime(date);
      const moonPhase = Astronomy.MoonPhase(time);
      
      // Конвертируем угол фазы в процент освещенности
      // 0° = новолуние (0%), 180° = полнолуние (100%)
      const illumination = 50 * (1 - Math.cos(moonPhase * Math.PI / 180));
      
      return Math.round(illumination * 100) / 100;
    } catch (error) {
      console.error('Error calculating illumination:', error);
      return 50; // Fallback
    }
  }

  /**
   * Получает расстояние до луны в км
   */
  private getMoonDistance(date: Date): number {
    try {
      const time = new Astronomy.AstroTime(date);
      const moonVector = Astronomy.GeoMoon(time);
      
      // Расстояние в AU, конвертируем в км
      return Math.round(moonVector.Length() * 149597870.7); // 1 AU в км
    } catch (error) {
      console.error('Error calculating moon distance:', error);
      return 384400; // Среднее расстояние
    }
  }

  /**
   * Получает видимый диаметр луны в градусах
   */
  private getMoonApparentDiameter(date: Date): number {
    try {
      const distance = this.getMoonDistance(date);
      
      // Средний радиус луны: 1737.4 км
      // Угловой диаметр = 2 * arctan(radius / distance)
      const angularDiameter = 2 * Math.atan(1737.4 / distance) * (180 / Math.PI);
      
      return Math.round(angularDiameter * 3600) / 3600; // В градусах с точностью до секунд
    } catch (error) {
      console.error('Error calculating apparent diameter:', error);
      return 0.52; // Средний видимый диаметр
    }
  }

  /**
   * Получает время восхода луны
   */
  private getMoonRise(date: Date): Date | null {
    try {
      const observer = new Astronomy.Observer(
        this.config.location.latitude, 
        this.config.location.longitude, 
        0
      );
      
      const searchTime = new Astronomy.AstroTime(date);
      const riseEvent = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, searchTime, 1);
      
      return riseEvent ? riseEvent.date : null;
    } catch (error) {
      console.error('Error calculating moonrise:', error);
      return null;
    }
  }

  /**
   * Получает время захода луны
   */
  private getMoonSet(date: Date): Date | null {
    try {
      const observer = new Astronomy.Observer(
        this.config.location.latitude, 
        this.config.location.longitude, 
        0
      );
      
      const searchTime = new Astronomy.AstroTime(date);
      const setEvent = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, searchTime, 1);
      
      return setEvent ? setEvent.date : null;
    } catch (error) {
      console.error('Error calculating moonset:', error);
      return null;
    }
  }

  /**
   * Базовые китайские лунные данные (fallback)
   */
  private getBasicChineseLunarData(date: Date): ChineseLunarData {
    return {
      year: `${date.getFullYear()}年`,
      month: `${date.getMonth() + 1}月`,
      day: `${date.getDate()}日`,
      hour: '子时',
      dayNumber: date.getDate(),
      monthNumber: date.getMonth() + 1,
      isLeapMonth: false,
      animal: '龙', // Дракон как fallback
      element: '木',
      constellation: '角宿',
      auspiciousDirection: '东北',
      favorableActivities: ['fishing', 'sailing'],
      unfavorableActivities: [],
      deityDirection: '正北',
      lunarFestival: null
    };
  }

  /**
   * Получает описание лунного влияния
   */
  private getLunarInfluenceDescription(phaseType: LunarPhaseType): string {
    const descriptions = {
      NEW_MOON: 'Новолуние - идеальное время для рыбалки. Рыба очень активна в темные ночи.',
      FIRST_QUARTER: 'Первая четверть - хорошее время для рыбалки, особенно утром и вечером.',
      FULL_MOON: 'Полнолуние - отличное время! Максимальная активность рыбы, особенно ночью.',
      LAST_QUARTER: 'Последняя четверть - умеренная активность рыбы, лучше рыбачить рано утром.'
    };
    
    return descriptions[phaseType] || 'Умеренные условия для рыбалки.';
  }

  /**
   * Рассчитывает приливное влияние
   */
  private calculateTidalInfluence(phaseType: LunarPhaseType): string {
    if (phaseType === 'NEW_MOON' || phaseType === 'FULL_MOON') {
      return 'Сизигийные приливы - максимальные приливы и отливы';
    } else {
      return 'Квадратурные приливы - умеренные приливы и отливы';
    }
  }

  /**
   * Получает рекомендацию для рыбалки
   */
  private getFishingRecommendation(phaseType: LunarPhaseType): string {
    const recommendations = {
      NEW_MOON: 'Используйте светящиеся приманки. Лучшее время: 2 часа до и после полуночи.',
      FIRST_QUARTER: 'Рыбачьте на рассвете и закате. Эффективны натуральные приманки.',
      FULL_MOON: 'Ночная рыбалка очень продуктивна. Попробуйте поверхностные приманки.',
      LAST_QUARTER: 'Раннее утро - лучшее время. Используйте тонущие приманки.'
    };
    
    return recommendations[phaseType] || 'Стандартные методы рыбалки.';
  }

  /**
   * Fallback лунные фазы при ошибках
   */
  private getFallbackLunarPhases(startDate: Date, endDate: Date): LunarPhase[] {
    console.warn('Using fallback lunar phase data');
    
    const phases: LunarPhase[] = [];
    const dayMs = 24 * 60 * 60 * 1000;
    const lunarCycleMs = 29.53 * dayMs; // Средняя продолжительность лунного цикла
    
    const current = new Date(startDate);
    while (current <= endDate) {
      const daysSinceNewMoon = ((current.getTime() - new Date(2024, 0, 11).getTime()) % lunarCycleMs) / dayMs;
      
      let phaseType: LunarPhaseType = 'new';
      if (daysSinceNewMoon < 7.38) phaseType = 'first_quarter';
      else if (daysSinceNewMoon < 14.76) phaseType = 'full';
      else if (daysSinceNewMoon < 22.15) phaseType = 'last_quarter';
      
      if (Math.floor(daysSinceNewMoon) % 7 === 0) {
        phases.push({
          date: new Date(current),
          type: phaseType,
          illumination: phaseType === 'full' ? 100 : phaseType === 'new' ? 0 : 50,
          angle: phaseType === 'full' ? 180 : phaseType === 'new' ? 0 : 90,
          distance: 384400,
          apparentDiameter: 0.52,
          rise: null,
          set: null,
          influence: this.calculateLunarInfluence({ quarter: phaseType === 'new' ? 0 : 1 }),
          chineseData: this.getBasicChineseLunarData(current)
        });
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return phases;
  }

  /**
   * Получает предстоящие лунные события (следующие 7 дней)
   */
  async getUpcomingLunarEvents(): Promise<Array<{
    type: 'lunar_phase' | 'moonrise' | 'moonset' | 'lunar_eclipse' | 'special_event';
    title: string;
    date: Date;
    description: string;
    fishingImpact?: 'positive' | 'negative' | 'neutral';
  }>> {
    const events: any[] = [];
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    try {
      // Получаем лунные фазы на следующую неделю
      const phases = await this.getLunarPhases(now, nextWeek);
      
      // Добавляем фазы как события
      phases.forEach(phase => {
        events.push({
          type: 'lunar_phase' as const,
          title: this.getPhaseName(phase.type),
          date: phase.date,
          description: phase.influence?.description || 'Лунная фаза влияет на активность рыбы',
          fishingImpact: this.getFishingImpactFromPhase(phase.type)
        });
      });

      // Добавляем восходы и заходы луны
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        
        const moonrise = this.getMoonRise(checkDate);
        const moonset = this.getMoonSet(checkDate);
        
        if (moonrise) {
          events.push({
            type: 'moonrise' as const,
            title: 'Восход Луны',
            date: moonrise,
            description: 'Хорошее время для начала рыбалки',
            fishingImpact: 'positive' as const
          });
        }
        
        if (moonset) {
          events.push({
            type: 'moonset' as const,
            title: 'Заход Луны',
            date: moonset,
            description: 'Время смены активности рыбы',
            fishingImpact: 'neutral' as const
          });
        }
      }

      // Добавляем специальные события (если есть)
      const specialEvents = this.getSpecialLunarEvents(now, nextWeek);
      events.push(...specialEvents);

      // Сортируем по дате и возвращаем только будущие события
      return events
        .filter(event => event.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .slice(0, 20); // Максимум 20 событий

    } catch (error) {
      console.error('Error getting upcoming lunar events:', error);
      return [];
    }
  }

  /**
   * Получает название фазы луны на русском
   */
  private getPhaseName(phaseType: LunarPhaseType): string {
    const names = {
      NEW_MOON: 'Новолуние',
      FIRST_QUARTER: 'Первая четверть', 
      FULL_MOON: 'Полнолуние',
      LAST_QUARTER: 'Последняя четверть'
    };
    return names[phaseType] || 'Лунная фаза';
  }

  /**
   * Определяет влияние фазы на рыбалку
   */
  private getFishingImpactFromPhase(phaseType: LunarPhaseType): 'positive' | 'negative' | 'neutral' {
    switch (phaseType) {
      case 'NEW_MOON':
      case 'FULL_MOON':
        return 'positive';
      case 'FIRST_QUARTER':
        return 'neutral';  
      case 'LAST_QUARTER':
        return 'neutral';
      default:
        return 'neutral';
    }
  }

  /**
   * Получает специальные лунные события
   */
  private getSpecialLunarEvents(startDate: Date, endDate: Date): Array<{
    type: 'special_event';
    title: string;
    date: Date;
    description: string;
    fishingImpact: 'positive' | 'negative' | 'neutral';
  }> {
    const events: any[] = [];
    
    // Проверяем на Суперлуние (когда луна особенно близко к Земле)
    const current = new Date(startDate);
    while (current <= endDate) {
      try {
        const distance = this.getMoonDistance(current);
        
        // Суперлуние - когда луна ближе 360,000 км
        if (distance < 360000) {
          const phases = [new Date(current)]; // Упрощено
          phases.forEach(date => {
            if (date >= startDate && date <= endDate) {
              events.push({
                type: 'special_event' as const,
                title: 'Суперлуние',
                date: date,
                description: 'Луна особенно близко к Земле - повышенная активность рыбы!',
                fishingImpact: 'positive' as const
              });
            }
          });
        }
      } catch (error) {
        // Продолжаем, если не удается рассчитать для конкретной даты
      }
      
      current.setDate(current.getDate() + 1);
    }
    
    return events;
  }
}

export const realLunarService = new RealLunarService();
