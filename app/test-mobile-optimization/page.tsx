'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/components/ui/use-mobile';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Touch,
  Eye,
  Navigation,
  Zap,
  Wifi
} from 'lucide-react';
import { TripsFeedComponent } from '@/components/group-trips/TripsFeedComponent';
import { SimpleUnifiedWidget } from '@/components/booking/SimpleUnifiedWidget';
import QueryProvider from '@/components/providers/QueryProvider';

interface MobileTestResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  recommendations?: string[];
}

function TestMobileOptimizationPage() {
  const isMobile = useIsMobile();
  const [testResults, setTestResults] = useState<MobileTestResult[]>([]);
  const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
  const [touchCapable, setTouchCapable] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState<string>('unknown');

  useEffect(() => {
    // Получаем размеры экрана
    const updateDimensions = () => {
      setScreenDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    // Проверяем touch support
    setTouchCapable('ontouchstart' in window || navigator.maxTouchPoints > 0);

    // Проверяем network speed (если доступно)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setNetworkSpeed(connection.effectiveType || 'unknown');
    }

    // Запускаем mobile tests
    runMobileTests();

    return () => window.removeEventListener('resize', updateDimensions);
  }, [isMobile, screenDimensions.width]);

  const runMobileTests = () => {
    const tests: MobileTestResult[] = [];

    // Test 1: Viewport Meta Tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    tests.push({
      test: 'Viewport Meta Tag',
      status: viewportMeta ? 'pass' : 'fail',
      message: viewportMeta 
        ? `✅ Viewport meta tag присутствует: ${viewportMeta.getAttribute('content')}`
        : '❌ Viewport meta tag отсутствует',
      recommendations: !viewportMeta ? ['Добавить <meta name="viewport" content="width=device-width, initial-scale=1">'] : undefined
    });

    // Test 2: Touch Target Size
    const touchTargets = document.querySelectorAll('button, a, input, [onclick]');
    const smallTargets = Array.from(touchTargets).filter(target => {
      const rect = target.getBoundingClientRect();
      return rect.width < 44 || rect.height < 44;
    });

    tests.push({
      test: 'Touch Target Size',
      status: smallTargets.length === 0 ? 'pass' : smallTargets.length < 5 ? 'warning' : 'fail',
      message: smallTargets.length === 0 
        ? '✅ Все touch targets соответствуют рекомендуемому размеру (44px+)'
        : `⚠️ Найдено ${smallTargets.length} элементов меньше 44px`,
      recommendations: smallTargets.length > 0 ? ['Увеличить размер кнопок и ссылок до 44px+'] : undefined
    });

    // Test 3: Font Size
    const body = document.body;
    const computedStyle = window.getComputedStyle(body);
    const fontSize = parseInt(computedStyle.fontSize);
    
    tests.push({
      test: 'Base Font Size',
      status: fontSize >= 16 ? 'pass' : 'warning',
      message: `${fontSize >= 16 ? '✅' : '⚠️'} Базовый размер шрифта: ${fontSize}px`,
      recommendations: fontSize < 16 ? ['Увеличить базовый размер шрифта до 16px+'] : undefined
    });

    // Test 4: Screen Size Detection
    tests.push({
      test: 'Screen Size Detection',
      status: 'pass',
      message: `✅ Экран: ${screenDimensions.width}x${screenDimensions.height}px, Mobile: ${isMobile ? 'Да' : 'Нет'}`
    });

    // Test 5: Touch Support
    tests.push({
      test: 'Touch Support',
      status: touchCapable ? 'pass' : 'warning',
      message: `${touchCapable ? '✅' : '⚠️'} Touch события: ${touchCapable ? 'Поддерживаются' : 'Не обнаружены'}`
    });

    // Test 6: Horizontal Scroll Check
    const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
    tests.push({
      test: 'Horizontal Scroll',
      status: hasHorizontalScroll ? 'warning' : 'pass',
      message: hasHorizontalScroll 
        ? '⚠️ Обнаружена горизонтальная прокрутка'
        : '✅ Горизонтальная прокрутка отсутствует',
      recommendations: hasHorizontalScroll ? ['Проверить элементы с фиксированной шириной', 'Использовать overflow-x: hidden'] : undefined
    });

    // Test 7: Image Optimization
    const images = document.querySelectorAll('img');
    const unoptimizedImages = Array.from(images).filter(img => {
      return !img.srcset && !img.loading;
    });

    tests.push({
      test: 'Image Optimization',
      status: unoptimizedImages.length === 0 ? 'pass' : 'warning',
      message: unoptimizedImages.length === 0
        ? '✅ Все изображения оптимизированы'
        : `⚠️ ${unoptimizedImages.length} изображений без оптимизации`,
      recommendations: unoptimizedImages.length > 0 ? ['Добавить lazy loading', 'Использовать srcset для responsive images'] : undefined
    });

    setTestResults(tests);
  };

  const getDeviceIcon = () => {
    if (screenDimensions.width < 768) return <Smartphone className="w-6 h-6" />;
    if (screenDimensions.width < 1024) return <Tablet className="w-6 h-6" />;
    return <Monitor className="w-6 h-6" />;
  };

  const getStatusIcon = (status: MobileTestResult['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getBreakpointInfo = () => {
    const width = screenDimensions.width;
    if (width < 640) return { name: 'Mobile (XS)', color: 'bg-red-100 text-red-800' };
    if (width < 768) return { name: 'Mobile (SM)', color: 'bg-orange-100 text-orange-800' };
    if (width < 1024) return { name: 'Tablet (MD)', color: 'bg-yellow-100 text-yellow-800' };
    if (width < 1280) return { name: 'Desktop (LG)', color: 'bg-green-100 text-green-800' };
    return { name: 'Desktop (XL)', color: 'bg-blue-100 text-blue-800' };
  };

  const breakpointInfo = getBreakpointInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            {getDeviceIcon()}
            <h1 className="text-2xl sm:text-4xl font-bold text-blue-600">
              Mobile Optimization Testing
            </h1>
          </div>
          <p className="text-base sm:text-lg text-gray-600">
            Тестирование мобильной адаптивности и производительности
          </p>
        </motion.div>

        {/* Device Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Информация об устройстве
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {screenDimensions.width}px
                  </div>
                  <p className="text-sm text-gray-600">Ширина</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {screenDimensions.height}px
                  </div>
                  <p className="text-sm text-gray-600">Высота</p>
                </div>
                <div className="text-center">
                  <Badge className={breakpointInfo.color}>
                    {breakpointInfo.name}
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">Breakpoint</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {touchCapable ? <Touch className="w-5 h-5 text-green-500" /> : <Wifi className="w-5 h-5 text-gray-400" />}
                    <span className="text-sm">{touchCapable ? 'Touch' : 'No Touch'}</span>
                  </div>
                  <p className="text-sm text-gray-600">Input Type</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Test Results */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Результаты тестирования
              </CardTitle>
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
                      <h4 className="font-semibold">{result.test}</h4>
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      {result.recommendations && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-orange-700">Рекомендации:</p>
                          <ul className="list-disc list-inside text-sm text-orange-600 ml-2">
                            {result.recommendations.map((rec, i) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mobile Component Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Booking Widget Test */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Booking Widget (Mobile)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="scale-75 sm:scale-100 origin-top">
                  <SimpleUnifiedWidget />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Trips Feed Test */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Trips Feed (Mobile)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <TripsFeedComponent
                    trips={[]}
                    onTripSelect={() => {}}
                    realTimeUpdates={false}
                    enableSocialProof={true}
                    showWeatherInfo={false}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Действия</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={runMobileTests} className="flex-1">
                  <Zap className="w-4 h-4 mr-2" />
                  Перезапустить тесты
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => window.location.reload()}
                  className="flex-1"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  Обновить страницу
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function TestMobileOptimizationPageWrapper() {
  return (
    <QueryProvider>
      <TestMobileOptimizationPage />
    </QueryProvider>
  );
}
