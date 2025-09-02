'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, Trophy, TrendingUp, Star, Crown, Zap, 
  Medal, Target, Flame, ArrowUp, ArrowDown, Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserProgress {
  id: string
  name: string
  avatar?: string
  level: number
  experiencePoints: number
  streak: number
  achievements: number
  position: number
  change: 'up' | 'down' | 'same'
  isCurrentUser?: boolean
}

interface ProgressComparisonProps {
  /** Данные текущего пользователя */
  currentUser: UserProgress
  /** Данные друзей для сравнения */
  friends: UserProgress[]
  /** Тип сравнения */
  comparisonType?: 'level' | 'experience' | 'streak' | 'achievements'
  /** CSS классы */
  className?: string
}

// Конфигурация типов сравнения
const COMPARISON_TYPES = {
  level: {
    icon: Trophy,
    label: 'Уровень',
    color: 'text-yellow-600',
    getValue: (user: UserProgress) => user.level,
    format: (value: number) => value.toString()
  },
  experience: {
    icon: Zap,
    label: 'Опыт',
    color: 'text-blue-600',
    getValue: (user: UserProgress) => user.experiencePoints,
    format: (value: number) => value.toLocaleString()
  },
  streak: {
    icon: Flame,
    label: 'Серия',
    color: 'text-red-600',
    getValue: (user: UserProgress) => user.streak,
    format: (value: number) => `${value} дней`
  },
  achievements: {
    icon: Medal,
    label: 'Достижения',
    color: 'text-purple-600',
    getValue: (user: UserProgress) => user.achievements,
    format: (value: number) => value.toString()
  }
}

// Компонент для отображения пользователя в рейтинге
function UserRankItem({ 
  user, 
  comparisonType, 
  maxValue 
}: { 
  user: UserProgress
  comparisonType: keyof typeof COMPARISON_TYPES
  maxValue: number 
}) {
  const config = COMPARISON_TYPES[comparisonType]
  const value = config.getValue(user)
  const progressPercent = maxValue > 0 ? (value / maxValue) * 100 : 0
  
  const getPositionIcon = () => {
    if (user.position === 1) return <Crown className="w-5 h-5 text-yellow-500" />
    if (user.position === 2) return <Trophy className="w-5 h-5 text-gray-400" />
    if (user.position === 3) return <Medal className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">{user.position}</span>
  }

  const getChangeIcon = () => {
    switch (user.change) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />
      case 'same':
        return <Minus className="w-4 h-4 text-gray-400" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: user.position * 0.1 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
        user.isCurrentUser 
          ? "bg-blue-50 border-blue-200 shadow-md" 
          : "bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Позиция */}
      <div className="flex items-center justify-center w-8">
        {getPositionIcon()}
      </div>

      {/* Аватар */}
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.avatar} />
        <AvatarFallback>
          {user.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Информация о пользователе */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "font-medium truncate",
            user.isCurrentUser ? "text-blue-900" : "text-gray-900"
          )}>
            {user.name}
            {user.isCurrentUser && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Вы
              </Badge>
            )}
          </span>
          {getChangeIcon()}
        </div>
        
        {/* Прогресс бар */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <motion.div
            className={cn(
              "h-1.5 rounded-full",
              user.isCurrentUser ? "bg-blue-500" : "bg-gray-400"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 1, delay: user.position * 0.1 }}
          />
        </div>
      </div>

      {/* Значение */}
      <div className="text-right">
        <div className={cn("font-bold", config.color)}>
          {config.format(value)}
        </div>
        {comparisonType === 'experience' && (
          <div className="text-xs text-gray-500">
            ур. {user.level}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// Компонент статистики сравнения
function ComparisonStats({ 
  currentUser, 
  friends, 
  comparisonType 
}: {
  currentUser: UserProgress
  friends: UserProgress[]
  comparisonType: keyof typeof COMPARISON_TYPES
}) {
  const config = COMPARISON_TYPES[comparisonType]
  const allUsers = [currentUser, ...friends]
  const currentValue = config.getValue(currentUser)
  
  // Статистика
  const betterThan = friends.filter(f => config.getValue(f) < currentValue).length
  const totalFriends = friends.length
  const percentile = totalFriends > 0 ? Math.round((betterThan / totalFriends) * 100) : 0
  
  const topUser = allUsers.reduce((prev, curr) => 
    config.getValue(curr) > config.getValue(prev) ? curr : prev
  )
  
  const avgValue = allUsers.reduce((sum, user) => sum + config.getValue(user), 0) / allUsers.length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-blue-600">
            {currentUser.position}
          </div>
          <div className="text-xs text-gray-600">
            Позиция
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-green-600">
            {percentile}%
          </div>
          <div className="text-xs text-gray-600">
            Лучше друзей
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-purple-600">
            {config.format(Math.round(avgValue))}
          </div>
          <div className="text-xs text-gray-600">
            Средний
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-3 text-center">
          <div className="text-lg font-bold text-yellow-600">
            {config.format(config.getValue(topUser))}
          </div>
          <div className="text-xs text-gray-600">
            Лидер
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProgressComparison({
  currentUser,
  friends,
  comparisonType = 'level',
  className
}: ProgressComparisonProps) {
  const [selectedType, setSelectedType] = useState(comparisonType)
  
  // Объединяем и сортируем пользователей
  const allUsers = [currentUser, ...friends].sort((a, b) => {
    const config = COMPARISON_TYPES[selectedType]
    return config.getValue(b) - config.getValue(a)
  })

  // Находим максимальное значение для прогресс баров
  const maxValue = Math.max(...allUsers.map(user => 
    COMPARISON_TYPES[selectedType].getValue(user)
  ))

  const config = COMPARISON_TYPES[selectedType]
  const Icon = config.icon

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Сравнение с друзьями
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Табы для выбора типа сравнения */}
        <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(COMPARISON_TYPES).map(([key, config]) => {
              const Icon = config.icon
              return (
                <TabsTrigger key={key} value={key} className="gap-1">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{config.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {Object.keys(COMPARISON_TYPES).map((type) => (
            <TabsContent key={type} value={type} className="space-y-4">
              {/* Статистика */}
              <ComparisonStats 
                currentUser={currentUser}
                friends={friends}
                comparisonType={type as keyof typeof COMPARISON_TYPES}
              />

              {/* Рейтинг */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", config.color)} />
                  Рейтинг по {config.label.toLowerCase()}
                </h4>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {allUsers.map((user) => (
                      <UserRankItem
                        key={user.id}
                        user={{ 
                          ...user, 
                          position: allUsers.findIndex(u => u.id === user.id) + 1 
                        }}
                        comparisonType={type as keyof typeof COMPARISON_TYPES}
                        maxValue={maxValue}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Мотивационное сообщение */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
        >
          <Star className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
          <p className="text-sm text-gray-700">
            {currentUser.position === 1 
              ? "🏆 Вы лидер среди друзей!" 
              : currentUser.position <= 3 
                ? "🌟 Отличный результат! Продолжайте в том же духе!" 
                : "💪 Есть к чему стремиться! Вперёд к новым достижениям!"}
          </p>
        </motion.div>
      </CardContent>
    </Card>
  )
}
