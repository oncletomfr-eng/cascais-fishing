/**
 * React Hook for Stream Chat Integration with Multi-Phase System
 * Task 17.4: Stream Chat SDK Integration - React Integration
 */

'use client'

import { 
  useState, 
  useEffect, 
  useCallback, 
  useRef,
  createContext,
  useContext,
  ReactNode 
} from 'react'
import { useSession } from 'next-auth/react'
import { Channel, MessageResponse, ChannelMemberResponse } from 'stream-chat'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { usePhaseTransition } from '@/lib/transition/usePhaseTransition'
import { 
  StreamChatService, 
  StreamChatUser,
  TripRole,
  PhaseTransitionEvent,
  PhaseChannelConfig
} from './StreamChatService'

// Context for Stream Chat
interface StreamChatContextValue {
  service: StreamChatService | null
  isConnected: boolean
  isConnecting: boolean
  currentUser: StreamChatUser | null
  error: string | null
  
  // Channel management
  getPhaseChannel: (tripId: string, phase: ChatPhase) => Promise<Channel>
  sendMessage: (tripId: string, phase: ChatPhase, message: any) => Promise<MessageResponse>
  addParticipants: (tripId: string, phase: ChatPhase, userIds: string[]) => Promise<void>
  removeParticipants: (tripId: string, phase: ChatPhase, userIds: string[]) => Promise<void>
  getMembers: (tripId: string, phase: ChatPhase) => Promise<ChannelMemberResponse[]>
  
  // Phase transitions
  transitionToPhase: (tripId: string, fromPhase: ChatPhase, toPhase: ChatPhase) => Promise<void>
  
  // Event listeners
  onPhaseTransition: (callback: (event: PhaseTransitionEvent) => void) => () => void
  onChannelCreated: (callback: (data: any) => void) => () => void
  onMessageSent: (callback: (data: any) => void) => () => void
}

const StreamChatContext = createContext<StreamChatContextValue | null>(null)

// Provider props
interface StreamChatProviderProps {
  children: ReactNode
  tripId?: string
  userRole?: TripRole
  autoConnect?: boolean
}

// Provider component
export function StreamChatProvider({
  children,
  tripId,
  userRole = 'participant',
  autoConnect = true
}: StreamChatProviderProps) {
  const { data: session } = useSession()
  const { currentPhase } = usePhaseTransition()
  
  // State
  const [service, setService] = useState<StreamChatService | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [currentUser, setCurrentUser] = useState<StreamChatUser | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs for stable references
  const serviceRef = useRef<StreamChatService | null>(null)
  const eventCleanupRef = useRef<(() => void)[]>([])

  // Initialize Stream Chat service
  const initializeService = useCallback(async () => {
    if (!session?.user?.id || !autoConnect) return
    if (isConnecting || isConnected) return

    setIsConnecting(true)
    setError(null)

    try {
      console.log('🔗 Initializing Stream Chat service...')

      // Get API key and token
      const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
      if (!apiKey) {
        throw new Error('Stream Chat API key not configured')
      }

      // Get auth token from our API
      const tokenResponse = await fetch('/api/chat/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!tokenResponse.ok) {
        throw new Error('Failed to get auth token')
      }

      const tokenData = await tokenResponse.json()
      if (!tokenData.success) {
        throw new Error(tokenData.error || 'Failed to get auth token')
      }

      // Create user object
      const user: StreamChatUser = {
        id: session.user.id,
        name: session.user.name || 'Anonymous User',
        image: session.user.image || undefined,
        email: session.user.email || undefined,
        role: userRole,
        tripId,
        isOnline: true,
        lastSeen: new Date(),
        preferences: {
          notifications: true,
          sounds: true,
          autoTransitions: true,
          preferredLanguage: 'ru',
          timezone: 'Europe/Lisbon'
        }
      }

      // Initialize service
      const newService = new StreamChatService()
      await newService.initialize(apiKey, user, tokenData.token)

      serviceRef.current = newService
      setService(newService)
      setCurrentUser(user)
      setIsConnected(true)

      console.log('✅ Stream Chat service initialized successfully')

    } catch (error) {
      console.error('❌ Error initializing Stream Chat service:', error)
      setError(error instanceof Error ? error.message : 'Failed to initialize chat')
    } finally {
      setIsConnecting(false)
    }
  }, [session, autoConnect, userRole, tripId, isConnecting, isConnected])

  // Setup phase transition integration
  useEffect(() => {
    if (!service || !tripId) return

    const handlePhaseTransition = async (event: any) => {
      try {
        await service.transitionToPhase(
          tripId,
          event.fromPhase,
          event.toPhase,
          event.triggeredBy
        )
      } catch (error) {
        console.error('❌ Error handling phase transition in chat:', error)
      }
    }

    // Listen to phase transitions from the transition system
    service.on('phase_transition', handlePhaseTransition)

    return () => {
      service.off('phase_transition', handlePhaseTransition)
    }
  }, [service, tripId])

  // Initialize on mount
  useEffect(() => {
    initializeService()

    return () => {
      // Cleanup event listeners
      eventCleanupRef.current.forEach(cleanup => cleanup())
      eventCleanupRef.current = []
    }
  }, [initializeService])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect()
        serviceRef.current = null
      }
    }
  }, [])

  // Context methods
  const getPhaseChannel = useCallback(async (tripId: string, phase: ChatPhase): Promise<Channel> => {
    if (!service) {
      throw new Error('Stream Chat service not initialized')
    }
    return await service.getPhaseChannel(tripId, phase)
  }, [service])

  const sendMessage = useCallback(async (
    tripId: string, 
    phase: ChatPhase, 
    message: any
  ): Promise<MessageResponse> => {
    if (!service) {
      throw new Error('Stream Chat service not initialized')
    }
    return await service.sendPhaseMessage(tripId, phase, message)
  }, [service])

  const addParticipants = useCallback(async (
    tripId: string, 
    phase: ChatPhase, 
    userIds: string[]
  ): Promise<void> => {
    if (!service) {
      throw new Error('Stream Chat service not initialized')
    }
    await service.addParticipants(tripId, phase, userIds)
  }, [service])

  const removeParticipants = useCallback(async (
    tripId: string, 
    phase: ChatPhase, 
    userIds: string[]
  ): Promise<void> => {
    if (!service) {
      throw new Error('Stream Chat service not initialized')
    }
    await service.removeParticipants(tripId, phase, userIds)
  }, [service])

  const getMembers = useCallback(async (
    tripId: string, 
    phase: ChatPhase
  ): Promise<ChannelMemberResponse[]> => {
    if (!service) {
      throw new Error('Stream Chat service not initialized')
    }
    return await service.getChannelMembers(tripId, phase)
  }, [service])

  const transitionToPhase = useCallback(async (
    tripId: string, 
    fromPhase: ChatPhase, 
    toPhase: ChatPhase
  ): Promise<void> => {
    if (!service) {
      throw new Error('Stream Chat service not initialized')
    }
    await service.transitionToPhase(tripId, fromPhase, toPhase, currentUser?.id || 'system')
  }, [service, currentUser])

  // Event listeners
  const onPhaseTransition = useCallback((callback: (event: PhaseTransitionEvent) => void) => {
    if (!service) return () => {}

    service.on('phase_transition', callback)
    
    const cleanup = () => service.off('phase_transition', callback)
    eventCleanupRef.current.push(cleanup)
    
    return cleanup
  }, [service])

  const onChannelCreated = useCallback((callback: (data: any) => void) => {
    if (!service) return () => {}

    service.on('channel_created', callback)
    
    const cleanup = () => service.off('channel_created', callback)
    eventCleanupRef.current.push(cleanup)
    
    return cleanup
  }, [service])

  const onMessageSent = useCallback((callback: (data: any) => void) => {
    if (!service) return () => {}

    service.on('message_sent', callback)
    
    const cleanup = () => service.off('message_sent', callback)
    eventCleanupRef.current.push(cleanup)
    
    return cleanup
  }, [service])

  const contextValue: StreamChatContextValue = {
    service,
    isConnected,
    isConnecting,
    currentUser,
    error,
    getPhaseChannel,
    sendMessage,
    addParticipants,
    removeParticipants,
    getMembers,
    transitionToPhase,
    onPhaseTransition,
    onChannelCreated,
    onMessageSent
  }

  return (
    <StreamChatContext.Provider value={contextValue}>
      {children}
    </StreamChatContext.Provider>
  )
}

// Hook to use Stream Chat context
export function useStreamChat() {
  const context = useContext(StreamChatContext)
  
  if (!context) {
    throw new Error('useStreamChat must be used within a StreamChatProvider')
  }
  
  return context
}

// Specialized hooks
export function usePhaseChannel(tripId: string, phase: ChatPhase) {
  const { getPhaseChannel, isConnected } = useStreamChat()
  const [channel, setChannel] = useState<Channel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChannel = useCallback(async () => {
    if (!isConnected || !tripId) return

    setLoading(true)
    setError(null)

    try {
      const ch = await getPhaseChannel(tripId, phase)
      setChannel(ch)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channel')
    } finally {
      setLoading(false)
    }
  }, [isConnected, tripId, phase, getPhaseChannel])

  useEffect(() => {
    loadChannel()
  }, [loadChannel])

  return { channel, loading, error, reload: loadChannel }
}

export function useChannelMembers(tripId: string, phase: ChatPhase) {
  const { getMembers, isConnected } = useStreamChat()
  const [members, setMembers] = useState<ChannelMemberResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    if (!isConnected || !tripId) return

    setLoading(true)
    setError(null)

    try {
      const memberList = await getMembers(tripId, phase)
      setMembers(memberList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members')
    } finally {
      setLoading(false)
    }
  }, [isConnected, tripId, phase, getMembers])

  useEffect(() => {
    loadMembers()
  }, [loadMembers])

  return { members, loading, error, reload: loadMembers }
}

// Hook for sending messages with phase context
export function usePhaseChatActions(tripId: string, phase: ChatPhase) {
  const { sendMessage, addParticipants, removeParticipants } = useStreamChat()

  const sendPhaseMessage = useCallback(async (message: {
    text?: string
    type?: string
    attachments?: any[]
    custom?: any
  }) => {
    return await sendMessage(tripId, phase, message)
  }, [sendMessage, tripId, phase])

  const addMembers = useCallback(async (userIds: string[]) => {
    await addParticipants(tripId, phase, userIds)
  }, [addParticipants, tripId, phase])

  const removeMembers = useCallback(async (userIds: string[]) => {
    await removeParticipants(tripId, phase, userIds)
  }, [removeParticipants, tripId, phase])

  return {
    sendMessage: sendPhaseMessage,
    addMembers,
    removeMembers
  }
}

// Hook for phase transition events
export function usePhaseTransitionEvents() {
  const { onPhaseTransition } = useStreamChat()
  const [latestTransition, setLatestTransition] = useState<PhaseTransitionEvent | null>(null)
  const [transitionHistory, setTransitionHistory] = useState<PhaseTransitionEvent[]>([])

  useEffect(() => {
    const cleanup = onPhaseTransition((event: PhaseTransitionEvent) => {
      setLatestTransition(event)
      setTransitionHistory(prev => [...prev, event])
    })

    return cleanup
  }, [onPhaseTransition])

  return {
    latestTransition,
    transitionHistory,
    clearHistory: () => setTransitionHistory([])
  }
}

// Utility function to get phase configuration
export function getPhaseConfig(phase: ChatPhase): PhaseChannelConfig {
  return StreamChatService.getPhaseConfig(phase)
}
