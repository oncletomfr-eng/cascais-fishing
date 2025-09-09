/**
 * Robust Stream Chat Connection Manager
 * Solves WebSocket connection timeouts with multiple fallback strategies
 * 
 * Features:
 * - Exponential backoff retry mechanism
 * - Multiple connection strategies
 * - Connection health monitoring
 * - Network diagnostics
 * - Graceful degradation
 */

import { StreamChat } from 'stream-chat';
import type { UserResponse } from 'stream-chat';

// Connection strategies enum
export enum ConnectionStrategy {
  DIRECT_WEBSOCKET = 'direct_websocket',
  EXTENDED_TIMEOUT = 'extended_timeout',
  MULTIPLE_PORTS = 'multiple_ports',
  LONG_POLLING = 'long_polling',
  SSE_FALLBACK = 'sse_fallback'
}

// Connection state enum
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
  DEGRADED = 'degraded'
}

// Connection quality indicators
export enum ConnectionQuality {
  EXCELLENT = 'excellent',  // < 2s connection, stable
  GOOD = 'good',           // 2-8s connection, occasional drops
  POOR = 'poor',           // 8-15s connection, frequent issues
  CRITICAL = 'critical'    // > 15s connection, very unstable
}

// Configuration interface
export interface RobustConnectionConfig {
  // Timeout configurations
  baseTimeout: number;           // Base timeout in ms (default: 15000)
  maxTimeout: number;            // Maximum timeout in ms (default: 60000)
  extendedTimeout: number;       // Extended timeout for slow networks (default: 90000)
  
  // Retry configurations
  maxRetries: number;            // Maximum retry attempts (default: 5)
  retryMultiplier: number;       // Exponential backoff multiplier (default: 1.5)
  retryRandomization: number;    // Jitter factor 0-1 (default: 0.3)
  
  // Strategy configurations
  enableMultipleStrategies: boolean;  // Enable fallback strategies (default: true)
  enableNetworkDiagnostics: boolean;  // Enable network diagnostics (default: true)
  enableConnectionCache: boolean;      // Enable connection caching (default: true)
  
  // Monitoring configurations
  heartbeatInterval: number;           // Connection health check interval (default: 30000)
  qualityCheckInterval: number;        // Connection quality assessment (default: 5000)
  
  // Fallback configurations
  enableLongPolling: boolean;          // Enable long-polling fallback (default: true)
  enableSSEFallback: boolean;          // Enable SSE-only mode (default: true)
}

// Default configuration
export const DEFAULT_ROBUST_CONFIG: RobustConnectionConfig = {
  baseTimeout: 15000,
  maxTimeout: 60000,
  extendedTimeout: 90000,
  maxRetries: 5,
  retryMultiplier: 1.5,
  retryRandomization: 0.3,
  enableMultipleStrategies: true,
  enableNetworkDiagnostics: true,
  enableConnectionCache: true,
  heartbeatInterval: 30000,
  qualityCheckInterval: 5000,
  enableLongPolling: true,
  enableSSEFallback: true
};

// Connection attempt result
export interface ConnectionAttemptResult {
  success: boolean;
  strategy: ConnectionStrategy;
  duration: number;
  error?: Error;
  quality: ConnectionQuality;
  diagnostics: NetworkDiagnostics;
}

// Network diagnostics
export interface NetworkDiagnostics {
  latency?: number;
  bandwidth?: 'high' | 'medium' | 'low';
  connectivity: 'excellent' | 'good' | 'poor' | 'offline';
  restrictions: {
    websocketBlocked: boolean;
    corporateFirewall: boolean;
    portRestrictions: string[];
  };
  region: string;
  timestamp: Date;
}

// Connection event types
export type ConnectionEventType = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error' 
  | 'quality-changed'
  | 'fallback-activated';

// Connection event data
export interface ConnectionEvent {
  type: ConnectionEventType;
  state: ConnectionState;
  quality: ConnectionQuality;
  strategy: ConnectionStrategy;
  attempt: number;
  error?: Error;
  diagnostics?: NetworkDiagnostics;
  timestamp: Date;
}

// Event listener type
export type ConnectionEventListener = (event: ConnectionEvent) => void;

/**
 * Robust Connection Manager Class
 */
export class RobustStreamChatConnectionManager {
  private config: RobustConnectionConfig;
  private client: StreamChat | null = null;
  private currentState: ConnectionState = ConnectionState.DISCONNECTED;
  private currentQuality: ConnectionQuality = ConnectionQuality.EXCELLENT;
  private currentStrategy: ConnectionStrategy = ConnectionStrategy.DIRECT_WEBSOCKET;
  private currentAttempt: number = 0;
  private eventListeners: ConnectionEventListener[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private qualityCheckInterval: NodeJS.Timeout | null = null;
  private lastConnectionTime: number = 0;
  private connectionHistory: ConnectionAttemptResult[] = [];

  constructor(config: Partial<RobustConnectionConfig> = {}) {
    this.config = { ...DEFAULT_ROBUST_CONFIG, ...config };
  }

  /**
   * Main connection method with robust retry mechanism
   */
  public async connectUser(
    apiKey: string,
    userObject: { id: string; name?: string; image?: string; [key: string]: any },
    tokenOrProvider: string | (() => Promise<string>)
  ): Promise<{ user: UserResponse; client: StreamChat }> {
    this.emitEvent('connecting', ConnectionState.CONNECTING);
    
    // Run network diagnostics first
    const diagnostics = await this.performNetworkDiagnostics();
    
    // Determine optimal strategy based on diagnostics
    const strategies = this.selectOptimalStrategies(diagnostics);
    
    let lastError: Error | null = null;
    
    // Try each strategy with retries
    for (const strategy of strategies) {
      this.currentStrategy = strategy;
      
      for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
        this.currentAttempt = attempt;
        
        try {
          console.log(`🔌 Connection attempt ${attempt}/${this.config.maxRetries} using ${strategy}`);
          
          const result = await this.attemptConnection(
            apiKey, 
            userObject, 
            tokenOrProvider, 
            strategy, 
            attempt,
            diagnostics
          );
          
          if (result.success && this.client) {
            this.handleSuccessfulConnection(result);
            return { 
              user: result as any, // Stream Chat user response
              client: this.client 
            };
          }
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`❌ Connection attempt ${attempt} failed with ${strategy}:`, error);
          
          // Wait before retry with exponential backoff
          if (attempt < this.config.maxRetries) {
            const delay = this.calculateRetryDelay(attempt);
            console.log(`⏳ Waiting ${delay}ms before retry...`);
            await this.sleep(delay);
          }
        }
      }
    }
    
    // All strategies failed
    this.handleConnectionFailure(lastError || new Error('All connection strategies failed'));
    throw lastError || new Error('Failed to establish Stream Chat connection after all attempts');
  }

  /**
   * Attempt connection with specific strategy
   */
  private async attemptConnection(
    apiKey: string,
    userObject: any,
    tokenOrProvider: string | (() => Promise<string>),
    strategy: ConnectionStrategy,
    attempt: number,
    diagnostics: NetworkDiagnostics
  ): Promise<ConnectionAttemptResult> {
    const startTime = Date.now();
    
    try {
      // Get or create client with strategy-specific options
      const client = this.getClientForStrategy(apiKey, strategy);
      
      // Determine timeout based on strategy and network conditions
      const timeout = this.calculateTimeoutForStrategy(strategy, diagnostics, attempt);
      
      console.log(`📊 Using timeout: ${timeout}ms for ${strategy} (attempt ${attempt})`);
      
      // Create connection promise with timeout
      const connectionPromise = this.createConnectionPromise(client, userObject, tokenOrProvider);
      const timeoutPromise = this.createTimeoutPromise(timeout, strategy);
      
      // Race connection vs timeout
      const result = await Promise.race([connectionPromise, timeoutPromise]);
      
      const duration = Date.now() - startTime;
      const quality = this.assessConnectionQuality(duration, strategy);
      
      // Store successful client
      this.client = client;
      
      return {
        success: true,
        strategy,
        duration,
        quality,
        diagnostics
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const quality = this.assessConnectionQuality(duration, strategy, true);
      
      return {
        success: false,
        strategy,
        duration,
        error: error as Error,
        quality,
        diagnostics
      };
    }
  }

  /**
   * Get StreamChat client configured for specific strategy
   */
  private getClientForStrategy(apiKey: string, strategy: ConnectionStrategy): StreamChat {
    const baseOptions = {
      timeout: this.config.baseTimeout,
      logger: this.config.enableNetworkDiagnostics ? this.createLogger() : undefined
    };

    switch (strategy) {
      case ConnectionStrategy.EXTENDED_TIMEOUT:
        return StreamChat.getInstance(apiKey, {
          ...baseOptions,
          timeout: this.config.extendedTimeout
        });

      case ConnectionStrategy.MULTIPLE_PORTS:
        // Try different base URLs/ports if available
        return StreamChat.getInstance(apiKey, {
          ...baseOptions,
          baseURL: 'https://chat.stream-io-api.com'  // Could try different endpoints
        });

      case ConnectionStrategy.LONG_POLLING:
        // Configure for long-polling if Stream Chat supports it
        return StreamChat.getInstance(apiKey, {
          ...baseOptions,
          timeout: this.config.maxTimeout,
          // Note: Stream Chat JS SDK doesn't have direct long-polling mode
          // This would be a fallback mechanism
        });

      default:
        return StreamChat.getInstance(apiKey, baseOptions);
    }
  }

  /**
   * Calculate timeout based on strategy and network conditions
   */
  private calculateTimeoutForStrategy(
    strategy: ConnectionStrategy, 
    diagnostics: NetworkDiagnostics,
    attempt: number
  ): number {
    let baseTimeout = this.config.baseTimeout;

    // Adjust based on strategy
    switch (strategy) {
      case ConnectionStrategy.EXTENDED_TIMEOUT:
        baseTimeout = this.config.extendedTimeout;
        break;
      case ConnectionStrategy.LONG_POLLING:
        baseTimeout = this.config.maxTimeout;
        break;
    }

    // Adjust based on network conditions
    if (diagnostics.connectivity === 'poor') {
      baseTimeout *= 2;
    } else if (diagnostics.connectivity === 'good') {
      baseTimeout *= 1.5;
    }

    // Adjust based on attempt number (progressive timeout increase)
    const progressiveTimeout = baseTimeout * Math.pow(1.2, attempt - 1);

    // Cap at maximum timeout
    return Math.min(progressiveTimeout, this.config.maxTimeout);
  }

  /**
   * Create connection promise
   */
  private async createConnectionPromise(
    client: StreamChat,
    userObject: any,
    tokenOrProvider: string | (() => Promise<string>)
  ): Promise<UserResponse> {
    // Use token provider for better token refresh handling
    if (typeof tokenOrProvider === 'function') {
      return await client.connectUser(userObject, tokenOrProvider);
    } else {
      return await client.connectUser(userObject, tokenOrProvider);
    }
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(timeout: number, strategy: ConnectionStrategy): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(
          `${strategy} connection timeout after ${timeout}ms. ` +
          `This may indicate network restrictions or server unavailability.`
        ));
      }, timeout);
    });
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = Math.pow(this.config.retryMultiplier, attempt - 1) * 1000;
    const jitter = exponentialDelay * this.config.retryRandomization * Math.random();
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  /**
   * Assess connection quality based on duration and success
   */
  private assessConnectionQuality(
    duration: number, 
    strategy: ConnectionStrategy,
    failed: boolean = false
  ): ConnectionQuality {
    if (failed) return ConnectionQuality.CRITICAL;
    
    if (duration < 2000) return ConnectionQuality.EXCELLENT;
    if (duration < 8000) return ConnectionQuality.GOOD;
    if (duration < 15000) return ConnectionQuality.POOR;
    return ConnectionQuality.CRITICAL;
  }

  /**
   * Perform network diagnostics
   */
  private async performNetworkDiagnostics(): Promise<NetworkDiagnostics> {
    const diagnostics: NetworkDiagnostics = {
      connectivity: 'excellent',
      restrictions: {
        websocketBlocked: false,
        corporateFirewall: false,
        portRestrictions: []
      },
      region: 'unknown',
      timestamp: new Date()
    };

    try {
      // Test basic connectivity
      const connectivityTest = await this.testBasicConnectivity();
      diagnostics.connectivity = connectivityTest.connectivity;
      diagnostics.latency = connectivityTest.latency;

      // Test WebSocket capability
      const wsTest = await this.testWebSocketCapability();
      diagnostics.restrictions.websocketBlocked = !wsTest.supported;

      // Detect potential restrictions
      diagnostics.restrictions.corporateFirewall = this.detectCorporateFirewall();

      return diagnostics;

    } catch (error) {
      console.warn('Network diagnostics failed:', error);
      diagnostics.connectivity = 'poor';
      return diagnostics;
    }
  }

  /**
   * Test basic connectivity
   */
  private async testBasicConnectivity(): Promise<{
    connectivity: 'excellent' | 'good' | 'poor' | 'offline';
    latency?: number;
  }> {
    try {
      const start = Date.now();
      
      // Test connection to a reliable endpoint
      const response = await fetch('https://api.github.com/zen', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const latency = Date.now() - start;
      
      if (!response.ok) {
        return { connectivity: 'poor', latency };
      }
      
      if (latency < 100) return { connectivity: 'excellent', latency };
      if (latency < 300) return { connectivity: 'good', latency };
      return { connectivity: 'poor', latency };
      
    } catch (error) {
      return { connectivity: 'offline' };
    }
  }

  /**
   * Test WebSocket capability
   */
  private async testWebSocketCapability(): Promise<{ supported: boolean; blocked?: boolean }> {
    return new Promise((resolve) => {
      try {
        // Test WebSocket connection to a public endpoint
        const testWs = new WebSocket('wss://echo.websocket.org');
        
        const timeout = setTimeout(() => {
          testWs.close();
          resolve({ supported: false, blocked: true });
        }, 5000);

        testWs.onopen = () => {
          clearTimeout(timeout);
          testWs.close();
          resolve({ supported: true });
        };

        testWs.onerror = () => {
          clearTimeout(timeout);
          resolve({ supported: false, blocked: true });
        };

      } catch (error) {
        resolve({ supported: false });
      }
    });
  }

  /**
   * Detect corporate firewall patterns
   */
  private detectCorporateFirewall(): boolean {
    // Heuristic detection based on common corporate network patterns
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent;
      const hostname = window.location.hostname;
      
      // Check for corporate network indicators
      return (
        hostname.includes('corporate') ||
        hostname.includes('intranet') ||
        userAgent.includes('CorporateProxy') ||
        // Add more heuristics as needed
        false
      );
    }
    
    return false;
  }

  /**
   * Select optimal connection strategies based on diagnostics
   */
  private selectOptimalStrategies(diagnostics: NetworkDiagnostics): ConnectionStrategy[] {
    const strategies: ConnectionStrategy[] = [];

    // Always try direct WebSocket first
    strategies.push(ConnectionStrategy.DIRECT_WEBSOCKET);

    // Add strategies based on network conditions
    if (diagnostics.connectivity === 'poor') {
      strategies.push(ConnectionStrategy.EXTENDED_TIMEOUT);
    }

    if (diagnostics.restrictions.websocketBlocked) {
      strategies.push(ConnectionStrategy.MULTIPLE_PORTS);
      if (this.config.enableLongPolling) {
        strategies.push(ConnectionStrategy.LONG_POLLING);
      }
    } else {
      strategies.push(ConnectionStrategy.EXTENDED_TIMEOUT);
    }

    // SSE fallback as last resort
    if (this.config.enableSSEFallback) {
      strategies.push(ConnectionStrategy.SSE_FALLBACK);
    }

    return strategies;
  }

  /**
   * Handle successful connection
   */
  private handleSuccessfulConnection(result: ConnectionAttemptResult): void {
    this.currentState = ConnectionState.CONNECTED;
    this.currentQuality = result.quality;
    this.lastConnectionTime = Date.now();
    this.connectionHistory.push(result);

    // Start health monitoring
    this.startHealthMonitoring();

    this.emitEvent('connected', ConnectionState.CONNECTED, result);
    
    console.log(`✅ Stream Chat connected successfully with ${result.strategy} in ${result.duration}ms`);
  }

  /**
   * Handle connection failure
   */
  private handleConnectionFailure(error: Error): void {
    this.currentState = ConnectionState.FAILED;
    this.currentQuality = ConnectionQuality.CRITICAL;
    
    this.emitEvent('error', ConnectionState.FAILED, { error });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    // Heartbeat monitoring
    this.heartbeatInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.heartbeatInterval);

    // Quality monitoring
    this.qualityCheckInterval = setInterval(() => {
      this.assessCurrentQuality();
    }, this.config.qualityCheckInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.client || this.currentState !== ConnectionState.CONNECTED) return;

    try {
      // Simple health check - query current user
      await this.client.queryUsers({ id: this.client.user?.id });
      // Connection is healthy
    } catch (error) {
      console.warn('Health check failed:', error);
      this.currentState = ConnectionState.DEGRADED;
      this.emitEvent('error', ConnectionState.DEGRADED, { error: error as Error });
    }
  }

  /**
   * Assess current connection quality
   */
  private assessCurrentQuality(): void {
    // Implementation would assess current connection quality
    // based on recent latency, errors, etc.
  }

  /**
   * Create logger for diagnostics
   */
  private createLogger() {
    return (level: string, message: string, extraData?: any) => {
      if (this.config.enableNetworkDiagnostics) {
        console.log(`[Stream Chat ${level.toUpperCase()}]`, message, extraData);
      }
    };
  }

  /**
   * Emit connection event
   */
  private emitEvent(
    type: ConnectionEventType, 
    state: ConnectionState, 
    additionalData?: any
  ): void {
    const event: ConnectionEvent = {
      type,
      state,
      quality: this.currentQuality,
      strategy: this.currentStrategy,
      attempt: this.currentAttempt,
      timestamp: new Date(),
      ...additionalData
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: ConnectionEventListener): () => void {
    this.eventListeners.push(listener);
    return () => {
      const index = this.eventListeners.indexOf(listener);
      if (index > -1) {
        this.eventListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats() {
    return {
      currentState: this.currentState,
      currentQuality: this.currentQuality,
      currentStrategy: this.currentStrategy,
      currentAttempt: this.currentAttempt,
      lastConnectionTime: this.lastConnectionTime,
      connectionHistory: this.connectionHistory,
      isConnected: this.currentState === ConnectionState.CONNECTED
    };
  }

  /**
   * Disconnect user and cleanup
   */
  public async disconnect(): Promise<void> {
    // Clear intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }

    // Disconnect client
    if (this.client) {
      try {
        await this.client.disconnectUser();
      } catch (error) {
        console.error('Error disconnecting user:', error);
      }
      this.client = null;
    }

    this.currentState = ConnectionState.DISCONNECTED;
    this.emitEvent('disconnected', ConnectionState.DISCONNECTED);
  }

  /**
   * Utility method to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create retryable token provider for better error handling
 */
export function createRetryableTokenProvider(
  tokenFetcher: () => Promise<string>,
  maxRetries: number = 3
): () => Promise<string> {
  return async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await tokenFetcher();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Token fetch attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Token fetch failed after all retries');
  };
}
