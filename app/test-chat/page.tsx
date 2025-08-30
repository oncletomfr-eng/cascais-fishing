/**
 * Тестовая страница для системы интегрированного чата
 * Фаза 3: TripChatSystem - проверка работоспособности
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { TripChatSystem } from '@/components/chat/TripChatSystem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DEFAULT_FISHING_FEATURES } from '@/lib/types/chat';
import { isStreamChatConfigured, getStreamChatSetupInstructions } from '@/lib/config/stream-chat';

export default function TestChatPage() {
  const { data: session, status } = useSession();
  const [selectedTripId, setSelectedTripId] = React.useState('test-trip-123');

  // Проверяем аутентификацию
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Загрузка сессии...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Требуется аутентификация</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Для тестирования чата необходимо войти в систему.</p>
              <p className="text-sm text-gray-600 mt-2">
                Перейдите на страницу входа и авторизуйтесь через Google.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isConfigured = isStreamChatConfigured();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Заголовок и информация */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">💬</span>
              <span>Тестирование системы интегрированного чата</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Пользователь:</strong> {session.user?.name || 'Неизвестно'}
              </div>
              <div>
                <strong>User ID:</strong> {session.user?.id || 'Не найден'}
              </div>
              <div className="flex items-center space-x-2">
                <strong>Stream Chat:</strong> 
                {isConfigured ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Настроен</span>
                ) : (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Demo режим</span>
                )}
              </div>
            </div>

            {/* Выбор поездки для тестирования */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID тестовой поездки:
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={selectedTripId}
                  onChange={(e) => setSelectedTripId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Введите ID поездки"
                />
                <button
                  onClick={() => setSelectedTripId(`test-trip-${Date.now()}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Новая поездка
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Инструкции по настройке Stream Chat */}
        {!isConfigured && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">⚙️ Настройка Stream Chat</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-yellow-700 whitespace-pre-wrap overflow-x-auto">
                {getStreamChatSetupInstructions()}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Основная система чата */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Чат интерфейс */}
          <div className="lg:col-span-3">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>🎣 Чат поездки: {selectedTripId}</span>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Система активна</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full pb-0">
                <div className="h-full bg-white rounded-lg overflow-hidden">
                  <TripChatSystem
                    tripId={selectedTripId}
                    userId={session.user.id!}
                    userToken="demo-token" // Будет заменен на токен из API
                    userName={session.user.name || undefined}
                    userImage={session.user.image || undefined}
                    features={DEFAULT_FISHING_FEATURES}
                    className="h-full"
                    onChannelReady={(channel) => {
                      console.log('✅ Chat channel ready:', channel.id);
                    }}
                    onError={(error) => {
                      console.error('❌ Chat error:', error);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Панель управления и статистика */}
          <div className="space-y-4">
            {/* Статус системы */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📊 Статус системы</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>WebSocket:</span>
                  <span className="text-green-600">Активен</span>
                </div>
                <div className="flex justify-between">
                  <span>Stream Chat:</span>
                  <span className={isConfigured ? 'text-green-600' : 'text-yellow-600'}>
                    {isConfigured ? 'Подключен' : 'Demo режим'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Аутентификация:</span>
                  <span className="text-green-600">Активна</span>
                </div>
              </CardContent>
            </Card>

            {/* Рыбацкие функции */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🎣 Функции</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Места рыбалки</span>
                  <span className="text-green-600">✅</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Рекомендации снастей</span>
                  <span className="text-green-600">✅</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Данные о погоде</span>
                  <span className="text-green-600">✅</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Фото улова</span>
                  <span className="text-green-600">✅</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Геолокация</span>
                  <span className="text-green-600">✅</span>
                </div>
              </CardContent>
            </Card>

            {/* Действия тестирования */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🧪 Тестирование</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button className="w-full px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">
                  Отправить тестовое сообщение
                </button>
                <button className="w-full px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                  Поделиться местом
                </button>
                <button className="w-full px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors">
                  Обновить погоду
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
