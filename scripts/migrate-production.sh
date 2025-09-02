#!/bin/bash

# Production Migration Script for Cascais Fishing
# This script applies all pending migrations to production database

echo "🚀 Starting production database migration..."

# Set production environment
export NODE_ENV=production

# Apply all migrations to production database
echo "📦 Applying migrations..."
npx prisma migrate deploy

echo "🔄 Generating Prisma client..."
npx prisma generate

echo "🌱 Seeding database with initial data..."
npx prisma db seed

echo "✅ Production migration completed successfully!"
echo "🔍 Database status:"
npx prisma db status