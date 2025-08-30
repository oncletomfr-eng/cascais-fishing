'use client'

import React, { useState, useEffect, useCallback } from 'react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  UserX, 
  Users, 
  Calendar, 
  CheckCircle, 
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Plus
} from 'lucide-react'

interface Booking {
  id: string
  contactName: string
  participants: number
  status: string
  totalPrice: number
  createdAt: string
}

interface Trip {
  tripId: string
  date: string
  timeSlot: string
  currentParticipants: number
  maxParticipants: number
  minRequired: number
  status: string
  participants: any[]
}

interface CancellationEvent {
  id: string
  type: string
  tripId: string
  timestamp: Date
  data: any
}

export default function TestParticipantCancellation() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [cancellationReason, setCancellationReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [cancellationEvents, setCancellationEvents] = useState<CancellationEvent[]>([])
  
  const socketUrl = 'ws://localhost:3000/api/group-trips/ws'
  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
    onOpen: () => {
      console.log('🔌 Connected to cancellation events WebSocket')
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  })

  // Загрузка поездок при монтировании компонента
  useEffect(() => {
    loadTrips()
  }, [])

  // Обработка WebSocket сообщений
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data)
        
        if (data.type === 'participant_cancelled') {
          const event: CancellationEvent = {
            id: Date.now().toString(),
            type: data.type,
            tripId: data.tripId,
            timestamp: new Date(data.timestamp),
            data: data
          }
          
          setCancellationEvents(prev => [event, ...prev.slice(0, 19)]) // Keep last 20 events
          
          // Обновить данные поездки
          loadTrips()
          
          setMessage({
            type: 'success',
            text: `✅ Участник ${data.cancellationData?.participantName} отменен в реальном времени!`
          })
          
          setTimeout(() => setMessage(null), 5000)
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error)
      }
    }
  }, [lastMessage])

  const loadTrips = async () => {
    try {
      setIsLoading(true)
      // Включаем отмененные бронирования для тестирования
      const response = await fetch('/api/group-trips?limit=10&sort=chronological&includeCancelled=true')
      const data = await response.json()
      
      if (data.success && data.data?.trips) {
        setTrips(data.data.trips)
      } else {
        console.error('Unexpected API response structure:', data)
        setMessage({ type: 'error', text: 'Неожиданная структура ответа API' })
      }
    } catch (error) {
      console.error('❌ Error loading trips:', error)
      setMessage({ type: 'error', text: 'Ошибка загрузки поездок' })
    } finally {
      setIsLoading(false)
    }
  }

  const createTestBooking = async (tripId: string) => {
    try {
      setIsLoading(true)
      const participantName = `Test User ${Date.now().toString().slice(-4)}`
      
      const response = await fetch('/api/test-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          participantName,
          action: 'create'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Тестовый участник "${participantName}" добавлен!` 
        })
        loadTrips()
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка создания тестового участника' })
      }
      
      setTimeout(() => setMessage(null), 5000)
      
    } catch (error) {
      console.error('❌ Error creating test booking:', error)
      setMessage({ type: 'error', text: 'Ошибка создания тестового участника' })
    } finally {
      setIsLoading(false)
    }
  }

  const cancelParticipant = async (bookingId: string, tripId: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch('/api/cancel-participant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          reason: cancellationReason || 'Тестовая отмена'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `✅ Участник отменен! WebSocket событие отправлено ${result.data.websocketClients} клиентам` 
        })
        setCancellationReason('')
        loadTrips()
        
        // Подписаться на обновления этой поездки
        if (readyState === ReadyState.OPEN) {
          sendJsonMessage({
            type: 'subscribe',
            tripIds: [tripId]
          })
          sendJsonMessage({
            type: 'subscribe_events',
            eventTypes: ['participant_cancelled']
          })
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Ошибка отмены участника' })
      }
      
      setTimeout(() => setMessage(null), 8000)
      
    } catch (error) {
      console.error('❌ Error cancelling participant:', error)
      setMessage({ type: 'error', text: 'Ошибка отмены участника' })
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'forming': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const connectionStatus = {
    [ReadyState.CONNECTING]: 'Подключение...',
    [ReadyState.OPEN]: 'Подключено',
    [ReadyState.CLOSING]: 'Закрытие...',
    [ReadyState.CLOSED]: 'Отключено',
    [ReadyState.UNINSTANTIATED]: 'Неинициализировано',
  }[readyState]

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🚫 Тестирование отмены участников в реальном времени</h1>
        <p className="text-gray-600">
          Полная интеграция с базой данных Prisma + WebSocket события в реальном времени
        </p>
      </div>

      {/* Status & Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${readyState === ReadyState.OPEN ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>WebSocket статус</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{connectionStatus}</p>
          </CardContent>
        </Card>

        {message && (
          <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="trips" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trips">Поездки и участники</TabsTrigger>
          <TabsTrigger value="cancellation">Отмена участника</TabsTrigger>
          <TabsTrigger value="events">События в реальном времени</TabsTrigger>
        </TabsList>

        {/* Trips Tab */}
        <TabsContent value="trips">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>📅 Активные поездки</span>
                  <Button 
                    onClick={loadTrips} 
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Обновить'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trips.map((trip) => (
                    <Card 
                      key={trip.tripId} 
                      className={`border-l-4 cursor-pointer transition-colors ${
                        selectedTrip?.tripId === trip.tripId ? 'border-l-blue-500 bg-blue-50' : 'border-l-gray-300'
                      }`}
                      onClick={() => setSelectedTrip(trip)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium">
                            {new Date(trip.date).toLocaleDateString('ru-RU')} • {trip.timeSlot}
                          </div>
                          <Badge className={getStatusColor(trip.status)}>
                            {trip.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{trip.currentParticipants || 0}/{trip.maxParticipants}</span>
                          </div>
                          <div>Мин: {trip.minRequired}</div>
                          <div>Участников: {trip.participants?.length || 0}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trip Details */}
            <Card>
              <CardHeader>
                <CardTitle>👥 Участники поездки</CardTitle>
                {selectedTrip && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => createTestBooking(selectedTrip.tripId)}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Добавить тестового участника
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {selectedTrip ? (
                  <div className="space-y-4">
                    {selectedTrip.participants && selectedTrip.participants.length > 0 ? (
                      selectedTrip.participants.map((participant) => (
                        <Card key={participant.id} className="border-l-4 border-l-green-500">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="font-medium">{participant.name}</div>
                              <Badge className="bg-green-100 text-green-800">
                                ACTIVE
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <div>1 участник</div>
                              <div>{participant.country}</div>
                              <div>
                                {new Date(participant.joinedAt).toLocaleDateString('ru-RU')}
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                setMessage({
                                  type: 'error',
                                  text: 'Для демонстрации отмены нужны реальные бронирования из БД. Создайте тестового участника.'
                                })
                                setTimeout(() => setMessage(null), 5000)
                              }}
                              disabled={isLoading}
                              size="sm"
                              variant="outline"
                              className="mt-2"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Демо участник (нельзя отменить)
                            </Button>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 py-8">
                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>Нет участников в этой поездке</p>
                        <p className="text-sm">Добавьте тестового участника для демонстрации</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Выберите поездку для просмотра участников</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cancellation Tab */}
        <TabsContent value="cancellation">
          <Card>
            <CardHeader>
              <CardTitle>🚫 Настройки отмены</CardTitle>
              <CardDescription>
                Настройте параметры отмены участника
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="reason">Причина отмены</Label>
                <Textarea
                  id="reason"
                  placeholder="Введите причину отмены участника..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">🔧 Технические детали</h4>
                <div className="text-sm space-y-1 text-gray-600">
                  <div>• Использует Prisma транзакции для атомарности</div>
                  <div>• Автоматически пересчитывает количество участников</div>
                  <div>• Обновляет статус поездки при необходимости</div>
                  <div>• Отправляет WebSocket события в реальном времени</div>
                  <div>• Инвалидирует кеш Next.js (revalidatePath/Tag)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>📡 События отмены в реальном времени</CardTitle>
              <CardDescription>
                WebSocket события participant_cancelled (последние {cancellationEvents.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {cancellationEvents.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <UserX className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>Пока нет событий отмены</p>
                    <p className="text-sm">Отмените участника чтобы увидеть события в реальном времени</p>
                  </div>
                ) : (
                  cancellationEvents.map(event => (
                    <Card key={event.id} className="border-l-4 border-l-red-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <UserX className="w-5 h-5 text-red-500" />
                            <span className="font-medium">Отмена участника</span>
                          </div>
                          <Badge variant="outline" className="text-red-600">
                            {event.timestamp.toLocaleTimeString()}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><strong>Участник:</strong> {event.data.cancellationData?.participantName}</div>
                          <div><strong>Поездка:</strong> {event.tripId}</div>
                          <div><strong>Причина:</strong> {event.data.cancellationData?.reason}</div>
                          <div><strong>Освобождено мест:</strong> {event.data.cancellationData?.spotsFreed}</div>
                          <div><strong>Текущих участников:</strong> {event.data.currentParticipants}/{event.data.maxParticipants}</div>
                          <div><strong>Статус возврата:</strong> 
                            <Badge className="ml-2" variant="outline">
                              {event.data.cancellationData?.refundStatus}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
