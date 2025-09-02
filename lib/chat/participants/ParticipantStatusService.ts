/**
 * Real-time Participant Status Service
 * Task 17.5: Participant Management System - Online/Offline Status Tracking
 */

import { StreamChat, Event } from 'stream-chat'
import { 
  ChatParticipant, 
  ParticipantStatus, 
  ParticipantEvent,
  TypingIndicator,
  ReadReceipt
} from '@/lib/chat/participant-types'

// Status update event
export interface StatusUpdateEvent {
  participantId: string
  previousStatus: ParticipantStatus
  newStatus: ParticipantStatus
  timestamp: Date
  source: 'stream_chat' | 'manual' | 'heartbeat' | 'activity'
}

// Typing event
export interface TypingUpdateEvent {
  participantId: string
  participantName: string
  channelId: string
  isTyping: boolean
  timestamp: Date
}

// Read status event
export interface ReadStatusEvent {
  participantId: string
  messageId: string
  channelId: string
  readAt: Date
}

export class ParticipantStatusService {
  private streamClient: StreamChat | null = null
  private participants: Map<string, ChatParticipant> = new Map()
  private statusCache: Map<string, ParticipantStatus> = new Map()
  private typingCache: Map<string, TypingIndicator> = new Map()
  private readReceiptCache: Map<string, ReadReceipt[]> = new Map()
  
  // Event listeners
  private eventListeners: Map<string, Function[]> = new Map()
  
  // Heartbeat and activity tracking
  private heartbeatInterval: NodeJS.Timeout | null = null
  private activityTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  // Configuration
  private config = {
    heartbeatInterval: 30000, // 30 seconds
    typingTimeout: 3000, // 3 seconds
    awayTimeout: 300000, // 5 minutes
    offlineTimeout: 600000, // 10 minutes
    enableAutomaticStatusUpdates: true,
    enableTypingIndicators: true,
    enableReadReceipts: true
  }

  constructor(streamClient?: StreamChat) {
    if (streamClient) {
      this.setStreamClient(streamClient)
    }
    this.initializeEventListeners()
  }

  // Initialize with Stream Chat client
  setStreamClient(client: StreamChat): void {
    this.streamClient = client
    this.setupStreamEventListeners()
    this.startHeartbeat()
  }

  // Add participant to tracking
  addParticipant(participant: ChatParticipant): void {
    this.participants.set(participant.id, participant)
    this.statusCache.set(participant.id, participant.status)
    
    // Start activity tracking for this participant
    this.trackParticipantActivity(participant.id)
    
    this.emit('participant_added', participant)
  }

  // Remove participant from tracking
  removeParticipant(participantId: string): void {
    const participant = this.participants.get(participantId)
    if (participant) {
      this.participants.delete(participantId)
      this.statusCache.delete(participantId)
      this.typingCache.delete(participantId)
      
      // Clear activity timeout
      const timeout = this.activityTimeouts.get(participantId)
      if (timeout) {
        clearTimeout(timeout)
        this.activityTimeouts.delete(participantId)
      }
      
      this.emit('participant_removed', participant)
    }
  }

  // Update participant status
  updateParticipantStatus(
    participantId: string, 
    newStatus: ParticipantStatus,
    source: StatusUpdateEvent['source'] = 'manual'
  ): void {
    const participant = this.participants.get(participantId)
    const previousStatus = this.statusCache.get(participantId)
    
    if (!participant || previousStatus === newStatus) return

    // Update caches
    this.statusCache.set(participantId, newStatus)
    participant.status = newStatus
    participant.isOnline = newStatus === 'online'
    participant.lastActivity = new Date()
    
    if (newStatus === 'offline') {
      participant.lastSeen = new Date()
    }

    // Create status update event
    const statusEvent: StatusUpdateEvent = {
      participantId,
      previousStatus: previousStatus || 'offline',
      newStatus,
      timestamp: new Date(),
      source
    }

    this.emit('status_updated', statusEvent)
    this.emit('participant_updated', participant)
  }

  // Update typing status
  updateTypingStatus(
    participantId: string, 
    channelId: string, 
    isTyping: boolean
  ): void {
    const participant = this.participants.get(participantId)
    if (!participant) return

    const typingKey = `${participantId}-${channelId}`
    
    if (isTyping) {
      // Add or update typing indicator
      const indicator: TypingIndicator = {
        participantId,
        participantName: participant.name,
        startedAt: new Date(),
        channelId
      }
      
      this.typingCache.set(typingKey, indicator)
      participant.isTyping = true
      
      // Auto-clear typing after timeout
      setTimeout(() => {
        this.updateTypingStatus(participantId, channelId, false)
      }, this.config.typingTimeout)
      
    } else {
      // Remove typing indicator
      this.typingCache.delete(typingKey)
      participant.isTyping = false
    }

    const typingEvent: TypingUpdateEvent = {
      participantId,
      participantName: participant.name,
      channelId,
      isTyping,
      timestamp: new Date()
    }

    this.emit('typing_updated', typingEvent)
    this.emit('participant_updated', participant)
  }

  // Track message read status
  markMessageAsRead(
    participantId: string,
    messageId: string,
    channelId: string
  ): void {
    const participant = this.participants.get(participantId)
    if (!participant) return

    const receipt: ReadReceipt = {
      messageId,
      participantId,
      readAt: new Date(),
      channelId
    }

    // Add to cache
    const channelReceipts = this.readReceiptCache.get(channelId) || []
    const existingIndex = channelReceipts.findIndex(
      r => r.participantId === participantId && r.messageId === messageId
    )

    if (existingIndex >= 0) {
      channelReceipts[existingIndex] = receipt
    } else {
      channelReceipts.push(receipt)
    }

    this.readReceiptCache.set(channelId, channelReceipts)

    // Update participant
    participant.lastReadMessageId = messageId
    participant.lastActivity = new Date()

    const readEvent: ReadStatusEvent = {
      participantId,
      messageId,
      channelId,
      readAt: receipt.readAt
    }

    this.emit('message_read', readEvent)
    this.emit('participant_updated', participant)
  }

  // Get current participants
  getParticipants(): ChatParticipant[] {
    return Array.from(this.participants.values())
  }

  // Get participant by ID
  getParticipant(participantId: string): ChatParticipant | undefined {
    return this.participants.get(participantId)
  }

  // Get online participants
  getOnlineParticipants(): ChatParticipant[] {
    return this.getParticipants().filter(p => p.isOnline)
  }

  // Get typing participants for channel
  getTypingParticipants(channelId: string): TypingIndicator[] {
    return Array.from(this.typingCache.values())
      .filter(indicator => indicator.channelId === channelId)
  }

  // Get read receipts for message
  getReadReceipts(messageId: string, channelId: string): ReadReceipt[] {
    const channelReceipts = this.readReceiptCache.get(channelId) || []
    return channelReceipts.filter(receipt => receipt.messageId === messageId)
  }

  // Setup Stream Chat event listeners
  private setupStreamEventListeners(): void {
    if (!this.streamClient) return

    // User presence events
    this.streamClient.on('user.presence.changed', (event: Event) => {
      if (event.user?.id) {
        const status: ParticipantStatus = event.user.online ? 'online' : 'offline'
        this.updateParticipantStatus(event.user.id, status, 'stream_chat')
      }
    })

    // User watching events
    this.streamClient.on('user.watching.start', (event: Event) => {
      if (event.user?.id) {
        this.updateParticipantStatus(event.user.id, 'online', 'stream_chat')
        this.trackParticipantActivity(event.user.id)
      }
    })

    this.streamClient.on('user.watching.stop', (event: Event) => {
      if (event.user?.id) {
        this.updateParticipantStatus(event.user.id, 'away', 'stream_chat')
      }
    })

    // Typing events
    if (this.config.enableTypingIndicators) {
      this.streamClient.on('typing.start', (event: Event) => {
        if (event.user?.id && event.cid) {
          this.updateTypingStatus(event.user.id, event.cid, true)
        }
      })

      this.streamClient.on('typing.stop', (event: Event) => {
        if (event.user?.id && event.cid) {
          this.updateTypingStatus(event.user.id, event.cid, false)
        }
      })
    }

    // Message read events
    if (this.config.enableReadReceipts) {
      this.streamClient.on('message.read', (event: Event) => {
        if (event.user?.id && event.message?.id && event.cid) {
          this.markMessageAsRead(event.user.id, event.message.id, event.cid)
        }
      })
    }

    // Connection events
    this.streamClient.on('connection.changed', (event: Event) => {
      if (event.online === false) {
        // Mark all participants as potentially offline when connection is lost
        this.getParticipants().forEach(participant => {
          if (participant.isOnline) {
            this.updateParticipantStatus(participant.id, 'offline', 'stream_chat')
          }
        })
      }
    })
  }

  // Track participant activity
  private trackParticipantActivity(participantId: string): void {
    // Clear existing timeout
    const existingTimeout = this.activityTimeouts.get(participantId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new activity timeout
    const timeout = setTimeout(() => {
      const currentStatus = this.statusCache.get(participantId)
      if (currentStatus === 'online') {
        this.updateParticipantStatus(participantId, 'away', 'activity')
      }
    }, this.config.awayTimeout)

    this.activityTimeouts.set(participantId, timeout)
  }

  // Start heartbeat for connection monitoring
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
    }

    this.heartbeatInterval = setInterval(() => {
      this.checkParticipantConnections()
    }, this.config.heartbeatInterval)
  }

  // Check participant connections
  private checkParticipantConnections(): void {
    const now = new Date()
    
    this.getParticipants().forEach(participant => {
      const timeSinceActivity = now.getTime() - participant.lastActivity.getTime()
      
      if (participant.isOnline && timeSinceActivity > this.config.offlineTimeout) {
        this.updateParticipantStatus(participant.id, 'offline', 'heartbeat')
      } else if (participant.status === 'online' && timeSinceActivity > this.config.awayTimeout) {
        this.updateParticipantStatus(participant.id, 'away', 'heartbeat')
      }
    })
  }

  // Initialize event listeners
  private initializeEventListeners(): void {
    this.eventListeners.set('participant_added', [])
    this.eventListeners.set('participant_removed', [])
    this.eventListeners.set('participant_updated', [])
    this.eventListeners.set('status_updated', [])
    this.eventListeners.set('typing_updated', [])
    this.eventListeners.set('message_read', [])
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  // Update configuration
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (newConfig.heartbeatInterval) {
      this.startHeartbeat()
    }
  }

  // Get current configuration
  getConfig(): typeof this.config {
    return { ...this.config }
  }

  // Get statistics
  getStatistics() {
    const participants = this.getParticipants()
    const onlineCount = participants.filter(p => p.isOnline).length
    const typingCount = Array.from(this.typingCache.values()).length
    
    return {
      total: participants.length,
      online: onlineCount,
      offline: participants.length - onlineCount,
      typing: typingCount,
      channels: this.readReceiptCache.size,
      uptime: this.heartbeatInterval ? 'active' : 'inactive'
    }
  }

  // Cleanup
  destroy(): void {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Clear activity timeouts
    this.activityTimeouts.forEach(timeout => clearTimeout(timeout))
    this.activityTimeouts.clear()

    // Clear caches
    this.participants.clear()
    this.statusCache.clear()
    this.typingCache.clear()
    this.readReceiptCache.clear()

    // Clear event listeners
    this.eventListeners.clear()

    // Disconnect from Stream Chat events
    if (this.streamClient) {
      this.streamClient.off()
    }
  }
}

// Default instance
let defaultStatusService: ParticipantStatusService | null = null

export const getParticipantStatusService = (): ParticipantStatusService => {
  if (!defaultStatusService) {
    defaultStatusService = new ParticipantStatusService()
  }
  return defaultStatusService
}

export const setDefaultStatusService = (service: ParticipantStatusService): void => {
  defaultStatusService = service
}
