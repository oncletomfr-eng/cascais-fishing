/**
 * Real-Time Leaderboard Service
 * Task 21.3: Leaderboard Engine Backend - Real-time updates and caching
 * 
 * Manages real-time leaderboard updates, caching, and performance optimization
 */

interface LeaderboardCache {
  data: any[];
  generatedAt: Date;
  expiresAt: Date;
  category: string;
  algorithm: string;
  metadata: any;
}

interface LeaderboardUpdateEvent {
  userId: string;
  eventType: 'achievement_unlocked' | 'badge_awarded' | 'trip_completed' | 'rating_updated' | 'experience_gained';
  data: any;
  affectedCategories: string[];
}

export class LeaderboardRealtimeService {
  private static instance: LeaderboardRealtimeService;
  private cache: Map<string, LeaderboardCache> = new Map();
  private updateQueue: LeaderboardUpdateEvent[] = [];
  private isProcessing = false;
  private lastFullRecalculation = new Date(0);
  
  // Cache configuration
  private readonly CACHE_TTL = {
    'composite': 5 * 60 * 1000,      // 5 minutes
    'rating': 10 * 60 * 1000,        // 10 minutes
    'activity': 2 * 60 * 1000,       // 2 minutes
    'achievements': 5 * 60 * 1000,   // 5 minutes
    'seasonal': 1 * 60 * 1000,       // 1 minute
    'specialized': 15 * 60 * 1000    // 15 minutes
  };

  private constructor() {
    // Start background processes
    this.startBackgroundTasks();
  }

  static getInstance(): LeaderboardRealtimeService {
    if (!LeaderboardRealtimeService.instance) {
      LeaderboardRealtimeService.instance = new LeaderboardRealtimeService();
    }
    return LeaderboardRealtimeService.instance;
  }

  /**
   * Get cached leaderboard or generate if expired
   */
  async getLeaderboard(params: {
    category: string;
    algorithm: string;
    timeframe: string;
    limit: number;
    bypass_cache?: boolean;
  }) {
    const cacheKey = this.generateCacheKey(params);
    
    // Check cache first
    if (!params.bypass_cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        console.log(`📊 Serving cached leaderboard: ${cacheKey}`);
        return {
          fromCache: true,
          ...cached
        };
      }
    }

    // Generate fresh leaderboard
    console.log(`🔄 Generating fresh leaderboard: ${cacheKey}`);
    const freshData = await this.generateLeaderboard(params);
    
    // Cache the result
    const ttl = this.CACHE_TTL[params.algorithm] || this.CACHE_TTL['composite'];
    const cacheEntry: LeaderboardCache = {
      data: freshData.leaderboard,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + ttl),
      category: params.category,
      algorithm: params.algorithm,
      metadata: freshData.metadata
    };
    
    this.cache.set(cacheKey, cacheEntry);
    
    return {
      fromCache: false,
      ...freshData
    };
  }

  /**
   * Queue a leaderboard update event
   */
  async queueUpdate(event: LeaderboardUpdateEvent) {
    console.log(`🔄 Queueing leaderboard update: ${event.eventType} for user ${event.userId}`);
    
    this.updateQueue.push(event);
    
    // Invalidate affected caches immediately
    this.invalidateAffectedCaches(event);
    
    // Process queue asynchronously
    if (!this.isProcessing) {
      setImmediate(() => this.processUpdateQueue());
    }
    
    // Send real-time notifications about leaderboard changes
    await this.sendLeaderboardUpdateNotifications(event);
  }

  /**
   * Process queued leaderboard updates
   */
  private async processUpdateQueue() {
    if (this.isProcessing || this.updateQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing ${this.updateQueue.length} leaderboard updates`);

    try {
      // Group events by user and category for efficient processing
      const userEvents = new Map<string, LeaderboardUpdateEvent[]>();
      
      while (this.updateQueue.length > 0) {
        const event = this.updateQueue.shift()!;
        
        if (!userEvents.has(event.userId)) {
          userEvents.set(event.userId, []);
        }
        userEvents.get(event.userId)!.push(event);
      }

      // Process updates for each user
      for (const [userId, events] of userEvents.entries()) {
        await this.processUserUpdates(userId, events);
      }

      console.log(`✅ Processed leaderboard updates for ${userEvents.size} users`);

    } catch (error) {
      console.error('❌ Error processing leaderboard updates:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process leaderboard updates for a specific user
   */
  private async processUserUpdates(userId: string, events: LeaderboardUpdateEvent[]) {
    try {
      // Determine which categories need updates
      const affectedCategories = new Set<string>();
      
      events.forEach(event => {
        event.affectedCategories.forEach(category => {
          affectedCategories.add(category);
        });
      });

      // Check if user's position changed significantly
      const positionChanges = await this.calculatePositionChanges(userId, Array.from(affectedCategories));
      
      // If significant changes, trigger real-time updates
      if (positionChanges.hasSignificantChange) {
        await this.broadcastPositionChanges(userId, positionChanges);
      }

    } catch (error) {
      console.error(`❌ Error processing updates for user ${userId}:`, error);
    }
  }

  /**
   * Calculate position changes for a user across categories
   */
  private async calculatePositionChanges(userId: string, categories: string[]) {
    const changes: any = {
      userId,
      categories: {},
      hasSignificantChange: false
    };

    for (const category of categories) {
      try {
        // Get fresh position (would need to call leaderboard engine)
        // For now, simulate position calculation
        const oldPosition = this.getLastKnownPosition(userId, category);
        const newPosition = await this.calculateCurrentPosition(userId, category);
        
        if (oldPosition && Math.abs(newPosition - oldPosition) >= 3) {
          changes.hasSignificantChange = true;
        }
        
        changes.categories[category] = {
          oldPosition,
          newPosition,
          change: oldPosition ? (oldPosition - newPosition) : 0,
          direction: oldPosition ? (newPosition < oldPosition ? 'up' : newPosition > oldPosition ? 'down' : 'stable') : 'new'
        };

        // Update last known position
        this.updateLastKnownPosition(userId, category, newPosition);

      } catch (error) {
        console.error(`❌ Error calculating position change for ${userId} in ${category}:`, error);
      }
    }

    return changes;
  }

  /**
   * Generate fresh leaderboard data (calls the engine)
   */
  private async generateLeaderboard(params: any) {
    try {
      // Build query string
      const queryParams = new URLSearchParams({
        category: params.category,
        algorithm: params.algorithm,
        timeframe: params.timeframe,
        limit: params.limit.toString(),
        realTime: 'true'
      });

      // Call our own API endpoint
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/leaderboard/engine?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate leaderboard');
      }

      return data;

    } catch (error) {
      console.error('❌ Error generating fresh leaderboard:', error);
      throw error;
    }
  }

  /**
   * Invalidate caches affected by an update event
   */
  private invalidateAffectedCaches(event: LeaderboardUpdateEvent) {
    const keysToInvalidate: string[] = [];
    
    // Find cache keys that might be affected
    for (const [key, cached] of this.cache.entries()) {
      // Invalidate if any affected category matches
      if (event.affectedCategories.some(category => key.includes(category))) {
        keysToInvalidate.push(key);
      }
      
      // Also invalidate composite scores (affected by most events)
      if (key.includes('composite')) {
        keysToInvalidate.push(key);
      }
    }
    
    // Remove invalidated cache entries
    keysToInvalidate.forEach(key => {
      this.cache.delete(key);
      console.log(`🗑️ Invalidated cache: ${key}`);
    });
  }

  /**
   * Send real-time notifications about leaderboard changes
   */
  private async sendLeaderboardUpdateNotifications(event: LeaderboardUpdateEvent) {
    try {
      // Send SSE notification about leaderboard update
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: event.userId,
          type: 'leaderboard_update',
          data: {
            eventType: event.eventType,
            affectedCategories: event.affectedCategories,
            timestamp: new Date().toISOString()
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`📢 Leaderboard update notification sent: ${result.sent} connections`);
      }

    } catch (error) {
      console.error('❌ Error sending leaderboard update notifications:', error);
    }
  }

  /**
   * Broadcast significant position changes to affected users
   */
  private async broadcastPositionChanges(userId: string, changes: any) {
    try {
      // Notify the user about their position changes
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          type: 'position_change',
          data: {
            positionChanges: changes,
            timestamp: new Date().toISOString()
          }
        })
      });

      console.log(`📈 Position change broadcast sent for user ${userId}`);

    } catch (error) {
      console.error('❌ Error broadcasting position changes:', error);
    }
  }

  /**
   * Start background maintenance tasks
   */
  private startBackgroundTasks() {
    // Cache cleanup every 10 minutes
    setInterval(() => {
      this.cleanExpiredCache();
    }, 10 * 60 * 1000);

    // Full recalculation every hour
    setInterval(() => {
      this.scheduleFullRecalculation();
    }, 60 * 60 * 1000);

    // Process update queue every 30 seconds if not already processing
    setInterval(() => {
      if (!this.isProcessing && this.updateQueue.length > 0) {
        this.processUpdateQueue();
      }
    }, 30 * 1000);

    console.log('🔄 Leaderboard background tasks started');
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache() {
    const now = new Date();
    let cleanedCount = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Schedule full leaderboard recalculation
   */
  private async scheduleFullRecalculation() {
    const hoursSinceLastRecalc = (Date.now() - this.lastFullRecalculation.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastRecalc >= 1) {
      console.log('🔄 Scheduling full leaderboard recalculation');
      
      // Clear all cache
      this.cache.clear();
      this.lastFullRecalculation = new Date();
      
      // Trigger recalculation via API
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/leaderboard/engine`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'recalculate'
          })
        });
      } catch (error) {
        console.error('❌ Error triggering recalculation:', error);
      }
    }
  }

  // Helper methods for position tracking (would be implemented with database)
  private getLastKnownPosition(userId: string, category: string): number | null {
    // Would fetch from database - for now return null
    return null;
  }

  private async calculateCurrentPosition(userId: string, category: string): Promise<number> {
    // Would calculate fresh position - for now return random
    return Math.floor(Math.random() * 100) + 1;
  }

  private updateLastKnownPosition(userId: string, category: string, position: number) {
    // Would update database - for now just log
    console.log(`📊 Position updated: User ${userId} in ${category} -> Position ${position}`);
  }

  /**
   * Generate cache key for leaderboard parameters
   */
  private generateCacheKey(params: any): string {
    return `lb:${params.category}:${params.algorithm}:${params.timeframe}:${params.limit}`;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    const now = new Date();
    let activeEntries = 0;
    let expiredEntries = 0;
    
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt > now) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      activeEntries,
      expiredEntries,
      queueSize: this.updateQueue.length,
      isProcessing: this.isProcessing,
      lastFullRecalculation: this.lastFullRecalculation
    };
  }

  /**
   * Manual cache clear (for admin/testing)
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Leaderboard cache manually cleared');
  }
}

// Export singleton instance
export const leaderboardRealtime = LeaderboardRealtimeService.getInstance();

// Convenience functions for integration with other systems
export const updateLeaderboardForAchievement = async (userId: string, achievementType: string) => {
  await leaderboardRealtime.queueUpdate({
    userId,
    eventType: 'achievement_unlocked',
    data: { achievementType },
    affectedCategories: ['composite', 'achievements', 'achievement_hunter', 'seasonal']
  });
};

export const updateLeaderboardForBadge = async (userId: string, badgeName: string, rarity: string) => {
  await leaderboardRealtime.queueUpdate({
    userId,
    eventType: 'badge_awarded',
    data: { badgeName, rarity },
    affectedCategories: ['composite', 'achievements', 'achievement_hunter']
  });
};

export const updateLeaderboardForTrip = async (userId: string, tripData: any) => {
  await leaderboardRealtime.queueUpdate({
    userId,
    eventType: 'trip_completed',
    data: tripData,
    affectedCategories: ['composite', 'activity', 'trip_expert', 'fish_master', 'seasonal']
  });
};

export const updateLeaderboardForExperience = async (userId: string, experienceGained: number) => {
  await leaderboardRealtime.queueUpdate({
    userId,
    eventType: 'experience_gained',
    data: { experienceGained },
    affectedCategories: ['composite', 'seasonal']
  });
};

export const updateLeaderboardForRating = async (userId: string, newRating: number, oldRating: number) => {
  await leaderboardRealtime.queueUpdate({
    userId,
    eventType: 'rating_updated',
    data: { newRating, oldRating },
    affectedCategories: ['composite', 'rating', 'mentor']
  });
};
