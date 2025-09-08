/**
 * Stream Chat Production Connectivity Test
 * Task 11.6: Test production chat connectivity
 * 
 * Comprehensive test suite for Stream Chat production readiness
 */

import { 
  testStreamChatConnection,
  streamChatHealthCheck,
  isStreamChatConfigured,
  getStreamChatSetupInstructions
} from '../lib/config/stream-chat';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  duration?: number;
}

class StreamChatProductionTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    skipped: number;
    results: TestResult[];
    overallStatus: 'PASS' | 'FAIL';
  }> {
    console.log('🧪 Starting Stream Chat Production Connectivity Tests...\n');
    
    await this.testConfiguration();
    await this.testHealthCheck();
    await this.testConnection();
    await this.testEnvironmentVariables();
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    
    const overallStatus = failed > 0 ? 'FAIL' : 'PASS';
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    
    if (failed > 0) {
      console.log('\n🔧 Failed Tests:');
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`  • ${result.testName}: ${result.message}`);
      });
    }
    
    return {
      passed,
      failed,
      skipped,
      results: this.results,
      overallStatus
    };
  }

  private async runTest(
    testName: string, 
    testFunction: () => Promise<{ success: boolean; message: string; details?: any }>
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 ${testName}...`);
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.results.push({
        testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message,
        details: result.details,
        duration
      });
      
      const statusIcon = result.success ? '✅' : '❌';
      console.log(`   ${statusIcon} ${result.message} (${duration}ms)`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.results.push({
        testName,
        status: 'FAIL',
        message: `Test execution failed: ${errorMessage}`,
        duration
      });
      
      console.log(`   ❌ Test execution failed: ${errorMessage} (${duration}ms)`);
    }
  }

  private async testConfiguration(): Promise<void> {
    await this.runTest('Configuration Validation', async () => {
      const isConfigured = isStreamChatConfigured();
      
      if (!isConfigured) {
        return {
          success: false,
          message: 'Stream Chat not properly configured',
          details: getStreamChatSetupInstructions()
        };
      }
      
      return {
        success: true,
        message: 'Stream Chat configuration is valid'
      };
    });
  }

  private async testHealthCheck(): Promise<void> {
    await this.runTest('Health Check', async () => {
      const healthResult = await streamChatHealthCheck();
      
      return {
        success: healthResult.status === 'healthy',
        message: healthResult.message,
        details: {
          status: healthResult.status,
          checks: healthResult.checks,
          timestamp: healthResult.timestamp
        }
      };
    });
  }

  private async testConnection(): Promise<void> {
    await this.runTest('Connection Test', async () => {
      const connectionResult = await testStreamChatConnection();
      
      return {
        success: connectionResult.success,
        message: connectionResult.message,
        details: {
          environment: connectionResult.environment,
          apiKeyValid: connectionResult.apiKeyValid
        }
      };
    });
  }

  private async testEnvironmentVariables(): Promise<void> {
    await this.runTest('Environment Variables', async () => {
      const requiredVars = [
        'NEXT_PUBLIC_STREAM_CHAT_API_KEY',
        'STREAM_CHAT_API_SECRET'
      ];
      
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      const demoVars = requiredVars.filter(varName => {
        const value = process.env[varName];
        return value && (
          value.includes('demo') || 
          value.includes('test') || 
          value === 'your-api-key-here' ||
          value === 'demo-key' ||
          value === 'demo-key-please-configure'
        );
      });
      
      if (missingVars.length > 0) {
        return {
          success: false,
          message: `Missing environment variables: ${missingVars.join(', ')}`,
          details: { missingVars, demoVars }
        };
      }
      
      if (demoVars.length > 0) {
        return {
          success: false,
          message: `Demo/placeholder values detected: ${demoVars.join(', ')}`,
          details: { missingVars, demoVars }
        };
      }
      
      return {
        success: true,
        message: 'All required environment variables are configured',
        details: {
          configuredVars: requiredVars,
          apiKeyLength: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY?.length || 0,
          secretLength: process.env.STREAM_CHAT_API_SECRET?.length || 0
        }
      };
    });
  }

  async generateReport(): Promise<string> {
    const summary = await this.runAllTests();
    
    const report = `
# Stream Chat Production Connectivity Test Report
**Generated:** ${new Date().toISOString()}
**Environment:** ${process.env.NODE_ENV || 'development'}

## Test Results Summary
- ✅ **Passed:** ${summary.passed}
- ❌ **Failed:** ${summary.failed}  
- ⏭️ **Skipped:** ${summary.skipped}
- 🎯 **Overall Status:** ${summary.overallStatus}

## Detailed Results

${summary.results.map(result => `
### ${result.testName}
**Status:** ${result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⏭️ SKIP'}
**Message:** ${result.message}
**Duration:** ${result.duration}ms
${result.details ? `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`` : ''}
`).join('\n')}

## Production Readiness Assessment

${summary.overallStatus === 'PASS' ? `
✅ **PRODUCTION READY**

Stream Chat is properly configured and ready for production deployment:
- All configuration tests passed
- Health checks successful
- Connection established successfully
- Environment variables properly set

**Next Steps:**
1. Deploy to production environment
2. Configure monitoring and alerting
3. Test with real users
4. Monitor performance metrics

` : `
❌ **NOT PRODUCTION READY**

Issues found that must be resolved before production deployment:
${summary.results.filter(r => r.status === 'FAIL').map(r => `- ${r.message}`).join('\n')}

**Action Required:**
1. Fix all failing tests
2. Ensure proper API keys are configured
3. Verify network connectivity
4. Re-run tests until all pass

`}

## Support Resources
- Stream Chat Documentation: https://getstream.io/chat/docs/
- Configuration Guide: docs/STREAM_CHAT_PRODUCTION_SETUP.md
- Health Check Endpoint: /api/chat/health
- Setup Instructions: /api/chat/test-connection
`;

    return report;
  }
}

// Main execution
async function main() {
  const tester = new StreamChatProductionTester();
  
  try {
    const results = await tester.runAllTests();
    
    // Generate and save report
    const report = await tester.generateReport();
    console.log('\n📄 Generating test report...');
    
    // In a real application, you might save this report to a file
    // For now, we'll just log the summary
    console.log('\n' + '='.repeat(60));
    console.log('STREAM CHAT PRODUCTION READINESS TEST COMPLETE');
    console.log('='.repeat(60));
    
    if (results.overallStatus === 'PASS') {
      console.log('🎉 Stream Chat is PRODUCTION READY!');
      process.exit(0);
    } else {
      console.log('⚠️ Stream Chat requires fixes before production deployment');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { StreamChatProductionTester };

// Run if called directly
if (require.main === module) {
  main();
}
