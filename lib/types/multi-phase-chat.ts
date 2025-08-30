import { Channel } from 'stream-chat'

/**
 * 💬 Многоуровневая система чатов для рыболовных событий
 * Согласно ТЗ: чаты до, во время и после события с различным функционалом
 */

// Фазы чата для рыболовного события
export type ChatPhase = 'preparation' | 'live' | 'debrief'

// Тип чата на основе интерфейса из ТЗ
export interface EventChat {
  phases: {
    preparation: Chat  // За неделю до события 
    live: Chat        // Во время рыбалки
    debrief: Chat     // После возвращения
  }
  
  features: {
    weatherUpdates: boolean    // Погодные обновления
    catchPhotos: boolean       // Фото улова
    locationSharing: boolean   // Координаты и локации
    tipSharing: boolean        // Советы по рыбалке
  }
}

// Отдельный чат для каждой фазы
export interface Chat {
  channelId: string
  phase: ChatPhase
  channel: Channel | null
  isActive: boolean
  startDate?: Date
  endDate?: Date
  
  // Stream Chat channel reference
  streamChannel?: any
  
  // Специфичные для фазы настройки
  phaseConfig: ChatPhaseConfig
}

// Конфигурация для каждой фазы чата
export interface ChatPhaseConfig {
  phase: ChatPhase
  title: string
  description: string
  icon: string
  color: string
  
  // Доступные функции в этой фазе
  allowedFeatures: ChatFeature[]
  
  // Автоматические сообщения
  autoMessages: AutoMessage[]
  
  // Ограничения по времени
  timeRestrictions?: {
    activeBefore?: number // дней до события
    activeAfter?: number  // дней после события
    autoArchive?: boolean // архивировать автоматически
  }
}

// Возможности чата
export type ChatFeature = 
  | 'text_messages'
  | 'weather_updates' 
  | 'catch_photos'
  | 'location_sharing'
  | 'tip_sharing'
  | 'polls'
  | 'file_sharing'
  | 'voice_messages'
  | 'video_calls'

// Автоматические сообщения системы
export interface AutoMessage {
  id: string
  type: 'welcome' | 'reminder' | 'weather_alert' | 'phase_transition'
  trigger: 'phase_start' | 'time_based' | 'weather_change' | 'event_based'
  content: string
  delay?: number // задержка в секундах после триггера
  conditions?: Record<string, any> // условия для отправки
}

// Кастомные типы сообщений
export type CustomMessageType = 
  | 'weather_update'
  | 'catch_photo'
  | 'location_share'
  | 'fishing_tip'
  | 'gear_recommendation'
  | 'route_update'
  | 'safety_alert'

// Структура кастомного сообщения
export interface CustomMessageData {
  type: CustomMessageType
  payload: WeatherUpdatePayload | CatchPhotoPayload | LocationSharePayload | FishingTipPayload
  timestamp: Date
  phase: ChatPhase
  tripId: string
  authorId: string
}

// Payloads для разных типов сообщений

export interface WeatherUpdatePayload {
  condition: string
  temperature: number
  windSpeed: number
  waveHeight: number
  visibility: number
  forecast: string
  severity: 'low' | 'medium' | 'high'
  source: 'automatic' | 'captain' | 'weather_service'
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface CatchPhotoPayload {
  imageUrl: string
  fishSpecies?: string
  fishSize?: number
  fishWeight?: number
  location?: {
    lat: number
    lng: number
    name?: string
  }
  technique?: string
  bait?: string
  depth?: number
  timeOfCatch: Date
  notes?: string
}

export interface LocationSharePayload {
  coordinates: {
    lat: number
    lng: number
  }
  locationName?: string
  locationType: 'fishing_spot' | 'boat_position' | 'meeting_point' | 'harbor' | 'danger_zone'
  accuracy?: number
  heading?: number
  speed?: number
  timestamp: Date
  notes?: string
}

export interface FishingTipPayload {
  category: 'technique' | 'bait' | 'equipment' | 'location' | 'weather' | 'safety'
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  species?: string[]
  conditions?: string[]
  images?: string[]
  author: {
    id: string
    name: string
    experienceLevel: 'novice' | 'experienced' | 'expert' | 'captain'
  }
  rating?: number
  verified?: boolean
}

// Конфигурации фаз по умолчанию
export const DEFAULT_PHASE_CONFIGS: Record<ChatPhase, ChatPhaseConfig> = {
  preparation: {
    phase: 'preparation',
    title: '🎣 Подготовка к поездке',
    description: 'Обсуждение снастей, планов, знакомство с участниками',
    icon: '📋',
    color: '#3B82F6', // blue
    allowedFeatures: [
      'text_messages',
      'weather_updates',
      'tip_sharing',
      'file_sharing',
      'polls'
    ],
    autoMessages: [
      {
        id: 'welcome',
        type: 'welcome',
        trigger: 'phase_start',
        content: '🎣 Добро пожаловать в чат подготовки к рыболовной поездке! Здесь мы обсудим снаряжение, планы и познакомимся друг с другом.'
      },
      {
        id: 'weather_reminder', 
        type: 'reminder',
        trigger: 'time_based',
        content: '🌤️ Не забудьте проверить прогноз погоды перед поездкой!',
        delay: 86400 // 24 часа
      }
    ],
    timeRestrictions: {
      activeBefore: 7, // активен за неделю
      autoArchive: false
    }
  },
  
  live: {
    phase: 'live',
    title: '🚤 В процессе рыбалки',
    description: 'Координация, советы, фото улова в реальном времени',
    icon: '🎣',
    color: '#10B981', // green
    allowedFeatures: [
      'text_messages',
      'catch_photos',
      'location_sharing',
      'weather_updates',
      'tip_sharing',
      'voice_messages'
    ],
    autoMessages: [
      {
        id: 'trip_start',
        type: 'welcome',
        trigger: 'phase_start',
        content: '🚤 Поездка началась! Поделитесь своими уловами, координатами лучших мест и советами.'
      }
    ],
    timeRestrictions: {
      activeBefore: 0,
      activeAfter: 1,
      autoArchive: false
    }
  },
  
  debrief: {
    phase: 'debrief',
    title: '📸 После поездки',
    description: 'Обмен впечатлениями, фото, планирование следующих поездок',
    icon: '🌅',
    color: '#F59E0B', // amber
    allowedFeatures: [
      'text_messages',
      'catch_photos',
      'tip_sharing',
      'file_sharing',
      'polls'
    ],
    autoMessages: [
      {
        id: 'debrief_start',
        type: 'welcome',
        trigger: 'phase_start',
        content: '🌅 Поездка завершена! Поделитесь впечатлениями, лучшими фото и планами на будущее.'
      },
      {
        id: 'next_trip',
        type: 'reminder',
        trigger: 'time_based',
        content: '🎣 Планируете следующую поездку? Обсудим!',
        delay: 172800 // 48 часов
      }
    ],
    timeRestrictions: {
      activeBefore: 0,
      activeAfter: 30, // активен месяц после
      autoArchive: true
    }
  }
}

// События многофазного чата
export interface MultiPhaseChatEvent {
  type: 'phase_changed' | 'message_sent' | 'feature_used' | 'auto_message_triggered'
  phase: ChatPhase
  tripId: string
  userId?: string
  data?: any
  timestamp: Date
}

// Статистика использования чата
export interface ChatPhaseStats {
  phase: ChatPhase
  messagesCount: number
  participantsCount: number
  customMessagesCount: Record<CustomMessageType, number>
  averageResponseTime: number
  mostActiveUsers: string[]
  peakActivityTime?: Date
}

// Менеджер многофазного чата  
export interface MultiPhaseChatManager {
  tripId: string
  currentPhase: ChatPhase
  phases: Record<ChatPhase, Chat>
  features: EventChat['features']
  
  // Методы управления
  switchPhase(phase: ChatPhase): Promise<void>
  getCurrentChat(): Chat | null
  sendCustomMessage(type: CustomMessageType, payload: any): Promise<void>
  getPhaseStats(phase: ChatPhase): ChatPhaseStats
  
  // События
  onPhaseChange?: (phase: ChatPhase) => void
  onCustomMessage?: (message: CustomMessageData) => void
}
