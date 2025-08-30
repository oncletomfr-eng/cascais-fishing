'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  CloudRain, 
  Fish, 
  MapPin, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Thermometer,
  Wind,
  Waves
} from 'lucide-react';

interface FishingEvent {
  id: string;
  tripId: string;
  type: string;
  timestamp: Date;
  data: any;
}

export default function TestFishingEventsRealtime() {
  const [messageHistory, setMessageHistory] = useState<FishingEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['weather_changed', 'bite_report', 'route_changed']);
  
  const socketUrl = 'ws://localhost:3000/api/group-trips/ws';
  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => {
      console.log('🔌 Connected to fishing events WebSocket');
      // Подписываемся на тестовую поездку
      sendJsonMessage({
        type: 'subscribe',
        tripIds: ['trip-1']
      });
      // Подписываемся на события рыбалки
      sendJsonMessage({
        type: 'subscribe_events',
        eventTypes: selectedEvents,
        filters: {
          weatherAlertsOnly: false,
          biteReportsMinConfidence: 'low'
        }
      });
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // Фильтруем только события рыбалки
        if (data.type && ['weather_changed', 'bite_report', 'route_changed', 'participant_cancelled'].includes(data.type)) {
          const event: FishingEvent = {
            id: Date.now().toString(),
            tripId: data.tripId,
            type: data.type,
            timestamp: new Date(data.timestamp),
            data: data
          };
          
          setMessageHistory(prev => [event, ...prev.slice(0, 19)]); // Keep last 20 events
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    }
  }, [lastMessage]);

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Подключение...',
    [ReadyState.OPEN]: 'Подключено',
    [ReadyState.CLOSING]: 'Закрытие...',
    [ReadyState.CLOSED]: 'Отключено',
    [ReadyState.UNINSTANTIATED]: 'Неинициализировано',
  }[readyState];

  const sendTestEvent = useCallback((command: string) => {
    fetch('/api/group-trips/ws', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        tripId: 'trip-1'
      })
    })
    .then(response => response.json())
    .then(data => {
      console.log(`✅ ${command} event sent:`, data);
    })
    .catch(error => {
      console.error(`❌ Error sending ${command}:`, error);
    });
  }, []);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'weather_changed': return <CloudRain className="w-5 h-5" />;
      case 'bite_report': return <Fish className="w-5 h-5" />;
      case 'route_changed': return <MapPin className="w-5 h-5" />;
      case 'participant_cancelled': return <Users className="w-5 h-5" />;
      default: return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'weather_changed': return 'bg-blue-100 text-blue-800';
      case 'bite_report': return 'bg-green-100 text-green-800';
      case 'route_changed': return 'bg-orange-100 text-orange-800';
      case 'participant_cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEventTitle = (type: string) => {
    switch (type) {
      case 'weather_changed': return '🌊 Изменение погоды';
      case 'bite_report': return '🐟 Отчет о клёве';
      case 'route_changed': return '🗺️ Изменение маршрута';
      case 'participant_cancelled': return '🚫 Отмена участника';
      default: return type;
    }
  };

  const renderEventDetails = (event: FishingEvent) => {
    const { data } = event;
    
    switch (event.type) {
      case 'weather_changed':
        return data.weatherData && (
          <div className="space-y-2">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Thermometer className="w-4 h-4" />
                <span>{data.weatherData.temperature}°C</span>
              </div>
              <div className="flex items-center space-x-1">
                <Wind className="w-4 h-4" />
                <span>{data.weatherData.windSpeed} км/ч</span>
              </div>
              <div className="flex items-center space-x-1">
                <Waves className="w-4 h-4" />
                <span>{data.weatherData.waveHeight.toFixed(1)}м</span>
              </div>
            </div>
            <div className="text-sm">
              <strong>Условия:</strong> {data.weatherData.condition}
            </div>
            <div className="text-sm">
              <strong>Прогноз:</strong> {data.weatherData.forecast}
            </div>
            {data.weatherData.alertLevel !== 'info' && (
              <Alert className={data.weatherData.alertLevel === 'danger' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>{data.weatherData.alertMessage}</AlertDescription>
              </Alert>
            )}
          </div>
        );
        
      case 'bite_report':
        return data.biteReport && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <strong>Вид:</strong> {data.biteReport.species}
              </div>
              <Badge variant="outline" className={
                data.biteReport.confidence === 'high' ? 'bg-green-100 text-green-800' :
                data.biteReport.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }>
                {data.biteReport.confidence} confidence
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Размер:</strong> {data.biteReport.size} см</div>
              <div><strong>Вес:</strong> {data.biteReport.weight} кг</div>
              <div><strong>Техника:</strong> {data.biteReport.technique}</div>
              <div><strong>Глубина:</strong> {data.biteReport.depth}м</div>
            </div>
            <div className="text-sm">
              <strong>Местоположение:</strong> {data.biteReport.location}
            </div>
            <div className="text-sm">
              <strong>Приманка:</strong> {data.biteReport.baitUsed}
            </div>
            <div className="text-sm text-gray-600">
              Отчет от: {data.biteReport.reporterName}
            </div>
          </div>
        );
        
      case 'route_changed':
        return data.routeChange && (
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Новое место:</strong> {data.routeChange.newLocation}
            </div>
            <div className="text-sm">
              <strong>Причина:</strong> {data.routeChange.reason}
            </div>
            {data.routeChange.coordinates && (
              <div className="text-sm">
                <strong>Координаты:</strong> {data.routeChange.coordinates.lat.toFixed(4)}, {data.routeChange.coordinates.lng.toFixed(4)}
              </div>
            )}
            <div className="text-sm">
              <strong>Изменил:</strong> {data.routeChange.changedBy}
            </div>
            {data.routeChange.announcement && (
              <div className="text-sm font-medium text-blue-700">
                💬 {data.routeChange.announcement}
              </div>
            )}
            {data.routeChange.estimatedArrival && (
              <div className="text-sm text-gray-600">
                <Clock className="inline w-4 h-4 mr-1" />
                Прибытие: {new Date(data.routeChange.estimatedArrival).toLocaleTimeString()}
              </div>
            )}
          </div>
        );
        
      case 'participant_cancelled':
        return data.cancellationData && (
          <div className="space-y-2">
            <div className="text-sm">
              <strong>Участник:</strong> {data.cancellationData.participantName}
            </div>
            <div className="text-sm">
              <strong>Освободилось мест:</strong> {data.cancellationData.spotsFreed}
            </div>
            {data.cancellationData.reason && (
              <div className="text-sm">
                <strong>Причина:</strong> {data.cancellationData.reason}
              </div>
            )}
            {data.cancellationData.refundStatus && (
              <Badge variant="outline">
                Возврат: {data.cancellationData.refundStatus}
              </Badge>
            )}
          </div>
        );
        
      default:
        return (
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
            {JSON.stringify(data, null, 2)}
          </pre>
        );
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🎣 Тестирование событий рыбалки в реальном времени</h1>
        <p className="text-gray-600">
          Демонстрация WebSocket событий для погоды, клёва, изменения маршрута и отмен участников
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${readyState === ReadyState.OPEN ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Панель управления</span>
              </CardTitle>
              <CardDescription>
                Статус: {connectionStatus}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">🎣 События рыбалки</h3>
                <div className="space-y-2">
                  <Button 
                    onClick={() => sendTestEvent('weather_alert')}
                    className="w-full"
                    variant="outline"
                    disabled={readyState !== ReadyState.OPEN}
                  >
                    <CloudRain className="w-4 h-4 mr-2" />
                    Изменение погоды
                  </Button>
                  <Button 
                    onClick={() => sendTestEvent('bite_report')}
                    className="w-full"
                    variant="outline"
                    disabled={readyState !== ReadyState.OPEN}
                  >
                    <Fish className="w-4 h-4 mr-2" />
                    Отчет о клёве
                  </Button>
                  <Button 
                    onClick={() => sendTestEvent('route_change')}
                    className="w-full"
                    variant="outline"
                    disabled={readyState !== ReadyState.OPEN}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Изменение маршрута
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm space-y-1">
                  <div><strong>Подключенных клиентов:</strong> 1</div>
                  <div><strong>Подписок на поездки:</strong> 1</div>
                  <div><strong>Подписок на события:</strong> {selectedEvents.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>📡 Лента событий в реальном времени</CardTitle>
              <CardDescription>
                Последние {messageHistory.length} событий рыбалки
                {messageHistory.length === 0 && ' - ожидание событий...'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messageHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Fish className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Нажмите кнопки слева для генерации тестовых событий рыбалки</p>
                  </div>
                ) : (
                  messageHistory.map(event => (
                    <Card key={event.id} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {getEventIcon(event.type)}
                            <span className="font-medium">
                              {formatEventTitle(event.type)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getEventColor(event.type)}>
                              {event.type}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {event.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {renderEventDetails(event)}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Technical Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🔧 Техническая информация</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="events">
            <TabsList>
              <TabsTrigger value="events">Типы событий</TabsTrigger>
              <TabsTrigger value="filters">Фильтры</TabsTrigger>
              <TabsTrigger value="api">API команды</TabsTrigger>
            </TabsList>
            
            <TabsContent value="events" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">🌊 weather_changed</h4>
                  <p className="text-sm text-gray-600">Изменения погодных условий с детальными данными о ветре, волнах, температуре и предупреждениях.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🐟 bite_report</h4>
                  <p className="text-sm text-gray-600">Отчеты о клёве с информацией о виде рыбы, размере, технике ловли и местоположении.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🗺️ route_changed</h4>
                  <p className="text-sm text-gray-600">Изменения маршрута капитаном с указанием новой локации, причин и координат.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">🚫 participant_cancelled</h4>
                  <p className="text-sm text-gray-600">Отмена участия с информацией о возврате средств и освобождении мест.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="filters" className="mt-4">
              <div className="space-y-3">
                <div>
                  <strong>weatherAlertsOnly:</strong> только критические погодные предупреждения (warning/danger)
                </div>
                <div>
                  <strong>biteReportsMinConfidence:</strong> минимальный уровень достоверности отчетов о клёве (low/medium/high)
                </div>
                <div>
                  <strong>routeChangesOnly:</strong> подписка только на изменения маршрута
                </div>
              </div>
            </TabsContent>

            <TabsContent value="api" className="mt-4">
              <div className="space-y-2 font-mono text-sm">
                <div>POST /api/group-trips/ws {"{ \"command\": \"weather_alert\" }"}</div>
                <div>POST /api/group-trips/ws {"{ \"command\": \"bite_report\" }"}</div>
                <div>POST /api/group-trips/ws {"{ \"command\": \"route_change\" }"}</div>
                <div>GET /api/group-trips/ws (статистика WebSocket)</div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
