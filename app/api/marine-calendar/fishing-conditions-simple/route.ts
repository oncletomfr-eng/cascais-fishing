import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const testConditions = [
      {
        date: new Date().toISOString(),
        overallRating: 8,
        lunarPhase: {
          type: 'FULL_MOON',
          illumination: 100,
          influence: {
            strength: 9,
            description: 'Полнолуние - отличные условия!'
          }
        },
        bestHours: [
          {
            start: new Date(new Date().setHours(6)).toISOString(),
            end: new Date(new Date().setHours(8)).toISOString(),
            description: 'Рассветная активность',
            rating: 9
          },
          {
            start: new Date(new Date().setHours(19)).toISOString(),
            end: new Date(new Date().setHours(21)).toISOString(),
            description: 'Вечерняя активность',
            rating: 8
          }
        ],
        speciesInfluence: [
          {
            species: 'TUNA',
            activity: 9,
            preferredDepth: '20-50м',
            bestLocations: ['Глубоководные каньоны'],
            recommendedBaits: ['Живая скумбрия', 'Крупные воблеры']
          },
          {
            species: 'DORADO',
            activity: 8,
            preferredDepth: '15-40м',
            bestLocations: ['Открытый океан'],
            recommendedBaits: ['Кальмар', 'Яркие воблеры']
          }
        ],
        recommendations: [
          'Полнолуние создает идеальные условия для ночной рыбалки',
          'Лучшие часы: раннее утро и поздний вечер',
          'Рекомендуется использовать светящиеся приманки'
        ],
        tidalInfluence: {
          type: 'HIGH_TIDE',
          height: 2.1,
          strength: 7,
          fishingImpact: 'POSITIVE'
        }
      }
    ];

    return NextResponse.json({
      conditions: testConditions,
      metadata: {
        totalRecords: 1,
        calculatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Simple fishing conditions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
