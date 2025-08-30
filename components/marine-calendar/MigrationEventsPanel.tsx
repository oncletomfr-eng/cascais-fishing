'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Fish, TrendingUp, MapPin, Thermometer, Waves, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MigrationEvent {
  species: string;
  eventType: 'arrival' | 'peak' | 'departure';
  date: string;
  probability: number;
  location: any;
  direction?: string;
  depth?: number;
  waterTemperature?: number;
  description: string;
  dataSource: string;
  confidence: number;
}

interface MigrationEventsPanelProps {
  events: MigrationEvent[];
  location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  targetSpecies?: string[];
  className?: string;
}

export function MigrationEventsPanel({ events, location, targetSpecies, className }: MigrationEventsPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<string>('all');
  const [selectedEventType, setSelectedEventType] = useState<string>('all');
  const [minProbability, setMinProbability] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'probability' | 'date' | 'species'>('probability');

  // Фильтрация событий
  const filteredEvents = events.filter(event => {
    const matchesSearch = searchTerm === '' || 
      getSpeciesName(event.species).toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSpecies = selectedSpecies === 'all' || event.species === selectedSpecies;
    const matchesEventType = selectedEventType === 'all' || event.eventType === selectedEventType;
    const matchesProbability = event.probability >= minProbability / 100;

    return matchesSearch && matchesSpecies && matchesEventType && matchesProbability;
  });

  // Сортировка событий
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'probability':
        return b.probability - a.probability;
      case 'date':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'species':
        return getSpeciesName(a.species).localeCompare(getSpeciesName(b.species));
      default:
        return 0;
    }
  });

  // Получение уникальных видов из событий
  const uniqueSpecies = [...new Set(events.map(e => e.species))];

  // Статистика по событиям
  const stats = {
    total: events.length,
    highProbability: events.filter(e => e.probability >= 0.7).length,
    arrivals: events.filter(e => e.eventType === 'arrival').length,
    peaks: events.filter(e => e.eventType === 'peak').length,
    departures: events.filter(e => e.eventType === 'departure').length
  };

  const getSpeciesName = (species: string): string => {
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

  const getSpeciesEmoji = (species: string): string => {
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

  const getEventTypeInfo = (eventType: string) => {
    const info = {
      arrival: { name: 'Прибытие', color: 'bg-green-100 text-green-800', emoji: '📍' },
      peak: { name: 'Пик активности', color: 'bg-blue-100 text-blue-800', emoji: '⭐' },
      departure: { name: 'Отбытие', color: 'bg-orange-100 text-orange-800', emoji: '🚀' }
    };
    return info[eventType as keyof typeof info] || { name: eventType, color: 'bg-gray-100 text-gray-800', emoji: '📌' };
  };

  const getProbabilityColor = (probability: number): string => {
    if (probability >= 0.8) return 'text-green-600 bg-green-50';
    if (probability >= 0.6) return 'text-blue-600 bg-blue-50';
    if (probability >= 0.4) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-gray-600">Всего событий</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.highProbability}</div>
            <div className="text-sm text-gray-600">Высокая вероятность</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.arrivals}</div>
            <div className="text-sm text-gray-600">Прибытия</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.peaks}</div>
            <div className="text-sm text-gray-600">Пики</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.departures}</div>
            <div className="text-sm text-gray-600">Отбытия</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Фильтры и поиск</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Поиск..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
              <SelectTrigger>
                <SelectValue placeholder="Все виды" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все виды</SelectItem>
                {uniqueSpecies.map(species => (
                  <SelectItem key={species} value={species}>
                    {getSpeciesEmoji(species)} {getSpeciesName(species)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger>
                <SelectValue placeholder="Тип события" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="arrival">📍 Прибытие</SelectItem>
                <SelectItem value="peak">⭐ Пик активности</SelectItem>
                <SelectItem value="departure">🚀 Отбытие</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex flex-col space-y-2">
              <label className="text-sm text-gray-600">Мин. вероятность: {minProbability}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={minProbability}
                onChange={(e) => setMinProbability(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="probability">По вероятности</SelectItem>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="species">По видам</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecies('all');
                setSelectedEventType('all');
                setMinProbability(0);
                setSortBy('probability');
              }}
            >
              Сбросить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Результаты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Миграционные события</span>
            </div>
            <Badge variant="outline">{sortedEvents.length} из {events.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedEvents.length === 0 ? (
            <div className="text-center py-8">
              <Fish className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Нет событий, соответствующих фильтрам</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEvents.map((event, index) => {
                const eventTypeInfo = getEventTypeInfo(event.eventType);
                const eventDate = new Date(event.date);
                
                return (
                  <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{getSpeciesEmoji(event.species)}</span>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {getSpeciesName(event.species)}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {format(eventDate, 'd MMMM yyyy', { locale: ru })} • {format(eventDate, 'EEEE', { locale: ru })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={cn('text-xs', eventTypeInfo.color)}>
                            {eventTypeInfo.emoji} {eventTypeInfo.name}
                          </Badge>
                          <Badge className={cn('text-xs font-medium', getProbabilityColor(event.probability))}>
                            {Math.round(event.probability * 100)}%
                          </Badge>
                        </div>
                      </div>

                      <div className="mb-3">
                        <Progress value={event.probability * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Вероятность события</span>
                          <span>{Math.round(event.probability * 100)}%</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3">{event.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {event.direction && (
                          <div className="flex items-center space-x-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">Направление:</span>
                            <span>{event.direction}</span>
                          </div>
                        )}

                        {event.depth && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Waves className="h-4 w-4 text-blue-400" />
                            <span className="text-gray-600">Глубина:</span>
                            <span>{event.depth}м</span>
                          </div>
                        )}

                        {event.waterTemperature && (
                          <div className="flex items-center space-x-2 text-sm">
                            <Thermometer className="h-4 w-4 text-orange-400" />
                            <span className="text-gray-600">Температура:</span>
                            <span>{event.waterTemperature}°C</span>
                          </div>
                        )}
                      </div>

                      <Separator className="my-3" />

                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Источник: {event.dataSource}</span>
                        <span>Достоверность: {Math.round(event.confidence * 100)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default MigrationEventsPanel;
