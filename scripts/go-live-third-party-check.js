#!/usr/bin/env node

/**
 * 🚀 GO-LIVE Third-Party Services Verification
 * 
 * This script validates all external service configurations and connectivity
 * according to the Go-Live Plan requirements
 */

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
};

const chalk = {
  red: (text) => `${colors.red}${text}${colors.reset}`,
  green: (text) => `${colors.green}${text}${colors.reset}`,
  yellow: (text) => `${colors.yellow}${text}${colors.reset}`,
  blue: (text) => `${colors.blue}${text}${colors.reset}`,
  cyan: (text) => `${colors.cyan}${text}${colors.reset}`,
  white: (text) => `${colors.white}${text}${colors.reset}`,
  gray: (text) => `${colors.gray}${text}${colors.reset}`,
  bold: (text) => `${colors.bright}${text}${colors.reset}`,
};

// External services to validate
const EXTERNAL_SERVICES = [
  {
    name: 'Google OAuth',
    category: 'Authentication',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    testEndpoint: null,
    critical: true,
    description: 'Google OAuth authentication provider',
  },
  {
    name: 'GitHub OAuth',
    category: 'Authentication', 
    requiredEnvVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    testEndpoint: null,
    critical: true,
    description: 'GitHub OAuth authentication provider',
  },
  {
    name: 'Stream Chat',
    category: 'Communication',
    requiredEnvVars: ['NEXT_PUBLIC_STREAM_CHAT_API_KEY', 'STREAM_CHAT_API_SECRET'],
    testEndpoint: 'https://chat.stream-io-api.com/auth/users/',
    critical: true,
    description: 'Real-time messaging and chat system',
  },
  {
    name: 'Sentry',
    category: 'Monitoring',
    requiredEnvVars: ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN'],
    testEndpoint: null,
    critical: true,
    description: 'Error tracking and performance monitoring',
  },
  {
    name: 'Resend Email',
    category: 'Notifications',
    requiredEnvVars: ['RESEND_API_KEY'],
    testEndpoint: 'https://api.resend.com/users',
    critical: true,
    description: 'Email delivery service',
  },
  {
    name: 'OpenAI',
    category: 'AI',
    requiredEnvVars: ['OPENAI_API_KEY'],
    testEndpoint: 'https://api.openai.com/v1/models',
    critical: false,
    description: 'AI-powered features and recommendations',
  },
  {
    name: 'Stripe',
    category: 'Payments',
    requiredEnvVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
    testEndpoint: null,
    critical: false,
    description: 'Payment processing system',
  },
  {
    name: 'NASA API',
    category: 'Weather',
    requiredEnvVars: ['NASA_API_KEY'],
    testEndpoint: 'https://api.nasa.gov/planetary/apod',
    critical: false,
    description: 'NASA weather and marine data',
  },
  {
    name: 'NOAA Weather',
    category: 'Weather',
    requiredEnvVars: ['NOAA_CDO_API_TOKEN'],
    testEndpoint: 'https://www.ncei.noaa.gov/cdo-web/api/v2/locations',
    critical: false,
    description: 'NOAA weather and oceanographic data',
  },
];

class GoLiveThirdPartyChecker {
  constructor() {
    this.results = [];
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async initialize() {
    console.log(chalk.blue(chalk.bold('\n🚀 GO-LIVE Third-Party Services Check\n')));
    console.log(chalk.gray('═'.repeat(80)));
    console.log(chalk.gray('Validating external service configurations and connectivity\n'));
  }

  async checkService(service) {
    console.log(chalk.cyan(`\n🔍 Checking ${service.name}...`));
    
    const result = {
      service: service,
      status: 'unknown',
      issues: [],
      recommendations: [],
      responseTime: null,
      details: {}
    };

    try {
      const startTime = Date.now();

      // 1. Check required environment variables
      const missingVars = [];
      const presentVars = [];

      for (const envVar of service.requiredEnvVars) {
        if (!process.env[envVar]) {
          missingVars.push(envVar);
        } else {
          presentVars.push(envVar);
        }
      }

      result.details.missingEnvVars = missingVars;
      result.details.presentEnvVars = presentVars;

      if (missingVars.length > 0) {
        result.status = 'missing-config';
        result.issues.push(`Missing environment variables: ${missingVars.join(', ')}`);
        result.recommendations.push(`Set missing variables in Vercel Dashboard: ${missingVars.join(', ')}`);
        
        console.log(`  ❌ ${chalk.red('Configuration:')} Missing ${missingVars.length} environment variables`);
        missingVars.forEach(varName => {
          console.log(`      ${chalk.red('•')} ${varName}`);
        });
        
        if (presentVars.length > 0) {
          console.log(`  ✅ ${chalk.green('Present:')} ${presentVars.join(', ')}`);
        }
        
        return result;
      }

      console.log(`  ✅ ${chalk.green('Configuration:')} All environment variables present`);

      // 2. Test API connectivity (if applicable)
      if (service.testEndpoint) {
        try {
          console.log(`  🔗 Testing API connectivity...`);
          
          // Prepare headers based on service
          const headers = this.prepareHeaders(service);
          
          const response = await fetch(service.testEndpoint, {
            method: 'GET',
            headers: headers,
            timeout: 10000, // 10 second timeout
          });

          const responseTime = Date.now() - startTime;
          result.responseTime = responseTime;

          if (response.ok) {
            result.status = 'healthy';
            console.log(`  ✅ ${chalk.green('API Status:')} Healthy (${responseTime}ms)`);
            console.log(`  📊 ${chalk.gray('Response:')} ${response.status} ${response.statusText}`);
          } else {
            result.status = 'api-error';
            result.issues.push(`API returned ${response.status}: ${response.statusText}`);
            result.recommendations.push('Check API credentials and service status');
            
            console.log(`  ⚠️ ${chalk.yellow('API Status:')} Error ${response.status} (${responseTime}ms)`);
          }

        } catch (apiError) {
          const responseTime = Date.now() - startTime;
          result.responseTime = responseTime;
          
          result.status = 'connection-error';
          result.issues.push(`Connection failed: ${apiError.message}`);
          result.recommendations.push('Check network connectivity and API endpoint');
          
          console.log(`  ❌ ${chalk.red('API Status:')} Connection failed (${responseTime}ms)`);
          console.log(`      ${chalk.red('•')} ${apiError.message}`);
        }
      } else {
        // No endpoint to test, configuration check passed
        result.status = 'configured';
        console.log(`  ✅ ${chalk.green('Status:')} Configured (no endpoint test available)`);
      }

      const totalTime = Date.now() - startTime;
      console.log(`  ⏱️  ${chalk.gray('Total check time:')} ${totalTime}ms`);

    } catch (error) {
      result.status = 'error';
      result.issues.push(`Unexpected error: ${error.message}`);
      result.recommendations.push('Review service configuration and try again');
      
      console.log(`  ❌ ${chalk.red('Error:')} ${error.message}`);
    }

    return result;
  }

  prepareHeaders(service) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CascaisFishing/1.0 Go-Live-Check'
    };

    switch (service.name) {
      case 'Stream Chat':
        // Stream Chat doesn't need auth for basic connectivity test
        break;
      case 'Resend Email':
        if (process.env.RESEND_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.RESEND_API_KEY}`;
        }
        break;
      case 'OpenAI':
        if (process.env.OPENAI_API_KEY) {
          headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`;
        }
        break;
      case 'NASA API':
        // NASA API uses query parameter, not header
        break;
      case 'NOAA Weather':
        if (process.env.NOAA_CDO_API_TOKEN) {
          headers['token'] = process.env.NOAA_CDO_API_TOKEN;
        }
        break;
    }

    return headers;
  }

  async checkAllServices() {
    console.log(chalk.white(chalk.bold('📋 Service Validation Results:\n')));

    // Group services by category
    const categories = [...new Set(EXTERNAL_SERVICES.map(s => s.category))];

    for (const category of categories) {
      console.log(chalk.cyan(chalk.bold(`\n${category} Services:`)));
      
      const categoryServices = EXTERNAL_SERVICES.filter(s => s.category === category);
      
      for (const service of categoryServices) {
        const result = await this.checkService(service);
        this.results.push(result);
      }
    }
  }

  async generateSummary() {
    console.log(chalk.white(chalk.bold('\n📊 Go-Live Services Summary:')));
    console.log(chalk.gray('─'.repeat(50)));

    const total = this.results.length;
    const critical = this.results.filter(r => r.service.critical).length;
    const criticalHealthy = this.results.filter(r => r.service.critical && ['healthy', 'configured'].includes(r.status)).length;
    const criticalIssues = critical - criticalHealthy;
    
    const healthy = this.results.filter(r => ['healthy', 'configured'].includes(r.status)).length;
    const issues = this.results.filter(r => !['healthy', 'configured'].includes(r.status)).length;

    console.log(`Total Services:       ${total}`);
    console.log(`${chalk.green('✅ Healthy:')}          ${healthy}`);
    console.log(`${chalk.red('❌ Issues:')}           ${issues}`);
    console.log(`Critical Services:    ${critical}`);
    console.log(`${chalk.green('✅ Critical Healthy:')} ${criticalHealthy}`);
    console.log(`${chalk.red('🚨 Critical Issues:')}  ${criticalIssues}`);

    // Launch readiness assessment
    console.log(chalk.white(chalk.bold('\n🚀 Launch Readiness:')));
    console.log(chalk.gray('─'.repeat(50)));

    if (criticalIssues === 0) {
      console.log(chalk.green(chalk.bold('✅ THIRD-PARTY SERVICES READY FOR LAUNCH')));
      console.log(chalk.green('All critical external services are properly configured.'));
    } else {
      console.log(chalk.red(chalk.bold('❌ THIRD-PARTY SERVICES NOT READY')));
      console.log(chalk.red(`${criticalIssues} critical service(s) have configuration issues.`));
    }

    // Service-specific recommendations
    const servicesWithIssues = this.results.filter(r => r.issues.length > 0);
    if (servicesWithIssues.length > 0) {
      console.log(chalk.yellow(chalk.bold('\n🔧 Action Items:')));
      console.log(chalk.gray('─'.repeat(50)));

      servicesWithIssues.forEach((result, index) => {
        const priority = result.service.critical ? '🚨 CRITICAL' : '⚠️ Optional';
        console.log(`${index + 1}. ${priority} ${chalk.yellow(chalk.bold(result.service.name))}`);
        result.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
        console.log('');
      });
    }

    return criticalIssues === 0;
  }

  async execute() {
    try {
      await this.initialize();
      await this.checkAllServices();
      const success = await this.generateSummary();
      
      return success;
      
    } catch (error) {
      console.error(chalk.red(chalk.bold('\n❌ Third-party services check failed:')));
      console.error(error);
      return false;
    }
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  const checker = new GoLiveThirdPartyChecker();
  
  checker.execute()
    .then(success => {
      if (success) {
        console.log(chalk.green(chalk.bold('\n🎉 Third-party services check completed successfully!\n')));
        process.exit(0);
      } else {
        console.log(chalk.red(chalk.bold('\n💥 Third-party services check found critical issues!\n')));
        process.exit(1);
      }
    })
    .catch(error => {
      console.error(chalk.red(chalk.bold('\n❌ Fatal error during services check:')));
      console.error(error);
      process.exit(1);
    });
}

module.exports = { GoLiveThirdPartyChecker };
