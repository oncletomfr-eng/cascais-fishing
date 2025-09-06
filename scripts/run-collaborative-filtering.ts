#!/usr/bin/env tsx

/**
 * Запуск процесса Collaborative Filtering
 * Запуск: npx tsx scripts/run-collaborative-filtering.ts
 */

import { collaborativeFilteringService } from '../lib/services/collaborative-filtering-service';
import prisma from '../lib/prisma';

async function main() {
  console.log('🎣 Starting Collaborative Filtering for Cascais Fishing...\n');
  
  try {
    // Запускаем полный цикл collaborative filtering
    await collaborativeFilteringService.processCollaborativeFiltering();

    // Тестируем получение рекомендаций для нескольких пользователей
    console.log('\n🔍 Testing recommendations retrieval...');
    
    // Получаем список пользователей с бронированиями
    const usersWithBookings = await prisma.groupBooking.findMany({
      select: {
        userId: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      distinct: ['userId'],
      take: 3
    });

    for (const booking of usersWithBookings) {
      console.log(`\n👤 User: ${booking.user.name} (${booking.userId})`);
      
      const recommendations = await collaborativeFilteringService.getRecommendationsForUser(booking.userId);
      
      if (recommendations.length > 0) {
        console.log(`  ✅ Found ${recommendations.length} recommendations:`);
        
        recommendations.forEach((rec, index) => {
          console.log(`    ${index + 1}. ${rec.recommendedTrip?.description?.substring(0, 50)}...`);
          console.log(`       Score: ${rec.relevanceScore?.toFixed(3)}`);
          console.log(`       Reason: ${rec.description}`);
          console.log(`       Similar users: ${rec.metadata?.similarUsers?.length || 0}`);
        });
      } else {
        console.log('  ⚠️ No recommendations found');
      }
    }

    // Проверяем общую статистику рекомендаций
    const totalRecommendations = await prisma.smartRecommendation.count({
      where: {
        type: 'COLLABORATIVE'
      }
    });

    const uniqueUsers = await prisma.smartRecommendation.findMany({
      where: {
        type: 'COLLABORATIVE'
      },
      select: {
        targetUserId: true
      },
      distinct: ['targetUserId']
    });

    console.log('\n📊 Final Statistics:');
    console.log(`  Total CF recommendations: ${totalRecommendations}`);
    console.log(`  Users with recommendations: ${uniqueUsers.length}`);
    console.log(`  Average recommendations per user: ${totalRecommendations > 0 ? (totalRecommendations / uniqueUsers.length).toFixed(1) : 0}`);

    console.log('\n🎉 Collaborative Filtering process completed successfully!');
    
  } catch (error) {
    console.error('❌ Error running collaborative filtering:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('\n✅ Process finished successfully!');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
