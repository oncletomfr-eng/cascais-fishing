import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for auto-distribution request
const AutoDistributeSchema = z.object({
  competitionId: z.string().cuid().optional(),
  seasonId: z.string().cuid().optional(),
  eventType: z.enum(['COMPETITION_END', 'SEASON_END', 'MILESTONE_REACHED', 'ACHIEVEMENT_UNLOCKED']),
  dryRun: z.boolean().default(false), // Test run without actual distribution
});

// Reward tier configuration based on ranking
const COMPETITION_REWARDS = {
  tiers: {
    1: { tier: 'GOLD', type: 'TROPHY', rarity: 'EPIC' },
    2: { tier: 'SILVER', type: 'TROPHY', rarity: 'RARE' },
    3: { tier: 'BRONZE', type: 'TROPHY', rarity: 'UNCOMMON' },
    4: { tier: 'BRONZE', type: 'BADGE', rarity: 'COMMON' },
    5: { tier: 'BRONZE', type: 'BADGE', rarity: 'COMMON' },
  },
  participation: { tier: 'BRONZE', type: 'BADGE', rarity: 'COMMON' },
};

interface DistributionResult {
  userId: string;
  userName: string;
  rewardId: string;
  rewardName: string;
  rank?: number;
  score?: number;
  reason: string;
}

/**
 * POST /api/rewards/auto-distribute - Automatically distribute rewards
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin permissions
    const userWithRole = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (userWithRole?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = AutoDistributeSchema.parse(body);
    
    const results: DistributionResult[] = [];

    if (validatedData.eventType === 'COMPETITION_END' && validatedData.competitionId) {
      const competitionResults = await distributeCompetitionRewards(
        validatedData.competitionId,
        validatedData.dryRun
      );
      results.push(...competitionResults);
      
    } else if (validatedData.eventType === 'SEASON_END' && validatedData.seasonId) {
      const seasonResults = await distributeSeasonRewards(
        validatedData.seasonId,
        validatedData.dryRun
      );
      results.push(...seasonResults);
      
    } else if (validatedData.eventType === 'MILESTONE_REACHED') {
      const milestoneResults = await distributeMilestoneRewards(validatedData.dryRun);
      results.push(...milestoneResults);
      
    } else if (validatedData.eventType === 'ACHIEVEMENT_UNLOCKED') {
      const achievementResults = await distributeAchievementRewards(validatedData.dryRun);
      results.push(...achievementResults);
    }

    return NextResponse.json({
      distributed: results.length,
      results,
      dryRun: validatedData.dryRun,
      message: validatedData.dryRun 
        ? 'Dry run completed - no rewards were actually distributed'
        : `Successfully distributed ${results.length} rewards`,
    });

  } catch (error) {
    console.error('Error in auto-distribute:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function distributeCompetitionRewards(
  competitionId: string,
  dryRun: boolean
): Promise<DistributionResult[]> {
  const results: DistributionResult[] = [];

  // Get competition with final rankings
  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    include: {
      rankings: {
        where: { isCurrentRanking: true },
        orderBy: { rank: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!competition || competition.status !== 'COMPLETED') {
    throw new Error('Competition not found or not completed');
  }

  // Get or create appropriate rewards
  const rewards = await ensureCompetitionRewards(competition.category);

  // Distribute top tier rewards (1st-5th place)
  for (const ranking of competition.rankings.slice(0, 5)) {
    const rewardConfig = COMPETITION_REWARDS.tiers[ranking.rank as keyof typeof COMPETITION_REWARDS.tiers];
    if (!rewardConfig) continue;

    const reward = rewards.find(r => 
      r.tier === rewardConfig.tier && 
      r.type === rewardConfig.type && 
      r.rarity === rewardConfig.rarity
    );

    if (reward && !dryRun) {
      await prisma.rewardDistribution.create({
        data: {
          rewardId: reward.id,
          userId: ranking.userId,
          sourceType: 'COMPETITION',
          sourceId: competitionId,
          rank: ranking.rank,
          score: Number(ranking.score),
          reason: `${getOrdinal(ranking.rank)} place in ${competition.title}`,
          status: 'DISTRIBUTED',
          distributedAt: new Date(),
        },
      });

      await prisma.rewardInventory.upsert({
        where: {
          userId_rewardId: {
            userId: ranking.userId,
            rewardId: reward.id,
          },
        },
        update: {
          quantity: { increment: 1 },
          isActive: true,
        },
        create: {
          userId: ranking.userId,
          rewardId: reward.id,
          quantity: 1,
          isActive: true,
        },
      });
    }

    if (reward) {
      results.push({
        userId: ranking.userId,
        userName: ranking.user.name || 'Unknown',
        rewardId: reward.id,
        rewardName: reward.name,
        rank: ranking.rank,
        score: Number(ranking.score),
        reason: `${getOrdinal(ranking.rank)} place in ${competition.title}`,
      });
    }
  }

  // Participation rewards for all other participants
  const participationReward = rewards.find(r => 
    r.tier === COMPETITION_REWARDS.participation.tier &&
    r.type === COMPETITION_REWARDS.participation.type
  );

  if (participationReward) {
    for (const ranking of competition.rankings.slice(5)) {
      if (!dryRun) {
        await prisma.rewardDistribution.create({
          data: {
            rewardId: participationReward.id,
            userId: ranking.userId,
            sourceType: 'COMPETITION',
            sourceId: competitionId,
            rank: ranking.rank,
            reason: `Participated in ${competition.title}`,
            status: 'DISTRIBUTED',
            distributedAt: new Date(),
          },
        });

        await prisma.rewardInventory.upsert({
          where: {
            userId_rewardId: {
              userId: ranking.userId,
              rewardId: participationReward.id,
            },
          },
          update: {
            quantity: { increment: 1 },
          },
          create: {
            userId: ranking.userId,
            rewardId: participationReward.id,
            quantity: 1,
          },
        });
      }

      results.push({
        userId: ranking.userId,
        userName: ranking.user.name || 'Unknown',
        rewardId: participationReward.id,
        rewardName: participationReward.name,
        rank: ranking.rank,
        reason: `Participated in ${competition.title}`,
      });
    }
  }

  return results;
}

async function distributeSeasonRewards(
  seasonId: string,
  dryRun: boolean
): Promise<DistributionResult[]> {
  const results: DistributionResult[] = [];

  // Get season with final rankings
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    include: {
      participants: {
        orderBy: { overallRank: 'asc' },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!season || season.status !== 'COMPLETED') {
    throw new Error('Season not found or not completed');
  }

  // Get seasonal rewards
  const rewards = await ensureSeasonalRewards(season.type);

  // Distribute season champion rewards (top 10%)
  const championCount = Math.max(1, Math.floor(season.participants.length * 0.1));
  const champions = season.participants.slice(0, championCount);

  const championReward = rewards.find(r => r.tier === 'PLATINUM' && r.type === 'TROPHY');
  
  if (championReward) {
    for (const participant of champions) {
      if (!participant.overallRank) continue;

      if (!dryRun) {
        await prisma.rewardDistribution.create({
          data: {
            rewardId: championReward.id,
            userId: participant.userId,
            sourceType: 'SEASONAL_EVENT',
            sourceId: seasonId,
            rank: participant.overallRank,
            score: Number(participant.totalScore),
            reason: `${season.displayName} Champion`,
            status: 'DISTRIBUTED',
            distributedAt: new Date(),
          },
        });

        await prisma.rewardInventory.upsert({
          where: {
            userId_rewardId: {
              userId: participant.userId,
              rewardId: championReward.id,
            },
          },
          update: {
            quantity: { increment: 1 },
            isActive: true,
          },
          create: {
            userId: participant.userId,
            rewardId: championReward.id,
            quantity: 1,
            isActive: true,
          },
        });
      }

      results.push({
        userId: participant.userId,
        userName: participant.user.name || 'Unknown',
        rewardId: championReward.id,
        rewardName: championReward.name,
        rank: participant.overallRank,
        score: Number(participant.totalScore),
        reason: `${season.displayName} Champion`,
      });
    }
  }

  return results;
}

async function distributeMilestoneRewards(dryRun: boolean): Promise<DistributionResult[]> {
  // Implementation for milestone-based rewards
  // This would check user progress and distribute appropriate rewards
  return [];
}

async function distributeAchievementRewards(dryRun: boolean): Promise<DistributionResult[]> {
  // Implementation for achievement-based rewards
  // This would check newly unlocked achievements and distribute rewards
  return [];
}

async function ensureCompetitionRewards(category: string) {
  // Create or get competition rewards for a specific category
  const rewardPromises = [
    ensureReward(`${category} Gold Trophy`, 'TROPHY', 'GOLD', 'EPIC'),
    ensureReward(`${category} Silver Trophy`, 'TROPHY', 'SILVER', 'RARE'),
    ensureReward(`${category} Bronze Trophy`, 'TROPHY', 'BRONZE', 'UNCOMMON'),
    ensureReward(`${category} Participant Badge`, 'BADGE', 'BRONZE', 'COMMON'),
  ];

  return Promise.all(rewardPromises);
}

async function ensureSeasonalRewards(seasonType: string) {
  // Create or get seasonal rewards
  const rewardPromises = [
    ensureReward(`${seasonType} Season Champion`, 'TROPHY', 'PLATINUM', 'LEGENDARY'),
    ensureReward(`${seasonType} Season Veteran`, 'BADGE', 'GOLD', 'RARE'),
  ];

  return Promise.all(rewardPromises);
}

async function ensureReward(
  name: string,
  type: string,
  tier: string,
  rarity: string
) {
  return prisma.reward.upsert({
    where: { name },
    update: {},
    create: {
      name,
      type: type as any,
      tier: tier as any,
      rarity: rarity as any,
      icon: '🏆', // Default icon, can be customized
      isActive: true,
    },
  });
}

function getOrdinal(rank: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = rank % 100;
  return rank + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}
