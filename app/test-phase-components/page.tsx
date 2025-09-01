/**
 * Phase-Specific UI Components Demo Page
 * Task 17.2: Phase-Specific UI Components - Demo and Testing
 */

'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  Fish,
  Star,
  MapPin,
  Users,
  Clock,
  Settings,
  RefreshCw,
  Play,
  Pause,
  SkipForward,
  Eye,
  EyeOff,
  Lightbulb,
  Package,
  AlertTriangle,
  Share2,
  Download,
  Zap
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { addDays, subDays, addHours } from 'date-fns'

import {
  PreparationPhase,
  ActiveTripPhase,
  PostTripPhase,
  ChecklistItem,
  GearItem,
  CatchRecord,
  TripReview,
  EmergencyAlert
} from '@/components/chat/phases'

import type { ChatPhase } from '@/lib/types/multi-phase-chat'

// Demo configurations
const DEMO_TRIP_ID = 'demo-trip-123'

const DEMO_TRIP_DETAILS = {
  destination: 'Атлантическое побережье Португалии',
  duration: 8,
  maxParticipants: 6,
  difficulty: 'intermediate' as const,
  requiredGear: ['Спиннинг', 'Катушка', 'Приманки', 'Спасательный жилет'],
  meetingPoint: 'Порт Кашкайш, причал №3',
  departureTime: addHours(new Date(), 2)
}

const DEMO_CURRENT_LOCATION = {
  lat: 38.6986,
  lng: -9.4205,
  accuracy: 10
}

export default function TestPhaseComponentsPage() {
  // Demo state
  const [currentPhase, setCurrentPhase] = useState<ChatPhase>('preparation')
  const [tripDate, setTripDate] = useState(addDays(new Date(), 1))
  const [autoTransition, setAutoTransition] = useState(false)
  const [showAllPhases, setShowAllPhases] = useState(false)
  const [demoSpeed, setDemoSpeed] = useState<'slow' | 'normal' | 'fast'>('normal')
  
  // Phase tracking
  const [phaseHistory, setPhaseHistory] = useState<Array<{
    phase: ChatPhase
    timestamp: Date
    trigger: 'manual' | 'auto'
  }>>([
    { phase: 'preparation', timestamp: new Date(), trigger: 'manual' }
  ])

  // Demo data
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [catches, setCatches] = useState<CatchRecord[]>([])
  const [reviews, setReviews] = useState<TripReview[]>([])
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlert[]>([])

  // Event logs for debugging
  const [eventLog, setEventLog] = useState<Array<{
    timestamp: Date
    event: string
    data?: any
  }>>([])

  // Phase control functions
  const switchToPhase = useCallback((phase: ChatPhase, trigger: 'manual' | 'auto' = 'manual') => {
    setCurrentPhase(phase)
    setPhaseHistory(prev => [...prev, { phase, timestamp: new Date(), trigger }])
    logEvent(`Switched to ${phase} phase`, { trigger })
  }, [])

  const nextPhase = useCallback(() => {
    const phases: ChatPhase[] = ['preparation', 'live', 'debrief']
    const currentIndex = phases.indexOf(currentPhase)
    const nextIndex = (currentIndex + 1) % phases.length
    switchToPhase(phases[nextIndex], 'manual')
  }, [currentPhase, switchToPhase])

  // Event logging
  const logEvent = useCallback((event: string, data?: any) => {
    setEventLog(prev => [...prev, { timestamp: new Date(), event, data }].slice(-50))
  }, [])

  // Demo event handlers
  const handleFeatureUsed = useCallback((feature: string, data?: any) => {
    logEvent(`Feature used: ${feature}`, data)
  }, [logEvent])

  const handleChecklistUpdate = useCallback((newChecklist: ChecklistItem[]) => {
    setChecklist(newChecklist)
    logEvent('Checklist updated', { items: newChecklist.length })
  }, [logEvent])

  const handleCatchLog = useCallback((catch_: any) => {
    const newCatch: CatchRecord = {
      id: `catch-${Date.now()}`,
      species: catch_.fishSpecies || 'Unknown',
      size: catch_.fishSize,
      weight: catch_.fishWeight,
      time: new Date(),
      location: catch_.location,
      technique: catch_.technique,
      bait: catch_.bait,
      notes: catch_.notes
    }
    setCatches(prev => [...prev, newCatch])
    logEvent('Catch logged', newCatch)
  }, [logEvent])

  const handleReviewSubmit = useCallback((review: TripReview) => {
    setReviews(prev => [...prev, review])
    logEvent('Review submitted', { rating: review.rating })
  }, [logEvent])

  const handleEmergencyAlert = useCallback((alert: EmergencyAlert) => {
    setEmergencyAlerts(prev => [...prev, alert])
    logEvent('Emergency alert', { type: alert.type, severity: alert.severity })
  }, [logEvent])

  const handleMessageSent = useCallback((content: string, type?: any) => {
    logEvent('Message sent', { content: content.substring(0, 50), type })
  }, [logEvent])

  // Auto transition simulation
  React.useEffect(() => {
    if (!autoTransition) return

    const intervals = {
      slow: 10000,    // 10 seconds
      normal: 5000,   // 5 seconds
      fast: 2000      // 2 seconds
    }

    const timer = setInterval(() => {
      nextPhase()
    }, intervals[demoSpeed])

    return () => clearInterval(timer)
  }, [autoTransition, demoSpeed, nextPhase])

  // Phase component props
  const commonProps = {
    tripId: DEMO_TRIP_ID,
    tripDate,
    onFeatureUsed: handleFeatureUsed,
    onMessageSent: handleMessageSent
  }

  const preparationProps = {
    ...commonProps,
    tripDetails: DEMO_TRIP_DETAILS,
    onChecklistUpdate: handleChecklistUpdate,
    onGearRecommendation: (gear: GearItem[]) => logEvent('Gear recommendations', gear),
    onWeatherRequest: () => logEvent('Weather request'),
    onPhaseComplete: () => logEvent('Preparation phase complete')
  }

  const activeTripProps = {
    ...commonProps,
    currentLocation: DEMO_CURRENT_LOCATION,
    onLocationShare: (location: any) => logEvent('Location shared', location),
    onCatchLog: handleCatchLog,
    onEmergencyAlert: handleEmergencyAlert,
    onGroupCheck: () => logEvent('Group check performed')
  }

  const postTripProps = {
    ...commonProps,
    tripSummary: {
      catches,
      photos: ['photo1.jpg', 'photo2.jpg', 'photo3.jpg', 'photo4.jpg'],
      highlights: [
        'Отличная погода',
        'Хорошая компания',
        'Удачные места',
        'Вкусный обед'
      ],
      totalDistance: 25.6,
      totalTime: 480,
      weather: {
        averageTemp: 18,
        windSpeed: 12,
        waveHeight: 0.8,
        visibility: 95,
        conditions: ['Ясно', 'Переменная облачность']
      }
    },
    onReviewSubmit: handleReviewSubmit,
    onPhotoShare: (photos: string[]) => logEvent('Photos shared', { count: photos.length }),
    onNextTripPlan: () => logEvent('Next trip planning initiated')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Phase-Specific UI Components Demo
          </h1>
          <p className="text-gray-600">
            Тестирование компонентов для трех фаз рыболовного чата
          </p>
        </div>

        {/* Demo Controls */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Управление демо</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              {/* Phase Control */}
              <div className="space-y-2">
                <Label>Текущая фаза</Label>
                <Select value={currentPhase} onValueChange={(value: ChatPhase) => switchToPhase(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preparation">🎣 Подготовка</SelectItem>
                    <SelectItem value="live">🚤 Активная рыбалка</SelectItem>
                    <SelectItem value="debrief">🌅 Итоги</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Transition */}
              <div className="space-y-2">
                <Label>Авто-переход</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoTransition}
                    onCheckedChange={setAutoTransition}
                  />
                  <span className="text-sm">
                    {autoTransition ? 'Включен' : 'Выключен'}
                  </span>
                </div>
              </div>

              {/* Demo Speed */}
              <div className="space-y-2">
                <Label>Скорость демо</Label>
                <Select value={demoSpeed} onValueChange={(value: any) => setDemoSpeed(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Медленно (10с)</SelectItem>
                    <SelectItem value="normal">Нормально (5с)</SelectItem>
                    <SelectItem value="fast">Быстро (2с)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Options */}
              <div className="space-y-2">
                <Label>Отображение</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={showAllPhases}
                    onCheckedChange={setShowAllPhases}
                  />
                  <span className="text-sm">
                    {showAllPhases ? 'Все фазы' : 'Только активная'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4">
              <Button onClick={nextPhase} variant="outline" size="sm">
                <SkipForward className="w-4 h-4 mr-1" />
                Следующая фаза
              </Button>
              <Button 
                onClick={() => setEventLog([])} 
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Очистить лог
              </Button>
              <Button 
                onClick={() => {
                  setChecklist([])
                  setCatches([])
                  setReviews([])
                  setEmergencyAlerts([])
                  setPhaseHistory([{ phase: 'preparation', timestamp: new Date(), trigger: 'manual' }])
                  setCurrentPhase('preparation')
                }} 
                variant="outline" 
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Сброс демо
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-5 gap-4">
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{checklist.length}</div>
              <div className="text-xs text-gray-600">Пунктов чек-листа</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{catches.length}</div>
              <div className="text-xs text-gray-600">Записей об уловах</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{reviews.length}</div>
              <div className="text-xs text-gray-600">Отзывов</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{emergencyAlerts.length}</div>
              <div className="text-xs text-gray-600">Тревожных сигналов</div>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{eventLog.length}</div>
              <div className="text-xs text-gray-600">Событий в логе</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Phase Components */}
          <div className="lg:col-span-2 space-y-6">
            {showAllPhases ? (
              // Show all phases
              <div className="space-y-6">
                <Card className={cn(
                  "transition-all duration-300",
                  currentPhase === 'preparation' ? "ring-2 ring-blue-400" : "opacity-60"
                )}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span>Фаза подготовки</span>
                      </CardTitle>
                      {currentPhase === 'preparation' && (
                        <Badge variant="default">Активна</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PreparationPhase
                      {...preparationProps}
                      isActive={currentPhase === 'preparation'}
                      className="scale-90 origin-top"
                    />
                  </CardContent>
                </Card>

                <Card className={cn(
                  "transition-all duration-300",
                  currentPhase === 'live' ? "ring-2 ring-green-400" : "opacity-60"
                )}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Fish className="w-5 h-5" />
                        <span>Активная фаза</span>
                      </CardTitle>
                      {currentPhase === 'live' && (
                        <Badge variant="default">Активна</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ActiveTripPhase
                      {...activeTripProps}
                      isActive={currentPhase === 'live'}
                      className="scale-90 origin-top"
                    />
                  </CardContent>
                </Card>

                <Card className={cn(
                  "transition-all duration-300",
                  currentPhase === 'debrief' ? "ring-2 ring-amber-400" : "opacity-60"
                )}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center space-x-2">
                        <Star className="w-5 h-5" />
                        <span>Фаза итогов</span>
                      </CardTitle>
                      {currentPhase === 'debrief' && (
                        <Badge variant="default">Активна</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PostTripPhase
                      {...postTripProps}
                      isActive={currentPhase === 'debrief'}
                      className="scale-90 origin-top"
                    />
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Show only active phase
              <Card className="border-2 border-blue-400">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {currentPhase === 'preparation' && <Calendar className="w-5 h-5" />}
                    {currentPhase === 'live' && <Fish className="w-5 h-5" />}
                    {currentPhase === 'debrief' && <Star className="w-5 h-5" />}
                    <span>
                      {currentPhase === 'preparation' && 'Фаза подготовки'}
                      {currentPhase === 'live' && 'Активная фаза'}
                      {currentPhase === 'debrief' && 'Фаза итогов'}
                    </span>
                    <Badge variant="default">Активна</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait">
                    {currentPhase === 'preparation' && (
                      <motion.div
                        key="preparation"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <PreparationPhase {...preparationProps} isActive={true} />
                      </motion.div>
                    )}
                    
                    {currentPhase === 'live' && (
                      <motion.div
                        key="live"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ActiveTripPhase {...activeTripProps} isActive={true} />
                      </motion.div>
                    )}
                    
                    {currentPhase === 'debrief' && (
                      <motion.div
                        key="debrief"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <PostTripPhase {...postTripProps} isActive={true} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Debug Panel */}
          <div className="space-y-4">
            {/* Phase History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">История фаз</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {phaseHistory.slice(-5).map((entry, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="font-medium">{entry.phase}</div>
                      <div className="text-gray-500">
                        {entry.timestamp.toLocaleTimeString()}
                        <Badge variant="outline" className="ml-1 text-xs">
                          {entry.trigger}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Event Log */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Лог событий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {eventLog.slice(-10).reverse().map((entry, index) => (
                    <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                      <div className="font-medium">{entry.event}</div>
                      <div className="text-gray-500">
                        {entry.timestamp.toLocaleTimeString()}
                      </div>
                      {entry.data && (
                        <div className="text-gray-400 text-xs mt-1">
                          {JSON.stringify(entry.data).substring(0, 50)}...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Demo Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Функции демо</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs space-y-1">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="w-3 h-3" />
                    <span>Интерактивные чек-листы</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3 h-3" />
                    <span>Геолокация и карты</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Fish className="w-3 h-3" />
                    <span>Журнал уловов</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Экстренные сигналы</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="w-3 h-3" />
                    <span>Система оценок</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Share2 className="w-3 h-3" />
                    <span>Социальные функции</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-none">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-gray-600">
              🎣 Phase-Specific UI Components Demo • Task 17.2 Complete
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Comprehensive testing environment for multi-phase chat UI components
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
