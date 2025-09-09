'use client';

import {
  WeatherData,
  WeatherLocation,
  CurrentWeather,
  MarineConditions,
  HourlyForecast,
  DailyForecast,
  FishingConditions,
  WeatherServiceConfig,
  OpenMeteoCurrentResponse,
  OpenMeteoHourlyResponse,
  OpenMeteoDailyResponse,
  OpenMeteoMarineResponse,
  WEATHER_CODES,
  FISHING_THRESHOLDS
} from '@/lib/types/weather';
import { tomorrowMarineService } from './tomorrow-marine';

// Default configuration
const DEFAULT_CONFIG: WeatherServiceConfig = {
  apiBaseUrl: 'https://api.open-meteo.com/v1',
  defaultLocation: { 
    latitude: 38.7223, 
    longitude: -9.1393, 
    name: 'Cascais, Portugal' 
  },
  enableMarine: true,
  enableAlerts: true,
  cacheDuration: 10 * 60 * 1000, // 10 minutes
  requestTimeout: 10000 // 10 seconds
};

// Cache for weather data
const weatherCache = new Map<string, { data: WeatherData; timestamp: number }>();

/**
 * Weather Service for Open-Meteo API integration
 * Provides current weather, forecasts, and marine conditions for fishing
 */
export class WeatherService {
  private config: WeatherServiceConfig;

  constructor(config: Partial<WeatherServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get comprehensive weather data for a location
   */
  async getWeatherData(location: WeatherLocation): Promise<WeatherData> {
    const cacheKey = `${location.latitude},${location.longitude}`;
    const cached = weatherCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < this.config.cacheDuration) {
      return cached.data;
    }

    try {
      // Fetch all weather data in parallel
      const [currentData, hourlyData, dailyData, marineData] = await Promise.all([
        this.fetchCurrentWeather(location),
        this.fetchHourlyForecast(location),
        this.fetchDailyForecast(location),
        this.config.enableMarine ? this.fetchMarineConditions(location) : Promise.resolve(undefined)
      ]);

      const weatherData: WeatherData = {
        location,
        current: currentData,
        marine: marineData,
        hourly: hourlyData,
        daily: dailyData,
        updatedAt: new Date()
      };

      // Cache the result
      weatherCache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      return weatherData;
    } catch (error) {
      console.error('Failed to fetch weather data:', error);
      throw new Error('Unable to fetch weather data. Please try again later.');
    }
  }

  /**
   * Get current weather conditions
   */
  async getCurrentWeather(location: WeatherLocation): Promise<CurrentWeather> {
    return this.fetchCurrentWeather(location);
  }

  /**
   * Get marine conditions for fishing
   */
  async getMarineConditions(location: WeatherLocation): Promise<MarineConditions | null> {
    if (!this.config.enableMarine) return null;
    const result = await this.fetchMarineConditions(location);
    return result || null;
  }

  /**
   * Assess fishing conditions based on weather data
   */
  assessFishingConditions(weatherData: WeatherData): FishingConditions {
    const { current, marine } = weatherData;
    
    // Assess individual factors
    const windConditions = this.assessWindConditions(current.windSpeed);
    const waveConditions = marine ? this.assessWaveConditions(marine.waveHeight) : 'good';
    const visibility = this.assessVisibility(current.visibility);
    const precipitation = this.assessPrecipitation(current.weatherCode);

    // Calculate overall score (0-100)
    const scores = {
      wind: this.getConditionScore(windConditions),
      waves: this.getConditionScore(waveConditions),
      visibility: this.getConditionScore(visibility),
      precipitation: this.getConditionScore(precipitation)
    };

    const averageScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.keys(scores).length;
    
    // Determine overall condition
    let overall: FishingConditions['overall'];
    if (averageScore >= 80) overall = 'excellent';
    else if (averageScore >= 60) overall = 'good';
    else if (averageScore >= 40) overall = 'fair';
    else if (averageScore >= 20) overall = 'poor';
    else overall = 'dangerous';

    // Generate recommendations and warnings
    const recommendations = this.generateRecommendations(weatherData);
    const warnings = this.generateWarnings(weatherData);
    const bestTimes = this.findBestFishingTimes(weatherData);

    return {
      overall,
      score: Math.round(averageScore),
      factors: {
        windConditions,
        waveConditions,
        visibility,
        precipitation
      },
      recommendations,
      warnings,
      bestTimes
    };
  }

  /**
   * Fetch current weather from Open-Meteo API via server-side proxy
   */
  private async fetchCurrentWeather(location: WeatherLocation): Promise<CurrentWeather> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      type: 'current'
    });

    const response = await this.fetchWithTimeout(
      `/api/weather/open-meteo?${params}`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const proxyResponse = await response.json();
    if (!proxyResponse.success) {
      throw new Error(`Weather proxy error: ${proxyResponse.error}`);
    }
    
    const data: OpenMeteoCurrentResponse = proxyResponse.data;
    const current = data.current;

    const weatherCode = current.weather_code;
    const weatherInfo = WEATHER_CODES[weatherCode] || WEATHER_CODES[0];

    return {
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      pressure: current.pressure_msl,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      windGust: current.wind_gusts_10m,
      visibility: 10000, // Default value, not provided by this endpoint
      weatherCode,
      weatherDescription: weatherInfo.description,
      isDay: current.is_day === 1,
      timestamp: new Date(current.time)
    };
  }

  /**
   * Fetch hourly forecast from Open-Meteo API via server-side proxy
   */
  private async fetchHourlyForecast(location: WeatherLocation): Promise<HourlyForecast[]> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      type: 'hourly'
    });

    const response = await this.fetchWithTimeout(
      `/api/weather/open-meteo?${params}`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const proxyResponse = await response.json();
    if (!proxyResponse.success) {
      throw new Error(`Weather proxy error: ${proxyResponse.error}`);
    }
    
    const data: OpenMeteoHourlyResponse = proxyResponse.data;
    const hourly = data.hourly;

    return hourly.time.map((time, index) => {
      const weatherCode = hourly.weather_code[index];
      const weatherInfo = WEATHER_CODES[weatherCode] || WEATHER_CODES[0];

      return {
        timestamp: new Date(time),
        temperature: hourly.temperature_2m[index],
        humidity: hourly.relative_humidity_2m[index],
        pressure: hourly.pressure_msl[index],
        windSpeed: hourly.wind_speed_10m[index],
        windDirection: hourly.wind_direction_10m[index],
        windGust: hourly.wind_gusts_10m?.[index],
        precipitationProbability: hourly.precipitation_probability[index],
        precipitation: hourly.precipitation[index],
        weatherCode,
        weatherDescription: weatherInfo.description,
        cloudCover: hourly.cloud_cover[index],
        visibility: hourly.visibility?.[index] || 10000
      };
    });
  }

  /**
   * Fetch daily forecast from Open-Meteo API via server-side proxy
   */
  private async fetchDailyForecast(location: WeatherLocation): Promise<DailyForecast[]> {
    const params = new URLSearchParams({
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      type: 'daily'
    });

    const response = await this.fetchWithTimeout(
      `/api/weather/open-meteo?${params}`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const proxyResponse = await response.json();
    if (!proxyResponse.success) {
      throw new Error(`Weather proxy error: ${proxyResponse.error}`);
    }
    
    const data: OpenMeteoDailyResponse = proxyResponse.data;
    const daily = data.daily;

    return daily.time.map((time, index) => {
      const weatherCode = daily.weather_code[index];
      const weatherInfo = WEATHER_CODES[weatherCode] || WEATHER_CODES[0];

      return {
        date: new Date(time),
        temperatureMin: daily.temperature_2m_min[index],
        temperatureMax: daily.temperature_2m_max[index],
        precipitationSum: daily.precipitation_sum[index],
        precipitationProbabilityMax: daily.precipitation_probability_max[index],
        windSpeedMax: daily.wind_speed_10m_max[index],
        windGustMax: daily.wind_gusts_10m_max?.[index],
        weatherCode,
        weatherDescription: weatherInfo.description,
        sunrise: daily.sunrise?.[index] ? new Date(daily.sunrise[index]) : undefined,
        sunset: daily.sunset?.[index] ? new Date(daily.sunset[index]) : undefined
      };
    });
  }

  /**
   * Fetch marine conditions from Open-Meteo Marine API via server-side proxy with Tomorrow.io fallback
   */
  private async fetchMarineConditions(location: WeatherLocation): Promise<MarineConditions | undefined> {
    // Try Open-Meteo Marine proxy first
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString()
      });

      const response = await this.fetchWithTimeout(
        `/api/weather/marine?${params}`
      );

      if (response.ok) {
        const proxyResponse = await response.json();
        if (proxyResponse.success) {
          const data: OpenMeteoMarineResponse = proxyResponse.data;
          const hourly = data.hourly;

          if (hourly.time && hourly.time.length > 0) {
            // Successfully got Open-Meteo marine data via proxy
            return {
              waveHeight: hourly.wave_height[0] || 0,
              wavePeriod: hourly.wave_period[0] || 0,
              waveDirection: hourly.wave_direction[0] || 0,
              swellWaveHeight: hourly.swell_wave_height?.[0],
              swellWavePeriod: hourly.swell_wave_period?.[0],
              swellWaveDirection: hourly.swell_wave_direction?.[0],
              timestamp: new Date(hourly.time[0])
            };
          }
        }
      }
    } catch (error) {
      console.warn('Open-Meteo marine proxy API failed, trying Tomorrow.io fallback:', error);
    }

    // Fallback to Tomorrow.io Marine API (which uses its own proxy)
    try {
      console.log('Using Tomorrow.io Marine API as fallback');
      const marineData = await tomorrowMarineService.getMarineConditions(location);
      return marineData || undefined;
    } catch (error) {
      console.warn('Tomorrow.io marine API also failed:', error);
      return undefined;
    }
  }

  /**
   * Utility method for fetch with timeout
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // Assessment helper methods
  private assessWindConditions(windSpeed: number): 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous' {
    const { wind } = FISHING_THRESHOLDS;
    if (windSpeed <= wind.excellent.max) return 'excellent';
    if (windSpeed <= wind.good.max) return 'good';
    if (windSpeed <= wind.fair.max) return 'fair';
    if (windSpeed <= wind.poor.max) return 'poor';
    return 'dangerous';
  }

  private assessWaveConditions(waveHeight: number): 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous' {
    const { waves } = FISHING_THRESHOLDS;
    if (waveHeight <= waves.excellent.max) return 'excellent';
    if (waveHeight <= waves.good.max) return 'good';
    if (waveHeight <= waves.fair.max) return 'fair';
    if (waveHeight <= waves.poor.max) return 'poor';
    return 'dangerous';
  }

  private assessVisibility(visibility: number): 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous' {
    const { visibility: visThreshold } = FISHING_THRESHOLDS;
    if (visibility >= visThreshold.excellent.min) return 'excellent';
    if (visibility >= visThreshold.good.min) return 'good';
    if (visibility >= visThreshold.fair.min) return 'fair';
    if (visibility >= visThreshold.poor.min) return 'poor';
    return 'dangerous';
  }

  private assessPrecipitation(weatherCode: number): 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous' {
    const weatherInfo = WEATHER_CODES[weatherCode];
    if (!weatherInfo) return 'good';
    
    if (weatherInfo.severity === 'high') return 'poor';
    if (weatherInfo.severity === 'medium') return 'fair';
    return 'excellent';
  }

  private getConditionScore(condition: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous'): number {
    switch (condition) {
      case 'excellent': return 100;
      case 'good': return 75;
      case 'fair': return 50;
      case 'poor': return 25;
      case 'dangerous': return 0;
    }
  }

  private generateRecommendations(weatherData: WeatherData): string[] {
    const recommendations: string[] = [];
    const { current, marine } = weatherData;

    // Wind recommendations
    if (current.windSpeed <= 5) {
      recommendations.push('Отличные условия для рыбалки с лодки');
    } else if (current.windSpeed <= 10) {
      recommendations.push('Хорошие условия, рекомендуется проверить прогноз волн');
    }

    // Wave recommendations
    if (marine && marine.waveHeight <= 1) {
      recommendations.push('Спокойное море, идеально для начинающих');
    }

    // Time recommendations
    if (current.isDay) {
      recommendations.push('Дневная рыбалка: хорошая видимость и активность рыбы');
    } else {
      recommendations.push('Вечерняя/утренняя рыбалка: активное время для многих видов рыб');
    }

    // Equipment recommendations
    if (current.temperature < 15) {
      recommendations.push('Рекомендуется теплая одежда и термобелье');
    }

    return recommendations;
  }

  private generateWarnings(weatherData: WeatherData): string[] {
    const warnings: string[] = [];
    const { current, marine } = weatherData;

    // Wind warnings
    if (current.windSpeed > 15) {
      warnings.push('⚠️ Сильный ветер - рыбалка может быть опасной');
    }

    // Wave warnings
    if (marine && marine.waveHeight > 2) {
      warnings.push('⚠️ Высокие волны - не рекомендуется выход в море');
    }

    // Weather warnings
    const weatherInfo = WEATHER_CODES[current.weatherCode];
    if (weatherInfo && weatherInfo.severity === 'high') {
      warnings.push(`⚠️ Неблагоприятные погодные условия: ${weatherInfo.description}`);
    }

    // Visibility warnings
    if (current.visibility < 2000) {
      warnings.push('⚠️ Плохая видимость - будьте осторожны на воде');
    }

    return warnings;
  }

  private findBestFishingTimes(weatherData: WeatherData): Date[] {
    const bestTimes: Date[] = [];
    const now = new Date();
    const next24Hours = weatherData.hourly.filter(hour => 
      hour.timestamp.getTime() > now.getTime() && 
      hour.timestamp.getTime() < now.getTime() + 24 * 60 * 60 * 1000
    );

    // Find hours with optimal conditions
    next24Hours.forEach(hour => {
      let score = 0;
      
      // Wind score
      if (hour.windSpeed <= 8) score += 25;
      else if (hour.windSpeed <= 12) score += 15;
      
      // Precipitation score
      if (hour.precipitationProbability <= 20) score += 25;
      else if (hour.precipitationProbability <= 50) score += 15;
      
      // Pressure score (stable pressure is good)
      if (hour.pressure >= 1013) score += 25;
      else if (hour.pressure >= 1000) score += 15;
      
      // Cloud cover score (some clouds can be good)
      if (hour.cloudCover >= 20 && hour.cloudCover <= 70) score += 25;
      else if (hour.cloudCover <= 80) score += 15;
      
      // If score is high enough, add as best time
      if (score >= 60) {
        bestTimes.push(hour.timestamp);
      }
    });

    return bestTimes.slice(0, 6); // Return up to 6 best times
  }
}

// Singleton instance
export const weatherService = new WeatherService();
