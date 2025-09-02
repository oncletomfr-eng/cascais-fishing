import { NextRequest } from 'next/server';
import { auth } from '@/auth';

// Extended chat-specific SSE infrastructure
// Part of Task 19: Real-time Integration & SSE

interface ChatSSEEvent {
  id: string;
  type: 'message' | 'typing' | 'read_receipt' | 'user_status' | 'connection_status';
  channelId: string;
  userId?: string;
  data: any;
  timestamp: string;
}

interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'typing';
  lastSeen: string;
}

interface MessageReceipt {
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
}

// Chat SSE client subscription configuration
interface ChatClientSubscription {
  channelIds: Set<string>;
  eventTypes: Set<string>;
  userId: string;
  userPreferences: {
    receiveTypingIndicators: boolean;
    receiveReadReceipts: boolean;
    receiveOnlineStatus: boolean;
  };
}

// Global storage for chat SSE connections
const chatSSEClients = new Map<string, {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  subscription: ChatClientSubscription;
  lastPing: Date;
}>();

// Track user online status globally
const userOnlineStatus = new Map<string, UserStatus>();

// Helper to generate unique chat client ID
function generateChatClientId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// SSE endpoint for real-time chat events
export async function GET(request: NextRequest) {
  console.log('💬 New Chat SSE connection request');

  // Authenticate user
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const clientId = generateChatClientId();

  // Extract channel subscription from query params
  const { searchParams } = new URL(request.url);
  const channelIds = searchParams.get('channels')?.split(',') || [];
  
  console.log(`💬 Chat SSE client ${clientId} connecting for user ${userId}, channels: ${channelIds.join(', ')}`);

  // Create readable stream for Chat SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Store client connection with subscription
      chatSSEClients.set(clientId, {
        controller,
        encoder,
        subscription: {
          channelIds: new Set(channelIds),
          eventTypes: new Set(['message', 'typing', 'read_receipt', 'user_status']),
          userId,
          userPreferences: {
            receiveTypingIndicators: true,
            receiveReadReceipts: true,
            receiveOnlineStatus: true
          }
        },
        lastPing: new Date()
      });

      // Update user online status
      userOnlineStatus.set(userId, {
        userId,
        status: 'online',
        lastSeen: new Date().toISOString()
      });

      // Broadcast user online status to relevant channels
      broadcastUserStatusChange(userId, 'online', channelIds);

      // Send initial connection event
      const connectMessage = {
        id: `chat_connect_${Date.now()}`,
        event: 'chat-connected',
        data: JSON.stringify({
          type: 'connected',
          clientId,
          userId,
          message: 'Chat SSE connection established',
          timestamp: new Date().toISOString(),
          onlineUsers: getOnlineUsersForChannels(channelIds)
        })
      };

      controller.enqueue(encoder.encode(`id: ${connectMessage.id}\n`));
      controller.enqueue(encoder.encode(`event: ${connectMessage.event}\n`));
      controller.enqueue(encoder.encode(`data: ${connectMessage.data}\n\n`));
      
      console.log(`💬 Chat SSE client connected: ${clientId} for user ${userId}`);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log(`💬 Chat SSE client disconnected: ${clientId}`);
        
        // Update user status to offline if no other connections
        const hasOtherConnections = Array.from(chatSSEClients.values())
          .some(client => client.subscription.userId === userId);
        
        if (!hasOtherConnections) {
          userOnlineStatus.set(userId, {
            userId,
            status: 'offline',
            lastSeen: new Date().toISOString()
          });
          broadcastUserStatusChange(userId, 'offline', channelIds);
        }
        
        chatSSEClients.delete(clientId);
        try {
          controller.close();
        } catch (error) {
          // Connection already closed
        }
      });

      // Enhanced heartbeat with connection quality monitoring
      const heartbeatInterval = setInterval(() => {
        try {
          if (!chatSSEClients.has(clientId)) {
            clearInterval(heartbeatInterval);
            return;
          }

          const client = chatSSEClients.get(clientId)!;
          const now = new Date();
          const timeSinceLastPing = now.getTime() - client.lastPing.getTime();

          const heartbeatMessage = {
            id: `chat_heartbeat_${Date.now()}`,
            event: 'chat-heartbeat',
            data: JSON.stringify({
              type: 'heartbeat',
              timestamp: now.toISOString(),
              connectionQuality: timeSinceLastPing < 35000 ? 'good' : 'poor',
              onlineCount: chatSSEClients.size
            })
          };

          controller.enqueue(encoder.encode(`id: ${heartbeatMessage.id}\n`));
          controller.enqueue(encoder.encode(`event: ${heartbeatMessage.event}\n`));
          controller.enqueue(encoder.encode(`data: ${heartbeatMessage.data}\n\n`));

          client.lastPing = now;
        } catch (error) {
          console.log(`💬 Chat heartbeat failed for client ${clientId}, removing connection`);
          clearInterval(heartbeatInterval);
          chatSSEClients.delete(clientId);
        }
      }, 30000); // Every 30 seconds
    }
  });

  // Return SSE response with chat-optimized headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering for real-time
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    },
  });
}

// Broadcast chat event to subscribed clients
export async function broadcastChatEvent(event: ChatSSEEvent): Promise<number> {
  console.log(`💬 Broadcasting chat SSE event: ${event.type} for channel ${event.channelId}`);
  
  let sentCount = 0;
  const currentTime = Date.now();

  for (const [clientId, client] of chatSSEClients) {
    try {
      // Check if client should receive this event
      if (!shouldSendChatEventToClient(client.subscription, event)) {
        continue;
      }

      const message = {
        id: `chat_${event.type}_${currentTime}_${sentCount}`,
        event: `chat-${event.type}`,
        data: JSON.stringify(event)
      };

      // Send SSE formatted message
      client.controller.enqueue(client.encoder.encode(`id: ${message.id}\n`));
      client.controller.enqueue(client.encoder.encode(`event: ${message.event}\n`));
      client.controller.enqueue(client.encoder.encode(`data: ${message.data}\n\n`));

      sentCount++;
      console.log(`💬 Sent chat SSE ${event.type} to client ${clientId}`);
    } catch (error) {
      console.error(`💬 Error sending chat SSE event to client ${clientId}:`, error);
      // Remove broken connection
      chatSSEClients.delete(clientId);
    }
  }
  
  console.log(`💬 Chat SSE event sent to ${sentCount} clients`);
  return sentCount;
}

// Check if client should receive chat event
function shouldSendChatEventToClient(subscription: ChatClientSubscription, event: ChatSSEEvent): boolean {
  // Check channel subscription
  if (!subscription.channelIds.has(event.channelId)) {
    return false;
  }
  
  // Check event type subscription
  if (!subscription.eventTypes.has(event.type)) {
    return false;
  }
  
  // Apply user preferences
  switch (event.type) {
    case 'typing':
      if (!subscription.userPreferences.receiveTypingIndicators) {
        return false;
      }
      // Don't send typing events from the same user
      if (event.userId === subscription.userId) {
        return false;
      }
      break;
      
    case 'read_receipt':
      if (!subscription.userPreferences.receiveReadReceipts) {
        return false;
      }
      break;
      
    case 'user_status':
      if (!subscription.userPreferences.receiveOnlineStatus) {
        return false;
      }
      // Don't send own status changes
      if (event.userId === subscription.userId) {
        return false;
      }
      break;
  }
  
  return true;
}

// Broadcast user status change to relevant channels
function broadcastUserStatusChange(userId: string, status: 'online' | 'offline' | 'away' | 'typing', channelIds: string[]) {
  const statusEvent: ChatSSEEvent = {
    id: `status_${userId}_${Date.now()}`,
    type: 'user_status',
    channelId: '', // Will be set per channel
    userId,
    data: {
      userId,
      status,
      timestamp: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };

  // Broadcast to each channel the user is part of
  channelIds.forEach(channelId => {
    broadcastChatEvent({
      ...statusEvent,
      channelId
    });
  });
}

// Get online users for specific channels
function getOnlineUsersForChannels(channelIds: string[]): UserStatus[] {
  const onlineUsers: UserStatus[] = [];
  
  for (const [clientId, client] of chatSSEClients) {
    // Check if client is subscribed to any of the requested channels
    const hasMatchingChannel = channelIds.some(channelId => 
      client.subscription.channelIds.has(channelId)
    );
    
    if (hasMatchingChannel) {
      const userStatus = userOnlineStatus.get(client.subscription.userId);
      if (userStatus && userStatus.status === 'online') {
        onlineUsers.push(userStatus);
      }
    }
  }
  
  return onlineUsers;
}

// Handle chat-specific subscription management via POST
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, action, channelIds, eventTypes, preferences, messageId, receiptStatus } = body;

    if (!clientId || !chatSSEClients.has(clientId)) {
      return Response.json({ error: 'Invalid client ID' }, { status: 400 });
    }

    const client = chatSSEClients.get(clientId)!;

    switch (action) {
      case 'subscribe_channels':
        if (channelIds && Array.isArray(channelIds)) {
          channelIds.forEach((channelId: string) => client.subscription.channelIds.add(channelId));
          console.log(`💬 Chat SSE client ${clientId} subscribed to channels: ${channelIds.join(', ')}`);
        }
        break;

      case 'unsubscribe_channels':
        if (channelIds && Array.isArray(channelIds)) {
          channelIds.forEach((channelId: string) => client.subscription.channelIds.delete(channelId));
          console.log(`💬 Chat SSE client ${clientId} unsubscribed from channels: ${channelIds.join(', ')}`);
        }
        break;

      case 'update_preferences':
        if (preferences) {
          client.subscription.userPreferences = { 
            ...client.subscription.userPreferences, 
            ...preferences 
          };
          console.log(`💬 Chat SSE client ${clientId} updated preferences`);
        }
        break;

      case 'send_typing_indicator':
        // Broadcast typing indicator to channel subscribers
        if (channelIds && channelIds.length > 0) {
          const typingEvent: ChatSSEEvent = {
            id: `typing_${session.user.id}_${Date.now()}`,
            type: 'typing',
            channelId: channelIds[0],
            userId: session.user.id,
            data: {
              userId: session.user.id,
              userName: session.user.name || 'Unknown User',
              isTyping: true,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          };
          await broadcastChatEvent(typingEvent);
        }
        break;

      case 'send_read_receipt':
        // Handle read receipt
        if (messageId && channelIds && channelIds.length > 0) {
          const receiptEvent: ChatSSEEvent = {
            id: `receipt_${messageId}_${session.user.id}_${Date.now()}`,
            type: 'read_receipt',
            channelId: channelIds[0],
            userId: session.user.id,
            data: {
              messageId,
              userId: session.user.id,
              status: receiptStatus || 'read',
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          };
          await broadcastChatEvent(receiptEvent);
        }
        break;

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }

    return Response.json({ success: true, clientId, action });
    
  } catch (error) {
    console.error('💬 Error handling chat SSE request:', error);
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }
}

// Get chat SSE connection statistics
export function getChatSSEStats() {
  const stats = {
    totalChatConnections: chatSSEClients.size,
    totalChannelSubscriptions: Array.from(chatSSEClients.values()).reduce(
      (total, client) => total + client.subscription.channelIds.size,
      0
    ),
    onlineUsers: userOnlineStatus.size,
    connectionsByUser: Array.from(chatSSEClients.values()).reduce((acc, client) => {
      const userId = client.subscription.userId;
      acc[userId] = (acc[userId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    connections: Array.from(chatSSEClients.entries()).map(([clientId, client]) => ({
      clientId,
      userId: client.subscription.userId,
      channelSubscriptions: Array.from(client.subscription.channelIds),
      eventSubscriptions: Array.from(client.subscription.eventTypes),
      preferences: client.subscription.userPreferences,
      lastPing: client.lastPing
    }))
  };
  
  console.log('💬 Chat SSE Stats:', stats);
  return stats;
}

// Functions are exported individually above
