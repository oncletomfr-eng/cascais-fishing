/**
 * Category-Based Leaderboard API Endpoint
 * Task 12.1: Category-Based Leaderboard System
 * 
 * Taking the role of Senior Backend Developer specializing in Gaming/Competition Systems
 * 
 * Handles category-based leaderboard management, scoring algorithms, and rankings
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Validation schemas
const categoryLeaderboardSchema = z.object({
  category: z.enum([
    'MONTHLY_CHAMPIONS',
    'BIGGEST_CATCH', 
    'MOST_ACTIVE',
    'BEST_MENTOR',
    'TECHNIQUE_MASTER',
    'SPECIES_SPECIALIST',
    'CONSISTENCY_KING',
    'ROOKIE_OF_MONTH',
    'VETERAN_ANGLER',
    'SOCIAL_BUTTERFLY'
  ]).optional(),
  limit: z.number().min(1).max(100).optional().default(50),
  userId: z.string().optional()
});

const updateRankingSchema = z.object({
  categories: z.array(z.string()).optional() // Specific categories to update, or all if empty
});

// Enhanced leaderboard player interface
interface CategoryLeaderboardPlayer {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
  categoryDetails: Record<string, any>;
  level: number;
  badges: number;
  // Category-specific metrics
  categoryMetrics: {
    rating?: number;
    completedTrips?: number;
    totalFishCaught?: number;
    biggestCatch?: number;
    activeDays?: number;
    mentorRating?: number;
    techniqueCount?: number;
    speciesCount?: number;
  };
}

// Scoring algorithms for different categories
class CategoryScoringEngine {
  static async calculateScore(category: string, profile: any): Promise<{ score: number; details: any }> {
    switch (category) {
      case 'MONTHLY_CHAMPIONS':
        return this.calculateMonthlyChampionsScore(profile);
      case 'BIGGEST_CATCH':
        return this.calculateBiggestCatchScore(profile);
      case 'MOST_ACTIVE':
        return this.calculateMostActiveScore(profile);
      case 'BEST_MENTOR':
        return this.calculateBestMentorScore(profile);
      case 'TECHNIQUE_MASTER':
        return this.calculateTechniqueMasterScore(profile);
      case 'SPECIES_SPECIALIST':
        return this.calculateSpeciesSpecialistScore(profile);
      default:
        return { score: Number(profile.rating), details: {} };
    }
  }

  private static calculateMonthlyChampionsScore(profile: any) {
    const rating = Number(profile.rating) || 0;
    const trips = profile.completedTrips || 0;
    const fish = profile.totalFishCaught || 0;
    const level = profile.level || 1;
    
    // Composite score: rating (30%) + trips (30%) + fish (20%) + level (20%)
    const score = (rating * 0.3) + (trips * 0.3) + (fish * 0.2) + (level * 0.2);
    
    return {
      score: Math.round(score * 100) / 100,
      details: {
        rating,
        trips,
        fish,
        level,
        breakdown: {
          ratingContribution: rating * 0.3,
          tripsContribution: trips * 0.3,
          fishContribution: fish * 0.2,
          levelContribution: level * 0.2
        }
      }
    };
  }

  private static calculateBiggestCatchScore(profile: any) {
    // Extract biggest catch from experienceStats or catchRecords
    let biggestCatch = 0;
    
    try {
      const experienceStats = profile.experienceStats as any;
      if (experienceStats?.biggestCatch?.weight) {
        biggestCatch = parseFloat(experienceStats.biggestCatch.weight);
      }
      
      // Also check catchRecords for better accuracy
      const catchRecords = profile.catchRecords as any;
      if (Array.isArray(catchRecords)) {
        const maxCatch = Math.max(...catchRecords.map((record: any) => record.weight || 0));
        biggestCatch = Math.max(biggestCatch, maxCatch);
      }
    } catch (error) {
      console.error('Error calculating biggest catch:', error);
    }

    return {
      score: biggestCatch,
      details: {
        biggestCatchWeight: biggestCatch,
        unit: 'kg'
      }
    };
  }

  private static calculateMostActiveScore(profile: any) {
    const trips = profile.completedTrips || 0;
    const activeDays = profile.activeDays || 0;
    const consecutiveDays = profile.activeDaysConsecutive || 0;
    
    // Activity score: trips (50%) + active days (30%) + consecutive streak bonus (20%)
    const score = (trips * 0.5) + (activeDays * 0.3) + (consecutiveDays * 0.2);
    
    return {
      score: Math.round(score * 100) / 100,
      details: {
        trips,
        activeDays,
        consecutiveDays,
        breakdown: {
          tripsContribution: trips * 0.5,
          activeDaysContribution: activeDays * 0.3,
          streakBonus: consecutiveDays * 0.2
        }
      }
    };
  }

  private static calculateBestMentorScore(profile: any) {
    const mentorRating = Number(profile.mentorRating) || 5.0;
    const totalReviews = profile.totalReviews || 0;
    
    // Mentor score with minimum review threshold
    const score = totalReviews >= 5 ? mentorRating * (Math.log(totalReviews + 1) / Math.log(10)) : 0;
    
    return {
      score: Math.round(score * 100) / 100,
      details: {
        mentorRating,
        totalReviews,
        qualified: totalReviews >= 5,
        scoreMultiplier: Math.log(totalReviews + 1) / Math.log(10)
      }
    };
  }

  private static calculateTechniqueMasterScore(profile: any) {
    let techniqueCount = 0;
    let masteryScore = 0;
    
    try {
      const techniqueSkills = profile.techniqueSkills as any;
      if (Array.isArray(techniqueSkills)) {
        techniqueCount = techniqueSkills.length;
        masteryScore = techniqueSkills.reduce((sum: number, skill: any) => {
          return sum + (skill.level || 1) * (skill.experience || 1);
        }, 0);
      }
    } catch (error) {
      console.error('Error calculating technique mastery:', error);
    }

    return {
      score: masteryScore + (techniqueCount * 10), // Bonus points for diversity
      details: {
        techniqueCount,
        masteryScore,
        diversityBonus: techniqueCount * 10
      }
    };
  }

  private static calculateSpeciesSpecialistScore(profile: any) {
    const uniqueSpecies = Array.isArray(profile.uniqueSpecies) ? profile.uniqueSpecies.length : 0;
    const totalFish = profile.totalFishCaught || 0;
    
    // Specialist score: species diversity + total catch with diversity bonus
    const diversityBonus = uniqueSpecies >= 10 ? uniqueSpecies * 2 : uniqueSpecies;
    const score = (uniqueSpecies * 5) + (totalFish * 0.1) + diversityBonus;
    
    return {
      score: Math.round(score * 100) / 100,
      details: {
        uniqueSpecies,
        totalFish,
        diversityBonus,
        breakdown: {
          speciesPoints: uniqueSpecies * 5,
          catchPoints: totalFish * 0.1,
          bonusPoints: diversityBonus
        }
      }
    };
  }
}

// Get category leaderboard
async function getCategoryLeaderboard(category?: string, limit: number = 50, userId?: string) {
  try {
    // Get all active categories or specific category
    const categories = category 
      ? await prisma.leaderboardCategory.findMany({
          where: { category: category as any, isActive: true }
        })
      : await prisma.leaderboardCategory.findMany({
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' }
        });

    const results: Record<string, CategoryLeaderboardPlayer[]> = {};

    for (const cat of categories) {
      // Get current user session for privacy checking
      const session = await auth();
      const currentUserId = session?.user?.id;

      // Get fisher profiles with privacy filters
      const profiles = await prisma.fisherProfile.findMany({
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
              id: true
            }
          }
        },
        where: {
          isActive: true,
          user: {
            isNot: null
          },
          // Privacy filters
          OR: [
            // Public profiles
            { leaderboardVisibility: 'PUBLIC' },
            // Anonymous profiles
            { leaderboardVisibility: 'ANONYMOUS' },
            // Current user's own profile
            ...(currentUserId ? [{ userId: currentUserId }] : []),
            // TODO: Add friends logic when available
          ]
        }
      });

      // Calculate scores for each profile
      const scoredPlayers: CategoryLeaderboardPlayer[] = [];
      
      for (const profile of profiles) {
        if (!profile.user) continue;

        const { score, details } = await CategoryScoringEngine.calculateScore(cat.category, profile);
        
        // Check if profile should be anonymous
        const isAnonymous = profile.leaderboardVisibility === 'ANONYMOUS' && 
                           profile.userId !== currentUserId;
        
        scoredPlayers.push({
          position: 0, // Will be set after sorting
          userId: profile.userId,
          name: isAnonymous ? 'Анонимный игрок' : (profile.user.name || 'Anonymous Fisher'),
          avatar: isAnonymous ? null : profile.user.image,
          score,
          categoryDetails: details,
          level: profile.level,
          badges: profile.badges.length,
          categoryMetrics: {
            rating: Number(profile.rating),
            completedTrips: profile.completedTrips,
            totalFishCaught: profile.totalFishCaught,
            activeDays: profile.activeDays,
            mentorRating: Number(profile.mentorRating),
            techniqueCount: Array.isArray(profile.techniqueSkills) ? (profile.techniqueSkills as any).length : 0,
            speciesCount: profile.uniqueSpecies.length
          }
        });
      }

      // Sort by score (descending) and assign positions
      scoredPlayers.sort((a, b) => b.score - a.score);
      scoredPlayers.forEach((player, index) => {
        player.position = index + 1;
      });

      // Limit results
      results[cat.category] = scoredPlayers.slice(0, limit);
    }

    return results;

  } catch (error) {
    console.error('Error getting category leaderboard:', error);
    throw new Error('Failed to get category leaderboard');
  }
}

// Get available categories
async function getAvailableCategories() {
  try {
    return await prisma.leaderboardCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
  } catch (error) {
    console.error('Error getting available categories:', error);
    throw new Error('Failed to get available categories');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('userId');

    switch (action) {
      case 'categories': {
        const categories = await getAvailableCategories();
        return NextResponse.json({ categories });
      }

      case 'rankings': {
        const { category: validatedCategory, limit: validatedLimit, userId: validatedUserId } = 
          categoryLeaderboardSchema.parse({ category, limit, userId });

        const rankings = await getCategoryLeaderboard(validatedCategory, validatedLimit, validatedUserId);
        
        return NextResponse.json({ 
          rankings,
          categories: Object.keys(rankings),
          total: Object.values(rankings).reduce((sum, players) => sum + players.length, 0)
        });
      }

      default: {
        // Default: return all categories with basic info
        const categories = await getAvailableCategories();
        return NextResponse.json({ categories });
      }
    }

  } catch (error) {
    console.error('Category leaderboard GET API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid parameters',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check for admin actions
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'update-rankings': {
        // Manual trigger to update rankings (admin only)
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }

        const { categories } = updateRankingSchema.parse(body);
        
        // This would trigger background job to recalculate rankings
        // For now, return success message
        return NextResponse.json({
          success: true,
          message: 'Ranking update triggered',
          updatedCategories: categories || 'all'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Category leaderboard POST API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
