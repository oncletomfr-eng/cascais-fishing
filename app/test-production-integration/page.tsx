'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Database,
  Wifi,
  MessageCircle,
  Server,
  Settings,
  TestTube
} from 'lucide-react';
import QueryProvider from '@/components/providers/QueryProvider';

interface HealthCheck {
  status: string;
  timestamp: string;
  environment: string;
  responseTime: string;
  services: {
    database: {
      status: string;
      latency: string;
    };
    configuration: {
      status: string;
      errors: string[];
      warnings: string[];
    };
  };
  stats: {
    activeTrips: number;
    totalUsers: number;
  };
}

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'loading';
  message: string;
  details?: any;
}

function TestProductionIntegrationPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Health check query
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery<HealthCheck>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const response = await fetch('/api/system/health');
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      return response.json();
    },
    refetchInterval: 30000 // Обновляем каждые 30 секунд
  });

  // Test group trips API
  const { data: tripsData, isLoading: tripsLoading, error: tripsError } = useQuery({
    queryKey: ['test-group-trips'],
    queryFn: async () => {
      const response = await fetch('/api/group-trips?limit=3');
      if (!response.ok) {
        throw new Error('Failed to fetch trips');
      }
      const data = await response.json();
      return data;
    }
  });

  // Run comprehensive tests
  const runTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: API Endpoints (with cache bypass)
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/group-trips?limit=3&_cache=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('🔍 Group Trips API Response Status:', response.status);
      
      const responseText = await response.text();
      console.log('🔍 Group Trips API Response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }
      
      if (response.ok) {
        if (data.success) {
          results.push({
            name: 'Group Trips API',
            status: 'success',
            message: `API работает. Загружено ${data.data?.trips?.length || 0} поездок${data.warning ? ' (с предупреждением)' : ''}`,
            details: data
          });
        } else {
          results.push({
            name: 'Group Trips API',
            status: 'warning',
            message: data.warning || data.error || 'API работает но с предупреждениями',
            details: data
          });
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${data.error || responseText}`);
      }
    } catch (error) {
      console.error('❌ Group Trips API Test Error:', error);
      results.push({
        name: 'Group Trips API',
        status: 'error',
        message: `Ошибка API: ${(error as Error).message}`,
        details: { error: error instanceof Error ? error.message : String(error) }
      });
    }

    // Test 2: WebSocket Connection (Production Check)
    try {
      // Check if we're in production and WebSocket is expected to be disabled
      const isProduction = window.location.hostname.includes('cascaisfishing.com');
      
      if (isProduction) {
        // In production, WebSocket is intentionally disabled for stability
        results.push({
          name: 'WebSocket Connection',
          status: 'warning',
          message: 'WebSocket отключен в production для стабильности (это нормально)',
          details: { 
            reason: 'next-ws disabled in production build',
            status: 'intentionally_disabled'
          }
        });
      } else {
        // In development, try to connect
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/api/group-trips/ws`;
        
        await new Promise((resolve, reject) => {
          const ws = new WebSocket(wsUrl);
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 5000);

          ws.onopen = () => {
            clearTimeout(timeout);
            ws.close();
            resolve(true);
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
          };
        });

        results.push({
          name: 'WebSocket Connection',
          status: 'success',
          message: 'WebSocket соединение успешно установлено (development)',
          details: { url: wsUrl }
        });
      }
    } catch (error) {
      results.push({
        name: 'WebSocket Connection',
        status: 'error',
        message: `WebSocket ошибка: ${(error as Error).message}`
      });
    }

    // Test 3: Stream Chat Configuration
    try {
      const hasApiKey = !!process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
      const isValidKey = hasApiKey && 
        process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY !== 'demo-key' && 
        process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY !== 'demo-key-please-configure' &&
        process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY?.length > 10;
      
      if (isValidKey) {
        // Test actual Stream Chat connectivity
        try {
          const testResponse = await fetch(`/api/chat/test-connection?_cache=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
          
          const testData = await testResponse.json();
          
          if (testResponse.ok && testData.success) {
            results.push({
              name: 'Stream Chat Config',
              status: 'success',
              message: `Stream Chat настроен и работает (${testData.keyType})`,
              details: testData
            });
          } else {
            results.push({
              name: 'Stream Chat Config',
              status: 'warning',
              message: testData.error || 'API ключ настроен, но соединение недоступно',
              details: testData
            });
          }
        } catch (testError) {
          results.push({
            name: 'Stream Chat Config',
            status: 'warning',
            message: 'API ключ настроен, но тест соединения не прошел',
            details: { keyConfigured: true, testError: (testError as Error).message }
          });
        }
      } else {
        results.push({
          name: 'Stream Chat Config',
          status: 'warning',
          message: 'Stream Chat не настроен (чат функции недоступны в production)',
          details: {
            hasKey: hasApiKey,
            keyLength: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY?.length || 0,
            recommendation: 'Настройте реальный Stream Chat API key для полной функциональности чата'
          }
        });
      }
    } catch (error) {
      results.push({
        name: 'Stream Chat Config',
        status: 'error',
        message: `Ошибка конфигурации Stream Chat: ${(error as Error).message}`
      });
    }

    // Test 4: Database Connectivity (через health check)
    if (healthData) {
      const dbStatus = healthData.services.database.status;
      results.push({
        name: 'Database Connection',
        status: dbStatus === 'connected' ? 'success' : 'error',
        message: dbStatus === 'connected' 
          ? `База данных подключена (${healthData.services.database.latency})`
          : 'Ошибка подключения к базе данных',
        details: healthData.services.database
      });
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'healthy' ? 'default' : status === 'unhealthy' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl font-bold text-blue-600 mb-4 flex items-center justify-center gap-3">
            <TestTube className="w-10 h-10" />
            Тестирование Production Интеграций
          </h1>
          <p className="text-lg text-gray-600">
            Проверка всех критических компонентов системы в реальном времени
          </p>
        </motion.div>

        {/* System Health Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Системный статус
              </CardTitle>
            </CardHeader>
            <CardContent>
              {healthLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Проверка статуса системы...
                </div>
              ) : healthError ? (
                <div className="text-red-600">
                  Ошибка получения статуса: {(healthError as Error).message}
                </div>
              ) : healthData ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-2">
                      {getStatusBadge(healthData.status)}
                    </div>
                    <p className="text-sm text-gray-600">Общий статус</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">
                      {healthData.stats.activeTrips}
                    </div>
                    <p className="text-sm text-gray-600">Активных поездок</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      {healthData.stats.totalUsers}
                    </div>
                    <p className="text-sm text-gray-600">Пользователей</p>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Test Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle>Комплексное тестирование</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={runTests} 
                disabled={isRunningTests}
                className="w-full"
              >
                {isRunningTests ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Выполняется тестирование...
                  </>
                ) : (
                  'Запустить полное тестирование'
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle>Результаты тестирования</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-start gap-3 p-4 rounded-lg bg-gray-50"
                    >
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <h4 className="font-semibold">{result.name}</h4>
                        <p className="text-sm text-gray-600">{result.message}</p>
                        {result.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-blue-600 cursor-pointer">
                              Показать детали
                            </summary>
                            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Configuration Errors/Warnings */}
        {healthData?.services.configuration && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Конфигурация системы
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthData.services.configuration.errors.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-red-600 mb-2">Ошибки конфигурации:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {healthData.services.configuration.errors.map((error, index) => (
                        <li key={index} className="text-red-600 text-sm">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {healthData.services.configuration.warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-600 mb-2">Предупреждения:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {healthData.services.configuration.warnings.map((warning, index) => (
                        <li key={index} className="text-yellow-600 text-sm">{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {healthData.services.configuration.errors.length === 0 && 
                 healthData.services.configuration.warnings.length === 0 && (
                  <div className="text-green-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Конфигурация системы корректна
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function TestProductionIntegrationPageWrapper() {
  return (
    <QueryProvider>
      <TestProductionIntegrationPage />
    </QueryProvider>
  );
}
