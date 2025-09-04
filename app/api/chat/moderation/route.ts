import { NextRequest, NextResponse } from 'next/server';
import { requireChatPermissions, requireChatRole } from '@/lib/middleware/chat-auth';
import { ChatSecurityManager, ChatRole, ChatPermission } from '@/lib/security/chat-permissions';
import { getStreamChatServerClient } from '@/lib/config/stream-chat';

/**
 * Chat Content Moderation API
 * Task 22.2: Chat Security Configuration
 * 
 * Comprehensive content moderation and safety features:
 * - Message flagging and review
 * - User moderation (mute, ban, timeout)
 * - Automated content filtering
 * - Moderation audit logging
 * - Abuse reporting system
 */

interface ModerationRequest {
  action: 'flag_message' | 'review_flag' | 'moderate_user' | 'auto_moderate' | 'report_abuse';
  channelId?: string;
  messageId?: string;
  userId?: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  moderationAction?: 'warn' | 'mute' | 'timeout' | 'ban' | 'delete_content';
  duration?: number; // Duration in minutes for temporary actions
  additionalContext?: any;
}

interface FlaggedContent {
  id: string;
  type: 'message' | 'user' | 'channel';
  content?: string;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  severity: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  moderatorId?: string;
  moderatorAction?: string;
  reviewedAt?: string;
}

/**
 * POST /api/chat/moderation - Handle moderation actions
 */
export const POST = requireChatPermissions.moderateContent()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const body: ModerationRequest = await request.json();
      
      const { 
        action, 
        channelId, 
        messageId, 
        userId: targetUserId, 
        reason, 
        severity = 'medium',
        moderationAction,
        duration,
        additionalContext = {}
      } = body;
      
      console.log(`🛡️ Moderation action ${action} by ${user.id} (${user.role})`);
      
      let result;
      
      switch (action) {
        case 'flag_message':
          result = await handleMessageFlag(
            user, channelId!, messageId!, reason!, severity, securityContext
          );
          break;
          
        case 'review_flag':
          result = await handleFlagReview(
            user, messageId!, moderationAction!, reason, securityContext
          );
          break;
          
        case 'moderate_user':
          result = await handleUserModeration(
            user, targetUserId!, moderationAction!, duration, reason!, channelId, securityContext
          );
          break;
          
        case 'auto_moderate':
          result = await handleAutoModeration(
            user, channelId!, additionalContext, securityContext
          );
          break;
          
        case 'report_abuse':
          result = await handleAbuseReport(
            user, targetUserId!, reason!, severity, additionalContext, securityContext
          );
          break;
          
        default:
          throw new Error(`Unsupported moderation action: ${action}`);
      }
      
      // Audit moderation action
      await ChatSecurityManager.auditUserAction(
        user.id,
        `moderation_${action}`,
        channelId || messageId || targetUserId || 'system',
        {
          action,
          targetUser: targetUserId,
          reason,
          severity,
          moderationAction,
          duration,
          result: result.success,
          ...securityContext
        },
        result.success
      );
      
      console.log(`✅ Moderation ${action} completed by ${user.id}`);
      
      return NextResponse.json({
        success: true,
        ...result,
        moderator: {
          id: user.id,
          name: user.name,
          role: user.role
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Moderation action error:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'moderation_error',
        'unknown',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Moderation action failed',
        code: 'MODERATION_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

/**
 * GET /api/chat/moderation - Get moderation queue and flagged content
 */
export const GET = requireChatRole.moderator()(
  async (request: NextRequest, context) => {
    try {
      const { user, securityContext } = context;
      const { searchParams } = new URL(request.url);
      
      const status = searchParams.get('status') || 'pending';
      const severity = searchParams.get('severity');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      console.log(`📋 Getting moderation queue for ${user.id} (${user.role})`);
      
      // In a real implementation, fetch from database
      // For now, return mock data structure
      const mockFlaggedContent: FlaggedContent[] = [
        {
          id: 'flag_001',
          type: 'message',
          content: 'Suspicious message content...',
          reportedBy: 'user_123',
          reportedAt: new Date(Date.now() - 3600000).toISOString(),
          reason: 'Inappropriate language',
          severity: 'medium',
          status: 'pending'
        }
      ];
      
      // Filter based on parameters
      let filteredContent = mockFlaggedContent.filter(item => 
        item.status === status
      );
      
      if (severity) {
        filteredContent = filteredContent.filter(item => 
          item.severity === severity
        );
      }
      
      // Apply pagination
      const paginatedContent = filteredContent.slice(offset, offset + limit);
      
      // Get moderation statistics
      const stats = {
        pending: mockFlaggedContent.filter(item => item.status === 'pending').length,
        reviewed: mockFlaggedContent.filter(item => item.status === 'reviewed').length,
        resolved: mockFlaggedContent.filter(item => item.status === 'resolved').length,
        dismissed: mockFlaggedContent.filter(item => item.status === 'dismissed').length,
        totalFlags: mockFlaggedContent.length,
        averageResolutionTime: '2.5 hours', // Mock data
        userReports: 15, // Mock data
        autoFlags: 8 // Mock data
      };
      
      // Audit moderation queue access
      await ChatSecurityManager.auditUserAction(
        user.id,
        'moderation_queue_accessed',
        'moderation_system',
        {
          status,
          severity,
          itemCount: paginatedContent.length,
          ...securityContext
        },
        true
      );
      
      return NextResponse.json({
        success: true,
        flaggedContent: paginatedContent,
        pagination: {
          total: filteredContent.length,
          limit,
          offset,
          hasMore: filteredContent.length > offset + limit
        },
        statistics: stats,
        moderator: {
          id: user.id,
          name: user.name,
          role: user.role,
          permissions: user.permissions
        },
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('❌ Error getting moderation queue:', error);
      
      const { user, securityContext } = context;
      await ChatSecurityManager.auditUserAction(
        user?.id || 'unknown',
        'moderation_queue_error',
        'moderation_system',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          ...securityContext
        },
        false
      );
      
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve moderation queue',
        code: 'MODERATION_QUEUE_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  }
);

// Handler functions

async function handleMessageFlag(
  user: any,
  channelId: string,
  messageId: string,
  reason: string,
  severity: string,
  securityContext: any
) {
  const client = getStreamChatServerClient();
  
  // Flag message in Stream Chat
  await client.flagMessage(messageId, {
    reason,
    user_id: user.id
  });
  
  // Store flag in database (implement based on your DB schema)
  const flagId = await storeFlagInDatabase({
    type: 'message',
    targetId: messageId,
    channelId,
    reportedBy: user.id,
    reason,
    severity,
    status: 'pending',
    timestamp: new Date().toISOString()
  });
  
  // Notify moderation team
  await notifyModerationTeam({
    type: 'message_flagged',
    flagId,
    messageId,
    channelId,
    reportedBy: user.name,
    reason,
    severity
  });
  
  return {
    success: true,
    action: 'message_flagged',
    flagId,
    messageId,
    status: 'pending_review'
  };
}

async function handleFlagReview(
  user: any,
  flagId: string,
  moderationAction: string,
  reason?: string,
  securityContext?: any
) {
  // Get flag details (implement database query)
  const flag = await getFlagFromDatabase(flagId);
  
  if (!flag) {
    throw new Error('Flag not found');
  }
  
  const client = getStreamChatServerClient();
  let actionResult;
  
  // Execute moderation action
  switch (moderationAction) {
    case 'delete_content':
      if (flag.type === 'message') {
        await client.deleteMessage(flag.targetId);
      }
      actionResult = 'content_deleted';
      break;
      
    case 'dismiss':
      // No action needed, just update flag status
      actionResult = 'flag_dismissed';
      break;
      
    default:
      throw new Error(`Unsupported moderation action: ${moderationAction}`);
  }
  
  // Update flag status
  await updateFlagInDatabase(flagId, {
    status: 'reviewed',
    moderatorId: user.id,
    moderatorAction: moderationAction,
    reviewedAt: new Date().toISOString(),
    reviewReason: reason
  });
  
  return {
    success: true,
    action: 'flag_reviewed',
    flagId,
    moderationAction,
    result: actionResult
  };
}

async function handleUserModeration(
  user: any,
  targetUserId: string,
  moderationAction: string,
  duration: number | undefined,
  reason: string,
  channelId?: string,
  securityContext?: any
) {
  const client = getStreamChatServerClient();
  let actionResult;
  
  switch (moderationAction) {
    case 'mute':
      if (channelId) {
        const channel = client.channel('messaging', channelId);
        await channel.muteUser(targetUserId, {
          timeout: duration ? duration * 60 : undefined // Convert minutes to seconds
        });
        actionResult = `user_muted_for_${duration || 'indefinite'}_minutes`;
      } else {
        await client.muteUser(targetUserId, user.id, {
          timeout: duration ? duration * 60 : undefined
        });
        actionResult = `user_globally_muted_for_${duration || 'indefinite'}_minutes`;
      }
      break;
      
    case 'ban':
      if (channelId) {
        const channel = client.channel('messaging', channelId);
        await channel.banUser(targetUserId, {
          reason,
          timeout: duration ? duration * 60 : undefined
        });
        actionResult = `user_banned_from_channel_for_${duration || 'permanent'}`;
      } else {
        await client.banUser(targetUserId, {
          reason,
          timeout: duration ? duration * 60 : undefined
        });
        actionResult = `user_globally_banned_for_${duration || 'permanent'}`;
      }
      break;
      
    case 'warn':
      // Send warning message to user
      await sendWarningToUser(targetUserId, reason, user.name);
      actionResult = 'warning_sent';
      break;
      
    default:
      throw new Error(`Unsupported user moderation action: ${moderationAction}`);
  }
  
  return {
    success: true,
    action: 'user_moderated',
    targetUserId,
    moderationAction,
    duration,
    result: actionResult
  };
}

async function handleAutoModeration(
  user: any,
  channelId: string,
  config: any,
  securityContext: any
) {
  const client = getStreamChatServerClient();
  const channel = client.channel('messaging', channelId);
  
  // Configure auto-moderation settings
  const autoModConfig = {
    automod: 'AI', // Use Stream's AI moderation
    automod_behavior: config.behavior || 'block',
    automod_thresholds: {
      explicit: config.explicit || 0.8,
      spam: config.spam || 0.7,
      toxic: config.toxic || 0.6
    }
  };
  
  await channel.update(autoModConfig);
  
  return {
    success: true,
    action: 'auto_moderation_configured',
    channelId,
    config: autoModConfig
  };
}

async function handleAbuseReport(
  user: any,
  targetUserId: string,
  reason: string,
  severity: string,
  additionalContext: any,
  securityContext: any
) {
  // Store abuse report
  const reportId = await storeAbuseReport({
    reportedBy: user.id,
    targetUserId,
    reason,
    severity,
    additionalContext,
    timestamp: new Date().toISOString(),
    status: 'pending'
  });
  
  // Notify moderation team for high/critical severity reports
  if (severity === 'high' || severity === 'critical') {
    await notifyModerationTeam({
      type: 'abuse_report',
      reportId,
      reportedBy: user.name,
      targetUserId,
      reason,
      severity,
      urgent: severity === 'critical'
    });
  }
  
  return {
    success: true,
    action: 'abuse_reported',
    reportId,
    status: 'submitted',
    severity
  };
}

// Helper functions (implement based on your database schema)

async function storeFlagInDatabase(flagData: any): Promise<string> {
  // Implementation: Store in your database
  console.log('📝 Storing flag in database:', flagData);
  return `flag_${Date.now()}`;
}

async function getFlagFromDatabase(flagId: string): Promise<any> {
  // Implementation: Fetch from your database
  console.log('🔍 Getting flag from database:', flagId);
  return null; // Mock implementation
}

async function updateFlagInDatabase(flagId: string, updates: any): Promise<void> {
  // Implementation: Update in your database
  console.log('📝 Updating flag in database:', flagId, updates);
}

async function storeAbuseReport(reportData: any): Promise<string> {
  // Implementation: Store abuse report
  console.log('📝 Storing abuse report:', reportData);
  return `report_${Date.now()}`;
}

async function notifyModerationTeam(notification: any): Promise<void> {
  // Implementation: Send notification to moderation team
  console.log('🔔 Notifying moderation team:', notification);
  
  // Could send webhook, email, or push notification
  // Example: Send to moderation channel
  try {
    const client = getStreamChatServerClient();
    const moderationChannel = client.channel('messaging', 'moderation-alerts');
    
    await moderationChannel.sendMessage({
      text: formatModerationNotification(notification),
      user_id: 'moderation-bot',
      attachments: [{
        type: 'alert',
        title: 'Moderation Alert',
        text: notification.reason || 'No reason provided',
        color: notification.urgent ? 'red' : 'orange'
      }]
    });
  } catch (error) {
    console.error('❌ Failed to notify moderation team:', error);
  }
}

async function sendWarningToUser(userId: string, reason: string, moderatorName: string): Promise<void> {
  // Implementation: Send warning message to user
  console.log('⚠️ Sending warning to user:', userId, reason);
  
  try {
    const client = getStreamChatServerClient();
    
    // Create a direct message channel with the user
    const warningChannel = client.channel('messaging', `warning-${userId}-${Date.now()}`, {
      members: [userId, 'moderation-bot'],
      name: 'Moderation Warning'
    });
    
    await warningChannel.create();
    
    await warningChannel.sendMessage({
      text: `⚠️ **Moderation Warning**\n\nReason: ${reason}\n\nModerator: ${moderatorName}\n\nPlease review our community guidelines to avoid further action.`,
      user_id: 'moderation-bot'
    });
  } catch (error) {
    console.error('❌ Failed to send warning to user:', error);
  }
}

function formatModerationNotification(notification: any): string {
  switch (notification.type) {
    case 'message_flagged':
      return `🚩 Message flagged by ${notification.reportedBy}\nReason: ${notification.reason}\nSeverity: ${notification.severity}\nChannel: ${notification.channelId}`;
    
    case 'abuse_report':
      return `🚨 Abuse report submitted by ${notification.reportedBy}\nTarget: ${notification.targetUserId}\nReason: ${notification.reason}\nSeverity: ${notification.severity}`;
    
    default:
      return `🔔 Moderation alert: ${JSON.stringify(notification)}`;
  }
}
