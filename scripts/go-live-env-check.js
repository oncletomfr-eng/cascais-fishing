#!/usr/bin/env node

/**
 * 🚀 GO-LIVE Environment Variables Verification
 * 
 * This script validates all required environment variables for production launch
 * according to the Go-Live Plan requirements
 */

// ANSI color codes for terminal output
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

// Helper functions for colored output
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

// Required environment variables for production launch
const REQUIRED_ENV_VARS = [
  // NextAuth v5 Configuration (CRITICAL)
  {
    name: 'AUTH_SECRET',
    description: 'NextAuth v5 secret key (64-char hex)',
    required: true,
    category: 'Auth',
    validationPattern: /^[a-f0-9]{64}$/i,
  },
  {
    name: 'AUTH_URL',
    description: 'Production URL for NextAuth',
    required: true,
    category: 'Auth',
    productionValue: 'https://www.cascaisfishing.com/',
  },
  {
    name: 'AUTH_TRUST_HOST',
    description: 'Trust host for NextAuth v5 (must be true)',
    required: true,
    category: 'Auth',
    productionValue: 'true',
  },

  // OAuth Providers (CRITICAL)
  {
    name: 'GOOGLE_CLIENT_ID',
    description: 'Google OAuth client ID',
    required: true,
    category: 'OAuth',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    description: 'Google OAuth client secret',
    required: true,
    category: 'OAuth',
  },
  {
    name: 'GITHUB_CLIENT_ID',
    description: 'GitHub OAuth client ID',
    required: true,
    category: 'OAuth',
  },
  {
    name: 'GITHUB_CLIENT_SECRET',
    description: 'GitHub OAuth client secret',
    required: true,
    category: 'OAuth',
  },

  // Database (CRITICAL)
  {
    name: 'DATABASE_URL',
    description: 'Supabase PostgreSQL database URL (port 6543)',
    required: true,
    category: 'Database',
    validationPattern: /postgresql:\/\/.*:6543\//,
  },

  // Stream Chat (HIGH PRIORITY)
  {
    name: 'NEXT_PUBLIC_STREAM_CHAT_API_KEY',
    description: 'Stream Chat API key (public)',
    required: true,
    category: 'Stream Chat',
  },
  {
    name: 'STREAM_CHAT_API_SECRET',
    description: 'Stream Chat API secret',
    required: true,
    category: 'Stream Chat',
  },
  {
    name: 'STREAM_CHAT_ENVIRONMENT',
    description: 'Stream Chat environment',
    required: true,
    category: 'Stream Chat',
    productionValue: 'production',
  },

  // Error Monitoring (HIGH PRIORITY)
  {
    name: 'SENTRY_DSN',
    description: 'Sentry Data Source Name',
    required: true,
    category: 'Monitoring',
  },
  {
    name: 'NEXT_PUBLIC_SENTRY_DSN',
    description: 'Sentry DSN (client-side)',
    required: true,
    category: 'Monitoring',
  },
  {
    name: 'SENTRY_ENVIRONMENT',
    description: 'Sentry environment',
    required: true,
    category: 'Monitoring',
    productionValue: 'production',
  },

  // Email Service
  {
    name: 'RESEND_API_KEY',
    description: 'Resend email service API key',
    required: true,
    category: 'Email',
  },

  // Payment Processing
  {
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe secret key (live)',
    required: false,
    category: 'Payment',
    validationPattern: /^sk_live_/,
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    description: 'Stripe publishable key (live)',
    required: false,
    category: 'Payment',
    validationPattern: /^pk_live_/,
  },

  // AI Services
  {
    name: 'OPENAI_API_KEY',
    description: 'OpenAI API key',
    required: false,
    category: 'AI',
    validationPattern: /^sk-proj-/,
  },

  // Weather APIs
  {
    name: 'NASA_API_KEY',
    description: 'NASA weather API key',
    required: false,
    category: 'Weather',
  },
  {
    name: 'NOAA_CDO_API_TOKEN',
    description: 'NOAA weather API token',
    required: false,
    category: 'Weather',
  },
];

class GoLiveEnvChecker {
  constructor() {
    this.results = [];
  }
  
  async validateEnvironment() {
    console.log(chalk.blue(chalk.bold('\n🚀 GO-LIVE Environment Variables Check\n')));
    console.log(chalk.gray('═'.repeat(80)));
    
    // Check each required variable
    for (const envVar of REQUIRED_ENV_VARS) {
      const result = this.validateVariable(envVar);
      this.results.push(result);
    }
    
    this.printResults();
    this.printSummary();
    this.printRecommendations();
  }
  
  validateVariable(envVar) {
    const currentValue = process.env[envVar.name];
    const result = {
      variable: envVar,
      status: 'missing',
      currentValue: currentValue ? '***REDACTED***' : undefined,
      issues: [],
      recommendations: []
    };
    
    // Check if variable exists
    if (!currentValue) {
      result.status = 'missing';
      result.issues.push('Environment variable not set');
      result.recommendations.push(`Set ${envVar.name} in Vercel environment variables`);
      return result;
    }
    
    // Check production value match
    if (envVar.productionValue && currentValue !== envVar.productionValue) {
      result.status = 'production-mismatch';
      result.issues.push(`Expected '${envVar.productionValue}' but got '${currentValue}'`);
      result.recommendations.push(`Update ${envVar.name} to '${envVar.productionValue}' for production`);
      return result;
    }
    
    // Check validation pattern
    if (envVar.validationPattern && !envVar.validationPattern.test(currentValue)) {
      result.status = 'invalid';
      result.issues.push('Value does not match required format');
      result.recommendations.push(`Ensure ${envVar.name} follows the correct format`);
      return result;
    }
    
    result.status = 'valid';
    return result;
  }
  
  printResults() {
    console.log(chalk.white(chalk.bold('\n📋 Environment Variables Status:\n')));
    
    const categories = [...new Set(REQUIRED_ENV_VARS.map(v => v.category))];
    
    categories.forEach(category => {
      console.log(chalk.cyan(chalk.bold(`\n${category}:`)));
      
      const categoryResults = this.results.filter(r => r.variable.category === category);
      
      categoryResults.forEach(result => {
        const { variable, status, issues } = result;
        
        let statusIcon = '';
        let statusColor = chalk.gray;
        
        switch (status) {
          case 'valid':
            statusIcon = '✅';
            statusColor = chalk.green;
            break;
          case 'missing':
            statusIcon = '❌';
            statusColor = chalk.red;
            break;
          case 'invalid':
            statusIcon = '⚠️';
            statusColor = chalk.yellow;
            break;
          case 'production-mismatch':
            statusIcon = '🔄';
            statusColor = chalk.yellow;
            break;
        }
        
        console.log(`  ${statusIcon} ${statusColor(variable.name.padEnd(35))} ${chalk.gray(variable.description)}`);
        
        if (issues.length > 0) {
          issues.forEach(issue => {
            console.log(`      ${chalk.red('•')} ${chalk.red(issue)}`);
          });
        }
      });
    });
  }
  
  printSummary() {
    const total = this.results.length;
    const valid = this.results.filter(r => r.status === 'valid').length;
    const missing = this.results.filter(r => r.status === 'missing').length;
    const invalid = this.results.filter(r => r.status === 'invalid').length;
    const mismatch = this.results.filter(r => r.status === 'production-mismatch').length;
    const critical = this.results.filter(r => r.variable.required && r.status !== 'valid').length;
    
    console.log(chalk.white(chalk.bold('\n📊 Summary:')));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Total Variables:      ${total}`);
    console.log(`${chalk.green('✅ Valid:')}           ${valid}`);
    console.log(`${chalk.red('❌ Missing:')}         ${missing}`);
    console.log(`${chalk.yellow('⚠️  Invalid:')}        ${invalid}`);
    console.log(`${chalk.yellow('🔄 Mismatch:')}        ${mismatch}`);
    console.log(`${chalk.red(chalk.bold('🚨 Critical Issues:'))} ${critical}`);
    
    // Launch readiness assessment
    console.log(chalk.white(chalk.bold('\n🚀 Launch Readiness:')));
    console.log(chalk.gray('─'.repeat(50)));
    
    if (critical === 0) {
      console.log(chalk.green(chalk.bold('✅ READY FOR LAUNCH')));
      console.log(chalk.green('All critical environment variables are properly configured.'));
    } else {
      console.log(chalk.red(chalk.bold('❌ NOT READY FOR LAUNCH')));
      console.log(chalk.red(`${critical} critical environment variable(s) need attention.`));
    }
  }
  
  printRecommendations() {
    const issuesFound = this.results.filter(r => r.status !== 'valid');
    
    if (issuesFound.length === 0) {
      console.log(chalk.green(chalk.bold('\n🎉 No issues found! Environment is production-ready.\n')));
      return;
    }
    
    console.log(chalk.yellow(chalk.bold('\n🔧 Action Items:')));
    console.log(chalk.gray('─'.repeat(50)));
    
    issuesFound.forEach((result, index) => {
      console.log(`${index + 1}. ${chalk.yellow(chalk.bold(result.variable.name))}`);
      result.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
      console.log('');
    });
    
    console.log(chalk.blue(chalk.bold('🔗 Next Steps:')));
    console.log('1. Open Vercel Dashboard → Project Settings → Environment Variables');
    console.log('2. Add/update the missing/invalid environment variables');
    console.log('3. Set environment scope to "All Environments"');
    console.log('4. Trigger a new deployment');
    console.log('5. Re-run this script to verify fixes');
    console.log('');
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  const checker = new GoLiveEnvChecker();
  checker.validateEnvironment().catch(error => {
    console.error(chalk.red(chalk.bold('\n❌ Environment check failed:')));
    console.error(error);
    process.exit(1);
  });
}
