'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ErrorBoundary, 
  AsyncErrorBoundary, 
  RouteErrorBoundary,
  withErrorBoundary 
} from '@/components/error-boundaries';
import { 
  AlertTriangle, 
  Bug, 
  Timer, 
  Globe, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Компонент который может выбрасывать ошибки
function ErrorThrower({ 
  errorType, 
  shouldThrow = false 
}: { 
  errorType: string; 
  shouldThrow?: boolean; 
}) {
  if (shouldThrow) {
    switch (errorType) {
      case 'render':
        throw new Error('Ошибка рендеринга компонента');
      case 'async':
        throw new Error('Асинхронная ошибка');
      case 'critical':
        throw new Error('Критическая ошибка системы');
      default:
        throw new Error('Неизвестная ошибка');
    }
  }

  return (
    <div className="text-center p-4">
      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
      <p className="text-green-700">Компонент работает нормально</p>
    </div>
  );
}

// Асинхронный компонент для тестирования
function AsyncComponent({ shouldFail = false }: { shouldFail?: boolean }) {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (shouldFail) {
        throw new Error('Ошибка загрузки данных');
      }
      
      setData('Данные успешно загружены');
      setIsLoading(false);
    };

    fetchData().catch(() => {
      throw new Error('Асинхронная ошибка в useEffect');
    });
  }, [shouldFail]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Timer className="w-5 h-5 animate-pulse text-blue-500 mr-2" />
        <span>Загрузка данных...</span>
      </div>
    );
  }

  return (
    <div className="text-center p-4">
      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
      <p className="text-green-700">{data}</p>
    </div>
  );
}

// HOC обернутый компонент
const SafeComponent = withErrorBoundary(ErrorThrower, {
  name: 'HOC Wrapped Component',
  level: 'component'
});

// Компонент для тестирования Promise rejection
function PromiseRejectComponent({ shouldReject = false }: { shouldReject?: boolean }) {
  React.useEffect(() => {
    if (shouldReject) {
      // Создаем необработанный Promise rejection
      Promise.reject(new Error('Необработанный Promise rejection'));
    }
  }, [shouldReject]);

  return (
    <div className="text-center p-4">
      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
      <p className="text-green-700">Promise компонент работает</p>
    </div>
  );
}

export default function TestErrorBoundariesPage() {
  const [errorStates, setErrorStates] = useState({
    renderError: false,
    asyncError: false,
    criticalError: false,
    promiseRejection: false,
    routeError: false,
  });

  const toggleError = (errorType: keyof typeof errorStates) => {
    setErrorStates(prev => ({
      ...prev,
      [errorType]: !prev[errorType]
    }));
  };

  const resetAllErrors = () => {
    setErrorStates({
      renderError: false,
      asyncError: false,
      criticalError: false,
      promiseRejection: false,
      routeError: false,
    });
  };

  const triggerGlobalError = () => {
    // Глобальная ошибка JavaScript
    setTimeout(() => {
      throw new Error('Глобальная JavaScript ошибка');
    }, 100);
  };

  const triggerResourceError = () => {
    // Ошибка загрузки ресурса
    const img = document.createElement('img');
    img.src = 'https://nonexistent-domain-for-testing.com/image.jpg';
    document.body.appendChild(img);
    setTimeout(() => document.body.removeChild(img), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Bug className="w-8 h-8 text-red-600" />
            <h1 className="text-2xl sm:text-4xl font-bold text-red-600">
              Error Boundaries Testing
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600">
            Тестирование системы обработки ошибок в production среде
          </p>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Управление тестами
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={resetAllErrors}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Сбросить все ошибки
                </Button>
                <Button 
                  onClick={triggerGlobalError}
                  variant="destructive"
                  className="flex-1 sm:flex-none"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Глобальная ошибка
                </Button>
                <Button 
                  onClick={triggerResourceError}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Ошибка ресурса
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Boundary Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Component Level Error */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Component Error Boundary</CardTitle>
                  <Badge variant="secondary">Component Level</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Тестирует обработку ошибок на уровне компонента
                </p>
                <Button 
                  onClick={() => toggleError('renderError')}
                  variant={errorStates.renderError ? "destructive" : "outline"}
                  className="w-full"
                >
                  {errorStates.renderError ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Отключить ошибку
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Вызвать ошибку рендеринга
                    </>
                  )}
                </Button>
                <ErrorBoundary name="Component Test" level="component">
                  <ErrorThrower errorType="render" shouldThrow={errorStates.renderError} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </motion.div>

          {/* Async Error Boundary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Async Error Boundary</CardTitle>
                  <Badge variant="warning">Async Level</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Тестирует обработку асинхронных ошибок с Suspense
                </p>
                <Button 
                  onClick={() => toggleError('asyncError')}
                  variant={errorStates.asyncError ? "destructive" : "outline"}
                  className="w-full"
                >
                  {errorStates.asyncError ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Отключить ошибку
                    </>
                  ) : (
                    <>
                      <Timer className="w-4 h-4 mr-2" />
                      Вызвать async ошибку
                    </>
                  )}
                </Button>
                <AsyncErrorBoundary name="Async Test" level="component">
                  <AsyncComponent shouldFail={errorStates.asyncError} />
                </AsyncErrorBoundary>
              </CardContent>
            </Card>
          </motion.div>

          {/* Critical Error */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Critical Error Boundary</CardTitle>
                  <Badge variant="destructive">Critical Level</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Тестирует обработку критических ошибок системы
                </p>
                <Button 
                  onClick={() => toggleError('criticalError')}
                  variant={errorStates.criticalError ? "destructive" : "outline"}
                  className="w-full"
                >
                  {errorStates.criticalError ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Отключить ошибку
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Вызвать критическую ошибку
                    </>
                  )}
                </Button>
                <ErrorBoundary name="Critical Test" level="critical">
                  <ErrorThrower errorType="critical" shouldThrow={errorStates.criticalError} />
                </ErrorBoundary>
              </CardContent>
            </Card>
          </motion.div>

          {/* HOC Wrapped Component */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">HOC Error Boundary</CardTitle>
                  <Badge variant="outline">HOC Pattern</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Тестирует Higher-Order Component обертку с Error Boundary
                </p>
                <SafeComponent errorType="render" shouldThrow={false} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Promise Rejection Test */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Promise Rejection Handler</CardTitle>
                  <Badge variant="secondary">Global Handler</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Тестирует обработку необработанных Promise rejections
                </p>
                <Button 
                  onClick={() => toggleError('promiseRejection')}
                  variant={errorStates.promiseRejection ? "destructive" : "outline"}
                  className="w-full"
                >
                  {errorStates.promiseRejection ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Отключить rejection
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Вызвать Promise rejection
                    </>
                  )}
                </Button>
                <PromiseRejectComponent shouldReject={errorStates.promiseRejection} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Route Error Boundary Test */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Route Error Boundary</CardTitle>
                  <Badge variant="warning">Page Level</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-600">
                  Тестирует обработку ошибок на уровне маршрута
                </p>
                <Button 
                  onClick={() => toggleError('routeError')}
                  variant={errorStates.routeError ? "destructive" : "outline"}
                  className="w-full"
                >
                  {errorStates.routeError ? (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Отключить ошибку
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4 mr-2" />
                      Вызвать ошибку страницы
                    </>
                  )}
                </Button>
                <RouteErrorBoundary routeName="Test Route">
                  <ErrorThrower errorType="route" shouldThrow={errorStates.routeError} />
                </RouteErrorBoundary>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Инструкции по тестированию</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">🔍 Что тестировать:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Отображение fallback UI для каждого уровня ошибок</li>
                    <li>• Функционал кнопок восстановления</li>
                    <li>• Отправку отчетов об ошибках</li>
                    <li>• Логирование в консоль разработчика</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">📊 Где смотреть результаты:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Console (F12) - логи ошибок</li>
                    <li>• Network tab - запросы к /api/error-reports</li>
                    <li>• Application state - восстановление компонентов</li>
                    <li>• UI feedback - fallback интерфейсы</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
