'use client';

import { FC, useEffect } from 'react';
import Link from 'next/link';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Next.js App Router special file: error.tsx
 * This file handles runtime errors that occur during rendering.
 * Must be a Client Component.
 */
const ErrorPage: FC<ErrorPageProps> = ({ error, reset }) => {
  useEffect(() => {
    // Log the error to your error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
      <div className="max-w-md w-full mx-auto text-center px-6">
        <div className="mb-8">
          {/* Error icon */}
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-12 h-12 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Algo deu errado
          </h1>
          <p className="text-gray-600 mb-6">
            Ocorreu um erro inesperado. Nossa equipe foi notificada.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-red-800 mb-2">
                Detalhes do erro (development):
              </h3>
              <p className="text-sm text-red-700 font-mono break-all">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-red-600 mt-2">
                  ID: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={reset}
            className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            🔄 Tentar novamente
          </button>
          
          <Link 
            href="/" 
            className="inline-block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            🏠 Voltar ao início
          </Link>
          
          <Link 
            href="/fishing-diary" 
            className="inline-block w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400 transition-colors"
          >
            🎣 Ver diário de pesca
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Se o problema persistir, entre em contato com o suporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
