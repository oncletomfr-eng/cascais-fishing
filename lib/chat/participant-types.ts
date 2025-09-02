/**
 * Participant Management Types and Interfaces
 * Task 17.5: Participant Management System - Type Definitions
 */

export type ParticipantRole = 'captain' | 'co-captain' | 'participant' | 'observer' | 'guide'

export type ParticipantStatus = 'online' | 'offline' | 'away' | 'busy'

export type ParticipantPermissionLevel = 'admin' | 'moderator' | 'member' | 'read-only'

// Core participant interface
export interface ChatParticipant {
  id: string
  name: string
  avatar?: string
  email?: string
  role: ParticipantRole
  status: ParticipantStatus
  permissions: ParticipantPermissionLevel
  
  // Real-time status
  isOnline: boolean
  lastSeen: Date
  isTyping: boolean
  lastActivity: Date
  
  // Trip-specific data
  tripId?: string
  joinedAt: Date
  leftAt?: Date
  
  // Read status tracking
  lastReadMessageId?: string
  unreadCount: number
  
  // Extended profile information
  profile: ParticipantProfile
  
  // Stream Chat specific
  streamUserId?: string
  streamUser?: any
}

export interface ParticipantProfile {
  displayName: string
  bio?: string
  location?: string
  experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  preferredLanguage: string
  timezone: string
  
  // Fishing-specific profile
  fishingExperience?: number // years
  favoriteFishSpecies?: string[]
  ownEquipment?: boolean
  certifications?: string[]
  
  // Contact preferences
  allowDirectMessages: boolean
  allowNotifications: boolean
  allowLocationSharing: boolean
}

// Permission definitions for each role
export interface RolePermissions {
  // Channel management
  canManageChannel: boolean
  canDeleteChannel: boolean
  canUpdateChannelSettings: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
  
  // Member management
  canKickMembers: boolean
  canBanMembers: boolean
  canMuteMembers: boolean
  canChangeRoles: boolean
  canViewMemberList: boolean
  
  // Message management
  canDeleteOwnMessages: boolean
  canDeleteOtherMessages: boolean
  canPinMessages: boolean
  canEditOwnMessages: boolean
  canReactToMessages: boolean
  
  // Content sharing
  canSendMessages: boolean
  canUploadFiles: boolean
  canShareLocation: boolean
  canUseCommands: boolean
  canMention: boolean
  
  // Phase-specific permissions
  canInitiatePhaseTransition: boolean
  canOverridePhaseRules: boolean
  canAccessEmergencyFeatures: boolean
  canManageTripSettings: boolean
}

// Participant activity tracking
export interface ParticipantActivity {
  participantId: string
  type: ParticipantActivityType
  timestamp: Date
  data?: any
  phase?: string
}

export type ParticipantActivityType = 
  | 'joined_channel'
  | 'left_channel'
  | 'sent_message'
  | 'started_typing'
  | 'stopped_typing'
  | 'read_message'
  | 'reacted_to_message'
  | 'uploaded_file'
  | 'shared_location'
  | 'changed_status'
  | 'was_promoted'
  | 'was_demoted'
  | 'was_muted'
  | 'was_unmuted'
  | 'was_kicked'
  | 'was_banned'

// Events for participant management
export interface ParticipantEvent {
  id: string
  type: ParticipantEventType
  participantId: string
  initiatorId?: string
  channelId: string
  timestamp: Date
  data: any
}

export type ParticipantEventType =
  | 'participant_joined'
  | 'participant_left'
  | 'participant_online'
  | 'participant_offline'
  | 'participant_typing_start'
  | 'participant_typing_stop'
  | 'participant_role_changed'
  | 'participant_status_changed'
  | 'participant_muted'
  | 'participant_unmuted'
  | 'participant_kicked'
  | 'participant_banned'
  | 'participant_unbanned'
  | 'message_read'
  | 'reaction_added'
  | 'reaction_removed'

// Typing indicator data
export interface TypingIndicator {
  participantId: string
  participantName: string
  startedAt: Date
  phase?: string
  channelId: string
}

// Read receipt data
export interface ReadReceipt {
  messageId: string
  participantId: string
  readAt: Date
  channelId: string
}

// Participant list filters and sorting
export interface ParticipantListConfig {
  showOfflineMembers: boolean
  sortBy: 'name' | 'role' | 'status' | 'lastActivity' | 'joinedAt'
  sortDirection: 'asc' | 'desc'
  filterByRole?: ParticipantRole[]
  filterByStatus?: ParticipantStatus[]
  searchQuery?: string
  groupByRole: boolean
  showDetailedInfo: boolean
}

// Bulk actions for participants
export interface ParticipantBulkAction {
  action: 'mute' | 'unmute' | 'kick' | 'change_role' | 'send_notification'
  participantIds: string[]
  data?: any
  reason?: string
  duration?: number // for temporary actions like mute
}

// Notification preferences for participants
export interface ParticipantNotificationSettings {
  participantId: string
  
  // Message notifications
  newMessages: boolean
  mentions: boolean
  directMessages: boolean
  reactions: boolean
  
  // Activity notifications
  memberJoined: boolean
  memberLeft: boolean
  roleChanges: boolean
  phaseTransitions: boolean
  
  // Trip-specific notifications
  emergencyAlerts: boolean
  locationShares: boolean
  catchUpdates: boolean
  weatherAlerts: boolean
  
  // Delivery preferences
  pushNotifications: boolean
  emailNotifications: boolean
  soundNotifications: boolean
  
  // Quiet hours
  quietHoursEnabled: boolean
  quietHoursStart?: string // HH:mm format
  quietHoursEnd?: string
}

// Default role permissions
export const DEFAULT_ROLE_PERMISSIONS: Record<ParticipantRole, RolePermissions> = {
  captain: {
    canManageChannel: true,
    canDeleteChannel: false,
    canUpdateChannelSettings: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canKickMembers: true,
    canBanMembers: true,
    canMuteMembers: true,
    canChangeRoles: true,
    canViewMemberList: true,
    canDeleteOwnMessages: true,
    canDeleteOtherMessages: true,
    canPinMessages: true,
    canEditOwnMessages: true,
    canReactToMessages: true,
    canSendMessages: true,
    canUploadFiles: true,
    canShareLocation: true,
    canUseCommands: true,
    canMention: true,
    canInitiatePhaseTransition: true,
    canOverridePhaseRules: true,
    canAccessEmergencyFeatures: true,
    canManageTripSettings: true
  },
  'co-captain': {
    canManageChannel: false,
    canDeleteChannel: false,
    canUpdateChannelSettings: false,
    canInviteMembers: true,
    canRemoveMembers: false,
    canKickMembers: false,
    canBanMembers: false,
    canMuteMembers: true,
    canChangeRoles: false,
    canViewMemberList: true,
    canDeleteOwnMessages: true,
    canDeleteOtherMessages: false,
    canPinMessages: true,
    canEditOwnMessages: true,
    canReactToMessages: true,
    canSendMessages: true,
    canUploadFiles: true,
    canShareLocation: true,
    canUseCommands: true,
    canMention: true,
    canInitiatePhaseTransition: false,
    canOverridePhaseRules: false,
    canAccessEmergencyFeatures: true,
    canManageTripSettings: false
  },
  participant: {
    canManageChannel: false,
    canDeleteChannel: false,
    canUpdateChannelSettings: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canKickMembers: false,
    canBanMembers: false,
    canMuteMembers: false,
    canChangeRoles: false,
    canViewMemberList: true,
    canDeleteOwnMessages: true,
    canDeleteOtherMessages: false,
    canPinMessages: false,
    canEditOwnMessages: true,
    canReactToMessages: true,
    canSendMessages: true,
    canUploadFiles: true,
    canShareLocation: true,
    canUseCommands: false,
    canMention: true,
    canInitiatePhaseTransition: false,
    canOverridePhaseRules: false,
    canAccessEmergencyFeatures: false,
    canManageTripSettings: false
  },
  observer: {
    canManageChannel: false,
    canDeleteChannel: false,
    canUpdateChannelSettings: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canKickMembers: false,
    canBanMembers: false,
    canMuteMembers: false,
    canChangeRoles: false,
    canViewMemberList: true,
    canDeleteOwnMessages: false,
    canDeleteOtherMessages: false,
    canPinMessages: false,
    canEditOwnMessages: false,
    canReactToMessages: true,
    canSendMessages: false,
    canUploadFiles: false,
    canShareLocation: false,
    canUseCommands: false,
    canMention: false,
    canInitiatePhaseTransition: false,
    canOverridePhaseRules: false,
    canAccessEmergencyFeatures: false,
    canManageTripSettings: false
  },
  guide: {
    canManageChannel: false,
    canDeleteChannel: false,
    canUpdateChannelSettings: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canKickMembers: false,
    canBanMembers: false,
    canMuteMembers: false,
    canChangeRoles: false,
    canViewMemberList: true,
    canDeleteOwnMessages: true,
    canDeleteOtherMessages: false,
    canPinMessages: true,
    canEditOwnMessages: true,
    canReactToMessages: true,
    canSendMessages: true,
    canUploadFiles: true,
    canShareLocation: true,
    canUseCommands: true,
    canMention: true,
    canInitiatePhaseTransition: false,
    canOverridePhaseRules: false,
    canAccessEmergencyFeatures: false,
    canManageTripSettings: false
  }
}

// Utility functions
export const getParticipantPermissions = (role: ParticipantRole): RolePermissions => {
  return DEFAULT_ROLE_PERMISSIONS[role]
}

export const hasPermission = (
  participant: ChatParticipant, 
  permission: keyof RolePermissions
): boolean => {
  const permissions = getParticipantPermissions(participant.role)
  return permissions[permission]
}

export const getRoleDisplayName = (role: ParticipantRole): string => {
  const roleNames = {
    captain: 'Капитан',
    'co-captain': 'Помощник капитана',
    participant: 'Участник',
    observer: 'Наблюдатель',
    guide: 'Гид'
  }
  return roleNames[role] || role
}

export const getStatusDisplayName = (status: ParticipantStatus): string => {
  const statusNames = {
    online: 'В сети',
    offline: 'Не в сети',
    away: 'Отошел',
    busy: 'Занят'
  }
  return statusNames[status] || status
}

export const getRoleColor = (role: ParticipantRole): string => {
  const roleColors = {
    captain: '#ef4444', // red
    'co-captain': '#f97316', // orange
    participant: '#3b82f6', // blue
    observer: '#6b7280', // gray
    guide: '#10b981' // green
  }
  return roleColors[role] || '#6b7280'
}

export const getStatusColor = (status: ParticipantStatus): string => {
  const statusColors = {
    online: '#10b981', // green
    offline: '#6b7280', // gray
    away: '#f59e0b', // yellow
    busy: '#ef4444' // red
  }
  return statusColors[status] || '#6b7280'
}
