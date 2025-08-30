'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Fish, TrendingUp, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LunarPhaseIndicator } from './LunarPhaseIndicator';
import { FishingConditionsCard } from './FishingConditionsCard';
import { MigrationEventsPanel } from './MigrationEventsPanel';
import { HistoricalDataChart } from './HistoricalDataChart';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Локализация для календаря
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ru }),
  getDay,
  locales: { ru }
});

interface MarineCalendarProps {
  initialDate?: Date;
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  targetSpecies?: string[];
  className?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lunar' | 'migration' | 'fishing';
  data: any;
  resource?: any;
}

export function MarineCalendar({ 
  initialDate = new Date(), 
  location = { latitude: 38.6979, longitude: -9.4215, name: 'Cascais, Portugal' },
  targetSpecies,
  className 
}: MarineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [activeTab, setActiveTab] = useState('calendar');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [lunarPhases, setLunarPhases] = useState<any[]>([]);
  const [fishingConditions, setFishingConditions] = useState<any[]>([]);
  const [migrationEvents, setMigrationEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загрузка данных при изменении даты или локации
  useEffect(() => {
    loadMarineData();
  }, [currentDate, location]);

  const loadMarineData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const startDate = new Date(currentDate);
      startDate.setDate(1); // Начало месяца
      
      const endDate = new Date(currentDate);
      endDate.setMonth(endDate.getMonth() + 1, 0); // Конец месяца
      
      // Параллельная загрузка всех данных
      const [lunarResponse, conditionsResponse, migrationsResponse] = await Promise.all([
        fetch(`/api/marine-calendar/lunar-phases-simple?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
        fetch(`/api/marine-calendar/fishing-conditions-simple`),
        fetch(`/api/marine-calendar/migration-events-simple`)
      ]);

      if (!lunarResponse.ok || !conditionsResponse.ok || !migrationsResponse.ok) {
        throw new Error('Ошибка загрузки данных с сервера');
      }

      const lunarData = await lunarResponse.json();
      const conditionsData = await conditionsResponse.json();
      const migrationsData = await migrationsResponse.json();

      setLunarPhases(lunarData.phases);
      setFishingConditions(conditionsData.conditions);
      setMigrationEvents(migrationsData.events);

      // Формируем события для календаря
      const calendarEvents: CalendarEvent[] = [];

      // Добавляем лунные события
      lunarData.upcomingEvents.newMoons.forEach((date: string) => {
        calendarEvents.push({
          id: `new-moon-${date}`,
          title: '🌑 Новолуние',
          start: new Date(date),
          end: new Date(date),
          type: 'lunar',
          data: { phase: 'NEW_MOON' }
        });
      });

      lunarData.upcomingEvents.fullMoons.forEach((date: string) => {
        calendarEvents.push({
          id: `full-moon-${date}`,
          title: '🌕 Полнолуние',
          start: new Date(date),
          end: new Date(date),
          type: 'lunar',
          data: { phase: 'FULL_MOON' }
        });
      });

      // Добавляем миграционные события
      migrationsData.events.forEach((event: any) => {
        const eventDate = new Date(event.date);
        calendarEvents.push({
          id: `migration-${event.species}-${event.date}`,
          title: `🐟 ${getSpeciesName(event.species)} - ${getMigrationEventName(event.eventType)}`,
          start: eventDate,
          end: eventDate,
          type: 'migration',
          data: event
        });
      });

      // Добавляем условия рыбалки с высоким рейтингом
      conditionsData.conditions
        .filter((condition: any) => condition.overallRating >= 8)
        .forEach((condition: any) => {
          const conditionDate = new Date(condition.date);
          calendarEvents.push({
            id: `fishing-${condition.date}`,
            title: `⭐ Отличные условия (${condition.overallRating}/10)`,
            start: conditionDate,
            end: conditionDate,
            type: 'fishing',
            data: condition
          });
        });

      setEvents(calendarEvents);

    } catch (err) {
      console.error('Ошибка загрузки данных морского календаря:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedDate(event.start);
    // Можно добавить дополнительную логику для показа деталей события
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    
    switch (event.type) {
      case 'lunar':
        backgroundColor = '#8b5cf6'; // Фиолетовый для лунных событий
        break;
      case 'migration':
        backgroundColor = '#06b6d4'; // Голубой для миграций
        break;
      case 'fishing':
        backgroundColor = '#10b981'; // Зеленый для хороших условий рыбалки
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        fontSize: '11px'
      }
    };
  };

  const getCurrentDateData = () => {
    const targetDate = selectedDate || currentDate;
    const dateStr = targetDate.toISOString().split('T')[0];
    
    const dayLunarPhase = lunarPhases.find(phase => 
      phase.date.split('T')[0] === dateStr
    );
    
    const dayConditions = fishingConditions.find(condition =>
      condition.date.split('T')[0] === dateStr
    );
    
    const dayMigrations = migrationEvents.filter(event =>
      event.date.split('T')[0] === dateStr
    );

    return { dayLunarPhase, dayConditions, dayMigrations };
  };

  if (loading) {
    return (
      <Card className={cn("w-full h-96 flex items-center justify-center", className)}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-600">Загрузка морского календаря...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full p-6", className)}>
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <Button onClick={loadMarineData} variant="outline">
            Попробовать снова
          </Button>
        </div>
      </Card>
    );
  }

  const { dayLunarPhase, dayConditions, dayMigrations } = getCurrentDateData();

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок с основной информацией */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Moon className="h-6 w-6 text-blue-600" />
                <span>Морской календарь</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                📍 {location.name} • {format(currentDate, 'MMMM yyyy', { locale: ru })}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {dayLunarPhase && (
                <LunarPhaseIndicator 
                  phase={dayLunarPhase.type}
                  illumination={dayLunarPhase.illumination}
                  size="sm"
                />
              )}
              {dayConditions && (
                <Badge variant={dayConditions.overallRating >= 8 ? "default" : dayConditions.overallRating >= 6 ? "secondary" : "outline"}>
                  Клёв: {dayConditions.overallRating}/10
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Главный интерфейс с табами */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calendar" className="flex items-center space-x-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Календарь</span>
          </TabsTrigger>
          <TabsTrigger value="conditions" className="flex items-center space-x-2">
            <Fish className="h-4 w-4" />
            <span>Условия</span>
          </TabsTrigger>
          <TabsTrigger value="migrations" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Миграции</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Аналитика</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div style={{ height: 600 }}>
                <Calendar
                  localizer={localizer}
                  events={events}
                  startAccessor="start"
                  endAccessor="end"
                  titleAccessor="title"
                  eventPropGetter={eventStyleGetter}
                  onSelectEvent={handleEventSelect}
                  onSelectSlot={(slotInfo) => handleDateSelect(slotInfo.start)}
                  selectable
                  date={currentDate}
                  onNavigate={setCurrentDate}
                  view={view}
                  onView={setView}
                  views={['month', 'week', 'day']}
                  messages={{
                    next: 'Следующий',
                    previous: 'Предыдущий',
                    today: 'Сегодня',
                    month: 'Месяц',
                    week: 'Неделя',
                    day: 'День'
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Детали выбранного дня */}
          {(selectedDate || currentDate) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {dayConditions && (
                <FishingConditionsCard conditions={dayConditions} />
              )}
              
              {dayMigrations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">🐟 Миграции на {format(selectedDate || currentDate, 'd MMMM', { locale: ru })}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dayMigrations.map((event: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium">{getSpeciesName(event.species)}</h4>
                            <Badge variant="outline">{Math.round(event.probability * 100)}%</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{event.description}</p>
                          {event.depth && (
                            <p className="text-xs text-gray-500 mt-1">Глубина: {event.depth}м</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="conditions">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {fishingConditions.slice(0, 6).map((condition: any, index: number) => (
              <FishingConditionsCard key={index} conditions={condition} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="migrations">
          <MigrationEventsPanel 
            events={migrationEvents}
            location={location}
            targetSpecies={targetSpecies}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <HistoricalDataChart 
            location={location}
            dateRange={{ start: currentDate, end: currentDate }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Вспомогательные функции
function getSpeciesName(species: string): string {
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
}

function getMigrationEventName(eventType: string): string {
  const names: Record<string, string> = {
    arrival: 'Прибытие',
    peak: 'Пик активности',
    departure: 'Отбытие'
  };
  return names[eventType] || eventType;
}

export default MarineCalendar;
