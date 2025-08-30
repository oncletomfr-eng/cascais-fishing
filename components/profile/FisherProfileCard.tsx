'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Star, 
  Trophy,
  Fish,
  Users,
  Calendar,
  Target,
  Medal,
  Eye,
  Share2
} from 'lucide-react';
import { FisherProfileExtended } from '@/lib/types/achievements';
import { EXPERIENCE_LEVELS, ACHIEVEMENT_ICONS, CATEGORY_ICONS } from '@/lib/types/achievements';

interface FisherProfileCardProps {
  profile: FisherProfileExtended;
  isOwner?: boolean;
  showFullDetails?: boolean;
  onViewAchievements?: () => void;
  onShare?: () => void;
}

export function FisherProfileCard({ 
  profile, 
  isOwner = false, 
  showFullDetails = false,
  onViewAchievements,
  onShare
}: FisherProfileCardProps) {
  const experienceInfo = EXPERIENCE_LEVELS[profile.experienceLevel];
  const levelProgress = ((profile.experiencePoints % 1000) / 1000) * 100;
  const nextLevel = profile.level + 1;
  const pointsToNextLevel = 1000 - (profile.experiencePoints % 1000);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        {/* Аватар и основная информация */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
              <AvatarImage 
                src={profile.user?.image || ''} 
                alt={profile.user?.name || 'Fisher'} 
              />
              <AvatarFallback className="text-2xl font-bold">
                {profile.user?.name?.charAt(0) || 'F'}
              </AvatarFallback>
            </Avatar>
            
            {/* Индикатор уровня */}
            <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold border-2 border-background">
              {profile.level}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-bold">{profile.user?.name}</h3>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <span className="text-lg">{experienceInfo.icon}</span>
              <span className="text-sm font-medium">{experienceInfo.name}</span>
            </div>
          </div>

          {/* Рейтинг */}
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{Number(profile.rating).toFixed(1)}</span>
            <span className="text-muted-foreground text-sm">
              ({profile.totalReviews} отзывов)
            </span>
          </div>

          {/* Позиция в рейтинге */}
          {profile.position && (
            <Badge variant="outline" className="gap-1">
              <Trophy className="w-3 h-3" />
              #{profile.position} в рейтинге
            </Badge>
          )}
        </div>

        {/* Прогресс до следующего уровня */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Уровень {profile.level}</span>
            <span>Уровень {nextLevel}</span>
          </div>
          <Progress value={levelProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center">
            {pointsToNextLevel} очков до следующего уровня
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Статистика */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Fish className="w-5 h-5 mx-auto mb-1 text-blue-600" />
            <div className="font-semibold">{profile.completedTrips}</div>
            <div className="text-xs text-muted-foreground">Поездок</div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Target className="w-5 h-5 mx-auto mb-1 text-green-600" />
            <div className="font-semibold">{profile.totalFishCaught}кг</div>
            <div className="text-xs text-muted-foreground">Поймано</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Users className="w-5 h-5 mx-auto mb-1 text-purple-600" />
            <div className="font-semibold">{profile.createdTrips}</div>
            <div className="text-xs text-muted-foreground">Создано</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Medal className="w-5 h-5 mx-auto mb-1 text-orange-600" />
            <div className="font-semibold">{profile.badges.length}</div>
            <div className="text-xs text-muted-foreground">Достижений</div>
          </div>
        </div>

        {/* Специализации */}
        {profile.specialties.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Специализации</h4>
            <div className="flex flex-wrap gap-1">
              {profile.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {getSpecialtyDisplayName(specialty)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Локация */}
        {(profile.city || profile.country) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>
              {profile.city && profile.country 
                ? `${profile.city}, ${profile.country}`
                : profile.city || profile.country
              }
            </span>
          </div>
        )}

        {/* Биография */}
        {profile.bio && showFullDetails && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">О рыболове</h4>
            <p className="text-sm text-muted-foreground">{profile.bio}</p>
          </div>
        )}

        {/* Последние достижения */}
        {profile.badges.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Последние достижения</h4>
            <div className="flex flex-wrap gap-1">
              {profile.badges.slice(0, 3).map((badge) => (
                <Badge 
                  key={badge.id} 
                  variant="outline" 
                  className="text-xs gap-1"
                  title={badge.description || badge.name}
                >
                  <span>{CATEGORY_ICONS[badge.category]}</span>
                  <span>{badge.name}</span>
                </Badge>
              ))}
              {profile.badges.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{profile.badges.length - 3} еще
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Дополнительная статистика для полного профиля */}
        {showFullDetails && (
          <div className="space-y-3 pt-4 border-t">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Надежность:</span>
                <span className="font-medium">{Number(profile.reliability).toFixed(1)}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Активных дней:</span>
                <span className="font-medium">{profile.activeDays}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Уникальных видов:</span>
                <span className="font-medium">{profile.uniqueSpecies.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Положительных отзывов:</span>
                <span className="font-medium">{profile.positiveReviews}</span>
              </div>
            </div>

            {/* Последняя активность */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>
                Последняя активность: {new Date(profile.lastActiveAt).toLocaleDateString('ru')}
              </span>
            </div>
          </div>
        )}

        {/* Действия */}
        <div className="flex gap-2 pt-4">
          {onViewAchievements && (
            <Button
              variant="outline" 
              size="sm"
              onClick={onViewAchievements}
              className="flex-1 gap-2"
            >
              <Eye className="w-4 h-4" />
              Достижения
            </Button>
          )}
          
          {onShare && (
            <Button
              variant="outline" 
              size="sm"
              onClick={onShare}
              className="gap-2"
            >
              <Share2 className="w-4 h-4" />
              Поделиться
            </Button>
          )}
        </div>

        {/* Секретный код для владельца */}
        {isOwner && profile.secretCode && (
          <div className="bg-muted/50 p-3 rounded-lg text-center">
            <p className="text-xs text-muted-foreground mb-1">Секретный код для входа:</p>
            <code className="font-mono font-bold text-sm">{profile.secretCode}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Получает отображаемое название специализации
 */
function getSpecialtyDisplayName(specialty: string): string {
  const names: Record<string, string> = {
    'DEEP_SEA': 'Глубоководная',
    'SHORE': 'С берега',
    'FLY_FISHING': 'Нахлыст',
    'SPORT_FISHING': 'Спортивная',
  };
  return names[specialty] || specialty;
}
