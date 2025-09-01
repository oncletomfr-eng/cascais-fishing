/**
 * Phase History Tracker and Visualization
 * Task 17.3: Phase Transition Logic - Phase History Tracking System
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, formatDistanceToNow, differenceInMinutes, differenceInHours } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { useTransitionHistory } from '@/lib/transition/usePhaseTransition'
import {
  PhaseHistory,
  PhaseHistoryEntry,
  TransitionTrigger
} from '@/lib/transition/phase-transition-types'
import {
  Clock,
  BarChart3,
  TrendingUp,
  Calendar,
  Users,
  Activity,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Info,
  Download,
  Filter,
  Search,
  RotateCcw,
  Zap,
  User,
  Settings,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// Phase visualization configuration
const PHASE_CONFIG = {
  preparation: {
    label: 'Подготовка',
    icon: <Settings className="w-4 h-4" />,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700'
  },
  live: {
    label: 'Процесс',
    icon: <Zap className="w-4 h-4" />,
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-700'
  },
  debrief: {
    label: 'Итоги',
    icon: <CheckCircle className="w-4 h-4" />,
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-700'
  }
}

// Trigger configuration
const TRIGGER_CONFIG: Record<TransitionTrigger, { label: string; icon: React.ReactNode; color: string }> = {
  manual: { 
    label: 'Ручной', 
    icon: <User className="w-3 h-3" />, 
    color: 'bg-gray-500' 
  },
  automatic: { 
    label: 'Автоматический', 
    icon: <RotateCcw className="w-3 h-3" />, 
    color: 'bg-blue-500' 
  },
  'time-based': { 
    label: 'По времени', 
    icon: <Clock className="w-3 h-3" />, 
    color: 'bg-orange-500' 
  },
  'status-based': { 
    label: 'По статусу', 
    icon: <Activity className="w-3 h-3" />, 
    color: 'bg-green-500' 
  },
  'completion-based': { 
    label: 'По завершению', 
    icon: <CheckCircle className="w-3 h-3" />, 
    color: 'bg-purple-500' 
  },
  'captain-override': { 
    label: 'Override капитана', 
    icon: <AlertCircle className="w-3 h-3" />, 
    color: 'bg-red-500' 
  }
}

interface PhaseHistoryTrackerProps {
  className?: string
  compactMode?: boolean
  showExport?: boolean
  showFilters?: boolean
  maxEntries?: number
}

export function PhaseHistoryTracker({
  className,
  compactMode = false,
  showExport = true,
  showFilters = true,
  maxEntries = 50
}: PhaseHistoryTrackerProps) {
  const { history, getPhaseStats } = useTransitionHistory()
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [phaseFilter, setPhaseFilter] = useState<ChatPhase | 'all'>('all')
  const [triggerFilter, setTriggerFilter] = useState<TransitionTrigger | 'all'>('all')
  const [currentTab, setCurrentTab] = useState('timeline')

  // Filter history entries
  const filteredHistory = useMemo(() => {
    let filtered = [...history.phases]

    // Apply phase filter
    if (phaseFilter !== 'all') {
      filtered = filtered.filter(entry => entry.phase === phaseFilter)
    }

    // Apply trigger filter
    if (triggerFilter !== 'all') {
      filtered = filtered.filter(entry => entry.trigger === triggerFilter)
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(entry => 
        entry.phase.toLowerCase().includes(term) ||
        entry.trigger.toLowerCase().includes(term) ||
        (entry.notes && entry.notes.toLowerCase().includes(term))
      )
    }

    // Limit results
    return filtered.slice(-maxEntries)
  }, [history.phases, phaseFilter, triggerFilter, searchTerm, maxEntries])

  // Calculate statistics
  const stats = useMemo(() => {
    const phaseStats = getPhaseStats()
    const phaseCounts = history.phases.reduce((acc, entry) => {
      acc[entry.phase] = (acc[entry.phase] || 0) + 1
      return acc
    }, {} as Record<ChatPhase, number>)

    const triggerCounts = history.phases.reduce((acc, entry) => {
      acc[entry.trigger] = (acc[entry.trigger] || 0) + 1
      return acc
    }, {} as Record<TransitionTrigger, number>)

    const avgDuration = history.phases
      .filter(entry => entry.duration !== null)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0) / 
      history.phases.filter(entry => entry.duration !== null).length || 0

    return {
      ...phaseStats,
      phaseCounts,
      triggerCounts,
      avgDuration,
      totalTransitions: history.transitionCount,
      activePhase: history.phases[history.phases.length - 1]?.phase
    }
  }, [history, getPhaseStats])

  // Export history data
  const exportHistory = useCallback(() => {
    const data = {
      tripId: history.tripId,
      exportedAt: new Date().toISOString(),
      totalTransitions: history.transitionCount,
      totalDuration: history.totalDuration,
      phases: history.phases,
      statistics: stats
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phase-history-${history.tripId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [history, stats])

  // Format duration
  const formatDuration = useCallback((ms: number | null): string => {
    if (ms === null) return 'Активна'
    
    const minutes = Math.floor(ms / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}ч ${minutes % 60}м`
    }
    return `${minutes}м`
  }, [])

  if (compactMode) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            История фаз
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-blue-50 rounded">
                <div className="text-lg font-bold text-blue-600">{stats.totalTransitions}</div>
                <div className="text-xs text-blue-700">Переходов</div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="text-lg font-bold text-green-600">
                  {formatDuration(stats.currentPhaseDuration)}
                </div>
                <div className="text-xs text-green-700">Текущая</div>
              </div>
              <div className="p-2 bg-purple-50 rounded">
                <div className="text-lg font-bold text-purple-600">
                  {formatDuration(stats.avgDuration)}
                </div>
                <div className="text-xs text-purple-700">Средняя</div>
              </div>
            </div>

            {/* Recent Entries */}
            <div className="space-y-1">
              {filteredHistory.slice(-3).map((entry, index) => {
                const config = PHASE_CONFIG[entry.phase]
                const triggerConfig = TRIGGER_CONFIG[entry.trigger]
                
                return (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-xs">
                    <div className="flex items-center space-x-2">
                      <div className={cn('w-2 h-2 rounded-full', config.color)} />
                      <span>{config.label}</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-500">
                      {triggerConfig.icon}
                      <span>{formatDistanceToNow(entry.enteredAt, { locale: ru })}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            История переходов фаз
          </CardTitle>
          <div className="flex items-center space-x-2">
            {showExport && (
              <Button size="sm" variant="outline" onClick={exportHistory}>
                <Download className="w-4 h-4 mr-1" />
                Экспорт
              </Button>
            )}
            <Badge variant="outline">
              {history.phases.length} записей
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Временная шкала</TabsTrigger>
            <TabsTrigger value="statistics">Статистика</TabsTrigger>
            <TabsTrigger value="analysis">Анализ</TabsTrigger>
          </TabsList>

          {/* Filters */}
          {showFilters && (
            <div className="flex items-center space-x-4 mt-4 mb-4">
              <div className="flex-1">
                <Input
                  placeholder="Поиск по фазам, триггерам..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                />
              </div>
              <Select value={phaseFilter} onValueChange={(value: any) => setPhaseFilter(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все фазы</SelectItem>
                  <SelectItem value="preparation">Подготовка</SelectItem>
                  <SelectItem value="live">Процесс</SelectItem>
                  <SelectItem value="debrief">Итоги</SelectItem>
                </SelectContent>
              </Select>
              <Select value={triggerFilter} onValueChange={(value: any) => setTriggerFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все триггеры</SelectItem>
                  {Object.entries(TRIGGER_CONFIG).map(([trigger, config]) => (
                    <SelectItem key={trigger} value={trigger}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>История переходов пуста</p>
                <p className="text-sm">Переходы между фазами будут отображаться здесь</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map((entry, index) => {
                  const config = PHASE_CONFIG[entry.phase]
                  const triggerConfig = TRIGGER_CONFIG[entry.trigger]
                  const isActive = !entry.exitedAt
                  const nextEntry = filteredHistory[index + 1]
                  
                  return (
                    <div key={index} className="relative">
                      {/* Timeline line */}
                      {index < filteredHistory.length - 1 && (
                        <div className="absolute left-6 top-12 w-0.5 h-8 bg-gray-200" />
                      )}
                      
                      <div className={cn(
                        'flex items-start space-x-4 p-4 border rounded-lg transition-colors',
                        isActive ? config.bgColor : 'bg-gray-50',
                        isActive ? config.borderColor : 'border-gray-200'
                      )}>
                        {/* Phase Icon */}
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          isActive ? config.color : 'bg-gray-400',
                          'text-white flex-shrink-0'
                        )}>
                          {config.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <h4 className={cn(
                                'font-medium',
                                isActive ? config.textColor : 'text-gray-900'
                              )}>
                                {config.label}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ backgroundColor: triggerConfig.color }}
                              >
                                <span className="text-white flex items-center">
                                  {triggerConfig.icon}
                                  <span className="ml-1">{triggerConfig.label}</span>
                                </span>
                              </Badge>
                              {isActive && (
                                <Badge variant="default" className="text-xs">
                                  Активна
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDuration(entry.duration)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Начало:</span>{' '}
                              <span className="font-medium">
                                {format(entry.enteredAt, 'dd.MM.yyyy HH:mm', { locale: ru })}
                              </span>
                            </div>
                            {entry.exitedAt && (
                              <div>
                                <span className="text-gray-600">Конец:</span>{' '}
                                <span className="font-medium">
                                  {format(entry.exitedAt, 'dd.MM.yyyy HH:mm', { locale: ru })}
                                </span>
                              </div>
                            )}
                          </div>

                          {entry.notes && (
                            <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                              <Info className="w-3 h-3 inline mr-1" />
                              {entry.notes}
                            </div>
                          )}

                          {entry.completionData && (
                            <div className="mt-2">
                              <Progress 
                                value={entry.completionData.completionPercentage} 
                                className="h-2"
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                Завершено: {entry.completionData.completionPercentage.toFixed(0)}%
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Transition Arrow */}
                        {nextEntry && (
                          <div className="flex items-center text-gray-400">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalTransitions}</div>
                  <div className="text-sm text-gray-600">Всего переходов</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatDuration(stats.totalDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Общая длительность</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {formatDuration(stats.avgDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Средняя длительность</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatDuration(stats.currentPhaseDuration)}
                  </div>
                  <div className="text-sm text-gray-600">Текущая фаза</div>
                </CardContent>
              </Card>
            </div>

            {/* Phase Distribution */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Распределение по фазам</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.phaseCounts).map(([phase, count]) => {
                    const config = PHASE_CONFIG[phase as ChatPhase]
                    const percentage = (count / stats.totalPhases) * 100
                    
                    return (
                      <div key={phase} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className={cn('w-3 h-3 rounded-full', config.color)} />
                            <span>{config.label}</span>
                          </div>
                          <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Распределение по триггерам</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(stats.triggerCounts).map(([trigger, count]) => {
                    const config = TRIGGER_CONFIG[trigger as TransitionTrigger]
                    const percentage = (count / stats.totalTransitions) * 100
                    
                    return (
                      <div key={trigger} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            {config.icon}
                            <span>{config.label}</span>
                          </div>
                          <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Паттерны переходов</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Автоматические переходы:</span>
                      <span className="font-medium">
                        {((stats.triggerCounts.automatic || 0) / stats.totalTransitions * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ручные переходы:</span>
                      <span className="font-medium">
                        {((stats.triggerCounts.manual || 0) / stats.totalTransitions * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Override капитана:</span>
                      <span className="font-medium">
                        {((stats.triggerCounts['captain-override'] || 0) / stats.totalTransitions * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Efficiency */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Эффективность фаз</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Подготовка (среднее):</span>
                      <span className="font-medium">
                        {formatDuration(stats.avgDuration)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Процесс (среднее):</span>
                      <span className="font-medium">
                        {formatDuration(stats.avgDuration)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Итоги (среднее):</span>
                      <span className="font-medium">
                        {formatDuration(stats.avgDuration)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Рекомендации</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.triggerCounts['captain-override'] > 2 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-amber-800">Частые override</div>
                          <div className="text-amber-700">
                            Обнаружено {stats.triggerCounts['captain-override']} случаев принудительного перехода.
                            Рассмотрите возможность корректировки автоматических правил.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {stats.avgDuration > 3600000 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-blue-800">Длительные фазы</div>
                          <div className="text-blue-700">
                            Средняя длительность фаз превышает час. 
                            Возможно, стоит оптимизировать процессы.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {stats.totalTransitions < 3 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                        <div className="text-sm">
                          <div className="font-medium text-green-800">Стабильная работа</div>
                          <div className="text-green-700">
                            Система переходов работает стабильно с минимальным количеством изменений.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
