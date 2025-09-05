/**
 * PHASE 1: MODULE RESOLUTION DEBUGGING TOOLKIT
 * DevOps Investigation: Vercel vs Local Environment Analysis
 */

// Environment Comparison Logging
const logEnvironmentDetails = () => {
  console.log('🔬 ENVIRONMENT FORENSICS');
  console.log('========================');
  console.log(`Node.js Version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Working Directory: ${process.cwd()}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`VERCEL: ${process.env.VERCEL || 'false'}`);
  console.log(`VERCEL_ENV: ${process.env.VERCEL_ENV || 'undefined'}`);
  
  // Module resolution paths
  console.log('\n📁 MODULE RESOLUTION PATHS');
  console.log('NODE_PATH:', process.env.NODE_PATH || 'undefined');
  console.log('require.main.paths:', require.main?.paths || 'undefined');
  
  // File system capabilities
  console.log('\n💾 FILE SYSTEM INFO');
  const fs = require('fs');
  console.log('CWD files:', fs.readdirSync(process.cwd()).filter(f => !f.startsWith('.')));
};

// Test Module Resolution Paths
const testModuleResolution = () => {
  console.log('\n🧭 TESTING MODULE RESOLUTION');
  console.log('================================');
  
  const path = require('path');
  const fs = require('fs');
  
  const testPaths = [
    './components/emails',
    './components/emails/index.ts',
    '../../components/emails', // Relative path from common locations
    '@/components/emails', // Alias path
  ];
  
  testPaths.forEach(testPath => {
    try {
      const resolvedPath = require.resolve(testPath);
      console.log(`✅ RESOLVED: ${testPath} → ${resolvedPath}`);
    } catch (error) {
      console.log(`❌ FAILED: ${testPath} → ${error.message}`);
    }
  });
  
  // Test actual file existence
  console.log('\n📂 FILE EXISTENCE CHECK');
  const filesToCheck = [
    'components/emails/index.ts',
    'components/emails/BadgeAwardedNotificationEmail.tsx',
    'components/emails/BaseEmailTemplate.tsx',
  ];
  
  filesToCheck.forEach(file => {
    const exists = fs.existsSync(file);
    const fullPath = path.resolve(file);
    console.log(`${exists ? '✅' : '❌'} ${file} (${fullPath})`);
    
    if (exists) {
      const stats = fs.statSync(file);
      console.log(`   Size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`);
    }
  });
};

// Test Import Patterns
const testImportPatterns = async () => {
  console.log('\n🔄 TESTING IMPORT PATTERNS');
  console.log('===========================');
  
  const testImports = [
    () => require('./components/emails'),
    () => require('./components/emails/index.ts'),
  ];
  
  for (let i = 0; i < testImports.length; i++) {
    try {
      const result = testImports[i]();
      console.log(`✅ Import ${i + 1} success:`, Object.keys(result));
    } catch (error) {
      console.log(`❌ Import ${i + 1} failed:`, error.message);
      console.log(`   Stack:`, error.stack?.split('\n')[0]);
    }
  }
};

// Webpack Resolution Debug (if available)
const debugWebpackResolution = () => {
  console.log('\n⚙️ WEBPACK RESOLUTION DEBUG');
  console.log('============================');
  
  try {
    // This will be available during Next.js build process
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
      console.log('Running in server context - checking Next.js config');
      
      // Log Next.js version and config details
      try {
        const nextVersion = require('next/package.json').version;
        console.log(`Next.js Version: ${nextVersion}`);
      } catch (e) {
        console.log('Next.js version detection failed:', e.message);
      }
    }
  } catch (error) {
    console.log('Webpack debug not available:', error.message);
  }
};

// Memory and Performance Monitoring
const monitorResources = () => {
  console.log('\n📊 RESOURCE MONITORING');
  console.log('=======================');
  
  const used = process.memoryUsage();
  console.log('Memory Usage:');
  Object.keys(used).forEach(key => {
    console.log(`  ${key}: ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
  });
  
  console.log(`Uptime: ${Math.round(process.uptime())} seconds`);
};

// Main Debug Function
const runFullDiagnostics = async () => {
  console.log('🚀 STARTING MODULE RESOLUTION FORENSICS');
  console.log('========================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    logEnvironmentDetails();
    testModuleResolution();
    await testImportPatterns();
    debugWebpackResolution();
    monitorResources();
  } catch (error) {
    console.error('❌ DIAGNOSTICS FAILED:', error);
  }
  
  console.log('\n🏁 DIAGNOSTICS COMPLETE');
  console.log('========================');
};

// Export for Next.js integration
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runFullDiagnostics,
    logEnvironmentDetails,
    testModuleResolution,
    testImportPatterns,
    debugWebpackResolution,
    monitorResources,
  };
}

// Auto-run if called directly
if (require.main === module) {
  runFullDiagnostics().catch(console.error);
}
