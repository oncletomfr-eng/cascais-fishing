'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Clock, 
  MapPin, 
  MessageCircle,
  CheckCircle,
  Sparkles,
  Fish,
  Trophy,
  GraduationCap,
  Heart,
  Star,
  Target,
  Settings,
  CloudRain,
  Gauge,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { GroupTripDisplay } from '@/lib/types/group-events';
import { useTripChat } from '@/components/chat/TripChatSystem';

interface GroupTripCardWithChatProps {
  trip: GroupTripDisplay;
  onJoinRequest: (tripId: string) => void;
  onChatOpen?: (tripId: string) => void;
  showWeather?: boolean;
  showParticipants?: boolean;
  showChatButton?: boolean;
  className?: string;
}

// Карточка групповой поездки с интегрированной кнопкой чата
export function GroupTripCardWithChat({ 
  trip, 
  onJoinRequest,
  onChatOpen,
  showWeather = true,
  showParticipants = true,
  showChatButton = true,
  className
}: GroupTripCardWithChatProps) {
  const { toggleChat } = useTripChat(trip.tripId);
  
  const progressPercent = (trip.currentParticipants / trip.maxParticipants) * 100;
  const isUrgent = trip.urgencyLevel === 'high' || trip.urgencyLevel === 'critical';
  const isAlmostFull = trip.spotsRemaining <= 2;
  const isConfirmed = trip.status === 'confirmed';

  const handleChatOpen = () => {
    if (onChatOpen) {
      onChatOpen(trip.tripId);
    } else {
      toggleChat();
    }
  };

  const handleJoinTrip = () => {
    onJoinRequest(trip.tripId);
  };

  return (
    <TooltipProvider>
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        isUrgent && "ring-2 ring-orange-400",
        isConfirmed && "ring-2 ring-green-400",
        className
      )}>
        {/* Индикатор срочности */}
      {isUrgent && (
        <motion.div
          initial={{ x: -100 }}
          animate={{ x: 0 }}
          className="absolute top-0 left-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-1 text-xs font-semibold z-10"
        >
          <div className="flex items-center space-x-1">
            <Sparkles className="h-3 w-3" />
            <span>Срочно!</span>
          </div>
        </motion.div>
      )}

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Fish className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">
                {trip.timeDisplay}
              </span>
            </div>
            <h3 className="font-semibold text-lg">
              {format(trip.date, 'dd MMM yyyy', { locale: ru })}
            </h3>
            {trip.meetingPoint && (
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <MapPin className="h-3 w-3 mr-1" />
                {trip.meetingPoint}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <StatusBadge status={trip.status} />
            
            {/* Кнопка чата */}
            {showChatButton && isConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleChatOpen}
                className="flex items-center space-x-1 text-xs"
              >
                <MessageCircle className="h-3 w-3" />
                <span>Чат</span>
              </Button>
            )}
          </div>
        </div>

        {/* Прогресс-бар заполнения */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {trip.currentParticipants} из {trip.maxParticipants} участников
            </span>
            <span className={cn(
              "font-medium",
              isAlmostFull ? "text-orange-600" : "text-green-600"
            )}>
              {trip.spotsRemaining} мест
            </span>
          </div>
          
          <Progress 
            value={progressPercent} 
            className={cn(
              "h-2",
              isAlmostFull && "progress-urgent"
            )}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Участники (аватары) */}
        {showParticipants && trip.participants.length > 0 && (
          <ParticipantAvatars participants={trip.participants} />
        )}

        {/* 🎣 Fishing Event Details */}
        <FishingEventDetailsCompact trip={trip} />

        {/* Социальное подтверждение */}
        {trip.socialProof && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 rounded-lg p-3"
          >
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                {trip.socialProof}
              </span>
            </div>
          </motion.div>
        )}

        {/* Последняя активность */}
        {trip.recentActivity && (
          <div className="text-xs text-gray-500">
            <Clock className="inline h-3 w-3 mr-1" />
            {trip.recentActivity}
          </div>
        )}

        {/* Цена и действия */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="text-2xl font-bold text-blue-600">
              €{trip.pricePerPerson}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              за участника
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Кнопка чата для подтвержденных поездок */}
            {showChatButton && isConfirmed && (
              <Button
                variant="outline" 
                size="sm"
                onClick={handleChatOpen}
                className="flex items-center space-x-1"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
            
            {/* Основная кнопка действия */}
            <Button
              onClick={handleJoinTrip}
              disabled={isConfirmed && trip.spotsRemaining === 0}
              className={cn(
                "transition-all duration-200",
                isUrgent && "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600",
                isConfirmed && "bg-green-600 hover:bg-green-700"
              )}
            >
              {isConfirmed ? 'Участвую' : 'Присоединиться'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Анимация пульсации для срочных поездок */}
      {isUrgent && (
        <motion.div
          className="absolute inset-0 bg-orange-400/10 pointer-events-none"
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      )}
    </Card>
    </TooltipProvider>
  );
}

// Компонент аватаров участников
function ParticipantAvatars({ 
  participants 
}: { 
  participants: any[] 
}) {
  const visibleParticipants = participants.slice(0, 4);
  const hiddenCount = Math.max(0, participants.length - 4);

  return (
    <div className="flex items-center space-x-2">
      <div className="flex -space-x-2">
        {visibleParticipants.map((participant, index) => (
          <motion.div
            key={participant.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={participant.avatar} />
              <AvatarFallback className="text-xs">
                {participant.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </motion.div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white flex items-center justify-center">
            <span className="text-xs text-gray-600">+{hiddenCount}</span>
          </div>
        )}
      </div>
      
      <div className="text-sm text-gray-600">
        {participants.length} участник{participants.length !== 1 ? 'ов' : ''}
      </div>
    </div>
  );
}

// Компонент значка статуса
function StatusBadge({ status }: { status: string }) {
  const config = {
    'forming': { label: 'Набор', color: 'blue' },
    'almost_full': { label: 'Почти заполнено', color: 'orange' },
    'confirmed': { label: 'Подтверждено', color: 'green' },
    'cancelled': { label: 'Отменено', color: 'red' }
  };

  const { label, color } = config[status as keyof typeof config] || config.forming;

  return (
    <Badge variant={color === 'green' ? 'default' : 'secondary'} className={cn(
      "flex items-center space-x-1",
      color === 'blue' && "bg-blue-100 text-blue-800",
      color === 'orange' && "bg-orange-100 text-orange-800", 
      color === 'green' && "bg-green-100 text-green-800",
      color === 'red' && "bg-red-100 text-red-800"
    )}>
      {color === 'green' && <CheckCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );
}

// 🎣 Compact Fishing Event Details Component
function FishingEventDetailsCompact({ trip }: { trip: GroupTripDisplay }) {
  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'COMMERCIAL': return Fish;
      case 'TOURNAMENT': return Trophy;
      case 'LEARNING': return GraduationCap;
      case 'COMMUNITY': return Heart;
      default: return Fish;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'COMMERCIAL': return 'bg-blue-100 text-blue-600';
      case 'TOURNAMENT': return 'bg-purple-100 text-purple-600';
      case 'LEARNING': return 'bg-green-100 text-green-600';
      case 'COMMUNITY': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const EventTypeIcon = getEventTypeIcon(trip.eventType);

  return (
    <div className="space-y-2">
      {/* Main badges row */}
      <div className="flex flex-wrap items-center gap-1">
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`flex items-center gap-1 text-xs ${getEventTypeColor(trip.eventType)}`}>
              <EventTypeIcon className="h-3 w-3" />
              {trip.eventType.toLowerCase()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Тип события</p>
          </TooltipContent>
        </Tooltip>

        {trip.skillLevel !== 'ANY' && (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Star className="h-3 w-3" />
                {trip.skillLevel.toLowerCase()}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Уровень навыков</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Gauge className="h-3 w-3" />
              {trip.difficultyRating}/5
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Сложность</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Secondary info row */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {trip.targetSpecies && trip.targetSpecies.length > 0 && (
          <div className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            <span>{trip.targetSpecies.slice(0, 2).join(', ').toLowerCase()}</span>
            {trip.targetSpecies.length > 2 && <span>+{trip.targetSpecies.length - 2}</span>}
          </div>
        )}

        {trip.equipment && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                <Award className="h-3 w-3" />
                <span>{trip.equipment === 'PROVIDED' ? 'Снаряжение' : 'Свое'}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Снаряжение: {trip.equipment.replace('_', ' ').toLowerCase()}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {trip.weatherDependency && (
          <Tooltip>
            <TooltipTrigger>
              <div className="flex items-center gap-1">
                <CloudRain className="h-3 w-3" />
                <span>Погода</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Зависит от погодных условий</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
