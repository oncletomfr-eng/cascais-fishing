/**
 * Chat Security & Permissions Management System
 * Task 22.2: Chat Security Configuration
 * 
 * Comprehensive user authentication and permission management for Stream Chat:
 * - Role-based access control (RBAC)
 * - Channel permissions
 * - Message-level security
 * - Content moderation integration
 * - Security audit logging
 */

import { StreamChat } from 'stream-chat';

// User roles and permissions hierarchy
export enum ChatRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  CAPTAIN = 'captain',
  PREMIUM_USER = 'premium_user',
  USER = 'user',
  GUEST = 'guest',
  BANNED = 'banned'
}

// Channel types with different permission sets
export enum ChannelType {
  TRIP_CHAT = 'trip_chat',           // Private trip conversations
  GROUP_CHAT = 'group_chat',         // General group discussions
  ANNOUNCEMENT = 'announcement',      // Admin/Captain announcements
  SUPPORT_CHAT = 'support_chat',     // Customer support
  MODERATION = 'moderation'          // Moderation team only
}

// Permission types for granular access control
export enum ChatPermission {
  // Channel permissions
  CREATE_CHANNEL = 'create_channel',
  DELETE_CHANNEL = 'delete_channel',
  UPDATE_CHANNEL = 'update_channel',
  
  // Member management
  ADD_MEMBERS = 'add_members',
  REMOVE_MEMBERS = 'remove_members',
  BAN_MEMBERS = 'ban_members',
  MUTE_MEMBERS = 'mute_members',
  
  // Message permissions
  SEND_MESSAGE = 'send_message',
  DELETE_MESSAGE = 'delete_message',
  EDIT_MESSAGE = 'edit_message',
  PIN_MESSAGE = 'pin_message',
  
  // File and media permissions
  UPLOAD_FILE = 'upload_file',
  SHARE_LINK = 'share_link',
  SEND_EMOJI = 'send_emoji',
  
  // Moderation permissions
  MODERATE_CONTENT = 'moderate_content',
  VIEW_REPORTS = 'view_reports',
  HANDLE_FLAGS = 'handle_flags'
}

// Permission matrix: Role -> Permissions
const ROLE_PERMISSIONS: Record<ChatRole, ChatPermission[]> = {
  [ChatRole.SUPER_ADMIN]: Object.values(ChatPermission), // All permissions
  
  [ChatRole.ADMIN]: [
    ChatPermission.CREATE_CHANNEL,
    ChatPermission.DELETE_CHANNEL,
    ChatPermission.UPDATE_CHANNEL,
    ChatPermission.ADD_MEMBERS,
    ChatPermission.REMOVE_MEMBERS,
    ChatPermission.BAN_MEMBERS,
    ChatPermission.MUTE_MEMBERS,
    ChatPermission.SEND_MESSAGE,
    ChatPermission.DELETE_MESSAGE,
    ChatPermission.EDIT_MESSAGE,
    ChatPermission.PIN_MESSAGE,
    ChatPermission.UPLOAD_FILE,
    ChatPermission.SHARE_LINK,
    ChatPermission.SEND_EMOJI,
    ChatPermission.MODERATE_CONTENT,
    ChatPermission.VIEW_REPORTS,
    ChatPermission.HANDLE_FLAGS
  ],
  
  [ChatRole.MODERATOR]: [
    ChatPermission.ADD_MEMBERS,
    ChatPermission.REMOVE_MEMBERS,
    ChatPermission.MUTE_MEMBERS,
    ChatPermission.SEND_MESSAGE,
    ChatPermission.DELETE_MESSAGE,
    ChatPermission.PIN_MESSAGE,
    ChatPermission.UPLOAD_FILE,
    ChatPermission.SHARE_LINK,
    ChatPermission.SEND_EMOJI,
    ChatPermission.MODERATE_CONTENT,
    ChatPermission.VIEW_REPORTS,
    ChatPermission.HANDLE_FLAGS
  ],
  
  [ChatRole.CAPTAIN]: [
    ChatPermission.CREATE_CHANNEL,
    ChatPermission.UPDATE_CHANNEL,
    ChatPermission.ADD_MEMBERS,
    ChatPermission.REMOVE_MEMBERS,
    ChatPermission.MUTE_MEMBERS,
    ChatPermission.SEND_MESSAGE,
    ChatPermission.DELETE_MESSAGE,
    ChatPermission.EDIT_MESSAGE,
    ChatPermission.PIN_MESSAGE,
    ChatPermission.UPLOAD_FILE,
    ChatPermission.SHARE_LINK,
    ChatPermission.SEND_EMOJI
  ],
  
  [ChatRole.PREMIUM_USER]: [
    ChatPermission.SEND_MESSAGE,
    ChatPermission.EDIT_MESSAGE,
    ChatPermission.UPLOAD_FILE,
    ChatPermission.SHARE_LINK,
    ChatPermission.SEND_EMOJI,
    ChatPermission.ADD_MEMBERS
  ],
  
  [ChatRole.USER]: [
    ChatPermission.SEND_MESSAGE,
    ChatPermission.EDIT_MESSAGE,
    ChatPermission.UPLOAD_FILE,
    ChatPermission.SEND_EMOJI
  ],
  
  [ChatRole.GUEST]: [
    ChatPermission.SEND_MESSAGE,
    ChatPermission.SEND_EMOJI
  ],
  
  [ChatRole.BANNED]: [] // No permissions
};

// Channel-specific permission overrides
const CHANNEL_PERMISSION_OVERRIDES: Record<ChannelType, Partial<Record<ChatRole, ChatPermission[]>>> = {
  [ChannelType.TRIP_CHAT]: {
    // Trip participants have enhanced permissions in their trip chat
    [ChatRole.USER]: [
      ...ROLE_PERMISSIONS[ChatRole.USER],
      ChatPermission.SHARE_LINK,
      ChatPermission.ADD_MEMBERS
    ]
  },
  
  [ChannelType.ANNOUNCEMENT]: {
    // Only captains and above can send messages in announcement channels
    [ChatRole.USER]: [ChatPermission.SEND_EMOJI], // Can only react
    [ChatRole.PREMIUM_USER]: [ChatPermission.SEND_EMOJI],
    [ChatRole.GUEST]: []
  },
  
  [ChannelType.SUPPORT_CHAT]: {
    // All users can send messages in support, but only staff can moderate
    [ChatRole.USER]: [
      ...ROLE_PERMISSIONS[ChatRole.USER],
      ChatPermission.SHARE_LINK
    ]
  },
  
  [ChannelType.MODERATION]: {
    // Only moderators and above can access moderation channels
    [ChatRole.USER]: [],
    [ChatRole.PREMIUM_USER]: [],
    [ChatRole.CAPTAIN]: [],
    [ChatRole.GUEST]: []
  },
  
  [ChannelType.GROUP_CHAT]: {} // Use default permissions
};

/**
 * Chat Security Manager - Central permission and authentication management
 */
export class ChatSecurityManager {
  
  /**
   * Determine user's chat role based on application role and context
   */
  static determineUserRole(
    appRole: string, 
    isTripOwner: boolean = false,
    isPremium: boolean = false,
    isModerator: boolean = false
  ): ChatRole {
    // Check for banned status first
    if (appRole === 'banned') {
      return ChatRole.BANNED;
    }
    
    // Admin roles
    if (appRole === 'admin' || appRole === 'super_admin') {
      return appRole === 'super_admin' ? ChatRole.SUPER_ADMIN : ChatRole.ADMIN;
    }
    
    // Moderator role
    if (isModerator || appRole === 'moderator') {
      return ChatRole.MODERATOR;
    }
    
    // Captain role (trip owner or captain app role)
    if (isTripOwner || appRole === 'captain') {
      return ChatRole.CAPTAIN;
    }
    
    // Premium user
    if (isPremium || appRole === 'premium') {
      return ChatRole.PREMIUM_USER;
    }
    
    // Guest user (not authenticated or temporary access)
    if (appRole === 'guest' || !appRole) {
      return ChatRole.GUEST;
    }
    
    // Default user
    return ChatRole.USER;
  }
  
  /**
   * Check if user has specific permission
   */
  static hasPermission(
    userRole: ChatRole,
    permission: ChatPermission,
    channelType: ChannelType = ChannelType.GROUP_CHAT
  ): boolean {
    // Check channel-specific overrides first
    const channelOverrides = CHANNEL_PERMISSION_OVERRIDES[channelType];
    if (channelOverrides && channelOverrides[userRole]) {
      return channelOverrides[userRole]!.includes(permission);
    }
    
    // Check default role permissions
    return ROLE_PERMISSIONS[userRole].includes(permission);
  }
  
  /**
   * Get all permissions for a user role
   */
  static getUserPermissions(
    userRole: ChatRole,
    channelType: ChannelType = ChannelType.GROUP_CHAT
  ): ChatPermission[] {
    // Check channel-specific overrides first
    const channelOverrides = CHANNEL_PERMISSION_OVERRIDES[channelType];
    if (channelOverrides && channelOverrides[userRole]) {
      return channelOverrides[userRole]!;
    }
    
    // Return default role permissions
    return ROLE_PERMISSIONS[userRole];
  }
  
  /**
   * Validate channel access for user
   */
  static canAccessChannel(
    userRole: ChatRole,
    channelType: ChannelType,
    isChannelMember: boolean = false
  ): boolean {
    // Banned users can't access any channels
    if (userRole === ChatRole.BANNED) {
      return false;
    }
    
    // Super admins can access everything
    if (userRole === ChatRole.SUPER_ADMIN) {
      return true;
    }
    
    // Channel-specific access rules
    switch (channelType) {
      case ChannelType.MODERATION:
        return [ChatRole.ADMIN, ChatRole.MODERATOR].includes(userRole);
        
      case ChannelType.TRIP_CHAT:
        // Must be a member of the trip or have admin/moderator role
        return isChannelMember || [ChatRole.ADMIN, ChatRole.MODERATOR, ChatRole.CAPTAIN].includes(userRole);
        
      case ChannelType.SUPPORT_CHAT:
        // All authenticated users can access support
        return userRole !== ChatRole.GUEST;
        
      case ChannelType.ANNOUNCEMENT:
      case ChannelType.GROUP_CHAT:
      default:
        // Most channels allow all users except banned
        return true;
    }
  }
  
  /**
   * Generate Stream Chat permissions object for user
   */
  static generateStreamChatPermissions(userRole: ChatRole): any {
    const permissions = ROLE_PERMISSIONS[userRole];
    
    // Map our permissions to Stream Chat permission structure
    const streamPermissions: any = {
      // Channel permissions
      'create-channel': permissions.includes(ChatPermission.CREATE_CHANNEL),
      'delete-channel': permissions.includes(ChatPermission.DELETE_CHANNEL),
      'update-channel': permissions.includes(ChatPermission.UPDATE_CHANNEL),
      
      // Member management
      'add-channel-members': permissions.includes(ChatPermission.ADD_MEMBERS),
      'remove-channel-members': permissions.includes(ChatPermission.REMOVE_MEMBERS),
      'ban-channel-members': permissions.includes(ChatPermission.BAN_MEMBERS),
      'mute-channel-members': permissions.includes(ChatPermission.MUTE_MEMBERS),
      
      // Message permissions
      'send-message': permissions.includes(ChatPermission.SEND_MESSAGE),
      'delete-message': permissions.includes(ChatPermission.DELETE_MESSAGE),
      'update-message': permissions.includes(ChatPermission.EDIT_MESSAGE),
      'pin-message': permissions.includes(ChatPermission.PIN_MESSAGE),
      
      // File permissions
      'upload-file': permissions.includes(ChatPermission.UPLOAD_FILE),
      'send-links': permissions.includes(ChatPermission.SHARE_LINK),
      'send-reaction': permissions.includes(ChatPermission.SEND_EMOJI),
      
      // Moderation permissions
      'moderate-channel': permissions.includes(ChatPermission.MODERATE_CONTENT),
      'flag-message': permissions.includes(ChatPermission.VIEW_REPORTS)
    };
    
    return streamPermissions;
  }
  
  /**
   * Create secure channel configuration
   */
  static createSecureChannelConfig(
    channelType: ChannelType,
    creatorRole: ChatRole,
    options: {
      isPrivate?: boolean;
      maxMembers?: number;
      autoModeration?: boolean;
      allowGuests?: boolean;
    } = {}
  ): any {
    const config: any = {
      // Basic configuration
      channel_type: channelType,
      created_by_role: creatorRole,
      
      // Privacy settings
      private: options.isPrivate ?? channelType === ChannelType.TRIP_CHAT,
      members_only: channelType !== ChannelType.ANNOUNCEMENT,
      
      // Member limits
      max_members: options.maxMembers ?? this.getDefaultMaxMembers(channelType),
      
      // Moderation settings
      automod: options.autoModeration ?? true,
      automod_behavior: 'block', // Block potentially harmful content
      
      // Message settings
      max_message_length: this.getMaxMessageLength(channelType),
      message_retention: this.getMessageRetention(channelType),
      
      // File upload settings
      file_upload: this.isFileUploadAllowed(channelType),
      max_file_size: 10 * 1024 * 1024, // 10MB default
      
      // Security features
      slow_mode: channelType === ChannelType.ANNOUNCEMENT, // Prevent spam in announcements
      freeze_channel: false,
      disabled: false
    };
    
    return config;
  }
  
  /**
   * Audit user action for security logging
   */
  static async auditUserAction(
    userId: string,
    action: string,
    channelId: string,
    details: any = {},
    success: boolean = true
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      channelId,
      details,
      success,
      userAgent: details.userAgent || 'unknown',
      ipAddress: details.ipAddress || 'unknown',
      sessionId: details.sessionId || 'unknown'
    };
    
    // Log security audit (implement based on your logging system)
    console.log('🔍 Chat Security Audit:', auditEntry);
    
    // In production, send to security monitoring system
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to security monitoring service
      // await securityMonitoringService.logEvent(auditEntry);
    }
    
    // Store critical security events
    if (this.isCriticalSecurityEvent(action)) {
      await this.storeCriticalSecurityEvent(auditEntry);
    }
  }
  
  /**
   * Check if action is a critical security event
   */
  private static isCriticalSecurityEvent(action: string): boolean {
    const criticalActions = [
      'ban_user',
      'delete_channel',
      'remove_member',
      'moderate_content',
      'access_denied',
      'permission_escalation_attempt'
    ];
    
    return criticalActions.includes(action);
  }
  
  /**
   * Store critical security events for investigation
   */
  private static async storeCriticalSecurityEvent(auditEntry: any): Promise<void> {
    // In production, store in secure audit database
    // Example implementation:
    try {
      // await prisma.securityAuditLog.create({ data: auditEntry });
      console.log('🚨 Critical Security Event Logged:', auditEntry.action);
    } catch (error) {
      console.error('❌ Failed to store critical security event:', error);
    }
  }
  
  // Helper methods for channel configuration
  private static getDefaultMaxMembers(channelType: ChannelType): number {
    switch (channelType) {
      case ChannelType.TRIP_CHAT: return 20; // Typical trip size
      case ChannelType.SUPPORT_CHAT: return 5; // User + support team
      case ChannelType.MODERATION: return 10; // Moderation team
      case ChannelType.ANNOUNCEMENT: return 1000; // Broadcast channel
      case ChannelType.GROUP_CHAT: return 50; // General discussion
      default: return 50;
    }
  }
  
  private static getMaxMessageLength(channelType: ChannelType): number {
    switch (channelType) {
      case ChannelType.ANNOUNCEMENT: return 2000; // Longer announcements
      case ChannelType.SUPPORT_CHAT: return 1500; // Detailed support queries
      default: return 1000; // Standard message length
    }
  }
  
  private static getMessageRetention(channelType: ChannelType): string {
    switch (channelType) {
      case ChannelType.SUPPORT_CHAT: return '90d'; // Keep support history
      case ChannelType.MODERATION: return '365d'; // Keep moderation records
      case ChannelType.TRIP_CHAT: return '30d'; // Trip memories
      default: return '14d'; // General retention
    }
  }
  
  private static isFileUploadAllowed(channelType: ChannelType): boolean {
    // All channel types allow file uploads except moderation
    return channelType !== ChannelType.MODERATION;
  }
}

// Export types for use in other modules
export type {
  ChatRole as ChatRoleType,
  ChannelType as ChannelTypeType,
  ChatPermission as ChatPermissionType
};
