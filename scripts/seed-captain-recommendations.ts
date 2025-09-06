#!/usr/bin/env tsx

/**
 * Заполнение базы данных капитанскими рекомендациями
 * Запуск: npx tsx scripts/seed-captain-recommendations.ts
 */

import { CaptainRecommendationCategory, ModerationStatus, SkillLevelRequired, FishSpecies, FishingTechnique } from '@prisma/client';
import prisma from '../lib/prisma';

async function main() {
  console.log('🎣 Creating captain recommendations...');

  try {
    // Получаем капитанов из базы данных
    const captains = await prisma.user.findMany({
      where: { role: 'CAPTAIN' }
    });

    if (captains.length === 0) {
      console.error('❌ No captains found in database');
      return;
    }

    // Создаем рекомендации от первого капитана (João Silva)
    const captain = captains[0];

    const recommendations = [
      {
        captainId: captain.id,
        title: "Лучшее время для тунца в Кашкайш",
        content: "Для успешной ловли тунца рекомендую выходить на рассвете, когда вода еще прохладная. Используйте живую наживку - сардину или скумбрию. Лучшие месяцы: май-сентябрь.",
        category: CaptainRecommendationCategory.SPECIES_TARGETING,
        targetSkillLevel: [SkillLevelRequired.BEGINNER],
        targetSpecies: [FishSpecies.TUNA],
        seasonalContext: [5, 6, 7, 8, 9], // май-сентябрь
        isVerified: true,
        moderationStatus: ModerationStatus.APPROVED,
        helpfulVotes: 15,
        notHelpfulVotes: 2,
        views: 120,
      },
      {
        captainId: captain.id,
        title: "Секреты ловли дорадо для новичков", 
        content: "Дорадо отлично клюет на троллинг в утренние часы. Скорость 4-6 узлов, глубина 10-20 метров. Обязательно используйте яркие приманки - желтые и красные. Не забывайте про поводки!",
        category: CaptainRecommendationCategory.TECHNIQUE_ADVICE,
        targetSkillLevel: [SkillLevelRequired.BEGINNER], 
        targetSpecies: [FishSpecies.DORADO],
        targetTechniques: [FishingTechnique.TROLLING],
        isVerified: true,
        moderationStatus: ModerationStatus.APPROVED,
        helpfulVotes: 23,
        notHelpfulVotes: 1,
        views: 89,
      },
      {
        captainId: captain.id,
        title: "Безопасность при сильном ветре",
        content: "При ветре свыше 15 узлов рекомендую держаться ближе к берегу. Обязательно проверьте спасательные жилеты и радиосвязь. В случае шторма - немедленно возвращайтесь в порт.",
        category: CaptainRecommendationCategory.SAFETY_ADVICE,
        targetSkillLevel: [SkillLevelRequired.ANY],
        weatherContext: { maxWindSpeed: 15, conditions: ["windy", "stormy"] },
        isVerified: true,
        moderationStatus: ModerationStatus.APPROVED,
        helpfulVotes: 31,
        notHelpfulVotes: 0,
        views: 156,
      },
    ];

    for (const recData of recommendations) {
      const recommendation = await prisma.captainRecommendation.create({
        data: recData
      });
      
      console.log(`✅ Created recommendation: "${recommendation.title}"`);
    }

    console.log('\n📊 Captain recommendations created successfully!');
    console.log(`Total recommendations: ${recommendations.length}`);
    console.log(`Captain: ${captain.name} (${captain.email})`);
    
  } catch (error) {
    console.error('❌ Error creating captain recommendations:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
