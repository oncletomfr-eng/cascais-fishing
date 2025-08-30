/**
 * ErrorDisplay - Компонент отображения ошибок
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  details?: string;
  className?: string;
  showRetry?: boolean;
  onRetry?: () => void;
}

export function ErrorDisplay({
  title = 'Ошибка',
  message,
  details,
  className = '',
  showRetry = false,
  onRetry
}: ErrorDisplayProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center p-6 space-y-4 text-center bg-red-50 border border-red-200 rounded-lg',
      className
    )}>
      <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
        <AlertCircle className="w-6 h-6 text-red-600" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-red-800">{title}</h3>
        <p className="text-red-700">{message}</p>
        {details && (
          <p className="text-sm text-red-600">{details}</p>
        )}
      </div>
      
      {showRetry && onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Попробовать снова</span>
        </button>
      )}
    </div>
  );
}
