/**
 * Enhanced Stream Chat Service for Multi-Phase Architecture
 * Task 17.4: Stream Chat SDK Integration
 */

import { StreamChat as StreamChatClient, Channel, ChannelMemberResponse, MessageResponse } from 'stream-chat'
import { ChatPhase } from '@/lib/types/multi-phase-chat'

// Phase-specific channel types
export type PhaseChannelType = 'preparation' | 'fishing' | 'debrief'

// Channel configuration for each phase
export interface PhaseChannelConfig {
  type: PhaseChannelType
  name: string
  description: string
  features: ChatFeature[]
  permissions: ChannelPermissions
  autoMessages: AutoMessageConfig[]
  settings: ChannelSettings
}

export interface ChatFeature {
  id: string
  name: string
  enabled: boolean
  roleRestrictions?: string[]
}

export interface ChannelPermissions {
  readMessages: string[]     // roles that can read messages
  sendMessages: string[]     // roles that can send messages  
  uploadFiles: string[]      // roles that can upload files
  pinMessages: string[]      // roles that can pin messages
  deleteMessages: string[]   // roles that can delete messages
  manageChannel: string[]    // roles that can manage channel
}

export interface AutoMessageConfig {
  trigger: 'phase_enter' | 'phase_exit' | 'time_based' | 'event_based'
  delay?: number // milliseconds
  message: string
  messageType: 'system' | 'bot' | 'announcement'
  conditions?: any
}

export interface ChannelSettings {
  reactions: boolean
  replies: boolean
  uploads: boolean
  urlEnrichment: boolean
  commands: string[]
  mutes: boolean
  maxMessageLength?: number
  typingEvents: boolean
  readEvents: boolean
  connectEvents: boolean
}

// User roles in fishing trip context
export type TripRole = 'captain' | 'co-captain' | 'participant' | 'observer' | 'guide'

// Enhanced user interface for Stream Chat
export interface StreamChatUser {
  id: string
  name: string
  image?: string
  email?: string
  role: TripRole
  tripId?: string
  isOnline?: boolean
  lastSeen?: Date
  preferences?: UserChatPreferences
  metadata?: Record<string, any>
}

export interface UserChatPreferences {
  notifications: boolean
  sounds: boolean
  autoTransitions: boolean
  preferredLanguage: string
  timezone: string
}

// Event types for phase transitions
export interface PhaseTransitionEvent {
  type: 'phase_transition'
  fromPhase: ChatPhase
  toPhase: ChatPhase
  triggeredBy: string
  timestamp: Date
  data?: any
}

export class StreamChatService {
  private client: StreamChatClient | null = null
  private currentUser: StreamChatUser | null = null
  private phaseChannels: Map<ChatPhase, Channel> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()

  // Phase channel configurations
  private static PHASE_CONFIGS: Record<ChatPhase, PhaseChannelConfig> = {
    preparation: {
      type: 'preparation',
      name: 'Подготовка к рыбалке',
      description: 'Планирование поездки, координация, подготовка снастей',
      features: [
        { id: 'checklist', name: 'Чек-листы', enabled: true },
        { id: 'weather', name: 'Прогноз погоды', enabled: true },
        { id: 'gear', name: 'Обсуждение снастей', enabled: true },
        { id: 'coordination', name: 'Координация участников', enabled: true },
        { id: 'polls', name: 'Опросы', enabled: true, roleRestrictions: ['captain', 'co-captain'] }
      ],
      permissions: {
        readMessages: ['captain', 'co-captain', 'participant', 'observer'],
        sendMessages: ['captain', 'co-captain', 'participant'],
        uploadFiles: ['captain', 'co-captain', 'participant'],
        pinMessages: ['captain', 'co-captain'],
        deleteMessages: ['captain'],
        manageChannel: ['captain']
      },
      autoMessages: [
        {
          trigger: 'phase_enter',
          message: '🎣 Добро пожаловать в чат подготовки! Здесь мы планируем нашу рыбалку.',
          messageType: 'system'
        }
      ],
      settings: {
        reactions: true,
        replies: true,
        uploads: true,
        urlEnrichment: true,
        commands: ['poll', 'checklist', 'weather'],
        mutes: true,
        maxMessageLength: 1000,
        typingEvents: true,
        readEvents: true,
        connectEvents: true
      }
    },
    live: {
      type: 'fishing',
      name: 'Активная рыбалка',
      description: 'Общение во время рыбалки, координаты, уловы, экстренная связь',
      features: [
        { id: 'location', name: 'Геолокация', enabled: true },
        { id: 'catches', name: 'Журнал уловов', enabled: true },
        { id: 'photos', name: 'Фото уловов', enabled: true },
        { id: 'emergency', name: 'Экстренная связь', enabled: true },
        { id: 'safety', name: 'Проверка безопасности', enabled: true, roleRestrictions: ['captain', 'co-captain'] }
      ],
      permissions: {
        readMessages: ['captain', 'co-captain', 'participant', 'observer'],
        sendMessages: ['captain', 'co-captain', 'participant'],
        uploadFiles: ['captain', 'co-captain', 'participant'],
        pinMessages: ['captain', 'co-captain'],
        deleteMessages: ['captain'],
        manageChannel: ['captain']
      },
      autoMessages: [
        {
          trigger: 'phase_enter',
          message: '🚤 Начинаем рыбалку! Удачи всем! Не забывайте делиться уловами и координатами.',
          messageType: 'system'
        }
      ],
      settings: {
        reactions: true,
        replies: true,
        uploads: true,
        urlEnrichment: false, // Minimize distractions during fishing
        commands: ['location', 'catch', 'emergency', 'safety'],
        mutes: false, // Important for safety during active fishing
        maxMessageLength: 500, // Shorter messages for quick communication
        typingEvents: false, // Reduce noise during active fishing
        readEvents: false,
        connectEvents: true
      }
    },
    debrief: {
      type: 'debrief',
      name: 'Подведение итогов',
      description: 'Обмен впечатлениями, фото, планирование следующих поездок',
      features: [
        { id: 'reviews', name: 'Отзывы о поездке', enabled: true },
        { id: 'photos', name: 'Фотогалерея', enabled: true },
        { id: 'statistics', name: 'Статистика', enabled: true },
        { id: 'planning', name: 'Планирование следующих поездок', enabled: true },
        { id: 'rating', name: 'Оценки', enabled: true }
      ],
      permissions: {
        readMessages: ['captain', 'co-captain', 'participant', 'observer'],
        sendMessages: ['captain', 'co-captain', 'participant'],
        uploadFiles: ['captain', 'co-captain', 'participant'],
        pinMessages: ['captain', 'co-captain', 'participant'],
        deleteMessages: ['captain'],
        manageChannel: ['captain']
      },
      autoMessages: [
        {
          trigger: 'phase_enter',
          message: '🌅 Рыбалка завершена! Делитесь впечатлениями, фото и планируйте следующие поездки.',
          messageType: 'system'
        }
      ],
      settings: {
        reactions: true,
        replies: true,
        uploads: true,
        urlEnrichment: true,
        commands: ['review', 'rating', 'gallery', 'plan'],
        mutes: true,
        maxMessageLength: 2000, // Longer messages for detailed reviews
        typingEvents: true,
        readEvents: true,
        connectEvents: true
      }
    }
  }

  constructor() {
    // Initialize event listeners map
    this.eventListeners.set('phase_transition', [])
    this.eventListeners.set('channel_created', [])
    this.eventListeners.set('user_joined', [])
    this.eventListeners.set('user_left', [])
    this.eventListeners.set('message_sent', [])
  }

  // Initialize Stream Chat client
  async initialize(apiKey: string, user: StreamChatUser, token: string): Promise<void> {
    try {
      this.client = StreamChatClient.getInstance(apiKey)
      
      // Connect user to Stream Chat
      await this.client.connectUser(
        {
          id: user.id,
          name: user.name,
          image: user.image,
          role: user.role,
          tripId: user.tripId,
          ...user.metadata
        },
        token
      )

      this.currentUser = user
      console.log('✅ StreamChatService initialized for user:', user.id)
    } catch (error) {
      console.error('❌ Error initializing StreamChatService:', error)
      throw error
    }
  }

  // Create or get channel for specific phase
  async getPhaseChannel(tripId: string, phase: ChatPhase): Promise<Channel> {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized')
    }

    const channelId = `trip-${tripId}-${phase}`
    const existing = this.phaseChannels.get(phase)
    
    if (existing && existing.id === channelId) {
      return existing
    }

    const config = StreamChatService.PHASE_CONFIGS[phase]
    
    try {
      // Create or get channel
      const channel = this.client.channel(config.type, channelId, {
        name: config.name,
        description: config.description,
        phase,
        tripId,
        created_by_id: this.currentUser?.id,
        settings: config.settings,
        permissions: config.permissions,
        features: config.features.map(f => f.id),
        auto_messages: config.autoMessages
      })

      // Watch the channel
      await channel.watch()

      // Setup channel permissions
      await this.configureChannelPermissions(channel, config.permissions)

      // Store channel reference
      this.phaseChannels.set(phase, channel)

      // Emit channel created event
      this.emit('channel_created', { channel, phase, tripId })

      console.log(`✅ Created/Retrieved ${phase} channel:`, channelId)
      return channel

    } catch (error) {
      console.error(`❌ Error creating ${phase} channel:`, error)
      throw error
    }
  }

  // Configure channel permissions based on user roles
  private async configureChannelPermissions(
    channel: Channel, 
    permissions: ChannelPermissions
  ): Promise<void> {
    try {
      // Update channel permissions
      await channel.updatePartial({
        set: {
          permissions: {
            read_message: permissions.readMessages,
            send_message: permissions.sendMessages,
            upload_file: permissions.uploadFiles,
            pin_message: permissions.pinMessages,
            delete_message: permissions.deleteMessages,
            update_channel: permissions.manageChannel
          }
        }
      })
    } catch (error) {
      console.error('❌ Error configuring channel permissions:', error)
    }
  }

  // Transition between phases
  async transitionToPhase(
    tripId: string, 
    fromPhase: ChatPhase, 
    toPhase: ChatPhase,
    triggeredBy: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Stream Chat client not initialized')
    }

    try {
      // Get channels for both phases
      const fromChannel = this.phaseChannels.get(fromPhase)
      const toChannel = await this.getPhaseChannel(tripId, toPhase)

      // Send transition message to current channel
      if (fromChannel) {
        await fromChannel.sendMessage({
          text: `🔄 Переходим к фазе "${StreamChatService.PHASE_CONFIGS[toPhase].name}"`,
          type: 'system',
          user_id: 'system',
          custom: {
            type: 'phase_transition',
            fromPhase,
            toPhase,
            triggeredBy
          }
        })
      }

      // Send auto-messages to new channel
      const config = StreamChatService.PHASE_CONFIGS[toPhase]
      for (const autoMsg of config.autoMessages) {
        if (autoMsg.trigger === 'phase_enter') {
          await toChannel.sendMessage({
            text: autoMsg.message,
            type: autoMsg.messageType,
            user_id: autoMsg.messageType === 'system' ? 'system' : this.currentUser?.id
          })
        }
      }

      // Emit phase transition event
      const event: PhaseTransitionEvent = {
        type: 'phase_transition',
        fromPhase,
        toPhase,
        triggeredBy,
        timestamp: new Date()
      }
      
      this.emit('phase_transition', event)

      console.log(`✅ Transitioned from ${fromPhase} to ${toPhase}`)

    } catch (error) {
      console.error('❌ Error transitioning phases:', error)
      throw error
    }
  }

  // Add participants to phase channel
  async addParticipants(
    tripId: string, 
    phase: ChatPhase, 
    userIds: string[]
  ): Promise<void> {
    try {
      const channel = await this.getPhaseChannel(tripId, phase)
      
      await channel.addMembers(userIds.map(id => ({ user_id: id })))
      
      console.log(`✅ Added ${userIds.length} participants to ${phase} channel`)
    } catch (error) {
      console.error('❌ Error adding participants:', error)
      throw error
    }
  }

  // Remove participants from phase channel
  async removeParticipants(
    tripId: string, 
    phase: ChatPhase, 
    userIds: string[]
  ): Promise<void> {
    try {
      const channel = await this.getPhaseChannel(tripId, phase)
      
      await channel.removeMembers(userIds)
      
      console.log(`✅ Removed ${userIds.length} participants from ${phase} channel`)
    } catch (error) {
      console.error('❌ Error removing participants:', error)
      throw error
    }
  }

  // Send custom message with phase-specific features
  async sendPhaseMessage(
    tripId: string,
    phase: ChatPhase,
    message: {
      text?: string
      type?: string
      attachments?: any[]
      custom?: any
    }
  ): Promise<MessageResponse> {
    try {
      const channel = await this.getPhaseChannel(tripId, phase)
      
      const response = await channel.sendMessage({
        text: message.text || '',
        type: message.type || 'regular',
        attachments: message.attachments || [],
        custom: {
          phase,
          tripId,
          ...message.custom
        }
      })

      this.emit('message_sent', { message: response, phase, tripId })
      return response

    } catch (error) {
      console.error('❌ Error sending phase message:', error)
      throw error
    }
  }

  // Get channel members with their roles
  async getChannelMembers(tripId: string, phase: ChatPhase): Promise<ChannelMemberResponse[]> {
    try {
      const channel = await this.getPhaseChannel(tripId, phase)
      const response = await channel.queryMembers({})
      
      return response.members
    } catch (error) {
      console.error('❌ Error getting channel members:', error)
      throw error
    }
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

  // Get current channel for phase
  getCurrentPhaseChannel(phase: ChatPhase): Channel | null {
    return this.phaseChannels.get(phase) || null
  }

  // Get phase configuration
  static getPhaseConfig(phase: ChatPhase): PhaseChannelConfig {
    return StreamChatService.PHASE_CONFIGS[phase]
  }

  // Cleanup
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnectUser()
      this.client = null
      this.currentUser = null
      this.phaseChannels.clear()
      this.eventListeners.clear()
      console.log('✅ StreamChatService disconnected')
    }
  }
}
