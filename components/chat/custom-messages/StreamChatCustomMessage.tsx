'use client'

import React from 'react'
import { useMessageContext, useChannelStateContext } from 'stream-chat-react'
import type { DefaultStreamChatGenerics } from 'stream-chat-react'

import CustomMessageRenderer from './CustomMessageRenderer'
import type { 
  CustomMessageData, 
  CustomMessageType 
} from '@/lib/types/multi-phase-chat'

// Типы для Stream Chat интеграции
interface CustomStreamMessage extends DefaultStreamChatGenerics {
  type: 'custom'
  custom_type?: CustomMessageType
  custom_data?: any
  text?: string
}

interface StreamChatCustomMessageProps {
  // Дополнительные обработчики событий
  onImageClick?: (imageUrl: string) => void
  onNavigateClick?: (coordinates: { lat: number, lng: number }) => void
  onPurchaseClick?: (link: string) => void
  onRouteNavigate?: (waypoints: { lat: number, lng: number }[]) => void
  onEmergencyCall?: (contact: { name: string, phone: string, type: string }) => void
  onAcknowledge?: (alertId: string) => void
}

// Компонент для отображения кастомных сообщений в Stream Chat
export function StreamChatCustomMessage({
  onImageClick,
  onNavigateClick,
  onPurchaseClick,
  onRouteNavigate,
  onEmergencyCall,
  onAcknowledge
}: StreamChatCustomMessageProps) {
  const { message } = useMessageContext()
  const { channel } = useChannelStateContext()

  // Проверяем, что это кастомное сообщение
  if (message.type !== 'custom' || !message.custom_type) {
    return null
  }

  try {
    // Парсим данные кастомного сообщения
    const customData = message.custom_data as CustomMessageData | undefined
    
    if (!customData || !customData.type || !customData.payload) {
      console.error('Invalid custom message data:', message)
      return (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            ⚠️ Неверный формат кастомного сообщения
          </p>
        </div>
      )
    }

    // Получаем информацию об авторе
    const author = message.user ? {
      name: message.user.name || message.user.id || 'Unknown',
      role: message.user.role as string | undefined
    } : undefined

    // Рендерим кастомное сообщение
    return (
      <div className="custom-stream-message">
        <CustomMessageRenderer
          messageData={customData}
          timestamp={new Date(message.created_at || Date.now())}
          author={author}
          className="max-w-none" // Убираем ограничение ширины в Stream Chat
          onImageClick={onImageClick}
          onNavigateClick={onNavigateClick}
          onPurchaseClick={onPurchaseClick}
          onRouteNavigate={onRouteNavigate}
          onEmergencyCall={onEmergencyCall}
          onAcknowledge={onAcknowledge}
        />
        
        {/* Дополнительный текст сообщения, если есть */}
        {message.text && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
            {message.text}
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error('Error rendering Stream Chat custom message:', error)
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">
          ⚠️ Ошибка отображения кастомного сообщения
        </p>
        <p className="text-xs text-red-500 mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    )
  }
}

export default StreamChatCustomMessage

// Хелпер-функция для отправки кастомного сообщения в Stream Chat
export const sendCustomMessage = async (
  channel: any,
  messageData: CustomMessageData,
  additionalText?: string
) => {
  try {
    const message = {
      type: 'custom',
      custom_type: messageData.type,
      custom_data: messageData,
      text: additionalText || undefined,
      // Дополнительные мета-данные для Stream Chat
      meta: {
        trip_id: messageData.tripId,
        phase: messageData.phase,
        custom_type: messageData.type,
        created_at: messageData.timestamp.toISOString()
      }
    }

    await channel.sendMessage(message)
    console.log(`✅ Sent custom message: ${messageData.type}`)
    
    return { success: true }
  } catch (error) {
    console.error('❌ Error sending custom message:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

// Хелпер-функция для создания данных кастомного сообщения
export const createCustomMessageData = (
  type: CustomMessageType,
  payload: any,
  tripId: string,
  phase: 'preparation' | 'live' | 'debrief',
  authorId: string
): CustomMessageData => {
  return {
    type,
    payload,
    timestamp: new Date(),
    phase,
    tripId,
    authorId
  }
}

// Конфигурация для Stream Chat
export const streamChatCustomMessageConfig = {
  // Кастомные компоненты для разных типов сообщений
  Message: StreamChatCustomMessage,
  
  // Дополнительные стили для кастомных сообщений
  customStyles: {
    '.custom-stream-message': {
      marginBottom: '8px'
    },
    '.custom-stream-message .custom-card': {
      maxWidth: '400px',
      margin: '0 auto'
    }
  }
}
