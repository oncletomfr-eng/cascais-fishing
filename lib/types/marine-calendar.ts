import { MoonQuarterInfo, IlluminationInfo } from 'astronomy-engine';

/**
 * Основные типы для Морского Календаря
 * Включает лунные фазы, приливы, миграции рыб и влияние на рыбалку
 */

// ============= ЛУННЫЕ ФАЗЫ И АСТРОНОМИЯ =============

export interface LunarPhase {
  /** Дата и время фазы */
  date: Date;
  /** Тип лунной фазы */
  type: LunarPhaseType;
  /** Угол фазы в градусах (0-360) */
  angle: number;
  /** Процент освещенности (0-100) */
  illumination: number;
  /** Расстояние до Луны в км */
  distance: number;
  /** Видимый диаметр Луны в градусах */
  apparentDiameter: number;
  /** Время восхода Луны */
  rise: Date | null;
  /** Время захода Луны */
  set: Date | null;
  /** Влияние на рыбалку */
  influence?: LunarInfluence;
  /** Китайские лунные данные */
  chineseLunarData?: ChineseLunarData;
}

export type LunarPhaseType = 'NEW_MOON' | 'WAXING_CRESCENT' | 'FIRST_QUARTER' | 'WAXING_GIBBOUS' | 'FULL_MOON' | 'WANING_GIBBOUS' | 'LAST_QUARTER' | 'WANING_CRESCENT';

export interface ChineseLunarData {
  /** Год в системе ствоы-ветви */
  year: string;
  /** Месяц в системе стволы-ветви */
  month: string;
  /** День в системе стволы-ветви */
  day: string;
  /** Час (двухчасовой период) */
  hour: string;
  /** Номер лунного дня */
  dayNumber: number;
  /** Номер лунного месяца */
  monthNumber: number;
  /** Является ли месяц високосным */
  isLeapMonth: boolean;
  /** Животное года */
  animal: string;
  /** Элемент дня */
  element: string;
  /** Созвездие (сю) */
  constellation: string;
  /** Благоприятное направление */
  auspiciousDirection: string;
  /** Благоприятные деятельности */
  favorableActivities: string[];
  /** Неблагоприятные деятельности */
  unfavorableActivities: string[];
  /** Направление божества */
  deityDirection: string;
  /** Лунный праздник */
  lunarFestival: string | null;
}

export interface LunarCalendarDay {
  /** Дата */
  date: Date;
  /** Лунная фаза */
  lunarPhase: LunarPhase;
  /** Китайский лунный календарь */
  chineseLunar?: ChineseLunarDay;
  /** Расстояние до Луны в км */
  distanceKm: number;
  /** Видимый диаметр Луны в градусах */
  apparentDiameter: number;
}

export interface ChineseLunarDay {
  /** Год в китайском календаре */
  year: string;
  /** Месяц в китайском календаре */
  month: string;
  /** День в китайском календаре */
  day: string;
  /** Благоприятные действия для рыбалки */
  auspiciousActivities: string[];
  /** Неблагоприятные действия */
  inauspiciousActivities: string[];
  /** Знак зодиака */
  zodiacSign: string;
  /** Элемент (металл, дерево, вода, огонь, земля) */
  element: string;
}

// ============= ВЛИЯНИЕ НА РЫБАЛКУ =============



export interface LunarInfluence {
  /** Влияние на активность рыбы */
  fishActivity: FishActivityLevel;
  /** Влияние на рыбалку */
  fishingImpact: FishingImpactLevel;
  /** Оптимальные времена для рыбалки */
  optimalTimes: string[];
  /** Описание влияния */
  description: string;
  /** Приливное влияние */
  tidalInfluence: string;
  /** Рекомендации */
  recommendation: string;
}



export enum FishActivityLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum FishingImpactLevel {
  NEGATIVE = 'negative',
  NEUTRAL = 'neutral',
  POSITIVE = 'positive',
  VERY_POSITIVE = 'very_positive'
}

export interface SpeciesFishingInfluence {
  /** Вид рыбы */
  species: FishSpecies;
  /** Активность (1-10) */
  activity: number;
  /** Глубина ловли */
  preferredDepth: string;
  /** Лучшие места */
  bestLocations: string[];
  /** Рекомендуемые приманки */
  recommendedBaits: string[];
}

// ============= ВИДЫ РЫБ И МИГРАЦИЯ =============

export interface FishSpecies {
  /** ID вида */
  id: string;
  /** Название на русском */
  nameRu: string;
  /** Название на английском */
  nameEn: string;
  /** Латинское название */
  scientificName: string;
  /** Сезонность */
  seasonality: SeasonalAvailability;
  /** Миграционные данные */
  migration: MigrationPattern;
  /** Предпочтения по глубине */
  depthPreferences: DepthRange;
  /** Температурные предпочтения */
  temperatureRange: TemperatureRange;
}

export interface SeasonalAvailability {
  /** Лучшие месяцы для ловли */
  bestMonths: number[];
  /** Доступные месяцы */
  availableMonths: number[];
  /** Пиковые периоды */
  peakPeriods: DateRange[];
}

export interface MigrationPattern {
  /** Тип миграции */
  type: MigrationType;
  /** Направление весной */
  springDirection: string;
  /** Направление осенью */
  autumnDirection: string;
  /** Пиковые даты миграции */
  peakDates: DateRange[];
  /** Глубины во время миграции */
  migrationDepths: number[];
}

export enum MigrationType {
  ANADROMOUS = 'anadromous',     // Из моря в реки
  CATADROMOUS = 'catadromous',   // Из рек в море
  OCEANODROMOUS = 'oceanodromous', // В пределах океана
  POTAMODROMOUS = 'potamodromous', // В пределах рек
  RESIDENT = 'resident'           // Оседлая
}

export interface DepthRange {
  /** Минимальная глубина в метрах */
  minDepth: number;
  /** Максимальная глубина в метрах */
  maxDepth: number;
  /** Оптимальная глубина */
  optimalDepth: number;
}

export interface TemperatureRange {
  /** Минимальная температура */
  minTemp: number;
  /** Максимальная температура */
  maxTemp: number;
  /** Оптимальная температура */
  optimalTemp: number;
}

// ============= ИСТОРИЧЕСКИЕ ДАННЫЕ =============

export interface HistoricalCatch {
  /** ID записи */
  id: string;
  /** Дата улова */
  date: Date;
  /** Местоположение */
  location: FishingLocation;
  /** Пойманные рыбы */
  catches: CatchRecord[];
  /** Лунная фаза во время улова */
  lunarPhase: LunarPhaseType;
  /** Погодные условия */
  weatherConditions: WeatherConditions;
  /** Использованные снасти */
  tackle: TackleUsed[];
  /** Рыбак/гид */
  angler: string;
  /** Дополнительные заметки */
  notes?: string;
}

export interface CatchRecord {
  /** Вид рыбы */
  species: FishSpecies;
  /** Количество */
  count: number;
  /** Общий вес в кг */
  totalWeight: number;
  /** Средний размер в см */
  averageSize: number;
  /** Время улова */
  timeOfCatch: Date;
  /** Глубина ловли */
  depth: number;
  /** Использованная приманка */
  bait: string;
}

export interface FishingLocation {
  /** Название места */
  name: string;
  /** Широта */
  latitude: number;
  /** Долгота */
  longitude: number;
  /** Глубины в районе */
  depths: number[];
  /** Тип дна */
  bottomType: string;
  /** Расстояние от берега в км */
  distanceFromShore: number;
}

export interface WeatherConditions {
  /** Температура воздуха */
  airTemperature: number;
  /** Температура воды */
  waterTemperature: number;
  /** Скорость ветра */
  windSpeed: number;
  /** Направление ветра */
  windDirection: string;
  /** Атмосферное давление */
  pressure: number;
  /** Видимость */
  visibility: number;
  /** Волнение моря (1-10) */
  seaState: number;
}

export interface TackleUsed {
  /** Тип снасти */
  type: TackleType;
  /** Описание */
  description: string;
  /** Эффективность (1-10) */
  effectiveness: number;
}

export enum TackleType {
  SPINNING = 'spinning',
  TROLLING = 'trolling',
  BOTTOM_FISHING = 'bottom_fishing',
  FLOAT_FISHING = 'float_fishing',
  FLY_FISHING = 'fly_fishing',
  JIGGING = 'jigging'
}

// ============= ВРЕМЕННЫЕ ИНТЕРВАЛЫ =============

export interface TimeWindow {
  /** Начало периода */
  start: Date;
  /** Конец периода */
  end: Date;
  /** Описание периода */
  description: string;
  /** Рейтинг периода (1-10) */
  rating: number;
}

export interface DateRange {
  /** Дата начала */
  startDate: Date;
  /** Дата окончания */
  endDate: Date;
  /** Описание периода */
  description?: string;
}

// ============= API ЗАПРОСЫ И ОТВЕТЫ =============

export interface MarineCalendarRequest {
  /** Дата начала */
  startDate: Date;
  /** Дата окончания */
  endDate: Date;
  /** Местоположение */
  location: {
    latitude: number;
    longitude: number;
  };
  /** Включить исторические данные */
  includeHistoricalData?: boolean;
  /** Виды рыб для анализа */
  targetSpecies?: string[];
}

export interface MarineCalendarResponse {
  /** Период */
  period: DateRange;
  /** Местоположение */
  location: FishingLocation;
  /** Календарные дни с прогнозами */
  days: FishingConditions[];
  /** Лунные фазы в период */
  lunarPhases: LunarPhase[];
  /** Миграционные события */
  migrationEvents: MigrationEvent[];
  /** Исторические данные */
  historicalData?: HistoricalAnalysis;
  /** Общие рекомендации */
  generalRecommendations: string[];
}

export interface MigrationEvent {
  /** Вид рыбы */
  species: FishSpecies;
  /** Тип события */
  eventType: 'arrival' | 'peak' | 'departure';
  /** Дата события */
  date: Date;
  /** Вероятность (0-1) */
  probability: number;
  /** Описание */
  description: string;
}

export interface HistoricalAnalysis {
  /** Периоды лучшего клёва в прошлом */
  bestPeriods: DateRange[];
  /** Статистика по видам */
  speciesStats: SpeciesStatistics[];
  /** Корреляция с лунными фазами */
  lunarCorrelation: LunarCorrelation[];
  /** Средние показатели */
  averageMetrics: AverageMetrics;
}

export interface SpeciesStatistics {
  /** Вид рыбы */
  species: FishSpecies;
  /** Общее количество уловов */
  totalCatches: number;
  /** Средний вес улова */
  averageWeight: number;
  /** Лучшие дни недели */
  bestDaysOfWeek: number[];
  /** Лучшие часы дня */
  bestHours: number[];
  /** Успешность по лунным фазам */
  lunarPhaseSuccess: Record<LunarPhaseType, number>;
}

export interface LunarCorrelation {
  /** Лунная фаза */
  phase: LunarPhaseType;
  /** Коэффициент корреляции с успешностью */
  correlation: number;
  /** Количество наблюдений */
  observationCount: number;
  /** Средняя успешность в эту фазу */
  averageSuccess: number;
}

export interface AverageMetrics {
  /** Средняя оценка клёва */
  averageFishingRating: number;
  /** Среднее количество рыбы за день */
  averageFishPerDay: number;
  /** Средний вес улова за день */
  averageWeightPerDay: number;
  /** Средняя продолжительность рыбалки */
  averageFishingDuration: number;
}

// ============= НАСТРОЙКИ И КОНФИГУРАЦИЯ =============

export interface MarineCalendarConfig {
  /** Местоположение */
  location: {
    latitude: number;
    longitude: number;
    timeZone: string;
    address?: string;
    city?: string;
    country?: string;
  };
  /** Часовой пояс */
  timezone?: string;
  /** Единицы измерения */
  units?: {
    temperature: 'celsius' | 'fahrenheit';
    distance: 'metric' | 'imperial';
    weight: 'kg' | 'lbs';
  };
  /** Языковые настройки */
  locale?: 'ru' | 'en';
  /** Включить китайский лунный календарь */
  includeChineseLunar?: boolean;
  /** Глубина исторических данных в днях */
  historicalDataDepth?: number;
}

/** Данные геолокации */
export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  region?: string;
}

/** Ответ геокодинга */
export interface GeocodingResponse {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  components: {
    city?: string;
    country?: string;
    postalCode?: string;
    region?: string;
    streetAddress?: string;
  };
  accuracy: string;
  placeId?: string;
  types?: string[];
}

// ============= ДОПОЛНИТЕЛЬНЫЕ ТИПЫ ДЛЯ РЕАЛЬНЫХ СЕРВИСОВ =============

export interface FishingConditions {
  date: Date;
  waterTemperature: number;
  airTemperature: number;
  windSpeed: number;
  windDirection: number;
  pressure: number;
  humidity: number;
  visibility: number;
  cloudCover: number;
  waveHeight: number;
  fishActivity: FishActivityLevel;
  fishingImpact: FishingImpactLevel;
  weatherDescription: string;
  recommendation: string;
  optimalTimes: string[];
  weatherInfluence: WeatherInfluence;
  tidalInfluence: TidalInfluence;
}

export interface WeatherInfluence {
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
  windEffect: 'light' | 'moderate' | 'strong';
  pressureEffect: 'falling' | 'stable' | 'rising';
  temperatureEffect: 'cold' | 'optimal' | 'warm';
}

export interface TidalInfluence {
  type: 'incoming' | 'outgoing' | 'high' | 'low';
  strength: 'weak' | 'moderate' | 'strong';
  nextHighTide: Date;
  nextLowTide: Date;
  currentLevel: number;
  recommendation: string;
}
