import { NextRequest, NextResponse } from 'next/server';
import { requireChatPermissions, requireChatRole } from '@/lib/middleware/chat-auth';
import { ChatSecurityManager, ChatRole, ChannelType, ChatPermission } from '@/lib/security/chat-permissions';
import { getStreamChatServerClient, createTripChannel } from '@/lib/config/stream-chat';
import { prisma } from '@/lib/prisma';

/**
 * Secure Channel Management API
 * Task 22.2: Chat Security Configuration
 * 
 * Enhanced channel management with comprehensive security:
 * - Role-based channel access
 * - Permission validation
 * - Audit logging
 * - Content moderation integration
 */

interface SecureChannelRequest {
  action: 'create' | 'join' | 'leave' | 'update' | 'delete';
  channelType: ChannelType;
  channelId?: string;
  tripId?: string;
  channelConfig?: {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    maxMembers?: number;
    autoModeration?: boolean;
  };
}

/**
 * POST /api/chat/secure-channels - Create or manage secure chat channels
 */
export const POST = requireChatPermissions.createChannel()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const body: SecureChannelRequest = await request.json();
      
      const { action, channelType, channelId, tripId, channelConfig } = body;
      
      console.log(`🔐 Secure channel ${action}: ${channelType} by user ${user.id} (${user.role})`);
      
      // Validate channel type access
      if (!ChatSecurityManager.canAccessChannel(user.role, channelType)) {
        await ChatSecurityManager.auditUserAction(
          user.id,
          'channel_access_denied',
          channelId || 'new',
          {
            action,
            channelType,
            reason: 'User role cannot access this channel type',
            userRole: user.role,
            ...securityContext
          },
          false
        );
        
        return NextResponse.json({
          success: false,
          error: `Access denied: Cannot ${action} ${channelType} channels with role ${user.role}`,
          code: 'CHANNEL_TYPE_ACCESS_DENIED'
        }, { status: 403 });
      }
      
      let result;
      
      switch (action) {
        case 'create':
          result = await handleSecureChannelCreation(
            user, channelType, tripId, channelConfig, securityContext
          );
          break;
          
        case 'join':
          result = await handleSecureChannelJoin(
            user, channelType, channelId || '', securityContext
          );
          break;
          
        case 'leave':
          result = await handleSecureChannelLeave(
            user, channelId || '', securityContext
          );
          break;
          
        case 'update':
          result = await handleSecureChannelUpdate(
            user, channelId || '', channelConfig, securityContext
          );
          break;
          
        case 'delete':
          result = await handleSecureChannelDeletion(
            user, channelId || '', securityContext
          );
          break;
          
        default:
          throw new Error(`Unsupported action: ${action}`);
      }
      
      // Audit successful operation
      await ChatSecurityManager.auditUserAction(
        user.id,
        `channel_${action}_success`,
        result.channelId || channelId || 'unknown',
        {
          channelType,
          result: result.success,
          ...securityContext
        },
        true
      );
      
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Secure channel management error:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'channel_operation_error',
        'unknown',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Channel operation failed',
        code: 'CHANNEL_OPERATION_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * GET /api/chat/secure-channels - Get user's accessible channels with security context
 */
export const GET = requireChatPermissions.sendMessage()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const channelType = searchParams.get('type') as ChannelType || undefined;
      const includeMetadata = searchParams.get('metadata') === 'true';
      
      console.log(`📋 Getting secure channels for user ${user.id} (${user.role})`);
      
      // Get Stream Chat client
      const client = getStreamChatServerClient();
      
      // Build secure channel query based on user permissions
      const filter: any = {
        type: 'messaging',
        members: { $in: [user.id] }
      };
      
      // Add channel type filter if specified
      if (channelType) {
        filter.channel_type = channelType;
      }
      
      // Apply security filters based on user role
      if (user.role === ChatRole.GUEST) {
        // Guests can only see public channels they're members of
        filter.private = false;
      } else if (user.role === ChatRole.USER || user.role === ChatRole.PREMIUM_USER) {
        // Regular users see channels they're members of, excluding moderation
        filter.channel_type = { $ne: ChannelType.MODERATION };
      }
      // Admins and moderators can see all channels they have access to
      
      const sort = { last_message_at: -1 };
      const options = {
        state: true,
        watch: false,
        presence: false,
        limit: 50
      };
      
      const channels = await client.queryChannels(filter, sort, options);
      
      // Process channels with security context
      const secureChannels = await Promise.all(
        channels.map(async (channel) => {
          const data = channel.data;
          const state = channel.state;
          
          // Determine channel type
          const detectedChannelType = data?.channel_type as ChannelType || ChannelType.GROUP_CHAT;
          
          // Check if user still has access (permissions might have changed)
          const hasAccess = ChatSecurityManager.canAccessChannel(
            user.role,
            detectedChannelType,
            true // User is a member since they're in the query results
          );
          
          if (!hasAccess) {
            // Remove user from channel if they shouldn't have access
            try {
              await channel.removeMembers([user.id]);
              console.log(`🔒 Removed user ${user.id} from ${channel.id} due to permission change`);
            } catch (error) {
              console.error(`❌ Failed to remove user from channel ${channel.id}:`, error);
            }
            return null; // Exclude from results
          }
          
          // Get user's permissions for this channel type
          const userPermissions = ChatSecurityManager.getUserPermissions(
            user.role, 
            detectedChannelType
          );
          
          // Basic channel information
          const channelInfo: any = {
            id: channel.id,
            type: detectedChannelType,
            name: data?.name || 'Unknown Channel',
            description: data?.description,
            isPrivate: data?.private || false,
            memberCount: state?.memberCount || 0,
            unreadCount: state?.unreadCount || 0,
            lastMessageAt: state?.last_message_at,
            permissions: userPermissions,
            userRole: user.role
          };
          
          // Add metadata if requested and user has permission
          if (includeMetadata && userPermissions.includes(ChatPermission.UPDATE_CHANNEL)) {
            channelInfo.metadata = {
              tripId: data?.trip_id,
              tripDate: data?.trip_date,
              captainName: data?.captain_name,
              maxParticipants: data?.max_participants,
              createdAt: data?.created_at,
              createdBy: data?.created_by_id,
              autoModeration: data?.automod,
              messageRetention: data?.message_retention
            };
          }
          
          return channelInfo;
        })
      );
      
      // Filter out null values (channels user no longer has access to)
      const accessibleChannels = secureChannels.filter(channel => channel !== null);
      
      // Audit channel access
      await ChatSecurityManager.auditUserAction(
        user.id,
        'channels_accessed',
        'multiple',
        {
          channelCount: accessibleChannels.length,
          channelType: channelType || 'all',
          includeMetadata,
          ...securityContext
        },
        true
      );
      
      console.log(`✅ Retrieved ${accessibleChannels.length} accessible channels for user ${user.id}`);
      
      return NextResponse.json({
        success: true,
        channels: accessibleChannels,
        metadata: {
          total: accessibleChannels.length,
          userRole: user.role,
          securityLevel: determineSecurityLevel(user.role),
          permissions: user.permissions
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error getting secure channels:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'channels_access_error',
        'multiple',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve channels',
        code: 'CHANNELS_RETRIEVAL_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

// Handler functions

async function handleSecureChannelCreation(
  user: any,
  channelType: ChannelType,
  tripId: string | undefined,
  channelConfig: any,
  securityContext: any
) {
  // Validate channel type creation permissions
  if (channelType === ChannelType.TRIP_CHAT && !tripId) {
    throw new Error('Trip ID required for trip chat creation');
  }
  
  if (channelType === ChannelType.MODERATION && user.role < ChatRole.MODERATOR) {
    throw new Error('Insufficient permissions to create moderation channels');
  }
  
  let channelData;
  
  if (channelType === ChannelType.TRIP_CHAT && tripId) {
    // Use secure trip channel creation
    channelData = await createTripChannel(tripId, user.id, {
      name: channelConfig?.name,
      description: channelConfig?.description,
      isPublic: !channelConfig?.isPrivate
    });
  } else {
    // Create general secure channel
    const client = getStreamChatServerClient();
    const channelId = generateSecureChannelId(channelType);
    
    const config = ChatSecurityManager.createSecureChannelConfig(
      channelType,
      user.role,
      {
        isPrivate: channelConfig?.isPrivate,
        maxMembers: channelConfig?.maxMembers,
        autoModeration: channelConfig?.autoModeration
      }
    );
    
    const channel = client.channel('messaging', channelId, {
      name: channelConfig?.name || `${channelType} Channel`,
      description: channelConfig?.description,
      created_by_id: user.id,
      members: [user.id],
      ...config
    });
    
    await channel.create();
    
    channelData = {
      channelId,
      channel,
      channelOptions: config
    };
  }
  
  return {
    channelId: channelData.channelId,
    channelType,
    action: 'created',
    config: channelData.channelOptions
  };
}

async function handleSecureChannelJoin(
  user: any,
  channelType: ChannelType,
  channelId: string,
  securityContext: any
) {
  const client = getStreamChatServerClient();
  const channel = client.channel('messaging', channelId);
  
  // Verify channel exists and user can access it
  const channelData = await channel.query();
  const detectedChannelType = channelData.channel?.channel_type as ChannelType || ChannelType.GROUP_CHAT;
  
  if (!ChatSecurityManager.canAccessChannel(user.role, detectedChannelType, false)) {
    throw new Error('Access denied: Cannot join this channel type');
  }
  
  // Add user to channel
  await channel.addMembers([user.id]);
  
  // Send system message if appropriate
  if (detectedChannelType !== ChannelType.ANNOUNCEMENT) {
    await channel.sendMessage({
      text: `${user.name} joined the channel`,
      user_id: 'system',
      silent: true
    }, { skip_push: true });
  }
  
  return {
    channelId,
    action: 'joined',
    memberCount: (channelData.members || []).length + 1
  };
}

async function handleSecureChannelLeave(
  user: any,
  channelId: string,
  securityContext: any
) {
  const client = getStreamChatServerClient();
  const channel = client.channel('messaging', channelId);
  
  // Remove user from channel
  await channel.removeMembers([user.id]);
  
  return {
    channelId,
    action: 'left'
  };
}

async function handleSecureChannelUpdate(
  user: any,
  channelId: string,
  channelConfig: any,
  securityContext: any
) {
  if (!user.permissions.includes(ChatPermission.UPDATE_CHANNEL)) {
    throw new Error('Insufficient permissions to update channel');
  }
  
  const client = getStreamChatServerClient();
  const channel = client.channel('messaging', channelId);
  
  // Update channel with security validation
  const updateData: any = {};
  
  if (channelConfig?.name) updateData.name = channelConfig.name;
  if (channelConfig?.description) updateData.description = channelConfig.description;
  if (channelConfig?.maxMembers) updateData.max_members = channelConfig.maxMembers;
  
  await channel.update(updateData);
  
  return {
    channelId,
    action: 'updated',
    updates: Object.keys(updateData)
  };
}

async function handleSecureChannelDeletion(
  user: any,
  channelId: string,
  securityContext: any
) {
  if (!user.permissions.includes(ChatPermission.DELETE_CHANNEL)) {
    throw new Error('Insufficient permissions to delete channel');
  }
  
  const client = getStreamChatServerClient();
  const channel = client.channel('messaging', channelId);
  
  // Delete channel
  await channel.delete();
  
  return {
    channelId,
    action: 'deleted'
  };
}

// Helper functions

function generateSecureChannelId(channelType: ChannelType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${channelType.toLowerCase()}-${timestamp}-${random}`;
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
    default:
      return 'low';
  }
}
