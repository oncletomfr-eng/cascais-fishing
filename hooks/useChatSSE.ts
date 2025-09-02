import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

// Chat SSE Integration Hook
// Part of Task 19: Real-time Integration & SSE

export interface ChatSSEEvent {
  id: string;
  type: 'message' | 'typing' | 'read_receipt' | 'user_status' | 'connection_status';
  channelId: string;
  userId?: string;
  data: any;
  timestamp: string;
}

export interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'typing';
  lastSeen: string;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  quality: 'good' | 'poor' | 'unknown';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
}

export interface ChatSSEOptions {
  channelIds: string[];
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  heartbeatTimeout?: number;
  preferences?: {
    receiveTypingIndicators?: boolean;
    receiveReadReceipts?: boolean;
    receiveOnlineStatus?: boolean;
  };
}

export interface ChatSSEHookReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  
  // User status tracking
  onlineUsers: Map<string, UserStatus>;
  typingUsers: Map<string, { userName: string; timestamp: Date }>;
  
  // Event handlers
  onMessage: (handler: (event: ChatSSEEvent) => void) => () => void;
  onTypingIndicator: (handler: (event: ChatSSEEvent) => void) => () => void;
  onReadReceipt: (handler: (event: ChatSSEEvent) => void) => () => void;
  onUserStatusChange: (handler: (event: ChatSSEEvent) => void) => () => void;
  
  // Actions
  sendTypingIndicator: (channelId: string) => Promise<void>;
  sendReadReceipt: (messageId: string, channelId: string) => Promise<void>;
  subscribeToChannels: (channelIds: string[]) => Promise<void>;
  unsubscribeFromChannels: (channelIds: string[]) => Promise<void>;
  updatePreferences: (preferences: Partial<ChatSSEOptions['preferences']>) => Promise<void>;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

export function useChatSSE(options: ChatSSEOptions): ChatSSEHookReturn {
  const { data: session, status } = useSession();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    quality: 'unknown',
    lastHeartbeat: null,
    reconnectAttempts: 0
  });
  
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, { userName: string; timestamp: Date }>>(new Map());
  
  // Refs for managing EventSource and handlers
  const eventSourceRef = useRef<EventSource | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Event handler registries
  const messageHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());
  const typingHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());
  const receiptHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());
  const statusHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());

  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    heartbeatTimeout = 45000, // 45 seconds (30s heartbeat + 15s grace)
    channelIds,
    preferences = {
      receiveTypingIndicators: true,
      receiveReadReceipts: true,
      receiveOnlineStatus: true
    }
  } = options;

  // Clear typing timeout
  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Clear old typing indicators
  const cleanupTypingIndicators = useCallback(() => {
    const now = Date.now();
    setTypingUsers(prev => {
      const updated = new Map(prev);
      for (const [userId, data] of updated) {
        // Remove typing indicators older than 5 seconds
        if (now - data.timestamp.getTime() > 5000) {
          updated.delete(userId);
        }
      }
      return updated;
    });
  }, []);

  // Setup typing cleanup interval
  useEffect(() => {
    const interval = setInterval(cleanupTypingIndicators, 2000);
    return () => clearInterval(interval);
  }, [cleanupTypingIndicators]);

  // Handle SSE events
  const handleSSEEvent = useCallback((eventType: string, data: string) => {
    try {
      const event: ChatSSEEvent = JSON.parse(data);
      
      console.log(`💬 Received chat SSE event: ${eventType}`, event);

      switch (eventType) {
        case 'chat-connected':
          setConnectionStatus(prev => ({
            ...prev,
            status: 'connected',
            quality: 'good',
            reconnectAttempts: 0
          }));
          
          clientIdRef.current = event.data.clientId;
          
          // Update online users from initial connection
          if (event.data.onlineUsers) {
            const onlineMap = new Map<string, UserStatus>();
            event.data.onlineUsers.forEach((user: UserStatus) => {
              onlineMap.set(user.userId, user);
            });
            setOnlineUsers(onlineMap);
          }
          break;

        case 'chat-heartbeat':
          setConnectionStatus(prev => ({
            ...prev,
            quality: event.data.connectionQuality || 'good',
            lastHeartbeat: new Date()
          }));
          
          // Reset heartbeat timeout
          if (heartbeatTimeoutRef.current) {
            clearTimeout(heartbeatTimeoutRef.current);
          }
          heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('💬 Chat SSE heartbeat timeout');
            setConnectionStatus(prev => ({ ...prev, quality: 'poor' }));
          }, heartbeatTimeout);
          break;

        case 'chat-message':
          messageHandlers.current.forEach(handler => handler(event));
          break;

        case 'chat-typing':
          if (event.userId && event.data.isTyping) {
            setTypingUsers(prev => {
              const updated = new Map(prev);
              updated.set(event.userId!, {
                userName: event.data.userName || 'Unknown User',
                timestamp: new Date()
              });
              return updated;
            });
            
            // Clear typing indicator after 5 seconds
            clearTypingTimeout();
            typingTimeoutRef.current = setTimeout(() => {
              setTypingUsers(prev => {
                const updated = new Map(prev);
                updated.delete(event.userId!);
                return updated;
              });
            }, 5000);
          }
          typingHandlers.current.forEach(handler => handler(event));
          break;

        case 'chat-read_receipt':
          receiptHandlers.current.forEach(handler => handler(event));
          break;

        case 'chat-user_status':
          if (event.userId) {
            setOnlineUsers(prev => {
              const updated = new Map(prev);
              if (event.data.status === 'offline') {
                updated.delete(event.userId!);
              } else {
                updated.set(event.userId!, {
                  userId: event.userId!,
                  status: event.data.status,
                  lastSeen: event.data.timestamp
                });
              }
              return updated;
            });
          }
          statusHandlers.current.forEach(handler => handler(event));
          break;
      }
    } catch (error) {
      console.error('💬 Error parsing chat SSE event:', error);
    }
  }, [heartbeatTimeout, clearTypingTimeout]);

  // Connect to Chat SSE
  const connect = useCallback(() => {
    if (!session?.user?.id || eventSourceRef.current) return;

    console.log('💬 Connecting to Chat SSE...');
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

    const channelParam = channelIds.length > 0 ? `?channels=${channelIds.join(',')}` : '';
    const eventSource = new EventSource(`/api/chat/sse${channelParam}`);
    
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('💬 Chat SSE connection opened');
    };

    eventSource.onerror = (error) => {
      console.error('💬 Chat SSE connection error:', error);
      setConnectionStatus(prev => ({ 
        ...prev, 
        status: 'error',
        quality: 'poor' 
      }));

      // Auto-reconnect logic
      if (autoReconnect && connectionStatus.reconnectAttempts < maxReconnectAttempts) {
        setConnectionStatus(prev => ({ 
          ...prev, 
          status: 'reconnecting',
          reconnectAttempts: prev.reconnectAttempts + 1
        }));
        
        reconnectTimeoutRef.current = setTimeout(() => {
          disconnect();
          connect();
        }, Math.min(1000 * Math.pow(2, connectionStatus.reconnectAttempts), 30000)); // Exponential backoff, max 30s
      }
    };

    // Register event listeners for all chat event types
    ['chat-connected', 'chat-heartbeat', 'chat-message', 'chat-typing', 'chat-read_receipt', 'chat-user_status'].forEach(eventType => {
      eventSource.addEventListener(eventType, (event) => {
        handleSSEEvent(eventType, (event as MessageEvent).data);
      });
    });

  }, [session?.user?.id, channelIds, autoReconnect, maxReconnectAttempts, connectionStatus.reconnectAttempts, handleSSEEvent]);

  // Disconnect from Chat SSE
  const disconnect = useCallback(() => {
    console.log('💬 Disconnecting from Chat SSE...');
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    clearTypingTimeout();
    clientIdRef.current = null;
    
    setConnectionStatus({
      status: 'disconnected',
      quality: 'unknown',
      lastHeartbeat: null,
      reconnectAttempts: 0
    });
    
    setOnlineUsers(new Map());
    setTypingUsers(new Map());
  }, [clearTypingTimeout]);

  // Reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // API request helper with authentication
  const chatSSERequest = useCallback(async (action: string, data: any) => {
    if (!clientIdRef.current) {
      throw new Error('Not connected to Chat SSE');
    }

    const response = await fetch('/api/chat/sse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: clientIdRef.current,
        action,
        ...data
      })
    });

    if (!response.ok) {
      throw new Error(`Chat SSE request failed: ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Action functions
  const sendTypingIndicator = useCallback(async (channelId: string) => {
    await chatSSERequest('send_typing_indicator', { channelIds: [channelId] });
  }, [chatSSERequest]);

  const sendReadReceipt = useCallback(async (messageId: string, channelId: string) => {
    await chatSSERequest('send_read_receipt', { messageId, channelIds: [channelId] });
  }, [chatSSERequest]);

  const subscribeToChannels = useCallback(async (newChannelIds: string[]) => {
    await chatSSERequest('subscribe_channels', { channelIds: newChannelIds });
  }, [chatSSERequest]);

  const unsubscribeFromChannels = useCallback(async (oldChannelIds: string[]) => {
    await chatSSERequest('unsubscribe_channels', { channelIds: oldChannelIds });
  }, [chatSSERequest]);

  const updatePreferences = useCallback(async (newPreferences: Partial<ChatSSEOptions['preferences']>) => {
    await chatSSERequest('update_preferences', { preferences: newPreferences });
  }, [chatSSERequest]);

  // Event handler registration functions
  const onMessage = useCallback((handler: (event: ChatSSEEvent) => void) => {
    messageHandlers.current.add(handler);
    return () => messageHandlers.current.delete(handler);
  }, []);

  const onTypingIndicator = useCallback((handler: (event: ChatSSEEvent) => void) => {
    typingHandlers.current.add(handler);
    return () => typingHandlers.current.delete(handler);
  }, []);

  const onReadReceipt = useCallback((handler: (event: ChatSSEEvent) => void) => {
    receiptHandlers.current.add(handler);
    return () => receiptHandlers.current.delete(handler);
  }, []);

  const onUserStatusChange = useCallback((handler: (event: ChatSSEEvent) => void) => {
    statusHandlers.current.add(handler);
    return () => statusHandlers.current.delete(handler);
  }, []);

  // Auto-connect when session is available and user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [status, session?.user?.id, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection state
    connectionStatus,
    isConnected: connectionStatus.status === 'connected',
    
    // User status tracking
    onlineUsers,
    typingUsers,
    
    // Event handlers
    onMessage,
    onTypingIndicator,
    onReadReceipt,
    onUserStatusChange,
    
    // Actions
    sendTypingIndicator,
    sendReadReceipt,
    subscribeToChannels,
    unsubscribeFromChannels,
    updatePreferences,
    
    // Connection management
    connect,
    disconnect,
    reconnect
  };
}
