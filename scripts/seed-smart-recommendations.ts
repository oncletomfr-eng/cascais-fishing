#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSmartRecommendations() {
  console.log('🧠 Seeding Smart Recommendations data...');

  try {
    // Получаем всех капитанов
    const captains = await prisma.user.findMany({
      where: { role: 'CAPTAIN' },
      take: 3,
    });

    if (captains.length === 0) {
      // Создаем тестового капитана если нет капитанов
      const testCaptain = await prisma.user.create({
        data: {
          email: 'captain.manuel@cascaisfishing.com',
          name: 'Капитан Мануэл',
          role: 'CAPTAIN',
          fisherProfile: {
            create: {
              experienceLevel: 'EXPERT',
              bio: 'Опытный капитан с 25-летним стажем морской рыбалки в водах Португалии.',
              completedTrips: 1250,
              rating: 4.9,
              specialties: ['DEEP_SEA', 'SPORT_FISHING'],
              country: 'Portugal',
              city: 'Cascais',
              totalWeightCaught: 25000.5,
              successRate: 94.5,
              totalFishCaught: 5000,
            }
          }
        },
        include: { fisherProfile: true }
      });
      captains.push(testCaptain);
    }

    // Создаем рекомендации от капитанов
    const captainRecommendations = [
      {
        captainId: captains[0].id,
        title: 'Лучшее время для тунца в Кашкайш',
        content: 'В августе-сентябре тунец наиболее активен на глубине 80-120 метров. Рекомендую использовать троллинг с серебряными приманками на рассвете. При северном ветре до 15 узлов шансы на успех увеличиваются в 3 раза.',
        category: 'SPECIES_TARGETING',
        targetSkillLevel: ['INTERMEDIATE', 'ADVANCED'],
        targetSpecies: ['TUNA', 'ALBACORE'],
        targetTechniques: ['TROLLING', 'DEEP_DROP'],
        seasonalContext: [8, 9], // август, сентябрь
        weatherContext: {
          preferredWindSpeed: { min: 5, max: 15 },
          preferredWindDirection: ['NORTH', 'NORTHEAST'],
          optimalTimeOfDay: [5, 8] // 5:00 - 8:00
        },
        locationContext: {
          region: 'Cascais',
          depth: { min: 80, max: 120 },
          distance: '15-25 nautical miles'
        },
        isVerified: true,
        helpfulVotes: 42,
        notHelpfulVotes: 3,
        views: 156,
        endorsements: 8,
      },
      {
        captainId: captains[0].id,
        title: 'Секреты ловли дорадо для новичков',
        content: 'Дорадо отлично клюет на мелководье рядом с скалами. Используйте легкие джиг-головки 10-15г с силиконовыми приманками ярких цветов. Лучшее время - 2 часа до заката. Не спешите с подсечкой, дорадо сначала пробует приманку.',
        category: 'BEGINNER_GUIDE',
        targetSkillLevel: ['BEGINNER', 'INTERMEDIATE'],
        targetSpecies: ['DORADO', 'SEABREAM'],
        targetTechniques: ['JIGGING', 'SPINNING'],
        seasonalContext: [6, 7, 8, 9], // летние месяцы
        weatherContext: {
          preferredWindSpeed: { max: 12 },
          optimalTimeOfDay: [16, 20] // 16:00 - 20:00
        },
        isVerified: true,
        helpfulVotes: 67,
        notHelpfulVotes: 5,
        views: 243,
        endorsements: 12,
      },
      {
        captainId: captains[0].id,
        title: 'Безопасность при сильном ветре',
        content: 'При ветре более 20 узлов избегайте открытого моря. Ловите в защищенных бухтах. Всегда проверяйте прогноз на 6 часов вперед. Имейте запасной план возвращения. Спасательные жилеты обязательны для всех на борту, независимо от опыта.',
        category: 'SAFETY_ADVICE',
        targetSkillLevel: ['ANY'],
        targetSpecies: [],
        targetTechniques: [],
        seasonalContext: [10, 11, 12, 1, 2, 3], // зимние месяцы
        weatherContext: {
          windSpeedWarning: { above: 20 },
          safetyRecommendations: true
        },
        isVerified: true,
        helpfulVotes: 89,
        notHelpfulVotes: 1,
        views: 334,
        endorsements: 15,
      }
    ];

    // Создаем рекомендации капитанов
    for (const rec of captainRecommendations) {
      await prisma.captainRecommendation.create({
        data: {
          ...rec,
          moderationStatus: 'APPROVED',
          isActive: true,
        }
      });
    }

    console.log(`✅ Created ${captainRecommendations.length} captain recommendations`);

    // Создаем тестовые умные рекомендации
    const users = await prisma.user.findMany({
      where: { role: 'PARTICIPANT' },
      take: 2
    });

    if (users.length > 0) {
      const smartRecommendations = [
        {
          type: 'HISTORY_BASED',
          targetUserId: users[0].id,
          title: 'Участники похожих поездок также выбирают',
          description: 'На основе анализа ваших предыдущих поездок, мы рекомендуем эту поездку с высокой вероятностью успеха.',
          relevanceScore: 0.87,
          confidenceScore: 0.82,
          priority: 8,
          recommendedSpecies: ['SEABASS', 'DORADO'],
          recommendedTechniques: ['TROLLING', 'JIGGING'],
          triggerContext: {
            userPreferences: {
              favoriteSpecies: ['SEABASS'],
              frequentTechniques: ['TROLLING']
            }
          },
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
        },
        {
          type: 'SOCIAL_CAPTAIN',
          targetUserRole: ['PARTICIPANT'],
          skillLevel: ['BEGINNER'],
          title: 'Капитан Мануэл особенно рекомендует новичкам',
          description: 'Основываясь на многолетнем опыте, капитан Мануэл считает эту поездку идеальной для начинающих рыболовов.',
          fromCaptainId: captains[0].id,
          relevanceScore: 0.93,
          confidenceScore: 0.95,
          priority: 9,
          recommendedSpecies: ['SEABREAM', 'MACKEREL'],
          recommendedTechniques: ['BOTTOM_FISHING', 'SPINNING'],
          metadata: {
            captainExperience: '25 years',
            successRate: '94%'
          },
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
        }
      ];

      for (const rec of smartRecommendations) {
        await prisma.smartRecommendation.create({
          data: rec
        });
      }

      console.log(`✅ Created ${smartRecommendations.length} smart recommendations`);
    }

    console.log('🎉 Smart Recommendations seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding smart recommendations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Запуск скрипта
seedSmartRecommendations()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
