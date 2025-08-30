import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// POST /api/courses/enroll - записаться на курс
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { courseId } = body;

    // Валидация
    if (!courseId) {
      return NextResponse.json(
        { error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверяем, существует ли курс
    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (!course.published) {
      return NextResponse.json({ error: 'Course is not published' }, { status: 400 });
    }

    // Проверяем, не записан ли уже пользователь
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId
        }
      }
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'User already enrolled in this course' },
        { status: 409 }
      );
    }

    // Создаем запись на курс
    const enrollment = await prisma.courseEnrollment.create({
      data: {
        userId: user.id,
        courseId: courseId,
        status: 'ENROLLED',
        enrolledAt: new Date()
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            duration: true
          }
        }
      }
    });

    console.log('✅ Course enrollment created:', {
      enrollmentId: enrollment.id,
      userId: user.id,
      courseId: courseId,
      courseTitle: enrollment.course.title
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        progress: enrollment.progress,
        enrolledAt: enrollment.enrolledAt,
        course: enrollment.course
      }
    });

  } catch (error) {
    console.error('❌ Course enrollment error:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    );
  }
}

// GET /api/courses/enroll - получить записи пользователя на курсы
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ENROLLED, IN_PROGRESS, COMPLETED, DROPPED

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Фильтры для запроса
    const whereCondition: any = {
      userId: user.id
    };

    if (status) whereCondition.status = status;

    // Получаем записи на курсы
    const enrollments = await prisma.courseEnrollment.findMany({
      where: whereCondition,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            difficulty: true,
            duration: true,
            price: true
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true,
      enrollments,
      total: enrollments.length
    });

  } catch (error) {
    console.error('❌ Course enrollments GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
      { status: 500 }
    );
  }
}

// PUT /api/courses/enroll - обновить прогресс курса
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      enrollmentId, 
      courseId, 
      progress, 
      status, 
      score,
      completed = false 
    } = body;

    // Валидация
    if (!enrollmentId && !courseId) {
      return NextResponse.json(
        { error: 'Enrollment ID or Course ID is required' },
        { status: 400 }
      );
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Формируем данные для обновления
    const updateData: any = {};
    
    if (progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, progress));
      
      if (updateData.progress === 0 && !updateData.startedAt) {
        updateData.startedAt = new Date();
        updateData.status = 'IN_PROGRESS';
      }
    }
    
    if (status) updateData.status = status;
    if (score !== undefined) updateData.score = score;
    
    if (completed || (progress && progress >= 100) || status === 'COMPLETED') {
      updateData.status = 'COMPLETED';
      updateData.progress = 100;
      updateData.completedAt = new Date();
    }

    // Условие для поиска записи
    const whereCondition = enrollmentId 
      ? { id: enrollmentId, userId: user.id }
      : { userId_courseId: { userId: user.id, courseId } };

    // Обновляем запись
    const enrollment = await prisma.courseEnrollment.update({
      where: whereCondition,
      data: updateData,
      include: {
        course: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
      }
    });

    console.log('✅ Course progress updated:', {
      enrollmentId: enrollment.id,
      courseTitle: enrollment.course.title,
      progress: enrollment.progress,
      status: enrollment.status,
      completed: enrollment.completedAt !== null
    });

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        progress: enrollment.progress,
        status: enrollment.status,
        score: enrollment.score,
        completedAt: enrollment.completedAt,
        course: enrollment.course
      }
    });

  } catch (error) {
    console.error('❌ Course progress update error:', error);
    return NextResponse.json(
      { error: 'Failed to update course progress' },
      { status: 500 }
    );
  }
}
