'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Flame, Zap, Calendar, Trophy, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakData {
  current: number
  best: number
  lastActivity: Date | null
  type: 'daily' | 'weekly' | 'monthly'
}

interface StreakCounterProps {
  /** Данные о серии */
  streakData: StreakData
  /** Размер компонента */
  size?: 'sm' | 'md' | 'lg'
  /** Показывать огненные эффекты */
  showFireEffects?: boolean
  /** CSS классы */
  className?: string
}

// Конфигурация размеров
const SIZES = {
  sm: {
    container: 'p-3',
    flame: 'w-6 h-6',
    counter: 'text-2xl',
    label: 'text-xs',
    badge: 'text-xs px-2 py-0.5'
  },
  md: {
    container: 'p-4',
    flame: 'w-8 h-8',
    counter: 'text-3xl',
    label: 'text-sm',
    badge: 'text-sm px-3 py-1'
  },
  lg: {
    container: 'p-6',
    flame: 'w-10 h-10',
    counter: 'text-4xl',
    label: 'text-base',
    badge: 'text-base px-4 py-1.5'
  }
}

// Получить цвет и интенсивность огня в зависимости от серии
const getFireIntensity = (streak: number) => {
  if (streak === 0) return { color: 'text-gray-400', intensity: 0, title: 'Нет серии' }
  if (streak < 7) return { color: 'text-orange-500', intensity: 1, title: 'Хорошо!' }
  if (streak < 30) return { color: 'text-red-500', intensity: 2, title: 'Горячо!' }
  if (streak < 100) return { color: 'text-red-600', intensity: 3, title: 'В огне!' }
  return { color: 'text-red-700', intensity: 4, title: 'Легенда!' }
}

// Получить тип серии на русском
const getStreakTypeLabel = (type: StreakData['type']) => {
  switch (type) {
    case 'daily': return 'Ежедневная серия'
    case 'weekly': return 'Еженедельная серия'  
    case 'monthly': return 'Ежемесячная серия'
  }
}

// Компонент огненного эффекта
function FireEffect({ intensity, size }: { intensity: number, size: string }) {
  if (intensity === 0) return null

  const flames = Array.from({ length: intensity }, (_, i) => (
    <motion.div
      key={i}
      className={cn("absolute", size)}
      initial={{ scale: 0, rotate: 0 }}
      animate={{ 
        scale: [0.8, 1.2, 0.8],
        rotate: [0, 10, -10, 0],
        opacity: [0.7, 1, 0.7]
      }}
      transition={{
        duration: 0.8 + Math.random() * 0.4,
        repeat: Infinity,
        delay: i * 0.2
      }}
      style={{
        left: `${-10 + i * 8}px`,
        top: `${-5 + Math.random() * 10}px`
      }}
    >
      <Flame className={cn(size, getFireIntensity(intensity * 10).color)} />
    </motion.div>
  ))

  return <div className="absolute inset-0">{flames}</div>
}

// Компонент для отображения прогресса до следующего рубежа
function StreakProgress({ current, target }: { current: number, target: number }) {
  const progress = Math.min((current / target) * 100, 100)
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <motion.div
        className="bg-gradient-to-r from-orange-500 to-red-600 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
    </div>
  )
}

export function StreakCounter({
  streakData,
  size = 'md',
  showFireEffects = true,
  className
}: StreakCounterProps) {
  const sizeConfig = SIZES[size]
  const fireData = getFireIntensity(streakData.current)
  const typeLabel = getStreakTypeLabel(streakData.type)
  
  // Определяем следующий рубеж
  const nextMilestone = streakData.current < 7 ? 7 : 
                      streakData.current < 30 ? 30 : 
                      streakData.current < 100 ? 100 : 365

  // Проверяем, активна ли серия (не более суток назад для daily)
  const isActive = streakData.lastActivity 
    ? (new Date().getTime() - streakData.lastActivity.getTime()) < 24 * 60 * 60 * 1000 
    : false

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className={sizeConfig.container}>
        <div className="text-center space-y-3">
          {/* Иконка с огненным эффектом */}
          <div className="relative inline-flex items-center justify-center">
            <div className="relative">
              <motion.div
                animate={{ 
                  scale: fireData.intensity > 0 ? [1, 1.05, 1] : 1,
                }}
                transition={{ 
                  duration: 2, 
                  repeat: fireData.intensity > 0 ? Infinity : 0 
                }}
              >
                <Flame className={cn(sizeConfig.flame, fireData.color)} />
              </motion.div>
              
              {/* Огненные эффекты */}
              {showFireEffects && fireData.intensity > 0 && (
                <FireEffect intensity={fireData.intensity} size={sizeConfig.flame} />
              )}
            </div>

            {/* Бейдж с рекордом */}
            {streakData.best > streakData.current && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -top-2 -right-2"
              >
                <Badge variant="secondary" className={sizeConfig.badge}>
                  <Trophy className="w-3 h-3 mr-1" />
                  {streakData.best}
                </Badge>
              </motion.div>
            )}
          </div>

          {/* Счетчик */}
          <div>
            <motion.div
              key={streakData.current}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className={cn(sizeConfig.counter, "font-bold text-gray-900")}
            >
              {streakData.current}
            </motion.div>
            <div className={cn(sizeConfig.label, "text-gray-600")}>
              {typeLabel}
            </div>
          </div>

          {/* Статус */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Badge 
              variant={isActive ? "default" : "secondary"}
              className={cn(
                sizeConfig.badge,
                isActive ? fireData.color.replace('text-', 'bg-').replace('-500', '-100 text-red-700') : ""
              )}
            >
              {fireData.title}
            </Badge>
          </motion.div>

          {/* Прогресс до следующего рубежа */}
          {streakData.current > 0 && streakData.current < nextMilestone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>До {nextMilestone} дней</span>
                <span>{nextMilestone - streakData.current} осталось</span>
              </div>
              <StreakProgress current={streakData.current} target={nextMilestone} />
            </motion.div>
          )}

          {/* Дополнительная информация */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            {streakData.lastActivity && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {streakData.lastActivity.toLocaleDateString('ru')}
                </span>
              </div>
            )}
            {streakData.best > 0 && (
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span>Рекорд: {streakData.best}</span>
              </div>
            )}
          </div>

          {/* Мотивационное сообщение */}
          {streakData.current === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xs text-gray-500 italic"
            >
              Начните серию сегодня! 🎯
            </motion.p>
          )}
        </div>
      </CardContent>

      {/* Фоновый эффект для высоких серий */}
      {fireData.intensity >= 3 && showFireEffects && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 pointer-events-none"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </Card>
  )
}
