import { NextResponse } from 'next/server';
import { testStreamChatConnection, streamChatHealthCheck } from '@/lib/config/stream-chat';

export async function GET() {
  try {
    console.log('🔍 Testing Stream Chat connection...');

    // Run comprehensive health check using production-ready system
    const healthCheck = await streamChatHealthCheck();
    const connectionTest = await testStreamChatConnection();
    
    // Determine overall status
    const isFullyOperational = healthCheck.status === 'healthy' && connectionTest.success;
    const status = isFullyOperational ? 200 : healthCheck.status === 'unhealthy' ? 503 : 200;
    
    return NextResponse.json({
      success: connectionTest.success,
      configured: connectionTest.apiKeyValid,
      environment: connectionTest.environment,
      status: healthCheck.status,
      message: connectionTest.message,
      healthChecks: healthCheck.checks,
      details: {
        configurationValid: healthCheck.checks.configurationValid,
        connectionEstablished: healthCheck.checks.connectionEstablished,
        authenticationWorking: healthCheck.checks.authenticationWorking,
        keyType: connectionTest.apiKeyValid ? 'production' : 'invalid'
      },
      timestamp: new Date().toISOString()
    }, { status });
    
  } catch (error) {
    console.error('❌ Stream Chat test connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
      configured: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
