#!/usr/bin/env tsx

/**
 * Полное заполнение базы данных тестовыми данными
 * Запуск: npx tsx scripts/seed-full-database.ts
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

// Устанавливаем locale для португальских данных
faker.locale = 'pt_BR'; // Португальский для Cascais

async function main() {
  console.log('🎣 Starting full database seeding...');

  try {
    // Очистка существующих данных
    await clearDatabase();
    
    // Создание данных в правильном порядке (учитывая зависимости)
    const users = await createUsers();
    const fisherProfiles = await createFisherProfiles(users);
    const achievements = await createAchievements();
    const userAchievements = await createUserAchievements(users, achievements);
    const groupTrips = await createGroupTrips(users);
    const groupBookings = await createGroupBookings(users, groupTrips);
    const privateBookings = await createPrivateBookings();
    const participantApprovals = await createParticipantApprovals(users, groupTrips);
    const reviews = await createReviews(users, groupTrips);
    const subscriptions = await createSubscriptions(users);
    const payments = await createPayments(users, subscriptions, groupTrips);
    const courses = await createCourses();
    const courseEnrollments = await createCourseEnrollments(users, courses);
    const advertisements = await createAdvertisements(users);
    
    // Морской календарь и данные
    const lunarPhases = await createLunarPhases();
    const fishingConditions = await createFishingConditions(lunarPhases);
    const catchRecords = await createCatchRecords(users, lunarPhases);
    
    // Цифровой дневник
    const diaryEntries = await createFishingDiaryEntries(users);
    const diaryCatches = await createDiaryFishCatches(diaryEntries);
    const diaryMedia = await createDiaryMedia(diaryEntries);
    
    // Умные рекомендации
    const smartRecommendations = await createSmartRecommendations(users, groupTrips);
    const weatherRecommendations = await createWeatherRecommendations();
    const captainRecommendations = await createCaptainRecommendations(users);
    
    // Статистика
    await printSeedingStats();
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Удаляем в обратном порядке зависимостей
  await prisma.diaryMedia.deleteMany();
  await prisma.diaryFishCatch.deleteMany();
  await prisma.fishingDiaryEntry.deleteMany();
  await prisma.recommendationInteraction.deleteMany();
  await prisma.captainRecommendationVote.deleteMany();
  await prisma.captainRecommendation.deleteMany();
  await prisma.weatherRecommendation.deleteMany();
  await prisma.smartRecommendation.deleteMany();
  await prisma.tripSimilarity.deleteMany();
  await prisma.catchRecord.deleteMany();
  await prisma.fishingConditions.deleteMany();
  await prisma.lunarPhase.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.courseEnrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.review.deleteMany();
  await prisma.participantApproval.deleteMany();
  await prisma.groupBooking.deleteMany();
  await prisma.privateBooking.deleteMany();
  await prisma.eventSkillCriteria.deleteMany();
  await prisma.groupTrip.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.fisherBadge.deleteMany();
  await prisma.fisherProfile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  const users = [];
  
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email(firstName, lastName);
    
    const user = await prisma.user.create({
      data: {
        id: `user-${i + 1}`,
        name: `${firstName} ${lastName}`,
        email: email.toLowerCase(),
        emailVerified: faker.date.recent({ days: 30 }),
        image: faker.image.avatar(),
        role: i === 0 ? 'ADMIN' : i <= 3 ? 'CAPTAIN' : 'PARTICIPANT',
      }
    });
    
    users.push(user);
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function createFisherProfiles(users: any[]) {
  console.log('🎣 Creating fisher profiles...');
  
  const profiles = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    const profile = await prisma.fisherProfile.create({
      data: {
        userId: user.id,
        experienceLevel: faker.helpers.arrayElement(['BEGINNER', 'INTERMEDIATE', 'EXPERT']),
        specialties: faker.helpers.arrayElements(['DEEP_SEA', 'SHORE', 'FLY_FISHING', 'SPORT_FISHING'], { min: 1, max: 3 }),
        bio: faker.lorem.paragraph({ min: 1, max: 3 }),
        rating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
        completedTrips: faker.number.int({ min: 0, max: 50 }),
        createdTrips: user.role === 'CAPTAIN' ? faker.number.int({ min: 5, max: 25 }) : 0,
        reliability: faker.number.float({ min: 80.0, max: 100.0, fractionDigits: 2 }),
        totalReviews: faker.number.int({ min: 0, max: 30 }),
        positiveReviews: faker.number.int({ min: 0, max: 25 }),
        level: faker.number.int({ min: 1, max: 10 }),
        experiencePoints: faker.number.int({ min: 0, max: 5000 }),
        activeDays: faker.number.int({ min: 1, max: 200 }),
        activeDaysConsecutive: faker.number.int({ min: 1, max: 30 }),
        totalFishCaught: faker.number.int({ min: 0, max: 500 }),
        uniqueSpecies: faker.helpers.arrayElements(['SEABASS', 'DORADO', 'SEABREAM', 'MACKEREL', 'TUNA'], { min: 1, max: 5 }),
        favoriteLocation: 'Cascais Marina',
        country: 'Portugal',
        city: 'Cascais',
        latitude: faker.location.latitude({ min: 38.6, max: 38.8 }),
        longitude: faker.location.longitude({ min: -9.5, max: -9.3 }),
        totalWeightCaught: faker.number.float({ min: 0, max: 200, fractionDigits: 2 }),
        successRate: faker.number.float({ min: 40, max: 90, fractionDigits: 2 }),
        favoriteLocations: ['Cascais Marina', 'Estoril Bay', 'Sintra Coast'],
        fishingZones: ['coastal', 'deep-sea', 'reef']
      }
    });
    
    profiles.push(profile);
  }
  
  console.log(`✅ Created ${profiles.length} fisher profiles`);
  return profiles;
}

async function createAchievements() {
  console.log('🏆 Creating achievements...');
  
  const achievementTypes = [
    'TUNA_MASTER', 'DORADO_HUNTER', 'SEABASS_EXPERT', 'MARLIN_LEGEND', 'SPECIES_COLLECTOR',
    'TROLLING_EXPERT', 'JIGGING_MASTER', 'BOTTOM_FISHING_PRO', 'FLY_FISHING_ARTIST', 'TECHNIQUE_VERSATILE',
    'NEWBIE_MENTOR', 'GROUP_ORGANIZER', 'COMMUNITY_BUILDER', 'REVIEW_MASTER', 'RELIABLE_FISHER',
    'REEF_EXPLORER', 'DEEP_SEA_ADVENTURER', 'COASTAL_SPECIALIST', 'WORLD_TRAVELER', 'LOCAL_EXPERT'
  ];
  
  const categories = ['FISH_SPECIES', 'TECHNIQUE', 'SOCIAL', 'GEOGRAPHY'];
  const rarities = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
  
  const achievements = [];
  
  for (let i = 0; i < Math.min(achievementTypes.length, 20); i++) {
    const achievement = await prisma.achievement.create({
      data: {
        type: achievementTypes[i],
        name: achievementTypes[i].replace('_', ' ').toLowerCase(),
        description: faker.lorem.sentence(),
        icon: `🎣`,
        category: faker.helpers.arrayElement(categories),
        rarity: faker.helpers.arrayElement(rarities),
        maxProgress: faker.helpers.arrayElement([1, 5, 10, 25, 50]),
        progressStep: 1,
        lockedVisible: true,
        lockedDescVisible: faker.datatype.boolean(),
        isActive: true
      }
    });
    
    achievements.push(achievement);
  }
  
  console.log(`✅ Created ${achievements.length} achievements`);
  return achievements;
}

async function createUserAchievements(users: any[], achievements: any[]) {
  console.log('🏅 Creating user achievements...');
  
  const userAchievements = [];
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userAchievementCount = faker.number.int({ min: 2, max: 8 });
    const selectedAchievements = faker.helpers.arrayElements(achievements, userAchievementCount);
    
    for (const achievement of selectedAchievements) {
      const progress = faker.number.int({ min: 1, max: achievement.maxProgress });
      const unlocked = progress >= achievement.maxProgress;
      
      const userAchievement = await prisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          progress,
          unlocked,
          unlockedAt: unlocked ? faker.date.recent({ days: 60 }) : null
        }
      });
      
      userAchievements.push(userAchievement);
    }
  }
  
  console.log(`✅ Created ${userAchievements.length} user achievements`);
  return userAchievements;
}

async function createGroupTrips(users: any[]) {
  console.log('🚢 Creating group trips...');
  
  const trips = [];
  const captains = users.filter(u => u.role === 'CAPTAIN');
  
  for (let i = 0; i < 10; i++) {
    const futureDate = faker.date.future({ years: 1 });
    const captain = faker.helpers.arrayElement(captains);
    
    const trip = await prisma.groupTrip.create({
      data: {
        date: futureDate,
        timeSlot: faker.helpers.arrayElement(['MORNING_9AM', 'AFTERNOON_2PM']),
        maxParticipants: faker.number.int({ min: 6, max: 12 }),
        minRequired: faker.number.int({ min: 4, max: 6 }),
        pricePerPerson: faker.number.float({ min: 75, max: 120, fractionDigits: 2 }),
        status: faker.helpers.arrayElement(['FORMING', 'CONFIRMED', 'COMPLETED']),
        description: faker.lorem.sentence(),
        meetingPoint: faker.helpers.arrayElement(['Cascais Marina', 'Estoril Harbor', 'Sintra Coast']),
        specialNotes: faker.lorem.sentence(),
        captainId: captain.id,
        approvalMode: faker.helpers.arrayElement(['AUTO', 'MANUAL', 'SKILL_BASED']),
        departureLocation: faker.helpers.arrayElement(['Cascais Marina', 'Estoril Harbor']),
        difficultyRating: faker.number.int({ min: 1, max: 5 }),
        equipment: faker.helpers.arrayElement(['PROVIDED', 'BRING_OWN', 'RENTAL_AVAILABLE']),
        estimatedFishCatch: faker.number.int({ min: 1, max: 20 }),
        eventType: faker.helpers.arrayElement(['COMMERCIAL', 'COMMUNITY', 'TOURNAMENT', 'LEARNING']),
        fishingTechniques: faker.helpers.arrayElements(['TROLLING', 'JIGGING', 'BOTTOM_FISHING', 'SPINNING'], { min: 1, max: 3 }),
        fishingZones: faker.helpers.arrayElements(['coastal', 'deep-sea', 'reef'], { min: 1, max: 2 }),
        maxGroupSize: faker.number.int({ min: 8, max: 12 }),
        minimumWeatherScore: faker.number.int({ min: 5, max: 9 }),
        recommendedFor: faker.helpers.arrayElements(['beginners', 'experienced', 'families'], { min: 1, max: 2 }),
        skillLevel: faker.helpers.arrayElement(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ANY']),
        socialMode: faker.helpers.arrayElement(['COMPETITIVE', 'COLLABORATIVE', 'EDUCATIONAL', 'RECREATIONAL']),
        targetSpecies: faker.helpers.arrayElements(['SEABASS', 'DORADO', 'MACKEREL', 'TUNA'], { min: 1, max: 3 }),
        weatherDependency: faker.datatype.boolean()
      }
    });
    
    trips.push(trip);
  }
  
  console.log(`✅ Created ${trips.length} group trips`);
  return trips;
}

async function createGroupBookings(users: any[], trips: any[]) {
  console.log('📅 Creating group bookings...');
  
  const bookings = [];
  
  for (let i = 0; i < 15; i++) { // Больше бронирований чем поездок
    const trip = faker.helpers.arrayElement(trips);
    const user = faker.helpers.arrayElement(users.filter(u => u.role === 'PARTICIPANT'));
    
    const booking = await prisma.groupBooking.create({
      data: {
        tripId: trip.id,
        participants: faker.number.int({ min: 1, max: 4 }),
        totalPrice: faker.number.float({ min: 75, max: 400, fractionDigits: 2 }),
        contactName: faker.person.fullName(),
        contactPhone: faker.phone.number(),
        contactEmail: faker.internet.email(),
        status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
        paymentStatus: faker.helpers.arrayElement(['pending', 'paid', 'refunded']),
        specialRequests: faker.lorem.sentence(),
        userId: user.id
      }
    });
    
    bookings.push(booking);
  }
  
  console.log(`✅ Created ${bookings.length} group bookings`);
  return bookings;
}

async function createPrivateBookings() {
  console.log('🛥️ Creating private bookings...');
  
  const bookings = [];
  
  for (let i = 0; i < 10; i++) {
    const booking = await prisma.privateBooking.create({
      data: {
        date: faker.date.future({ years: 1 }),
        timeSlot: faker.helpers.arrayElement(['MORNING_9AM', 'AFTERNOON_2PM']),
        participants: faker.number.int({ min: 1, max: 6 }),
        contactName: faker.person.fullName(),
        contactPhone: faker.phone.number(),
        contactEmail: faker.internet.email(),
        totalPrice: faker.number.float({ min: 300, max: 800, fractionDigits: 2 }),
        status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
        specialRequests: faker.lorem.sentence()
      }
    });
    
    bookings.push(booking);
  }
  
  console.log(`✅ Created ${bookings.length} private bookings`);
  return bookings;
}

async function createParticipantApprovals(users: any[], trips: any[]) {
  console.log('✋ Creating participant approvals...');
  
  const approvals = [];
  
  for (let i = 0; i < 12; i++) {
    const trip = faker.helpers.arrayElement(trips);
    const participant = faker.helpers.arrayElement(users.filter(u => u.role === 'PARTICIPANT'));
    
    try {
      const approval = await prisma.participantApproval.create({
        data: {
          tripId: trip.id,
          participantId: participant.id,
          message: faker.lorem.sentence(),
          status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'REJECTED']),
          approvedBy: trip.captainId,
          rejectedReason: faker.datatype.boolean() ? faker.lorem.sentence() : null,
          processedAt: faker.date.recent({ days: 10 })
        }
      });
      
      approvals.push(approval);
    } catch (error) {
      // Пропускаем дубликаты (unique constraint)
      console.log(`Skipping duplicate approval for trip ${trip.id} and participant ${participant.id}`);
    }
  }
  
  console.log(`✅ Created ${approvals.length} participant approvals`);
  return approvals;
}

async function createReviews(users: any[], trips: any[]) {
  console.log('⭐ Creating reviews...');
  
  const reviews = [];
  
  for (let i = 0; i < 15; i++) {
    const trip = faker.helpers.arrayElement(trips);
    const fromUser = faker.helpers.arrayElement(users);
    const toUser = faker.helpers.arrayElement(users.filter(u => u.id !== fromUser.id));
    
    try {
      const review = await prisma.review.create({
        data: {
          tripId: trip.id,
          fromUserId: fromUser.id,
          toUserId: toUser.id,
          rating: faker.number.int({ min: 3, max: 5 }),
          comment: faker.lorem.paragraph(),
          verified: faker.datatype.boolean(),
          helpful: faker.number.int({ min: 0, max: 10 })
        }
      });
      
      reviews.push(review);
    } catch (error) {
      // Пропускаем дубликаты
      console.log(`Skipping duplicate review for trip ${trip.id}`);
    }
  }
  
  console.log(`✅ Created ${reviews.length} reviews`);
  return reviews;
}

async function createSubscriptions(users: any[]) {
  console.log('💳 Creating subscriptions...');
  
  const subscriptions = [];
  const captains = users.filter(u => u.role === 'CAPTAIN');
  
  for (let i = 0; i < Math.min(captains.length, 5); i++) {
    const captain = captains[i];
    
    const subscription = await prisma.subscription.create({
      data: {
        userId: captain.id,
        stripeCustomerId: `cus_${faker.string.alphanumeric(14)}`,
        stripeSubscriptionId: `sub_${faker.string.alphanumeric(14)}`,
        stripePriceId: 'price_captain_premium',
        tier: 'CAPTAIN_PREMIUM',
        status: faker.helpers.arrayElement(['ACTIVE', 'PAST_DUE', 'CANCELED']),
        currentPeriodStart: faker.date.recent({ days: 30 }),
        currentPeriodEnd: faker.date.future({ days: 30 }),
        cancelAtPeriodEnd: faker.datatype.boolean(),
        metadata: {
          plan: 'captain_premium_monthly',
          features: ['priority_booking', 'analytics', 'premium_filters']
        }
      }
    });
    
    subscriptions.push(subscription);
  }
  
  console.log(`✅ Created ${subscriptions.length} subscriptions`);
  return subscriptions;
}

async function createPayments(users: any[], subscriptions: any[], trips: any[]) {
  console.log('💰 Creating payments...');
  
  const payments = [];
  
  // Платежи за подписки
  for (const subscription of subscriptions) {
    const payment = await prisma.payment.create({
      data: {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        stripePaymentId: `pi_${faker.string.alphanumeric(14)}`,
        type: 'SUBSCRIPTION',
        amount: 5000, // €50 in cents
        currency: 'EUR',
        status: 'SUCCEEDED',
        description: 'Captain Premium Subscription'
      }
    });
    
    payments.push(payment);
  }
  
  // Платежи за туры
  for (let i = 0; i < 10; i++) {
    const trip = faker.helpers.arrayElement(trips);
    const user = faker.helpers.arrayElement(users);
    const amount = faker.number.int({ min: 7500, max: 15000 }); // €75-150 in cents
    
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        tripId: trip.id,
        stripePaymentId: `pi_${faker.string.alphanumeric(14)}`,
        type: 'TOUR_BOOKING',
        amount,
        currency: 'EUR',
        status: faker.helpers.arrayElement(['PENDING', 'SUCCEEDED', 'FAILED']),
        commissionAmount: Math.round(amount * 0.15), // 15% commission
        commissionRate: 0.15,
        description: 'Fishing Trip Booking'
      }
    });
    
    payments.push(payment);
  }
  
  console.log(`✅ Created ${payments.length} payments`);
  return payments;
}

async function createCourses() {
  console.log('🎓 Creating courses...');
  
  const courses = [];
  const courseData = [
    { title: 'Basic Fishing Techniques', category: 'BASIC_FISHING', price: 2500 },
    { title: 'Advanced Trolling Methods', category: 'ADVANCED_TECHNIQUES', price: 4900 },
    { title: 'Captain License Course', category: 'CAPTAIN_LICENSE', price: 12500 },
    { title: 'Marine Safety Essentials', category: 'SAFETY', price: 1500 },
    { title: 'Equipment Maintenance', category: 'EQUIPMENT', price: 3000 }
  ];
  
  for (const data of courseData) {
    const course = await prisma.course.create({
      data: {
        title: data.title,
        description: faker.lorem.paragraph(),
        category: data.category,
        price: data.price,
        stripePriceId: `price_${data.category.toLowerCase()}`,
        content: {
          modules: [
            { title: 'Introduction', duration: 30, content: 'Basic concepts' },
            { title: 'Practical Skills', duration: 60, content: 'Hands-on training' },
            { title: 'Assessment', duration: 30, content: 'Final evaluation' }
          ]
        },
        duration: 120,
        difficulty: faker.helpers.arrayElement(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
        published: true
      }
    });
    
    courses.push(course);
  }
  
  console.log(`✅ Created ${courses.length} courses`);
  return courses;
}

async function createCourseEnrollments(users: any[], courses: any[]) {
  console.log('📚 Creating course enrollments...');
  
  const enrollments = [];
  
  for (let i = 0; i < 15; i++) {
    const user = faker.helpers.arrayElement(users);
    const course = faker.helpers.arrayElement(courses);
    
    try {
      const enrollment = await prisma.courseEnrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          status: faker.helpers.arrayElement(['ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED']),
          progress: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
          score: faker.number.float({ min: 60, max: 100, fractionDigits: 1 }),
          startedAt: faker.date.recent({ days: 30 }),
          completedAt: faker.datatype.boolean() ? faker.date.recent({ days: 15 }) : null,
          certificateIssued: faker.datatype.boolean()
        }
      });
      
      enrollments.push(enrollment);
    } catch (error) {
      // Пропускаем дубликаты
      console.log(`Skipping duplicate enrollment for user ${user.id} and course ${course.id}`);
    }
  }
  
  console.log(`✅ Created ${enrollments.length} course enrollments`);
  return enrollments;
}

async function createAdvertisements(users: any[]) {
  console.log('📢 Creating advertisements...');
  
  const ads = [];
  const captains = users.filter(u => u.role === 'CAPTAIN');
  
  for (let i = 0; i < 10; i++) {
    const captain = faker.helpers.arrayElement(captains);
    
    const ad = await prisma.advertisement.create({
      data: {
        userId: captain.id,
        title: faker.commerce.productName(),
        description: faker.lorem.sentence(),
        imageUrl: faker.image.url(),
        targetUrl: faker.internet.url(),
        type: faker.helpers.arrayElement(['EQUIPMENT_PROMOTION', 'FEATURED_LISTING', 'SPONSOR_MESSAGE']),
        priority: faker.helpers.arrayElement(['LOW', 'NORMAL', 'HIGH', 'PREMIUM']),
        targetAudience: {
          skillLevels: ['BEGINNER', 'INTERMEDIATE'],
          interests: ['deep-sea', 'coastal']
        },
        locations: ['Cascais', 'Estoril', 'Sintra'],
        budget: faker.number.int({ min: 10000, max: 100000 }), // €100-1000 in cents
        costPerClick: faker.number.int({ min: 50, max: 200 }), // €0.50-2.00 in cents
        impressions: faker.number.int({ min: 100, max: 5000 }),
        clicks: faker.number.int({ min: 5, max: 200 }),
        conversions: faker.number.int({ min: 1, max: 20 }),
        status: faker.helpers.arrayElement(['ACTIVE', 'PAUSED', 'COMPLETED']),
        startDate: faker.date.recent({ days: 30 }),
        endDate: faker.date.future({ days: 30 })
      }
    });
    
    ads.push(ad);
  }
  
  console.log(`✅ Created ${ads.length} advertisements`);
  return ads;
}

async function createLunarPhases() {
  console.log('🌙 Creating lunar phases...');
  
  const phases = [];
  const phaseTypes = ['NEW_MOON', 'WAXING_CRESCENT', 'FIRST_QUARTER', 'WAXING_GIBBOUS', 
                     'FULL_MOON', 'WANING_GIBBOUS', 'LAST_QUARTER', 'WANING_CRESCENT'];
  
  for (let i = 0; i < 10; i++) {
    const phase = await prisma.lunarPhase.create({
      data: {
        date: faker.date.future({ years: 1 }),
        type: faker.helpers.arrayElement(phaseTypes),
        angle: faker.number.float({ min: 0, max: 360, fractionDigits: 2 }),
        illumination: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        distanceKm: faker.number.float({ min: 356000, max: 407000, fractionDigits: 0 }),
        apparentDiameter: faker.number.float({ min: 29.5, max: 33.5, fractionDigits: 3 }),
        chineseLunarData: {
          day: faker.number.int({ min: 1, max: 30 }),
          animal: faker.helpers.arrayElement(['Rat', 'Ox', 'Tiger', 'Rabbit'])
        },
        fishingInfluence: {
          impact: faker.helpers.arrayElement(['positive', 'negative', 'neutral']),
          strength: faker.helpers.arrayElement(['weak', 'moderate', 'strong'])
        }
      }
    });
    
    phases.push(phase);
  }
  
  console.log(`✅ Created ${phases.length} lunar phases`);
  return phases;
}

async function createFishingConditions(lunarPhases: any[]) {
  console.log('🌊 Creating fishing conditions...');
  
  const conditions = [];
  
  for (let i = 0; i < 10; i++) {
    const lunarPhase = faker.helpers.arrayElement(lunarPhases);
    
    const condition = await prisma.fishingConditions.create({
      data: {
        date: faker.date.future({ years: 1 }),
        location: {
          name: 'Cascais Waters',
          latitude: 38.7071,
          longitude: -9.4212
        },
        overallRating: faker.number.int({ min: 3, max: 9 }),
        lunarPhaseId: lunarPhase.id,
        tidalInfluence: {
          nextHigh: faker.date.future({ hours: 8 }),
          nextLow: faker.date.future({ hours: 14 }),
          strength: faker.helpers.arrayElement(['weak', 'moderate', 'strong'])
        },
        weatherImpact: {
          windEffect: faker.helpers.arrayElement(['positive', 'negative', 'neutral']),
          pressureEffect: faker.helpers.arrayElement(['rising', 'falling', 'stable'])
        },
        bestHours: [
          { start: '06:00', end: '08:00' },
          { start: '18:00', end: '20:00' }
        ],
        recommendations: [
          'Use live bait for better results',
          'Early morning fishing recommended',
          'Check tide tables'
        ],
        speciesInfluence: {
          SEABASS: { activity: 'high', techniques: ['SPINNING', 'LIVE_BAIT'] },
          DORADO: { activity: 'moderate', techniques: ['TROLLING'] }
        }
      }
    });
    
    conditions.push(condition);
  }
  
  console.log(`✅ Created ${conditions.length} fishing conditions`);
  return conditions;
}

async function createCatchRecords(users: any[], lunarPhases: any[]) {
  console.log('🎣 Creating catch records...');
  
  const records = [];
  
  for (let i = 0; i < 20; i++) {
    const angler = faker.helpers.arrayElement(users);
    const lunarPhase = faker.helpers.arrayElement(lunarPhases);
    
    const record = await prisma.catchRecord.create({
      data: {
        date: faker.date.recent({ days: 90 }),
        location: {
          name: faker.helpers.arrayElement(['Cascais Deep', 'Estoril Bay', 'Sintra Coast']),
          latitude: faker.location.latitude({ min: 38.6, max: 38.8 }),
          longitude: faker.location.longitude({ min: -9.5, max: -9.3 })
        },
        anglerId: angler.id,
        lunarPhaseId: lunarPhase.id,
        catches: [
          {
            species: faker.helpers.arrayElement(['SEABASS', 'DORADO', 'MACKEREL', 'TUNA']),
            weight: faker.number.float({ min: 0.5, max: 15.0, fractionDigits: 2 }),
            length: faker.number.float({ min: 20, max: 80, fractionDigits: 1 }),
            time: faker.date.recent({ days: 1 })
          }
        ],
        totalWeight: faker.number.float({ min: 1.0, max: 25.0, fractionDigits: 2 }),
        totalCount: faker.number.int({ min: 1, max: 8 }),
        weatherData: {
          temperature: faker.number.float({ min: 15, max: 28, fractionDigits: 1 }),
          windSpeed: faker.number.float({ min: 2, max: 15, fractionDigits: 1 }),
          conditions: faker.helpers.arrayElement(['sunny', 'cloudy', 'overcast'])
        },
        techniques: faker.helpers.arrayElements(['TROLLING', 'JIGGING', 'SPINNING'], { min: 1, max: 2 }),
        duration: faker.number.int({ min: 120, max: 480 }), // 2-8 hours
        success: faker.datatype.boolean({ probability: 0.8 }),
        notes: faker.lorem.sentence(),
        verified: faker.datatype.boolean({ probability: 0.7 }),
        dataSource: faker.helpers.arrayElement(['USER_REPORT', 'CAPTAIN_LOG']),
        confidence: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 })
      }
    });
    
    records.push(record);
  }
  
  console.log(`✅ Created ${records.length} catch records`);
  return records;
}

async function createFishingDiaryEntries(users: any[]) {
  console.log('📓 Creating fishing diary entries...');
  
  const entries = [];
  
  for (let i = 0; i < 15; i++) {
    const user = faker.helpers.arrayElement(users);
    
    const entry = await prisma.fishingDiaryEntry.create({
      data: {
        userId: user.id,
        title: faker.lorem.words(3),
        description: faker.lorem.paragraph(),
        date: faker.date.recent({ days: 60 }),
        locationName: faker.helpers.arrayElement(['Cascais Marina', 'Secret Spot', 'Rocky Point']),
        latitude: faker.location.latitude({ min: 38.6, max: 38.8 }),
        longitude: faker.location.longitude({ min: -9.5, max: -9.3 }),
        accuracy: faker.number.float({ min: 5, max: 50, fractionDigits: 1 }),
        weather: {
          condition: faker.helpers.arrayElement(['sunny', 'cloudy', 'rainy']),
          temperature: faker.number.float({ min: 15, max: 28, fractionDigits: 1 }),
          windSpeed: faker.number.float({ min: 0, max: 20, fractionDigits: 1 })
        },
        temperature: faker.number.float({ min: 16, max: 24, fractionDigits: 1 }),
        windSpeed: faker.number.float({ min: 2, max: 15, fractionDigits: 1 }),
        windDirection: faker.helpers.arrayElement(['NORTH', 'SOUTH', 'EAST', 'WEST']),
        totalWeight: faker.number.float({ min: 0.5, max: 20.0, fractionDigits: 2 }),
        totalCount: faker.number.int({ min: 1, max: 10 }),
        rodType: faker.helpers.arrayElement(['Spinning Rod', 'Trolling Rod', 'Fly Rod']),
        reelType: faker.helpers.arrayElement(['Spinning Reel', 'Baitcasting Reel']),
        lineType: faker.helpers.arrayElement(['Monofilament', 'Braided', 'Fluorocarbon']),
        baitUsed: faker.helpers.arrayElements(['Sardine', 'Squid', 'Lure', 'Worm'], { min: 1, max: 3 }),
        lureColor: faker.helpers.arrayElement(['Silver', 'Blue', 'Green', 'Red']),
        tags: faker.helpers.arrayElements(['success', 'technique', 'location', 'weather'], { min: 1, max: 3 }),
        isPrivate: faker.datatype.boolean({ probability: 0.3 }),
        rating: faker.number.int({ min: 3, max: 5 })
      }
    });
    
    entries.push(entry);
  }
  
  console.log(`✅ Created ${entries.length} fishing diary entries`);
  return entries;
}

async function createDiaryFishCatches(diaryEntries: any[]) {
  console.log('🐟 Creating diary fish catches...');
  
  const catches = [];
  
  for (const entry of diaryEntries) {
    const catchCount = faker.number.int({ min: 1, max: 5 });
    
    for (let i = 0; i < catchCount; i++) {
      const fishCatch = await prisma.diaryFishCatch.create({
        data: {
          entryId: entry.id,
          species: faker.helpers.arrayElement(['SEABASS', 'DORADO', 'MACKEREL', 'SEABREAM', 'SARDINE']),
          weight: faker.number.float({ min: 0.3, max: 8.0, fractionDigits: 2 }),
          length: faker.number.float({ min: 15, max: 60, fractionDigits: 1 }),
          quantity: faker.number.int({ min: 1, max: 3 }),
          timeOfCatch: faker.date.recent({ days: 1 }),
          depth: faker.number.float({ min: 5, max: 50, fractionDigits: 1 }),
          method: faker.helpers.arrayElement(['SPINNING', 'TROLLING', 'BOTTOM_FISHING']),
          baitUsed: faker.helpers.arrayElement(['Sardine', 'Squid', 'Lure']),
          wasReleased: faker.datatype.boolean({ probability: 0.3 }),
          notes: faker.lorem.sentence()
        }
      });
      
      catches.push(fishCatch);
    }
  }
  
  console.log(`✅ Created ${catches.length} diary fish catches`);
  return catches;
}

async function createDiaryMedia(diaryEntries: any[]) {
  console.log('📸 Creating diary media...');
  
  const media = [];
  
  for (let i = 0; i < 20; i++) {
    const entry = faker.helpers.arrayElement(diaryEntries);
    
    const mediaItem = await prisma.diaryMedia.create({
      data: {
        entryId: entry.id,
        fileName: faker.system.fileName({ extensionCount: 1 }),
        fileUrl: faker.image.url(),
        fileSize: faker.number.int({ min: 100000, max: 5000000 }),
        mimeType: faker.helpers.arrayElement(['image/jpeg', 'image/png', 'video/mp4']),
        mediaType: faker.helpers.arrayElement(['PHOTO', 'VIDEO']),
        exifData: {
          make: 'iPhone',
          model: 'iPhone 14 Pro',
          dateTime: faker.date.recent({ days: 1 }),
          gps: {
            latitude: faker.location.latitude(),
            longitude: faker.location.longitude()
          }
        },
        gpsLatitude: faker.location.latitude({ min: 38.6, max: 38.8 }),
        gpsLongitude: faker.location.longitude({ min: -9.5, max: -9.3 }),
        captureTime: faker.date.recent({ days: 1 }),
        cameraModel: 'iPhone 14 Pro',
        title: faker.lorem.words(2),
        description: faker.lorem.sentence(),
        isPublic: faker.datatype.boolean({ probability: 0.7 })
      }
    });
    
    media.push(mediaItem);
  }
  
  console.log(`✅ Created ${media.length} diary media items`);
  return media;
}

async function createSmartRecommendations(users: any[], trips: any[]) {
  console.log('🤖 Creating smart recommendations...');
  
  const recommendations = [];
  
  for (let i = 0; i < 15; i++) {
    const user = faker.helpers.arrayElement(users);
    const trip = faker.helpers.arrayElement(trips);
    
    const recommendation = await prisma.smartRecommendation.create({
      data: {
        type: faker.helpers.arrayElement(['HISTORY_BASED', 'WEATHER_AI', 'SOCIAL_CAPTAIN', 'COLLABORATIVE']),
        targetUserId: user.id,
        targetUserRole: ['PARTICIPANT'],
        skillLevel: ['ANY'],
        title: faker.lorem.words(4),
        description: faker.lorem.sentence(),
        aiGeneratedText: faker.lorem.paragraph(),
        triggerContext: {
          weatherConditions: { temperature: 20, windSpeed: 5 },
          userHistory: { completedTrips: 5, preferredTechniques: ['SPINNING'] }
        },
        weatherConditions: {
          temperature: faker.number.float({ min: 15, max: 25 }),
          windSpeed: faker.number.float({ min: 2, max: 10 }),
          conditions: 'favorable'
        },
        recommendedTripId: trip.id,
        recommendedSpecies: faker.helpers.arrayElements(['SEABASS', 'DORADO', 'MACKEREL'], { min: 1, max: 2 }),
        recommendedTechniques: faker.helpers.arrayElements(['SPINNING', 'TROLLING'], { min: 1, max: 2 }),
        recommendedLocation: {
          name: 'Cascais Deep Waters',
          latitude: 38.7071,
          longitude: -9.4212
        },
        priority: faker.number.int({ min: 1, max: 10 }),
        relevanceScore: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
        confidenceScore: faker.number.float({ min: 0.6, max: 1.0, fractionDigits: 2 }),
        impressions: faker.number.int({ min: 10, max: 100 }),
        clicks: faker.number.int({ min: 1, max: 20 }),
        conversions: faker.number.int({ min: 0, max: 5 }),
        validFrom: faker.date.recent({ days: 5 }),
        validUntil: faker.date.future({ days: 10 }),
        isActive: true,
        metadata: {
          source: 'ai_engine',
          version: '1.0',
          confidence: 'high'
        }
      }
    });
    
    recommendations.push(recommendation);
  }
  
  console.log(`✅ Created ${recommendations.length} smart recommendations`);
  return recommendations;
}

async function createWeatherRecommendations() {
  console.log('🌤️ Creating weather recommendations...');
  
  const recommendations = [];
  
  for (let i = 0; i < 10; i++) {
    const recommendation = await prisma.weatherRecommendation.create({
      data: {
        weatherConditions: {
          temperature: faker.number.float({ min: 15, max: 25 }),
          windSpeed: faker.number.float({ min: 2, max: 15 }),
          pressure: faker.number.float({ min: 1010, max: 1025 }),
          humidity: faker.number.float({ min: 60, max: 90 })
        },
        windSpeed: faker.number.float({ min: 2, max: 15 }),
        windDirection: faker.helpers.arrayElement(['NORTH', 'SOUTH', 'EAST', 'WEST']),
        temperature: faker.number.float({ min: 15, max: 25 }),
        pressure: faker.number.float({ min: 1010, max: 1025 }),
        humidity: faker.number.float({ min: 60, max: 90 }),
        cloudCover: faker.number.float({ min: 0, max: 1 }),
        recommendedSpecies: faker.helpers.arrayElements(['SEABASS', 'DORADO', 'MACKEREL'], { min: 1, max: 3 }),
        recommendedTechniques: faker.helpers.arrayElements(['SPINNING', 'TROLLING', 'JIGGING'], { min: 1, max: 2 }),
        recommendedTimeOfDay: [6, 8], // 6 AM to 8 AM
        recommendedDepth: faker.number.float({ min: 10, max: 50 }),
        aiAnalysis: faker.lorem.paragraph(),
        aiReasoning: faker.lorem.sentence(),
        confidenceLevel: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
        location: {
          latitude: 38.7071,
          longitude: -9.4212
        },
        regionId: 'cascais-waters',
        validFor: faker.date.future({ days: 2 }),
        usageCount: faker.number.int({ min: 0, max: 50 }),
        successRate: faker.number.float({ min: 0.4, max: 0.9, fractionDigits: 2 })
      }
    });
    
    recommendations.push(recommendation);
  }
  
  console.log(`✅ Created ${recommendations.length} weather recommendations`);
  return recommendations;
}

async function createCaptainRecommendations(users: any[]) {
  console.log('👨‍✈️ Creating captain recommendations...');
  
  const recommendations = [];
  const captains = users.filter(u => u.role === 'CAPTAIN');
  
  for (let i = 0; i < 10; i++) {
    const captain = faker.helpers.arrayElement(captains);
    
    const recommendation = await prisma.captainRecommendation.create({
      data: {
        captainId: captain.id,
        title: faker.lorem.words(3),
        content: faker.lorem.paragraph(),
        category: faker.helpers.arrayElement(['TECHNIQUE_ADVICE', 'SPECIES_TARGETING', 'LOCATION_TIPS', 'WEATHER_STRATEGY']),
        targetSkillLevel: faker.helpers.arrayElements(['BEGINNER', 'INTERMEDIATE'], { min: 1, max: 2 }),
        targetSpecies: faker.helpers.arrayElements(['SEABASS', 'DORADO'], { min: 1, max: 2 }),
        targetTechniques: faker.helpers.arrayElements(['SPINNING', 'TROLLING'], { min: 1, max: 2 }),
        seasonalContext: faker.helpers.arrayElements([3, 4, 5, 6], { min: 2, max: 4 }), // Spring/Summer months
        weatherContext: {
          idealConditions: ['sunny', 'light_wind'],
          avoidConditions: ['storm', 'heavy_rain']
        },
        locationContext: {
          areas: ['cascais_deep', 'estoril_bay'],
          coordinates: { lat: 38.7071, lng: -9.4212 }
        },
        relatedTripIds: [],
        isVerified: faker.datatype.boolean({ probability: 0.7 }),
        endorsements: faker.number.int({ min: 0, max: 15 }),
        views: faker.number.int({ min: 10, max: 500 }),
        helpfulVotes: faker.number.int({ min: 0, max: 25 }),
        notHelpfulVotes: faker.number.int({ min: 0, max: 5 }),
        isActive: true,
        moderationStatus: faker.helpers.arrayElement(['APPROVED', 'PENDING'])
      }
    });
    
    recommendations.push(recommendation);
  }
  
  console.log(`✅ Created ${recommendations.length} captain recommendations`);
  return recommendations;
}

async function printSeedingStats() {
  console.log('\n📊 Database Seeding Statistics:');
  console.log('================================');
  
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.fisherProfile.count(),
    prisma.groupTrip.count(),
    prisma.groupBooking.count(),
    prisma.privateBooking.count(),
    prisma.achievement.count(),
    prisma.userAchievement.count(),
    prisma.review.count(),
    prisma.payment.count(),
    prisma.subscription.count(),
    prisma.course.count(),
    prisma.courseEnrollment.count(),
    prisma.advertisement.count(),
    prisma.lunarPhase.count(),
    prisma.fishingConditions.count(),
    prisma.catchRecord.count(),
    prisma.fishingDiaryEntry.count(),
    prisma.diaryFishCatch.count(),
    prisma.diaryMedia.count(),
    prisma.smartRecommendation.count(),
    prisma.weatherRecommendation.count(),
    prisma.captainRecommendation.count()
  ]);
  
  const labels = [
    'Users', 'Fisher Profiles', 'Group Trips', 'Group Bookings', 'Private Bookings',
    'Achievements', 'User Achievements', 'Reviews', 'Payments', 'Subscriptions',
    'Courses', 'Course Enrollments', 'Advertisements', 'Lunar Phases', 
    'Fishing Conditions', 'Catch Records', 'Diary Entries', 'Diary Fish Catches',
    'Diary Media', 'Smart Recommendations', 'Weather Recommendations', 'Captain Recommendations'
  ];
  
  labels.forEach((label, index) => {
    console.log(`${label.padEnd(25)}: ${stats[index]}`);
  });
  
  const totalRecords = stats.reduce((sum, count) => sum + count, 0);
  console.log('================================');
  console.log(`Total Records: ${totalRecords}`);
  console.log('================================');
}

// Запуск скрипта
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

export { main as seedFullDatabase };
