import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { withCache, CachePresets } from '@/lib/cache/api-cache';

// GET - получить записи дневника и статистику
async function handleGetFishingDiary(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Получаем записи дневника
    const entries = await prisma.fishingDiaryEntry.findMany({
      where: {
        userId
      },
      include: {
        fishCaught: true,
        media: true
      },
      orderBy: {
        date: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Получаем статистику
    const totalEntries = await prisma.fishingDiaryEntry.count({
      where: { userId }
    });

    const fishCaughtStats = await prisma.diaryFishCatch.aggregate({
      where: {
        entry: {
          userId
        }
      },
      _sum: {
        quantity: true,
        weight: true
      }
    });

    // Статистика по видам рыб
    const speciesStats = await prisma.diaryFishCatch.groupBy({
      by: ['species'],
      where: {
        entry: {
          userId
        }
      },
      _count: {
        species: true
      },
      orderBy: {
        _count: {
          species: 'desc'
        }
      }
    });

    // Статистика по месяцам (последние 12 месяцев) - БЕЗОПАСНЫЙ ПАРАМЕТРИЗОВАННЫЙ ЗАПРОС
    const monthlyStats = await prisma.$queryRaw<Array<{
      month: string;
      catches: number;
    }>>`
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        COUNT(*)::integer as catches
      FROM fishing_diary_entries 
      WHERE user_id = ${userId}::uuid
        AND date >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;

    // Лучшее место (по количеству записей)
    const bestSpot = await prisma.fishingDiaryEntry.groupBy({
      by: ['locationName'],
      where: {
        userId,
        locationName: {
          not: null
        }
      },
      _count: {
        locationName: true
      },
      orderBy: {
        _count: {
          locationName: 'desc'
        }
      },
      take: 1
    });

    const statistics = {
      totalEntries,
      totalFish: fishCaughtStats._sum.quantity || 0,
      totalWeight: fishCaughtStats._sum.weight || 0,
      favoriteSpecies: speciesStats[0]?.species || null,
      bestSpot: bestSpot[0]?.locationName || null,
      monthlyStats: monthlyStats.reverse(), // Показываем от старых к новым
      speciesDistribution: speciesStats.map(stat => ({
        species: stat.species,
        count: stat._count.species
      }))
    };

    return NextResponse.json({
      entries,
      statistics,
      pagination: {
        page,
        limit,
        total: totalEntries,
        pages: Math.ceil(totalEntries / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching fishing diary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fishing diary' },
      { status: 500 }
    );
  }
}

// POST - создать новую запись в дневнике
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {

    const formData = await req.formData();
    const entryDataStr = formData.get('entry') as string;
    
    if (!entryDataStr) {
      return NextResponse.json({ error: 'Entry data is required' }, { status: 400 });
    }

    const entryData = JSON.parse(entryDataStr);
    const userId = session.user.id;

    // Создаем папку для загрузки файлов, если её нет
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'fishing-diary', userId);
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Папка уже существует
    }

    // Обрабатываем медиа файлы
    const mediaFiles = [];
    const mediaEntries = [];

    // Получаем все файлы из formData
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('media_') && value instanceof File) {
        const index = key.split('_')[1];
        const file = value as File;
        
        // Генерируем уникальное имя файла
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = join(uploadDir, fileName);
        
        // Сохраняем файл
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);
        
        // Получаем EXIF данные если есть
        const exifKey = `exif_${index}`;
        const exifDataStr = formData.get(exifKey) as string;
        const exifData = exifDataStr ? JSON.parse(exifDataStr) : null;

        const mediaEntry = {
          fileName,
          fileUrl: `/uploads/fishing-diary/${userId}/${fileName}`,
          fileSize: file.size,
          mimeType: file.type,
          mediaType: (file.type.startsWith('image/') ? 'PHOTO' : 
                    file.type.startsWith('video/') ? 'VIDEO' : 'AUDIO') as any,
          exifData: exifData?.allExif || null,
          gpsLatitude: exifData?.gpsLatitude || null,
          gpsLongitude: exifData?.gpsLongitude || null,
          captureTime: exifData?.captureTime ? new Date(exifData.captureTime) : null,
          cameraModel: exifData?.cameraModel || null,
          lensModel: exifData?.lensModel || null,
          isPublic: true
        };

        mediaEntries.push(mediaEntry);
      }
    }

    // Создаем запись в дневнике
    const diaryEntry = await prisma.fishingDiaryEntry.create({
      data: {
        userId,
        title: entryData.title,
        description: entryData.description,
        date: new Date(entryData.date),
        locationName: entryData.locationName,
        latitude: entryData.latitude,
        longitude: entryData.longitude,
        accuracy: entryData.accuracy,
        weather: entryData.weather,
        temperature: entryData.temperature,
        windSpeed: entryData.windSpeed,
        windDirection: entryData.windDirection,
        totalWeight: entryData.totalWeight,
        totalCount: entryData.totalCount || 0,
        rodType: entryData.rodType,
        reelType: entryData.reelType,
        lineType: entryData.lineType,
        baitUsed: entryData.baitUsed || [],
        lureColor: entryData.lureColor,
        tags: entryData.tags || [],
        isPrivate: entryData.isPrivate || false,
        rating: entryData.rating,
        
        // Создаем записи об улове
        fishCaught: {
          create: (entryData.fishCaught || []).map((fish: any) => ({
            species: fish.species,
            weight: fish.weight,
            length: fish.length,
            quantity: fish.quantity || 1,
            timeOfCatch: fish.timeOfCatch ? new Date(fish.timeOfCatch) : null,
            depth: fish.depth,
            method: fish.method,
            baitUsed: fish.baitUsed,
            wasReleased: fish.wasReleased || false,
            notes: fish.notes
          }))
        },
        
        // Создаем записи о медиа
        media: {
          create: mediaEntries
        }
      },
      include: {
        fishCaught: true,
        media: true
      }
    });

    return NextResponse.json({
      success: true,
      entry: diaryEntry
    });

  } catch (error) {
    console.error('Error creating fishing diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to create fishing diary entry' },
      { status: 500 }
    );
  }
}

// PUT - обновить запись в дневнике
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const body = await req.json();
    const userId = session.user.id;

    // Проверяем, что запись принадлежит пользователю
    const existingEntry = await prisma.fishingDiaryEntry.findFirst({
      where: {
        id: entryId,
        userId
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Обновляем запись
    const updatedEntry = await prisma.fishingDiaryEntry.update({
      where: {
        id: entryId
      },
      data: {
        title: body.title,
        description: body.description,
        date: body.date ? new Date(body.date) : undefined,
        locationName: body.locationName,
        latitude: body.latitude,
        longitude: body.longitude,
        accuracy: body.accuracy,
        weather: body.weather,
        temperature: body.temperature,
        windSpeed: body.windSpeed,
        windDirection: body.windDirection,
        totalWeight: body.totalWeight,
        totalCount: body.totalCount,
        rodType: body.rodType,
        reelType: body.reelType,
        lineType: body.lineType,
        baitUsed: body.baitUsed,
        lureColor: body.lureColor,
        tags: body.tags,
        isPrivate: body.isPrivate,
        rating: body.rating
      },
      include: {
        fishCaught: true,
        media: true
      }
    });

    return NextResponse.json({
      success: true,
      entry: updatedEntry
    });

  } catch (error) {
    console.error('Error updating fishing diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to update fishing diary entry' },
      { status: 500 }
    );
  }
}

// DELETE - удалить запись из дневника
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {

    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get('id');
    
    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 });
    }

    const userId = session.user.id;

    // Проверяем, что запись принадлежит пользователю
    const existingEntry = await prisma.fishingDiaryEntry.findFirst({
      where: {
        id: entryId,
        userId
      },
      include: {
        media: true
      }
    });

    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Удаляем файлы медиа (если они есть)
    if (existingEntry.media && existingEntry.media.length > 0) {
      const deleteFilePromises = existingEntry.media.map(async (mediaFile) => {
        try {
          // Получаем путь к файлу из URL
          const fileName = mediaFile.fileName;
          const filePath = join(process.cwd(), 'public', 'uploads', 'diary', fileName);
          
          await unlink(filePath);
          console.log(`🗑️ Удален файл: ${fileName}`);
        } catch (error) {
          console.error(`❌ Ошибка удаления файла ${mediaFile.fileName}:`, error);
          // Не прерываем выполнение если файл не найден или не удален
        }
      });
      
      // Ждем удаления всех файлов
      await Promise.allSettled(deleteFilePromises);
    }

    // Удаляем запись (каскадно удалятся связанные записи)
    await prisma.fishingDiaryEntry.delete({
      where: {
        id: entryId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting fishing diary entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete fishing diary entry' },
      { status: 500 }
    );
  }
}

// Apply caching to GET requests for user-specific fishing diary data
export const GET = withCache(handleGetFishingDiary, CachePresets.USER_DATA);
