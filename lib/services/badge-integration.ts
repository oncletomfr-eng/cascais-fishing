/**
 * Badge Integration Service - Интеграция между Achievement и Badge системами
 * Task 21.2: Badge Award System Backend - Integration Layer
 * 
 * Автоматически присваивает badges при разблокировке достижений
 * и других событиях в системе
 */

interface BadgeAwardOptions {
  notify?: boolean;
  reason?: string;
  immediate?: boolean;
}

export class BadgeIntegration {
  private static instance: BadgeIntegration;

  private constructor() {}

  static getInstance(): BadgeIntegration {
    if (!BadgeIntegration.instance) {
      BadgeIntegration.instance = new BadgeIntegration();
    }
    return BadgeIntegration.instance;
  }

  /**
   * Проверяет и присваивает badges после разблокировки достижения
   */
  async checkBadgesAfterAchievement(userId: string, achievementType: string, options: BadgeAwardOptions = {}) {
    console.log(`🏆→🎖️ Checking badges after achievement: ${achievementType} for user ${userId}`);
    
    try {
      // Определяем специфичные badges для конкретных достижений
      const specificBadges = this.getSpecificBadgesForAchievement(achievementType);
      
      // Также проверяем общие achievement-count badges
      const generalBadges = [
        'First Achievement',
        'Achievement Hunter', 
        'Achievement Master',
        'Legend of the Seas'
      ];

      const badgesToCheck = [...specificBadges, ...generalBadges];
      
      if (badgesToCheck.length > 0) {
        return await this.awardBadges(userId, {
          checkAll: false,
          specificBadges: badgesToCheck,
          notify: options.notify !== false,
          reason: options.reason || `Achievement unlocked: ${achievementType}`
        });
      }

      return { success: true, badgesAwarded: 0 };
    } catch (error) {
      console.error(`❌ Error checking badges for achievement ${achievementType}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверяет и присваивает badges после завершения поездки
   */
  async checkBadgesAfterTripCompletion(userId: string, tripData: {
    tripId: string;
    locationType?: string;
    wasReliable?: boolean;
    fishCaught?: Array<{ species: string; isNewSpecies?: boolean }>;
    techniquesUsed?: string[];
  }, options: BadgeAwardOptions = {}) {
    console.log(`🚤→🎖️ Checking badges after trip completion for user ${userId}`);

    try {
      // Badges связанные с поездками
      const tripBadges = [
        'First Trip',
        'Regular Fisher',
        'Experienced Angler',
        'Sea Veteran'
      ];

      // Seasonal badges
      const seasonalBadges = [
        'Winter Fisher',
        'Summer Explorer'
      ];

      // Rating/reliability badges могут обновиться
      const qualityBadges = [
        'Highly Rated',
        'Perfect Rating',
        'Reliable Fisher'
      ];

      const badgesToCheck = [...tripBadges, ...seasonalBadges, ...qualityBadges];

      return await this.awardBadges(userId, {
        checkAll: false,
        specificBadges: badgesToCheck,
        notify: options.notify !== false,
        reason: options.reason || `Trip completed: ${tripData.tripId}`
      });
    } catch (error) {
      console.error(`❌ Error checking badges for trip completion:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Проверяет и присваивает badges после обновления профиля
   */
  async checkBadgesAfterProfileUpdate(userId: string, updates: {
    experienceLevel?: string;
    rating?: number;
    reliability?: number;
    completedTrips?: number;
  }, options: BadgeAwardOptions = {}) {
    console.log(`👤→🎖️ Checking badges after profile update for user ${userId}`);

    try {
      const profileBadges = [];

      // Experience level badges
      if (updates.experienceLevel) {
        profileBadges.push('Expert Angler');
      }

      // Rating badges
      if (updates.rating !== undefined) {
        profileBadges.push('Highly Rated', 'Perfect Rating');
      }

      // Reliability badges
      if (updates.reliability !== undefined) {
        profileBadges.push('Reliable Fisher');
      }

      // Trip count badges
      if (updates.completedTrips !== undefined) {
        profileBadges.push('First Trip', 'Regular Fisher', 'Experienced Angler', 'Sea Veteran');
      }

      if (profileBadges.length > 0) {
        return await this.awardBadges(userId, {
          checkAll: false,
          specificBadges: profileBadges,
          notify: options.notify !== false,
          reason: options.reason || 'Profile updated'
        });
      }

      return { success: true, badgesAwarded: 0 };
    } catch (error) {
      console.error(`❌ Error checking badges for profile update:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Выполняет полную проверку всех badges для пользователя
   */
  async performFullBadgeCheck(userId: string, options: BadgeAwardOptions = {}) {
    console.log(`🔄→🎖️ Performing full badge check for user ${userId}`);

    try {
      return await this.awardBadges(userId, {
        checkAll: true,
        notify: options.notify !== false,
        reason: options.reason || 'Full badge check'
      });
    } catch (error) {
      console.error(`❌ Error in full badge check:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Ручное присвоение конкретного badge
   */
  async awardSpecificBadge(userId: string, badgeName: string, reason?: string, options: BadgeAwardOptions = {}) {
    console.log(`🎖️ Manually awarding badge: ${badgeName} to user ${userId}`);

    try {
      const response = await fetch('/api/badges/award', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          badgeName,
          reason: reason || 'Manual award'
        })
      });

      const result = await response.json();

      if (!result.success) {
        console.error(`❌ Failed to award badge ${badgeName}:`, result.error);
        return { success: false, error: result.error };
      }

      console.log(`✅ Successfully awarded badge: ${badgeName}`);
      return {
        success: true,
        badge: result.badge,
        reason: result.reason
      };

    } catch (error) {
      console.error(`❌ Error awarding specific badge ${badgeName}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получает список специфичных badges для конкретного достижения
   */
  private getSpecificBadgesForAchievement(achievementType: string): string[] {
    const achievementToBadgeMap: Record<string, string[]> = {
      // Fish species achievements
      'TUNA_MASTER': ['Tuna Master Badge'],
      'MARLIN_LEGEND': ['Marlin Legend Badge'],
      'SPECIES_COLLECTOR': ['Species Collector Badge'],
      
      // Technique achievements
      'TROLLING_EXPERT': ['Technique Master Badge'],
      'JIGGING_MASTER': ['Technique Master Badge'],
      'FLY_FISHING_ARTIST': ['Technique Master Badge'],
      
      // Achievement combinations that unlock special badges
      'TECHNIQUE_VERSATILE': ['Technique Master Badge']
    };

    return achievementToBadgeMap[achievementType] || [];
  }

  /**
   * Внутренняя функция для вызова API присвоения badges
   */
  private async awardBadges(userId: string, params: {
    checkAll: boolean;
    specificBadges?: string[];
    notify: boolean;
    reason: string;
  }) {
    try {
      const response = await fetch('/api/badges/award', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          checkAll: params.checkAll,
          specificBadges: params.specificBadges,
          notify: params.notify
        })
      });

      const result = await response.json();

      if (!result.success) {
        console.error(`❌ Badge award failed:`, result.error);
        return { success: false, error: result.error };
      }

      console.log(`✅ Badge check completed: ${result.newlyAwarded} badges awarded`);
      return {
        success: true,
        badgesAwarded: result.newlyAwarded,
        badges: result.badges,
        reason: params.reason
      };

    } catch (error) {
      console.error(`❌ Error calling badge award API:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Получает статистику по badges пользователя
   */
  async getBadgeStats(userId: string) {
    try {
      const response = await fetch(`/api/badges/award?userId=${userId}`);
      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return {
        success: true,
        stats: result.stats,
        availableBadges: result.availableBadges,
        userBadges: result.userBadges
      };
    } catch (error) {
      console.error(`❌ Error getting badge stats:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Экспортируем singleton instance
export const badgeIntegration = BadgeIntegration.getInstance();

// Convenience функции для быстрого использования
export const checkBadgesAfterAchievement = (userId: string, achievementType: string, options?: BadgeAwardOptions) => 
  badgeIntegration.checkBadgesAfterAchievement(userId, achievementType, options);

export const checkBadgesAfterTripCompletion = (userId: string, tripData: Parameters<typeof badgeIntegration.checkBadgesAfterTripCompletion>[1], options?: BadgeAwardOptions) => 
  badgeIntegration.checkBadgesAfterTripCompletion(userId, tripData, options);

export const checkBadgesAfterProfileUpdate = (userId: string, updates: Parameters<typeof badgeIntegration.checkBadgesAfterProfileUpdate>[1], options?: BadgeAwardOptions) => 
  badgeIntegration.checkBadgesAfterProfileUpdate(userId, updates, options);

export const performFullBadgeCheck = (userId: string, options?: BadgeAwardOptions) => 
  badgeIntegration.performFullBadgeCheck(userId, options);

export const awardSpecificBadge = (userId: string, badgeName: string, reason?: string, options?: BadgeAwardOptions) => 
  badgeIntegration.awardSpecificBadge(userId, badgeName, reason, options);
