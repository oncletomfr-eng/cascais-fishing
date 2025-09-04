/**
 * Seasonal Competition Tracking API Endpoint
 * Task 12.2: Seasonal Competition Tracking
 * 
 * Taking the role of Senior Backend Developer specializing in Temporal Competition Systems
 * 
 * Handles seasonal competitions, time-based rankings, historical tracking, and event scheduling
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfQuarter, 
  endOfQuarter, 
  startOfYear, 
  endOfYear, 
  addWeeks, 
  addMonths, 
  addQuarters,
  addYears,
  isBefore,
  isAfter,
  isWithinInterval,
  format
} from 'date-fns';

// Validation schemas
const seasonQuerySchema = z.object({
  status: z.enum(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  type: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
  includeArchived: z.boolean().optional().default(false),
  limit: z.number().min(1).max(100).optional().default(20),
  userId: z.string().optional()
});

const seasonParticipationSchema = z.object({
  seasonId: z.string(),
  userId: z.string().optional()
});

const createSeasonSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  startDate: z.string(),
  endDate: z.string(),
  includedCategories: z.array(z.string()).optional(),
  autoEnroll: z.boolean().optional().default(false),
  maxParticipants: z.number().optional(),
  rewards: z.record(z.any()).optional()
});

const archiveSeasonSchema = z.object({
  seasonId: z.string(),
  finalRankings: z.record(z.any()),
  categoryWinners: z.record(z.any()).optional(),
  specialAwards: z.array(z.any()).optional()
});

// Enhanced season data interface
interface SeasonWithDetails {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  participantCount: number;
  currentUserParticipating?: boolean;
  currentUserRank?: number;
  timeRemaining?: string;
  progress?: number;
  rewards?: any;
  categories?: string[];
  recentWinners?: any[];
}

interface SeasonParticipantWithDetails {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalScore: number;
  overallRank: number | null;
  categoryRanks: Record<string, number>;
  categoryScores: Record<string, number>;
  weeklyProgress: any[];
  monthlyProgress: any[];
  achievementsEarned: string[];
  badgesEarned: string[];
  joinedAt: Date;
  isActive: boolean;
}

// Season management utilities
class SeasonManager {
  // Auto-create seasonal competitions based on type
  static async autoCreateSeasons() {
    const now = new Date();
    
    // Auto-create next month's competition if it doesn't exist
    const nextMonth = addMonths(now, 1);
    const monthlySeasonName = format(nextMonth, 'MMMM_yyyy').toLowerCase();
    
    const existingMonthlySeason = await prisma.season.findUnique({
      where: { name: monthlySeasonName }
    });
    
    if (!existingMonthlySeason) {
      await prisma.season.create({
        data: {
          name: monthlySeasonName,
          displayName: format(nextMonth, 'MMMM yyyy') + ' Monthly Challenge',
          description: `Monthly fishing competition for ${format(nextMonth, 'MMMM yyyy')}`,
          type: 'MONTHLY',
          status: 'UPCOMING',
          startDate: startOfMonth(nextMonth),
          endDate: endOfMonth(nextMonth),
          includedCategories: [
            'MONTHLY_CHAMPIONS',
            'MOST_ACTIVE',
            'BEST_MENTOR',
            'TECHNIQUE_MASTER'
          ],
          autoEnroll: false,
          isPublic: true,
          rewards: {
            tiers: [
              { place: 1, reward: 'Monthly Champion Badge', value: 200 },
              { place: 2, reward: 'Silver Medal', value: 100 },
              { place: 3, reward: 'Bronze Medal', value: 50 }
            ]
          }
        }
      });
    }
    
    // Auto-create next quarter if it doesn't exist
    const nextQuarter = addQuarters(now, 1);
    const quarterlySeasonName = format(nextQuarter, 'QQQ_yyyy').toLowerCase();
    
    const existingQuarterlySeason = await prisma.season.findUnique({
      where: { name: quarterlySeasonName }
    });
    
    if (!existingQuarterlySeason) {
      await prisma.season.create({
        data: {
          name: quarterlySeasonName,
          displayName: format(nextQuarter, 'QQQ yyyy') + ' Quarterly Championship',
          description: `Quarterly fishing championship for ${format(nextQuarter, 'QQQ yyyy')}`,
          type: 'QUARTERLY',
          status: 'UPCOMING',
          startDate: startOfQuarter(nextQuarter),
          endDate: endOfQuarter(nextQuarter),
          includedCategories: [
            'MONTHLY_CHAMPIONS',
            'BIGGEST_CATCH',
            'MOST_ACTIVE',
            'BEST_MENTOR',
            'TECHNIQUE_MASTER',
            'SPECIES_SPECIALIST'
          ],
          autoEnroll: false,
          isPublic: true,
          rewards: {
            tiers: [
              { place: 1, reward: 'Quarterly Champion Trophy', value: 1000 },
              { place: 2, reward: 'Silver Championship Medal', value: 500 },
              { place: 3, reward: 'Bronze Championship Medal', value: 250 }
            ]
          }
        }
      });
    }
  }

  // Calculate time remaining for active seasons
  static calculateTimeRemaining(endDate: Date): string {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  }

  // Calculate season progress (0-100%)
  static calculateProgress(startDate: Date, endDate: Date): number {
    const now = new Date();
    const total = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
  }

  // Archive completed season
  static async archiveSeason(
    seasonId: string,
    finalRankings: any,
    categoryWinners?: any,
    specialAwards?: any,
    archivedBy?: string
  ) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        participants: true
      }
    });

    if (!season) throw new Error('Season not found');

    // Create archive record
    const archive = await prisma.seasonArchive.create({
      data: {
        seasonId: season.id,
        seasonName: season.displayName,
        seasonType: season.type as any,
        startDate: season.startDate,
        endDate: season.endDate,
        finalRankings,
        categoryWinners,
        specialAwards,
        participantCount: season.participants.length,
        seasonStats: {
          totalParticipants: season.participants.length,
          completionRate: season.participants.filter(p => p.isActive).length / season.participants.length
        },
        archivedBy,
        archivedAt: new Date()
      }
    });

    // Update season status
    await prisma.season.update({
      where: { id: seasonId },
      data: { status: 'COMPLETED' }
    });

    return archive;
  }
}

// Get seasons with filtering
async function getSeasons(
  status?: string,
  type?: string,
  includeArchived: boolean = false,
  limit: number = 20,
  userId?: string
): Promise<SeasonWithDetails[]> {
  try {
    const whereClause: any = {};
    
    if (status) whereClause.status = status;
    if (type) whereClause.type = type;
    
    const seasons = await prisma.season.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { startDate: 'desc' }
      ],
      take: limit
    });

    const seasonsWithDetails: SeasonWithDetails[] = seasons.map(season => {
      const userParticipation = userId 
        ? season.participants.find(p => p.userId === userId)
        : undefined;

      return {
        id: season.id,
        name: season.name,
        displayName: season.displayName,
        description: season.description,
        type: season.type,
        status: season.status,
        startDate: season.startDate,
        endDate: season.endDate,
        participantCount: season._count.participants,
        currentUserParticipating: !!userParticipation,
        currentUserRank: userParticipation?.overallRank || undefined,
        timeRemaining: season.status === 'ACTIVE' 
          ? SeasonManager.calculateTimeRemaining(season.endDate)
          : undefined,
        progress: season.status === 'ACTIVE'
          ? SeasonManager.calculateProgress(season.startDate, season.endDate)
          : undefined,
        rewards: season.rewards as any,
        categories: season.includedCategories,
        recentWinners: [] // TODO: Get from archives
      };
    });

    // Include archived seasons if requested
    if (includeArchived) {
      const archives = await prisma.seasonArchive.findMany({
        orderBy: { endDate: 'desc' },
        take: Math.max(0, limit - seasons.length)
      });

      const archivedSeasons: SeasonWithDetails[] = archives.map(archive => ({
        id: archive.seasonId,
        name: archive.seasonName.toLowerCase().replace(/\s+/g, '_'),
        displayName: archive.seasonName,
        description: `Archived ${archive.seasonType.toLowerCase()} competition`,
        type: archive.seasonType,
        status: 'COMPLETED',
        startDate: archive.startDate,
        endDate: archive.endDate,
        participantCount: archive.participantCount,
        currentUserParticipating: false,
        rewards: archive.rewardsDistributed as any
      }));

      seasonsWithDetails.push(...archivedSeasons);
    }

    return seasonsWithDetails;

  } catch (error) {
    console.error('Error getting seasons:', error);
    throw new Error('Failed to get seasons');
  }
}

// Get season participants with details
async function getSeasonParticipants(seasonId: string): Promise<SeasonParticipantWithDetails[]> {
  try {
    const participants = await prisma.seasonParticipant.findMany({
      where: { seasonId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { overallRank: 'asc' }
    });

    return participants.map(participant => ({
      id: participant.id,
      userId: participant.userId,
      userName: participant.user.name || 'Anonymous Fisher',
      userAvatar: participant.user.image,
      totalScore: Number(participant.totalScore),
      overallRank: participant.overallRank,
      categoryRanks: participant.categoryRanks as Record<string, number>,
      categoryScores: participant.categoryScores as Record<string, number>,
      weeklyProgress: participant.weeklyProgress as any[],
      monthlyProgress: participant.monthlyProgress as any[],
      achievementsEarned: participant.achievementsEarned,
      badgesEarned: participant.badgesEarned,
      joinedAt: participant.enrolledAt,
      isActive: participant.isActive
    }));

  } catch (error) {
    console.error('Error getting season participants:', error);
    throw new Error('Failed to get season participants');
  }
}

// Join/leave season
async function toggleSeasonParticipation(seasonId: string, userId: string, join: boolean = true) {
  try {
    if (join) {
      // Check if already participating
      const existing = await prisma.seasonParticipant.findUnique({
        where: {
          seasonId_userId: { seasonId, userId }
        }
      });

      if (existing) {
        // Reactivate if inactive
        if (!existing.isActive) {
          return await prisma.seasonParticipant.update({
            where: { id: existing.id },
            data: { isActive: true }
          });
        }
        return existing;
      }

      // Create new participation
      return await prisma.seasonParticipant.create({
        data: {
          seasonId,
          userId,
          isActive: true,
          enrolledAt: new Date()
        }
      });

    } else {
      // Leave season (set inactive)
      return await prisma.seasonParticipant.updateMany({
        where: { seasonId, userId },
        data: { isActive: false }
      });
    }

  } catch (error) {
    console.error('Error toggling season participation:', error);
    throw new Error('Failed to update season participation');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const seasonId = searchParams.get('seasonId');
    const userId = searchParams.get('userId');

    // Auto-create seasons if needed
    await SeasonManager.autoCreateSeasons();

    switch (action) {
      case 'seasons': {
        const {
          status,
          type,
          includeArchived,
          limit,
          userId: queryUserId
        } = seasonQuerySchema.parse({
          status: searchParams.get('status'),
          type: searchParams.get('type'),
          includeArchived: searchParams.get('includeArchived') === 'true',
          limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
          userId: searchParams.get('userId')
        });

        const seasons = await getSeasons(status, type, includeArchived, limit, queryUserId);
        return NextResponse.json({ seasons });
      }

      case 'participants': {
        if (!seasonId) {
          return NextResponse.json(
            { error: 'Season ID required' },
            { status: 400 }
          );
        }

        const participants = await getSeasonParticipants(seasonId);
        return NextResponse.json({ participants });
      }

      case 'user-seasons': {
        if (!userId) {
          return NextResponse.json(
            { error: 'User ID required' },
            { status: 400 }
          );
        }

        // Get seasons user is participating in
        const userParticipations = await prisma.seasonParticipant.findMany({
          where: { userId, isActive: true },
          include: {
            season: {
              include: {
                _count: {
                  select: {
                    participants: true
                  }
                }
              }
            }
          }
        });

        const userSeasons = userParticipations.map(participation => ({
          ...participation.season,
          participantCount: participation.season._count.participants,
          userRank: participation.overallRank,
          userScore: Number(participation.totalScore),
          timeRemaining: participation.season.status === 'ACTIVE'
            ? SeasonManager.calculateTimeRemaining(participation.season.endDate)
            : undefined
        }));

        return NextResponse.json({ userSeasons });
      }

      default: {
        // Default: return active seasons
        const seasons = await getSeasons('ACTIVE', undefined, false, 10);
        return NextResponse.json({ seasons });
      }
    }

  } catch (error) {
    console.error('Seasonal competitions GET API error:', error);
    
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
      case 'join': {
        const { seasonId, userId } = seasonParticipationSchema.parse({
          ...body,
          userId: body.userId || session.user.id
        });

        const participation = await toggleSeasonParticipation(seasonId, userId, true);
        return NextResponse.json({
          success: true,
          participation,
          message: 'Successfully joined season'
        });
      }

      case 'leave': {
        const { seasonId, userId } = seasonParticipationSchema.parse({
          ...body,
          userId: body.userId || session.user.id
        });

        await toggleSeasonParticipation(seasonId, userId, false);
        return NextResponse.json({
          success: true,
          message: 'Successfully left season'
        });
      }

      case 'create': {
        // Admin only
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }

        const seasonData = createSeasonSchema.parse(body);
        
        const season = await prisma.season.create({
          data: {
            ...seasonData,
            startDate: new Date(seasonData.startDate),
            endDate: new Date(seasonData.endDate),
            createdBy: session.user.id
          }
        });

        return NextResponse.json({
          success: true,
          season,
          message: 'Season created successfully'
        });
      }

      case 'archive': {
        // Admin only
        if (session.user.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }

        const { seasonId, finalRankings, categoryWinners, specialAwards } = archiveSeasonSchema.parse(body);
        
        const archive = await SeasonManager.archiveSeason(
          seasonId,
          finalRankings,
          categoryWinners,
          specialAwards,
          session.user.id
        );

        return NextResponse.json({
          success: true,
          archive,
          message: 'Season archived successfully'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Seasonal competitions POST API error:', error);
    
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
