/**
 * Demo Page for Phase Transition Logic Testing
 * Task 17.3: Phase Transition Logic - Testing and Integration Demo
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { addDays, subDays } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { 
  PhaseTransitionProvider,
  usePhaseTransition,
  TransitionResult
} from '@/lib/transition/usePhaseTransition'
import { IntegratedPhaseSystem } from '@/components/transition/IntegratedPhaseSystem'
import { PhaseTransitionContainer } from '@/components/transition/PhaseTransitionContainer'
import { CaptainOverridePanel } from '@/components/transition/CaptainOverridePanel'
import { PhaseHistoryTracker } from '@/components/transition/PhaseHistoryTracker'
import { 
  ChecklistItem, 
  CatchRecord, 
  TripReview 
} from '@/components/chat/phases/types'
import {
  Settings,
  Zap,
  BarChart3,
  Shield,
  TestTube,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Calendar,
  MapPin,
  Users,
  Fish,
  Clock,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Download,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Mock data generation
const generateMockData = () => {
  const checklistItems: ChecklistItem[] = [
    { id: '1', title: 'Проверить снасти', description: 'Убедиться что все снасти в порядке', isCompleted: true, category: 'equipment' },
    { id: '2', title: 'Заправить лодку', description: 'Заправить топливом', isCompleted: false, category: 'preparation' },
    { id: '3', title: 'Проверить погоду', description: 'Ознакомиться с прогнозом', isCompleted: true, category: 'safety' },
    { id: '4', title: 'Собрать команду', description: 'Связаться со всеми участниками', isCompleted: false, category: 'preparation' }
  ]

  const catches: CatchRecord[] = [
    {
      id: '1',
      species: 'Морской окунь',
      weight: 2.5,
      length: 35,
      location: { lat: 38.6566, lng: -9.2021 },
      caughtAt: new Date(),
      caughtBy: 'Алексей',
      method: 'Спиннинг',
      bait: 'Воблер',
      weather: 'Ясно',
      notes: 'Отличная рыба!',
      photos: ['catch1.jpg']
    },
    {
      id: '2',
      species: 'Скумбрия',
      weight: 1.2,
      length: 28,
      location: { lat: 38.6566, lng: -9.2021 },
      caughtAt: new Date(),
      caughtBy: 'Михаил',
      method: 'Троллинг',
      bait: 'Блесна',
      weather: 'Небольшие волны',
      notes: 'Хороший улов',
      photos: ['catch2.jpg']
    }
  ]

  const reviews: TripReview[] = [
    {
      id: '1',
      rating: 5,
      title: 'Отличная рыбалка!',
      content: 'Все прошло замечательно. Хорошая организация, отличные места.',
      reviewerName: 'Алексей',
      reviewedAt: new Date(),
      wouldRecommend: true,
      highlights: ['Отличная организация', 'Хорошие места', 'Дружная команда'],
      suggestions: ['Больше приманок', 'Раньше начать']
    }
  ]

  return { checklistItems, catches, reviews }
}

// Test scenario configurations
const TEST_SCENARIOS = [
  {
    id: 'normal-flow',
    name: 'Нормальный поток',
    description: 'Естественная последовательность фаз',
    tripDate: new Date(),
    config: {
      enableAutoTransitions: true,
      enableAnimations: true,
      defaultAnimation: { type: 'slide', duration: 500, easing: 'ease-in-out' }
    }
  },
  {
    id: 'past-trip',
    name: 'Прошедшая поездка',
    description: 'Поездка которая уже завершилась',
    tripDate: subDays(new Date(), 2),
    config: {
      enableAutoTransitions: true,
      enableAnimations: true,
      defaultAnimation: { type: 'fade', duration: 300, easing: 'ease-out' }
    }
  },
  {
    id: 'future-trip',
    name: 'Будущая поездка',
    description: 'Поездка запланированная на будущее',
    tripDate: addDays(new Date(), 7),
    config: {
      enableAutoTransitions: false,
      enableAnimations: true,
      defaultAnimation: { type: 'scale', duration: 400, easing: 'ease-in' }
    }
  },
  {
    id: 'no-animations',
    name: 'Без анимаций',
    description: 'Тестирование без UI анимаций',
    tripDate: new Date(),
    config: {
      enableAutoTransitions: true,
      enableAnimations: false,
      defaultAnimation: { type: 'none', duration: 0, easing: 'linear' }
    }
  }
]

// Demo control panel
interface DemoControlPanelProps {
  scenario: string
  onScenarioChange: (scenario: string) => void
  tripId: string
  onTripIdChange: (tripId: string) => void
  onReset: () => void
  onSimulateTimeAdvance: () => void
  onSimulateCompletion: () => void
}

function DemoControlPanel({
  scenario,
  onScenarioChange,
  tripId,
  onTripIdChange,
  onReset,
  onSimulateTimeAdvance,
  onSimulateCompletion
}: DemoControlPanelProps) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <TestTube className="w-4 h-4 mr-2" />
          Панель управления демо
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Selection */}
        <div className="space-y-2">
          <Label className="text-xs">Тестовый сценарий</Label>
          <Select value={scenario} onValueChange={onScenarioChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEST_SCENARIOS.map(scenario => (
                <SelectItem key={scenario.id} value={scenario.id}>
                  <div>
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-xs text-gray-500">{scenario.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trip ID */}
        <div className="space-y-2">
          <Label className="text-xs">Trip ID</Label>
          <Input
            value={tripId}
            onChange={(e) => onTripIdChange(e.target.value)}
            placeholder="trip-demo-123"
            className="text-sm"
          />
        </div>

        {/* Control Actions */}
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" onClick={onReset}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Сброс
          </Button>
          <Button size="sm" variant="outline" onClick={onSimulateTimeAdvance}>
            <FastForward className="w-3 h-3 mr-1" />
            +Время
          </Button>
          <Button size="sm" variant="outline" onClick={onSimulateCompletion}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Завершить
          </Button>
        </div>

        {/* Current Scenario Info */}
        {scenario && (
          <div className="pt-3 border-t">
            <div className="text-xs text-gray-600">
              <div>Сценарий: {TEST_SCENARIOS.find(s => s.id === scenario)?.name}</div>
              <div>Дата: {TEST_SCENARIOS.find(s => s.id === scenario)?.tripDate.toLocaleDateString('ru')}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Core demo component with transition context
function DemoCore() {
  const {
    currentPhase,
    isTransitioning,
    currentTransition,
    requestTransition,
    capabilities,
    history
  } = usePhaseTransition()

  // Demo state
  const [tripId, setTripId] = useState('demo-trip-' + Date.now())
  const [scenario, setScenario] = useState('normal-flow')
  const [mockData, setMockData] = useState(generateMockData())
  const [currentTab, setCurrentTab] = useState('integrated')
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // Get current scenario config
  const currentScenario = TEST_SCENARIOS.find(s => s.id === scenario) || TEST_SCENARIOS[0]

  // Handle demo actions
  const handleReset = useCallback(() => {
    setTripId('demo-trip-' + Date.now())
    setMockData(generateMockData())
    toast.info('Демо сброшено')
  }, [])

  const handleSimulateTimeAdvance = useCallback(async () => {
    try {
      let targetPhase: ChatPhase = 'live'
      if (currentPhase === 'preparation') targetPhase = 'live'
      else if (currentPhase === 'live') targetPhase = 'debrief'
      else targetPhase = 'preparation'

      const result = await requestTransition(targetPhase, 'time-based')
      if (result.success) {
        toast.success(`Временной переход: ${currentPhase} → ${targetPhase}`)
      } else {
        toast.error('Временной переход не удался')
      }
    } catch (error) {
      toast.error(`Ошибка временного перехода: ${error}`)
    }
  }, [currentPhase, requestTransition])

  const handleSimulateCompletion = useCallback(async () => {
    try {
      const result = await requestTransition('debrief', 'completion-based')
      if (result.success) {
        toast.success('Переход по завершению выполнен')
      } else {
        toast.error('Переход по завершению не удался')
      }
    } catch (error) {
      toast.error(`Ошибка перехода по завершению: ${error}`)
    }
  }, [requestTransition])

  const handleOverrideExecuted = useCallback((override: any, result: TransitionResult) => {
    console.log('Override executed:', override, result)
    toast.success(`Override выполнен: ${override.fromPhase} → ${override.toPhase}`)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Демо системы переходов фаз
          </h1>
          <p className="text-gray-600">
            Тестирование и демонстрация логики переходов между фазами чата
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <Badge variant="outline">
              Текущая фаза: {currentPhase}
            </Badge>
            <Badge variant={isTransitioning ? 'destructive' : 'default'}>
              {isTransitioning ? 'Переход...' : 'Активна'}
            </Badge>
            <Badge variant="outline">
              Trip: {tripId}
            </Badge>
          </div>
        </div>

        {/* Control Panel */}
        <DemoControlPanel
          scenario={scenario}
          onScenarioChange={setScenario}
          tripId={tripId}
          onTripIdChange={setTripId}
          onReset={handleReset}
          onSimulateTimeAdvance={handleSimulateTimeAdvance}
          onSimulateCompletion={handleSimulateCompletion}
        />

        {/* Main Demo Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="integrated">Интеграция</TabsTrigger>
            <TabsTrigger value="components">Компоненты</TabsTrigger>
            <TabsTrigger value="override">Override</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
            <TabsTrigger value="debug">Отладка</TabsTrigger>
          </TabsList>

          {/* Integrated System Demo */}
          <TabsContent value="integrated">
            <IntegratedPhaseSystem
              tripId={tripId}
              tripDate={currentScenario.tripDate}
              initialPhase={currentPhase}
              tripDetails={{
                destination: 'Cascais Bay',
                participants: ['Алексей', 'Михаил', 'Елена'],
                startDate: currentScenario.tripDate,
                endDate: addDays(currentScenario.tripDate, 1)
              }}
              currentLocation={{
                lat: 38.6566,
                lng: -9.2021,
                accuracy: 10
              }}
              onPhaseChange={(from, to) => {
                console.log(`Phase changed: ${from} → ${to}`)
                toast.info(`Фаза изменена: ${from} → ${to}`)
              }}
              onDataUpdate={(phase, data) => {
                console.log(`Data updated for ${phase}:`, data)
              }}
              onError={(error) => {
                console.error('System error:', error)
                toast.error(`Системная ошибка: ${error}`)
              }}
            />
          </TabsContent>

          {/* Individual Components Demo */}
          <TabsContent value="components">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Phase Transition Container
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PhaseTransitionContainer
                    showProgress={true}
                    showPhaseIndicator={true}
                    animation={currentScenario.config.defaultAnimation}
                    onTransitionStart={() => toast.info('Переход начался')}
                    onTransitionComplete={() => toast.success('Переход завершен')}
                    onTransitionError={(error) => toast.error(`Ошибка: ${error}`)}
                  >
                    <div className="p-8 text-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <h3 className="text-xl font-semibold mb-2">
                        Контент фазы: {currentPhase}
                      </h3>
                      <p className="text-gray-600">
                        Это контент который отображается для текущей фазы.
                        При переходе между фазами он будет анимированно заменяться.
                      </p>
                      <div className="mt-4 flex justify-center space-x-2">
                        <Badge variant="outline">
                          Анимации: {currentScenario.config.enableAnimations ? 'Включены' : 'Отключены'}
                        </Badge>
                        <Badge variant="outline">
                          Тип: {currentScenario.config.defaultAnimation.type}
                        </Badge>
                      </div>
                    </div>
                  </PhaseTransitionContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Captain Override Demo */}
          <TabsContent value="override">
            <div className="grid gap-6">
              <CaptainOverridePanel
                onOverrideExecuted={handleOverrideExecuted}
                className="max-w-2xl mx-auto"
              />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Информация о правах</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Может входить в фазы:</span>
                      <Badge variant={capabilities?.canEnter ? 'default' : 'destructive'}>
                        {capabilities?.canEnter ? 'Да' : 'Нет'}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Может выходить из фаз:</span>
                      <Badge variant={capabilities?.canExit ? 'default' : 'destructive'}>
                        {capabilities?.canExit ? 'Да' : 'Нет'}
                      </Badge>
                    </div>
                    {capabilities?.reasons.length > 0 && (
                      <div>
                        <div className="font-medium mb-1">Ограничения:</div>
                        <ul className="text-gray-600 space-y-1">
                          {capabilities.reasons.map((reason, index) => (
                            <li key={index}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Demo */}
          <TabsContent value="history">
            <PhaseHistoryTracker
              showExport={true}
              showFilters={true}
              maxEntries={20}
            />
          </TabsContent>

          {/* Debug Info */}
          <TabsContent value="debug">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Current State */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Текущее состояние</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono">
                    <div>currentPhase: {currentPhase}</div>
                    <div>isTransitioning: {isTransitioning.toString()}</div>
                    <div>currentTransition: {currentTransition ? currentTransition.id : 'null'}</div>
                    <div>tripId: {tripId}</div>
                    <div>scenario: {scenario}</div>
                    <div>historyLength: {history.phases.length}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Transition Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Детали перехода</CardTitle>
                </CardHeader>
                <CardContent>
                  {currentTransition ? (
                    <div className="space-y-2 text-sm font-mono">
                      <div>id: {currentTransition.id}</div>
                      <div>from: {currentTransition.fromPhase}</div>
                      <div>to: {currentTransition.toPhase}</div>
                      <div>trigger: {currentTransition.triggeredBy}</div>
                      <div>status: {currentTransition.status}</div>
                      <div>started: {currentTransition.triggeredAt.toLocaleTimeString()}</div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Нет активного перехода</div>
                  )}
                </CardContent>
              </Card>

              {/* Mock Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Тестовые данные</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>Checklist items: {mockData.checklistItems.length}</div>
                    <div>Catches: {mockData.catches.length}</div>
                    <div>Reviews: {mockData.reviews.length}</div>
                    <Button size="sm" onClick={() => setMockData(generateMockData())}>
                      Обновить данные
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* System Config */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Конфигурация</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm font-mono">
                    <div>autoTransitions: {currentScenario.config.enableAutoTransitions.toString()}</div>
                    <div>animations: {currentScenario.config.enableAnimations.toString()}</div>
                    <div>animationType: {currentScenario.config.defaultAnimation.type}</div>
                    <div>duration: {currentScenario.config.defaultAnimation.duration}ms</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Main page component with provider
export default function TestPhaseTransitionsPage() {
  const [scenario, setScenario] = useState('normal-flow')
  const [tripId, setTripId] = useState('demo-trip-' + Date.now())

  const currentScenario = TEST_SCENARIOS.find(s => s.id === scenario) || TEST_SCENARIOS[0]

  return (
    <PhaseTransitionProvider
      tripId={tripId}
      tripDate={currentScenario.tripDate}
      initialPhase="preparation"
      config={currentScenario.config}
      events={{
        onTransitionStart: async (transition) => {
          console.log('Demo: Transition started:', transition)
        },
        onTransitionComplete: async (transition) => {
          console.log('Demo: Transition completed:', transition)
        },
        onTransitionError: async (transition, error) => {
          console.error('Demo: Transition error:', error)
        },
        onPhaseEnter: async (phase, context) => {
          console.log('Demo: Phase entered:', phase)
        },
        onPhaseExit: async (phase, context) => {
          console.log('Demo: Phase exited:', phase)
        }
      }}
      checklistItems={generateMockData().checklistItems}
      catches={generateMockData().catches}
      reviews={generateMockData().reviews}
      tripStatus="in-progress"
    >
      <DemoCore />
    </PhaseTransitionProvider>
  )
}
