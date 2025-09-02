'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, CheckCircle2, Clock, Gift, Star, Target, 
  Zap, Fish, Users, MapPin, Award, Trophy, Flame
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Challenge {
  id: string
  title: string
  description: string
  type: 'daily' | 'weekly'
  category: 'fishing' | 'social' | 'exploration' | 'achievement'
  progress: number
  maxProgress: number
  reward: {
    type: 'xp' | 'badge' | 'streak'
    amount: number
    description: string
  }
  deadline: Date
  isCompleted: boolean
  isActive: boolean
  difficulty: 'easy' | 'medium' | 'hard'
}

interface ChallengeTrackerProps {
  /** Список заданий */
  challenges: Challenge[]
  /** Callback при выборе задания */
  onChallengeSelect?: (challenge: Challenge) => void
  /** Callback при завершении задания */
  onChallengeComplete?: (challengeId: string) => void
  /** CSS классы */
  className?: string
}

// Конфигурация категорий
const CATEGORIES = {
  fishing: {
    icon: Fish,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Рыбалка'
  },
  social: {
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'Социальное'
  },
  exploration: {
    icon: MapPin,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'Исследование'
  },
  achievement: {
    icon: Award,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Достижение'
  }
}

// Конфигурация сложности
const DIFFICULTY_CONFIG = {
  easy: {
    color: 'text-green-600 bg-green-100',
    label: 'Легко',
    stars: 1
  },
  medium: {
    color: 'text-yellow-600 bg-yellow-100',
    label: 'Средне',
    stars: 2
  },
  hard: {
    color: 'text-red-600 bg-red-100',
    label: 'Сложно',
    stars: 3
  }
}

// Компонент для отображения звезд сложности
function DifficultyStars({ difficulty }: { difficulty: Challenge['difficulty'] }) {
  const config = DIFFICULTY_CONFIG[difficulty]
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 3 }, (_, i) => (
        <Star 
          key={i} 
          className={cn(
            "w-3 h-3",
            i < config.stars 
              ? "text-yellow-400 fill-yellow-400" 
              : "text-gray-300"
          )} 
        />
      ))}
    </div>
  )
}

// Компонент одного задания
function ChallengeCard({ 
  challenge, 
  onSelect, 
  onComplete 
}: { 
  challenge: Challenge
  onSelect?: (challenge: Challenge) => void
  onComplete?: (challengeId: string) => void
}) {
  const category = CATEGORIES[challenge.category]
  const difficulty = DIFFICULTY_CONFIG[challenge.difficulty]
  const Icon = category.icon
  
  const progressPercent = challenge.maxProgress > 0 
    ? (challenge.progress / challenge.maxProgress) * 100 
    : 0

  // Оставшееся время
  const timeLeft = challenge.deadline.getTime() - new Date().getTime()
  const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)))
  const daysLeft = Math.floor(hoursLeft / 24)

  const getTimeLeftText = () => {
    if (daysLeft > 0) return `${daysLeft} дн.`
    if (hoursLeft > 0) return `${hoursLeft} ч.`
    return 'Истекает'
  }

  const handleComplete = () => {
    if (challenge.isCompleted || !challenge.isActive) return
    onComplete?.(challenge.id)
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative overflow-hidden rounded-lg border-2 transition-all cursor-pointer",
        challenge.isCompleted 
          ? "bg-gray-50 border-gray-200 opacity-75" 
          : challenge.isActive 
            ? "bg-white border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
            : "bg-gray-50 border-gray-200 opacity-60"
      )}
      onClick={() => onSelect?.(challenge)}
    >
      {/* Индикатор завершения */}
      {challenge.isCompleted && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 z-10"
        >
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        </motion.div>
      )}

      <div className="p-4 space-y-3">
        {/* Заголовок и категория */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-full", category.bgColor)}>
              <Icon className={cn("w-4 h-4", category.color)} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">
                {challenge.title}
              </h4>
              <Badge variant="outline" className="text-xs mt-1">
                {category.label}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <DifficultyStars difficulty={challenge.difficulty} />
            <Badge 
              variant="outline" 
              className={cn("text-xs", timeLeft < 24 * 60 * 60 * 1000 ? "border-red-300 text-red-600" : "")}
            >
              <Clock className="w-3 h-3 mr-1" />
              {getTimeLeftText()}
            </Badge>
          </div>
        </div>

        {/* Описание */}
        <p className="text-sm text-gray-600 line-clamp-2">
          {challenge.description}
        </p>

        {/* Прогресс */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Прогресс</span>
            <span className="font-medium">
              {challenge.progress} / {challenge.maxProgress}
            </span>
          </div>
          <Progress 
            value={progressPercent} 
            className="h-2"
          />
        </div>

        {/* Награда */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Gift className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">
              +{challenge.reward.amount} {challenge.reward.type.toUpperCase()}
            </span>
          </div>
          
          {challenge.isCompleted ? (
            <Badge className="bg-green-100 text-green-800">
              Завершено
            </Badge>
          ) : challenge.progress >= challenge.maxProgress ? (
            <Button 
              size="sm" 
              onClick={handleComplete}
              className="gap-1"
            >
              <Trophy className="w-3 h-3" />
              Забрать
            </Button>
          ) : (
            <Badge 
              variant="outline"
              className={cn(
                challenge.isActive 
                  ? "border-blue-300 text-blue-600" 
                  : "border-gray-300 text-gray-500"
              )}
            >
              {challenge.isActive ? 'Активно' : 'Заблокировано'}
            </Badge>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Компонент статистики заданий
function ChallengeStats({ challenges }: { challenges: Challenge[] }) {
  const daily = challenges.filter(c => c.type === 'daily')
  const weekly = challenges.filter(c => c.type === 'weekly')
  
  const dailyCompleted = daily.filter(c => c.isCompleted).length
  const weeklyCompleted = weekly.filter(c => c.isCompleted).length
  
  const totalRewardToday = daily
    .filter(c => c.isCompleted)
    .reduce((sum, c) => sum + c.reward.amount, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-blue-600">
            {dailyCompleted}/{daily.length}
          </div>
          <div className="text-xs text-gray-600">
            Ежедневные
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-purple-600">
            {weeklyCompleted}/{weekly.length}
          </div>
          <div className="text-xs text-gray-600">
            Еженедельные
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-green-600">
            {totalRewardToday}
          </div>
          <div className="text-xs text-gray-600">
            XP сегодня
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">
            {challenges.filter(c => c.progress >= c.maxProgress && !c.isCompleted).length}
          </div>
          <div className="text-xs text-gray-600">
            Готово к сдаче
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ChallengeTracker({
  challenges,
  onChallengeSelect,
  onChallengeComplete,
  className
}: ChallengeTrackerProps) {
  const [selectedTab, setSelectedTab] = useState<'all' | 'daily' | 'weekly'>('all')
  
  // Фильтрация заданий
  const getFilteredChallenges = () => {
    switch (selectedTab) {
      case 'daily':
        return challenges.filter(c => c.type === 'daily')
      case 'weekly':
        return challenges.filter(c => c.type === 'weekly')
      default:
        return challenges
    }
  }

  const filteredChallenges = getFilteredChallenges()
  
  // Сортировка: активные, затем завершенные
  const sortedChallenges = [...filteredChallenges].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1
    }
    if (a.isActive !== b.isActive) {
      return a.isActive ? -1 : 1
    }
    return 0
  })

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Ежедневные задания
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Статистика */}
        <ChallengeStats challenges={challenges} />

        {/* Табы */}
        <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" className="gap-1">
              <Calendar className="w-4 h-4" />
              Все
            </TabsTrigger>
            <TabsTrigger value="daily" className="gap-1">
              <Zap className="w-4 h-4" />
              Ежедневные
            </TabsTrigger>
            <TabsTrigger value="weekly" className="gap-1">
              <Flame className="w-4 h-4" />
              Еженедельные
            </TabsTrigger>
          </TabsList>

          {/* Список заданий */}
          <TabsContent value={selectedTab} className="space-y-4">
            <div className="grid gap-3">
              <AnimatePresence>
                {sortedChallenges.map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onSelect={onChallengeSelect}
                    onComplete={onChallengeComplete}
                  />
                ))}
              </AnimatePresence>
            </div>

            {sortedChallenges.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  {selectedTab === 'all' 
                    ? 'Нет доступных заданий' 
                    : `Нет ${selectedTab === 'daily' ? 'ежедневных' : 'еженедельных'} заданий`}
                </p>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
