/**
 * PHASE 2: WEBPACK RESOLUTION DEBUGGING
 * Advanced Module Resolution Tracing for Next.js/Vercel Debugging
 */

// Webpack Plugin for Resolution Debugging
class ModuleResolutionDebugPlugin {
  constructor(options = {}) {
    this.options = {
      logLevel: 'verbose', // 'verbose', 'summary', 'errors-only'
      targetModules: ['components/emails', '@/components/emails'],
      outputFile: './debug-resolution.log',
      ...options
    };
    
    this.resolutionAttempts = [];
    this.startTime = Date.now();
  }

  apply(compiler) {
    const { logLevel, targetModules } = this.options;
    
    compiler.hooks.normalModuleFactory.tap('ModuleResolutionDebugPlugin', (factory) => {
      factory.hooks.beforeResolve.tap('ModuleResolutionDebugPlugin', (resolveData) => {
        if (!resolveData || !resolveData.request) return;
        
        const request = resolveData.request;
        const isTargetModule = targetModules.some(target => 
          request.includes(target) || request.endsWith(target)
        );
        
        if (isTargetModule) {
          const timestamp = Date.now() - this.startTime;
          const attempt = {
            timestamp,
            request,
            context: resolveData.context,
            contextInfo: resolveData.contextInfo,
            dependencies: resolveData.dependencies?.map(dep => dep.constructor.name) || [],
          };
          
          this.resolutionAttempts.push(attempt);
          
          if (logLevel === 'verbose') {
            console.log(`🔍 [${timestamp}ms] WEBPACK RESOLVE ATTEMPT:`);
            console.log(`   Request: ${request}`);
            console.log(`   Context: ${resolveData.context}`);
            console.log(`   Issuer: ${resolveData.contextInfo?.issuer || 'unknown'}`);
          }
        }
      });

      factory.hooks.afterResolve.tap('ModuleResolutionDebugPlugin', (resolveData) => {
        if (!resolveData || !resolveData.request) return;
        
        const request = resolveData.request;
        const isTargetModule = targetModules.some(target => 
          request.includes(target) || request.endsWith(target)
        );
        
        if (isTargetModule) {
          const timestamp = Date.now() - this.startTime;
          const resource = resolveData.resource;
          
          // Find matching attempt
          const attemptIndex = this.resolutionAttempts.findIndex(
            attempt => attempt.request === request && !attempt.resolved
          );
          
          if (attemptIndex !== -1) {
            this.resolutionAttempts[attemptIndex].resolved = true;
            this.resolutionAttempts[attemptIndex].resource = resource;
            this.resolutionAttempts[attemptIndex].resolveTime = timestamp - this.resolutionAttempts[attemptIndex].timestamp;
          }
          
          if (logLevel === 'verbose') {
            console.log(`✅ [${timestamp}ms] WEBPACK RESOLVE SUCCESS:`);
            console.log(`   Request: ${request}`);
            console.log(`   Resolved: ${resource}`);
          }
        }
      });
    });

    // Log summary at the end
    compiler.hooks.done.tap('ModuleResolutionDebugPlugin', (stats) => {
      this.logResolutionSummary(stats);
      this.writeLogFile();
    });

    // Capture resolution errors
    compiler.hooks.failed.tap('ModuleResolutionDebugPlugin', (error) => {
      console.log('❌ WEBPACK COMPILATION FAILED');
      console.log('Resolution attempts before failure:', this.resolutionAttempts.length);
      this.logResolutionSummary();
      this.writeLogFile();
    });
  }

  logResolutionSummary(stats) {
    console.log('\n📊 WEBPACK RESOLUTION DEBUG SUMMARY');
    console.log('=====================================');
    console.log(`Total resolution attempts: ${this.resolutionAttempts.length}`);
    console.log(`Build time: ${Date.now() - this.startTime}ms`);
    
    if (stats) {
      const compilation = stats.compilation;
      console.log(`Errors: ${compilation.errors.length}`);
      console.log(`Warnings: ${compilation.warnings.length}`);
      
      // Log module-specific errors
      compilation.errors.forEach(error => {
        if (error.message && this.options.targetModules.some(target => 
          error.message.includes(target)
        )) {
          console.log(`❌ MODULE ERROR: ${error.message}`);
        }
      });
    }
    
    // Group attempts by request
    const attemptsByRequest = {};
    this.resolutionAttempts.forEach(attempt => {
      if (!attemptsByRequest[attempt.request]) {
        attemptsByRequest[attempt.request] = [];
      }
      attemptsByRequest[attempt.request].push(attempt);
    });
    
    Object.keys(attemptsByRequest).forEach(request => {
      const attempts = attemptsByRequest[request];
      const successful = attempts.filter(a => a.resolved).length;
      const failed = attempts.length - successful;
      
      console.log(`\n🔄 ${request}:`);
      console.log(`   Total attempts: ${attempts.length}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      
      if (attempts.length > 0) {
        const lastAttempt = attempts[attempts.length - 1];
        console.log(`   Last result: ${lastAttempt.resolved ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (lastAttempt.resource) {
          console.log(`   Final resource: ${lastAttempt.resource}`);
        }
      }
    });
  }

  writeLogFile() {
    try {
      const fs = require('fs');
      const logData = {
        buildTime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          cwd: process.cwd(),
          env: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
          }
        },
        resolutionAttempts: this.resolutionAttempts,
        summary: {
          totalAttempts: this.resolutionAttempts.length,
          successful: this.resolutionAttempts.filter(a => a.resolved).length,
          failed: this.resolutionAttempts.filter(a => !a.resolved).length,
        }
      };
      
      fs.writeFileSync(this.options.outputFile, JSON.stringify(logData, null, 2));
      console.log(`📝 Resolution log written to: ${this.options.outputFile}`);
    } catch (error) {
      console.log(`❌ Failed to write log file: ${error.message}`);
    }
  }
}

// Next.js Config Enhancement for Resolution Debugging
const enhanceNextConfigForDebugging = (nextConfig = {}) => {
  return {
    ...nextConfig,
    webpack: (config, options) => {
      const { buildId, dev, isServer, defaultLoaders, webpack } = options;
      
      // Apply original webpack config if it exists
      if (nextConfig.webpack) {
        config = nextConfig.webpack(config, options);
      }
      
      // Add our resolution debugging plugin
      config.plugins.push(new ModuleResolutionDebugPlugin({
        logLevel: dev ? 'verbose' : 'summary',
        targetModules: [
          'components/emails',
          '@/components/emails',
          '../../components/emails',
          '../../../components/emails'
        ],
        outputFile: `./debug-resolution-${isServer ? 'server' : 'client'}-${buildId}.log`
      }));
      
      // Enable detailed resolution debugging
      config.resolve.symlinks = false; // Disable symlink resolution to avoid confusion
      
      // Add resolver debugging options
      config.infrastructureLogging = {
        ...config.infrastructureLogging,
        level: 'verbose',
        debug: [
          'enhanced-resolve',
          'ModuleResolutionDebugPlugin'
        ]
      };
      
      // Log resolve configuration
      console.log('\n⚙️ WEBPACK RESOLVE CONFIGURATION');
      console.log('=================================');
      console.log('Alias:', JSON.stringify(config.resolve.alias, null, 2));
      console.log('Modules:', config.resolve.modules);
      console.log('Extensions:', config.resolve.extensions);
      console.log('MainFields:', config.resolve.mainFields);
      console.log('MainFiles:', config.resolve.mainFiles);
      
      return config;
    }
  };
};

// Standalone Resolution Test
const testStandaloneResolution = () => {
  console.log('🧪 STANDALONE RESOLUTION TEST');
  console.log('==============================');
  
  const Module = require('module');
  const path = require('path');
  
  // Test require.resolve with different contexts
  const testContexts = [
    process.cwd(),
    path.join(process.cwd(), 'app', 'api'),
    path.join(process.cwd(), 'lib', 'services'),
    path.join(process.cwd(), 'components'),
  ];
  
  const testRequests = [
    '@/components/emails',
    './components/emails',
    '../../components/emails',
    '../../../components/emails',
    'components/emails',
  ];
  
  testRequests.forEach(request => {
    console.log(`\n🎯 Testing: ${request}`);
    console.log('-'.repeat(30));
    
    testContexts.forEach(contextPath => {
      try {
        const resolvedPath = Module._resolveFilename(request, {
          id: contextPath,
          filename: path.join(contextPath, 'test.js'),
          paths: Module._nodeModulePaths(contextPath)
        });
        
        console.log(`  ✅ From ${path.relative(process.cwd(), contextPath)}: ${resolvedPath}`);
      } catch (error) {
        console.log(`  ❌ From ${path.relative(process.cwd(), contextPath)}: ${error.code || error.message}`);
      }
    });
  });
};

// Manual Resolution Simulation
const simulateNextJSResolution = () => {
  console.log('\n🎭 NEXT.JS RESOLUTION SIMULATION');
  console.log('=================================');
  
  const path = require('path');
  const fs = require('fs');
  
  // Simulate Next.js path alias resolution
  const baseUrl = process.cwd();
  const pathsConfig = { "@/*": ["./*"] };
  
  console.log('Base URL:', baseUrl);
  console.log('Paths config:', pathsConfig);
  
  const resolveAlias = (request) => {
    if (request.startsWith('@/')) {
      const relativePath = request.substring(2); // Remove '@/'
      const fullPath = path.join(baseUrl, relativePath);
      
      console.log(`\n🔄 Resolving alias: ${request}`);
      console.log(`   Mapped to: ${fullPath}`);
      
      // Try different extensions
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      for (const ext of extensions) {
        const testPath = fullPath + ext;
        if (fs.existsSync(testPath)) {
          console.log(`   ✅ Found: ${testPath}`);
          return testPath;
        } else {
          console.log(`   ❌ Not found: ${testPath}`);
        }
      }
      
      // Try index files
      const indexPath = path.join(fullPath, 'index');
      for (const ext of extensions.slice(1)) { // Skip empty extension
        const testPath = indexPath + ext;
        if (fs.existsSync(testPath)) {
          console.log(`   ✅ Found index: ${testPath}`);
          return testPath;
        } else {
          console.log(`   ❌ No index: ${testPath}`);
        }
      }
      
      console.log(`   ❌ RESOLUTION FAILED for ${request}`);
      return null;
    }
    
    return request;
  };
  
  // Test the alias resolution
  const testAliases = ['@/components/emails', '@/components/emails/index'];
  testAliases.forEach(alias => {
    resolveAlias(alias);
  });
};

module.exports = {
  ModuleResolutionDebugPlugin,
  enhanceNextConfigForDebugging,
  testStandaloneResolution,
  simulateNextJSResolution,
};

// Auto-run if called directly
if (require.main === module) {
  testStandaloneResolution();
  simulateNextJSResolution();
}
