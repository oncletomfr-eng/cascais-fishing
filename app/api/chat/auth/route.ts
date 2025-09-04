import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateUserToken, getStreamChatServerClient } from '@/lib/config/stream-chat';
import { ChatSecurityManager, ChatRole, ChannelType } from '@/lib/security/chat-permissions';
import { prisma } from '@/lib/prisma';

/**
 * Enhanced Chat Authentication & Authorization API
 * Task 22.2: Chat Security Configuration
 * 
 * Comprehensive authentication and authorization for Stream Chat:
 * - Role-based authentication
 * - Permission validation
 * - Channel access control  
 * - Security audit logging
 */

interface AuthenticatedChatUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: ChatRole;
  permissions: string[];
  token: string;
  expiresAt?: string;
}

/**
 * POST /api/chat/auth - Enhanced chat authentication with RBAC
 */
export async function POST(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await auth();
    
    if (!session?.user?.id) {
      await ChatSecurityManager.auditUserAction(
        'anonymous',
        'authentication_failed',
        'none',
        { 
          reason: 'No authenticated session',
          userAgent: request.headers.get('user-agent'),
          ipAddress: getClientIP(request)
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name || 'Anonymous User';
    const userEmail = session.user.email || '';

    // Get additional user context from request
    const requestBody = await request.json().catch(() => ({}));
    const { 
      channelId,
      channelType = ChannelType.GROUP_CHAT,
      requestedPermissions = []
    } = requestBody;

    console.log(`🔐 Authenticating user ${userId} for chat access`);

    // Get user's application role and context
    const userProfile = await getUserProfile(userId);
    const userAppRole = userProfile?.role || 'user';
    const isPremium = userProfile?.isPremium || false;
    const isModerator = userProfile?.isModerator || false;
    const isTripOwner = channelId ? await checkTripOwnership(userId, channelId) : false;

    // Determine chat role based on application context
    const chatRole = ChatSecurityManager.determineUserRole(
      userAppRole,
      isTripOwner,
      isPremium,
      isModerator
    );

    // Check if user is banned
    if (chatRole === ChatRole.BANNED) {
      await ChatSecurityManager.auditUserAction(
        userId,
        'authentication_denied',
        channelId || 'none',
        { 
          reason: 'User is banned',
          userRole: chatRole,
          userAgent: request.headers.get('user-agent'),
          ipAddress: getClientIP(request)
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: 'Access denied: User account is banned',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Validate channel access if channel specified
    if (channelId && channelType) {
      const isChannelMember = await checkChannelMembership(userId, channelId);
      const canAccessChannel = ChatSecurityManager.canAccessChannel(
        chatRole, 
        channelType as ChannelType,
        isChannelMember
      );
      
      if (!canAccessChannel) {
        await ChatSecurityManager.auditUserAction(
          userId,
          'channel_access_denied',
          channelId,
          { 
            reason: 'Insufficient permissions for channel access',
            userRole: chatRole,
            channelType,
            userAgent: request.headers.get('user-agent'),
            ipAddress: getClientIP(request)
          },
          false
        );
        
        return NextResponse.json({
          success: false,
          error: 'Access denied: Insufficient permissions for channel',
          timestamp: new Date().toISOString()
        }, { status: 403 });
      }
    }

    // Validate specific permissions if requested
    if (requestedPermissions.length > 0) {
      const hasAllPermissions = requestedPermissions.every(permission =>
        ChatSecurityManager.hasPermission(chatRole, permission, channelType as ChannelType)
      );
      
      if (!hasAllPermissions) {
        await ChatSecurityManager.auditUserAction(
          userId,
          'permission_denied',
          channelId || 'none',
          { 
            reason: 'Requested permissions not available for user role',
            userRole: chatRole,
            requestedPermissions,
            userAgent: request.headers.get('user-agent'),
            ipAddress: getClientIP(request)
          },
          false
        );
        
        return NextResponse.json({
          success: false,
          error: 'Access denied: Insufficient permissions',
          permissions: {
            requested: requestedPermissions,
            denied: requestedPermissions.filter(p => 
              !ChatSecurityManager.hasPermission(chatRole, p, channelType as ChannelType)
            )
          },
          timestamp: new Date().toISOString()
        }, { status: 403 });
      }
    }

    // Generate secure token with role-based metadata
    const tokenResult = await generateUserToken(userId, {
      name: userName,
      email: userEmail,
      image: session.user.image || undefined,
      role: chatRole,
      // Enhanced security metadata
      chat_role: chatRole,
      app_role: userAppRole,
      is_premium: isPremium,
      is_moderator: isModerator,
      is_trip_owner: isTripOwner,
      permissions: ChatSecurityManager.getUserPermissions(chatRole, channelType as ChannelType),
      // Security context
      authenticated_at: new Date().toISOString(),
      session_id: generateSessionId(),
      ip_address: getClientIP(request),
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    // Get user's permissions for this channel type
    const userPermissions = ChatSecurityManager.getUserPermissions(
      chatRole, 
      channelType as ChannelType
    );

    // Create response with comprehensive user data
    const authenticatedUser: AuthenticatedChatUser = {
      id: userId,
      name: userName,
      email: userEmail,
      image: tokenResult.user.image,
      role: chatRole,
      permissions: userPermissions,
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt?.toISOString()
    };

    // Audit successful authentication
    await ChatSecurityManager.auditUserAction(
      userId,
      'authentication_success',
      channelId || 'none',
      { 
        userRole: chatRole,
        channelType,
        permissionsGranted: userPermissions.length,
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientIP(request)
      },
      true
    );

    console.log(`✅ Chat authentication successful for user ${userId} with role ${chatRole}`);

    return NextResponse.json({
      success: true,
      user: authenticatedUser,
      context: {
        channelType,
        channelAccess: channelId ? true : undefined,
        roleHierarchy: Object.values(ChatRole),
        securityLevel: determineSecurityLevel(chatRole)
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat authentication error:', error);
    
    // Audit authentication failure
    await ChatSecurityManager.auditUserAction(
      'unknown',
      'authentication_error',
      'none',
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userAgent: request.headers.get('user-agent'),
        ipAddress: getClientIP(request)
      },
      false
    );

    // Return appropriate error message
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment && error instanceof Error 
      ? error.message 
      : 'Authentication failed';

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * GET /api/chat/auth - Get current user's chat authentication status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated',
        authenticated: false,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const userId = session.user.id;
    
    // Get user's current chat role and permissions
    const userProfile = await getUserProfile(userId);
    const userAppRole = userProfile?.role || 'user';
    
    const chatRole = ChatSecurityManager.determineUserRole(
      userAppRole,
      false, // Not checking trip ownership in general status
      userProfile?.isPremium || false,
      userProfile?.isModerator || false
    );

    // Get default permissions
    const userPermissions = ChatSecurityManager.getUserPermissions(chatRole);

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: userId,
        name: session.user.name,
        email: session.user.email,
        role: chatRole,
        permissions: userPermissions
      },
      securityLevel: determineSecurityLevel(chatRole),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Chat auth status error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get authentication status',
      authenticated: false,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Helper functions

async function getUserProfile(userId: string) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        // Add other relevant fields based on your user schema
      }
    });
    
    return {
      role: profile?.role || 'user',
      isPremium: false, // TODO: Implement premium status check
      isModerator: profile?.role === 'moderator' || profile?.role === 'admin'
    };
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    return {
      role: 'user',
      isPremium: false,
      isModerator: false
    };
  }
}

async function checkTripOwnership(userId: string, channelId: string): Promise<boolean> {
  try {
    // Extract trip ID from channel ID (assuming format like 'trip-{tripId}')
    const tripId = channelId.startsWith('trip-') ? channelId.replace('trip-', '') : null;
    
    if (!tripId) return false;
    
    // Check if user owns this trip
    const trip = await prisma.groupTrip.findFirst({
      where: {
        id: tripId,
        captainId: userId
      }
    });
    
    return !!trip;
  } catch (error) {
    console.error('❌ Error checking trip ownership:', error);
    return false;
  }
}

async function checkChannelMembership(userId: string, channelId: string): Promise<boolean> {
  try {
    // Use Stream Chat client to check membership
    const client = getStreamChatServerClient();
    const channel = client.channel('messaging', channelId);
    
    const { members } = await channel.queryMembers({ id: userId });
    return members.length > 0;
  } catch (error) {
    console.error('❌ Error checking channel membership:', error);
    return false;
  }
}

function getClientIP(request: NextRequest): string {
  // Try various headers for client IP
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

function determineSecurityLevel(role: ChatRole): 'low' | 'medium' | 'high' | 'critical' {
  switch (role) {
    case ChatRole.SUPER_ADMIN:
      return 'critical';
    case ChatRole.ADMIN:
    case ChatRole.MODERATOR:
      return 'high';
    case ChatRole.CAPTAIN:
    case ChatRole.PREMIUM_USER:
      return 'medium';
    case ChatRole.USER:
    case ChatRole.GUEST:
      return 'low';
    case ChatRole.BANNED:
      return 'low';
    default:
      return 'low';
  }
}
