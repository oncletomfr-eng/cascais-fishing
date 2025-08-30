'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  WindIcon,
  WavesIcon,
  ThermometerIcon
} from 'lucide-react';

import { CurrentWeather, MarineConditions, FishingConditions } from '@/lib/types/weather';

interface WeatherBadgeProps {
  weather?: CurrentWeather;
  marine?: MarineConditions;
  fishingConditions?: FishingConditions | null;
  variant?: 'compact' | 'detailed';
  showTooltip?: boolean;
  className?: string;
}

export default function WeatherBadge({
  weather,
  marine,
  fishingConditions,
  variant = 'compact',
  showTooltip = true,
  className = ''
}: WeatherBadgeProps) {
  if (!weather && !fishingConditions) {
    return null;
  }

  const getWeatherIcon = (weather: CurrentWeather) => {
    const iconClass = "h-3 w-3";
    
    if (weather.weatherDescription.includes('rain') || weather.weatherDescription.includes('drizzle')) {
      return <CloudRainIcon className={`${iconClass} text-blue-500`} />;
    }
    if (weather.weatherDescription.includes('cloud')) {
      return <CloudIcon className={`${iconClass} text-gray-500`} />;
    }
    if (weather.isDay) {
      return <SunIcon className={`${iconClass} text-yellow-500`} />;
    }
    return <CloudIcon className={`${iconClass} text-gray-400`} />;
  };

  const getFishingConditionColor = (condition: FishingConditions['overall']) => {
    switch (condition) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'dangerous': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getFishingConditionEmoji = (condition: FishingConditions['overall']) => {
    switch (condition) {
      case 'excellent': return '🎣';
      case 'good': return '👍';
      case 'fair': return '⚠️';
      case 'poor': return '👎';
      case 'dangerous': return '🚫';
      default: return '❓';
    }
  };

  if (variant === 'compact') {
    const content = (
      <div className={`flex items-center gap-1 ${className}`}>
        {weather && (
          <Badge variant="outline" className="text-xs px-2 py-1">
            {getWeatherIcon(weather)}
            <span className="ml-1">{Math.round(weather.temperature)}°</span>
          </Badge>
        )}
        
        {fishingConditions && (
          <Badge className={`text-xs px-2 py-1 ${getFishingConditionColor(fishingConditions.overall)}`}>
            <span className="mr-1">{getFishingConditionEmoji(fishingConditions.overall)}</span>
            {fishingConditions.overall === 'excellent' && 'Отлично'}
            {fishingConditions.overall === 'good' && 'Хорошо'}
            {fishingConditions.overall === 'fair' && 'Норма'}
            {fishingConditions.overall === 'poor' && 'Плохо'}
            {fishingConditions.overall === 'dangerous' && 'Опасно'}
          </Badge>
        )}
      </div>
    );

    if (!showTooltip) {
      return content;
    }

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent>
            <WeatherTooltipContent weather={weather} marine={marine} fishingConditions={fishingConditions} />
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Detailed variant
  return (
    <div className={`space-y-2 ${className}`}>
      {weather && (
        <div className="flex items-center gap-2">
          {getWeatherIcon(weather)}
          <span className="text-sm">{Math.round(weather.temperature)}°C</span>
          <span className="text-xs text-muted-foreground">{weather.weatherDescription}</span>
        </div>
      )}
      
      {weather && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <WindIcon className="h-3 w-3" />
            <span>{weather.windSpeed} м/с</span>
          </div>
          
          {marine && (
            <div className="flex items-center gap-1">
              <WavesIcon className="h-3 w-3" />
              <span>{marine.waveHeight.toFixed(1)} м</span>
            </div>
          )}
        </div>
      )}
      
      {fishingConditions && (
        <Badge className={`text-xs ${getFishingConditionColor(fishingConditions.overall)}`}>
          <span className="mr-1">{getFishingConditionEmoji(fishingConditions.overall)}</span>
          Рыбалка: {fishingConditions.score}/100
        </Badge>
      )}
    </div>
  );
}

// Tooltip content component
function WeatherTooltipContent({
  weather,
  marine,
  fishingConditions
}: {
  weather?: CurrentWeather;
  marine?: MarineConditions;
  fishingConditions?: FishingConditions | null;
}) {
  return (
    <div className="space-y-2 max-w-xs">
      {weather && (
        <div>
          <div className="font-semibold">{weather.weatherDescription}</div>
          <div className="text-sm space-y-1">
            <div>Температура: {Math.round(weather.temperature)}°C (ощущается как {Math.round(weather.feelsLike)}°C)</div>
            <div>Ветер: {weather.windSpeed} м/с, {weather.windDirection}°</div>
            <div>Влажность: {weather.humidity}%</div>
            <div>Видимость: {(weather.visibility / 1000).toFixed(1)} км</div>
          </div>
        </div>
      )}
      
      {marine && (
        <div>
          <div className="font-semibold">Морские условия</div>
          <div className="text-sm space-y-1">
            <div>Волны: {marine.waveHeight.toFixed(1)} м</div>
            <div>Период: {marine.wavePeriod.toFixed(1)} с</div>
            {marine.swellWaveHeight !== undefined && (
              <div>Зыбь: {marine.swellWaveHeight.toFixed(1)} м</div>
            )}
          </div>
        </div>
      )}
      
      {fishingConditions && (
        <div>
          <div className="font-semibold">Условия для рыбалки</div>
          <div className="text-sm space-y-1">
            <div>Общая оценка: {fishingConditions.score}/100</div>
            <div>Ветер: {fishingConditions.factors.windConditions}</div>
            <div>Волны: {fishingConditions.factors.waveConditions}</div>
            <div>Видимость: {fishingConditions.factors.visibility}</div>
            {fishingConditions.warnings.length > 0 && (
              <div className="text-orange-600">
                ⚠️ {fishingConditions.warnings[0]}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
