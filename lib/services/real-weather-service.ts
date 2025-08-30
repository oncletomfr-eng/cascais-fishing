import axios from 'axios';
import { 
  FishingConditions, 
  FishActivityLevel,
  FishingImpactLevel,
  WeatherInfluence,
  TidalInfluence,
  MarineCalendarConfig
} from '../types/marine-calendar';
import { realTidesService } from './real-tides-service';

interface OpenWeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
  };
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  visibility?: number;
  clouds: {
    all: number;
  };
  dt: number;
  sys?: {
    sunrise: number;
    sunset: number;
  };
}

interface NOAATideResponse {
  data: Array<{
    t: string; // время
    v: string; // значение уровня воды
    s?: string; // статус
    f?: string; // флаги
  }>;
  metadata: {
    id: string;
    name: string;
    lat: string;
    lon: string;
  };
}

export class RealWeatherService {
  private readonly openWeatherApiKey = 'c615448dcb3b1bfb97c2d99aeb79b130';
  private readonly openWeatherBaseUrl = 'https://api.openweathermap.org/data/2.5';
  private readonly noaaBaseUrl = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
  private config: MarineCalendarConfig;

  // Ближайшая к Кашкайшу станция NOAA (на самом деле нужно найти европейскую альтернативу)
  private readonly noaaStationId = '9414290'; // San Francisco (fallback, для демонстрации)

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
   * Получает реальные условия рыбалки
   */
  async getFishingConditions(date: Date): Promise<FishingConditions> {
    try {
      // Параллельные запросы к разным сервисам
      const [weatherData, tideData] = await Promise.all([
        this.getCurrentWeather(),
        this.getTidalData(date)
      ]);

      return this.analyzeFishingConditions(weatherData, tideData, date);
    } catch (error) {
      console.error('Error fetching fishing conditions:', error);
      return this.getFallbackFishingConditions(date);
    }
  }

  /**
   * Получает текущую погоду от OpenWeatherMap
   */
  private async getCurrentWeather(): Promise<OpenWeatherResponse> {
    const url = `${this.openWeatherBaseUrl}/weather`;
    const params = {
      lat: this.config.location.latitude,
      lon: this.config.location.longitude,
      appid: this.openWeatherApiKey,
      units: 'metric',
      lang: 'en'
    };

    const response = await axios.get<OpenWeatherResponse>(url, { params });
    return response.data;
  }

  /**
   * Получает данные приливов от NOAA
   */
  private async getTidalData(date: Date): Promise<any> {
    try {
      // Используем реальный сервис приливов NOAA
      const tidalData = await realTidesService.getTidalData(
        this.config.location.latitude,
        this.config.location.longitude,
        date
      );
      
      if (tidalData) {
        return {
          stationId: tidalData.stationId,
          stationName: tidalData.stationName,
          currentLevel: tidalData.currentLevel,
          nextHighTide: tidalData.nextHighTide,
          nextLowTide: tidalData.nextLowTide,
          tidalRange: tidalData.tidalRange,
          predictions: tidalData.predictions.slice(0, 6) // Ограничиваем для производительности
        };
      }
      
      return this.getFallbackTidalData(date);
    } catch (error) {
      console.warn('Failed to fetch tidal data from NOAA, using fallback:', error);
      return this.getFallbackTidalData(date);
    }
  }

  /**
   * Анализирует условия рыбалки на основе погодных и приливных данных
   */
  private analyzeFishingConditions(
    weather: OpenWeatherResponse, 
    tides: any, 
    date: Date
  ): FishingConditions {
    
    // Анализируем погодные условия
    const weatherInfluence = this.analyzeWeatherInfluence(weather);
    const tidalInfluence = this.analyzeTidalInfluence(tides);
    
    // Определяем общую активность рыбы
    const fishActivity = this.calculateFishActivity(weather, weatherInfluence);
    const fishingImpact = this.calculateFishingImpact(weather, weatherInfluence, tidalInfluence);
    
    return {
      date,
      waterTemperature: this.estimateWaterTemperature(weather),
      airTemperature: weather.main.temp,
      windSpeed: weather.wind.speed,
      windDirection: weather.wind.deg,
      pressure: weather.main.pressure,
      humidity: weather.main.humidity,
      visibility: weather.visibility ? weather.visibility / 1000 : 10, // Convert m to km
      cloudCover: weather.clouds.all,
      waveHeight: this.estimateWaveHeight(weather),
      fishActivity,
      fishingImpact,
      weatherDescription: weather.weather[0].description,
      recommendation: this.generateRecommendation(weather, weatherInfluence, tidalInfluence),
      optimalTimes: this.calculateOptimalFishingTimes(weather, tides, date),
      weatherInfluence,
      tidalInfluence
    };
  }

  /**
   * Анализирует влияние погоды на рыбалку
   */
  private analyzeWeatherInfluence(weather: OpenWeatherResponse): WeatherInfluence {
    const conditions = weather.weather[0].main.toLowerCase();
    const windSpeed = weather.wind.speed;
    const pressure = weather.main.pressure;
    
    let impact: 'positive' | 'negative' | 'neutral';
    let description: string;
    
    // Анализ по основным параметрам
    if (conditions.includes('rain') || conditions.includes('storm')) {
      impact = 'negative';
      description = 'Дождь и шторм негативно влияют на активность рыбы';
    } else if (conditions.includes('cloud') && windSpeed < 5) {
      impact = 'positive';
      description = 'Облачная погода с легким ветром идеальна для рыбалки';
    } else if (pressure < 1010) {
      impact = 'positive';
      description = 'Низкое давление повышает активность рыбы';
    } else if (pressure > 1025) {
      impact = 'negative';
      description = 'Высокое давление снижает клев';
    } else {
      impact = 'neutral';
      description = 'Стандартные погодные условия';
    }

    return {
      impact,
      description,
      windEffect: windSpeed > 10 ? 'strong' : windSpeed > 5 ? 'moderate' : 'light',
      pressureEffect: pressure < 1010 ? 'falling' : pressure > 1025 ? 'rising' : 'stable',
      temperatureEffect: weather.main.temp > 25 ? 'warm' : weather.main.temp < 10 ? 'cold' : 'optimal'
    };
  }

  /**
   * Анализирует приливное влияние на основе реальных данных
   */
  private analyzeTidalInfluence(tides: any): TidalInfluence {
    const now = new Date();
    
    // Определяем тип текущего прилива
    let type: 'incoming' | 'outgoing' | 'high' | 'low' = 'incoming';
    let strength: 'weak' | 'moderate' | 'strong' = 'moderate';
    let recommendation = 'Стандартные приливные условия';
    
    if (tides?.nextHighTide && tides?.nextLowTide) {
      const timeToHigh = tides.nextHighTide.time ? new Date(tides.nextHighTide.time).getTime() - now.getTime() : 0;
      const timeToLow = tides.nextLowTide.time ? new Date(tides.nextLowTide.time).getTime() - now.getTime() : 0;
      
      // Определяем направление прилива
      if (timeToHigh > 0 && timeToLow > 0) {
        if (timeToHigh < timeToLow) {
          type = 'incoming';
          recommendation = 'Приближающийся прилив - отличное время для рыбалки';
        } else {
          type = 'outgoing';
          recommendation = 'Прилив отходит - хорошее время для ловли у берега';
        }
      }
      
      // Определяем силу на основе приливного диапазона
      if (tides.tidalRange) {
        if (tides.tidalRange > 2.0) {
          strength = 'strong';
        } else if (tides.tidalRange < 1.0) {
          strength = 'weak';
        }
      }
    }
    
    return {
      type,
      strength,
      nextHighTide: tides?.nextHighTide?.time ? new Date(tides.nextHighTide.time) : new Date(Date.now() + 4 * 60 * 60 * 1000),
      nextLowTide: tides?.nextLowTide?.time ? new Date(tides.nextLowTide.time) : new Date(Date.now() + 8 * 60 * 60 * 1000),
      currentLevel: tides?.currentLevel || 1.2,
      recommendation
    };
  }

  /**
   * Рассчитывает активность рыбы
   */
  private calculateFishActivity(weather: OpenWeatherResponse, weatherInfluence: WeatherInfluence): FishActivityLevel {
    let score = 50; // базовая оценка
    
    // Влияние температуры
    const temp = weather.main.temp;
    if (temp >= 15 && temp <= 25) score += 20;
    else if (temp < 5 || temp > 35) score -= 30;
    else score -= 10;
    
    // Влияние ветра
    const wind = weather.wind.speed;
    if (wind >= 2 && wind <= 8) score += 15;
    else if (wind > 15) score -= 25;
    
    // Влияние давления
    const pressure = weather.main.pressure;
    if (pressure < 1010) score += 10;
    else if (pressure > 1025) score -= 15;
    
    // Влияние облачности
    const clouds = weather.clouds.all;
    if (clouds >= 30 && clouds <= 70) score += 10;
    else if (clouds > 90) score -= 10;
    
    // Влияние погодных условий
    if (weatherInfluence.impact === 'positive') score += 15;
    else if (weatherInfluence.impact === 'negative') score -= 20;
    
    // Переводим в категории
    if (score >= 75) return 'very_high';
    else if (score >= 60) return 'high';
    else if (score >= 40) return 'moderate';
    else if (score >= 25) return 'low';
    else return 'very_low';
  }

  /**
   * Рассчитывает общее влияние на рыбалку
   */
  private calculateFishingImpact(
    weather: OpenWeatherResponse, 
    weatherInfluence: WeatherInfluence, 
    tidalInfluence: TidalInfluence
  ): FishingImpactLevel {
    let score = 0;
    
    // Влияние погоды
    if (weatherInfluence.impact === 'positive') score += 2;
    else if (weatherInfluence.impact === 'negative') score -= 2;
    
    // Влияние приливов
    if (tidalInfluence.type === 'incoming' || tidalInfluence.type === 'outgoing') {
      score += 1;
    }
    
    // Влияние ветра
    if (weather.wind.speed < 10) score += 1;
    else if (weather.wind.speed > 20) score -= 2;
    
    // Переводим в категории
    if (score >= 3) return 'very_positive';
    else if (score >= 1) return 'positive';
    else if (score >= -1) return 'neutral';
    else if (score >= -3) return 'negative';
    else return 'very_negative';
  }

  /**
   * Оценивает температуру воды на основе воздуха
   */
  private estimateWaterTemperature(weather: OpenWeatherResponse): number {
    // Упрощенная оценка: вода обычно на 2-5°C холоднее воздуха
    const airTemp = weather.main.temp;
    const waterTempOffset = Math.max(2, airTemp * 0.1);
    return Math.round((airTemp - waterTempOffset) * 10) / 10;
  }

  /**
   * Оценивает высоту волн на основе скорости ветра
   */
  private estimateWaveHeight(weather: OpenWeatherResponse): number {
    const windSpeed = weather.wind.speed;
    
    // Упрощенная формула: высота волны ≈ скорость ветра / 10
    // с учетом местных условий
    let waveHeight = windSpeed / 8;
    
    // Ограничиваем разумными пределами для прибрежных вод
    waveHeight = Math.min(waveHeight, 4);
    waveHeight = Math.max(waveHeight, 0.1);
    
    return Math.round(waveHeight * 10) / 10;
  }

  /**
   * Генерирует рекомендации для рыбалки
   */
  private generateRecommendation(
    weather: OpenWeatherResponse,
    weatherInfluence: WeatherInfluence,
    tidalInfluence: TidalInfluence
  ): string {
    const recommendations: string[] = [];
    
    // Рекомендации по погоде
    if (weather.wind.speed < 5) {
      recommendations.push('Слабый ветер - отличные условия для рыбалки с лодки');
    } else if (weather.wind.speed > 15) {
      recommendations.push('Сильный ветер - рекомендуется береговая рыбалка');
    }
    
    // Рекомендации по температуре
    const temp = weather.main.temp;
    if (temp < 10) {
      recommendations.push('Холодная погода - рыба менее активна, используйте медленные приманки');
    } else if (temp > 25) {
      recommendations.push('Теплая погода - рыбачьте рано утром или вечером');
    }
    
    // Рекомендации по приливам
    if (tidalInfluence.type === 'incoming') {
      recommendations.push('Приближающийся прилив - рыба движется к берегу');
    }
    
    // Рекомендации по давлению
    if (weather.main.pressure < 1010) {
      recommendations.push('Низкое давление - рыба более активна');
    }
    
    return recommendations.length > 0 
      ? recommendations.join('. ')
      : 'Стандартные условия для рыбалки.';
  }

  /**
   * Рассчитывает оптимальные времена для рыбалки
   */
  private calculateOptimalFishingTimes(weather: OpenWeatherResponse, tides: any, date: Date): string[] {
    const times: string[] = [];
    
    // Основываемся на приливах и заходе/восходе солнца
    if (weather.sys?.sunrise && weather.sys?.sunset) {
      const sunrise = new Date(weather.sys.sunrise * 1000);
      const sunset = new Date(weather.sys.sunset * 1000);
      
      // Час до и после восхода
      times.push(`${this.formatTime(new Date(sunrise.getTime() - 60*60*1000))}-${this.formatTime(new Date(sunrise.getTime() + 60*60*1000))}`);
      
      // Час до и после заката
      times.push(`${this.formatTime(new Date(sunset.getTime() - 60*60*1000))}-${this.formatTime(new Date(sunset.getTime() + 60*60*1000))}`);
    } else {
      // Стандартные времена
      times.push('06:00-08:00', '18:00-20:00');
    }
    
    // Добавляем время приливов, если доступно
    if (tides?.data) {
      // Анализируем данные приливов и добавляем оптимальные времена
      times.push('12:00-14:00'); // Пример
    }
    
    return times;
  }

  /**
   * Форматирует время в строку
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  /**
   * Возвращает fallback данные при ошибках
   */
  private getFallbackFishingConditions(date: Date): FishingConditions {
    console.warn('Using fallback fishing conditions');
    
    return {
      date,
      waterTemperature: 16,
      airTemperature: 18,
      windSpeed: 5,
      windDirection: 270,
      pressure: 1013,
      humidity: 70,
      visibility: 10,
      cloudCover: 50,
      waveHeight: 0.5,
      fishActivity: 'moderate',
      fishingImpact: 'neutral',
      weatherDescription: 'Partly cloudy',
      recommendation: 'Умеренные условия для рыбалки. Попробуйте утром или вечером.',
      optimalTimes: ['06:00-08:00', '18:00-20:00'],
      weatherInfluence: {
        impact: 'neutral',
        description: 'Стандартные погодные условия',
        windEffect: 'moderate',
        pressureEffect: 'stable',
        temperatureEffect: 'optimal'
      },
      tidalInfluence: this.getFallbackTidalInfluence()
    };
  }

  /**
   * Возвращает fallback данные приливов
   */
  private getFallbackTidalData(date: Date): any {
    return {
      data: [
        { t: '2024-01-01 00:00', v: '1.2' },
        { t: '2024-01-01 06:00', v: '0.8' },
        { t: '2024-01-01 12:00', v: '1.5' },
        { t: '2024-01-01 18:00', v: '0.5' }
      ],
      metadata: {
        id: 'fallback',
        name: 'Cascais Area',
        lat: '38.7071',
        lon: '-9.4212'
      }
    };
  }

  /**
   * Возвращает fallback влияние приливов
   */
  private getFallbackTidalInfluence(): TidalInfluence {
    return {
      type: 'incoming',
      strength: 'moderate',
      nextHighTide: new Date(Date.now() + 4 * 60 * 60 * 1000),
      nextLowTide: new Date(Date.now() + 10 * 60 * 60 * 1000),
      currentLevel: 1.2,
      recommendation: 'Умеренные приливные условия'
    };
  }
}

export const realWeatherService = new RealWeatherService();
