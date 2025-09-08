import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendNotification, NotificationType, NotificationChannel, NotificationPriority } from '@/lib/services/unified-notification-service';
import { getUserNotifications, markNotificationAsRead } from '@/lib/services/unified-notification-service';

/**
 * In-App Notifications API
 * Task 13.3: Add notification preferences - User notifications management
 * 
 * Manages user notifications for the notification center UI
 */

// GET - Get user notifications for in-app display
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const types = searchParams.get('types')?.split(',').filter(Boolean) as NotificationType[] | undefined;

    console.log(`📋 Getting notifications for user: ${userId}`, {
      limit, offset, unreadOnly, types: types?.length || 'all'
    });

    const result = await getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      types
    });

    return NextResponse.json({
      success: true,
      notifications: result.notifications,
      pagination: {
        totalCount: result.totalCount,
        unreadCount: result.unreadCount,
        limit,
        offset,
        hasMore: result.totalCount > offset + limit
      }
    });

  } catch (error) {
    console.error('📋 Error getting notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get notifications',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Send a test notification or mark notifications as read
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, notificationId, ...notificationData } = body;

    // Handle different actions
    switch (action) {
      case 'mark_as_read':
        if (!notificationId) {
          return NextResponse.json(
            { success: false, error: 'notificationId is required for mark_as_read action' },
            { status: 400 }
          );
        }

        const success = await markNotificationAsRead(notificationId, userId);
        
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Failed to mark notification as read' },
            { status: 400 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Notification marked as read'
        });

      case 'send_test':
        // Only allow in development or for admin users
        if (process.env.NODE_ENV !== 'development' && session.user.role !== 'ADMIN') {
          return NextResponse.json(
            { success: false, error: 'Test notifications only allowed in development' },
            { status: 403 }
          );
        }

        // Send test notification
        const result = await sendNotification({
          userId,
          type: notificationData.type || NotificationType.FEATURE_ANNOUNCEMENT,
          title: notificationData.title || 'Test Notification',
          message: notificationData.message || 'This is a test notification from the unified notification service.',
          data: notificationData.data || { testData: true },
          channels: notificationData.channels || [NotificationChannel.SSE, NotificationChannel.IN_APP, NotificationChannel.DATABASE],
          priority: notificationData.priority || NotificationPriority.MEDIUM,
          source: 'test-api'
        });

        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Test notification sent successfully' : 'Failed to send test notification',
          notificationId: result.notificationId,
          results: result.results
        });

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: mark_as_read, send_test' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('📋 Error handling notification action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Bulk operations on notifications
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, notificationIds } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'mark_all_as_read':
        // Mark all user notifications as read
        try {
          const { prisma } = await import('@/lib/prisma');
          
          const updateResult = await prisma.userNotification.updateMany({
            where: { 
              userId,
              isRead: false
            },
            data: { 
              isRead: true,
              readAt: new Date()
            }
          });

          console.log(`✅ Marked ${updateResult.count} notifications as read for user: ${userId}`);

          return NextResponse.json({
            success: true,
            message: `Marked ${updateResult.count} notifications as read`,
            updatedCount: updateResult.count
          });

        } catch (error) {
          console.error('📋 Error marking all notifications as read:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to mark notifications as read' },
            { status: 500 }
          );
        }

      case 'mark_multiple_as_read':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { success: false, error: 'notificationIds array is required for mark_multiple_as_read action' },
            { status: 400 }
          );
        }

        let successCount = 0;
        for (const notificationId of notificationIds) {
          const success = await markNotificationAsRead(notificationId, userId);
          if (success) successCount++;
        }

        return NextResponse.json({
          success: successCount > 0,
          message: `Marked ${successCount}/${notificationIds.length} notifications as read`,
          successCount,
          totalCount: notificationIds.length
        });

      case 'delete_old':
        // Delete notifications older than specified days (default 30)
        const daysOld = parseInt(body.daysOld || '30');
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        try {
          const { prisma } = await import('@/lib/prisma');
          
          const deleteResult = await prisma.userNotification.deleteMany({
            where: { 
              userId,
              createdAt: {
                lt: cutoffDate
              }
            }
          });

          console.log(`🗑️ Deleted ${deleteResult.count} old notifications for user: ${userId}`);

          return NextResponse.json({
            success: true,
            message: `Deleted ${deleteResult.count} notifications older than ${daysOld} days`,
            deletedCount: deleteResult.count
          });

        } catch (error) {
          console.error('📋 Error deleting old notifications:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to delete old notifications' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action. Supported actions: mark_all_as_read, mark_multiple_as_read, delete_old' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('📋 Error handling bulk notification action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process bulk request',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}
