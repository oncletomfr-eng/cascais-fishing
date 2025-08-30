import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Интерфейс для отчета об ошибке
interface ErrorReport {
  id: string;
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  errorInfo: {
    componentStack: string;
  };
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
  level: 'page' | 'component' | 'critical';
  boundaryName?: string;
  userFeedback?: string;
}

// Валидация отчета об ошибке
function validateErrorReport(data: any): data is ErrorReport {
  return (
    typeof data.id === 'string' &&
    typeof data.error === 'object' &&
    typeof data.error.name === 'string' &&
    typeof data.error.message === 'string' &&
    typeof data.errorInfo === 'object' &&
    typeof data.errorInfo.componentStack === 'string' &&
    typeof data.timestamp === 'string' &&
    typeof data.userAgent === 'string' &&
    typeof data.url === 'string' &&
    ['page', 'component', 'critical'].includes(data.level)
  );
}

// Логирование в файловую систему (для development)
async function logErrorToFile(errorReport: ErrorReport) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const logsDir = path.join(process.cwd(), 'logs');
    const logFile = path.join(logsDir, `errors-${new Date().toISOString().split('T')[0]}.log`);
    
    // Создаем директорию если не существует
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      ...errorReport,
    };

    await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    console.error('Failed to log error to file:', error);
  }
}

// Отправка в внешнюю систему мониторинга
async function reportToMonitoringSystem(errorReport: ErrorReport) {
  // В production здесь должна быть интеграция с системами типа:
  // - Sentry
  // - LogRocket  
  // - Bugsnag
  // - DataDog
  // - Собственная система логирования

  // Пример интеграции с Sentry (закомментировано)
  /*
  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import('@sentry/nextjs');
      
      Sentry.withScope((scope) => {
        scope.setTag('errorBoundary', true);
        scope.setTag('level', errorReport.level);
        scope.setTag('boundaryName', errorReport.boundaryName || 'unknown');
        scope.setContext('errorInfo', errorReport.errorInfo);
        scope.setContext('userReport', {
          id: errorReport.id,
          userAgent: errorReport.userAgent,
          url: errorReport.url,
          userFeedback: errorReport.userFeedback,
        });

        const error = new Error(errorReport.error.message);
        error.name = errorReport.error.name;
        error.stack = errorReport.error.stack;

        Sentry.captureException(error);
      });
    } catch (error) {
      console.error('Failed to report to Sentry:', error);
    }
  }
  */

  console.log('📊 Error report would be sent to monitoring system:', {
    id: errorReport.id,
    level: errorReport.level,
    boundary: errorReport.boundaryName,
    url: errorReport.url,
  });
}

// Сохранение в базу данных (опционально)
async function saveErrorToDatabase(errorReport: ErrorReport) {
  try {
    // Создаем упрощенную запись в БД для статистики
    // В реальном проекте может быть отдельная таблица для ошибок
    console.log('💾 Error report would be saved to database:', {
      id: errorReport.id,
      level: errorReport.level,
      errorName: errorReport.error.name,
      errorMessage: errorReport.error.message,
      boundaryName: errorReport.boundaryName,
      url: errorReport.url,
      timestamp: errorReport.timestamp,
    });
    
    // Пример сохранения (закомментировано, так как нет таблицы errors)
    /*
    await prisma.errorReport.create({
      data: {
        id: errorReport.id,
        errorName: errorReport.error.name,
        errorMessage: errorReport.error.message,
        errorStack: errorReport.error.stack,
        componentStack: errorReport.errorInfo.componentStack,
        level: errorReport.level,
        boundaryName: errorReport.boundaryName,
        url: errorReport.url,
        userAgent: errorReport.userAgent,
        userFeedback: errorReport.userFeedback,
        timestamp: new Date(errorReport.timestamp),
      },
    });
    */
  } catch (error) {
    console.error('Failed to save error to database:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Валидируем данные
    if (!validateErrorReport(body)) {
      return NextResponse.json(
        { success: false, error: 'Invalid error report format' },
        { status: 400 }
      );
    }

    const errorReport: ErrorReport = body;

    // Получаем IP и другую метаинформацию
    const ip = request.ip || 
               request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    // Обогащаем отчет дополнительной информацией
    const enrichedReport = {
      ...errorReport,
      ip,
      receivedAt: new Date().toISOString(),
      headers: {
        userAgent: request.headers.get('user-agent') || errorReport.userAgent,
        referer: request.headers.get('referer'),
        acceptLanguage: request.headers.get('accept-language'),
      },
    };

    // Логируем в консоль для разработки
    console.group(`🚨 Error Report Received [${errorReport.level.toUpperCase()}]`);
    console.log('ID:', errorReport.id);
    console.log('Boundary:', errorReport.boundaryName || 'Unknown');
    console.log('Error:', errorReport.error.name, '-', errorReport.error.message);
    console.log('URL:', errorReport.url);
    console.log('User Agent:', errorReport.userAgent);
    console.log('IP:', ip);
    if (errorReport.userFeedback) {
      console.log('User Feedback:', errorReport.userFeedback);
    }
    console.groupEnd();

    // Обрабатываем отчет параллельно
    await Promise.allSettled([
      logErrorToFile(enrichedReport),
      reportToMonitoringSystem(enrichedReport),
      saveErrorToDatabase(enrichedReport),
    ]);

    return NextResponse.json({ 
      success: true, 
      id: errorReport.id,
      message: 'Error report received and processed'
    });

  } catch (error) {
    console.error('Error processing error report:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process error report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Опционально: GET endpoint для получения статистики ошибок (для admin панели)
export async function GET(request: NextRequest) {
  try {
    // Простая статистика для демонстрации
    // В реальном проекте здесь была бы авторизация и полноценная статистика
    
    const stats = {
      message: 'Error reporting system is active',
      endpoints: {
        POST: 'Submit error report',
        GET: 'Get error statistics (development only)',
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get error statistics' },
      { status: 500 }
    );
  }
}
