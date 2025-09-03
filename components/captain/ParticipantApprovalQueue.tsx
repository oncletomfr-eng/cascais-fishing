'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Star, 
  Fish,
  Target,
  AlertCircle,
  Search,
  Filter,
  Check,
  X,
  User,
  Calendar,
  TrendingUp,
  Award,
  Shield,
  Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Enhanced Participant Approval Queue Component
// Part of Task 16: Captain Dashboard Interface - Subtask 16.1

export interface ParticipantApproval {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  appliedAt: string
  processedAt?: string
  message?: string
  rejectedReason?: string
  score: number // Participant scoring system
  autoApprovalEligible: boolean // For automated rules
  riskLevel: 'low' | 'medium' | 'high'
  participant: {
    id: string
    name: string
    email: string
    image?: string
    fisherProfile?: {
      experience: string
      rating: number
      completedTrips: number
      reliability: number
      specialties?: string[]
      lastActiveDate: string
      averageResponseTime: number
      cancellationRate: number
    }
  }
  trip: {
    id: string
    date: string
    timeSlot: string
    maxParticipants: number
    minRequired: number
    status: string
    currentParticipants: number
    availableSpots: number
    pricePerPerson: number
    difficulty: 'beginner' | 'intermediate' | 'advanced'
  }
}

interface ApprovalFilters {
  search: string
  status: string
  experience: string
  scoreRange: [number, number]
  riskLevel: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

interface BulkActionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedApprovals: ParticipantApproval[]
  onBulkAction: (action: 'APPROVED' | 'REJECTED', reason?: string) => void
  actionType: 'APPROVED' | 'REJECTED' | null
}

interface AutomationRulesProps {
  isOpen: boolean
  onClose: () => void
  rules: AutoApprovalRule[]
  onUpdateRules: (rules: AutoApprovalRule[]) => void
}

export interface AutoApprovalRule {
  id: string
  name: string
  enabled: boolean
  conditions: {
    minRating: number
    minCompletedTrips: number
    maxCancellationRate: number
    minReliability: number
    requiredExperience: string[]
    maxRiskLevel: 'low' | 'medium' | 'high'
  }
  actions: {
    autoApprove: boolean
    prioritize: boolean
    requireManualReview: boolean
  }
}

function BulkActionModal({ isOpen, onClose, selectedApprovals, onBulkAction, actionType }: BulkActionModalProps) {
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSubmit = async () => {
    setIsProcessing(true)
    try {
      await onBulkAction(actionType!, reason || undefined)
      onClose()
      setReason('')
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === 'APPROVED' ? 'Массовое одобрение' : 'Массовое отклонение'}
          </DialogTitle>
          <DialogDescription>
            {actionType === 'APPROVED' 
              ? `Одобрить ${selectedApprovals.length} заявок`
              : `Отклонить ${selectedApprovals.length} заявок`
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">
              {actionType === 'APPROVED' ? 'Комментарий (необязательно)' : 'Причина отклонения'}
            </Label>
            <Textarea
              id="reason"
              placeholder={
                actionType === 'APPROVED' 
                  ? 'Добавьте комментарий к одобрению...'
                  : 'Укажите причину отклонения...'
              }
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-2">Будет обработано:</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedApprovals.slice(0, 5).map((approval) => (
                <div key={approval.id} className="flex items-center space-x-2 text-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={approval.participant.image} />
                    <AvatarFallback>{approval.participant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{approval.participant.name}</span>
                </div>
              ))}
              {selectedApprovals.length > 5 && (
                <p className="text-xs text-muted-foreground">
                  и еще {selectedApprovals.length - 5} заявок...
                </p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || (actionType === 'REJECTED' && !reason)}
              variant={actionType === 'APPROVED' ? 'default' : 'destructive'}
            >
              {isProcessing ? 'Обработка...' : 
                (actionType === 'APPROVED' ? 'Одобрить все' : 'Отклонить все')
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AutomationRulesModal({ isOpen, onClose, rules, onUpdateRules }: AutomationRulesProps) {
  const [localRules, setLocalRules] = useState<AutoApprovalRule[]>(rules)

  useEffect(() => {
    setLocalRules(rules)
  }, [rules])

  const handleSave = () => {
    onUpdateRules(localRules)
    onClose()
  }

  const toggleRule = (ruleId: string) => {
    setLocalRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Правила автоматического одобрения</DialogTitle>
          <DialogDescription>
            Настройте условия для автоматической обработки заявок
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {localRules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{rule.name}</CardTitle>
                  <Checkbox
                    checked={rule.enabled}
                    onCheckedChange={() => toggleRule(rule.id)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p><strong>Мин. рейтинг:</strong> {rule.conditions.minRating}</p>
                    <p><strong>Мин. поездок:</strong> {rule.conditions.minCompletedTrips}</p>
                    <p><strong>Макс. отмены:</strong> {rule.conditions.maxCancellationRate}%</p>
                  </div>
                  <div>
                    <p><strong>Мин. надежность:</strong> {rule.conditions.minReliability}%</p>
                    <p><strong>Макс. риск:</strong> {rule.conditions.maxRiskLevel}</p>
                    <p><strong>Авто-одобрение:</strong> {rule.actions.autoApprove ? 'Да' : 'Нет'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave}>
            Сохранить правила
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ParticipantApprovalQueueProps {
  approvals: ParticipantApproval[]
  onApprovalAction: (approvalId: string, action: 'APPROVED' | 'REJECTED', reason?: string) => Promise<void>
  onBulkAction: (approvalIds: string[], action: 'APPROVED' | 'REJECTED', reason?: string) => Promise<void>
  loading?: boolean
  className?: string
}

export default function ParticipantApprovalQueue({
  approvals,
  onApprovalAction,
  onBulkAction,
  loading = false,
  className
}: ParticipantApprovalQueueProps) {
  const [selectedApprovals, setSelectedApprovals] = useState<string[]>([])
  const [filters, setFilters] = useState<ApprovalFilters>({
    search: '',
    status: 'PENDING',
    experience: 'all',
    scoreRange: [0, 100],
    riskLevel: 'all',
    sortBy: 'score',
    sortOrder: 'desc'
  })
  
  const [bulkModalOpen, setBulkModalOpen] = useState(false)
  const [bulkActionType, setBulkActionType] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [automationModalOpen, setAutomationModalOpen] = useState(false)
  
  // Mock automation rules
  const [automationRules, setAutomationRules] = useState<AutoApprovalRule[]>([
    {
      id: 'high-score',
      name: 'Высокий скор',
      enabled: true,
      conditions: {
        minRating: 4.5,
        minCompletedTrips: 5,
        maxCancellationRate: 10,
        minReliability: 90,
        requiredExperience: [],
        maxRiskLevel: 'low'
      },
      actions: {
        autoApprove: true,
        prioritize: true,
        requireManualReview: false
      }
    },
    {
      id: 'experienced-fisher',
      name: 'Опытный рыболов',
      enabled: false,
      conditions: {
        minRating: 4.0,
        minCompletedTrips: 10,
        maxCancellationRate: 15,
        minReliability: 85,
        requiredExperience: ['INTERMEDIATE', 'ADVANCED', 'EXPERT'],
        maxRiskLevel: 'medium'
      },
      actions: {
        autoApprove: false,
        prioritize: true,
        requireManualReview: false
      }
    }
  ])

  // Calculate participant score
  const calculateParticipantScore = (approval: ParticipantApproval): number => {
    const profile = approval.participant.fisherProfile
    if (!profile) return 0

    let score = 0
    
    // Rating component (40%)
    score += (profile.rating / 5) * 40
    
    // Reliability component (25%)
    score += (profile.reliability / 100) * 25
    
    // Experience component (20%)
    const experienceScore = {
      'BEGINNER': 5,
      'INTERMEDIATE': 10,
      'ADVANCED': 15,
      'EXPERT': 20
    }[profile.experience] || 0
    score += experienceScore
    
    // Completed trips component (15%)
    const tripsScore = Math.min(profile.completedTrips * 2, 15)
    score += tripsScore
    
    // Penalties
    if (profile.cancellationRate > 20) score -= 10
    if (profile.averageResponseTime > 24) score -= 5
    
    return Math.max(0, Math.min(100, Math.round(score)))
  }

  // Apply automation rules
  const applyAutomationRules = (approval: ParticipantApproval): ParticipantApproval => {
    const profile = approval.participant.fisherProfile
    if (!profile) return approval

    let autoApprovalEligible = false
    let prioritize = false

    for (const rule of automationRules) {
      if (!rule.enabled) continue

      const meetsConditions = 
        profile.rating >= rule.conditions.minRating &&
        profile.completedTrips >= rule.conditions.minCompletedTrips &&
        profile.reliability >= rule.conditions.minReliability &&
        (profile.cancellationRate || 0) <= rule.conditions.maxCancellationRate

      if (meetsConditions) {
        if (rule.actions.autoApprove) autoApprovalEligible = true
        if (rule.actions.prioritize) prioritize = true
      }
    }

    return {
      ...approval,
      autoApprovalEligible,
      score: calculateParticipantScore(approval)
    }
  }

  // Enhanced approvals with scoring and automation
  const enhancedApprovals = useMemo(() => {
    return approvals.map(approval => applyAutomationRules(approval))
  }, [approvals, automationRules])

  // Filtered and sorted approvals
  const filteredApprovals = useMemo(() => {
    let filtered = enhancedApprovals.filter(approval => {
      // Search filter
      if (filters.search && !approval.participant.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !approval.participant.email.toLowerCase().includes(filters.search.toLowerCase())) {
        return false
      }

      // Status filter
      if (filters.status !== 'all' && approval.status !== filters.status) {
        return false
      }

      // Experience filter
      if (filters.experience !== 'all' && approval.participant.fisherProfile?.experience !== filters.experience) {
        return false
      }

      // Score range filter
      if (approval.score < filters.scoreRange[0] || approval.score > filters.scoreRange[1]) {
        return false
      }

      // Risk level filter
      if (filters.riskLevel !== 'all' && approval.riskLevel !== filters.riskLevel) {
        return false
      }

      return true
    })

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (filters.sortBy) {
        case 'score':
          aValue = a.score
          bValue = b.score
          break
        case 'date':
          aValue = new Date(a.appliedAt).getTime()
          bValue = new Date(b.appliedAt).getTime()
          break
        case 'name':
          aValue = a.participant.name
          bValue = b.participant.name
          break
        case 'rating':
          aValue = a.participant.fisherProfile?.rating || 0
          bValue = b.participant.fisherProfile?.rating || 0
          break
        default:
          return 0
      }

      if (typeof aValue === 'string') {
        return filters.sortOrder === 'asc' 
          ? aValue.localeCompare(bValue as string)
          : (bValue as string).localeCompare(aValue)
      } else {
        return filters.sortOrder === 'asc' 
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number)
      }
    })

    return filtered
  }, [enhancedApprovals, filters])

  // Selected approvals data
  const selectedApprovalsData = filteredApprovals.filter(approval => 
    selectedApprovals.includes(approval.id)
  )

  // Handle selection
  const toggleSelection = (approvalId: string) => {
    setSelectedApprovals(prev => 
      prev.includes(approvalId)
        ? prev.filter(id => id !== approvalId)
        : [...prev, approvalId]
    )
  }

  const selectAll = () => {
    const pendingIds = filteredApprovals
      .filter(approval => approval.status === 'PENDING')
      .map(approval => approval.id)
    setSelectedApprovals(pendingIds)
  }

  const clearSelection = () => {
    setSelectedApprovals([])
  }

  // Handle bulk actions
  const handleBulkAction = async (action: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      await onBulkAction(selectedApprovals, action, reason)
      setSelectedApprovals([])
      toast({
        title: action === 'APPROVED' ? 'Заявки одобрены!' : 'Заявки отклонены!',
        description: `Обработано ${selectedApprovals.length} заявок`,
        variant: 'default'
      })
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обработать заявки',
        variant: 'destructive'
      })
    }
  }

  const openBulkModal = (actionType: 'APPROVED' | 'REJECTED') => {
    setBulkActionType(actionType)
    setBulkModalOpen(true)
  }

  // Get score badge color
  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-300'
    if (score >= 60) return 'bg-blue-100 text-blue-800 border-blue-300'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Enhanced Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Управление заявками</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutomationModalOpen(true)}
              >
                <Zap className="h-4 w-4 mr-1" />
                Автоматизация
              </Button>
              {selectedApprovals.length > 0 && (
                <div className="flex items-center space-x-1">
                  <Button
                    size="sm"
                    onClick={() => openBulkModal('APPROVED')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Одобрить ({selectedApprovals.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openBulkModal('REJECTED')}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Отклонить ({selectedApprovals.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearSelection}
                  >
                    Очистить
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Quick Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по имени или email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={filteredApprovals.filter(a => a.status === 'PENDING').length === 0}
              >
                Выбрать все ожидающие
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs">Статус</Label>
              <Select value={filters.status} onValueChange={(value) => 
                setFilters(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  <SelectItem value="PENDING">Ожидают</SelectItem>
                  <SelectItem value="APPROVED">Одобрены</SelectItem>
                  <SelectItem value="REJECTED">Отклонены</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Опыт</Label>
              <Select value={filters.experience} onValueChange={(value) =>
                setFilters(prev => ({ ...prev, experience: value }))
              }>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Любой</SelectItem>
                  <SelectItem value="BEGINNER">Начинающий</SelectItem>
                  <SelectItem value="INTERMEDIATE">Средний</SelectItem>
                  <SelectItem value="ADVANCED">Продвинутый</SelectItem>
                  <SelectItem value="EXPERT">Эксперт</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Сортировка</Label>
              <Select value={filters.sortBy} onValueChange={(value) =>
                setFilters(prev => ({ ...prev, sortBy: value }))
              }>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">По скору</SelectItem>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="name">По имени</SelectItem>
                  <SelectItem value="rating">По рейтингу</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Порядок</Label>
              <Select value={filters.sortOrder} onValueChange={(value: 'asc' | 'desc') =>
                setFilters(prev => ({ ...prev, sortOrder: value }))
              }>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">По убыванию</SelectItem>
                  <SelectItem value="asc">По возрастанию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Показано {filteredApprovals.length} из {enhancedApprovals.length} заявок
          {selectedApprovals.length > 0 && ` (выбрано ${selectedApprovals.length})`}
        </span>
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Авто-одобрение: {filteredApprovals.filter(a => a.autoApprovalEligible).length}</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Высокий скор (80+): {filteredApprovals.filter(a => a.score >= 80).length}</span>
          </span>
        </div>
      </div>

      {/* Approval Queue */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredApprovals.map((approval) => {
            const profile = approval.participant.fisherProfile
            const isSelected = selectedApprovals.includes(approval.id)
            
            return (
              <motion.div
                key={approval.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <Card className={`transition-all ${approval.autoApprovalEligible ? 'border-green-200 bg-green-50/20' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {approval.status === 'PENDING' && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(approval.id)}
                            className="mt-1"
                          />
                        )}
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={approval.participant.image || ''} />
                          <AvatarFallback>
                            {approval.participant.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-semibold">{approval.participant.name}</h3>
                            <Badge className={getScoreBadgeColor(approval.score)}>
                              Скор: {approval.score}
                            </Badge>
                            {approval.autoApprovalEligible && (
                              <Badge className="bg-green-100 text-green-800">
                                <Zap className="h-3 w-3 mr-1" />
                                Авто-одобрение
                              </Badge>
                            )}
                            <Badge className={getRiskBadgeColor(approval.riskLevel)}>
                              {approval.riskLevel === 'low' ? 'Низкий риск' : 
                               approval.riskLevel === 'medium' ? 'Средний риск' : 'Высокий риск'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{approval.participant.email}</p>
                          
                          {profile && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-amber-500" />
                                <span>{profile.rating.toFixed(1)} рейтинг</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Fish className="h-3 w-3 text-blue-500" />
                                <span>{profile.completedTrips} поездок</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Shield className="h-3 w-3 text-green-500" />
                                <span>{profile.reliability}% надежность</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Target className="h-3 w-3 text-purple-500" />
                                <span>{profile.experience}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex items-center space-x-1">
                          {approval.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-600" />}
                          {approval.status === 'APPROVED' && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {approval.status === 'REJECTED' && <XCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(approval.appliedAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Trip Details */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Поездка</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(approval.trip.date).toLocaleDateString('ru-RU')} в {approval.trip.timeSlot}
                          </p>
                          <p className="text-sm">
                            €{approval.trip.pricePerPerson} • {approval.trip.difficulty}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">
                            {approval.trip.currentParticipants} / {approval.trip.maxParticipants} участников
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Свободно: {approval.trip.availableSpots} мест
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Participant Message */}
                    {approval.message && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                          <div>
                            <h5 className="text-sm font-medium text-blue-900">Сообщение</h5>
                            <p className="text-sm text-blue-700">{approval.message}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason */}
                    {approval.status === 'REJECTED' && approval.rejectedReason && (
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <div>
                            <h5 className="text-sm font-medium text-red-900">Причина отклонения</h5>
                            <p className="text-sm text-red-700">{approval.rejectedReason}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions for Pending */}
                    {approval.status === 'PENDING' && (
                      <div className="flex space-x-2 pt-2 border-t">
                        <Button
                          onClick={() => onApprovalAction(approval.id, 'APPROVED')}
                          className="flex-1"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Одобрить
                        </Button>
                        <Button
                          onClick={() => {
                            const reason = prompt('Причина отклонения:')
                            if (reason) {
                              onApprovalAction(approval.id, 'REJECTED', reason)
                            }
                          }}
                          variant="outline"
                          className="flex-1"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Отклонить
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredApprovals.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Нет заявок для отображения
              </h3>
              <p className="text-gray-500">
                Попробуйте изменить фильтры или проверьте позже
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bulk Action Modal */}
      <BulkActionModal
        isOpen={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedApprovals={selectedApprovalsData}
        onBulkAction={handleBulkAction}
        actionType={bulkActionType}
      />

      {/* Automation Rules Modal */}
      <AutomationRulesModal
        isOpen={automationModalOpen}
        onClose={() => setAutomationModalOpen(false)}
        rules={automationRules}
        onUpdateRules={setAutomationRules}
      />
    </div>
  )
}
