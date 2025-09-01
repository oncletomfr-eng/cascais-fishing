/**
 * Integrated Phase System with Transition Logic
 * Task 17.3: Phase Transition Logic - Full Integration
 */

'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { 
  PhaseTransitionProvider,
  usePhaseTransition,
  useTransitionTriggers,
  usePhaseCompletion,
  useTransitionHistory
} from '@/lib/transition/usePhaseTransition'
import {
  PhaseTransitionContainer,
  TransitionControls
} from './PhaseTransitionContainer'
import {
  PreparationPhase,
  ActiveTripPhase,
  PostTripPhase,
  ChecklistItem,
  CatchRecord,
  TripReview
} from '@/components/chat/phases'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Props for the integrated system
interface IntegratedPhaseSystemProps {
  tripId: string
  tripDate: Date
  initialPhase?: ChatPhase
  className?: string
  
  // Optional props for phase components
  tripDetails?: any
  currentLocation?: {
    lat: number
    lng: number
    accuracy?: number
  }
  
  // Event handlers
  onPhaseChange?: (fromPhase: ChatPhase, toPhase: ChatPhase) => void
  onDataUpdate?: (phase: ChatPhase, data: any) => void
  onError?: (error: any) => void
}

// Internal component that uses the transition context
function PhaseSystemCore({
  tripId,
  tripDate,
  tripDetails,
  currentLocation,
  onPhaseChange,
  onDataUpdate,
  onError
}: Omit<IntegratedPhaseSystemProps, 'initialPhase' | 'className'>) {
  const {
    currentPhase,
    isTransitioning,
    currentTransition,
    requestTransition,
    validateTransition,
    capabilities
  } = usePhaseTransition()

  const { triggerTimeBasedTransition } = useTransitionTriggers(tripId, tripDate)
  const { triggerCompletionBasedTransition } = usePhaseCompletion()
  const { history, getPhaseStats } = useTransitionHistory()

  // State for phase-specific data
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [catches, setCatches] = useState<CatchRecord[]>([])
  const [reviews, setReviews] = useState<TripReview[]>([])
  const [currentTab, setCurrentTab] = useState('content')

  // Handle phase completion callbacks
  const handlePhaseComplete = useCallback(async (phase: ChatPhase) => {
    try {
      const result = await triggerCompletionBasedTransition(phase)
      if (result.success) {
        toast.success(`Автоматический переход из фазы "${phase}"`)
      } else if (result.error) {
        toast.info(`Фаза "${phase}" готова к переходу`)
      }
    } catch (error) {
      console.error('Error in phase completion:', error)
      onError?.(error)
    }
  }, [triggerCompletionBasedTransition, onError])

  // Handle data updates from phase components
  const handleDataUpdate = useCallback((type: string, data: any) => {
    switch (type) {
      case 'checklist':
        setChecklist(data)
        onDataUpdate?.('preparation', { checklist: data })
        break
      case 'catch':
        setCatches(prev => [...prev, data])
        onDataUpdate?.('live', { catches: [...catches, data] })
        break
      case 'review':
        setReviews(prev => [...prev, data])
        onDataUpdate?.('debrief', { reviews: [...reviews, data] })
        break
    }
  }, [catches, onDataUpdate])

  // Auto-transition monitoring
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!isTransitioning) {
        await triggerTimeBasedTransition()
      }
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [isTransitioning, triggerTimeBasedTransition])

  // Phase change notification
  useEffect(() => {
    if (currentTransition && currentTransition.status === 'completed') {
      onPhaseChange?.(currentTransition.fromPhase, currentTransition.toPhase)
      toast.success(
        `Переход завершен: ${currentTransition.fromPhase} → ${currentTransition.toPhase}`
      )
    }
  }, [currentTransition, onPhaseChange])

  // Render current phase component
  const renderPhaseContent = () => {
    const commonProps = {
      tripId,
      tripDate,
      isActive: !isTransitioning,
      onPhaseComplete: () => handlePhaseComplete(currentPhase),
      onFeatureUsed: (feature: string, data?: any) => {
        console.log(`Feature used: ${feature}`, data)
      },
      onMessageSent: (content: string) => {
        console.log('Message sent:', content)
      }
    }

    switch (currentPhase) {
      case 'preparation':
        return (
          <PreparationPhase
            {...commonProps}
            tripDetails={tripDetails}
            onChecklistUpdate={(items) => handleDataUpdate('checklist', items)}
            onGearRecommendation={(gear) => console.log('Gear recommendations:', gear)}
            onWeatherRequest={() => console.log('Weather requested')}
          />
        )

      case 'live':
        return (
          <ActiveTripPhase
            {...commonProps}
            currentLocation={currentLocation}
            onLocationShare={(location) => console.log('Location shared:', location)}
            onCatchLog={(catch_) => handleDataUpdate('catch', catch_)}
            onEmergencyAlert={(alert) => {
              console.log('Emergency alert:', alert)
              toast.error(`Экстренный сигнал: ${alert.message}`)
            }}
            onGroupCheck={() => console.log('Group check performed')}
          />
        )

      case 'debrief':
        return (
          <PostTripPhase
            {...commonProps}
            tripSummary={{
              catches,
              photos: ['photo1.jpg', 'photo2.jpg'],
              highlights: ['Отличная погода', 'Хорошие уловы'],
              totalDistance: 25.6,
              totalTime: 480,
              weather: {
                averageTemp: 18,
                windSpeed: 12,
                waveHeight: 0.8,
                visibility: 95,
                conditions: ['Ясно']
              }
            }}
            onReviewSubmit={(review) => handleDataUpdate('review', review)}
            onPhotoShare={(photos) => console.log('Photos shared:', photos)}
            onNextTripPlan={() => console.log('Next trip planning')}
          />
        )

      default:
        return <div>Unknown phase: {currentPhase}</div>
    }
  }

  // Get phase statistics
  const phaseStats = getPhaseStats()

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4">
      {/* System Status Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                Система многофазного чата
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Trip ID: {tripId} • Активная фаза: {currentPhase}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant={isTransitioning ? 'destructive' : 'default'}>
                {isTransitioning ? 'Переход...' : 'Активна'}
              </Badge>
              {capabilities && (
                <div className="text-xs text-gray-500">
                  Управление: {capabilities.canEnter ? '✅' : '❌'} / {capabilities.canExit ? '✅' : '❌'}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="content">Основное содержимое</TabsTrigger>
          <TabsTrigger value="controls">Управление переходами</TabsTrigger>
          <TabsTrigger value="history">История переходов</TabsTrigger>
          <TabsTrigger value="data">Данные фаз</TabsTrigger>
        </TabsList>

        {/* Main Phase Content */}
        <TabsContent value="content">
          <PhaseTransitionContainer
            showProgress={true}
            showPhaseIndicator={true}
            onTransitionStart={() => {
              toast.info('Начинается переход между фазами...')
            }}
            onTransitionComplete={() => {
              toast.success('Переход завершен успешно!')
            }}
            onTransitionError={(error) => {
              toast.error(`Ошибка перехода: ${error}`)
              onError?.(error)
            }}
          >
            {renderPhaseContent()}
          </PhaseTransitionContainer>
        </TabsContent>

        {/* Transition Controls */}
        <TabsContent value="controls">
          <div className="grid md:grid-cols-2 gap-4">
            <TransitionControls
              showValidation={true}
              disabled={isTransitioning}
            />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Автоматические триггеры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={triggerTimeBasedTransition}
                  disabled={isTransitioning}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Проверить временные триггеры
                </Button>
                
                <Button
                  onClick={() => handlePhaseComplete(currentPhase)}
                  disabled={isTransitioning}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Триггер завершения фазы
                </Button>
                
                <div className="text-xs text-gray-500">
                  <div>Дата поездки: {tripDate.toLocaleString('ru')}</div>
                  <div>Текущее время: {new Date().toLocaleString('ru')}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transition History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">История переходов</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {phaseStats.totalPhases}
                    </div>
                    <div className="text-xs text-blue-700">Всего фаз</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {Math.round(phaseStats.currentPhaseDuration / 1000 / 60)}м
                    </div>
                    <div className="text-xs text-green-700">Текущая фаза</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {Math.round(phaseStats.averageDuration / 1000 / 60)}м
                    </div>
                    <div className="text-xs text-purple-700">Средняя длительность</div>
                  </div>
                </div>

                {/* History entries */}
                <div className="space-y-2">
                  {history.phases.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      История переходов пуста
                    </div>
                  ) : (
                    history.phases.map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline">
                            {entry.phase}
                          </Badge>
                          <div className="text-sm">
                            <div>Вход: {entry.enteredAt.toLocaleTimeString('ru')}</div>
                            {entry.exitedAt && (
                              <div className="text-gray-500">
                                Выход: {entry.exitedAt.toLocaleTimeString('ru')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-medium">
                            {entry.duration ? `${Math.round(entry.duration / 1000 / 60)}м` : 'Активна'}
                          </div>
                          <div className="text-gray-500 capitalize">
                            {entry.trigger}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phase Data */}
        <TabsContent value="data">
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Данные подготовки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Чек-лист:</span> {checklist.length} пунктов
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Завершено:</span>{' '}
                    {checklist.filter(item => item.isCompleted).length} из {checklist.length}
                  </div>
                  {checklist.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Готовность: {Math.round((checklist.filter(item => item.isCompleted).length / checklist.length) * 100)}%
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Данные рыбалки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Уловов:</span> {catches.length}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Общий вес:</span>{' '}
                    {catches.reduce((sum, catch_) => sum + (catch_.weight || 0), 0).toFixed(1)} кг
                  </div>
                  {catches.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Виды: {new Set(catches.map(c => c.species)).size}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Отзывы</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Отзывов:</span> {reviews.length}
                  </div>
                  {reviews.length > 0 && (
                    <>
                      <div className="text-sm">
                        <span className="font-medium">Средняя оценка:</span>{' '}
                        {(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Рекомендуют: {reviews.filter(r => r.wouldRecommend).length} из {reviews.length}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Main exported component with provider
export function IntegratedPhaseSystem({
  tripId,
  tripDate,
  initialPhase = 'preparation',
  className,
  ...props
}: IntegratedPhaseSystemProps) {
  return (
    <div className={className}>
      <PhaseTransitionProvider
        tripId={tripId}
        tripDate={tripDate}
        initialPhase={initialPhase}
        config={{
          enableAutoTransitions: true,
          enableAnimations: true,
          defaultAnimation: {
            type: 'slide',
            duration: 500,
            easing: 'ease-in-out'
          }
        }}
        events={{
          onTransitionStart: async (transition) => {
            console.log('Transition started:', transition)
          },
          onTransitionComplete: async (transition) => {
            console.log('Transition completed:', transition)
          },
          onTransitionError: async (transition, error) => {
            console.error('Transition error:', error)
          }
        }}
      >
        <PhaseSystemCore
          tripId={tripId}
          tripDate={tripDate}
          {...props}
        />
      </PhaseTransitionProvider>
    </div>
  )
}
