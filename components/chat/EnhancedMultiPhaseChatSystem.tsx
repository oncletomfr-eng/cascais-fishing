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
  TypingIndicator,
  ReadReceiptStatus,
  useTypingIndicator,
  useReadReceipts
} from './real-time'

// Import robust connection manager and status components
import { 
  RobustStreamChatConnectionManager,
  ConnectionState,
  ConnectionQuality,
  ConnectionStrategy,
  ConnectionEvent,
  createRetryableTokenProvider
} from '@/lib/chat/robust-connection-manager'
import { 
  ConnectionStatusIndicator,
  ProgressiveLoadingStates,
  ConnectionEventToast
} from './connection-status/ConnectionStatusIndicator'

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
  eventChat: {
    id: string
    tripId: string
    currentPhase: ChatPhase
    phaseConfig: any
    channel: any
    participants: Set<string>
    isActive: boolean
  } | null
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
  // Robust connection fields
  connectionManager: RobustStreamChatConnectionManager | null
  connectionState: ConnectionState
  connectionQuality: ConnectionQuality
  connectionStrategy: ConnectionStrategy
  connectionAttempt: number
  maxAttempts: number
  connectionEvents: ConnectionEvent[]
  showConnectionToast: boolean
  currentLoadingPhase: 'initializing' | 'diagnostics' | 'connecting' | 'authenticating' | 'syncing'
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
    },
    // Robust connection initial state
    connectionManager: null,
    connectionState: ConnectionState.DISCONNECTED,
    connectionQuality: ConnectionQuality.EXCELLENT,
    connectionStrategy: ConnectionStrategy.DIRECT_WEBSOCKET,
    connectionAttempt: 0,
    maxAttempts: 5,
    connectionEvents: [],
    showConnectionToast: false,
    currentLoadingPhase: 'initializing'
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

  // Initialize Robust Stream Chat Connection
  useEffect(() => {
    const initializeRobustChat = async () => {
      if (status !== 'authenticated' || !session?.user?.id) return
      
      // Skip if already connected/connecting or manager exists
      if (chatState.isLoading || chatState.connectionManager) return

      // Check if Stream Chat is configured
      const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
      if (!apiKey || apiKey === 'demo-key' || apiKey === 'demo-key-please-configure') {
        setChatState(prev => ({
          ...prev,
          error: 'Stream Chat not configured. Please configure NEXT_PUBLIC_STREAM_CHAT_API_KEY.',
          connectionState: ConnectionState.FAILED
        }))
        return
      }

      // Initialize connection manager with FAST UX config
      const connectionManager = new RobustStreamChatConnectionManager({
        baseTimeout: 3000,         // 3s base timeout (5x faster!)
        maxTimeout: 8000,          // 8s max timeout (11x faster!)  
        extendedTimeout: 12000,    // 12s extended timeout (10x faster!)
        maxRetries: 3,             // 3 attempts (2x faster!)
        retryMultiplier: 1.5,      // Standard backoff
        retryRandomization: 0.4,   // Higher jitter for distributed load
        enableMultipleStrategies: true,
        enableNetworkDiagnostics: true,
        enableConnectionCache: true,
        heartbeatInterval: 45000,  // 45s heartbeat
        qualityCheckInterval: 10000, // 10s quality checks
        enableLongPolling: true,
        enableSSEFallback: true
      })

      // Setup event listeners for connection state updates
      const unsubscribeEvents = connectionManager.addEventListener((event: ConnectionEvent) => {
        console.log('🔔 Connection Event:', event.type, event.state, event.strategy)
        
        setChatState(prev => ({
          ...prev,
          connectionState: event.state,
          connectionQuality: event.quality,
          connectionStrategy: event.strategy,
          connectionAttempt: event.attempt,
          connectionEvents: [...prev.connectionEvents.slice(-10), event], // Keep last 10 events
          showConnectionToast: ['connected', 'error', 'fallback-activated'].includes(event.type),
          currentLoadingPhase: getLoadingPhaseFromEvent(event)
        }))

        // Update main state based on connection events
        if (event.state === ConnectionState.CONNECTED) {
          setChatState(prev => ({
            ...prev,
            isConnected: true,
            isLoading: false,
            error: null
          }))
        } else if (event.state === ConnectionState.FAILED) {
          setChatState(prev => ({
            ...prev,
            isConnected: false,
            isLoading: false,
            error: event.error?.message || 'Connection failed after all attempts'
          }))
        } else if ([ConnectionState.CONNECTING, ConnectionState.RECONNECTING].includes(event.state)) {
          setChatState(prev => ({
            ...prev,
            isLoading: true,
            error: null
          }))
        }
      })

      setChatState(prev => ({
        ...prev,
        connectionManager,
        isLoading: true,
        error: null,
        connectionState: ConnectionState.CONNECTING,
        currentLoadingPhase: 'initializing'
      }))

      try {
        console.log('🚀 Starting robust Stream Chat connection...')
        
        // Create retryable token provider
        const tokenProvider = createRetryableTokenProvider(async () => {
          setChatState(prev => ({ ...prev, currentLoadingPhase: 'authenticating' }))
          
          const response = await fetch('/api/chat/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: session.user.id })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to get chat token')
          }

          const { token } = await response.json()
          return token
        }, 3)

        // Connect user with robust connection manager
        setChatState(prev => ({ ...prev, currentLoadingPhase: 'connecting' }))
        
        const { user, client } = await connectionManager.connectUser(
          apiKey,
          {
            id: session.user.id,
            name: session.user.name || 'Anonymous',
            image: session.user.image || undefined,
            email: session.user.email || undefined,
            // Fishing app specific fields
            isOnline: true,
            lastSeen: new Date().toISOString(),
            profile_type: 'fisher'
          },
          tokenProvider
        )

        setChatState(prev => ({ ...prev, currentLoadingPhase: 'syncing' }))

        // Get or create channel
        const channel = client.channel('messaging', channelId, {
          members: [session.user.id],
          created_by_id: session.user.id
        })

        await channel.watch()

        const currentPhase = calculateCurrentPhase()
        const phaseConfig = DEFAULT_PHASE_CONFIGS[currentPhase]

        const eventChat = {
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
          isConnected: true,
          connectionState: ConnectionState.CONNECTED
        }))

        console.log('✅ Robust Stream Chat initialization completed successfully!')

      } catch (error) {
        console.error('❌ Robust Stream Chat initialization failed:', error)
        
        let errorMessage = 'Failed to initialize chat'
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorMessage = 'Connection timeout. We tried multiple strategies but couldn\'t establish a stable connection.'
          } else if (error.message.includes('not configured')) {
            errorMessage = 'Chat service is not properly configured. Please contact support.'
          } else if (error.message.includes('network restrictions')) {
            errorMessage = 'Network restrictions detected. Some features may be limited.'
          } else if (error.message.includes('WebSocket') || error.message.includes('connection')) {
            errorMessage = 'Unable to establish real-time connection. Check your network settings.'
          } else {
            errorMessage = error.message
          }
        }
        
        setChatState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          connectionState: ConnectionState.FAILED
        }))
      }

      // Cleanup function
      return () => {
        unsubscribeEvents()
        if (connectionManager) {
          connectionManager.disconnect().catch(console.error)
        }
      }
    }

    // Only initialize if not in error state (allows retry)
    if (!chatState.error) {
      const cleanup = initializeRobustChat()
      return () => {
        if (cleanup && typeof cleanup.then === 'function') {
          cleanup.then(cleanupFn => cleanupFn?.())
        }
      }
    }

  }, [status, session, tripId, channelId, tripDate, chatState.error])

  // Helper function to map connection events to loading phases
  const getLoadingPhaseFromEvent = (event: ConnectionEvent): 'initializing' | 'diagnostics' | 'connecting' | 'authenticating' | 'syncing' => {
    if (event.type === 'connecting') {
      if (event.attempt === 1) return 'diagnostics'
      return 'connecting'
    }
    if (event.state === ConnectionState.CONNECTED) return 'syncing'
    return 'connecting'
  }

  // Retry connection function
  const retryConnection = useCallback(() => {
    console.log('🔄 User initiated connection retry...')
    
    // Reset error state and attempt reconnection
    setChatState(prev => ({
      ...prev,
      error: null,
      connectionState: ConnectionState.DISCONNECTED,
      connectionAttempt: 0,
      connectionEvents: []
    }))
    
    // Trigger reconnection by clearing client and manager
    if (chatState.connectionManager) {
      chatState.connectionManager.disconnect().catch(console.error)
    }
    
    setChatState(prev => ({
      ...prev,
      connectionManager: null,
      client: null,
      isConnected: false
    }))
  }, [chatState.connectionManager])

  // Close connection toast
  const closeConnectionToast = useCallback(() => {
    setChatState(prev => ({ ...prev, showConnectionToast: false }))
  }, [])

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

  // Render enhanced loading state with progressive indicators
  if (chatState.isLoading) {
    return (
      <Card className={cn('w-full h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <ProgressiveLoadingStates
            currentPhase={chatState.currentLoadingPhase}
            attempt={chatState.connectionAttempt}
            maxAttempts={chatState.maxAttempts}
            strategy={chatState.connectionStrategy}
          />
        </CardContent>
      </Card>
    )
  }

  // Handle retry initialization
  const handleRetryInitialization = () => {
    retryConnection()
  }

  // Render enhanced error state with connection status
  if (chatState.error) {
    const isConfigurationError = chatState.error.includes('not configured')
    const isConnectionError = chatState.error.includes('unavailable') || chatState.error.includes('timeout')
    
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="space-y-4">
            <ConnectionStatusIndicator
              state={chatState.connectionState}
              quality={chatState.connectionQuality}
              strategy={chatState.connectionStrategy}
              attempt={chatState.connectionAttempt}
              maxAttempts={chatState.maxAttempts}
              onRetry={!isConfigurationError ? handleRetryInitialization : undefined}
              showDetails={true}
              variant="full"
            />
            
            {isConnectionError && (
              <div className="text-xs text-gray-600 bg-blue-50 p-3 rounded border border-blue-200">
                💡 <strong>Подсказка:</strong> Вы все еще можете использовать другие функции приложения. 
                Чат будет автоматически переподключаться при восстановлении соединения.
              </div>
            )}

            {isConfigurationError && (
              <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-200">
                ⚠️ <strong>Конфигурация:</strong> Обратитесь к администратору для настройки службы чата.
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
          {/* Enhanced Connection Status */}
          {chatState.realTimePreferences.enableConnectionMonitoring && (
            <ConnectionStatusIndicator
              state={chatState.connectionState}
              quality={chatState.connectionQuality}
              strategy={chatState.connectionStrategy}
              attempt={chatState.connectionAttempt}
              maxAttempts={chatState.maxAttempts}
              onRetry={chatState.connectionState === ConnectionState.FAILED ? retryConnection : undefined}
              variant="minimal"
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
                  messageActions={['react', 'reply', 'edit', 'delete']}
                />
                
                <MessageInput />
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

      {/* Connection Event Toast */}
      <AnimatePresence>
        {chatState.showConnectionToast && chatState.connectionEvents.length > 0 && (
          <ConnectionEventToast
            event={chatState.connectionEvents[chatState.connectionEvents.length - 1]}
            onClose={closeConnectionToast}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
