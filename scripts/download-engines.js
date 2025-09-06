#!/usr/bin/env node
// Script to force clean regeneration of Prisma client for Vercel deployment
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 PLAN D: Clean Prisma regeneration for Vercel...');

try {
  // Step 1: Clean old generated client
  console.log('🧹 Cleaning old Prisma client...');
  const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
  if (fs.existsSync(clientPath)) {
    execSync(`rm -rf "${clientPath}"`, { stdio: 'inherit' });
    console.log('✅ Removed old .prisma/client');
  }
  
  // Step 2: Clear any cached engines
  const enginesPath = path.join(process.cwd(), 'node_modules', '@prisma', 'engines');
  if (fs.existsSync(enginesPath)) {
    execSync(`rm -rf "${enginesPath}"`, { stdio: 'inherit' });
    console.log('✅ Removed cached @prisma/engines');
  }
  
  // Step 3: Reinstall engines
  console.log('📦 Reinstalling @prisma/engines...');
  execSync('npm install @prisma/engines', { stdio: 'inherit' });
  
  // Step 4: Force fresh generation with current schema
  console.log('🔄 Generating fresh Prisma client...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      PRISMA_CLI_FORCE_INSTALL: 'true',
      PRISMA_GENERATE_FORCE_ALL: 'true'
    }
  });
  
  console.log('✅ PLAN D: Fresh Prisma client generated!');
  
} catch (error) {
  console.error('❌ PLAN D failed:', error.message);
  process.exit(1);
}
