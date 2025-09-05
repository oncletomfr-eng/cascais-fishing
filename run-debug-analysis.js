#!/usr/bin/env node

/**
 * COMPREHENSIVE DEBUG ANALYSIS RUNNER
 * Executes all phases of the module resolution debugging process
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Import our debugging modules
const { runFullDiagnostics } = require('./debug-module-resolution.js');
const { runFileSystemAnalysis } = require('./debug-filesystem.js');
const { testStandaloneResolution, simulateNextJSResolution } = require('./debug-webpack-resolution.js');

class DebugAnalysisRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      phases: {},
      summary: {},
      artifacts: []
    };
    this.logFile = `./debug-analysis-${Date.now()}.log`;
    this.artifactsDir = './debug-artifacts';
  }

  log(message, phase = 'GENERAL') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${phase}] ${message}`;
    
    console.log(logMessage);
    
    // Append to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async ensureArtifactsDir() {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir);
      this.log(`Created artifacts directory: ${this.artifactsDir}`);
    }
  }

  async runPhase1Environmental() {
    this.log('🔬 STARTING PHASE 1: ENVIRONMENTAL FORENSICS', 'PHASE1');
    
    try {
      // Run full diagnostics
      await runFullDiagnostics();
      
      // Run file system analysis
      const fsResults = runFileSystemAnalysis();
      
      // Run standalone resolution tests
      testStandaloneResolution();
      simulateNextJSResolution();
      
      this.results.phases.environmental = {
        status: 'completed',
        fileSystemResults: fsResults,
        timestamp: new Date().toISOString()
      };
      
      this.log('✅ PHASE 1 COMPLETED', 'PHASE1');
      
    } catch (error) {
      this.log(`❌ PHASE 1 FAILED: ${error.message}`, 'PHASE1');
      this.results.phases.environmental = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runPhase2WebpackResolution() {
    this.log('⚙️ STARTING PHASE 2: WEBPACK RESOLUTION TRACING', 'PHASE2');
    
    try {
      // Backup current next.config.mjs
      if (fs.existsSync('next.config.mjs')) {
        fs.copyFileSync('next.config.mjs', 'next.config.mjs.backup');
        this.log('Backed up original next.config.mjs', 'PHASE2');
      }
      
      // Use debug config for testing
      fs.copyFileSync('next.config.debug.mjs', 'next.config.mjs');
      this.log('Activated debug Next.js configuration', 'PHASE2');
      
      // Run build with debug configuration
      this.log('Running Next.js build with debug configuration...', 'PHASE2');
      
      const buildStart = Date.now();
      let buildOutput = '';
      let buildError = '';
      
      try {
        buildOutput = execSync('npm run build', { 
          encoding: 'utf8',
          timeout: 300000, // 5 minutes timeout
        });
        
        this.log('✅ Build completed successfully', 'PHASE2');
        
      } catch (buildErr) {
        buildError = buildErr.message || buildErr.stdout || buildErr.stderr || 'Unknown build error';
        this.log('❌ Build failed - this is expected for debugging', 'PHASE2');
      }
      
      const buildTime = Date.now() - buildStart;
      
      // Collect generated debug logs
      const debugLogs = [];
      const files = fs.readdirSync('.');
      files.forEach(file => {
        if (file.startsWith('debug-resolution-') && file.endsWith('.log')) {
          const logContent = fs.readFileSync(file, 'utf8');
          debugLogs.push({
            file,
            content: JSON.parse(logContent)
          });
          
          // Move to artifacts directory
          fs.renameSync(file, path.join(this.artifactsDir, file));
          this.artifacts.push(file);
        }
      });
      
      this.results.phases.webpackResolution = {
        status: buildError ? 'failed' : 'completed',
        buildTime,
        buildOutput: buildOutput.substring(0, 10000), // First 10KB
        buildError: buildError.substring(0, 10000), // First 10KB of error
        debugLogs: debugLogs.length,
        timestamp: new Date().toISOString()
      };
      
      this.log(`Found ${debugLogs.length} debug log files`, 'PHASE2');
      this.log('✅ PHASE 2 COMPLETED', 'PHASE2');
      
      // Restore original config
      if (fs.existsSync('next.config.mjs.backup')) {
        fs.renameSync('next.config.mjs.backup', 'next.config.mjs');
        this.log('Restored original next.config.mjs', 'PHASE2');
      }
      
    } catch (error) {
      this.log(`❌ PHASE 2 FAILED: ${error.message}`, 'PHASE2');
      this.results.phases.webpackResolution = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      // Restore original config on error
      if (fs.existsSync('next.config.mjs.backup')) {
        fs.renameSync('next.config.mjs.backup', 'next.config.mjs');
      }
    }
  }

  async runPhase3MinimalReproduction() {
    this.log('🧪 STARTING PHASE 3: MINIMAL REPRODUCTION', 'PHASE3');
    
    try {
      // Create minimal test case
      const minimalTestPath = path.join(this.artifactsDir, 'minimal-test.js');
      const minimalTest = `
// Minimal reproduction test case
const path = require('path');
const fs = require('fs');

console.log('🧪 MINIMAL REPRODUCTION TEST');
console.log('============================');

// Test 1: Direct file existence
const emailsPath = './components/emails/index.ts';
console.log('File exists:', fs.existsSync(emailsPath));

// Test 2: Require resolution
try {
  const resolved = require.resolve('./components/emails');
  console.log('✅ Require resolution success:', resolved);
} catch (error) {
  console.log('❌ Require resolution failed:', error.message);
}

// Test 3: Dynamic import
(async () => {
  try {
    const imported = await import('./components/emails');
    console.log('✅ Dynamic import success:', Object.keys(imported));
  } catch (error) {
    console.log('❌ Dynamic import failed:', error.message);
  }
})();

// Test 4: Alias resolution simulation
const tsConfig = require('./tsconfig.json');
console.log('TypeScript paths config:', tsConfig.compilerOptions.paths);

// Test 5: Environment comparison
console.log('Environment:');
console.log('  Node version:', process.version);
console.log('  Platform:', process.platform);
console.log('  CWD:', process.cwd());
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  VERCEL:', process.env.VERCEL || 'false');
`;
      
      fs.writeFileSync(minimalTestPath, minimalTest);
      this.artifacts.push('minimal-test.js');
      
      // Run minimal test
      const testOutput = execSync(`node ${minimalTestPath}`, { encoding: 'utf8' });
      
      this.results.phases.minimalReproduction = {
        status: 'completed',
        testOutput,
        timestamp: new Date().toISOString()
      };
      
      this.log('✅ PHASE 3 COMPLETED', 'PHASE3');
      
    } catch (error) {
      this.log(`❌ PHASE 3 FAILED: ${error.message}`, 'PHASE3');
      this.results.phases.minimalReproduction = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runPhase4VercelComparison() {
    this.log('🌐 STARTING PHASE 4: VERCEL COMPARISON', 'PHASE4');
    
    try {
      // Generate comparison report
      const comparisonReport = {
        local: {
          platform: process.platform,
          nodeVersion: process.version,
          cwd: process.cwd(),
          fileSystem: 'case-insensitive', // Assume macOS
          buildTool: 'Next.js local'
        },
        vercel: {
          platform: 'linux',
          nodeVersion: 'v20.x', // From package.json engines
          cwd: '/var/task', // Typical Vercel path
          fileSystem: 'case-sensitive',
          buildTool: 'Next.js Vercel'
        },
        differences: [
          'File system case sensitivity (macOS vs Linux)',
          'Working directory paths',
          'Module resolution behavior',
          'Build environment variables',
          'Serverless function constraints'
        ]
      };
      
      const reportPath = path.join(this.artifactsDir, 'vercel-comparison.json');
      fs.writeFileSync(reportPath, JSON.stringify(comparisonReport, null, 2));
      this.artifacts.push('vercel-comparison.json');
      
      this.results.phases.vercelComparison = {
        status: 'completed',
        report: comparisonReport,
        timestamp: new Date().toISOString()
      };
      
      this.log('✅ PHASE 4 COMPLETED', 'PHASE4');
      
    } catch (error) {
      this.log(`❌ PHASE 4 FAILED: ${error.message}`, 'PHASE4');
      this.results.phases.vercelComparison = {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async generateFinalReport() {
    this.log('📊 GENERATING FINAL ANALYSIS REPORT', 'REPORT');
    
    // Calculate summary
    const phases = Object.keys(this.results.phases);
    const completedPhases = phases.filter(phase => 
      this.results.phases[phase].status === 'completed'
    ).length;
    
    this.results.summary = {
      totalPhases: phases.length,
      completedPhases,
      successRate: `${Math.round((completedPhases / phases.length) * 100)}%`,
      totalArtifacts: this.artifacts.length,
      analysisTime: new Date().toISOString()
    };
    
    // Write final report
    const reportPath = path.join(this.artifactsDir, 'final-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    this.artifacts.push('final-analysis-report.json');
    
    this.log('📄 Final report written to: ' + reportPath, 'REPORT');
    this.log(`📦 Generated ${this.artifacts.length} artifacts`, 'REPORT');
    this.log(`✅ Analysis completed with ${completedPhases}/${phases.length} phases successful`, 'REPORT');
    
    return this.results;
  }

  async run() {
    this.log('🚀 STARTING COMPREHENSIVE MODULE RESOLUTION ANALYSIS');
    this.log('====================================================');
    
    await this.ensureArtifactsDir();
    
    // Run all phases
    await this.runPhase1Environmental();
    await this.runPhase2WebpackResolution();
    await this.runPhase3MinimalReproduction();
    await this.runPhase4VercelComparison();
    
    // Generate final report
    const results = await this.generateFinalReport();
    
    this.log('🏁 ANALYSIS COMPLETE - Check artifacts directory for detailed results');
    
    return results;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new DebugAnalysisRunner();
  runner.run()
    .then(results => {
      console.log('\n📋 ANALYSIS SUMMARY:');
      console.log('====================');
      console.log(`Success Rate: ${results.summary.successRate}`);
      console.log(`Artifacts: ${results.summary.totalArtifacts}`);
      console.log(`Log File: ${runner.logFile}`);
      console.log(`Artifacts Dir: ${runner.artifactsDir}`);
      
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    });
}

module.exports = { DebugAnalysisRunner };
