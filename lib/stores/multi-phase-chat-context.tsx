/**
 * Multi-Phase Chat Context and Hooks
 * Task 17.1: Chat State Management Architecture - Context Switching
 */

'use client'

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useCallback, 
  useMemo,
  ReactNode 
} from 'react'
import { useSession } from 'next-auth/react'
import { 
  useMultiPhaseChatStore,
  useChatConnection,
  useChatCurrentPhase,
  useChatPhases 
} from './multi-phase-chat-store'
import { 
  ChatPhase, 
  CustomMessageType,
  MultiPhaseChatEvent 
} from '@/lib/types/multi-phase-chat'
import { 
  ChatEventHandlers,
  MultiPhaseChatStore 
} from './multi-phase-chat-types'
import { toast } from 'sonner'

// Context interfaces
interface ChatContextValue {
  // Store access
  store: MultiPhaseChatStore
  
  // Convenient access to key state
  isInitialized: boolean
  isConnected: boolean
  currentPhase: ChatPhase
  isLoading: boolean
  error: string | null
  
  // Phase management
  switchPhase: (phase: ChatPhase) => Promise<void>
  canSwitchToPhase: (phase: ChatPhase) => boolean
  getPhaseStatus: (phase: ChatPhase) => 'active' | 'available' | 'locked' | 'error'
  
  // Auto phase transition
  enableAutoTransition: boolean
  setAutoTransition: (enabled: boolean) => void
  checkPhaseTransition: () => ChatPhase | null
  
  // Message helpers
  sendMessage: (content: string, phase?: ChatPhase) => Promise<void>
  sendCustomMessage: (type: CustomMessageType, payload: any, phase?: ChatPhase) => Promise<void>
  
  // Event handlers
  addEventListener: (type: keyof ChatEventHandlers, handler: Function) => void
  removeEventListener: (type: keyof ChatEventHandlers, handler: Function) => void
  
  // Utility functions
  getActivePhaseConfig: () => any
  getPhaseProgress: () => { current: number; total: number; percentage: number }
  isPhaseAccessible: (phase: ChatPhase) => boolean
}

// Create context
const ChatContext = createContext<ChatContextValue | null>(null)

// Provider component
interface ChatProviderProps {
  children: ReactNode
  tripId: string
  enableAutoTransition?: boolean
  eventHandlers?: ChatEventHandlers
  onError?: (error: Error) => void
}

export function ChatProvider({ 
  children, 
  tripId, 
  enableAutoTransition = true,
  eventHandlers = {},
  onError 
}: ChatProviderProps) {
  const { data: session } = useSession()
  const store = useMultiPhaseChatStore()
  const connection = useChatConnection()
  const currentPhase = useChatCurrentPhase()
  const phases = useChatPhases()

  // Event listeners management
  const eventListeners = useMemo(() => new Map<string, Set<Function>>(), [])

  // Initialize chat when session and tripId are available
  useEffect(() => {
    if (session?.user?.id && tripId && !store.isInitialized) {
      store.initialize(tripId, session.user.id).catch((error) => {
        console.error('Failed to initialize chat:', error)
        onError?.(error)
      })
    }
  }, [session?.user?.id, tripId, store.isInitialized])

  // Auto phase transition logic
  useEffect(() => {
    if (!enableAutoTransition || !store.trip) return

    const checkTransition = () => {
      const newPhase = checkPhaseTransitionLogic()
      if (newPhase && newPhase !== currentPhase) {
        store.switchPhase(newPhase).catch((error) => {
          console.error('Auto phase transition failed:', error)
          onError?.(error)
        })
      }
    }

    const interval = setInterval(checkTransition, 60000) // Check every minute
    checkTransition() // Initial check

    return () => clearInterval(interval)
  }, [enableAutoTransition, currentPhase, store.trip])

  // Handle connection changes
  useEffect(() => {
    if (connection.connectionError) {
      toast.error(`Chat connection error: ${connection.connectionError}`)
      eventListeners.get('onConnectionStatusChanged')?.forEach(handler => 
        handler(false)
      )
    } else if (connection.isConnected) {
      toast.success('Chat connected successfully')
      eventListeners.get('onConnectionStatusChanged')?.forEach(handler => 
        handler(true)
      )
    }
  }, [connection.isConnected, connection.connectionError])

  // Handle phase changes
  useEffect(() => {
    eventListeners.get('onPhaseChange')?.forEach(handler => 
      handler(store.phases[currentPhase]?.phase, currentPhase)
    )
  }, [currentPhase])

  // Auto phase transition logic
  const checkPhaseTransitionLogic = useCallback((): ChatPhase | null => {
    const { trip } = store
    if (!trip || !trip.autoPhaseTransition) return null

    const now = new Date()
    const tripDate = trip.tripDate
    const daysDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    const rules = trip.phaseTransitionRules

    // Determine which phase should be active
    if (daysDiff > rules.preparation.startDaysBefore) {
      return null // Too early for any phase
    } else if (daysDiff >= rules.preparation.endDaysBefore) {
      return 'preparation'
    } else if (daysDiff >= -rules.live.endDaysAfter) {
      return 'live'
    } else if (daysDiff >= -rules.debrief.endDaysAfter) {
      return 'debrief'
    }

    return null // Past debrief period
  }, [store.trip])

  // Phase accessibility logic
  const canSwitchToPhase = useCallback((phase: ChatPhase): boolean => {
    const phaseState = phases[phase]
    
    // Check if phase has errors
    if (phaseState.error) return false
    
    // Check user permissions
    if (!store.user?.permissions.canAccessAllPhases) {
      // Regular users can only access phases based on time rules
      const allowedPhase = checkPhaseTransitionLogic()
      if (allowedPhase && phase !== allowedPhase) return false
    }
    
    // Check if phase is loaded or can be loaded
    return !phaseState.isLoading
  }, [phases, store.user, checkPhaseTransitionLogic])

  const getPhaseStatus = useCallback((phase: ChatPhase): 'active' | 'available' | 'locked' | 'error' => {
    const phaseState = phases[phase]
    
    if (phaseState.error) return 'error'
    if (phase === currentPhase) return 'active'
    if (canSwitchToPhase(phase)) return 'available'
    return 'locked'
  }, [phases, currentPhase, canSwitchToPhase])

  const isPhaseAccessible = useCallback((phase: ChatPhase): boolean => {
    return getPhaseStatus(phase) !== 'locked'
  }, [getPhaseStatus])

  // Event management
  const addEventListener = useCallback((type: keyof ChatEventHandlers, handler: Function) => {
    if (!eventListeners.has(type)) {
      eventListeners.set(type, new Set())
    }
    eventListeners.get(type)!.add(handler)
  }, [eventListeners])

  const removeEventListener = useCallback((type: keyof ChatEventHandlers, handler: Function) => {
    eventListeners.get(type)?.delete(handler)
  }, [eventListeners])

  // Utility functions
  const getActivePhaseConfig = useCallback(() => {
    return phases[currentPhase]?.config
  }, [phases, currentPhase])

  const getPhaseProgress = useCallback(() => {
    const phaseOrder: ChatPhase[] = ['preparation', 'live', 'debrief']
    const currentIndex = phaseOrder.indexOf(currentPhase)
    
    return {
      current: currentIndex + 1,
      total: phaseOrder.length,
      percentage: ((currentIndex + 1) / phaseOrder.length) * 100
    }
  }, [currentPhase])

  // Enhanced message sending with error handling
  const sendMessage = useCallback(async (content: string, phase?: ChatPhase) => {
    try {
      await store.sendMessage(content, phase)
      
      // Trigger event handlers
      eventListeners.get('onMessageReceived')?.forEach(handler => 
        handler({ text: content }, phase || currentPhase)
      )
      
      toast.success('Message sent')
    } catch (error) {
      toast.error('Failed to send message')
      onError?.(error as Error)
      throw error
    }
  }, [store.sendMessage, currentPhase, eventListeners, onError])

  const sendCustomMessage = useCallback(async (type: CustomMessageType, payload: any, phase?: ChatPhase) => {
    try {
      await store.sendCustomMessage(type, payload, phase)
      
      // Trigger event handlers
      eventListeners.get('onCustomMessageReceived')?.forEach(handler => 
        handler({ type, payload, phase: phase || currentPhase })
      )
      
      toast.success(`${type} shared successfully`)
    } catch (error) {
      toast.error(`Failed to share ${type}`)
      onError?.(error as Error)
      throw error
    }
  }, [store.sendCustomMessage, currentPhase, eventListeners, onError])

  // Enhanced phase switching with validation
  const switchPhase = useCallback(async (phase: ChatPhase) => {
    if (!canSwitchToPhase(phase)) {
      const error = new Error(`Cannot switch to phase: ${phase}`)
      onError?.(error)
      toast.error(error.message)
      return
    }

    try {
      const oldPhase = currentPhase
      await store.switchPhase(phase)
      
      // Trigger event handlers
      eventListeners.get('onPhaseChange')?.forEach(handler => 
        handler(oldPhase, phase)
      )
      
      toast.success(`Switched to ${phase} phase`)
    } catch (error) {
      toast.error(`Failed to switch to ${phase} phase`)
      onError?.(error as Error)
      throw error
    }
  }, [canSwitchToPhase, currentPhase, store.switchPhase, eventListeners, onError])

  // Register provided event handlers
  useEffect(() => {
    Object.entries(eventHandlers).forEach(([type, handler]) => {
      if (handler) {
        addEventListener(type as keyof ChatEventHandlers, handler)
      }
    })

    return () => {
      Object.entries(eventHandlers).forEach(([type, handler]) => {
        if (handler) {
          removeEventListener(type as keyof ChatEventHandlers, handler)
        }
      })
    }
  }, [eventHandlers, addEventListener, removeEventListener])

  // Context value
  const contextValue: ChatContextValue = {
    store,
    isInitialized: store.isInitialized,
    isConnected: connection.isConnected,
    currentPhase,
    isLoading: store.isLoading,
    error: store.error,
    switchPhase,
    canSwitchToPhase,
    getPhaseStatus,
    enableAutoTransition,
    setAutoTransition: (enabled) => {
      if (store.trip) {
        store.updatePersistentState({
          uiPreferences: { ...store.persistent?.uiPreferences, autoPhaseTransition: enabled }
        })
      }
    },
    checkPhaseTransition: checkPhaseTransitionLogic,
    sendMessage,
    sendCustomMessage,
    addEventListener,
    removeEventListener,
    getActivePhaseConfig,
    getPhaseProgress,
    isPhaseAccessible
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  )
}

// Hook to use chat context
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}

// Specialized hooks for common use cases
export function usePhaseTransition() {
  const { 
    currentPhase, 
    switchPhase, 
    canSwitchToPhase, 
    getPhaseStatus,
    checkPhaseTransition,
    enableAutoTransition,
    setAutoTransition 
  } = useChatContext()

  return {
    currentPhase,
    switchPhase,
    canSwitchToPhase,
    getPhaseStatus,
    checkPhaseTransition,
    enableAutoTransition,
    setAutoTransition,
    availablePhases: (['preparation', 'live', 'debrief'] as ChatPhase[]).filter(canSwitchToPhase)
  }
}

export function useChatMessaging() {
  const { 
    sendMessage, 
    sendCustomMessage, 
    currentPhase,
    store 
  } = useChatContext()

  return {
    sendMessage,
    sendCustomMessage,
    currentPhase,
    canSendMessages: store.user?.permissions.canSendMessages ?? true,
    canSendCustomMessages: store.user?.permissions.canSendCustomMessages ?? true,
    messageInput: store.ui.messageInput,
    setMessageInput: (input: string) => store.updateUIState({ messageInput: input }),
    isDrafting: store.ui.isDrafting
  }
}

export function useChatParticipants() {
  const { store, currentPhase } = useChatContext()
  const phaseState = store.phases[currentPhase]

  return {
    participantCount: phaseState.participantCount,
    onlineParticipants: phaseState.onlineParticipants,
    typingUsers: phaseState.typingUsers,
    allParticipants: store.trip?.participantIds ?? [],
    captain: store.trip?.captainId,
    currentUser: store.user,
    isUserOnline: (userId: string) => phaseState.onlineParticipants.includes(userId),
    isUserTyping: (userId: string) => phaseState.typingUsers.includes(userId)
  }
}

export function useChatNotifications() {
  const { store } = useChatContext()

  return {
    notifications: store.notifications,
    unreadCount: store.notifications.filter(n => !n.isRead).length,
    addNotification: store.addNotification,
    markAsRead: store.markNotificationAsRead,
    clearNotifications: store.clearNotifications,
    settings: store.persistent?.notificationSettings
  }
}

export function useChatAnalytics() {
  const { store } = useChatContext()

  return {
    analytics: store.analytics,
    phaseAnalytics: store.analytics.phaseAnalytics,
    events: store.events,
    trackEvent: store.trackEvent,
    updateAnalytics: store.updateAnalytics
  }
}

export function useChatPersistence() {
  const { store } = useChatContext()

  return {
    persistent: store.persistent,
    savePersistentState: store.savePersistentState,
    loadPersistentState: store.loadPersistentState,
    updatePersistentState: store.updatePersistentState,
    messageDrafts: store.persistent?.messageDrafts,
    readStatus: store.persistent?.readStatus,
    phaseHistory: store.persistent?.phaseHistory
  }
}
