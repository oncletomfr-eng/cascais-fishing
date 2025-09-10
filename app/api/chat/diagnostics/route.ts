import { NextRequest, NextResponse } from 'next/server';
import { 
  streamChatConfig,
  generateUserToken,
  createTemporaryTokenProvider,
  testStreamChatConnection
} from '../../../../lib/config/stream-chat';

// Phase 3 Enhanced diagnostic endpoint for Stream Chat configuration
export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      phase3_features: '✅ Phase 3 enhancements active',
      
      // Check environment variables presence
      apiKeyPresent: !!process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY,
      apiSecretPresent: !!process.env.STREAM_CHAT_API_SECRET,
      
      // API Key validation
      apiKeyValid: false,
      apiSecretValid: false,
      
      // Phase 3: Enhanced token generation test with retry mechanism
      tokenGenerationWorking: false,
      tokenGenerationError: null,
      tokenGenerationAttempts: 0,
      
      // Phase 3: Development fallback token test
      developmentFallbackWorking: false,
      developmentFallbackToken: null,
      
      // Phase 3: Temporary token provider test
      temporaryTokenProviderWorking: false,
      temporaryTokenProviderError: null,
      
      // Authentication test
      authenticationWorking: false,
      authenticationError: null,
      
      // Additional checks
      streamChatClientCreated: false,
      streamChatClientError: null,
      
      // Phase 3: Detailed health check
      healthCheckResult: null,
    };

    // Get API credentials
    const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
    const apiSecret = process.env.STREAM_CHAT_API_SECRET;

    // Basic validation of API key format
    if (apiKey && apiKey.length > 10 && !apiKey.includes('demo') && !apiKey.includes('test')) {
      diagnostics.apiKeyValid = true;
    }

    if (apiSecret && apiSecret.length > 20) {
      diagnostics.apiSecretValid = true;
    }

    // Phase 3: Test health check using the enhanced config
    try {
      const healthResult = await streamChatConfig.healthCheck();
      diagnostics.healthCheckResult = healthResult;
      
      if (healthResult.status === 'healthy') {
        diagnostics.streamChatClientCreated = true;
        diagnostics.authenticationWorking = healthResult.checks.authenticationWorking || false;
      }
    } catch (healthError) {
      diagnostics.streamChatClientError = healthError instanceof Error ? healthError.message : 'Health check failed';
    }

    // Phase 3: Test enhanced generateUserToken with retry mechanism
    try {
      const testUserId = `diagnostic-${Date.now()}`;
      const startTime = Date.now();
      
      const tokenResult = await generateUserToken(testUserId, {
        name: 'Phase 3 Diagnostic User',
        email: 'diagnostic@test.com',
        role: 'user'
      });
      
      const endTime = Date.now();
      
      if (tokenResult && tokenResult.token) {
        diagnostics.tokenGenerationWorking = true;
        diagnostics.tokenGenerationAttempts = 1; // Would be more if retries occurred
        
        // Check if this was a development fallback token
        if (tokenResult.isDevelopmentToken) {
          diagnostics.developmentFallbackWorking = true;
          diagnostics.developmentFallbackToken = tokenResult.token.substring(0, 20) + '...';
          console.log('✅ Phase 3: Development fallback token working');
        } else {
          console.log('✅ Phase 3: Regular Stream Chat token generation working');
        }
      }
      
    } catch (tokenError) {
      diagnostics.tokenGenerationError = tokenError instanceof Error ? tokenError.message : 'Unknown error';
      console.error('❌ Phase 3: Enhanced token generation failed:', tokenError);
    }

    // Phase 3: Test temporary token provider (development only)
    if (process.env.NODE_ENV === 'development') {
      try {
        const tempProvider = createTemporaryTokenProvider();
        const tempToken = await tempProvider('temp-test-user');
        
        if (tempToken && tempToken.startsWith('temp_token_')) {
          diagnostics.temporaryTokenProviderWorking = true;
          console.log('✅ Phase 3: Temporary token provider working');
        }
      } catch (tempError) {
        diagnostics.temporaryTokenProviderError = tempError instanceof Error ? tempError.message : 'Unknown error';
      }
    }

    // Determine overall status
    const overallStatus = diagnostics.apiKeyPresent && 
                         diagnostics.apiSecretPresent && 
                         diagnostics.apiKeyValid && 
                         diagnostics.apiSecretValid && 
                         diagnostics.tokenGenerationWorking && 
                         diagnostics.authenticationWorking;

    return NextResponse.json({
      success: true,
      overallStatus: overallStatus ? 'WORKING' : 'ISSUES_FOUND',
      diagnostics,
      recommendations: generateRecommendations(diagnostics)
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      diagnostics: null
    }, { status: 500 });
  }
}

function generateRecommendations(diagnostics: any): string[] {
  const recommendations: string[] = [];

  // Phase 3: Enhanced recommendations
  if (!diagnostics.apiKeyPresent) {
    recommendations.push('❌ Добавьте NEXT_PUBLIC_STREAM_CHAT_API_KEY в environment variables');
    if (diagnostics.environment === 'production') {
      recommendations.push('🔧 Для production: проверьте Vercel environment variables в dashboard');
    }
  }

  if (!diagnostics.apiSecretPresent) {
    recommendations.push('❌ Добавьте STREAM_CHAT_API_SECRET в environment variables');
    if (diagnostics.environment === 'production') {
      recommendations.push('🔧 Для production: проверьте Vercel environment variables в dashboard');
    }
  }

  if (!diagnostics.apiKeyValid) {
    recommendations.push('⚠️ API Key может быть некорректным или test/demo ключом');
  }

  if (!diagnostics.apiSecretValid) {
    recommendations.push('⚠️ API Secret слишком короткий или отсутствует');
  }

  // Phase 3: Enhanced token generation recommendations
  if (!diagnostics.tokenGenerationWorking && diagnostics.tokenGenerationError) {
    recommendations.push(`🔧 Phase 3 - Ошибка генерации токенов: ${diagnostics.tokenGenerationError}`);
    recommendations.push('🔄 Phase 3 включает retry механизм (3 попытки) и fallback токены в development');
  }

  // Phase 3: Development fallback recommendations
  if (diagnostics.environment === 'development' && diagnostics.developmentFallbackWorking) {
    recommendations.push('✅ Phase 3 - Development fallback токены работают! Stream Chat проблемы обходятся автоматически');
  }

  // Phase 3: Temporary token provider recommendations
  if (diagnostics.environment === 'development') {
    if (diagnostics.temporaryTokenProviderWorking) {
      recommendations.push('✅ Phase 3 - Временные токены для development работают');
    } else if (diagnostics.temporaryTokenProviderError) {
      recommendations.push(`⚠️ Phase 3 - Проблема с временными токенами: ${diagnostics.temporaryTokenProviderError}`);
    }
  }

  if (!diagnostics.authenticationWorking && diagnostics.authenticationError) {
    recommendations.push(`🔧 Ошибка аутентификации: ${diagnostics.authenticationError}`);
  }

  if (diagnostics.streamChatClientError) {
    recommendations.push(`🚨 Ошибка создания Stream Chat клиента: ${diagnostics.streamChatClientError}`);
  }

  // Phase 3: Health check recommendations
  if (diagnostics.healthCheckResult) {
    const health = diagnostics.healthCheckResult;
    if (health.status === 'healthy') {
      recommendations.push('✅ Phase 3 - Комплексная диагностика: все системы работают!');
    } else if (health.status === 'degraded') {
      recommendations.push('⚠️ Phase 3 - Некоторые системы работают с ограничениями');
    } else {
      recommendations.push('❌ Phase 3 - Система требует внимания');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Все проверки пройдены! Phase 3 улучшения активны и Stream Chat должен работать корректно.');
  }

  // Phase 3: Production vs Development specific guidance
  if (diagnostics.environment === 'production') {
    recommendations.push('📋 Production checklist: проверьте Vercel environment variables, убедитесь что API keys не являются demo ключами');
  } else {
    recommendations.push('🧪 Development: Phase 3 fallback системы активны для отладки проблем');
  }

  return recommendations;
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
