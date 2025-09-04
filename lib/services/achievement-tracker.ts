/**
 * Achievement Tracker Service - Автоматическое отслеживание достижений
 * Task 21.1: Achievement Progress Tracking API - Service Layer
 * 
 * Предоставляет простой интерфейс для автоматического отслеживания достижений
 * из любого места в приложении
 */

import { AchievementTrigger } from '@/lib/types/achievements';

interface TrackingOptions {
  notify?: boolean;
  immediate?: boolean; // Для синхронного vs асинхронного выполнения
}

export class AchievementTracker {
  private static instance: AchievementTracker;
  private trackingQueue: AchievementTrigger[] = [];
  private isProcessing = false;

  private constructor() {}

  static getInstance(): AchievementTracker {
    if (!AchievementTracker.instance) {
      AchievementTracker.instance = new AchievementTracker();
    }
    return AchievementTracker.instance;
  }

  /**
   * Отслеживает завершение поездки и связанные достижения
   */
  async trackTripCompleted(userId: string, tripData: {
    tripId: string;
    locationType?: 'reef' | 'deep_sea' | 'coastal';
    wasReliable?: boolean;
    techniquesUsed?: string[];
    fishCaught?: Array<{
      species: string;
      isNewSpecies?: boolean;
    }>;
    isNewLocation?: boolean;
    locationId?: string;
  }, options: TrackingOptions = {}) {
    
    console.log(`🎯 Tracking trip completion for user ${userId}`);
    
    const triggers: AchievementTrigger[] = [];
    
    // Основное событие завершения поездки
    triggers.push({
      event: 'trip_completed',
      userId,
      data: {
        tripId: tripData.tripId,
        locationType: tripData.locationType,
        wasReliable: tripData.wasReliable,
        isNewLocation: tripData.isNewLocation,
        locationId: tripData.locationId
      }
    });

    // Отслеживаем каждую пойманную рыбу
    if (tripData.fishCaught) {
      for (const fish of tripData.fishCaught) {
        triggers.push({
          event: 'fish_caught',
          userId,
          data: {
            fishSpecies: fish.species,
            isNewSpecies: fish.isNewSpecies,
            tripId: tripData.tripId
          }
        });
      }
    }

    // Отслеживаем использованные техники
    if (tripData.techniquesUsed) {
      const uniqueTechniques = [...new Set(tripData.techniquesUsed)];
      for (const technique of uniqueTechniques) {
        triggers.push({
          event: 'technique_used',
          userId,
          data: {
            technique,
            tripId: tripData.tripId,
            isNewTechnique: await this.isNewTechniqueForUser(userId, technique)
          }
        });
      }
    }

    // Отслеживаем посещение локации
    if (tripData.locationId) {
      triggers.push({
        event: 'location_visited',
        userId,
        data: {
          locationId: tripData.locationId,
          isNewLocation: tripData.isNewLocation,
          tripId: tripData.tripId
        }
      });
    }

    const result = await this.processTriggers(triggers, options);
    
    // Проверяем badges после завершения поездки
    try {
      const { checkBadgesAfterTripCompletion } = await import('./badge-integration');
      await checkBadgesAfterTripCompletion(userId, tripData, {
        notify: options.notify !== false,
        reason: `Trip completed: ${tripData.tripId}`
      });
    } catch (error) {
      console.error('❌ Error checking badges after trip completion:', error);
    }

    return result;
  }

  /**
   * Отслеживает оставление отзыва
   */
  async trackReviewLeft(userId: string, reviewData: {
    reviewId: string;
    tripId: string;
    rating: number;
  }, options: TrackingOptions = {}) {
    
    const trigger: AchievementTrigger = {
      event: 'review_left',
      userId,
      data: {
        reviewId: reviewData.reviewId,
        tripId: reviewData.tripId,
        rating: reviewData.rating
      }
    };

    return this.processTriggers([trigger], options);
  }

  /**
   * Отслеживает создание события
   */
  async trackEventCreated(userId: string, eventData: {
    eventId: string;
    eventType: 'group' | 'solo' | 'competition';
    participantLimit?: number;
  }, options: TrackingOptions = {}) {
    
    const trigger: AchievementTrigger = {
      event: 'event_created',
      userId,
      data: {
        eventId: eventData.eventId,
        eventType: eventData.eventType,
        participantLimit: eventData.participantLimit
      }
    };

    return this.processTriggers([trigger], options);
  }

  /**
   * Отслеживает помощь другому пользователю
   */
  async trackUserHelped(userId: string, helpData: {
    helpedUserId: string;
    helpType: 'newbie_mentoring' | 'technical_advice' | 'equipment_sharing';
    tripId?: string;
  }, options: TrackingOptions = {}) {
    
    const trigger: AchievementTrigger = {
      event: 'user_helped',
      userId,
      data: {
        helpedUserId: helpData.helpedUserId,
        helpType: helpData.helpType,
        tripId: helpData.tripId
      }
    };

    return this.processTriggers([trigger], options);
  }

  /**
   * Ручное отслеживание конкретного достижения
   */
  async trackManual(userId: string, achievementType: string, increment: number = 1, options: TrackingOptions = {}) {
    try {
      const response = await fetch('/api/achievements/track', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          achievementType,
          increment,
          notify: options.notify !== false
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error(`❌ Manual achievement tracking failed:`, result.error);
        return { success: false, error: result.error };
      }

      console.log(`✅ Manual achievement tracked: ${achievementType} +${increment}`);
      return { 
        success: true, 
        achievement: result.achievement,
        newlyUnlocked: result.newlyUnlocked
      };
    } catch (error) {
      console.error('❌ Error in manual achievement tracking:', error);
      return { success: false, error: 'network_error' };
    }
  }

  /**
   * Обрабатывает список триггеров
   */
  private async processTriggers(triggers: AchievementTrigger[], options: TrackingOptions = {}) {
    if (options.immediate) {
      // Синхронная обработка
      return this.sendTriggersToAPI(triggers);
    } else {
      // Асинхронная обработка через очередь
      this.trackingQueue.push(...triggers);
      this.processQueueAsync();
      return { success: true, queued: triggers.length };
    }
  }

  /**
   * Отправляет триггеры на API
   */
  private async sendTriggersToAPI(triggers: AchievementTrigger[]) {
    const results = [];
    
    for (const trigger of triggers) {
      try {
        const response = await fetch('/api/achievements/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(trigger)
        });

        const result = await response.json();
        results.push({
          trigger: trigger.event,
          success: result.success,
          updated: result.updated?.length || 0,
          newlyUnlocked: result.newlyUnlocked || 0
        });

        if (!result.success) {
          console.error(`❌ Achievement tracking failed for ${trigger.event}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Network error tracking ${trigger.event}:`, error);
        results.push({
          trigger: trigger.event,
          success: false,
          error: 'network_error'
        });
      }
    }

    return {
      success: true,
      results,
      totalProcessed: triggers.length
    };
  }

  /**
   * Асинхронная обработка очереди
   */
  private async processQueueAsync() {
    if (this.isProcessing || this.trackingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Обрабатываем по батчам
      const batchSize = 5;
      while (this.trackingQueue.length > 0) {
        const batch = this.trackingQueue.splice(0, batchSize);
        await this.sendTriggersToAPI(batch);
        
        // Небольшая пауза между батчами
        if (this.trackingQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error('❌ Error processing achievement queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Вспомогательная функция для проверки новой техники
   */
  private async isNewTechniqueForUser(userId: string, technique: string): Promise<boolean> {
    // TODO: Реализовать проверку через базу данных
    // Пока возвращаем false для демонстрации
    return false;
  }

  /**
   * Получает статистику отслеживания
   */
  getQueueStatus() {
    return {
      queueLength: this.trackingQueue.length,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Очищает очередь (для тестирования)
   */
  clearQueue() {
    this.trackingQueue = [];
    this.isProcessing = false;
  }
}

// Экспортируем singleton instance
export const achievementTracker = AchievementTracker.getInstance();

// Convenience функции для быстрого использования
export const trackTripCompleted = (userId: string, tripData: Parameters<typeof achievementTracker.trackTripCompleted>[1], options?: TrackingOptions) => 
  achievementTracker.trackTripCompleted(userId, tripData, options);

export const trackReviewLeft = (userId: string, reviewData: Parameters<typeof achievementTracker.trackReviewLeft>[1], options?: TrackingOptions) => 
  achievementTracker.trackReviewLeft(userId, reviewData, options);

export const trackEventCreated = (userId: string, eventData: Parameters<typeof achievementTracker.trackEventCreated>[1], options?: TrackingOptions) => 
  achievementTracker.trackEventCreated(userId, eventData, options);

export const trackUserHelped = (userId: string, helpData: Parameters<typeof achievementTracker.trackUserHelped>[1], options?: TrackingOptions) => 
  achievementTracker.trackUserHelped(userId, helpData, options);

export const trackManual = (userId: string, achievementType: string, increment?: number, options?: TrackingOptions) => 
  achievementTracker.trackManual(userId, achievementType, increment, options);
