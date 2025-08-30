import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RouteErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  routeName?: string;
}

// Кастомный UI для ошибок маршрутизации
function RouteErrorFallback({ 
  routeName, 
  onRetry, 
  onGoHome, 
  onGoBack 
}: {
  routeName?: string;
  onRetry: () => void;
  onGoHome: () => void;
  onGoBack: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Home className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">
            Страница временно недоступна
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            {routeName && (
              <p className="text-sm text-gray-500 mb-2">
                Маршрут: {routeName}
              </p>
            )}
            <p className="text-gray-600">
              Произошла ошибка при загрузке этой страницы. 
              Попробуйте перезагрузить или вернуться на главную.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Попробовать снова
            </Button>
            <Button variant="outline" onClick={onGoBack} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <Button variant="outline" onClick={onGoHome} className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              Главная
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Error Boundary специально для страниц/маршрутов
export function RouteErrorBoundary({
  children,
  fallback,
  routeName,
}: RouteErrorBoundaryProps) {
  const router = useRouter();

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Если передан кастомный fallback, используем обычный ErrorBoundary
  if (fallback) {
    return (
      <ErrorBoundary 
        fallback={fallback}
        name={routeName || 'Route'}
        level="page"
      >
        {children}
      </ErrorBoundary>
    );
  }

  // Иначе используем специализированный UI для маршрутов
  return (
    <ErrorBoundary 
      fallback={
        <RouteErrorFallback
          routeName={routeName}
          onRetry={handleRetry}
          onGoHome={handleGoHome}
          onGoBack={handleGoBack}
        />
      }
      name={routeName || 'Route'}
      level="page"
    >
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;
