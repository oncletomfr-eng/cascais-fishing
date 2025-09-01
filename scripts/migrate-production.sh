#!/bin/bash

echo "🚀 Deploying Prisma migrations to production database..."

# Use Vercel environment variables for production database connection
vercel env pull .env.production
source .env.production

echo "📡 Running Prisma migrations on production database..."
npx prisma migrate deploy

echo "✅ Migrations completed!"
