'use client';

import React from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  CalendarDays, 
  Clock, 
  Users, 
  Euro,
  MapPin,
  CheckCircle,
  Heart,
  Share2,
  Fish,
  Trophy,
  GraduationCap,
  Star,
  Target,
  Settings,
} from 'lucide-react';
import { GroupTripDisplay } from '@/lib/types/group-events';

interface SimpleGroupTripCardProps {
  trip: GroupTripDisplay;
  onClick?: (trip: GroupTripDisplay) => void;
  className?: string;
}

function getStatusColor(status: GroupTripDisplay['status'], urgencyLevel: string): string {
  if (urgencyLevel === 'high') return 'destructive';
  
  switch (status) {
    case 'confirmed':
      return 'default'; // green
    case 'almost_full':
      return 'secondary'; // orange
    case 'forming':
    default:
      return 'outline'; // blue
  }
}

function getStatusText(status: GroupTripDisplay['status'], urgencyLevel: string): string {
  if (urgencyLevel === 'high' && status !== 'confirmed') return 'Срочно!';
  
  switch (status) {
    case 'confirmed':
      return 'Подтверждена';
    case 'almost_full':
      return 'Почти заполнена';
    case 'forming':
    default:
      return 'Набирается группа';
  }
}

function formatTimeSlot(timeSlot: 'morning' | 'afternoon'): string {
  return timeSlot === 'morning' ? 'Утром (9:00)' : 'Днём (14:00)';
}

function formatDate(date: Date): string {
  return format(date, 'd MMMM, EEEE', { locale: ru });
}

export default function SimpleGroupTripCard({ trip, onClick, className = '' }: SimpleGroupTripCardProps) {
  const statusVariant = getStatusColor(trip.status, trip.urgencyLevel);
  const statusText = getStatusText(trip.status, trip.urgencyLevel);
  const remainingSpots = trip.maxParticipants - trip.currentParticipants;
  const isUrgent = trip.urgencyLevel === 'high';
  const isConfirmed = trip.status === 'confirmed';

  const handleCardClick = () => {
    if (onClick) {
      onClick(trip);
    }
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(trip);
    }
  };

  return (
    <Card 
      className={`relative cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
        isUrgent ? 'border-red-300 shadow-red-100' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-grow">
            <h3 className="font-semibold text-lg mb-1">
              {formatDate(trip.date)}
            </h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatTimeSlot(trip.timeSlot)}</span>
              {trip.daysUntilTrip <= 3 && (
                <>
                  <span>•</span>
                  <span className="text-orange-600 font-medium">
                    {trip.daysUntilTrip === 0 ? 'Сегодня!' : 
                     trip.daysUntilTrip === 1 ? 'Завтра!' : 
                     `Через ${trip.daysUntilTrip} дня`}
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant} className={isUrgent ? 'animate-pulse' : ''}>
              {isConfirmed && <CheckCircle className="w-3 h-3 mr-1" />}
              {statusText}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Progress Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Участники</span>
            <span className="text-sm font-medium">
              {trip.currentParticipants}/{trip.maxParticipants}
            </span>
          </div>
          
          <Progress value={trip.progress} className="h-2 mb-2" />
          
          <p className={`text-sm ${
            remainingSpots <= 2 ? 'text-orange-600 font-medium' : 'text-muted-foreground'
          }`}>
            {remainingSpots === 0 
              ? 'Мест нет' 
              : `Осталось ${remainingSpots} ${remainingSpots === 1 ? 'место' : 'мест'}`
            }
            {!isConfirmed && remainingSpots <= (trip.maxParticipants - 6) && 
              ` до подтверждения`
            }
          </p>
        </div>

        {/* 🎣 Compact FishingEvent Info */}
        <FishingEventInfoCompact trip={trip} />

        {/* Participant Avatars */}
        {trip.participantAvatars.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Уже в группе</span>
            </div>
            
            <div className="flex items-center gap-2">
              {trip.participantAvatars.slice(0, 3).map((participant) => (
                <div 
                  key={participant.id}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-medium"
                  title={`${participant.participantCount} чел. • Присоединились ${format(participant.joinedAt, 'd MMM', { locale: ru })}`}
                >
                  {participant.initials}
                </div>
              ))}
              {trip.participantAvatars.length > 3 && (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  +{trip.participantAvatars.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Price and Location */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Euro className="w-5 h-5 text-green-600" />
            <span className="text-xl font-bold text-green-600">
              {trip.pricePerPerson}
            </span>
            <span className="text-sm text-muted-foreground">за человека</span>
          </div>

          {trip.meetingPoint && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground truncate max-w-24">
                {trip.meetingPoint}
              </span>
            </div>
          )}
        </div>

        {/* Special Notes */}
        {trip.specialNotes && (
          <p className="text-xs text-muted-foreground italic">
            {trip.specialNotes}
          </p>
        )}

        {/* Action Button */}
        <Button
          className="w-full"
          disabled={remainingSpots === 0}
          onClick={handleJoinClick}
          variant={isConfirmed ? 'default' : 'outline'}
        >
          {remainingSpots === 0
            ? 'Мест нет'
            : isConfirmed
            ? 'Присоединиться к поездке'
            : 'Присоединиться к группе'
          }
        </Button>
      </CardContent>
    </Card>
  );
}

// 🎣 Compact FishingEvent Information Component
function FishingEventInfoCompact({ trip }: { trip: GroupTripDisplay }) {
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'COMMERCIAL': return Fish;
      case 'TOURNAMENT': return Trophy;
      case 'LEARNING': return GraduationCap;
      case 'COMMUNITY': return Heart;
      default: return Fish;
    }
  };

  const EventTypeIcon = getEventTypeIcon(trip.eventType);

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Event Type */}
      <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
        <EventTypeIcon className="w-3 h-3" />
        <span>{trip.eventType.toLowerCase()}</span>
      </div>

      {/* Skill Level */}
      {trip.skillLevel !== 'ANY' && (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
          <Star className="w-3 h-3" />
          <span>{trip.skillLevel.toLowerCase()}</span>
        </div>
      )}

      {/* Difficulty */}
      <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
        <Target className="w-3 h-3" />
        <span>{trip.difficultyRating}/5</span>
      </div>

      {/* Target Species (first 2) */}
      {trip.targetSpecies && trip.targetSpecies.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
          <Fish className="w-3 h-3" />
          <span>
            {trip.targetSpecies.slice(0, 2).join(', ').toLowerCase()}
            {trip.targetSpecies.length > 2 && `+${trip.targetSpecies.length - 2}`}
          </span>
        </div>
      )}

      {/* Equipment */}
      {trip.equipment && (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-full">
          <Settings className="w-3 h-3" />
          <span>
            {trip.equipment === 'PROVIDED' ? 'снаряжение' : 
             trip.equipment === 'BRING_OWN' ? 'свое' : 
             trip.equipment === 'RENTAL_AVAILABLE' ? 'аренда' :
             'частично'}
          </span>
        </div>
      )}
    </div>
  );
}
