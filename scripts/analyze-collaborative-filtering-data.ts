#!/usr/bin/env tsx

/**
 * Анализ данных для реализации Collaborative Filtering
 * Запуск: npx tsx scripts/analyze-collaborative-filtering-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeCollaborativeFilteringData() {
  console.log('🔍 Analyzing data for Collaborative Filtering implementation...\n');
  
  try {
    // Проверяем общую статистику пользователей и бронирований
    const users = await prisma.user.count();
    const groupBookings = await prisma.groupBooking.findMany({
      include: {
        trip: true,
        user: true
      }
    });
    
    console.log('👥 Users:', users);
    console.log('📅 Group Bookings:', groupBookings.length);
    
    // Анализируем распределение бронирований по пользователям
    const userBookingCounts: Record<string, number> = {};
    groupBookings.forEach(booking => {
      const userId = booking.userId;
      userBookingCounts[userId] = (userBookingCounts[userId] || 0) + 1;
    });
    
    const bookingDistribution = Object.values(userBookingCounts);
    const avgBookingsPerUser = bookingDistribution.length > 0 ? 
      bookingDistribution.reduce((a, b) => a + b, 0) / bookingDistribution.length : 0;
    const maxBookings = bookingDistribution.length > 0 ? Math.max(...bookingDistribution) : 0;
    const minBookings = bookingDistribution.length > 0 ? Math.min(...bookingDistribution) : 0;
    
    console.log('\n📊 Booking Distribution Analysis:');
    console.log('  Average bookings per user:', avgBookingsPerUser.toFixed(2));
    console.log('  Max bookings per user:', maxBookings);
    console.log('  Min bookings per user:', minBookings);
    console.log('  Users with bookings:', Object.keys(userBookingCounts).length);
    
    // Проверяем разнообразие trip типов
    const uniqueTrips = new Set(groupBookings.map(b => b.tripId));
    console.log('  Unique trips booked:', uniqueTrips.size);
    
    // Проверяем статусы бронирований
    const statusCounts: Record<string, number> = {};
    groupBookings.forEach(booking => {
      statusCounts[booking.status] = (statusCounts[booking.status] || 0) + 1;
    });
    
    console.log('\n📋 Booking Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });
    
    // Показываем примеры данных пользователей
    console.log('\n👤 Sample User Booking Patterns:');
    const sampleUsers = Object.entries(userBookingCounts).slice(0, 5);
    for (const [userId, bookingCount] of sampleUsers) {
      const userBookings = groupBookings.filter(b => b.userId === userId);
      const tripTypes = userBookings.map(b => b.trip?.description?.substring(0, 30) + '...');
      console.log(`  User ${userId}: ${bookingCount} bookings`);
      console.log(`    Trips: ${tripTypes.join(', ')}`);
    }
    
    // Анализируем данные для collaborative filtering
    console.log('\n🤖 Collaborative Filtering Readiness Assessment:');
    const hasEnoughUsers = users >= 10;
    const hasEnoughInteractions = groupBookings.length >= 20;
    const hasUserDiversity = avgBookingsPerUser >= 1.5;
    const hasItemDiversity = uniqueTrips.size >= 3;
    const hasActiveUsers = Object.keys(userBookingCounts).length >= 5;
    
    console.log('  ✅ Sufficient users (≥10):', hasEnoughUsers ? 'YES' : 'NO', `(${users})`);
    console.log('  ✅ Sufficient interactions (≥20):', hasEnoughInteractions ? 'YES' : 'NO', `(${groupBookings.length})`);  
    console.log('  ✅ User interaction diversity (≥1.5):', hasUserDiversity ? 'YES' : 'NO', `(${avgBookingsPerUser.toFixed(2)})`);
    console.log('  ✅ Item diversity (≥3):', hasItemDiversity ? 'YES' : 'NO', `(${uniqueTrips.size})`);
    console.log('  ✅ Active users (≥5):', hasActiveUsers ? 'YES' : 'NO', `(${Object.keys(userBookingCounts).length})`);
    
    const overallReadiness = hasEnoughUsers && hasEnoughInteractions && hasUserDiversity && hasItemDiversity && hasActiveUsers;
    
    console.log('\n🎯 Overall CF Readiness:', overallReadiness ? '✅ READY' : '❌ NEEDS MORE DATA');
    
    if (!overallReadiness) {
      console.log('\n💡 Recommendations for CF implementation:');
      if (!hasEnoughUsers) console.log('  - Need more users in the system');
      if (!hasEnoughInteractions) console.log('  - Need more booking interactions');
      if (!hasUserDiversity) console.log('  - Users need more diverse booking history');
      if (!hasItemDiversity) console.log('  - Need more variety in trip types');
      if (!hasActiveUsers) console.log('  - Need more users with booking history');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing CF data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeCollaborativeFilteringData()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
