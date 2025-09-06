import { BadgeCategory, FishingExperience, FishingSpecialty } from '@prisma/client';
import prisma from '@/lib/prisma';

/**
 * Определения значков с условиями получения
 */
export const BADGE_DEFINITIONS = [
  // Milestone Badges
  {
    name: 'First Catch',
    description: 'Completed your first fishing trip',
    icon: '🎣',
    category: BadgeCategory.MILESTONE,
    condition: (profile: any) => profile.completedTrips >= 1,
    requiredValue: 1
  },
  {
    name: 'Regular Fisher',
    description: 'Completed 5 fishing trips',
    icon: '⭐',
    category: BadgeCategory.MILESTONE,
    condition: (profile: any) => profile.completedTrips >= 5,
    requiredValue: 5
  },
  {
    name: 'Veteran Angler',
    description: 'Completed 10 fishing trips',
    icon: '🏆',
    category: BadgeCategory.MILESTONE,
    condition: (profile: any) => profile.completedTrips >= 10,
    requiredValue: 10
  },
  {
    name: 'Master Fisher',
    description: 'Completed 25 fishing trips',
    icon: '👑',
    category: BadgeCategory.MILESTONE,
    condition: (profile: any) => profile.completedTrips >= 25,
    requiredValue: 25
  },
  
  // Achievement Badges
  {
    name: 'Five Star',
    description: 'Maintained perfect 5.0 rating',
    icon: '⭐',
    category: BadgeCategory.ACHIEVEMENT,
    condition: (profile: any) => profile.rating >= 5.0 && profile.totalReviews >= 5,
    requiredValue: 50
  },
  {
    name: 'Reliable Crew',
    description: '95%+ reliability rating',
    icon: '🤝',
    category: BadgeCategory.ACHIEVEMENT,
    condition: (profile: any) => profile.reliability >= 95.0 && profile.completedTrips >= 3,
    requiredValue: 95
  },
  {
    name: 'Expert Guide',
    description: 'Expert level experience',
    icon: '🧭',
    category: BadgeCategory.ACHIEVEMENT,
    condition: (profile: any) => profile.experience === FishingExperience.EXPERT,
    requiredValue: 0
  },
  
  // Specialty Badges
  {
    name: 'Deep Sea Specialist',
    description: 'Specializes in deep sea fishing',
    icon: '🌊',
    category: BadgeCategory.SPECIAL,
    condition: (profile: any) => profile.specialties.includes(FishingSpecialty.DEEP_SEA),
    requiredValue: 0
  },
  {
    name: 'Shore Master',
    description: 'Specializes in shore fishing',
    icon: '🏖️',
    category: BadgeCategory.SPECIAL,
    condition: (profile: any) => profile.specialties.includes(FishingSpecialty.SHORE),
    requiredValue: 0
  },
  {
    name: 'Fly Fishing Pro',
    description: 'Specializes in fly fishing',
    icon: '🪶',
    category: BadgeCategory.SPECIAL,
    condition: (profile: any) => profile.specialties.includes(FishingSpecialty.FLY_FISHING),
    requiredValue: 0
  },
  {
    name: 'Sport Fisher',
    description: 'Specializes in sport fishing',
    icon: '🎣',
    category: BadgeCategory.SPECIAL,
    condition: (profile: any) => profile.specialties.includes(FishingSpecialty.SPORT_FISHING),
    requiredValue: 0
  }
];

/**
 * Проверить и присвоить значки пользователю
 */
export async function updateUserBadges(userId: string): Promise<void> {
  try {
    console.log(`🏆 Updating badges for user ${userId}`);
    
    // Получить профиль пользователя с текущими значками
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId },
      include: {
        badges: true
      }
    });
    
    if (!profile) {
      console.log(`❌ FisherProfile not found for user ${userId}`);
      return;
    }
    
    // Получить список уже имеющихся значков
    const existingBadgeNames = new Set(profile.badges.map(badge => badge.name));
    
    // Проверить каждый значок
    for (const badgeDefinition of BADGE_DEFINITIONS) {
      // Пропустить, если значок уже есть
      if (existingBadgeNames.has(badgeDefinition.name)) {
        continue;
      }
      
      // Проверить условие получения значка
      if (badgeDefinition.condition(profile)) {
        console.log(`✅ Awarding badge "${badgeDefinition.name}" to user ${userId}`);
        
        // Присвоить значок
        await prisma.fisherBadge.create({
          data: {
            profileId: profile.id,
            name: badgeDefinition.name,
            description: badgeDefinition.description,
            icon: badgeDefinition.icon,
            category: badgeDefinition.category,
            requiredValue: badgeDefinition.requiredValue,
            earnedAt: new Date()
          }
        });
      }
    }
    
    console.log(`✅ Badge check completed for user ${userId}`);
    
  } catch (error) {
    console.error(`❌ Error updating badges for user ${userId}:`, error);
  }
}

/**
 * Обновить статистику профиля после завершения поездки
 */
export async function updateProfileAfterTrip(userId: string): Promise<void> {
  try {
    console.log(`📊 Updating profile stats for user ${userId}`);
    
    // Получить профиль
    const profile = await prisma.fisherProfile.findUnique({
      where: { userId }
    });
    
    if (!profile) {
      console.log(`❌ FisherProfile not found for user ${userId}`);
      return;
    }
    
    // Увеличить счетчик завершенных поездок
    await prisma.fisherProfile.update({
      where: { userId },
      data: {
        completedTrips: profile.completedTrips + 1,
        lastActiveAt: new Date()
      }
    });
    
    console.log(`✅ Profile stats updated for user ${userId}`);
    
    // Проверить и обновить значки
    await updateUserBadges(userId);
    
  } catch (error) {
    console.error(`❌ Error updating profile stats for user ${userId}:`, error);
  }
}

/**
 * Обновить рейтинг профиля после получения отзыва
 */
export async function updateProfileAfterReview(userId: string): Promise<void> {
  try {
    console.log(`⭐ Updating profile rating for user ${userId}`);
    
    // Получить все отзывы для пользователя
    const reviews = await prisma.review.findMany({
      where: { toUserId: userId },
      select: { rating: true }
    });
    
    if (reviews.length === 0) {
      console.log(`ℹ️ No reviews found for user ${userId}`);
      return;
    }
    
    // Рассчитать средний рейтинг
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    
    // Обновить профиль
    await prisma.fisherProfile.update({
      where: { userId },
      data: {
        rating: averageRating,
        totalReviews: reviews.length
      }
    });
    
    console.log(`✅ Profile rating updated for user ${userId}: ${averageRating} (${reviews.length} reviews)`);
    
    // Проверить и обновить значки
    await updateUserBadges(userId);
    
  } catch (error) {
    console.error(`❌ Error updating profile rating for user ${userId}:`, error);
  }
}

/**
 * Получить список доступных значков для отображения
 */
export function getAvailableBadges() {
  return BADGE_DEFINITIONS.map(badge => ({
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    category: badge.category,
    requiredValue: badge.requiredValue
  }));
}
