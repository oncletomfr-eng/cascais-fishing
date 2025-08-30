import { NextRequest, NextResponse } from 'next/server';
import { realGeocodingService } from '@/lib/services/real-geocoding-service';

/**
 * GET /api/geolocation/validate
 * Проверка валидности Google Maps API ключа
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Проверка валидности Google Maps API ключа...');

    const isValid = await realGeocodingService.validateApiKey();
    const apiKeyExists = !!process.env.GOOGLE_MAPS_API_KEY;
    
    return NextResponse.json({
      success: true,
      data: {
        isValid,
        apiKeyExists,
        service: 'Google Maps Geocoding API',
        timestamp: new Date().toISOString()
      },
      metadata: {
        // В production не показываем детали ключа
        keyLength: process.env.NODE_ENV === 'development' && process.env.GOOGLE_MAPS_API_KEY 
          ? process.env.GOOGLE_MAPS_API_KEY.length 
          : undefined,
        environment: process.env.NODE_ENV
      }
    });

  } catch (error) {
    console.error('Ошибка валидации API ключа:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Ошибка валидации API ключа',
        data: {
          isValid: false,
          apiKeyExists: !!process.env.GOOGLE_MAPS_API_KEY
        },
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
