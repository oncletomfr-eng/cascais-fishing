import { prisma } from '@/lib/prisma';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  addWeeks, addMonths, addDays, format, isBefore, isAfter
} from 'date-fns';

/**
 * Automated Seasonal Competition Scheduler Service
 * Task 21.4: Seasonal Competitions Backend
 */

class SeasonalCompetitionScheduler {
  private isRunning = false;
  
  /**
   * Start the automated scheduler
   */
  public startScheduler() {
    if (this.isRunning) {
      console.log('📅 Seasonal competition scheduler already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🚀 Starting seasonal competition scheduler...');
    
    // Run immediately
    this.runMaintenanceCycle();
    
    // Schedule periodic runs every hour
    setInterval(() => {
      this.runMaintenanceCycle();
    }, 60 * 60 * 1000);
  }
  
  /**
   * Run full maintenance cycle
   */
  public async runMaintenanceCycle() {
    console.log('🔄 Running seasonal competition maintenance cycle...');
    
    try {
      const statusUpdates = await this.updateCompetitionStatuses();
      const createdCompetitions = await this.autoCreateCompetitions();
      const completedCompetitions = await this.autoCompleteCompetitions();
      
      console.log(`✅ Maintenance cycle complete:
        - Status updates: ${statusUpdates}
        - Created competitions: ${createdCompetitions}  
        - Completed competitions: ${completedCompetitions}`);
      
    } catch (error) {
      console.error('❌ Error in maintenance cycle:', error);
    }
  }
  
  /**
   * Update competition statuses
   */
  public async updateCompetitionStatuses(): Promise<number> {
    const now = new Date();
    let updatedCount = 0;
    
    // Update upcoming to active
    const activatedResult = await prisma.season.updateMany({
      where: {
        status: 'UPCOMING',
        startDate: { lte: now }
      },
      data: { status: 'ACTIVE' }
    });
    
    updatedCount += activatedResult.count;
    
    return updatedCount;
  }
  
  /**
   * Auto-create new competitions
   */
  public async autoCreateCompetitions(): Promise<number> {
    let createdCount = 0;
    
    try {
      createdCount += await this.createWeeklyCompetitions();
      createdCount += await this.createMonthlyCompetitions();
    } catch (error) {
      console.error('❌ Error auto-creating competitions:', error);
    }
    
    return createdCount;
  }
  
  /**
   * Create weekly competitions
   */
  private async createWeeklyCompetitions(): Promise<number> {
    const now = new Date();
    let createdCount = 0;
    
    // Create next 2 weeks
    for (let i = 1; i <= 2; i++) {
      const weekStart = startOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(addWeeks(now, i), { weekStartsOn: 1 });
      const weekName = `week_${format(weekStart, 'yyyy_MM_dd')}`;
      
      const existing = await prisma.season.findUnique({
        where: { name: weekName }
      });
      
      if (!existing) {
        await prisma.season.create({
          data: {
            name: weekName,
            displayName: `Weekly Challenge - ${format(weekStart, 'MMM dd')}`,
            description: `Weekly fishing challenge`,
            type: 'WEEKLY',
            status: 'UPCOMING',
            startDate: weekStart,
            endDate: weekEnd,
            registrationStartDate: addDays(weekStart, -3),
            registrationEndDate: addDays(weekStart, -1),
            includedCategories: ['MOST_ACTIVE', 'BIGGEST_CATCH'],
            autoEnroll: false,
            isPublic: true,
            maxParticipants: 50,
            minParticipants: 5,
            rewards: {
              tiers: [
                { place: 1, reward: 'Weekly Champion Badge', type: 'badge', value: 100 }
              ]
            },
            scoringRules: {
              categories: {
                'MOST_ACTIVE': { weight: 0.5, maxScore: 100 },
                'BIGGEST_CATCH': { weight: 0.5, maxScore: 100 }
              }
            }
          }
        });
        createdCount++;
      }
    }
    
    return createdCount;
  }
  
  /**
   * Create monthly competitions
   */
  private async createMonthlyCompetitions(): Promise<number> {
    const now = new Date();
    const nextMonth = addMonths(now, 1);
    const monthStart = startOfMonth(nextMonth);
    const monthEnd = endOfMonth(nextMonth);
    const monthName = `month_${format(nextMonth, 'yyyy_MM')}`;
    
    const existing = await prisma.season.findUnique({
      where: { name: monthName }
    });
    
    if (!existing) {
      await prisma.season.create({
        data: {
          name: monthName,
          displayName: `${format(nextMonth, 'MMMM yyyy')} Championship`,
          description: `Monthly fishing championship`,
          type: 'MONTHLY',
          status: 'UPCOMING',
          startDate: monthStart,
          endDate: monthEnd,
          registrationStartDate: addDays(monthStart, -7),
          registrationEndDate: addDays(monthStart, -1),
          includedCategories: ['MONTHLY_CHAMPIONS', 'MOST_ACTIVE', 'BIGGEST_CATCH'],
          autoEnroll: false,
          isPublic: true,
          maxParticipants: 200,
          minParticipants: 20,
          rewards: {
            tiers: [
              { place: 1, reward: 'Monthly Champion Trophy', type: 'trophy', value: 500 },
              { place: 2, reward: 'Monthly Silver Medal', type: 'medal', value: 300 }
            ]
          },
          scoringRules: {
            categories: {
              'MONTHLY_CHAMPIONS': { weight: 0.4, maxScore: 200 },
              'MOST_ACTIVE': { weight: 0.3, maxScore: 200 },
              'BIGGEST_CATCH': { weight: 0.3, maxScore: 200 }
            }
          }
        }
      });
      return 1;
    }
    
    return 0;
  }
  
  /**
   * Auto-complete ended competitions
   */
  public async autoCompleteCompetitions(): Promise<number> {
    const now = new Date();
    
    const endedCompetitions = await prisma.season.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: now }
      }
    });
    
    let completedCount = 0;
    
    for (const competition of endedCompetitions) {
      try {
        await this.completeCompetition(competition.id);
        completedCount++;
      } catch (error) {
        console.error(`❌ Error completing competition ${competition.id}:`, error);
      }
    }
    
    return completedCount;
  }
  
  /**
   * Complete a competition
   */
  public async completeCompetition(seasonId: string) {
    console.log(`🏁 Completing competition: ${seasonId}`);
    
    // Get competition with participants
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        participants: {
          include: { user: true },
          orderBy: { totalScore: 'desc' }
        }
      }
    });
    
    if (!season) return;
    
    // Calculate final rankings
    const participants = season.participants.map((p, index) => ({
      ...p,
      finalRank: index + 1,
      finalScore: Number(p.totalScore)
    }));
    
    // Distribute rewards
    await this.distributeRewards(season, participants);
    
    // Archive the season
    await prisma.seasonArchive.create({
      data: {
        seasonId: season.id,
        seasonName: season.displayName,
        seasonType: season.type as any,
        startDate: season.startDate,
        endDate: season.endDate,
        finalRankings: participants,
        participantCount: participants.length,
        archivedAt: new Date()
      }
    });
    
    // Update status
    await prisma.season.update({
      where: { id: seasonId },
      data: { status: 'COMPLETED' }
    });
    
    console.log(`✅ Competition completed: ${season.displayName}`);
  }
  
  /**
   * Distribute rewards to winners
   */
  private async distributeRewards(season: any, participants: any[]) {
    const rewards = season.rewards?.tiers || [];
    
    for (const tier of rewards) {
      const places = Array.isArray(tier.place) ? tier.place : [tier.place];
      
      for (const place of places) {
        if (place <= participants.length) {
          const participant = participants[place - 1];
          
          try {
            await this.grantReward(
              participant.userId,
              tier.reward,
              tier.type,
              tier.value,
              season.id
            );
          } catch (error) {
            console.error(`❌ Error granting reward to ${participant.userId}:`, error);
          }
        }
      }
    }
  }
  
  /**
   * Grant reward to user
   */
  private async grantReward(
    userId: string, 
    rewardName: string, 
    rewardType: string, 
    rewardValue: number, 
    seasonId: string
  ) {
    // Award experience points
    if (rewardValue > 0) {
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
    
    console.log(`🎁 Granted ${rewardName} to user ${userId}`);
  }
  
  /**
   * Get scheduler status
   */
  public async getSchedulerStatus() {
    const stats = await prisma.season.groupBy({
      by: ['status'],
      _count: { id: true }
    });
    
    return {
      isRunning: this.isRunning,
      statistics: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {} as Record<string, number>),
      lastRun: new Date().toISOString()
    };
  }
}

export const seasonalCompetitionScheduler = new SeasonalCompetitionScheduler();
