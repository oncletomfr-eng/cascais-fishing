import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { sendBadgeAwardedNotification } from '@/lib/services/email-service';

// Simplified achievement definitions for better performance
const ACHIEVEMENT_DEFINITIONS = [
  {
    id: 'FIRST_CATCH',
    name: 'First Catch',
    description: 'Caught your first fish!',
    icon: '🎣',
    category: 'MILESTONE',
    check: (stats: any) => stats.totalCatch >= 1
  },
  {
    id: 'FISH_MASTER',
    name: 'Fish Master',
    description: 'Caught 10 different fish species',
    icon: '🐟',
    category: 'SPECIES',
    check: (stats: any) => stats.uniqueSpecies >= 10
  },
  {
    id: 'TRIP_VETERAN',
    name: 'Trip Veteran',
    description: 'Completed 20 fishing trips',
    icon: '⚓',
    category: 'MILESTONE',
    check: (stats: any) => stats.completedTrips >= 20
  },
  {
    id: 'SOCIAL_FISHER',
    name: 'Social Fisher',
    description: 'Left 5 helpful reviews',
    icon: '👥',
    category: 'SOCIAL',
    check: (stats: any) => stats.reviewsGiven >= 5
  },
  {
    id: 'BIG_CATCH',
    name: 'Big Catch Champion',
    description: 'Caught a fish over 5kg',
    icon: '🐋',
    category: 'ACHIEVEMENT',
    check: (stats: any) => stats.biggestCatch >= 5000 // in grams
  },
  {
    id: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Completed 5 morning trips (before 8am)',
    icon: '🌅',
    category: 'SPECIAL',
    check: (stats: any) => stats.morningTrips >= 5
  }
];

/**
 * GET /api/achievements - получение достижений пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;
    const category = searchParams.get('category');
    const unlockedOnly = searchParams.get('unlockedOnly') === 'true';

    // Get user achievements
    const userAchievements = await prisma.achievement.findMany({
            where: {
        userId,
        ...(category && { category })
      }
    });

    // Get user stats for progress calculation
    const userStats = await getUserAchievementStats(userId);
    
    // Process achievements with progress
    let achievements = ACHIEVEMENT_DEFINITIONS.map(def => {
      const userAchievement = userAchievements.find(a => a.type === def.id);
      const unlocked = def.check(userStats);
      
      return {
        id: def.id,
        name: def.name,
        description: def.description,
        icon: def.icon,
        category: def.category,
        unlocked: !!userAchievement || unlocked,
        progress: unlocked ? 100 : calculateProgress(def.id, userStats),
        unlockedAt: userAchievement?.unlockedAt || null
      };
    });

    // Filter if only unlocked requested
    if (unlockedOnly) {
      achievements = achievements.filter(a => a.unlocked);
    }

    const stats = {
      total: achievements.length,
      unlocked: achievements.filter(a => a.unlocked).length,
      progress: Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100)
    };

    return NextResponse.json({
      success: true,
      achievements,
      stats
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch achievements' }, { status: 500 });
  }
}

/**
 * POST /api/achievements - track achievement progress
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, event, data } = await request.json();
    const targetUserId = userId || session.user.id;

    const newAchievements = await checkAndUnlockAchievements(targetUserId, event, data);

    return NextResponse.json({
      success: true,
      newAchievements,
      count: newAchievements.length
    });

  } catch (error) {
    console.error('Error tracking achievements:', error);
    return NextResponse.json({ success: false, error: 'Failed to track achievements' }, { status: 500 });
  }
}

/**
 * PUT /api/achievements - manually unlock achievement (admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { userId, achievementId, reason } = await request.json();

    const achievement = await prisma.achievement.create({
      data: {
        userId,
        type: achievementId,
        category: 'SPECIAL',
        unlockedAt: new Date(),
        metadata: { reason: reason || 'Admin unlock' }
      }
    });

    // Send notification
    const achievementDef = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achievementId);
    if (achievementDef) {
      sendBadgeAwardedNotification(userId, {
        customerName: 'Fisher',
        badgeName: achievementDef.name,
        badgeDescription: achievementDef.description,
        badgeIcon: achievementDef.icon,
        profileUrl: `${process.env.NEXTAUTH_URL}/profile/${userId}`
      }).catch(console.error);
    }

    return NextResponse.json({ success: true, achievement });

  } catch (error) {
    console.error('Error unlocking achievement:', error);
    return NextResponse.json({ success: false, error: 'Failed to unlock achievement' }, { status: 500 });
  }
}

/**
 * Get user statistics for achievement calculation
 */
async function getUserAchievementStats(userId: string) {
  const profile = await prisma.fisherProfile.findUnique({
    where: { userId },
    select: {
      totalCatch: true,
      completedTrips: true,
      biggestCatch: true,
      uniqueSpecies: true,
      user: {
        select: {
          reviewsGiven: {
            select: { id: true }
          },
          groupBookings: {
            where: { status: 'CONFIRMED' },
            include: {
              trip: {
                select: { 
                  timeSlot: true,
                  date: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!profile) {
    return {
      totalCatch: 0,
      uniqueSpecies: 0,
      completedTrips: 0,
      biggestCatch: 0,
      reviewsGiven: 0,
      morningTrips: 0
    };
  }

  // Calculate morning trips (before 8am)
  const morningTrips = profile.user.groupBookings.filter(booking => {
    const timeSlot = booking.trip.timeSlot;
    if (!timeSlot) return false;
    const hour = parseInt(timeSlot.split(':')[0]);
    return hour < 8;
  }).length;

  return {
    totalCatch: Number(profile.totalCatch) || 0,
    uniqueSpecies: Number(profile.uniqueSpecies) || 0,
    completedTrips: profile.completedTrips || 0,
    biggestCatch: Number(profile.biggestCatch) || 0,
    reviewsGiven: profile.user.reviewsGiven.length || 0,
    morningTrips
  };
}

/**
 * Calculate progress percentage for achievement
 */
function calculateProgress(achievementId: string, stats: any): number {
  switch (achievementId) {
    case 'FIRST_CATCH':
      return Math.min(100, (stats.totalCatch / 1) * 100);
    case 'FISH_MASTER':
      return Math.min(100, (stats.uniqueSpecies / 10) * 100);
    case 'TRIP_VETERAN':
      return Math.min(100, (stats.completedTrips / 20) * 100);
    case 'SOCIAL_FISHER':
      return Math.min(100, (stats.reviewsGiven / 5) * 100);
    case 'BIG_CATCH':
      return Math.min(100, (stats.biggestCatch / 5000) * 100);
    case 'EARLY_BIRD':
      return Math.min(100, (stats.morningTrips / 5) * 100);
    default:
      return 0;
  }
}

/**
 * Check and unlock achievements for user
 */
async function checkAndUnlockAchievements(userId: string, event?: string, data?: any) {
  try {
    const stats = await getUserAchievementStats(userId);
    const existingAchievements = await prisma.achievement.findMany({
      where: { userId },
      select: { type: true }
    });

    const existingTypes = new Set(existingAchievements.map(a => a.type));
    const newAchievements = [];

    for (const achievementDef of ACHIEVEMENT_DEFINITIONS) {
      if (!existingTypes.has(achievementDef.id) && achievementDef.check(stats)) {
        const achievement = await prisma.achievement.create({
          data: {
            userId,
            type: achievementDef.id,
            category: achievementDef.category,
            unlockedAt: new Date(),
            metadata: { event, data }
          }
        });

        newAchievements.push({
          ...achievement,
          name: achievementDef.name,
          description: achievementDef.description,
          icon: achievementDef.icon
        });

        // Send notification asynchronously
        sendBadgeAwardedNotification(userId, {
          customerName: 'Fisher',
          badgeName: achievementDef.name,
          badgeDescription: achievementDef.description,
          badgeIcon: achievementDef.icon,
          profileUrl: `${process.env.NEXTAUTH_URL}/profile/${userId}`
        }).catch(console.error);
      }
    }

    return newAchievements;

  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
}