#!/usr/bin/env node

/**
 * Script to fix production database URLs for Supabase connection
 * 
 * This script outputs the correct environment variables for Vercel deployment
 * Based on Supabase connection strings documentation
 */

const correctUrls = {
  // Transaction pooler - ideal for serverless functions
  DATABASE_URL: "postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:6543/postgres",
  
  // Direct connection - for migrations and admin operations
  DIRECT_URL: "postgresql://postgres:sdbSV_232sdsfbdKSK@db.spblkbrkxmknfjugoueo.supabase.co:5432/postgres",
  
  // Session pooler as fallback (IPv4 compatible)
  SESSION_POOLER_URL: "postgresql://postgres.spblkbrkxmknfjugoueo:sdbSV_232sdsfbdKSK@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
};

console.log("🗄️ Correct Supabase Database URLs for Production:");
console.log("=".repeat(60));
console.log("");

Object.entries(correctUrls).forEach(([key, value]) => {
  console.log(`${key}="${value}"`);
});

console.log("");
console.log("📝 Instructions:");
console.log("1. Copy these URLs to your Vercel environment variables");
console.log("2. Use DATABASE_URL for main application connections");
console.log("3. Use DIRECT_URL for migrations and admin operations");
console.log("");
console.log("🔧 Vercel CLI commands:");
console.log(`vercel env add DATABASE_URL production`);
console.log(`vercel env add DIRECT_URL production`);
console.log("");

// Export for programmatic use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = correctUrls;
}
