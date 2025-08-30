import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { realLunarService as lunarService } from '@/lib/services/real-lunar-service';
import { prisma } from '@/lib/prisma';

// Схема валидации параметров запроса
const QuerySchema = z.object({
  startDate: z.string().nullable().transform((str) => str ? new Date(str) : new Date()).optional(),
  endDate: z.string().nullable().transform((str) => str ? new Date(str) : new Date()).optional(),
  date: z.string().nullable().transform((str) => str ? new Date(str) : null).optional(),
  latitude: z.string().nullable().transform((str) => str ? parseFloat(str) : null).optional(),
  longitude: z.string().nullable().transform((str) => str ? parseFloat(str) : null).optional(),
  includeInfluence: z.string().nullable().transform((str) => str === 'true').optional().default(true),
  includeChinese: z.string().nullable().transform((str) => str === 'true').optional().default(true)
});

/**
 * GET /api/marine-calendar/lunar-phases
 * Получить лунные фазы для заданного периода
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Валидация параметров
    const params = QuerySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      date: searchParams.get('date'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
      includeInfluence: searchParams.get('includeInfluence') || 'true',
      includeChinese: searchParams.get('includeChinese') || 'true'
    });
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    let { startDate, endDate, date, latitude, longitude, includeInfluence, includeChinese } = params.data;
    
    // Если указан параметр date, используем его для одного дня
    if (date) {
      startDate = date;
      endDate = date;
    }
    
    // Проверка диапазона дат (максимум 90 дней)
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 90) {
      return NextResponse.json(
        { error: 'Максимальный период запроса - 90 дней' },
        { status: 400 }
      );
    }
    
    // Получение лунных фаз из базы данных (кэш)
    let lunarPhases = await prisma.lunarPhase.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });
    
    // Если данных в кэше нет, рассчитываем и сохраняем
    if (lunarPhases.length === 0) {
      console.log('Рассчитываем лунные фазы для периода:', startDate, '-', endDate);
      
      const calculatedPhases = await lunarService.getLunarPhases(startDate, endDate);
      
      // Сохраняем в базу данных
      const dbPhases = await Promise.all(
        calculatedPhases.map(async (phase) => {
          return prisma.lunarPhase.upsert({
            where: { date: phase.date },
            update: {
              type: phase.type,
              angle: phase.angle,
              illumination: phase.illumination,
              distanceKm: phase.distance,
              apparentDiameter: phase.apparentDiameter,
              chineseLunarData: includeChinese ? phase.chineseLunarData as any : null,
              fishingInfluence: includeInfluence ? phase.influence as any : null
            },
            create: {
              date: phase.date,
              type: phase.type,
              angle: phase.angle,
              illumination: phase.illumination,
              distanceKm: phase.distance,
              apparentDiameter: phase.apparentDiameter,
              chineseLunarData: includeChinese ? phase.chineseLunarData as any : null,
              fishingInfluence: includeInfluence ? phase.influence as any : null
            }
          });
        })
      );
      
      lunarPhases = dbPhases;
    }
    
    // Формирование ответа
    const response = {
      period: {
        startDate,
        endDate
      },
      location: latitude && longitude ? { latitude, longitude } : null,
      phases: lunarPhases.map(phase => ({
        id: phase.id,
        date: phase.date,
        type: phase.type,
        angle: phase.angle,
        illumination: phase.illumination,
        distanceKm: phase.distanceKm,
        apparentDiameter: phase.apparentDiameter,
        chineseLunarData: includeChinese ? phase.chineseLunarData : undefined,
        fishingInfluence: includeInfluence ? phase.fishingInfluence : undefined
      })),
      upcomingEvents: await lunarService.getUpcomingLunarEvents(),
      metadata: {
        totalPhases: lunarPhases.length,
        calculatedAt: new Date(),
        includedInfluence: includeInfluence,
        includedChinese: includeChinese
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Ошибка получения лунных фаз:', error);
    
    // В development режиме показываем подробности ошибки
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'Внутренняя ошибка сервера',
        details: isDevelopment ? error.message : undefined,
        stack: isDevelopment ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marine-calendar/lunar-phases
 * Пересчитать и обновить лунные фазы для заданного периода
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const bodySchema = z.object({
      startDate: z.string().transform((str) => new Date(str)),
      endDate: z.string().transform((str) => new Date(str)),
      forceRecalculate: z.boolean().optional().default(false)
    });
    
    const params = bodySchema.safeParse(body);
    
    if (!params.success) {
      return NextResponse.json(
        { error: 'Неверные параметры запроса', details: params.error.issues },
        { status: 400 }
      );
    }
    
    const { startDate, endDate, forceRecalculate } = params.data;
    
    // Проверка диапазона дат
    const daysDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDifference > 365) {
      return NextResponse.json(
        { error: 'Максимальный период для пересчета - 365 дней' },
        { status: 400 }
      );
    }
    
    if (forceRecalculate) {
      // Удаляем существующие данные
      await prisma.lunarPhase.deleteMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    }
    
    // Рассчитываем новые фазы
    const calculatedPhases = await lunarService.getLunarPhases(startDate, endDate);
    
    // Сохраняем в базу данных
    const savedPhases = await Promise.all(
      calculatedPhases.map(async (phase) => {
        return prisma.lunarPhase.upsert({
          where: { date: phase.date },
          update: {
            type: phase.type,
            angle: phase.angle,
            illumination: phase.illumination,
            distanceKm: phase.distance,
            apparentDiameter: phase.apparentDiameter,
            chineseLunarData: phase.chineseLunarData as any,
            fishingInfluence: phase.influence as any
          },
          create: {
            date: phase.date,
            type: phase.type,
            angle: phase.angle,
            illumination: phase.illumination,
            distanceKm: phase.distance,
            apparentDiameter: phase.apparentDiameter,
            chineseLunarData: phase.chineseLunarData as any,
            fishingInfluence: phase.influence as any
          }
        });
      })
    );
    
    return NextResponse.json({
      message: `Успешно обновлено ${savedPhases.length} лунных фаз`,
      period: { startDate, endDate },
      phasesCount: savedPhases.length,
      recalculated: true
    });
    
  } catch (error) {
    console.error('Ошибка пересчета лунных фаз:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
