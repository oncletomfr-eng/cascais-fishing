import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Test API - Step 1: Starting');
    
    const body = await request.json();
    console.log('🧪 Test API - Step 2: JSON parsed:', body);
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Test API working',
      receivedData: body
    });
    
    response.headers.set('X-Test-API-Version', 'debug-v1');
    console.log('🧪 Test API - Step 3: Response created');
    
    return response;
    
  } catch (error) {
    console.error('🧪 Test API - ERROR:', error);
    
    const errorResponse = NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'catch block'
    });
    
    errorResponse.headers.set('X-Test-API-Version', 'debug-v1');
    return errorResponse;
  }
}
