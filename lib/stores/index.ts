/**
 * Multi-Phase Chat State Management Library
 * Task 17.1: Chat State Management Architecture
 * 
 * Export all components of the chat state management system
 */

// Core store
export { 
  useMultiPhaseChatStore,
  useChatStoreConfig,
  useChatConnection,
  useChatPhases,
  useChatCurrentPhase,
  useChatUI,
  useChatNotifications,
  useChatAnalytics
} from './multi-phase-chat-store'

// Context and hooks
export {
  ChatProvider,
  useChatContext,
  usePhaseTransition,
  useChatMessaging,
  useChatParticipants,
  useChatNotifications as useChatNotificationContext,
  useChatAnalytics as useChatAnalyticsContext,
  useChatPersistence
} from './multi-phase-chat-context'

// Persistence utilities
export {
  ChatPersistenceManager,
  SerializationUtils,
  StorageAdapter,
  LocalStorageAdapter,
  IndexedDBAdapter,
  chatPersistence,
  persistenceUtils,
  STORAGE_KEYS
} from './multi-phase-chat-persistence'

// Types
export type {
  MultiPhaseChatStore,
  MultiPhaseChatState,
  ChatStateActions,
  ChatConnectionState,
  ChatUserState,
  ChatUserPermissions,
  ChatPhaseState,
  ChatUIState,
  ChatTripContext,
  ChatAnalytics,
  ChatNotification,
  ChatSyncState,
  ChatAction,
  ChatPersistentState,
  ChatEventHandlers,
  ChatStoreConfig
} from './multi-phase-chat-types'

export type {
  PersistenceProvider,
  PersistenceConfig
} from './multi-phase-chat-persistence'
