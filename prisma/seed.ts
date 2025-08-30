/**
 * Полное заполнение базы данных тестовыми данными
 * Запуск: npx prisma db seed
 */

import { PrismaClient, UserRole, FishingExperience, FishingSpecialty, BadgeCategory, ApprovalStatus, GroupTripStatus, TimeSlot, SkillLevelRequired, SocialEventMode, EquipmentType, FishingEventType, AchievementRarity, AchievementType, PaymentStatus, BookingStatus, ParticipantApprovalMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎣 Starting comprehensive database seeding...');

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
    const participantApprovals = await createParticipantApprovals(users, groupTrips);
    const reviews = await createReviews(users, groupTrips);
    const catchRecords = await createCatchRecords(users, groupTrips);
    
    console.log('\n📊 Seeding completed:');
    console.log(`Users: ${users.length}`);
    console.log(`Fisher Profiles: ${fisherProfiles.length}`);
    console.log(`Achievements: ${achievements.length}`);
    console.log(`User Achievements: ${userAchievements.length}`);
    console.log(`Group Trips: ${groupTrips.length}`);
    console.log(`Group Bookings: ${groupBookings.length}`);
    console.log(`Participant Approvals: ${participantApprovals.length}`);
    console.log(`Reviews: ${reviews.length}`);
    console.log(`Catch Records: ${catchRecords.length}`);
    
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Порядок удаления важен из-за внешних ключей
  await prisma.catchRecord.deleteMany();
  await prisma.review.deleteMany();
  await prisma.participantApproval.deleteMany();
  await prisma.groupBooking.deleteMany();
  await prisma.groupTrip.deleteMany();
  await prisma.userAchievement.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.fisherProfile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function createUsers() {
  console.log('👥 Creating users...');
  
  const users = [];
  
  // Создание администратора
  const admin = await prisma.user.create({
    data: {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@cascaisfishing.com',
      emailVerified: new Date(),
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
      role: UserRole.ADMIN,
    }
  });
  users.push(admin);
  
  // Создание капитанов
  const captainData = [
    { name: 'Captain João Silva', email: 'joao@cascaisfishing.com', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
    { name: 'Captain Maria Santos', email: 'maria@cascaisfishing.com', image: 'https://images.unsplash.com/photo-1494790108755-2616b612e672?w=150&h=150&fit=crop&crop=face' },
    { name: 'Captain Pedro Costa', email: 'pedro@cascaisfishing.com', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face' },
  ];
  
  for (let i = 0; i < captainData.length; i++) {
    const captain = await prisma.user.create({
      data: {
        id: `captain-${i + 1}`,
        name: captainData[i].name,
        email: captainData[i].email,
        emailVerified: new Date(),
        image: captainData[i].image,
        role: UserRole.CAPTAIN,
      }
    });
    users.push(captain);
  }
  
  // Создание участников
  const participantData = [
    { name: 'Ana Ferreira', email: 'ana@example.com', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face' },
    { name: 'Carlos Miguel', email: 'carlos@example.com', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face' },
    { name: 'Sofia Oliveira', email: 'sofia@example.com', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face' },
    { name: 'Ricardo Silva', email: 'ricardo@example.com', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face' },
    { name: 'Helena Costa', email: 'helena@example.com', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face' },
    { name: 'Nuno Pereira', email: 'nuno@example.com', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face' },
    { name: 'Inês Rodrigues', email: 'ines@example.com', image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face' },
  ];
  
  for (let i = 0; i < participantData.length; i++) {
    const participant = await prisma.user.create({
      data: {
        id: `participant-${i + 1}`,
        name: participantData[i].name,
        email: participantData[i].email,
        emailVerified: new Date(),
        image: participantData[i].image,
        role: UserRole.PARTICIPANT,
      }
    });
    users.push(participant);
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
        experienceLevel: user.role === UserRole.CAPTAIN ? FishingExperience.EXPERT 
                      : user.role === UserRole.ADMIN ? FishingExperience.EXPERT
                      : Math.random() > 0.5 ? FishingExperience.INTERMEDIATE : FishingExperience.BEGINNER,
        specialties: getRandomSpecialties(user.role),
        bio: generateBio(user.name, user.role),
        rating: user.role === UserRole.CAPTAIN ? 4.5 + Math.random() * 0.5 
              : 3.5 + Math.random() * 1.5,
        completedTrips: user.role === UserRole.CAPTAIN ? Math.floor(Math.random() * 50) + 20 
                       : Math.floor(Math.random() * 20) + 1,
        createdTrips: user.role === UserRole.CAPTAIN ? Math.floor(Math.random() * 15) + 5 : 0,
        country: 'Portugal',
        city: ['Cascais', 'Lisbon', 'Porto', 'Setúbal'][Math.floor(Math.random() * 4)],
        isActive: true,
        lastActiveAt: new Date(),
        reliability: 85 + Math.random() * 15,
      }
    });
    
    profiles.push(profile);
  }
  
  return profiles;
}

async function createAchievements() {
  console.log('🏆 Creating achievements...');
  
  const achievementData = [
    { type: AchievementType.TUNA_MASTER, name: 'Tuna Master', category: BadgeCategory.FISH_SPECIES, rarity: AchievementRarity.RARE },
    { type: AchievementType.SEABASS_EXPERT, name: 'Seabass Expert', category: BadgeCategory.FISH_SPECIES, rarity: AchievementRarity.COMMON },
    { type: AchievementType.DORADO_HUNTER, name: 'Dorado Hunter', category: BadgeCategory.FISH_SPECIES, rarity: AchievementRarity.UNCOMMON },
    { type: AchievementType.TROLLING_EXPERT, name: 'Trolling Expert', category: BadgeCategory.TECHNIQUE, rarity: AchievementRarity.UNCOMMON },
    { type: AchievementType.JIGGING_MASTER, name: 'Jigging Master', category: BadgeCategory.TECHNIQUE, rarity: AchievementRarity.RARE },
    { type: AchievementType.GROUP_ORGANIZER, name: 'Group Organizer', category: BadgeCategory.SOCIAL, rarity: AchievementRarity.COMMON },
    { type: AchievementType.DEEP_SEA_ADVENTURER, name: 'Deep Sea Adventurer', category: BadgeCategory.GEOGRAPHY, rarity: AchievementRarity.EPIC },
    { type: AchievementType.SPECIES_COLLECTOR, name: 'Species Collector', category: BadgeCategory.FISH_SPECIES, rarity: AchievementRarity.RARE },
    { type: AchievementType.NEWBIE_MENTOR, name: 'Newbie Mentor', category: BadgeCategory.SOCIAL, rarity: AchievementRarity.UNCOMMON },
    { type: AchievementType.LOCAL_EXPERT, name: 'Local Expert', category: BadgeCategory.GEOGRAPHY, rarity: AchievementRarity.RARE },
  ];
  
  const achievements = [];
  
  for (const data of achievementData) {
    const achievement = await prisma.achievement.create({
      data: {
        type: data.type,
        name: data.name,
        description: `Achievement: ${data.name} - Earned by mastering ${data.name.toLowerCase()}`,
        icon: getAchievementIcon(data.category),
        category: data.category,
        rarity: data.rarity,
        maxProgress: getRarityMaxProgress(data.rarity),
        progressStep: 1,
        lockedVisible: true,
        isActive: true,
      }
    });
    
    achievements.push(achievement);
  }
  
  return achievements;
}

async function createUserAchievements(users: any[], achievements: any[]) {
  console.log('🎖️ Creating user achievements...');
  
  const userAchievements = [];
  
  for (const user of users) {
    // Каждый пользователь получает случайные достижения
    const numAchievements = Math.floor(Math.random() * 4) + 1; // 1-4 achievements
    const userAchievementSet = achievements
      .sort(() => 0.5 - Math.random())
      .slice(0, numAchievements);
    
    for (const achievement of userAchievementSet) {
            const progress = Math.floor(Math.random() * achievement.maxProgress) + 1;
      const unlocked = progress >= achievement.maxProgress;
      
      const userAchievement = await prisma.userAchievement.create({
      data: { 
          userId: user.id,
          achievementId: achievement.id,
          progress: progress,
          unlocked: unlocked,
          unlockedAt: unlocked ? new Date() : null,
        }
      });
      
      userAchievements.push(userAchievement);
    }
  }
  
  return userAchievements;
}

async function createGroupTrips(users: any[]) {
  console.log('🚢 Creating group trips...');
  
  const captains = users.filter(u => u.role === UserRole.CAPTAIN);
  const trips = [];
  
  const tripDescriptions = [
    'Deep sea fishing adventure off the coast of Cascais',
    'Early morning shore fishing in beautiful Cascais Bay',
    'Sport fishing expedition targeting big game fish',
    'Family-friendly fishing trip suitable for beginners',
    'Professional trolling experience with top equipment',
    'Sunset fishing trip with spectacular ocean views',
    'Traditional Portuguese fishing methods workshop',
    'Advanced jigging techniques masterclass',
    'Multi-species fishing adventure',
    'Premium fishing experience with gourmet lunch',
  ];
  
  for (let i = 0; i < 10; i++) {
    const captain = captains[i % captains.length];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1); // 1-30 дней в будущем
    
    const trip = await prisma.groupTrip.create({
      data: {
        date: futureDate,
        timeSlot: Object.values(TimeSlot)[Math.floor(Math.random() * Object.values(TimeSlot).length)],
        maxParticipants: Math.floor(Math.random() * 6) + 4, // 4-9 participants
        minRequired: Math.floor(Math.random() * 3) + 2, // 2-4 minimum
        pricePerPerson: Math.floor(Math.random() * 50) + 50, // 50-99€
        status: Object.values(GroupTripStatus)[Math.floor(Math.random() * 3)], // FORMING, CONFIRMED, CANCELLED
        description: tripDescriptions[i],
        meetingPoint: 'Cascais Marina',
        captainId: captain.id,
        approvalMode: Math.random() > 0.5 ? ParticipantApprovalMode.MANUAL : ParticipantApprovalMode.AUTO,
        difficultyRating: Math.floor(Math.random() * 5) + 1, // 1-5
        equipment: Math.random() > 0.5 ? EquipmentType.PROVIDED : EquipmentType.BRING_OWN,
        eventType: Math.random() > 0.7 ? FishingEventType.TOURNAMENT : FishingEventType.COMMERCIAL,
        skillLevel: Object.values(SkillLevelRequired)[Math.floor(Math.random() * Object.values(SkillLevelRequired).length)],
        socialMode: Object.values(SocialEventMode)[Math.floor(Math.random() * Object.values(SocialEventMode).length)],
        weatherDependency: Math.random() > 0.3,
      }
    });
    
    trips.push(trip);
  }
  
  return trips;
}

async function createGroupBookings(users: any[], trips: any[]) {
  console.log('📅 Creating group bookings...');
  
  const participants = users.filter(u => u.role === UserRole.PARTICIPANT);
  const bookings = [];
  
  for (let i = 0; i < 25; i++) {
    const trip = trips[i % trips.length];
    const participant = participants[i % participants.length];
    
    const numParticipants = Math.floor(Math.random() * 3) + 1; // 1-3 participants
    
    try {
      const booking = await prisma.groupBooking.create({
        data: {
          tripId: trip.id, 
          participants: numParticipants,
          totalPrice: trip.pricePerPerson * numParticipants,
          contactName: participant.name,
          contactPhone: '+351 91' + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
          contactEmail: participant.email,
          status: Object.values(BookingStatus)[Math.floor(Math.random() * Object.values(BookingStatus).length)],
          paymentStatus: Object.values(PaymentStatus)[Math.floor(Math.random() * 3)], // только первые 3 статуса
          userId: participant.id,
          specialRequests: Math.random() > 0.7 ? 'Vegetarian lunch please' : null,
        }
      });
      
      bookings.push(booking);
    } catch (error) {
      // Skip if booking already exists
      console.log(`Skipped duplicate booking for trip ${trip.id} and user ${participant.id}`);
    }
  }
  
  return bookings;
}

async function createParticipantApprovals(users: any[], trips: any[]) {
  console.log('✋ Creating participant approvals...');
  
  const participants = users.filter(u => u.role === UserRole.PARTICIPANT);
  const approvals = [];
  
  for (let i = 0; i < 20; i++) {
    const trip = trips[i % trips.length];
    const participant = participants[i % participants.length];
    
    try {
      const approval = await prisma.participantApproval.create({
        data: {
          tripId: trip.id, 
          participantId: participant.id,
          message: getRandomApprovalMessage(),
          status: Object.values(ApprovalStatus)[Math.floor(Math.random() * Object.values(ApprovalStatus).length)],
          appliedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // within last 7 days
          processedAt: Math.random() > 0.5 ? new Date() : null,
          approvedBy: Math.random() > 0.5 ? trip.captainId : null,
        }
      });
      
      approvals.push(approval);
    } catch (error) {
      // Skip if approval already exists
      console.log(`Skipped duplicate approval for trip ${trip.id} and participant ${participant.id}`);
    }
  }
  
  return approvals;
}

async function createReviews(users: any[], trips: any[]) {
  console.log('⭐ Creating reviews...');
  
  const reviews = [];
  
  for (let i = 0; i < 15; i++) {
    const trip = trips[i % Math.min(trips.length, 5)]; // Only for first 5 trips
    const fromUser = users[Math.floor(Math.random() * users.length)];
    const toUser = users[Math.floor(Math.random() * users.length)];
    
    if (fromUser.id === toUser.id) continue; // Skip self-reviews
    
    try {
      const review = await prisma.review.create({
        data: {
          tripId: trip.id,
          fromUserId: fromUser.id,
          toUserId: toUser.id,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
          comment: getRandomReviewComment(),
          verified: Math.random() > 0.2, // 80% verified
          helpful: Math.floor(Math.random() * 10),
        }
      });
      
      reviews.push(review);
    } catch (error) {
      // Skip if review already exists
      console.log(`Skipped duplicate review for trip ${trip.id} between users ${fromUser.id} and ${toUser.id}`);
    }
  }
  
  return reviews;
}

async function createCatchRecords(users: any[], trips: any[]) {
  console.log('🐟 Creating catch records...');
  
  const fishSpecies = ['Tuna', 'Seabass', 'Sardine', 'Dorado', 'Mackerel', 'Cod', 'Sole', 'Bream'];
  const records = [];
  
  for (let i = 0; i < 20; i++) {
    const trip = trips[i % Math.min(trips.length, 5)]; // Only for first 5 trips
    const user = users[Math.floor(Math.random() * users.length)];
    
    // Для простоты создадим базовую структуру CatchRecord
    const lunarPhase = await prisma.lunarPhase.findFirst();
    if (lunarPhase) {
      const record = await prisma.catchRecord.create({
        data: {
          anglerId: user.id,
          date: new Date(),
          location: {
            latitude: 38.5 + Math.random() * 0.2,
            longitude: -9.5 + Math.random() * 0.2,
            depth: Math.floor(Math.random() * 100) + 10,
          },
          lunarPhaseId: lunarPhase.id,
          catches: [{
            species: fishSpecies[Math.floor(Math.random() * fishSpecies.length)],
            weight: Math.random() * 10 + 0.5,
            length: Math.random() * 50 + 20,
            technique: ['Trolling', 'Jigging', 'Casting', 'Bottom Fishing'][Math.floor(Math.random() * 4)],
            released: Math.random() > 0.3,
          }],
          totalWeight: Math.random() * 10 + 0.5,
          totalCount: 1,
          techniques: ['TROLLING'],
          weatherData: {
            description: 'Sunny, light breeze',
            temperature: 22,
            windSpeed: 5,
          },
          duration: Math.floor(Math.random() * 480) + 120, // 2-8 hours
          success: true,
        }
      });
      
      records.push(record);
    }
  }
  
  return records;
}

// Helper functions
function getRandomSpecialties(role: UserRole): FishingSpecialty[] {
  const allSpecialties = Object.values(FishingSpecialty);
  const numSpecialties = role === UserRole.CAPTAIN ? 
    Math.floor(Math.random() * 3) + 2 : // 2-4 for captains
    Math.floor(Math.random() * 2) + 1;  // 1-2 for others
  
  return allSpecialties
    .sort(() => 0.5 - Math.random())
    .slice(0, numSpecialties);
}

function generateBio(name: string, role: UserRole): string {
  const bios = {
    [UserRole.ADMIN]: `Platform administrator and fishing enthusiast.`,
    [UserRole.CAPTAIN]: `Experienced fishing captain with years of expertise on Portuguese waters. ${name} specializes in creating memorable fishing experiences for all skill levels.`,
    [UserRole.PARTICIPANT]: `Passionate angler who loves exploring new fishing spots and learning from fellow fishers. ${name} believes every fishing trip is an adventure.`,
  };
  
  return bios[role];
}

function getAchievementIcon(category: BadgeCategory): string {
  const icons = {
    [BadgeCategory.FISH_SPECIES]: '🐟',
    [BadgeCategory.TECHNIQUE]: '🎣',
    [BadgeCategory.SOCIAL]: '👥',
    [BadgeCategory.GEOGRAPHY]: '🗺️',
    [BadgeCategory.ACHIEVEMENT]: '🏆',
    [BadgeCategory.MILESTONE]: '🎖️',
    [BadgeCategory.SPECIAL]: '⭐',
    [BadgeCategory.SEASONAL]: '🌊',
  };
  
  return icons[category] || '🏆';
}

function getRarityMaxProgress(rarity: AchievementRarity): number {
  const progressMap = {
    [AchievementRarity.COMMON]: 5,
    [AchievementRarity.UNCOMMON]: 10,
    [AchievementRarity.RARE]: 25,
    [AchievementRarity.EPIC]: 50,
    [AchievementRarity.LEGENDARY]: 100,
    [AchievementRarity.MYTHIC]: 200,
  };
  
  return progressMap[rarity] || 10;
}

function getRandomApprovalMessage(): string {
  const messages = [
    "Hi! I would love to join this fishing trip. I have some experience and I'm very excited!",
    "This looks like an amazing opportunity. I'm a beginner but eager to learn.",
    "I'm an experienced angler and would be happy to share knowledge with the group.",
    "Looking forward to this adventure! I can bring some extra equipment if needed.",
    "Perfect timing for me! I've been wanting to try deep sea fishing.",
    "I'm bringing my son along - hope that's okay! We're both excited.",
    "Been fishing these waters before and know some great spots!",
    "This will be my first group trip but I'm ready for the challenge!",
  ];
  
  return messages[Math.floor(Math.random() * messages.length)];
}

function getRandomReviewComment(): string {
  const comments = [
    "Fantastic trip! The captain was very knowledgeable and the fishing was excellent.",
    "Great experience overall. Well organized and caught some beautiful fish!",
    "Amazing day on the water. Perfect for beginners and experts alike.",
    "Professional service and great equipment. Highly recommend!",
    "Beautiful weather, great company, and successful fishing. What more could you ask for?",
    "The captain shared great tips and made everyone feel welcome.",
    "Perfect trip for families. My kids had an amazing time!",
    "Excellent value for money. Will definitely book again!",
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
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