import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// GET /api/courses - получить доступные курсы
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category'); 
    const difficulty = searchParams.get('difficulty');
    const published = searchParams.get('published');

    // Фильтры для запроса
    const whereCondition: any = {};
    
    if (category) whereCondition.category = category;
    if (difficulty) whereCondition.difficulty = difficulty;
    if (published !== null) whereCondition.published = published === 'true';

    // Получаем курсы
    const courses = await prisma.course.findMany({
      where: whereCondition,
      include: {
        enrollments: {
          select: {
            id: true,
            status: true,
            progress: true,
            completedAt: true
          }
        },
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: [
        { published: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Добавляем статистику
    const coursesWithStats = courses.map(course => ({
      ...course,
      enrollmentCount: course._count.enrollments,
      completionRate: course.enrollments.length > 0 
        ? (course.enrollments.filter(e => e.status === 'COMPLETED').length / course.enrollments.length) * 100
        : 0
    }));

    return NextResponse.json({ 
      success: true,
      courses: coursesWithStats,
      total: coursesWithStats.length
    });

  } catch (error) {
    console.error('❌ Courses GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}

// POST /api/courses - создать новый курс (только для админов)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Проверяем права администратора
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      price,
      content,
      duration,
      difficulty = 'BEGINNER',
      published = false
    } = body;

    // Валидация
    if (!title || !category || !price) {
      return NextResponse.json(
        { error: 'Title, category and price are required' },
        { status: 400 }
      );
    }

    // Создаем курс
    const course = await prisma.course.create({
      data: {
        title,
        description,
        category,
        price: Math.round(price * 100), // конвертируем в центы
        content,
        duration,
        difficulty,
        published,
        metadata: {
          created_by: user.id,
          created_via: 'api'
        }
      }
    });

    console.log('✅ Course created:', {
      courseId: course.id,
      title: course.title,
      category: course.category,
      price: course.price,
      published: course.published
    });

    return NextResponse.json({
      success: true,
      course: {
        id: course.id,
        title: course.title,
        category: course.category,
        price: course.price,
        difficulty: course.difficulty,
        published: course.published
      }
    });

  } catch (error) {
    console.error('❌ Course POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}
