-- CreateEnum
CREATE TYPE "public"."wind_direction" AS ENUM ('NORTH', 'NORTHEAST', 'EAST', 'SOUTHEAST', 'SOUTH', 'SOUTHWEST', 'WEST', 'NORTHWEST', 'CALM');

-- CreateEnum
CREATE TYPE "public"."diary_media_type" AS ENUM ('PHOTO', 'VIDEO', 'AUDIO');

-- CreateTable
CREATE TABLE "public"."fishing_diary_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "weather" JSONB,
    "temperature" DOUBLE PRECISION,
    "windSpeed" DOUBLE PRECISION,
    "windDirection" "public"."wind_direction",
    "totalWeight" DOUBLE PRECISION,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "rodType" TEXT,
    "reelType" TEXT,
    "lineType" TEXT,
    "baitUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lureColor" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fishing_diary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diary_fish_catches" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "species" "public"."FishSpecies" NOT NULL,
    "weight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "timeOfCatch" TIMESTAMP(3),
    "depth" DOUBLE PRECISION,
    "method" "public"."FishingTechnique",
    "baitUsed" TEXT,
    "wasReleased" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diary_fish_catches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."diary_media" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT NOT NULL,
    "mediaType" "public"."diary_media_type" NOT NULL,
    "exifData" JSONB,
    "gpsLatitude" DOUBLE PRECISION,
    "gpsLongitude" DOUBLE PRECISION,
    "captureTime" TIMESTAMP(3),
    "cameraModel" TEXT,
    "lensModel" TEXT,
    "title" TEXT,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "diary_media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fishing_diary_entries_userId_date_idx" ON "public"."fishing_diary_entries"("userId", "date");

-- CreateIndex
CREATE INDEX "fishing_diary_entries_latitude_longitude_idx" ON "public"."fishing_diary_entries"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "diary_fish_catches_entryId_idx" ON "public"."diary_fish_catches"("entryId");

-- CreateIndex
CREATE INDEX "diary_fish_catches_species_idx" ON "public"."diary_fish_catches"("species");

-- CreateIndex
CREATE INDEX "diary_media_entryId_idx" ON "public"."diary_media"("entryId");

-- CreateIndex
CREATE INDEX "diary_media_mediaType_idx" ON "public"."diary_media"("mediaType");

-- AddForeignKey
ALTER TABLE "public"."fishing_diary_entries" ADD CONSTRAINT "fishing_diary_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diary_fish_catches" ADD CONSTRAINT "diary_fish_catches_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."fishing_diary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."diary_media" ADD CONSTRAINT "diary_media_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "public"."fishing_diary_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
