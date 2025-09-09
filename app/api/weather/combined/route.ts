import { NextRequest, NextResponse } from 'next/server';

/**
 * Combined Weather API with Automatic Fallback
 * This route combines weather and marine data with automatic fallback logic
 * Solves CORS issues and provides seamless fallback experience
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    
    if (!latitude || !longitude) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: latitude, longitude'
      }, { status: 400 });
    }

    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';

    console.log(`🌐 Combined weather request for ${latitude}, ${longitude}`);

    let weatherData = null;
    let marineData = null;
    let weatherSource = 'unknown';
    let marineSource = 'unknown';
    const errors = [];

    // ====================================
    // WEATHER DATA FETCHING (with fallback)
    // ====================================
    
    // Try 1: Open-Meteo Weather API (primary)
    try {
      console.log('🌡️  Trying Open-Meteo Weather API...');
      const openMeteoUrl = `${baseUrl}/api/weather/open-meteo?latitude=${latitude}&longitude=${longitude}&type=current`;
      const response = await fetch(openMeteoUrl);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          weatherData = result.data;
          weatherSource = 'Open-Meteo';
          console.log('✅ Open-Meteo Weather: SUCCESS');
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️  Open-Meteo Weather failed:', error.message);
      errors.push({ api: 'Open-Meteo Weather', error: error.message });

      // Try 2: Tomorrow.io Weather API (fallback)
      try {
        console.log('🌦️  Trying Tomorrow.io Weather API fallback...');
        const tomorrowUrl = `${baseUrl}/api/weather/tomorrow?latitude=${latitude}&longitude=${longitude}&type=realtime`;
        const response = await fetch(tomorrowUrl);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            // Convert Tomorrow.io format to consistent format
            weatherData = convertTomorrowToStandardFormat(result.data);
            weatherSource = 'Tomorrow.io';
            console.log('✅ Tomorrow.io Weather: SUCCESS');
          } else {
            throw new Error(result.error);
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (fallbackError) {
        console.log('❌ Tomorrow.io Weather also failed:', fallbackError.message);
        errors.push({ api: 'Tomorrow.io Weather', error: fallbackError.message });
        
        // Use estimated weather data
        weatherData = createEstimatedWeatherData(parseFloat(latitude), parseFloat(longitude));
        weatherSource = 'Estimated';
        console.log('🔄 Using estimated weather data');
      }
    }

    // ====================================
    // MARINE DATA FETCHING (with fallback)
    // ====================================
    
    // Try 1: Open-Meteo Marine API (primary)
    try {
      console.log('🌊 Trying Open-Meteo Marine API...');
      const marineUrl = `${baseUrl}/api/weather/marine?latitude=${latitude}&longitude=${longitude}`;
      const response = await fetch(marineUrl);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          marineData = convertOpenMeteoMarineToStandardFormat(result.data);
          marineSource = 'Open-Meteo Marine';
          console.log('✅ Open-Meteo Marine: SUCCESS');
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log('⚠️  Open-Meteo Marine failed:', error.message);
      errors.push({ api: 'Open-Meteo Marine', error: error.message });

      // Try 2: Tomorrow.io Marine API (fallback)
      try {
        console.log('🌊 Trying Tomorrow.io Marine API fallback...');
        const tomorrowMarineUrl = `${baseUrl}/api/weather/tomorrow?latitude=${latitude}&longitude=${longitude}&type=marine`;
        const response = await fetch(tomorrowMarineUrl);
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            marineData = convertTomorrowMarineToStandardFormat(result.data);
            marineSource = 'Tomorrow.io Marine';
            console.log('✅ Tomorrow.io Marine: SUCCESS');
          } else {
            throw new Error(result.error);
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (fallbackError) {
        console.log('⚠️  Tomorrow.io Marine also failed:', fallbackError.message);
        errors.push({ api: 'Tomorrow.io Marine', error: fallbackError.message });
        
        // Use estimated marine data
        marineData = createEstimatedMarineData(parseFloat(latitude), parseFloat(longitude));
        marineSource = 'Estimated';
        console.log('🔄 Using estimated marine data');
      }
    }

    // ====================================
    // RESPONSE ASSEMBLY
    // ====================================
    
    const combinedData = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: `${latitude}, ${longitude}`
      },
      weather: weatherData,
      marine: marineData,
      metadata: {
        weatherSource,
        marineSource,
        timestamp: new Date().toISOString(),
        hasErrors: errors.length > 0,
        errors: errors.length > 0 ? errors : undefined,
        fallbacksUsed: {
          weather: weatherSource !== 'Open-Meteo',
          marine: marineSource !== 'Open-Meteo Marine'
        }
      }
    };

    console.log(`✅ Combined API response ready: Weather(${weatherSource}) + Marine(${marineSource})`);
    
    return NextResponse.json({
      success: true,
      data: combinedData
    });

  } catch (error) {
    console.error('Combined weather API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error in combined weather API',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Convert Tomorrow.io realtime data to standard format
 */
function convertTomorrowToStandardFormat(tomorrowData: any) {
  const values = tomorrowData.data.values;
  
  return {
    current: {
      temperature_2m: values.temperature,
      relative_humidity_2m: values.humidity,
      apparent_temperature: values.temperatureApparent,
      is_day: values.uvIndex > 0 ? 1 : 0,
      precipitation: values.rainIntensity || 0,
      weather_code: mapTomorrowWeatherCode(values.weatherCode),
      cloud_cover: values.cloudCover,
      pressure_msl: values.pressureSeaLevel,
      wind_speed_10m: values.windSpeed,
      wind_direction_10m: values.windDirection,
      wind_gusts_10m: values.windGust
    },
    current_units: {
      temperature_2m: "°C",
      relative_humidity_2m: "%",
      wind_speed_10m: "m/s"
    }
  };
}

/**
 * Convert Open-Meteo Marine data to standard format
 */
function convertOpenMeteoMarineToStandardFormat(marineData: any) {
  const hourly = marineData.hourly;
  if (!hourly || !hourly.time || hourly.time.length === 0) {
    return null;
  }
  
  return {
    waveHeight: hourly.wave_height?.[0] || 0,
    wavePeriod: hourly.wave_period?.[0] || 0,
    waveDirection: hourly.wave_direction?.[0] || 0,
    swellWaveHeight: hourly.swell_wave_height?.[0],
    swellWavePeriod: hourly.swell_wave_period?.[0],
    swellWaveDirection: hourly.swell_wave_direction?.[0],
    timestamp: new Date(hourly.time[0])
  };
}

/**
 * Convert Tomorrow.io Marine data to standard format
 */
function convertTomorrowMarineToStandardFormat(tomorrowData: any) {
  const timeline = tomorrowData.data.timelines?.[0];
  if (!timeline || !timeline.intervals || timeline.intervals.length === 0) {
    return null;
  }

  const values = timeline.intervals[0].values;
  
  return {
    waveHeight: values.waveSignificantHeight || 0,
    wavePeriod: values.waveMeanPeriod || 0,
    waveDirection: values.waveFromDirection || 0,
    swellWaveHeight: values.primarySwellWaveSignificantHeight,
    swellWavePeriod: values.primarySwellWaveMeanPeriod,
    swellWaveDirection: values.primarySwellWaveFromDirection,
    seaTemperature: values.seaSurfaceTemperature,
    timestamp: new Date(timeline.intervals[0].startTime)
  };
}

/**
 * Create estimated weather data (final fallback)
 */
function createEstimatedWeatherData(latitude: number, longitude: number) {
  const month = new Date().getMonth(); // 0-11
  const isWinter = month < 3 || month > 9;
  const isSummer = month >= 5 && month <= 8;
  
  let temperature = 18; // Default for Cascais area
  let windSpeed = 5;
  
  // Adjust for location
  if (latitude > 35 && latitude < 45 && longitude < -5) {
    // Atlantic coast (Cascais area)
    temperature = isWinter ? 15 : isSummer ? 22 : 18;
    windSpeed = isWinter ? 8 : 5;
  }
  
  return {
    current: {
      temperature_2m: temperature,
      relative_humidity_2m: 65,
      apparent_temperature: temperature,
      is_day: 1,
      precipitation: 0,
      weather_code: 1, // Clear sky
      cloud_cover: 25,
      pressure_msl: 1013,
      wind_speed_10m: windSpeed,
      wind_direction_10m: 270,
      wind_gusts_10m: windSpeed * 1.5
    },
    current_units: {
      temperature_2m: "°C",
      relative_humidity_2m: "%",
      wind_speed_10m: "m/s"
    }
  };
}

/**
 * Create estimated marine data (final fallback)
 */
function createEstimatedMarineData(latitude: number, longitude: number) {
  const month = new Date().getMonth();
  const isWinter = month < 3 || month > 9;
  
  // For Cascais/Atlantic coast - typical conditions
  let waveHeight = 1.2;
  let seaTemperature = 18;
  
  if (latitude > 35 && latitude < 45 && longitude < -5) {
    waveHeight = isWinter ? 1.5 : 1.0; // Higher waves in winter
    seaTemperature = isWinter ? 15 : 20;
  }
  
  return {
    waveHeight,
    wavePeriod: 6,
    waveDirection: 270, // Westerly
    swellWaveHeight: waveHeight * 0.7,
    swellWavePeriod: 8,
    swellWaveDirection: 280,
    seaTemperature,
    timestamp: new Date()
  };
}

/**
 * Map Tomorrow.io weather codes to Open-Meteo codes
 */
function mapTomorrowWeatherCode(tomorrowCode: number): number {
  // Basic mapping - can be expanded
  switch (tomorrowCode) {
    case 1000: return 0; // Clear
    case 1100: return 1; // Mostly Clear
    case 1001: return 2; // Cloudy
    case 1101: return 3; // Partly Cloudy
    case 4000: return 61; // Light Rain
    case 4001: return 63; // Rain
    default: return 0; // Clear as fallback
  }
}
