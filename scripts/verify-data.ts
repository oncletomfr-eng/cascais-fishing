#!/usr/bin/env tsx

/**
 * Проверка заполненной базы данных
 * Запуск: npx tsx scripts/verify-data.ts
 */

import prisma from '../lib/prisma';

async function main() {
  console.log('🔍 Verifying database data...\n');

  try {
    // Проверка пользователей
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });
    console.log(`👥 Users: ${users.length}`);
    console.log('Sample users:');
    users.slice(0, 3).forEach(user => {
      console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
    });

    // Проверка профилей рыболовов
    const profiles = await prisma.fisherProfile.findMany({
      select: {
        userId: true,
        experienceLevel: true,
        specialties: true,
        rating: true,
        completedTrips: true,
      }
    });
    console.log(`\n🎣 Fisher Profiles: ${profiles.length}`);
    console.log('Sample profiles:');
    profiles.slice(0, 3).forEach(profile => {
      console.log(`  - Experience: ${profile.experienceLevel}, Rating: ${profile.rating.toFixed(1)}, Trips: ${profile.completedTrips}`);
    });

    // Проверка достижений
    const achievements = await prisma.achievement.findMany({
      select: {
        name: true,
        category: true,
        rarity: true,
        isActive: true,
      }
    });
    console.log(`\n🏆 Achievements: ${achievements.length}`);
    console.log('Sample achievements:');
    achievements.slice(0, 3).forEach(achievement => {
      console.log(`  - ${achievement.name} (${achievement.category}, ${achievement.rarity})`);
    });

    // Проверка групповых поездок
    const groupTrips = await prisma.groupTrip.findMany({
      select: {
        id: true,
        description: true,
        date: true,
        status: true,
        pricePerPerson: true,
        maxParticipants: true,
      }
    });
    console.log(`\n🚢 Group Trips: ${groupTrips.length}`);
    console.log('Sample trips:');
    groupTrips.slice(0, 3).forEach(trip => {
      console.log(`  - ${trip.description} (${trip.status}) - €${trip.pricePerPerson} for ${trip.maxParticipants} max`);
    });

    // Проверка бронирований
    const bookings = await prisma.groupBooking.findMany({
      select: {
        contactName: true,
        participants: true,
        totalPrice: true,
        status: true,
        paymentStatus: true,
      }
    });
    console.log(`\n📅 Group Bookings: ${bookings.length}`);
    console.log('Sample bookings:');
    bookings.slice(0, 3).forEach(booking => {
      console.log(`  - ${booking.contactName}: ${booking.participants} people, €${booking.totalPrice} (${booking.status}/${booking.paymentStatus})`);
    });

    // Проверка заявок
    const approvals = await prisma.participantApproval.findMany({
      select: {
        status: true,
        message: true,
        appliedAt: true,
      }
    });
    console.log(`\n✋ Participant Approvals: ${approvals.length}`);
    const approvalsByStatus = approvals.reduce((acc, approval) => {
      acc[approval.status] = (acc[approval.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log('Approvals by status:', approvalsByStatus);

    // Проверка отзывов
    const reviews = await prisma.review.findMany({
      select: {
        rating: true,
        verified: true,
        helpful: true,
      }
    });
    console.log(`\n⭐ Reviews: ${reviews.length}`);
    const avgRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    const verifiedCount = reviews.filter(r => r.verified).length;
    console.log(`Average rating: ${avgRating.toFixed(1)}/5, Verified: ${verifiedCount}/${reviews.length}`);

    // Проверка записей улова
    const catchRecords = await prisma.catchRecord.findMany({
      select: {
        totalWeight: true,
        totalCount: true,
        success: true,
        techniques: true,
      }
    });
    console.log(`\n🐟 Catch Records: ${catchRecords.length}`);
    const totalWeight = catchRecords.reduce((acc, record) => acc + record.totalWeight, 0);
    const totalFish = catchRecords.reduce((acc, record) => acc + record.totalCount, 0);
    const successfulTrips = catchRecords.filter(r => r.success).length;
    console.log(`Total catch: ${totalWeight.toFixed(2)}kg, ${totalFish} fish, Success rate: ${successfulTrips}/${catchRecords.length}`);

    console.log('\n✅ Database verification completed successfully!');
    console.log('\n📊 Summary Statistics:');
    console.log(`Total records created: ${users.length + profiles.length + achievements.length + groupTrips.length + bookings.length + approvals.length + reviews.length + catchRecords.length}`);
    
  } catch (error) {
    console.error('❌ Error verifying database:', error);
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
