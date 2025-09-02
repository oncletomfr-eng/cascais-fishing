import type { 
  WeatherUpdatePayload, 
  CatchPhotoPayload,
  LocationSharePayload,
  FishingTipPayload,
  GearRecommendationPayload,
  RouteUpdatePayload,
  SafetyAlertPayload,
  CustomMessageType,
  CustomMessageData
} from '@/lib/types/multi-phase-chat'

// Базовый тип для пропсов всех кастомных карточек
export interface BaseCustomMessageProps {
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
}

// Типы пропсов для каждого компонента карточки
export interface WeatherUpdateCardProps extends BaseCustomMessageProps {
  payload: WeatherUpdatePayload
}

export interface CatchPhotoCardProps extends BaseCustomMessageProps {
  payload: CatchPhotoPayload
  onImageClick?: (imageUrl: string) => void
}

export interface LocationShareCardProps extends BaseCustomMessageProps {
  payload: LocationSharePayload
  onNavigateClick?: (coordinates: { lat: number, lng: number }) => void
}

export interface FishingTipCardProps extends BaseCustomMessageProps {
  payload: FishingTipPayload
  onImageClick?: (imageUrl: string) => void
}

export interface GearRecommendationCardProps extends BaseCustomMessageProps {
  payload: GearRecommendationPayload
  onPurchaseClick?: (link: string) => void
}

export interface RouteUpdateCardProps extends BaseCustomMessageProps {
  payload: RouteUpdatePayload
  onRouteNavigate?: (waypoints: { lat: number, lng: number }[]) => void
}

export interface SafetyAlertCardProps extends BaseCustomMessageProps {
  payload: SafetyAlertPayload
  onEmergencyCall?: (contact: { name: string, phone: string, type: string }) => void
  onAcknowledge?: (alertId: string) => void
}

// Пропсы для главного рендер компонента
export interface CustomMessageRendererProps {
  messageData: CustomMessageData
  timestamp: Date
  author?: {
    name: string
    role?: string
  }
  className?: string
  
  // Опциональные callback'и для различных действий
  onImageClick?: (imageUrl: string) => void
  onNavigateClick?: (coordinates: { lat: number, lng: number }) => void
  onPurchaseClick?: (link: string) => void
  onRouteNavigate?: (waypoints: { lat: number, lng: number }[]) => void
  onEmergencyCall?: (contact: { name: string, phone: string, type: string }) => void
  onAcknowledge?: (alertId: string) => void
}

// Типы для интеграции со Stream Chat
export interface StreamChatCustomMessage {
  type: 'custom'
  customType: CustomMessageType
  customData: CustomMessageData
  timestamp: string
  author: {
    id: string
    name: string
    role?: string
  }
}

// Конфигурация для рендера кастомных сообщений
export interface CustomMessageConfig {
  type: CustomMessageType
  component: React.ComponentType<any>
  description: string
  category: 'information' | 'media' | 'navigation' | 'recommendation' | 'safety'
  allowedInPhases: ('preparation' | 'live' | 'debrief')[]
  requiresVerification?: boolean
}

// Метаданные сообщения для Stream Chat
export interface CustomMessageMetadata {
  tripId: string
  phase: 'preparation' | 'live' | 'debrief'
  customType: CustomMessageType
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  expiresAt?: Date
  relatedMessages?: string[]
}
