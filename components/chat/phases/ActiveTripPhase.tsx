/**
 * Active Trip Phase Component
 * Task 17.2: Phase-Specific UI Components - Real-Time Communication Tools
 */

'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Camera,
  Users,
  AlertTriangle,
  Clock,
  Cloud,
  Fish,
  Waves,
  Radio,
  Bell,
  Share2,
  Target,
  Compass,
  Activity,
  Eye,
  Zap,
  Heart,
  MessageSquare,
  Send,
  Plus,
  Minus,
  RotateCcw,
  Settings2,
  Timer,
  Signal,
  BatteryLow,
  Anchor
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import {
  ActiveTripPhaseProps,
  CatchRecord,
  EmergencyAlert,
  PhaseUIState,
  PhaseFeatureAction
} from './types'

// Mock current trip data
const MOCK_TRIP_DATA = {
  startTime: new Date(),
  duration: 0, // in minutes
  participantCount: 5,
  catchesCount: 12,
  lastUpdate: new Date(),
  weatherStatus: 'good',
  groupStatus: 'safe'
}

// Emergency alert types
const EMERGENCY_TYPES = [
  { value: 'medical', label: 'Медицинская помощь', severity: 'critical', icon: Heart },
  { value: 'weather', label: 'Погодные условия', severity: 'high', icon: Cloud },
  { value: 'equipment', label: 'Поломка оборудования', severity: 'medium', icon: Settings2 },
  { value: 'location', label: 'Проблемы с навигацией', severity: 'high', icon: MapPin },
  { value: 'other', label: 'Другое', severity: 'medium', icon: AlertTriangle }
]

// Fish species for quick catch logging
const FISH_SPECIES = [
  'Треска', 'Камбала', 'Морской окунь', 'Сельдь', 'Скумбрия', 
  'Дорада', 'Лаврак', 'Тунец', 'Другое'
]

export function ActiveTripPhase({
  tripId,
  tripDate,
  currentLocation,
  className,
  isActive = false,
  onLocationShare,
  onCatchLog,
  onEmergencyAlert,
  onGroupCheck,
  onPhaseComplete,
  onFeatureUsed,
  onMessageSent
}: ActiveTripPhaseProps) {
  // State management
  const [catches, setCatches] = useState<CatchRecord[]>([])
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false)
  const [catchDialogOpen, setCatchDialogOpen] = useState(false)
  const [locationSharing, setLocationSharing] = useState(true)
  const [groupCheckTimer, setGroupCheckTimer] = useState<NodeJS.Timeout | null>(null)
  const [quickMessage, setQuickMessage] = useState('')
  
  const [uiState, setUIState] = useState<PhaseUIState>({
    activeTab: 'live',
    isExpanded: true,
    showAdvancedFeatures: false,
    notifications: [],
    loading: {},
    errors: {}
  })

  // New catch form
  const [newCatch, setNewCatch] = useState({
    species: '',
    size: '',
    weight: '',
    technique: '',
    bait: '',
    notes: ''
  })

  // Emergency alert form
  const [emergencyForm, setEmergencyForm] = useState({
    type: 'other' as EmergencyAlert['type'],
    severity: 'medium' as EmergencyAlert['severity'],
    message: ''
  })

  // Trip statistics
  const tripStats = useMemo(() => {
    const now = new Date()
    const startTime = MOCK_TRIP_DATA.startTime
    const duration = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60)) // minutes
    
    return {
      duration,
      durationFormatted: `${Math.floor(duration / 60)}ч ${duration % 60}м`,
      catches: catches.length,
      lastCatch: catches.length > 0 ? catches[catches.length - 1] : null,
      averageCatchRate: duration > 0 ? (catches.length / (duration / 60)).toFixed(1) : '0',
      participantsOnline: MOCK_TRIP_DATA.participantCount
    }
  }, [catches])

  // Feature actions for active trip
  const featureActions: PhaseFeatureAction[] = [
    {
      id: 'location-share',
      label: 'Поделиться локацией',
      icon: <MapPin className="w-4 h-4" />,
      type: 'location_share',
      description: 'Отправить текущее местоположение',
      isEnabled: !!currentLocation,
      onClick: () => {
        if (currentLocation && onLocationShare) {
          onLocationShare({
            coordinates: currentLocation,
            locationType: 'fishing_spot',
            timestamp: new Date(),
            notes: 'Текущая позиция'
          })
          onFeatureUsed?.('location_share', currentLocation)
        }
      }
    },
    {
      id: 'catch-log',
      label: 'Записать улов',
      icon: <Fish className="w-4 h-4" />,
      type: 'catch_photo',
      description: 'Зафиксировать пойманную рыбу',
      isEnabled: true,
      onClick: () => setCatchDialogOpen(true)
    },
    {
      id: 'weather-update',
      label: 'Обновить погоду',
      icon: <Cloud className="w-4 h-4" />,
      type: 'weather_update',
      description: 'Сообщить о погодных условиях',
      isEnabled: true,
      onClick: () => onFeatureUsed?.('weather_update')
    },
    {
      id: 'emergency-alert',
      label: 'Экстренный сигнал',
      icon: <AlertTriangle className="w-4 h-4" />,
      type: 'ui_action',
      description: 'Отправить сигнал о помощи',
      isEnabled: true,
      onClick: () => setEmergencyDialogOpen(true)
    },
    {
      id: 'group-check',
      label: 'Проверка группы',
      icon: <Users className="w-4 h-4" />,
      type: 'ui_action',
      description: 'Проверить статус всех участников',
      isEnabled: true,
      onClick: () => {
        onGroupCheck?.()
        onFeatureUsed?.('group_check')
      }
    }
  ]

  // Handle location sharing toggle
  const toggleLocationSharing = useCallback(() => {
    setLocationSharing(prev => {
      const newState = !prev
      onFeatureUsed?.('location_sharing_toggle', { enabled: newState })
      return newState
    })
  }, [onFeatureUsed])

  // Handle catch logging
  const handleCatchSubmit = () => {
    if (!newCatch.species) return

    const catchRecord: CatchRecord = {
      id: `catch-${Date.now()}`,
      species: newCatch.species,
      size: newCatch.size ? parseFloat(newCatch.size) : undefined,
      weight: newCatch.weight ? parseFloat(newCatch.weight) : undefined,
      technique: newCatch.technique || undefined,
      bait: newCatch.bait || undefined,
      time: new Date(),
      location: currentLocation,
      notes: newCatch.notes || undefined
    }

    setCatches(prev => [...prev, catchRecord])
    
    if (onCatchLog) {
      onCatchLog({
        imageUrl: '', // Would be handled by photo upload
        fishSpecies: catchRecord.species,
        fishSize: catchRecord.size,
        fishWeight: catchRecord.weight,
        location: catchRecord.location,
        technique: catchRecord.technique,
        bait: catchRecord.bait,
        timeOfCatch: catchRecord.time,
        notes: catchRecord.notes
      })
    }

    // Reset form
    setNewCatch({
      species: '',
      size: '',
      weight: '',
      technique: '',
      bait: '',
      notes: ''
    })
    setCatchDialogOpen(false)
    onFeatureUsed?.('catch_logged', catchRecord)
  }

  // Handle emergency alert
  const handleEmergencySubmit = () => {
    if (!emergencyForm.message.trim()) return

    const alert: EmergencyAlert = {
      type: emergencyForm.type,
      severity: emergencyForm.severity,
      message: emergencyForm.message,
      location: currentLocation,
      timestamp: new Date()
    }

    onEmergencyAlert?.(alert)
    onFeatureUsed?.('emergency_alert', alert)
    
    // Reset form and close dialog
    setEmergencyForm({
      type: 'other',
      severity: 'medium',
      message: ''
    })
    setEmergencyDialogOpen(false)
  }

  // Send quick message
  const sendQuickMessage = () => {
    if (!quickMessage.trim()) return
    
    onMessageSent?.(quickMessage)
    setQuickMessage('')
    onFeatureUsed?.('quick_message_sent')
  }

  // Auto group check every 30 minutes
  useEffect(() => {
    if (isActive) {
      const timer = setInterval(() => {
        onGroupCheck?.()
        onFeatureUsed?.('auto_group_check')
      }, 30 * 60 * 1000) // 30 minutes

      setGroupCheckTimer(timer)
      return () => clearInterval(timer)
    }
  }, [isActive, onGroupCheck, onFeatureUsed])

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
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl text-green-900">
                  🚤 Рыбалка в процессе
                </CardTitle>
                <p className="text-sm text-green-700">
                  В пути {tripStats.durationFormatted}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Live indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-700 font-medium">LIVE</span>
              </div>
              
              {/* Location sharing status */}
              <div className="flex items-center space-x-2">
                <Signal className={cn(
                  "w-4 h-4",
                  locationSharing ? "text-green-600" : "text-gray-400"
                )} />
                <Switch
                  checked={locationSharing}
                  onCheckedChange={toggleLocationSharing}
                  size="sm"
                />
              </div>
            </div>
          </div>
          
          {/* Trip Stats */}
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-900">{tripStats.catches}</div>
              <div className="text-xs text-green-600">Уловов</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-900">{tripStats.averageCatchRate}</div>
              <div className="text-xs text-green-600">шт/час</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-900">{tripStats.participantsOnline}</div>
              <div className="text-xs text-green-600">Онлайн</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-900">
                {currentLocation ? '●' : '○'}
              </div>
              <div className="text-xs text-green-600">GPS</div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {featureActions.map(action => (
          <Button
            key={action.id}
            variant={action.id === 'emergency-alert' ? 'destructive' : 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={!action.isEnabled || action.isLoading}
            className={cn(
              "h-8",
              action.id === 'emergency-alert' && "bg-red-500 hover:bg-red-600"
            )}
          >
            {action.icon}
            <span className="ml-1">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Quick Message */}
      <Card className="border-blue-200">
        <CardContent className="pt-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Быстрое сообщение группе..."
              value={quickMessage}
              onChange={(e) => setQuickMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendQuickMessage()}
              className="flex-1"
            />
            <Button onClick={sendQuickMessage} size="sm">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs 
        value={uiState.activeTab} 
        onValueChange={(tab) => setUIState(prev => ({ ...prev, activeTab: tab }))}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="live">Онлайн</TabsTrigger>
          <TabsTrigger value="catches">Уловы</TabsTrigger>
          <TabsTrigger value="location">Карта</TabsTrigger>
          <TabsTrigger value="group">Группа</TabsTrigger>
        </TabsList>

        {/* Live Tab */}
        <TabsContent value="live" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Current Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Waves className="w-5 h-5" />
                  <span>Текущие условия</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Погода</span>
                  <Badge variant="default">Хорошая</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Ветер</span>
                  <span className="text-sm font-medium">СЗ 5 м/с</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Волны</span>
                  <span className="text-sm font-medium">0.5-1.0 м</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Видимость</span>
                  <span className="text-sm font-medium">Отличная</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Последняя активность</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tripStats.lastCatch ? (
                  <div className="p-2 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium">Последний улов</div>
                    <div className="text-xs text-gray-600">
                      {tripStats.lastCatch.species} • {format(tripStats.lastCatch.time, 'HH:mm')}
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600">Пока нет уловов</div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  Последнее обновление: {format(new Date(), 'HH:mm:ss')}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Catches Tab */}
        <TabsContent value="catches" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Журнал уловов</CardTitle>
                <Button onClick={() => setCatchDialogOpen(true)} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {catches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Fish className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Пока нет записей об уловах</p>
                  <p className="text-sm">Нажмите "Добавить" чтобы записать первый улов</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {catches.map((catch_) => (
                    <motion.div
                      key={catch_.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Fish className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{catch_.species}</span>
                          {catch_.size && (
                            <Badge variant="outline">{catch_.size} см</Badge>
                          )}
                          {catch_.weight && (
                            <Badge variant="outline">{catch_.weight} кг</Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(catch_.time, 'HH:mm')}
                        </div>
                      </div>
                      
                      {(catch_.technique || catch_.bait) && (
                        <div className="text-sm text-gray-600 mb-1">
                          {catch_.technique && `Техника: ${catch_.technique}`}
                          {catch_.technique && catch_.bait && ' • '}
                          {catch_.bait && `Наживка: ${catch_.bait}`}
                        </div>
                      )}
                      
                      {catch_.notes && (
                        <div className="text-sm text-gray-600">{catch_.notes}</div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Compass className="w-5 h-5" />
                <span>Навигация и локация</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentLocation ? (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium mb-2">Текущие координаты</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Широта: {currentLocation.lat.toFixed(6)}</div>
                      <div>Долгота: {currentLocation.lng.toFixed(6)}</div>
                      {currentLocation.accuracy && (
                        <div>Точность: ±{currentLocation.accuracy}м</div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={() => featureActions[0].onClick()}
                    className="w-full"
                    variant="outline"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Поделиться текущей позицией
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>GPS недоступен</p>
                  <p className="text-sm">Проверьте настройки геолокации</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Group Tab */}
        <TabsContent value="group" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Участники группы</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium">Капитан</span>
                  </div>
                  <Badge variant="default">Онлайн</Badge>
                </div>
                
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Участник {i + 1}</span>
                    </div>
                    <Badge variant="outline">Онлайн</Badge>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={() => featureActions[4].onClick()}
                className="w-full mt-4"
                variant="outline"
              >
                <Bell className="w-4 h-4 mr-2" />
                Проверить всех участников
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Catch Logging Dialog */}
      <Dialog open={catchDialogOpen} onOpenChange={setCatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Записать улов</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="species">Вид рыбы *</Label>
              <Select value={newCatch.species} onValueChange={(value) => 
                setNewCatch(prev => ({ ...prev, species: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите вид рыбы" />
                </SelectTrigger>
                <SelectContent>
                  {FISH_SPECIES.map((species) => (
                    <SelectItem key={species} value={species}>
                      {species}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size">Размер (см)</Label>
                <Input
                  id="size"
                  type="number"
                  value={newCatch.size}
                  onChange={(e) => setNewCatch(prev => ({ ...prev, size: e.target.value }))}
                  placeholder="30"
                />
              </div>
              <div>
                <Label htmlFor="weight">Вес (кг)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={newCatch.weight}
                  onChange={(e) => setNewCatch(prev => ({ ...prev, weight: e.target.value }))}
                  placeholder="1.5"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="technique">Техника ловли</Label>
                <Input
                  id="technique"
                  value={newCatch.technique}
                  onChange={(e) => setNewCatch(prev => ({ ...prev, technique: e.target.value }))}
                  placeholder="Спиннинг"
                />
              </div>
              <div>
                <Label htmlFor="bait">Наживка</Label>
                <Input
                  id="bait"
                  value={newCatch.bait}
                  onChange={(e) => setNewCatch(prev => ({ ...prev, bait: e.target.value }))}
                  placeholder="Воблер"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">Заметки</Label>
              <Textarea
                id="notes"
                value={newCatch.notes}
                onChange={(e) => setNewCatch(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleCatchSubmit}
                disabled={!newCatch.species}
                className="flex-1"
              >
                <Fish className="w-4 h-4 mr-2" />
                Записать улов
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setCatchDialogOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emergency Alert Dialog */}
      <Dialog open={emergencyDialogOpen} onOpenChange={setEmergencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Экстренный сигнал</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Тип проблемы *</Label>
              <Select value={emergencyForm.type} onValueChange={(value: EmergencyAlert['type']) => 
                setEmergencyForm(prev => ({ ...prev, type: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMERGENCY_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center space-x-2">
                        <type.icon className="w-4 h-4" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Степень срочности</Label>
              <Select value={emergencyForm.severity} onValueChange={(value: EmergencyAlert['severity']) => 
                setEmergencyForm(prev => ({ ...prev, severity: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкая</SelectItem>
                  <SelectItem value="medium">Средняя</SelectItem>
                  <SelectItem value="high">Высокая</SelectItem>
                  <SelectItem value="critical">Критическая</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="emergency-message">Описание ситуации *</Label>
              <Textarea
                id="emergency-message"
                value={emergencyForm.message}
                onChange={(e) => setEmergencyForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Опишите что происходит..."
                rows={4}
                className="resize-none"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleEmergencySubmit}
                disabled={!emergencyForm.message.trim()}
                variant="destructive"
                className="flex-1"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Отправить сигнал
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEmergencyDialogOpen(false)}
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
