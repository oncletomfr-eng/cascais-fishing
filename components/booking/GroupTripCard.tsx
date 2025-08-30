import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Clock, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { GroupTripInfo } from '@/lib/types/booking';
import { BOOKING_CONSTANTS } from '@/lib/schemas/booking';

interface GroupTripCardProps {
  tripId: string;
  trip: GroupTripInfo;
  onSelect: (tripId: string) => void;
  isSelected?: boolean;
  availableSlots?: number;
  className?: string;
}

export function GroupTripCard({
  tripId,
  trip,
  onSelect,
  isSelected = false,
  availableSlots,
  className,
}: GroupTripCardProps) {
  const currentParticipants = trip.participants.reduce(
    (total, p) => total + p.participantCount,
    0
  );

  const progressPercentage = (currentParticipants / trip.minRequired) * 100;
  const remainingSlots = trip.maxCapacity - currentParticipants;
  const spotsNeeded = Math.max(0, trip.minRequired - currentParticipants);

  const isConfirmed = trip.status === 'confirmed';
  const isForming = trip.status === 'forming';
  const isCancelled = trip.status === 'cancelled';

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  };

  // Форматирование времени
  const formatTime = (time: string) => {
    return time === '09:00' ? 'Утро (9:00)' : 'День (14:00)';
  };

  const getStatusBadge = () => {
    if (isCancelled) {
      return <Badge variant="destructive">Отменена</Badge>;
    }
    
    if (isConfirmed) {
      return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Подтверждена</Badge>;
    }
    
    return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Набор группы</Badge>;
  };

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-green-500';
    if (progressPercentage >= 75) return 'bg-yellow-500';
    return 'bg-primary';
  };

  if (isCancelled) {
    return null; // Не показываем отмененные поездки
  }

  return (
    <Card 
      className={`transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${className || ''}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {formatDate(trip.date)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatTime(trip.time)}
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="space-y-3">
          {/* Progress индикатор */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {currentParticipants}/{trip.minRequired} участников
                </span>
              </div>
              <span className="text-muted-foreground">
                {remainingSlots} мест доступно
              </span>
            </div>
            
            <div className="relative">
              <Progress 
                value={Math.min(progressPercentage, 100)} 
                className="h-2"
              />
              <div 
                className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                style={{ width: `${Math.min(progressPercentage, 100)}%` }}
              />
            </div>
          </div>

          {/* Информационное сообщение */}
          <div className="text-sm">
            {isConfirmed ? (
              <p className="text-green-600 font-medium">
                ✅ Поездка подтверждена! Все детали будут отправлены накануне.
              </p>
            ) : (
              <p className="text-muted-foreground">
                {spotsNeeded > 0 ? (
                  <>
                    Нужно еще <span className="font-medium text-primary">{spotsNeeded}</span> {
                      spotsNeeded === 1 ? 'участник' : spotsNeeded < 5 ? 'участника' : 'участников'
                    } для подтверждения поездки
                  </>
                ) : (
                  'Готово к подтверждению!'
                )}
              </p>
            )}
          </div>

          {/* Информация о цене */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              €{trip.pricePerPerson} за человека
            </span>
            
            {availableSlots !== undefined && (
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => onSelect(tripId)}
                disabled={remainingSlots === 0}
              >
                {isSelected ? 'Выбрано' : remainingSlots > 0 ? 'Присоединиться' : 'Мест нет'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
