'use client';

import React, { ReactNode, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundaries/ErrorBoundary';

interface ErrorProviderProps {
  children: ReactNode;
}

// Глобальный обработчик необработанных ошибок
const setupGlobalErrorHandlers = () => {
  // Обработка необработанных promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('🚨 Unhandled Promise Rejection:', event.reason);
    
    // Отправляем отчет об ошибке
    const errorReport = {
      id: Math.random().toString(36).substring(2, 15),
      error: {
        name: 'UnhandledPromiseRejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      },
      errorInfo: {
        componentStack: 'N/A (Promise Rejection)',
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: 'critical' as const,
      boundaryName: 'Global Promise Handler',
    };

    // Отправляем в API
    fetch('/api/error-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(reportError => {
      console.error('Failed to report unhandled rejection:', reportError);
    });

    // Предотвращаем вывод в консоль браузера
    event.preventDefault();
  };

  // Обработка JavaScript ошибок
  const handleError = (event: ErrorEvent) => {
    console.error('🚨 Global Error:', event.error);
    
    // Отправляем отчет об ошибке
    const errorReport = {
      id: Math.random().toString(36).substring(2, 15),
      error: {
        name: event.error?.name || 'GlobalError',
        message: event.message || 'Unknown error',
        stack: event.error?.stack,
      },
      errorInfo: {
        componentStack: `N/A (Global Error at ${event.filename}:${event.lineno}:${event.colno})`,
      },
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      level: 'critical' as const,
      boundaryName: 'Global Error Handler',
    };

    // Отправляем в API
    fetch('/api/error-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(reportError => {
      console.error('Failed to report global error:', reportError);
    });
  };

  // Обработка ошибок Resource Loading (CSS, JS, изображения)
  const handleResourceError = (event: Event) => {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'IMG' || target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
      console.warn('🚨 Resource Load Error:', target);
      
      const errorReport = {
        id: Math.random().toString(36).substring(2, 15),
        error: {
          name: 'ResourceLoadError',
          message: `Failed to load ${target.tagName}: ${(target as any).src || (target as any).href}`,
          stack: undefined,
        },
        errorInfo: {
          componentStack: `Resource: ${target.outerHTML}`,
        },
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        level: 'component' as const,
        boundaryName: 'Resource Loader',
      };

      // Отправляем в API (только для критичных ресурсов)
      if (target.tagName === 'SCRIPT') {
        fetch('/api/error-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorReport),
        }).catch(() => {
          // Игнорируем ошибки отправки для resource errors
        });
      }
    }
  };

  // Регистрируем обработчики
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);
    window.addEventListener('error', handleResourceError, true); // Capture phase для ресурсов
    
    // Cleanup функция
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      window.removeEventListener('error', handleResourceError, true);
    };
  }

  return () => {};
};

// Обработчик ошибок для самого ErrorProvider
const handleProviderError = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error('🚨 Critical Error in ErrorProvider:', error);
  
  // Последняя попытка отправить отчет
  const errorReport = {
    id: Math.random().toString(36).substring(2, 15),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    errorInfo: {
      componentStack: errorInfo.componentStack,
    },
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    level: 'critical' as const,
    boundaryName: 'ErrorProvider',
  };

  // Пытаемся отправить отчет
  if (typeof window !== 'undefined') {
    fetch('/api/error-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorReport),
    }).catch(() => {
      // Если не получается отправить - используем console
      console.error('Failed to report critical ErrorProvider error');
    });
  }
};

// Fallback UI для критических ошибок ErrorProvider
const CriticalErrorFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-red-600 text-2xl">⚠️</span>
      </div>
      <h1 className="text-xl font-bold text-red-800 mb-2">
        Критическая ошибка системы
      </h1>
      <p className="text-red-700 mb-4">
        Произошла серьезная ошибка в системе обработки ошибок. 
        Пожалуйста, перезагрузите страницу.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
      >
        Перезагрузить страницу
      </button>
    </div>
  </div>
);

export function ErrorProvider({ children }: ErrorProviderProps) {
  useEffect(() => {
    // Настраиваем глобальные обработчики ошибок
    const cleanup = setupGlobalErrorHandlers();
    
    // Логируем инициализацию системы ошибок
    console.log('🛡️ Error handling system initialized');
    
    return cleanup;
  }, []);

  return (
    <ErrorBoundary
      fallback={<CriticalErrorFallback />}
      name="ErrorProvider"
      level="critical"
      onError={handleProviderError}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorProvider;
