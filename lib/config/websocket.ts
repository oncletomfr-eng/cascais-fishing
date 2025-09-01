// WebSocket configuration for different environments

export interface WebSocketConfig {
  wsUrl: string;
  heartbeatInterval: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export function getWebSocketConfig(): WebSocketConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  let wsUrl: string;
  
  if (typeof window !== 'undefined') {
    // Client-side URL construction
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // For production, use the production WebSocket URL if configured
    if (isProduction && process.env.NEXT_PUBLIC_WS_URL_PRODUCTION) {
      wsUrl = process.env.NEXT_PUBLIC_WS_URL_PRODUCTION;
    } else if (process.env.NEXT_PUBLIC_WS_URL) {
      // Use environment variable if available
      wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    } else {
      // Fallback to dynamic URL construction
      wsUrl = `${protocol}//${host}/api/group-trips/ws`;
    }
  } else {
    // Server-side fallback
    wsUrl = isProduction 
      ? (process.env.NEXT_PUBLIC_WS_URL_PRODUCTION || 'wss://localhost:3000/api/group-trips/ws')
      : (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/api/group-trips/ws');
  }

  return {
    wsUrl,
    heartbeatInterval: 25000, // 25 seconds
    reconnectInterval: 3000,  // 3 seconds
    maxReconnectAttempts: 10
  };
}

export function getApiUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (typeof window !== 'undefined') {
    // Client-side URL construction
    const protocol = window.location.protocol;
    const host = window.location.host;
    return `${protocol}//${host}`;
  }
  
  // Server-side fallback
  return isProduction 
    ? (process.env.NEXT_PUBLIC_API_URL_PRODUCTION || 'https://localhost:3000')
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
}

export function getStreamChatConfig() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
  const secret = process.env.STREAM_CHAT_API_SECRET; // Исправил имя переменной
  
  return {
    apiKey: apiKey || '',
    secret: secret || '',
    isConfigured: !!(apiKey && secret),
    error: !apiKey ? 'NEXT_PUBLIC_STREAM_CHAT_API_KEY not configured' :
           !secret ? 'STREAM_CHAT_API_SECRET not configured' : null
  };
}

// Проверка конфигурации для production
export function validateProductionConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Проверка WebSocket конфигурации - в продакшне WebSocket может быть отключен, это нормально
  const wsConfig = getWebSocketConfig();
  if (!wsConfig.wsUrl || wsConfig.wsUrl.includes('localhost')) {
    if (process.env.NODE_ENV === 'production') {
      warnings.push('WebSocket URL uses localhost/not configured for production (may be intentionally disabled)');
    } else {
      warnings.push('Using localhost WebSocket URL in development mode');
    }
  }
  
  // Проверка Stream Chat конфигурации - не критично для основной функциональности
  const streamConfig = getStreamChatConfig();
  if (!streamConfig.isConfigured) {
    warnings.push(`Stream Chat not configured: ${streamConfig.error} (chat features will be unavailable)`);
  }
  
  // Проверка API URL - в продакшне может быть авто-определен
  const apiUrl = getApiUrl();
  if (apiUrl.includes('localhost') && process.env.NODE_ENV === 'production') {
    warnings.push('API URL includes localhost in production (using auto-detection)');
  }
  
  // Проверка базы данных - критично!
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL not configured');
  } else {
    // Проверяем, что URL не содержит localhost в продакшне
    if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL.includes('localhost')) {
      errors.push('DATABASE_URL points to localhost in production environment');
    }
  }
  
  // Проверка NextAuth (v5 использует AUTH_SECRET)
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    warnings.push('AUTH_SECRET or NEXTAUTH_SECRET not configured (auth may not work)');
  }
  
  if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL && process.env.NODE_ENV === 'production') {
    warnings.push('AUTH_URL or NEXTAUTH_URL not configured for production (using auto-detection)');
  }
  
  return {
    isValid: errors.length === 0, // Только критичные ошибки влияют на валидность
    errors,
    warnings
  };
}
