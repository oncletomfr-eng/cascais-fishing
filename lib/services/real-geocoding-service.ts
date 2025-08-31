// import { Client } from '@googlemaps/google-maps-services-js'; // TEMPORARILY DISABLED FOR DEPLOYMENT

interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  region?: string;
}

interface GeocodingResponse {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  components: {
    city?: string;
    country?: string;
    postalCode?: string;
    region?: string;
    streetAddress?: string;
  };
  accuracy: string;
  placeId?: string;
  types?: string[];
}

export class RealGeocodingService {
  // private client: Client | null = null; // DISABLED FOR DEPLOYMENT
  private apiKey: string;
  private clientInitialized = false;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    console.log('🔧 RealGeocodingService using FALLBACK MODE (Google Maps disabled for deployment)', { 
      hasApiKey: !!this.apiKey,
      keyLength: this.apiKey ? this.apiKey.length : 0,
      mode: 'FALLBACK_ONLY'
    });
  }

  private getClient(): null {
    // ALWAYS return null to force fallback mode during deployment
    console.log('🔧 Google Maps Client disabled for deployment, using fallback geocoding');
    return null;
  }

  /**
   * Получает координаты по адресу (геокодинг)
   */
  async geocodeAddress(address: string): Promise<GeocodingResponse | null> {
    try {
      // Google Maps temporarily disabled for deployment - using fallback only
      console.warn('🔧 Google Maps DISABLED for deployment, using fallback геолокацию');
      return this.getFallbackGeocoding(address);
    } catch (error) {
      console.error('Ошибка геокодинга адреса:', error);
      return this.getFallbackGeocoding(address);
    }
  }

  /**
   * Получает адрес по координатам (обратный геокодинг)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodingResponse | null> {
    try {
      // Google Maps temporarily disabled for deployment - using fallback only
      console.warn('🔧 Google Maps DISABLED for deployment, using fallback геолокацию');
      return this.getFallbackReverseGeocoding(latitude, longitude);
    } catch (error) {
      console.error('Ошибка обратного геокодинга:', error);
      return this.getFallbackReverseGeocoding(latitude, longitude);
    }
  }

  /**
   * Получает текущее местоположение пользователя (в браузере)
   */
  getCurrentLocation(): Promise<GeolocationData> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается в данной среде'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 300000 // 5 минут кэш
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const coords = position.coords;
          const geolocationData: GeolocationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy
          };

          // Получаем адрес по координатам
          try {
            const geocoding = await this.reverseGeocode(coords.latitude, coords.longitude);
            if (geocoding) {
              geolocationData.address = geocoding.address;
              geolocationData.city = geocoding.components.city;
              geolocationData.country = geocoding.components.country;
              geolocationData.postalCode = geocoding.components.postalCode;
              geolocationData.region = geocoding.components.region;
            }
          } catch (error) {
            console.warn('Не удалось получить адрес для координат:', error);
          }

          resolve(geolocationData);
        },
        (error) => {
          let errorMessage = 'Неизвестная ошибка геолокации';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Пользователь запретил доступ к геолокации';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Информация о местоположении недоступна';
              break;
            case error.TIMEOUT:
              errorMessage = 'Превышено время ожидания получения местоположения';
              break;
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  }

  /**
   * Поиск мест по запросу
   */
  async searchPlaces(query: string, location?: { lat: number; lng: number }, radius?: number): Promise<GeocodingResponse[]> {
    try {
      // Google Maps temporarily disabled for deployment - using fallback only
      console.warn('🔧 Google Maps DISABLED for deployment, using fallback поиск');
      return this.getFallbackPlaceSearch(query);

      const params: any = {
        query: query,
        key: this.apiKey,
        language: 'ru'
      };

      if (location) {
        params.location = `${location.lat},${location.lng}`;
      }

      if (radius) {
        params.radius = radius;
      }

      const response = await client.findPlaceFromText({
        params: {
          input: query,
          inputtype: 'textquery',
          key: this.apiKey,
          language: 'ru',
          fields: ['place_id', 'name', 'geometry', 'formatted_address', 'types']
        },
        timeout: 10000
      });

      if (response.data.candidates && response.data.candidates.length > 0) {
        return response.data.candidates.map(candidate => ({
          address: candidate.formatted_address || candidate.name || '',
          coordinates: {
            latitude: candidate.geometry?.location?.lat || 0,
            longitude: candidate.geometry?.location?.lng || 0
          },
          components: {},
          accuracy: 'APPROXIMATE',
          placeId: candidate.place_id,
          types: candidate.types
        }));
      }

      return [];
    } catch (error) {
      console.error('Ошибка поиска мест:', error);
      return this.getFallbackPlaceSearch(query);
    }
  }

  /**
   * Парсит компоненты адреса Google Maps
   */
  private parseAddressComponents(components: any[]): GeocodingResponse['components'] {
    const parsed: GeocodingResponse['components'] = {};

    for (const component of components) {
      const types = component.types;

      if (types.includes('locality')) {
        parsed.city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.region = component.long_name;
      } else if (types.includes('country')) {
        parsed.country = component.long_name;
      } else if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      } else if (types.includes('street_number') || types.includes('route')) {
        parsed.streetAddress = (parsed.streetAddress || '') + ' ' + component.long_name;
      }
    }

    return parsed;
  }

  /**
   * Fallback геокодинг для демонстрации
   */
  private getFallbackGeocoding(address: string): GeocodingResponse | null {
    // Простейший fallback на основе известных городов
    const fallbackCities: Record<string, { lat: number; lng: number; components: any }> = {
      'cascais': {
        lat: 38.7071,
        lng: -9.4212,
        components: {
          city: 'Cascais',
          country: 'Portugal',
          region: 'Lisbon'
        }
      },
      'lisbon': {
        lat: 38.7223,
        lng: -9.1393,
        components: {
          city: 'Lisbon',
          country: 'Portugal',
          region: 'Lisbon'
        }
      },
      'porto': {
        lat: 41.1579,
        lng: -8.6291,
        components: {
          city: 'Porto',
          country: 'Portugal',
          region: 'Porto'
        }
      }
    };

    const searchKey = address.toLowerCase().replace(/[^a-z]/g, '');
    const match = Object.keys(fallbackCities).find(key => 
      searchKey.includes(key) || key.includes(searchKey)
    );

    if (match) {
      const data = fallbackCities[match];
      return {
        address: `${data.components.city}, ${data.components.country}`,
        coordinates: {
          latitude: data.lat,
          longitude: data.lng
        },
        components: data.components,
        accuracy: 'APPROXIMATE'
      };
    }

    return null;
  }

  /**
   * Fallback обратный геокодинг
   */
  private getFallbackReverseGeocoding(latitude: number, longitude: number): GeocodingResponse | null {
    // Проверяем, находятся ли координаты в районе известных мест
    if (latitude >= 38.6 && latitude <= 38.8 && longitude >= -9.5 && longitude <= -9.3) {
      return {
        address: 'Cascais, Portugal',
        coordinates: { latitude, longitude },
        components: {
          city: 'Cascais',
          country: 'Portugal',
          region: 'Lisbon'
        },
        accuracy: 'APPROXIMATE'
      };
    }

    return {
      address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      coordinates: { latitude, longitude },
      components: {},
      accuracy: 'APPROXIMATE'
    };
  }

  /**
   * Fallback поиск мест
   */
  private getFallbackPlaceSearch(query: string): GeocodingResponse[] {
    const fallbackResults = [
      {
        address: 'Cascais, Portugal',
        coordinates: { latitude: 38.7071, longitude: -9.4212 },
        components: { city: 'Cascais', country: 'Portugal' },
        accuracy: 'APPROXIMATE' as const
      }
    ];

    return fallbackResults.filter(result => 
      result.address.toLowerCase().includes(query.toLowerCase()) ||
      query.toLowerCase().includes('cascais')
    );
  }

  /**
   * Рассчитывает расстояние между двумя точками
   */
  calculateDistance(
    lat1: number, lng1: number, 
    lat2: number, lng2: number
  ): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // расстояние в км
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  /**
   * Проверяет валидность API ключа
   */
  async validateApiKey(): Promise<boolean> {
    try {
      // Google Maps temporarily disabled for deployment - always return false
      console.warn('🔧 Google Maps DISABLED for deployment, API validation skipped');
      return false;

      const response = await client.geocode({
        params: {
          address: 'Cascais, Portugal',
          key: this.apiKey
        },
        timeout: 5000
      });

      return response.status === 200 && response.data.results.length > 0;
    } catch (error) {
      console.error('Ошибка валидации Google Maps API ключа:', error);
      return false;
    }
  }
}

// Lazy initialization to avoid creating instance during module import
let _realGeocodingService: RealGeocodingService | null = null;

export function getRealGeocodingService(): RealGeocodingService {
  if (!_realGeocodingService) {
    _realGeocodingService = new RealGeocodingService();
  }
  return _realGeocodingService;
}

// Backward compatibility export
export const realGeocodingService = new Proxy({} as RealGeocodingService, {
  get(target, prop) {
    return getRealGeocodingService()[prop as keyof RealGeocodingService];
  }
});
