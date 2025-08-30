'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  MessageCircle, 
  Calendar,
  Users,
  Clock,
  Cloud,
  Camera,
  MapPin,
  Lightbulb,
  Settings,
  CheckCircle,
  AlertTriangle,
  Fish,
  Waves
} from 'lucide-react'

import { MultiPhaseChatSystem } from '@/components/chat/MultiPhaseChatSystem'
import { ChatPhase, DEFAULT_PHASE_CONFIGS } from '@/lib/types/multi-phase-chat'
import { format, addDays, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'

interface TestTripData {
  id: string
  name: string
  description: string
  date: Date
  participants: number
  maxParticipants: number
  status: string
}

export default function TestMultiPhaseChatPage() {
  const { data: session, status } = useSession()
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<TestTripData | null>(null)
  const [chatStats, setChatStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Тестовые поездки с разными датами для демонстрации фаз
  const testTrips: TestTripData[] = [
    {
      id: 'test-trip-future',
      name: 'Рыбалка на дораду',
      description: 'Утренняя поездка за дорадой в районе Cascais',
      date: addDays(new Date(), 3), // Через 3 дня - фаза preparation
      participants: 4,
      maxParticipants: 8,
      status: 'FORMING'
    },
    {
      id: 'test-trip-today',
      name: 'Глубоководная рыбалка',
      description: 'Охота на крупную рыбу в открытом океане',
      date: new Date(), // Сегодня - фаза live
      participants: 6,
      maxParticipants: 8,
      status: 'CONFIRMED'
    },
    {
      id: 'test-trip-past',
      name: 'Вечерняя ловля тунца',
      description: 'Успешная поездка за тунцом на закате',
      date: subDays(new Date(), 2), // 2 дня назад - фаза debrief
      participants: 8,
      maxParticipants: 8,
      status: 'COMPLETED'
    }
  ]

  // Определить текущую фазу для поездки
  const getCurrentPhase = (tripDate: Date): ChatPhase => {
    const now = new Date()
    const daysDiff = (tripDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 0) return 'preparation'
    if (daysDiff > -1) return 'live'
    return 'debrief'
  }

  // Загрузить статистику чата
  const loadChatStats = async (tripId: string) => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/chat/multi-phase?tripId=${tripId}`)
      if (response.ok) {
        const data = await response.json()
        setChatStats(data.data?.stats || null)
      }
    } catch (error) {
      console.error('Error loading chat stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Открыть чат для поездки
  const openChat = (trip: TestTripData) => {
    setSelectedTrip(trip)
    setChatOpen(true)
    loadChatStats(trip.id)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          💬 Тестирование многофазной системы чатов
        </h1>
        <p className="text-gray-600">
          Полная интеграция Stream Chat с тремя фазами: подготовка, процесс, подведение итогов
        </p>
      </div>

      {/* Статус аутентификации */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Users className="w-4 h-4" />
              <span>Аутентификация</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {status === 'loading' ? (
              <p className="text-sm text-gray-600">Загрузка...</p>
            ) : session?.user ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm">{session.user.name}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-sm">Не авторизован</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <MessageCircle className="w-4 h-4" />
              <span>Статус чата</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${chatOpen ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm">{chatOpen ? 'Открыт' : 'Закрыт'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Fish className="w-4 h-4" />
              <span>Активная поездка</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-sm">
              {selectedTrip?.name || 'Не выбрана'}
            </span>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trips" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trips">Тестовые поездки</TabsTrigger>
          <TabsTrigger value="phases">Фазы чатов</TabsTrigger>
          <TabsTrigger value="features">Функции</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
        </TabsList>

        {/* Тестовые поездки */}
        <TabsContent value="trips">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testTrips.map((trip) => {
              const currentPhase = getCurrentPhase(trip.date)
              const phaseConfig = DEFAULT_PHASE_CONFIGS[currentPhase]
              
              return (
                <Card key={trip.id} className="border-l-4" style={{ borderLeftColor: phaseConfig.color }}>
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-lg">{trip.name}</CardTitle>
                      <Badge style={{ backgroundColor: phaseConfig.color, color: 'white' }}>
                        {phaseConfig.phase}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{trip.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 text-sm">
                        <Calendar className="w-4 h-4" />
                        <span>{format(trip.date, 'dd MMMM yyyy, HH:mm', { locale: ru })}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="w-4 h-4" />
                        <span>{trip.participants}/{trip.maxParticipants} участников</span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-lg">{phaseConfig.icon}</span>
                        <span className="font-medium">{phaseConfig.title}</span>
                      </div>
                      
                      <p className="text-xs text-gray-500">{phaseConfig.description}</p>

                      <Button 
                        onClick={() => openChat(trip)}
                        className="w-full mt-4"
                        style={{ backgroundColor: phaseConfig.color }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Открыть чат {phaseConfig.phase}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Фазы чатов */}
        <TabsContent value="phases">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(['preparation', 'live', 'debrief'] as ChatPhase[]).map((phase) => {
              const config = DEFAULT_PHASE_CONFIGS[phase]
              
              return (
                <Card key={phase} className="border-l-4" style={{ borderLeftColor: config.color }}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span className="text-2xl">{config.icon}</span>
                      <span>{config.title}</span>
                    </CardTitle>
                    <p className="text-gray-600">{config.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Доступные функции:</h4>
                        <div className="flex flex-wrap gap-2">
                          {config.allowedFeatures.map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature === 'weather_updates' && '🌤️ Погода'}
                              {feature === 'catch_photos' && '📸 Фото'}
                              {feature === 'location_sharing' && '📍 Локация'}
                              {feature === 'tip_sharing' && '💡 Советы'}
                              {feature === 'text_messages' && '💬 Текст'}
                              {feature === 'polls' && '📊 Опросы'}
                              {feature === 'file_sharing' && '📎 Файлы'}
                              {feature === 'voice_messages' && '🎤 Голос'}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Автосообщения:</h4>
                        <div className="text-sm space-y-1">
                          {config.autoMessages.map((msg) => (
                            <div key={msg.id} className="p-2 bg-gray-50 rounded">
                              <span className="font-medium">{msg.type}:</span> {msg.content}
                            </div>
                          ))}
                        </div>
                      </div>

                      {config.timeRestrictions && (
                        <div>
                          <h4 className="font-semibold mb-2">Временные ограничения:</h4>
                          <div className="text-sm text-gray-600">
                            {config.timeRestrictions.activeBefore && 
                              <p>Активен за {config.timeRestrictions.activeBefore} дней</p>
                            }
                            {config.timeRestrictions.activeAfter && 
                              <p>Активен {config.timeRestrictions.activeAfter} дней после</p>
                            }
                            {config.timeRestrictions.autoArchive && 
                              <p>Автоматическое архивирование</p>
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Функции */}
        <TabsContent value="features">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Cloud className="w-5 h-5 text-blue-500" />
                  <span>Weather Updates</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Автоматические и ручные обновления погоды с детальными данными
                </p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• Температура и влажность</li>
                  <li>• Скорость ветра и направление</li>
                  <li>• Высота волн</li>
                  <li>• Прогнозы от капитана</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Camera className="w-5 h-5 text-green-500" />
                  <span>Catch Photos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Обмен фотографиями улова с метаданными
                </p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• Вид и размер рыбы</li>
                  <li>• GPS координаты</li>
                  <li>• Время и техника ловли</li>
                  <li>• Используемая приманка</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <MapPin className="w-5 h-5 text-red-500" />
                  <span>Location Sharing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Обмен координатами и маршрутами в реальном времени
                </p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• Лучшие места для ловли</li>
                  <li>• Позиция лодки</li>
                  <li>• Опасные зоны</li>
                  <li>• Маршруты следования</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  <span>Tip Sharing</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-3">
                  Обмен советами и техниками от опытных рыболовов
                </p>
                <ul className="text-xs space-y-1 text-gray-500">
                  <li>• Техники ловли</li>
                  <li>• Рекомендации снастей</li>
                  <li>• Советы по безопасности</li>
                  <li>• Лучшие приманки</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Статистика */}
        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Статистика чата</span>
                {selectedTrip && (
                  <Badge variant="outline">{selectedTrip.name}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
                  <p>Загрузка статистики...</p>
                </div>
              ) : chatStats ? (
                <div className="space-y-4">
                  {Object.entries(chatStats).map(([phase, stats]: [string, any]) => {
                    const config = DEFAULT_PHASE_CONFIGS[phase as ChatPhase]
                    return (
                      <div key={phase} className="p-4 border rounded" style={{ borderColor: config?.color }}>
                        <h4 className="font-semibold flex items-center space-x-2 mb-2">
                          <span>{config?.icon}</span>
                          <span>{config?.title}</span>
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Сообщений:</span>
                            <div className="font-bold">{stats.messagesCount || 0}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Участников:</span>
                            <div className="font-bold">{stats.participantsCount || 0}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Канал:</span>
                            <div className={stats.channelExists ? 'text-green-600' : 'text-red-600'}>
                              {stats.channelExists ? 'Существует' : 'Не найден'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Последняя активность:</span>
                            <div className="text-xs">
                              {stats.lastActivity ? 
                                format(new Date(stats.lastActivity), 'dd.MM HH:mm', { locale: ru }) : 
                                'Нет данных'
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-600">Выберите поездку для просмотра статистики чата</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Многофазный чат */}
      {selectedTrip && (
        <MultiPhaseChatSystem
          tripId={selectedTrip.id}
          tripDate={selectedTrip.date}
          isOpen={chatOpen}
          onToggle={() => setChatOpen(!chatOpen)}
        />
      )}
    </div>
  )
}
