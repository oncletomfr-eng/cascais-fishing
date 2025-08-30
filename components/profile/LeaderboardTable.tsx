'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Trophy, 
  Medal,
  Star,
  Fish,
  Target,
  Users,
  Crown,
  ChevronUp,
  ChevronDown,
  User
} from 'lucide-react';
import { LeaderboardPlayer } from '@/lib/types/achievements';

interface LeaderboardTableProps {
  players: LeaderboardPlayer[];
  currentUserId?: string;
  orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount';
  onOrderByChange: (orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount') => void;
  loading?: boolean;
  showPlayerRating?: boolean;
  onViewProfile?: (userId: string) => void;
}

export function LeaderboardTable({
  players,
  currentUserId,
  orderBy,
  onOrderByChange,
  loading = false,
  showPlayerRating = false,
  onViewProfile
}: LeaderboardTableProps) {
  const currentUserPlayer = players.find(p => p.userId === currentUserId);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Рейтинг рыболовов
          </CardTitle>

          {/* Фильтр сортировки */}
          <Select value={orderBy} onValueChange={onOrderByChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  По рейтингу
                </div>
              </SelectItem>
              <SelectItem value="level">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  По уровню
                </div>
              </SelectItem>
              <SelectItem value="completedTrips">
                <div className="flex items-center gap-2">
                  <Fish className="w-4 h-4" />
                  По поездкам
                </div>
              </SelectItem>
              <SelectItem value="totalFishCaught">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  По улову
                </div>
              </SelectItem>
              <SelectItem value="achievementsCount">
                <div className="flex items-center gap-2">
                  <Medal className="w-4 h-4" />
                  По достижениям
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Статистика текущего пользователя */}
        {showPlayerRating && currentUserPlayer && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={currentUserPlayer.avatar || ''} alt={currentUserPlayer.name || 'You'} />
                    <AvatarFallback>{currentUserPlayer.name?.charAt(0) || 'Y'}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {currentUserPlayer.level}
                  </div>
                </div>

                <div>
                  <p className="font-medium">Ваша позиция</p>
                  <p className="text-sm text-muted-foreground">{currentUserPlayer.name}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center gap-1">
                  {getPositionIcon(currentUserPlayer.position)}
                  <span className="text-2xl font-bold">#{currentUserPlayer.position}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {getOrderByValue(currentUserPlayer, orderBy)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="w-8 bg-muted rounded"></div>
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/4"></div>
                </div>
                <div className="w-20 h-6 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((player, index) => (
              <PlayerRow
                key={player.userId}
                player={player}
                orderBy={orderBy}
                isCurrentUser={player.userId === currentUserId}
                onViewProfile={() => onViewProfile?.(player.userId)}
              />
            ))}

            {players.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Рейтинг пуст</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PlayerRowProps {
  player: LeaderboardPlayer;
  orderBy: string;
  isCurrentUser: boolean;
  onViewProfile?: () => void;
}

function PlayerRow({ player, orderBy, isCurrentUser, onViewProfile }: PlayerRowProps) {
  return (
    <div
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-muted/50 ${
        isCurrentUser ? 'bg-primary/10 border border-primary/20' : ''
      }`}
    >
      {/* Позиция */}
      <div className="w-8 flex justify-center">
        {getPositionDisplay(player.position)}
      </div>

      {/* Аватар */}
      <div className="relative">
        <Avatar className="w-12 h-12">
          <AvatarImage src={player.avatar || ''} alt={player.name || 'Fisher'} />
          <AvatarFallback>{player.name?.charAt(0) || 'F'}</AvatarFallback>
        </Avatar>
        
        {/* Индикатор уровня */}
        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {player.level}
        </div>
      </div>

      {/* Информация об игроке */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium truncate">{player.name}</h4>
          {isCurrentUser && (
            <Badge variant="outline" className="text-xs">
              Вы
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            <span>{player.rating.toFixed(1)}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Fish className="w-3 h-3" />
            <span>{player.completedTrips}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Medal className="w-3 h-3" />
            <span>{player.achievementsCount}</span>
          </div>
        </div>
      </div>

      {/* Основная метрика */}
      <div className="text-right">
        <div className="font-bold text-lg">
          {getOrderByValue(player, orderBy)}
        </div>
        <div className="text-xs text-muted-foreground">
          {getOrderByLabel(orderBy)}
        </div>
      </div>

      {/* Кнопка просмотра профиля */}
      {onViewProfile && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewProfile}
          className="ml-2"
        >
          <User className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Получает иконку для позиции в рейтинге
 */
function getPositionIcon(position: number) {
  if (position === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
  if (position === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (position === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <Trophy className="w-4 h-4 text-muted-foreground" />;
}

/**
 * Получает отображение позиции в рейтинге
 */
function getPositionDisplay(position: number) {
  if (position <= 3) {
    return getPositionIcon(position);
  }
  return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
}

/**
 * Получает значение для отображения по выбранной метрике
 */
function getOrderByValue(player: LeaderboardPlayer, orderBy: string): string {
  switch (orderBy) {
    case 'rating':
      return player.rating.toFixed(1);
    case 'level':
      return player.level.toString();
    case 'completedTrips':
      return player.completedTrips.toString();
    case 'totalFishCaught':
      return `${player.totalFishCaught}кг`;
    case 'achievementsCount':
      return player.achievementsCount.toString();
    default:
      return '-';
  }
}

/**
 * Получает подпись для выбранной метрики
 */
function getOrderByLabel(orderBy: string): string {
  const labels: Record<string, string> = {
    rating: 'рейтинг',
    level: 'уровень',
    completedTrips: 'поездок',
    totalFishCaught: 'улов',
    achievementsCount: 'достижений',
  };
  return labels[orderBy] || '';
}
