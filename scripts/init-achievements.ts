/**
 * Скрипт для инициализации системы достижений
 * Создает все базовые достижения в базе данных
 */

import { prisma } from '../lib/prisma';
import { ALL_ACHIEVEMENTS } from '../lib/types/achievements';

async function initializeAchievements() {
  console.log('🏆 Initializing achievements system...');
  
  try {
    // Получаем существующие достижения
    const existingAchievements = await prisma.achievement.findMany();
    const existingTypes = new Set(existingAchievements.map(a => a.type));
    
    console.log(`📊 Found ${existingAchievements.length} existing achievements`);

    // Создаем новые достижения
    const achievementsToCreate = Object.values(ALL_ACHIEVEMENTS)
      .filter(config => !existingTypes.has(config.type))
      .map(config => ({
        type: config.type,
        name: config.name,
        description: config.description,
        icon: config.icon,
        category: config.category,
        rarity: config.rarity,
        maxProgress: config.maxProgress,
        progressStep: config.progressStep,
        lockedVisible: config.lockedVisible,
        lockedDescVisible: config.lockedDescVisible,
      }));

    if (achievementsToCreate.length > 0) {
      await prisma.achievement.createMany({
        data: achievementsToCreate,
        skipDuplicates: true,
      });
      console.log(`✅ Created ${achievementsToCreate.length} new achievements`);
    } else {
      console.log('✅ All achievements already exist');
    }

    // Статистика по категориям
    const allAchievements = await prisma.achievement.findMany();
    const categories = allAchievements.reduce((acc, achievement) => {
      acc[achievement.category] = (acc[achievement.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Achievement Statistics:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`   ${category}: ${count} achievements`);
    });

    console.log(`\n🎯 Total: ${allAchievements.length} achievements in system`);

  } catch (error) {
    console.error('❌ Error initializing achievements:', error);
    process.exit(1);
  }
}

async function createSampleUserAchievements(userId: string) {
  console.log(`\n👤 Creating sample achievements for user: ${userId}`);
  
  try {
    // Получаем все достижения
    const achievements = await prisma.achievement.findMany();
    
    // Создаем записи прогресса для пользователя
    const userAchievements = achievements.map(achievement => ({
      userId,
      achievementId: achievement.id,
      progress: 0,
      unlocked: false,
    }));

    await prisma.userAchievement.createMany({
      data: userAchievements,
      skipDuplicates: true,
    });

    console.log(`✅ Created ${userAchievements.length} achievement tracking records`);

    // Разблокируем несколько стартовых достижений для демонстрации
    const starterAchievements = achievements
      .filter(a => ['SEABASS_EXPERT', 'COMMUNITY_BUILDER', 'REVIEW_MASTER'].includes(a.type))
      .slice(0, 2);

    for (const achievement of starterAchievements) {
      await prisma.userAchievement.updateMany({
        where: { userId, achievementId: achievement.id },
        data: { 
          progress: Math.floor(achievement.maxProgress / 2), // Половина прогресса
          unlocked: false,
        },
      });
    }

    console.log(`✅ Set initial progress for ${starterAchievements.length} starter achievements`);

  } catch (error) {
    console.error('❌ Error creating user achievements:', error);
  }
}

async function main() {
  console.log('🚀 Starting achievement system initialization...\n');
  
  await initializeAchievements();
  
  // Опционально создаем пример достижений для тестового пользователя
  const testUserId = process.argv[2];
  if (testUserId) {
    await createSampleUserAchievements(testUserId);
  }

  await prisma.$disconnect();
  console.log('\n🎉 Achievement system initialization completed!');
}

// Запуск скрипта
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { initializeAchievements, createSampleUserAchievements };
