import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const testEvents = [
      {
        species: 'TUNA',
        eventType: 'peak',
        date: new Date().toISOString(),
        probability: 0.85,
        location: { latitude: 38.6979, longitude: -9.4215 },
        direction: 'Север (к Скандинавии)',
        depth: 30,
        waterTemperature: 20,
        description: 'Пик активности тунца - отличное время для ловли',
        dataSource: 'Migration Service Calculation',
        confidence: 0.8
      },
      {
        species: 'DORADO',
        eventType: 'arrival',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        probability: 0.75,
        location: { latitude: 38.6979, longitude: -9.4215 },
        direction: 'Следует за течениями на север',
        depth: 25,
        waterTemperature: 22,
        description: 'Прибытие дорадо в регион',
        dataSource: 'Migration Service Calculation',
        confidence: 0.75
      },
      {
        species: 'SEABASS',
        eventType: 'departure',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        probability: 0.65,
        location: { latitude: 38.6979, longitude: -9.4215 },
        direction: 'В открытое море',
        depth: 15,
        waterTemperature: 18,
        description: 'Морской окунь возвращается в глубокие воды',
        dataSource: 'Migration Service Calculation',
        confidence: 0.7
      }
    ];

    return NextResponse.json({
      events: testEvents,
      metadata: {
        totalEvents: testEvents.length,
        uniqueSpecies: 3,
        calculatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Simple migration events API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
