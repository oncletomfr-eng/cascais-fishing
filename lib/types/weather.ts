// Types for Open-Meteo Weather API
// Based on Open-Meteo documentation and marine forecast requirements

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  name?: string; // Location name for display
}

// Current weather conditions
export interface CurrentWeather {
  temperature: number; // °C
  feelsLike: number; // °C 
  humidity: number; // %
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // degrees
  windGust?: number; // m/s
  visibility: number; // meters
  weatherCode: number; // WMO weather interpretation codes
  weatherDescription: string;
  isDay: boolean;
  timestamp: Date;
}

// Marine conditions specific for fishing
export interface MarineConditions {
  waveHeight: number; // meters
  wavePeriod: number; // seconds  
  waveDirection: number; // degrees
  swellWaveHeight?: number; // meters
  swellWavePeriod?: number; // seconds
  swellWaveDirection?: number; // degrees
  seaTemperature?: number; // °C
  timestamp: Date;
}

// Hourly forecast data
export interface HourlyForecast {
  timestamp: Date;
  temperature: number; // °C
  humidity: number; // %
  pressure: number; // hPa
  windSpeed: number; // m/s
  windDirection: number; // degrees
  windGust?: number; // m/s
  precipitationProbability: number; // %
  precipitation: number; // mm
  weatherCode: number;
  weatherDescription: string;
  cloudCover: number; // %
  visibility?: number; // meters
}

// Daily forecast summary
export interface DailyForecast {
  date: Date;
  temperatureMin: number; // °C
  temperatureMax: number; // °C
  precipitationSum: number; // mm
  precipitationProbabilityMax: number; // %
  windSpeedMax: number; // m/s
  windGustMax?: number; // m/s
  weatherCode: number;
  weatherDescription: string;
  sunrise?: Date;
  sunset?: Date;
}

// Complete weather data for a location
export interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
  marine?: MarineConditions;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  updatedAt: Date;
}

// Fishing conditions assessment
export interface FishingConditions {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
  score: number; // 0-100
  factors: {
    windConditions: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
    waveConditions: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
    visibility: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
    precipitation: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
  };
  recommendations: string[];
  warnings: string[];
  bestTimes: Date[]; // Optimal fishing time slots for the day
}

// Weather alert/notification
export interface WeatherAlert {
  id: string;
  type: 'wind' | 'wave' | 'storm' | 'fog' | 'temperature' | 'general';
  severity: 'info' | 'warning' | 'severe' | 'emergency';
  title: string;
  description: string;
  location: WeatherLocation;
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
}

// API Response interfaces for Open-Meteo
export interface OpenMeteoCurrentResponse {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  current_units: Record<string, string>;
}

export interface OpenMeteoHourlyResponse {
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    pressure_msl: number[];
    cloud_cover: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
  };
  hourly_units: Record<string, string>;
}

export interface OpenMeteoDailyResponse {
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    sunrise: string[];
    sunset: string[];
  };
  daily_units: Record<string, string>;
}

export interface OpenMeteoMarineResponse {
  hourly: {
    time: string[];
    wave_height: number[];
    wave_direction: number[];
    wave_period: number[];
    swell_wave_height: number[];
    swell_wave_direction: number[];
    swell_wave_period: number[];
    ocean_current_velocity: number[];
    ocean_current_direction: number[];
  };
  hourly_units: Record<string, string>;
}

// Weather service configuration
export interface WeatherServiceConfig {
  apiBaseUrl: string;
  defaultLocation: WeatherLocation;
  enableMarine: boolean;
  enableAlerts: boolean;
  cacheDuration: number; // milliseconds
  requestTimeout: number; // milliseconds
}

// WMO Weather interpretation codes
export const WEATHER_CODES: Record<number, { description: string; icon: string; severity: 'low' | 'medium' | 'high' }> = {
  0: { description: 'Clear sky', icon: '☀️', severity: 'low' },
  1: { description: 'Mainly clear', icon: '🌤️', severity: 'low' },
  2: { description: 'Partly cloudy', icon: '⛅', severity: 'low' },
  3: { description: 'Overcast', icon: '☁️', severity: 'low' },
  45: { description: 'Fog', icon: '🌫️', severity: 'medium' },
  48: { description: 'Depositing rime fog', icon: '🌫️', severity: 'medium' },
  51: { description: 'Light drizzle', icon: '🌦️', severity: 'low' },
  53: { description: 'Moderate drizzle', icon: '🌦️', severity: 'medium' },
  55: { description: 'Dense drizzle', icon: '🌧️', severity: 'medium' },
  56: { description: 'Light freezing drizzle', icon: '🌨️', severity: 'high' },
  57: { description: 'Dense freezing drizzle', icon: '🌨️', severity: 'high' },
  61: { description: 'Slight rain', icon: '🌧️', severity: 'low' },
  63: { description: 'Moderate rain', icon: '🌧️', severity: 'medium' },
  65: { description: 'Heavy rain', icon: '🌧️', severity: 'high' },
  66: { description: 'Light freezing rain', icon: '🌨️', severity: 'high' },
  67: { description: 'Heavy freezing rain', icon: '🌨️', severity: 'high' },
  71: { description: 'Slight snow fall', icon: '🌨️', severity: 'medium' },
  73: { description: 'Moderate snow fall', icon: '❄️', severity: 'medium' },
  75: { description: 'Heavy snow fall', icon: '❄️', severity: 'high' },
  77: { description: 'Snow grains', icon: '❄️', severity: 'medium' },
  80: { description: 'Slight rain showers', icon: '🌦️', severity: 'low' },
  81: { description: 'Moderate rain showers', icon: '🌦️', severity: 'medium' },
  82: { description: 'Violent rain showers', icon: '⛈️', severity: 'high' },
  85: { description: 'Slight snow showers', icon: '🌨️', severity: 'medium' },
  86: { description: 'Heavy snow showers', icon: '❄️', severity: 'high' },
  95: { description: 'Thunderstorm', icon: '⛈️', severity: 'high' },
  96: { description: 'Thunderstorm with slight hail', icon: '⛈️', severity: 'high' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️', severity: 'high' }
};

// Fishing condition thresholds
export const FISHING_THRESHOLDS = {
  wind: {
    excellent: { min: 0, max: 5 }, // m/s
    good: { min: 5, max: 10 },
    fair: { min: 10, max: 15 },
    poor: { min: 15, max: 20 },
    dangerous: { min: 20, max: Infinity }
  },
  waves: {
    excellent: { min: 0, max: 0.5 }, // meters
    good: { min: 0.5, max: 1.0 },
    fair: { min: 1.0, max: 2.0 },
    poor: { min: 2.0, max: 3.0 },
    dangerous: { min: 3.0, max: Infinity }
  },
  visibility: {
    excellent: { min: 8000, max: Infinity }, // meters
    good: { min: 5000, max: 8000 },
    fair: { min: 2000, max: 5000 },
    poor: { min: 1000, max: 2000 },
    dangerous: { min: 0, max: 1000 }
  }
};
