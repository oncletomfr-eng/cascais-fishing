'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Создаем QueryClient с оптимальными настройками для real-time системы
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Кеш данных на 5 минут
      staleTime: 5 * 60 * 1000,
      
      // Данные остаются в памяти 10 минут после неиспользования  
      gcTime: 10 * 60 * 1000,
      
      // Повторные попытки при ошибках
      retry: (failureCount, error) => {
        // Не повторяем попытки для WebSocket ошибок
        if (error?.message?.includes('WebSocket')) {
          return false;
        }
        return failureCount < 3;
      },
      
      // Refetch при focus окна (полезно для real-time данных)
      refetchOnWindowFocus: true,
      
      // Refetch при переподключении к сети
      refetchOnReconnect: true,
    },
    mutations: {
      // Повторные попытки для мутаций
      retry: 1,
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * QueryProvider - обертка для TanStack Query
 * 
 * Настройки оптимизированы для:
 * - Реал-тайм обновлений групповых поездок
 * - Кеширование с разумными TTL
 * - Автоматические refetch при изменении фокуса
 * - Обработка WebSocket ошибок
 */
export default function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools только в development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false} 
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// Экспортируем queryClient для использования в других компонентах
export { queryClient };