import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { realGeocodingService } from '@/lib/services/real-geocoding-service';

// Схемы валидации
const GeocodeQuerySchema = z.object({
  address: z.string().min(1, 'Адрес не может быть пустым')
});

const ReverseGeocodeQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180)
});

/**
 * GET /api/geolocation/geocode
 * Геокодинг: получение координат по адресу
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');

    // Определяем тип запроса
    if (address) {
      // Прямой геокодинг (адрес -> координаты)
      const validation = GeocodeQuerySchema.safeParse({ address });
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Неверные параметры', details: validation.error.issues },
          { status: 400 }
        );
      }

      console.log(`Геокодинг адреса: ${address}`);
      
      const result = await realGeocodingService.geocodeAddress(address);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Адрес не найден' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'geocoding',
        data: result,
        metadata: {
          query: address,
          timestamp: new Date().toISOString()
        }
      });

    } else if (latitude && longitude) {
      // Обратный геокодинг (координаты -> адрес)
      const validation = ReverseGeocodeQuerySchema.safeParse({ 
        latitude: parseFloat(latitude), 
        longitude: parseFloat(longitude) 
      });
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Неверные параметры координат', details: validation.error.issues },
          { status: 400 }
        );
      }

      console.log(`Обратный геокодинг: ${latitude}, ${longitude}`);
      
      const result = await realGeocodingService.reverseGeocode(
        validation.data.latitude,
        validation.data.longitude
      );
      
      if (!result) {
        return NextResponse.json(
          { error: 'Адрес для координат не найден' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        type: 'reverse_geocoding',
        data: result,
        metadata: {
          query: { latitude: validation.data.latitude, longitude: validation.data.longitude },
          timestamp: new Date().toISOString()
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Укажите либо параметр address, либо latitude и longitude' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Ошибка геокодинга:', error);
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера геокодинга',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}
