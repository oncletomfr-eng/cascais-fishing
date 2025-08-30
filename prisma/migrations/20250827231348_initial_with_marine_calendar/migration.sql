-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."BadgeCategory" AS ENUM ('ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL', 'FISH_SPECIES', 'TECHNIQUE', 'SOCIAL', 'GEOGRAPHY');

-- CreateEnum
CREATE TYPE "public"."BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."BookingType" AS ENUM ('PRIVATE', 'GROUP');

-- CreateEnum
CREATE TYPE "public"."EquipmentType" AS ENUM ('PROVIDED', 'BRING_OWN', 'RENTAL_AVAILABLE', 'PARTIALLY_PROVIDED');

-- CreateEnum
CREATE TYPE "public"."FishSpecies" AS ENUM ('SEABASS', 'DORADO', 'SEABREAM', 'MACKEREL', 'SARDINE', 'TUNA', 'ALBACORE', 'BONITO', 'SWORDFISH', 'MAHI_MAHI', 'BLUE_MARLIN', 'WHITE_MARLIN', 'SAILFISH', 'GROUPER', 'RED_SNAPPER', 'JOHN_DORY', 'SOLE', 'TURBOT', 'AMBERJACK', 'CONGER_EEL', 'OCTOPUS', 'CUTTLEFISH', 'MIXED_SPECIES');

-- CreateEnum
CREATE TYPE "public"."FishingEventType" AS ENUM ('COMMERCIAL', 'COMMUNITY', 'TOURNAMENT', 'LEARNING');

-- CreateEnum
CREATE TYPE "public"."FishingExperience" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "public"."FishingSpecialty" AS ENUM ('DEEP_SEA', 'SHORE', 'FLY_FISHING', 'SPORT_FISHING');

-- CreateEnum
CREATE TYPE "public"."FishingTechnique" AS ENUM ('TROLLING', 'JIGGING', 'BOTTOM_FISHING', 'FLY_FISHING', 'SPINNING', 'SURFCASTING', 'DRIFTING', 'POPPING', 'LIVE_BAIT', 'DEEP_DROP');

-- CreateEnum
CREATE TYPE "public"."GroupTripStatus" AS ENUM ('FORMING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."ParticipantApprovalMode" AS ENUM ('AUTO', 'MANUAL', 'SKILL_BASED', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."SkillCriteriaType" AS ENUM ('MINIMUM_EXPERIENCE', 'COMPLETED_TRIPS', 'SPECIES_EXPERIENCE', 'TECHNIQUE_SKILL', 'CERTIFICATION', 'EQUIPMENT_OWNERSHIP', 'RATING_THRESHOLD', 'LANGUAGE_REQUIREMENT');

-- CreateEnum
CREATE TYPE "public"."SkillLevelRequired" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ANY');

-- CreateEnum
CREATE TYPE "public"."SocialEventMode" AS ENUM ('COMPETITIVE', 'COLLABORATIVE', 'EDUCATIONAL', 'RECREATIONAL', 'FAMILY');

-- CreateEnum
CREATE TYPE "public"."TimeSlot" AS ENUM ('MORNING_9AM', 'AFTERNOON_2PM');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('PARTICIPANT', 'CAPTAIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."AchievementRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "public"."AchievementType" AS ENUM ('TUNA_MASTER', 'DORADO_HUNTER', 'SEABASS_EXPERT', 'MARLIN_LEGEND', 'SPECIES_COLLECTOR', 'TROLLING_EXPERT', 'JIGGING_MASTER', 'BOTTOM_FISHING_PRO', 'FLY_FISHING_ARTIST', 'TECHNIQUE_VERSATILE', 'NEWBIE_MENTOR', 'GROUP_ORGANIZER', 'COMMUNITY_BUILDER', 'REVIEW_MASTER', 'RELIABLE_FISHER', 'REEF_EXPLORER', 'DEEP_SEA_ADVENTURER', 'COASTAL_SPECIALIST', 'WORLD_TRAVELER', 'LOCAL_EXPERT');

-- CreateEnum
CREATE TYPE "public"."SubscriptionTier" AS ENUM ('FREE', 'CAPTAIN_PREMIUM');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID');

-- CreateEnum
CREATE TYPE "public"."PaymentType" AS ENUM ('SUBSCRIPTION', 'TOUR_BOOKING', 'COURSE_PURCHASE', 'ADVERTISING');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."CourseCategory" AS ENUM ('BASIC_FISHING', 'ADVANCED_TECHNIQUES', 'CAPTAIN_LICENSE', 'SAFETY', 'EQUIPMENT');

-- CreateEnum
CREATE TYPE "public"."CourseDifficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('ENROLLED', 'IN_PROGRESS', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "public"."AdType" AS ENUM ('EQUIPMENT_PROMOTION', 'FEATURED_LISTING', 'SPONSOR_MESSAGE');

-- CreateEnum
CREATE TYPE "public"."AdPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."AdStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."LunarPhaseType" AS ENUM ('NEW_MOON', 'WAXING_CRESCENT', 'FIRST_QUARTER', 'WAXING_GIBBOUS', 'FULL_MOON', 'WANING_GIBBOUS', 'LAST_QUARTER', 'WANING_CRESCENT');

-- CreateEnum
CREATE TYPE "public"."CatchDataSource" AS ENUM ('USER_REPORT', 'CAPTAIN_LOG', 'AUTOMATED', 'HISTORICAL', 'RESEARCH');

-- CreateEnum
CREATE TYPE "public"."MigrationEventType" AS ENUM ('ARRIVAL', 'PEAK', 'DEPARTURE');

-- CreateEnum
CREATE TYPE "public"."TideType" AS ENUM ('HIGH_TIDE', 'LOW_TIDE');

-- CreateEnum
CREATE TYPE "public"."FishingImpact" AS ENUM ('VERY_NEGATIVE', 'NEGATIVE', 'NEUTRAL', 'POSITIVE', 'VERY_POSITIVE');

-- CreateTable
CREATE TABLE "public"."accounts" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "public"."event_skill_criteria" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "criteriaType" "public"."SkillCriteriaType" NOT NULL,
    "minimumValue" INTEGER,
    "requiredSkills" "public"."FishingTechnique"[] DEFAULT ARRAY[]::"public"."FishingTechnique"[],
    "requiredSpecies" "public"."FishSpecies"[] DEFAULT ARRAY[]::"public"."FishSpecies"[],
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_skill_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."achievements" (
    "id" TEXT NOT NULL,
    "type" "public"."AchievementType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" "public"."BadgeCategory" NOT NULL,
    "rarity" "public"."AchievementRarity" NOT NULL DEFAULT 'COMMON',
    "maxProgress" INTEGER NOT NULL DEFAULT 1,
    "progressStep" INTEGER NOT NULL DEFAULT 1,
    "lockedVisible" BOOLEAN NOT NULL DEFAULT true,
    "lockedDescVisible" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fisher_badges" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL,
    "category" "public"."BadgeCategory" NOT NULL DEFAULT 'ACHIEVEMENT',
    "rarity" "public"."AchievementRarity" NOT NULL DEFAULT 'COMMON',
    "requiredValue" INTEGER,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fisher_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fisher_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "experienceLevel" "public"."FishingExperience" NOT NULL DEFAULT 'BEGINNER',
    "specialties" "public"."FishingSpecialty"[],
    "bio" TEXT,
    "rating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "completedTrips" INTEGER NOT NULL DEFAULT 0,
    "createdTrips" INTEGER NOT NULL DEFAULT 0,
    "reliability" DECIMAL(5,2) NOT NULL DEFAULT 100.0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "positiveReviews" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "experiencePoints" INTEGER NOT NULL DEFAULT 0,
    "activeDays" INTEGER NOT NULL DEFAULT 0,
    "activeDaysConsecutive" INTEGER NOT NULL DEFAULT 0,
    "totalFishCaught" INTEGER NOT NULL DEFAULT 0,
    "uniqueSpecies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "favoriteLocation" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "country" TEXT,
    "city" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "secretCode" TEXT,
    "experienceStats" JSONB,
    "mentorRating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "teamworkRating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "reliabilityRating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "respectRating" DECIMAL(2,1) NOT NULL DEFAULT 5.0,
    "reviewBreakdown" JSONB,
    "certificates" JSONB,
    "fishingPreferences" JSONB,
    "totalWeightCaught" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "averageTripDuration" DECIMAL(5,2),
    "successRate" DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    "catchRecords" JSONB,
    "techniqueSkills" JSONB,
    "seasonalActivity" JSONB,
    "favoriteLocations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fishingZones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fisher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_bookings" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 1,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "group_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."group_trips" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "public"."TimeSlot" NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 8,
    "minRequired" INTEGER NOT NULL DEFAULT 6,
    "pricePerPerson" DECIMAL(10,2) NOT NULL DEFAULT 95.00,
    "status" "public"."GroupTripStatus" NOT NULL DEFAULT 'FORMING',
    "description" TEXT,
    "meetingPoint" TEXT,
    "specialNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "captainId" TEXT,
    "approvalMode" "public"."ParticipantApprovalMode" NOT NULL DEFAULT 'MANUAL',
    "departureLocation" TEXT,
    "difficultyRating" INTEGER NOT NULL DEFAULT 3,
    "equipment" "public"."EquipmentType" NOT NULL DEFAULT 'PROVIDED',
    "estimatedFishCatch" INTEGER,
    "eventType" "public"."FishingEventType" NOT NULL DEFAULT 'COMMERCIAL',
    "fishingTechniques" "public"."FishingTechnique"[] DEFAULT ARRAY[]::"public"."FishingTechnique"[],
    "fishingZones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxGroupSize" INTEGER,
    "minimumWeatherScore" INTEGER NOT NULL DEFAULT 6,
    "recommendedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillLevel" "public"."SkillLevelRequired" NOT NULL DEFAULT 'ANY',
    "socialMode" "public"."SocialEventMode" NOT NULL DEFAULT 'COLLABORATIVE',
    "targetSpecies" "public"."FishSpecies"[] DEFAULT ARRAY[]::"public"."FishSpecies"[],
    "weatherDependency" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "group_trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."participant_approvals" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "message" TEXT,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "rejectedReason" TEXT,
    "processedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."private_bookings" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "timeSlot" "public"."TimeSlot" NOT NULL,
    "participants" INTEGER NOT NULL DEFAULT 1,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL DEFAULT 400.00,
    "status" "public"."BookingStatus" NOT NULL DEFAULT 'PENDING',
    "specialRequests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "private_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'PARTICIPANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "public"."subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "tier" "public"."SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'INACTIVE',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subscriptionId" TEXT,
    "tripId" TEXT,
    "stripePaymentId" TEXT,
    "stripeInvoiceId" TEXT,
    "type" "public"."PaymentType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "commissionAmount" INTEGER,
    "commissionRate" DOUBLE PRECISION,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."CourseCategory" NOT NULL,
    "price" INTEGER NOT NULL,
    "stripePriceId" TEXT,
    "content" JSONB,
    "duration" INTEGER,
    "difficulty" "public"."CourseDifficulty" NOT NULL DEFAULT 'BEGINNER',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "score" DOUBLE PRECISION,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "certificateIssued" BOOLEAN NOT NULL DEFAULT false,
    "certificateUrl" TEXT,

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."advertisements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "targetUrl" TEXT,
    "type" "public"."AdType" NOT NULL DEFAULT 'EQUIPMENT_PROMOTION',
    "priority" "public"."AdPriority" NOT NULL DEFAULT 'NORMAL',
    "targetAudience" JSONB,
    "locations" TEXT[],
    "budget" INTEGER NOT NULL,
    "costPerClick" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."AdStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advertisements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lunar_phases" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "public"."LunarPhaseType" NOT NULL,
    "angle" DOUBLE PRECISION NOT NULL,
    "illumination" DOUBLE PRECISION NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "apparentDiameter" DOUBLE PRECISION NOT NULL,
    "chineseLunarData" JSONB,
    "fishingInfluence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lunar_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fishing_conditions" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" JSONB NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "lunarPhaseId" TEXT NOT NULL,
    "tidalInfluence" JSONB,
    "weatherImpact" JSONB,
    "bestHours" JSONB,
    "recommendations" TEXT[],
    "speciesInfluence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fishing_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."catch_records" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" JSONB NOT NULL,
    "anglerId" TEXT,
    "lunarPhaseId" TEXT NOT NULL,
    "catches" JSONB NOT NULL,
    "totalWeight" DOUBLE PRECISION NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "weatherData" JSONB,
    "tackleUsed" JSONB,
    "techniques" "public"."FishingTechnique"[],
    "duration" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "dataSource" "public"."CatchDataSource" NOT NULL DEFAULT 'USER_REPORT',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fish_species_details" (
    "id" TEXT NOT NULL,
    "species" "public"."FishSpecies" NOT NULL,
    "nameRu" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "scientificName" TEXT NOT NULL,
    "seasonality" JSONB NOT NULL,
    "migrationPattern" JSONB,
    "depthPreferences" JSONB NOT NULL,
    "temperatureRange" JSONB NOT NULL,
    "preferredTechniques" "public"."FishingTechnique"[],
    "bestLunarPhases" "public"."LunarPhaseType"[],
    "difficulty" INTEGER NOT NULL DEFAULT 5,
    "averageSize" JSONB,
    "averageWeight" JSONB,
    "spawningPeriod" JSONB,
    "feedingHabits" JSONB,
    "marketValue" DOUBLE PRECISION,
    "gameValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fish_species_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."migration_events" (
    "id" TEXT NOT NULL,
    "species" "public"."FishSpecies" NOT NULL,
    "eventType" "public"."MigrationEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "location" JSONB NOT NULL,
    "direction" TEXT,
    "depth" DOUBLE PRECISION,
    "waterTemperature" DOUBLE PRECISION,
    "currentStrength" DOUBLE PRECISION,
    "dataSource" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fishing_hotspots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "depth" DOUBLE PRECISION,
    "distanceFromShore" DOUBLE PRECISION,
    "bottomType" TEXT,
    "structureType" TEXT,
    "targetSpecies" "public"."FishSpecies"[],
    "bestSeasons" JSONB,
    "bestTides" JSONB,
    "bestWeather" JSONB,
    "bestLunarPhases" "public"."LunarPhaseType"[],
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "difficulty" INTEGER NOT NULL DEFAULT 5,
    "accessibility" INTEGER NOT NULL DEFAULT 5,
    "totalVisits" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "averageCatch" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "description" TEXT,
    "tips" TEXT[],
    "hazards" TEXT[],
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fishing_hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tidal_data" (
    "id" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,
    "location" JSONB NOT NULL,
    "type" "public"."TideType" NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "strength" INTEGER NOT NULL,
    "fishingImpact" "public"."FishingImpact" NOT NULL,
    "bestSpecies" "public"."FishSpecies"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tidal_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."lunar_fishing_stats" (
    "id" TEXT NOT NULL,
    "lunarPhase" "public"."LunarPhaseType" NOT NULL,
    "species" "public"."FishSpecies" NOT NULL,
    "location" JSONB NOT NULL,
    "season" INTEGER NOT NULL,
    "totalObservations" INTEGER NOT NULL,
    "averageSuccess" DOUBLE PRECISION NOT NULL,
    "averageCatch" DOUBLE PRECISION NOT NULL,
    "bestHours" JSONB,
    "correlationStrength" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "lastCalculated" TIMESTAMP(3) NOT NULL,
    "dataPoints" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lunar_fishing_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "achievements_type_key" ON "public"."achievements"("type");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "public"."user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "fisher_profiles_userId_key" ON "public"."fisher_profiles"("userId");

-- CreateIndex
CREATE INDEX "group_bookings_tripId_idx" ON "public"."group_bookings"("tripId");

-- CreateIndex
CREATE INDEX "group_bookings_userId_idx" ON "public"."group_bookings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "participant_approvals_tripId_participantId_key" ON "public"."participant_approvals"("tripId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_tripId_fromUserId_toUserId_key" ON "public"."reviews"("tripId", "fromUserId", "toUserId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "public"."system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "public"."subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "public"."subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentId_key" ON "public"."payments"("stripePaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeInvoiceId_key" ON "public"."payments"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "courses_stripePriceId_key" ON "public"."courses"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_userId_courseId_key" ON "public"."course_enrollments"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "lunar_phases_date_key" ON "public"."lunar_phases"("date");

-- CreateIndex
CREATE UNIQUE INDEX "fishing_conditions_date_location_key" ON "public"."fishing_conditions"("date", "location");

-- CreateIndex
CREATE INDEX "catch_records_date_idx" ON "public"."catch_records"("date");

-- CreateIndex
CREATE INDEX "catch_records_lunarPhaseId_idx" ON "public"."catch_records"("lunarPhaseId");

-- CreateIndex
CREATE INDEX "catch_records_anglerId_idx" ON "public"."catch_records"("anglerId");

-- CreateIndex
CREATE UNIQUE INDEX "fish_species_details_species_key" ON "public"."fish_species_details"("species");

-- CreateIndex
CREATE INDEX "migration_events_species_idx" ON "public"."migration_events"("species");

-- CreateIndex
CREATE INDEX "migration_events_date_idx" ON "public"."migration_events"("date");

-- CreateIndex
CREATE INDEX "fishing_hotspots_latitude_longitude_idx" ON "public"."fishing_hotspots"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "tidal_data_datetime_idx" ON "public"."tidal_data"("datetime");

-- CreateIndex
CREATE INDEX "tidal_data_location_idx" ON "public"."tidal_data"("location");

-- CreateIndex
CREATE UNIQUE INDEX "lunar_fishing_stats_lunarPhase_species_location_season_key" ON "public"."lunar_fishing_stats"("lunarPhase", "species", "location", "season");

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."event_skill_criteria" ADD CONSTRAINT "event_skill_criteria_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "public"."achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fisher_badges" ADD CONSTRAINT "fisher_badges_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."fisher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fisher_profiles" ADD CONSTRAINT "fisher_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_bookings" ADD CONSTRAINT "group_bookings_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_bookings" ADD CONSTRAINT "group_bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."group_trips" ADD CONSTRAINT "group_trips_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participant_approvals" ADD CONSTRAINT "participant_approvals_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."participant_approvals" ADD CONSTRAINT "participant_approvals_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "public"."group_trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advertisements" ADD CONSTRAINT "advertisements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."fishing_conditions" ADD CONSTRAINT "fishing_conditions_lunarPhaseId_fkey" FOREIGN KEY ("lunarPhaseId") REFERENCES "public"."lunar_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catch_records" ADD CONSTRAINT "catch_records_anglerId_fkey" FOREIGN KEY ("anglerId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."catch_records" ADD CONSTRAINT "catch_records_lunarPhaseId_fkey" FOREIGN KEY ("lunarPhaseId") REFERENCES "public"."lunar_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
