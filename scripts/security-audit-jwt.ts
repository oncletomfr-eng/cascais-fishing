/**
 * JWT Security Audit & Secret Generator
 * Проверяет безопасность JWT secrets и генерирует secure secrets
 */

import crypto from 'crypto';

interface JWTSecurityAnalysis {
  secret: string;
  length: number;
  entropy: number;
  hasWeakPatterns: boolean;
  isDevelopmentSecret: boolean;
  recommendations: string[];
  securityScore: number; // 0-100
  isProductionReady: boolean;
}

class JWTSecurityAuditor {
  
  /**
   * Анализирует безопасность JWT secret
   */
  analyzeSecret(secret: string): JWTSecurityAnalysis {
    const analysis: JWTSecurityAnalysis = {
      secret: secret.slice(0, 10) + '...[HIDDEN]', // Не показываем полный secret
      length: secret.length,
      entropy: this.calculateEntropy(secret),
      hasWeakPatterns: this.hasWeakPatterns(secret),
      isDevelopmentSecret: this.isDevelopmentSecret(secret),
      recommendations: [],
      securityScore: 0,
      isProductionReady: false
    };

    // Анализ длины
    if (analysis.length < 32) {
      analysis.recommendations.push('🚨 CRITICAL: Secret слишком короткий (< 32 chars)');
    } else if (analysis.length < 64) {
      analysis.recommendations.push('⚠️  WARNING: Secret недостаточно длинный (рекомендуется >= 64 chars)');
    }

    // Анализ энтропии
    if (analysis.entropy < 4.0) {
      analysis.recommendations.push('🚨 CRITICAL: Низкая энтропия - secret предсказуем');
    } else if (analysis.entropy < 5.0) {
      analysis.recommendations.push('⚠️  WARNING: Средняя энтропия - рекомендуется улучшить');
    }

    // Слабые паттерны
    if (analysis.hasWeakPatterns) {
      analysis.recommendations.push('🚨 CRITICAL: Secret содержит слабые паттерны (repeating chars, common words)');
    }

    // Development secret
    if (analysis.isDevelopmentSecret) {
      analysis.recommendations.push('🚨 CRITICAL: Development secret НЕ ПОДХОДИТ для production');
    }

    // Вычисляем security score
    analysis.securityScore = this.calculateSecurityScore(analysis);
    analysis.isProductionReady = analysis.securityScore >= 80 && 
                                !analysis.isDevelopmentSecret && 
                                !analysis.hasWeakPatterns &&
                                analysis.length >= 32;

    return analysis;
  }

  private calculateEntropy(secret: string): number {
    const charCounts: { [key: string]: number } = {};
    
    // Подсчет частоты символов
    for (const char of secret) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }

    // Вычисление энтропии Шеннона
    let entropy = 0;
    for (const count of Object.values(charCounts)) {
      const probability = count / secret.length;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  private hasWeakPatterns(secret: string): boolean {
    const weakPatterns = [
      /(.)\1{3,}/, // 4+ повторяющихся символа
      /(012|123|234|345|456|567|678|789|890)/, // Последовательные числа
      /(abc|def|ghi|jkl|mno|pqr|stu|vwx|yz)/i, // Последовательные буквы
      /(password|secret|key|token|auth|admin|test|dev)/i, // Общие слова
      /^(.{1,4})\1+$/ // Простые повторения коротких паттернов
    ];

    return weakPatterns.some(pattern => pattern.test(secret));
  }

  private isDevelopmentSecret(secret: string): boolean {
    const devIndicators = [
      'development',
      'dev',
      'test',
      'demo',
      'localhost',
      'example',
      'sample',
      'default'
    ];

    return devIndicators.some(indicator => 
      secret.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private calculateSecurityScore(analysis: JWTSecurityAnalysis): number {
    let score = 0;

    // Длина (0-30 points)
    if (analysis.length >= 64) score += 30;
    else if (analysis.length >= 32) score += 20;
    else if (analysis.length >= 16) score += 10;

    // Энтропия (0-30 points)  
    if (analysis.entropy >= 5.5) score += 30;
    else if (analysis.entropy >= 5.0) score += 25;
    else if (analysis.entropy >= 4.5) score += 20;
    else if (analysis.entropy >= 4.0) score += 15;
    else if (analysis.entropy >= 3.0) score += 10;

    // Отсутствие слабых паттернов (0-20 points)
    if (!analysis.hasWeakPatterns) score += 20;

    // Не development secret (0-20 points)
    if (!analysis.isDevelopmentSecret) score += 20;

    return Math.min(100, score);
  }

  /**
   * Генерирует cryptographically secure JWT secret
   */
  generateSecureSecret(length: number = 64): string {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  /**
   * Генерирует human-friendly но secure secret
   */
  generateReadableSecret(): string {
    const adjectives = ['swift', 'secure', 'robust', 'stealth', 'quantum', 'cipher', 'vault', 'shield'];
    const nouns = ['falcon', 'guardian', 'fortress', 'phoenix', 'nexus', 'matrix', 'prism', 'beacon'];
    const symbols = '!@#$%^&*+=';
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 9000) + 1000; // 4-digit number
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    
    const baseSecret = `${randomAdjective}-${randomNoun}-${randomNumber}${randomSymbol}`;
    const randomSuffix = crypto.randomBytes(16).toString('hex');
    
    return `${baseSecret}-${randomSuffix}`;
  }
}

/**
 * Проверяет environment variables на наличие секретов
 */
function auditEnvironmentSecrets(): void {
  console.log('🔍 Environment Variables Security Audit...\n');

  const secretVars = [
    'AUTH_SECRET',
    'NEXTAUTH_SECRET', 
    'AUTH_GITHUB_SECRET',
    'AUTH_GOOGLE_SECRET',
    'STRIPE_SECRET_KEY',
    'STREAM_CHAT_API_SECRET'
  ];

  const auditor = new JWTSecurityAuditor();
  let overallSecure = true;

  secretVars.forEach(varName => {
    const value = process.env[varName];
    
    if (!value) {
      console.log(`❌ ${varName}: NOT SET`);
      overallSecure = false;
      return;
    }

    if (varName === 'AUTH_SECRET' || varName === 'NEXTAUTH_SECRET') {
      const analysis = auditor.analyzeSecret(value);
      
      console.log(`🔐 ${varName}:`);
      console.log(`   Length: ${analysis.length}`);
      console.log(`   Entropy: ${analysis.entropy.toFixed(2)}`);
      console.log(`   Security Score: ${analysis.securityScore}/100`);
      console.log(`   Production Ready: ${analysis.isProductionReady ? '✅' : '❌'}`);
      
      if (analysis.recommendations.length > 0) {
        console.log('   Recommendations:');
        analysis.recommendations.forEach(rec => console.log(`     ${rec}`));
        overallSecure = false;
      }
      console.log();
    } else {
      console.log(`🔑 ${varName}: SET (${value.length} chars)`);
    }
  });

  console.log(`\n🎯 Overall Security Status: ${overallSecure ? '✅ SECURE' : '❌ NEEDS IMPROVEMENT'}\n`);
}

// Main execution
if (require.main === module) {
  console.log('🛡️  JWT Security Audit & Secret Generator\n');

  // Audit current secrets
  auditEnvironmentSecrets();

  const auditor = new JWTSecurityAuditor();

  // Generate secure secrets
  console.log('🔐 Generated Secure Secrets for Production:\n');
  
  console.log('AUTH_SECRET (Hex):');
  console.log(`${auditor.generateSecureSecret(64)}\n`);
  
  console.log('AUTH_SECRET (Human-Readable):');
  console.log(`${auditor.generateReadableSecret()}\n`);

  // Test current secret if available
  const currentSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (currentSecret) {
    console.log('📊 Current Secret Analysis:');
    const analysis = auditor.analyzeSecret(currentSecret);
    console.log(`Security Score: ${analysis.securityScore}/100`);
    console.log(`Production Ready: ${analysis.isProductionReady ? '✅' : '❌'}`);
    
    if (analysis.recommendations.length > 0) {
      console.log('\n🚨 Security Issues Found:');
      analysis.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
  }
}

export { JWTSecurityAuditor, auditEnvironmentSecrets };
