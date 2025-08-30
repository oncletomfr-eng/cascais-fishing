'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { WeatherData, WeatherLocation, FishingConditions, WeatherAlert } from '@/lib/types/weather';
import { weatherService } from '@/lib/services/weather';
import { tomorrowMarineService } from '@/lib/services/tomorrow-marine';

interface UseWeatherOptions {
  location?: WeatherLocation;
  enableMarine?: boolean;
  enableFishingAssessment?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseWeatherReturn {
  weatherData: WeatherData | null;
  fishingConditions: FishingConditions | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshWeather: () => Promise<void>;
  setLocation: (location: WeatherLocation) => void;
}

/**
 * Hook for managing weather data with automatic refresh and caching
 */
export function useWeather(options: UseWeatherOptions = {}): UseWeatherReturn {
  const {
    location,
    enableMarine = true,
    enableFishingAssessment = true,
    autoRefresh = true,
    refreshInterval = 10 * 60 * 1000 // 10 minutes
  } = options;

  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [fishingConditions, setFishingConditions] = useState<FishingConditions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentLocation, setCurrentLocation] = useState<WeatherLocation | undefined>(location);

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Default location (Cascais, Portugal)
  const defaultLocation: WeatherLocation = {
    latitude: 38.7223,
    longitude: -9.1393,
    name: 'Cascais, Portugal'
  };

  const activeLocation = currentLocation || defaultLocation;

  /**
   * Fetch weather data for the current location
   */
  const fetchWeatherData = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await weatherService.getWeatherData(activeLocation);
      
      if (!isMountedRef.current) return;

      setWeatherData(data);
      
      // Assess fishing conditions if enabled
      if (enableFishingAssessment) {
        const conditions = weatherService.assessFishingConditions(data);
        setFishingConditions(conditions);
      } else {
        setFishingConditions(null);
      }
      
      setLastUpdated(new Date());
    } catch (error) {
      if (!isMountedRef.current) return;
      
      console.error('Failed to fetch weather data:', error);
      setError(error instanceof Error ? error.message : 'Не удалось загрузить данные о погоде');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [activeLocation, enableFishingAssessment]);

  /**
   * Refresh weather data manually
   */
  const refreshWeather = useCallback(async () => {
    await fetchWeatherData();
  }, [fetchWeatherData]);

  /**
   * Set new location
   */
  const setLocation = useCallback((newLocation: WeatherLocation) => {
    setCurrentLocation(newLocation);
  }, []);

  /**
   * Setup auto-refresh interval
   */
  const setupAutoRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearInterval(refreshTimeoutRef.current);
    }

    if (autoRefresh && refreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchWeatherData();
        }
      }, refreshInterval);
    }
  }, [autoRefresh, refreshInterval, fetchWeatherData]);

  // Initial data fetch when location changes
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Setup auto-refresh
  useEffect(() => {
    setupAutoRefresh();
    
    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, [setupAutoRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    weatherData,
    fishingConditions,
    isLoading,
    error,
    lastUpdated,
    refreshWeather,
    setLocation
  };
}

/**
 * Hook for getting weather alerts and notifications
 */
export function useWeatherAlerts(location?: WeatherLocation) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const checkWeatherAlerts = useCallback(async () => {
    if (!location) return;

    try {
      setIsLoading(true);
      
      // Get current weather data
      const weatherData = await weatherService.getWeatherData(location);
      const fishingConditions = weatherService.assessFishingConditions(weatherData);
      
      const newAlerts: WeatherAlert[] = [];
      
      // Generate alerts based on conditions
      if (fishingConditions.overall === 'dangerous') {
        newAlerts.push({
          id: `danger-${Date.now()}`,
          type: 'general',
          severity: 'severe',
          title: 'Опасные условия для рыбалки',
          description: 'Текущие погодные условия делают рыбалку опасной. Рекомендуется отложить поездку.',
          location,
          startTime: new Date(),
          isActive: true
        });
      }
      
      // Wind alerts
      if (weatherData.current.windSpeed > 15) {
        newAlerts.push({
          id: `wind-${Date.now()}`,
          type: 'wind',
          severity: 'warning',
          title: 'Сильный ветер',
          description: `Скорость ветра: ${weatherData.current.windSpeed} м/с. Будьте осторожны на воде.`,
          location,
          startTime: new Date(),
          isActive: true
        });
      }
      
      // Wave alerts (if marine data available)
      if (weatherData.marine && weatherData.marine.waveHeight > 2) {
        newAlerts.push({
          id: `wave-${Date.now()}`,
          type: 'wave',
          severity: 'warning',
          title: 'Высокие волны',
          description: `Высота волн: ${weatherData.marine.waveHeight.toFixed(1)} м. Не рекомендуется выход в море.`,
          location,
          startTime: new Date(),
          isActive: true
        });
      }

      // Fetch marine alerts from Tomorrow.io
      try {
        const marineAlerts = await tomorrowMarineService.getMarineAlerts(location);
        newAlerts.push(...marineAlerts);
      } catch (error) {
        console.warn('Failed to fetch marine alerts from Tomorrow.io:', error);
      }
      
      setAlerts(newAlerts);
    } catch (error) {
      console.error('Failed to check weather alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [location]);

  useEffect(() => {
    checkWeatherAlerts();
    
    // Check for alerts every 30 minutes
    const interval = setInterval(checkWeatherAlerts, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkWeatherAlerts]);

  return {
    alerts,
    isLoading,
    refreshAlerts: checkWeatherAlerts
  };
}

/**
 * Hook for getting weather data for multiple locations
 */
export function useMultiLocationWeather(locations: WeatherLocation[]) {
  const [weatherMap, setWeatherMap] = useState<Map<string, WeatherData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllWeatherData = useCallback(async () => {
    if (locations.length === 0) return;

    try {
      setIsLoading(true);
      setError(null);

      const weatherPromises = locations.map(location =>
        weatherService.getWeatherData(location).then(data => ({
          key: `${location.latitude},${location.longitude}`,
          data
        }))
      );

      const results = await Promise.allSettled(weatherPromises);
      const newWeatherMap = new Map<string, WeatherData>();

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          newWeatherMap.set(result.value.key, result.value.data);
        } else {
          console.error(`Failed to fetch weather for location ${index}:`, result.reason);
        }
      });

      setWeatherMap(newWeatherMap);
    } catch (error) {
      console.error('Failed to fetch weather data for multiple locations:', error);
      setError('Не удалось загрузить данные о погоде для некоторых локаций');
    } finally {
      setIsLoading(false);
    }
  }, [locations]);

  useEffect(() => {
    fetchAllWeatherData();
  }, [fetchAllWeatherData]);

  const getWeatherForLocation = useCallback((location: WeatherLocation): WeatherData | null => {
    const key = `${location.latitude},${location.longitude}`;
    return weatherMap.get(key) || null;
  }, [weatherMap]);

  return {
    weatherMap,
    isLoading,
    error,
    getWeatherForLocation,
    refreshAll: fetchAllWeatherData
  };
}
