'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, Zap, Target, Trophy, Users, 
  Calendar, Flame, Award, Star, Gift
} from 'lucide-react'

// Импортируем все компоненты прогресса
import {
  CircularProgress,
  LevelProgress,
  ExperienceTracker,
  StreakCounter,
  MilestoneCelebration,
  ProgressComparison,
  ChallengeTracker,
  type Milestone,
  type UserProgress,
  type Challenge
} from '@/components/progress'

import { toast } from 'sonner'

// Моковые данные для тестирования
const MOCK_EXPERIENCE_GAINS = [
  {
    id: '1',
    amount: 250,
    source: 'Поймал тунца',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 минут назад
    type: 'trip' as const
  },
  {
    id: '2', 
    amount: 100,
    source: 'Разблокировка "Мастер троллинга"',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 часа назад
    type: 'achievement' as const
  },
  {
    id: '3',
    amount: 50,
    source: 'Ежедневное задание',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 часов назад
    type: 'milestone' as const
  },
  {
    id: '4',
    amount: 75,
    source: 'Бонус за активность',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // вчера
    type: 'bonus' as const
  }
]

const MOCK_FRIENDS: UserProgress[] = [
  {
    id: '1',
    name: 'Александр Петров',
    avatar: '/avatars/alex.jpg',
    level: 28,
    experiencePoints: 27850,
    streak: 12,
    achievements: 45,
    position: 1,
    change: 'up'
  },
  {
    id: '2',
    name: 'Мария Иванова', 
    avatar: '/avatars/maria.jpg',
    level: 22,
    experiencePoints: 21750,
    streak: 8,
    achievements: 38,
    position: 2,
    change: 'same'
  },
  {
    id: '3',
    name: 'Дмитрий Козлов',
    avatar: '/avatars/dmitry.jpg',
    level: 19,
    experiencePoints: 18200,
    streak: 5,
    achievements: 29,
    position: 3,
    change: 'down'
  },
  {
    id: '4',
    name: 'Анна Смирнова',
    avatar: '/avatars/anna.jpg',
    level: 15,
    experiencePoints: 14500,
    streak: 15,
    achievements: 22,
    position: 4,
    change: 'up'
  }
]

const MOCK_CURRENT_USER: UserProgress = {
  id: 'current',
  name: 'Вы',
  level: 25,
  experiencePoints: 24350,
  streak: 18,
  achievements: 42,
  position: 2,
  change: 'up',
  isCurrentUser: true
}

const MOCK_CHALLENGES: Challenge[] = [
  {
    id: '1',
    title: 'Поймать 3 рыбы',
    description: 'Поймайте любых 3 рыбы используя любую технику',
    type: 'daily',
    category: 'fishing',
    progress: 2,
    maxProgress: 3,
    reward: { type: 'xp', amount: 100, description: '100 очков опыта' },
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 8), // через 8 часов
    isCompleted: false,
    isActive: true,
    difficulty: 'easy'
  },
  {
    id: '2',
    title: 'Пригласить друга',
    description: 'Пригласите друга на совместную рыбалку',
    type: 'weekly',
    category: 'social',
    progress: 0,
    maxProgress: 1,
    reward: { type: 'xp', amount: 300, description: '300 очков опыта' },
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // через 3 дня
    isCompleted: false,
    isActive: true,
    difficulty: 'medium'
  },
  {
    id: '3',
    title: 'Исследовать 2 новые локации',
    description: 'Посетите 2 новые места для рыбалки',
    type: 'weekly',
    category: 'exploration',
    progress: 1,
    maxProgress: 2,
    reward: { type: 'badge', amount: 1, description: 'Бейдж "Исследователь"' },
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5), // через 5 дней
    isCompleted: false,
    isActive: true,
    difficulty: 'hard'
  },
  {
    id: '4',
    title: 'Получить 5 достижений',
    description: 'Разблокируйте любые 5 достижений',
    type: 'weekly',
    category: 'achievement',
    progress: 5,
    maxProgress: 5,
    reward: { type: 'xp', amount: 500, description: '500 очков опыта' },
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // через 2 дня
    isCompleted: false,
    isActive: true,
    difficulty: 'hard'
  }
]

const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: '1',
    type: 'level',
    title: 'Уровень 25!',
    description: 'Поздравляем! Вы достигли 25-го уровня и стали опытным рыболовом!',
    value: 25,
    reward: {
      type: 'xp',
      value: 1000,
      description: '1000 бонусных очков опыта'
    },
    rarity: 'rare'
  },
  {
    id: '2',
    type: 'streak',
    title: 'Серия из 30 дней!',
    description: 'Невероятно! Вы поддерживаете активность уже 30 дней подряд!',
    value: 30,
    reward: {
      type: 'badge',
      value: 'Мастер постоянства',
      description: 'Особый бейдж за выдающееся постоянство'
    },
    rarity: 'epic'
  },
  {
    id: '3',
    type: 'special',
    title: 'Легенда рыбалки!',
    description: 'Вы достигли статуса легенды рыболовного сообщества!',
    value: 100,
    reward: {
      type: 'title',
      value: 'Легенда моря',
      description: 'Эксклюзивный титул легенды'
    },
    rarity: 'legendary'
  }
]

export default function TestProgressTrackingPage() {
  // Состояние для демонстрации
  const [currentLevel, setCurrentLevel] = useState(25)
  const [currentXP, setCurrentXP] = useState(24350)
  const [currentStreak, setCurrentStreak] = useState(18)
  const [showMilestone, setShowMilestone] = useState(false)
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone>(SAMPLE_MILESTONES[0])

  // Функции для демонстрации
  const addExperience = (amount: number) => {
    setCurrentXP(prev => {
      const newXP = prev + amount
      const newLevel = Math.floor(newXP / 1000) + 1
      
      if (newLevel > currentLevel) {
        setCurrentLevel(newLevel)
        toast.success(`🎉 Поздравляем! Достигнут ${newLevel} уровень!`)
      }
      
      return newXP
    })
    toast.success(`+${amount} XP получено!`)
  }

  const incrementStreak = () => {
    setCurrentStreak(prev => prev + 1)
    toast.success('🔥 Серия продолжена!')
  }

  const showMilestoneDemo = (milestone: Milestone) => {
    setSelectedMilestone(milestone)
    setShowMilestone(true)
  }

  const handleChallengeComplete = (challengeId: string) => {
    const challenge = MOCK_CHALLENGES.find(c => c.id === challengeId)
    if (challenge) {
      toast.success(`✅ Задание "${challenge.title}" выполнено! +${challenge.reward.amount} ${challenge.reward.type.toUpperCase()}`)
      addExperience(challenge.reward.amount)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-7xl space-y-8">
        
        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            🎯 Система отслеживания прогресса
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Демонстрация компонентов для отслеживания уровней, опыта, серий и достижений
          </p>
        </motion.div>

        {/* Основные статистики */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{currentLevel}</div>
              <div className="text-sm text-gray-600">Уровень</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{currentXP.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Опыт</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{currentStreak}</div>
              <div className="text-sm text-gray-600">Серия дней</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">42</div>
              <div className="text-sm text-gray-600">Достижения</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Кнопки для демонстрации */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <Button onClick={() => addExperience(100)} className="gap-2">
            <Zap className="w-4 h-4" />
            +100 XP
          </Button>
          <Button onClick={() => addExperience(500)} variant="outline" className="gap-2">
            <Star className="w-4 h-4" />
            +500 XP
          </Button>
          <Button onClick={incrementStreak} variant="outline" className="gap-2">
            <Flame className="w-4 h-4" />
            +1 День серии
          </Button>
          <Button onClick={() => showMilestoneDemo(SAMPLE_MILESTONES[0])} variant="secondary" className="gap-2">
            <Trophy className="w-4 h-4" />
            Показать веху
          </Button>
        </motion.div>

        {/* Основной контент с табами */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full max-w-4xl mx-auto grid-cols-6">
              <TabsTrigger value="overview" className="gap-1">
                <Trophy className="w-4 h-4" />
                Обзор
              </TabsTrigger>
              <TabsTrigger value="level" className="gap-1">
                <TrendingUp className="w-4 h-4" />
                Уровень
              </TabsTrigger>
              <TabsTrigger value="experience" className="gap-1">
                <Zap className="w-4 h-4" />
                Опыт
              </TabsTrigger>
              <TabsTrigger value="streaks" className="gap-1">
                <Flame className="w-4 h-4" />
                Серии
              </TabsTrigger>
              <TabsTrigger value="social" className="gap-1">
                <Users className="w-4 h-4" />
                Друзья
              </TabsTrigger>
              <TabsTrigger value="challenges" className="gap-1">
                <Target className="w-4 h-4" />
                Задания
              </TabsTrigger>
            </TabsList>

            {/* Обзор */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                  <LevelProgress
                    level={currentLevel}
                    experiencePoints={currentXP}
                    size="lg"
                    showDetails={true}
                    animated={true}
                  />
                </div>
                <div className="space-y-6">
                  <StreakCounter
                    streakData={{
                      current: currentStreak,
                      best: 25,
                      lastActivity: new Date(),
                      type: 'daily'
                    }}
                    size="md"
                    showFireEffects={true}
                  />
                </div>
                <div className="space-y-6">
                  <ExperienceTracker
                    experiencePoints={currentXP}
                    recentGains={MOCK_EXPERIENCE_GAINS}
                    showStats={true}
                    animated={true}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Уровень */}
            <TabsContent value="level" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Малый размер</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LevelProgress
                      level={currentLevel}
                      experiencePoints={currentXP}
                      size="sm"
                      showDetails={true}
                      animated={true}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Средний размер</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LevelProgress
                      level={currentLevel}
                      experiencePoints={currentXP}
                      size="md"
                      showDetails={true}
                      animated={true}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Большой размер</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LevelProgress
                      level={currentLevel}
                      experiencePoints={currentXP}
                      size="lg"
                      showDetails={true}
                      animated={true}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Примеры круговых прогрессов */}
              <Card>
                <CardHeader>
                  <CardTitle>Круговые индикаторы</CardTitle>
                  <CardDescription>
                    Базовые компоненты кругового прогресса с различными настройками
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center space-y-2">
                      <CircularProgress progress={75} showPercentage={true} />
                      <p className="text-sm text-gray-600">С процентами</p>
                    </div>
                    <div className="text-center space-y-2">
                      <CircularProgress progress={60} color="#10b981" customText="60/100" />
                      <p className="text-sm text-gray-600">Кастомный текст</p>
                    </div>
                    <div className="text-center space-y-2">
                      <CircularProgress progress={90} size={80} strokeWidth={6} color="#f59e0b" />
                      <p className="text-sm text-gray-600">Малый размер</p>
                    </div>
                    <div className="text-center space-y-2">
                      <CircularProgress progress={45} animated={false} showPercentage={true} />
                      <p className="text-sm text-gray-600">Без анимации</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Опыт */}
            <TabsContent value="experience" className="space-y-6">
              <ExperienceTracker
                experiencePoints={currentXP}
                recentGains={MOCK_EXPERIENCE_GAINS}
                showStats={true}
                animated={true}
              />
            </TabsContent>

            {/* Серии */}
            <TabsContent value="streaks" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StreakCounter
                  streakData={{
                    current: currentStreak,
                    best: 25,
                    lastActivity: new Date(),
                    type: 'daily'
                  }}
                  size="sm"
                  showFireEffects={true}
                />
                
                <StreakCounter
                  streakData={{
                    current: 4,
                    best: 8,
                    lastActivity: new Date(),
                    type: 'weekly'
                  }}
                  size="md"
                  showFireEffects={true}
                />

                <StreakCounter
                  streakData={{
                    current: 0,
                    best: 3,
                    lastActivity: null,
                    type: 'monthly'
                  }}
                  size="md"
                  showFireEffects={true}
                />
              </div>

              {/* Демо празднования вех */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-600" />
                    Празднование вех
                  </CardTitle>
                  <CardDescription>
                    Примеры анимаций для различных достижений
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {SAMPLE_MILESTONES.map((milestone) => (
                      <Button
                        key={milestone.id}
                        variant="outline"
                        onClick={() => showMilestoneDemo(milestone)}
                        className="h-auto p-4 text-left"
                      >
                        <div className="space-y-1">
                          <div className="font-semibold">{milestone.title}</div>
                          <div className="text-sm text-gray-600">{milestone.rarity}</div>
                          <Badge className="text-xs">{milestone.type}</Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Социальное */}
            <TabsContent value="social" className="space-y-6">
              <ProgressComparison
                currentUser={MOCK_CURRENT_USER}
                friends={MOCK_FRIENDS}
                comparisonType="level"
              />
            </TabsContent>

            {/* Задания */}
            <TabsContent value="challenges" className="space-y-6">
              <ChallengeTracker
                challenges={MOCK_CHALLENGES}
                onChallengeComplete={handleChallengeComplete}
                onChallengeSelect={(challenge) => {
                  toast.info(`Выбрано задание: ${challenge.title}`)
                }}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Модальное окно для празднования вех */}
      <MilestoneCelebration
        milestone={selectedMilestone}
        show={showMilestone}
        onClose={() => setShowMilestone(false)}
        autoClose={0} // Отключаем автозакрытие для демо
      />
    </main>
  )
}
