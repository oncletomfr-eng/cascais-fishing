/**
 * Stream Chat Production Configuration
 * Task 22.1: Production API Key Setup
 * 
 * Production-ready configuration for Stream Chat with:
 * - Environment validation
 * - Security checks
 * - Error handling
 * - Monitoring integration
 */

import { StreamChat } from 'stream-chat';

// Environment validation
interface StreamChatConfig {
  apiKey: string;
  apiSecret: string;
  environment: 'development' | 'production' | 'staging';
  baseURL?: string;
  timeout?: number;
  enableLogging?: boolean;
}

// Validate environment variables
function validateEnvironment(): StreamChatConfig {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
  const apiSecret = process.env.STREAM_CHAT_API_SECRET;
  const environment = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'staging';
  
  // Validate required variables
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_STREAM_CHAT_API_KEY environment variable is required');
  }
  
  if (!apiSecret && typeof window === 'undefined') {
    // API secret is only required on server-side
    throw new Error('STREAM_CHAT_API_SECRET environment variable is required for server-side operations');
  }
  
  // Validate API key format
  if (apiKey.length < 10 || apiKey === 'demo-key' || apiKey === 'demo-key-please-configure') {
    throw new Error('Invalid or demo Stream Chat API key. Please configure a real production API key');
  }
  
  // Validate in production
  if (environment === 'production') {
    if (!apiKey.startsWith('mmhpkn') && !apiKey.startsWith('dz5f4d')) {
      console.warn('⚠️ Stream Chat API key format may not be production-ready');
    }
    
    if (apiSecret && apiSecret.length < 20) {
      throw new Error('Stream Chat API secret appears to be too short for production use');
    }
  }
  
  return {
    apiKey,
    apiSecret: apiSecret || '',
    environment,
    baseURL: process.env.STREAM_CHAT_BASE_URL,
    timeout: Number(process.env.STREAM_CHAT_TIMEOUT) || 10000,
    enableLogging: process.env.STREAM_CHAT_ENABLE_LOGGING === 'true' || environment !== 'production'
  };
}

// Singleton server-side client
let serverClient: StreamChat | null = null;

/**
 * Get Stream Chat server-side client (singleton)
 */
export function getStreamChatServerClient(): StreamChat {
  if (typeof window !== 'undefined') {
    throw new Error('getStreamChatServerClient() can only be called on the server-side');
  }
  
  if (!serverClient) {
    const config = validateEnvironment();
    
    // Initialize server client
    serverClient = StreamChat.getInstance(config.apiKey, config.apiSecret);
    
    // Configure client options for production
    if (config.environment === 'production') {
      // Production-specific configurations
      serverClient.connectAPIClient = {
        ...serverClient.connectAPIClient,
        timeout: config.timeout,
        baseURL: config.baseURL || 'https://chat.stream-io-api.com'
      };
    }
    
    console.log(`✅ Stream Chat server client initialized for ${config.environment} environment`);
  }
  
  return serverClient;
}

/**
 * Get Stream Chat client configuration for client-side
 */
export function getStreamChatClientConfig() {
  if (typeof window === 'undefined') {
    throw new Error('getStreamChatClientConfig() can only be called on the client-side');
  }
  
  const config = validateEnvironment();
  
  return {
    apiKey: config.apiKey,
    environment: config.environment,
    enableLogging: config.enableLogging,
    timeout: config.timeout
  };
}

/**
 * Test Stream Chat connection
 */
export async function testStreamChatConnection(): Promise<{
  success: boolean;
  message: string;
  environment: string;
  apiKeyValid: boolean;
}> {
  try {
    const config = validateEnvironment();
    
    // Test server-side connection if API secret is available
    if (config.apiSecret && typeof window === 'undefined') {
      const client = getStreamChatServerClient();
      
      // Test connection by fetching app info
      const appInfo = await client.getAppInfo();
      
      return {
        success: true,
        message: `Stream Chat connected successfully to app: ${appInfo.app?.name || 'Unknown'}`,
        environment: config.environment,
        apiKeyValid: true
      };
    }
    
    // Client-side or no secret - just validate configuration
    return {
      success: true,
      message: 'Stream Chat configuration validated successfully',
      environment: config.environment,
      apiKeyValid: true
    };
    
  } catch (error) {
    console.error('❌ Stream Chat connection test failed:', error);
    
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown connection error',
      environment: process.env.NODE_ENV || 'development',
      apiKeyValid: false
    };
  }
}

/**
 * Generate secure user token with validation
 */
export async function generateUserToken(
  userId: string,
  userData?: {
    name?: string;
    email?: string;
    image?: string;
    role?: string;
    [key: string]: any;
  }
): Promise<{
  token: string;
  user: any;
  expiresAt?: Date;
}> {
  if (typeof window !== 'undefined') {
    throw new Error('generateUserToken() can only be called on the server-side');
  }
  
  // Validate input
  if (!userId || typeof userId !== 'string' || userId.length < 1) {
    throw new Error('Valid userId is required for token generation');
  }
  
  try {
    const client = getStreamChatServerClient();
    
    // Create or update user data
    const streamUser = {
      id: userId,
      name: userData?.name || 'Anonymous User',
      email: userData?.email || '',
      image: userData?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || 'User')}&background=0ea5e9&color=fff`,
      role: userData?.role || 'user',
      // Fishing app specific fields
      isOnline: true,
      lastSeen: new Date().toISOString(),
      profile_type: 'fisher',
      // Additional metadata
      ...userData
    };
    
    // Update/create user on Stream Chat
    await client.upsertUser(streamUser);
    
    // Generate token with optional expiration
    const tokenOptions = process.env.NODE_ENV === 'production' 
      ? { exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 } // 24 hours in production
      : undefined; // No expiration in development
    
    const token = client.createUserToken(userId, tokenOptions?.exp);
    
    console.log(`🔑 Generated Stream Chat token for user: ${userId}`);
    
    return {
      token,
      user: streamUser,
      expiresAt: tokenOptions?.exp ? new Date(tokenOptions.exp * 1000) : undefined
    };
    
  } catch (error) {
    console.error(`❌ Failed to generate token for user ${userId}:`, error);
    throw new Error(`Token generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create or get channel with proper configuration
 */
export async function createTripChannel(
  tripId: string,
  creatorId: string,
  channelData: {
    name?: string;
    description?: string;
    tripDate?: string;
    participants?: string[];
    isPublic?: boolean;
  } = {}
) {
  if (typeof window !== 'undefined') {
    throw new Error('createTripChannel() can only be called on the server-side');
  }
  
  try {
    const client = getStreamChatServerClient();
    
    const channelId = `trip-${tripId}`;
    const channelOptions = {
      name: channelData.name || `Trip ${tripId} Chat`,
      description: channelData.description || `Group chat for fishing trip ${tripId}`,
      created_by_id: creatorId,
      // Trip-specific metadata
      trip_id: tripId,
      trip_date: channelData.tripDate,
      channel_type: 'trip_chat',
      is_public: channelData.isPublic || false,
      // Moderation settings
      automod: 'AI',
      automod_behavior: 'block',
      // File sharing settings
      max_message_length: 2000,
      // Member permissions
      members: channelData.participants || [creatorId]
    };
    
    // Create channel
    const channel = client.channel('messaging', channelId, channelOptions);
    await channel.create();
    
    console.log(`📱 Created trip channel: ${channelId} for trip: ${tripId}`);
    
    return {
      channelId,
      channel,
      channelOptions
    };
    
  } catch (error) {
    console.error(`❌ Failed to create trip channel for ${tripId}:`, error);
    throw new Error(`Channel creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Health check for Stream Chat service
 */
export async function streamChatHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy' | 'degraded';
  checks: Record<string, boolean>;
  message: string;
  timestamp: Date;
}> {
  const checks = {
    configurationValid: false,
    connectionEstablished: false,
    authenticationWorking: false
  };
  
  try {
    // Check 1: Configuration validation
    const config = validateEnvironment();
    checks.configurationValid = true;
    
    // Check 2: Connection test (server-side only)
    if (typeof window === 'undefined' && config.apiSecret) {
      const client = getStreamChatServerClient();
      await client.getAppInfo();
      checks.connectionEstablished = true;
      
      // Check 3: Token generation test
      const testToken = client.createUserToken('health-check-user');
      checks.authenticationWorking = !!testToken;
    }
    
    const allHealthy = Object.values(checks).every(check => check);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      message: allHealthy ? 'All Stream Chat services operational' : 'Some Stream Chat services may be degraded',
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error('❌ Stream Chat health check failed:', error);
    
    return {
      status: 'unhealthy',
      checks,
      message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date()
    };
  }
}

// Export configuration for external access
export const streamChatConfig = {
  getServerClient: getStreamChatServerClient,
  getClientConfig: getStreamChatClientConfig,
  testConnection: testStreamChatConnection,
  generateToken: generateUserToken,
  createTripChannel,
  healthCheck: streamChatHealthCheck
};