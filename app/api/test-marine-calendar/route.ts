import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/test-marine-calendar
 * Тестовый endpoint для проверки работы морского календаря
 */
export async function GET(request: NextRequest) {
  try {
    const testData = {
      message: "Marine Calendar API is working!",
      timestamp: new Date().toISOString(),
      testLunarPhases: [
        {
          id: 'test-1',
          date: new Date().toISOString(),
          type: 'FULL_MOON',
          angle: 180,
          illumination: 100,
          distanceKm: 384400,
          apparentDiameter: 0.52,
          fishingInfluence: {
            strength: 9,
            description: 'Полнолуние - пик активности рыбы!',
            fishActivity: 'VERY_HIGH',
            recommendedTackle: ['Троллинг', 'Спиннинг', 'Светящиеся приманки']
          }
        }
      ],
      upcomingEvents: {
        newMoons: [new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()],
        fullMoons: [new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
        quarters: []
      },
      metadata: {
        totalPhases: 1,
        calculatedAt: new Date(),
        includedInfluence: true,
        includedChinese: false
      }
    };

    return NextResponse.json(testData);
    
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json(
      { error: 'Test API error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
