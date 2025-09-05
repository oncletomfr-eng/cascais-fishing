import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/services/email-service';

/**
 * Seasonal Competition Reward Distribution System
 * Task 21.4: Seasonal Competitions Backend
 * 
 * Handles comprehensive reward distribution for seasonal competitions:
 * - Tier-based rewards (placement rewards)
 * - Participation rewards 
 * - Category-specific rewards
 * - Achievement integration
 * - Badge integration
 * - Email notifications
 * - Real-time notifications via SSE
 */

interface RewardTier {
  place: number | number[]; // Single place or range [start, end]
  reward: string;
  type: 'badge' | 'trophy' | 'medal' | 'crown' | 'points' | 'experience' | 'title';
  value: number;
  category?: string; // Optional category-specific reward
  description?: string;
}

interface ParticipationReward {
  reward: string;
  type: 'badge' | 'points' | 'experience';
  value: number;
  minimumParticipation?: number; // Minimum participation percentage required
  description?: string;
}

interface CategoryReward {
  category: string;
  topPerformers: number; // How many top performers get rewards
  reward: string;
  type: 'badge' | 'points' | 'experience';
  value: number;
}

interface RewardDistributionResult {
  success: boolean;
  userId: string;
  rewardName: string;
  rewardType: string;
  rewardValue: number;
  distributionId?: string;
  error?: string;
}

interface RewardSummary {
  totalRewards: number;
  successfulDistributions: number;
  failedDistributions: number;
  rewardsByType: Record<string, number>;
  experienceDistributed: number;
  notificationsSent: number;
  errors: string[];
}

class SeasonalRewardDistributor {
  
  /**
   * Main reward distribution method for a completed season
   */
  public async distributeAllRewards(
    seasonId: string, 
    finalRankings: any[],
    seasonData: any
  ): Promise<RewardSummary> {
    console.log(`🎁 Starting reward distribution for season: ${seasonData.displayName}`);
    
    const results: RewardDistributionResult[] = [];
    const errors: string[] = [];
    
    try {
      // 1. Distribute tier-based rewards (placement rewards)
      const tierResults = await this.distributeTierRewards(
        seasonId, 
        finalRankings, 
        seasonData.rewards?.tiers || []
      );
      results.push(...tierResults);
      
      // 2. Distribute participation rewards
      const participationResults = await this.distributeParticipationRewards(
        seasonId, 
        finalRankings, 
        seasonData.rewards?.participation
      );
      results.push(...participationResults);
      
      // 3. Distribute category-specific rewards
      const categoryResults = await this.distributeCategoryRewards(
        seasonId, 
        finalRankings, 
        seasonData.rewards?.categories || []
      );
      results.push(...categoryResults);
      
      // 4. Distribute special achievements
      const achievementResults = await this.distributeSpecialAchievements(
        seasonId, 
        finalRankings, 
        seasonData
      );
      results.push(...achievementResults);
      
      // 5. Send notifications
      const notificationCount = await this.sendRewardNotifications(seasonId, results, seasonData);
      
      // 6. Update user statistics
      await this.updateUserStatistics(results);
      
      // 7. Create distribution summary
      const summary = this.createRewardSummary(results, errors, notificationCount);
      
      console.log(`✅ Reward distribution completed for ${seasonData.displayName}:
        - Total rewards: ${summary.totalRewards}
        - Successful: ${summary.successfulDistributions}
        - Failed: ${summary.failedDistributions}
        - Experience distributed: ${summary.experienceDistributed}
        - Notifications sent: ${summary.notificationsSent}`);
      
      return summary;
      
    } catch (error) {
      console.error(`❌ Error in reward distribution for season ${seasonId}:`, error);
      errors.push(error.message);
      return this.createRewardSummary(results, errors, 0);
    }
  }
  
  /**
   * Distribute tier-based rewards (placement rewards)
   */
  private async distributeTierRewards(
    seasonId: string,
    finalRankings: any[],
    tiers: RewardTier[]
  ): Promise<RewardDistributionResult[]> {
    const results: RewardDistributionResult[] = [];
    
    console.log(`🏆 Distributing tier rewards for ${tiers.length} tiers`);
    
    for (const tier of tiers) {
      const places = Array.isArray(tier.place) ? 
        this.expandPlaceRange(tier.place) : [tier.place];
      
      for (const place of places) {
        const participant = finalRankings.find(p => p.finalRank === place);
        
        if (participant) {
          const result = await this.grantReward(
            participant.userId,
            tier.reward,
            tier.type,
            tier.value,
            seasonId,
            `${tier.reward} - Place ${place}`,
            'TIER_REWARD'
          );
          results.push(result);
          
          // Also award related achievements if applicable
          if (place === 1) {
            await this.triggerAchievement(participant.userId, 'COMPETITION_WINNER');
          } else if (place <= 3) {
            await this.triggerAchievement(participant.userId, 'PODIUM_FINISHER');
          } else if (place <= 10) {
            await this.triggerAchievement(participant.userId, 'TOP_PERFORMER');
          }
        }
      }
    }
    
    return results;
  }
  
  /**
   * Distribute participation rewards
   */
  private async distributeParticipationRewards(
    seasonId: string,
    finalRankings: any[],
    participationReward: ParticipationReward | null
  ): Promise<RewardDistributionResult[]> {
    const results: RewardDistributionResult[] = [];
    
    if (!participationReward) {
      return results;
    }
    
    console.log(`🎖️ Distributing participation rewards to ${finalRankings.length} participants`);
    
    for (const participant of finalRankings) {
      // Check minimum participation if required
      if (participationReward.minimumParticipation) {
        const participationRate = this.calculateParticipationRate(participant);
        if (participationRate < participationReward.minimumParticipation) {
          continue;
        }
      }
      
      const result = await this.grantReward(
        participant.userId,
        participationReward.reward,
        participationReward.type,
        participationReward.value,
        seasonId,
        `${participationReward.reward} - Participation`,
        'PARTICIPATION_REWARD'
      );
      results.push(result);
      
      // Trigger participation achievement
      await this.triggerAchievement(participant.userId, 'COMPETITION_PARTICIPANT');
    }
    
    return results;
  }
  
  /**
   * Distribute category-specific rewards
   */
  private async distributeCategoryRewards(
    seasonId: string,
    finalRankings: any[],
    categoryRewards: CategoryReward[]
  ): Promise<RewardDistributionResult[]> {
    const results: RewardDistributionResult[] = [];
    
    console.log(`📊 Distributing category rewards for ${categoryRewards.length} categories`);
    
    for (const categoryReward of categoryRewards) {
      // Sort participants by category performance
      const categoryRankings = finalRankings
        .filter(p => p.categoryScores && p.categoryScores[categoryReward.category] > 0)
        .sort((a, b) => (b.categoryScores[categoryReward.category] || 0) - (a.categoryScores[categoryReward.category] || 0))
        .slice(0, categoryReward.topPerformers);
      
      for (const [index, participant] of categoryRankings.entries()) {
        const position = index + 1;
        const categoryScore = participant.categoryScores[categoryReward.category] || 0;
        
        const result = await this.grantReward(
          participant.userId,
          `${categoryReward.reward} - ${categoryReward.category}`,
          categoryReward.type,
          categoryReward.value,
          seasonId,
          `${categoryReward.category} Champion - Position ${position} (Score: ${categoryScore})`,
          'CATEGORY_REWARD'
        );
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * Distribute special achievements for exceptional performance
   */
  private async distributeSpecialAchievements(
    seasonId: string,
    finalRankings: any[],
    seasonData: any
  ): Promise<RewardDistributionResult[]> {
    const results: RewardDistributionResult[] = [];
    
    console.log('🌟 Distributing special achievement rewards');
    
    // Perfect Score Achievement
    const perfectScorers = finalRankings.filter(p => this.hasPerfectScore(p, seasonData));
    for (const participant of perfectScorers) {
      const result = await this.grantReward(
        participant.userId,
        'Perfect Score Master',
        'badge',
        200,
        seasonId,
        'Achieved perfect score in competition',
        'SPECIAL_ACHIEVEMENT'
      );
      results.push(result);
      await this.triggerAchievement(participant.userId, 'PERFECT_SCORE');
    }
    
    // Comeback King Achievement (improved rank significantly during competition)
    const comebackKings = finalRankings.filter(p => this.isSignificantImprovement(p));
    for (const participant of comebackKings) {
      const result = await this.grantReward(
        participant.userId,
        'Comeback King',
        'badge',
        150,
        seasonId,
        'Made significant rank improvement during competition',
        'SPECIAL_ACHIEVEMENT'
      );
      results.push(result);
      await this.triggerAchievement(participant.userId, 'COMEBACK_STORY');
    }
    
    // Consistency Master (high performance across all categories)
    const consistencyMasters = finalRankings.filter(p => this.hasConsistentPerformance(p));
    for (const participant of consistencyMasters) {
      const result = await this.grantReward(
        participant.userId,
        'Consistency Master',
        'badge',
        175,
        seasonId,
        'Demonstrated consistent high performance across all categories',
        'SPECIAL_ACHIEVEMENT'
      );
      results.push(result);
      await this.triggerAchievement(participant.userId, 'CONSISTENCY_KING');
    }
    
    return results;
  }
  
  /**
   * Grant a specific reward to a user
   */
  public async grantReward(
    userId: string,
    rewardName: string,
    rewardType: string,
    rewardValue: number,
    seasonId: string,
    reason: string,
    sourceType: string = 'SEASONAL_COMPETITION'
  ): Promise<RewardDistributionResult> {
    try {
      // Create reward distribution record
      const rewardDistribution = await prisma.rewardDistribution.create({
        data: {
          userId,
          sourceType: sourceType as any,
          sourceId: seasonId,
          reason,
          rewardDetails: {
            name: rewardName,
            type: rewardType,
            value: rewardValue
          },
          distributedAt: new Date()
        }
      });
      
      // Add to user's inventory for collectible items
      if (['badge', 'trophy', 'medal', 'crown', 'title'].includes(rewardType)) {
        await prisma.rewardInventory.create({
          data: {
            userId,
            rewardType: rewardType.toUpperCase() as any,
            rewardName,
            rewardValue: rewardValue,
            sourceType: sourceType as any,
            sourceId: seasonId,
            acquiredAt: new Date()
          }
        });
      }
      
      // Award experience points
      if (rewardType === 'points' || rewardType === 'experience' || rewardValue > 0) {
        await prisma.fisherProfile.upsert({
          where: { userId },
          update: {
            experiencePoints: { increment: rewardValue },
            lastActiveAt: new Date()
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
      
      // Update user statistics
      await this.updateRewardStatistics(userId, rewardType, rewardValue);
      
      console.log(`🎁 Granted "${rewardName}" (${rewardType}, ${rewardValue}pts) to user ${userId}`);
      
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
        rewardType,
        rewardValue,
        error: error.message
      };
    }
  }
  
  /**
   * Send reward notifications via email and real-time
   */
  private async sendRewardNotifications(
    seasonId: string,
    results: RewardDistributionResult[],
    seasonData: any
  ): Promise<number> {
    let notificationCount = 0;
    
    // Group results by user
    const userRewards = results
      .filter(r => r.success)
      .reduce((acc, result) => {
        if (!acc[result.userId]) {
          acc[result.userId] = [];
        }
        acc[result.userId].push(result);
        return acc;
      }, {} as Record<string, RewardDistributionResult[]>);
    
    // Send notifications to each user
    for (const [userId, rewards] of Object.entries(userRewards)) {
      try {
        // Real-time notification via SSE
        await this.sendRealTimeRewardNotification(userId, seasonData, rewards);
        
        // Email notification
        await this.sendRewardEmailNotification(userId, seasonData, rewards);
        
        notificationCount++;
      } catch (error) {
        console.error(`❌ Error sending notifications to user ${userId}:`, error);
      }
    }
    
    return notificationCount;
  }
  
  /**
   * Send real-time reward notification
   */
  private async sendRealTimeRewardNotification(
    userId: string,
    seasonData: any,
    rewards: RewardDistributionResult[]
  ) {
    try {
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'season_rewards_distributed',
          data: {
            seasonName: seasonData.displayName,
            seasonType: seasonData.type,
            rewards: rewards.map(r => ({
              name: r.rewardName,
              type: r.rewardType,
              value: r.rewardValue
            })),
            totalRewards: rewards.length,
            totalValue: rewards.reduce((sum, r) => sum + r.rewardValue, 0),
            distributedAt: new Date().toISOString()
          }
        })
      });
      
      if (response.ok) {
        console.log(`📢 Real-time reward notifications sent to user ${userId}`);
      }
    } catch (error) {
      console.error('❌ Error sending real-time reward notifications:', error);
    }
  }
  
  /**
   * Send email reward notification
   */
  private async sendRewardEmailNotification(
    userId: string,
    seasonData: any,
    rewards: RewardDistributionResult[]
  ) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });
      
      if (!user?.email) return;
      
      const totalValue = rewards.reduce((sum, r) => sum + r.rewardValue, 0);
      
      await sendEmail({
        to: user.email,
        template: 'season_rewards',
        data: {
          userName: user.name || 'Fisher',
          seasonName: seasonData.displayName,
          rewards: rewards.map(r => ({
            name: r.rewardName,
            type: r.rewardType,
            value: r.rewardValue,
          })),
          totalRewards: rewards.length,
          totalValue: totalValue,
        }
      });
      
      console.log(`📧 Reward email sent to ${user.email}`);
    } catch (error) {
      console.error(`❌ Error sending reward email to user ${userId}:`, error);
    }
  }
  
  /**
   * Trigger achievement for user
   */
  private async triggerAchievement(userId: string, achievementType: string) {
    try {
      const { achievementTracker } = await import('./achievement-tracker');
      await achievementTracker.trackAchievement(userId, achievementType, { notify: true });
    } catch (error) {
      console.error(`❌ Error triggering achievement ${achievementType} for user ${userId}:`, error);
    }
  }
  
  /**
   * Update reward statistics for user
   */
  private async updateRewardStatistics(userId: string, rewardType: string, rewardValue: number) {
    try {
      // Update user profile with reward statistics
      await prisma.userStatistics.upsert({
        where: { userId },
        update: {
          seasonalRewardsEarned: { increment: 1 },
          seasonalRewardValue: { increment: rewardValue },
          lastRewardEarned: new Date()
        },
        create: {
          userId,
          seasonalRewardsEarned: 1,
          seasonalRewardValue: rewardValue,
          lastRewardEarned: new Date()
        }
      });
    } catch (error) {
      console.error(`❌ Error updating reward statistics for user ${userId}:`, error);
    }
  }
  
  /**
   * Update user statistics after reward distribution
   */
  private async updateUserStatistics(results: RewardDistributionResult[]) {
    const successfulRewards = results.filter(r => r.success);
    
    for (const result of successfulRewards) {
      await this.updateRewardStatistics(result.userId, result.rewardType, result.rewardValue);
    }
  }
  
  // Helper methods
  
  private expandPlaceRange(places: number[]): number[] {
    if (places.length !== 2) return places;
    const [start, end] = places;
    const range = [];
    for (let i = start; i <= end; i++) {
      range.push(i);
    }
    return range;
  }
  
  private calculateParticipationRate(participant: any): number {
    // Calculate based on activity during competition
    // This is a simplified calculation - in reality, you'd track actual activity
    return participant.isActive ? 100 : 0;
  }
  
  private hasPerfectScore(participant: any, seasonData: any): boolean {
    const maxPossibleScore = seasonData.scoringRules?.categories 
      ? Object.values(seasonData.scoringRules.categories).reduce((sum: number, cat: any) => sum + cat.maxScore, 0)
      : 1000; // Default max score
    
    return participant.finalScore >= maxPossibleScore * 0.95; // 95% of max score
  }
  
  private isSignificantImprovement(participant: any): boolean {
    // Check if participant improved significantly during competition
    // This would require historical rank tracking
    return participant.positionChange && participant.positionChange < -5; // Improved by 5+ positions
  }
  
  private hasConsistentPerformance(participant: any): boolean {
    if (!participant.categoryScores) return false;
    
    const scores = Object.values(participant.categoryScores) as number[];
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    
    // Low variance indicates consistency
    return variance < (average * 0.2); // Variance less than 20% of average
  }
  
  private createRewardSummary(
    results: RewardDistributionResult[], 
    errors: string[], 
    notificationCount: number
  ): RewardSummary {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const rewardsByType = successful.reduce((acc, result) => {
      acc[result.rewardType] = (acc[result.rewardType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const experienceDistributed = successful.reduce((sum, result) => {
      return sum + (result.rewardType === 'experience' || result.rewardType === 'points' ? result.rewardValue : 0);
    }, 0);
    
    return {
      totalRewards: results.length,
      successfulDistributions: successful.length,
      failedDistributions: failed.length,
      rewardsByType,
      experienceDistributed,
      notificationsSent: notificationCount,
      errors
    };
  }
}

export const seasonalRewardDistributor = new SeasonalRewardDistributor();
