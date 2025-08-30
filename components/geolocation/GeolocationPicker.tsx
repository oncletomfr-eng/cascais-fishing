'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Globe
} from 'lucide-react';
import { GeolocationData, GeocodingResponse } from '@/lib/types/marine-calendar';

interface GeolocationPickerProps {
  /** Текущие координаты */
  currentLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  /** Коллбэк при изменении местоположения */
  onLocationChange: (location: GeolocationData) => void;
  /** Заголовок компонента */
  title?: string;
  /** Описание */
  description?: string;
  /** Компактный режим */
  compact?: boolean;
}

export function GeolocationPicker({
  currentLocation,
  onLocationChange,
  title = "Выбор местоположения",
  description = "Выберите точку для морского календаря",
  compact = false
}: GeolocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeolocationData | null>(
    currentLocation ? {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      address: currentLocation.address
    } : null
  );
  const [apiStatus, setApiStatus] = useState<'unknown' | 'available' | 'fallback'>('unknown');

  // Проверяем статус API при загрузке
  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const response = await fetch('/api/geolocation/validate');
      const data = await response.json();
      
      if (data.success) {
        setApiStatus(data.data.isValid ? 'available' : 'fallback');
      } else {
        setApiStatus('fallback');
      }
    } catch (error) {
      console.warn('Не удалось проверить статус API геолокации:', error);
      setApiStatus('fallback');
    }
  };

  // Поиск мест по запросу
  const searchPlaces = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/geolocation/places?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.data.places);
      } else {
        console.error('Ошибка поиска мест:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Ошибка запроса поиска мест:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Получение текущего местоположения из браузера
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Геолокация не поддерживается браузером');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000
        });
      });

      const coords = position.coords;
      const newLocation: GeolocationData = {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy
      };

      // Получаем адрес по координатам
      try {
        const response = await fetch(
          `/api/geolocation/geocode?latitude=${coords.latitude}&longitude=${coords.longitude}`
        );
        const data = await response.json();
        
        if (data.success && data.data) {
          newLocation.address = data.data.address;
          newLocation.city = data.data.components.city;
          newLocation.country = data.data.components.country;
          newLocation.region = data.data.components.region;
          newLocation.postalCode = data.data.components.postalCode;
        }
      } catch (error) {
        console.warn('Не удалось получить адрес для текущих координат:', error);
      }

      setSelectedLocation(newLocation);
      onLocationChange(newLocation);
      
    } catch (error: any) {
      console.error('Ошибка получения геолокации:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (error.code === 1) errorMessage = 'Доступ к геолокации запрещен';
      else if (error.code === 2) errorMessage = 'Местоположение недоступно';
      else if (error.code === 3) errorMessage = 'Таймаут получения местоположения';
      
      alert(`Ошибка геолокации: ${errorMessage}`);
    } finally {
      setIsGettingLocation(false);
    }
  };

  // Выбор места из результатов поиска
  const selectPlace = (place: GeocodingResponse) => {
    const location: GeolocationData = {
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
      address: place.address,
      city: place.components.city,
      country: place.components.country,
      region: place.components.region,
      postalCode: place.components.postalCode
    };

    setSelectedLocation(location);
    onLocationChange(location);
    setSearchResults([]);
    setSearchQuery('');
  };

  // Обработка поиска с задержкой
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchPlaces(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const statusBadge = () => {
    switch (apiStatus) {
      case 'available':
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />Google Maps</Badge>;
      case 'fallback':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" />Fallback</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Globe className="w-3 h-3" />Проверка...</Badge>;
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Введите адрес..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {isLoading && (
              <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="gap-1"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
          </Button>
        </div>

        {selectedLocation && (
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {selectedLocation.address || `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="border rounded-md bg-background">
            {searchResults.slice(0, 3).map((place, index) => (
              <div
                key={index}
                className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                onClick={() => selectPlace(place)}
              >
                <div className="text-sm font-medium">{place.address}</div>
                {place.components.city && (
                  <div className="text-xs text-muted-foreground">
                    {place.components.city}, {place.components.country}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {statusBadge()}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Строка поиска */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск города, адреса или места..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Результаты поиска */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg bg-muted/50">
            <div className="p-2 text-sm font-medium text-muted-foreground border-b">
              Результаты поиска:
            </div>
            {searchResults.map((place, index) => (
              <div
                key={index}
                className="p-3 hover:bg-background cursor-pointer border-b last:border-b-0"
                onClick={() => selectPlace(place)}
              >
                <div className="font-medium">{place.address}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {place.coordinates.latitude.toFixed(4)}, {place.coordinates.longitude.toFixed(4)}
                  {place.components.city && (
                    <span> • {place.components.city}, {place.components.country}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Кнопка геолокации */}
        <Button
          variant="outline"
          onClick={getCurrentLocation}
          disabled={isGettingLocation}
          className="w-full gap-2"
        >
          {isGettingLocation ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4" />
          )}
          {isGettingLocation ? 'Определение местоположения...' : 'Использовать мое местоположение'}
        </Button>

        {/* Текущее выбранное местоположение */}
        {selectedLocation && (
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm font-medium text-muted-foreground mb-2">Выбранное местоположение:</div>
            <div className="space-y-1">
              <div className="font-medium">
                {selectedLocation.address || 'Координаты'}
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
              </div>
              {selectedLocation.city && (
                <div className="text-sm text-muted-foreground">
                  {selectedLocation.city}
                  {selectedLocation.region && `, ${selectedLocation.region}`}
                  {selectedLocation.country && `, ${selectedLocation.country}`}
                </div>
              )}
              {selectedLocation.accuracy && (
                <div className="text-xs text-muted-foreground">
                  Точность: ~{Math.round(selectedLocation.accuracy)}м
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
