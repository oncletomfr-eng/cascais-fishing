'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Euro,
  AlertCircle,
  CheckCircle,
  Zap,
  TrendingUp,
  Activity,
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

// Импорт типов и утилит
import {
  GroupTripCardProps, 
  GroupTripDisplay,
  ParticipantAvatar 
} from '@/lib/types/group-events';
import {
  getStatusColor,
  formatTripDate,
  formatTripTime,
  isTripUrgent
} from '@/lib/utils/group-trips-utils';
import { useConfetti } from '@/lib/hooks/useConfetti';

/**
 * GroupTripCard - Карточка групповой поездки с социальными триггерами
 * 
 * UX психология:
 * - Social Proof: аватары участников, недавние присоединения
 * - Scarcity: urgency badges, countdown до заполнения
 * - Goal Gradient: прогресс бар заполнения группы
 * - Peak-End Rule: яркие анимации при критических состояниях
 */
export default function GroupTripCard({
  trip,
  onJoinRequest,
  showParticipants = true,
  showWeather = false,
  urgencyLevel,
  className = ''
}: GroupTripCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { fireFromElement, fireCelebration } = useConfetti();
  const [previousStatus, setPreviousStatus] = useState(trip.status);
  
  // Определяем urgency level (можем переопределить через props)
  const effectiveUrgencyLevel = urgencyLevel || trip.urgencyLevel;
  
  // Вычисляем progress из текущих данных
  const progress = Math.round((trip.currentParticipants / trip.maxParticipants) * 100);
  
  // Определяем показывать ли конфетти при подтверждении
  const isJustConfirmed = trip.status === 'confirmed' && progress >= 75;
  
  // Эффект для запуска конфетти при подтверждении группы
  useEffect(() => {
    // Проверяем, изменился ли статус на 'confirmed'
    if (previousStatus !== 'confirmed' && trip.status === 'confirmed' && cardRef.current) {
      // Запускаем мощную celebration анимацию
      fireCelebration();
      
      // Также запускаем анимацию от самой карточки через небольшую задержку
      setTimeout(() => {
        if (cardRef.current) {
          fireFromElement(cardRef.current, {
            particleCount: 100,
            spread: 100,
            origin: { x: 0.5, y: 0.6 },
            colors: ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6']
          });
        }
      }, 500);
    }
    
    // Обновляем предыдущий статус
    setPreviousStatus(trip.status);
  }, [trip.status, previousStatus, fireCelebration, fireFromElement]);
  
  // Обработчик клика на карточку
  const handleCardClick = () => {
    onJoinRequest(trip.tripId);
  };

  return (
    <TooltipProvider>
    <motion.div
        ref={cardRef}
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      className={className}
      >
        <Card className={`
          cursor-pointer overflow-hidden border-2 transition-all duration-300
          ${isHovered ? 'border-blue-300 shadow-xl' : 'border-border hover:border-blue-200'}
          ${effectiveUrgencyLevel === 'high' ? 'ring-2 ring-red-200 ring-opacity-60' : ''}
          ${trip.status === 'confirmed' ? 'ring-2 ring-green-200 ring-opacity-60' : ''}
        `}>
          {/* Анимированный бэкграунд для urgency */}
          {effectiveUrgencyLevel === 'high' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-50 to-orange-50 opacity-30"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          
          {/* Конфетти эффект теперь управляется через useConfetti хук */}
          
          <CardContent className="relative p-6">
            {/* Header с датой и статусом */}
            <div className="flex justify-between items-start mb-4">
              <div className="space-y-1">
                <motion.h3 
                  className="text-lg font-semibold flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Calendar className="h-4 w-4 text-blue-600" />
                  {formatTripDate(trip.date)}
                </motion.h3>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTripTime(trip.timeSlot)}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {trip.meetingPoint}
                  </span>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={trip.status} urgencyLevel={effectiveUrgencyLevel} />
                {(effectiveUrgencyLevel === 'high' || effectiveUrgencyLevel === 'critical') && (
                  <UrgencyBadge spotsLeft={trip.spotsRemaining} />
                )}
              </div>
            </div>
            
            {/* Progress Bar с анимацией */}
            <div className="mb-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Участники</span>
                <span className="font-medium">
                  {trip.currentParticipants}/{trip.maxParticipants}
                </span>
              </div>
              
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                className="w-full"
              >
                <Progress 
                  value={progress}
                  className={`h-2 ${
                    trip.status === 'confirmed' ? 'bg-green-100' : 
                    effectiveUrgencyLevel === 'high' ? 'bg-red-100' :
                    effectiveUrgencyLevel === 'medium' ? 'bg-orange-100' :
                    'bg-blue-100'
                  }`}
                />
              </motion.div>
              
              <ParticipantsInfo 
                trip={trip} 
                showParticipants={showParticipants} 
              />
            </div>
            
            {/* 🎣 Fishing Event Details */}
            <FishingEventDetails trip={trip} />
            
            {/* Social Proof текст */}
            {trip.socialProof && (
              <motion.p 
                className="text-sm text-blue-600 mb-4 font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {trip.socialProof}
              </motion.p>
            )}
            
            {/* Price и CTA */}
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600 flex items-center gap-1">
                  <Euro className="h-5 w-5" />
                  {trip.pricePerPerson}
                </div>
                <p className="text-xs text-muted-foreground">за человека</p>
              </div>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleCardClick}
                  size="lg"
                  className={`
                    font-semibold px-6 transition-all duration-300 
                    ${trip.status === 'confirmed' ? 
                      'bg-green-600 hover:bg-green-700 text-white' :
                      effectiveUrgencyLevel === 'high' ?
                      'bg-red-600 hover:bg-red-700 text-white animate-pulse' :
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                  `}
                  disabled={trip.spotsRemaining === 0}
                >
                  {trip.status === 'confirmed' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Присоединиться
                    </span>
                  ) : effectiveUrgencyLevel === 'high' ? (
                    <span className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      Последние места!
                    </span>
                  ) : (
                    'Присоединиться'
                  )}
                </Button>
              </motion.div>
              
              {/* Кнопка подробной информации с чатом */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/trip/${trip.tripId}`);
                  }}
                  className="mt-2 w-full h-9 text-sm font-medium border border-blue-300 hover:border-blue-400 hover:bg-blue-50 text-blue-700 transition-all duration-300"
                >
                  <span className="flex items-center gap-2">
                    <ExternalLink className="h-3 w-3" />
                    Подробнее и чат
                  </span>
                </Button>
              </motion.div>
            </div>
            
            {/* Дополнительная информация при hover */}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ 
                opacity: isHovered ? 1 : 0, 
                height: isHovered ? 'auto' : 0 
              }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden mt-4 pt-4 border-t border-border"
            >
              <div className="text-xs text-muted-foreground space-y-1">
                {trip.description && (
                  <p>{trip.description}</p>
                )}
                <p>Минимум {trip.minRequired} человек для подтверждения</p>
                {isTripUrgent(trip) && (
                  <p className="text-orange-600 font-medium">
                    ⏰ Поездка через {Math.ceil((new Date(trip.date).getTime() - Date.now()) / (1000 * 60 * 60))} часов
                  </p>
                )}
              </div>
            </motion.div>
        </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
}

/**
 * Компонент статус badge
 */
function StatusBadge({ 
  status, 
  urgencyLevel 
}: { 
  status: GroupTripDisplay['status']; 
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Подтверждена',
          icon: <CheckCircle className="h-3 w-3" />,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'almost_full':
        return {
          label: 'Почти полная',
          icon: <AlertCircle className="h-3 w-3" />,
          className: 'bg-orange-100 text-orange-800 border-orange-200 animate-pulse'
        };
      case 'forming':
        return {
          label: 'Набирается',
          icon: <Users className="h-3 w-3" />,
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'cancelled':
        return {
          label: 'Отменена',
          icon: <AlertCircle className="h-3 w-3" />,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
    }
  };
  
  const config = getStatusConfig();
  
  return (
    <Badge className={`${config.className} flex items-center gap-1 px-2 py-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

/**
 * Компонент urgency badge
 */
function UrgencyBadge({ spotsLeft }: { spotsLeft: number }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 1, repeat: Infinity }}
    >
      <Badge className="bg-red-500 text-white animate-pulse font-bold">
        {spotsLeft === 1 ? 'Последнее место!' : `Только ${spotsLeft} мест!`}
      </Badge>
    </motion.div>
  );
}

/**
 * Компонент информации об участниках
 */
function ParticipantsInfo({ 
  trip, 
  showParticipants 
}: { 
  trip: GroupTripDisplay; 
  showParticipants: boolean; 
}) {
  if (!showParticipants || trip.participants.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {trip.spotsRemaining} {trip.spotsRemaining === 1 ? 'место' : 'мест'} свободно
      </p>
    );
  }
  
  const visibleAvatars = trip.participants.slice(0, 4);
  const hiddenCount = Math.max(0, trip.participants.length - 4);
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {visibleAvatars.map((participant, index) => (
            <Tooltip key={participant.id}>
              <TooltipTrigger>
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Avatar className="h-6 w-6 border-2 border-white shadow-sm">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                      {participant.name?.split(' ').map(n => n[0]).join('') || '?'}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">
                  {participant.name}
                  {participant.country && (
                    <span className="ml-1">{participant.country}</span>
                  )}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
          
          {hiddenCount > 0 && (
            <motion.div 
              className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: visibleAvatars.length * 0.1 }}
            >
              <span className="text-xs text-gray-600 font-medium">
                +{hiddenCount}
              </span>
            </motion.div>
          )}
        </div>
        
        <span className="text-xs text-muted-foreground">уже с нами</span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {trip.spotsRemaining} свободно
      </p>
    </div>
  );
}

// 🎣 Fishing Event Details Component
function FishingEventDetails({ trip }: { trip: GroupTripDisplay }) {
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
      case 'COMMERCIAL': return 'bg-blue-100 text-blue-700';
      case 'TOURNAMENT': return 'bg-purple-100 text-purple-700';
      case 'LEARNING': return 'bg-green-100 text-green-700';
      case 'COMMUNITY': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSkillLevelColor = (skillLevel: string) => {
    switch (skillLevel) {
      case 'BEGINNER': return 'bg-green-50 text-green-600 border-green-200';
      case 'INTERMEDIATE': return 'bg-yellow-50 text-yellow-600 border-yellow-200';
      case 'ADVANCED': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'EXPERT': return 'bg-red-50 text-red-600 border-red-200';
      case 'ANY': return 'bg-gray-50 text-gray-600 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const EventTypeIcon = getEventTypeIcon(trip.eventType);

  return (
    <div className="mb-4 space-y-3">
      {/* Event Type and Skill Level */}
      <div className="flex items-center gap-2 flex-wrap">
        <Tooltip>
          <TooltipTrigger>
            <Badge className={`flex items-center gap-1 ${getEventTypeColor(trip.eventType)}`}>
              <EventTypeIcon className="h-3 w-3" />
              {trip.eventType.toLowerCase().replace('_', ' ')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Тип мероприятия</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={`flex items-center gap-1 ${getSkillLevelColor(trip.skillLevel)}`}>
              <Star className="h-3 w-3" />
              {trip.skillLevel.toLowerCase()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Требуемый уровень навыков</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {trip.difficultyRating}/5
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Уровень сложности</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Target Species */}
      {trip.targetSpecies && trip.targetSpecies.length > 0 && (
        <div className="flex items-center gap-2">
          <Target className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {trip.targetSpecies.slice(0, 3).map((species, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {species.replace('_', ' ').toLowerCase()}
              </Badge>
            ))}
            {trip.targetSpecies.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{trip.targetSpecies.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Fishing Techniques */}
      {trip.fishingTechniques && trip.fishingTechniques.length > 0 && (
        <div className="flex items-center gap-2">
          <Settings className="h-3 w-3 text-muted-foreground" />
          <div className="flex flex-wrap gap-1">
            {trip.fishingTechniques.slice(0, 2).map((technique, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {technique.replace('_', ' ').toLowerCase()}
              </Badge>
            ))}
            {trip.fishingTechniques.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{trip.fishingTechniques.length - 2}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Additional Info Row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {trip.equipment && (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {trip.equipment === 'PROVIDED' ? 'Снаряжение' : 'Свое снаряжение'}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Снаряжение: {trip.equipment.replace('_', ' ').toLowerCase()}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {trip.weatherDependency && (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-1">
                  <CloudRain className="h-3 w-3" />
                  Погода важна
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Мероприятие зависит от погодных условий</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        
        {trip.socialMode && (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-xs capitalize">
                {trip.socialMode.toLowerCase().replace('_', ' ')}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Формат мероприятия</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}

