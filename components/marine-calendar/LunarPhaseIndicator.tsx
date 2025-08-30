'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LunarPhaseIndicatorProps {
  phase: string;
  illumination: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function LunarPhaseIndicator({ 
  phase, 
  illumination, 
  size = 'md', 
  showLabel = false, 
  className 
}: LunarPhaseIndicatorProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const getMoonSymbol = (phaseType: string): string => {
    const symbols: Record<string, string> = {
      NEW_MOON: '🌑',
      WAXING_CRESCENT: '🌒',
      FIRST_QUARTER: '🌓',
      WAXING_GIBBOUS: '🌔',
      FULL_MOON: '🌕',
      WANING_GIBBOUS: '🌖',
      LAST_QUARTER: '🌗',
      WANING_CRESCENT: '🌘'
    };
    return symbols[phaseType] || '🌑';
  };

  const getPhaseName = (phaseType: string): string => {
    const names: Record<string, string> = {
      NEW_MOON: 'Новолуние',
      WAXING_CRESCENT: 'Растущий месяц',
      FIRST_QUARTER: 'Первая четверть',
      WAXING_GIBBOUS: 'Растущая луна',
      FULL_MOON: 'Полнолуние',
      WANING_GIBBOUS: 'Убывающая луна',
      LAST_QUARTER: 'Последняя четверть',
      WANING_CRESCENT: 'Убывающий месяц'
    };
    return names[phaseType] || phaseType;
  };

  const getPhaseAdvice = (phaseType: string): string => {
    const advice: Record<string, string> = {
      NEW_MOON: 'Отличное время для ночной рыбалки. Рыба особенно активна из-за минимального освещения.',
      WAXING_CRESCENT: 'Хорошее время для рыбалки. Растущая луна стимулирует активность рыбы.',
      FIRST_QUARTER: 'Очень благоприятное время. Умеренное освещение привлекает добычу.',
      WAXING_GIBBOUS: 'Активность рыбы повышается. Подготовка к максимальной активности полнолуния.',
      FULL_MOON: 'Пик активности! Максимальное влияние на поведение рыбы и планктон.',
      WANING_GIBBOUS: 'Хорошие условия сохраняются после полнолуния.',
      LAST_QUARTER: 'Стабильная активность рыбы. Хорошее время для опытных рыболовов.',
      WANING_CRESCENT: 'Спокойный период. Требуется более терпеливый подход.'
    };
    return advice[phaseType] || 'Нейтральные условия для рыбалки.';
  };

  const getFishingRating = (phaseType: string): number => {
    const ratings: Record<string, number> = {
      NEW_MOON: 9,
      WAXING_CRESCENT: 6,
      FIRST_QUARTER: 8,
      WAXING_GIBBOUS: 7,
      FULL_MOON: 10,
      WANING_GIBBOUS: 7,
      LAST_QUARTER: 8,
      WANING_CRESCENT: 5
    };
    return ratings[phaseType] || 5;
  };

  const rating = getFishingRating(phase);
  const ratingColor = rating >= 8 ? 'text-green-600' : rating >= 6 ? 'text-yellow-600' : 'text-gray-600';

  const MoonIcon = () => (
    <div className={cn(
      sizeClasses[size],
      'flex items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-300',
      'border shadow-sm relative overflow-hidden',
      className
    )}>
      {/* Лунная поверхность */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300 rounded-full" />
      
      {/* Освещенная часть */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-yellow-100 via-yellow-50 to-white rounded-full transition-all duration-500"
        style={{
          clipPath: `inset(0 ${100 - illumination}% 0 0)`
        }}
      />
      
      {/* Символ фазы */}
      <span className={cn('relative z-10', textSizes[size])}>
        {getMoonSymbol(phase)}
      </span>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center space-y-1">
            <MoonIcon />
            {showLabel && (
              <div className="text-center">
                <p className={cn('font-medium', textSizes[size])}>
                  {getPhaseName(phase)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className={cn('text-xs', ratingColor)}>
                    ★ {rating}/10
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round(illumination)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              {getPhaseName(phase)} ({Math.round(illumination)}% освещена)
            </div>
            <div className="text-sm text-gray-600">
              {getPhaseAdvice(phase)}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Рейтинг для рыбалки:</span>
              <span className={cn('font-medium', ratingColor)}>
                ★ {rating}/10
              </span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default LunarPhaseIndicator;
