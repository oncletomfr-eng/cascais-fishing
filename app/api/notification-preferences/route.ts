import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Notification Preferences API
 * Task 13.3: Add notification preferences
 * 
 * Manages user notification preferences for the unified notification system
 */

interface NotificationPreferencesRequest {
  emailEnabled?: boolean;
  sseEnabled?: boolean;
  pushEnabled?: boolean;
  bookingNotifications?: boolean;
  tripNotifications?: boolean;
  achievementNotifications?: boolean;
  chatNotifications?: boolean;
  marketingNotifications?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  digestEnabled?: boolean;
  digestFrequency?: 'daily' | 'weekly' | 'never';
  immediateForUrgent?: boolean;
}

// GET - Get user notification preferences
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
    console.log(`📋 Getting notification preferences for user: ${userId}`);

    // Get user preferences from database
    let preferences = await prisma.userNotificationPreferences.findUnique({
      where: { userId }
    });

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = await prisma.userNotificationPreferences.create({
        data: {
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
          immediateForUrgent: true
        }
      });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        // Channel preferences
        emailEnabled: preferences.emailEnabled,
        sseEnabled: preferences.sseEnabled,
        pushEnabled: preferences.pushEnabled,
        
        // Type preferences
        bookingNotifications: preferences.bookingNotifications,
        tripNotifications: preferences.tripNotifications,
        achievementNotifications: preferences.achievementNotifications,
        chatNotifications: preferences.chatNotifications,
        marketingNotifications: preferences.marketingNotifications,
        
        // Timing preferences
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        
        // Frequency preferences
        digestEnabled: preferences.digestEnabled,
        digestFrequency: preferences.digestFrequency,
        immediateForUrgent: preferences.immediateForUrgent,
        
        // Metadata
        updatedAt: preferences.updatedAt
      }
    });

  } catch (error) {
    console.error('📋 Error getting notification preferences:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get preferences',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// PUT - Update user notification preferences
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
    const body: NotificationPreferencesRequest = await request.json();

    console.log(`📋 Updating notification preferences for user: ${userId}`, body);

    // Validate quiet hours format if provided
    if (body.quietHoursStart && !isValidTimeFormat(body.quietHoursStart)) {
      return NextResponse.json(
        { success: false, error: 'Invalid quietHoursStart format. Use HH:MM format' },
        { status: 400 }
      );
    }

    if (body.quietHoursEnd && !isValidTimeFormat(body.quietHoursEnd)) {
      return NextResponse.json(
        { success: false, error: 'Invalid quietHoursEnd format. Use HH:MM format' },
        { status: 400 }
      );
    }

    // Validate digest frequency
    if (body.digestFrequency && !['daily', 'weekly', 'never'].includes(body.digestFrequency)) {
      return NextResponse.json(
        { success: false, error: 'Invalid digestFrequency. Must be daily, weekly, or never' },
        { status: 400 }
      );
    }

    // Update or create preferences
    const preferences = await prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: {
        ...body,
        updatedAt: new Date()
      },
      create: {
        userId,
        emailEnabled: body.emailEnabled ?? true,
        sseEnabled: body.sseEnabled ?? true,
        pushEnabled: body.pushEnabled ?? true,
        bookingNotifications: body.bookingNotifications ?? true,
        tripNotifications: body.tripNotifications ?? true,
        achievementNotifications: body.achievementNotifications ?? true,
        chatNotifications: body.chatNotifications ?? true,
        marketingNotifications: body.marketingNotifications ?? false,
        quietHoursEnabled: body.quietHoursEnabled ?? false,
        quietHoursStart: body.quietHoursStart,
        quietHoursEnd: body.quietHoursEnd,
        timezone: body.timezone ?? 'UTC',
        digestEnabled: body.digestEnabled ?? false,
        digestFrequency: body.digestFrequency ?? 'never',
        immediateForUrgent: body.immediateForUrgent ?? true
      }
    });

    console.log(`✅ Updated notification preferences for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: {
        // Channel preferences
        emailEnabled: preferences.emailEnabled,
        sseEnabled: preferences.sseEnabled,
        pushEnabled: preferences.pushEnabled,
        
        // Type preferences
        bookingNotifications: preferences.bookingNotifications,
        tripNotifications: preferences.tripNotifications,
        achievementNotifications: preferences.achievementNotifications,
        chatNotifications: preferences.chatNotifications,
        marketingNotifications: preferences.marketingNotifications,
        
        // Timing preferences
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        
        // Frequency preferences
        digestEnabled: preferences.digestEnabled,
        digestFrequency: preferences.digestFrequency,
        immediateForUrgent: preferences.immediateForUrgent,
        
        // Metadata
        updatedAt: preferences.updatedAt
      }
    });

  } catch (error) {
    console.error('📋 Error updating notification preferences:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update preferences',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Reset notification preferences to defaults
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log(`📋 Resetting notification preferences to defaults for user: ${userId}`);

    // Reset to default preferences
    const preferences = await prisma.userNotificationPreferences.upsert({
      where: { userId },
      update: {
        emailEnabled: true,
        sseEnabled: true,
        pushEnabled: true,
        bookingNotifications: true,
        tripNotifications: true,
        achievementNotifications: true,
        chatNotifications: true,
        marketingNotifications: false,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'UTC',
        digestEnabled: false,
        digestFrequency: 'never',
        immediateForUrgent: true,
        updatedAt: new Date()
      },
      create: {
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
        immediateForUrgent: true
      }
    });

    console.log(`✅ Reset notification preferences for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Notification preferences reset to defaults',
      preferences: {
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
        digestFrequency: preferences.digestFrequency,
        immediateForUrgent: preferences.immediateForUrgent,
        updatedAt: preferences.updatedAt
      }
    });

  } catch (error) {
    console.error('📋 Error resetting notification preferences:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset preferences',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to validate time format (HH:MM)
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}
