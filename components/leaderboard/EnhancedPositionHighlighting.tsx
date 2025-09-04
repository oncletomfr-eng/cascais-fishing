'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Target, 
  ChevronUp, 
  ChevronDown,
  Star,
  Trophy,
  Medal,
  Crown,
  Zap,
  Eye
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Types
interface PositionChange {
  from: number;
  to: number;
  change: number;
  timestamp: Date;
}

interface LeaderboardPlayer {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  rating: number;
  level: number;
  completedTrips: number;
  totalFishCaught: number;
  achievementsCount: number;
  positionHistory?: PositionChange[];
  lastPositionChange?: PositionChange;
}

interface EnhancedPositionHighlightingProps {
  players: LeaderboardPlayer[];
  currentUserId?: string;
  orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount';
  showNearbyOnly?: boolean;
  nearbyRange?: number;
  className?: string;
  onViewProfile?: (userId: string) => void;
}

// Position change animations and styling
const getPositionChangeIndicator = (change?: PositionChange) => {
  if (!change || change.change === 0) {
    return {
      icon: Minus,
      color: 'text-gray-400',
      bgColor: 'bg-gray-100',
      label: 'Без изменений'
    };
  }
  
  if (change.change > 0) {
    return {
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: `+${change.change} ${change.change === 1 ? 'позиция' : 'позиций'}`
    };
  }
  
  return {
    icon: TrendingDown,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: `${change.change} ${Math.abs(change.change) === 1 ? 'позиция' : 'позиций'}`
  };
};

// Position tier styling
const getPositionTier = (position: number) => {
  if (position === 1) {
    return {
      icon: Crown,
      color: 'text-yellow-600',
      bgColor: 'bg-gradient-to-r from-yellow-100 to-amber-100',
      borderColor: 'border-yellow-300',
      tier: 'champion'
    };
  } else if (position <= 3) {
    return {
      icon: Trophy,
      color: 'text-orange-600',
      bgColor: 'bg-gradient-to-r from-orange-100 to-yellow-100',
      borderColor: 'border-orange-300',
      tier: 'podium'
    };
  } else if (position <= 10) {
    return {
      icon: Medal,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      tier: 'top10'
    };
  } else {
    return {
      icon: Target,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      tier: 'regular'
    };
  }
};

// Motivational messages
const getMotivationalMessage = (player: LeaderboardPlayer) => {
  const change = player.lastPositionChange;
  const position = player.position;
  
  if (position === 1) {
    return {
      message: '🏆 Вы чемпион! Удержите лидерство!',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-50'
    };
  }
  
  if (change && change.change > 0) {
    return {
      message: `🚀 Отличная работа! Вы поднялись на ${Math.abs(change.change)} ${Math.abs(change.change) === 1 ? 'позицию' : 'позиций'}!`,
      color: 'text-green-700',
      bgColor: 'bg-green-50'
    };
  }
  
  if (change && change.change < 0) {
    return {
      message: `💪 Не сдавайтесь! Небольшой спад - это возможность для рывка!`,
      color: 'text-blue-700',
      bgColor: 'bg-blue-50'
    };
  }
  
  if (position <= 10) {
    return {
      message: '⭐ Вы в топ-10! Продолжайте в том же духе!',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50'
    };
  }
  
  return {
    message: '🎯 У вас есть потенциал! Время показать на что способны!',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-50'
  };
};

// Rank improvement suggestions
const getRankImprovementSuggestions = (player: LeaderboardPlayer, orderBy: string) => {
  const suggestions: string[] = [];
  
  switch (orderBy) {
    case 'rating':
      if (player.rating < 4.5) {
        suggestions.push('Повышайте качество рыбалки для улучшения рейтинга');
      }
      suggestions.push('Участвуйте в групповых поездках для получения отзывов');
      break;
    case 'level':
      suggestions.push('Выполняйте достижения для получения опыта');
      suggestions.push('Изучайте новые техники рыбалки');
      break;
    case 'completedTrips':
      suggestions.push('Планируйте больше рыболовных поездок');
      suggestions.push('Присоединяйтесь к групповым мероприятиям');
      break;
    case 'totalFishCaught':
      suggestions.push('Изучайте популярные места ловли');
      suggestions.push('Экспериментируйте с разными приманками');
      break;
    case 'achievementsCount':
      suggestions.push('Исследуйте систему достижений');
      suggestions.push('Участвуйте в соревнованиях и челленджах');
      break;
  }
  
  return suggestions;
};

export function EnhancedPositionHighlighting({
  players,
  currentUserId,
  orderBy,
  showNearbyOnly = false,
  nearbyRange = 3,
  className,
  onViewProfile
}: EnhancedPositionHighlightingProps) {
  const [isNearbyView, setIsNearbyView] = useState(showNearbyOnly);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  const currentUser = players.find(p => p.userId === currentUserId);
  
  // Filter players for nearby view
  const displayedPlayers = useMemo(() => {
    if (!isNearbyView || !currentUser) {
      return players;
    }
    
    const currentPosition = currentUser.position;
    return players.filter(player => 
      Math.abs(player.position - currentPosition) <= nearbyRange ||
      player.userId === currentUserId
    );
  }, [players, isNearbyView, currentUser, nearbyRange, currentUserId]);

  const motivationalMessage = currentUser ? getMotivationalMessage(currentUser) : null;
  const improvementSuggestions = currentUser ? getRankImprovementSuggestions(currentUser, orderBy) : [];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Рейтинг игроков</h3>
        {currentUser && (
          <Button
            variant={isNearbyView ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsNearbyView(!isNearbyView)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {isNearbyView ? 'Показать всех' : 'Рядом со мной'}
          </Button>
        )}
      </div>

      {/* Current User Highlight Card */}
      {currentUser && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className={cn(
            'border-2',
            getPositionTier(currentUser.position).borderColor,
            getPositionTier(currentUser.position).bgColor
          )}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span>Ваша позиция</span>
                <div className="flex items-center gap-2">
                  {React.createElement(getPositionTier(currentUser.position).icon, {
                    className: cn('w-5 h-5', getPositionTier(currentUser.position).color)
                  })}
                  <span className="text-2xl font-bold">#{currentUser.position}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={currentUser.avatar || ''} />
                    <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{currentUser.name}</p>
                    <p className="text-sm text-muted-foreground">Уровень {currentUser.level}</p>
                  </div>
                </div>
                
                {currentUser.lastPositionChange && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
                      getPositionChangeIndicator(currentUser.lastPositionChange).color,
                      getPositionChangeIndicator(currentUser.lastPositionChange).bgColor
                    )}
                  >
                    {React.createElement(getPositionChangeIndicator(currentUser.lastPositionChange).icon, {
                      className: 'w-4 h-4'
                    })}
                    <span>{getPositionChangeIndicator(currentUser.lastPositionChange).label}</span>
                  </motion.div>
                )}
              </div>

              {/* Motivational Message */}
              {motivationalMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'p-3 rounded-lg text-sm font-medium text-center',
                    motivationalMessage.bgColor,
                    motivationalMessage.color
                  )}
                >
                  {motivationalMessage.message}
                </motion.div>
              )}

              {/* Improvement Suggestions */}
              {improvementSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedUserId(expandedUserId === currentUserId ? null : currentUserId)}
                    className="flex items-center gap-2 p-0 h-auto text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Zap className="w-4 h-4" />
                    Рекомендации по улучшению
                    {expandedUserId === currentUserId ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                  
                  <AnimatePresence>
                    {expandedUserId === currentUserId && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1"
                      >
                        {improvementSuggestions.map((suggestion, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary mt-0.5">•</span>
                            <span>{suggestion}</span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Players List */}
      <div className="space-y-2">
        <AnimatePresence>
          {displayedPlayers.map((player, index) => {
            const isCurrentUser = player.userId === currentUserId;
            const positionTier = getPositionTier(player.position);
            const changeIndicator = getPositionChangeIndicator(player.lastPositionChange);
            
            return (
              <motion.div
                key={player.userId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 100,
                  damping: 15
                }}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
                  'hover:shadow-md hover:scale-[1.01]',
                  isCurrentUser 
                    ? cn(
                        'border-2 shadow-sm',
                        positionTier.borderColor,
                        positionTier.bgColor
                      )
                    : 'border-gray-200 bg-white hover:bg-gray-50',
                  // Animate position changes
                  player.lastPositionChange?.change !== 0 && 'animate-pulse'
                )}
              >
                {/* Position with tier styling */}
                <div className="flex items-center justify-center w-12">
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm',
                    positionTier.color,
                    isCurrentUser ? 'bg-white/80' : 'bg-gray-100'
                  )}>
                    {player.position <= 3 ? (
                      React.createElement(positionTier.icon, { className: 'w-4 h-4' })
                    ) : (
                      player.position
                    )}
                  </div>
                </div>

                {/* Avatar */}
                <Avatar className="w-12 h-12">
                  {player.isAnonymous ? (
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={player.avatar || ''} />
                      <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                    </>
                  )}
                </Avatar>

                {/* Player Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{player.name}</h4>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        Вы
                      </Badge>
                    )}
                    {player.isAnonymous && !isCurrentUser && (
                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600">
                        Анонимный
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Ур. {player.level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>{player.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      <span>{player.completedTrips}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Medal className="w-3 h-3" />
                      <span>{player.achievementsCount}</span>
                    </div>
                  </div>
                </div>

                {/* Position Change Indicator */}
                {player.lastPositionChange && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      changeIndicator.color,
                      changeIndicator.bgColor
                    )}
                  >
                    {React.createElement(changeIndicator.icon, { className: 'w-3 h-3' })}
                    <span className="hidden sm:inline">{Math.abs(player.lastPositionChange.change)}</span>
                  </motion.div>
                )}

                {/* View Profile Button */}
                {onViewProfile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewProfile(player.userId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Профиль
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Nearby View Info */}
      {isNearbyView && currentUser && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-muted-foreground py-2"
        >
          Показаны игроки рядом с позицией #{currentUser.position}
        </motion.div>
      )}
    </div>
  );
}
