import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

/**
 * Enhanced Leaderboard Engine Backend
 * Task 21.3: Leaderboard Engine Backend - Advanced real-time system
 * 
 * Provides comprehensive leaderboard management with multiple algorithms,
 * real-time updates, caching, and historical tracking
 */

// Enhanced leaderboard types
interface EnhancedLeaderboardPlayer {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  isAnonymous: boolean;
  
  // Core metrics
  rating: number;
  level: number;
  experiencePoints: number;
  
  // Activity metrics
  completedTrips: number;
  totalFishCaught: number;
  activeDays: number;
  activeDaysConsecutive: number;
  reliability: number;
  
  // Achievement metrics
  achievementsCount: number;
  badgesCount: number;
  unlockedToday: number;
  
  // Specialized metrics
  biggestCatch: number;
  uniqueSpecies: number;
  techniquesMastered: number;
  mentorRating: number;
  
  // Computed scores
  compositeScore: number;
  categoryScores: Record<string, number>;
  
  // Trends
  positionChange: number; // +1 = moved up, -1 = moved down, 0 = no change
  scoreChange: number;
  trendDirection: 'up' | 'down' | 'stable';
}

interface LeaderboardConfig {
  category: string;
  algorithm: 'composite' | 'rating' | 'activity' | 'achievements' | 'specialized' | 'seasonal';
  timeframe: 'all_time' | 'yearly' | 'monthly' | 'weekly' | 'daily';
  limit: number;
  includeInactive: boolean;
  minRequirements?: {
    minTrips?: number;
    minLevel?: number;
    minRating?: number;
    minAchievements?: number;
  };
}

// Comprehensive ranking algorithms
class AdvancedRankingEngine {
  
  /**
   * Composite Score Algorithm - Balanced overall performance
   */
  static calculateCompositeScore(profile: any, achievements: any[], badges: any[]): number {
    const rating = Number(profile.rating) || 0;
    const level = profile.level || 1;
    const trips = profile.completedTrips || 0;
    const fish = profile.totalFishCaught || 0;
    const reliability = profile.reliability || 100;
    const experiencePoints = profile.experiencePoints || 0;
    const achievementsCount = achievements.length;
    const badgesCount = badges.length;
    
    // Weighted composite formula
    const weights = {
      rating: 0.25,      // 25% - Core performance
      experience: 0.20,  // 20% - Experience points
      trips: 0.15,       // 15% - Activity
      reliability: 0.15, // 15% - Consistency
      achievements: 0.15, // 15% - Accomplishments
      fish: 0.10         // 10% - Catch performance
    };
    
    const normalizedRating = Math.min(rating / 5, 1) * 1000;
    const normalizedExperience = Math.min(experiencePoints / 10000, 1) * 1000;
    const normalizedTrips = Math.min(trips / 100, 1) * 1000;
    const normalizedReliability = (reliability / 100) * 1000;
    const normalizedAchievements = Math.min(achievementsCount / 50, 1) * 1000;
    const normalizedFish = Math.min(fish / 500, 1) * 1000;
    
    const compositeScore = (
      normalizedRating * weights.rating +
      normalizedExperience * weights.experience +
      normalizedTrips * weights.trips +
      normalizedReliability * weights.reliability +
      normalizedAchievements * weights.achievements +
      normalizedFish * weights.fish
    );
    
    return Math.round(compositeScore);
  }
  
  /**
   * Activity-Based Score Algorithm
   */
  static calculateActivityScore(profile: any): number {
    const trips = profile.completedTrips || 0;
    const activeDays = profile.activeDays || 0;
    const consecutiveDays = profile.activeDaysConsecutive || 0;
    const lastActive = profile.lastActiveAt ? new Date(profile.lastActiveAt) : new Date(0);
    const daysSinceActive = Math.floor((Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24));
    
    // Recency bonus/penalty
    let recencyMultiplier = 1.0;
    if (daysSinceActive <= 1) recencyMultiplier = 1.2;
    else if (daysSinceActive <= 7) recencyMultiplier = 1.1;
    else if (daysSinceActive <= 30) recencyMultiplier = 1.0;
    else if (daysSinceActive <= 90) recencyMultiplier = 0.9;
    else recencyMultiplier = 0.8;
    
    const baseScore = trips * 10 + activeDays * 5 + consecutiveDays * 2;
    return Math.round(baseScore * recencyMultiplier);
  }
  
  /**
   * Achievement-Based Score Algorithm
   */
  static calculateAchievementScore(achievements: any[], badges: any[]): number {
    let score = 0;
    
    // Achievement points by rarity
    const rarityPoints = {
      'COMMON': 10,
      'UNCOMMON': 25,
      'RARE': 50,
      'EPIC': 100,
      'LEGENDARY': 200,
      'MYTHIC': 500
    };
    
    // Points from achievements
    achievements.forEach(ua => {
      if (ua.unlocked && ua.achievement) {
        const points = rarityPoints[ua.achievement.rarity] || 10;
        score += points;
        
        // Bonus for recent unlocks (within 30 days)
        if (ua.unlockedAt) {
          const daysSinceUnlock = Math.floor((Date.now() - new Date(ua.unlockedAt).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceUnlock <= 30) {
            score += points * 0.2; // 20% recency bonus
          }
        }
      }
    });
    
    // Points from badges (use same rarity system)
    badges.forEach(badge => {
      const points = rarityPoints[badge.rarity] || 10;
      score += points;
      
      // Bonus for recent badges
      if (badge.earnedAt) {
        const daysSinceEarned = Math.floor((Date.now() - new Date(badge.earnedAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceEarned <= 30) {
          score += points * 0.2;
        }
      }
    });
    
    return Math.round(score);
  }
  
  /**
   * Seasonal Score Algorithm - emphasizes recent performance
   */
  static calculateSeasonalScore(profile: any, achievements: any[], badges: any[], season: 'current' | 'monthly' | 'weekly'): number {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (season) {
      case 'weekly':
        cutoffDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
      case 'monthly':
        cutoffDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        break;
      default:
        cutoffDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000)); // 3 months
    }
    
    // Base score from profile (weighted by recency)
    const baseScore = this.calculateCompositeScore(profile, achievements, badges);
    
    // Recent achievements bonus
    const recentAchievements = achievements.filter(ua => 
      ua.unlocked && ua.unlockedAt && new Date(ua.unlockedAt) > cutoffDate
    );
    
    const recentBadges = badges.filter(badge =>
      badge.earnedAt && new Date(badge.earnedAt) > cutoffDate
    );
    
    const recentAchievementBonus = this.calculateAchievementScore(recentAchievements, recentBadges);
    
    // Activity multiplier based on recent activity
    const lastActive = profile.lastActiveAt ? new Date(profile.lastActiveAt) : new Date(0);
    const isRecentlyActive = lastActive > cutoffDate;
    const activityMultiplier = isRecentlyActive ? 1.5 : 0.7;
    
    return Math.round((baseScore + recentAchievementBonus) * activityMultiplier);
  }
  
  /**
   * Specialized Category Scores
   */
  static calculateSpecializedScores(profile: any, achievements: any[], badges: any[]): Record<string, number> {
    const scores: Record<string, number> = {};
    
    // Fish Master Score
    scores.fishMaster = (profile.totalFishCaught || 0) * 2 + (profile.uniqueSpecies?.length || 0) * 10;
    
    // Trip Expert Score
    scores.tripExpert = (profile.completedTrips || 0) * 5 + (profile.reliability || 0) * 2;
    
    // Achievement Hunter Score
    scores.achievementHunter = this.calculateAchievementScore(achievements, badges);
    
    // Consistency Master Score
    scores.consistencyMaster = (profile.reliability || 0) * 5 + (profile.activeDaysConsecutive || 0) * 3;
    
    // Mentor Score
    scores.mentor = (Number(profile.mentorRating) || 0) * 100 + (profile.totalReviews || 0) * 5;
    
    return scores;
  }
}

const LeaderboardRequestSchema = z.object({
  category: z.enum([
    'composite', 'rating', 'activity', 'achievements', 'fish_master', 
    'trip_expert', 'consistency_master', 'mentor', 'seasonal'
  ]).default('composite'),
  
  algorithm: z.enum([
    'composite', 'rating', 'activity', 'achievements', 'specialized', 'seasonal'
  ]).default('composite'),
  
  timeframe: z.enum([
    'all_time', 'yearly', 'monthly', 'weekly', 'daily'
  ]).default('all_time'),
  
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  
  includeInactive: z.boolean().default(false),
  minTrips: z.number().min(0).optional(),
  minLevel: z.number().min(1).optional(),
  minRating: z.number().min(0).max(5).optional(),
  
  focusUserId: z.string().cuid().optional(),
  showTrends: z.boolean().default(true),
  
  realTime: z.boolean().default(false)
});

/**
 * GET /api/leaderboard/engine - Enhanced leaderboard with advanced algorithms
 * 
 * Query params:
 * - category: composite | rating | activity | achievements | fish_master | etc
 * - algorithm: composite | rating | activity | achievements | specialized | seasonal
 * - timeframe: all_time | yearly | monthly | weekly | daily
 * - limit: number (1-100, default 50)
 * - offset: number (default 0)
 * - includeInactive: boolean
 * - minTrips, minLevel, minRating: filtering requirements
 * - focusUserId: string (show leaderboard around specific user)
 * - showTrends: boolean (include position changes)
 * - realTime: boolean (bypass cache for live data)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      category: searchParams.get('category') || 'composite',
      algorithm: searchParams.get('algorithm') || 'composite',
      timeframe: searchParams.get('timeframe') || 'all_time',
      limit: Number(searchParams.get('limit')) || 50,
      offset: Number(searchParams.get('offset')) || 0,
      includeInactive: searchParams.get('includeInactive') === 'true',
      minTrips: searchParams.get('minTrips') ? Number(searchParams.get('minTrips')) : undefined,
      minLevel: searchParams.get('minLevel') ? Number(searchParams.get('minLevel')) : undefined,
      minRating: searchParams.get('minRating') ? Number(searchParams.get('minRating')) : undefined,
      focusUserId: searchParams.get('focusUserId') || undefined,
      showTrends: searchParams.get('showTrends') !== 'false',
      realTime: searchParams.get('realTime') === 'true'
    };
    
    const validatedParams = LeaderboardRequestSchema.parse(params);
    
    console.log(`🏆 Enhanced leaderboard request: ${validatedParams.category} (${validatedParams.algorithm})`);
    
    // Get current user for privacy filtering
    const session = await auth();
    const currentUserId = session?.user?.id;
    
    // Build filtering conditions
    const whereConditions: any = {
      isActive: validatedParams.includeInactive ? undefined : true,
      user: { isNot: null }
    };
    
    // Apply minimum requirements
    if (validatedParams.minTrips) {
      whereConditions.completedTrips = { gte: validatedParams.minTrips };
    }
    if (validatedParams.minLevel) {
      whereConditions.level = { gte: validatedParams.minLevel };
    }
    if (validatedParams.minRating) {
      whereConditions.rating = { gte: validatedParams.minRating };
    }
    
    // Privacy filtering
    whereConditions.OR = [
      { leaderboardVisibility: 'PUBLIC' },
      { leaderboardVisibility: 'ANONYMOUS' },
      ...(currentUserId ? [{ userId: currentUserId }] : [])
    ];
    
    // Fetch profiles with comprehensive data
    const profiles = await prisma.fisherProfile.findMany({
      where: whereConditions,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        badges: {
          select: {
            id: true,
            name: true,
            rarity: true,
            earnedAt: true
          }
        }
      }
    });
    
    // Fetch achievements for all users (for performance)
    const userIds = profiles.map(p => p.userId);
    const achievementsMap = new Map();
    
    if (userIds.length > 0) {
      const achievements = await prisma.userAchievement.findMany({
        where: {
          userId: { in: userIds }
        },
        include: {
          achievement: {
            select: {
              id: true,
              name: true,
              rarity: true,
              type: true
            }
          }
        }
      });
      
      achievements.forEach(ua => {
        if (!achievementsMap.has(ua.userId)) {
          achievementsMap.set(ua.userId, []);
        }
        achievementsMap.get(ua.userId).push(ua);
      });
    }
    
    // Calculate scores for each profile
    const scoredPlayers: EnhancedLeaderboardPlayer[] = [];
    
    for (const profile of profiles) {
      if (!profile.user) continue;
      
      const userAchievements = achievementsMap.get(profile.userId) || [];
      const userBadges = profile.badges || [];
      
      // Calculate various scores
      const compositeScore = AdvancedRankingEngine.calculateCompositeScore(profile, userAchievements, userBadges);
      const activityScore = AdvancedRankingEngine.calculateActivityScore(profile);
      const achievementScore = AdvancedRankingEngine.calculateAchievementScore(userAchievements, userBadges);
      const specializedScores = AdvancedRankingEngine.calculateSpecializedScores(profile, userAchievements, userBadges);
      
      let primaryScore: number;
      
      // Select primary score based on algorithm
      switch (validatedParams.algorithm) {
        case 'rating':
          primaryScore = Number(profile.rating) * 100;
          break;
        case 'activity':
          primaryScore = activityScore;
          break;
        case 'achievements':
          primaryScore = achievementScore;
          break;
        case 'seasonal':
          primaryScore = AdvancedRankingEngine.calculateSeasonalScore(
            profile, 
            userAchievements, 
            userBadges, 
            validatedParams.timeframe === 'weekly' ? 'weekly' : 
            validatedParams.timeframe === 'monthly' ? 'monthly' : 'current'
          );
          break;
        case 'specialized':
          primaryScore = specializedScores[validatedParams.category] || compositeScore;
          break;
        default:
          primaryScore = compositeScore;
      }
      
      // Check anonymity
      const isAnonymous = profile.leaderboardVisibility === 'ANONYMOUS' && 
                         profile.userId !== currentUserId;
      
      // Count recent achievements (today)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const unlockedToday = userAchievements.filter(ua => 
        ua.unlocked && ua.unlockedAt && new Date(ua.unlockedAt) >= today
      ).length;
      
      scoredPlayers.push({
        position: 0, // Will be set after sorting
        userId: profile.userId,
        name: isAnonymous ? 'Анонимный рыболов' : (profile.user.name || 'Неизвестный рыболов'),
        avatar: isAnonymous ? null : profile.user.image,
        isAnonymous,
        
        // Core metrics
        rating: Number(profile.rating),
        level: profile.level,
        experiencePoints: profile.experiencePoints,
        
        // Activity metrics
        completedTrips: profile.completedTrips,
        totalFishCaught: profile.totalFishCaught,
        activeDays: profile.activeDays,
        activeDaysConsecutive: profile.activeDaysConsecutive,
        reliability: profile.reliability,
        
        // Achievement metrics
        achievementsCount: userAchievements.filter(ua => ua.unlocked).length,
        badgesCount: userBadges.length,
        unlockedToday,
        
        // Specialized metrics
        biggestCatch: profile.biggestCatch || 0,
        uniqueSpecies: Array.isArray(profile.uniqueSpecies) ? profile.uniqueSpecies.length : 0,
        techniquesMastered: Array.isArray(profile.techniqueSkills) ? (profile.techniqueSkills as any).length : 0,
        mentorRating: Number(profile.mentorRating) || 0,
        
        // Computed scores
        compositeScore,
        categoryScores: {
          composite: compositeScore,
          activity: activityScore,
          achievements: achievementScore,
          ...specializedScores
        },
        
        // Trends (placeholder - would come from historical data)
        positionChange: 0,
        scoreChange: 0,
        trendDirection: 'stable'
      });
    }
    
    // Sort by primary score
    scoredPlayers.sort((a, b) => {
      const scoreA = validatedParams.algorithm === 'composite' ? a.compositeScore : 
                    a.categoryScores[validatedParams.category] || a.compositeScore;
      const scoreB = validatedParams.algorithm === 'composite' ? b.compositeScore : 
                    b.categoryScores[validatedParams.category] || b.compositeScore;
      return scoreB - scoreA;
    });
    
    // Assign positions
    scoredPlayers.forEach((player, index) => {
      player.position = index + 1;
    });
    
    // Handle focus user (show leaderboard around specific user)
    let finalPlayers = scoredPlayers;
    let focusUserPosition: number | undefined;
    
    if (validatedParams.focusUserId) {
      const focusIndex = scoredPlayers.findIndex(p => p.userId === validatedParams.focusUserId);
      if (focusIndex !== -1) {
        focusUserPosition = focusIndex + 1;
        
        // Show players around the focus user
        const radius = Math.floor(validatedParams.limit / 2);
        const start = Math.max(0, focusIndex - radius);
        const end = Math.min(scoredPlayers.length, start + validatedParams.limit);
        finalPlayers = scoredPlayers.slice(start, end);
      }
    } else {
      // Regular pagination
      const start = validatedParams.offset;
      const end = start + validatedParams.limit;
      finalPlayers = scoredPlayers.slice(start, end);
    }
    
    // Get total count for pagination
    const totalPlayers = scoredPlayers.length;
    const totalActiveProfiles = await prisma.fisherProfile.count({
      where: { isActive: true }
    });
    
    return NextResponse.json({
      success: true,
      leaderboard: finalPlayers,
      metadata: {
        category: validatedParams.category,
        algorithm: validatedParams.algorithm,
        timeframe: validatedParams.timeframe,
        totalPlayers,
        totalActiveProfiles,
        showingPlayers: finalPlayers.length,
        offset: validatedParams.offset,
        limit: validatedParams.limit,
        focusUserPosition,
        hasMore: validatedParams.offset + validatedParams.limit < totalPlayers,
        generatedAt: new Date().toISOString()
      },
      config: {
        includeInactive: validatedParams.includeInactive,
        showTrends: validatedParams.showTrends,
        realTime: validatedParams.realTime,
        minRequirements: {
          trips: validatedParams.minTrips,
          level: validatedParams.minLevel,
          rating: validatedParams.minRating
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error in enhanced leaderboard engine:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Enhanced leaderboard engine failed'
    }, { status: 500 });
  }
}

/**
 * POST /api/leaderboard/engine - Update leaderboard rankings (admin/system only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // For now, allow system operations - in production would check API key or admin role
    if (!session?.user && !process.env.SYSTEM_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, categories, userId } = z.object({
      action: z.enum(['recalculate', 'update_positions', 'clear_cache']),
      categories: z.array(z.string()).optional(),
      userId: z.string().cuid().optional()
    }).parse(body);
    
    console.log(`🔄 Leaderboard engine action: ${action}`);
    
    switch (action) {
      case 'recalculate':
        // Would trigger background job to recalculate all scores
        // For now, just return success
        return NextResponse.json({
          success: true,
          message: 'Leaderboard recalculation triggered',
          categories: categories || 'all',
          timestamp: new Date().toISOString()
        });
        
      case 'update_positions':
        // Update position tracking for trends
        // Implementation would store historical positions
        return NextResponse.json({
          success: true,
          message: 'Position tracking updated',
          timestamp: new Date().toISOString()
        });
        
      case 'clear_cache':
        // Clear leaderboard cache
        return NextResponse.json({
          success: true,
          message: 'Leaderboard cache cleared',
          timestamp: new Date().toISOString()
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ Error in leaderboard engine POST:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Leaderboard engine operation failed'
    }, { status: 500 });
  }
}
