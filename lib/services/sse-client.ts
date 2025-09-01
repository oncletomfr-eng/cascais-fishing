// Server-Sent Events (SSE) client for real-time group trip updates
// Replaces WebSocket functionality for Vercel compatibility

import { GroupTripUpdate, ClientMessage } from '@/lib/types/group-events';

export interface SSEClientConfig {
  baseUrl?: string;
  reconnectDelay?: number;
  heartbeatTimeout?: number;
  debug?: boolean;
}

export interface SSESubscription {
  tripIds: string[];
  eventTypes?: string[];
  filters?: {
    weatherAlertsOnly?: boolean;
    biteReportsMinConfidence?: 'low' | 'medium' | 'high';
    routeChangesOnly?: boolean;
  };
}

type EventCallback = (update: GroupTripUpdate) => void;
type ConnectionCallback = (connected: boolean) => void;

export class SSEGroupTripsClient {
  private eventSource: EventSource | null = null;
  private clientId: string | null = null;
  private callbacks: Set<EventCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private config: Required<SSEClientConfig>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  constructor(config: SSEClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      reconnectDelay: config.reconnectDelay || 3000,
      heartbeatTimeout: config.heartbeatTimeout || 45000, // 45 seconds
      debug: config.debug || false
    };
  }

  // Connect to SSE endpoint
  connect(): void {
    if (this.eventSource) {
      this.log('Already connected to SSE');
      return;
    }

    const sseUrl = `${this.config.baseUrl}/api/group-trips/sse`;
    this.log(`Connecting to SSE: ${sseUrl}`);

    try {
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        this.log('SSE connection opened');
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus(true);
        this.startHeartbeatMonitor();
      };

      this.eventSource.onerror = (error) => {
        this.log('SSE connection error:', error);
        this.handleConnectionError();
      };

      // Handle connection established
      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        this.clientId = data.clientId;
        this.log(`SSE connected with client ID: ${this.clientId}`);
      });

      // Handle trip updates
      this.eventSource.addEventListener('trip-update', (event) => {
        try {
          const update: GroupTripUpdate = JSON.parse(event.data);
          this.log(`Received trip update: ${update.type} for trip ${update.tripId}`);
          this.notifyCallbacks(update);
        } catch (error) {
          this.log('Error parsing trip update:', error);
        }
      });

      // Handle heartbeat
      this.eventSource.addEventListener('heartbeat', (event) => {
        this.lastHeartbeat = Date.now();
        this.log('Received SSE heartbeat');
      });

    } catch (error) {
      this.log('Error creating SSE connection:', error);
      this.handleConnectionError();
    }
  }

  // Disconnect from SSE
  disconnect(): void {
    this.log('Disconnecting from SSE');
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.clientId = null;
    this.notifyConnectionStatus(false);
  }

  // Subscribe to specific trips
  async subscribeToTrips(tripIds: string[]): Promise<void> {
    if (!this.clientId) {
      this.log('Cannot subscribe: not connected');
      return;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/group-trips/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: this.clientId,
          action: 'subscribe',
          tripIds
        }),
      });

      if (response.ok) {
        this.log(`Subscribed to trips: ${tripIds.join(', ')}`);
      } else {
        this.log('Failed to subscribe to trips:', await response.text());
      }
    } catch (error) {
      this.log('Error subscribing to trips:', error);
    }
  }

  // Subscribe to event types with filters
  async subscribeToEvents(eventTypes: string[], filters?: SSESubscription['filters']): Promise<void> {
    if (!this.clientId) {
      this.log('Cannot subscribe to events: not connected');
      return;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/api/group-trips/sse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: this.clientId,
          action: 'subscribe_events',
          eventTypes,
          filters
        }),
      });

      if (response.ok) {
        this.log(`Subscribed to event types: ${eventTypes.join(', ')}`);
      } else {
        this.log('Failed to subscribe to event types:', await response.text());
      }
    } catch (error) {
      this.log('Error subscribing to event types:', error);
    }
  }

  // Add callback for trip updates
  onTripUpdate(callback: EventCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  // Add callback for connection status changes
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  // Get current connection status
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  // Get client ID
  getClientId(): string | null {
    return this.clientId;
  }

  // Private methods

  private handleConnectionError(): void {
    this.notifyConnectionStatus(false);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectDelay * this.reconnectAttempts;
      this.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (!this.isConnected()) {
          this.disconnect();
          this.connect();
        }
      }, delay);
    } else {
      this.log('Max reconnection attempts reached');
    }
  }

  private startHeartbeatMonitor(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.lastHeartbeat = Date.now();
    
    this.heartbeatTimer = setInterval(() => {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      
      if (timeSinceLastHeartbeat > this.config.heartbeatTimeout) {
        this.log('Heartbeat timeout detected, reconnecting');
        this.handleConnectionError();
      }
    }, this.config.heartbeatTimeout / 2);
  }

  private notifyCallbacks(update: GroupTripUpdate): void {
    this.callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        this.log('Error in callback:', error);
      }
    });
  }

  private notifyConnectionStatus(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        this.log('Error in connection callback:', error);
      }
    });
  }

  private log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(`[SSE Client] ${message}`, ...args);
    }
  }
}

// Export singleton instance for easy use
export const sseClient = new SSEGroupTripsClient({
  debug: process.env.NODE_ENV === 'development'
});

// Hook for easy React integration
export function useGroupTripsSSE() {
  const [connected, setConnected] = React.useState(false);
  const [updates, setUpdates] = React.useState<GroupTripUpdate[]>([]);
  
  React.useEffect(() => {
    // Connect to SSE
    sseClient.connect();

    // Set up connection status monitoring
    const unsubscribeConnection = sseClient.onConnectionChange(setConnected);

    // Set up trip update listening
    const unsubscribeUpdates = sseClient.onTripUpdate((update) => {
      setUpdates(prev => [...prev.slice(-9), update]); // Keep last 10 updates
    });

    return () => {
      unsubscribeConnection();
      unsubscribeUpdates();
      sseClient.disconnect();
    };
  }, []);

  return {
    connected,
    updates,
    subscribeToTrips: (tripIds: string[]) => sseClient.subscribeToTrips(tripIds),
    subscribeToEvents: (eventTypes: string[], filters?: SSESubscription['filters']) => 
      sseClient.subscribeToEvents(eventTypes, filters),
    client: sseClient
  };
}

// Compatibility function for existing WebSocket code
export function createWebSocketCompatibilityLayer() {
  return {
    connect: () => sseClient.connect(),
    disconnect: () => sseClient.disconnect(),
    subscribe: (tripIds: string[]) => sseClient.subscribeToTrips(tripIds),
    onMessage: (callback: EventCallback) => sseClient.onTripUpdate(callback),
    readyState: sseClient.isConnected() ? 1 : 0, // WebSocket.OPEN = 1
  };
}
