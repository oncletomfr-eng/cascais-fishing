import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';

/**
 * 🔧 Enhanced Chat SSE Hook with Advanced Diagnostics
 * 
 * Improved version of useChatSSE with comprehensive error tracking,
 * detailed logging, and diagnostic capabilities for debugging connection issues
 */

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

export interface ConnectionDiagnostics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastError: string | null;
  errorHistory: Array<{
    timestamp: Date;
    error: string;
    context: any;
  }>;
  networkQuality: 'excellent' | 'good' | 'poor' | 'unknown';
  connectionHistory: Array<{
    timestamp: Date;
    event: 'connect' | 'disconnect' | 'reconnect' | 'error' | 'success';
    details: string;
  }>;
}

export interface ConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  quality: 'good' | 'poor' | 'unknown';
  lastHeartbeat: Date | null;
  reconnectAttempts: number;
  uptime: number; // in seconds
  diagnostics: ConnectionDiagnostics;
}

export interface ChatSSEOptions {
  channelIds: string[];
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  heartbeatTimeout?: number;
  enableDiagnostics?: boolean;
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
  
  // Diagnostic functions
  getDiagnostics: () => ConnectionDiagnostics;
  clearDiagnostics: () => void;
  exportDiagnostics: () => string;
}

export function useChatSSEDiagnostic(options: ChatSSEOptions): ChatSSEHookReturn {
  const { data: session, status } = useSession();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    quality: 'unknown',
    lastHeartbeat: null,
    reconnectAttempts: 0,
    uptime: 0,
    diagnostics: {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastError: null,
      errorHistory: [],
      networkQuality: 'unknown',
      connectionHistory: []
    }
  });
  
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserStatus>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, { userName: string; timestamp: Date }>>(new Map());
  
  // Refs for managing polling and handlers
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string | null>(null);
  const lastEventIdRef = useRef<string>('0');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const connectionStartTimeRef = useRef<Date | null>(null);
  const responseTimesRef = useRef<number[]>([]);
  
  // Event handler registries
  const messageHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());
  const typingHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());
  const receiptHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());
  const statusHandlers = useRef<Set<(event: ChatSSEEvent) => void>>(new Set());

  const {
    autoReconnect = true,
    maxReconnectAttempts = 5,
    heartbeatTimeout = 10000,
    enableDiagnostics = true,
    channelIds,
    preferences = {
      receiveTypingIndicators: true,
      receiveReadReceipts: true,
      receiveOnlineStatus: true
    }
  } = options;
  
  // Polling settings
  const POLLING_INTERVAL = 2000; // Poll every 2 seconds
  const CONNECTION_TIMEOUT = 5000; // 5 seconds timeout for each request

  // Diagnostic functions
  const logConnectionEvent = useCallback((event: string, details: string, context?: any) => {
    if (!enableDiagnostics) return;
    
    const timestamp = new Date();
    const logEntry = `[${timestamp.toISOString()}] ${event}: ${details}`;
    
    console.log(`🔍 Chat SSE Diagnostic - ${logEntry}`, context || '');
    
    setConnectionStatus(prev => ({
      ...prev,
      diagnostics: {
        ...prev.diagnostics,
        connectionHistory: [
          ...prev.diagnostics.connectionHistory.slice(-49), // Keep last 50 entries
          {
            timestamp,
            event: event as any,
            details
          }
        ]
      }
    }));
  }, [enableDiagnostics]);

  const logError = useCallback((error: string, context?: any) => {
    if (!enableDiagnostics) return;
    
    const timestamp = new Date();
    console.error(`❌ Chat SSE Error - [${timestamp.toISOString()}] ${error}`, context || '');
    
    setConnectionStatus(prev => ({
      ...prev,
      diagnostics: {
        ...prev.diagnostics,
        lastError: error,
        failedRequests: prev.diagnostics.failedRequests + 1,
        errorHistory: [
          ...prev.diagnostics.errorHistory.slice(-19), // Keep last 20 errors
          {
            timestamp,
            error,
            context: context || {}
          }
        ]
      }
    }));
  }, [enableDiagnostics]);

  const updateNetworkQuality = useCallback((responseTime: number) => {
    responseTimesRef.current.push(responseTime);
    if (responseTimesRef.current.length > 10) {
      responseTimesRef.current = responseTimesRef.current.slice(-10);
    }
    
    const avgResponseTime = responseTimesRef.current.reduce((sum, time) => sum + time, 0) / responseTimesRef.current.length;
    const quality = avgResponseTime < 500 ? 'excellent' : avgResponseTime < 1000 ? 'good' : 'poor';
    
    setConnectionStatus(prev => ({
      ...prev,
      diagnostics: {
        ...prev.diagnostics,
        averageResponseTime: avgResponseTime,
        networkQuality: quality
      }
    }));
  }, []);

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

  // Handle polling events
  const handlePollingEvent = useCallback((event: ChatSSEEvent) => {
    try {
      logConnectionEvent('event_received', `Event type: ${event.type}`, event);

      switch (event.type) {
        case 'connection_status':
          if (event.data?.clientId) {
            clientIdRef.current = event.data.clientId;
          }
          
          setConnectionStatus(prev => ({
            ...prev,
            status: 'connected',
            quality: 'good',
            reconnectAttempts: 0,
            lastHeartbeat: new Date(),
            uptime: connectionStartTimeRef.current 
              ? Math.floor((Date.now() - connectionStartTimeRef.current.getTime()) / 1000)
              : 0
          }));
          break;

        case 'message':
          messageHandlers.current.forEach(handler => handler(event));
          break;

        case 'typing':
          if (event.userId && event.data?.isTyping) {
            setTypingUsers(prev => {
              const updated = new Map(prev);
              updated.set(event.userId!, {
                userName: event.data.userName || 'Unknown User',
                timestamp: new Date()
              });
              return updated;
            });
            
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

        case 'read_receipt':
          receiptHandlers.current.forEach(handler => handler(event));
          break;

        case 'user_status':
          if (event.userId && event.data) {
            setOnlineUsers(prev => {
              const updated = new Map(prev);
              if (event.data.status === 'offline') {
                updated.delete(event.userId!);
              } else {
                updated.set(event.userId!, {
                  userId: event.userId!,
                  status: event.data.status,
                  lastSeen: event.timestamp
                });
              }
              return updated;
            });
          }
          statusHandlers.current.forEach(handler => handler(event));
          break;
      }
    } catch (error) {
      logError('Error processing event', { event, error: error instanceof Error ? error.message : String(error) });
    }
  }, [logConnectionEvent, logError, clearTypingTimeout]);

  // Start polling for chat events
  const connect = useCallback(() => {
    if (!session?.user?.id || pollingIntervalRef.current) return;

    logConnectionEvent('connection_attempt', 'Starting chat polling');
    setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));
    
    connectionStartTimeRef.current = new Date();
    lastEventIdRef.current = '0';
    reconnectAttemptsRef.current = 0;

    const performPoll = async () => {
      const requestStart = Date.now();
      
      try {
        const channelParam = channelIds.length > 0 ? `channels=${channelIds.join(',')}` : '';
        const clientParam = clientIdRef.current ? `clientId=${clientIdRef.current}` : '';
        const lastEventParam = `lastEventId=${lastEventIdRef.current}`;
        
        const params = [channelParam, clientParam, lastEventParam]
          .filter(Boolean)
          .join('&');
        
        const url = `/api/chat/sse?${params}`;
        
        logConnectionEvent('polling_request', `Polling URL: ${url}`);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Diagnostic-Mode': enableDiagnostics ? 'true' : 'false'
          },
          signal: AbortSignal.timeout(CONNECTION_TIMEOUT)
        });

        const responseTime = Date.now() - requestStart;
        updateNetworkQuality(responseTime);

        setConnectionStatus(prev => ({
          ...prev,
          diagnostics: {
            ...prev.diagnostics,
            totalRequests: prev.diagnostics.totalRequests + 1
          }
        }));

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        logConnectionEvent('polling_success', `Response received (${responseTime}ms)`, {
          status: response.status,
          dataKeys: Object.keys(data),
          events: data.events?.length || 0
        });
        
        setConnectionStatus(prev => ({
          ...prev,
          diagnostics: {
            ...prev.diagnostics,
            successfulRequests: prev.diagnostics.successfulRequests + 1
          }
        }));

        if (data.success) {
          // Update client ID if received
          if (data.clientId && !clientIdRef.current) {
            clientIdRef.current = data.clientId;
            logConnectionEvent('client_id_assigned', `Client ID: ${data.clientId}`);
          }
          
          // Update last event ID
          if (data.lastEventId) {
            lastEventIdRef.current = data.lastEventId;
          }
          
          // Update online users
          if (data.onlineUsers) {
            const onlineMap = new Map<string, UserStatus>();
            data.onlineUsers.forEach((user: UserStatus) => {
              onlineMap.set(user.userId, user);
            });
            setOnlineUsers(onlineMap);
            logConnectionEvent('online_users_updated', `${data.onlineUsers.length} users online`);
          }
          
          // Process events
          if (data.events && Array.isArray(data.events)) {
            data.events.forEach((event: ChatSSEEvent) => {
              handlePollingEvent(event);
            });
          }
          
          // Update connection status on successful poll
          setConnectionStatus(prev => ({
            ...prev,
            status: 'connected',
            quality: 'good',
            lastHeartbeat: new Date(),
            reconnectAttempts: 0,
            uptime: connectionStartTimeRef.current 
              ? Math.floor((Date.now() - connectionStartTimeRef.current.getTime()) / 1000)
              : 0
          }));
          
          reconnectAttemptsRef.current = 0;
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logError(`Polling error: ${errorMessage}`, {
          requestDuration: Date.now() - requestStart,
          reconnectAttempt: reconnectAttemptsRef.current,
          url: `/api/chat/sse?channels=${channelIds.join(',')}`
        });
        
        setConnectionStatus(prev => ({ 
          ...prev, 
          status: 'error',
          quality: 'poor'
        }));

        // Auto-reconnect logic for polling
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          setConnectionStatus(prev => ({ 
            ...prev, 
            status: 'reconnecting',
            reconnectAttempts: reconnectAttemptsRef.current
          }));
          logConnectionEvent('reconnect_attempt', `Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          logConnectionEvent('max_reconnect_attempts', 'Giving up on reconnection');
          disconnect();
          return;
        }
      }
    };

    // Start polling interval
    pollingIntervalRef.current = setInterval(performPoll, POLLING_INTERVAL);
    
    // Perform initial poll immediately
    performPoll();

  }, [session?.user?.id, channelIds, autoReconnect, maxReconnectAttempts, enableDiagnostics, handlePollingEvent, logConnectionEvent, logError, updateNetworkQuality]);

  // Stop polling
  const disconnect = useCallback(() => {
    logConnectionEvent('disconnection', 'Stopping chat polling');
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
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
    lastEventIdRef.current = '0';
    reconnectAttemptsRef.current = 0;
    
    setConnectionStatus({
      status: 'disconnected',
      quality: 'unknown',
      lastHeartbeat: null,
      reconnectAttempts: 0,
      uptime: 0,
      diagnostics: {
        ...connectionStatus.diagnostics,
        connectionHistory: [
          ...connectionStatus.diagnostics.connectionHistory,
          {
            timestamp: new Date(),
            event: 'disconnect',
            details: 'Manual disconnection'
          }
        ]
      }
    });
    
    setOnlineUsers(new Map());
    setTypingUsers(new Map());
  }, [clearTypingTimeout, connectionStatus.diagnostics, logConnectionEvent]);

  // Reconnect
  const reconnect = useCallback(() => {
    logConnectionEvent('manual_reconnect', 'Manual reconnection requested');
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect, logConnectionEvent]);

  // API request helper for chat actions
  const chatPollingRequest = useCallback(async (action: string, data: any) => {
    if (!clientIdRef.current) {
      throw new Error('Not connected to chat polling');
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
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    return response.json();
  }, []);

  // Action functions
  const sendTypingIndicator = useCallback(async (channelId: string) => {
    await chatPollingRequest('send_typing_indicator', { channelIds: [channelId] });
  }, [chatPollingRequest]);

  const sendReadReceipt = useCallback(async (messageId: string, channelId: string) => {
    await chatPollingRequest('send_read_receipt', { messageId, channelIds: [channelId] });
  }, [chatPollingRequest]);

  const subscribeToChannels = useCallback(async (newChannelIds: string[]) => {
    await chatPollingRequest('subscribe_channels', { channelIds: newChannelIds });
  }, [chatPollingRequest]);

  const unsubscribeFromChannels = useCallback(async (oldChannelIds: string[]) => {
    await chatPollingRequest('unsubscribe_channels', { channelIds: oldChannelIds });
  }, [chatPollingRequest]);

  const updatePreferences = useCallback(async (newPreferences: Partial<ChatSSEOptions['preferences']>) => {
    await chatPollingRequest('update_preferences', { preferences: newPreferences });
  }, [chatPollingRequest]);

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

  // Diagnostic functions
  const getDiagnostics = useCallback(() => connectionStatus.diagnostics, [connectionStatus.diagnostics]);

  const clearDiagnostics = useCallback(() => {
    setConnectionStatus(prev => ({
      ...prev,
      diagnostics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        lastError: null,
        errorHistory: [],
        networkQuality: 'unknown',
        connectionHistory: []
      }
    }));
    responseTimesRef.current = [];
  }, []);

  const exportDiagnostics = useCallback(() => {
    const diagnosticsData = {
      timestamp: new Date().toISOString(),
      connectionStatus,
      session: session?.user?.id ? 'authenticated' : 'not authenticated',
      channelIds,
      options: {
        autoReconnect,
        maxReconnectAttempts,
        heartbeatTimeout,
        enableDiagnostics
      },
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
        url: typeof window !== 'undefined' ? window.location.href : 'server'
      }
    };
    
    return JSON.stringify(diagnosticsData, null, 2);
  }, [connectionStatus, session?.user?.id, channelIds, autoReconnect, maxReconnectAttempts, heartbeatTimeout, enableDiagnostics]);

  // Auto-connect when session is available and user is authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [status, session?.user?.id]);

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
    reconnect,
    
    // Diagnostic functions
    getDiagnostics,
    clearDiagnostics,
    exportDiagnostics
  };
}
