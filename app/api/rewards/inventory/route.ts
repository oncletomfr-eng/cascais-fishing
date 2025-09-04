import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for inventory filters
const InventoryFiltersSchema = z.object({
  userId: z.string().cuid().optional(),
  isActive: z.boolean().optional(),
  isDisplayed: z.boolean().optional(),
  category: z.string().optional(),
  rewardType: z.enum(['TROPHY', 'BADGE', 'TITLE', 'DECORATION', 'FEATURE', 'VIRTUAL_ITEM']).optional(),
  rewardTier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY']).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

// Schema for updating inventory item
const UpdateInventorySchema = z.object({
  isDisplayed: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  category: z.string().optional(),
});

/**
 * GET /api/rewards/inventory - Get user's reward inventory
 */
export async function GET(request: NextRequest) {
  // Check if this is a request for distribution history
  if (new URL(request.url).pathname.endsWith('/history')) {
    return getDistributionHistory(request);
  }
  
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    
    const filters = InventoryFiltersSchema.parse({
      userId: searchParams.get('userId') || session?.user?.id,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      isDisplayed: searchParams.get('isDisplayed') ? searchParams.get('isDisplayed') === 'true' : undefined,
      category: searchParams.get('category'),
      rewardType: searchParams.get('rewardType'),
      rewardTier: searchParams.get('rewardTier'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    });

    // Check permissions - users can only see their own inventory unless admin
    if (filters.userId && filters.userId !== session?.user?.id) {
      const userWithRole = await prisma.user.findUnique({
        where: { id: session?.user?.id || '' },
        select: { role: true },
      });

      if (userWithRole?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    if (!filters.userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const where: any = {
      userId: filters.userId,
    };

    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.isDisplayed !== undefined) where.isDisplayed = filters.isDisplayed;
    if (filters.category) where.category = filters.category;
    
    if (filters.rewardType || filters.rewardTier) {
      where.reward = {};
      if (filters.rewardType) where.reward.type = filters.rewardType;
      if (filters.rewardTier) where.reward.tier = filters.rewardTier;
    }

    const inventory = await prisma.rewardInventory.findMany({
      where,
      include: {
        reward: {
          include: {
            season: {
              select: {
                id: true,
                name: true,
                displayName: true,
                type: true,
              },
            },
            _count: {
              select: {
                distributions: true,
              },
            },
          },
        },
      },
      take: filters.limit,
      orderBy: [
        { displayOrder: 'asc' },
        { firstObtainedAt: 'desc' },
      ],
    });

    // Group by category for better organization
    const groupedInventory = inventory.reduce((acc, item) => {
      const category = item.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof inventory>);

    // Get summary statistics
    const stats = {
      totalRewards: inventory.length,
      activeRewards: inventory.filter(item => item.isActive).length,
      displayedRewards: inventory.filter(item => item.isDisplayed).length,
      byTier: inventory.reduce((acc, item) => {
        const tier = item.reward.tier;
        acc[tier] = (acc[tier] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>),
      byType: inventory.reduce((acc, item) => {
        const type = item.reward.type;
        acc[type] = (acc[type] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>),
      byRarity: inventory.reduce((acc, item) => {
        const rarity = item.reward.rarity;
        acc[rarity] = (acc[rarity] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json({
      inventory: groupedInventory,
      rawInventory: inventory,
      stats,
      total: inventory.length,
    });

  } catch (error) {
    console.error('Error fetching reward inventory:', error);
    
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
 * PUT /api/rewards/inventory/[id] - Update inventory item
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('id');
    
    if (!inventoryId) {
      return NextResponse.json(
        { error: 'Inventory ID required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateInventorySchema.parse(body);

    // Check if the inventory item belongs to the current user
    const inventoryItem = await prisma.rewardInventory.findUnique({
      where: { id: inventoryId },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: 'Inventory item not found' },
        { status: 404 }
      );
    }

    if (inventoryItem.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const updatedItem = await prisma.rewardInventory.update({
      where: { id: inventoryId },
      data: validatedData,
      include: {
        reward: true,
      },
    });

    return NextResponse.json({
      inventoryItem: updatedItem,
      message: 'Inventory item updated successfully',
    });

  } catch (error) {
    console.error('Error updating inventory item:', error);
    
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

/**
 * GET /api/rewards/inventory/history - Get reward distribution history
 * This is handled by the main GET function with pathname check
 */

async function getDistributionHistory(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    
    const userId = searchParams.get('userId') || session?.user?.id;
    const limit = parseInt(searchParams.get('limit') || '20');
    const sourceType = searchParams.get('sourceType');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Check permissions
    if (userId !== session?.user?.id) {
      const userWithRole = await prisma.user.findUnique({
        where: { id: session?.user?.id || '' },
        select: { role: true },
      });

      if (userWithRole?.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    const where: any = { userId };
    if (sourceType) where.sourceType = sourceType;

    const history = await prisma.rewardDistribution.findMany({
      where,
      include: {
        reward: {
          select: {
            id: true,
            name: true,
            type: true,
            tier: true,
            rarity: true,
            icon: true,
            color: true,
          },
        },
      },
      take: limit,
      orderBy: { distributedAt: 'desc' },
    });

    // Group by source type for organization
    const groupedHistory = history.reduce((acc, item) => {
      const source = item.sourceType;
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(item);
      return acc;
    }, {} as Record<string, typeof history>);

    return NextResponse.json({
      history: groupedHistory,
      rawHistory: history,
      total: history.length,
    });

  } catch (error) {
    console.error('Error fetching distribution history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
