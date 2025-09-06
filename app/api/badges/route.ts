import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { BadgeCategory } from '@prisma/client'
import { sendBadgeAwardedNotification } from '@/lib/services/email-service'

// Simplified badge definitions for faster processing
const BADGE_DEFINITIONS = [
  { name: 'First Trip', description: 'Completed first fishing trip!', icon: '🎣', category: BadgeCategory.MILESTONE, check: (stats: any) => stats.confirmedBookings >= 1 },
  { name: 'Regular Fisher', description: 'Completed 5+ fishing trips', icon: '🐟', category: BadgeCategory.MILESTONE, check: (stats: any) => stats.completedTrips >= 5 },
  { name: 'Experienced Angler', description: 'Completed 10+ fishing trips', icon: '🎯', category: BadgeCategory.MILESTONE, check: (stats: any) => stats.completedTrips >= 10 },
  { name: 'Highly Rated', description: 'Maintained 4.5+ star rating', icon: '⭐', category: BadgeCategory.ACHIEVEMENT, check: (stats: any) => stats.rating >= 4.5 && stats.totalReviews >= 3 },
  { name: 'Big Catch Master', description: 'Caught 50+ fish', icon: '🐠', category: BadgeCategory.ACHIEVEMENT, check: (stats: any) => stats.totalCatch >= 50 }
];

/**
 * GET /api/badges - получение badges для пользователя
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || session.user.id

    const badges = await prisma.fisherBadge.findMany({
      where: {
        profile: { userId }
      },
      orderBy: { awardedAt: 'desc' }
    })

    return NextResponse.json({ success: true, badges })
  } catch (error) {
    console.error('Error fetching badges:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch badges' }, { status: 500 })
  }
}

/**
 * Optimized badge awarding system - lighter and faster
 */
export async function awardBadgesBasedOnActivity(userId: string) {
  try {
    // Single optimized query to get all needed data
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        completedTrips: true,
        totalCatch: true,
        rating: true,
        totalReviews: true,
        badges: { select: { name: true } },
        user: {
          select: {
            groupBookings: {
              where: { status: 'CONFIRMED' },
              select: { id: true }
            }
          }
        }
      }
    })

    if (!profile) return []

    const existingBadgeNames = new Set(profile.badges.map(b => b.name))
    const stats = {
      confirmedBookings: profile.user.groupBookings.length,
      completedTrips: profile.completedTrips,
      totalCatch: profile.totalCatch,
      rating: Number(profile.rating),
      totalReviews: profile.totalReviews
    }

    const newBadges = []
    
    // Process badges efficiently
    for (const badgeDef of BADGE_DEFINITIONS) {
      if (!existingBadgeNames.has(badgeDef.name) && badgeDef.check(stats)) {
        const badge = await prisma.fisherBadge.create({
          data: {
            profileId: profile.id,
            name: badgeDef.name,
            description: badgeDef.description,
            icon: badgeDef.icon,
            category: badgeDef.category,
            requiredValue: null
          }
        })
        
        newBadges.push(badge)
        
        // Send notification asynchronously to avoid blocking
        sendBadgeAwardedNotification(userId, {
          customerName: 'Fisher',
          badgeName: badge.name,
          badgeDescription: badge.description,
          badgeIcon: badge.icon,
          profileUrl: `${process.env.NEXTAUTH_URL}/profile/${userId}`
        }).catch(console.error)
      }
    }

    return newBadges
  } catch (error) {
    console.error('Error awarding badges:', error)
    return []
  }
}

/**
 * POST /api/badges - Manual badge awarding (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
    }

    const { userId, badgeName, description, icon } = await request.json()
    
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId }
    })

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 404 })
    }

    const badge = await prisma.fisherBadge.create({
      data: {
        profileId: profile.id,
        name: badgeName,
        description: description || `Manual badge: ${badgeName}`,
        icon: icon || '🏆',
        category: BadgeCategory.SPECIAL,
        requiredValue: null
      }
    })

    return NextResponse.json({ success: true, badge })
  } catch (error) {
    console.error('Error creating badge:', error)
    return NextResponse.json({ success: false, error: 'Failed to create badge' }, { status: 500 })
  }
}

/**
 * PUT /api/badges - Trigger badge check for user
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()
    const targetUserId = userId || session.user.id

    const newBadges = await awardBadgesBasedOnActivity(targetUserId)
    
    return NextResponse.json({ 
      success: true, 
      awardedbadges: newBadges.length,
      badges: newBadges 
    })
  } catch (error) {
    console.error('Error checking badges:', error)
    return NextResponse.json({ success: false, error: 'Failed to check badges' }, { status: 500 })
  }
}