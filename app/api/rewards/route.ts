import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schemas
const CreateRewardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  type: z.enum(['TROPHY', 'BADGE', 'TITLE', 'DECORATION', 'FEATURE', 'VIRTUAL_ITEM']),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY']),
  icon: z.string().min(1),
  color: z.string().optional(),
  imageUrl: z.string().url().optional(),
  requirements: z.any().optional(),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']).default('COMMON'),
  isLimited: z.boolean().default(false),
  maxQuantity: z.number().int().positive().optional(),
  seasonId: z.string().cuid().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  metadata: z.any().optional(),
});

const DistributeRewardSchema = z.object({
  rewardId: z.string().cuid(),
  userId: z.string().cuid(),
  sourceType: z.enum(['COMPETITION', 'ACHIEVEMENT', 'MILESTONE', 'SEASONAL_EVENT', 'SPECIAL_EVENT', 'ADMIN_GRANT', 'COMMUNITY_VOTE']),
  sourceId: z.string().optional(),
  rank: z.number().int().positive().optional(),
  score: z.number().optional(),
  reason: z.string().optional(),
  metadata: z.any().optional(),
});

const RewardFiltersSchema = z.object({
  type: z.enum(['TROPHY', 'BADGE', 'TITLE', 'DECORATION', 'FEATURE', 'VIRTUAL_ITEM']).optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY']).optional(),
  rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC']).optional(),
  isActive: z.boolean().optional(),
  seasonId: z.string().cuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

/**
 * GET /api/rewards - Get rewards
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = RewardFiltersSchema.parse({
      type: searchParams.get('type'),
      tier: searchParams.get('tier'),
      rarity: searchParams.get('rarity'),
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      seasonId: searchParams.get('seasonId'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    });

    const where: any = {};
    
    if (filters.type) where.type = filters.type;
    if (filters.tier) where.tier = filters.tier;
    if (filters.rarity) where.rarity = filters.rarity;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.seasonId) where.seasonId = filters.seasonId;

    const rewards = await prisma.reward.findMany({
      where,
      include: {
        season: {
          select: {
            id: true,
            name: true,
            displayName: true,
            type: true,
            status: true,
          },
        },
        _count: {
          select: {
            distributions: true,
            inventory: true,
          },
        },
      },
      take: filters.limit,
      orderBy: [
        { tier: 'desc' },
        { rarity: 'desc' },
        { createdAt: 'desc' }
      ],
    });

    return NextResponse.json({
      rewards,
      total: rewards.length,
    });

  } catch (error) {
    console.error('Error fetching rewards:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rewards - Create or distribute rewards
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

    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'create') {
      // Create a new reward (admin only)
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

      const validatedData = CreateRewardSchema.parse(body);

      const reward = await prisma.reward.create({
        data: {
          ...validatedData,
          validFrom: validatedData.validFrom ? new Date(validatedData.validFrom) : undefined,
          validUntil: validatedData.validUntil ? new Date(validatedData.validUntil) : undefined,
        },
        include: {
          season: {
            select: {
              id: true,
              name: true,
              displayName: true,
            },
          },
        },
      });

      return NextResponse.json({
        reward,
        message: 'Reward created successfully',
      });

    } else if (action === 'distribute') {
      // Distribute a reward to a user
      const validatedData = DistributeRewardSchema.parse(body);

      // Check if reward exists and is active
      const reward = await prisma.reward.findUnique({
        where: { id: validatedData.rewardId },
      });

      if (!reward || !reward.isActive) {
        return NextResponse.json(
          { error: 'Reward not found or inactive' },
          { status: 404 }
        );
      }

      // Check if reward is still valid
      const now = new Date();
      if (reward.validFrom && now < reward.validFrom) {
        return NextResponse.json(
          { error: 'Reward is not yet valid' },
          { status: 400 }
        );
      }
      if (reward.validUntil && now > reward.validUntil) {
        return NextResponse.json(
          { error: 'Reward has expired' },
          { status: 400 }
        );
      }

      // Check if user already has this reward (if it's not stackable)
      const existingDistribution = await prisma.rewardDistribution.findFirst({
        where: {
          rewardId: validatedData.rewardId,
          userId: validatedData.userId,
          status: { in: ['DISTRIBUTED', 'CLAIMED'] },
        },
      });

      if (existingDistribution && !reward.isLimited) {
        return NextResponse.json(
          { error: 'User already has this reward' },
          { status: 400 }
        );
      }

      // Create reward distribution
      const distribution = await prisma.rewardDistribution.create({
        data: {
          rewardId: validatedData.rewardId,
          userId: validatedData.userId,
          sourceType: validatedData.sourceType,
          sourceId: validatedData.sourceId,
          rank: validatedData.rank,
          score: validatedData.score,
          reason: validatedData.reason,
          status: 'DISTRIBUTED',
          distributedAt: new Date(),
          metadata: validatedData.metadata,
        },
        include: {
          reward: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Add to user inventory
      await prisma.rewardInventory.upsert({
        where: {
          userId_rewardId: {
            userId: validatedData.userId,
            rewardId: validatedData.rewardId,
          },
        },
        update: {
          quantity: { increment: 1 },
          isActive: true,
        },
        create: {
          userId: validatedData.userId,
          rewardId: validatedData.rewardId,
          quantity: 1,
          isActive: true,
        },
      });

      return NextResponse.json({
        distribution,
        message: 'Reward distributed successfully',
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use ?action=create or ?action=distribute' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in rewards API:', error);
    
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
