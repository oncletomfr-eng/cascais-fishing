import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Test endpoint для проверки Sentry integration
export async function GET(request: NextRequest) {
  try {
    const testType = request.nextUrl.searchParams.get('type') || 'error';

    switch (testType) {
      case 'error':
        // Simulate a standard error
        throw new Error('Test error from Sentry API endpoint');

      case 'warning':
        // Capture a warning
        Sentry.captureMessage('Test warning message from API', 'warning');
        return NextResponse.json({
          success: true,
          message: 'Warning sent to Sentry',
          type: 'warning'
        });

      case 'info':
        // Capture info message
        Sentry.captureMessage('Test info message from API', 'info');
        return NextResponse.json({
          success: true,
          message: 'Info message sent to Sentry',
          type: 'info'
        });

      case 'custom':
        // Test custom error with context
        Sentry.withScope((scope) => {
          scope.setTag('testType', 'custom');
          scope.setContext('testContext', {
            endpoint: '/api/test-sentry',
            timestamp: new Date().toISOString(),
            userAgent: request.headers.get('user-agent'),
            ip: request.ip || 'unknown'
          });
          
          const customError = new Error('Custom test error with rich context');
          customError.name = 'CascaisFishingTestError';
          
          Sentry.captureException(customError);
        });

        return NextResponse.json({
          success: true,
          message: 'Custom error with context sent to Sentry',
          type: 'custom'
        });

      case 'performance':
        // Test performance monitoring
        const transaction = Sentry.startTransaction({
          name: 'test-performance',
          op: 'api.test'
        });

        Sentry.getCurrentHub().configureScope(scope => scope.setSpan(transaction));

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 100));
        
        transaction.finish();

        return NextResponse.json({
          success: true,
          message: 'Performance transaction sent to Sentry',
          type: 'performance'
        });

      default:
        return NextResponse.json({
          error: 'Invalid test type',
          availableTypes: ['error', 'warning', 'info', 'custom', 'performance']
        }, { status: 400 });
    }

  } catch (error) {
    // This error will be automatically captured by Sentry
    console.error('Test error occurred:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test completed - error should appear in Sentry',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test error with user context
    Sentry.withScope((scope) => {
      scope.setUser({
        id: body.userId || 'test-user',
        email: body.email,
        username: body.username
      });
      
      scope.setContext('postData', {
        bodySize: JSON.stringify(body).length,
        timestamp: new Date().toISOString(),
        endpoint: '/api/test-sentry'
      });

      throw new Error(`Test POST error with user context: ${body.message || 'No message provided'}`);
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'POST test error captured',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
