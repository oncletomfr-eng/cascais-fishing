import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return mock data to test if API routing works
    return NextResponse.json({
      success: true,
      message: 'Test Group Trips API endpoint working',
      data: {
        trips: [],
        pagination: {
          total: 0,
          limit: 10,
          offset: 0,
          hasMore: false
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
