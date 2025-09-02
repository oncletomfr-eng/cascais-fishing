'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { CircularProgress } from './CircularProgress'
import { Badge } from '@/components/ui/badge'
import { Star, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LevelProgressProps {
  /** Текущий уровень */
  level: number
  /** Очки опыта */
  experiencePoints: number
  /** Размер компонента */
  size?: 'sm' | 'md' | 'lg'
  /** Показывать детали */
  showDetails?: boolean
  /** Анимировать прогресс */
  animated?: boolean
  /** CSS классы */
  className?: string
}

// Размеры для разных размеров компонента
const SIZES = {
  sm: {
    progress: 80,
    stroke: 6,
    levelText: 'text-lg font-bold',
    progressText: 'text-xs',
    badge: 'text-xs px-2 py-0.5'
  },
  md: {
    progress: 120,
    stroke: 8,
    levelText: 'text-2xl font-bold',
    progressText: 'text-sm',
    badge: 'text-sm px-3 py-1'
  },
  lg: {
    progress: 160,
    stroke: 10,
    levelText: 'text-3xl font-bold',
    progressText: 'text-base',
    badge: 'text-base px-4 py-1.5'
  }
}

// Цвета для разных уровней
const getLevelColor = (level: number): string => {
  if (level <= 5) return '#10b981'      // green-500 - новичок
  if (level <= 15) return '#3b82f6'     // blue-500 - любитель  
  if (level <= 30) return '#8b5cf6'     // violet-500 - опытный
  if (level <= 50) return '#f59e0b'     // amber-500 - эксперт
  return '#dc2626'                      // red-600 - мастер
}

// Получить название уровня
const getLevelTitle = (level: number): string => {
  if (level <= 5) return 'Новичок'
  if (level <= 15) return 'Любитель'
  if (level <= 30) return 'Опытный'
  if (level <= 50) return 'Эксперт'
  return 'Мастер'
}

// Расчет прогресса до следующего уровня
const calculateLevelProgress = (experiencePoints: number) => {
  const currentLevelXP = experiencePoints % 1000
  const progressPercent = (currentLevelXP / 1000) * 100
  const nextLevelXP = 1000 - currentLevelXP
  
  return {
    currentLevelXP,
    progressPercent,
    nextLevelXP
  }
}

export function LevelProgress({
  level,
  experiencePoints,
  size = 'md',
  showDetails = true,
  animated = true,
  className
}: LevelProgressProps) {
  const sizeConfig = SIZES[size]
  const levelColor = getLevelColor(level)
  const levelTitle = getLevelTitle(level)
  const { progressPercent, nextLevelXP, currentLevelXP } = calculateLevelProgress(experiencePoints)

  return (
    <div className={cn("flex flex-col items-center space-y-3", className)}>
      {/* Основной круговой прогресс */}
      <div className="relative">
        <CircularProgress
          progress={progressPercent}
          size={sizeConfig.progress}
          strokeWidth={sizeConfig.stroke}
          color={levelColor}
          animated={animated}
          duration={2}
        >
          {/* Содержимое в центре */}
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              className={cn(sizeConfig.levelText, "text-gray-900")}
            >
              {level}
            </motion.div>
            <div className={cn(sizeConfig.progressText, "text-gray-500")}>
              уровень
            </div>
          </div>
        </CircularProgress>

        {/* Звездочка для высоких уровней */}
        {level >= 25 && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1, duration: 0.8, type: "spring" }}
            className="absolute -top-2 -right-2"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: levelColor }}
            >
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Детали прогресса */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center space-y-2"
        >
          {/* Badge с титулом уровня */}
          <Badge 
            variant="outline" 
            className={cn(sizeConfig.badge, "border-2 font-medium")}
            style={{ borderColor: levelColor, color: levelColor }}
          >
            {levelTitle}
          </Badge>

          {/* Прогресс в цифрах */}
          <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
            <TrendingUp className="w-3 h-3" />
            <span>
              {currentLevelXP.toLocaleString()} / 1,000 XP
            </span>
          </div>

          {/* До следующего уровня */}
          {nextLevelXP > 0 && (
            <div className="text-xs text-gray-500">
              {nextLevelXP.toLocaleString()} XP до уровня {level + 1}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
