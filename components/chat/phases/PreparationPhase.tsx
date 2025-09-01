/**
 * Preparation Phase Component
 * Task 17.2: Phase-Specific UI Components - Trip Planning Features
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar,
  MapPin,
  Users,
  CheckCircle,
  Circle,
  Clock,
  Cloud,
  Fish,
  AlertTriangle,
  Lightbulb,
  Package,
  FileText,
  Settings,
  Plus,
  Check,
  X,
  Info,
  Star,
  Target
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import {
  PreparationPhaseProps,
  ChecklistItem,
  GearItem,
  PhaseUIState,
  PhaseFeatureAction
} from './types'

// Default checklist items for fishing trips
const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    id: 'gear-check',
    title: 'Проверить снасти',
    description: 'Удочки, катушки, леска, крючки',
    category: 'gear',
    isCompleted: false,
    isRequired: true,
    priority: 'high'
  },
  {
    id: 'bait-prep',
    title: 'Подготовить наживку',
    description: 'Живая наживка, искусственные приманки',
    category: 'preparation',
    isCompleted: false,
    isRequired: true,
    priority: 'high'
  },
  {
    id: 'weather-check',
    title: 'Проверить погоду',
    description: 'Ветер, волны, осадки на день рыбалки',
    category: 'preparation',
    isCompleted: false,
    isRequired: true,
    priority: 'high'
  },
  {
    id: 'safety-gear',
    title: 'Проверить спасательные средства',
    description: 'Жилеты, аптечка, средства связи',
    category: 'safety',
    isCompleted: false,
    isRequired: true,
    priority: 'high'
  },
  {
    id: 'documents',
    title: 'Документы и лицензии',
    description: 'Лицензия на рыбалку, документы судна',
    category: 'documents',
    isCompleted: false,
    isRequired: true,
    priority: 'medium'
  },
  {
    id: 'food-water',
    title: 'Еда и вода',
    description: 'Достаточно провизии на всю поездку',
    category: 'preparation',
    isCompleted: false,
    isRequired: false,
    priority: 'medium'
  },
  {
    id: 'communication',
    title: 'Связь с участниками',
    description: 'Убедиться что все знают план',
    category: 'preparation',
    isCompleted: false,
    isRequired: false,
    priority: 'medium'
  }
]

// Recommended gear based on trip type
const GEAR_RECOMMENDATIONS: GearItem[] = [
  {
    id: 'rod-main',
    name: 'Основная удочка',
    category: 'rod',
    isRequired: true,
    recommendations: ['Спиннинг 2.7м, тест 10-30г', 'Фидер 3.6м для донной ловли']
  },
  {
    id: 'reel-main',
    name: 'Катушка',
    category: 'reel',
    isRequired: true,
    recommendations: ['Безынерционная 3000-4000', 'Мультипликатор для крупной рыбы']
  },
  {
    id: 'bait-live',
    name: 'Живая наживка',
    category: 'bait',
    isRequired: false,
    recommendations: ['Черви, опарыш', 'Мотыль для холодной воды', 'Креветки для морской рыбалки']
  },
  {
    id: 'safety-vest',
    name: 'Спасательный жилет',
    category: 'safety',
    isRequired: true,
    recommendations: ['Автоматический надувной', 'Классический пенный']
  }
]

export function PreparationPhase({
  tripId,
  tripDate,
  tripDetails,
  className,
  isActive = false,
  onChecklistUpdate,
  onGearRecommendation,
  onWeatherRequest,
  onPhaseComplete,
  onFeatureUsed,
  onMessageSent
}: PreparationPhaseProps) {
  // State management
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST)
  const [gear, setGear] = useState<GearItem[]>(GEAR_RECOMMENDATIONS)
  const [uiState, setUIState] = useState<PhaseUIState>({
    activeTab: 'overview',
    isExpanded: true,
    showAdvancedFeatures: false,
    notifications: [],
    loading: {},
    errors: {}
  })
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [notes, setNotes] = useState('')

  // Calculate preparation progress
  const preparationProgress = useMemo(() => {
    const totalItems = checklist.length
    const completedItems = checklist.filter(item => item.isCompleted).length
    const requiredItems = checklist.filter(item => item.isRequired).length
    const completedRequiredItems = checklist.filter(item => item.isRequired && item.isCompleted).length
    
    return {
      overall: totalItems > 0 ? (completedItems / totalItems) * 100 : 0,
      required: requiredItems > 0 ? (completedRequiredItems / requiredItems) * 100 : 0,
      totalItems,
      completedItems,
      requiredItems,
      completedRequiredItems,
      isReadyForTrip: completedRequiredItems === requiredItems
    }
  }, [checklist])

  // Time until trip
  const timeUntilTrip = useMemo(() => {
    return formatDistanceToNow(tripDate, { locale: ru, addSuffix: true })
  }, [tripDate])

  // Feature actions available in preparation phase
  const featureActions: PhaseFeatureAction[] = [
    {
      id: 'weather-update',
      label: 'Прогноз погоды',
      icon: <Cloud className="w-4 h-4" />,
      type: 'weather_update',
      description: 'Получить актуальный прогноз',
      isEnabled: true,
      onClick: () => {
        onWeatherRequest?.()
        onFeatureUsed?.('weather_request')
      }
    },
    {
      id: 'fishing-tips',
      label: 'Советы по рыбалке',
      icon: <Lightbulb className="w-4 h-4" />,
      type: 'fishing_tip',
      description: 'Поделиться советами',
      isEnabled: true,
      onClick: () => {
        onFeatureUsed?.('fishing_tips')
      }
    },
    {
      id: 'gear-recommend',
      label: 'Рекомендации снастей',
      icon: <Package className="w-4 h-4" />,
      type: 'ui_action',
      description: 'Получить рекомендации по снастям',
      isEnabled: true,
      onClick: () => {
        onGearRecommendation?.(gear)
        onFeatureUsed?.('gear_recommendations', gear)
      }
    }
  ]

  // Handle checklist item toggle
  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item
    )
    setChecklist(updatedChecklist)
    onChecklistUpdate?.(updatedChecklist)
    onFeatureUsed?.('checklist_update', { itemId, completed: !checklist.find(i => i.id === itemId)?.isCompleted })
  }

  // Add new checklist item
  const addChecklistItem = () => {
    if (!newChecklistItem.trim()) return

    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}`,
      title: newChecklistItem.trim(),
      category: 'preparation',
      isCompleted: false,
      isRequired: false,
      priority: 'medium'
    }

    const updatedChecklist = [...checklist, newItem]
    setChecklist(updatedChecklist)
    setNewChecklistItem('')
    onChecklistUpdate?.(updatedChecklist)
  }

  // Remove checklist item
  const removeChecklistItem = (itemId: string) => {
    const updatedChecklist = checklist.filter(item => item.id !== itemId)
    setChecklist(updatedChecklist)
    onChecklistUpdate?.(updatedChecklist)
  }

  // Update UI state
  const updateUIState = (updates: Partial<PhaseUIState>) => {
    setUIState(prev => ({ ...prev, ...updates }))
  }

  // Auto-complete phase if ready
  useEffect(() => {
    if (preparationProgress.isReadyForTrip && onPhaseComplete) {
      // Add a small delay to allow user to see completion
      const timer = setTimeout(() => {
        onPhaseComplete()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [preparationProgress.isReadyForTrip, onPhaseComplete])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isActive ? 1 : 0.7, y: 0 }}
      className={cn(
        "w-full max-w-4xl mx-auto space-y-4",
        !isActive && "pointer-events-none",
        className
      )}
    >
      {/* Phase Header */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-blue-900">
                  🎣 Подготовка к поездке
                </CardTitle>
                <p className="text-sm text-blue-700">
                  Отправление {timeUntilTrip}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-900">
                {Math.round(preparationProgress.overall)}%
              </div>
              <div className="text-xs text-blue-600">готовности</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-blue-700 mb-1">
              <span>Общий прогресс</span>
              <span>{preparationProgress.completedItems} / {preparationProgress.totalItems}</span>
            </div>
            <Progress value={preparationProgress.overall} className="h-2" />
            
            {preparationProgress.required < 100 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-red-600 mb-1">
                  <span>Обязательные пункты</span>
                  <span>{preparationProgress.completedRequiredItems} / {preparationProgress.requiredItems}</span>
                </div>
                <Progress value={preparationProgress.required} className="h-1" />
              </div>
            )}
          </div>

          {/* Ready status */}
          {preparationProgress.isReadyForTrip && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-3 p-2 bg-green-100 rounded-lg border border-green-200"
            >
              <div className="flex items-center space-x-2 text-green-800">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Готовы к поездке!</span>
              </div>
            </motion.div>
          )}
        </CardHeader>
      </Card>

      {/* Feature Actions */}
      <div className="flex flex-wrap gap-2">
        {featureActions.map(action => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={action.onClick}
            disabled={!action.isEnabled || action.isLoading}
            className="h-8"
          >
            {action.icon}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Main Content */}
      <Tabs 
        value={uiState.activeTab} 
        onValueChange={(tab) => updateUIState({ activeTab: tab })}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="checklist">Чек-лист</TabsTrigger>
          <TabsTrigger value="gear">Снасти</TabsTrigger>
          <TabsTrigger value="details">Детали</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Trip Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Fish className="w-5 h-5" />
                  <span>Информация о поездке</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tripDetails?.destination && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{tripDetails.destination}</span>
                  </div>
                )}
                
                {tripDetails?.duration && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">{tripDetails.duration} часов</span>
                  </div>
                )}
                
                {tripDetails?.maxParticipants && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm">До {tripDetails.maxParticipants} участников</span>
                  </div>
                )}
                
                {tripDetails?.difficulty && (
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <Badge variant={
                      tripDetails.difficulty === 'beginner' ? 'secondary' :
                      tripDetails.difficulty === 'intermediate' ? 'default' : 'destructive'
                    }>
                      {tripDetails.difficulty === 'beginner' ? 'Новичок' :
                       tripDetails.difficulty === 'intermediate' ? 'Средний' : 'Продвинутый'}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Info className="w-5 h-5" />
                  <span>Статистика подготовки</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {preparationProgress.completedItems}
                    </div>
                    <div className="text-xs text-gray-600">Выполнено</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {preparationProgress.totalItems - preparationProgress.completedItems}
                    </div>
                    <div className="text-xs text-gray-600">Осталось</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {preparationProgress.requiredItems - preparationProgress.completedRequiredItems}
                    </div>
                    <div className="text-xs text-gray-600">Обязательных</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {format(tripDate, 'd', { locale: ru })}
                    </div>
                    <div className="text-xs text-gray-600">
                      {format(tripDate, 'MMM', { locale: ru })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Чек-лист подготовки</CardTitle>
                <Badge variant={preparationProgress.isReadyForTrip ? "default" : "secondary"}>
                  {preparationProgress.completedItems} / {preparationProgress.totalItems}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Add new item */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Добавить пункт в чек-лист..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                  className="flex-1"
                />
                <Button onClick={addChecklistItem} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <Separator />

              {/* Checklist items */}
              <div className="space-y-2">
                {checklist.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border transition-colors",
                      item.isCompleted 
                        ? "bg-green-50 border-green-200" 
                        : item.isRequired
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-200"
                    )}
                  >
                    <button
                      onClick={() => toggleChecklistItem(item.id)}
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        item.isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-gray-400"
                      )}
                    >
                      {item.isCompleted && <Check className="w-3 h-3" />}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={cn(
                          "font-medium",
                          item.isCompleted && "line-through text-gray-500"
                        )}>
                          {item.title}
                        </span>
                        {item.isRequired && (
                          <Badge variant="destructive" className="text-xs">
                            Обязательно
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.priority === 'high' ? 'Высокий' : 
                           item.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>

                    {!item.isRequired && item.id.startsWith('custom-') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChecklistItem(item.id)}
                        className="w-8 h-8 p-0 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gear Tab */}
        <TabsContent value="gear" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Рекомендуемые снасти</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {gear.map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{item.name}</span>
                      {item.isRequired && (
                        <Badge variant="destructive" className="text-xs">
                          Обязательно
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline">
                      {item.category === 'rod' ? 'Удочка' :
                       item.category === 'reel' ? 'Катушка' :
                       item.category === 'bait' ? 'Наживка' :
                       item.category === 'safety' ? 'Безопасность' : 'Другое'}
                    </Badge>
                  </div>
                  
                  {item.recommendations && (
                    <div className="space-y-1">
                      {item.recommendations.map((rec, index) => (
                        <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                          <Star className="w-3 h-3 mt-0.5 text-yellow-500" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Заметки и детали</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Добавьте заметки о подготовке, особые требования, контакты..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {tripDetails?.requiredGear && (
            <Card>
              <CardHeader>
                <CardTitle>Требуемое снаряжение</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tripDetails.requiredGear.map((item, index) => (
                    <Badge key={index} variant="outline">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
