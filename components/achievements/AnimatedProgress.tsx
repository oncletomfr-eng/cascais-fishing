/**
 * Animated Progress Components - Visual progress indicators with smooth animations
 * Part of Task 9.2: Progress Tracking & Animations
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, Target, Trophy, Star, Sparkles, 
  CheckCircle, Circle, Zap
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

// Types
interface ProgressData {
  current: number
  max: number
  label?: string
  unit?: string
  color?: string
  showPercentage?: boolean
}

interface Milestone {
  value: number
  label: string
  icon?: React.ReactNode
  color?: string
  unlocked?: boolean
  unlockedAt?: Date
}

interface AnimatedProgressBarProps {
  progress: ProgressData
  milestones?: Milestone[]
  variant?: 'circular' | 'linear' | 'radial'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showMilestones?: boolean
  animate?: boolean
  duration?: number
  className?: string
}

interface ProgressHistoryItem {
  date: Date
  value: number
  milestone?: string
  event?: string
}

interface ProgressHistoryProps {
  history: ProgressHistoryItem[]
  maxValue: number
  className?: string
}

// Utility functions
const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return '#10b981' // green
  if (percentage >= 70) return '#3b82f6' // blue  
  if (percentage >= 50) return '#f59e0b' // orange
  if (percentage >= 25) return '#ef4444' // red
  return '#6b7280' // gray
}

const getMilestoneIcon = (milestone: Milestone) => {
  if (milestone.icon) return milestone.icon
  if (milestone.unlocked) return <CheckCircle className="w-4 h-4" />
  return <Circle className="w-4 h-4" />
}

// Circular Progress Bar Component
export function CircularProgressBar({ 
  progress, 
  milestones = [], 
  size = 'md', 
  animate = true,
  duration = 1.5,
  className = ''
}: AnimatedProgressBarProps) {
  const percentage = Math.min((progress.current / progress.max) * 100, 100)

  // Size configurations
  const sizeConfig = {
    sm: { radius: 32, stroke: 6, text: 'text-sm' },
    md: { radius: 48, stroke: 8, text: 'text-base' },
    lg: { radius: 64, stroke: 10, text: 'text-lg' },
    xl: { radius: 80, stroke: 12, text: 'text-xl' }
  }[size]

  const circumference = 2 * Math.PI * sizeConfig.radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const color = progress.color || getProgressColor(percentage)

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={(sizeConfig.radius + sizeConfig.stroke) * 2}
        height={(sizeConfig.radius + sizeConfig.stroke) * 2}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={sizeConfig.radius + sizeConfig.stroke}
          cy={sizeConfig.radius + sizeConfig.stroke}
          r={sizeConfig.radius}
          stroke="currentColor"
          strokeWidth={sizeConfig.stroke}
          fill="transparent"
          className="text-gray-200 dark:text-gray-700"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={sizeConfig.radius + sizeConfig.stroke}
          cy={sizeConfig.radius + sizeConfig.stroke}
          r={sizeConfig.radius}
          stroke={color}
          strokeWidth={sizeConfig.stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration, ease: 'easeInOut' }}
        />
      </svg>
      
      {/* Center content */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center ${sizeConfig.text}`}>
        <motion.div
          className="font-bold text-foreground"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          {progress.showPercentage !== false ? `${Math.round(percentage)}%` : progress.current}
        </motion.div>
        {progress.label && (
          <motion.div
            className="text-xs text-muted-foreground mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.3 }}
          >
            {progress.label}
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Linear Progress Bar Component
export function LinearProgressBar({ 
  progress, 
  milestones = [], 
  showMilestones = true,
  animate = true,
  duration = 1.5,
  className = ''
}: AnimatedProgressBarProps) {
  const percentage = Math.min((progress.current / progress.max) * 100, 100)
  const color = progress.color || getProgressColor(percentage)

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress info */}
      <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          {progress.label && <span className="font-medium">{progress.label}</span>}
          <span className="text-muted-foreground">
            {progress.current}/{progress.max} {progress.unit || ''}
          </span>
        </div>
        <span className="font-mono font-bold" style={{ color }}>
          {Math.round(percentage)}%
        </span>
      </div>
      
      {/* Progress bar container */}
      <div className="relative">
        <Progress 
          value={animate ? 0 : percentage} 
          className="h-2" 
        />
        <motion.div
          className="absolute top-0 left-0 h-2 rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration, ease: 'easeInOut' }}
        />
      </div>
    </div>
  )
}

// Progress History Visualization
export function ProgressHistory({ history, maxValue, className = '' }: ProgressHistoryProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  
  const points = useMemo(() => {
    const width = 300
    const height = 100
    const padding = 20
    
    return history.map((item, index) => ({
      x: padding + (index / (history.length - 1)) * (width - padding * 2),
      y: height - padding - ((item.value / maxValue) * (height - padding * 2)),
      data: item
    }))
  }, [history, maxValue])
  
  const pathData = points.reduce((path, point, index) => {
    return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`)
  }, '')

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">История прогресса</h3>
        </div>
        
        <div className="relative">
          <svg width="300" height="100" className="overflow-visible">
            {/* Progress line */}
            <motion.path
              d={pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: 'easeInOut' }}
            />
            
            {/* Data points */}
            {points.map((point, index) => (
              <motion.circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === index ? 6 : 4}
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer"
                onHoverStart={() => setHoveredPoint(index)}
                onHoverEnd={() => setHoveredPoint(null)}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 + 1.5, duration: 0.3 }}
              />
            ))}
          </svg>
          
          {/* Tooltip */}
          <AnimatePresence>
            {hoveredPoint !== null && (
              <motion.div
                className="absolute bg-popover border rounded-lg p-2 shadow-lg z-10 pointer-events-none"
                style={{
                  left: points[hoveredPoint].x - 50,
                  top: points[hoveredPoint].y - 60
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <div className="text-sm font-medium">
                  {points[hoveredPoint].data.value} / {maxValue}
                </div>
                <div className="text-xs text-muted-foreground">
                  {points[hoveredPoint].data.date.toLocaleDateString()}
                </div>
                {points[hoveredPoint].data.milestone && (
                  <div className="text-xs text-blue-600 font-medium">
                    🏆 {points[hoveredPoint].data.milestone}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

// Motivational Progress Messages
export function MotivationalMessage({ 
  percentage, 
  milestoneReached, 
  className = '' 
}: {
  percentage: number
  milestoneReached?: string
  className?: string
}) {
  const getMessage = (percent: number) => {
    if (percent === 100) return { text: 'Поздравляем! Цель достигнута! 🎉', icon: Trophy, color: 'text-yellow-600' }
    if (percent >= 90) return { text: 'Почти готово! Последний рывок! 🚀', icon: Zap, color: 'text-green-600' }
    if (percent >= 75) return { text: 'Отличная работа! Продолжайте! ⭐', icon: Star, color: 'text-blue-600' }
    if (percent >= 50) return { text: 'Полпути пройдено! Вы на верном пути! 💪', icon: Target, color: 'text-purple-600' }
    if (percent >= 25) return { text: 'Хорошее начало! Продолжайте двигаться! 🎯', icon: TrendingUp, color: 'text-orange-600' }
    return { text: 'Каждый шаг важен! Начните сегодня! ✨', icon: Sparkles, color: 'text-gray-600' }
  }
  
  const message = getMessage(percentage)
  const Icon = message.icon
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={percentage > 90 ? 'final' : Math.floor(percentage / 25)}
        className={`flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-background to-muted/50 border ${className}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          animate={{ rotate: percentage >= 90 ? 360 : 0 }}
          transition={{ duration: 1 }}
        >
          <Icon className={`w-6 h-6 ${message.color}`} />
        </motion.div>
        
        <div className="flex-1">
          <div className={`font-medium ${message.color}`}>
            {message.text}
          </div>
          {milestoneReached && (
            <motion.div
              className="text-sm text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              🏆 Достижение разблокировано: {milestoneReached}
            </motion.div>
          )}
        </div>
        
        <motion.div
          className="text-2xl font-bold opacity-20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {Math.round(percentage)}%
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
