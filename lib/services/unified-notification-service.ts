/**
 * Unified Notification Service
 * Task 13.1: Create unified notification service
 * 
 * Centralizes all notification types and routes them through appropriate channels:
 * - Email notifications (via Resend)
 * - SSE real-time notifications (Chat, Booking, Group Trips)
 * - Database persistence
 * - Push notifications (future)
 * - In-app notifications
 */

import { prisma } from '@/lib/prisma';
import { sendParticipantApprovalNotification, sendBadgeAwardedNotification } from '@/lib/services/email-service';
import { broadcastBookingEvent, createBookingEvent, BookingSSEEvent } from '@/app/api/booking-notifications/sse/route';
import { broadcastGroupTripUpdateSSE } from '@/app/api/group-trips/sse/route';
import { broadcastChatEvent } from '@/app/api/chat/sse/route';

export enum NotificationType {
  // Booking related
  BOOKING_CONFIRMED = 'booking_confirmed',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  REFUND_PROCESSED = 'refund_processed',
  
  // Trip related
  TRIP_STATUS_CHANGED = 'trip_status_changed',
  TRIP_REMINDER = 'trip_reminder',
  WEATHER_ALERT = 'weather_alert',
  
  // Participant related
  PARTICIPANT_APPROVED = 'participant_approved',
  PARTICIPANT_REJECTED = 'participant_rejected',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  
  // Achievement related
  BADGE_AWARDED = 'badge_awarded',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  COMPETITION_COMPLETED = 'competition_completed',
  
  // Chat related
  MESSAGE_RECEIVED = 'message_received',
  MENTION_RECEIVED = 'mention_received',
  
  // Admin/Moderation
  MODERATION_ALERT = 'moderation_alert',
  ABUSE_REPORT = 'abuse_report',
  
  // System
  SYSTEM_MAINTENANCE = 'system_maintenance',
  FEATURE_ANNOUNCEMENT = 'feature_announcement'
}

export enum NotificationChannel {
  EMAIL = 'email',
  SSE = 'sse',
  DATABASE = 'database',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationData {
  id: string;
  type: NotificationType;
  userId: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  
  // Context IDs for filtering
  bookingId?: string;
  tripId?: string;
  chatChannelId?: string;
  
  // Scheduling
  scheduledFor?: Date;
  expiresAt?: Date;
  
  // Retry logic
  maxRetries?: number;
  retryCount?: number;
  
  // Tracking
  createdAt: Date;
  updatedAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  
  // Metadata
  source: string; // Which system/API created this notification
  templateId?: string; // For email templates
  locale?: string; // For i18n
}

export interface NotificationPreferences {
  userId: string;
  
  // Channel preferences
  emailEnabled: boolean;
  sseEnabled: boolean;
  pushEnabled: boolean;
  
  // Type preferences
  bookingNotifications: boolean;
  tripNotifications: boolean;
  achievementNotifications: boolean;
  chatNotifications: boolean;
  marketingNotifications: boolean;
  
  // Timing preferences
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string;   // "08:00"
  timezone: string;
  
  // Frequency preferences
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
  immediateForUrgent: boolean;
  
  updatedAt: Date;
}

class UnifiedNotificationService {
  private static instance: UnifiedNotificationService;
  
  static getInstance(): UnifiedNotificationService {
    if (!UnifiedNotificationService.instance) {
      UnifiedNotificationService.instance = new UnifiedNotificationService();
    }
    return UnifiedNotificationService.instance;
  }

  /**
   * Send a notification through all specified channels
   */
  async sendNotification(notification: Omit<NotificationData, 'id' | 'createdAt' | 'retryCount'>): Promise<{
    success: boolean;
    notificationId: string;
    results: Record<NotificationChannel, { success: boolean; error?: string }>;
  }> {
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullNotification: NotificationData = {
      ...notification,
      id: notificationId,
      createdAt: new Date(),
      retryCount: 0
    };

    console.log(`📨 Sending notification ${notificationId} to user ${notification.userId}:`, notification.type);

    // Get user preferences
    const preferences = await this.getUserPreferences(notification.userId);
    
    // Filter channels based on user preferences and quiet hours
    const allowedChannels = this.filterChannelsByPreferences(notification.channels, notification.type, preferences);
    
    if (allowedChannels.length === 0) {
      console.log(`📨 No allowed channels for notification ${notificationId} due to user preferences`);
      return {
        success: false,
        notificationId,
        results: {}
      };
    }

    // Store in database first
    await this.storeNotification(fullNotification);

    const results: Record<NotificationChannel, { success: boolean; error?: string }> = {};
    
    // Send through each allowed channel
    for (const channel of allowedChannels) {
      try {
        switch (channel) {
          case NotificationChannel.EMAIL:
            results[channel] = await this.sendEmailNotification(fullNotification);
            break;
            
          case NotificationChannel.SSE:
            results[channel] = await this.sendSSENotification(fullNotification);
            break;
            
          case NotificationChannel.DATABASE:
            results[channel] = { success: true }; // Already stored above
            break;
            
          case NotificationChannel.IN_APP:
            results[channel] = await this.sendInAppNotification(fullNotification);
            break;
            
          case NotificationChannel.PUSH:
            results[channel] = await this.sendPushNotification(fullNotification);
            break;
            
          default:
            results[channel] = { success: false, error: 'Unknown channel' };
        }
      } catch (error) {
        console.error(`📨 Error sending notification via ${channel}:`, error);
        results[channel] = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Update delivery status
    const hasSuccessfulDelivery = Object.values(results).some(r => r.success);
    if (hasSuccessfulDelivery) {
      await this.updateNotificationStatus(notificationId, { deliveredAt: new Date() });
    }

    const overallSuccess = hasSuccessfulDelivery;
    console.log(`📨 Notification ${notificationId} delivery: ${overallSuccess ? 'SUCCESS' : 'FAILED'}`);

    return {
      success: overallSuccess,
      notificationId,
      results
    };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: NotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Map notification type to email template
      const templateMapping = this.getEmailTemplateForNotificationType(notification.type);
      
      if (!templateMapping) {
        return { success: false, error: 'No email template available for this notification type' };
      }

      // Use appropriate email service method based on notification type
      let result: any;
      
      switch (notification.type) {
        case NotificationType.PARTICIPANT_APPROVAL_PENDING:
        case NotificationType.PARTICIPANT_APPROVAL_APPROVED:
        case NotificationType.PARTICIPANT_APPROVAL_REJECTED:
          result = await sendParticipantApprovalNotification({
            to: notification.data?.email || '',
            status: notification.type === NotificationType.PARTICIPANT_APPROVAL_APPROVED ? 'approved' : 
                   notification.type === NotificationType.PARTICIPANT_APPROVAL_REJECTED ? 'rejected' : 'pending',
            tripTitle: notification.data?.tripTitle || '',
            participantName: notification.data?.participantName || '',
            approvalUrl: notification.data?.approvalUrl || ''
          });
          break;
          
        case NotificationType.BADGE_AWARDED:
          result = await sendBadgeAwardedNotification({
            to: notification.data?.email || '',
            badgeName: notification.data?.badgeName || '',
            badgeDescription: notification.data?.badgeDescription || '',
            recipientName: notification.data?.recipientName || '',
            badgeImageUrl: notification.data?.badgeImageUrl || ''
          });
          break;
          
        default:
          console.warn(`No email handler for notification type: ${notification.type}`);
          return { success: false, error: 'No email template available for this notification type' };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Email sending failed' 
      };
    }
  }

  /**
   * Send SSE notification
   */
  private async sendSSENotification(notification: NotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      let sentCount = 0;

      // Route to appropriate SSE endpoint based on type
      switch (notification.type) {
        case NotificationType.BOOKING_CONFIRMED:
        case NotificationType.BOOKING_CANCELLED:
        case NotificationType.PAYMENT_COMPLETED:
        case NotificationType.PAYMENT_FAILED:
        case NotificationType.REFUND_PROCESSED:
        case NotificationType.PARTICIPANT_APPROVED:
        case NotificationType.PARTICIPANT_REJECTED:
          if (notification.bookingId) {
            const bookingEvent = createBookingEvent(
              notification.type as any,
              notification.bookingId,
              notification.userId,
              notification.data || {},
              {
                tripId: notification.tripId,
                priority: notification.priority as any
              }
            );
            sentCount = await broadcastBookingEvent(bookingEvent);
          }
          break;

        case NotificationType.TRIP_STATUS_CHANGED:
        case NotificationType.PARTICIPANT_JOINED:
        case NotificationType.PARTICIPANT_LEFT:
        case NotificationType.WEATHER_ALERT:
          if (notification.tripId) {
            sentCount = await broadcastGroupTripUpdateSSE({
              tripId: notification.tripId,
              type: notification.type,
              timestamp: notification.createdAt,
              // Add other required fields based on GroupTripUpdate interface
              currentParticipants: notification.data?.currentParticipants || 0,
              maxParticipants: notification.data?.maxParticipants || 0,
              spotsRemaining: notification.data?.spotsRemaining || 0,
              status: notification.data?.status || 'active'
            });
          }
          break;

        case NotificationType.MESSAGE_RECEIVED:
        case NotificationType.MENTION_RECEIVED:
          if (notification.chatChannelId) {
            sentCount = await broadcastChatEvent({
              id: notification.id,
              type: notification.type === NotificationType.MESSAGE_RECEIVED ? 'message' : 'mention',
              channelId: notification.chatChannelId,
              userId: notification.userId,
              data: notification.data || {},
              timestamp: notification.createdAt.toISOString()
            });
          }
          break;

        default:
          // For other notification types, we could create a generic SSE broadcast
          console.log(`📨 No specific SSE handler for notification type: ${notification.type}`);
          break;
      }

      return { success: sentCount > 0 };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'SSE sending failed' 
      };
    }
  }

  /**
   * Send in-app notification (store for UI notification center)
   */
  private async sendInAppNotification(notification: NotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // This would typically update a notifications table that the UI polls or subscribes to
      await prisma.userNotification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data ? JSON.stringify(notification.data) : null,
          priority: notification.priority,
          bookingId: notification.bookingId,
          tripId: notification.tripId,
          isRead: false,
          createdAt: notification.createdAt
        }
      });

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'In-app notification failed' 
      };
    }
  }

  /**
   * Send push notification (placeholder for future implementation)
   */
  private async sendPushNotification(notification: NotificationData): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement push notifications (e.g., using Firebase FCM, Apple Push Notifications)
    console.log(`📨 Push notification not yet implemented for: ${notification.type}`);
    return { success: false, error: 'Push notifications not implemented' };
  }

  /**
   * Store notification in database for persistence and audit trail
   */
  private async storeNotification(notification: NotificationData): Promise<void> {
    try {
      await prisma.notificationLog.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data ? JSON.stringify(notification.data) : null,
          channels: JSON.stringify(notification.channels),
          priority: notification.priority,
          bookingId: notification.bookingId,
          tripId: notification.tripId,
          chatChannelId: notification.chatChannelId,
          source: notification.source,
          templateId: notification.templateId,
          locale: notification.locale || 'en',
          scheduledFor: notification.scheduledFor,
          expiresAt: notification.expiresAt,
          maxRetries: notification.maxRetries || 3,
          retryCount: notification.retryCount || 0,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      console.error('📨 Error storing notification:', error);
      // Don't throw - notification should still be sent even if storage fails
    }
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    notificationId: string, 
    updates: { deliveredAt?: Date; readAt?: Date; retryCount?: number }
  ): Promise<void> {
    try {
      await prisma.notificationLog.update({
        where: { id: notificationId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('📨 Error updating notification status:', error);
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await prisma.userNotificationPreferences.findUnique({
        where: { userId }
      });

      if (!preferences) {
        // Return default preferences
        return {
          userId,
          emailEnabled: true,
          sseEnabled: true,
          pushEnabled: true,
          bookingNotifications: true,
          tripNotifications: true,
          achievementNotifications: true,
          chatNotifications: true,
          marketingNotifications: false,
          quietHoursEnabled: false,
          timezone: 'UTC',
          digestEnabled: false,
          digestFrequency: 'never',
          immediateForUrgent: true,
          updatedAt: new Date()
        };
      }

      return {
        userId: preferences.userId,
        emailEnabled: preferences.emailEnabled,
        sseEnabled: preferences.sseEnabled,
        pushEnabled: preferences.pushEnabled,
        bookingNotifications: preferences.bookingNotifications,
        tripNotifications: preferences.tripNotifications,
        achievementNotifications: preferences.achievementNotifications,
        chatNotifications: preferences.chatNotifications,
        marketingNotifications: preferences.marketingNotifications,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        digestEnabled: preferences.digestEnabled,
        digestFrequency: preferences.digestFrequency as any,
        immediateForUrgent: preferences.immediateForUrgent,
        updatedAt: preferences.updatedAt
      };
    } catch (error) {
      console.error('📨 Error getting user preferences:', error);
      // Return default preferences on error
      return {
        userId,
        emailEnabled: true,
        sseEnabled: true,
        pushEnabled: false,
        bookingNotifications: true,
        tripNotifications: true,
        achievementNotifications: true,
        chatNotifications: true,
        marketingNotifications: false,
        quietHoursEnabled: false,
        timezone: 'UTC',
        digestEnabled: false,
        digestFrequency: 'never',
        immediateForUrgent: true,
        updatedAt: new Date()
      };
    }
  }

  /**
   * Filter channels based on user preferences and quiet hours
   */
  private filterChannelsByPreferences(
    channels: NotificationChannel[], 
    type: NotificationType, 
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const filtered: NotificationChannel[] = [];

    for (const channel of channels) {
      // Check channel-specific preferences
      if (channel === NotificationChannel.EMAIL && !preferences.emailEnabled) continue;
      if (channel === NotificationChannel.SSE && !preferences.sseEnabled) continue;
      if (channel === NotificationChannel.PUSH && !preferences.pushEnabled) continue;

      // Check type-specific preferences
      if (this.isBookingRelated(type) && !preferences.bookingNotifications) continue;
      if (this.isTripRelated(type) && !preferences.tripNotifications) continue;
      if (this.isAchievementRelated(type) && !preferences.achievementNotifications) continue;
      if (this.isChatRelated(type) && !preferences.chatNotifications) continue;

      // Check quiet hours (except for urgent notifications if user allows)
      if (this.isInQuietHours(preferences) && 
          !(preferences.immediateForUrgent && this.isUrgentType(type))) {
        // During quiet hours, only allow DATABASE and IN_APP channels
        if (channel === NotificationChannel.EMAIL || 
            channel === NotificationChannel.PUSH || 
            channel === NotificationChannel.SSE) {
          continue;
        }
      }

      filtered.push(channel);
    }

    return filtered;
  }

  // Helper methods for categorizing notifications
  private isBookingRelated(type: NotificationType): boolean {
    return [
      NotificationType.BOOKING_CONFIRMED,
      NotificationType.BOOKING_CANCELLED,
      NotificationType.PAYMENT_COMPLETED,
      NotificationType.PAYMENT_FAILED,
      NotificationType.REFUND_PROCESSED
    ].includes(type);
  }

  private isTripRelated(type: NotificationType): boolean {
    return [
      NotificationType.TRIP_STATUS_CHANGED,
      NotificationType.TRIP_REMINDER,
      NotificationType.WEATHER_ALERT,
      NotificationType.PARTICIPANT_APPROVED,
      NotificationType.PARTICIPANT_REJECTED,
      NotificationType.PARTICIPANT_JOINED,
      NotificationType.PARTICIPANT_LEFT
    ].includes(type);
  }

  private isAchievementRelated(type: NotificationType): boolean {
    return [
      NotificationType.BADGE_AWARDED,
      NotificationType.ACHIEVEMENT_UNLOCKED,
      NotificationType.COMPETITION_COMPLETED
    ].includes(type);
  }

  private isChatRelated(type: NotificationType): boolean {
    return [
      NotificationType.MESSAGE_RECEIVED,
      NotificationType.MENTION_RECEIVED
    ].includes(type);
  }

  private isUrgentType(type: NotificationType): boolean {
    return [
      NotificationType.WEATHER_ALERT,
      NotificationType.PAYMENT_FAILED,
      NotificationType.MODERATION_ALERT,
      NotificationType.SYSTEM_MAINTENANCE
    ].includes(type);
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    // This is a simplified implementation - in production you'd want proper timezone handling
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return currentTime >= preferences.quietHoursStart && currentTime <= preferences.quietHoursEnd;
  }

  /**
   * Get email template mapping for notification types
   */
  private getEmailTemplateForNotificationType(type: NotificationType): { template: string } | null {
    const mapping: Record<NotificationType, { template: string }> = {
      [NotificationType.BOOKING_CONFIRMED]: { template: 'group-booking-confirmation' },
      [NotificationType.PAYMENT_COMPLETED]: { template: 'private-booking-confirmation' },
      [NotificationType.TRIP_STATUS_CHANGED]: { template: 'group-trip-confirmed' },
      [NotificationType.PARTICIPANT_APPROVED]: { template: 'participant-approval' },
      [NotificationType.BADGE_AWARDED]: { template: 'badge-awarded' },
      
      // Add more mappings as needed
      [NotificationType.BOOKING_CANCELLED]: { template: 'booking-cancelled' },
      [NotificationType.PAYMENT_FAILED]: { template: 'payment-failed' },
      [NotificationType.REFUND_PROCESSED]: { template: 'refund-processed' },
      [NotificationType.PARTICIPANT_REJECTED]: { template: 'participant-rejection' },
      [NotificationType.TRIP_REMINDER]: { template: 'trip-reminder' },
      [NotificationType.WEATHER_ALERT]: { template: 'weather-alert' },
      [NotificationType.ACHIEVEMENT_UNLOCKED]: { template: 'achievement-unlocked' },
      [NotificationType.COMPETITION_COMPLETED]: { template: 'competition-completed' },
      [NotificationType.MESSAGE_RECEIVED]: { template: 'message-received' },
      [NotificationType.MENTION_RECEIVED]: { template: 'mention-received' },
      [NotificationType.MODERATION_ALERT]: { template: 'moderation-alert' },
      [NotificationType.ABUSE_REPORT]: { template: 'abuse-report' },
      [NotificationType.SYSTEM_MAINTENANCE]: { template: 'system-maintenance' },
      [NotificationType.FEATURE_ANNOUNCEMENT]: { template: 'feature-announcement' },
      [NotificationType.PARTICIPANT_JOINED]: { template: 'participant-joined' },
      [NotificationType.PARTICIPANT_LEFT]: { template: 'participant-left' }
    };

    return mapping[type] || null;
  }

  /**
   * Batch send notifications
   */
  async sendBatchNotifications(notifications: Omit<NotificationData, 'id' | 'createdAt' | 'retryCount'>[]): Promise<{
    success: boolean;
    results: Array<{ notificationId: string; success: boolean; error?: string }>;
  }> {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendNotification(notification);
        results.push({
          notificationId: result.notificationId,
          success: result.success,
          error: result.success ? undefined : 'Failed to deliver to any channel'
        });
      } catch (error) {
        results.push({
          notificationId: 'unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const overallSuccess = results.some(r => r.success);
    
    return {
      success: overallSuccess,
      results
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await this.updateNotificationStatus(notificationId, { readAt: new Date() });
      
      // Also update in-app notification
      await prisma.userNotification.updateMany({
        where: { 
          id: notificationId, 
          userId 
        },
        data: { 
          isRead: true,
          readAt: new Date()
        }
      });

      return true;
    } catch (error) {
      console.error('📨 Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Get user notifications for in-app display
   */
  async getUserNotifications(
    userId: string, 
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    } = {}
  ): Promise<{
    notifications: any[];
    totalCount: number;
    unreadCount: number;
  }> {
    try {
      const { limit = 50, offset = 0, unreadOnly = false, types } = options;

      const where: any = { userId };
      if (unreadOnly) where.isRead = false;
      if (types && types.length > 0) where.type = { in: types };

      const [notifications, totalCount, unreadCount] = await Promise.all([
        prisma.userNotification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        prisma.userNotification.count({ where }),
        prisma.userNotification.count({ where: { userId, isRead: false } })
      ]);

      return {
        notifications,
        totalCount,
        unreadCount
      };
    } catch (error) {
      console.error('📨 Error getting user notifications:', error);
      return {
        notifications: [],
        totalCount: 0,
        unreadCount: 0
      };
    }
  }
}

// Export singleton instance
export const notificationService = UnifiedNotificationService.getInstance();

// Export helper functions for easy usage
export async function sendNotification(notification: Omit<NotificationData, 'id' | 'createdAt' | 'retryCount'>) {
  return notificationService.sendNotification(notification);
}

export async function sendBatchNotifications(notifications: Omit<NotificationData, 'id' | 'createdAt' | 'retryCount'>[]) {
  return notificationService.sendBatchNotifications(notifications);
}

export async function markNotificationAsRead(notificationId: string, userId: string) {
  return notificationService.markAsRead(notificationId, userId);
}

export async function getUserNotifications(userId: string, options?: Parameters<typeof notificationService.getUserNotifications>[1]) {
  return notificationService.getUserNotifications(userId, options);
}
