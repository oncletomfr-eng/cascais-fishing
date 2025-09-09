import { NextRequest, NextResponse } from 'next/server';

/**
 * Tomorrow.io Weather API Proxy
 * Server-side proxy for Tomorrow.io API with API key protection
 */

const TOMORROW_IO_BASE_URL = 'https://api.tomorrow.io/v4';

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

    // Check API key availability
    const apiKey = process.env.TOMORROW_IO_API_KEY || process.env.NEXT_PUBLIC_TOMORROW_IO_API_KEY;
    
    if (!apiKey || apiKey.includes('demo-key') || apiKey.includes('please-configure')) {
      return NextResponse.json({
        success: false,
        error: 'Tomorrow.io API key not configured',
        details: {
          fallbackRecommended: true,
          configurationNeeded: 'TOMORROW_IO_API_KEY environment variable'
        }
      }, { status: 500 });
    }

    const type = searchParams.get('type') || 'realtime';
    let apiUrl: string;
    let params: URLSearchParams;

    switch (type) {
      case 'realtime':
        params = new URLSearchParams({
          location: `${latitude},${longitude}`,
          apikey: apiKey
        });
        apiUrl = `${TOMORROW_IO_BASE_URL}/weather/realtime?${params}`;
        break;

      case 'forecast':
        params = new URLSearchParams({
          location: `${latitude},${longitude}`,
          timesteps: '1h',
          apikey: apiKey
        });
        apiUrl = `${TOMORROW_IO_BASE_URL}/weather/forecast?${params}`;
        break;

      case 'marine':
        // Marine/Timeline data with wave information
        params = new URLSearchParams({
          location: `${latitude},${longitude}`,
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
            'seaSurfaceTemperature',
            'seaCurrentSpeed',
            'seaCurrentDirection',
            'windSpeed',
            'windDirection'
          ].join(','),
          timesteps: '1h',
          startTime: 'now',
          endTime: searchParams.get('endTime') || 'nowPlus6h',
          apikey: apiKey
        });
        apiUrl = `${TOMORROW_IO_BASE_URL}/timelines?${params}`;
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type parameter. Use: realtime, forecast, or marine'
        }, { status: 400 });
    }

    console.log(`🌦️  Proxying Tomorrow.io request (${type}): ${apiUrl.replace(apiKey, 'API_KEY_HIDDEN')}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CascaisFishing/1.0-Server'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Tomorrow.io API error (${type}):`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      let errorMessage = 'Failed to fetch data from Tomorrow.io';
      let fallbackRecommended = true;

      if (response.status === 401) {
        errorMessage = 'Tomorrow.io API key invalid or expired';
      } else if (response.status === 403) {
        errorMessage = 'Tomorrow.io API access forbidden - check subscription or rate limits';
        if (type === 'marine') {
          errorMessage += ' (Marine data may require paid plan)';
        }
      } else if (response.status === 429) {
        errorMessage = 'Tomorrow.io API rate limit exceeded';
      }
      
      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: {
          status: response.status,
          statusText: response.statusText,
          type,
          fallbackRecommended
        }
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        source: 'Tomorrow.io',
        proxyTime: new Date().toISOString(),
        type,
        coordinates: `${latitude},${longitude}`,
        apiKeyStatus: '✅ Valid'
      }
    });

  } catch (error) {
    console.error('Tomorrow.io proxy error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error in Tomorrow.io proxy',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: {
        fallbackRecommended: true
      }
    }, { status: 500 });
  }
}
