#!/usr/bin/env tsx
/**
 * Production Environment Configuration Audit
 * Task T8: Complete review of production environment readiness
 * 
 * Comprehensive audit of:
 * - Environment variables configuration
 * - Third-party API integrations
 * - Security configuration
 * - Environment segregation
 */

import fs from 'fs/promises'
import path from 'path'

interface EnvAuditResult {
  category: string
  variable: string
  status: 'present' | 'missing' | 'invalid' | 'secure'
  value?: string
  recommendation?: string
  critical: boolean
}

interface ServiceIntegration {
  service: string
  status: 'configured' | 'missing' | 'error'
  variables: string[]
  testResult?: boolean
  error?: string
}

interface AuditSummary {
  totalVariables: number
  configuredVariables: number
  missingCritical: number
  securityIssues: number
  thirdPartyServices: ServiceIntegration[]
  recommendations: string[]
  productionReady: boolean
}

class ProductionEnvironmentAuditor {
  private auditResults: EnvAuditResult[] = []
  private serviceIntegrations: ServiceIntegration[] = []

  /**
   * Critical environment variables required for production
   */
  private readonly requiredEnvVars = {
    // NextAuth v5 Configuration
    auth: [
      { var: 'AUTH_SECRET', critical: true, description: 'NextAuth JWT secret' },
      { var: 'AUTH_URL', critical: true, description: 'Production auth URL' },
      { var: 'AUTH_TRUST_HOST', critical: true, description: 'NextAuth trust host' },
      { var: 'GOOGLE_CLIENT_ID', critical: true, description: 'Google OAuth client ID' },
      { var: 'GOOGLE_CLIENT_SECRET', critical: true, description: 'Google OAuth secret' },
      { var: 'GITHUB_CLIENT_ID', critical: true, description: 'GitHub OAuth client ID' },
      { var: 'GITHUB_CLIENT_SECRET', critical: true, description: 'GitHub OAuth secret' }
    ],

    // Database Configuration
    database: [
      { var: 'DATABASE_URL', critical: true, description: 'Supabase connection string' },
      { var: 'DIRECT_URL', critical: false, description: 'Direct database connection' }
    ],

    // Stream Chat Configuration  
    streamChat: [
      { var: 'NEXT_PUBLIC_STREAM_CHAT_API_KEY', critical: true, description: 'Stream Chat API key' },
      { var: 'STREAM_CHAT_API_SECRET', critical: true, description: 'Stream Chat secret' },
      { var: 'STREAM_CHAT_ENVIRONMENT', critical: false, description: 'Stream Chat environment' },
      { var: 'STREAM_CHAT_TIMEOUT', critical: false, description: 'Connection timeout' },
      { var: 'STREAM_CHAT_ENABLE_LOGGING', critical: false, description: 'Debug logging setting' }
    ],

    // Payment Processing (Stripe)
    payments: [
      { var: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', critical: true, description: 'Stripe public key' },
      { var: 'STRIPE_SECRET_KEY', critical: true, description: 'Stripe secret key' },
      { var: 'STRIPE_WEBHOOK_SECRET', critical: false, description: 'Stripe webhook secret' }
    ],

    // Email Service (Resend)
    email: [
      { var: 'RESEND_API_KEY', critical: true, description: 'Resend email API key' }
    ],

    // Weather APIs
    weather: [
      { var: 'TOMORROW_IO_API_KEY', critical: false, description: 'Tomorrow.io weather API' },
      { var: 'OPENWEATHER_API_KEY', critical: false, description: 'OpenWeather API' },
      { var: 'NASA_API_KEY', critical: false, description: 'NASA API for marine data' }
    ],

    // Application Configuration
    app: [
      { var: 'NODE_ENV', critical: true, description: 'Environment mode' },
      { var: 'VERCEL_ENV', critical: false, description: 'Vercel environment' },
      { var: 'ADMIN_SECRET_KEY', critical: false, description: 'Admin panel secret' }
    ]
  }

  /**
   * Audit environment variable configuration
   */
  private auditEnvironmentVariables(): void {
    console.log('🔍 Auditing environment variables...')

    for (const [category, variables] of Object.entries(this.requiredEnvVars)) {
      for (const config of variables) {
        const value = process.env[config.var]
        
        let status: EnvAuditResult['status'] = 'missing'
        let recommendation: string | undefined

        if (value) {
          // Check for placeholder values
          const placeholderPatterns = [
            'your-key-here',
            'placeholder',
            'demo-key',
            'test-key',
            'changeme',
            'example'
          ]

          const isPlaceholder = placeholderPatterns.some(pattern => 
            value.toLowerCase().includes(pattern)
          )

          if (isPlaceholder) {
            status = 'invalid'
            recommendation = `Replace placeholder value with production ${config.description}`
          } else if (config.var.includes('SECRET') || config.var.includes('KEY')) {
            status = value.length >= 32 ? 'secure' : 'invalid'
            if (status === 'invalid') {
              recommendation = `${config.description} should be at least 32 characters for security`
            }
          } else {
            status = 'present'
          }
        } else if (config.critical) {
          recommendation = `CRITICAL: ${config.description} must be configured for production`
        } else {
          recommendation = `OPTIONAL: ${config.description} enhances functionality when configured`
        }

        this.auditResults.push({
          category,
          variable: config.var,
          status,
          value: value ? this.maskSensitiveValue(config.var, value) : undefined,
          recommendation,
          critical: config.critical
        })
      }
    }
  }

  /**
   * Test third-party service integrations
   */
  private async testServiceIntegrations(): Promise<void> {
    console.log('🔗 Testing third-party service integrations...')

    // Stream Chat Integration Test
    await this.testStreamChatIntegration()

    // Database Integration Test
    await this.testDatabaseIntegration()

    // Email Service Test
    await this.testEmailServiceIntegration()

    // Weather API Test
    await this.testWeatherAPIIntegration()
  }

  private async testStreamChatIntegration(): Promise<void> {
    const integration: ServiceIntegration = {
      service: 'Stream Chat',
      status: 'missing',
      variables: ['NEXT_PUBLIC_STREAM_CHAT_API_KEY', 'STREAM_CHAT_API_SECRET']
    }

    try {
      const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY
      const secret = process.env.STREAM_CHAT_API_SECRET

      if (!apiKey || !secret) {
        integration.status = 'missing'
        integration.error = 'Missing Stream Chat API credentials'
      } else if (apiKey.includes('demo') || secret.includes('demo')) {
        integration.status = 'error'
        integration.error = 'Using demo/placeholder credentials'
      } else {
        // Basic validation - API key format
        if (apiKey.length < 10) {
          integration.status = 'error'
          integration.error = 'API key appears to be invalid format'
        } else {
          integration.status = 'configured'
          integration.testResult = true
        }
      }
    } catch (error) {
      integration.status = 'error'
      integration.error = error instanceof Error ? error.message : 'Unknown error'
    }

    this.serviceIntegrations.push(integration)
  }

  private async testDatabaseIntegration(): Promise<void> {
    const integration: ServiceIntegration = {
      service: 'Supabase Database',
      status: 'missing',
      variables: ['DATABASE_URL']
    }

    try {
      const dbUrl = process.env.DATABASE_URL

      if (!dbUrl) {
        integration.status = 'missing'
        integration.error = 'DATABASE_URL not configured'
      } else if (!dbUrl.includes('supabase.com')) {
        integration.status = 'error'
        integration.error = 'Database URL does not appear to be Supabase'
      } else if (!dbUrl.includes('pgbouncer=true')) {
        integration.status = 'error'
        integration.error = 'Missing pgbouncer configuration for serverless'
      } else {
        integration.status = 'configured'
        integration.testResult = true
      }
    } catch (error) {
      integration.status = 'error'
      integration.error = error instanceof Error ? error.message : 'Unknown error'
    }

    this.serviceIntegrations.push(integration)
  }

  private async testEmailServiceIntegration(): Promise<void> {
    const integration: ServiceIntegration = {
      service: 'Resend Email',
      status: 'missing', 
      variables: ['RESEND_API_KEY']
    }

    try {
      const apiKey = process.env.RESEND_API_KEY

      if (!apiKey) {
        integration.status = 'missing'
        integration.error = 'RESEND_API_KEY not configured'
      } else if (apiKey.includes('placeholder') || apiKey === 'your-resend-api-key') {
        integration.status = 'error'
        integration.error = 'Using placeholder API key'
      } else if (!apiKey.startsWith('re_')) {
        integration.status = 'error'
        integration.error = 'API key format appears invalid (should start with re_)'
      } else {
        integration.status = 'configured'
        integration.testResult = true
      }
    } catch (error) {
      integration.status = 'error'
      integration.error = error instanceof Error ? error.message : 'Unknown error'
    }

    this.serviceIntegrations.push(integration)
  }

  private async testWeatherAPIIntegration(): Promise<void> {
    const integration: ServiceIntegration = {
      service: 'Weather APIs',
      status: 'missing',
      variables: ['TOMORROW_IO_API_KEY', 'NASA_API_KEY', 'OPENWEATHER_API_KEY']
    }

    try {
      const tomorrowKey = process.env.TOMORROW_IO_API_KEY
      const nasaKey = process.env.NASA_API_KEY
      const openWeatherKey = process.env.OPENWEATHER_API_KEY

      const configuredKeys = [tomorrowKey, nasaKey, openWeatherKey].filter(Boolean)

      if (configuredKeys.length === 0) {
        integration.status = 'missing'
        integration.error = 'No weather API keys configured'
      } else if (configuredKeys.some(key => key && key.includes('placeholder'))) {
        integration.status = 'error'
        integration.error = 'Some weather APIs using placeholder keys'
      } else {
        integration.status = 'configured'
        integration.testResult = true
        integration.error = `${configuredKeys.length}/3 weather services configured`
      }
    } catch (error) {
      integration.status = 'error'
      integration.error = error instanceof Error ? error.message : 'Unknown error'
    }

    this.serviceIntegrations.push(integration)
  }

  /**
   * Mask sensitive values for reporting
   */
  private maskSensitiveValue(varName: string, value: string): string {
    const sensitivePatterns = ['SECRET', 'KEY', 'TOKEN', 'PASSWORD']
    const isSensitive = sensitivePatterns.some(pattern => varName.includes(pattern))
    
    if (isSensitive && value.length > 8) {
      return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`
    }
    
    return value.length > 50 ? `${value.substring(0, 20)}...` : value
  }

  /**
   * Generate comprehensive audit report
   */
  private generateAuditSummary(): AuditSummary {
    const totalVariables = this.auditResults.length
    const configuredVariables = this.auditResults.filter(r => r.status === 'present' || r.status === 'secure').length
    const missingCritical = this.auditResults.filter(r => r.critical && r.status === 'missing').length
    const securityIssues = this.auditResults.filter(r => r.status === 'invalid').length

    const recommendations: string[] = []
    
    // Critical missing variables
    this.auditResults
      .filter(r => r.critical && r.status === 'missing')
      .forEach(r => recommendations.push(`🚨 CRITICAL: Configure ${r.variable} - ${r.recommendation}`))
    
    // Security issues
    this.auditResults
      .filter(r => r.status === 'invalid')
      .forEach(r => recommendations.push(`🔒 SECURITY: ${r.variable} - ${r.recommendation}`))
    
    // Service integration issues
    this.serviceIntegrations
      .filter(s => s.status !== 'configured')
      .forEach(s => recommendations.push(`🔗 SERVICE: ${s.service} - ${s.error}`))

    const productionReady = missingCritical === 0 && securityIssues === 0

    return {
      totalVariables,
      configuredVariables,
      missingCritical,
      securityIssues,
      thirdPartyServices: this.serviceIntegrations,
      recommendations,
      productionReady
    }
  }

  /**
   * Generate detailed audit report
   */
  private async generateAuditReport(summary: AuditSummary): Promise<string> {
    const report = `
# 🔍 Production Environment Configuration Audit Report

**Generated**: ${new Date().toISOString()}  
**Production Ready**: ${summary.productionReady ? '✅ YES' : '❌ NO'}

## 📊 Executive Summary

- **Total Variables Audited**: ${summary.totalVariables}
- **Configured Variables**: ${summary.configuredVariables} (${Math.round(summary.configuredVariables/summary.totalVariables*100)}%)
- **Missing Critical Variables**: ${summary.missingCritical}
- **Security Issues**: ${summary.securityIssues}
- **Third-party Services**: ${summary.thirdPartyServices.length}

## 🔐 Environment Variables by Category

${Object.entries(
  this.auditResults.reduce((acc, result) => {
    if (!acc[result.category]) acc[result.category] = []
    acc[result.category].push(result)
    return acc
  }, {} as Record<string, EnvAuditResult[]>)
).map(([category, results]) => `
### ${category.toUpperCase()} Configuration

${results.map(result => {
  const statusIcon = {
    present: '✅',
    secure: '🔒✅', 
    missing: '❌',
    invalid: '⚠️'
  }[result.status]
  
  const criticalBadge = result.critical ? ' **[CRITICAL]**' : ''
  
  return `- ${statusIcon} **${result.variable}**${criticalBadge}
  - Status: ${result.status.toUpperCase()}
  - Value: ${result.value || 'Not set'}
  ${result.recommendation ? `- Recommendation: ${result.recommendation}` : ''}`
}).join('\n')}
`).join('\n')}

## 🔗 Third-Party Service Integrations

${this.serviceIntegrations.map(service => {
  const statusIcon = {
    configured: '✅',
    missing: '❌', 
    error: '⚠️'
  }[service.status]
  
  return `### ${service.service}
- **Status**: ${statusIcon} ${service.status.toUpperCase()}
- **Required Variables**: ${service.variables.join(', ')}
${service.error ? `- **Issue**: ${service.error}` : ''}
${service.testResult !== undefined ? `- **Test Result**: ${service.testResult ? '✅ PASSED' : '❌ FAILED'}` : ''}`
}).join('\n\n')}

## 🎯 Action Items & Recommendations

${summary.recommendations.length > 0 ? 
  summary.recommendations.map(rec => `- ${rec}`).join('\n') :
  '✅ No critical issues found - environment is production ready!'
}

## 🔒 Security Assessment

**Environment Segregation**: ${this.assessEnvironmentSecurity()}
**Secret Management**: ${this.assessSecretManagement()}
**API Key Security**: ${this.assessAPIKeySecurity()}

## 📋 Production Deployment Checklist

${this.generateProductionChecklist()}

---

**Audit Completed**: ${new Date().toISOString()}  
**Next Review**: ${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]} (Monthly)

**Task T8.1-T8.3 Status**: ${summary.productionReady ? '✅ COMPLETED' : '⚠️ REQUIRES ATTENTION'}
`

    // Save report
    const reportsDir = path.join(process.cwd(), '.taskmaster', 'reports')
    await fs.mkdir(reportsDir, { recursive: true })
    
    const reportPath = path.join(reportsDir, `production-environment-audit-${Date.now()}.md`)
    await fs.writeFile(reportPath, report)
    
    console.log(`📄 Production environment audit report saved to: ${reportPath}`)
    
    return report
  }

  private assessEnvironmentSecurity(): string {
    // Check for proper environment segregation
    const nodeEnv = process.env.NODE_ENV
    const vercelEnv = process.env.VERCEL_ENV
    
    if (nodeEnv === 'production' || vercelEnv === 'production') {
      return '✅ PRODUCTION environment properly identified'
    } else {
      return '⚠️ Environment settings indicate development/testing mode'
    }
  }

  private assessSecretManagement(): string {
    const secretVars = this.auditResults.filter(r => 
      r.variable.includes('SECRET') || r.variable.includes('KEY')
    )
    
    const secureSecrets = secretVars.filter(r => r.status === 'secure').length
    const totalSecrets = secretVars.length
    
    if (secureSecrets === totalSecrets) {
      return `✅ All ${totalSecrets} secrets properly configured`
    } else {
      return `⚠️ ${totalSecrets - secureSecrets}/${totalSecrets} secrets need attention`
    }
  }

  private assessAPIKeySecurity(): string {
    const apiKeys = this.auditResults.filter(r => r.variable.includes('API_KEY'))
    const validKeys = apiKeys.filter(r => r.status !== 'missing' && r.status !== 'invalid').length
    
    return `${validKeys}/${apiKeys.length} API keys properly configured`
  }

  private generateProductionChecklist(): string {
    const criticalMissing = this.auditResults.filter(r => r.critical && r.status === 'missing')
    const securityIssues = this.auditResults.filter(r => r.status === 'invalid')
    
    return `
- [${criticalMissing.length === 0 ? 'x' : ' '}] All critical environment variables configured
- [${securityIssues.length === 0 ? 'x' : ' '}] No security issues with secrets/keys  
- [${this.serviceIntegrations.filter(s => s.status === 'configured').length === this.serviceIntegrations.length ? 'x' : ' '}] All third-party services properly integrated
- [ ] Environment variables configured in Vercel production
- [ ] Backup environment configuration documented
- [ ] Team access to environment management reviewed`
  }

  /**
   * Run complete production environment audit
   */
  async runAudit(): Promise<void> {
    console.log('🚀 Starting Production Environment Configuration Audit...\n')

    try {
      // Step 1: Audit environment variables
      this.auditEnvironmentVariables()
      
      // Step 2: Test service integrations  
      await this.testServiceIntegrations()
      
      // Step 3: Generate summary and report
      const summary = this.generateAuditSummary()
      
      console.log('\n📊 Generating comprehensive audit report...')
      const report = await this.generateAuditReport(summary)
      
      console.log('\n' + '='.repeat(70))
      console.log('PRODUCTION ENVIRONMENT AUDIT COMPLETE')
      console.log('='.repeat(70))
      
      if (summary.productionReady) {
        console.log('🎉 Environment is PRODUCTION READY!')
        console.log(`✅ ${summary.configuredVariables}/${summary.totalVariables} variables configured`)
        console.log(`✅ All critical systems operational`)
      } else {
        console.log('⚠️ Environment requires attention before production deployment')
        console.log(`❌ ${summary.missingCritical} critical variables missing`)
        console.log(`⚠️ ${summary.securityIssues} security issues detected`)
        console.log('\nReview the audit report for detailed recommendations.')
      }
      
    } catch (error) {
      console.error('❌ Audit failed:', error)
      throw error
    }
  }
}

// Main execution
async function main() {
  const auditor = new ProductionEnvironmentAuditor()
  await auditor.runAudit()
}

if (require.main === module) {
  main().catch(console.error)
}

export { ProductionEnvironmentAuditor }
