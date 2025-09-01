/**
 * Enhanced State Management Types for Multi-Phase Chat System
 * Task 17.1: Chat State Management Architecture
 */

import { StreamChat as StreamChatClient } from 'stream-chat'
import { Channel } from 'stream-chat'
import { 
  ChatPhase, 
  EventChat, 
  CustomMessageType, 
  CustomMessageData,
  ChatPhaseConfig,
  MultiPhaseChatEvent 
} from '@/lib/types/multi-phase-chat'

// Enhanced chat state interfaces for better state management

export interface ChatConnectionState {
  client: StreamChatClient | null
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  reconnectAttempts: number
  lastConnectedAt: Date | null
}

export interface ChatUserState {
  userId: string
  userName: string
  avatar?: string
  role: 'captain' | 'participant' | 'observer'
  isOnline: boolean
  lastSeenAt: Date | null
  permissions: ChatUserPermissions
}

export interface ChatUserPermissions {
  canSendMessages: boolean
  canSendCustomMessages: boolean
  canShareLocation: boolean
  canUploadFiles: boolean
  canCreatePolls: boolean
  canManagePhases: boolean
  canAccessAllPhases: boolean
}

export interface ChatPhaseState {
  phase: ChatPhase
  isActive: boolean
  isLoaded: boolean
  channel: Channel | null
  channelId: string
  config: ChatPhaseConfig
  
  // Message state
  messageCount: number
  unreadCount: number
  lastMessageAt: Date | null
  lastReadMessageId: string | null
  
  // Participants state
  participantCount: number
  onlineParticipants: string[]
  typingUsers: string[]
  
  // Custom features state
  customMessages: CustomMessageData[]
  sharedLocations: Array<{
    userId: string
    location: { lat: number; lng: number }
    timestamp: Date
  }>
  
  // Phase-specific data
  phaseData: Record<string, any>
  
  // Loading and error states
  isLoading: boolean
  error: string | null
}

export interface ChatUIState {
  // Chat window state
  isOpen: boolean
  isMinimized: boolean
  isFullscreen: boolean
  activeTab: 'messages' | 'participants' | 'features' | 'settings'
  
  // Message input state
  messageInput: string
  isDrafting: boolean
  draftSaved: boolean
  attachments: File[]
  
  // Search and filter
  searchQuery: string
  messageFilter: 'all' | 'custom' | 'system' | 'images'
  isSearching: boolean
  
  // Notifications
  notificationsEnabled: boolean
  soundEnabled: boolean
  desktopNotifications: boolean
  
  // Theme and preferences
  theme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large'
  compactMode: boolean
}

export interface ChatTripContext {
  tripId: string
  tripDate: Date
  tripName?: string
  tripLocation?: string
  captainId: string
  participantIds: string[]
  
  // Trip status affects chat phases
  tripStatus: 'scheduled' | 'preparing' | 'active' | 'completed' | 'cancelled'
  
  // Auto phase transition settings
  autoPhaseTransition: boolean
  phaseTransitionRules: {
    preparation: { startDaysBefore: number; endDaysBefore: number }
    live: { startDaysBefore: number; endDaysAfter: number }
    debrief: { startDaysAfter: number; endDaysAfter: number }
  }
}

export interface ChatAnalytics {
  sessionStartTime: Date
  totalMessagesCount: number
  customMessagesCount: number
  participationRate: number
  averageResponseTime: number
  mostActivePhase: ChatPhase | null
  
  // Per-phase analytics
  phaseAnalytics: Record<ChatPhase, {
    messagesCount: number
    timeSpent: number
    participantsActive: number
    customFeaturesUsed: CustomMessageType[]
  }>
  
  // User engagement
  userActivity: Record<string, {
    messagesCount: number
    lastActiveAt: Date
    customMessagesCount: number
    timeSpent: number
  }>
}

export interface ChatNotification {
  id: string
  type: 'message' | 'phase_change' | 'user_join' | 'user_leave' | 'custom_message' | 'system'
  title: string
  message: string
  phase: ChatPhase
  userId?: string
  timestamp: Date
  isRead: boolean
  priority: 'low' | 'medium' | 'high'
  action?: {
    type: 'open_chat' | 'switch_phase' | 'reply' | 'view_location'
    data?: any
  }
}

export interface ChatSyncState {
  lastSyncAt: Date | null
  isSyncing: boolean
  syncError: string | null
  pendingActions: ChatAction[]
  conflictResolution: 'client' | 'server' | 'manual'
}

export interface ChatAction {
  id: string
  type: 'send_message' | 'switch_phase' | 'send_custom_message' | 'update_user_status'
  payload: any
  timestamp: Date
  userId: string
  phase: ChatPhase
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
  maxRetries: number
}

export interface ChatPersistentState {
  tripId: string
  userId: string
  
  // Phase preferences
  preferredPhase: ChatPhase | null
  phaseHistory: Array<{
    phase: ChatPhase
    enteredAt: Date
    leftAt?: Date
  }>
  
  // Message drafts
  messageDrafts: Record<ChatPhase, string>
  
  // UI preferences
  uiPreferences: Partial<ChatUIState>
  
  // Read status
  readStatus: Record<ChatPhase, {
    lastReadMessageId: string
    lastReadAt: Date
  }>
  
  // Notifications settings
  notificationSettings: {
    phases: Record<ChatPhase, boolean>
    messageTypes: Record<CustomMessageType, boolean>
    quietHours: {
      enabled: boolean
      start: string // HH:mm
      end: string   // HH:mm
    }
  }
}

// Main chat store state interface
export interface MultiPhaseChatState {
  // Connection and user
  connection: ChatConnectionState
  user: ChatUserState | null
  
  // Trip context
  trip: ChatTripContext | null
  
  // Current phase and phase states
  currentPhase: ChatPhase
  phases: Record<ChatPhase, ChatPhaseState>
  
  // EventChat data
  eventChat: EventChat | null
  
  // UI state
  ui: ChatUIState
  
  // Analytics and tracking
  analytics: ChatAnalytics
  
  // Notifications
  notifications: ChatNotification[]
  
  // Sync and persistence
  sync: ChatSyncState
  persistent: ChatPersistentState | null
  
  // Events history
  events: MultiPhaseChatEvent[]
  
  // Global loading and error states
  isInitialized: boolean
  isLoading: boolean
  error: string | null
}

// Action types for state management
export interface ChatStateActions {
  // Initialization
  initialize: (tripId: string, userId: string) => Promise<void>
  cleanup: () => void
  reset: () => void
  
  // Connection management
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>
  
  // Phase management
  switchPhase: (phase: ChatPhase) => Promise<void>
  setCurrentPhase: (phase: ChatPhase) => void
  loadPhase: (phase: ChatPhase) => Promise<void>
  unloadPhase: (phase: ChatPhase) => void
  
  // Message management
  sendMessage: (content: string, phase?: ChatPhase) => Promise<void>
  sendCustomMessage: (type: CustomMessageType, payload: any, phase?: ChatPhase) => Promise<void>
  markMessagesAsRead: (phase: ChatPhase, messageId?: string) => void
  
  // User management
  updateUserStatus: (status: Partial<ChatUserState>) => void
  setUserPermissions: (permissions: Partial<ChatUserPermissions>) => void
  
  // UI actions
  toggleChat: () => void
  minimizeChat: () => void
  maximizeChat: () => void
  setActiveTab: (tab: ChatUIState['activeTab']) => void
  updateUIState: (updates: Partial<ChatUIState>) => void
  
  // Notification management
  addNotification: (notification: Omit<ChatNotification, 'id' | 'timestamp'>) => void
  markNotificationAsRead: (notificationId: string) => void
  clearNotifications: (phase?: ChatPhase) => void
  
  // Persistence
  savePersistentState: () => Promise<void>
  loadPersistentState: () => Promise<void>
  updatePersistentState: (updates: Partial<ChatPersistentState>) => void
  
  // Analytics
  trackEvent: (event: Omit<MultiPhaseChatEvent, 'timestamp'>) => void
  updateAnalytics: (updates: Partial<ChatAnalytics>) => void
  
  // Sync management
  syncWithServer: () => Promise<void>
  handleSyncConflict: (resolution: ChatSyncState['conflictResolution']) => void
  
  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
  handleError: (error: Error, context: string) => void
}

// Store type combining state and actions
export type MultiPhaseChatStore = MultiPhaseChatState & ChatStateActions

// Event handlers for external integration
export interface ChatEventHandlers {
  onPhaseChange?: (oldPhase: ChatPhase, newPhase: ChatPhase) => void
  onMessageReceived?: (message: any, phase: ChatPhase) => void
  onCustomMessageReceived?: (message: CustomMessageData) => void
  onUserJoined?: (userId: string, phase: ChatPhase) => void
  onUserLeft?: (userId: string, phase: ChatPhase) => void
  onConnectionStatusChanged?: (isConnected: boolean) => void
  onError?: (error: Error, context: string) => void
  onNotification?: (notification: ChatNotification) => void
}

// Configuration for chat store
export interface ChatStoreConfig {
  // API endpoints
  apiBaseUrl: string
  streamApiKey: string
  
  // Persistence settings
  persistenceKey: string
  persistenceProvider: 'localStorage' | 'indexedDB' | 'none'
  
  // Auto-sync settings
  autoSyncInterval: number
  syncOnFocus: boolean
  syncOnOnline: boolean
  
  // Notification settings
  enableNotifications: boolean
  enableSound: boolean
  enableDesktopNotifications: boolean
  
  // Performance settings
  messageLoadLimit: number
  messageRetentionDays: number
  analyticsRetentionDays: number
  
  // Debug settings
  enableDebugLogging: boolean
  enableAnalytics: boolean
  
  // Event handlers
  eventHandlers?: ChatEventHandlers
}
