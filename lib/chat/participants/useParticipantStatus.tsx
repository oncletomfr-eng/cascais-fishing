/**
 * React Hook for Participant Status Management
 * Task 17.5: Participant Management System - React Integration
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
import { 
  ChatParticipant,
  ParticipantStatus,
  TypingIndicator,
  ReadReceipt
} from '@/lib/chat/participant-types'
import {
  ParticipantStatusService,
  StatusUpdateEvent,
  TypingUpdateEvent,
  ReadStatusEvent,
  getParticipantStatusService
} from './ParticipantStatusService'
import { useStreamChat } from '@/lib/chat/useStreamChat'

// Context interface
interface ParticipantStatusContextValue {
  // Service instance
  statusService: ParticipantStatusService | null
  
  // Participants data
  participants: ChatParticipant[]
  onlineParticipants: ChatParticipant[]
  
  // Status management
  updateParticipantStatus: (participantId: string, status: ParticipantStatus) => void
  getParticipantStatus: (participantId: string) => ParticipantStatus | undefined
  
  // Typing indicators
  typingParticipants: Map<string, TypingIndicator[]> // channelId -> indicators
  updateTypingStatus: (participantId: string, channelId: string, isTyping: boolean) => void
  getTypingParticipants: (channelId: string) => TypingIndicator[]
  
  // Read receipts
  markMessageAsRead: (participantId: string, messageId: string, channelId: string) => void
  getReadReceipts: (messageId: string, channelId: string) => ReadReceipt[]
  
  // Participant management
  addParticipant: (participant: ChatParticipant) => void
  removeParticipant: (participantId: string) => void
  getParticipant: (participantId: string) => ChatParticipant | undefined
  
  // Statistics
  statistics: {
    total: number
    online: number
    offline: number
    typing: number
  }
  
  // Events
  onStatusUpdate: (callback: (event: StatusUpdateEvent) => void) => () => void
  onTypingUpdate: (callback: (event: TypingUpdateEvent) => void) => () => void
  onReadUpdate: (callback: (event: ReadStatusEvent) => void) => () => void
}

const ParticipantStatusContext = createContext<ParticipantStatusContextValue | null>(null)

// Provider props
interface ParticipantStatusProviderProps {
  children: ReactNode
  initialParticipants?: ChatParticipant[]
  autoConnect?: boolean
  config?: {
    heartbeatInterval?: number
    typingTimeout?: number
    awayTimeout?: number
    offlineTimeout?: number
  }
}

// Provider component
export function ParticipantStatusProvider({
  children,
  initialParticipants = [],
  autoConnect = true,
  config
}: ParticipantStatusProviderProps) {
  // Optional Stream Chat integration
  let streamChatService = null
  let isConnected = false
  
  try {
    const streamChat = useStreamChat()
    streamChatService = streamChat.service
    isConnected = streamChat.isConnected
  } catch (error) {
    // StreamChatProvider not available - that's okay for demo mode
    console.log('StreamChatProvider not available, running in demo mode')
  }
  
  // State
  const [statusService, setStatusService] = useState<ParticipantStatusService | null>(null)
  const [participants, setParticipants] = useState<ChatParticipant[]>(initialParticipants)
  const [typingParticipants, setTypingParticipants] = useState<Map<string, TypingIndicator[]>>(new Map())
  const [statistics, setStatistics] = useState({
    total: 0,
    online: 0,
    offline: 0,
    typing: 0
  })

  // Refs for stable event handling
  const eventCleanupRef = useRef<(() => void)[]>([])

  // Initialize status service
  useEffect(() => {
    if (!autoConnect) return

    const service = getParticipantStatusService()
    
    // Configure service
    if (config) {
      service.updateConfig(config)
    }

    // Connect to Stream Chat if available
    if (streamChatService && isConnected) {
      service.setStreamClient(streamChatService as any)
    }

    // Add initial participants
    initialParticipants.forEach(participant => {
      service.addParticipant(participant)
    })

    setStatusService(service)

    return () => {
      service.destroy()
    }
  }, [autoConnect, streamChatService, isConnected, config])

  // Setup event listeners
  useEffect(() => {
    if (!statusService) return

    // Participant events
    const handleParticipantUpdated = (participant: ChatParticipant) => {
      setParticipants(prev => {
        const index = prev.findIndex(p => p.id === participant.id)
        if (index >= 0) {
          const newParticipants = [...prev]
          newParticipants[index] = participant
          return newParticipants
        }
        return prev
      })
    }

    const handleParticipantAdded = (participant: ChatParticipant) => {
      setParticipants(prev => {
        if (prev.find(p => p.id === participant.id)) {
          return prev
        }
        return [...prev, participant]
      })
    }

    const handleParticipantRemoved = (participant: ChatParticipant) => {
      setParticipants(prev => prev.filter(p => p.id !== participant.id))
    }

    // Typing events
    const handleTypingUpdated = (event: TypingUpdateEvent) => {
      setTypingParticipants(prev => {
        const newMap = new Map(prev)
        const channelIndicators = newMap.get(event.channelId) || []
        
        if (event.isTyping) {
          // Add or update typing indicator
          const existingIndex = channelIndicators.findIndex(
            indicator => indicator.participantId === event.participantId
          )
          
          const newIndicator: TypingIndicator = {
            participantId: event.participantId,
            participantName: event.participantName,
            startedAt: event.timestamp,
            channelId: event.channelId
          }

          if (existingIndex >= 0) {
            channelIndicators[existingIndex] = newIndicator
          } else {
            channelIndicators.push(newIndicator)
          }
        } else {
          // Remove typing indicator
          const filteredIndicators = channelIndicators.filter(
            indicator => indicator.participantId !== event.participantId
          )
          newMap.set(event.channelId, filteredIndicators)
          return newMap
        }

        newMap.set(event.channelId, channelIndicators)
        return newMap
      })
    }

    // Statistics update
    const updateStats = () => {
      const stats = statusService.getStatistics()
      setStatistics(stats)
    }

    // Attach event listeners
    statusService.on('participant_updated', handleParticipantUpdated)
    statusService.on('participant_added', handleParticipantAdded)
    statusService.on('participant_removed', handleParticipantRemoved)
    statusService.on('typing_updated', handleTypingUpdated)
    statusService.on('status_updated', updateStats)

    // Update initial stats
    updateStats()

    // Store cleanup functions
    const cleanupFunctions = [
      () => statusService.off('participant_updated', handleParticipantUpdated),
      () => statusService.off('participant_added', handleParticipantAdded),
      () => statusService.off('participant_removed', handleParticipantRemoved),
      () => statusService.off('typing_updated', handleTypingUpdated),
      () => statusService.off('status_updated', updateStats)
    ]

    eventCleanupRef.current = cleanupFunctions

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [statusService])

  // Context methods
  const updateParticipantStatus = useCallback((participantId: string, status: ParticipantStatus) => {
    statusService?.updateParticipantStatus(participantId, status, 'manual')
  }, [statusService])

  const getParticipantStatus = useCallback((participantId: string): ParticipantStatus | undefined => {
    return statusService?.getParticipant(participantId)?.status
  }, [statusService])

  const updateTypingStatus = useCallback((
    participantId: string, 
    channelId: string, 
    isTyping: boolean
  ) => {
    statusService?.updateTypingStatus(participantId, channelId, isTyping)
  }, [statusService])

  const getTypingParticipants = useCallback((channelId: string): TypingIndicator[] => {
    return typingParticipants.get(channelId) || []
  }, [typingParticipants])

  const markMessageAsRead = useCallback((
    participantId: string,
    messageId: string,
    channelId: string
  ) => {
    statusService?.markMessageAsRead(participantId, messageId, channelId)
  }, [statusService])

  const getReadReceipts = useCallback((messageId: string, channelId: string): ReadReceipt[] => {
    return statusService?.getReadReceipts(messageId, channelId) || []
  }, [statusService])

  const addParticipant = useCallback((participant: ChatParticipant) => {
    statusService?.addParticipant(participant)
  }, [statusService])

  const removeParticipant = useCallback((participantId: string) => {
    statusService?.removeParticipant(participantId)
  }, [statusService])

  const getParticipant = useCallback((participantId: string): ChatParticipant | undefined => {
    return statusService?.getParticipant(participantId)
  }, [statusService])

  // Event subscription methods
  const onStatusUpdate = useCallback((callback: (event: StatusUpdateEvent) => void) => {
    if (!statusService) return () => {}

    statusService.on('status_updated', callback)
    
    const cleanup = () => statusService.off('status_updated', callback)
    eventCleanupRef.current.push(cleanup)
    
    return cleanup
  }, [statusService])

  const onTypingUpdate = useCallback((callback: (event: TypingUpdateEvent) => void) => {
    if (!statusService) return () => {}

    statusService.on('typing_updated', callback)
    
    const cleanup = () => statusService.off('typing_updated', callback)
    eventCleanupRef.current.push(cleanup)
    
    return cleanup
  }, [statusService])

  const onReadUpdate = useCallback((callback: (event: ReadStatusEvent) => void) => {
    if (!statusService) return () => {}

    statusService.on('message_read', callback)
    
    const cleanup = () => statusService.off('message_read', callback)
    eventCleanupRef.current.push(cleanup)
    
    return cleanup
  }, [statusService])

  // Computed values
  const onlineParticipants = participants.filter(p => p.isOnline)

  const contextValue: ParticipantStatusContextValue = {
    statusService,
    participants,
    onlineParticipants,
    updateParticipantStatus,
    getParticipantStatus,
    typingParticipants,
    updateTypingStatus,
    getTypingParticipants,
    markMessageAsRead,
    getReadReceipts,
    addParticipant,
    removeParticipant,
    getParticipant,
    statistics,
    onStatusUpdate,
    onTypingUpdate,
    onReadUpdate
  }

  return (
    <ParticipantStatusContext.Provider value={contextValue}>
      {children}
    </ParticipantStatusContext.Provider>
  )
}

// Hook to use participant status context
export function useParticipantStatus() {
  const context = useContext(ParticipantStatusContext)
  
  if (!context) {
    throw new Error('useParticipantStatus must be used within a ParticipantStatusProvider')
  }
  
  return context
}

// Specialized hooks
export function useParticipantList(filterOnline = false) {
  const { participants, onlineParticipants } = useParticipantStatus()
  
  return filterOnline ? onlineParticipants : participants
}

export function useParticipantById(participantId: string) {
  const { getParticipant } = useParticipantStatus()
  const [participant, setParticipant] = useState<ChatParticipant | undefined>(undefined)

  useEffect(() => {
    setParticipant(getParticipant(participantId))
  }, [participantId, getParticipant])

  return participant
}

export function useTypingIndicators(channelId: string) {
  const { getTypingParticipants } = useParticipantStatus()
  const [indicators, setIndicators] = useState<TypingIndicator[]>([])

  useEffect(() => {
    const updateIndicators = () => {
      setIndicators(getTypingParticipants(channelId))
    }

    updateIndicators()
    
    // Update every second to handle timeouts
    const interval = setInterval(updateIndicators, 1000)
    
    return () => clearInterval(interval)
  }, [channelId, getTypingParticipants])

  return indicators
}

export function useReadReceipts(messageId: string, channelId: string) {
  const { getReadReceipts, onReadUpdate } = useParticipantStatus()
  const [receipts, setReceipts] = useState<ReadReceipt[]>([])

  useEffect(() => {
    setReceipts(getReadReceipts(messageId, channelId))
  }, [messageId, channelId, getReadReceipts])

  useEffect(() => {
    const cleanup = onReadUpdate((event) => {
      if (event.messageId === messageId && event.channelId === channelId) {
        setReceipts(getReadReceipts(messageId, channelId))
      }
    })

    return cleanup
  }, [messageId, channelId, onReadUpdate, getReadReceipts])

  return receipts
}

export function useParticipantStatistics() {
  const { statistics } = useParticipantStatus()
  return statistics
}

// Hook for managing participant actions
export function useParticipantActions() {
  const { 
    updateParticipantStatus, 
    updateTypingStatus, 
    markMessageAsRead,
    addParticipant,
    removeParticipant 
  } = useParticipantStatus()

  const setOnline = useCallback((participantId: string) => {
    updateParticipantStatus(participantId, 'online')
  }, [updateParticipantStatus])

  const setOffline = useCallback((participantId: string) => {
    updateParticipantStatus(participantId, 'offline')
  }, [updateParticipantStatus])

  const setAway = useCallback((participantId: string) => {
    updateParticipantStatus(participantId, 'away')
  }, [updateParticipantStatus])

  const setBusy = useCallback((participantId: string) => {
    updateParticipantStatus(participantId, 'busy')
  }, [updateParticipantStatus])

  const startTyping = useCallback((participantId: string, channelId: string) => {
    updateTypingStatus(participantId, channelId, true)
  }, [updateTypingStatus])

  const stopTyping = useCallback((participantId: string, channelId: string) => {
    updateTypingStatus(participantId, channelId, false)
  }, [updateTypingStatus])

  return {
    setOnline,
    setOffline,
    setAway,
    setBusy,
    startTyping,
    stopTyping,
    markMessageAsRead,
    addParticipant,
    removeParticipant
  }
}
