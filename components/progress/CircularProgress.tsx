'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CircularProgressProps {
  /** Текущий прогресс (0-100) */
  progress: number
  /** Размер в пикселях */
  size?: number
  /** Толщина линии прогресса */
  strokeWidth?: number
  /** Цвет прогресса */
  color?: string
  /** Цвет фона */
  backgroundColor?: string
  /** Анимировать ли прогресс */
  animated?: boolean
  /** Длительность анимации в секундах */
  duration?: number
  /** Содержимое в центре */
  children?: React.ReactNode
  /** CSS классы */
  className?: string
  /** Показывать ли проценты */
  showPercentage?: boolean
  /** Кастомный текст вместо процентов */
  customText?: string
}

export function CircularProgress({
  progress = 0,
  size = 120,
  strokeWidth = 8,
  color = "#3b82f6",
  backgroundColor = "#e5e7eb", 
  animated = true,
  duration = 1.5,
  children,
  className,
  showPercentage = false,
  customText
}: CircularProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(animated ? 0 : progress)
  
  // Анимация прогресса
  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [progress, animated])

  const normalizedRadius = (size - strokeWidth * 2) / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const currentProgress = animated ? animatedProgress : progress
  const strokeDashoffset = circumference - (currentProgress / 100) * circumference

  return (
    <div 
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* SVG для кругового прогресса */}
      <svg
        height={size}
        width={size}
        className="transform -rotate-90"
      >
        {/* Фоновый круг */}
        <circle
          stroke={backgroundColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
        
        {/* Круг прогресса */}
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          style={{ strokeDashoffset }}
          animate={{ strokeDashoffset }}
          transition={{ 
            duration: animated ? duration : 0, 
            ease: "easeInOut" 
          }}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          strokeLinecap="round"
        />
      </svg>

      {/* Содержимое в центре */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          <div className="text-center">
            {customText ? (
              <span className="text-sm font-medium text-gray-700">
                {customText}
              </span>
            ) : showPercentage ? (
              <span className="text-lg font-bold text-gray-900">
                {Math.round(currentProgress)}%
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
