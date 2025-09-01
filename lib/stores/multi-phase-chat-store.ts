/**
 * Multi-Phase Chat State Management Store using Zustand
 * Task 17.1: Chat State Management Architecture
 */

import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { StreamChat as StreamChatClient } from 'stream-chat'
import { 
  ChatPhase, 
  EventChat, 
  CustomMessageType, 
  DEFAULT_PHASE_CONFIGS,
  MultiPhaseChatEvent 
} from '@/lib/types/multi-phase-chat'
import {
  MultiPhaseChatStore,
  MultiPhaseChatState,
  ChatStoreConfig,
  ChatNotification,
  ChatAction,
  ChatPersistentState,
  ChatPhaseState,
  ChatConnectionState,
  ChatUIState,
  ChatAnalytics,
  ChatSyncState
} from './multi-phase-chat-types'

// Default state values
const defaultConnectionState: ChatConnectionState = {
  client: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  reconnectAttempts: 0,
  lastConnectedAt: null
}

const defaultUIState: ChatUIState = {
  isOpen: false,
  isMinimized: false,
  isFullscreen: false,
  activeTab: 'messages',
  messageInput: '',
  isDrafting: false,
  draftSaved: false,
  attachments: [],
  searchQuery: '',
  messageFilter: 'all',
  isSearching: false,
  notificationsEnabled: true,
  soundEnabled: true,
  desktopNotifications: false,
  theme: 'auto',
  fontSize: 'medium',
  compactMode: false
}

const defaultAnalytics: ChatAnalytics = {
  sessionStartTime: new Date(),
  totalMessagesCount: 0,
  customMessagesCount: 0,
  participationRate: 0,
  averageResponseTime: 0,
  mostActivePhase: null,
  phaseAnalytics: {
    preparation: { messagesCount: 0, timeSpent: 0, participantsActive: 0, customFeaturesUsed: [] },
    live: { messagesCount: 0, timeSpent: 0, participantsActive: 0, customFeaturesUsed: [] },
    debrief: { messagesCount: 0, timeSpent: 0, participantsActive: 0, customFeaturesUsed: [] }
  },
  userActivity: {}
}

const defaultSyncState: ChatSyncState = {
  lastSyncAt: null,
  isSyncing: false,
  syncError: null,
  pendingActions: [],
  conflictResolution: 'client'
}

// Helper function to create default phase state
const createDefaultPhaseState = (phase: ChatPhase): ChatPhaseState => ({
  phase,
  isActive: false,
  isLoaded: false,
  channel: null,
  channelId: '',
  config: DEFAULT_PHASE_CONFIGS[phase],
  messageCount: 0,
  unreadCount: 0,
  lastMessageAt: null,
  lastReadMessageId: null,
  participantCount: 0,
  onlineParticipants: [],
  typingUsers: [],
  customMessages: [],
  sharedLocations: [],
  phaseData: {},
  isLoading: false,
  error: null
})

// Default store configuration
const defaultConfig: ChatStoreConfig = {
  apiBaseUrl: '/api/chat',
  streamApiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY || '',
  persistenceKey: 'multi-phase-chat',
  persistenceProvider: 'localStorage',
  autoSyncInterval: 30000, // 30 seconds
  syncOnFocus: true,
  syncOnOnline: true,
  enableNotifications: true,
  enableSound: true,
  enableDesktopNotifications: false,
  messageLoadLimit: 50,
  messageRetentionDays: 30,
  analyticsRetentionDays: 7,
  enableDebugLogging: process.env.NODE_ENV === 'development',
  enableAnalytics: true
}

// Create the Zustand store
export const useMultiPhaseChatStore = create<MultiPhaseChatStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          connection: defaultConnectionState,
          user: null,
          trip: null,
          currentPhase: 'preparation',
          phases: {
            preparation: createDefaultPhaseState('preparation'),
            live: createDefaultPhaseState('live'),
            debrief: createDefaultPhaseState('debrief')
          },
          eventChat: null,
          ui: defaultUIState,
          analytics: defaultAnalytics,
          notifications: [],
          sync: defaultSyncState,
          persistent: null,
          events: [],
          isInitialized: false,
          isLoading: false,
          error: null,

          // Initialization actions
          initialize: async (tripId: string, userId: string) => {
            try {
              set((state) => {
                state.isLoading = true
                state.error = null
              })

              // Load persistent state first
              await get().loadPersistentState()

              // Initialize trip context
              set((state) => {
                state.trip = {
                  tripId,
                  tripDate: new Date(), // This should be loaded from API
                  captainId: '',
                  participantIds: [],
                  tripStatus: 'scheduled',
                  autoPhaseTransition: true,
                  phaseTransitionRules: {
                    preparation: { startDaysBefore: 7, endDaysBefore: 0 },
                    live: { startDaysBefore: 0, endDaysAfter: 1 },
                    debrief: { startDaysAfter: 0, endDaysAfter: 30 }
                  }
                }
                state.persistent = {
                  tripId,
                  userId,
                  preferredPhase: null,
                  phaseHistory: [],
                  messageDrafts: { preparation: '', live: '', debrief: '' },
                  uiPreferences: {},
                  readStatus: {
                    preparation: { lastReadMessageId: '', lastReadAt: new Date() },
                    live: { lastReadMessageId: '', lastReadAt: new Date() },
                    debrief: { lastReadMessageId: '', lastReadAt: new Date() }
                  },
                  notificationSettings: {
                    phases: { preparation: true, live: true, debrief: true },
                    messageTypes: {
                      weather_update: true,
                      catch_photo: true,
                      location_share: true,
                      fishing_tip: true,
                      gear_recommendation: true,
                      route_update: true,
                      safety_alert: true
                    },
                    quietHours: { enabled: false, start: '22:00', end: '08:00' }
                  }
                }
              })

              // Connect to Stream Chat
              await get().connect()

              // Load chat data from API
              const response = await fetch(`${defaultConfig.apiBaseUrl}/multi-phase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tripId, action: 'get' })
              })

              if (response.ok) {
                const data = await response.json()
                if (data.success) {
                  set((state) => {
                    state.eventChat = data.data.eventChat
                    state.currentPhase = data.data.currentPhase || 'preparation'
                    
                    // Update phases with loaded data
                    Object.keys(state.phases).forEach(phase => {
                      const phaseKey = phase as ChatPhase
                      const chatData = data.data.eventChat?.phases[phaseKey]
                      if (chatData) {
                        state.phases[phaseKey].channelId = chatData.channelId
                        state.phases[phaseKey].isActive = chatData.isActive
                      }
                    })
                  })
                }
              }

              // Load the current phase
              await get().loadPhase(get().currentPhase)

              set((state) => {
                state.isInitialized = true
                state.isLoading = false
              })

              // Track initialization event
              get().trackEvent({
                type: 'phase_changed',
                phase: get().currentPhase,
                tripId,
                userId,
                data: { action: 'initialize' }
              })

            } catch (error) {
              get().handleError(error as Error, 'initialize')
            }
          },

          cleanup: () => {
            set((state) => {
              // Disconnect Stream Chat client
              if (state.connection.client) {
                state.connection.client.disconnectUser()
              }

              // Save persistent state before cleanup
              get().savePersistentState()

              // Reset to initial state
              Object.assign(state, {
                connection: defaultConnectionState,
                user: null,
                trip: null,
                currentPhase: 'preparation',
                phases: {
                  preparation: createDefaultPhaseState('preparation'),
                  live: createDefaultPhaseState('live'),
                  debrief: createDefaultPhaseState('debrief')
                },
                eventChat: null,
                ui: defaultUIState,
                analytics: defaultAnalytics,
                notifications: [],
                sync: defaultSyncState,
                events: [],
                isInitialized: false,
                isLoading: false,
                error: null
              })
            })
          },

          reset: () => {
            get().cleanup()
          },

          // Connection management
          connect: async () => {
            try {
              set((state) => {
                state.connection.isConnecting = true
                state.connection.connectionError = null
              })

              const { trip, user } = get()
              if (!trip || !user) {
                throw new Error('Trip context or user not available for connection')
              }

              // Get token from API
              const tokenResponse = await fetch(`${defaultConfig.apiBaseUrl}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.userId })
              })

              if (!tokenResponse.ok) {
                throw new Error('Failed to get chat token')
              }

              const tokenData = await tokenResponse.json()
              if (!tokenData.success) {
                throw new Error(tokenData.error || 'Failed to get chat token')
              }

              // Initialize Stream Chat client
              const client = StreamChatClient.getInstance(defaultConfig.streamApiKey)
              
              await client.connectUser(
                {
                  id: user.userId,
                  name: user.userName,
                  image: user.avatar
                },
                tokenData.token
              )

              set((state) => {
                state.connection.client = client
                state.connection.isConnected = true
                state.connection.isConnecting = false
                state.connection.lastConnectedAt = new Date()
                state.connection.reconnectAttempts = 0
              })

              console.log('✅ Connected to Stream Chat')

            } catch (error) {
              set((state) => {
                state.connection.isConnecting = false
                state.connection.connectionError = (error as Error).message
                state.connection.reconnectAttempts += 1
              })
              throw error
            }
          },

          disconnect: () => {
            const { client } = get().connection
            if (client) {
              client.disconnectUser()
              set((state) => {
                state.connection.client = null
                state.connection.isConnected = false
                state.connection.lastConnectedAt = null
              })
            }
          },

          reconnect: async () => {
            const { reconnectAttempts } = get().connection
            if (reconnectAttempts < 5) {
              await get().connect()
            } else {
              get().setError('Maximum reconnection attempts reached')
            }
          },

          // Phase management
          switchPhase: async (phase: ChatPhase) => {
            try {
              const { currentPhase, trip } = get()
              if (currentPhase === phase) return

              set((state) => {
                state.phases[phase].isLoading = true
              })

              // Update phase on server
              const response = await fetch(`${defaultConfig.apiBaseUrl}/multi-phase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tripId: trip?.tripId,
                  action: 'switch_phase',
                  phase
                })
              })

              if (!response.ok) {
                throw new Error('Failed to switch phase on server')
              }

              // Load the new phase
              await get().loadPhase(phase)

              set((state) => {
                // Add to phase history
                if (state.persistent) {
                  state.persistent.phaseHistory.push({
                    phase: currentPhase,
                    enteredAt: new Date(),
                    leftAt: new Date()
                  })
                  state.persistent.phaseHistory.push({
                    phase,
                    enteredAt: new Date()
                  })
                }

                state.currentPhase = phase
                state.phases[phase].isActive = true
                state.phases[currentPhase].isActive = false
                state.phases[phase].isLoading = false
              })

              // Track phase change event
              get().trackEvent({
                type: 'phase_changed',
                phase,
                tripId: trip?.tripId || '',
                data: { previousPhase: currentPhase }
              })

              console.log(`✅ Switched to phase: ${phase}`)

            } catch (error) {
              set((state) => {
                state.phases[phase].isLoading = false
                state.phases[phase].error = (error as Error).message
              })
              get().handleError(error as Error, `switchPhase:${phase}`)
            }
          },

          setCurrentPhase: (phase: ChatPhase) => {
            set((state) => {
              state.currentPhase = phase
            })
          },

          loadPhase: async (phase: ChatPhase) => {
            try {
              const { connection, trip } = get()
              
              if (!connection.client || !trip) {
                throw new Error('Chat client or trip context not available')
              }

              set((state) => {
                state.phases[phase].isLoading = true
                state.phases[phase].error = null
              })

              // Get channel for this phase
              const channelId = `trip-${trip.tripId}-${phase}`
              const channel = connection.client.channel('messaging', channelId)

              // Watch the channel
              await channel.watch()

              set((state) => {
                state.phases[phase].channel = channel
                state.phases[phase].channelId = channelId
                state.phases[phase].isLoaded = true
                state.phases[phase].isLoading = false
              })

              console.log(`✅ Loaded phase: ${phase}`)

            } catch (error) {
              set((state) => {
                state.phases[phase].isLoading = false
                state.phases[phase].error = (error as Error).message
              })
              get().handleError(error as Error, `loadPhase:${phase}`)
            }
          },

          unloadPhase: (phase: ChatPhase) => {
            set((state) => {
              const phaseState = state.phases[phase]
              if (phaseState.channel) {
                phaseState.channel.stopWatching()
              }
              phaseState.channel = null
              phaseState.isLoaded = false
              phaseState.isActive = false
            })
          },

          // Message management
          sendMessage: async (content: string, phase?: ChatPhase) => {
            try {
              const targetPhase = phase || get().currentPhase
              const phaseState = get().phases[targetPhase]
              
              if (!phaseState.channel) {
                throw new Error(`Channel not loaded for phase: ${targetPhase}`)
              }

              await phaseState.channel.sendMessage({ text: content })
              
              // Update analytics
              set((state) => {
                state.analytics.totalMessagesCount += 1
                state.analytics.phaseAnalytics[targetPhase].messagesCount += 1
              })

              // Track event
              get().trackEvent({
                type: 'message_sent',
                phase: targetPhase,
                tripId: get().trip?.tripId || ''
              })

            } catch (error) {
              get().handleError(error as Error, 'sendMessage')
            }
          },

          sendCustomMessage: async (type: CustomMessageType, payload: any, phase?: ChatPhase) => {
            try {
              const targetPhase = phase || get().currentPhase
              const phaseState = get().phases[targetPhase]
              
              if (!phaseState.channel) {
                throw new Error(`Channel not loaded for phase: ${targetPhase}`)
              }

              const customMessage = {
                type: 'custom_message',
                custom_type: type,
                payload,
                phase: targetPhase
              }

              await phaseState.channel.sendMessage(customMessage)
              
              // Update analytics
              set((state) => {
                state.analytics.customMessagesCount += 1
                state.analytics.phaseAnalytics[targetPhase].customFeaturesUsed.push(type)
              })

              // Track event
              get().trackEvent({
                type: 'feature_used',
                phase: targetPhase,
                tripId: get().trip?.tripId || '',
                data: { featureType: type }
              })

            } catch (error) {
              get().handleError(error as Error, 'sendCustomMessage')
            }
          },

          markMessagesAsRead: (phase: ChatPhase, messageId?: string) => {
            set((state) => {
              if (messageId) {
                state.phases[phase].lastReadMessageId = messageId
              }
              state.phases[phase].unreadCount = 0
              
              if (state.persistent) {
                state.persistent.readStatus[phase] = {
                  lastReadMessageId: messageId || '',
                  lastReadAt: new Date()
                }
              }
            })
          },

          // User management
          updateUserStatus: (status) => {
            set((state) => {
              if (state.user) {
                Object.assign(state.user, status)
              }
            })
          },

          setUserPermissions: (permissions) => {
            set((state) => {
              if (state.user) {
                Object.assign(state.user.permissions, permissions)
              }
            })
          },

          // UI actions
          toggleChat: () => {
            set((state) => {
              state.ui.isOpen = !state.ui.isOpen
              if (state.ui.isOpen) {
                state.ui.isMinimized = false
              }
            })
          },

          minimizeChat: () => {
            set((state) => {
              state.ui.isMinimized = true
              state.ui.isFullscreen = false
            })
          },

          maximizeChat: () => {
            set((state) => {
              state.ui.isMinimized = false
              state.ui.isFullscreen = true
            })
          },

          setActiveTab: (tab) => {
            set((state) => {
              state.ui.activeTab = tab
            })
          },

          updateUIState: (updates) => {
            set((state) => {
              Object.assign(state.ui, updates)
            })
          },

          // Notification management
          addNotification: (notification) => {
            set((state) => {
              const newNotification: ChatNotification = {
                ...notification,
                id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
                isRead: false
              }
              state.notifications.unshift(newNotification)
              
              // Keep only last 100 notifications
              if (state.notifications.length > 100) {
                state.notifications = state.notifications.slice(0, 100)
              }
            })
          },

          markNotificationAsRead: (notificationId: string) => {
            set((state) => {
              const notification = state.notifications.find(n => n.id === notificationId)
              if (notification) {
                notification.isRead = true
              }
            })
          },

          clearNotifications: (phase?: ChatPhase) => {
            set((state) => {
              if (phase) {
                state.notifications = state.notifications.filter(n => n.phase !== phase)
              } else {
                state.notifications = []
              }
            })
          },

          // Persistence
          savePersistentState: async () => {
            try {
              const { persistent } = get()
              if (persistent && defaultConfig.persistenceProvider === 'localStorage') {
                localStorage.setItem(
                  `${defaultConfig.persistenceKey}-${persistent.tripId}-${persistent.userId}`,
                  JSON.stringify(persistent)
                )
              }
            } catch (error) {
              console.error('Failed to save persistent state:', error)
            }
          },

          loadPersistentState: async () => {
            try {
              const { trip, user } = get()
              if (trip && user && defaultConfig.persistenceProvider === 'localStorage') {
                const key = `${defaultConfig.persistenceKey}-${trip.tripId}-${user.userId}`
                const saved = localStorage.getItem(key)
                if (saved) {
                  const persistent = JSON.parse(saved) as ChatPersistentState
                  set((state) => {
                    state.persistent = persistent
                    // Apply UI preferences
                    Object.assign(state.ui, persistent.uiPreferences)
                  })
                }
              }
            } catch (error) {
              console.error('Failed to load persistent state:', error)
            }
          },

          updatePersistentState: (updates) => {
            set((state) => {
              if (state.persistent) {
                Object.assign(state.persistent, updates)
              }
            })
            get().savePersistentState()
          },

          // Analytics
          trackEvent: (event) => {
            set((state) => {
              const fullEvent: MultiPhaseChatEvent = {
                ...event,
                timestamp: new Date()
              }
              state.events.push(fullEvent)
              
              // Keep only last 1000 events
              if (state.events.length > 1000) {
                state.events = state.events.slice(-1000)
              }
            })
          },

          updateAnalytics: (updates) => {
            set((state) => {
              Object.assign(state.analytics, updates)
            })
          },

          // Sync management
          syncWithServer: async () => {
            try {
              set((state) => {
                state.sync.isSyncing = true
                state.sync.syncError = null
              })

              // Implementation depends on server API
              // This would sync local state with server state

              set((state) => {
                state.sync.lastSyncAt = new Date()
                state.sync.isSyncing = false
              })

            } catch (error) {
              set((state) => {
                state.sync.isSyncing = false
                state.sync.syncError = (error as Error).message
              })
            }
          },

          handleSyncConflict: (resolution) => {
            set((state) => {
              state.sync.conflictResolution = resolution
            })
          },

          // Error handling
          setError: (error) => {
            set((state) => {
              state.error = error
            })
          },

          clearError: () => {
            set((state) => {
              state.error = null
            })
          },

          handleError: (error: Error, context: string) => {
            console.error(`Chat Error [${context}]:`, error)
            
            set((state) => {
              state.error = `${context}: ${error.message}`
            })

            // Track error event
            get().trackEvent({
              type: 'feature_used', // Using available event type
              phase: get().currentPhase,
              tripId: get().trip?.tripId || '',
              data: { error: error.message, context }
            })

            // Add error notification
            get().addNotification({
              type: 'system',
              title: 'Chat Error',
              message: `${context}: ${error.message}`,
              phase: get().currentPhase,
              priority: 'high'
            })
          }
        }))
      ),
      {
        name: 'multi-phase-chat-store',
        partialize: (state) => ({
          ui: state.ui,
          persistent: state.persistent,
          analytics: state.analytics
        })
      }
    ),
    {
      name: 'multi-phase-chat-store'
    }
  )
)

// Store configuration hook
export const useChatStoreConfig = () => {
  return defaultConfig
}

// Utility hooks for specific parts of the state
export const useChatConnection = () => {
  return useMultiPhaseChatStore((state) => state.connection)
}

export const useChatPhases = () => {
  return useMultiPhaseChatStore((state) => state.phases)
}

export const useChatCurrentPhase = () => {
  return useMultiPhaseChatStore((state) => state.currentPhase)
}

export const useChatUI = () => {
  return useMultiPhaseChatStore((state) => state.ui)
}

export const useChatNotifications = () => {
  return useMultiPhaseChatStore((state) => state.notifications)
}

export const useChatAnalytics = () => {
  return useMultiPhaseChatStore((state) => state.analytics)
}
