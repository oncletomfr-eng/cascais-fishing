import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if Stream Chat API keys are configured
    const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
    const secretKey = process.env.STREAM_CHAT_API_SECRET;
    
    if (!apiKey || !secretKey) {
      return NextResponse.json({
        success: false,
        error: 'Stream Chat API keys not configured',
        configured: false
      }, { status: 503 });
    }
    
    // Check if keys are not demo/placeholder values
    const isDemoKey = apiKey === 'demo-key' || 
                      apiKey === 'demo-key-please-configure' || 
                      apiKey.length < 10;
    
    if (isDemoKey) {
      return NextResponse.json({
        success: false,
        error: 'Demo or invalid API key configured',
        configured: false,
        keyType: 'demo'
      }, { status: 503 });
    }
    
    // In a real implementation, we would test the connection to Stream Chat here
    // For now, we just verify the keys are properly formatted
    
    return NextResponse.json({
      success: true,
      configured: true,
      keyType: 'production',
      message: 'Stream Chat configuration appears valid',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Stream Chat test connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      configured: false
    }, { status: 500 });
  }
}
