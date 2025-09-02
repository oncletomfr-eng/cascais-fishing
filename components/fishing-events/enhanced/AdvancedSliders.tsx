'use client'

import React, { useState, useCallback } from 'react'
import { 
  Star, 
  DollarSign, 
  RotateCcw,
  TrendingUp,
  Users,
  Target,
  Award
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

// Типы диапазонов
interface Range {
  min: number
  max: number
}

interface AdvancedSlidersProps {
  difficultyRange: Range
  priceRange: Range
  onDifficultyChange: (range: Range) => void
  onPriceChange: (range: Range) => void
  className?: string
}

// Конфигурация уровней сложности
const DIFFICULTY_LEVELS = [
  { 
    value: 1, 
    label: 'Beginner', 
    icon: '🌱', 
    color: 'bg-green-100 text-green-800',
    description: 'Perfect for first-timers'
  },
  { 
    value: 2, 
    label: 'Easy', 
    icon: '😊', 
    color: 'bg-blue-100 text-blue-800',
    description: 'Basic fishing skills needed'
  },
  { 
    value: 3, 
    label: 'Moderate', 
    icon: '⚖️', 
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Some experience helpful'
  },
  { 
    value: 4, 
    label: 'Advanced', 
    icon: '🏆', 
    color: 'bg-orange-100 text-orange-800',
    description: 'Experienced anglers'
  },
  { 
    value: 5, 
    label: 'Expert', 
    icon: '⭐', 
    color: 'bg-red-100 text-red-800',
    description: 'Professional level'
  },
]

// Конфигурация ценовых диапазонов
const PRICE_RANGES = [
  { min: 0, max: 50, label: 'Budget', icon: '💰', color: 'bg-green-100 text-green-800' },
  { min: 50, max: 100, label: 'Standard', icon: '💵', color: 'bg-blue-100 text-blue-800' },
  { min: 100, max: 200, label: 'Premium', icon: '💎', color: 'bg-purple-100 text-purple-800' },
  { min: 200, max: 500, label: 'Luxury', icon: '👑', color: 'bg-yellow-100 text-yellow-800' },
]

// Получить описание уровня сложности
const getDifficultyInfo = (value: number) => {
  return DIFFICULTY_LEVELS.find(level => level.value === value) || DIFFICULTY_LEVELS[0]
}

// Получить диапазон цены
const getPriceRangeInfo = (min: number, max: number) => {
  return PRICE_RANGES.find(range => 
    min >= range.min && max <= range.max
  ) || { label: 'Custom', icon: '🎯', color: 'bg-gray-100 text-gray-800' }
}

// Форматировать цену
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(price)
}

// Компонент слайдера с визуальными улучшениями
function EnhancedSlider({ 
  value, 
  onValueChange, 
  min, 
  max, 
  step = 1,
  formatValue,
  leftLabel,
  rightLabel,
  className
}: {
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step?: number
  formatValue?: (value: number) => string
  leftLabel?: string
  rightLabel?: string
  className?: string
}) {
  const [isDragging, setIsDragging] = useState(false)
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{leftLabel || min}</span>
        <span>{rightLabel || max}</span>
      </div>
      
      <div className="relative">
        <Slider
          value={value}
          onValueChange={onValueChange}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          min={min}
          max={max}
          step={step}
          className={cn(
            "relative flex items-center select-none touch-none w-full",
            isDragging && "cursor-grabbing"
          )}
        />
        
        {/* Активные значения */}
        <div className="flex justify-between mt-2 text-sm font-medium">
          <Badge variant="outline" className="text-xs">
            {formatValue ? formatValue(value[0]) : value[0]}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {formatValue ? formatValue(value[1]) : value[1]}
          </Badge>
        </div>
      </div>
    </div>
  )
}

// Визуализация уровня сложности
function DifficultyVisualization({ 
  minDifficulty, 
  maxDifficulty 
}: { 
  minDifficulty: number
  maxDifficulty: number 
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Range:</span>
          <div className="flex items-center gap-1">
            {getDifficultyInfo(minDifficulty).icon}
            <span className="text-xs">{getDifficultyInfo(minDifficulty).label}</span>
          </div>
          <span className="text-xs text-muted-foreground">to</span>
          <div className="flex items-center gap-1">
            {getDifficultyInfo(maxDifficulty).icon}
            <span className="text-xs">{getDifficultyInfo(maxDifficulty).label}</span>
          </div>
        </div>
      </div>
      
      {/* Визуальная шкала */}
      <div className="flex gap-1">
        {DIFFICULTY_LEVELS.map((level) => (
          <div
            key={level.value}
            className={cn(
              "h-2 flex-1 rounded-sm transition-all duration-200",
              level.value >= minDifficulty && level.value <= maxDifficulty
                ? "bg-blue-500"
                : "bg-gray-200"
            )}
          />
        ))}
      </div>
    </div>
  )
}

// Визуализация ценового диапазона
function PriceVisualization({ 
  minPrice, 
  maxPrice 
}: { 
  minPrice: number
  maxPrice: number 
}) {
  const rangeInfo = getPriceRangeInfo(minPrice, maxPrice)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", rangeInfo.color)}>
            {rangeInfo.icon} {rangeInfo.label}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatPrice(minPrice)} - {formatPrice(maxPrice)}
        </div>
      </div>
      
      {/* Рекомендации по диапазону */}
      <div className="text-xs text-muted-foreground">
        {minPrice === 0 && maxPrice <= 50 && "Great for budget-conscious anglers"}
        {minPrice >= 50 && maxPrice <= 100 && "Good balance of price and quality"}
        {minPrice >= 100 && maxPrice <= 200 && "Premium fishing experiences"}
        {minPrice >= 200 && "Luxury and exclusive fishing trips"}
      </div>
    </div>
  )
}

export function AdvancedSliders({
  difficultyRange,
  priceRange,
  onDifficultyChange,
  onPriceChange,
  className
}: AdvancedSlidersProps) {
  
  // Сброс к значениям по умолчанию
  const resetDifficulty = useCallback(() => {
    onDifficultyChange({ min: 1, max: 5 })
  }, [onDifficultyChange])
  
  const resetPrice = useCallback(() => {
    onPriceChange({ min: 0, max: 500 })
  }, [onPriceChange])
  
  const resetAll = useCallback(() => {
    resetDifficulty()
    resetPrice()
  }, [resetDifficulty, resetPrice])

  // Проверить, активны ли фильтры
  const isDifficultyActive = difficultyRange.min > 1 || difficultyRange.max < 5
  const isPriceActive = priceRange.min > 0 || priceRange.max < 500
  const hasActiveFilters = isDifficultyActive || isPriceActive

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          Difficulty & Pricing
        </Label>
        {hasActiveFilters && (
          <Button
            variant="ghost" 
            size="sm" 
            onClick={resetAll}
            className="text-xs text-muted-foreground h-auto p-1"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Difficulty Slider */}
      <Card className={cn(
        "transition-all duration-200",
        isDifficultyActive && "ring-1 ring-blue-200 bg-blue-50/30"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Difficulty Level
            </CardTitle>
            {isDifficultyActive && (
              <Button
                variant="ghost" 
                size="sm" 
                onClick={resetDifficulty}
                className="text-xs h-auto p-1"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <EnhancedSlider
            value={[difficultyRange.min, difficultyRange.max]}
            onValueChange={([min, max]) => onDifficultyChange({ min, max })}
            min={1}
            max={5}
            step={1}
            leftLabel="Beginner"
            rightLabel="Expert"
          />
          <div className="mt-3">
            <DifficultyVisualization 
              minDifficulty={difficultyRange.min} 
              maxDifficulty={difficultyRange.max} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Price Range Slider */}
      <Card className={cn(
        "transition-all duration-200",
        isPriceActive && "ring-1 ring-green-200 bg-green-50/30"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Price Range
            </CardTitle>
            {isPriceActive && (
              <Button
                variant="ghost" 
                size="sm" 
                onClick={resetPrice}
                className="text-xs h-auto p-1"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <EnhancedSlider
            value={[priceRange.min, priceRange.max]}
            onValueChange={([min, max]) => onPriceChange({ min, max })}
            min={0}
            max={500}
            step={10}
            formatValue={formatPrice}
            leftLabel="Free"
            rightLabel="€500+"
          />
          <div className="mt-3">
            <PriceVisualization 
              minPrice={priceRange.min} 
              maxPrice={priceRange.max} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Статистика */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between text-xs text-muted-foreground p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            {isDifficultyActive && (
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3" />
                <span>Difficulty: {getDifficultyInfo(difficultyRange.min).label} - {getDifficultyInfo(difficultyRange.max).label}</span>
              </div>
            )}
            {isPriceActive && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-3 w-3" />
                <span>Price: {formatPrice(priceRange.min)} - {formatPrice(priceRange.max)}</span>
              </div>
            )}
          </div>
          <Badge variant="secondary" className="text-xs">
            {(isDifficultyActive ? 1 : 0) + (isPriceActive ? 1 : 0)} active
          </Badge>
        </div>
      )}
    </div>
  )
}

export default AdvancedSliders
