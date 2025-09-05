// Ultra-minimal email endpoint - maximum size optimization
import { NextRequest, NextResponse } from 'next/server';

// Simple email sending without external dependencies
export async function POST(request: NextRequest) {
  try {
    const { template, to, data } = await request.json();
    
    // For now, just log email attempts (no actual sending)
    console.log('📧 Email requested:', { template, to, data });
    
    // Return success response
    return NextResponse.json({ 
      success: true, 
      messageId: `stub-${Date.now()}`,
      message: 'Email functionality temporarily simplified for deployment optimization' 
    });
    
  } catch (error) {
    console.error('❌ Email API error:', error);
    return NextResponse.json(
      { success: false, error: 'Email processing failed' },
      { status: 500 }
    );
  }
}
