-- CreateTable
CREATE TABLE "public"."captain_recommendation_votes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "captain_recommendation_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "captain_recommendation_votes_recommendationId_idx" ON "public"."captain_recommendation_votes"("recommendationId");

-- CreateIndex
CREATE UNIQUE INDEX "captain_recommendation_votes_userId_recommendationId_key" ON "public"."captain_recommendation_votes"("userId", "recommendationId");

-- AddForeignKey
ALTER TABLE "public"."captain_recommendation_votes" ADD CONSTRAINT "captain_recommendation_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."captain_recommendation_votes" ADD CONSTRAINT "captain_recommendation_votes_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "public"."captain_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
