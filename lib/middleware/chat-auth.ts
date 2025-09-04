/**
 * Chat Authentication Middleware
 * Task 22.2: Chat Security Configuration
 * 
 * Middleware for protecting chat endpoints and validating permissions:
 * - Request authentication
 * - Role-based authorization
 * - Permission validation
 * - Security audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ChatSecurityManager, ChatRole, ChatPermission, ChannelType } from '@/lib/security/chat-permissions';

export interface ChatAuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: ChatRole;
    permissions: ChatPermission[];
  };
  session: any;
  securityContext: {
    ipAddress: string;
    userAgent: string;
    sessionId: string;
    timestamp: string;
  };
}

export interface ChatAuthOptions {
  requiredPermissions?: ChatPermission[];
  requiredRole?: ChatRole;
  channelType?: ChannelType;
  allowGuests?: boolean;
  auditAction?: string;
}

/**
 * Main chat authentication middleware
 */
export async function withChatAuth(
  request: NextRequest,
  handler: (request: NextRequest, context: ChatAuthContext) => Promise<NextResponse>,
  options: ChatAuthOptions = {}
): Promise<NextResponse> {
  try {
    console.log(`🔒 Chat auth middleware: ${request.method} ${request.url}`);
    
    // Get authenticated session
    const session = await auth();
    
    // Check if authentication is required
    if (!session?.user?.id) {
      if (!options.allowGuests) {
        await ChatSecurityManager.auditUserAction(
          'anonymous',
          options.auditAction || 'unauthorized_access_attempt',
          'none',
          {
            endpoint: request.url,
            method: request.method,
            userAgent: request.headers.get('user-agent'),
            ipAddress: getClientIP(request)
          },
          false
        );
        
        return NextResponse.json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }, { status: 401 });
      }
      
      // Allow guest access with limited permissions
      const guestContext = createGuestContext(request);
      return await handler(request, guestContext);
    }

    const userId = session.user.id;
    
    // Determine user's chat role
    const chatRole = await determineUserChatRole(userId);
    
    // Check if user is banned
    if (chatRole === ChatRole.BANNED) {
      await ChatSecurityManager.auditUserAction(
        userId,
        'banned_user_access_attempt',
        'none',
        {
          endpoint: request.url,
          method: request.method,
          userAgent: request.headers.get('user-agent'),
          ipAddress: getClientIP(request)
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: 'Access denied: Account banned',
        code: 'USER_BANNED'
      }, { status: 403 });
    }
    
    // Check minimum role requirement
    if (options.requiredRole && !hasMinimumRole(chatRole, options.requiredRole)) {
      await ChatSecurityManager.auditUserAction(
        userId,
        'insufficient_role_access_attempt',
        'none',
        {
          endpoint: request.url,
          method: request.method,
          userRole: chatRole,
          requiredRole: options.requiredRole,
          userAgent: request.headers.get('user-agent'),
          ipAddress: getClientIP(request)
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: `Access denied: Minimum role required: ${options.requiredRole}`,
        code: 'INSUFFICIENT_ROLE'
      }, { status: 403 });
    }
    
    // Check specific permissions
    if (options.requiredPermissions?.length) {
      const userPermissions = ChatSecurityManager.getUserPermissions(
        chatRole, 
        options.channelType || ChannelType.GROUP_CHAT
      );
      
      const hasAllPermissions = options.requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        const missingPermissions = options.requiredPermissions.filter(permission =>
          !userPermissions.includes(permission)
        );
        
        await ChatSecurityManager.auditUserAction(
          userId,
          'insufficient_permissions_access_attempt',
          'none',
          {
            endpoint: request.url,
            method: request.method,
            userRole: chatRole,
            requiredPermissions: options.requiredPermissions,
            missingPermissions,
            userAgent: request.headers.get('user-agent'),
            ipAddress: getClientIP(request)
          },
          false
        );
        
        return NextResponse.json({
          success: false,
          error: 'Access denied: Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            required: options.requiredPermissions,
            missing: missingPermissions
          }
        }, { status: 403 });
      }
    }
    
    // Create authentication context
    const authContext: ChatAuthContext = {
      user: {
        id: userId,
        name: session.user.name || 'Anonymous User',
        email: session.user.email || '',
        role: chatRole,
        permissions: ChatSecurityManager.getUserPermissions(
          chatRole, 
          options.channelType || ChannelType.GROUP_CHAT
        )
      },
      session,
      securityContext: {
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        sessionId: generateSessionId(),
        timestamp: new Date().toISOString()
      }
    };
    
    // Audit successful authentication
    if (options.auditAction) {
      await ChatSecurityManager.auditUserAction(
        userId,
        options.auditAction,
        'none',
        {
          endpoint: request.url,
          method: request.method,
          userRole: chatRole,
          userAgent: request.headers.get('user-agent'),
          ipAddress: getClientIP(request)
        },
        true
      );
    }
    
    // Execute handler with authentication context
    return await handler(request, authContext);
    
  } catch (error) {
    console.error('❌ Chat auth middleware error:', error);
    
    // Audit middleware error
    await ChatSecurityManager.auditUserAction(
      'unknown',
      'auth_middleware_error',
      'none',
      {
        endpoint: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientIP(request)
      },
      false
    );
    
    return NextResponse.json({
      success: false,
      error: 'Authentication middleware failed',
      code: 'AUTH_MIDDLEWARE_ERROR'
    }, { status: 500 });
  }
}

/**
 * Simplified wrapper for common chat endpoint protection
 */
export function requireChatAuth(options: ChatAuthOptions = {}) {
  return (handler: (request: NextRequest, context: ChatAuthContext) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      return withChatAuth(request, handler, options);
    };
  };
}

/**
 * Permission-specific middleware factories
 */
export const requireChatPermissions = {
  // Channel management
  createChannel: () => requireChatAuth({
    requiredPermissions: [ChatPermission.CREATE_CHANNEL],
    auditAction: 'channel_create_attempt'
  }),
  
  deleteChannel: () => requireChatAuth({
    requiredPermissions: [ChatPermission.DELETE_CHANNEL],
    auditAction: 'channel_delete_attempt'
  }),
  
  updateChannel: () => requireChatAuth({
    requiredPermissions: [ChatPermission.UPDATE_CHANNEL],
    auditAction: 'channel_update_attempt'
  }),
  
  // Member management
  addMembers: () => requireChatAuth({
    requiredPermissions: [ChatPermission.ADD_MEMBERS],
    auditAction: 'member_add_attempt'
  }),
  
  removeMembers: () => requireChatAuth({
    requiredPermissions: [ChatPermission.REMOVE_MEMBERS],
    auditAction: 'member_remove_attempt'
  }),
  
  banMembers: () => requireChatAuth({
    requiredPermissions: [ChatPermission.BAN_MEMBERS],
    auditAction: 'member_ban_attempt'
  }),
  
  // Message management
  sendMessage: () => requireChatAuth({
    requiredPermissions: [ChatPermission.SEND_MESSAGE],
    auditAction: 'message_send_attempt'
  }),
  
  deleteMessage: () => requireChatAuth({
    requiredPermissions: [ChatPermission.DELETE_MESSAGE],
    auditAction: 'message_delete_attempt'
  }),
  
  // File management
  uploadFile: () => requireChatAuth({
    requiredPermissions: [ChatPermission.UPLOAD_FILE],
    auditAction: 'file_upload_attempt'
  }),
  
  // Moderation
  moderateContent: () => requireChatAuth({
    requiredPermissions: [ChatPermission.MODERATE_CONTENT],
    requiredRole: ChatRole.MODERATOR,
    auditAction: 'moderation_attempt'
  })
};

/**
 * Role-specific middleware factories
 */
export const requireChatRole = {
  admin: () => requireChatAuth({
    requiredRole: ChatRole.ADMIN,
    auditAction: 'admin_access_attempt'
  }),
  
  moderator: () => requireChatAuth({
    requiredRole: ChatRole.MODERATOR,
    auditAction: 'moderator_access_attempt'
  }),
  
  captain: () => requireChatAuth({
    requiredRole: ChatRole.CAPTAIN,
    auditAction: 'captain_access_attempt'
  }),
  
  premiumUser: () => requireChatAuth({
    requiredRole: ChatRole.PREMIUM_USER,
    auditAction: 'premium_access_attempt'
  })
};

// Helper functions

async function determineUserChatRole(userId: string): Promise<ChatRole> {
  try {
    // This should match the logic from the auth endpoint
    // For now, return a default role - in production, fetch from database
    return ChatRole.USER;
    
    // TODO: Implement actual role determination
    /*
    const userProfile = await getUserProfile(userId);
    return ChatSecurityManager.determineUserRole(
      userProfile.appRole,
      userProfile.isTripOwner,
      userProfile.isPremium,
      userProfile.isModerator
    );
    */
  } catch (error) {
    console.error('❌ Error determining user chat role:', error);
    return ChatRole.USER;
  }
}

function hasMinimumRole(userRole: ChatRole, requiredRole: ChatRole): boolean {
  // Define role hierarchy (higher number = more permissions)
  const roleHierarchy = {
    [ChatRole.BANNED]: 0,
    [ChatRole.GUEST]: 1,
    [ChatRole.USER]: 2,
    [ChatRole.PREMIUM_USER]: 3,
    [ChatRole.CAPTAIN]: 4,
    [ChatRole.MODERATOR]: 5,
    [ChatRole.ADMIN]: 6,
    [ChatRole.SUPER_ADMIN]: 7
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

function createGuestContext(request: NextRequest): ChatAuthContext {
  return {
    user: {
      id: 'guest',
      name: 'Guest User',
      email: '',
      role: ChatRole.GUEST,
      permissions: ChatSecurityManager.getUserPermissions(ChatRole.GUEST)
    },
    session: null,
    securityContext: {
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || 'unknown',
      sessionId: generateSessionId(),
      timestamp: new Date().toISOString()
    }
  };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP.trim();
  }
  if (remoteAddr) {
    return remoteAddr.trim();
  }
  
  return 'unknown';
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
