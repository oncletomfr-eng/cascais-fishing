'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { 
  Chat, 
  Channel, 
  MessageList, 
  MessageInput, 
  ChannelHeader,
  Thread,
  Window,
  LoadingIndicator,
  useChannelActionContext,
  useChannelStateContext,
  useMessageInputContext
} from 'stream-chat-react'
import { StreamChat as StreamChatClient } from 'stream-chat'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle, 
  Cloud,
  Camera,
  MapPin,
  Lightbulb,
  Clock,
  Users,
  Settings,
  X,
  Minimize2,
  Maximize2,
  ChevronRight,
  Calendar,
  Waves,
  Fish,
  Compass
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'

import { 
  ChatPhase,
  EventChat,
  CustomMessageType,
  CustomMessageData,
  DEFAULT_PHASE_CONFIGS,
  WeatherUpdatePayload,
  CatchPhotoPayload,
  LocationSharePayload,
  FishingTipPayload
} from '@/lib/types/multi-phase-chat'

// Import Stream Chat styles
import 'stream-chat-react/dist/css/v2/index.css'

interface MultiPhaseChatSystemProps {
  tripId: string
  tripDate: Date
  isOpen?: boolean
  onToggle?: () => void
  className?: string
}

interface ChatState {
  client: StreamChatClient | null
  eventChat: EventChat | null
  currentPhase: ChatPhase
  isLoading: boolean
  error: string | null
  isMinimized: boolean
  isConnected: boolean
}

/**
 * 💬 Многофазная система чатов для рыболовных событий
 * Поддерживает 3 фазы: подготовка, процесс, подведение итогов
 */
export function MultiPhaseChatSystem({
  tripId,
  tripDate,
  isOpen = false,
  onToggle,
  className
}: MultiPhaseChatSystemProps) {
  const { data: session, status } = useSession()
  const [chatState, setChatState] = useState<ChatState>({
    client: null,
    eventChat: null,
    currentPhase: 'preparation',
    isLoading: false,
    error: null,
    isMinimized: false,
    isConnected: false
  })

  // Определить текущую фазу на основе даты поездки
  const determineCurrentPhase = useCallback((): ChatPhase => {
    const now = new Date()
    const daysDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 0) {
      return 'preparation'
    } else if (daysDiff > -1) {
      return 'live'
    } else {
      return 'debrief'
    }
  }, [tripDate])

  // Инициализация многофазного чата
  const initializeMultiPhaseChat = useCallback(async () => {
    if (!session?.user?.id || status !== 'authenticated') {
      return
    }

    setChatState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      console.log('🔗 Initializing multi-phase chat for trip:', tripId)

      // Получить токен для Stream Chat
      const tokenResponse = await fetch('/api/chat/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get chat token')
      }

      const tokenData = await tokenResponse.json()
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to get chat token')
      }

      // Инициализировать Stream Chat клиент
      const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
      if (!apiKey) {
        throw new Error('Stream Chat API key not configured')
      }

      const client = StreamChatClient.getInstance(apiKey)
      
      // Подключить пользователя
      await client.connectUser(
        {
          id: session.user.id,
          name: session.user.name || 'Anonymous User',
          image: session.user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.name || 'User')}&background=0ea5e9&color=fff`
        },
        tokenData.token
      )

      console.log('✅ Stream Chat client initialized')

      // Получить или создать многофазный чат
      const chatResponse = await fetch('/api/chat/multi-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          action: 'get'
        })
      })

      if (!chatResponse.ok) {
        // Если чата нет, создаем новый
        const createResponse = await fetch('/api/chat/multi-phase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            action: 'create'
          })
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create multi-phase chat')
        }

        const createData = await createResponse.json()
        if (!createData.success) {
          throw new Error(createData.error)
        }

        setChatState(prev => ({
          ...prev,
          client,
          eventChat: createData.data.eventChat,
          currentPhase: determineCurrentPhase(),
          isConnected: true,
          isLoading: false
        }))
      } else {
        const chatData = await chatResponse.json()
        if (!chatData.success) {
          throw new Error(chatData.error)
        }

        setChatState(prev => ({
          ...prev,
          client,
          eventChat: chatData.data.eventChat,
          currentPhase: chatData.data.currentPhase || determineCurrentPhase(),
          isConnected: true,
          isLoading: false
        }))
      }

      console.log('✅ Multi-phase chat initialized successfully')

    } catch (error) {
      console.error('❌ Error initializing multi-phase chat:', error)
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize chat',
        isLoading: false
      }))
    }
  }, [session, status, tripId, determineCurrentPhase])

  // Переключить фазу чата
  const switchPhase = async (newPhase: ChatPhase) => {
    if (!chatState.client || newPhase === chatState.currentPhase) {
      return
    }

    try {
      console.log(`🔄 Switching to ${newPhase} phase`)

      const response = await fetch('/api/chat/multi-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          action: 'switch_phase',
          phase: newPhase
        })
      })

      if (!response.ok) {
        throw new Error('Failed to switch chat phase')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error)
      }

      setChatState(prev => ({
        ...prev,
        currentPhase: newPhase
      }))

      console.log(`✅ Switched to ${newPhase} phase`)

    } catch (error) {
      console.error('❌ Error switching phase:', error)
    }
  }

  // Отправить кастомное сообщение
  const sendCustomMessage = async (type: CustomMessageType, payload: any) => {
    try {
      console.log(`📨 Sending ${type} message`)

      const response = await fetch('/api/chat/multi-phase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          action: 'send_custom',
          customMessage: {
            type,
            payload,
            phase: chatState.currentPhase
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send custom message')
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error)
      }

      console.log(`✅ Custom message sent: ${type}`)

    } catch (error) {
      console.error('❌ Error sending custom message:', error)
    }
  }

  // Инициализация при монтировании
  useEffect(() => {
    if (isOpen) {
      initializeMultiPhaseChat()
    }
  }, [isOpen, initializeMultiPhaseChat])

  // Обновление текущей фазы по времени
  useEffect(() => {
    const interval = setInterval(() => {
      const newPhase = determineCurrentPhase()
      if (newPhase !== chatState.currentPhase) {
        switchPhase(newPhase)
      }
    }, 60000) // Проверяем каждую минуту

    return () => clearInterval(interval)
  }, [chatState.currentPhase, determineCurrentPhase])

  if (!isOpen) {
    return null
  }

  if (!session?.user?.id) {
    return (
      <div className="fixed bottom-4 right-4 w-96 h-96 bg-white rounded-lg shadow-lg p-4">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p className="text-gray-600">Войдите в систему для доступа к чату</p>
        </div>
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className={cn(
          "fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border z-50",
          chatState.isMinimized ? "w-80 h-14" : "w-96 h-[600px]",
          className
        )}
      >
        {chatState.client && chatState.eventChat ? (
          <Chat client={chatState.client}>
            <div className="h-full flex flex-col">
              {/* Header */}
              <MultiPhaseChatHeader
                currentPhase={chatState.currentPhase}
                eventChat={chatState.eventChat}
                onPhaseChange={switchPhase}
                onMinimize={() => setChatState(prev => ({ ...prev, isMinimized: !prev.isMinimized }))}
                onClose={onToggle}
                isMinimized={chatState.isMinimized}
              />

              {/* Content */}
              {!chatState.isMinimized && (
                <div className="flex-1 flex flex-col">
                  {/* Phase Tabs */}
                  <PhaseTabs
                    currentPhase={chatState.currentPhase}
                    eventChat={chatState.eventChat}
                    onPhaseChange={switchPhase}
                  />

                  {/* Chat Content */}
                  <div className="flex-1 overflow-hidden">
                    <MultiPhaseChannelContent
                      eventChat={chatState.eventChat}
                      currentPhase={chatState.currentPhase}
                      client={chatState.client}
                      onCustomMessage={sendCustomMessage}
                    />
                  </div>
                </div>
              )}
            </div>
          </Chat>
        ) : (
          <div className="h-full flex items-center justify-center">
            {chatState.isLoading ? (
              <LoadingIndicator />
            ) : chatState.error ? (
              <div className="text-center text-red-600 p-4">
                <X className="w-8 h-8 mx-auto mb-2" />
                <p>Ошибка чата: {chatState.error}</p>
                <Button 
                  onClick={initializeMultiPhaseChat}
                  size="sm"
                  className="mt-2"
                >
                  Попробовать снова
                </Button>
              </div>
            ) : (
              <div className="text-center p-4">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600">Инициализация чата...</p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

// Header компонент с информацией о текущей фазе
function MultiPhaseChatHeader({
  currentPhase,
  eventChat,
  onPhaseChange,
  onMinimize,
  onClose,
  isMinimized
}: {
  currentPhase: ChatPhase
  eventChat: EventChat
  onPhaseChange: (phase: ChatPhase) => void
  onMinimize: () => void
  onClose?: () => void
  isMinimized: boolean
}) {
  const config = DEFAULT_PHASE_CONFIGS[currentPhase]

  return (
    <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
      <div className="flex items-center space-x-2">
        <span className="text-xl">{config.icon}</span>
        <div>
          <h4 className="font-semibold text-sm">{config.title}</h4>
          {!isMinimized && (
            <p className="text-xs text-gray-600">{config.description}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button onClick={onMinimize} size="sm" variant="ghost" className="h-8 w-8 p-0">
          {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </Button>
        {onClose && (
          <Button onClick={onClose} size="sm" variant="ghost" className="h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Tabs для переключения между фазами
function PhaseTabs({
  currentPhase,
  eventChat,
  onPhaseChange
}: {
  currentPhase: ChatPhase
  eventChat: EventChat
  onPhaseChange: (phase: ChatPhase) => void
}) {
  const phases: ChatPhase[] = ['preparation', 'live', 'debrief']

  return (
    <div className="border-b bg-gray-50">
      <div className="flex">
        {phases.map((phase) => {
          const config = DEFAULT_PHASE_CONFIGS[phase]
          const chat = eventChat.phases[phase]
          
          return (
            <button
              key={phase}
              onClick={() => onPhaseChange(phase)}
              className={cn(
                "flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors",
                currentPhase === phase
                  ? "border-blue-500 text-blue-600 bg-white"
                  : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center justify-center space-x-1">
                <span>{config.icon}</span>
                <span>{phase === 'preparation' ? 'Подготовка' : phase === 'live' ? 'Процесс' : 'Итоги'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Контент канала с кастомными сообщениями
function MultiPhaseChannelContent({
  eventChat,
  currentPhase,
  client,
  onCustomMessage
}: {
  eventChat: EventChat
  currentPhase: ChatPhase
  client: StreamChatClient
  onCustomMessage: (type: CustomMessageType, payload: any) => void
}) {
  const currentChat = eventChat.phases[currentPhase]
  const channelId = `trip-${currentChat.channelId.split('-')[1]}-${currentPhase}`

  // Получить канал для текущей фазы
  const channel = client.channel('messaging', channelId)

  return (
    <div className="h-full flex flex-col">
      <Channel channel={channel}>
        <Window>
          <CustomChannelHeader />
          <MessageList />
          <CustomMessageInput 
            onCustomMessage={onCustomMessage}
            currentPhase={currentPhase}
            features={eventChat.features}
          />
        </Window>
        <Thread />
      </Channel>
    </div>
  )
}

// Кастомный header канала
function CustomChannelHeader() {
  const { channel } = useChannelStateContext()
  
  return (
    <div className="flex items-center justify-between p-2 bg-white border-b">
      <div className="flex items-center space-x-2">
        <Users className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium">
          {Object.keys(channel.state.members).length} участников
        </span>
      </div>
    </div>
  )
}

// Кастомный input с кнопками для специальных сообщений
function CustomMessageInput({
  onCustomMessage,
  currentPhase,
  features
}: {
  onCustomMessage: (type: CustomMessageType, payload: any) => void
  currentPhase: ChatPhase
  features: EventChat['features']
}) {

  const handleCustomMessage = (type: CustomMessageType) => {
    // Здесь можно открыть модал для ввода данных
    // Пока отправляем демо-данные
    const demoPayloads: Record<string, any> = {
      weather_update: {
        condition: 'Солнечно',
        temperature: 22,
        windSpeed: 5,
        waveHeight: 0.5,
        visibility: 10,
        forecast: 'Хорошие условия для рыбалки',
        severity: 'low' as const,
        source: 'captain' as const
      },
      catch_photo: {
        imageUrl: '/atlantic-fish-catch.png',
        fishSpecies: 'Дорада',
        fishSize: 35,
        fishWeight: 1.2,
        timeOfCatch: new Date()
      },
      location_share: {
        coordinates: { lat: 38.7167, lng: -9.4167 },
        locationName: 'Отличное место для рыбалки',
        locationType: 'fishing_spot' as const,
        timestamp: new Date()
      },
      fishing_tip: {
        category: 'technique' as const,
        title: 'Совет по ловле дорады',
        description: 'Используйте живую сардину на глубине 15-20 метров',
        difficulty: 'intermediate' as const,
        author: {
          id: 'current-user',
          name: 'Капитан Жуан',
          experienceLevel: 'captain' as const
        }
      },
      gear_recommendation: {
        category: 'equipment' as const,
        title: 'Рекомендация снастей',
        description: 'Лучшие снасти для этих условий',
        difficulty: 'beginner' as const,
        author: {
          id: 'current-user',
          name: 'Капитан',
          experienceLevel: 'captain' as const
        }
      },
      route_update: {
        coordinates: { lat: 38.7167, lng: -9.4167 },
        locationName: 'Новый маршрут',
        locationType: 'boat_position' as const,
        timestamp: new Date(),
        notes: 'Обновление маршрута'
      },
      safety_alert: {
        category: 'safety' as const,
        title: 'Предупреждение безопасности',
        description: 'Важная информация о безопасности',
        difficulty: 'beginner' as const,
        author: {
          id: 'current-user',
          name: 'Капитан',
          experienceLevel: 'captain' as const
        }
      }
    }

    const payload = demoPayloads[type]
    if (payload) {
      onCustomMessage(type, payload)
    }
  }

  return (
    <div className="border-t bg-white">
      {/* Кнопки для кастомных сообщений */}
      <div className="flex items-center gap-2 p-2 border-b">
        {features.weatherUpdates && (
          <Button
            onClick={() => handleCustomMessage('weather_update')}
            size="sm"
            variant="outline"
            className="h-8 px-2"
          >
            <Cloud className="w-4 h-4 mr-1" />
            Погода
          </Button>
        )}
        
        {features.catchPhotos && (
          <Button
            onClick={() => handleCustomMessage('catch_photo')}
            size="sm"
            variant="outline"
            className="h-8 px-2"
          >
            <Camera className="w-4 h-4 mr-1" />
            Улов
          </Button>
        )}
        
        {features.locationSharing && (
          <Button
            onClick={() => handleCustomMessage('location_share')}
            size="sm"
            variant="outline"
            className="h-8 px-2"
          >
            <MapPin className="w-4 h-4 mr-1" />
            Локация
          </Button>
        )}
        
        {features.tipSharing && (
          <Button
            onClick={() => handleCustomMessage('fishing_tip')}
            size="sm"
            variant="outline"
            className="h-8 px-2"
          >
            <Lightbulb className="w-4 h-4 mr-1" />
            Совет
          </Button>
        )}
      </div>
      
      {/* Стандартный input */}
      <MessageInput />
    </div>
  )
}
