'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Lightbulb,
  Target,
  Fish,
  Wrench,
  MapPin,
  CloudSun,
  Shield,
  Star,
  CheckCircle,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Award,
  BookOpen,
  TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { FishingTipPayload } from '@/lib/types/multi-phase-chat'

interface FishingTipCardProps {
  payload: FishingTipPayload
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
  onImageClick?: (imageUrl: string) => void
}

// Получить конфигурацию для категории совета
const getCategoryConfig = (category: FishingTipPayload['category']) => {
  switch (category) {
    case 'technique':
      return {
        icon: <Target className="w-5 h-5 text-blue-600" />,
        label: 'Техника',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        emoji: '🎯'
      }
    case 'bait':
      return {
        icon: <Fish className="w-5 h-5 text-green-600" />,
        label: 'Наживка',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '🪱'
      }
    case 'equipment':
      return {
        icon: <Wrench className="w-5 h-5 text-orange-600" />,
        label: 'Снаряжение',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        emoji: '🎣'
      }
    case 'location':
      return {
        icon: <MapPin className="w-5 h-5 text-purple-600" />,
        label: 'Локация',
        color: 'bg-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        emoji: '📍'
      }
    case 'weather':
      return {
        icon: <CloudSun className="w-5 h-5 text-yellow-600" />,
        label: 'Погода',
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        emoji: '🌤️'
      }
    case 'safety':
      return {
        icon: <Shield className="w-5 h-5 text-red-600" />,
        label: 'Безопасность',
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        emoji: '🛡️'
      }
  }
}

// Получить конфигурацию для сложности
const getDifficultyConfig = (difficulty: FishingTipPayload['difficulty']) => {
  switch (difficulty) {
    case 'beginner':
      return {
        label: 'Новичок',
        color: 'bg-green-100 text-green-800',
        stars: 1
      }
    case 'intermediate':
      return {
        label: 'Средний',
        color: 'bg-yellow-100 text-yellow-800',
        stars: 2
      }
    case 'advanced':
      return {
        label: 'Эксперт',
        color: 'bg-red-100 text-red-800',
        stars: 3
      }
  }
}

// Получить конфигурацию для уровня опыта автора
const getExperienceConfig = (experienceLevel: FishingTipPayload['author']['experienceLevel']) => {
  switch (experienceLevel) {
    case 'novice':
      return { label: 'Новичок', icon: '🌱' }
    case 'experienced':
      return { label: 'Опытный', icon: '⭐' }
    case 'expert':
      return { label: 'Эксперт', icon: '🏆' }
    case 'captain':
      return { label: 'Капитан', icon: '⚓' }
  }
}

// Рендер звёзд рейтинга
const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "w-3 h-3",
            star <= rating 
              ? "text-yellow-500 fill-yellow-500" 
              : "text-gray-300"
          )}
        />
      ))}
      <span className="text-xs text-gray-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

export function FishingTipCard({ 
  payload, 
  timestamp, 
  author,
  className,
  onImageClick
}: FishingTipCardProps) {
  const [expanded, setExpanded] = useState(false)
  const categoryConfig = getCategoryConfig(payload.category)
  const difficultyConfig = getDifficultyConfig(payload.difficulty)
  const experienceConfig = getExperienceConfig(payload.author.experienceLevel)
  
  const handleImageClick = (imageUrl: string) => {
    if (onImageClick) {
      onImageClick(imageUrl)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("max-w-md mx-auto", className)}
    >
      <Card className={cn(
        "border-2 shadow-lg",
        categoryConfig.borderColor,
        categoryConfig.bgColor
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              <h3 className="font-semibold text-lg">Совет</h3>
              <span className="text-xl">{categoryConfig.emoji}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn("text-xs text-white", categoryConfig.color)}
              >
                {categoryConfig.label}
              </Badge>
              {payload.verified && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-4">
          {/* Заголовок и сложность */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg text-gray-800">
              {payload.title}
            </h4>
            
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className={difficultyConfig.color}>
                <BookOpen className="w-3 h-3 mr-1" />
                {difficultyConfig.label}
                <div className="flex ml-1">
                  {[...Array(3)].map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "w-2 h-2",
                        i < difficultyConfig.stars
                          ? "text-current fill-current"
                          : "text-gray-400"
                      )}
                    />
                  ))}
                </div>
              </Badge>
              
              {payload.rating && (
                <StarRating rating={payload.rating} />
              )}
            </div>
          </div>
          
          {/* Описание */}
          <div className="bg-white/70 rounded-lg p-3">
            <p className="text-sm text-gray-700 leading-relaxed">
              {payload.description}
            </p>
          </div>
          
          {/* Дополнительная информация (сворачиваемая) */}
          {(payload.species || payload.conditions || payload.images) && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm p-0 h-auto"
              >
                <TrendingUp className="w-3 h-3" />
                Подробности
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Button>
              
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 space-y-3"
                >
                  {/* Виды рыб */}
                  {payload.species && payload.species.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Подходит для:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {payload.species.map((species, index) => (
                          <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                            <Fish className="w-3 h-3" />
                            {species}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Условия */}
                  {payload.conditions && payload.conditions.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Условия:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {payload.conditions.map((condition, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Изображения */}
                  {payload.images && payload.images.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Изображения:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {payload.images.slice(0, 4).map((imageUrl, index) => (
                          <div
                            key={index}
                            className="relative aspect-square cursor-pointer group"
                            onClick={() => handleImageClick(imageUrl)}
                          >
                            <img
                              src={imageUrl}
                              alt={`Изображение ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg group-hover:opacity-80 transition-opacity"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/images/placeholder.png'
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-colors flex items-center justify-center">
                              <ImageIcon className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                      {payload.images.length > 4 && (
                        <p className="text-xs text-gray-500 mt-1">
                          +{payload.images.length - 4} ещё...
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
          
          {/* Информация об авторе */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">{payload.author.name}</p>
                  <p className="text-xs text-gray-500">
                    {experienceConfig.icon} {experienceConfig.label}
                  </p>
                </div>
              </div>
              {payload.verified && (
                <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Проверено
                </Badge>
              )}
            </div>
          </div>
          
          {/* Мета-информация */}
          <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              {format(timestamp, 'dd.MM.yyyy HH:mm', { locale: ru })}
            </span>
            {author && (
              <span>от {author.name}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default FishingTipCard
