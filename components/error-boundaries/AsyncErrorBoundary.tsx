import React, { ReactNode, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Loader2 } from 'lucide-react';

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  name?: string;
  level?: 'page' | 'component' | 'critical';
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Компонент загрузки по умолчанию
const DefaultLoadingFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="flex items-center space-x-2">
      <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
      <span className="text-gray-600">Загрузка...</span>
    </div>
  </div>
);

// Error Boundary для асинхронных компонентов с Suspense
export function AsyncErrorBoundary({
  children,
  fallback,
  loadingFallback = <DefaultLoadingFallback />,
  name,
  level = 'component',
  onError,
}: AsyncErrorBoundaryProps) {
  return (
    <ErrorBoundary 
      fallback={fallback}
      name={name}
      level={level}
      onError={onError}
    >
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

export default AsyncErrorBoundary;
