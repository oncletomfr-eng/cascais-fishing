'use client';

/**
 * Enhanced Error Logging Utility with Sentry Integration
 * Provides consistent error tracking across the application
 */

interface ErrorContext {
  component?: string;
  user?: {
    id?: string;
    email?: string;
  };
  request?: {
    url?: string;
    method?: string;
    userAgent?: string;
  };
  extra?: Record<string, any>;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

class CascaisLogger {
  private isProduction: boolean;
  private sentry: any = null;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize Sentry only in browser environment and production
    if (typeof window !== 'undefined' && this.isProduction) {
      try {
        this.sentry = require('@sentry/nextjs');
      } catch (error) {
        console.warn('Sentry not available:', error);
      }
    }
  }

  /**
   * Log authentication-related errors
   */
  authError(message: string, error?: Error, context?: ErrorContext) {
    const logData = {
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      category: 'authentication',
      ...context
    };

    console.error('🔐 AUTH ERROR:', logData);

    if (this.sentry && this.isProduction) {
      this.sentry.captureException(error || new Error(message), {
        contexts: { 
          auth: context,
          custom: { category: 'authentication' }
        },
        tags: { 
          component: context?.component || 'auth',
          category: 'authentication'
        }
      });
    }
  }

  /**
   * Log API-related errors
   */
  apiError(message: string, error?: Error, context?: ErrorContext & { 
    endpoint?: string; 
    statusCode?: number;
    responseTime?: number;
  }) {
    const logData = {
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      category: 'api',
      endpoint: context?.endpoint,
      statusCode: context?.statusCode,
      responseTime: context?.responseTime,
      ...context
    };

    console.error('🌐 API ERROR:', logData);

    if (this.sentry && this.isProduction) {
      this.sentry.captureException(error || new Error(message), {
        contexts: { 
          api: {
            endpoint: context?.endpoint,
            statusCode: context?.statusCode,
            responseTime: context?.responseTime
          },
          custom: { category: 'api' }
        },
        tags: { 
          component: context?.component || 'api',
          category: 'api',
          endpoint: context?.endpoint
        }
      });
    }
  }

  /**
   * Log weather service errors
   */
  weatherError(message: string, error?: Error, context?: ErrorContext & {
    service?: 'open-meteo' | 'tomorrow-io' | 'openweather';
    coordinates?: { lat: number; lng: number };
  }) {
    const logData = {
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      category: 'weather',
      service: context?.service,
      coordinates: context?.coordinates,
      ...context
    };

    console.error('🌤️ WEATHER ERROR:', logData);

    if (this.sentry && this.isProduction) {
      this.sentry.captureException(error || new Error(message), {
        contexts: { 
          weather: {
            service: context?.service,
            coordinates: context?.coordinates
          },
          custom: { category: 'weather' }
        },
        tags: { 
          component: context?.component || 'weather',
          category: 'weather',
          service: context?.service
        }
      });
    }
  }

  /**
   * Log general application warnings
   */
  warn(message: string, context?: ErrorContext) {
    const logData = {
      message,
      timestamp: new Date().toISOString(),
      level: LogLevel.WARN,
      ...context
    };

    console.warn('⚠️ WARNING:', logData);

    if (this.sentry && this.isProduction) {
      this.sentry.captureMessage(message, 'warning', {
        contexts: { custom: context },
        tags: { 
          component: context?.component || 'general',
          level: LogLevel.WARN
        }
      });
    }
  }

  /**
   * Log critical system errors
   */
  critical(message: string, error?: Error, context?: ErrorContext) {
    const logData = {
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      severity: 'critical',
      ...context
    };

    console.error('🚨 CRITICAL ERROR:', logData);

    if (this.sentry && this.isProduction) {
      this.sentry.captureException(error || new Error(message), {
        level: 'fatal',
        contexts: { 
          critical: context,
          custom: { severity: 'critical' }
        },
        tags: { 
          component: context?.component || 'system',
          severity: 'critical'
        }
      });
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id?: string; email?: string; name?: string }) {
    if (this.sentry && this.isProduction) {
      this.sentry.setUser(user);
    }
  }

  /**
   * Set additional context for error tracking
   */
  setContext(key: string, context: Record<string, any>) {
    if (this.sentry && this.isProduction) {
      this.sentry.setContext(key, context);
    }
  }

  /**
   * Performance monitoring for API calls
   */
  startApiTimer(endpoint: string) {
    const startTime = performance.now();
    
    return {
      finish: (success: boolean, statusCode?: number, error?: Error) => {
        const duration = performance.now() - startTime;
        
        if (success) {
          console.debug(`⚡ API Success: ${endpoint} (${duration.toFixed(2)}ms)`);
        } else {
          this.apiError(`API call failed: ${endpoint}`, error, {
            endpoint,
            statusCode,
            responseTime: duration,
            component: 'api-monitor'
          });
        }
        
        return duration;
      }
    };
  }
}

// Export singleton instance
export const logger = new CascaisLogger();

// Convenience exports
export const logAuthError = logger.authError.bind(logger);
export const logApiError = logger.apiError.bind(logger);
export const logWeatherError = logger.weatherError.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logCritical = logger.critical.bind(logger);
