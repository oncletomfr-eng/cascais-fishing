'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { 
  GroupTripUpdate, 
  ClientMessage, 
  UseGroupTripsWebSocket,
  WebSocketConfig 
} from '@/lib/types/group-events';
import { getWebSocketConfig } from '@/lib/config/websocket';

export interface UseGroupTripsWebSocketProps {
  url: string;
  enabled?: boolean;
  protocols?: string[];
  onUpdate?: (update: GroupTripUpdate) => void;
  onError?: (error: Error) => void;
  onConnectionChange?: (status: string) => void;
}

// Основной хук для работы с WebSocket группевых поездок
export function useGroupTripsWebSocket({
  url,
  enabled = true,
  protocols = ['group-trips-v1'],
  onUpdate,
  onError,
  onConnectionChange
}: UseGroupTripsWebSocketProps): UseGroupTripsWebSocket {
  
  // Состояние подписок
  const [subscribedTripIds, setSubscribedTripIds] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<GroupTripUpdate | undefined>();
  const [error, setError] = useState<Error | undefined>();

  // Конфигурация WebSocket с heartbeat и реконнектом
  const socketOptions = useMemo(() => ({
    shouldReconnect: (closeEvent: CloseEvent) => {
      console.log('🔄 WebSocket closed, attempting reconnect...', closeEvent.code, closeEvent.reason);
      return enabled && closeEvent.code !== 1000; // Не реконнектимся если закрылось нормально
    },
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber: number) => {
      // Экспоненциальная задержка: 1s, 2s, 4s, 8s, максимум 10s
      return Math.min(Math.pow(2, attemptNumber) * 1000, 10000);
    },
    protocols,
    
    // Heartbeat конфигурация согласно ТЗ (25 секунд)
    heartbeat: {
      message: 'heartbeat',
      returnMessage: 'pong',
      timeout: 60000, // 1 минута timeout
      interval: 25000, // каждые 25 секунд
    },
    
    // Обработчики событий
    onOpen: (event: Event) => {
      console.log('🔌 WebSocket connected successfully');
      setError(undefined);
      onConnectionChange?.('connected');
    },
    
    onClose: (event: CloseEvent) => {
      console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      onConnectionChange?.(event.code === 1000 ? 'disconnected' : 'error');
    },
    
    onError: (event: Event) => {
      console.error('❌ WebSocket error:', event);
      const error = new Error('WebSocket connection failed');
      setError(error);
      onError?.(error);
      onConnectionChange?.('error');
    },
    
    onMessage: (event: MessageEvent) => {
      try {
        handleWebSocketMessage(event.data);
      } catch (err) {
        console.error('❌ Error processing WebSocket message:', err);
        const error = new Error(`Message processing failed: ${err}`);
        setError(error);
        onError?.(error);
      }
    },
    
    // Фильтр сообщений (пропускаем heartbeat)
    filter: (message: MessageEvent) => {
      const data = message.data;
      
      // Пропускаем heartbeat сообщения
      if (data === 'pong' || data === 'ping') {
        return false;
      }
      
      try {
        const parsed = JSON.parse(data);
        return parsed.type !== 'heartbeat_response';
      } catch {
        return true; // Если не JSON, пропускаем через фильтр
      }
    }
    
  }), [enabled, protocols, onUpdate, onError, onConnectionChange]);

  // WebSocket соединение
  const {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    readyState,
    getWebSocket
  } = useWebSocket(
    enabled ? url : null,
    socketOptions,
    enabled
  );

  // Обработка входящих сообщений
  const handleWebSocketMessage = useCallback((data: string) => {
    console.log('📨 Received WebSocket message:', data);
    
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'connected':
          console.log('✅ WebSocket connection confirmed');
          break;
          
        case 'subscription_confirmed':
          console.log('✅ Subscription confirmed for trips:', message.tripIds);
          break;
          
        case 'unsubscription_confirmed':
          console.log('✅ Unsubscription confirmed for trips:', message.tripIds);
          break;
          
        case 'participant_joined':
        case 'participant_left':
        case 'status_changed':
        case 'confirmed':
          // Это обновление состояния поездки
          const update = message as GroupTripUpdate;
          console.log(`🔄 Trip update received: ${update.tripId} - ${update.type}`);
          
          setLastUpdate(update);
          onUpdate?.(update);
          break;
          
        case 'error':
          console.error('❌ Server error:', message.message);
          const serverError = new Error(message.message);
          setError(serverError);
          onError?.(serverError);
          break;
          
        default:
          console.log('📨 Unknown message type:', message.type, message);
      }
      
    } catch (error) {
      console.error('❌ Failed to parse WebSocket message:', data, error);
      throw error;
    }
  }, [onUpdate, onError]);

  // Подписка на обновления поездок
  const subscribe = useCallback((tripIds: string[]) => {
    if (!enabled || readyState !== ReadyState.OPEN) {
      console.warn('⚠️ Cannot subscribe - WebSocket not ready');
      return;
    }
    
    if (tripIds.length === 0) {
      console.warn('⚠️ No trip IDs provided for subscription');
      return;
    }

    const message: ClientMessage = {
      type: 'subscribe',
      tripIds
    };

    console.log('📡 Subscribing to trips:', tripIds);
    
    try {
      sendJsonMessage(message);
      
      // Обновляем локальное состояние подписок
      setSubscribedTripIds(prev => {
        const newSet = new Set(prev);
        tripIds.forEach(id => newSet.add(id));
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Failed to send subscription message:', error);
      const subscriptionError = new Error(`Subscription failed: ${error}`);
      setError(subscriptionError);
      onError?.(subscriptionError);
    }
  }, [enabled, readyState, sendJsonMessage, onError]);

  // Отписка от обновлений поездок
  const unsubscribe = useCallback((tripIds: string[]) => {
    if (!enabled || readyState !== ReadyState.OPEN) {
      console.warn('⚠️ Cannot unsubscribe - WebSocket not ready');
      return;
    }
    
    if (tripIds.length === 0) {
      console.warn('⚠️ No trip IDs provided for unsubscription');
      return;
    }

    const message: ClientMessage = {
      type: 'unsubscribe',
      tripIds
    };

    console.log('📡 Unsubscribing from trips:', tripIds);
    
    try {
      sendJsonMessage(message);
      
      // Обновляем локальное состояние подписок
      setSubscribedTripIds(prev => {
        const newSet = new Set(prev);
        tripIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
    } catch (error) {
      console.error('❌ Failed to send unsubscription message:', error);
      const unsubscriptionError = new Error(`Unsubscription failed: ${error}`);
      setError(unsubscriptionError);
      onError?.(unsubscriptionError);
    }
  }, [enabled, readyState, sendJsonMessage, onError]);

  // Проверка подписки на конкретную поездку
  const isSubscribed = useCallback((tripId: string): boolean => {
    return subscribedTripIds.has(tripId);
  }, [subscribedTripIds]);

  // Отправка heartbeat (для тестирования)
  const sendHeartbeat = useCallback(() => {
    if (readyState === ReadyState.OPEN) {
      const message: ClientMessage = { type: 'heartbeat' };
      sendJsonMessage(message);
      console.log('💓 Manual heartbeat sent');
    }
  }, [readyState, sendJsonMessage]);

  // Преобразование ReadyState в понятный статус
  const connectionStatus = useMemo(() => {
    switch (readyState) {
      case ReadyState.CONNECTING:
        return 'connecting';
      case ReadyState.OPEN:
        return 'connected';
      case ReadyState.CLOSING:
      case ReadyState.CLOSED:
        return 'disconnected';
      case ReadyState.UNINSTANTIATED:
      default:
        return 'disconnected';
    }
  }, [readyState]);

  // Очистка подписок при отключении
  useEffect(() => {
    if (readyState === ReadyState.CLOSED || readyState === ReadyState.CLOSING) {
      setSubscribedTripIds(new Set());
    }
  }, [readyState]);

  // Лог изменений соединения
  useEffect(() => {
    console.log('🔌 WebSocket status changed:', connectionStatus);
  }, [connectionStatus]);

  // Возвращаем API хука
  return {
    connectionStatus,
    lastUpdate,
    subscribe,
    unsubscribe,
    isSubscribed,
    error,
    
    // Дополнительные методы для отладки
    sendHeartbeat,
    subscribedTrips: Array.from(subscribedTripIds),
    readyState,
    getWebSocket
  } as UseGroupTripsWebSocket & {
    sendHeartbeat: () => void;
    subscribedTrips: string[];
    readyState: ReadyState;
    getWebSocket: () => WebSocket | null;
  };
}

// Вспомогательный хук для множественных подписок
export function useGroupTripSubscriptions(tripIds: string[] = []) {
  // Получаем правильный WebSocket URL из конфигурации
  const wsConfig = getWebSocketConfig();
  
  const {
    subscribe,
    unsubscribe,
    connectionStatus,
    lastUpdate,
    error
  } = useGroupTripsWebSocket({
    url: wsConfig.wsUrl
  });

  // Автоматическая подписка и отписка при изменении списка
  useEffect(() => {
    if (connectionStatus === 'connected' && tripIds.length > 0) {
      subscribe(tripIds);
      
      return () => {
        unsubscribe(tripIds);
      };
    }
  }, [tripIds, connectionStatus, subscribe, unsubscribe]);

  return {
    connectionStatus,
    lastUpdate,
    error,
    isConnected: connectionStatus === 'connected'
  };
}

// Хук для статистики WebSocket
export function useWebSocketStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/group-trips/ws');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('❌ Failed to fetch WebSocket stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    fetchStats,
    refresh: fetchStats
  };
}