#!/usr/bin/env node
// Script to force download all Prisma engines including rhel-openssl-3.0.x for Vercel
const { execSync } = require('child_process');
const path = require('path');

console.log('🔧 Forcing download of all Prisma engines...');

try {
  // Set environment variables to force download all engines
  process.env.PRISMA_CLI_FORCE_INSTALL = 'true';
  process.env.PRISMA_FORCE_NAPI = 'true';
  
  console.log('📦 Generating Prisma client with all binary targets...');
  execSync('npx prisma generate', {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: {
      ...process.env,
      PRISMA_CLI_FORCE_INSTALL: 'true',
      PRISMA_FORCE_NAPI: 'true'
    }
  });
  
  console.log('✅ Prisma engines download completed!');
  
} catch (error) {
  console.error('❌ Error downloading Prisma engines:', error.message);
  process.exit(1);
}
