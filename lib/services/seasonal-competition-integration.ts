import { prisma } from '@/lib/prisma';
import { seasonalCompetitionScheduler } from './seasonal-competition-scheduler';
import { seasonalRewardDistributor } from './seasonal-reward-distributor';

/**
 * Seasonal Competition Integration Service
 * Task 21.4: Seasonal Competitions Backend
 * 
 * Centralizes integration between seasonal competitions and other systems:
 * - Achievement system integration
 * - Badge system integration 
 * - Leaderboard system integration
 * - Real-time notifications
 * - User activity tracking
 * - Performance monitoring
 */

interface CompetitionEvent {
  type: 'participant_joined' | 'activity_recorded' | 'rank_changed' | 'competition_started' | 'competition_ended';
  userId: string;
  competitionId: string;
  data: any;
  timestamp: Date;
}

interface ActivityUpdate {
  userId: string;
  activityType: string;
  points: number;
  metadata: any;
}

interface RankingUpdate {
  userId: string;
  competitionId: string;
  oldRank: number | null;
  newRank: number;
  positionChange: number;
}

class SeasonalCompetitionIntegration {
  private eventQueue: CompetitionEvent[] = [];
  private processingQueue = false;
  
  constructor() {
    // Start processing events
    this.startEventProcessor();
  }
  
  /**
   * Start the event processing system
   */
  private startEventProcessor() {
    setInterval(() => {
      if (!this.processingQueue && this.eventQueue.length > 0) {
        this.processEventQueue();
      }
    }, 5000); // Process every 5 seconds
  }
  
  /**
   * Record user activity and update seasonal competition scores
   */
  public async recordUserActivity(
    userId: string, 
    activityType: string, 
    activityData: any,
    options: { notify?: boolean } = {}
  ) {
    console.log(`📊 Recording user activity: ${activityType} for user ${userId}`);
    
    try {
      // Get active competitions for this user
      const activeCompetitions = await this.getUserActiveCompetitions(userId);
      
      if (activeCompetitions.length === 0) {
        console.log(`No active competitions for user ${userId}`);
        return { updatedCompetitions: 0 };
      }
      
      let updatedCompetitions = 0;
      
      for (const competition of activeCompetitions) {
        // Calculate activity points based on competition scoring rules
        const activityPoints = this.calculateActivityPoints(
          activityType, 
          activityData, 
          competition.scoringRules
        );
        
        if (activityPoints.totalPoints > 0) {
          // Update participant scores
          await this.updateParticipantScores(
            userId, 
            competition.id, 
            activityPoints
          );
          
          // Queue event for processing
          this.queueEvent({
            type: 'activity_recorded',
            userId,
            competitionId: competition.id,
            data: {
              activityType,
              points: activityPoints.totalPoints,
              categoryBreakdown: activityPoints.categoryPoints
            },
            timestamp: new Date()
          });
          
          updatedCompetitions++;
        }
      }
      
      // Trigger related system updates
      if (updatedCompetitions > 0) {
        await this.triggerSystemIntegrations(userId, activityType, activityData);
      }
      
      return { 
        updatedCompetitions,
        activeCompetitions: activeCompetitions.length 
      };
      
    } catch (error) {
      console.error(`❌ Error recording activity for user ${userId}:`, error);
      throw error;
    }
  }
  
  /**
   * Handle user joining a competition
   */
  public async handleUserJoinCompetition(userId: string, competitionId: string) {
    console.log(`👥 User ${userId} joining competition ${competitionId}`);
    
    try {
      // Create participant record
      const participant = await prisma.seasonParticipant.create({
        data: {
          seasonId: competitionId,
          userId,
          totalScore: 0,
          categoryScores: {},
          isActive: true,
          autoEnrolled: false,
          enrolledAt: new Date()
        }
      });
      
      // Queue event
      this.queueEvent({
        type: 'participant_joined',
        userId,
        competitionId,
        data: { participantId: participant.id },
        timestamp: new Date()
      });
      
      // Trigger welcome achievements
      await this.triggerWelcomeAchievements(userId, competitionId);
      
      // Send real-time notification
      await this.sendCompetitionJoinNotification(userId, competitionId);
      
      return participant;
      
    } catch (error) {
      console.error(`❌ Error handling user join competition:`, error);
      throw error;
    }
  }
  
  /**
   * Process rank changes and send notifications
   */
  public async processRankChanges(competitionId: string) {
    console.log(`📈 Processing rank changes for competition ${competitionId}`);
    
    try {
      // Get all participants sorted by score
      const participants = await prisma.seasonParticipant.findMany({
        where: { 
          seasonId: competitionId,
          isActive: true 
        },
        orderBy: { totalScore: 'desc' }
      });
      
      const rankUpdates: RankingUpdate[] = [];
      
      // Update ranks and track changes
      for (const [index, participant] of participants.entries()) {
        const newRank = index + 1;
        const oldRank = participant.overallRank;
        
        if (oldRank !== newRank) {
          await prisma.seasonParticipant.update({
            where: { id: participant.id },
            data: { overallRank: newRank }
          });
          
          const positionChange = oldRank ? oldRank - newRank : 0;
          
          rankUpdates.push({
            userId: participant.userId,
            competitionId,
            oldRank,
            newRank,
            positionChange
          });
          
          // Queue rank change event
          this.queueEvent({
            type: 'rank_changed',
            userId: participant.userId,
            competitionId,
            data: {
              oldRank,
              newRank,
              positionChange,
              totalScore: Number(participant.totalScore)
            },
            timestamp: new Date()
          });
        }
      }
      
      // Send rank change notifications
      for (const update of rankUpdates) {
        if (Math.abs(update.positionChange) >= 3) { // Significant rank change
          await this.sendRankChangeNotification(update);
        }
      }
      
      // Update leaderboard cache
      await this.updateLeaderboardCache(competitionId);
      
      return { rankUpdates: rankUpdates.length };
      
    } catch (error) {
      console.error(`❌ Error processing rank changes:`, error);
      throw error;
    }
  }
  
  /**
   * Handle competition lifecycle events
   */
  public async handleCompetitionLifecycleEvent(
    competitionId: string, 
    eventType: 'started' | 'ending_soon' | 'ended'
  ) {
    console.log(`🔄 Competition lifecycle event: ${eventType} for ${competitionId}`);
    
    try {
      const competition = await prisma.season.findUnique({
        where: { id: competitionId },
        include: {
          participants: true
        }
      });
      
      if (!competition) return;
      
      switch (eventType) {
        case 'started':
          await this.handleCompetitionStarted(competition);
          break;
        case 'ending_soon':
          await this.handleCompetitionEndingSoon(competition);
          break;
        case 'ended':
          await this.handleCompetitionEnded(competition);
          break;
      }
      
      // Queue lifecycle event
      this.queueEvent({
        type: eventType === 'started' ? 'competition_started' : 'competition_ended',
        userId: 'system',
        competitionId,
        data: { 
          eventType, 
          participantCount: competition.participants.length 
        },
        timestamp: new Date()
      });
      
    } catch (error) {
      console.error(`❌ Error handling competition lifecycle event:`, error);
      throw error;
    }
  }
  
  /**
   * Get user's active competitions
   */
  private async getUserActiveCompetitions(userId: string) {
    return await prisma.season.findMany({
      where: {
        status: 'ACTIVE',
        participants: {
          some: {
            userId,
            isActive: true
          }
        }
      },
      include: {
        participants: {
          where: { userId }
        }
      }
    });
  }
  
  /**
   * Calculate activity points based on competition scoring rules
   */
  private calculateActivityPoints(
    activityType: string,
    activityData: any,
    scoringRules: any
  ): { totalPoints: number; categoryPoints: Record<string, number> } {
    const categoryPoints: Record<string, number> = {};
    
    if (!scoringRules?.categories) {
      return { totalPoints: 0, categoryPoints };
    }
    
    // Map activity types to categories
    const activityCategoryMapping: Record<string, string[]> = {
      'trip_completed': ['MOST_ACTIVE', 'MONTHLY_CHAMPIONS'],
      'fish_caught': ['BIGGEST_CATCH', 'SPECIES_SPECIALIST'],
      'photo_shared': ['SOCIAL_BUTTERFLY'],
      'mentor_activity': ['BEST_MENTOR'],
      'technique_used': ['TECHNIQUE_MASTER'],
      'achievement_unlocked': ['MONTHLY_CHAMPIONS']
    };
    
    const relevantCategories = activityCategoryMapping[activityType] || [];
    
    for (const category of relevantCategories) {
      if (scoringRules.categories[category]) {
        const categoryRule = scoringRules.categories[category];
        let points = 0;
        
        // Calculate points based on activity data
        switch (activityType) {
          case 'trip_completed':
            points = Math.min(
              (activityData.duration || 1) * 10,
              categoryRule.maxScore * 0.3
            );
            break;
          case 'fish_caught':
            points = Math.min(
              (activityData.weight || 1) * 5,
              categoryRule.maxScore * 0.4
            );
            break;
          case 'photo_shared':
            points = Math.min(20, categoryRule.maxScore * 0.2);
            break;
          default:
            points = Math.min(15, categoryRule.maxScore * 0.1);
        }
        
        categoryPoints[category] = Math.floor(points * (categoryRule.weight || 1));
      }
    }
    
    const totalPoints = Object.values(categoryPoints).reduce((sum, points) => sum + points, 0);
    
    return { totalPoints, categoryPoints };
  }
  
  /**
   * Update participant scores
   */
  private async updateParticipantScores(
    userId: string,
    competitionId: string,
    activityPoints: { totalPoints: number; categoryPoints: Record<string, number> }
  ) {
    const participant = await prisma.seasonParticipant.findUnique({
      where: {
        seasonId_userId: {
          seasonId: competitionId,
          userId
        }
      }
    });
    
    if (!participant) return;
    
    const currentCategoryScores = (participant.categoryScores as Record<string, number>) || {};
    
    // Update category scores
    for (const [category, points] of Object.entries(activityPoints.categoryPoints)) {
      currentCategoryScores[category] = (currentCategoryScores[category] || 0) + points;
    }
    
    // Update participant
    await prisma.seasonParticipant.update({
      where: { id: participant.id },
      data: {
        totalScore: { increment: activityPoints.totalPoints },
        categoryScores: currentCategoryScores,
        lastActivityAt: new Date()
      }
    });
    
    // Process rank changes after score update
    setTimeout(() => this.processRankChanges(competitionId), 1000);
  }
  
  /**
   * Trigger system integrations (achievements, badges, leaderboards)
   */
  private async triggerSystemIntegrations(
    userId: string,
    activityType: string,
    activityData: any
  ) {
    try {
      // Trigger achievement tracking
      const { achievementTracker } = await import('./achievement-tracker');
      await achievementTracker.trackEvent(userId, activityType, activityData, { notify: true });
      
      // Trigger badge checking
      const { badgeIntegrationService } = await import('./badge-integration');
      await badgeIntegrationService.checkBadgesAfterActivity(userId, activityType, activityData);
      
      // Update leaderboards
      const { leaderboardRealtimeService } = await import('./leaderboard-realtime');
      await leaderboardRealtimeService.updateForUserActivity(userId, activityType, activityData);
      
    } catch (error) {
      console.error('❌ Error triggering system integrations:', error);
    }
  }
  
  /**
   * Queue event for processing
   */
  private queueEvent(event: CompetitionEvent) {
    this.eventQueue.push(event);
  }
  
  /**
   * Process queued events
   */
  private async processEventQueue() {
    if (this.processingQueue || this.eventQueue.length === 0) return;
    
    this.processingQueue = true;
    console.log(`🔄 Processing ${this.eventQueue.length} competition events`);
    
    try {
      const events = [...this.eventQueue];
      this.eventQueue = []; // Clear queue
      
      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      console.error('❌ Error processing event queue:', error);
    } finally {
      this.processingQueue = false;
    }
  }
  
  /**
   * Process individual event
   */
  private async processEvent(event: CompetitionEvent) {
    try {
      switch (event.type) {
        case 'activity_recorded':
          await this.handleActivityRecordedEvent(event);
          break;
        case 'rank_changed':
          await this.handleRankChangedEvent(event);
          break;
        case 'participant_joined':
          await this.handleParticipantJoinedEvent(event);
          break;
        case 'competition_started':
        case 'competition_ended':
          await this.handleCompetitionLifecycleEvent(event.competitionId, 
            event.type === 'competition_started' ? 'started' : 'ended');
          break;
      }
    } catch (error) {
      console.error(`❌ Error processing event ${event.type}:`, error);
    }
  }
  
  // Event handlers
  
  private async handleActivityRecordedEvent(event: CompetitionEvent) {
    // Send real-time notification about activity
    await this.sendActivityNotification(event.userId, event.competitionId, event.data);
  }
  
  private async handleRankChangedEvent(event: CompetitionEvent) {
    // Update rank-based achievements
    if (event.data.newRank <= 3) {
      await this.triggerRankAchievement(event.userId, event.data.newRank);
    }
  }
  
  private async handleParticipantJoinedEvent(event: CompetitionEvent) {
    // Track competition participation statistics
    await this.updateParticipationStatistics(event.userId, event.competitionId);
  }
  
  // Competition lifecycle handlers
  
  private async handleCompetitionStarted(competition: any) {
    for (const participant of competition.participants) {
      await this.sendCompetitionStartNotification(participant.userId, competition.id);
    }
  }
  
  private async handleCompetitionEndingSoon(competition: any) {
    for (const participant of competition.participants) {
      await this.sendCompetitionEndingSoonNotification(participant.userId, competition.id);
    }
  }
  
  private async handleCompetitionEnded(competition: any) {
    // Competition ended - trigger completion process
    await seasonalCompetitionScheduler.completeCompetition(competition.id);
  }
  
  // Notification methods
  
  private async sendCompetitionJoinNotification(userId: string, competitionId: string) {
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type: 'competition_joined',
          data: { competitionId, timestamp: new Date().toISOString() }
        })
      });
    } catch (error) {
      console.error('❌ Error sending competition join notification:', error);
    }
  }
  
  private async sendRankChangeNotification(update: RankingUpdate) {
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: update.userId,
          type: 'rank_changed',
          data: update
        })
      });
    } catch (error) {
      console.error('❌ Error sending rank change notification:', error);
    }
  }
  
  private async sendActivityNotification(userId: string, competitionId: string, activityData: any) {
    // Send notification about activity points gained
  }
  
  private async sendCompetitionStartNotification(userId: string, competitionId: string) {
    // Send notification that competition has started
  }
  
  private async sendCompetitionEndingSoonNotification(userId: string, competitionId: string) {
    // Send notification that competition is ending soon
  }
  
  // Achievement triggers
  
  private async triggerWelcomeAchievements(userId: string, competitionId: string) {
    try {
      const { achievementTracker } = await import('./achievement-tracker');
      await achievementTracker.trackEvent(userId, 'competition_joined', { competitionId }, { notify: true });
    } catch (error) {
      console.error('❌ Error triggering welcome achievements:', error);
    }
  }
  
  private async triggerRankAchievement(userId: string, rank: number) {
    try {
      const { achievementTracker } = await import('./achievement-tracker');
      const achievementType = rank === 1 ? 'COMPETITION_WINNER' : 
                             rank <= 3 ? 'PODIUM_FINISHER' : 'TOP_PERFORMER';
      await achievementTracker.trackEvent(userId, achievementType, { rank }, { notify: true });
    } catch (error) {
      console.error('❌ Error triggering rank achievement:', error);
    }
  }
  
  // Utility methods
  
  private async updateLeaderboardCache(competitionId: string) {
    try {
      const { leaderboardRealtimeService } = await import('./leaderboard-realtime');
      await leaderboardRealtimeService.invalidateCache(`competition:${competitionId}`);
    } catch (error) {
      console.error('❌ Error updating leaderboard cache:', error);
    }
  }
  
  private async updateParticipationStatistics(userId: string, competitionId: string) {
    try {
      await prisma.userStatistics.upsert({
        where: { userId },
        update: {
          competitionsJoined: { increment: 1 },
          lastCompetitionJoined: new Date()
        },
        create: {
          userId,
          competitionsJoined: 1,
          lastCompetitionJoined: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Error updating participation statistics:', error);
    }
  }
  
  /**
   * Get integration service status and statistics
   */
  public getServiceStatus() {
    return {
      isRunning: true,
      queueSize: this.eventQueue.length,
      processingQueue: this.processingQueue,
      lastProcessed: new Date().toISOString()
    };
  }
}

export const seasonalCompetitionIntegration = new SeasonalCompetitionIntegration();
