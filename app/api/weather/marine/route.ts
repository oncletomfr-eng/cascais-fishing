import { NextRequest, NextResponse } from 'next/server';

/**
 * Open-Meteo Marine API Proxy
 * Server-side proxy to avoid CORS issues with Open-Meteo Marine API
 */

const OPEN_METEO_MARINE_BASE_URL = 'https://marine-api.open-meteo.com/v1';

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

    const params = new URLSearchParams({
      latitude,
      longitude,
      hourly: [
        'wave_height',
        'wave_direction',
        'wave_period',
        'swell_wave_height',
        'swell_wave_direction',
        'swell_wave_period'
      ].join(','),
      timezone: 'auto',
      forecast_days: searchParams.get('forecast_days') || '1'
    });

    const apiUrl = `${OPEN_METEO_MARINE_BASE_URL}/marine?${params}`;
    
    console.log(`🌊 Proxying Open-Meteo Marine request: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CascaisFishing/1.0-Server'
      }
    });

    if (!response.ok) {
      console.error(`Open-Meteo Marine API error: ${response.status} ${response.statusText}`);
      
      // Marine API might not be available for all locations
      // Return a structured error that the client can handle
      return NextResponse.json({
        success: false,
        error: 'Marine data not available for this location',
        details: {
          status: response.status,
          statusText: response.statusText,
          location: { latitude, longitude },
          fallbackRecommended: true
        }
      }, { status: response.status });
    }

    const data = await response.json();
    
    // Validate that we have marine data
    if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No marine data available for this location',
        details: {
          location: { latitude, longitude },
          fallbackRecommended: true
        }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        source: 'Open-Meteo Marine',
        proxyTime: new Date().toISOString(),
        coordinates: `${latitude},${longitude}`,
        dataPoints: data.hourly.time.length
      }
    });

  } catch (error) {
    console.error('Open-Meteo Marine proxy error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error in Marine proxy',
      message: error instanceof Error ? error.message : 'Unknown error',
      fallbackRecommended: true
    }, { status: 500 });
  }
}
