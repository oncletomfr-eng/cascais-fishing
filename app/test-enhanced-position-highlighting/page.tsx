'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedPositionHighlighting } from '@/components/leaderboard/EnhancedPositionHighlighting';
import { PositionHistoryGraph } from '@/components/leaderboard/PositionHistoryGraph';
import { useEnhancedLeaderboard } from '@/hooks/useEnhancedLeaderboard';
import { Sparkles, Trophy, TrendingUp, Eye, BarChart3 } from 'lucide-react';

// Mock data for testing
const mockPlayers = [
  {
    position: 1,
    userId: 'user-1',
    name: 'Алексей Морской',
    avatar: null,
    rating: 4.9,
    level: 15,
    completedTrips: 45,
    totalFishCaught: 127,
    achievementsCount: 23,
    lastPositionChange: {
      from: 2,
      to: 1,
      change: 1,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 hours ago
    }
  },
  {
    position: 2,
    userId: 'current-user',
    name: 'Вы (Тестовый пользователь)',
    avatar: null,
    rating: 4.7,
    level: 12,
    completedTrips: 38,
    totalFishCaught: 95,
    achievementsCount: 18,
    lastPositionChange: {
      from: 4,
      to: 2,
      change: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 minutes ago
    }
  },
  {
    position: 3,
    userId: 'user-3',
    name: 'Мария Рыбачка',
    avatar: null,
    rating: 4.6,
    level: 14,
    completedTrips: 42,
    totalFishCaught: 89,
    achievementsCount: 20,
    lastPositionChange: {
      from: 2,
      to: 3,
      change: -1,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1) // 1 hour ago
    }
  },
  {
    position: 4,
    userId: 'user-4',
    name: 'Петр Удачный',
    avatar: null,
    rating: 4.5,
    level: 11,
    completedTrips: 35,
    totalFishCaught: 82,
    achievementsCount: 16,
    lastPositionChange: {
      from: 3,
      to: 4,
      change: -1,
      timestamp: new Date(Date.now() - 1000 * 60 * 45) // 45 minutes ago
    }
  },
  {
    position: 5,
    userId: 'user-5',
    name: 'Ирина Щукина',
    avatar: null,
    rating: 4.4,
    level: 13,
    completedTrips: 31,
    totalFishCaught: 76,
    achievementsCount: 14,
  },
  {
    position: 6,
    userId: 'user-6',
    name: 'Владимир Карпов',
    avatar: null,
    rating: 4.3,
    level: 10,
    completedTrips: 28,
    totalFishCaught: 68,
    achievementsCount: 12,
  },
  {
    position: 7,
    userId: 'user-7',
    name: 'Анна Судачка',
    avatar: null,
    rating: 4.2,
    level: 9,
    completedTrips: 25,
    totalFishCaught: 61,
    achievementsCount: 11,
  }
];

// Mock position history data
const mockPositionHistory = [
  { position: 8, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), orderBy: 'rating' },
  { position: 6, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), orderBy: 'rating' },
  { position: 5, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), orderBy: 'rating' },
  { position: 7, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), orderBy: 'rating' },
  { position: 4, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), orderBy: 'rating' },
  { position: 3, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), orderBy: 'rating' },
  { position: 4, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), orderBy: 'rating' },
  { position: 2, timestamp: new Date(Date.now() - 1000 * 60 * 30), orderBy: 'rating' },
];

export default function EnhancedPositionHighlightingTestPage() {
  const [orderBy, setOrderBy] = useState<'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount'>('rating');
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);

  const handleViewProfile = (userId: string) => {
    console.log('Viewing profile for:', userId);
  };

  const orderByLabels = {
    rating: 'По рейтингу',
    level: 'По уровню',
    completedTrips: 'По поездкам',
    totalFishCaught: 'По улову',
    achievementsCount: 'По достижениям'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Enhanced Position Highlighting</h1>
                <p className="text-sm text-gray-500">Тестирование улучшенной подсветки позиций</p>
              </div>
            </div>
            <Badge variant="secondary">Task 12.3</Badge>
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
                <Trophy className="w-5 h-5" />
                Реализованные функции
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Анимированные индикаторы</p>
                    <p className="text-sm text-green-600">Плавные переходы и анимации</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-blue-800">"Рядом со мной"</p>
                    <p className="text-sm text-blue-600">Просмотр соседних позиций</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-purple-800">Отслеживание изменений</p>
                    <p className="text-sm text-purple-600">Стрелки вверх/вниз</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-800">График истории</p>
                    <p className="text-sm text-yellow-600">Визуализация изменений позиций</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-indigo-800">Мотивационные сообщения</p>
                    <p className="text-sm text-indigo-600">На основе изменений ранга</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-rose-50 rounded-lg border border-rose-200">
                  <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-rose-800">Персонализированные советы</p>
                    <p className="text-sm text-rose-600">Рекомендации по улучшению</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Настройки тестирования</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Сортировка:</label>
                  <Select value={orderBy} onValueChange={(value) => setOrderBy(value as any)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(orderByLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={showNearbyOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowNearbyOnly(!showNearbyOnly)}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showNearbyOnly ? 'Показать всех' : 'Рядом со мной'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="leaderboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="leaderboard">Enhanced Leaderboard</TabsTrigger>
              <TabsTrigger value="history">Position History</TabsTrigger>
            </TabsList>

            <TabsContent value="leaderboard" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <EnhancedPositionHighlighting
                    players={mockPlayers}
                    currentUserId="current-user"
                    orderBy={orderBy}
                    showNearbyOnly={showNearbyOnly}
                    nearbyRange={3}
                    onViewProfile={handleViewProfile}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <PositionHistoryGraph
                  userId="current-user"
                  userName="Тестовый пользователь"
                  history={mockPositionHistory}
                  currentPosition={2}
                  orderBy={orderBy}
                  timeRange="7d"
                  showMetrics={true}
                />

                <PositionHistoryGraph
                  userId="current-user"
                  userName="Тестовый пользователь"
                  history={mockPositionHistory}
                  currentPosition={2}
                  orderBy={orderBy}
                  timeRange="30d"
                  showMetrics={false}
                />
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Technical Details */}
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
                  <h4 className="font-medium mb-2">Новые компоненты:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <code>EnhancedPositionHighlighting</code> - основной компонент</li>
                    <li>• <code>PositionHistoryGraph</code> - график истории</li>
                    <li>• <code>useEnhancedLeaderboard</code> - хук для управления данными</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Ключевые функции:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Анимации с Framer Motion</li>
                    <li>• Local Storage для истории позиций</li>
                    <li>• Responsive дизайн</li>
                    <li>• Персонализированные сообщения</li>
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Все компоненты готовы к интеграции с существующей системой leaderboard.
                  Поддерживается автоматическое отслеживание изменений позиций и сохранение истории.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
