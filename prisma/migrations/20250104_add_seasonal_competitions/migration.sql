-- Migration for adding seasonal competition tracking
-- Task 12.2: Seasonal Competition Tracking

-- Create enum for season types
CREATE TYPE "public"."SeasonType" AS ENUM (
    'WEEKLY',
    'MONTHLY', 
    'QUARTERLY',
    'YEARLY',
    'CUSTOM'
);

-- Create enum for season status
CREATE TYPE "public"."SeasonStatus" AS ENUM (
    'UPCOMING',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);

-- Create Season model for time-based competitions
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "type" "SeasonType" NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    
    -- Time period
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationStartDate" TIMESTAMP(3),
    "registrationEndDate" TIMESTAMP(3),
    
    -- Configuration
    "maxParticipants" INTEGER,
    "minParticipants" INTEGER DEFAULT 1,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "autoEnroll" BOOLEAN NOT NULL DEFAULT false,
    "allowLateJoin" BOOLEAN NOT NULL DEFAULT true,
    
    -- Categories included in this season
    "includedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Rewards and recognition
    "rewards" JSONB,
    "trophyTiers" JSONB,
    "specialRecognition" JSONB,
    
    -- Metadata
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- Create Season Participant model
CREATE TABLE "season_participants" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    
    -- Participation details
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoEnrolled" BOOLEAN NOT NULL DEFAULT false,
    
    -- Season performance across all categories
    "totalScore" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "overallRank" INTEGER,
    "categoryRanks" JSONB DEFAULT '{}', -- Category-specific ranks
    "categoryScores" JSONB DEFAULT '{}', -- Category-specific scores
    
    -- Progress tracking
    "weeklyProgress" JSONB DEFAULT '[]', -- Weekly snapshots
    "monthlyProgress" JSONB DEFAULT '[]', -- Monthly snapshots
    "achievementsEarned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "badgesEarned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Historical data
    "progressHistory" JSONB DEFAULT '[]',
    "rankHistory" JSONB DEFAULT '[]',
    
    -- Season-specific stats
    "seasonStats" JSONB,
    "personalBests" JSONB,
    
    -- Metadata
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_participants_pkey" PRIMARY KEY ("id")
);

-- Create Season Archive model for historical data
CREATE TABLE "season_archives" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "seasonName" TEXT NOT NULL,
    "seasonType" "SeasonType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    
    -- Final results
    "finalRankings" JSONB NOT NULL, -- Complete leaderboard snapshots
    "categoryWinners" JSONB, -- Winners by category
    "specialAwards" JSONB, -- Special recognition awards
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    
    -- Season statistics
    "seasonStats" JSONB, -- Overall season statistics
    "recordsSet" JSONB, -- Records set during this season
    "milestones" JSONB, -- Major milestones achieved
    
    -- Rewards distributed
    "rewardsDistributed" JSONB,
    "ceremonyData" JSONB, -- Awards ceremony information
    
    -- Archive metadata
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedBy" TEXT,
    "archiveVersion" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,

    CONSTRAINT "season_archives_pkey" PRIMARY KEY ("id")
);

-- Create Competition Events model for scheduled competitions within seasons
CREATE TABLE "competition_events" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "CompetitionType" NOT NULL DEFAULT 'SPECIAL_EVENT',
    "category" "CompetitionCategory" NOT NULL,
    
    -- Scheduling
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" "CompetitionStatus" NOT NULL DEFAULT 'UPCOMING',
    
    -- Event configuration
    "maxParticipants" INTEGER,
    "entryRequirements" JSONB, -- Level, achievements, etc required to join
    "scoringRules" JSONB NOT NULL,
    "rewards" JSONB,
    
    -- Notifications and announcements
    "announcementSent" BOOLEAN NOT NULL DEFAULT false,
    "reminderSent" BOOLEAN NOT NULL DEFAULT false,
    "resultsSent" BOOLEAN NOT NULL DEFAULT false,
    
    -- Results
    "winners" JSONB, -- Top performers
    "results" JSONB, -- Detailed results
    "highlights" JSONB, -- Notable moments/achievements
    
    -- Metadata
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_events_pkey" PRIMARY KEY ("id")
);

-- Create Season Announcements model
CREATE TABLE "season_announcements" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL, -- 'season_start', 'event_reminder', 'results', 'awards', 'general'
    "priority" TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Targeting
    "targetAudience" TEXT NOT NULL DEFAULT 'all', -- 'all', 'participants', 'category', 'level_range'
    "targetFilters" JSONB, -- Specific targeting criteria
    
    -- Scheduling
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'sent', 'cancelled'
    
    -- Engagement
    "recipientCount" INTEGER DEFAULT 0,
    "openRate" DECIMAL(5,2) DEFAULT 0,
    "clickRate" DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    "createdBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "season_announcements_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "season_archives" ADD CONSTRAINT "season_archives_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "season_archives" ADD CONSTRAINT "season_archives_archivedBy_fkey" FOREIGN KEY ("archivedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "competition_events" ADD CONSTRAINT "competition_events_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "competition_events" ADD CONSTRAINT "competition_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "season_announcements" ADD CONSTRAINT "season_announcements_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "season_announcements" ADD CONSTRAINT "season_announcements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "competition_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "season_announcements" ADD CONSTRAINT "season_announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for performance
CREATE INDEX "seasons_type_status_dates_idx" ON "seasons"("type", "status", "startDate", "endDate");
CREATE INDEX "seasons_active_idx" ON "seasons"("status") WHERE "status" = 'ACTIVE';
CREATE INDEX "season_participants_season_user_idx" ON "season_participants"("seasonId", "userId");
CREATE INDEX "season_participants_rank_idx" ON "season_participants"("seasonId", "overallRank") WHERE "overallRank" IS NOT NULL;
CREATE INDEX "season_archives_season_type_dates_idx" ON "season_archives"("seasonType", "startDate", "endDate");
CREATE INDEX "competition_events_season_schedule_idx" ON "competition_events"("seasonId", "scheduledStart", "scheduledEnd");
CREATE INDEX "competition_events_category_status_idx" ON "competition_events"("category", "status");
CREATE INDEX "season_announcements_schedule_status_idx" ON "season_announcements"("scheduledFor", "status");
CREATE INDEX "season_announcements_season_type_idx" ON "season_announcements"("seasonId", "type");

-- Create unique constraints
ALTER TABLE "season_participants" ADD CONSTRAINT "season_participants_seasonId_userId_key" UNIQUE ("seasonId", "userId");
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_name_key" UNIQUE ("name");

-- Insert initial seasonal competitions
INSERT INTO "seasons" ("id", "name", "displayName", "description", "type", "status", "startDate", "endDate", "includedCategories", "rewards") VALUES
('winter_2025', 'winter_2025', 'Winter Championship 2025', 'Winter fishing championship with special cold-weather challenges', 'QUARTERLY', 'UPCOMING', '2025-12-01 00:00:00', '2025-02-28 23:59:59', ARRAY['MONTHLY_CHAMPIONS', 'BIGGEST_CATCH', 'TECHNIQUE_MASTER'], '{"tiers": [{"place": 1, "reward": "Winter Champion Trophy", "value": 1000}, {"place": 2, "reward": "Silver Winter Medal", "value": 500}, {"place": 3, "reward": "Bronze Winter Medal", "value": 250}]}'),

('january_2025', 'january_2025', 'January Monthly Challenge', 'New Year fresh start monthly competition', 'MONTHLY', 'ACTIVE', '2025-01-01 00:00:00', '2025-01-31 23:59:59', ARRAY['MONTHLY_CHAMPIONS', 'MOST_ACTIVE', 'ROOKIE_OF_MONTH'], '{"tiers": [{"place": 1, "reward": "Monthly Champion Badge", "value": 200}, {"place": 2, "reward": "Runner-up Badge", "value": 100}]}'),

('week_1_jan_2025', 'week_1_jan_2025', 'New Year Week Challenge', 'First week of the year special event', 'WEEKLY', 'COMPLETED', '2025-01-01 00:00:00', '2025-01-07 23:59:59', ARRAY['MOST_ACTIVE', 'SOCIAL_BUTTERFLY'], '{"tiers": [{"place": 1, "reward": "Early Bird Trophy", "value": 50}]}');
