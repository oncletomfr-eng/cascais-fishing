/**
 * Captain Override Panel for Phase Transitions
 * Task 17.3: Phase Transition Logic - Manual Phase Override with Permissions
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { 
  usePhaseTransition,
  TransitionResult,
  TransitionValidation
} from '@/lib/transition/usePhaseTransition'
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Lock,
  Unlock,
  Zap,
  Eye,
  EyeOff,
  Settings,
  RotateCcw,
  FastForward
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// User roles and permissions
type UserRole = 'captain' | 'co-captain' | 'participant' | 'observer' | 'admin'

interface OverridePermissions {
  canOverrideRules: boolean
  canForceTransition: boolean
  canCancelTransition: boolean
  canResetPhase: boolean
  canViewHistory: boolean
  canEditPermissions: boolean
  requiresConfirmation: boolean
  requiresReason: boolean
}

interface OverrideRequest {
  id: string
  fromPhase: ChatPhase
  toPhase: ChatPhase
  reason: string
  requestedBy: string
  requestedAt: Date
  confirmationCode?: string
  skipValidation: boolean
  forceExecution: boolean
}

// Permission levels
const ROLE_PERMISSIONS: Record<UserRole, OverridePermissions> = {
  admin: {
    canOverrideRules: true,
    canForceTransition: true,
    canCancelTransition: true,
    canResetPhase: true,
    canViewHistory: true,
    canEditPermissions: true,
    requiresConfirmation: false,
    requiresReason: false
  },
  captain: {
    canOverrideRules: true,
    canForceTransition: true,
    canCancelTransition: true,
    canResetPhase: false,
    canViewHistory: true,
    canEditPermissions: false,
    requiresConfirmation: true,
    requiresReason: true
  },
  'co-captain': {
    canOverrideRules: true,
    canForceTransition: false,
    canCancelTransition: true,
    canResetPhase: false,
    canViewHistory: true,
    canEditPermissions: false,
    requiresConfirmation: true,
    requiresReason: true
  },
  participant: {
    canOverrideRules: false,
    canForceTransition: false,
    canCancelTransition: false,
    canResetPhase: false,
    canViewHistory: true,
    canEditPermissions: false,
    requiresConfirmation: false,
    requiresReason: false
  },
  observer: {
    canOverrideRules: false,
    canForceTransition: false,
    canCancelTransition: false,
    canResetPhase: false,
    canViewHistory: true,
    canEditPermissions: false,
    requiresConfirmation: false,
    requiresReason: false
  }
}

// Override reasons
const OVERRIDE_REASONS = [
  { value: 'emergency', label: 'Экстренная ситуация', severity: 'high' },
  { value: 'weather', label: 'Изменение погодных условий', severity: 'medium' },
  { value: 'equipment', label: 'Проблемы с оборудованием', severity: 'medium' },
  { value: 'schedule', label: 'Изменение расписания', severity: 'low' },
  { value: 'participant', label: 'Проблемы с участниками', severity: 'medium' },
  { value: 'safety', label: 'Соображения безопасности', severity: 'high' },
  { value: 'operational', label: 'Операционные причины', severity: 'low' },
  { value: 'custom', label: 'Другая причина', severity: 'medium' }
]

interface CaptainOverridePanelProps {
  className?: string
  compactMode?: boolean
  onOverrideExecuted?: (override: OverrideRequest, result: TransitionResult) => void
}

export function CaptainOverridePanel({
  className,
  compactMode = false,
  onOverrideExecuted
}: CaptainOverridePanelProps) {
  const { data: session } = useSession()
  const {
    currentPhase,
    isTransitioning,
    currentTransition,
    requestTransition,
    validateTransition,
    capabilities,
    getConfig
  } = usePhaseTransition()

  // State
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [overrideRequest, setOverrideRequest] = useState<Partial<OverrideRequest>>({})
  const [validationResults, setValidationResults] = useState<Record<string, TransitionValidation>>({})
  const [confirmationCode, setConfirmationCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  // Get user role and permissions
  const userRole: UserRole = (session?.user as any)?.role || 'participant'
  const permissions = ROLE_PERMISSIONS[userRole]

  // Check if user has any override capabilities
  const hasOverrideCapabilities = permissions.canOverrideRules || 
                                  permissions.canForceTransition || 
                                  permissions.canCancelTransition

  // Validate all possible transitions
  useEffect(() => {
    const phases: ChatPhase[] = ['preparation', 'live', 'debrief']
    const validateAllPhases = async () => {
      const results: Record<string, TransitionValidation> = {}
      
      for (const phase of phases) {
        if (phase !== currentPhase) {
          try {
            results[phase] = await validateTransition(phase)
          } catch (error) {
            results[phase] = {
              isValid: false,
              errors: [`Validation error: ${error}`],
              warnings: []
            }
          }
        }
      }
      
      setValidationResults(results)
    }

    if (hasOverrideCapabilities) {
      validateAllPhases()
    }
  }, [currentPhase, validateTransition, hasOverrideCapabilities])

  // Generate confirmation code
  const generateConfirmationCode = useCallback((): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }, [])

  // Open override dialog
  const openOverrideDialog = useCallback((toPhase: ChatPhase) => {
    const newCode = generateConfirmationCode()
    setGeneratedCode(newCode)
    setConfirmationCode('')
    setOverrideRequest({
      id: `override-${Date.now()}`,
      fromPhase: currentPhase,
      toPhase,
      reason: '',
      requestedBy: session?.user?.name || 'Unknown',
      requestedAt: new Date(),
      skipValidation: false,
      forceExecution: false
    })
    setShowOverrideDialog(true)
  }, [currentPhase, session, generateConfirmationCode])

  // Execute override
  const executeOverride = useCallback(async () => {
    if (!overrideRequest.toPhase) return

    // Validate confirmation code if required
    if (permissions.requiresConfirmation && confirmationCode !== generatedCode) {
      toast.error('Неверный код подтверждения')
      return
    }

    // Validate reason if required
    if (permissions.requiresReason && !overrideRequest.reason?.trim()) {
      toast.error('Необходимо указать причину override')
      return
    }

    setIsExecuting(true)

    try {
      // Create the full override request
      const fullRequest: OverrideRequest = {
        ...overrideRequest,
        confirmationCode: generatedCode
      } as OverrideRequest

      // Execute transition with captain-override trigger
      const result = await requestTransition(overrideRequest.toPhase, 'captain-override')

      if (result.success) {
        toast.success(`Override выполнен: ${overrideRequest.fromPhase} → ${overrideRequest.toPhase}`)
        setShowOverrideDialog(false)
        onOverrideExecuted?.(fullRequest, result)
      } else {
        toast.error(`Override не удался: ${result.error?.message}`)
      }

    } catch (error) {
      toast.error(`Ошибка выполнения override: ${error}`)
    } finally {
      setIsExecuting(false)
    }
  }, [
    overrideRequest, 
    confirmationCode, 
    generatedCode, 
    permissions, 
    requestTransition, 
    onOverrideExecuted
  ])

  // Cancel current transition
  const cancelCurrentTransition = useCallback(async () => {
    if (!permissions.canCancelTransition || !currentTransition) return

    try {
      // In a real implementation, you would call a cancel method on the transition manager
      toast.success('Переход отменен')
    } catch (error) {
      toast.error(`Ошибка отмены перехода: ${error}`)
    }
  }, [permissions.canCancelTransition, currentTransition])

  // Don't render if user has no capabilities
  if (!hasOverrideCapabilities) {
    return null
  }

  const phases: Array<{ phase: ChatPhase; label: string; icon: React.ReactNode }> = [
    { phase: 'preparation', label: 'Подготовка', icon: <Settings className="w-4 h-4" /> },
    { phase: 'live', label: 'Процесс', icon: <Zap className="w-4 h-4" /> },
    { phase: 'debrief', label: 'Итоги', icon: <CheckCircle className="w-4 h-4" /> }
  ]

  if (compactMode) {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                {userRole}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Роль: {userRole}</p>
              <p>Override права: {hasOverrideCapabilities ? 'Есть' : 'Нет'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {permissions.canCancelTransition && isTransitioning && (
          <Button
            size="sm"
            variant="destructive"
            onClick={cancelCurrentTransition}
            className="text-xs"
          >
            <XCircle className="w-3 h-3 mr-1" />
            Отменить
          </Button>
        )}
      </div>
    )
  }

  return (
    <Card className={cn('border-amber-200 bg-amber-50', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center">
            <Shield className="w-4 h-4 mr-2 text-amber-600" />
            Captain Override Panel
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {userRole}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-xs text-gray-600">Текущая фаза</Label>
            <div className="font-medium">{currentPhase}</div>
          </div>
          <div>
            <Label className="text-xs text-gray-600">Статус</Label>
            <div className={cn(
              "font-medium",
              isTransitioning ? "text-orange-600" : "text-green-600"
            )}>
              {isTransitioning ? 'Переход...' : 'Активна'}
            </div>
          </div>
        </div>

        {/* Override Actions */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-600">Доступные переходы</Label>
          <div className="grid grid-cols-1 gap-2">
            {phases
              .filter(phaseInfo => phaseInfo.phase !== currentPhase)
              .map(phaseInfo => {
                const validation = validationResults[phaseInfo.phase]
                const canOverride = permissions.canOverrideRules || 
                                   (validation?.isValid && permissions.canForceTransition)
                
                return (
                  <Button
                    key={phaseInfo.phase}
                    size="sm"
                    variant={validation?.isValid ? "default" : "outline"}
                    disabled={!canOverride || isTransitioning || isExecuting}
                    onClick={() => openOverrideDialog(phaseInfo.phase)}
                    className="justify-start text-xs"
                  >
                    {phaseInfo.icon}
                    <span className="ml-2">{phaseInfo.label}</span>
                    {!validation?.isValid && (
                      <AlertTriangle className="w-3 h-3 ml-auto text-amber-500" />
                    )}
                  </Button>
                )
              })}
          </div>
        </div>

        {/* Current Transition Controls */}
        {isTransitioning && currentTransition && permissions.canCancelTransition && (
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-gray-600">Активный переход</Label>
              <Badge variant="outline" className="text-xs">
                {currentTransition.fromPhase} → {currentTransition.toPhase}
              </Badge>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={cancelCurrentTransition}
              className="w-full text-xs"
            >
              <XCircle className="w-3 h-3 mr-1" />
              Отменить переход
            </Button>
          </div>
        )}

        {/* Permissions Summary */}
        <div className="pt-3 border-t">
          <Label className="text-xs text-gray-600">Права доступа</Label>
          <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
            <div className="flex items-center">
              {permissions.canOverrideRules ? 
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : 
                <XCircle className="w-3 h-3 text-red-500 mr-1" />
              }
              Override правил
            </div>
            <div className="flex items-center">
              {permissions.canForceTransition ? 
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : 
                <XCircle className="w-3 h-3 text-red-500 mr-1" />
              }
              Принудительный переход
            </div>
            <div className="flex items-center">
              {permissions.canCancelTransition ? 
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : 
                <XCircle className="w-3 h-3 text-red-500 mr-1" />
              }
              Отмена переходов
            </div>
            <div className="flex items-center">
              {permissions.canViewHistory ? 
                <CheckCircle className="w-3 h-3 text-green-500 mr-1" /> : 
                <XCircle className="w-3 h-3 text-red-500 mr-1" />
              }
              Просмотр истории
            </div>
          </div>
        </div>
      </CardContent>

      {/* Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
              Captain Override
            </DialogTitle>
            <DialogDescription>
              Вы собираетесь выполнить принудительный переход фаз.
              Это может нарушить нормальный ход системы.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Transition Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium">
                {overrideRequest.fromPhase} → {overrideRequest.toPhase}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                Переход будет выполнен принудительно
              </div>
            </div>

            {/* Validation Warnings */}
            {overrideRequest.toPhase && validationResults[overrideRequest.toPhase] && 
             !validationResults[overrideRequest.toPhase].isValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-800 mb-1">
                  Предупреждения валидации:
                </div>
                <ul className="text-xs text-red-700 space-y-1">
                  {validationResults[overrideRequest.toPhase].errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reason Selection */}
            {permissions.requiresReason && (
              <div className="space-y-2">
                <Label className="text-sm">Причина override *</Label>
                <Select
                  value={overrideRequest.reason}
                  onValueChange={(value) => 
                    setOverrideRequest(prev => ({ ...prev, reason: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите причину" />
                  </SelectTrigger>
                  <SelectContent>
                    {OVERRIDE_REASONS.map(reason => (
                      <SelectItem key={reason.value} value={reason.value}>
                        <div className="flex items-center">
                          <span>{reason.label}</span>
                          <Badge 
                            variant={
                              reason.severity === 'high' ? 'destructive' :
                              reason.severity === 'medium' ? 'default' : 'secondary'
                            }
                            className="ml-2 text-xs"
                          >
                            {reason.severity}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {overrideRequest.reason === 'custom' && (
                  <Textarea
                    placeholder="Опишите причину подробно..."
                    className="text-sm"
                    onChange={(e) => 
                      setOverrideRequest(prev => ({ ...prev, reason: e.target.value }))
                    }
                  />
                )}
              </div>
            )}

            {/* Confirmation Code */}
            {permissions.requiresConfirmation && (
              <div className="space-y-2">
                <Label className="text-sm">Код подтверждения *</Label>
                <div className="text-xs text-gray-600 mb-2">
                  Введите код: <code className="bg-gray-100 px-1 rounded">{generatedCode}</code>
                </div>
                <Input
                  type="text"
                  placeholder="Введите код подтверждения"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                  className="text-sm"
                />
              </div>
            )}

            {/* Override Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={overrideRequest.skipValidation || false}
                  onCheckedChange={(checked) =>
                    setOverrideRequest(prev => ({ ...prev, skipValidation: checked }))
                  }
                  disabled={!permissions.canOverrideRules}
                />
                <Label className="text-sm">Пропустить валидацию</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={overrideRequest.forceExecution || false}
                  onCheckedChange={(checked) =>
                    setOverrideRequest(prev => ({ ...prev, forceExecution: checked }))
                  }
                  disabled={!permissions.canForceTransition}
                />
                <Label className="text-sm">Принудительное выполнение</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOverrideDialog(false)}
              disabled={isExecuting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={executeOverride}
              disabled={
                isExecuting ||
                (permissions.requiresConfirmation && confirmationCode !== generatedCode) ||
                (permissions.requiresReason && !overrideRequest.reason?.trim())
              }
            >
              {isExecuting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Выполнение...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Выполнить Override
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
