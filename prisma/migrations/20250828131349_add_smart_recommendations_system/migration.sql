-- CreateEnum
CREATE TYPE "public"."recommendation_type" AS ENUM ('HISTORY_BASED', 'WEATHER_AI', 'SOCIAL_CAPTAIN', 'COLLABORATIVE', 'CONTENT_BASED', 'HYBRID');

-- CreateEnum
CREATE TYPE "public"."recommendation_interaction_type" AS ENUM ('VIEW', 'CLICK', 'LIKE', 'DISLIKE', 'SHARE', 'BOOK', 'DISMISS', 'REPORT');

-- CreateEnum
CREATE TYPE "public"."captain_recommendation_category" AS ENUM ('TECHNIQUE_ADVICE', 'SPECIES_TARGETING', 'LOCATION_TIPS', 'EQUIPMENT_RECOMMENDATION', 'WEATHER_STRATEGY', 'SAFETY_ADVICE', 'BEGINNER_GUIDE', 'SEASONAL_TIPS');

-- CreateEnum
CREATE TYPE "public"."moderation_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateTable
CREATE TABLE "public"."smart_recommendations" (
    "id" TEXT NOT NULL,
    "type" "public"."recommendation_type" NOT NULL,
    "targetUserId" TEXT,
    "targetUserRole" "public"."UserRole"[] DEFAULT ARRAY[]::"public"."UserRole"[],
    "skillLevel" "public"."SkillLevelRequired"[] DEFAULT ARRAY[]::"public"."SkillLevelRequired"[],
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "aiGeneratedText" TEXT,
    "triggerContext" JSONB,
    "weatherConditions" JSONB,
    "recommendedTripId" TEXT,
    "recommendedSpecies" "public"."FishSpecies"[] DEFAULT ARRAY[]::"public"."FishSpecies"[],
    "recommendedTechniques" "public"."FishingTechnique"[] DEFAULT ARRAY[]::"public"."FishingTechnique"[],
    "recommendedLocation" JSONB,
    "fromCaptainId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smart_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."recommendation_interactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "interactionType" "public"."recommendation_interaction_type" NOT NULL,
    "sessionId" TEXT,
    "deviceType" TEXT,
    "userAgent" TEXT,
    "result" JSONB,
    "satisfaction" INTEGER,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."weather_recommendations" (
    "id" TEXT NOT NULL,
    "weatherConditions" JSONB NOT NULL,
    "windSpeed" DOUBLE PRECISION,
    "windDirection" "public"."wind_direction",
    "temperature" DOUBLE PRECISION,
    "pressure" DOUBLE PRECISION,
    "humidity" DOUBLE PRECISION,
    "cloudCover" DOUBLE PRECISION,
    "recommendedSpecies" "public"."FishSpecies"[],
    "recommendedTechniques" "public"."FishingTechnique"[],
    "recommendedTimeOfDay" JSONB,
    "recommendedDepth" DOUBLE PRECISION,
    "aiAnalysis" TEXT NOT NULL,
    "aiReasoning" TEXT,
    "confidenceLevel" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "location" JSONB,
    "regionId" TEXT,
    "validFor" TIMESTAMP(3) NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."captain_recommendations" (
    "id" TEXT NOT NULL,
    "captainId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" "public"."captain_recommendation_category" NOT NULL,
    "targetSkillLevel" "public"."SkillLevelRequired"[] DEFAULT ARRAY[]::"public"."SkillLevelRequired"[],
    "targetSpecies" "public"."FishSpecies"[] DEFAULT ARRAY[]::"public"."FishSpecies"[],
    "targetTechniques" "public"."FishingTechnique"[] DEFAULT ARRAY[]::"public"."FishingTechnique"[],
    "seasonalContext" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "weatherContext" JSONB,
    "locationContext" JSONB,
    "relatedTripIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "endorsements" INTEGER NOT NULL DEFAULT 0,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "moderationStatus" "public"."moderation_status" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "captain_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."trip_similarities" (
    "id" TEXT NOT NULL,
    "tripId1" TEXT NOT NULL,
    "tripId2" TEXT NOT NULL,
    "overallSimilarity" DOUBLE PRECISION NOT NULL,
    "speciesSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "techniqueSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "locationSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skillSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "seasonSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "participantSimilarity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculationMethod" TEXT NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "trip_similarities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "smart_recommendations_type_idx" ON "public"."smart_recommendations"("type");

-- CreateIndex
CREATE INDEX "smart_recommendations_targetUserId_idx" ON "public"."smart_recommendations"("targetUserId");

-- CreateIndex
CREATE INDEX "smart_recommendations_isActive_validFrom_validUntil_idx" ON "public"."smart_recommendations"("isActive", "validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "recommendation_interactions_userId_idx" ON "public"."recommendation_interactions"("userId");

-- CreateIndex
CREATE INDEX "recommendation_interactions_recommendationId_idx" ON "public"."recommendation_interactions"("recommendationId");

-- CreateIndex
CREATE INDEX "recommendation_interactions_interactionType_idx" ON "public"."recommendation_interactions"("interactionType");

-- CreateIndex
CREATE INDEX "weather_recommendations_validFor_idx" ON "public"."weather_recommendations"("validFor");

-- CreateIndex
CREATE INDEX "weather_recommendations_location_idx" ON "public"."weather_recommendations"("location");

-- CreateIndex
CREATE INDEX "captain_recommendations_captainId_idx" ON "public"."captain_recommendations"("captainId");

-- CreateIndex
CREATE INDEX "captain_recommendations_category_idx" ON "public"."captain_recommendations"("category");

-- CreateIndex
CREATE INDEX "captain_recommendations_isActive_moderationStatus_idx" ON "public"."captain_recommendations"("isActive", "moderationStatus");

-- CreateIndex
CREATE INDEX "trip_similarities_overallSimilarity_idx" ON "public"."trip_similarities"("overallSimilarity");

-- CreateIndex
CREATE INDEX "trip_similarities_calculatedAt_idx" ON "public"."trip_similarities"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "trip_similarities_tripId1_tripId2_key" ON "public"."trip_similarities"("tripId1", "tripId2");

-- AddForeignKey
ALTER TABLE "public"."smart_recommendations" ADD CONSTRAINT "smart_recommendations_recommendedTripId_fkey" FOREIGN KEY ("recommendedTripId") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smart_recommendations" ADD CONSTRAINT "smart_recommendations_fromCaptainId_fkey" FOREIGN KEY ("fromCaptainId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."smart_recommendations" ADD CONSTRAINT "smart_recommendations_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendation_interactions" ADD CONSTRAINT "recommendation_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."recommendation_interactions" ADD CONSTRAINT "recommendation_interactions_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "public"."smart_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."captain_recommendations" ADD CONSTRAINT "captain_recommendations_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trip_similarities" ADD CONSTRAINT "trip_similarities_tripId1_fkey" FOREIGN KEY ("tripId1") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."trip_similarities" ADD CONSTRAINT "trip_similarities_tripId2_fkey" FOREIGN KEY ("tripId2") REFERENCES "public"."group_trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
