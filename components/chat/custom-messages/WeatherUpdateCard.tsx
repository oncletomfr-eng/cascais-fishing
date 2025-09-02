'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow,
  Wind,
  Waves,
  Eye,
  Thermometer,
  AlertTriangle,
  CheckCircle,
  Info,
  MapPin
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { WeatherUpdatePayload } from '@/lib/types/multi-phase-chat'

interface WeatherUpdateCardProps {
  payload: WeatherUpdatePayload
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
}

// Получить иконку погоды по условию
const getWeatherIcon = (condition: string) => {
  const lowerCondition = condition.toLowerCase()
  
  if (lowerCondition.includes('солнеч') || lowerCondition.includes('ясно')) {
    return <Sun className="w-6 h-6 text-yellow-500" />
  }
  if (lowerCondition.includes('облач') || lowerCondition.includes('пасмурн')) {
    return <Cloud className="w-6 h-6 text-gray-500" />
  }
  if (lowerCondition.includes('дождь') || lowerCondition.includes('ливень')) {
    return <CloudRain className="w-6 h-6 text-blue-500" />
  }
  if (lowerCondition.includes('снег') || lowerCondition.includes('метель')) {
    return <CloudSnow className="w-6 h-6 text-blue-200" />
  }
  
  return <Cloud className="w-6 h-6 text-gray-500" />
}

// Получить цвет и иконку для уровня опасности
const getSeverityConfig = (severity: WeatherUpdatePayload['severity']) => {
  switch (severity) {
    case 'high':
      return {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        label: 'Высокая опасность'
      }
    case 'medium':
      return {
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        icon: <Info className="w-4 h-4 text-orange-600" />,
        label: 'Средняя опасность'
      }
    case 'low':
      return {
        color: 'bg-green-500',
        textColor: 'text-green-700', 
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: <CheckCircle className="w-4 h-4 text-green-600" />,
        label: 'Благоприятные условия'
      }
  }
}

// Получить источник данных
const getSourceLabel = (source: WeatherUpdatePayload['source']) => {
  switch (source) {
    case 'automatic': return 'Автоматически'
    case 'captain': return 'Капитан'
    case 'weather_service': return 'Метеослужба'
    default: return 'Неизвестно'
  }
}

export function WeatherUpdateCard({ 
  payload, 
  timestamp, 
  author,
  className 
}: WeatherUpdateCardProps) {
  const severityConfig = getSeverityConfig(payload.severity)
  const weatherIcon = getWeatherIcon(payload.condition)
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn("max-w-md mx-auto", className)}
    >
      <Card className={cn(
        "border-2 shadow-lg",
        severityConfig.borderColor,
        severityConfig.bgColor
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {weatherIcon}
              <h3 className="font-semibold text-lg">Прогноз погоды</h3>
            </div>
            <Badge 
              variant="secondary" 
              className={cn("text-xs", severityConfig.color, "text-white")}
            >
              <div className="flex items-center gap-1">
                {severityConfig.icon}
                {severityConfig.label}
              </div>
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 space-y-4">
          {/* Основные условия */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-xs text-gray-500">Температура</p>
                <p className="font-semibold">{payload.temperature}°C</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Ветер</p>
                <p className="font-semibold">{payload.windSpeed} м/с</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-cyan-500" />
              <div>
                <p className="text-xs text-gray-500">Волны</p>
                <p className="font-semibold">{payload.waveHeight} м</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Видимость</p>
                <p className="font-semibold">{payload.visibility} км</p>
              </div>
            </div>
          </div>
          
          {/* Условия */}
          <div className="border-t pt-3">
            <p className="text-sm font-medium text-gray-700 mb-1">Условия:</p>
            <p className="text-sm">{payload.condition}</p>
          </div>
          
          {/* Прогноз */}
          {payload.forecast && (
            <div className="border-t pt-3">
              <p className="text-sm font-medium text-gray-700 mb-1">Прогноз:</p>
              <p className="text-sm text-gray-600">{payload.forecast}</p>
            </div>
          )}
          
          {/* Координаты если есть */}
          {payload.coordinates && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-700">Координаты:</p>
              </div>
              <p className="text-sm text-gray-600 ml-6">
                {payload.coordinates.lat.toFixed(4)}, {payload.coordinates.lng.toFixed(4)}
              </p>
            </div>
          )}
          
          {/* Мета-информация */}
          <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              Источник: {getSourceLabel(payload.source)}
            </span>
            <span>
              {format(timestamp, 'HH:mm dd.MM', { locale: ru })}
            </span>
          </div>
          
          {/* Автор если есть */}
          {author && (
            <div className="text-xs text-gray-600 text-center">
              Отправлено: {author.name} {author.role && `(${author.role})`}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default WeatherUpdateCard
