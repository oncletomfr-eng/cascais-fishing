import { NextResponse } from 'next/server';
import { streamChatHealthCheck } from '@/lib/config/stream-chat';

/**
 * Stream Chat Health Check Endpoint
 * Task 22.1: Production API Key Setup
 * 
 * Provides comprehensive health monitoring for Stream Chat service:
 * - Configuration validation
 * - Connection status
 * - Authentication testing
 * - Performance monitoring
 */

export async function GET() {
  try {
    console.log('🏥 Running Stream Chat health check...');
    
    const startTime = Date.now();
    const healthCheck = await streamChatHealthCheck();
    const responseTime = Date.now() - startTime;
    
    // Determine HTTP status based on health
    let httpStatus = 200;
    if (healthCheck.status === 'unhealthy') {
      httpStatus = 503; // Service Unavailable
    } else if (healthCheck.status === 'degraded') {
      httpStatus = 200; // OK but with warnings
    }
    
    return NextResponse.json({
      service: 'stream-chat',
      status: healthCheck.status,
      checks: healthCheck.checks,
      message: healthCheck.message,
      performance: {
        responseTimeMs: responseTime,
        healthy: responseTime < 2000 // Consider healthy if response < 2s
      },
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        timestamp: healthCheck.timestamp.toISOString(),
        version: '1.0.0'
      },
      troubleshooting: generateTroubleshootingInfo(healthCheck)
    }, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': healthCheck.status
      }
    });
    
  } catch (error) {
    console.error('❌ Stream Chat health check failed:', error);
    
    return NextResponse.json({
      service: 'stream-chat',
      status: 'unhealthy',
      checks: {
        configurationValid: false,
        connectionEstablished: false,
        authenticationWorking: false
      },
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      performance: {
        responseTimeMs: 0,
        healthy: false
      },
      metadata: {
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      },
      error: error instanceof Error ? error.message : 'Health check execution failed'
    }, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': 'unhealthy'
      }
    });
  }
}

/**
 * Generate troubleshooting information based on health check results
 */
function generateTroubleshootingInfo(healthCheck: any) {
  const issues = [];
  const solutions = [];
  
  if (!healthCheck.checks.configurationValid) {
    issues.push('Configuration validation failed');
    solutions.push('Check NEXT_PUBLIC_STREAM_CHAT_API_KEY and STREAM_CHAT_API_SECRET environment variables');
    solutions.push('Ensure API keys are not demo/placeholder values');
    solutions.push('Verify API key format matches Stream Chat requirements');
  }
  
  if (!healthCheck.checks.connectionEstablished) {
    issues.push('Connection to Stream Chat API failed');
    solutions.push('Check network connectivity to Stream Chat servers');
    solutions.push('Verify API keys have proper permissions');
    solutions.push('Check if firewall is blocking outbound connections');
  }
  
  if (!healthCheck.checks.authenticationWorking) {
    issues.push('Authentication system not working');
    solutions.push('Verify STREAM_CHAT_API_SECRET is correct and has not expired');
    solutions.push('Check user token generation logic');
    solutions.push('Ensure server-side API calls have proper authentication');
  }
  
  // Provide general guidance if all checks pass
  if (healthCheck.status === 'healthy') {
    return {
      status: 'All systems operational',
      issues: [],
      solutions: [],
      recommendations: [
        'Monitor connection performance regularly',
        'Set up alerting for service degradation',
        'Keep API keys secure and rotate periodically'
      ]
    };
  }
  
  return {
    status: healthCheck.status,
    issues,
    solutions,
    recommendations: [
      'Review Stream Chat documentation for troubleshooting',
      'Check Stream Chat dashboard for service status',
      'Contact Stream Chat support if issues persist'
    ]
  };
}
