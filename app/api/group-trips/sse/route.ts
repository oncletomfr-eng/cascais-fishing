import { NextRequest } from 'next/server';
import { GroupTripUpdate } from '@/lib/types/group-events';

// Global storage for SSE connections with subscriptions
interface ClientSubscription {
  tripIds: Set<string>;
  eventTypes: Set<string>;
  filters: {
    weatherAlertsOnly?: boolean;
    biteReportsMinConfidence?: 'low' | 'medium' | 'high';
    routeChangesOnly?: boolean;
  };
}

// Map to store SSE connections
const sseClients = new Map<string, {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  subscription: ClientSubscription;
}>();

// Helper to generate unique client ID
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// SSE endpoint for real-time group trip updates  
export async function GET(request: NextRequest) {
  console.log('🔴 New SSE connection request');

  // Generate unique client ID
  const clientId = generateClientId();

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Store client connection
      sseClients.set(clientId, {
        controller,
        encoder,
        subscription: {
          tripIds: new Set(),
          eventTypes: new Set(['participant_joined', 'participant_left', 'status_changed', 'confirmed']),
          filters: {}
        }
      });

      // Send initial connection event
      const connectMessage = {
        id: `msg_${Date.now()}`,
        event: 'connected',
        data: JSON.stringify({
          type: 'connected',
          clientId,
          message: 'SSE connection established',
          timestamp: new Date().toISOString()
        })
      };

      controller.enqueue(encoder.encode(`id: ${connectMessage.id}\n`));
      controller.enqueue(encoder.encode(`event: ${connectMessage.event}\n`));
      controller.enqueue(encoder.encode(`data: ${connectMessage.data}\n\n`));
      
      console.log(`🔴 SSE client connected: ${clientId}`);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`🔴 SSE client disconnected: ${clientId}`);
        sseClients.delete(clientId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          if (!sseClients.has(clientId)) {
            clearInterval(heartbeatInterval);
            return;
          }

          const heartbeatMessage = {
            id: `heartbeat_${Date.now()}`,
            event: 'heartbeat',
            data: JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })
          };

          controller.enqueue(encoder.encode(`id: ${heartbeatMessage.id}\n`));
          controller.enqueue(encoder.encode(`event: ${heartbeatMessage.event}\n`));
          controller.enqueue(encoder.encode(`data: ${heartbeatMessage.data}\n\n`));
        } catch (error) {
          console.log(`🔴 Heartbeat failed for client ${clientId}, removing connection`);
          clearInterval(heartbeatInterval);
          sseClients.delete(clientId);
        }
      }, 30000); // Every 30 seconds
    }
  });

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// Broadcast update to all subscribed SSE clients
export async function broadcastGroupTripUpdateSSE(update: GroupTripUpdate): Promise<number> {
  console.log(`🔴 Broadcasting SSE update for trip ${update.tripId}: ${update.type}`);
  
  let sentCount = 0;
  const currentTime = Date.now();

  for (const [clientId, client] of sseClients) {
    try {
      // Check if client should receive this update
      if (!shouldSendUpdateToClient(client.subscription, update)) {
        continue;
      }

      const message = {
        id: `update_${currentTime}_${sentCount}`,
        event: 'trip-update',
        data: JSON.stringify(update)
      };

      // Send SSE formatted message
      client.controller.enqueue(client.encoder.encode(`id: ${message.id}\n`));
      client.controller.enqueue(client.encoder.encode(`event: ${message.event}\n`));
      client.controller.enqueue(client.encoder.encode(`data: ${message.data}\n\n`));

      sentCount++;
      console.log(`🔴 Sent SSE ${update.type} update to client ${clientId} (trip: ${update.tripId})`);
    } catch (error) {
      console.error(`🔴 Error sending SSE update to client ${clientId}:`, error);
      // Remove broken connection
      sseClients.delete(clientId);
    }
  }
  
  console.log(`🔴 SSE update sent to ${sentCount} clients`);
  return sentCount;
}

// Function to check if client should receive update
function shouldSendUpdateToClient(subscription: ClientSubscription, update: GroupTripUpdate): boolean {
  // Check subscription to trip
  if (!subscription.tripIds.has(update.tripId)) {
    return false;
  }
  
  // Check subscription to event type
  if (!subscription.eventTypes.has(update.type)) {
    return false;
  }
  
  // Apply filters based on event type
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

// Handle subscription management via POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, action, tripIds, eventTypes, filters } = body;

    if (!clientId || !sseClients.has(clientId)) {
      return Response.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const client = sseClients.get(clientId)!;

    switch (action) {
      case 'subscribe':
        if (tripIds && Array.isArray(tripIds)) {
          tripIds.forEach((tripId: string) => client.subscription.tripIds.add(tripId));
          console.log(`🔴 SSE client ${clientId} subscribed to trips: ${tripIds.join(', ')}`);
        }
        break;

      case 'unsubscribe':
        if (tripIds && Array.isArray(tripIds)) {
          tripIds.forEach((tripId: string) => client.subscription.tripIds.delete(tripId));
          console.log(`🔴 SSE client ${clientId} unsubscribed from trips: ${tripIds.join(', ')}`);
        }
        break;

      case 'subscribe_events':
        if (eventTypes && Array.isArray(eventTypes)) {
          eventTypes.forEach((eventType: string) => client.subscription.eventTypes.add(eventType));
          if (filters) {
            client.subscription.filters = { ...client.subscription.filters, ...filters };
          }
          console.log(`🔴 SSE client ${clientId} subscribed to event types: ${eventTypes.join(', ')}`);
        }
        break;

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    return Response.json({ success: true, clientId, action });
    
  } catch (error) {
    console.error('🔴 Error handling SSE subscription:', error);
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Get SSE connection statistics
export function getSSEStats() {
  const stats = {
    totalConnections: sseClients.size,
    totalTripSubscriptions: Array.from(sseClients.values()).reduce(
      (total, client) => total + client.subscription.tripIds.size,
      0
    ),
    totalEventSubscriptions: Array.from(sseClients.values()).reduce(
      (total, client) => total + client.subscription.eventTypes.size,
      0
    ),
    connections: Array.from(sseClients.entries()).map(([clientId, client]) => ({
      clientId,
      tripSubscriptions: Array.from(client.subscription.tripIds),
      eventSubscriptions: Array.from(client.subscription.eventTypes),
      filters: client.subscription.filters
    }))
  };
  
  console.log('🔴 SSE Stats:', stats);
  return stats;
}
