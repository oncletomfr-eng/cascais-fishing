'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AchievementComparison } from '@/components/achievements/AchievementComparison';
import { AchievementChallenges } from '@/components/achievements/AchievementChallenges';
import { Users, Trophy, Zap, Target, Share2, MessageCircle, Sparkles } from 'lucide-react';
import { AchievementWithProgress } from '@/lib/types/achievements';

// Mock data for testing
const mockUser1 = {
  userId: 'user-1',
  name: 'Алексей Морской',
  avatar: null,
  level: 15,
  rating: 4.8,
  completedTrips: 45,
  achievements: [
    {
      id: 'tuna-master',
      name: 'Мастер Тунца',
      description: 'Поймай 10 тунцов и стань настоящим мастером этого благородного вида',
      category: 'FISH_SPECIES' as any,
      rarity: 'EPIC' as any,
      maxProgress: 10,
      progress: 10,
      unlocked: true,
      progressPercent: 100
    },
    {
      id: 'dorado-hunter',
      name: 'Охотник на Дорадо',
      description: 'Поймай 5 дорадо и докажи свое мастерство в ловле этой быстрой рыбы',
      category: 'FISH_SPECIES' as any,
      rarity: 'RARE' as any,
      maxProgress: 5,
      progress: 5,
      unlocked: true,
      progressPercent: 100
    },
    {
      id: 'trolling-expert',
      name: 'Троллинг-Эксперт',
      description: 'Используй троллинг в 10 поездках и стань мастером этой техники',
      category: 'TECHNIQUE' as any,
      rarity: 'EPIC' as any,
      maxProgress: 10,
      progress: 8,
      unlocked: false,
      progressPercent: 80
    },
    {
      id: 'social-mentor',
      name: 'Наставник Новичков',
      description: 'Помоги 5 новичкам в их первых поездках',
      category: 'SOCIAL' as any,
      rarity: 'LEGENDARY' as any,
      maxProgress: 5,
      progress: 3,
      unlocked: false,
      progressPercent: 60
    },
    {
      id: 'reef-explorer',
      name: 'Исследователь Рифов',
      description: 'Исследуй рифовые зоны в 8 поездках',
      category: 'GEOGRAPHY' as any,
      rarity: 'RARE' as any,
      maxProgress: 8,
      progress: 8,
      unlocked: true,
      progressPercent: 100
    }
  ] as AchievementWithProgress[],
  totalAchievements: 20,
  unlockedAchievements: 12,
  progressPercent: 60
};

const mockUser2 = {
  userId: 'user-2', 
  name: 'Марина Глубоководная',
  avatar: null,
  level: 12,
  rating: 4.5,
  completedTrips: 32,
  achievements: [
    {
      id: 'tuna-master',
      name: 'Мастер Тунца',
      description: 'Поймай 10 тунцов и стань настоящим мастером этого благородного вида',
      category: 'FISH_SPECIES' as any,
      rarity: 'EPIC' as any,
      maxProgress: 10,
      progress: 6,
      unlocked: false,
      progressPercent: 60
    },
    {
      id: 'dorado-hunter',
      name: 'Охотник на Дорадо',
      description: 'Поймай 5 дорадо и докажи свое мастерство в ловле этой быстрой рыбы',
      category: 'FISH_SPECIES' as any,
      rarity: 'RARE' as any,
      maxProgress: 5,
      progress: 5,
      unlocked: true,
      progressPercent: 100
    },
    {
      id: 'jigging-master',
      name: 'Джиг-Мастер',
      description: 'Освой технику джиггинга в 8 поездках',
      category: 'TECHNIQUE' as any,
      rarity: 'RARE' as any,
      maxProgress: 8,
      progress: 8,
      unlocked: true,
      progressPercent: 100
    },
    {
      id: 'group-organizer',
      name: 'Организатор Групп',
      description: 'Создай 10 групповых рыболовных событий',
      category: 'SOCIAL' as any,
      rarity: 'RARE' as any,
      maxProgress: 10,
      progress: 10,
      unlocked: true,
      progressPercent: 100
    },
    {
      id: 'deep-sea-adventurer',
      name: 'Глубоководный Авантюрист',
      description: 'Соверши 12 глубоководных поездок',
      category: 'GEOGRAPHY' as any,
      rarity: 'EPIC' as any,
      maxProgress: 12,
      progress: 9,
      unlocked: false,
      progressPercent: 75
    }
  ] as AchievementWithProgress[],
  totalAchievements: 20,
  unlockedAchievements: 10,
  progressPercent: 50
};

export default function AchievementComparisonTestPage() {
  const [selectedUser1, setSelectedUser1] = useState('user-1');
  const [selectedUser2, setSelectedUser2] = useState('user-2');
  const [currentUserId] = useState('user-1');

  const handleChallengeUser = (targetUserId: string, achievementId: string) => {
    console.log('Challenge sent:', { targetUserId, achievementId });
  };

  const handleShareComparison = (comparisonData: any) => {
    console.log('Comparison shared:', comparisonData);
  };

  const availableUsers = [
    { id: 'user-1', name: 'Алексей Морской' },
    { id: 'user-2', name: 'Марина Глубоководная' },
    { id: 'user-3', name: 'Петр Удачный' },
    { id: 'user-4', name: 'Ирина Щукина' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Achievement Comparison Tools</h1>
                <p className="text-sm text-gray-500">Тестирование инструментов сравнения достижений</p>
              </div>
            </div>
            <Badge variant="secondary">Task 12.4</Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Feature Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Реализованные инструменты сравнения
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">Side-by-Side сравнение</p>
                    <p className="text-sm text-blue-600">Детальное сравнение достижений</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-800">Анализ пробелов</p>
                    <p className="text-sm text-yellow-600">Показывает что нужно достичь</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Движок рекомендаций</p>
                    <p className="text-sm text-green-600">Персонализированные советы</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-800">Челленджи</p>
                    <p className="text-sm text-purple-600">Вызовы между пользователями</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-pink-800">Социальные функции</p>
                    <p className="text-sm text-pink-600">Обмен и совместная работа</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-indigo-800">Совместные цели</p>
                    <p className="text-sm text-indigo-600">Достижения вместе</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* User Selection Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Выбор пользователей для сравнения</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Пользователь 1:</label>
                  <Select value={selectedUser1} onValueChange={setSelectedUser1}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Пользователь 2:</label>
                  <Select value={selectedUser2} onValueChange={setSelectedUser2}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comparison" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Сравнение достижений
              </TabsTrigger>
              <TabsTrigger value="challenges" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Челленджи
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comparison" className="mt-6">
              <AchievementComparison
                user1={mockUser1}
                user2={mockUser2}
                enableChallenges={true}
                enableSharing={true}
                onChallengeUser={handleChallengeUser}
                onShareComparison={handleShareComparison}
              />
            </TabsContent>

            <TabsContent value="challenges" className="mt-6">
              <AchievementChallenges currentUserId={currentUserId} />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Technical Implementation Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Технические детали реализации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Созданные компоненты:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code>AchievementComparison</code> - основной компонент сравнения</li>
                    <li>• <code>AchievementChallenges</code> - система челленджей</li>
                    <li>• <code>useAchievementComparison</code> - хук управления данными</li>
                    <li>• Gap Analysis - анализ пробелов в достижениях</li>
                    <li>• Recommendation Engine - движок рекомендаций</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Ключевые функции:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Side-by-side сравнение с прогресс-барами</li>
                    <li>• Интерактивные табы с детализацией</li>
                    <li>• Персонализированные рекомендации</li>
                    <li>• Социальные функции и шаринг</li>
                    <li>• Local Storage для челленджей</li>
                    <li>• Mobile-responsive дизайн</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Интеграция с существующей системой:</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Использует существующие API endpoints <code>/api/achievements</code> и <code>/api/profiles</code></p>
                  <p>• Совместим с типами из <code>lib/types/achievements.ts</code></p>
                  <p>• Интегрируется с системой конфигурации категорий и редкости</p>
                  <p>• Поддерживает все существующие категории достижений</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
