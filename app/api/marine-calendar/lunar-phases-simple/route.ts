import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { simpleLunarService } from '@/lib/services/simple-lunar-service';

const QuerySchema = z.object({
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str))
});

export async function GET(request: NextRequest) {
  try {
    console.log('Simple Lunar Phases API called');
    const { searchParams } = new URL(request.url);
    
    const params = QuerySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate')
    });
    
    if (!params.success) {
      console.log('Validation error:', params.error);
      return NextResponse.json(
        { error: 'Invalid parameters', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const { startDate, endDate } = params.data;
    console.log('Calculating lunar phases for:', startDate, '-', endDate);
    
    // Проверяем диапазон дат
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 90) {
      return NextResponse.json(
        { error: 'Maximum 90 days period' },
        { status: 400 }
      );
    }
    
    // Рассчитываем фазы
    console.log('Calling getLunarPhasesForPeriod...');
    const phases = await simpleLunarService.getLunarPhasesForPeriod(startDate, endDate);
    console.log('Got phases:', phases.length);
    
    // Получаем предстоящие события
    console.log('Getting upcoming events...');
    const upcomingEvents = await simpleLunarService.getUpcomingLunarEvents(startDate, daysDifference);
    console.log('Got events:', upcomingEvents);
    
    const response = {
      period: { startDate, endDate },
      phases: phases.map(phase => ({
        date: phase.dateTime,
        type: phase.type,
        nameRu: phase.nameRu,
        angle: phase.angle,
        illumination: phase.illumination,
        influence: simpleLunarService.calculateLunarInfluence(phase)
      })),
      upcomingEvents,
      metadata: {
        totalPhases: phases.length,
        calculatedAt: new Date()
      }
    };
    
    console.log('Returning response with', phases.length, 'phases');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Simple lunar phases API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
