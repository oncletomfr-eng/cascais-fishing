'use client';

import {
  WeatherLocation,
  MarineConditions,
  WeatherAlert
} from '@/lib/types/weather';

// Tomorrow.io API configuration
const TOMORROW_IO_CONFIG = {
  baseUrl: 'https://api.tomorrow.io/v4',
  // Note: In production, this should be stored securely in environment variables
  // For testing, we'll use a free tier key or create a fallback
  apiKey: process.env.NEXT_PUBLIC_TOMORROW_IO_API_KEY || process.env.TOMORROW_IO_API_KEY || '',
  timeout: 10000
};

// Tomorrow.io Marine response interface
interface TomorrowMarineResponse {
  data: {
    timelines: Array<{
      timestep: string;
      startTime: string;
      endTime: string;
      intervals: Array<{
        startTime: string;
        values: {
          waveSignificantHeight?: number;
          waveFromDirection?: number;
          waveMeanPeriod?: number;
          windWaveSignificantHeight?: number;
          windWaveFromDirection?: number;
          windWaveMeanPeriod?: number;
          primarySwellWaveSignificantHeight?: number;
          primarySwellWaveFromDirection?: number;
          primarySwellWaveMeanPeriod?: number;
          secondarySwellWaveSignificantHeight?: number;
          secondarySwellWaveFromDirection?: number;
          secondarySwellWaveMeanPeriod?: number;
          seaSurfaceTemperature?: number;
          seaCurrentSpeed?: number;
          seaCurrentDirection?: number;
          tides?: number;
          windSpeed?: number;
          windDirection?: number;
        };
      }>;
    }>;
  };
  location: {
    lat: number;
    lon: number;
  };
}

// Tomorrow.io Insights response for marine alerts
interface TomorrowInsightsResponse {
  data: {
    insights: Array<{
      name: string;
      severity: 'minor' | 'moderate' | 'severe' | 'extreme';
      certainty: 'unknown' | 'unlikely' | 'possible' | 'likely' | 'observed';
      urgency: 'unknown' | 'past' | 'future' | 'expected' | 'immediate';
      category: string;
      description: string;
      startTime: string;
      endTime?: string;
    }>;
  };
}

/**
 * Tomorrow.io Marine Weather Service
 * Provides marine conditions using Tomorrow.io API as alternative to Open-Meteo
 */
export class TomorrowMarineService {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(config: Partial<typeof TOMORROW_IO_CONFIG> = {}) {
    this.baseUrl = config.baseUrl || TOMORROW_IO_CONFIG.baseUrl;
    this.apiKey = config.apiKey || TOMORROW_IO_CONFIG.apiKey;
    this.timeout = config.timeout || TOMORROW_IO_CONFIG.timeout;
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(
      this.apiKey && 
      this.apiKey.length > 10 && 
      !this.apiKey.includes('demo-key') && 
      !this.apiKey.includes('please-configure')
    );
  }

  /**
   * Get marine conditions for a location
   */
  async getMarineConditions(location: WeatherLocation): Promise<MarineConditions | null> {
    if (!this.isConfigured()) {
      console.log('Tomorrow.io Marine service not configured - using fallback estimates');
      return this.createFallbackMarineData(location);
    }

    try {
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        fields: [
          'waveSignificantHeight',
          'waveFromDirection', 
          'waveMeanPeriod',
          'windWaveSignificantHeight',
          'windWaveFromDirection',
          'windWaveMeanPeriod',
          'primarySwellWaveSignificantHeight',
          'primarySwellWaveFromDirection',
          'primarySwellWaveMeanPeriod',
          'secondarySwellWaveSignificantHeight',
          'seaSurfaceTemperature',
          'seaCurrentSpeed',
          'seaCurrentDirection',
          'windSpeed',
          'windDirection'
        ].join(','),
        timesteps: '1h',
        startTime: 'now',
        endTime: 'nowPlus1h',
        apikey: this.apiKey
      });

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/timelines?${params}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Tomorrow.io API key invalid or expired');
        } else if (response.status === 403) {
          console.warn('Tomorrow.io API access forbidden - check subscription');
        } else {
          console.warn(`Tomorrow.io API error: ${response.status}`);
        }
        return this.createFallbackMarineData(location);
      }

      const data: TomorrowMarineResponse = await response.json();
      return this.parseMarineResponse(data);

    } catch (error) {
      console.error('Failed to fetch Tomorrow.io marine data:', error);
      return this.createFallbackMarineData(location);
    }
  }

  /**
   * Get marine weather alerts for a location
   */
  async getMarineAlerts(location: WeatherLocation): Promise<WeatherAlert[]> {
    if (!this.isConfigured()) {
      return [];
    }

    try {
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        insights: 'marine',
        apikey: this.apiKey
      });

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/insights?${params}`
      );

      if (!response.ok) {
        console.warn(`Tomorrow.io Insights API error: ${response.status}`);
        return [];
      }

      const data: TomorrowInsightsResponse = await response.json();
      return this.parseInsightsResponse(data, location);

    } catch (error) {
      console.error('Failed to fetch Tomorrow.io marine alerts:', error);
      return [];
    }
  }

  /**
   * Parse Tomorrow.io marine response to our format
   */
  private parseMarineResponse(data: TomorrowMarineResponse): MarineConditions | null {
    const timeline = data.data.timelines?.[0];
    if (!timeline || !timeline.intervals || timeline.intervals.length === 0) {
      return null;
    }

    const currentInterval = timeline.intervals[0];
    const values = currentInterval.values;

    return {
      waveHeight: values.waveSignificantHeight || 0,
      wavePeriod: values.waveMeanPeriod || 0,
      waveDirection: values.waveFromDirection || 0,
      swellWaveHeight: values.primarySwellWaveSignificantHeight,
      swellWavePeriod: values.primarySwellWaveMeanPeriod,
      swellWaveDirection: values.primarySwellWaveFromDirection,
      seaTemperature: values.seaSurfaceTemperature,
      timestamp: new Date(currentInterval.startTime)
    };
  }

  /**
   * Parse Tomorrow.io insights response to weather alerts
   */
  private parseInsightsResponse(data: TomorrowInsightsResponse, location: WeatherLocation): WeatherAlert[] {
    const alerts: WeatherAlert[] = [];
    
    if (!data.data.insights) {
      return alerts;
    }

    data.data.insights.forEach((insight, index) => {
      const severity = this.mapTomorrowSeverity(insight.severity, insight.urgency);
      
      alerts.push({
        id: `tomorrow-marine-${index}-${Date.now()}`,
        type: 'wave',
        severity,
        title: insight.name,
        description: insight.description,
        location,
        startTime: new Date(insight.startTime),
        endTime: insight.endTime ? new Date(insight.endTime) : undefined,
        isActive: insight.urgency === 'immediate' || insight.urgency === 'expected'
      });
    });

    return alerts;
  }

  /**
   * Map Tomorrow.io severity levels to our format
   */
  private mapTomorrowSeverity(
    severity: string, 
    urgency: string
  ): WeatherAlert['severity'] {
    // High urgency events are more severe
    if (urgency === 'immediate') {
      return severity === 'extreme' ? 'emergency' : 'severe';
    }
    
    switch (severity) {
      case 'extreme': return 'severe';
      case 'severe': return 'severe';
      case 'moderate': return 'warning';
      case 'minor': return 'info';
      default: return 'info';
    }
  }

  /**
   * Create fallback marine data based on wind conditions from Open-Meteo
   */
  private createFallbackMarineData(location: WeatherLocation): MarineConditions {
    // Simple wave height estimation based on typical coastal conditions
    // This is a basic fallback when marine API is not available
    const estimatedWaveHeight = this.estimateWaveHeight(location);
    
    return {
      waveHeight: estimatedWaveHeight,
      wavePeriod: 6, // Typical period for coastal waters
      waveDirection: 270, // Westerly default for Atlantic coast
      swellWaveHeight: estimatedWaveHeight * 0.7,
      swellWavePeriod: 8,
      swellWaveDirection: 280,
      seaTemperature: this.estimateSeaTemperature(location),
      timestamp: new Date()
    };
  }

  /**
   * Estimate wave height based on location
   */
  private estimateWaveHeight(location: WeatherLocation): number {
    // For Cascais/Atlantic coast - typical conditions
    if (location.latitude > 35 && location.latitude < 45 && location.longitude < -5) {
      return 1.2; // Typical Atlantic coastal conditions
    }
    
    // Mediterranean
    if (location.latitude > 30 && location.latitude < 45 && location.longitude > -5 && location.longitude < 40) {
      return 0.8; // Calmer Mediterranean conditions
    }
    
    // Default coastal conditions
    return 1.0;
  }

  /**
   * Estimate sea temperature based on location and season
   */
  private estimateSeaTemperature(location: WeatherLocation): number {
    const month = new Date().getMonth(); // 0-11
    const isWinter = month < 3 || month > 9;
    
    // Atlantic coast (Cascais area)
    if (location.latitude > 35 && location.latitude < 45 && location.longitude < -5) {
      return isWinter ? 15 : 20; // °C
    }
    
    // Mediterranean
    if (location.latitude > 30 && location.latitude < 45 && location.longitude > -5 && location.longitude < 40) {
      return isWinter ? 16 : 24; // °C
    }
    
    // Default temperate coastal water
    return isWinter ? 12 : 18;
  }

  /**
   * Fetch with timeout utility
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CascaisFishing/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

// Singleton instance
export const tomorrowMarineService = new TomorrowMarineService();
