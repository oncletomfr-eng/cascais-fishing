import { FC } from 'react';

/**
 * Next.js App Router special file: loading.tsx
 * This file creates loading UI that is shown while content is loading.
 */
const LoadingPage: FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        {/* Animated fishing hook */}
        <div className="relative mx-auto w-16 h-16 mb-8">
          <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-blue-600" 
              fill="currentColor" 
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
        </div>

        {/* Loading text with animation */}
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-gray-800">
            Carregando...
          </h2>
          <p className="text-gray-600">
            Preparando sua experiência de pesca
          </p>
          
          {/* Animated dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>

        {/* Optional: Progress indication */}
        <div className="mt-8 w-64 mx-auto">
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingPage;
