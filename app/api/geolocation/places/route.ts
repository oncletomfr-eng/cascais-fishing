import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { realGeocodingService } from '@/lib/services/real-geocoding-service';

// Схема валидации для поиска мест
const PlaceSearchSchema = z.object({
  query: z.string().min(1, 'Поисковый запрос не может быть пустым'),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(50000).optional() // радиус в метрах
});

/**
 * GET /api/geolocation/places
 * Поиск мест по текстовому запросу
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const radius = searchParams.get('radius');

    if (!query) {
      return NextResponse.json(
        { error: 'Параметр query обязателен' },
        { status: 400 }
      );
    }

    // Валидация параметров
    const validationData: any = { query };
    if (latitude) validationData.latitude = parseFloat(latitude);
    if (longitude) validationData.longitude = parseFloat(longitude);
    if (radius) validationData.radius = parseInt(radius);

    const validation = PlaceSearchSchema.safeParse(validationData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: validation.error.issues },
        { status: 400 }
      );
    }

    console.log(`Поиск мест: "${query}"`);

    // Формируем опциональный объект location
    const location = (validation.data.latitude && validation.data.longitude) ? {
      lat: validation.data.latitude,
      lng: validation.data.longitude
    } : undefined;

    const results = await realGeocodingService.searchPlaces(
      validation.data.query,
      location,
      validation.data.radius
    );

    return NextResponse.json({
      success: true,
      data: {
        places: results,
        total: results.length
      },
      metadata: {
        query: validation.data.query,
        location: location,
        radius: validation.data.radius,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Ошибка поиска мест:', error);
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера поиска мест',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
