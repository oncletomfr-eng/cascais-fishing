import { NextRequest, NextResponse } from 'next/server';

/**
 * Open-Meteo Weather API Proxy
 * Server-side proxy to avoid CORS issues with Open-Meteo API
 */

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1';

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

    // Get the request type: current, hourly, daily
    const type = searchParams.get('type') || 'current';
    
    let apiUrl: string;
    let params: URLSearchParams;

    switch (type) {
      case 'current':
        params = new URLSearchParams({
          latitude,
          longitude,
          current: [
            'temperature_2m',
            'relative_humidity_2m',
            'apparent_temperature',
            'is_day',
            'precipitation',
            'weather_code',
            'cloud_cover',
            'pressure_msl',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m'
          ].join(','),
          timezone: 'auto'
        });
        apiUrl = `${OPEN_METEO_BASE_URL}/forecast?${params}`;
        break;

      case 'hourly':
        params = new URLSearchParams({
          latitude,
          longitude,
          hourly: [
            'temperature_2m',
            'relative_humidity_2m',
            'precipitation_probability',
            'precipitation',
            'weather_code',
            'pressure_msl',
            'cloud_cover',
            'visibility',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m'
          ].join(','),
          timezone: 'auto',
          forecast_days: searchParams.get('forecast_days') || '3'
        });
        apiUrl = `${OPEN_METEO_BASE_URL}/forecast?${params}`;
        break;

      case 'daily':
        params = new URLSearchParams({
          latitude,
          longitude,
          daily: [
            'weather_code',
            'temperature_2m_max',
            'temperature_2m_min',
            'precipitation_sum',
            'precipitation_probability_max',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'sunrise',
            'sunset'
          ].join(','),
          timezone: 'auto',
          forecast_days: searchParams.get('forecast_days') || '7'
        });
        apiUrl = `${OPEN_METEO_BASE_URL}/forecast?${params}`;
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type parameter. Use: current, hourly, or daily'
        }, { status: 400 });
    }

    console.log(`🌐 Proxying Open-Meteo request: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CascaisFishing/1.0-Server'
      }
    });

    if (!response.ok) {
      console.error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch weather data from Open-Meteo',
        details: {
          status: response.status,
          statusText: response.statusText
        }
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        source: 'Open-Meteo',
        proxyTime: new Date().toISOString(),
        type,
        coordinates: `${latitude},${longitude}`
      }
    });

  } catch (error) {
    console.error('Open-Meteo proxy error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error in Open-Meteo proxy',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
