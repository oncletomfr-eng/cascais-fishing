'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Package,
  ExternalLink,
  DollarSign,
  Star,
  ThumbsUp,
  ThumbsDown,
  Info,
  CheckCircle,
  X,
  Fish,
  Target,
  CloudSun,
  BookOpen,
  ShoppingCart,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { GearRecommendationPayload } from '@/lib/types/multi-phase-chat'

interface GearRecommendationCardProps {
  payload: GearRecommendationPayload
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
  onPurchaseClick?: (link: string) => void
}

// Получить конфигурацию для категории снаряжения
const getCategoryConfig = (category: GearRecommendationPayload['category']) => {
  switch (category) {
    case 'rod':
      return {
        label: 'Удочка',
        color: 'bg-brown-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        emoji: '🎣'
      }
    case 'reel':
      return {
        label: 'Катушка',
        color: 'bg-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        emoji: '⚙️'
      }
    case 'line':
      return {
        label: 'Леска',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        emoji: '〰️'
      }
    case 'hooks':
      return {
        label: 'Крючки',
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        emoji: '🪝'
      }
    case 'bait':
      return {
        label: 'Наживка',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '🪱'
      }
    case 'lures':
      return {
        label: 'Приманки',
        color: 'bg-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        emoji: '🐟'
      }
    case 'accessories':
      return {
        label: 'Аксессуары',
        color: 'bg-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        emoji: '🎒'
      }
    case 'safety':
      return {
        label: 'Безопасность',
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        emoji: '🛡️'
      }
  }
}

// Получить конфигурацию для уровня опыта
const getExperienceConfig = (experienceLevel: GearRecommendationPayload['author']['experienceLevel']) => {
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

// Форматировать цену
const formatPrice = (price?: GearRecommendationPayload['price']) => {
  if (!price) return null
  
  const { min, max, currency } = price
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'RUB' ? '₽' : currency
  
  if (min === max) {
    return `${min}${symbol}`
  }
  return `${min}${symbol} - ${max}${symbol}`
}

export function GearRecommendationCard({ 
  payload, 
  timestamp, 
  author,
  className,
  onPurchaseClick
}: GearRecommendationCardProps) {
  const [expanded, setExpanded] = useState(false)
  const categoryConfig = getCategoryConfig(payload.category)
  const experienceConfig = getExperienceConfig(payload.author.experienceLevel)
  
  const handlePurchaseClick = (url: string) => {
    if (onPurchaseClick) {
      onPurchaseClick(url)
    } else {
      window.open(url, '_blank')
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
              <Package className="w-6 h-6 text-purple-600" />
              <h3 className="font-semibold text-lg">Рекомендация</h3>
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
          {/* Основная информация о товаре */}
          <div className="space-y-2">
            <h4 className="font-semibold text-lg text-gray-800">
              {payload.name}
            </h4>
            
            {(payload.brand || payload.model) && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {payload.brand && (
                  <Badge variant="outline">{payload.brand}</Badge>
                )}
                {payload.model && (
                  <span className="font-mono">{payload.model}</span>
                )}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {payload.price && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-700">
                    {formatPrice(payload.price)}
                  </span>
                </div>
              )}
              
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
          
          {/* Изображения */}
          {payload.images && payload.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {payload.images.slice(0, 4).map((imageUrl, index) => (
                <div key={index} className="aspect-square">
                  <img
                    src={imageUrl}
                    alt={`${payload.name} - изображение ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/images/placeholder.png'
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Подходит для */}
          {payload.suitableFor && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Подходит для:</p>
              <div className="space-y-1">
                {payload.suitableFor.species && payload.suitableFor.species.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Fish className="w-3 h-3 text-blue-500 mt-0.5" />
                    {payload.suitableFor.species.map((species, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {species}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {payload.suitableFor.techniques && payload.suitableFor.techniques.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <Target className="w-3 h-3 text-green-500 mt-0.5" />
                    {payload.suitableFor.techniques.map((technique, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                )}
                
                {payload.suitableFor.experienceLevel && payload.suitableFor.experienceLevel.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    <BookOpen className="w-3 h-3 text-purple-500 mt-0.5" />
                    {payload.suitableFor.experienceLevel.map((level, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {level === 'beginner' ? 'Новичок' : level === 'intermediate' ? 'Средний' : 'Продвинутый'}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Расширяемая секция с деталями */}
          {(payload.specifications || payload.pros || payload.cons) && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-sm p-0 h-auto"
              >
                <Info className="w-3 h-3" />
                Подробная информация
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
                  {/* Характеристики */}
                  {payload.specifications && Object.keys(payload.specifications).length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Характеристики:
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-xs">
                        {Object.entries(payload.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key}:</span>
                            <span className="font-semibold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Плюсы */}
                  {payload.pros && payload.pros.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Плюсы:
                      </p>
                      <div className="space-y-1">
                        {payload.pros.map((pro, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <ThumbsUp className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-600">{pro}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Минусы */}
                  {payload.cons && payload.cons.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Минусы:
                      </p>
                      <div className="space-y-1">
                        {payload.cons.map((con, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <ThumbsDown className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-600">{con}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}
          
          {/* Ссылки на покупку */}
          {payload.purchaseLinks && payload.purchaseLinks.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Где купить:</p>
              <div className="flex flex-col gap-2">
                {payload.purchaseLinks.slice(0, 3).map((link, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePurchaseClick(link.url)}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-3 h-3" />
                      <span className="text-xs">{link.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {link.price && (
                        <span className="text-xs font-semibold text-green-600">
                          {link.price}₽
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </Button>
                ))}
              </div>
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

export default GearRecommendationCard
