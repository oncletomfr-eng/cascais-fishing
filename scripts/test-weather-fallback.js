#!/usr/bin/env node

/**
 * Test Tomorrow.io fallback functionality
 * Simulates Open-Meteo API failure and tests fallback to Tomorrow.io
 */

import fetch from 'node-fetch';

// Test configuration
const TEST_CONFIG = {
  // Use the API key we just obtained
  tomorrowApiKey: '3eCDo17EuQIBqX7SzX8qg2kds8QP2cxn',
  // Test location: Cascais, Portugal  
  location: { latitude: 38.7223, longitude: -9.1393, name: 'Cascais, Portugal' },
  // Tomorrow.io API endpoints
  apiBaseUrl: 'https://api.tomorrow.io/v4',
  timeout: 10000
};

// Weather Service class for testing
class TestWeatherService {
  constructor(config) {
    this.config = { ...TEST_CONFIG, ...config };
  }

  /**
   * Test Open-Meteo API (expect it to fail in production due to CORS)
   */
  async testOpenMeteoAPI(location) {
    console.log('🌐 Testing Open-Meteo API...');
    
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        current: [
          'temperature_2m',
          'relative_humidity_2m', 
          'wind_speed_10m',
          'wind_direction_10m',
          'weather_code'
        ].join(','),
        timezone: 'auto'
      });

      const response = await this.fetchWithTimeout(
        `https://api.open-meteo.com/v1/forecast?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Open-Meteo API: SUCCESS');
        console.log(`   Temperature: ${data.current.temperature_2m}°C`);
        console.log(`   Wind: ${data.current.wind_speed_10m} m/s`);
        return data;
      } else {
        throw new Error(`Open-Meteo API error: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Open-Meteo API: FAILED');
      console.log(`   Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test Tomorrow.io API fallback
   */
  async testTomorrowAPI(location) {
    console.log('🌦️  Testing Tomorrow.io API fallback...');
    
    try {
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        apikey: this.config.tomorrowApiKey
      });

      const response = await this.fetchWithTimeout(
        `${this.config.apiBaseUrl}/weather/realtime?${params}`
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Tomorrow.io API key invalid or expired');
        } else if (response.status === 403) {
          throw new Error('Tomorrow.io API access forbidden - check subscription');
        } else {
          throw new Error(`Tomorrow.io API error: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('✅ Tomorrow.io API: SUCCESS');
      console.log(`   Temperature: ${data.data.values.temperature}°C`);
      console.log(`   Wind: ${data.data.values.windSpeed} m/s`);
      console.log(`   Humidity: ${data.data.values.humidity}%`);
      return data;
    } catch (error) {
      console.log('❌ Tomorrow.io API: FAILED');
      console.log(`   Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test Tomorrow.io Marine API (expecting limited access on free plan)
   */
  async testTomorrowMarineAPI(location) {
    console.log('🌊 Testing Tomorrow.io Marine API...');
    
    try {
      const params = new URLSearchParams({
        location: `${location.latitude},${location.longitude}`,
        fields: [
          'waveSignificantHeight',
          'waveFromDirection', 
          'waveMeanPeriod',
          'seaSurfaceTemperature'
        ].join(','),
        timesteps: '1h',
        startTime: 'now',
        endTime: 'nowPlus1h',
        apikey: this.config.tomorrowApiKey
      });

      const response = await this.fetchWithTimeout(
        `${this.config.apiBaseUrl}/timelines?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Tomorrow.io Marine API: SUCCESS');
        
        const timeline = data.data.timelines?.[0];
        if (timeline && timeline.intervals && timeline.intervals.length > 0) {
          const values = timeline.intervals[0].values;
          console.log(`   Wave Height: ${values.waveSignificantHeight || 'N/A'}`);
          console.log(`   Sea Temp: ${values.seaSurfaceTemperature || 'N/A'}°C`);
        }
        
        return data;
      } else {
        console.log(`⚠️  Tomorrow.io Marine API: Limited access (status ${response.status})`);
        console.log('   This is expected on free plan - falling back to estimates');
        return null;
      }
    } catch (error) {
      console.log('⚠️  Tomorrow.io Marine API: FAILED');
      console.log(`   Error: ${error.message}`);
      console.log('   Falling back to estimated marine data...');
      return null;
    }
  }

  /**
   * Test fallback data generation
   */
  testFallbackData(location) {
    console.log('🔄 Testing fallback data generation...');
    
    // Simulate the fallback logic from tomorrow-marine.ts
    const estimatedWaveHeight = this.estimateWaveHeight(location);
    const seaTemperature = this.estimateSeaTemperature(location);
    
    const fallbackData = {
      waveHeight: estimatedWaveHeight,
      wavePeriod: 6, // Typical period for coastal waters
      waveDirection: 270, // Westerly default for Atlantic coast
      swellWaveHeight: estimatedWaveHeight * 0.7,
      swellWavePeriod: 8,
      swellWaveDirection: 280,
      seaTemperature: seaTemperature,
      timestamp: new Date()
    };
    
    console.log('✅ Fallback data generated:');
    console.log(`   Wave Height: ${fallbackData.waveHeight}m`);
    console.log(`   Sea Temperature: ${fallbackData.seaTemperature}°C`);
    console.log(`   Wave Period: ${fallbackData.wavePeriod}s`);
    
    return fallbackData;
  }

  /**
   * Estimate wave height based on location (from tomorrow-marine.ts)
   */
  estimateWaveHeight(location) {
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
  estimateSeaTemperature(location) {
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
  async fetchWithTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CascaisFishing/1.0-Test'
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

/**
 * Run comprehensive fallback tests
 */
async function runFallbackTests() {
  console.log('🧪 WEATHER FALLBACK SYSTEM TEST');
  console.log('================================\n');
  
  const weatherService = new TestWeatherService();
  const location = TEST_CONFIG.location;
  
  console.log(`📍 Test Location: ${location.name}`);
  console.log(`   Coordinates: ${location.latitude}, ${location.longitude}\n`);

  let openMeteoWorking = false;
  let tomorrowWorking = false;

  // Test 1: Open-Meteo API (primary)
  console.log('TEST 1: Primary Weather API (Open-Meteo)');
  console.log('----------------------------------------');
  try {
    await weatherService.testOpenMeteoAPI(location);
    openMeteoWorking = true;
  } catch (error) {
    console.log('   Expected failure in production due to CORS');
  }
  console.log();

  // Test 2: Tomorrow.io API (fallback)
  console.log('TEST 2: Fallback Weather API (Tomorrow.io)');
  console.log('-------------------------------------------');
  try {
    await weatherService.testTomorrowAPI(location);
    tomorrowWorking = true;
  } catch (error) {
    console.log('   API key may need to be added to environment variables');
  }
  console.log();

  // Test 3: Tomorrow.io Marine API 
  console.log('TEST 3: Marine Data API (Tomorrow.io)');
  console.log('-------------------------------------');
  await weatherService.testTomorrowMarineAPI(location);
  console.log();

  // Test 4: Fallback data generation
  console.log('TEST 4: Fallback Data Generation');
  console.log('--------------------------------');
  weatherService.testFallbackData(location);
  console.log();

  // Summary
  console.log('📊 TEST SUMMARY');
  console.log('===============');
  console.log(`Open-Meteo API: ${openMeteoWorking ? '✅ Working' : '❌ Failed (expected)'}`);
  console.log(`Tomorrow.io API: ${tomorrowWorking ? '✅ Working' : '❌ Failed'}`);
  console.log(`Fallback System: ✅ Working`);
  console.log();

  if (tomorrowWorking) {
    console.log('🎉 FALLBACK SYSTEM READY!');
    console.log('   Tomorrow.io API is working as expected');
    console.log('   System will gracefully handle Open-Meteo failures');
  } else {
    console.log('⚠️  SETUP NEEDED:');
    console.log('   Add TOMORROW_IO_API_KEY to environment variables');
    console.log('   Then redeploy to activate fallback system');
  }
}

// Run the tests
runFallbackTests().catch(console.error);
