'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, TrendingUp, Award, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExperienceGain {
  id: string
  amount: number
  source: string
  timestamp: Date
  type: 'achievement' | 'trip' | 'milestone' | 'bonus'
}

interface ExperienceTrackerProps {
  /** Текущие очки опыта */
  experiencePoints: number
  /** Недавние начисления опыта */
  recentGains?: ExperienceGain[]
  /** Показывать ли детальную статистику */
  showStats?: boolean
  /** Анимировать ли изменения */
  animated?: boolean
  /** CSS классы */
  className?: string
}

// Конфигурация типов опыта
const XP_TYPES = {
  achievement: {
    icon: Award,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    label: 'Достижение'
  },
  trip: {
    icon: TrendingUp, 
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    label: 'Поездка'
  },
  milestone: {
    icon: Zap,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    label: 'Веха'
  },
  bonus: {
    icon: Plus,
    color: 'text-green-600 bg-green-50 border-green-200',
    label: 'Бонус'
  }
}

// Компонент для анимированного числа
function AnimatedNumber({ 
  value, 
  duration = 1.5, 
  className 
}: { 
  value: number, 
  duration?: number, 
  className?: string 
}) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    const increment = Math.ceil((end - start) / 60) // 60 FPS
    let timer: NodeJS.Timeout

    const updateValue = () => {
      start += increment
      if (start >= end) {
        setDisplayValue(end)
      } else {
        setDisplayValue(start)
        timer = setTimeout(updateValue, duration * 1000 / 60)
      }
    }

    updateValue()
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [value, duration])

  return (
    <span className={className}>
      {displayValue.toLocaleString()}
    </span>
  )
}

// Компонент для отображения недавнего получения опыта
function ExperienceGainItem({ gain }: { gain: ExperienceGain }) {
  const config = XP_TYPES[gain.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between p-2 rounded-lg border bg-white/50"
    >
      <div className="flex items-center gap-2">
        <div className={cn("p-1.5 rounded-full border", config.color)}>
          <Icon className="w-3 h-3" />
        </div>
        <div>
          <div className="text-sm font-medium text-gray-900">
            +{gain.amount} XP
          </div>
          <div className="text-xs text-gray-500">
            {gain.source}
          </div>
        </div>
      </div>
      <Badge variant="outline" className="text-xs">
        {config.label}
      </Badge>
    </motion.div>
  )
}

export function ExperienceTracker({
  experiencePoints,
  recentGains = [],
  showStats = true,
  animated = true,
  className
}: ExperienceTrackerProps) {
  // Сортируем недавние начисления по времени
  const sortedGains = [...recentGains].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  ).slice(0, 5) // Показываем только последние 5

  // Статистика опыта
  const totalGainsToday = recentGains
    .filter(gain => {
      const today = new Date()
      const gainDate = gain.timestamp
      return gainDate.toDateString() === today.toDateString()
    })
    .reduce((sum, gain) => sum + gain.amount, 0)

  const totalGainsWeek = recentGains
    .filter(gain => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return gain.timestamp >= weekAgo
    })
    .reduce((sum, gain) => sum + gain.amount, 0)

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-4">
        {/* Заголовок с общим опытом */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">
                Опыт
              </h3>
              <p className="text-sm text-gray-500">
                Отслеживание прогресса
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {animated ? (
                <AnimatedNumber value={experiencePoints} />
              ) : (
                experiencePoints.toLocaleString()
              )}
            </div>
            <div className="text-sm text-gray-500">
              XP всего
            </div>
          </div>
        </div>

        {/* Статистика */}
        {showStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-lg font-bold text-blue-600">
                {animated ? (
                  <AnimatedNumber value={totalGainsToday} />
                ) : (
                  totalGainsToday.toLocaleString()
                )}
              </div>
              <div className="text-xs text-blue-500">
                XP сегодня
              </div>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-lg font-bold text-purple-600">
                {animated ? (
                  <AnimatedNumber value={totalGainsWeek} />
                ) : (
                  totalGainsWeek.toLocaleString()
                )}
              </div>
              <div className="text-xs text-purple-500">
                XP за неделю
              </div>
            </div>
          </div>
        )}

        {/* Недавние начисления */}
        {sortedGains.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Недавние начисления
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <AnimatePresence>
                {sortedGains.map((gain) => (
                  <ExperienceGainItem key={gain.id} gain={gain} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
