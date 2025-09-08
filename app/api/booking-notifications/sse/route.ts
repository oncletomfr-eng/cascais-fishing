import { NextRequest } from 'next/server';
import { auth } from '@/auth';

/**
 * Real-time Booking Notifications via Server-Sent Events
 * Task 12.3: Enhance booking notifications via SSE
 * 
 * Provides real-time notifications for booking-related events:
 * - Booking confirmations
 * - Payment status updates  
 * - Trip status changes
 * - Participant approvals/rejections
 * - Reminders and alerts
 */

export interface BookingSSEEvent {
  id: string;
  type: 'booking_confirmed' | 'booking_cancelled' | 'payment_completed' | 'payment_failed' | 
        'participant_approved' | 'participant_rejected' | 'trip_status_changed' | 
        'reminder_sent' | 'refund_processed' | 'weather_alert';
  bookingId: string;
  tripId?: string;
  userId: string;
  data: any;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface BookingClientSubscription {
  bookingIds: Set<string>;
  tripIds: Set<string>;
  eventTypes: Set<string>;
  userId: string;
  preferences: {
    receivePaymentUpdates: boolean;
    receiveStatusUpdates: boolean;
    receiveReminders: boolean;
    receiveWeatherAlerts: boolean;
  };
}

// Global storage for booking SSE connections
const bookingSSEClients = new Map<string, {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  subscription: BookingClientSubscription;
  lastPing: Date;
}>();

// Helper to generate unique booking client ID
function generateBookingClientId(): string {
  return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// SSE endpoint for real-time booking notifications
export async function GET(request: NextRequest) {
  console.log('📋 New Booking SSE connection request');

  // Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const clientId = generateBookingClientId();

  // Extract subscription preferences from query params
  const { searchParams } = new URL(request.url);
  const bookingIds = searchParams.get('bookings')?.split(',') || [];
  const tripIds = searchParams.get('trips')?.split(',') || [];
  const eventTypes = searchParams.get('events')?.split(',') || [
    'booking_confirmed', 'payment_completed', 'trip_status_changed', 'participant_approved'
  ];
  
  console.log(`📋 Booking SSE client ${clientId} connecting for user ${userId}`);
  console.log(`📋 Subscriptions - Bookings: ${bookingIds.join(', ')}, Trips: ${tripIds.join(', ')}`);

  // Create readable stream for Booking SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Store client connection with subscription
      bookingSSEClients.set(clientId, {
        controller,
        encoder,
        subscription: {
          bookingIds: new Set(bookingIds),
          tripIds: new Set(tripIds),
          eventTypes: new Set(eventTypes),
          userId,
          preferences: {
            receivePaymentUpdates: searchParams.get('payments') !== 'false',
            receiveStatusUpdates: searchParams.get('status') !== 'false',
            receiveReminders: searchParams.get('reminders') !== 'false',
            receiveWeatherAlerts: searchParams.get('weather') !== 'false'
          }
        },
        lastPing: new Date()
      });

      // Send initial connection event
      const connectMessage = {
        id: `booking_connect_${Date.now()}`,
        event: 'booking-connected',
        data: JSON.stringify({
          type: 'connected',
          clientId,
          userId,
          message: 'Booking SSE connection established',
          timestamp: new Date().toISOString(),
          subscriptions: {
            bookingIds: bookingIds.length,
            tripIds: tripIds.length,
            eventTypes: eventTypes.length
          }
        })
      };

      controller.enqueue(encoder.encode(`id: ${connectMessage.id}\n`));
      controller.enqueue(encoder.encode(`event: ${connectMessage.event}\n`));
      controller.enqueue(encoder.encode(`data: ${connectMessage.data}\n\n`));

      console.log(`📋 Booking SSE client connected: ${clientId}`);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`📋 Booking SSE client disconnected: ${clientId}`);
        bookingSSEClients.delete(clientId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeatMessage = {
            id: `booking_heartbeat_${Date.now()}`,
            event: 'booking-heartbeat',
            data: JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
              clientId,
              connectionQuality: 'good',
              activeSubscriptions: {
                bookings: bookingSSEClients.get(clientId)?.subscription.bookingIds.size || 0,
                trips: bookingSSEClients.get(clientId)?.subscription.tripIds.size || 0
              }
            })
          };

          controller.enqueue(encoder.encode(`id: ${heartbeatMessage.id}\n`));
          controller.enqueue(encoder.encode(`event: ${heartbeatMessage.event}\n`));
          controller.enqueue(encoder.encode(`data: ${heartbeatMessage.data}\n\n`));

          bookingSSEClients.get(clientId)!.lastPing = new Date();
        } catch (error) {
          console.log(`📋 Heartbeat failed for client ${clientId}:`, error);
          clearInterval(heartbeatInterval);
          bookingSSEClients.delete(clientId);
        }
      }, 30000); // 30 seconds

      // Cleanup heartbeat on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
      });
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// POST endpoint for managing subscriptions
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), { status: 401 });
    }

    const body = await request.json();
    const { clientId, action, bookingIds, tripIds, preferences } = body;

    if (!clientId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'clientId is required'
      }), { status: 400 });
    }

    const client = bookingSSEClients.get(clientId);
    if (!client) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Client not found'
      }), { status: 404 });
    }

    // Verify user owns this client connection
    if (client.subscription.userId !== session.user.id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized for this client'
      }), { status: 403 });
    }

    switch (action) {
      case 'subscribe_bookings':
        if (bookingIds && Array.isArray(bookingIds)) {
          bookingIds.forEach(id => client.subscription.bookingIds.add(id));
        }
        break;

      case 'unsubscribe_bookings':
        if (bookingIds && Array.isArray(bookingIds)) {
          bookingIds.forEach(id => client.subscription.bookingIds.delete(id));
        }
        break;

      case 'subscribe_trips':
        if (tripIds && Array.isArray(tripIds)) {
          tripIds.forEach(id => client.subscription.tripIds.add(id));
        }
        break;

      case 'unsubscribe_trips':
        if (tripIds && Array.isArray(tripIds)) {
          tripIds.forEach(id => client.subscription.tripIds.delete(id));
        }
        break;

      case 'update_preferences':
        if (preferences) {
          Object.assign(client.subscription.preferences, preferences);
        }
        break;

      default:
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid action'
        }), { status: 400 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Action ${action} completed successfully`,
      subscriptions: {
        bookings: Array.from(client.subscription.bookingIds),
        trips: Array.from(client.subscription.tripIds),
        preferences: client.subscription.preferences
      }
    }));

  } catch (error) {
    console.error('📋 Booking SSE subscription error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { status: 500 });
  }
}

// Broadcast booking event to subscribed clients
export async function broadcastBookingEvent(event: BookingSSEEvent): Promise<number> {
  console.log(`📋 Broadcasting booking SSE event: ${event.type} for booking ${event.bookingId}`);
  
  let sentCount = 0;
  const currentTime = Date.now();

  for (const [clientId, client] of bookingSSEClients) {
    try {
      // Check if client should receive this event
      if (!shouldSendBookingEventToClient(client.subscription, event)) {
        continue;
      }

      const message = {
        id: `booking_${event.type}_${currentTime}_${sentCount}`,
        event: `booking-${event.type}`,
        data: JSON.stringify(event)
      };

      // Send SSE formatted message
      client.controller.enqueue(client.encoder.encode(`id: ${message.id}\n`));
      client.controller.enqueue(client.encoder.encode(`event: ${message.event}\n`));
      client.controller.enqueue(client.encoder.encode(`data: ${message.data}\n\n`));

      sentCount++;
      console.log(`📋 Sent booking SSE ${event.type} to client ${clientId} (booking: ${event.bookingId})`);
    } catch (error) {
      console.error(`📋 Error sending booking SSE event to client ${clientId}:`, error);
      // Remove broken connection
      bookingSSEClients.delete(clientId);
    }
  }
  
  console.log(`📋 Booking SSE event sent to ${sentCount} clients`);
  return sentCount;
}

// Helper function to determine if client should receive the event
function shouldSendBookingEventToClient(subscription: BookingClientSubscription, event: BookingSSEEvent): boolean {
  // Check if user owns this booking/trip
  if (subscription.userId !== event.userId) {
    return false;
  }

  // Check if client is subscribed to this event type
  if (!subscription.eventTypes.has(event.type)) {
    return false;
  }

  // Check specific subscription filters
  const isSubscribedToBooking = subscription.bookingIds.has(event.bookingId);
  const isSubscribedToTrip = event.tripId && subscription.tripIds.has(event.tripId);

  if (!isSubscribedToBooking && !isSubscribedToTrip) {
    return false;
  }

  // Check user preferences
  const { preferences } = subscription;
  
  switch (event.type) {
    case 'payment_completed':
    case 'payment_failed':
    case 'refund_processed':
      return preferences.receivePaymentUpdates;
      
    case 'booking_confirmed':
    case 'booking_cancelled':
    case 'trip_status_changed':
      return preferences.receiveStatusUpdates;
      
    case 'reminder_sent':
      return preferences.receiveReminders;
      
    case 'weather_alert':
      return preferences.receiveWeatherAlerts;
      
    case 'participant_approved':
    case 'participant_rejected':
      return preferences.receiveStatusUpdates;
      
    default:
      return true; // Allow unknown event types by default
  }
}

// Utility function to create booking events
export function createBookingEvent(
  type: BookingSSEEvent['type'],
  bookingId: string,
  userId: string,
  data: any,
  options: {
    tripId?: string;
    priority?: BookingSSEEvent['priority'];
  } = {}
): BookingSSEEvent {
  return {
    id: `booking_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    bookingId,
    tripId: options.tripId,
    userId,
    data,
    timestamp: new Date().toISOString(),
    priority: options.priority || 'medium'
  };
}

// Export for use in other parts of the application
export { bookingSSEClients, generateBookingClientId };
