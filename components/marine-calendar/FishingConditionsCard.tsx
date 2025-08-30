'use client';

import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Fish, Clock, MapPin, Waves, ThermometerSun, Wind } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LunarPhaseIndicator } from './LunarPhaseIndicator';

interface FishingConditionsCardProps {
  conditions: {
    date: string;
    overallRating: number;
    lunarPhase?: {
      type: string;
      illumination: number;
      influence?: any;
    };
    bestHours?: Array<{
      start: string;
      end: string;
      description: string;
      rating: number;
    }>;
    speciesInfluence?: Array<{
      species: string;
      activity: number;
      preferredDepth: string;
      bestLocations: string[];
      recommendedBaits: string[];
    }>;
    recommendations?: string[];
    tidalInfluence?: {
      type: string;
      height: number;
      strength: number;
      fishingImpact: string;
    };
    weatherImpact?: {
      temperature: number;
      windSpeed: number;
      conditions: string;
    };
  };
  className?: string;
  compact?: boolean;
}

export function FishingConditionsCard({ conditions, className, compact = false }: FishingConditionsCardProps) {
  const date = new Date(conditions.date);
  
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-600 bg-green-50';
    if (rating >= 6) return 'text-yellow-600 bg-yellow-50';
    if (rating >= 4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getRatingText = (rating: number) => {
    if (rating >= 9) return 'Превосходно';
    if (rating >= 8) return 'Отлично';
    if (rating >= 6) return 'Хорошо';
    if (rating >= 4) return 'Средне';
    return 'Плохо';
  };

  const getSpeciesEmoji = (species: string) => {
    const emojis: Record<string, string> = {
      TUNA: '🐟',
      DORADO: '🐠',
      SEABASS: '🐟',
      SARDINE: '🐠',
      MACKEREL: '🐟',
      BLUE_MARLIN: '🗡️',
      SWORDFISH: '⚔️'
    };
    return emojis[species] || '🐟';
  };

  const getSpeciesName = (species: string) => {
    const names: Record<string, string> = {
      TUNA: 'Тунец',
      DORADO: 'Дорадо', 
      SEABASS: 'Морской окунь',
      SARDINE: 'Сардина',
      MACKEREL: 'Скумбрия',
      BLUE_MARLIN: 'Голубой марлин',
      SWORDFISH: 'Меч-рыба'
    };
    return names[species] || species.toLowerCase().replace('_', ' ');
  };

  const getTideEmoji = (type: string) => {
    return type === 'HIGH_TIDE' ? '🌊' : '🏖️';
  };

  const getTidalImpactColor = (impact: string) => {
    switch (impact) {
      case 'VERY_POSITIVE': return 'text-green-700';
      case 'POSITIVE': return 'text-green-600';
      case 'NEUTRAL': return 'text-gray-600';
      case 'NEGATIVE': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  if (compact) {
    return (
      <Card className={cn("hover:shadow-md transition-shadow", className)}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-medium text-sm">
                {format(date, 'd MMMM', { locale: ru })}
              </h3>
              <p className="text-xs text-gray-600">
                {format(date, 'EEEE', { locale: ru })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={cn('text-xs', getRatingColor(conditions.overallRating))}>
                {conditions.overallRating}/10
              </Badge>
              {conditions.lunarPhase && (
                <LunarPhaseIndicator 
                  phase={conditions.lunarPhase.type}
                  illumination={conditions.lunarPhase.illumination}
                  size="sm"
                />
              )}
            </div>
          </div>
          
          <Progress value={conditions.overallRating * 10} className="h-2 mb-2" />
          
          <div className="text-xs text-gray-600">
            {getRatingText(conditions.overallRating)} условия для рыбалки
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">
              {format(date, 'd MMMM yyyy', { locale: ru })}
            </CardTitle>
            <p className="text-sm text-gray-600">
              {format(date, 'EEEE', { locale: ru })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {conditions.lunarPhase && (
              <LunarPhaseIndicator 
                phase={conditions.lunarPhase.type}
                illumination={conditions.lunarPhase.illumination}
                size="md"
              />
            )}
            <div className="text-right">
              <Badge className={cn('text-sm font-medium', getRatingColor(conditions.overallRating))}>
                {conditions.overallRating}/10
              </Badge>
              <p className="text-xs text-gray-600 mt-1">
                {getRatingText(conditions.overallRating)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Прогресс бар общего рейтинга */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Общая оценка клёва</span>
            <span className="text-sm text-gray-600">{conditions.overallRating}/10</span>
          </div>
          <Progress value={conditions.overallRating * 10} className="h-3" />
        </div>

        <Separator />

        {/* Лучшие часы для рыбалки */}
        {conditions.bestHours && conditions.bestHours.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center mb-2">
              <Clock className="h-4 w-4 mr-2" />
              Лучшие часы
            </h4>
            <div className="space-y-2">
              {conditions.bestHours.slice(0, 3).map((hour, index) => {
                const startTime = new Date(hour.start);
                const endTime = new Date(hour.end);
                return (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">
                        {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                      </p>
                      <p className="text-xs text-gray-600">{hour.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {hour.rating}/10
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Активность рыб */}
        {conditions.speciesInfluence && conditions.speciesInfluence.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center mb-2">
              <Fish className="h-4 w-4 mr-2" />
              Активность рыб
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {conditions.speciesInfluence.slice(0, 4).map((species, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSpeciesEmoji(species.species)}</span>
                      <span className="text-sm font-medium">
                        {getSpeciesName(species.species)}
                      </span>
                    </div>
                    <Badge variant={species.activity >= 7 ? "default" : species.activity >= 5 ? "secondary" : "outline"} className="text-xs">
                      {species.activity}/10
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">
                      📊 Глубина: {species.preferredDepth}
                    </p>
                    {species.recommendedBaits.length > 0 && (
                      <p className="text-xs text-gray-600">
                        🎣 {species.recommendedBaits[0]}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Приливы */}
        {conditions.tidalInfluence && (
          <div>
            <h4 className="text-sm font-medium flex items-center mb-2">
              <Waves className="h-4 w-4 mr-2" />
              Приливы
            </h4>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center space-x-2">
                  <span className="text-lg">{getTideEmoji(conditions.tidalInfluence.type)}</span>
                  <span className="text-sm">
                    {conditions.tidalInfluence.type === 'HIGH_TIDE' ? 'Прилив' : 'Отлив'}
                  </span>
                </span>
                <Badge variant="outline" className="text-xs">
                  {conditions.tidalInfluence.height}м
                </Badge>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Сила: {conditions.tidalInfluence.strength}/10</span>
                <span className={getTidalImpactColor(conditions.tidalInfluence.fishingImpact)}>
                  Влияние: {conditions.tidalInfluence.fishingImpact.toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Рекомендации */}
        {conditions.recommendations && conditions.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">💡 Рекомендации</h4>
            <ul className="space-y-1">
              {conditions.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default FishingConditionsCard;
