'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, Star, Sparkles, Award, Crown, 
  Zap, Heart, Target, Gift, PartyPopper 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Milestone {
  id: string
  type: 'level' | 'experience' | 'achievement' | 'streak' | 'special'
  title: string
  description: string
  value: number
  reward?: {
    type: 'xp' | 'badge' | 'title' | 'special'
    value: number | string
    description: string
  }
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
}

interface MilestoneCelebrationProps {
  /** Веха для празднования */
  milestone: Milestone
  /** Показывать ли празднование */
  show: boolean
  /** Callback при закрытии */
  onClose: () => void
  /** Автозакрытие через N секунд */
  autoClose?: number
  /** CSS классы */
  className?: string
}

// Конфигурация типов вех
const MILESTONE_TYPES = {
  level: {
    icon: Trophy,
    color: 'from-yellow-400 to-amber-500',
    bgColor: 'bg-yellow-50 border-yellow-200',
    title: 'Новый уровень!'
  },
  experience: {
    icon: Zap,
    color: 'from-blue-400 to-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    title: 'Опыт получен!'
  },
  achievement: {
    icon: Award,
    color: 'from-purple-400 to-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    title: 'Достижение!'
  },
  streak: {
    icon: Target,
    color: 'from-red-400 to-red-600',
    bgColor: 'bg-red-50 border-red-200',
    title: 'Серия продолжается!'
  },
  special: {
    icon: Crown,
    color: 'from-pink-400 to-rose-500',
    bgColor: 'bg-pink-50 border-pink-200',
    title: 'Особое достижение!'
  }
}

// Конфигурация редкости
const RARITY_CONFIG = {
  common: {
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Обычное'
  },
  uncommon: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Необычное'
  },
  rare: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Редкое'
  },
  epic: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Эпическое'
  },
  legendary: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'Легендарное'
  }
}

// Компонент конфетти
function Confetti() {
  const confettiPieces = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    color: ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6'][i % 5],
    delay: Math.random() * 1,
    x: Math.random() * 100,
    rotation: Math.random() * 360
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confettiPieces.map((piece) => (
        <motion.div
          key={piece.id}
          className="absolute w-2 h-2 rounded-full"
          style={{ 
            backgroundColor: piece.color,
            left: `${piece.x}%`,
            top: -10
          }}
          initial={{ 
            y: -10,
            rotate: 0,
            opacity: 1,
            scale: 0
          }}
          animate={{ 
            y: 400,
            rotate: piece.rotation,
            opacity: 0,
            scale: 1
          }}
          transition={{ 
            duration: 3,
            delay: piece.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  )
}

// Компонент сияющих звезд
function Sparkles({ count = 6 }: { count?: number }) {
  const sparkles = Array.from({ length: count }, (_, i) => ({
    id: i,
    delay: i * 0.2,
    x: Math.random() * 80 + 10,
    y: Math.random() * 80 + 10,
    size: Math.random() * 8 + 4
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute"
          style={{ 
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            width: sparkle.size,
            height: sparkle.size
          }}
          initial={{ scale: 0, rotate: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1, 0],
            rotate: [0, 180, 360],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 2,
            delay: sparkle.delay,
            repeat: Infinity,
            repeatDelay: 1
          }}
        >
          <Star className="w-full h-full text-yellow-400 fill-yellow-400" />
        </motion.div>
      ))}
    </div>
  )
}

export function MilestoneCelebration({
  milestone,
  show,
  onClose,
  autoClose = 5,
  className
}: MilestoneCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false)

  // Автозакрытие
  useEffect(() => {
    if (show && autoClose > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, autoClose * 1000)
      return () => clearTimeout(timer)
    }
  }, [show, autoClose])

  // Управление видимостью
  useEffect(() => {
    setIsVisible(show)
  }, [show])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Задержка для анимации закрытия
  }

  const typeConfig = MILESTONE_TYPES[milestone.type]
  const rarityConfig = RARITY_CONFIG[milestone.rarity]
  const Icon = typeConfig.icon

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Фон с затемнением */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={handleClose}
          >
            {/* Модальное окно */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className={cn("relative max-w-md w-full", className)}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="relative overflow-hidden">
                {/* Эффекты */}
                <Confetti />
                <Sparkles count={milestone.rarity === 'legendary' ? 12 : 6} />
                
                {/* Градиентный фон */}
                <div 
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-10",
                    typeConfig.color.replace('from-', 'from-').replace('to-', 'to-')
                  )}
                />

                <CardContent className="p-8 text-center relative">
                  {/* Иконка с анимацией */}
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 200, 
                      delay: 0.2 
                    }}
                    className="mb-4"
                  >
                    <div 
                      className={cn(
                        "w-20 h-20 mx-auto rounded-full flex items-center justify-center",
                        "bg-gradient-to-br shadow-lg",
                        typeConfig.color
                      )}
                    >
                      <Icon className="w-10 h-10 text-white" />
                    </div>
                  </motion.div>

                  {/* Заголовок */}
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl font-bold text-gray-900 mb-2"
                  >
                    {typeConfig.title}
                  </motion.h2>

                  {/* Название вехи */}
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-xl font-semibold text-gray-800 mb-3"
                  >
                    {milestone.title}
                  </motion.h3>

                  {/* Описание */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-600 mb-4"
                  >
                    {milestone.description}
                  </motion.p>

                  {/* Бейджи */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex justify-center gap-2 mb-6"
                  >
                    <Badge 
                      className={cn(rarityConfig.bgColor, rarityConfig.color)}
                    >
                      {rarityConfig.label}
                    </Badge>
                    <Badge variant="outline">
                      {milestone.value}
                    </Badge>
                  </motion.div>

                  {/* Награда */}
                  {milestone.reward && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className={cn(
                        "p-4 rounded-lg mb-6 border-2",
                        typeConfig.bgColor
                      )}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Gift className="w-5 h-5 text-gray-700" />
                        <span className="font-semibold text-gray-800">
                          Награда
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {typeof milestone.reward.value === 'number' 
                          ? `+${milestone.reward.value}` 
                          : milestone.reward.value
                        }
                      </div>
                      <div className="text-sm text-gray-600">
                        {milestone.reward.description}
                      </div>
                    </motion.div>
                  )}

                  {/* Кнопки */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex gap-3"
                  >
                    <Button 
                      onClick={handleClose}
                      className="flex-1"
                      size="lg"
                    >
                      <PartyPopper className="w-4 h-4 mr-2" />
                      Отлично!
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
