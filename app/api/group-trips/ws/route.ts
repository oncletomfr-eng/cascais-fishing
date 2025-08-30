import { NextRequest } from 'next/server';
import type { WebSocket } from 'ws';
import { GroupTripUpdate, ClientMessage } from '@/lib/types/group-events';

// Глобальное хранилище WebSocket соединений с подписками на события
interface ClientSubscription {
  tripIds: Set<string>;
  eventTypes: Set<string>; // типы событий на которые подписан клиент
  filters: {
    weatherAlertsOnly?: boolean;
    biteReportsMinConfidence?: 'low' | 'medium' | 'high';
    routeChangesOnly?: boolean;
  };
}

const clients = new Map<WebSocket, ClientSubscription>();

// WebSocket handler function для next-ws
export function SOCKET(
  client: WebSocket,
  request: any,
  server: any
) {
  console.log('🔌 New WebSocket client connected');
  
  // Инициализируем структуру подписок для этого клиента
  clients.set(client, {
    tripIds: new Set(),
    eventTypes: new Set(['participant_joined', 'participant_left', 'status_changed', 'confirmed']), // базовые события по умолчанию
    filters: {}
  });
  
  // Heartbeat для поддержания соединения каждые 25 секунд
  const heartbeatInterval = setInterval(() => {
    if (client.readyState === client.OPEN) {
      client.ping();
      console.log('💓 Sending heartbeat ping');
    }
  }, 25000);
  
  // Обработка входящих сообщений
  client.on('message', async (data: Buffer) => {
    try {
      const messageText = data.toString();
      
      // Обработка heartbeat сообщений отдельно
      if (messageText === 'heartbeat' || messageText === 'ping') {
        client.send('pong');
        return;
      }

      const message: ClientMessage = JSON.parse(messageText);
      console.log('📨 Received message:', message.type);
      
      await handleClientMessage(client, message);
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      client.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });
  
  // Обработка pong ответов
  client.on('pong', () => {
    console.log('💓 Received heartbeat pong');
  });
  
  // Обработка закрытия соединения
  client.on('close', (code: number, reason: string) => {
    console.log(`🔌 Client disconnected: ${code} ${reason}`);
    clearInterval(heartbeatInterval);
    clients.delete(client);
  });
  
  // Обработка ошибок
  client.on('error', (error: Error) => {
    console.error('❌ WebSocket client error:', error);
    clearInterval(heartbeatInterval);
    clients.delete(client);
  });
  
  // Отправляем welcome сообщение
  client.send(JSON.stringify({
    type: 'connected',
    message: 'WebSocket connection established',
    timestamp: new Date().toISOString()
  }));
}

// Обработка сообщений от клиента
async function handleClientMessage(client: WebSocket, message: ClientMessage) {
  const subscription = clients.get(client);
  if (!subscription) return;
  
  switch (message.type) {
    case 'subscribe':
      if (message.tripIds && message.tripIds.length > 0) {
        message.tripIds.forEach(tripId => subscription.tripIds.add(tripId));
        
        console.log(`📡 Client subscribed to trips: ${message.tripIds.join(', ')}`);
        
        // Отправляем подтверждение подписки
        client.send(JSON.stringify({
          type: 'subscription_confirmed',
          tripIds: message.tripIds,
          timestamp: new Date().toISOString()
        }));
        
        // Отправляем текущее состояние подписанных поездок
        await sendCurrentTripStates(client, message.tripIds);
      }
      break;
      
    case 'unsubscribe':
      if (message.tripIds && message.tripIds.length > 0) {
        message.tripIds.forEach(tripId => subscription.tripIds.delete(tripId));
        
        console.log(`📡 Client unsubscribed from trips: ${message.tripIds.join(', ')}`);
        
        client.send(JSON.stringify({
          type: 'unsubscription_confirmed',
          tripIds: message.tripIds,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'subscribe_events':
      if (message.eventTypes && message.eventTypes.length > 0) {
        // Добавляем типы событий в подписку
        message.eventTypes.forEach(eventType => subscription.eventTypes.add(eventType));
        
        // Обновляем фильтры если переданы
        if (message.filters) {
          subscription.filters = { ...subscription.filters, ...message.filters };
        }
        
        console.log(`🎣 Client subscribed to event types: ${message.eventTypes.join(', ')}`);
        
        client.send(JSON.stringify({
          type: 'event_subscription_confirmed',
          eventTypes: message.eventTypes,
          filters: subscription.filters,
          timestamp: new Date().toISOString()
        }));
      }
      break;

    case 'unsubscribe_events':
      if (message.eventTypes && message.eventTypes.length > 0) {
        message.eventTypes.forEach(eventType => subscription.eventTypes.delete(eventType));
        
        console.log(`🎣 Client unsubscribed from event types: ${message.eventTypes.join(', ')}`);
        
        client.send(JSON.stringify({
          type: 'event_unsubscription_confirmed',
          eventTypes: message.eventTypes,
          timestamp: new Date().toISOString()
        }));
      }
      break;
      
    case 'heartbeat':
      // Ответ на heartbeat
      client.send(JSON.stringify({ 
        type: 'heartbeat_response', 
        timestamp: new Date().toISOString() 
      }));
      console.log('💓 Heartbeat response sent');
      break;
      
    default:
      console.warn('⚠️ Unknown message type:', message.type);
      client.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${message.type}`
      }));
  }
}

// Отправка текущего состояния поездок (с реальными данными из БД)
async function sendCurrentTripStates(client: WebSocket, tripIds: string[]) {
  try {
    console.log('📊 Sending current trip states for:', tripIds);
    
    // Импортируем prisma и типы
    const { prisma } = await import('@/lib/prisma');
    const { BookingStatus } = await import('@prisma/client');
    
    // Получаем реальные данные из базы данных
    const trips = await prisma.groupTrip.findMany({
      where: {
        id: { in: tripIds }
      },
      include: {
        bookings: {
          where: {
            status: {
              in: [BookingStatus.PENDING, BookingStatus.CONFIRMED]
            }
          }
        }
      }
    });
    
    // Преобразуем в формат обновлений
    const updates = trips.map(trip => {
      const currentParticipants = trip.bookings.reduce(
        (total, booking) => total + booking.participants,
        0
      );
      const spotsRemaining = trip.maxParticipants - currentParticipants;
      
      // Определяем статус для отображения
      let status: GroupTripUpdate['status'] = 'forming';
      if (trip.status === 'CONFIRMED' || currentParticipants >= trip.minRequired) {
        status = 'confirmed';
      } else if (spotsRemaining <= 2) {
        status = 'almost_full';
      }
      
      return {
        tripId: trip.id,
        type: 'status_changed' as const,
        currentParticipants,
        status,
        timestamp: new Date(),
        spotsRemaining,
        maxParticipants: trip.maxParticipants,
        // Добавляем имя последнего присоединившегося участника если есть
        participantName: trip.bookings.length > 0 
          ? trip.bookings[trip.bookings.length - 1].contactName 
          : undefined
      };
    });
    
    // Отправляем каждое обновление отдельно
    for (const update of updates) {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify(update));
        console.log(`📡 Sent real trip state: ${update.tripId} - ${update.status} (${update.currentParticipants}/${update.maxParticipants})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error sending trip states:', error);
    // В случае ошибки БД, отправляем базовое состояние
    tripIds.forEach(tripId => {
      if (client.readyState === client.OPEN) {
        client.send(JSON.stringify({
          tripId,
          type: 'status_changed' as const,
          currentParticipants: 0,
          status: 'forming' as const,
          timestamp: new Date(),
          spotsRemaining: 8,
          maxParticipants: 8
        }));
      }
    });
  }
}

// Публичная функция для broadcast обновлений (для использования в server actions)
export async function broadcastGroupTripUpdate(update: GroupTripUpdate) {
  console.log(`📡 Broadcasting update for trip ${update.tripId}: ${update.type}`);
  
  let sentCount = 0;
  clients.forEach((subscription, client) => {
    if (shouldSendUpdateToClient(subscription, update) && client.readyState === client.OPEN) {
      try {
        client.send(JSON.stringify(update));
        sentCount++;
        console.log(`📡 Sent ${update.type} update to client (trip: ${update.tripId})`);
      } catch (error) {
        console.error('❌ Error sending update to client:', error);
      }
    }
  });
  
  console.log(`📡 Update sent to ${sentCount} clients`);
  return sentCount;
}

// Функция для проверки должен ли клиент получить обновление
function shouldSendUpdateToClient(subscription: ClientSubscription, update: GroupTripUpdate): boolean {
  // Проверяем подписку на поездку
  if (!subscription.tripIds.has(update.tripId)) {
    return false;
  }
  
  // Проверяем подписку на тип события
  if (!subscription.eventTypes.has(update.type)) {
    return false;
  }
  
  // Применяем фильтры в зависимости от типа события
  switch (update.type) {
    case 'weather_changed':
      if (subscription.filters.weatherAlertsOnly && 
          (!update.weatherData || update.weatherData.alertLevel !== 'warning' && update.weatherData.alertLevel !== 'danger')) {
        return false;
      }
      break;
      
    case 'bite_report':
      if (subscription.filters.biteReportsMinConfidence && update.biteReport) {
        const confidenceLevel = { 'low': 1, 'medium': 2, 'high': 3 };
        const requiredLevel = confidenceLevel[subscription.filters.biteReportsMinConfidence];
        const reportLevel = confidenceLevel[update.biteReport.confidence];
        if (reportLevel < requiredLevel) {
          return false;
        }
      }
      break;
      
    case 'route_changed':
      if (subscription.filters.routeChangesOnly && update.type !== 'route_changed') {
        return false;
      }
      break;
  }
  
  return true;
}

// Функция для получения статистики соединений
export function getWebSocketStats() {
  const stats = {
    totalConnections: clients.size,
    totalTripSubscriptions: Array.from(clients.values()).reduce(
      (total, subscription) => total + subscription.tripIds.size,
      0
    ),
    totalEventSubscriptions: Array.from(clients.values()).reduce(
      (total, subscription) => total + subscription.eventTypes.size,
      0
    ),
    connections: Array.from(clients.entries()).map(([client, subscription]) => ({
      readyState: client.readyState,
      tripSubscriptions: Array.from(subscription.tripIds),
      eventSubscriptions: Array.from(subscription.eventTypes),
      filters: subscription.filters
    }))
  };
  
  console.log('📊 WebSocket Stats:', stats);
  return stats;
}

// 🌊 Функция для создания погодных событий
export async function createWeatherEvent(tripId: string) {
  const weatherConditions = ['excellent', 'good', 'fair', 'poor', 'dangerous'];
  const condition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)] as any;
  
  const update: GroupTripUpdate = {
    tripId,
    type: 'weather_changed',
    currentParticipants: Math.floor(Math.random() * 8),
    status: 'confirmed',
    timestamp: new Date(),
    spotsRemaining: Math.floor(Math.random() * 4),
    maxParticipants: 8,
    weatherData: {
      condition,
      windSpeed: Math.floor(Math.random() * 30) + 5, // 5-35 km/h
      waveHeight: Math.random() * 3 + 0.5, // 0.5-3.5 meters
      temperature: Math.floor(Math.random() * 10) + 15, // 15-25°C
      visibility: Math.floor(Math.random() * 20) + 5, // 5-25 km
      weatherScore: Math.floor(Math.random() * 10) + 1, // 1-10
      forecast: `Условия ${condition === 'excellent' ? 'отличные' : condition === 'good' ? 'хорошие' : condition === 'fair' ? 'удовлетворительные' : condition === 'poor' ? 'плохие' : 'опасные'} для рыбалки`,
      alertLevel: condition === 'dangerous' ? 'danger' : condition === 'poor' ? 'warning' : 'info',
      alertMessage: condition === 'dangerous' ? '⚠️ Опасные погодные условия! Рекомендуем отменить поездку.' :
                   condition === 'poor' ? '🌊 Неблагоприятные условия. Будьте осторожны.' :
                   '✅ Хорошие условия для рыбалки!'
    }
  };
  
  return await broadcastGroupTripUpdate(update);
}

// 🐟 Функция для создания отчетов о клёве
export async function createBiteReport(tripId: string) {
  const species = ['TUNA', 'DORADO', 'SEABASS', 'MACKEREL', 'SARDINE'];
  const techniques = ['TROLLING', 'JIGGING', 'BOTTOM_FISHING', 'SPINNING'];
  const confidence = ['low', 'medium', 'high'];
  
  const update: GroupTripUpdate = {
    tripId,
    type: 'bite_report',
    currentParticipants: Math.floor(Math.random() * 8),
    status: 'confirmed',
    timestamp: new Date(),
    spotsRemaining: Math.floor(Math.random() * 4),
    maxParticipants: 8,
    biteReport: {
      species: species[Math.floor(Math.random() * species.length)],
      size: Math.floor(Math.random() * 50) + 20, // 20-70 cm
      weight: Math.floor(Math.random() * 10) + 1, // 1-11 kg
      location: 'Cascais Deep Waters',
      technique: techniques[Math.floor(Math.random() * techniques.length)],
      baitUsed: 'Живая сардина',
      depth: Math.floor(Math.random() * 100) + 20, // 20-120 meters
      time: new Date(),
      reporterName: 'Captain João',
      confidence: confidence[Math.floor(Math.random() * confidence.length)] as any,
      photos: []
    }
  };
  
  return await broadcastGroupTripUpdate(update);
}

// 🗺️ Функция для создания изменения маршрута
export async function createRouteChange(tripId: string) {
  const locations = ['Cascais Deep Ridge', 'Sintra Rock Formation', 'Estoril Bay', 'Atlantic Dropoff'];
  const reasons = ['Лучшие условия для рыбалки', 'Избегаем плохую погоду', 'Следуем за косяком рыбы', 'Изменение течения'];
  
  const update: GroupTripUpdate = {
    tripId,
    type: 'route_changed',
    currentParticipants: Math.floor(Math.random() * 8),
    status: 'confirmed',
    timestamp: new Date(),
    spotsRemaining: Math.floor(Math.random() * 4),
    maxParticipants: 8,
    routeChange: {
      newLocation: locations[Math.floor(Math.random() * locations.length)],
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      estimatedArrival: new Date(Date.now() + Math.random() * 3600000), // в течение часа
      coordinates: {
        lat: 38.7223 + (Math.random() - 0.5) * 0.1, // около Cascais
        lng: -9.4215 + (Math.random() - 0.5) * 0.1
      },
      changedBy: 'Captain João',
      announcement: 'Меняем курс для лучших условий лова!'
    }
  };
  
  return await broadcastGroupTripUpdate(update);
}

// HTTP endpoint для тестирования (POST запросы)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 Test endpoint received:', body);
    
    let sentCount = 0;
    
    // Обрабатываем специальные команды для рыболовных событий
    if (body.command) {
      switch (body.command) {
        case 'weather_alert':
          sentCount = await createWeatherEvent(body.tripId || 'trip-1');
          return new Response(JSON.stringify({
            success: true,
            message: 'Weather alert sent',
            command: body.command,
            clientsSent: sentCount,
            stats: getWebSocketStats()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        case 'bite_report':
          sentCount = await createBiteReport(body.tripId || 'trip-1');
          return new Response(JSON.stringify({
            success: true,
            message: 'Bite report sent',
            command: body.command,
            clientsSent: sentCount,
            stats: getWebSocketStats()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
          
        case 'route_change':
          sentCount = await createRouteChange(body.tripId || 'trip-1');
          return new Response(JSON.stringify({
            success: true,
            message: 'Route change sent',
            command: body.command,
            clientsSent: sentCount,
            stats: getWebSocketStats()
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    }
    
    // Создаем стандартное тестовое обновление с FishingEvent данными
    const update: GroupTripUpdate = {
      tripId: body.tripId || 'trip-1',
      type: body.type || 'participant_joined',
      currentParticipants: body.currentParticipants || Math.floor(Math.random() * 7) + 1,
      status: body.status || 'forming',
      timestamp: new Date(),
      spotsRemaining: body.spotsRemaining || Math.floor(Math.random() * 4) + 1,
      maxParticipants: body.maxParticipants || 8,
      participantName: body.participantName || 'Test User',
      
      // 🎣 FISHING EVENT DATA from request body
      eventType: body.eventType,
      skillLevel: body.skillLevel,
      socialMode: body.socialMode,
      fishingTechniques: body.fishingTechniques,
      targetSpecies: body.targetSpecies,
      equipment: body.equipment,
      weatherDependency: body.weatherDependency,
      difficultyRating: body.difficultyRating,
      pricePerPerson: body.pricePerPerson
    };
    
    // Отправляем broadcast
    sentCount = await broadcastGroupTripUpdate(update);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test update broadcasted',
      update,
      clientsSent: sentCount,
      stats: getWebSocketStats()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET endpoint для получения статистики
export async function GET(request: NextRequest) {
  try {
    const stats = getWebSocketStats();
    
    return new Response(JSON.stringify({
      message: 'WebSocket server status',
      ...stats,
      endpoint: '/api/group-trips/ws',
      protocols: ['group-trips-v1']
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error getting WebSocket stats:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to get WebSocket stats'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}