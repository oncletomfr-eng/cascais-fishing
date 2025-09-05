import { FC } from 'react';
import Link from 'next/link';

/**
 * Next.js App Router special file: not-found.tsx
 * This file is required for handling 404 errors in Next.js 13+ App Router.
 * Without this file, Vercel cannot generate the /_not-found lambda function.
 */
const NotFoundPage: FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md w-full mx-auto text-center px-6">
        <div className="mb-8">
          {/* Fishing hook icon */}
          <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-12 h-12 text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" 
              />
            </svg>
          </div>
          
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Página não encontrada
          </h2>
          <p className="text-gray-600 mb-8">
            Parece que esta página saiu para pescar e ainda não voltou...
          </p>
        </div>

        <div className="space-y-4">
          <Link 
            href="/" 
            className="inline-block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            🏠 Voltar ao início
          </Link>
          
          <Link 
            href="/fishing-diary" 
            className="inline-block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            🎣 Ver diário de pesca
          </Link>
          
          <Link 
            href="/group-events" 
            className="inline-block w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400 transition-colors"
          >
            🐟 Eventos de grupo
          </Link>
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>
            Se você acredita que isto é um erro, entre em contato conosco.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
