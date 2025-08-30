/**
 * Упрощенная страница детальной поездки для тестирования чата
 * Без сложных mock данных, только основная функциональность
 */

'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function TripDetailSimplePage() {
  const params = useParams();
  const tripId = params?.tripId as string;

  const [showChatDemo, setShowChatDemo] = React.useState(false);
  const [streamChatStatus, setStreamChatStatus] = React.useState<'checking' | 'ready' | 'error'>('checking');

  React.useEffect(() => {
    // Проверяем статус Stream Chat
    const checkStreamChat = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
        if (apiKey && apiKey !== 'demo-key' && apiKey !== 'demo-key-please-configure') {
          setStreamChatStatus('ready');
        } else {
          setStreamChatStatus('error');
        }
      } catch (error) {
        setStreamChatStatus('error');
      }
    };
    
    checkStreamChat();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Заголовок */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span className="text-2xl">🎣</span>
              <span>Групповая рыбалка #{tripId}</span>
              <div className="flex items-center space-x-2">
                {streamChatStatus === 'ready' && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    Stream Chat готов
                  </span>
                )}
                {streamChatStatus === 'error' && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    Demo режим
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Информация о поездке */}
        <Card>
          <CardHeader>
            <CardTitle>📋 Информация о поездке</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>ID поездки:</strong> {tripId}
              </div>
              <div>
                <strong>Дата:</strong> 24 августа 2025
              </div>
              <div>
                <strong>Время:</strong> 09:00
              </div>
              <div>
                <strong>Место встречи:</strong> Cascais Marina
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Чат система */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>💬 Чат участников</span>
              <Button 
                onClick={() => setShowChatDemo(!showChatDemo)}
                variant="outline"
              >
                {showChatDemo ? 'Скрыть чат' : 'Показать чат'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showChatDemo ? (
              <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-600 mb-4">
                  Чат доступен для участников поездки
                </p>
                <p className="text-sm text-gray-500">
                  Нажмите "Показать чат" для демонстрации
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Статус системы */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">🔧 Статус интеграции</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span>Stream Chat API:</span>
                      <span className={`px-2 py-1 rounded ${
                        streamChatStatus === 'ready' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {streamChatStatus === 'ready' ? '✅ Настроен' : '⚠️ Demo режим'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>TripChatSystem:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✅ Реализован</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Рыбацкие функции:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✅ Готовы</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API токены:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded">✅ API создан</span>
                    </div>
                  </div>
                </div>

                {/* Рыбацкие функции */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">🎣 Специализированные функции</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <span>🎣</span>
                      <span>Места рыбалки</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span>⚙️</span>
                      <span>Снасти</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span>🌤️</span>
                      <span>Погода</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span>📸</span>
                      <span>Фото улова</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span>📍</span>
                      <span>Геолокация</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span>👨‍✈️</span>
                      <span>Капитан</span>
                    </div>
                  </div>
                </div>

                {/* Демонстрация чата */}
                <div className="border rounded-lg">
                  <div className="p-4 bg-gray-100 border-b">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Чат поездки #{tripId.slice(-6)}</h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-xs text-gray-600">В сети</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64 p-4 overflow-y-auto bg-white">
                    <div className="space-y-4">
                      
                      {/* Системное сообщение */}
                      <div className="text-center">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          Чат поездки создан
                        </span>
                      </div>

                      {/* Демонстрационные сообщения */}
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">
                          K
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">Капитан Мигель</span>
                            <span className="text-xs text-gray-500">10:30</span>
                          </div>
                          <div className="bg-gray-100 rounded-lg p-2">
                            <p className="text-sm">Добро пожаловать в чат поездки! Встречаемся завтра в 9:00 у причала C-12.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm">
                          J
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">João</span>
                            <span className="text-xs text-gray-500">10:32</span>
                          </div>
                          <div className="bg-blue-500 text-white rounded-lg p-2">
                            <p className="text-sm">🎣 Поделился местом рыбалки: GPS 38.6944°N, 9.4219°W</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm">
                          M
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-medium text-sm">Maria</span>
                            <span className="text-xs text-gray-500">10:35</span>
                          </div>
                          <div className="bg-gray-100 rounded-lg p-2">
                            <p className="text-sm">🌤️ Погода отличная: +22°C, ветер 5 м/с, видимость хорошая!</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t bg-gray-50">
                    <div className="flex space-x-2 mb-3">
                      <Button variant="outline" size="sm" disabled>
                        🎣 Место
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        ⚙️ Снасти
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        🌤️ Погода
                      </Button>
                      <Button variant="outline" size="sm" disabled>
                        📍 Локация
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="Написать сообщение..." 
                        className="flex-1 px-3 py-2 border rounded-lg text-sm"
                        disabled
                      />
                      <Button size="sm" disabled>
                        Отправить
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Инструкция по активации */}
        {streamChatStatus === 'ready' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-700">🚀 Stream Chat настроен!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-green-700">
                  ✅ Система полностью готова к использованию с реальными ключами Stream Chat
                </p>
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Для активации полного чата:</h4>
                  <ol className="text-sm text-green-700 space-y-1 ml-4 list-decimal">
                    <li>Авторизуйтесь через Google на главной странице</li>
                    <li>Вернитесь на страницу групповой поездки</li>
                    <li>Откройте реальный чат с Stream Chat API</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
