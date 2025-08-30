/**
 * Сервис для управления достижениями рыболова
 * Автоматическое присвоение достижений на основе действий пользователя
 */

import { prisma } from '@/lib/generated/prisma';
import { 
  AchievementTrigger,
  SetAchievementProgressRequest,
  SetAchievementProgressResponse,
} from '@/lib/types/achievements';

// ============================================================================
// ОСНОВНЫЕ ФУНКЦИИ СЕРВИСА
// ============================================================================

/**
 * Обрабатывает событие и обновляет соответствующие достижения
 */
export async function processAchievementTrigger(trigger: AchievementTrigger): Promise<void> {
  try {
    console.log(`🎯 Processing achievement trigger: ${trigger.event} for user ${trigger.userId}`);

    switch (trigger.event) {
      case 'trip_completed':
        await handleTripCompleted(trigger);
        break;
      
      case 'fish_caught':
        await handleFishCaught(trigger);
        break;
      
      case 'technique_used':
        await handleTechniqueUsed(trigger);
        break;
      
      case 'review_left':
        await handleReviewLeft(trigger);
        break;
      
      case 'event_created':
        await handleEventCreated(trigger);
        break;
      
      case 'user_helped':
        await handleUserHelped(trigger);
        break;
      
      default:
        console.log(`Unknown achievement trigger event: ${trigger.event}`);
    }
  } catch (error) {
    console.error('Error processing achievement trigger:', error);
  }
}

// ============================================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================================

/**
 * Обработка завершения поездки
 */
async function handleTripCompleted(trigger: AchievementTrigger) {
  const { userId, data } = trigger;
  const { 
    tripId, 
    fishingTechniques = [], 
    targetSpecies = [], 
    location, 
    isDeepSea = false,
    isReef = false,
    isCoastal = false,
    fishCaught = 0, // количество рыбы в кг
  } = data;

  try {
    // Обновляем статистику профиля
    await updateProfileStats(userId, {
      completedTrips: 1,
      totalFishCaught: fishCaught,
      activeDays: 1,
    });

    // Социальные достижения - участие в сообществе
    await incrementAchievement(userId, 'COMMUNITY_BUILDER', 1);
    
    // Географические достижения
    if (isDeepSea) {
      await incrementAchievement(userId, 'DEEP_SEA_ADVENTURER', 1);
    }
    if (isReef) {
      await incrementAchievement(userId, 'REEF_EXPLORER', 1);
    }
    if (isCoastal) {
      await incrementAchievement(userId, 'COASTAL_SPECIALIST', 1);
    }

    // Достижение "Местный эксперт" - много поездок в одном месте
    if (location) {
      await checkLocalExpertProgress(userId, location);
    }

    // Достижение "Путешественник" - рыбалка в разных местах
    await checkWorldTravelerProgress(userId, location);

    // Обрабатываем использованные техники
    for (const technique of fishingTechniques) {
      await processAchievementTrigger({
        event: 'technique_used',
        userId,
        data: { technique, tripId },
      });
    }

    // Обрабатываем пойманную рыбу
    for (const species of targetSpecies) {
      await processAchievementTrigger({
        event: 'fish_caught',
        userId,
        data: { species, count: 1, tripId },
      });
    }

    console.log(`✅ Trip completion processed for user ${userId}`);
  } catch (error) {
    console.error('Error handling trip completed:', error);
  }
}

/**
 * Обработка поимки рыбы
 */
async function handleFishCaught(trigger: AchievementTrigger) {
  const { userId, data } = trigger;
  const { species, count = 1 } = data;

  try {
    // Достижения по видам рыб
    switch (species) {
      case 'TUNA':
        await incrementAchievement(userId, 'TUNA_MASTER', count);
        break;
      case 'DORADO':
        await incrementAchievement(userId, 'DORADO_HUNTER', count);
        break;
      case 'SEABASS':
        await incrementAchievement(userId, 'SEABASS_EXPERT', count);
        break;
      case 'BLUE_MARLIN':
      case 'WHITE_MARLIN':
        await incrementAchievement(userId, 'MARLIN_LEGEND', count);
        break;
    }

    // Обновляем список уникальных видов в профиле
    await updateUniqueSpecies(userId, species);

    // Проверяем достижение "Коллекционер видов"
    await checkSpeciesCollectorProgress(userId);

    console.log(`🐟 Fish caught processed: ${species} x${count} for user ${userId}`);
  } catch (error) {
    console.error('Error handling fish caught:', error);
  }
}

/**
 * Обработка использования техники рыбалки
 */
async function handleTechniqueUsed(trigger: AchievementTrigger) {
  const { userId, data } = trigger;
  const { technique } = data;

  try {
    // Достижения по техникам
    switch (technique) {
      case 'TROLLING':
        await incrementAchievement(userId, 'TROLLING_EXPERT', 1);
        break;
      case 'JIGGING':
        await incrementAchievement(userId, 'JIGGING_MASTER', 1);
        break;
      case 'BOTTOM_FISHING':
        await incrementAchievement(userId, 'BOTTOM_FISHING_PRO', 1);
        break;
      case 'FLY_FISHING':
        await incrementAchievement(userId, 'FLY_FISHING_ARTIST', 1);
        break;
    }

    // Проверяем достижение "Универсал техник"
    await checkTechniqueVersatileProgress(userId, technique);

    console.log(`🎣 Technique used processed: ${technique} for user ${userId}`);
  } catch (error) {
    console.error('Error handling technique used:', error);
  }
}

/**
 * Обработка оставления отзыва
 */
async function handleReviewLeft(trigger: AchievementTrigger) {
  const { userId, data } = trigger;
  const { rating = 5, isPositive = true } = data;

  try {
    // Социальное достижение - мастер отзывов
    await incrementAchievement(userId, 'REVIEW_MASTER', 1);

    // Обновляем статистику отзывов в профиле
    await updateProfileStats(userId, {
      totalReviews: 1,
      positiveReviews: isPositive ? 1 : 0,
    });

    console.log(`⭐ Review left processed for user ${userId}`);
  } catch (error) {
    console.error('Error handling review left:', error);
  }
}

/**
 * Обработка создания события
 */
async function handleEventCreated(trigger: AchievementTrigger) {
  const { userId, data } = trigger;

  try {
    // Социальное достижение - организатор групп
    await incrementAchievement(userId, 'GROUP_ORGANIZER', 1);

    // Обновляем статистику созданных поездок
    await updateProfileStats(userId, {
      createdTrips: 1,
    });

    console.log(`👥 Event created processed for user ${userId}`);
  } catch (error) {
    console.error('Error handling event created:', error);
  }
}

/**
 * Обработка помощи пользователю (например, наставничество)
 */
async function handleUserHelped(trigger: AchievementTrigger) {
  const { userId, data } = trigger;

  try {
    // Социальное достижение - наставник новичков
    await incrementAchievement(userId, 'NEWBIE_MENTOR', 1);

    console.log(`👨‍🏫 User helped processed for user ${userId}`);
  } catch (error) {
    console.error('Error handling user helped:', error);
  }
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Увеличивает прогресс достижения на указанную величину
 */
async function incrementAchievement(
  userId: string, 
  achievementType: string, 
  increment: number
): Promise<void> {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/achievements/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        achievementType,
        increment,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to increment achievement ${achievementType} for user ${userId}`);
    } else {
      const result: SetAchievementProgressResponse = await response.json();
      if (result.achievement?.unlocked) {
        console.log(`🏆 Achievement unlocked: ${result.achievement.name} for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('Error incrementing achievement:', error);
  }
}

/**
 * Обновляет статистику профиля пользователя
 */
async function updateProfileStats(
  userId: string,
  stats: {
    completedTrips?: number;
    createdTrips?: number;
    totalFishCaught?: number;
    activeDays?: number;
    totalReviews?: number;
    positiveReviews?: number;
  }
): Promise<void> {
  try {
    await prisma.fisherProfile.upsert({
      where: { userId },
      update: {
        ...(stats.completedTrips && { completedTrips: { increment: stats.completedTrips } }),
        ...(stats.createdTrips && { createdTrips: { increment: stats.createdTrips } }),
        ...(stats.totalFishCaught && { totalFishCaught: { increment: stats.totalFishCaught } }),
        ...(stats.activeDays && { activeDays: { increment: stats.activeDays } }),
        ...(stats.totalReviews && { totalReviews: { increment: stats.totalReviews } }),
        ...(stats.positiveReviews && { positiveReviews: { increment: stats.positiveReviews } }),
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        completedTrips: stats.completedTrips || 0,
        createdTrips: stats.createdTrips || 0,
        totalFishCaught: stats.totalFishCaught || 0,
        activeDays: stats.activeDays || 1,
        totalReviews: stats.totalReviews || 0,
        positiveReviews: stats.positiveReviews || 0,
        experienceLevel: 'BEGINNER',
        lastActiveAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating profile stats:', error);
  }
}

/**
 * Обновляет список уникальных видов рыб в профиле
 */
async function updateUniqueSpecies(userId: string, species: string): Promise<void> {
  try {
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
    });

    if (profile && !profile.uniqueSpecies.includes(species)) {
      await prisma.fisherProfile.update({
        where: { userId },
        data: {
          uniqueSpecies: [...profile.uniqueSpecies, species],
        },
      });
    }
  } catch (error) {
    console.error('Error updating unique species:', error);
  }
}

/**
 * Проверяет прогресс достижения "Коллекционер видов"
 */
async function checkSpeciesCollectorProgress(userId: string): Promise<void> {
  try {
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
    });

    if (profile) {
      const uniqueSpeciesCount = profile.uniqueSpecies.length;
      await incrementAchievement(userId, 'SPECIES_COLLECTOR', 0); // Устанавливаем точное значение
      
      // Устанавливаем прогресс равный количеству уникальных видов
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/achievements/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          achievementType: 'SPECIES_COLLECTOR',
          progress: uniqueSpeciesCount,
        }),
      });
    }
  } catch (error) {
    console.error('Error checking species collector progress:', error);
  }
}

/**
 * Проверяет прогресс достижения "Универсал техник"
 */
async function checkTechniqueVersatileProgress(userId: string, newTechnique: string): Promise<void> {
  try {
    // Получаем все поездки пользователя с использованными техниками
    const trips = await prisma.groupTrip.findMany({
      where: {
        participants: {
          some: { userId },
        },
        status: 'COMPLETED',
      },
      select: {
        fishingTechniques: true,
      },
    });

    // Собираем все уникальные техники
    const uniqueTechniques = new Set<string>();
    trips.forEach(trip => {
      trip.fishingTechniques.forEach(technique => {
        uniqueTechniques.add(technique);
      });
    });

    // Обновляем прогресс достижения
    const techniqueCount = uniqueTechniques.size;
    if (techniqueCount >= 2) { // Начинаем отслеживать с 2 техник
      await incrementAchievement(userId, 'TECHNIQUE_VERSATILE', 0);
      
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/achievements/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          achievementType: 'TECHNIQUE_VERSATILE',
          progress: techniqueCount,
        }),
      });
    }
  } catch (error) {
    console.error('Error checking technique versatile progress:', error);
  }
}

/**
 * Проверяет прогресс достижения "Местный эксперт"
 */
async function checkLocalExpertProgress(userId: string, location: string): Promise<void> {
  try {
    // Считаем поездки в этой локации
    const tripsInLocation = await prisma.groupTrip.count({
      where: {
        participants: {
          some: { userId },
        },
        status: 'COMPLETED',
        departureLocation: location,
      },
    });

    // Обновляем прогресс, если это больше всего поездок в одном месте
    if (tripsInLocation >= 5) { // Начинаем отслеживать с 5 поездок
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/achievements/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          achievementType: 'LOCAL_EXPERT',
          progress: tripsInLocation,
        }),
      });
    }
  } catch (error) {
    console.error('Error checking local expert progress:', error);
  }
}

/**
 * Проверяет прогресс достижения "Путешественник"
 */
async function checkWorldTravelerProgress(userId: string, newLocation?: string): Promise<void> {
  try {
    // Получаем все уникальные локации пользователя
    const trips = await prisma.groupTrip.findMany({
      where: {
        participants: {
          some: { userId },
        },
        status: 'COMPLETED',
        departureLocation: { not: null },
      },
      select: {
        departureLocation: true,
      },
      distinct: ['departureLocation'],
    });

    const uniqueLocations = trips
      .map(trip => trip.departureLocation)
      .filter(location => location !== null);

    if (uniqueLocations.length >= 2) { // Начинаем отслеживать с 2 локаций
      const response = await fetch(`${process.env.NEXTAUTH_URL}/api/achievements/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          achievementType: 'WORLD_TRAVELER',
          progress: uniqueLocations.length,
        }),
      });
    }
  } catch (error) {
    console.error('Error checking world traveler progress:', error);
  }
}

// ============================================================================
// ПУБЛИЧНЫЕ УТИЛИТЫ ДЛЯ ИНТЕГРАЦИИ
// ============================================================================

/**
 * Утилита для быстрого вызова триггеров достижений из других частей приложения
 */
export const AchievementTriggers = {
  /**
   * Вызывается при завершении поездки
   */
  tripCompleted: (userId: string, tripData: any) => 
    processAchievementTrigger({
      event: 'trip_completed',
      userId,
      data: tripData,
    }),

  /**
   * Вызывается при создании нового события
   */
  eventCreated: (userId: string, eventData: any) => 
    processAchievementTrigger({
      event: 'event_created', 
      userId,
      data: eventData,
    }),

  /**
   * Вызывается при оставлении отзыва
   */
  reviewLeft: (userId: string, reviewData: any) => 
    processAchievementTrigger({
      event: 'review_left',
      userId,
      data: reviewData,
    }),

  /**
   * Вызывается при помощи новичку
   */
  userHelped: (userId: string, helpData: any) => 
    processAchievementTrigger({
      event: 'user_helped',
      userId,
      data: helpData,
    }),
};
