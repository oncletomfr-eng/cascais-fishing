'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Trophy, 
  Medal, 
  Star, 
  Target, 
  TrendingUp, 
  TrendingDown,
  ArrowRight,
  Eye,
  EyeOff,
  Share2,
  MessageCircle,
  Zap,
  Crown,
  Award,
  Fish,
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

import { 
  AchievementWithProgress, 
  CATEGORY_CONFIG, 
  RARITY_CONFIG,
  BadgeCategory,
  AchievementRarity 
} from '@/lib/types/achievements';

import { getIconComponent } from '@/lib/utils/icon-mapper';

// Types for comparison
interface UserAchievementProfile {
  userId: string;
  name: string;
  avatar?: string | null;
  level: number;
  rating: number;
  completedTrips: number;
  achievements: AchievementWithProgress[];
  totalAchievements: number;
  unlockedAchievements: number;
  progressPercent: number;
}

interface ComparisonMetrics {
  totalCompletion: {
    user1: number;
    user2: number;
  };
  categoryCompletion: Record<BadgeCategory, {
    user1: number;
    user2: number;
  }>;
  rarityCompletion: Record<AchievementRarity, {
    user1: number;
    user2: number;
  }>;
}

interface AchievementGap {
  achievement: AchievementWithProgress;
  user1Has: boolean;
  user2Has: boolean;
  progressDifference?: number;
  recommendation?: string;
}

interface AchievementComparisonProps {
  user1: UserAchievementProfile;
  user2: UserAchievementProfile;
  showPrivateAchievements?: boolean;
  enableChallenges?: boolean;
  enableSharing?: boolean;
  onChallengeUser?: (targetUserId: string, achievementId: string) => void;
  onShareComparison?: (comparisonData: any) => void;
  className?: string;
}

// Helper functions
const calculateCategoryProgress = (achievements: AchievementWithProgress[], category: BadgeCategory) => {
  const categoryAchievements = achievements.filter(a => a.category === category);
  if (categoryAchievements.length === 0) return 0;
  
  const unlockedCount = categoryAchievements.filter(a => a.unlocked).length;
  return (unlockedCount / categoryAchievements.length) * 100;
};

const calculateRarityProgress = (achievements: AchievementWithProgress[], rarity: AchievementRarity) => {
  const rarityAchievements = achievements.filter(a => a.rarity === rarity);
  if (rarityAchievements.length === 0) return 0;
  
  const unlockedCount = rarityAchievements.filter(a => a.unlocked).length;
  return (unlockedCount / rarityAchievements.length) * 100;
};

const findAchievementGaps = (user1: UserAchievementProfile, user2: UserAchievementProfile): AchievementGap[] => {
  const allAchievements = new Map<string, AchievementWithProgress>();
  
  // Combine all achievements from both users
  user1.achievements.forEach(a => allAchievements.set(a.id, a));
  user2.achievements.forEach(a => {
    if (!allAchievements.has(a.id)) {
      allAchievements.set(a.id, a);
    }
  });
  
  const gaps: AchievementGap[] = [];
  
  allAchievements.forEach(achievement => {
    const user1Achievement = user1.achievements.find(a => a.id === achievement.id);
    const user2Achievement = user2.achievements.find(a => a.id === achievement.id);
    
    const user1Has = user1Achievement?.unlocked || false;
    const user2Has = user2Achievement?.unlocked || false;
    
    // Only show gaps if one user has it and the other doesn't
    if (user1Has !== user2Has) {
      const progressDiff = (user1Achievement?.progress || 0) - (user2Achievement?.progress || 0);
      
      gaps.push({
        achievement,
        user1Has,
        user2Has,
        progressDifference: progressDiff,
        recommendation: generateRecommendation(achievement, user1Has, user2Has, progressDiff)
      });
    }
  });
  
  return gaps.sort((a, b) => {
    // Sort by rarity (higher rarity first)
    const rarityOrder = { 'MYTHIC': 6, 'LEGENDARY': 5, 'EPIC': 4, 'RARE': 3, 'UNCOMMON': 2, 'COMMON': 1 };
    return (rarityOrder[b.achievement.rarity] || 0) - (rarityOrder[a.achievement.rarity] || 0);
  });
};

const generateRecommendation = (
  achievement: AchievementWithProgress, 
  user1Has: boolean, 
  user2Has: boolean, 
  progressDiff: number
): string => {
  const targetUser = user1Has ? 'Пользователь 2' : 'Пользователь 1';
  const leadingUser = user1Has ? 'Пользователь 1' : 'Пользователь 2';
  
  const recommendations = {
    'FISH_SPECIES': `${targetUser} может изучить новые виды рыб для получения этого достижения`,
    'TECHNIQUE': `${targetUser} должен освоить новые техники рыбалки`,
    'SOCIAL': `${targetUser} может быть более активным в сообществе`,
    'GEOGRAPHY': `${targetUser} стоит исследовать новые локации для рыбалки`,
    'ACHIEVEMENT': `${targetUser} может сосредоточиться на основных целях`,
    'MILESTONE': `${targetUser} должен достичь важных вех в развитии`,
    'SPECIAL': `${targetUser} может попытаться выполнить особые задания`,
    'SEASONAL': `${targetUser} должен участвовать в сезонных событиях`
  };
  
  return recommendations[achievement.category] || `${targetUser} может работать над получением этого достижения`;
};

export function AchievementComparison({
  user1,
  user2,
  showPrivateAchievements = true,
  enableChallenges = true,
  enableSharing = true,
  onChallengeUser,
  onShareComparison,
  className
}: AchievementComparisonProps) {
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'ALL'>('ALL');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState(false);

  // Calculate comparison metrics
  const comparisonMetrics: ComparisonMetrics = useMemo(() => {
    const categories: BadgeCategory[] = ['FISH_SPECIES', 'TECHNIQUE', 'SOCIAL', 'GEOGRAPHY', 'ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL'];
    const rarities: AchievementRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
    
    const categoryCompletion = {} as Record<BadgeCategory, { user1: number; user2: number; }>;
    categories.forEach(category => {
      categoryCompletion[category] = {
        user1: calculateCategoryProgress(user1.achievements, category),
        user2: calculateCategoryProgress(user2.achievements, category)
      };
    });
    
    const rarityCompletion = {} as Record<AchievementRarity, { user1: number; user2: number; }>;
    rarities.forEach(rarity => {
      rarityCompletion[rarity] = {
        user1: calculateRarityProgress(user1.achievements, rarity),
        user2: calculateRarityProgress(user2.achievements, rarity)
      };
    });
    
    return {
      totalCompletion: {
        user1: user1.progressPercent,
        user2: user2.progressPercent
      },
      categoryCompletion,
      rarityCompletion
    };
  }, [user1, user2]);

  // Find achievement gaps
  const achievementGaps = useMemo(() => findAchievementGaps(user1, user2), [user1, user2]);

  // Filter achievements based on selected category
  const filteredAchievements = useMemo(() => {
    const getAllAchievements = () => {
      const achievementMap = new Map<string, AchievementWithProgress>();
      
      user1.achievements.forEach(a => achievementMap.set(a.id, { ...a, userType: 'user1' }));
      user2.achievements.forEach(a => {
        const existing = achievementMap.get(a.id);
        achievementMap.set(a.id, { 
          ...a, 
          userType: existing ? 'both' : 'user2',
          comparisonData: existing ? {
            user1: existing,
            user2: a
          } : undefined
        });
      });
      
      return Array.from(achievementMap.values());
    };
    
    let achievements = getAllAchievements();
    
    if (selectedCategory !== 'ALL') {
      achievements = achievements.filter(a => a.category === selectedCategory);
    }
    
    if (showOnlyDifferences) {
      achievements = achievements.filter(a => {
        const user1Achievement = user1.achievements.find(u1a => u1a.id === a.id);
        const user2Achievement = user2.achievements.find(u2a => u2a.id === a.id);
        return (user1Achievement?.unlocked || false) !== (user2Achievement?.unlocked || false);
      });
    }
    
    return achievements;
  }, [user1.achievements, user2.achievements, selectedCategory, showOnlyDifferences]);

  const handleShareComparison = () => {
    const comparisonData = {
      user1: { name: user1.name, progressPercent: user1.progressPercent },
      user2: { name: user2.name, progressPercent: user2.progressPercent },
      metrics: comparisonMetrics,
      timestamp: new Date().toISOString()
    };
    
    if (onShareComparison) {
      onShareComparison(comparisonData);
    } else {
      // Fallback to copying comparison URL
      const comparisonUrl = `${window.location.origin}/achievements/compare?user1=${user1.userId}&user2=${user2.userId}`;
      navigator.clipboard.writeText(comparisonUrl);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка на сравнение скопирована в буфер обмена"
      });
    }
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header with user profiles */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl p-6 border border-gray-200"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-6 h-6 text-purple-600" />
            Сравнение достижений
          </h2>
          
          <div className="flex items-center gap-2">
            {enableSharing && (
              <Button variant="outline" size="sm" onClick={handleShareComparison}>
                <Share2 className="w-4 h-4 mr-2" />
                Поделиться
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* User 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-center"
          >
            <Avatar className="w-20 h-20 mx-auto mb-3">
              <AvatarImage src={user1.avatar || ''} />
              <AvatarFallback className="text-lg">{user1.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg text-gray-900">{user1.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline">Ур. {user1.level}</Badge>
              <Badge variant="outline">{user1.unlockedAchievements}/{user1.totalAchievements}</Badge>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-blue-600">{user1.progressPercent}%</div>
              <div className="text-sm text-gray-500">Завершено</div>
            </div>
          </motion.div>

          {/* VS Indicator */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center"
          >
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg mb-2">
              VS
            </div>
            <div className="text-sm text-gray-500">Сравнение</div>
            <div className="mt-2 text-xs text-gray-400">
              {Math.abs(user1.progressPercent - user2.progressPercent).toFixed(1)}% разница
            </div>
          </motion.div>

          {/* User 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <Avatar className="w-20 h-20 mx-auto mb-3">
              <AvatarImage src={user2.avatar || ''} />
              <AvatarFallback className="text-lg">{user2.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg text-gray-900">{user2.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant="outline">Ур. {user2.level}</Badge>
              <Badge variant="outline">{user2.unlockedAchievements}/{user2.totalAchievements}</Badge>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-purple-600">{user2.progressPercent}%</div>
              <div className="text-sm text-gray-500">Завершено</div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Категория:</label>
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Все категории</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4' })}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant={showOnlyDifferences ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyDifferences(!showOnlyDifferences)}
              className="flex items-center gap-2"
            >
              {showOnlyDifferences ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showOnlyDifferences ? 'Показать все' : 'Только различия'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="achievements">Достижения</TabsTrigger>
          <TabsTrigger value="gaps">Пробелы</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Overall Progress Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Общий прогресс
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{user1.name}</span>
                    <span className="text-2xl font-bold text-blue-600">{user1.progressPercent}%</span>
                  </div>
                  <Progress value={user1.progressPercent} className="h-3" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{user2.name}</span>
                    <span className="text-2xl font-bold text-purple-600">{user2.progressPercent}%</span>
                  </div>
                  <Progress value={user2.progressPercent} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Progress Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Прогресс по категориям
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(comparisonMetrics.categoryCompletion).map(([category, progress]) => {
                  const config = CATEGORY_CONFIG[category as BadgeCategory];
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4 text-gray-600' })}
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-blue-600 font-medium">{progress.user1.toFixed(1)}%</span>
                          <span className="text-purple-600 font-medium">{progress.user2.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Progress value={progress.user1} className="h-2" />
                        <Progress value={progress.user2} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Rarity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Распределение по редкости
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(comparisonMetrics.rarityCompletion).map(([rarity, progress]) => {
                  const config = RARITY_CONFIG[rarity as AchievementRarity];
                  return (
                    <div key={rarity} className={`p-3 rounded-lg border ${config.bgColor}`}>
                      <div className="flex items-center justify-center mb-2">
                        {React.createElement(getIconComponent(config.icon), { className: `w-6 h-6 ${config.textColor}` })}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-medium text-gray-600 mb-1">{config.label}</div>
                        <div className="text-sm font-bold text-blue-600">{progress.user1.toFixed(0)}%</div>
                        <div className="text-sm font-bold text-purple-600">{progress.user2.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab - Detailed side-by-side comparison */}
        <TabsContent value="achievements" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {filteredAchievements.map((achievement) => {
              const user1Achievement = user1.achievements.find(a => a.id === achievement.id);
              const user2Achievement = user2.achievements.find(a => a.id === achievement.id);
              
              const user1HasIt = user1Achievement?.unlocked || false;
              const user2HasIt = user2Achievement?.unlocked || false;
              
              const user1Progress = user1Achievement?.progress || 0;
              const user2Progress = user2Achievement?.progress || 0;
              
              const config = CATEGORY_CONFIG[achievement.category];
              const rarityConfig = RARITY_CONFIG[achievement.rarity];
              
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Achievement Header */}
                  <div className={`px-4 py-3 ${config.lightColor} border-b ${config.borderColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center text-white`}>
                          {React.createElement(getIconComponent(config.icon), { className: 'w-5 h-5' })}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{achievement.name}</h4>
                          <p className="text-sm text-gray-600">{achievement.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={rarityConfig.textColor}>
                          {React.createElement(getIconComponent(rarityConfig.icon), { className: 'w-3 h-3 mr-1' })}
                          {rarityConfig.label}
                        </Badge>
                        {enableChallenges && user1HasIt !== user2HasIt && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (onChallengeUser) {
                                const targetUserId = user1HasIt ? user2.userId : user1.userId;
                                onChallengeUser(targetUserId, achievement.id);
                              }
                            }}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Вызов
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-2">
                    {/* User 1 */}
                    <div className={`p-4 ${user1HasIt ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user1.avatar || ''} />
                          <AvatarFallback className="text-xs">{user1.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user1.name}</p>
                          <div className="flex items-center gap-2">
                            {user1HasIt ? (
                              <Badge variant="default" className="bg-green-600">
                                <Trophy className="w-3 h-3 mr-1" />
                                Получено
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                В процессе
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Прогресс:</span>
                          <span className="font-medium">{user1Progress}/{achievement.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(user1Progress / achievement.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                    
                    {/* User 2 */}
                    <div className={`p-4 border-l border-gray-200 ${user2HasIt ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user2.avatar || ''} />
                          <AvatarFallback className="text-xs">{user2.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user2.name}</p>
                          <div className="flex items-center gap-2">
                            {user2HasIt ? (
                              <Badge variant="default" className="bg-green-600">
                                <Trophy className="w-3 h-3 mr-1" />
                                Получено
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                В процессе
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Прогресс:</span>
                          <span className="font-medium">{user2Progress}/{achievement.maxProgress}</span>
                        </div>
                        <Progress 
                          value={(user2Progress / achievement.maxProgress) * 100} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress comparison indicator */}
                  {user1Progress !== user2Progress && (
                    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        {user1Progress > user2Progress ? (
                          <>
                            <span className="font-medium text-blue-600">{user1.name}</span>
                            <span>впереди на {user1Progress - user2Progress}</span>
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          </>
                        ) : (
                          <>
                            <span className="font-medium text-purple-600">{user2.name}</span>
                            <span>впереди на {user2Progress - user1Progress}</span>
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            
            {filteredAchievements.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Нет достижений для отображения</h3>
                  <p className="text-gray-500">
                    {showOnlyDifferences 
                      ? 'У пользователей нет различий в выбранной категории'
                      : 'В выбранной категории нет достижений'
                    }
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Gaps Tab - Achievement gap analysis */}
        <TabsContent value="gaps" className="space-y-6">
          {/* Gap Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Анализ пробелов в достижениях
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {achievementGaps.filter(g => g.user1Has && !g.user2Has).length}
                  </div>
                  <div className="text-sm text-blue-700">
                    Достижения у {user1.name}, которых нет у {user2.name}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {achievementGaps.filter(g => !g.user1Has && g.user2Has).length}
                  </div>
                  <div className="text-sm text-purple-700">
                    Достижения у {user2.name}, которых нет у {user1.name}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Gap Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gaps where User1 has achievement but User2 doesn't */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  {user1.name} лидирует
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievementGaps
                  .filter(gap => gap.user1Has && !gap.user2Has)
                  .slice(0, 5)
                  .map(gap => {
                    const config = CATEGORY_CONFIG[gap.achievement.category];
                    const rarityConfig = RARITY_CONFIG[gap.achievement.rarity];
                    return (
                      <motion.div
                        key={gap.achievement.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                      >
                        <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                          {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {gap.achievement.name}
                            </h4>
                            <Badge variant="outline" className={`${rarityConfig.textColor} text-xs`}>
                              {rarityConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{gap.achievement.description}</p>
                          <p className="text-xs text-blue-700 font-medium">{gap.recommendation}</p>
                        </div>
                        {enableChallenges && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onChallengeUser && onChallengeUser(user2.userId, gap.achievement.id)}
                            className="flex-shrink-0"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                  
                {achievementGaps.filter(gap => gap.user1Has && !gap.user2Has).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Medal className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">У {user1.name} нет уникальных достижений</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gaps where User2 has achievement but User1 doesn't */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                  {user2.name} лидирует
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {achievementGaps
                  .filter(gap => !gap.user1Has && gap.user2Has)
                  .slice(0, 5)
                  .map(gap => {
                    const config = CATEGORY_CONFIG[gap.achievement.category];
                    const rarityConfig = RARITY_CONFIG[gap.achievement.rarity];
                    return (
                      <motion.div
                        key={gap.achievement.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200"
                      >
                        <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                          {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4' })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-gray-900 truncate">
                              {gap.achievement.name}
                            </h4>
                            <Badge variant="outline" className={`${rarityConfig.textColor} text-xs`}>
                              {rarityConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{gap.achievement.description}</p>
                          <p className="text-xs text-purple-700 font-medium">{gap.recommendation}</p>
                        </div>
                        {enableChallenges && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onChallengeUser && onChallengeUser(user1.userId, gap.achievement.id)}
                            className="flex-shrink-0"
                          >
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                  
                {achievementGaps.filter(gap => !gap.user1Has && gap.user2Has).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Medal className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm">У {user2.name} нет уникальных достижений</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Most Valuable Gaps */}
          {achievementGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Самые ценные пробелы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementGaps
                    .filter(gap => gap.achievement.rarity === 'LEGENDARY' || gap.achievement.rarity === 'MYTHIC')
                    .slice(0, 6)
                    .map(gap => {
                      const config = CATEGORY_CONFIG[gap.achievement.category];
                      const rarityConfig = RARITY_CONFIG[gap.achievement.rarity];
                      const leaderUser = gap.user1Has ? user1 : user2;
                      const followerUser = gap.user1Has ? user2 : user1;
                      
                      return (
                        <motion.div
                          key={gap.achievement.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-4 ${rarityConfig.bgColor} border-2 ${rarityConfig.borderColor} rounded-lg`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 ${config.color} rounded flex items-center justify-center text-white`}>
                              {React.createElement(getIconComponent(config.icon), { className: 'w-3 h-3' })}
                            </div>
                            <h4 className="font-medium text-sm truncate">{gap.achievement.name}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={leaderUser.avatar || ''} />
                              <AvatarFallback className="text-xs">{leaderUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <Avatar className="w-6 h-6 opacity-50">
                              <AvatarImage src={followerUser.avatar || ''} />
                              <AvatarFallback className="text-xs">{followerUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </div>
                          
                          <Badge variant="outline" className={`${rarityConfig.textColor} text-xs`}>
                            {React.createElement(getIconComponent(rarityConfig.icon), { className: 'w-3 h-3 mr-1' })}
                            {rarityConfig.label}
                          </Badge>
                        </motion.div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Recommendations Tab - Achievement recommendation engine */}
        <TabsContent value="recommendations" className="space-y-6">
          {/* Personalized Recommendations for Each User */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User 1 Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user1.avatar || ''} />
                    <AvatarFallback>{user1.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  Рекомендации для {user1.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Easy wins - achievements that are close to completion */}
                <div>
                  <h4 className="font-medium text-sm text-green-700 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Быстрые победы
                  </h4>
                  <div className="space-y-2">
                    {user1.achievements
                      .filter(a => !a.unlocked && a.progress > a.maxProgress * 0.7)
                      .slice(0, 3)
                      .map(achievement => {
                        const config = CATEGORY_CONFIG[achievement.category];
                        const remaining = achievement.maxProgress - achievement.progress;
                        return (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className={`w-6 h-6 ${config.color} rounded flex items-center justify-center text-white`}>
                              {React.createElement(getIconComponent(config.icon), { className: 'w-3 h-3' })}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{achievement.name}</p>
                              <p className="text-xs text-green-700">
                                Осталось всего {remaining} {remaining === 1 ? 'шаг' : 'шагов'}!
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                {((achievement.progress / achievement.maxProgress) * 100).toFixed(0)}%
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>

                {/* Achievements to catch up with User2 */}
                <div>
                  <h4 className="font-medium text-sm text-purple-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Догнать {user2.name}
                  </h4>
                  <div className="space-y-2">
                    {achievementGaps
                      .filter(gap => !gap.user1Has && gap.user2Has)
                      .slice(0, 3)
                      .map(gap => {
                        const config = CATEGORY_CONFIG[gap.achievement.category];
                        const rarityConfig = RARITY_CONFIG[gap.achievement.rarity];
                        return (
                          <motion.div
                            key={gap.achievement.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200"
                          >
                            <div className={`w-6 h-6 ${config.color} rounded flex items-center justify-center text-white`}>
                              {React.createElement(getIconComponent(config.icon), { className: 'w-3 h-3' })}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{gap.achievement.name}</p>
                                <Badge variant="outline" className={`${rarityConfig.textColor} text-xs`}>
                                  {rarityConfig.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-purple-700">{gap.recommendation}</p>
                            </div>
                            {enableChallenges && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onChallengeUser && onChallengeUser(user2.userId, gap.achievement.id)}
                              >
                                <Zap className="w-3 h-3" />
                              </Button>
                            )}
                          </motion.div>
                        );
                      })}
                  </div>
                </div>

                {/* Category focus recommendations */}
                <div>
                  <h4 className="font-medium text-sm text-blue-700 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Развить категорию
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(comparisonMetrics.categoryCompletion)
                      .filter(([_, progress]) => progress.user1 < progress.user2 && progress.user1 < 80)
                      .slice(0, 4)
                      .map(([category, progress]) => {
                        const config = CATEGORY_CONFIG[category as BadgeCategory];
                        const gap = progress.user2 - progress.user1;
                        return (
                          <div
                            key={category}
                            className={`p-3 ${config.lightColor} rounded-lg border ${config.borderColor}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4 text-gray-600' })}
                              <span className="text-xs font-medium">{config.label}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              Отстает на {gap.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User 2 Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user2.avatar || ''} />
                    <AvatarFallback>{user2.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  Рекомендации для {user2.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Easy wins for User2 */}
                <div>
                  <h4 className="font-medium text-sm text-green-700 mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Быстрые победы
                  </h4>
                  <div className="space-y-2">
                    {user2.achievements
                      .filter(a => !a.unlocked && a.progress > a.maxProgress * 0.7)
                      .slice(0, 3)
                      .map(achievement => {
                        const config = CATEGORY_CONFIG[achievement.category];
                        const remaining = achievement.maxProgress - achievement.progress;
                        return (
                          <motion.div
                            key={achievement.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                          >
                            <div className={`w-6 h-6 ${config.color} rounded flex items-center justify-center text-white`}>
                              {React.createElement(getIconComponent(config.icon), { className: 'w-3 h-3' })}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{achievement.name}</p>
                              <p className="text-xs text-green-700">
                                Осталось всего {remaining} {remaining === 1 ? 'шаг' : 'шагов'}!
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-green-600">
                                {((achievement.progress / achievement.maxProgress) * 100).toFixed(0)}%
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                </div>

                {/* Achievements to catch up with User1 */}
                <div>
                  <h4 className="font-medium text-sm text-blue-700 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Догнать {user1.name}
                  </h4>
                  <div className="space-y-2">
                    {achievementGaps
                      .filter(gap => gap.user1Has && !gap.user2Has)
                      .slice(0, 3)
                      .map(gap => {
                        const config = CATEGORY_CONFIG[gap.achievement.category];
                        const rarityConfig = RARITY_CONFIG[gap.achievement.rarity];
                        return (
                          <motion.div
                            key={gap.achievement.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <div className={`w-6 h-6 ${config.color} rounded flex items-center justify-center text-white`}>
                              {React.createElement(getIconComponent(config.icon), { className: 'w-3 h-3' })}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{gap.achievement.name}</p>
                                <Badge variant="outline" className={`${rarityConfig.textColor} text-xs`}>
                                  {rarityConfig.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-blue-700">{gap.recommendation}</p>
                            </div>
                            {enableChallenges && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onChallengeUser && onChallengeUser(user1.userId, gap.achievement.id)}
                              >
                                <Zap className="w-3 h-3" />
                              </Button>
                            )}
                          </motion.div>
                        );
                      })}
                  </div>
                </div>

                {/* Category focus for User2 */}
                <div>
                  <h4 className="font-medium text-sm text-purple-700 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Развить категорию
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(comparisonMetrics.categoryCompletion)
                      .filter(([_, progress]) => progress.user2 < progress.user1 && progress.user2 < 80)
                      .slice(0, 4)
                      .map(([category, progress]) => {
                        const config = CATEGORY_CONFIG[category as BadgeCategory];
                        const gap = progress.user1 - progress.user2;
                        return (
                          <div
                            key={category}
                            className={`p-3 ${config.lightColor} rounded-lg border ${config.borderColor}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4 text-gray-600' })}
                              <span className="text-xs font-medium">{config.label}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                              Отстает на {gap.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Joint Challenge Suggestions */}
          {enableChallenges && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-orange-500" />
                  Совместные челленджи
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user1.achievements
                    .filter(a => !a.unlocked && a.progress < a.maxProgress * 0.5)
                    .slice(0, 6)
                    .map(achievement => {
                      const user2Achievement = user2.achievements.find(a2 => a2.id === achievement.id);
                      const bothNeedIt = user2Achievement && !user2Achievement.unlocked;
                      
                      if (!bothNeedIt) return null;
                      
                      const config = CATEGORY_CONFIG[achievement.category];
                      const rarityConfig = RARITY_CONFIG[achievement.rarity];
                      
                      return (
                        <motion.div
                          key={achievement.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-4 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            toast({
                              title: "Челлендж отправлен!",
                              description: `Приглашение на совместное достижение "${achievement.name}" отправлено`
                            });
                          }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-8 h-8 ${config.color} rounded-lg flex items-center justify-center text-white`}>
                              {React.createElement(getIconComponent(config.icon), { className: 'w-4 h-4' })}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{achievement.name}</h4>
                              <Badge variant="outline" className={`${rarityConfig.textColor} text-xs mt-1`}>
                                {rarityConfig.label}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>{user1.name}:</span>
                              <span className="font-medium">{achievement.progress}/{achievement.maxProgress}</span>
                            </div>
                            <Progress value={(achievement.progress / achievement.maxProgress) * 100} className="h-1" />
                            
                            <div className="flex items-center justify-between text-xs">
                              <span>{user2.name}:</span>
                              <span className="font-medium">{user2Achievement?.progress || 0}/{achievement.maxProgress}</span>
                            </div>
                            <Progress value={((user2Achievement?.progress || 0) / achievement.maxProgress) * 100} className="h-1" />
                          </div>
                          
                          <div className="mt-3 text-center">
                            <Button size="sm" variant="outline" className="w-full">
                              <Zap className="w-3 h-3 mr-2" />
                              Бросить вызов
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                    .filter(Boolean)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
