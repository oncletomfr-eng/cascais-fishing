/**
 * Participant Management System - Main Export Index
 * Task 17.5: Participant Management System - Complete System Export
 */

// Core participant list component
export { ParticipantList } from './ParticipantList'

// Management and actions
export { 
  ParticipantManagement,
  BulkParticipantManagement 
} from './ParticipantManagement'

// Typing indicators
export {
  ChannelTypingIndicator,
  FloatingTypingIndicator,
  TypingStatus,
  CompactTypingIndicator,
  TypingBadge
} from './TypingIndicator'

// Read receipt indicators
export {
  MessageReadReceipt,
  ReadReceiptSummary,
  ReadReceiptAvatars,
  UnreadIndicator
} from './ReadReceiptIndicator'

// Notifications
export {
  ParticipantNotificationList,
  NotificationSettings,
  useParticipantNotifications
} from './ParticipantNotifications'

// Re-export types and utilities from the lib
export type {
  ChatParticipant,
  ParticipantRole,
  ParticipantStatus,
  ParticipantPermissionLevel,
  ParticipantProfile,
  RolePermissions,
  ParticipantActivity,
  ParticipantActivityType,
  ParticipantEvent,
  ParticipantEventType,
  TypingIndicator,
  ReadReceipt,
  ParticipantListConfig,
  ParticipantBulkAction,
  ParticipantNotificationSettings
} from '@/lib/chat/participant-types'

export {
  hasPermission,
  getRoleDisplayName,
  getStatusDisplayName,
  getRoleColor,
  getStatusColor,
  getParticipantPermissions,
  DEFAULT_ROLE_PERMISSIONS
} from '@/lib/chat/participant-types'

// Service and hooks
export {
  ParticipantStatusService,
  getParticipantStatusService,
  setDefaultStatusService
} from '@/lib/chat/participants/ParticipantStatusService'

export {
  ParticipantStatusProvider,
  useParticipantStatus,
  useParticipantList,
  useParticipantById,
  useTypingIndicators,
  useReadReceipts,
  useParticipantStatistics,
  useParticipantActions
} from '@/lib/chat/participants/useParticipantStatus'

// Utility functions for creating participants
export const createChatParticipant = (
  id: string,
  name: string,
  role: ParticipantRole = 'participant',
  options: {
    avatar?: string
    email?: string
    tripId?: string
    status?: ParticipantStatus
    profile?: Partial<any>
  } = {}
): ChatParticipant => ({
  id,
  name,
  avatar: options.avatar,
  email: options.email,
  role,
  status: options.status || 'online',
  permissions: role === 'captain' ? 'admin' : role === 'co-captain' ? 'moderator' : 'member',
  isOnline: options.status !== 'offline',
  lastSeen: new Date(),
  isTyping: false,
  lastActivity: new Date(),
  tripId: options.tripId,
  joinedAt: new Date(),
  unreadCount: 0,
  profile: {
    displayName: name,
    preferredLanguage: 'ru',
    timezone: 'Europe/Lisbon',
    allowDirectMessages: true,
    allowNotifications: true,
    allowLocationSharing: true,
    ...options.profile
  }
})

// Utility functions for role management
export const canManageParticipant = (
  managerRole: ParticipantRole,
  targetRole: ParticipantRole
): boolean => {
  const roleHierarchy: Record<ParticipantRole, number> = {
    captain: 5,
    'co-captain': 4,
    guide: 3,
    participant: 2,
    observer: 1
  }

  return roleHierarchy[managerRole] > roleHierarchy[targetRole]
}

export const getAvailableRoles = (currentRole: ParticipantRole): ParticipantRole[] => {
  switch (currentRole) {
    case 'captain':
      return ['captain', 'co-captain', 'guide', 'participant', 'observer']
    case 'co-captain':
      return ['participant', 'observer']
    default:
      return []
  }
}

// Utility functions for notifications
export const formatNotificationMessage = (
  type: string,
  participantName: string,
  data?: any
): string => {
  switch (type) {
    case 'joined':
      return `${participantName} присоединился к чату`
    case 'left':
      return `${participantName} покинул чат`
    case 'status_change':
      return `${participantName} изменил статус`
    case 'role_change':
      return `${participantName} получил новую роль`
    case 'typing_start':
      return `${participantName} печатает...`
    default:
      return `${participantName}: ${type}`
  }
}

// Configuration constants
export const PARTICIPANT_CONFIG = {
  DEFAULT_AVATAR_SIZE: 40,
  COMPACT_AVATAR_SIZE: 32,
  TYPING_TIMEOUT: 3000,
  AWAY_TIMEOUT: 300000, // 5 minutes
  OFFLINE_TIMEOUT: 600000, // 10 minutes
  MAX_NOTIFICATIONS: 50,
  MAX_VISIBLE_TYPING: 3,
  MAX_VISIBLE_READ_RECEIPTS: 5
} as const

// Theme constants
export const PARTICIPANT_THEME = {
  ROLE_COLORS: {
    captain: '#ef4444',
    'co-captain': '#f97316',
    participant: '#3b82f6',
    observer: '#6b7280',
    guide: '#10b981'
  },
  STATUS_COLORS: {
    online: '#10b981',
    offline: '#6b7280',
    away: '#f59e0b',
    busy: '#ef4444'
  },
  NOTIFICATION_COLORS: {
    joined: '#10b981',
    left: '#f97316',
    status_change: '#3b82f6',
    role_change: '#8b5cf6'
  }
} as const

// Error messages
export const PARTICIPANT_ERRORS = {
  PERMISSION_DENIED: 'У вас нет прав для выполнения этого действия',
  PARTICIPANT_NOT_FOUND: 'Участник не найден',
  INVALID_ROLE: 'Недопустимая роль',
  INVALID_STATUS: 'Недопустимый статус',
  CANNOT_MANAGE_SELF: 'Нельзя управлять собственным аккаунтом',
  CANNOT_MANAGE_HIGHER_ROLE: 'Нельзя управлять участником с более высокой ролью'
} as const

// Success messages
export const PARTICIPANT_MESSAGES = {
  ROLE_CHANGED: 'Роль участника успешно изменена',
  PARTICIPANT_MUTED: 'Участник заглушен',
  PARTICIPANT_KICKED: 'Участник исключен',
  PARTICIPANT_BANNED: 'Участник забанен',
  STATUS_UPDATED: 'Статус обновлен',
  NOTIFICATION_MARKED_READ: 'Уведомление отмечено как прочитанное'
} as const
