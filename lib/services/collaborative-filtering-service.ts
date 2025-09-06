/**
 * Collaborative Filtering Service
 * Реализация алгоритма коллаборативной фильтрации для рекомендаций
 * Основан на документации RecBole и best practices для recommendation systems
 */

import prisma from '@/lib/prisma';

interface UserItemMatrix {
  userId: string;
  itemId: string;
  rating: number;
  timestamp?: Date;
}

interface UserSimilarity {
  userId1: string;
  userId2: string;
  similarity: number;
}

interface CollaborativeRecommendation {
  userId: string;
  itemId: string;
  score: number;
  reason: string;
  similarUsers: string[];
}

export class CollaborativeFilteringService {
  private userItemMatrix: Map<string, Map<string, number>> = new Map();
  private itemUserMatrix: Map<string, Map<string, number>> = new Map();
  private userSimilarities: Map<string, UserSimilarity[]> = new Map();

  /**
   * Загружает данные пользователей и строит матрицу user-item
   */
  async loadUserItemMatrix(): Promise<void> {
    console.log('🔄 Loading user-item interaction matrix...');

    try {
      // Получаем все подтвержденные и завершенные бронирования
      const bookings = await prisma.groupBooking.findMany({
        where: {
          status: {
            in: ['CONFIRMED', 'COMPLETED']
          }
        },
        include: {
          trip: true,
          user: true
        }
      });

      console.log(`📊 Processing ${bookings.length} confirmed/completed bookings...`);

      // Очищаем матрицы
      this.userItemMatrix.clear();
      this.itemUserMatrix.clear();

      // Строим матрицы user-item и item-user
      for (const booking of bookings) {
        const userId = booking.userId;
        const tripId = booking.tripId;
        
        // Вычисляем implicit rating на основе статуса бронирования
        let rating = 1.0; // базовый рейтинг
        if (booking.status === 'COMPLETED') rating = 1.5; // бонус за завершенную поездку
        if (booking.participants > 1) rating += 0.2; // бонус за групповое бронирование
        
        // User-Item matrix
        if (!this.userItemMatrix.has(userId)) {
          this.userItemMatrix.set(userId, new Map());
        }
        this.userItemMatrix.get(userId)!.set(tripId, rating);

        // Item-User matrix (транспонированная)
        if (!this.itemUserMatrix.has(tripId)) {
          this.itemUserMatrix.set(tripId, new Map());
        }
        this.itemUserMatrix.get(tripId)!.set(userId, rating);
      }

      console.log(`✅ Matrix built: ${this.userItemMatrix.size} users × ${this.itemUserMatrix.size} items`);
    } catch (error) {
      console.error('❌ Error loading user-item matrix:', error);
      throw error;
    }
  }

  /**
   * Вычисляет cosine similarity между двумя пользователями
   * Основано на формуле из документации Faiss для cosine similarity
   */
  private cosineSimilarity(user1Items: Map<string, number>, user2Items: Map<string, number>): number {
    const commonItems = new Set([...user1Items.keys()].filter(x => user2Items.has(x)));
    
    if (commonItems.size === 0) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    // Вычисляем только по общим items для эффективности
    for (const itemId of commonItems) {
      const rating1 = user1Items.get(itemId) || 0;
      const rating2 = user2Items.get(itemId) || 0;
      
      dotProduct += rating1 * rating2;
      norm1 += rating1 * rating1;
      norm2 += rating2 * rating2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Вычисляет матрицу similarity между всеми пользователями
   * Использует user-based collaborative filtering подход
   */
  async calculateUserSimilarities(): Promise<void> {
    console.log('🔄 Calculating user similarities...');

    this.userSimilarities.clear();
    const users = Array.from(this.userItemMatrix.keys());
    
    let comparisons = 0;
    const totalComparisons = (users.length * (users.length - 1)) / 2;

    for (let i = 0; i < users.length; i++) {
      const user1 = users[i];
      const user1Items = this.userItemMatrix.get(user1)!;

      for (let j = i + 1; j < users.length; j++) {
        const user2 = users[j];
        const user2Items = this.userItemMatrix.get(user2)!;

        const similarity = this.cosineSimilarity(user1Items, user2Items);
        
        if (similarity > 0.1) { // Threshold для фильтрации слабых связей
          // Добавляем similarity для user1
          if (!this.userSimilarities.has(user1)) {
            this.userSimilarities.set(user1, []);
          }
          this.userSimilarities.get(user1)!.push({
            userId1: user1,
            userId2: user2,
            similarity
          });

          // Добавляем similarity для user2 (симметрично)
          if (!this.userSimilarities.has(user2)) {
            this.userSimilarities.set(user2, []);
          }
          this.userSimilarities.get(user2)!.push({
            userId1: user2,
            userId2: user1,
            similarity
          });
        }

        comparisons++;
        if (comparisons % 10 === 0) {
          const progress = ((comparisons / totalComparisons) * 100).toFixed(1);
          console.log(`  Progress: ${progress}% (${comparisons}/${totalComparisons})`);
        }
      }
    }

    // Сортируем similarities по убыванию
    for (const [userId, similarities] of this.userSimilarities.entries()) {
      similarities.sort((a, b) => b.similarity - a.similarity);
      // Оставляем только топ-5 наиболее похожих пользователей
      this.userSimilarities.set(userId, similarities.slice(0, 5));
    }

    console.log(`✅ User similarities calculated for ${this.userSimilarities.size} users`);
  }

  /**
   * Генерирует персонализированные рекомендации для пользователя
   * Основано на collaborative filtering алгоритме из RecBole
   */
  async generateRecommendationsForUser(targetUserId: string, limit: number = 5): Promise<CollaborativeRecommendation[]> {
    console.log(`🎯 Generating recommendations for user ${targetUserId}...`);

    const recommendations: CollaborativeRecommendation[] = [];
    
    // Получаем похожих пользователей
    const similarUsers = this.userSimilarities.get(targetUserId) || [];
    
    if (similarUsers.length === 0) {
      console.log(`⚠️ No similar users found for ${targetUserId}`);
      return [];
    }

    // Получаем items, которые уже забронировал целевой пользователь
    const targetUserItems = this.userItemMatrix.get(targetUserId) || new Map();
    const alreadyBooked = new Set(targetUserItems.keys());

    // Собираем scores для каждого item на основе preferences похожих пользователей
    const itemScores = new Map<string, {score: number, contributors: string[], count: number}>();

    for (const {userId2: similarUserId, similarity} of similarUsers) {
      const similarUserItems = this.userItemMatrix.get(similarUserId) || new Map();
      
      for (const [itemId, rating] of similarUserItems.entries()) {
        if (alreadyBooked.has(itemId)) continue; // Пропускаем уже забронированные

        if (!itemScores.has(itemId)) {
          itemScores.set(itemId, {score: 0, contributors: [], count: 0});
        }

        const itemData = itemScores.get(itemId)!;
        itemData.score += similarity * rating;
        itemData.contributors.push(similarUserId);
        itemData.count += 1;
      }
    }

    // Конвертируем в массив и сортируем
    const sortedItems = Array.from(itemScores.entries())
      .map(([itemId, data]) => ({
        itemId,
        score: data.score / data.count, // Нормализуем по количеству contributing users
        contributors: data.contributors,
        reason: `Based on ${data.count} similar users' preferences`
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Создаем рекомендации
    for (const item of sortedItems) {
      recommendations.push({
        userId: targetUserId,
        itemId: item.itemId,
        score: item.score,
        reason: item.reason,
        similarUsers: item.contributors
      });
    }

    console.log(`✅ Generated ${recommendations.length} recommendations for user ${targetUserId}`);
    return recommendations;
  }

  /**
   * Сохраняет рекомендации в базу данных
   */
  async saveRecommendations(recommendations: CollaborativeRecommendation[]): Promise<void> {
    console.log('💾 Saving recommendations to database...');

    try {
      // Удаляем старые рекомендации пользователя
      const userIds = [...new Set(recommendations.map(r => r.userId))];
      
      for (const userId of userIds) {
        await prisma.smartRecommendation.deleteMany({
          where: {
            targetUserId: userId,
            type: 'COLLABORATIVE'
          }
        });
      }

      // Сохраняем новые рекомендации
      for (const rec of recommendations) {
        await prisma.smartRecommendation.create({
          data: {
            targetUserId: rec.userId,
            type: 'COLLABORATIVE',
            title: 'Персональная рекомендация на основе ваших предпочтений',
            description: rec.reason,
            recommendedTripId: rec.itemId,
            priority: Math.round(rec.score * 10),
            relevanceScore: rec.score,
            confidenceScore: rec.score,
            isActive: true,
            validFrom: new Date(),
            metadata: {
              similarUsers: rec.similarUsers,
              algorithm: 'user_based_collaborative_filtering',
              generatedAt: new Date().toISOString(),
              score: rec.score
            }
          }
        });
      }

      console.log(`✅ Saved ${recommendations.length} recommendations to database`);
    } catch (error) {
      console.error('❌ Error saving recommendations:', error);
      throw error;
    }
  }

  /**
   * Полный цикл обработки collaborative filtering
   */
  async processCollaborativeFiltering(): Promise<void> {
    console.log('🚀 Starting Collaborative Filtering process...\n');

    try {
      // 1. Загружаем данные
      await this.loadUserItemMatrix();
      
      // 2. Вычисляем similarities
      await this.calculateUserSimilarities();
      
      // 3. Генерируем рекомендации для всех пользователей
      const allRecommendations: CollaborativeRecommendation[] = [];
      const users = Array.from(this.userItemMatrix.keys());
      
      for (const userId of users) {
        const userRecs = await this.generateRecommendationsForUser(userId, 3);
        allRecommendations.push(...userRecs);
      }

      // 4. Сохраняем рекомендации
      if (allRecommendations.length > 0) {
        await this.saveRecommendations(allRecommendations);
      }

      console.log('\n🎉 Collaborative Filtering process completed successfully!');
      console.log(`📊 Total recommendations generated: ${allRecommendations.length}`);
      console.log(`👥 Users with recommendations: ${new Set(allRecommendations.map(r => r.userId)).size}`);
      
    } catch (error) {
      console.error('❌ Collaborative Filtering process failed:', error);
      throw error;
    }
  }

  /**
   * Получает рекомендации для конкретного пользователя из базы данных
   */
  async getRecommendationsForUser(userId: string): Promise<any[]> {
    try {
      const recommendations = await prisma.smartRecommendation.findMany({
        where: {
          targetUserId: userId,
          type: 'COLLABORATIVE'
        },
        include: {
          recommendedTrip: {
            select: {
              id: true,
              description: true,
              pricePerPerson: true,
              maxParticipants: true,
              status: true,
              date: true,
              difficultyRating: true,
              targetSpecies: true
            }
          }
        },
        orderBy: {
          relevanceScore: 'desc'
        },
        take: 5
      });

      return recommendations;
    } catch (error) {
      console.error('❌ Error fetching recommendations:', error);
      return [];
    }
  }
}

export const collaborativeFilteringService = new CollaborativeFilteringService();
