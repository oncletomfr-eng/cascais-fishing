import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Server-Sent Events endpoint для real-time уведомлений о достижениях
 * Task 21.1: Achievement Progress Tracking API - Real-time notifications
 */

// Храним активные SSE подключения
const activeConnections = new Map<string, { 
  controller: ReadableStreamDefaultController; 
  userId: string;
  lastHeartbeat: number;
}>();

// Cleanup старых подключений каждые 30 секунд
setInterval(() => {
  const now = Date.now();
  const staleTimeout = 60000; // 60 секунд
  
  for (const [connectionId, connection] of activeConnections.entries()) {
    if (now - connection.lastHeartbeat > staleTimeout) {
      try {
        connection.controller.close();
      } catch (error) {
        console.error('Error closing stale SSE connection:', error);
      }
      activeConnections.delete(connectionId);
      console.log(`🧹 Cleaned up stale SSE connection: ${connectionId}`);
    }
  }
}, 30000);

/**
 * GET /api/achievements/notifications?userId=xxx - Подключение к SSE потоку
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return new Response('User ID is required', { status: 400 });
  }

  // Проверяем существование пользователя
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true }
  });

  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔗 New SSE connection: ${connectionId} for user ${userId}`);

  // Создаем ReadableStream для SSE
  const stream = new ReadableStream({
    start(controller) {
      // Сохраняем подключение
      activeConnections.set(connectionId, {
        controller,
        userId,
        lastHeartbeat: Date.now()
      });

      // Отправляем приветственное сообщение
      const welcomeMessage = {
        type: 'connected',
        data: {
          connectionId,
          message: 'Achievement notifications connected',
          timestamp: new Date().toISOString()
        }
      };
      
      controller.enqueue(`data: ${JSON.stringify(welcomeMessage)}\n\n`);

      // Настраиваем heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = {
            type: 'heartbeat',
            data: {
              timestamp: new Date().toISOString()
            }
          };
          
          controller.enqueue(`data: ${JSON.stringify(heartbeat)}\n\n`);
          
          // Обновляем время последнего heartbeat
          const connection = activeConnections.get(connectionId);
          if (connection) {
            connection.lastHeartbeat = Date.now();
          }
        } catch (error) {
          console.error('Error sending heartbeat:', error);
          clearInterval(heartbeatInterval);
          activeConnections.delete(connectionId);
        }
      }, 30000); // Heartbeat каждые 30 секунд

      // Cleanup при закрытии соединения
      controller.enqueue(`data: ${JSON.stringify({
        type: 'setup_complete',
        data: { message: 'Listening for achievement updates' }
      })}\n\n`);
    },

    cancel() {
      console.log(`🔌 SSE connection closed: ${connectionId}`);
      activeConnections.delete(connectionId);
    }
  });

  // Возвращаем SSE response
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

/**
 * POST /api/achievements/notifications - Отправка уведомления конкретному пользователю
 * Используется внутренне для отправки уведомлений о достижениях
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, data } = body;

    if (!userId || !type || !data) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Находим активные подключения для пользователя
    const userConnections = Array.from(activeConnections.entries())
      .filter(([_, connection]) => connection.userId === userId);

    if (userConnections.length === 0) {
      console.log(`ℹ️ No active SSE connections for user ${userId}`);
      return new Response(JSON.stringify({ 
        success: true, 
        sent: 0,
        message: 'No active connections' 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Отправляем уведомление всем активным подключениям пользователя
    let sent = 0;
    const message = {
      type,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    };

    for (const [connectionId, connection] of userConnections) {
      try {
        connection.controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
        sent++;
        console.log(`📤 Sent ${type} notification to connection ${connectionId}`);
      } catch (error) {
        console.error(`❌ Error sending to connection ${connectionId}:`, error);
        // Удаляем неработающее подключение
        activeConnections.delete(connectionId);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      message: `Sent to ${sent} connections`
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error sending SSE notification:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

/**
 * Utility функция для отправки уведомления о достижении
 * Можно вызывать из других частей приложения
 */
export async function sendAchievementNotification(
  userId: string, 
  achievements: Array<{
    name: string;
    description?: string;
    icon: string;
    rarity: string;
    progressPercent?: number;
  }>
) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: 'achievement_unlocked',
        data: {
          achievements,
          totalUnlocked: achievements.length
        }
      })
    });

    const result = await response.json();
    console.log(`📢 Achievement notification result:`, result);
    return result;
  } catch (error) {
    console.error('❌ Error sending achievement notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Utility функция для отправки уведомления о прогрессе
 */
export async function sendProgressNotification(
  userId: string,
  progress: Array<{
    achievementName: string;
    currentProgress: number;
    maxProgress: number;
    progressPercent: number;
  }>
) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/achievements/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,
        type: 'achievement_progress',
        data: {
          progress
        }
      })
    });

    return await response.json();
  } catch (error) {
    console.error('❌ Error sending progress notification:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

// Экспортируем статистику подключений для мониторинга
export function getConnectionStats() {
  return {
    activeConnections: activeConnections.size,
    connectionsByUser: Array.from(activeConnections.values()).reduce((acc, connection) => {
      acc[connection.userId] = (acc[connection.userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
}
