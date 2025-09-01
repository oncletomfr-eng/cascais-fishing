/**
 * Achievement System Demo Page - Testing Achievement Grid Components
 * Part of Task 9.1: Achievement Category Grid System
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy, Users, TrendingUp, Target, 
  Sparkles, Crown, Award, Medal, Zap, Star
} from 'lucide-react'
import AchievementGrid from '@/components/achievements/AchievementGrid'
import ProgressDemo from '@/components/achievements/ProgressDemo'
import CelebrationDemo from '@/components/achievements/CelebrationDemo'
import { useAchievements, getAchievementIcon } from '@/lib/hooks/useAchievements'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Mock data for testing when API is not available
const MOCK_ACHIEVEMENTS = [
  // Fish Species
  {
    id: '1',
    type: 'TUNA_MASTER',
    name: 'Мастер тунца',
    description: 'Поймайте 10 тунцов в разных локациях',
    icon: '🐟',
    category: 'FISH_SPECIES' as const,
    rarity: 'RARE' as const,
    maxProgress: 10,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: true,
    progress: 10,
    progressPercent: 100,
    unlockedAt: new Date('2024-08-15')
  },
  {
    id: '2', 
    type: 'DORADO_HUNTER',
    name: 'Охотник на дорадо',
    description: 'Поймайте 5 дорадо используя разные техники',
    icon: '🐠',
    category: 'FISH_SPECIES' as const,
    rarity: 'UNCOMMON' as const,
    maxProgress: 5,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 3,
    progressPercent: 60
  },
  {
    id: '3',
    type: 'SPECIES_COLLECTOR', 
    name: 'Коллекционер видов',
    description: 'Поймайте 15 разных видов рыб',
    icon: '🐠',
    category: 'FISH_SPECIES' as const,
    rarity: 'EPIC' as const,
    maxProgress: 15,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
    isActive: true,
    unlocked: false,
    progress: 7,
    progressPercent: 47
  },
  
  // Techniques
  {
    id: '4',
    type: 'TROLLING_EXPERT',
    name: 'Троллинг-эксперт',
    description: 'Примите участие в 15 поездках с техникой троллинга',
    icon: '🎣',
    category: 'TECHNIQUE' as const,
    rarity: 'COMMON' as const,
    maxProgress: 15,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: true,
    progress: 15,
    progressPercent: 100,
    unlockedAt: new Date('2024-08-20')
  },
  {
    id: '5',
    type: 'TECHNIQUE_VERSATILE',
    name: 'Универсал техник',
    description: 'Освойте 4 разные техники рыбалки',
    icon: '🛠️',
    category: 'TECHNIQUE' as const,
    rarity: 'RARE' as const,
    maxProgress: 4,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 2,
    progressPercent: 50
  },
  
  // Social
  {
    id: '6',
    type: 'NEWBIE_MENTOR',
    name: 'Наставник новичков',
    description: 'Помогите 5 новичкам на их первых рыбалках',
    icon: '👨‍🏫',
    category: 'SOCIAL' as const,
    rarity: 'UNCOMMON' as const,
    maxProgress: 5,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 1,
    progressPercent: 20
  },
  {
    id: '7',
    type: 'COMMUNITY_BUILDER',
    name: 'Строитель сообщества',
    description: 'Создайте и модерируйте активную группу рыболовов',
    icon: '🏘️',
    category: 'SOCIAL' as const,
    rarity: 'LEGENDARY' as const,
    maxProgress: 1,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
    isActive: true,
    unlocked: false,
    progress: 0,
    progressPercent: 0
  },
  
  // Geography
  {
    id: '8',
    type: 'REEF_EXPLORER',
    name: 'Исследователь рифов',
    description: 'Исследуйте 8 различных рифовых локаций',
    icon: '🏝️',
    category: 'GEOGRAPHY' as const,
    rarity: 'RARE' as const,
    maxProgress: 8,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 3,
    progressPercent: 37
  },
  {
    id: '9',
    type: 'WORLD_TRAVELER',
    name: 'Путешественник',
    description: 'Рыбачьте в 5 разных странах',
    icon: '🌍',
    category: 'GEOGRAPHY' as const,
    rarity: 'EPIC' as const,
    maxProgress: 5,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 1,
    progressPercent: 20
  },
  
  // Achievement
  {
    id: '10',
    type: 'RELIABLE_FISHER',
    name: 'Надежный рыболов',
    description: 'Поддерживайте 100% посещаемость в течение месяца',
    icon: '💯',
    category: 'ACHIEVEMENT' as const,
    rarity: 'COMMON' as const,
    maxProgress: 30,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 15,
    progressPercent: 50
  },
  
  // Milestone
  {
    id: '11',
    type: 'FIRST_CATCH',
    name: 'Первый улов',
    description: 'Поймайте свою первую рыбу!',
    icon: '🎣',
    category: 'MILESTONE' as const,
    rarity: 'COMMON' as const,
    maxProgress: 1,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: true,
    progress: 1,
    progressPercent: 100,
    unlockedAt: new Date('2024-07-10')
  },
  
  // Special
  {
    id: '12',
    type: 'GOLDEN_HOOK',
    name: 'Золотой крючок',
    description: 'Особое достижение за выдающиеся заслуги перед сообществом',
    icon: '🪝',
    category: 'SPECIAL' as const,
    rarity: 'MYTHIC' as const,
    maxProgress: 1,
    progressStep: 1,
    lockedVisible: false,
    lockedDescVisible: false,
    isActive: true,
    unlocked: false,
    progress: 0,
    progressPercent: 0
  },
  
  // Seasonal
  {
    id: '13',
    type: 'SUMMER_FISHERMAN',
    name: 'Летний рыболов',
    description: 'Участвуйте в 10 летних рыбалках в июле-августе',
    icon: '☀️',
    category: 'SEASONAL' as const,
    rarity: 'UNCOMMON' as const,
    maxProgress: 10,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
    isActive: true,
    unlocked: false,
    progress: 6,
    progressPercent: 60
  }
]

export default function TestAchievementSystemPage() {
  const { data: session } = useSession()
  const [selectedAchievement, setSelectedAchievement] = useState<any>(null)
  const [useMockData, setUseMockData] = useState(true)

  // Real API data (when available)
  const {
    achievements: apiAchievements,
    stats: apiStats,
    loading: apiLoading,
    error: apiError,
    updateProgress,
    incrementProgress
  } = useAchievements(session?.user?.id || 'demo-user')

  // Use mock data or API data
  const achievements = useMockData ? MOCK_ACHIEVEMENTS : apiAchievements
  const loading = useMockData ? false : apiLoading
  const error = useMockData ? null : apiError

  // Calculate mock stats
  const mockStats = {
    total: MOCK_ACHIEVEMENTS.length,
    unlocked: MOCK_ACHIEVEMENTS.filter(a => a.unlocked).length,
    progress: Math.round((MOCK_ACHIEVEMENTS.filter(a => a.unlocked).length / MOCK_ACHIEVEMENTS.length) * 100)
  }

  const stats = useMockData ? mockStats : apiStats

  // Handle achievement click
  const handleAchievementClick = (achievement: any) => {
    setSelectedAchievement(achievement)
    toast.info(`Выбрано достижение: ${achievement.name}`, {
      description: achievement.description
    })
  }

  // Test progress updates
  const handleTestProgress = async () => {
    if (useMockData) {
      toast.success('🎯 Тестовое обновление прогресса (мок данные)')
      return
    }

    const success = await incrementProgress('DORADO_HUNTER', 1)
    if (success) {
      toast.success('✅ Прогресс успешно обновлен!')
    }
  }

  // Toggle data source
  const toggleDataSource = () => {
    setUseMockData(!useMockData)
    toast.info(useMockData ? 'Переключено на API данные' : 'Переключено на мок данные')
  }

  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏆 Система достижений
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Демонстрация компонентов Achievement Grid System
          </p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Всего достижений</div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.unlocked}</div>
                <div className="text-sm text-gray-600">Получено</div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 backdrop-blur">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.progress}%</div>
                <div className="text-sm text-gray-600">Прогресс</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <Button 
            onClick={toggleDataSource}
            variant={useMockData ? "default" : "outline"}
            className="gap-2"
          >
            <Target className="w-4 h-4" />
            {useMockData ? 'Мок данные' : 'API данные'}
          </Button>
          
          <Button onClick={handleTestProgress} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Тест прогресса
          </Button>

          {selectedAchievement && (
            <Badge variant="secondary" className="px-3 py-1">
              Выбрано: {selectedAchievement.name}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-800">
                <Trophy className="w-5 h-5" />
                <span className="font-medium">Ошибка загрузки API данных:</span>
              </div>
              <p className="text-red-700 mt-1">{error}</p>
              <Button 
                onClick={toggleDataSource} 
                variant="outline" 
                size="sm" 
                className="mt-3"
              >
                Переключиться на мок данные
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="grid" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-5">
          <TabsTrigger value="grid" className="gap-2">
            <Trophy className="w-4 h-4" />
            Сетка
          </TabsTrigger>
          <TabsTrigger value="compact" className="gap-2">
            <Award className="w-4 h-4" />
            Компакт
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <Zap className="w-4 h-4" />
            Прогресс
          </TabsTrigger>
          <TabsTrigger value="celebration" className="gap-2">
            <Star className="w-4 h-4" />
            Празднование
          </TabsTrigger>
          <TabsTrigger value="info" className="gap-2">
            <Sparkles className="w-4 h-4" />
            Информация
          </TabsTrigger>
        </TabsList>

        {/* Full Achievement Grid */}
        <TabsContent value="grid" className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AchievementGrid
              userId={session?.user?.id || 'demo-user'}
              achievements={achievements}
              loading={loading}
              onAchievementClick={handleAchievementClick}
              showSearch={true}
              showFilter={true}
              compact={false}
            />
          </motion.div>
        </TabsContent>

        {/* Compact Achievement Grid */}
        <TabsContent value="compact" className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <AchievementGrid
              userId={session?.user?.id || 'demo-user'}
              achievements={achievements}
              loading={loading}
              onAchievementClick={handleAchievementClick}
              showSearch={true}
              showFilter={true}
              compact={true}
            />
          </motion.div>
        </TabsContent>

        {/* Progress Tab - Animated Progress Demonstrations */}
        <TabsContent value="progress" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProgressDemo />
          </motion.div>
        </TabsContent>

        {/* Celebration Tab - Achievement Celebration Effects Demo */}
        <TabsContent value="celebration" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <CelebrationDemo />
          </motion.div>
        </TabsContent>

        {/* Information Tab */}
        <TabsContent value="info" className="space-y-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Implementation Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    Статус реализации
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Achievement Grid</span>
                    <Badge className="bg-green-100 text-green-800">✅ Готово</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Категоризация</span>
                    <Badge className="bg-green-100 text-green-800">✅ Готово</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Поиск и фильтры</span>
                    <Badge className="bg-green-100 text-green-800">✅ Готово</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>API интеграция</span>
                    <Badge className="bg-green-100 text-green-800">✅ Готово</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Прогресс индикаторы</span>
                    <Badge className="bg-green-100 text-green-800">✅ Готово</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Анимации прогресса</span>
                    <Badge className="bg-yellow-100 text-yellow-800">🔄 В процессе</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Celebration эффекты</span>
                    <Badge className="bg-gray-100 text-gray-800">⏳ Планируется</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Highlights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Ключевые функции
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="font-medium">8 категорий достижений</div>
                    <div className="text-sm text-gray-600">
                      Виды рыб, техники, социальные, география и др.
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">6 уровней редкости</div>
                    <div className="text-sm text-gray-600">
                      От обычных до мифических достижений
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Система прогресса</div>
                    <div className="text-sm text-gray-600">
                      Визуальные индикаторы и процентные показатели
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Поиск и фильтрация</div>
                    <div className="text-sm text-gray-600">
                      По названию, категории и уровню редкости
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">Адаптивный дизайн</div>
                    <div className="text-sm text-gray-600">
                      Компактный и полный режимы отображения
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Details */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-blue-500" />
                    Технические детали
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Компоненты</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• AchievementGrid.tsx</li>
                        <li>• AchievementCard</li>
                        <li>• CategorySection</li>
                        <li>• useAchievements hook</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">API интеграция</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• GET /api/achievements</li>
                        <li>• POST /api/achievements/progress</li>
                        <li>• PUT /api/achievements/progress</li>
                        <li>• Real-time updates</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Анимации</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Framer Motion</li>
                        <li>• Progress bars</li>
                        <li>• Hover effects</li>
                        <li>• Staggered loading</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
