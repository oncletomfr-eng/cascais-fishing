/**
 * Integrated Multi-Phase Chat Component
 * Task 17.4: Stream Chat SDK Integration - Complete Integration
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  Chat, 
  Channel, 
  MessageList, 
  MessageInput, 
  ChannelHeader,
  Thread,
  Window,
  LoadingIndicator,
  ChannelList as StreamChannelList
} from 'stream-chat-react'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { 
  useStreamChat, 
  usePhaseChannel, 
  useChannelMembers,
  usePhaseChatActions,
  usePhaseTransitionEvents,
  getPhaseConfig,
  StreamChatProvider
} from '@/lib/chat/useStreamChat'
import { 
  usePhaseTransition,
  PhaseTransitionProvider
} from '@/lib/transition/usePhaseTransition'
import { PhaseTransitionContainer } from '@/components/transition/PhaseTransitionContainer'
import {
  MessageCircle,
  Users,
  Settings,
  Bell,
  BellOff,
  Maximize2,
  Minimize2,
  X,
  Phone,
  Video,
  Share2,
  Upload,
  MapPin,
  Camera,
  Fish,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Import Stream Chat styles
import 'stream-chat-react/dist/css/v2/index.css'

// Main integrated component props
interface IntegratedMultiPhaseChatProps {
  tripId: string
  tripDate: Date
  isOpen?: boolean
  onToggle?: () => void
  className?: string
  userRole?: 'captain' | 'co-captain' | 'participant' | 'observer'
  showPhaseIndicator?: boolean
  enableTransitions?: boolean
}

// Phase chat display component
interface PhaseChatDisplayProps {
  tripId: string
  phase: ChatPhase
  isActive: boolean
  className?: string
}

function PhaseChatDisplay({ tripId, phase, isActive, className }: PhaseChatDisplayProps) {
  const { channel, loading, error } = usePhaseChannel(tripId, phase)
  const { members } = useChannelMembers(tripId, phase)
  const { sendMessage } = usePhaseChatActions(tripId, phase)
  const config = getPhaseConfig(phase)

  const handleCustomMessage = useCallback(async (type: string, data: any) => {
    try {
      await sendMessage({
        text: `${type}: ${JSON.stringify(data)}`,
        type: 'custom',
        custom: { type, data, phase }
      })
      toast.success(`Отправлено: ${type}`)
    } catch (error) {
      toast.error('Ошибка отправки сообщения')
    }
  }, [sendMessage, phase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2">Загрузка чата...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600">
        <AlertTriangle className="w-8 h-8 mr-2" />
        <span>Ошибка загрузки чата: {error}</span>
      </div>
    )
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <MessageCircle className="w-8 h-8 mr-2" />
        <span>Канал не найден</span>
      </div>
    )
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      <Channel channel={channel}>
        <Window>
          {/* Custom channel header with phase-specific features */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{config.name}</span>
                <Badge 
                  variant={isActive ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {isActive ? 'Активна' : 'Неактивна'}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {members.length} участников
              </div>
            </div>

            {/* Phase-specific action buttons */}
            <div className="flex items-center space-x-1">
              {config.features.map(feature => {
                if (!feature.enabled) return null
                
                let icon: React.ReactNode
                let action: () => void
                
                switch (feature.id) {
                  case 'location':
                    icon = <MapPin className="w-4 h-4" />
                    action = () => handleCustomMessage('location_request', { timestamp: new Date() })
                    break
                  case 'catches':
                    icon = <Fish className="w-4 h-4" />
                    action = () => handleCustomMessage('catch_request', { phase })
                    break
                  case 'photos':
                    icon = <Camera className="w-4 h-4" />
                    action = () => handleCustomMessage('photo_request', { phase })
                    break
                  case 'emergency':
                    icon = <AlertTriangle className="w-4 h-4 text-red-500" />
                    action = () => handleCustomMessage('emergency_alert', { timestamp: new Date() })
                    break
                  default:
                    return null
                }

                return (
                  <TooltipProvider key={feature.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={action}
                          className="h-8 w-8 p-0"
                        >
                          {icon}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{feature.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>

          {/* Message list with custom rendering */}
          <MessageList />
          
          {/* Message input with phase-specific features */}
          <MessageInput 
            focus={isActive}
            disabled={!isActive}
            additionalTextareaProps={{
              placeholder: isActive 
                ? `Сообщение в ${config.name.toLowerCase()}...`
                : 'Эта фаза неактивна'
            }}
          />
        </Window>
        <Thread />
      </Channel>
    </div>
  )
}

// Chat controls component
interface ChatControlsProps {
  tripId: string
  currentPhase: ChatPhase
  isMinimized: boolean
  onMinimize: () => void
  onClose?: () => void
  memberCount: number
  hasUnread: boolean
  isConnected: boolean
}

function ChatControls({
  tripId,
  currentPhase,
  isMinimized,
  onMinimize,
  onClose,
  memberCount,
  hasUnread,
  isConnected
}: ChatControlsProps) {
  const [notifications, setNotifications] = useState(true)

  return (
    <div className="flex items-center justify-between p-3 bg-white border-b">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <span className="font-medium">Многофазный чат</span>
          {hasUnread && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isConnected ? 'bg-green-500' : 'bg-red-500'
          )} />
          <span>{isConnected ? 'Подключен' : 'Отключен'}</span>
          <span>•</span>
          <span>{memberCount} участников</span>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNotifications(!notifications)}
                className="h-8 w-8 p-0"
              >
                {notifications ? 
                  <Bell className="w-4 h-4" /> : 
                  <BellOff className="w-4 h-4 text-gray-400" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{notifications ? 'Отключить уведомления' : 'Включить уведомления'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={onMinimize}
                className="h-8 w-8 p-0"
              >
                {isMinimized ? 
                  <Maximize2 className="w-4 h-4" /> : 
                  <Minimize2 className="w-4 h-4" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isMinimized ? 'Развернуть' : 'Свернуть'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onClose && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// Core integrated component (used within providers)
function IntegratedMultiPhaseChatCore({
  tripId,
  tripDate,
  isOpen = false,
  onToggle,
  className,
  userRole = 'participant',
  showPhaseIndicator = true,
  enableTransitions = true
}: IntegratedMultiPhaseChatProps) {
  const { 
    isConnected, 
    isConnecting, 
    error: chatError,
    currentUser
  } = useStreamChat()
  
  const {
    currentPhase,
    isTransitioning,
    requestTransition
  } = usePhaseTransition()

  const { latestTransition, transitionHistory } = usePhaseTransitionEvents()

  // UI State
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'settings'>('chat')
  const [hasUnread, setHasUnread] = useState(false)

  // Get member count from current phase
  const { members } = useChannelMembers(tripId, currentPhase)

  // Handle phase transition events
  useEffect(() => {
    if (latestTransition) {
      toast.success(
        `Переход выполнен: ${latestTransition.fromPhase} → ${latestTransition.toPhase}`
      )
    }
  }, [latestTransition])

  // Handle connection errors
  useEffect(() => {
    if (chatError) {
      toast.error(`Ошибка чата: ${chatError}`)
    }
  }, [chatError])

  if (!isOpen) {
    return null
  }

  if (isConnecting) {
    return (
      <Card className={cn('w-96 h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Подключение к чату...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card className={cn('w-96 h-96', className)}>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">Не удается подключиться к чату</p>
            {chatError && (
              <p className="text-sm text-gray-600 mt-1">{chatError}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn(
      'w-full max-w-4xl mx-auto transition-all duration-300',
      isMinimized ? 'h-16' : 'h-[600px]',
      className
    )}>
      {/* Chat Controls Header */}
      <ChatControls
        tripId={tripId}
        currentPhase={currentPhase}
        isMinimized={isMinimized}
        onMinimize={() => setIsMinimized(!isMinimized)}
        onClose={onToggle}
        memberCount={members.length}
        hasUnread={hasUnread}
        isConnected={isConnected}
      />

      {!isMinimized && (
        <CardContent className="p-0 h-[calc(100%-4rem)]">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">Чат</TabsTrigger>
              <TabsTrigger value="members">Участники</TabsTrigger>
              <TabsTrigger value="settings">Настройки</TabsTrigger>
            </TabsList>

            {/* Main Chat Tab */}
            <TabsContent value="chat" className="h-[calc(100%-2.5rem)] mt-0">
              {enableTransitions ? (
                <PhaseTransitionContainer
                  showProgress={isTransitioning}
                  showPhaseIndicator={showPhaseIndicator}
                  className="h-full"
                >
                  <PhaseChatDisplay
                    tripId={tripId}
                    phase={currentPhase}
                    isActive={!isTransitioning}
                    className="h-full"
                  />
                </PhaseTransitionContainer>
              ) : (
                <PhaseChatDisplay
                  tripId={tripId}
                  phase={currentPhase}
                  isActive={true}
                  className="h-full"
                />
              )}
            </TabsContent>

            {/* Members Tab */}
            <TabsContent value="members" className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Участники чата</h3>
                  <Badge variant="outline">{members.length}</Badge>
                </div>
                
                <div className="space-y-2">
                  {members.map((member) => (
                    <div 
                      key={member.user?.id} 
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50"
                    >
                      <img
                        src={member.user?.image || `https://ui-avatars.com/api/?name=${member.user?.name}&background=random`}
                        alt={member.user?.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{member.user?.name}</div>
                        <div className="text-xs text-gray-500">{member.user?.role || 'participant'}</div>
                      </div>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        member.user?.online ? 'bg-green-500' : 'bg-gray-300'
                      )} />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-3">Настройки чата</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Уведомления</span>
                      <Badge variant="outline">Включены</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Звуки</span>
                      <Badge variant="outline">Включены</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Автопереходы</span>
                      <Badge variant="outline">{enableTransitions ? 'Включены' : 'Отключены'}</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">История переходов</h3>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {transitionHistory.slice(-5).map((transition, index) => (
                      <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                        <div>{transition.fromPhase} → {transition.toPhase}</div>
                        <div className="text-gray-500">
                          {transition.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  )
}

// Main exported component with all providers
export function IntegratedMultiPhaseChat(props: IntegratedMultiPhaseChatProps) {
  return (
    <PhaseTransitionProvider
      tripId={props.tripId}
      tripDate={props.tripDate}
      initialPhase="preparation"
      config={{
        enableAutoTransitions: true,
        enableAnimations: props.enableTransitions !== false,
        defaultAnimation: {
          type: 'slide',
          duration: 300,
          easing: 'ease-in-out'
        }
      }}
    >
      <StreamChatProvider
        tripId={props.tripId}
        userRole={props.userRole}
        autoConnect={true}
      >
        <IntegratedMultiPhaseChatCore {...props} />
      </StreamChatProvider>
    </PhaseTransitionProvider>
  )
}
