-- Migration for adding competition categories and leaderboard enhancements
-- Task 12.1: Category-Based Leaderboard System

-- Create enum for competition categories
CREATE TYPE "public"."CompetitionCategory" AS ENUM (
    'MONTHLY_CHAMPIONS',
    'BIGGEST_CATCH', 
    'MOST_ACTIVE',
    'BEST_MENTOR',
    'TECHNIQUE_MASTER',
    'SPECIES_SPECIALIST',
    'CONSISTENCY_KING',
    'ROOKIE_OF_MONTH',
    'VETERAN_ANGLER',
    'SOCIAL_BUTTERFLY'
);

-- Create enum for competition types  
CREATE TYPE "public"."CompetitionType" AS ENUM (
    'SEASONAL',
    'MONTHLY', 
    'WEEKLY',
    'ONGOING',
    'SPECIAL_EVENT'
);

-- Create enum for competition status
CREATE TYPE "public"."CompetitionStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'UPCOMING',
    'CANCELLED'
);

-- Create Competition model
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "CompetitionCategory" NOT NULL,
    "type" "CompetitionType" NOT NULL DEFAULT 'MONTHLY',
    "status" "CompetitionStatus" NOT NULL DEFAULT 'UPCOMING',
    
    -- Time period
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    
    -- Rules and configuration
    "rules" JSONB,
    "scoringAlgorithm" JSONB NOT NULL,
    "maxParticipants" INTEGER,
    "minParticipants" INTEGER DEFAULT 1,
    
    -- Rewards
    "rewards" JSONB,
    "prizeTiers" JSONB,
    
    -- Visibility and privacy
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "allowAnonymous" BOOLEAN NOT NULL DEFAULT false,
    
    -- Metadata
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- Create Competition Participant model
CREATE TABLE "competition_participants" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Participation details
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    
    -- Current standings
    "currentScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currentRank" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Historical data
    "scoreHistory" JSONB DEFAULT '[]',
    "rankHistory" JSONB DEFAULT '[]',
    
    -- Metadata
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_participants_pkey" PRIMARY KEY ("id")
);

-- Create Leaderboard Category model for ongoing categories
CREATE TABLE "leaderboard_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" "CompetitionCategory" NOT NULL,
    "description" TEXT,
    
    -- Configuration  
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "color" TEXT,
    
    -- Scoring rules
    "scoringAlgorithm" JSONB NOT NULL,
    "updateFrequency" TEXT NOT NULL DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'weekly'
    
    -- Visibility
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "requiredLevel" INTEGER DEFAULT 1,
    
    -- Metadata
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_categories_pkey" PRIMARY KEY ("id")
);

-- Create Competition Rankings snapshot model
CREATE TABLE "competition_rankings" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DECIMAL(10,2) NOT NULL,
    "details" JSONB, -- Category-specific details
    
    -- Snapshot info
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isCurrentRanking" BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_rankings_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "competition_rankings" ADD CONSTRAINT "competition_rankings_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "competition_rankings" ADD CONSTRAINT "competition_rankings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "competitions_category_type_idx" ON "competitions"("category", "type");
CREATE INDEX "competitions_status_dates_idx" ON "competitions"("status", "startDate", "endDate");
CREATE INDEX "competition_participants_competition_user_idx" ON "competition_participants"("competitionId", "userId");
CREATE INDEX "competition_participants_rank_idx" ON "competition_participants"("competitionId", "currentRank");
CREATE INDEX "competition_rankings_competition_current_idx" ON "competition_rankings"("competitionId", "isCurrentRanking");
CREATE INDEX "competition_rankings_rank_idx" ON "competition_rankings"("competitionId", "rank");
CREATE INDEX "leaderboard_categories_active_order_idx" ON "leaderboard_categories"("isActive", "sortOrder");

-- Create unique constraints
ALTER TABLE "competition_participants" ADD CONSTRAINT "competition_participants_competitionId_userId_key" UNIQUE ("competitionId", "userId");
ALTER TABLE "leaderboard_categories" ADD CONSTRAINT "leaderboard_categories_name_key" UNIQUE ("name");
ALTER TABLE "leaderboard_categories" ADD CONSTRAINT "leaderboard_categories_category_key" UNIQUE ("category");

-- Insert initial leaderboard categories
INSERT INTO "leaderboard_categories" ("id", "name", "displayName", "category", "description", "sortOrder", "icon", "color", "scoringAlgorithm") VALUES
('monthly_champions', 'monthly_champions', 'Monthly Champions', 'MONTHLY_CHAMPIONS', 'Top performers each month based on overall activity', 1, 'crown', '#FFD700', '{"type": "composite", "factors": [{"field": "rating", "weight": 0.3}, {"field": "completedTrips", "weight": 0.3}, {"field": "totalFishCaught", "weight": 0.2}, {"field": "level", "weight": 0.2}]}'),

('biggest_catch', 'biggest_catch', 'Biggest Catch', 'BIGGEST_CATCH', 'Anglers with the largest recorded catches', 2, 'fish', '#FF6B6B', '{"type": "max", "field": "biggestCatchWeight", "timeframe": "monthly"}'),

('most_active', 'most_active', 'Most Active', 'MOST_ACTIVE', 'Most active community members', 3, 'activity', '#4ECDC4', '{"type": "sum", "factors": [{"field": "completedTrips", "weight": 0.5}, {"field": "activeDays", "weight": 0.3}, {"field": "socialInteractions", "weight": 0.2}]}'),

('best_mentor', 'best_mentor', 'Best Mentor', 'BEST_MENTOR', 'Top mentors helping new anglers', 4, 'users', '#45B7D1', '{"type": "weighted", "factors": [{"field": "mentorRating", "weight": 0.6}, {"field": "helpedNewbies", "weight": 0.4}]}'),

('technique_master', 'technique_master', 'Technique Master', 'TECHNIQUE_MASTER', 'Masters of different fishing techniques', 5, 'target', '#96CEB4', '{"type": "diversity", "field": "techniqueSkills", "bonus": "mastery_count"}'),

('species_specialist', 'species_specialist', 'Species Specialist', 'SPECIES_SPECIALIST', 'Experts in catching diverse fish species', 6, 'database', '#FFEAA7', '{"type": "count", "field": "uniqueSpecies", "minimum": 5}');
