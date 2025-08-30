#!/usr/bin/env tsx

/**
 * Упрощенное заполнение базы данных тестовыми данными
 * Запуск: npx tsx scripts/simple-seed.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎣 Starting simple database seeding...');

  try {
    // Очистка данных
    await clearDatabase();
    
    // Создание базовых данных
    const users = await createUsers();
    const profiles = await createFisherProfiles(users);
    const achievements = await createBasicAchievements();
    const trips = await createGroupTrips(users);
    const bookings = await createGroupBookings(users, trips);
    
    console.log('\n📊 Created:');
    console.log(`Users: ${users.length}`);
    console.log(`Fisher Profiles: ${profiles.length}`);
    console.log(`Achievements: ${achievements.length}`);
    console.log(`Group Trips: ${trips.length}`);
    console.log(`Group Bookings: ${bookings.length}`);
    
    console.log('\n✅ Simple seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  await prisma.groupBooking.deleteMany();
  await prisma.groupTrip.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.fisherProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  const users = [];
  
  // Создание 10 пользователей
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        id: `user-${i + 1}`,
        name: `Test User ${i + 1}`,
        email: `user${i + 1}@test.com`,
        emailVerified: new Date(),
        image: `https://avatar.iran.liara.run/public/${i + 1}`,
        role: i === 0 ? 'ADMIN' : i <= 3 ? 'CAPTAIN' : 'PARTICIPANT',
      }
    });
    
    users.push(user);
  }
  
  return users;
}

async function createFisherProfiles(users: any[]) {
  console.log('🎣 Creating fisher profiles...');
  
  const profiles = [];
  
  for (const user of users) {
    const profile = await prisma.fisherProfile.create({
      data: {
        userId: user.id,
        experienceLevel: user.role === 'CAPTAIN' ? 'EXPERT' : 'BEGINNER',
        specialties: ['DEEP_SEA', 'SHORE'],
        bio: `I'm ${user.name} and I love fishing!`,
        rating: 4.5,
        completedTrips: user.role === 'CAPTAIN' ? 25 : 5,
        createdTrips: user.role === 'CAPTAIN' ? 10 : 0,
        country: 'Portugal',
        city: 'Cascais',
      }
    });
    
    profiles.push(profile);
  }
  
  return profiles;
}

async function createBasicAchievements() {
  console.log('🏆 Creating achievements...');
  
  const achievementData = [
    { type: 'TUNA_MASTER', name: 'Tuna Master', category: 'FISH_SPECIES', rarity: 'RARE' },
    { type: 'SEABASS_EXPERT', name: 'Seabass Expert', category: 'FISH_SPECIES', rarity: 'COMMON' },
    { type: 'TROLLING_EXPERT', name: 'Trolling Expert', category: 'TECHNIQUE', rarity: 'UNCOMMON' },
    { type: 'GROUP_ORGANIZER', name: 'Group Organizer', category: 'SOCIAL', rarity: 'COMMON' },
    { type: 'DEEP_SEA_ADVENTURER', name: 'Deep Sea Adventurer', category: 'GEOGRAPHY', rarity: 'EPIC' },
  ];
  
  const achievements = [];
  
  for (const data of achievementData) {
    const achievement = await prisma.achievement.create({
      data: {
        type: data.type as any,
        name: data.name,
        description: `Achievement: ${data.name}`,
        icon: '🏆',
        category: data.category as any,
        rarity: data.rarity as any,
        maxProgress: 10,
        progressStep: 1,
        lockedVisible: true,
        isActive: true
      }
    });
    
    achievements.push(achievement);
  }
  
  return achievements;
}

async function createGroupTrips(users: any[]) {
  console.log('🚢 Creating group trips...');
  
  const captains = users.filter(u => u.role === 'CAPTAIN');
  const trips = [];
  
  for (let i = 0; i < 10; i++) {
    const captain = captains[i % captains.length];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7 + i); // 7+ дней в будущем
    
    const trip = await prisma.groupTrip.create({
      data: {
        date: futureDate,
        timeSlot: i % 2 === 0 ? 'MORNING_9AM' : 'AFTERNOON_2PM',
        maxParticipants: 8,
        minRequired: 6,
        pricePerPerson: 95.0,
        status: 'FORMING',
        description: `Fishing trip ${i + 1}`,
        meetingPoint: 'Cascais Marina',
        captainId: captain.id,
        approvalMode: 'MANUAL',
        difficultyRating: 3,
        equipment: 'PROVIDED',
        eventType: 'COMMERCIAL',
        skillLevel: 'ANY',
        socialMode: 'COLLABORATIVE',
        weatherDependency: true
      }
    });
    
    trips.push(trip);
  }
  
  return trips;
}

async function createGroupBookings(users: any[], trips: any[]) {
  console.log('📅 Creating group bookings...');
  
  const participants = users.filter(u => u.role === 'PARTICIPANT');
  const bookings = [];
  
  for (let i = 0; i < 15; i++) {
    const trip = trips[i % trips.length];
    const participant = participants[i % participants.length];
    
    const booking = await prisma.groupBooking.create({
      data: {
        tripId: trip.id,
        participants: Math.floor(Math.random() * 3) + 1, // 1-3 participants
        totalPrice: trip.pricePerPerson,
        contactName: participant.name,
        contactPhone: '+351 912 345 678',
        contactEmail: participant.email,
        status: 'CONFIRMED',
        paymentStatus: 'paid',
        userId: participant.id
      }
    });
    
    bookings.push(booking);
  }
  
  return bookings;
}

// Запуск скрипта
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
