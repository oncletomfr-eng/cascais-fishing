import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  BadgeCategory,
  AchievementRarity,
} from '@prisma/client';

/**
 * Badge Award System Backend - Автоматическое распределение бейджей
 * Task 21.2: Badge Award System Backend - Enhanced with real database queries
 * 
 * Автоматически присваивает badges на основе достижений и активности пользователя
 */

// Badge Template для создания badges
interface BadgeTemplate {
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  rarity: AchievementRarity;
  conditions: {
    type: 'achievement_count' | 'achievement_specific' | 'trip_count' | 'rating' | 'reliability' | 'experience_level' | 'seasonal';
    value?: number;
    achievementTypes?: string[];
    experienceLevel?: string;
    season?: string;
    comparison?: 'gte' | 'eq' | 'lte';
  };
  requiredValue?: number;
}

// Предопределенные badge templates
const BADGE_TEMPLATES: BadgeTemplate[] = [
  // Achievement-based badges
  {
    name: 'First Achievement',
    description: 'Unlocked your first achievement!',
    icon: '🏆',
    category: 'MILESTONE',
    rarity: 'COMMON',
    conditions: {
      type: 'achievement_count',
      value: 1,
      comparison: 'gte'
    }
  },
  {
    name: 'Achievement Hunter',
    description: 'Unlocked 5 achievements',
    icon: '🎯',
    category: 'ACHIEVEMENT',
    rarity: 'UNCOMMON',
    conditions: {
      type: 'achievement_count',
      value: 5,
      comparison: 'gte'
    }
  },
  {
    name: 'Achievement Master',
    description: 'Unlocked 15 achievements',
    icon: '🏅',
    category: 'ACHIEVEMENT',
    rarity: 'RARE',
    conditions: {
      type: 'achievement_count',
      value: 15,
      comparison: 'gte'
    }
  },
  {
    name: 'Legend of the Seas',
    description: 'Unlocked 30+ achievements',
    icon: '👑',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    conditions: {
      type: 'achievement_count',
      value: 30,
      comparison: 'gte'
    }
  },
  
  // Specific achievement badges
  {
    name: 'Tuna Master Badge',
    description: 'Mastered the art of tuna fishing',
    icon: '🐠',
    category: 'FISH_SPECIES',
    rarity: 'EPIC',
    conditions: {
      type: 'achievement_specific',
      achievementTypes: ['TUNA_MASTER']
    }
  },
  {
    name: 'Marlin Legend Badge',
    description: 'Caught the legendary marlin',
    icon: '🦈',
    category: 'FISH_SPECIES',
    rarity: 'MYTHIC',
    conditions: {
      type: 'achievement_specific',
      achievementTypes: ['MARLIN_LEGEND']
    }
  },
  {
    name: 'Species Collector Badge',
    description: 'True collector of fish species',
    icon: '🌊',
    category: 'FISH_SPECIES',
    rarity: 'LEGENDARY',
    conditions: {
      type: 'achievement_specific',
      achievementTypes: ['SPECIES_COLLECTOR']
    }
  },
  {
    name: 'Technique Master Badge',
    description: 'Mastered multiple fishing techniques',
    icon: '🎣',
    category: 'TECHNIQUE',
    rarity: 'EPIC',
    conditions: {
      type: 'achievement_specific',
      achievementTypes: ['TROLLING_EXPERT', 'JIGGING_MASTER', 'FLY_FISHING_ARTIST']
    }
  },
  
  // Trip-based badges
  {
    name: 'First Trip',
    description: 'Completed your first fishing trip!',
    icon: '🚤',
    category: 'MILESTONE',
    rarity: 'COMMON',
    conditions: {
      type: 'trip_count',
      value: 1,
      comparison: 'gte'
    },
    requiredValue: 1
  },
  {
    name: 'Regular Fisher',
    description: 'Completed 5+ fishing trips',
    icon: '🎣',
    category: 'MILESTONE',
    rarity: 'UNCOMMON',
    conditions: {
      type: 'trip_count',
      value: 5,
      comparison: 'gte'
    },
    requiredValue: 5
  },
  {
    name: 'Experienced Angler',
    description: 'Completed 15+ fishing trips',
    icon: '🐟',
    category: 'MILESTONE',
    rarity: 'RARE',
    conditions: {
      type: 'trip_count',
      value: 15,
      comparison: 'gte'
    },
    requiredValue: 15
  },
  {
    name: 'Sea Veteran',
    description: 'Completed 50+ fishing trips',
    icon: '⚓',
    category: 'MILESTONE',
    rarity: 'EPIC',
    conditions: {
      type: 'trip_count',
      value: 50,
      comparison: 'gte'
    },
    requiredValue: 50
  },
  
  // Rating and reliability badges
  {
    name: 'Highly Rated',
    description: 'Maintained 4.5+ star rating',
    icon: '⭐',
    category: 'ACHIEVEMENT',
    rarity: 'RARE',
    conditions: {
      type: 'rating',
      value: 4.5,
      comparison: 'gte'
    }
  },
  {
    name: 'Perfect Rating',
    description: 'Achieved perfect 5.0 star rating',
    icon: '🌟',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    conditions: {
      type: 'rating',
      value: 5.0,
      comparison: 'gte'
    }
  },
  {
    name: 'Reliable Fisher',
    description: 'Maintained 95%+ reliability',
    icon: '🛡️',
    category: 'ACHIEVEMENT',
    rarity: 'RARE',
    conditions: {
      type: 'reliability',
      value: 95,
      comparison: 'gte'
    }
  },
  
  // Experience level badges
  {
    name: 'Expert Angler',
    description: 'Reached Expert fishing level',
    icon: '👨‍🎓',
    category: 'SPECIAL',
    rarity: 'EPIC',
    conditions: {
      type: 'experience_level',
      experienceLevel: 'EXPERT'
    }
  },
  
  // Seasonal badges
  {
    name: 'Winter Fisher',
    description: 'Fished during winter season',
    icon: '❄️',
    category: 'SEASONAL',
    rarity: 'UNCOMMON',
    conditions: {
      type: 'seasonal',
      season: 'winter'
    }
  },
  {
    name: 'Summer Explorer',
    description: 'Active during summer season',
    icon: '☀️',
    category: 'SEASONAL',
    rarity: 'UNCOMMON',
    conditions: {
      type: 'seasonal',
      season: 'summer'
    }
  }
];

const AwardBadgeSchema = z.object({
  userId: z.string().cuid(),
  checkAll: z.boolean().default(true),
  specificBadges: z.array(z.string()).optional(),
  notify: z.boolean().default(true)
});

const ManualAwardSchema = z.object({
  userId: z.string().cuid(),
  badgeName: z.string(),
  reason: z.string().optional()
});

/**
 * POST /api/badges/award - Автоматическое присвоение badges на основе условий
 * 
 * Body:
 * - userId: string - ID пользователя
 * - checkAll: boolean - проверить все badges или только указанные
 * - specificBadges: string[] - конкретные badges для проверки
 * - notify: boolean - отправлять ли уведомления
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, checkAll, specificBadges, notify } = AwardBadgeSchema.parse(body);

    console.log(`🏆 Checking badges for user ${userId}`);

    // Получаем пользователя с полной информацией
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fisherProfile: {
          include: {
            badges: true
          }
        },
        achievements: {
          include: {
            achievement: true
          },
          where: {
            unlocked: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'user_not_found'
      }, { status: 404 });
    }

    // Создаем профиль рыболова если не существует
    let fisherProfile = user.fisherProfile;
    if (!fisherProfile) {
      fisherProfile = await prisma.fisherProfile.create({
        data: {
          userId: user.id,
          experienceLevel: 'BEGINNER',
          level: 1,
          experiencePoints: 0,
          activeDays: 1,
          lastActiveAt: new Date()
        },
        include: {
          badges: true
        }
      });
    }

    // Получаем список уже полученных badges
    const existingBadgeNames = new Set(fisherProfile.badges.map(badge => badge.name));

    // Определяем какие badges проверять
    const badgesToCheck = checkAll 
      ? BADGE_TEMPLATES 
      : BADGE_TEMPLATES.filter(template => 
          specificBadges?.includes(template.name)
        );

    const newlyAwardedBadges = [];

    // Проверяем каждый badge template
    for (const template of badgesToCheck) {
      // Пропускаем если badge уже получен
      if (existingBadgeNames.has(template.name)) {
        continue;
      }

      // Проверяем условия для получения badge
      const meetsConditions = await checkBadgeConditions(user, fisherProfile, template);
      
      if (meetsConditions) {
        // Создаем badge
        const newBadge = await prisma.fisherBadge.create({
          data: {
            profileId: fisherProfile.id,
            name: template.name,
            description: template.description,
            icon: template.icon,
            category: template.category,
            rarity: template.rarity,
            requiredValue: template.requiredValue,
            earnedAt: new Date()
          }
        });

        newlyAwardedBadges.push(newBadge);
        console.log(`🏆 Awarded badge: ${template.name} to user ${userId}`);

        // Обновляем опыт пользователя
        await updateUserExperienceForBadge(userId, template.rarity);
      }
    }

    // Отправляем уведомления о новых badges
    if (newlyAwardedBadges.length > 0 && notify) {
      await sendBadgeNotifications(userId, newlyAwardedBadges);
      
      // Обновляем leaderboard после присвоения badges
      await updateLeaderboardForBadges(userId, newlyAwardedBadges);
    }

    console.log(`✅ Badge check completed. Awarded ${newlyAwardedBadges.length} new badges`);

    return NextResponse.json({
      success: true,
      userId,
      badgesChecked: badgesToCheck.length,
      newlyAwarded: newlyAwardedBadges.length,
      badges: newlyAwardedBadges,
      message: `Awarded ${newlyAwardedBadges.length} new badges`
    });

  } catch (error) {
    console.error('❌ Error in badge award system:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Badge award system failed'
    }, { status: 500 });
  }
}

/**
 * PUT /api/badges/award - Ручное присвоение конкретного badge
 * 
 * Body:
 * - userId: string - ID пользователя  
 * - badgeName: string - название badge
 * - reason: string - причина присвоения
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, badgeName, reason } = ManualAwardSchema.parse(body);

    console.log(`🎖️ Manual badge award: ${badgeName} to user ${userId}`);

    // Находим template badge
    const template = BADGE_TEMPLATES.find(t => t.name === badgeName);
    if (!template) {
      return NextResponse.json({
        success: false,
        error: 'badge_template_not_found'
      }, { status: 404 });
    }

    // Проверяем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fisherProfile: {
          include: {
            badges: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'user_not_found'
      }, { status: 404 });
    }

    // Создаем профиль если не существует
    let fisherProfile = user.fisherProfile;
    if (!fisherProfile) {
      fisherProfile = await prisma.fisherProfile.create({
        data: {
          userId: user.id,
          experienceLevel: 'BEGINNER',
          level: 1,
          experiencePoints: 0,
          activeDays: 1,
          lastActiveAt: new Date()
        },
        include: {
          badges: true
        }
      });
    }

    // Проверяем, не получен ли badge уже
    const existingBadge = fisherProfile.badges.find(badge => badge.name === badgeName);
    if (existingBadge) {
      return NextResponse.json({
        success: false,
        error: 'badge_already_awarded'
      }, { status: 400 });
    }

    // Создаем badge
    const newBadge = await prisma.fisherBadge.create({
      data: {
        profileId: fisherProfile.id,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        rarity: template.rarity,
        requiredValue: template.requiredValue,
        earnedAt: new Date()
      }
    });

    // Обновляем опыт пользователя
    await updateUserExperienceForBadge(userId, template.rarity);

    // Отправляем уведомление
    await sendBadgeNotifications(userId, [newBadge]);

    console.log(`✅ Manual badge awarded: ${badgeName} to user ${userId}`);

    return NextResponse.json({
      success: true,
      badge: newBadge,
      reason: reason || 'Manual award',
      message: `Successfully awarded ${badgeName} badge`
    });

  } catch (error) {
    console.error('❌ Error in manual badge award:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Manual badge award failed'
    }, { status: 500 });
  }
}

/**
 * GET /api/badges/award - Получить список доступных badge templates
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  let availableBadges = BADGE_TEMPLATES;
  let userBadges = [];

  // Если указан пользователь, показываем его прогресс
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        fisherProfile: {
          include: {
            badges: true
          }
        },
        achievements: {
          where: { unlocked: true },
          include: {
            achievement: true
          }
        }
      }
    });

    if (user?.fisherProfile) {
      userBadges = user.fisherProfile.badges;
      
      // Добавляем информацию о том, может ли пользователь получить каждый badge
      availableBadges = await Promise.all(
        BADGE_TEMPLATES.map(async (template) => {
          const alreadyAwarded = userBadges.some(badge => badge.name === template.name);
          const meetsConditions = alreadyAwarded ? true : await checkBadgeConditions(user, user.fisherProfile, template);
          
          return {
            ...template,
            alreadyAwarded,
            meetsConditions,
            canAward: !alreadyAwarded && meetsConditions
          };
        })
      );
    }
  }

  return NextResponse.json({
    success: true,
    availableBadges,
    userBadges,
    stats: {
      totalTemplates: BADGE_TEMPLATES.length,
      userBadgesCount: userBadges.length,
      availableToAward: availableBadges.filter((b: any) => b.canAward).length
    }
  });
}

/**
 * Проверяет условия для получения badge
 */
async function checkBadgeConditions(user: any, fisherProfile: any, template: BadgeTemplate): Promise<boolean> {
  const { conditions } = template;

  try {
    switch (conditions.type) {
      case 'achievement_count': {
        const achievementCount = user.achievements?.length || 0;
        return compareValue(achievementCount, conditions.value!, conditions.comparison || 'gte');
      }

      case 'achievement_specific': {
        if (!conditions.achievementTypes) return false;
        
        const userAchievementTypes = user.achievements?.map((ua: any) => ua.achievement.type) || [];
        return conditions.achievementTypes.some(type => userAchievementTypes.includes(type));
      }

      case 'trip_count': {
        const tripCount = fisherProfile?.completedTrips || 0;
        return compareValue(tripCount, conditions.value!, conditions.comparison || 'gte');
      }

      case 'rating': {
        const rating = fisherProfile?.rating || 0;
        return compareValue(rating, conditions.value!, conditions.comparison || 'gte');
      }

      case 'reliability': {
        const reliability = fisherProfile?.reliability || 0;
        return compareValue(reliability, conditions.value!, conditions.comparison || 'gte');
      }

      case 'experience_level': {
        return fisherProfile?.experienceLevel === conditions.experienceLevel;
      }

      case 'seasonal': {
        const now = new Date();
        const month = now.getMonth();
        
        switch (conditions.season) {
          case 'winter':
            return month === 11 || month === 0 || month === 1;
          case 'spring':
            return month >= 2 && month <= 4;
          case 'summer':
            return month >= 5 && month <= 7;
          case 'autumn':
            return month >= 8 && month <= 10;
          default:
            return false;
        }
      }

      default:
        return false;
    }
  } catch (error) {
    console.error(`❌ Error checking conditions for badge ${template.name}:`, error);
    return false;
  }
}

/**
 * Сравнивает значения
 */
function compareValue(actual: number, expected: number, comparison: string): boolean {
  switch (comparison) {
    case 'gte':
      return actual >= expected;
    case 'eq':
      return actual === expected;
    case 'lte':
      return actual <= expected;
    default:
      return actual >= expected;
  }
}

/**
 * Обновляет опыт пользователя за получение badge
 */
async function updateUserExperienceForBadge(userId: string, rarity: AchievementRarity) {
  try {
    const experienceBonus = {
      'COMMON': 25,
      'UNCOMMON': 50,
      'RARE': 100,
      'EPIC': 200,
      'LEGENDARY': 400,
      'MYTHIC': 800
    }[rarity] || 50;

    await prisma.fisherProfile.upsert({
      where: { userId },
      update: {
        experiencePoints: { increment: experienceBonus },
        lastActiveAt: new Date()
      },
      create: {
        userId,
        experienceLevel: 'BEGINNER',
        experiencePoints: experienceBonus,
        level: 1,
        activeDays: 1,
        lastActiveAt: new Date()
      }
    });

    console.log(`✨ Added ${experienceBonus} XP for ${rarity} badge`);
  } catch (error) {
    console.error('❌ Error updating user experience for badge:', error);
  }
}

/**
 * Отправляет уведомления о новых badges
 */
async function sendBadgeNotifications(userId: string, badges: any[]) {
  try {
    // Отправляем через SSE систему
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: 'badges_awarded',
        data: {
          badges: badges.map(badge => ({
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity,
            category: badge.category
          })),
          totalAwarded: badges.length
        }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`📢 Badge notifications sent: ${result.sent} connections`);
    } else {
      console.error('❌ Failed to send badge notifications');
    }
  } catch (error) {
    console.error('❌ Error sending badge notifications:', error);
  }
}

/**
 * Обновляет leaderboard после присвоения badges
 */
async function updateLeaderboardForBadges(userId: string, badges: any[]) {
  try {
    const { updateLeaderboardForBadge } = await import('@/lib/services/leaderboard-realtime');
    
    // Обновляем leaderboard для каждого присвоенного badge
    for (const badge of badges) {
      console.log(`📊 Updating leaderboard for badge: ${badge.name}`);
      
      await updateLeaderboardForBadge(userId, badge.name, badge.rarity);
    }
  } catch (error) {
    console.error('❌ Error updating leaderboard for badges:', error);
  }
}
