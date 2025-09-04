import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { seasonalCompetitionScheduler } from '@/lib/services/seasonal-competition-scheduler';
import { seasonalRewardDistributor } from '@/lib/services/seasonal-reward-distributor';

/**
 * Seasonal Competitions Demo API
 * Task 21.4: Seasonal Competitions Backend
 * 
 * Demo and testing endpoint for seasonal competition system:
 * - Test automated competition creation
 * - Test competition lifecycle management
 * - Test reward distribution
 * - Simulate participant activity
 * - Test notifications
 */

const DemoRequestSchema = z.object({
  demoType: z.enum([
    'scheduler_status',
    'auto_create_competitions',
    'simulate_competition',
    'test_rewards',
    'simulate_participant_activity',
    'complete_competition',
    'test_notifications',
    'cleanup_demo_data'
  ]),
  
  // Parameters for specific demo types
  competitionId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  participantCount: z.number().min(1).max(100).default(10),
  seasonType: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY']).optional(),
  fastForward: z.boolean().default(false), // Skip time delays for testing
  
  // Test data options
  includeRewards: z.boolean().default(true),
  includeNotifications: z.boolean().default(true),
  createTestUsers: z.boolean().default(false)
});

/**
 * GET /api/seasonal-competitions/demo - Demo operations and testing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const params = {
      demoType: searchParams.get('demoType') || 'scheduler_status',
      competitionId: searchParams.get('competitionId') || undefined,
      userId: searchParams.get('userId') || undefined,
      participantCount: Number(searchParams.get('participantCount')) || 10,
      seasonType: searchParams.get('seasonType') || undefined,
      fastForward: searchParams.get('fastForward') === 'true',
      includeRewards: searchParams.get('includeRewards') !== 'false',
      includeNotifications: searchParams.get('includeNotifications') !== 'false',
      createTestUsers: searchParams.get('createTestUsers') === 'true'
    };
    
    const validatedParams = DemoRequestSchema.parse(params);
    
    console.log(`🎮 Seasonal competitions demo: ${validatedParams.demoType}`);
    
    let result;
    
    switch (validatedParams.demoType) {
      case 'scheduler_status':
        result = await getSchedulerStatus();
        break;
        
      case 'auto_create_competitions':
        result = await testAutoCreateCompetitions(validatedParams.seasonType);
        break;
        
      case 'simulate_competition':
        result = await simulateCompetition(validatedParams);
        break;
        
      case 'test_rewards':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required for reward testing');
        }
        result = await testRewardDistribution(validatedParams.competitionId);
        break;
        
      case 'simulate_participant_activity':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required for participant simulation');
        }
        result = await simulateParticipantActivity(
          validatedParams.competitionId,
          validatedParams.participantCount
        );
        break;
        
      case 'complete_competition':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required for completion');
        }
        result = await testCompetitionCompletion(validatedParams.competitionId);
        break;
        
      case 'test_notifications':
        result = await testNotificationSystem(validatedParams.userId);
        break;
        
      case 'cleanup_demo_data':
        result = await cleanupDemoData();
        break;
        
      default:
        throw new Error('Invalid demo type');
    }
    
    return NextResponse.json({
      success: true,
      demoType: validatedParams.demoType,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in seasonal competitions demo:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid demo parameters',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Demo operation failed'
    }, { status: 500 });
  }
}

/**
 * POST /api/seasonal-competitions/demo - Execute demo operations
 */
export async function POST(request: NextRequest) {
  try {
    // Allow demo access for testing
    const session = await auth();
    
    const body = await request.json();
    const validatedParams = DemoRequestSchema.parse(body);
    
    console.log(`🔧 Demo operation: ${validatedParams.demoType}`);
    
    let result;
    
    switch (validatedParams.demoType) {
      case 'auto_create_competitions':
        result = await testAutoCreateCompetitions(validatedParams.seasonType);
        break;
        
      case 'simulate_competition':
        result = await simulateFullCompetition(validatedParams);
        break;
        
      case 'test_rewards':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required');
        }
        result = await testComprehensiveRewards(validatedParams.competitionId);
        break;
        
      case 'simulate_participant_activity':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required');
        }
        result = await simulateRealisticActivity(
          validatedParams.competitionId,
          validatedParams.participantCount,
          validatedParams.fastForward
        );
        break;
        
      case 'complete_competition':
        if (!validatedParams.competitionId) {
          throw new Error('Competition ID required');
        }
        result = await forceCompleteCompetition(validatedParams.competitionId);
        break;
        
      case 'cleanup_demo_data':
        result = await comprehensiveCleanup();
        break;
        
      default:
        throw new Error('Invalid demo operation');
    }
    
    return NextResponse.json({
      success: true,
      demoType: validatedParams.demoType,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error in demo operation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Demo operation failed'
    }, { status: 500 });
  }
}

// Demo implementation functions

async function getSchedulerStatus() {
  const status = await seasonalCompetitionScheduler.getSchedulerStatus();
  
  const competitionCounts = await prisma.season.groupBy({
    by: ['status', 'type'],
    _count: { id: true }
  });
  
  return {
    schedulerStatus: status,
    competitionBreakdown: competitionCounts,
    message: 'Scheduler status retrieved successfully'
  };
}

async function testAutoCreateCompetitions(seasonType?: string) {
  console.log('🔄 Testing auto-creation of competitions...');
  
  const beforeCount = await prisma.season.count();
  
  // Run the scheduler's auto-creation logic
  const createdCount = await seasonalCompetitionScheduler.autoCreateCompetitions();
  
  const afterCount = await prisma.season.count();
  
  // Get recently created competitions
  const recentCompetitions = await prisma.season.findMany({
    where: seasonType ? { type: seasonType } : {},
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      displayName: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      participantCount: true
    }
  });
  
  return {
    beforeCount,
    afterCount,
    createdCount,
    newCompetitions: recentCompetitions.slice(0, createdCount),
    message: `Auto-created ${createdCount} competitions`
  };
}

async function simulateCompetition(params: any) {
  console.log('🎲 Simulating a complete competition lifecycle...');
  
  // 1. Create a test competition
  const competition = await prisma.season.create({
    data: {
      name: `demo_competition_${Date.now()}`,
      displayName: 'Demo Competition',
      description: 'A simulated competition for testing',
      type: 'WEEKLY',
      status: 'ACTIVE',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started 1 day ago
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Ends in 6 days
      includedCategories: ['MOST_ACTIVE', 'BIGGEST_CATCH'],
      autoEnroll: false,
      isPublic: true,
      maxParticipants: 50,
      minParticipants: 5,
      rewards: {
        tiers: [
          { place: 1, reward: 'Demo Champion Badge', type: 'badge', value: 100 },
          { place: 2, reward: 'Demo Silver', type: 'points', value: 50 },
          { place: 3, reward: 'Demo Bronze', type: 'points', value: 25 }
        ],
        participation: { reward: 'Demo Participant', type: 'badge', value: 10 }
      }
    }
  });
  
  // 2. Add test participants
  const participantCount = Math.min(params.participantCount || 10, 20);
  const participants = [];
  
  for (let i = 1; i <= participantCount; i++) {
    const score = Math.floor(Math.random() * 100) + 1;
    
    const participant = await prisma.seasonParticipant.create({
      data: {
        seasonId: competition.id,
        userId: `demo-user-${i}`,
        totalScore: score,
        overallRank: i, // Will be recalculated
        categoryScores: {
          'MOST_ACTIVE': Math.floor(score * 0.6),
          'BIGGEST_CATCH': Math.floor(score * 0.4)
        },
        isActive: true,
        autoEnrolled: false,
        enrolledAt: new Date()
      }
    });
    
    participants.push(participant);
  }
  
  // 3. Recalculate rankings
  const sortedParticipants = participants.sort((a, b) => Number(b.totalScore) - Number(a.totalScore));
  for (const [index, participant] of sortedParticipants.entries()) {
    await prisma.seasonParticipant.update({
      where: { id: participant.id },
      data: { overallRank: index + 1 }
    });
  }
  
  return {
    competition: {
      id: competition.id,
      name: competition.displayName,
      participants: participantCount,
      status: competition.status
    },
    participants: sortedParticipants.slice(0, 5), // Top 5
    message: `Simulated competition with ${participantCount} participants`
  };
}

async function testRewardDistribution(competitionId: string) {
  console.log(`🎁 Testing reward distribution for competition: ${competitionId}`);
  
  // Get competition with participants
  const competition = await prisma.season.findUnique({
    where: { id: competitionId },
    include: {
      participants: {
        orderBy: { overallRank: 'asc' },
        take: 10
      }
    }
  });
  
  if (!competition) {
    throw new Error('Competition not found');
  }
  
  // Simulate final rankings
  const finalRankings = competition.participants.map((p, index) => ({
    ...p,
    finalRank: p.overallRank || (index + 1),
    finalScore: Number(p.totalScore)
  }));
  
  // Test reward distribution
  const rewardSummary = await seasonalRewardDistributor.distributeAllRewards(
    competitionId,
    finalRankings,
    competition
  );
  
  return {
    competitionName: competition.displayName,
    participantCount: competition.participants.length,
    rewardSummary,
    topParticipants: finalRankings.slice(0, 3),
    message: `Distributed rewards to ${rewardSummary.successfulDistributions} participants`
  };
}

async function simulateParticipantActivity(competitionId: string, participantCount: number) {
  console.log(`👥 Simulating participant activity for competition: ${competitionId}`);
  
  const activities = [];
  
  // Simulate various activities for participants
  for (let i = 1; i <= participantCount; i++) {
    const userId = `demo-user-${i}`;
    
    // Simulate trip completion
    const tripScore = Math.floor(Math.random() * 50) + 10;
    activities.push({
      type: 'trip_completed',
      userId,
      score: tripScore,
      timestamp: new Date()
    });
    
    // Simulate fish catch
    const fishScore = Math.floor(Math.random() * 30) + 5;
    activities.push({
      type: 'fish_caught',
      userId,
      score: fishScore,
      timestamp: new Date()
    });
    
    // Update participant score
    await prisma.seasonParticipant.updateMany({
      where: {
        seasonId: competitionId,
        userId: userId
      },
      data: {
        totalScore: { increment: tripScore + fishScore },
        lastActivityAt: new Date()
      }
    });
  }
  
  // Recalculate rankings
  const participants = await prisma.seasonParticipant.findMany({
    where: { seasonId: competitionId },
    orderBy: { totalScore: 'desc' }
  });
  
  for (const [index, participant] of participants.entries()) {
    await prisma.seasonParticipant.update({
      where: { id: participant.id },
      data: { overallRank: index + 1 }
    });
  }
  
  return {
    activitiesSimulated: activities.length,
    participantsUpdated: participantCount,
    leaderboard: participants.slice(0, 5).map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      score: Number(p.totalScore)
    })),
    message: `Simulated ${activities.length} activities for ${participantCount} participants`
  };
}

async function testCompetitionCompletion(competitionId: string) {
  console.log(`🏁 Testing competition completion for: ${competitionId}`);
  
  // Force completion via scheduler
  await seasonalCompetitionScheduler.completeCompetition(competitionId);
  
  // Get completion results
  const archive = await prisma.seasonArchive.findFirst({
    where: { seasonId: competitionId },
    orderBy: { archivedAt: 'desc' }
  });
  
  const competition = await prisma.season.findUnique({
    where: { id: competitionId }
  });
  
  return {
    competition: {
      id: competition?.id,
      name: competition?.displayName,
      status: competition?.status
    },
    archive: {
      id: archive?.id,
      participantCount: archive?.participantCount,
      archivedAt: archive?.archivedAt
    },
    message: 'Competition completed and archived successfully'
  };
}

async function testNotificationSystem(userId?: string) {
  console.log('📢 Testing notification system...');
  
  const testUserId = userId || 'demo-user-1';
  
  // Send test notification
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: testUserId,
        type: 'competition_demo',
        data: {
          message: 'This is a test notification from the seasonal competitions system',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    const result = await response.json();
    
    return {
      notificationSent: response.ok,
      notificationResult: result,
      testUserId,
      message: 'Notification test completed'
    };
  } catch (error) {
    return {
      notificationSent: false,
      error: error.message,
      testUserId,
      message: 'Notification test failed'
    };
  }
}

async function cleanupDemoData() {
  console.log('🧹 Cleaning up demo data...');
  
  // Delete demo competitions
  const deletedCompetitions = await prisma.season.deleteMany({
    where: {
      name: { startsWith: 'demo_' }
    }
  });
  
  // Delete demo participants
  const deletedParticipants = await prisma.seasonParticipant.deleteMany({
    where: {
      userId: { startsWith: 'demo-user-' }
    }
  });
  
  // Delete demo archives
  const deletedArchives = await prisma.seasonArchive.deleteMany({
    where: {
      seasonName: { contains: 'Demo' }
    }
  });
  
  return {
    deletedCompetitions: deletedCompetitions.count,
    deletedParticipants: deletedParticipants.count,
    deletedArchives: deletedArchives.count,
    message: 'Demo data cleanup completed'
  };
}

// Advanced demo functions for POST operations

async function simulateFullCompetition(params: any) {
  console.log('🎯 Running full competition simulation...');
  
  // Create, populate, and complete a competition
  const simulation = await simulateCompetition(params);
  const activity = await simulateParticipantActivity(simulation.competition.id, params.participantCount);
  
  if (params.fastForward) {
    // Fast-forward to completion
    await prisma.season.update({
      where: { id: simulation.competition.id },
      data: { 
        endDate: new Date(Date.now() - 1000), // Set end time to past
        status: 'ACTIVE'
      }
    });
    
    const completion = await testCompetitionCompletion(simulation.competition.id);
    
    return {
      simulation,
      activity,
      completion,
      message: 'Full competition lifecycle simulation completed'
    };
  }
  
  return {
    simulation,
    activity,
    message: 'Competition simulation created (not completed - remove fastForward to auto-complete)'
  };
}

async function testComprehensiveRewards(competitionId: string) {
  console.log('🏆 Testing comprehensive reward system...');
  
  const rewardTest = await testRewardDistribution(competitionId);
  
  // Test special achievements
  const participants = await prisma.seasonParticipant.findMany({
    where: { seasonId: competitionId },
    orderBy: { totalScore: 'desc' },
    take: 5
  });
  
  const specialRewards = [];
  
  for (const participant of participants) {
    // Test perfect score reward
    const perfectScoreReward = await seasonalRewardDistributor.grantReward(
      participant.userId,
      'Perfect Score Test Badge',
      'badge',
      150,
      competitionId,
      'Demo perfect score achievement',
      'SPECIAL_ACHIEVEMENT'
    );
    specialRewards.push(perfectScoreReward);
  }
  
  return {
    standardRewards: rewardTest.rewardSummary,
    specialRewards: specialRewards.filter(r => r.success),
    message: 'Comprehensive reward testing completed'
  };
}

async function simulateRealisticActivity(competitionId: string, participantCount: number, fastForward: boolean) {
  console.log('🎲 Simulating realistic participant activity patterns...');
  
  const activities = [];
  
  // Simulate different activity patterns
  for (let i = 1; i <= participantCount; i++) {
    const userId = `demo-user-${i}`;
    
    // Some users are more active than others
    const activityLevel = Math.random();
    const activityCount = activityLevel > 0.7 ? 5 : activityLevel > 0.4 ? 3 : 1;
    
    let totalScore = 0;
    
    for (let j = 0; j < activityCount; j++) {
      const activity = {
        type: Math.random() > 0.5 ? 'trip_completed' : 'fish_caught',
        userId,
        score: Math.floor(Math.random() * 40) + 10,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
      };
      
      activities.push(activity);
      totalScore += activity.score;
      
      if (!fastForward) {
        // Add small delay to simulate realistic timing
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    // Update participant with realistic scores and categories
    const categoryScores = {
      'MOST_ACTIVE': Math.floor(totalScore * (0.3 + Math.random() * 0.4)),
      'BIGGEST_CATCH': Math.floor(totalScore * (0.2 + Math.random() * 0.4)),
      'SOCIAL_BUTTERFLY': Math.floor(totalScore * Math.random() * 0.3)
    };
    
    await prisma.seasonParticipant.upsert({
      where: {
        seasonId_userId: {
          seasonId: competitionId,
          userId: userId
        }
      },
      update: {
        totalScore: totalScore,
        categoryScores: categoryScores,
        lastActivityAt: new Date(),
        weeklyProgress: activities.filter(a => a.userId === userId)
      },
      create: {
        seasonId: competitionId,
        userId: userId,
        totalScore: totalScore,
        categoryScores: categoryScores,
        isActive: true,
        autoEnrolled: false,
        enrolledAt: new Date(),
        lastActivityAt: new Date(),
        weeklyProgress: activities.filter(a => a.userId === userId)
      }
    });
  }
  
  return {
    totalActivities: activities.length,
    participantsActive: participantCount,
    averageActivitiesPerUser: Math.round(activities.length / participantCount * 100) / 100,
    message: 'Realistic activity simulation completed'
  };
}

async function forceCompleteCompetition(competitionId: string) {
  console.log('⚡ Force completing competition for testing...');
  
  // Set competition end date to past
  await prisma.season.update({
    where: { id: competitionId },
    data: { 
      endDate: new Date(Date.now() - 1000),
      status: 'ACTIVE'
    }
  });
  
  // Run completion
  const completion = await testCompetitionCompletion(competitionId);
  
  return {
    ...completion,
    message: 'Competition force-completed successfully'
  };
}

async function comprehensiveCleanup() {
  console.log('🧹 Running comprehensive cleanup...');
  
  const cleanup = await cleanupDemoData();
  
  // Also cleanup any test reward distributions
  const deletedRewards = await prisma.rewardDistribution.deleteMany({
    where: {
      sourceId: { in: await prisma.season.findMany({ 
        where: { name: { startsWith: 'demo_' } },
        select: { id: true }
      }).then(seasons => seasons.map(s => s.id)) }
    }
  });
  
  // Cleanup test inventories
  const deletedInventory = await prisma.rewardInventory.deleteMany({
    where: {
      userId: { startsWith: 'demo-user-' }
    }
  });
  
  return {
    ...cleanup,
    deletedRewardDistributions: deletedRewards.count,
    deletedInventoryItems: deletedInventory.count,
    message: 'Comprehensive cleanup completed'
  };
}
