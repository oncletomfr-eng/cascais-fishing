'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

// Импорт всех компонентов карточек
import WeatherUpdateCard from './WeatherUpdateCard'
import CatchPhotoCard from './CatchPhotoCard' 
import LocationShareCard from './LocationShareCard'
import FishingTipCard from './FishingTipCard'
import GearRecommendationCard from './GearRecommendationCard'
// import RouteUpdateCard from './RouteUpdateCard' // Будет создан позже
// import SafetyAlertCard from './SafetyAlertCard' // Будет создан позже

import type { 
  CustomMessageRendererProps,
  CustomMessageConfig 
} from './types'
import type { 
  CustomMessageType,
  WeatherUpdatePayload,
  CatchPhotoPayload,
  LocationSharePayload,
  FishingTipPayload,
  GearRecommendationPayload,
  RouteUpdatePayload,
  SafetyAlertPayload
} from '@/lib/types/multi-phase-chat'

// Конфигурация для всех типов кастомных сообщений
const MESSAGE_CONFIGS: Record<CustomMessageType, CustomMessageConfig> = {
  weather_update: {
    type: 'weather_update',
    component: WeatherUpdateCard,
    description: 'Обновления погоды с прогнозом и текущими условиями',
    category: 'information',
    allowedInPhases: ['preparation', 'live', 'debrief']
  },
  catch_photo: {
    type: 'catch_photo',
    component: CatchPhotoCard,
    description: 'Фотографии улова с деталями о рыбе и способе ловли',
    category: 'media',
    allowedInPhases: ['live', 'debrief']
  },
  location_share: {
    type: 'location_share',
    component: LocationShareCard,
    description: 'Обмен местоположением и координатами',
    category: 'navigation',
    allowedInPhases: ['preparation', 'live', 'debrief']
  },
  fishing_tip: {
    type: 'fishing_tip',
    component: FishingTipCard,
    description: 'Советы и рекомендации по рыбалке',
    category: 'recommendation',
    allowedInPhases: ['preparation', 'live', 'debrief']
  },
  gear_recommendation: {
    type: 'gear_recommendation',
    component: GearRecommendationCard,
    description: 'Рекомендации снаряжения и оборудования',
    category: 'recommendation',
    allowedInPhases: ['preparation', 'debrief']
  },
  route_update: {
    type: 'route_update',
    component: null, // Пока не реализован
    description: 'Обновления маршрута и навигационной информации',
    category: 'navigation',
    allowedInPhases: ['preparation', 'live'],
    requiresVerification: true
  },
  safety_alert: {
    type: 'safety_alert',
    component: null, // Пока не реализован
    description: 'Предупреждения и уведомления о безопасности',
    category: 'safety',
    allowedInPhases: ['preparation', 'live', 'debrief'],
    requiresVerification: true
  }
}

// Компонент-заглушка для неподдерживаемых типов сообщений
function UnsupportedMessageCard({ 
  messageType, 
  description,
  timestamp,
  author,
  className 
}: {
  messageType: CustomMessageType
  description: string
  timestamp: Date
  author?: { name: string, role?: string }
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className="border-2 border-orange-200 bg-orange-50 shadow-md">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <div>
              <h4 className="font-semibold text-orange-800">
                Неподдерживаемый тип сообщения
              </h4>
              <p className="text-sm text-orange-600">
                Тип: {messageType}
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {description}
          </p>
          
          <div className="text-xs text-gray-500 border-t pt-2">
            Получено: {timestamp.toLocaleString('ru-RU')}
            {author && ` • От: ${author.name}`}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Компонент для отображения ошибок рендера
function ErrorMessageCard({ 
  error, 
  messageType,
  timestamp,
  author,
  className 
}: {
  error: string
  messageType: CustomMessageType
  timestamp: Date
  author?: { name: string, role?: string }
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <Card className="border-2 border-red-200 bg-red-50 shadow-md">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <div>
              <h4 className="font-semibold text-red-800">
                Ошибка отображения сообщения
              </h4>
              <p className="text-sm text-red-600">
                Тип: {messageType}
              </p>
            </div>
          </div>
          
          <div className="bg-red-100 p-2 rounded text-sm font-mono text-red-800 mb-3">
            {error}
          </div>
          
          <div className="text-xs text-gray-500 border-t pt-2">
            Получено: {timestamp.toLocaleString('ru-RU')}
            {author && ` • От: ${author.name}`}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Главный компонент рендера кастомных сообщений
export function CustomMessageRenderer({
  messageData,
  timestamp,
  author,
  className,
  onImageClick,
  onNavigateClick,
  onPurchaseClick,
  onRouteNavigate,
  onEmergencyCall,
  onAcknowledge
}: CustomMessageRendererProps) {
  try {
    const config = MESSAGE_CONFIGS[messageData.type]
    
    if (!config) {
      console.warn(`Unknown custom message type: ${messageData.type}`)
      return (
        <UnsupportedMessageCard
          messageType={messageData.type}
          description={`Неизвестный тип сообщения: ${messageData.type}`}
          timestamp={timestamp}
          author={author}
          className={className}
        />
      )
    }

    const Component = config.component
    
    if (!Component) {
      return (
        <UnsupportedMessageCard
          messageType={messageData.type}
          description={config.description + " (компонент в разработке)"}
          timestamp={timestamp}
          author={author}
          className={className}
        />
      )
    }

    // Создаем пропсы в зависимости от типа сообщения
    const commonProps = {
      timestamp,
      author,
      className
    }

    switch (messageData.type) {
      case 'weather_update':
        return (
          <Component
            payload={messageData.payload as WeatherUpdatePayload}
            {...commonProps}
          />
        )
      
      case 'catch_photo':
        return (
          <Component
            payload={messageData.payload as CatchPhotoPayload}
            onImageClick={onImageClick}
            {...commonProps}
          />
        )
      
      case 'location_share':
        return (
          <Component
            payload={messageData.payload as LocationSharePayload}
            onNavigateClick={onNavigateClick}
            {...commonProps}
          />
        )
      
      case 'fishing_tip':
        return (
          <Component
            payload={messageData.payload as FishingTipPayload}
            onImageClick={onImageClick}
            {...commonProps}
          />
        )
      
      case 'gear_recommendation':
        return (
          <Component
            payload={messageData.payload as GearRecommendationPayload}
            onPurchaseClick={onPurchaseClick}
            {...commonProps}
          />
        )
      
      case 'route_update':
        return (
          <Component
            payload={messageData.payload as RouteUpdatePayload}
            onRouteNavigate={onRouteNavigate}
            {...commonProps}
          />
        )
      
      case 'safety_alert':
        return (
          <Component
            payload={messageData.payload as SafetyAlertPayload}
            onEmergencyCall={onEmergencyCall}
            onAcknowledge={onAcknowledge}
            {...commonProps}
          />
        )
      
      default:
        return (
          <UnsupportedMessageCard
            messageType={messageData.type}
            description={config.description}
            timestamp={timestamp}
            author={author}
            className={className}
          />
        )
    }

  } catch (error) {
    console.error('Error rendering custom message:', error)
    return (
      <ErrorMessageCard
        error={error instanceof Error ? error.message : 'Unknown error'}
        messageType={messageData.type}
        timestamp={timestamp}
        author={author}
        className={className}
      />
    )
  }
}

export default CustomMessageRenderer

// Экспорт конфигурации для использования в других компонентах
export { MESSAGE_CONFIGS }
