import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  startOfQuarter, endOfQuarter, startOfYear, endOfYear,
  addWeeks, addMonths, addQuarters, addYears,
  format, isBefore, isAfter, differenceInDays, differenceInHours
} from 'date-fns';

/**
 * Enhanced Seasonal Competitions Engine Backend
 * Task 21.4: Seasonal Competitions Backend - Automated lifecycle and rewards
 * 
 * Comprehensive system for managing seasonal competitions with automated
 * lifecycle management, reward distribution, and real-time updates
 */

// Enhanced competition interfaces
interface EnhancedSeasonCompetition {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: SeasonType;
  status: SeasonStatus;
  
  // Timing
  startDate: Date;
  endDate: Date;
  registrationStartDate: Date | null;
  registrationEndDate: Date | null;
  
  // Configuration
  maxParticipants: number | null;
  minParticipants: number;
  includedCategories: string[];
  autoEnroll: boolean;
  isPublic: boolean;
  
  // Dynamic data
  participantCount: number;
  timeRemaining: string | null;
  progress: number; // 0-100%
  phase: CompetitionPhase;
  
  // Rewards and scoring
  rewards: any;
  scoringRules: any;
  
  // Statistics
  totalScore: number;
  averageScore: number;
  topScore: number;
  
  // User-specific data
  currentUserParticipating?: boolean;
  currentUserRank?: number | null;
  currentUserScore?: number;
  
  // Recent activity
  recentWinners?: any[];
  recentAchievements?: any[];
}

interface CompetitionParticipant {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  
  // Scoring
  totalScore: number;
  overallRank: number | null;
  categoryRanks: Record<string, number>;
  categoryScores: Record<string, number>;
  
  // Progress tracking
  weeklyProgress: any[];
  monthlyProgress: any[];
  
  // Achievements
  achievementsEarned: string[];
  badgesEarned: string[];
  
  // Participation
  joinedAt: Date;
  isActive: boolean;
  autoEnrolled: boolean;
  
  // Trends
  positionChange: number;
  scoreChange: number;
  streak: number;
}

// Competition lifecycle phases
enum CompetitionPhase {
  REGISTRATION = 'registration',
  PRE_START = 'pre_start', 
  ACTIVE = 'active',
  ENDING_SOON = 'ending_soon',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

enum SeasonType {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY', 
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

enum SeasonStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED', 
  CANCELLED = 'CANCELLED'
}

// Advanced competition management
class SeasonalCompetitionEngine {
  
  /**
   * Determine current competition phase based on dates
   */
  static determinePhase(competition: any): CompetitionPhase {
    const now = new Date();
    const startDate = new Date(competition.startDate);
    const endDate = new Date(competition.endDate);
    const registrationStart = competition.registrationStartDate ? new Date(competition.registrationStartDate) : null;
    const registrationEnd = competition.registrationEndDate ? new Date(competition.registrationEndDate) : null;
    
    // Check if completed
    if (competition.status === 'COMPLETED' || isAfter(now, endDate)) {
      return CompetitionPhase.COMPLETED;
    }
    
    // Check if cancelled
    if (competition.status === 'CANCELLED') {
      return CompetitionPhase.ARCHIVED;
    }
    
    // Check registration phase
    if (registrationStart && registrationEnd) {
      if (isBefore(now, registrationStart)) {
        return CompetitionPhase.REGISTRATION; // Not yet open for registration
      }
      if (isBefore(now, registrationEnd)) {
        return CompetitionPhase.REGISTRATION; // Registration open
      }
    }
    
    // Check if not yet started
    if (isBefore(now, startDate)) {
      return CompetitionPhase.PRE_START;
    }
    
    // Check if ending soon (last 24 hours)
    const hoursUntilEnd = differenceInHours(endDate, now);
    if (hoursUntilEnd <= 24 && hoursUntilEnd > 0) {
      return CompetitionPhase.ENDING_SOON;
    }
    
    // Must be active
    return CompetitionPhase.ACTIVE;
  }
  
  /**
   * Calculate time remaining in human-readable format
   */
  static calculateTimeRemaining(endDate: Date): string | null {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 1) return `${days} days`;
    if (days === 1) return `1 day ${hours}h`;
    if (hours > 1) return `${hours} hours`;
    if (hours === 1) return `1 hour ${minutes}m`;
    return `${minutes} minutes`;
  }
  
  /**
   * Calculate competition progress (0-100%)
   */
  static calculateProgress(startDate: Date, endDate: Date): number {
    const now = new Date();
    const start = startDate.getTime();
    const end = endDate.getTime();
    const current = now.getTime();
    
    if (current <= start) return 0;
    if (current >= end) return 100;
    
    return Math.round(((current - start) / (end - start)) * 100);
  }
  
  /**
   * Auto-create competitions based on schedule
   */
  static async autoCreateSeasonalCompetitions() {
    const now = new Date();
    console.log('🔄 Auto-creating seasonal competitions...');
    
    const competitionsToCreate = [];
    
    // Weekly competitions - create next 2 weeks
    for (let i = 1; i <= 2; i++) {
      const weekStart = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(addWeeks(now, i), { weekStartsOn: 1 }); // Sunday
      const weekName = `week_${format(weekStart, 'yyyy_MM_dd')}`;
      
      const existingWeekly = await prisma.season.findUnique({
        where: { name: weekName }
      });
      
      if (!existingWeekly) {
        competitionsToCreate.push({
          name: weekName,
          displayName: `Weekly Challenge - ${format(weekStart, 'MMM dd')}`,
          description: `Weekly fishing challenge from ${format(weekStart, 'MMM dd')} to ${format(weekEnd, 'MMM dd, yyyy')}`,
          type: 'WEEKLY',
          status: 'UPCOMING',
          startDate: weekStart,
          endDate: weekEnd,
          registrationStartDate: addDays(weekStart, -3), // 3 days before
          registrationEndDate: addDays(weekStart, -1), // 1 day before
          includedCategories: ['MOST_ACTIVE', 'BIGGEST_CATCH', 'SOCIAL_BUTTERFLY'],
          autoEnroll: false,
          isPublic: true,
          maxParticipants: 50,
          minParticipants: 5,
          rewards: {
            tiers: [
              { place: 1, reward: 'Weekly Champion Badge', type: 'badge', value: 100 },
              { place: 2, reward: 'Weekly Silver', type: 'points', value: 50 },
              { place: 3, reward: 'Weekly Bronze', type: 'points', value: 25 }
            ],
            participation: { reward: 'Participation Badge', type: 'badge', value: 10 }
          },
          scoringRules: {
            categories: {
              'MOST_ACTIVE': { weight: 0.4, maxScore: 100 },
              'BIGGEST_CATCH': { weight: 0.4, maxScore: 100 },
              'SOCIAL_BUTTERFLY': { weight: 0.2, maxScore: 100 }
            }
          }
        });
      }
    }
    
    // Monthly competitions - create next month
    const nextMonth = addMonths(now, 1);
    const monthStart = startOfMonth(nextMonth);
    const monthEnd = endOfMonth(nextMonth);
    const monthName = `month_${format(nextMonth, 'yyyy_MM')}`;
    
    const existingMonthly = await prisma.season.findUnique({
      where: { name: monthName }
    });
    
    if (!existingMonthly) {
      competitionsToCreate.push({
        name: monthName,
        displayName: `${format(nextMonth, 'MMMM yyyy')} Championship`,
        description: `Monthly fishing championship for ${format(nextMonth, 'MMMM yyyy')}`,
        type: 'MONTHLY',
        status: 'UPCOMING',
        startDate: monthStart,
        endDate: monthEnd,
        registrationStartDate: addDays(monthStart, -7), // 1 week before
        registrationEndDate: addDays(monthStart, -1), // 1 day before
        includedCategories: [
          'MONTHLY_CHAMPIONS', 'MOST_ACTIVE', 'BIGGEST_CATCH', 'BEST_MENTOR',
          'TECHNIQUE_MASTER', 'SPECIES_SPECIALIST'
        ],
        autoEnroll: false,
        isPublic: true,
        maxParticipants: 200,
        minParticipants: 20,
        rewards: {
          tiers: [
            { place: 1, reward: 'Monthly Champion Trophy', type: 'trophy', value: 500 },
            { place: 2, reward: 'Monthly Silver Medal', type: 'medal', value: 300 },
            { place: 3, reward: 'Monthly Bronze Medal', type: 'medal', value: 200 },
            { place: [4,10], reward: 'Top 10 Badge', type: 'badge', value: 100 }
          ],
          participation: { reward: 'Monthly Participant', type: 'badge', value: 50 }
        },
        scoringRules: {
          categories: {
            'MONTHLY_CHAMPIONS': { weight: 0.25, maxScore: 200 },
            'MOST_ACTIVE': { weight: 0.20, maxScore: 200 },
            'BIGGEST_CATCH': { weight: 0.20, maxScore: 200 },
            'BEST_MENTOR': { weight: 0.15, maxScore: 200 },
            'TECHNIQUE_MASTER': { weight: 0.10, maxScore: 200 },
            'SPECIES_SPECIALIST': { weight: 0.10, maxScore: 200 }
          }
        }
      });
    }
    
    // Quarterly competitions - create next quarter
    const nextQuarter = addQuarters(now, 1);
    const quarterStart = startOfQuarter(nextQuarter);
    const quarterEnd = endOfQuarter(nextQuarter);
    const quarterName = `quarter_${format(nextQuarter, 'yyyy_Q')}`;
    
    const existingQuarterly = await prisma.season.findUnique({
      where: { name: quarterName }
    });
    
    if (!existingQuarterly) {
      competitionsToCreate.push({
        name: quarterName,
        displayName: `${format(nextQuarter, 'QQQ yyyy')} Grand Championship`,
        description: `Quarterly grand championship for ${format(nextQuarter, 'QQQ yyyy')}`,
        type: 'QUARTERLY',
        status: 'UPCOMING',
        startDate: quarterStart,
        endDate: quarterEnd,
        registrationStartDate: addDays(quarterStart, -14), // 2 weeks before
        registrationEndDate: addDays(quarterStart, -3), // 3 days before
        includedCategories: [
          'MONTHLY_CHAMPIONS', 'BIGGEST_CATCH', 'MOST_ACTIVE', 'BEST_MENTOR',
          'TECHNIQUE_MASTER', 'SPECIES_SPECIALIST', 'CONSISTENCY_KING', 'VETERAN_ANGLER'
        ],
        autoEnroll: false,
        isPublic: true,
        maxParticipants: 500,
        minParticipants: 50,
        rewards: {
          tiers: [
            { place: 1, reward: 'Grand Champion Crown', type: 'crown', value: 2000 },
            { place: 2, reward: 'Grand Silver Trophy', type: 'trophy', value: 1200 },
            { place: 3, reward: 'Grand Bronze Trophy', type: 'trophy', value: 800 },
            { place: [4,10], reward: 'Elite Competitor Badge', type: 'badge', value: 400 },
            { place: [11,25], reward: 'Strong Competitor Badge', type: 'badge', value: 200 }
          ],
          participation: { reward: 'Quarterly Participant', type: 'badge', value: 100 }
        },
        scoringRules: {
          categories: {
            'MONTHLY_CHAMPIONS': { weight: 0.20, maxScore: 300 },
            'BIGGEST_CATCH': { weight: 0.15, maxScore: 300 },
            'MOST_ACTIVE': { weight: 0.15, maxScore: 300 },
            'BEST_MENTOR': { weight: 0.15, maxScore: 300 },
            'TECHNIQUE_MASTER': { weight: 0.10, maxScore: 300 },
            'SPECIES_SPECIALIST': { weight: 0.10, maxScore: 300 },
            'CONSISTENCY_KING': { weight: 0.10, maxScore: 300 },
            'VETERAN_ANGLER': { weight: 0.05, maxScore: 300 }
          }
        }
      });
    }
    
    // Create all competitions
    for (const competitionData of competitionsToCreate) {
      try {
        await prisma.season.create({ data: competitionData });
        console.log(`✅ Created ${competitionData.type} competition: ${competitionData.displayName}`);
      } catch (error) {
        console.error(`❌ Error creating competition ${competitionData.name}:`, error);
      }
    }
    
    return competitionsToCreate.length;
  }
  
  /**
   * Update competition statuses based on current time
   */
  static async updateCompetitionStatuses() {
    const now = new Date();
    console.log('🔄 Updating competition statuses...');
    
    // Update upcoming competitions that should be active
    await prisma.season.updateMany({
      where: {
        status: 'UPCOMING',
        startDate: { lte: now }
      },
      data: { status: 'ACTIVE' }
    });
    
    // Update active competitions that should be completed
    const completedSeasons = await prisma.season.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: now }
      }
    });
    
    for (const season of completedSeasons) {
      await this.completeCompetition(season.id);
    }
    
    return completedSeasons.length;
  }
  
  /**
   * Complete a competition and trigger reward distribution
   */
  static async completeCompetition(seasonId: string) {
    console.log(`🏁 Completing competition: ${seasonId}`);
    
    try {
      // Get season with participants
      const season = await prisma.season.findUnique({
        where: { id: seasonId },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              }
            },
            orderBy: { overallRank: 'asc' }
          }
        }
      });
      
      if (!season) {
        throw new Error(`Season ${seasonId} not found`);
      }
      
      // Calculate final rankings
      const finalRankings = await this.calculateFinalRankings(seasonId);
      
      // Distribute rewards
      const rewardResults = await this.distributeRewards(season, finalRankings);
      
      // Archive the season
      const archive = await prisma.seasonArchive.create({
        data: {
          seasonId: season.id,
          seasonName: season.displayName,
          seasonType: season.type as any,
          startDate: season.startDate,
          endDate: season.endDate,
          finalRankings,
          participantCount: season.participants.length,
          rewardsDistributed: rewardResults,
          seasonStats: {
            totalParticipants: season.participants.length,
            activeParticipants: season.participants.filter(p => p.isActive).length,
            completionRate: season.participants.filter(p => p.isActive).length / season.participants.length,
            averageScore: finalRankings.averageScore,
            topScore: finalRankings.topScore
          },
          archivedAt: new Date()
        }
      });
      
      // Update season status
      await prisma.season.update({
        where: { id: seasonId },
        data: { status: 'COMPLETED' }
      });
      
      // Send completion notifications
      await this.sendCompetitionCompletionNotifications(season, finalRankings, rewardResults);
      
      console.log(`✅ Competition completed: ${season.displayName}`);
      return archive;
      
    } catch (error) {
      console.error(`❌ Error completing competition ${seasonId}:`, error);
      throw error;
    }
  }
  
  /**
   * Calculate final rankings for a completed competition
   */
  static async calculateFinalRankings(seasonId: string) {
    // Get all participants with their scores
    const participants = await prisma.seasonParticipant.findMany({
      where: { seasonId, isActive: true },
      include: {
        user: {
          select: { id: true, name: true, image: true }
        }
      },
      orderBy: { totalScore: 'desc' }
    });
    
    // Calculate statistics
    const scores = participants.map(p => Number(p.totalScore));
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = participants.length > 0 ? totalScore / participants.length : 0;
    const topScore = Math.max(...scores, 0);
    
    // Assign final ranks
    const rankedParticipants = participants.map((participant, index) => ({
      ...participant,
      finalRank: index + 1,
      finalScore: Number(participant.totalScore)
    }));
    
    return {
      participants: rankedParticipants,
      totalParticipants: participants.length,
      averageScore: Math.round(averageScore * 100) / 100,
      topScore,
      totalScore: Math.round(totalScore)
    };
  }
  
  /**
   * Distribute rewards to competition winners
   */
  static async distributeRewards(season: any, finalRankings: any) {
    const rewards = season.rewards || {};
    const rewardResults = [];
    
    try {
      // Process tier rewards (placement-based)
      if (rewards.tiers) {
        for (const tier of rewards.tiers) {
          const places = Array.isArray(tier.place) ? tier.place : [tier.place];
          
          for (const place of places) {
            const participant = finalRankings.participants.find((p: any) => p.finalRank === place);
            if (participant) {
              const rewardResult = await this.grantReward(
                participant.userId,
                tier.reward,
                tier.type,
                tier.value,
                season.id,
                `${season.displayName} - Place ${place}`
              );
              rewardResults.push(rewardResult);
            }
          }
        }
      }
      
      // Process participation rewards
      if (rewards.participation) {
        for (const participant of finalRankings.participants) {
          const rewardResult = await this.grantReward(
            participant.userId,
            rewards.participation.reward,
            rewards.participation.type,
            rewards.participation.value,
            season.id,
            `${season.displayName} - Participation`
          );
          rewardResults.push(rewardResult);
        }
      }
      
      console.log(`🎁 Distributed ${rewardResults.length} rewards for ${season.displayName}`);
      return rewardResults;
      
    } catch (error) {
      console.error(`❌ Error distributing rewards for season ${season.id}:`, error);
      return [];
    }
  }
  
  /**
   * Grant a specific reward to a user
   */
  static async grantReward(
    userId: string, 
    rewardName: string, 
    rewardType: string, 
    rewardValue: number, 
    seasonId: string, 
    reason: string
  ) {
    try {
      // Create reward distribution record
      const rewardDistribution = await prisma.rewardDistribution.create({
        data: {
          userId,
          sourceType: 'SEASONAL_COMPETITION',
          sourceId: seasonId,
          rank: null, // Could be set based on final ranking
          reason,
          rewardDetails: {
            name: rewardName,
            type: rewardType,
            value: rewardValue
          },
          distributedAt: new Date()
        }
      });
      
      // Add to user's inventory if it's a collectible item
      if (['badge', 'trophy', 'medal', 'crown'].includes(rewardType)) {
        await prisma.rewardInventory.create({
          data: {
            userId,
            rewardType: rewardType.toUpperCase() as any,
            rewardName,
            rewardValue: rewardValue,
            sourceType: 'SEASONAL_COMPETITION',
            sourceId: seasonId,
            acquiredAt: new Date()
          }
        });
      }
      
      // Award experience points if applicable
      if (rewardType === 'points' || rewardValue > 0) {
        await prisma.fisherProfile.upsert({
          where: { userId },
          update: {
            experiencePoints: { increment: rewardValue }
          },
          create: {
            userId,
            experienceLevel: 'BEGINNER',
            experiencePoints: rewardValue,
            level: 1,
            activeDays: 1,
            lastActiveAt: new Date()
          }
        });
      }
      
      console.log(`🎁 Granted ${rewardName} (${rewardType}) to user ${userId}`);
      return {
        success: true,
        userId,
        rewardName,
        rewardType,
        rewardValue,
        distributionId: rewardDistribution.id
      };
      
    } catch (error) {
      console.error(`❌ Error granting reward to user ${userId}:`, error);
      return {
        success: false,
        userId,
        rewardName,
        error: error.message
      };
    }
  }
  
  /**
   * Send competition completion notifications
   */
  static async sendCompetitionCompletionNotifications(season: any, finalRankings: any, rewardResults: any) {
    try {
      // Send notifications to all participants
      for (const participant of finalRankings.participants) {
        const userRewards = rewardResults.filter((r: any) => r.userId === participant.userId && r.success);
        
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: participant.userId,
            type: 'competition_completed',
            data: {
              competitionName: season.displayName,
              finalRank: participant.finalRank,
              finalScore: participant.finalScore,
              totalParticipants: finalRankings.totalParticipants,
              rewards: userRewards,
              completedAt: new Date().toISOString()
            }
          })
        });
      }
      
      console.log(`📢 Sent completion notifications to ${finalRankings.participants.length} participants`);
      
    } catch (error) {
      console.error('❌ Error sending competition completion notifications:', error);
    }
  }
}

// Helper function to add days (not in date-fns by default)
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const CompetitionEngineRequestSchema = z.object({
  action: z.enum([
    'get_competitions',
    'get_competition_details', 
    'auto_create_competitions',
    'update_statuses',
    'complete_competition',
    'distribute_rewards',
    'get_leaderboard'
  ]),
  
  // Parameters for specific actions
  competitionId: z.string().optional(),
  status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
  limit: z.number().min(1).max(100).default(20),
  userId: z.string().cuid().optional(),
  
  // Admin actions
  forceComplete: z.boolean().default(false)
});

/**
 * GET /api/seasonal-competitions/engine - Enhanced seasonal competitions engine
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      action: searchParams.get('action') || 'get_competitions',
      competitionId: searchParams.get('competitionId') || undefined,
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      limit: Number(searchParams.get('limit')) || 20,
      userId: searchParams.get('userId') || undefined,
      forceComplete: searchParams.get('forceComplete') === 'true'
    };
    
    const validatedParams = CompetitionEngineRequestSchema.parse(params);
    
    console.log(`🏆 Seasonal competition engine: ${validatedParams.action}`);
    
    let result;
    
    switch (validatedParams.action) {
      case 'get_competitions':
        result = await getEnhancedCompetitions(validatedParams);
        break;
        
      case 'get_competition_details':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required for details');
        }
        result = await getCompetitionDetails(validatedParams.competitionId, validatedParams.userId);
        break;
        
      case 'auto_create_competitions':
        const createdCount = await SeasonalCompetitionEngine.autoCreateSeasonalCompetitions();
        result = { 
          success: true, 
          created: createdCount,
          message: `Auto-created ${createdCount} competitions`
        };
        break;
        
      case 'update_statuses':
        const updatedCount = await SeasonalCompetitionEngine.updateCompetitionStatuses();
        result = { 
          success: true, 
          updated: updatedCount,
          message: `Updated ${updatedCount} competition statuses`
        };
        break;
        
      case 'complete_competition':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required for completion');
        }
        const archive = await SeasonalCompetitionEngine.completeCompetition(validatedParams.competitionId);
        result = { 
          success: true, 
          archive,
          message: `Competition completed and archived`
        };
        break;
        
      case 'get_leaderboard':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required for leaderboard');
        }
        result = await getCompetitionLeaderboard(validatedParams.competitionId, validatedParams.limit);
        break;
        
      default:
        throw new Error('Invalid action');
    }
    
    return NextResponse.json({
      success: true,
      action: validatedParams.action,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in seasonal competition engine:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Seasonal competition engine failed'
    }, { status: 500 });
  }
}

/**
 * POST /api/seasonal-competitions/engine - Admin operations
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow system operations or admin access
    if (!session?.user && !process.env.SYSTEM_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }
    
    // For admin operations, require admin role
    if (session?.user && session.user.role !== 'ADMIN') {
      return NextResponse.json({
        success: false,
        error: 'Admin access required'
      }, { status: 403 });
    }
    
    const body = await request.json();
    const validatedParams = CompetitionEngineRequestSchema.parse(body);
    
    console.log(`🔧 Admin competition engine: ${validatedParams.action}`);
    
    let result;
    
    switch (validatedParams.action) {
      case 'auto_create_competitions':
        const createdCount = await SeasonalCompetitionEngine.autoCreateSeasonalCompetitions();
        result = { created: createdCount };
        break;
        
      case 'update_statuses':
        const updatedCount = await SeasonalCompetitionEngine.updateCompetitionStatuses();
        result = { updated: updatedCount };
        break;
        
      case 'complete_competition':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required');
        }
        const archive = await SeasonalCompetitionEngine.completeCompetition(validatedParams.competitionId);
        result = { archive };
        break;
        
      default:
        throw new Error('Invalid admin action');
    }
    
    return NextResponse.json({
      success: true,
      action: validatedParams.action,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in admin competition engine:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Admin operation failed'
    }, { status: 500 });
  }
}

// Implementation functions

async function getEnhancedCompetitions(params: any): Promise<{ competitions: EnhancedSeasonCompetition[] }> {
  const whereClause: any = {};
  
  if (params.status) whereClause.status = params.status;
  if (params.type) whereClause.type = params.type;
  
  const competitions = await prisma.season.findMany({
    where: whereClause,
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        }
      },
      _count: {
        select: { participants: true }
      }
    },
    orderBy: [
      { status: 'asc' },
      { startDate: 'desc' }
    ],
    take: params.limit
  });
  
  const enhancedCompetitions: EnhancedSeasonCompetition[] = competitions.map(competition => {
    const userParticipation = params.userId 
      ? competition.participants.find(p => p.userId === params.userId)
      : undefined;
    
    const phase = SeasonalCompetitionEngine.determinePhase(competition);
    const timeRemaining = SeasonalCompetitionEngine.calculateTimeRemaining(competition.endDate);
    const progress = SeasonalCompetitionEngine.calculateProgress(competition.startDate, competition.endDate);
    
    // Calculate statistics
    const scores = competition.participants.map(p => Number(p.totalScore));
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = scores.length > 0 ? totalScore / scores.length : 0;
    const topScore = Math.max(...scores, 0);
    
    return {
      id: competition.id,
      name: competition.name,
      displayName: competition.displayName,
      description: competition.description,
      type: competition.type as SeasonType,
      status: competition.status as SeasonStatus,
      
      startDate: competition.startDate,
      endDate: competition.endDate,
      registrationStartDate: competition.registrationStartDate,
      registrationEndDate: competition.registrationEndDate,
      
      maxParticipants: competition.maxParticipants,
      minParticipants: competition.minParticipants,
      includedCategories: competition.includedCategories,
      autoEnroll: competition.autoEnroll,
      isPublic: competition.isPublic,
      
      participantCount: competition._count.participants,
      timeRemaining,
      progress,
      phase,
      
      rewards: competition.rewards,
      scoringRules: competition.scoringRules,
      
      totalScore: Math.round(totalScore),
      averageScore: Math.round(averageScore * 100) / 100,
      topScore,
      
      currentUserParticipating: !!userParticipation,
      currentUserRank: userParticipation?.overallRank,
      currentUserScore: userParticipation ? Number(userParticipation.totalScore) : undefined,
      
      // TODO: Get from database
      recentWinners: [],
      recentAchievements: []
    };
  });
  
  return { competitions: enhancedCompetitions };
}

async function getCompetitionDetails(competitionId: string, userId?: string) {
  const competition = await prisma.season.findUnique({
    where: { id: competitionId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, name: true, image: true }
          }
        },
        orderBy: { overallRank: 'asc' }
      },
      archives: {
        orderBy: { archivedAt: 'desc' },
        take: 1
      }
    }
  });
  
  if (!competition) {
    throw new Error('Competition not found');
  }
  
  const enhancedParticipants: CompetitionParticipant[] = competition.participants.map((participant, index) => ({
    id: participant.id,
    userId: participant.userId,
    userName: participant.user.name || 'Anonymous Fisher',
    userAvatar: participant.user.image,
    
    totalScore: Number(participant.totalScore),
    overallRank: participant.overallRank || (index + 1),
    categoryRanks: participant.categoryRanks as Record<string, number>,
    categoryScores: participant.categoryScores as Record<string, number>,
    
    weeklyProgress: participant.weeklyProgress as any[],
    monthlyProgress: participant.monthlyProgress as any[],
    
    achievementsEarned: participant.achievementsEarned,
    badgesEarned: participant.badgesEarned,
    
    joinedAt: participant.enrolledAt,
    isActive: participant.isActive,
    autoEnrolled: participant.autoEnrolled,
    
    // TODO: Calculate from historical data
    positionChange: 0,
    scoreChange: 0,
    streak: 0
  }));
  
  return {
    competition: {
      ...competition,
      phase: SeasonalCompetitionEngine.determinePhase(competition),
      timeRemaining: SeasonalCompetitionEngine.calculateTimeRemaining(competition.endDate),
      progress: SeasonalCompetitionEngine.calculateProgress(competition.startDate, competition.endDate)
    },
    participants: enhancedParticipants,
    userParticipation: userId ? enhancedParticipants.find(p => p.userId === userId) : null,
    archive: competition.archives[0] || null
  };
}

async function getCompetitionLeaderboard(competitionId: string, limit: number) {
  const participants = await prisma.seasonParticipant.findMany({
    where: { 
      seasonId: competitionId,
      isActive: true 
    },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    },
    orderBy: { overallRank: 'asc' },
    take: limit
  });
  
  return {
    leaderboard: participants.map(participant => ({
      position: participant.overallRank || 0,
      userId: participant.userId,
      userName: participant.user.name || 'Anonymous Fisher',
      userAvatar: participant.user.image,
      score: Number(participant.totalScore),
      categoryScores: participant.categoryScores
    })),
    totalParticipants: participants.length
  };
}
