'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangleIcon, RefreshCwIcon, CloudOffIcon } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showRefresh?: boolean;
  onRetry?: () => void;
  className?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

/**
 * Error Boundary specifically designed for Weather components
 * Provides graceful fallback when weather APIs fail
 */
export default class WeatherErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error,
      errorInfo: error.message || 'Weather service temporarily unavailable'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and potentially to error tracking service
    console.error('WeatherErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR'
    });

    // Send error to Sentry in production for monitoring
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      try {
        const Sentry = require('@sentry/nextjs');
        Sentry.captureException(error, { 
          contexts: { 
            react: errorInfo,
            weather: {
              component: 'WeatherErrorBoundary',
              timestamp: new Date().toISOString(),
              userAgent: window.navigator.userAgent
            }
          },
          tags: {
            component: 'weather',
            errorBoundary: 'WeatherErrorBoundary'
          }
        });
      } catch (sentryError) {
        console.warn('Failed to send error to Sentry:', sentryError);
      }
    }
  }

  handleRetry = () => {
    // Reset error state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
    
    // Force a re-render by updating the key of the error boundary
    // This is handled by the parent component
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default weather error UI
      return (
        <Card className={`${this.props.className} border-orange-200`}>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <CloudOffIcon className="h-12 w-12 text-orange-500" />
              
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Погодные данные временно недоступны
                </h3>
                <p className="text-sm text-gray-600">
                  {this.state.errorInfo || 'Не удалось загрузить данные о погоде'}
                </p>
              </div>

              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangleIcon className="h-4 w-4" />
                <AlertDescription>
                  Возможные причины: проблемы с интернет-соединением, временная недоступность 
                  погодных сервисов или превышение лимитов API. Попробуйте обновить страницу 
                  через несколько минут.
                </AlertDescription>
              </Alert>

              {this.props.showRefresh !== false && (
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline" 
                  size="sm"
                  className="mt-4"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Попробовать снова
                </Button>
              )}

              <div className="text-xs text-gray-500 mt-4">
                <details>
                  <summary className="cursor-pointer hover:text-gray-700">
                    Техническая информация
                  </summary>
                  <pre className="text-left mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                    {JSON.stringify({
                      error: this.state.error?.name,
                      message: this.state.error?.message,
                      timestamp: new Date().toISOString()
                    }, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap weather components with error boundary
 */
export function withWeatherErrorBoundary<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WithWeatherErrorBoundary = (props: T) => {
    return (
      <WeatherErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </WeatherErrorBoundary>
    );
  };

  WithWeatherErrorBoundary.displayName = `withWeatherErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithWeatherErrorBoundary;
}

/**
 * Hook to manually trigger error boundary (for functional components)
 */
export function useWeatherErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const throwError = React.useCallback((error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { throwError, resetError };
}
