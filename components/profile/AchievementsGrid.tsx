'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lock, Trophy } from 'lucide-react';
import { 
  AchievementWithProgress,
  ACHIEVEMENT_ICONS, 
  CATEGORY_ICONS,
  BadgeCategory
} from '@/lib/types/achievements';

interface AchievementsGridProps {
  achievements: AchievementWithProgress[];
  showLocked?: boolean;
  category?: BadgeCategory;
  onAchievementClick?: (achievement: AchievementWithProgress) => void;
}

export function AchievementsGrid({ 
  achievements, 
  showLocked = true,
  category,
  onAchievementClick
}: AchievementsGridProps) {
  // Группировка достижений по категориям
  const groupedAchievements = groupAchievementsByCategory(achievements);
  
  // Фильтрация если указана категория
  const displayAchievements = category 
    ? achievements.filter(a => a.category === category)
    : achievements;

  // Статистика
  const unlockedCount = displayAchievements.filter(a => a.unlocked).length;
  const totalCount = displayAchievements.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  if (category) {
    // Показываем достижения одной категории
    return (
      <div className="space-y-4">
        {/* Заголовок и статистика */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
            <h3 className="text-lg font-semibold">{getCategoryDisplayName(category)}</h3>
          </div>
          <Badge variant="outline">
            {unlockedCount}/{totalCount}
          </Badge>
        </div>

        {/* Прогресс категории */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            {Math.round(progressPercent)}% завершено
          </p>
        </div>

        {/* Сетка достижений */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayAchievements
            .filter(achievement => showLocked || achievement.unlocked)
            .map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                onClick={() => onAchievementClick?.(achievement)}
              />
            ))}
        </div>
      </div>
    );
  }

  // Показываем все достижения по вкладкам
  return (
    <div className="space-y-4">
      {/* Общая статистика */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="text-lg font-semibold">
            {achievements.filter(a => a.unlocked).length} из {achievements.length}
          </span>
        </div>
        <Progress 
          value={achievements.length > 0 ? (achievements.filter(a => a.unlocked).length / achievements.length) * 100 : 0} 
          className="max-w-xs mx-auto" 
        />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="FISH_SPECIES">🐟</TabsTrigger>
          <TabsTrigger value="TECHNIQUE">🎣</TabsTrigger>
          <TabsTrigger value="SOCIAL">👥</TabsTrigger>
          <TabsTrigger value="GEOGRAPHY">🗺️</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {Object.entries(groupedAchievements).map(([categoryKey, categoryAchievements]) => (
            <div key={categoryKey} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_ICONS[categoryKey as BadgeCategory]}</span>
                <h4 className="font-medium">{getCategoryDisplayName(categoryKey as BadgeCategory)}</h4>
                <Badge variant="outline" className="ml-auto">
                  {categoryAchievements.filter(a => a.unlocked).length}/{categoryAchievements.length}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categoryAchievements
                  .filter(achievement => showLocked || achievement.unlocked)
                  .map(achievement => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={achievement}
                      onClick={() => onAchievementClick?.(achievement)}
                      compact
                    />
                  ))}
              </div>
            </div>
          ))}
        </TabsContent>

        {(['FISH_SPECIES', 'TECHNIQUE', 'SOCIAL', 'GEOGRAPHY'] as BadgeCategory[]).map(cat => (
          <TabsContent key={cat} value={cat}>
            <AchievementsGrid
              achievements={achievements}
              category={cat}
              showLocked={showLocked}
              onAchievementClick={onAchievementClick}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface AchievementCardProps {
  achievement: AchievementWithProgress;
  onClick?: () => void;
  compact?: boolean;
}

function AchievementCard({ achievement, onClick, compact = false }: AchievementCardProps) {
  const isLocked = !achievement.unlocked;
  const showDescription = achievement.lockedDescVisible || !isLocked;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              isLocked ? 'opacity-60' : 'hover:scale-[1.02]'
            } ${onClick ? 'hover:shadow-lg' : ''}`}
            onClick={onClick}
          >
            <CardContent className={`p-4 ${compact ? 'p-3' : 'p-4'}`}>
              <div className="flex items-start gap-3">
                {/* Иконка */}
                <div className={`flex-shrink-0 ${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-lg bg-muted flex items-center justify-center relative`}>
                  {isLocked && achievement.lockedVisible ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <span className={compact ? 'text-lg' : 'text-xl'}>{achievement.icon}</span>
                  )}
                  
                  {/* Индикатор редкости */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-background border flex items-center justify-center">
                    <span className="text-xs">{ACHIEVEMENT_ICONS[achievement.rarity]}</span>
                  </div>
                </div>

                {/* Контент */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>
                      {achievement.name}
                    </h5>
                    {achievement.unlocked && (
                      <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>

                  {/* Описание */}
                  {showDescription && (
                    <p className={`text-muted-foreground ${compact ? 'text-xs' : 'text-sm'} line-clamp-2 mb-2`}>
                      {achievement.description}
                    </p>
                  )}

                  {/* Прогресс */}
                  {achievement.maxProgress > 1 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                        <span>{Math.round(achievement.progressPercent)}%</span>
                      </div>
                      <Progress value={achievement.progressPercent} className="h-1.5" />
                    </div>
                  )}

                  {/* Дата разблокировки */}
                  {achievement.unlocked && achievement.userProgress?.unlockedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Получено: {new Date(achievement.userProgress.unlockedAt).toLocaleDateString('ru')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        
        <TooltipContent>
          <div className="max-w-xs space-y-1">
            <div className="flex items-center gap-1">
              <span>{achievement.icon}</span>
              <span className="font-medium">{achievement.name}</span>
              <span>{ACHIEVEMENT_ICONS[achievement.rarity]}</span>
            </div>
            
            {showDescription && (
              <p className="text-sm">{achievement.description}</p>
            )}
            
            {achievement.maxProgress > 1 && (
              <p className="text-xs text-muted-foreground">
                Прогресс: {achievement.progress}/{achievement.maxProgress}
              </p>
            )}
            
            <p className="text-xs text-muted-foreground">
              Категория: {getCategoryDisplayName(achievement.category)}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Группирует достижения по категориям
 */
function groupAchievementsByCategory(achievements: AchievementWithProgress[]) {
  return achievements.reduce((groups, achievement) => {
    const category = achievement.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(achievement);
    return groups;
  }, {} as Record<BadgeCategory, AchievementWithProgress[]>);
}

/**
 * Получает отображаемое название категории
 */
function getCategoryDisplayName(category: BadgeCategory): string {
  const names: Record<BadgeCategory, string> = {
    'FISH_SPECIES': 'Виды рыб',
    'TECHNIQUE': 'Техники',
    'SOCIAL': 'Социальные',
    'GEOGRAPHY': 'География',
    'ACHIEVEMENT': 'Достижения',
    'MILESTONE': 'Этапы',
    'SPECIAL': 'Особые',
    'SEASONAL': 'Сезонные',
  };
  return names[category] || category;
}
