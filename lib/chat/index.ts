/**
 * Stream Chat Integration - Main Export Index
 * Task 17.4: Stream Chat SDK Integration - Complete System Export
 */

// Core Stream Chat Service
export { StreamChatService } from './StreamChatService'

// React integration hooks and providers
export {
  StreamChatProvider,
  useStreamChat,
  usePhaseChannel,
  useChannelMembers,
  usePhaseChatActions,
  usePhaseTransitionEvents,
  getPhaseConfig
} from './useStreamChat'

// Type exports
export type {
  PhaseChannelType,
  PhaseChannelConfig,
  ChatFeature,
  ChannelPermissions,
  AutoMessageConfig,
  ChannelSettings,
  TripRole,
  StreamChatUser,
  UserChatPreferences,
  PhaseTransitionEvent
} from './StreamChatService'

// UI Components
export { IntegratedMultiPhaseChat } from '../../components/chat/IntegratedMultiPhaseChat'

// Utility functions
export const createStreamChatUser = (
  id: string,
  name: string,
  role: 'captain' | 'co-captain' | 'participant' | 'observer' = 'participant',
  options: {
    image?: string
    email?: string
    tripId?: string
    metadata?: Record<string, any>
  } = {}
) => ({
  id,
  name,
  role,
  image: options.image,
  email: options.email,
  tripId: options.tripId,
  isOnline: true,
  lastSeen: new Date(),
  preferences: {
    notifications: true,
    sounds: true,
    autoTransitions: true,
    preferredLanguage: 'ru',
    timezone: 'Europe/Lisbon'
  },
  metadata: options.metadata
})

export const getPhaseChannelId = (tripId: string, phase: string): string => {
  return `trip-${tripId}-${phase}`
}

export const validateStreamChatConfig = (): {
  isValid: boolean
  errors: string[]
} => {
  const errors: string[] = []
  
  if (!process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY) {
    errors.push('NEXT_PUBLIC_STREAM_CHAT_API_KEY is not configured')
  }
  
  // Note: STREAM_CHAT_API_SECRET is checked on server-side only
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const formatPhaseDisplayName = (phase: string): string => {
  const phaseNames = {
    preparation: 'Подготовка к рыбалке',
    live: 'Активная рыбалка',
    debrief: 'Подведение итогов'
  }
  return phaseNames[phase as keyof typeof phaseNames] || phase
}

export const getPhaseIcon = (phase: string): string => {
  const phaseIcons = {
    preparation: '🎣',
    live: '🚤',
    debrief: '🌅'
  }
  return phaseIcons[phase as keyof typeof phaseIcons] || '💬'
}

export const getRoleDisplayName = (role: string): string => {
  const roleNames = {
    captain: 'Капитан',
    'co-captain': 'Помощник капитана',
    participant: 'Участник',
    observer: 'Наблюдатель',
    guide: 'Гид'
  }
  return roleNames[role as keyof typeof roleNames] || role
}

export const getRolePermissions = (role: string) => {
  const permissions = {
    captain: {
      canManageChannels: true,
      canDeleteMessages: true,
      canPinMessages: true,
      canBanUsers: true,
      canInviteUsers: true
    },
    'co-captain': {
      canManageChannels: false,
      canDeleteMessages: false,
      canPinMessages: true,
      canBanUsers: false,
      canInviteUsers: true
    },
    participant: {
      canManageChannels: false,
      canDeleteMessages: false,
      canPinMessages: false,
      canBanUsers: false,
      canInviteUsers: false
    },
    observer: {
      canManageChannels: false,
      canDeleteMessages: false,
      canPinMessages: false,
      canBanUsers: false,
      canInviteUsers: false
    }
  }
  
  return permissions[role as keyof typeof permissions] || permissions.participant
}

// Stream Chat configuration constants
export const STREAM_CHAT_CONFIG = {
  DEFAULT_AVATAR_URL: 'https://ui-avatars.com/api/',
  MAX_MESSAGE_LENGTH: 2000,
  UPLOAD_SIZE_LIMIT: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain'
  ],
  CONNECTION_TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  TYPING_TIMEOUT: 3000
} as const

// Event types
export const CHAT_EVENT_TYPES = {
  MESSAGE_NEW: 'message.new',
  MESSAGE_UPDATED: 'message.updated',
  MESSAGE_DELETED: 'message.deleted',
  TYPING_START: 'typing.start',
  TYPING_STOP: 'typing.stop',
  USER_WATCHING_START: 'user.watching.start',
  USER_WATCHING_STOP: 'user.watching.stop',
  MEMBER_ADDED: 'member.added',
  MEMBER_REMOVED: 'member.removed',
  CHANNEL_UPDATED: 'channel.updated',
  PHASE_TRANSITION: 'phase.transition'
} as const

// Error codes
export const STREAM_CHAT_ERRORS = {
  INITIALIZATION_FAILED: 'INITIALIZATION_FAILED',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  CHANNEL_CREATION_FAILED: 'CHANNEL_CREATION_FAILED',
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INVALID_PHASE: 'INVALID_PHASE',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND'
} as const

// Version info
export const STREAM_CHAT_INTEGRATION_VERSION = '1.0.0'
export const COMPATIBLE_STREAM_CHAT_VERSION = '^9.17.0'
export const COMPATIBLE_STREAM_CHAT_REACT_VERSION = '^13.5.1'
