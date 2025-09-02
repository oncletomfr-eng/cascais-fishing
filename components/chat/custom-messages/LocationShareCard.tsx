'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  MapPin,
  Navigation,
  Anchor,
  Zap,
  AlertTriangle,
  Users,
  ExternalLink,
  Copy,
  CheckCircle,
  Compass,
  Clock,
  Target
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { LocationSharePayload } from '@/lib/types/multi-phase-chat'

interface LocationShareCardProps {
  payload: LocationSharePayload
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
  onNavigateClick?: (coordinates: { lat: number, lng: number }) => void
}

// Получить конфигурацию для типа локации
const getLocationTypeConfig = (locationType: LocationSharePayload['locationType']) => {
  switch (locationType) {
    case 'fishing_spot':
      return {
        icon: <Target className="w-5 h-5 text-blue-600" />,
        label: 'Место рыбалки',
        color: 'bg-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        emoji: '🎣'
      }
    case 'boat_position':
      return {
        icon: <Anchor className="w-5 h-5 text-cyan-600" />,
        label: 'Позиция лодки',
        color: 'bg-cyan-500',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-200',
        emoji: '⛵'
      }
    case 'meeting_point':
      return {
        icon: <Users className="w-5 h-5 text-green-600" />,
        label: 'Место встречи',
        color: 'bg-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '📍'
      }
    case 'harbor':
      return {
        icon: <Anchor className="w-5 h-5 text-purple-600" />,
        label: 'Гавань',
        color: 'bg-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        emoji: '🏛️'
      }
    case 'danger_zone':
      return {
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        label: 'Опасная зона',
        color: 'bg-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        emoji: '⚠️'
      }
    default:
      return {
        icon: <MapPin className="w-5 h-5 text-gray-600" />,
        label: 'Локация',
        color: 'bg-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        emoji: '📍'
      }
  }
}

// Форматировать координаты
const formatCoordinates = (lat: number, lng: number, precision: number = 4) => {
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`
}

// Получить Google Maps URL
const getGoogleMapsUrl = (lat: number, lng: number, locationName?: string) => {
  const coords = `${lat},${lng}`
  const query = locationName ? encodeURIComponent(locationName) : coords
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function LocationShareCard({ 
  payload, 
  timestamp, 
  author,
  className,
  onNavigateClick
}: LocationShareCardProps) {
  const [coordsCopied, setCoordsCopied] = useState(false)
  const typeConfig = getLocationTypeConfig(payload.locationType)
  
  const copyCoordinates = async () => {
    const coords = formatCoordinates(payload.coordinates.lat, payload.coordinates.lng, 6)
    try {
      await navigator.clipboard.writeText(coords)
      setCoordsCopied(true)
      setTimeout(() => setCoordsCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy coordinates:', err)
    }
  }
  
  const handleNavigateClick = () => {
    if (onNavigateClick) {
      onNavigateClick(payload.coordinates)
    } else {
      // Открыть в Google Maps
      const url = getGoogleMapsUrl(
        payload.coordinates.lat, 
        payload.coordinates.lng, 
        payload.locationName
      )
      window.open(url, '_blank')
    }
  }

  const formatSpeed = (speed?: number) => {
    if (!speed) return null
    return `${speed.toFixed(1)} узлов`
  }

  const formatHeading = (heading?: number) => {
    if (!heading) return null
    
    // Преобразовать градусы в направления
    const directions = ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ']
    const index = Math.round(heading / 45) % 8
    return `${heading}° (${directions[index]})`
  }

  const formatAccuracy = (accuracy?: number) => {
    if (!accuracy) return null
    if (accuracy < 1000) return `±${accuracy.toFixed(0)}м`
    return `±${(accuracy / 1000).toFixed(1)}км`
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
        typeConfig.borderColor,
        typeConfig.bgColor
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {typeConfig.icon}
              <h3 className="font-semibold text-lg">Местоположение</h3>
              <span className="text-xl">{typeConfig.emoji}</span>
            </div>
            <Badge 
              variant="secondary" 
              className={cn("text-xs text-white", typeConfig.color)}
            >
              {typeConfig.label}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-4">
          {/* Название локации */}
          {payload.locationName && (
            <div className="bg-white/70 rounded-lg p-3">
              <h4 className="font-semibold text-gray-800 text-center">
                {payload.locationName}
              </h4>
            </div>
          )}
          
          {/* Координаты */}
          <div className="bg-white/70 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">Координаты</p>
                <p className="font-mono text-sm font-semibold">
                  {formatCoordinates(payload.coordinates.lat, payload.coordinates.lng)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyCoordinates}
                className="flex items-center gap-1 text-xs"
              >
                {coordsCopied ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Копировать
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Дополнительные данные */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {payload.accuracy && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-xs text-gray-500">Точность</p>
                  <p className="font-semibold">{formatAccuracy(payload.accuracy)}</p>
                </div>
              </div>
            )}
            
            {payload.speed && (
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-gray-500">Скорость</p>
                  <p className="font-semibold">{formatSpeed(payload.speed)}</p>
                </div>
              </div>
            )}
            
            {payload.heading && (
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500">Курс</p>
                  <p className="font-semibold">{formatHeading(payload.heading)}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Время</p>
                <p className="font-semibold">
                  {format(payload.timestamp, 'HH:mm', { locale: ru })}
                </p>
              </div>
            </div>
          </div>
          
          {/* Заметки */}
          {payload.notes && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Заметки:</p>
              <p className="text-sm text-gray-600 italic">{payload.notes}</p>
            </div>
          )}
          
          {/* Кнопка навигации */}
          <div className="border-t pt-3 flex gap-2">
            <Button
              onClick={handleNavigateClick}
              className="flex-1 flex items-center gap-2"
              variant="outline"
            >
              <Navigation className="w-4 h-4" />
              Навигация
            </Button>
            
            <Button
              onClick={() => {
                const url = getGoogleMapsUrl(
                  payload.coordinates.lat,
                  payload.coordinates.lng,
                  payload.locationName
                )
                window.open(url, '_blank')
              }}
              variant="outline"
              size="icon"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Мета-информация */}
          <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              {format(timestamp, 'dd.MM.yyyy HH:mm', { locale: ru })}
            </span>
            {author && (
              <span>{author.name} {author.role && `(${author.role})`}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default LocationShareCard
