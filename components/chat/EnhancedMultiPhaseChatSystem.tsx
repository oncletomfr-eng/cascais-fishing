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
  LoadingIndicator
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
  Wifi,
  WifiOff,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format, isAfter, isBefore, addDays } from 'date-fns'
import { ru } from 'date-fns/locale'

// Import existing chat types and components
import { 
  ChatPhase,
  EventChat,
  CustomMessageType,
  CustomMessageData,
  DEFAULT_PHASE_CONFIGS
} from '@/lib/types/multi-phase-chat'
import { 
  StreamChatCustomMessage, 
  sendCustomMessage, 
  createCustomMessageData 
} from './custom-messages/StreamChatCustomMessage'

// Import new real-time components
import { useChatSSE } from '@/hooks/useChatSSE'
import {
  OnlineStatusIndicator,
  OnlineUsersList,
  ConnectionStatusIndicator,
  TypingIndicator,
  ReadReceiptStatus,
  useTypingIndicator,
  useReadReceipts
} from './real-time'

// Import Stream Chat styles
import 'stream-chat-react/dist/css/v2/index.css'

// Enhanced Multi-Phase Chat System with Real-time Features
// Part of Task 19: Real-time Integration & SSE

interface EnhancedMultiPhaseChatSystemProps {
  tripId: string
  tripDate: Date
  isOpen?: boolean
  onToggle?: () => void
  enableRealTimeFeatures?: boolean
  className?: string
}

interface EnhancedChatState {
  client: StreamChatClient | null
  eventChat: EventChat | null
  currentPhase: ChatPhase
  isLoading: boolean
  error: string | null
  isMinimized: boolean
  isConnected: boolean
  showRealTimePanel: boolean
  realTimePreferences: {
    showOnlineStatus: boolean
    showTypingIndicators: boolean
    showReadReceipts: boolean
    enableConnectionMonitoring: boolean
  }
}

export function EnhancedMultiPhaseChatSystem({
  tripId,
  tripDate,
  isOpen = false,
  onToggle,
  enableRealTimeFeatures = true,
  className
}: EnhancedMultiPhaseChatSystemProps) {
  const { data: session, status } = useSession()
  const [chatState, setChatState] = useState<EnhancedChatState>({
    client: null,
    eventChat: null,
    currentPhase: ChatPhase.PREPARATION,
    isLoading: false,
    error: null,
    isMinimized: false,
    isConnected: false,
    showRealTimePanel: false,
    realTimePreferences: {
      showOnlineStatus: true,
      showTypingIndicators: true,
      showReadReceipts: true,
      enableConnectionMonitoring: true
    }
  })

  // Initialize Chat SSE for real-time features
  const channelId = `trip-${tripId}`
  const chatSSE = useChatSSE({
    channelIds: [channelId],
    autoReconnect: true,
    preferences: {
      receiveOnlineStatus: chatState.realTimePreferences.showOnlineStatus,
      receiveTypingIndicators: chatState.realTimePreferences.showTypingIndicators,
      receiveReadReceipts: chatState.realTimePreferences.showReadReceipts
    }
  })

  // Initialize typing indicator functionality
  const { startTyping } = useTypingIndicator(
    chatSSE.sendTypingIndicator,
    channelId,
    1000
  )

  // Initialize read receipts functionality
  const { addReceipt, getReceiptsForMessage, markAsRead } = useReadReceipts()

  // Calculate current phase based on trip date
  const calculateCurrentPhase = useCallback((): ChatPhase => {
    const now = new Date()
    const tripStart = new Date(tripDate)
    const dayBeforeTrip = addDays(tripStart, -1)
    const dayAfterTrip = addDays(tripStart, 1)

    if (isBefore(now, dayBeforeTrip)) {
      return ChatPhase.PREPARATION
    } else if (isAfter(now, dayAfterTrip)) {
      return ChatPhase.POST_TRIP
    } else {
      return ChatPhase.DURING_TRIP
    }
  }, [tripDate])

  // Initialize Stream Chat
  useEffect(() => {
    const initializeChat = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return
      
      // Skip if already connected/connecting or client exists
      if (chatState.isLoading || chatState.client) return

      setChatState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        // Check if Stream Chat is configured
        const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
        if (!apiKey || apiKey === 'demo-key' || apiKey === 'demo-key-please-configure') {
          throw new Error('Stream Chat not configured. Please configure NEXT_PUBLIC_STREAM_CHAT_API_KEY.')
        }

        // Get Stream Chat token with timeout
        const tokenResponse = await Promise.race([
          fetch('/api/chat/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Token request timeout')), 10000)
          )
        ])

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json()
          throw new Error(errorData.error || 'Failed to get chat token')
        }

        const { token } = await tokenResponse.json()

        // Initialize Stream Chat client with timeout
        const client = StreamChatClient.getInstance(apiKey)
        
        await Promise.race([
          client.connectUser(
            {
              id: session.user.id,
              name: session.user.name || 'Anonymous',
              image: session.user.image || undefined,
            },
            token
          ),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Stream Chat connection timeout')), 15000)
          )
        ])

        // Get or create channel
        const channel = client.channel('messaging', channelId, {
          name: `Trip ${tripId} Chat`,
          members: [session.user.id],
          created_by_id: session.user.id,
          trip_id: tripId,
          trip_date: tripDate.toISOString()
        })

        await channel.watch()

        const currentPhase = calculateCurrentPhase()
        const phaseConfig = DEFAULT_PHASE_CONFIGS[currentPhase]

        const eventChat: EventChat = {
          id: channelId,
          tripId,
          currentPhase,
          phaseConfig,
          channel,
          participants: new Set([session.user.id]),
          isActive: true
        }

        setChatState(prev => ({
          ...prev,
          client,
          eventChat,
          currentPhase,
          isLoading: false,
          isConnected: true
        }))

      } catch (error) {
        console.error('Failed to initialize enhanced chat:', error)
        
        let errorMessage = 'Failed to initialize chat'
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorMessage = 'Chat service connection timeout. Please check your internet connection and try again.'
          } else if (error.message.includes('not configured')) {
            errorMessage = 'Chat service is not properly configured. Please contact support.'
          } else if (error.message.includes('WS connection could not be established')) {
            errorMessage = 'Chat service is currently unavailable. You can still use other features of the app.'
          } else {
            errorMessage = error.message
          }
        }
        
        setChatState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage
        }))
      }
    }

    // Only initialize if not in error state (allows retry)
    if (!chatState.error) {
      initializeChat()
    }

    return () => {
      if (chatState.client) {
        chatState.client.disconnectUser().catch(console.error)
      }
    }
  }, [status, session, tripId, channelId, tripDate, chatState.error]) // Removed calculateCurrentPhase to prevent re-calls

  // Handle real-time events
  useEffect(() => {
    if (!enableRealTimeFeatures) return

    const unsubscribeMessage = chatSSE.onMessage((event) => {
      console.log('💬 Received real-time message:', event)
      // Handle live message delivery
    })

    const unsubscribeTyping = chatSSE.onTypingIndicator((event) => {
      console.log('⌨️ Typing indicator:', event)
      // Typing indicators are handled by the component state
    })

    const unsubscribeReceipt = chatSSE.onReadReceipt((event) => {
      console.log('✅ Read receipt:', event)
      if (event.data.messageId) {
        addReceipt({
          messageId: event.data.messageId,
          userId: event.userId || '',
          userName: event.data.userName,
          status: event.data.status || 'read',
          timestamp: event.data.timestamp
        })
      }
    })

    const unsubscribeStatus = chatSSE.onUserStatusChange((event) => {
      console.log('👤 User status change:', event)
      // User status updates are handled by the chatSSE state
    })

    return () => {
      unsubscribeMessage()
      unsubscribeTyping()
      unsubscribeReceipt()
      unsubscribeStatus()
    }
  }, [enableRealTimeFeatures, chatSSE, addReceipt])

  // Handle typing events on message input
  const handleTyping = useCallback(() => {
    if (enableRealTimeFeatures && chatState.realTimePreferences.showTypingIndicators) {
      startTyping()
    }
  }, [enableRealTimeFeatures, chatState.realTimePreferences.showTypingIndicators, startTyping])

  // Update preferences and sync with SSE
  const updatePreferences = useCallback(async (newPreferences: Partial<EnhancedChatState['realTimePreferences']>) => {
    const updatedPreferences = { ...chatState.realTimePreferences, ...newPreferences }
    setChatState(prev => ({
      ...prev,
      realTimePreferences: updatedPreferences
    }))

    if (enableRealTimeFeatures) {
      try {
        await chatSSE.updatePreferences({
          receiveOnlineStatus: updatedPreferences.showOnlineStatus,
          receiveTypingIndicators: updatedPreferences.showTypingIndicators,
          receiveReadReceipts: updatedPreferences.showReadReceipts
        })
      } catch (error) {
        console.error('Failed to update SSE preferences:', error)
      }
    }
  }, [chatState.realTimePreferences, enableRealTimeFeatures, chatSSE])

  // Render loading state
  if (chatState.isLoading) {
    return (
      <Card className={cn('w-full h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <LoadingIndicator />
          <span className="ml-2">Подключение к чату...</span>
        </CardContent>
      </Card>
    )
  }

  // Handle retry initialization
  const handleRetryInitialization = () => {
    setChatState(prev => ({ ...prev, error: null, isLoading: true }))
    // The useEffect will be triggered by the state change
  }

  // Render error state
  if (chatState.error) {
    const isConfigurationError = chatState.error.includes('not configured')
    const isConnectionError = chatState.error.includes('unavailable') || chatState.error.includes('timeout')
    
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="text-red-500 mb-2">
              {isConnectionError && (
                <div className="text-orange-500 text-sm mb-2">
                  ⚠️ Chat service temporarily unavailable
                </div>
              )}
              <p className="text-sm">{chatState.error}</p>
            </div>
            
            {!isConfigurationError && (
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryInitialization}
                  variant="outline"
                  size="sm"
                >
                  🔄 Попробовать снова
                </Button>
                <div className="text-xs text-gray-500">
                  Или перезагрузите страницу
                </div>
              </div>
            )}
            
            {isConnectionError && (
              <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                💡 <strong>Подсказка:</strong> Вы все еще можете использовать другие функции приложения. 
                Chat будет автоматически переподключаться при восстановлении соединения.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Main chat interface
  if (!chatState.client || !chatState.eventChat) {
    return null
  }

  const phaseConfig = chatState.eventChat.phaseConfig
  const PhaseIcon = phaseConfig.icon

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Enhanced Header with Real-time Status */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <PhaseIcon className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">{phaseConfig.title}</h3>
            <p className="text-sm text-muted-foreground">{phaseConfig.description}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Connection Status */}
          {enableRealTimeFeatures && chatState.realTimePreferences.enableConnectionMonitoring && (
            <ConnectionStatusIndicator
              status={chatSSE.connectionStatus.status}
              quality={chatSSE.connectionStatus.quality}
            />
          )}

          {/* Online Users Count */}
          {enableRealTimeFeatures && chatState.realTimePreferences.showOnlineStatus && (
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {chatSSE.onlineUsers.size} онлайн
            </Badge>
          )}

          {/* Settings Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setChatState(prev => ({ 
              ...prev, 
              showRealTimePanel: !prev.showRealTimePanel 
            }))}
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Minimize/Close */}
          {onToggle && (
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <Chat client={chatState.client}>
            <Channel channel={chatState.eventChat.channel}>
              <Window>
                <ChannelHeader />
                
                {/* Typing Indicators */}
                {enableRealTimeFeatures && 
                 chatState.realTimePreferences.showTypingIndicators && 
                 chatSSE.typingUsers.size > 0 && (
                  <div className="px-4 py-2 border-b">
                    <TypingIndicator
                      typingUsers={chatSSE.typingUsers}
                      currentUserId={session?.user?.id}
                      variant="detailed"
                      showAvatars={true}
                    />
                  </div>
                )}

                <MessageList 
                  Message={StreamChatCustomMessage}
                  messageActions={['react', 'reply', 'edit', 'delete']}
                />
                
                <MessageInput 
                  onFocus={handleTyping}
                  onChange={handleTyping}
                  placeholder={`${phaseConfig.title} - напишите сообщение...`}
                />
              </Window>
              <Thread />
            </Channel>
          </Chat>
        </div>

        {/* Real-time Panel */}
        <AnimatePresence>
          {enableRealTimeFeatures && chatState.showRealTimePanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l bg-background/50 overflow-hidden"
            >
              <div className="p-4 space-y-4 h-full overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Real-time настройки</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatState(prev => ({ 
                      ...prev, 
                      showRealTimePanel: false 
                    }))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <Separator />

                {/* Online Users */}
                {chatState.realTimePreferences.showOnlineStatus && (
                  <div className="space-y-2">
                    <OnlineUsersList
                      users={chatSSE.onlineUsers}
                      currentUserId={session?.user?.id}
                      maxVisible={8}
                    />
                  </div>
                )}

                <Separator />

                {/* Real-time Preferences */}
                <div className="space-y-4">
                  <h5 className="font-medium">Настройки</h5>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="online-status" className="text-sm">
                        Показывать онлайн статус
                      </Label>
                      <Switch
                        id="online-status"
                        checked={chatState.realTimePreferences.showOnlineStatus}
                        onCheckedChange={(checked) => 
                          updatePreferences({ showOnlineStatus: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="typing-indicators" className="text-sm">
                        Индикаторы печати
                      </Label>
                      <Switch
                        id="typing-indicators"
                        checked={chatState.realTimePreferences.showTypingIndicators}
                        onCheckedChange={(checked) => 
                          updatePreferences({ showTypingIndicators: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="read-receipts" className="text-sm">
                        Подтверждения прочтения
                      </Label>
                      <Switch
                        id="read-receipts"
                        checked={chatState.realTimePreferences.showReadReceipts}
                        onCheckedChange={(checked) => 
                          updatePreferences({ showReadReceipts: checked })
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="connection-monitoring" className="text-sm">
                        Мониторинг соединения
                      </Label>
                      <Switch
                        id="connection-monitoring"
                        checked={chatState.realTimePreferences.enableConnectionMonitoring}
                        onCheckedChange={(checked) => 
                          updatePreferences({ enableConnectionMonitoring: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Connection Info */}
                <Separator />
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Качество связи:</span>
                    <span className={cn(
                      chatSSE.connectionStatus.quality === 'good' ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {chatSSE.connectionStatus.quality === 'good' ? 'Хорошее' : 'Плохое'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Последний heartbeat:</span>
                    <span>
                      {chatSSE.connectionStatus.lastHeartbeat 
                        ? format(chatSSE.connectionStatus.lastHeartbeat, 'HH:mm:ss')
                        : 'Нет'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Попытки переподключения:</span>
                    <span>{chatSSE.connectionStatus.reconnectAttempts}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
