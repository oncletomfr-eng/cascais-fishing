'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { 
  ConnectionState, 
  ConnectionQuality, 
  ConnectionStrategy,
  ConnectionEvent
} from '@/lib/chat/robust-connection-manager'

interface ConnectionStatusIndicatorProps {
  state: ConnectionState
  quality: ConnectionQuality
  strategy: ConnectionStrategy
  attempt?: number
  maxAttempts?: number
  onRetry?: () => void
  showDetails?: boolean
  className?: string
  variant?: 'minimal' | 'detailed' | 'full'
}

// Connection state configurations
const CONNECTION_CONFIGS = {
  [ConnectionState.DISCONNECTED]: {
    icon: WifiOff,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Отключен',
    description: 'Чат не подключен'
  },
  [ConnectionState.CONNECTING]: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    label: 'Подключение...',
    description: 'Устанавливаем соединение с сервером чата'
  },
  [ConnectionState.CONNECTED]: {
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    label: 'Подключен',
    description: 'Чат готов к работе'
  },
  [ConnectionState.RECONNECTING]: {
    icon: Loader2,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    label: 'Переподключение...',
    description: 'Восстанавливаем соединение'
  },
  [ConnectionState.FAILED]: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    label: 'Ошибка',
    description: 'Не удалось подключиться к серверу чата'
  },
  [ConnectionState.DEGRADED]: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
    label: 'Нестабильно',
    description: 'Соединение с чатом нестабильно'
  }
}

// Quality configurations
const QUALITY_CONFIGS = {
  [ConnectionQuality.EXCELLENT]: {
    icon: Signal,
    color: 'text-green-500',
    label: 'Отличное',
    description: 'Соединение стабильное и быстрое',
    progress: 100
  },
  [ConnectionQuality.GOOD]: {
    icon: SignalHigh,
    color: 'text-green-400',
    label: 'Хорошее',
    description: 'Соединение стабильное',
    progress: 75
  },
  [ConnectionQuality.POOR]: {
    icon: SignalMedium,
    color: 'text-yellow-500',
    label: 'Слабое',
    description: 'Возможны задержки в сообщениях',
    progress: 50
  },
  [ConnectionQuality.CRITICAL]: {
    icon: SignalLow,
    color: 'text-red-500',
    label: 'Критичное',
    description: 'Серьезные проблемы с соединением',
    progress: 25
  }
}

// Strategy labels
const STRATEGY_LABELS = {
  [ConnectionStrategy.DIRECT_WEBSOCKET]: 'Прямое подключение',
  [ConnectionStrategy.EXTENDED_TIMEOUT]: 'Расширенный таймаут',
  [ConnectionStrategy.MULTIPLE_PORTS]: 'Альтернативные порты',
  [ConnectionStrategy.LONG_POLLING]: 'Long Polling',
  [ConnectionStrategy.SSE_FALLBACK]: 'SSE режим'
}

export function ConnectionStatusIndicator({
  state,
  quality,
  strategy,
  attempt = 0,
  maxAttempts = 5,
  onRetry,
  showDetails = false,
  className,
  variant = 'detailed'
}: ConnectionStatusIndicatorProps) {
  const stateConfig = CONNECTION_CONFIGS[state]
  const qualityConfig = QUALITY_CONFIGS[quality]
  const StateIcon = stateConfig.icon
  const QualityIcon = qualityConfig.icon

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline"
              className={cn(
                'flex items-center gap-1.5 text-xs',
                stateConfig.color,
                className
              )}
            >
              <StateIcon 
                className={cn(
                  'h-3 w-3',
                  state === ConnectionState.CONNECTING || state === ConnectionState.RECONNECTING 
                    ? 'animate-spin' : ''
                )} 
              />
              {stateConfig.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <p>{stateConfig.description}</p>
              {showDetails && (
                <>
                  <p className="text-xs text-gray-500 mt-1">
                    Качество: {qualityConfig.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    Метод: {STRATEGY_LABELS[strategy]}
                  </p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('flex items-center gap-3 p-3 rounded-lg border', stateConfig.bgColor, className)}>
        <div className="flex items-center gap-2">
          <StateIcon 
            className={cn(
              'h-4 w-4',
              stateConfig.color,
              state === ConnectionState.CONNECTING || state === ConnectionState.RECONNECTING 
                ? 'animate-spin' : ''
            )} 
          />
          <span className="text-sm font-medium">{stateConfig.label}</span>
        </div>

        {state === ConnectionState.CONNECTED && (
          <div className="flex items-center gap-2">
            <QualityIcon className={cn('h-3 w-3', qualityConfig.color)} />
            <span className="text-xs text-gray-600">{qualityConfig.label}</span>
          </div>
        )}

        {(state === ConnectionState.CONNECTING || state === ConnectionState.RECONNECTING) && attempt > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>Попытка {attempt}/{maxAttempts}</span>
            <Progress value={(attempt / maxAttempts) * 100} className="h-1 w-20" />
          </div>
        )}

        {state === ConnectionState.FAILED && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry} className="text-xs">
            Повторить
          </Button>
        )}
      </div>
    )
  }

  // Full variant with all details
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('p-4 rounded-lg border shadow-sm bg-white', className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StateIcon 
            className={cn(
              'h-5 w-5',
              stateConfig.color,
              state === ConnectionState.CONNECTING || state === ConnectionState.RECONNECTING 
                ? 'animate-spin' : ''
            )} 
          />
          <span className="font-medium">{stateConfig.label}</span>
        </div>

        {state === ConnectionState.CONNECTED && (
          <Badge variant="secondary" className="text-xs">
            {STRATEGY_LABELS[strategy]}
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-3">{stateConfig.description}</p>

      {/* Connection Progress */}
      {(state === ConnectionState.CONNECTING || state === ConnectionState.RECONNECTING) && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Попытка {attempt} из {maxAttempts}</span>
            <span>{Math.round((attempt / maxAttempts) * 100)}%</span>
          </div>
          <Progress value={(attempt / maxAttempts) * 100} className="h-2" />
        </div>
      )}

      {/* Quality Indicator */}
      {state === ConnectionState.CONNECTED && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Качество соединения</span>
            <div className="flex items-center gap-1">
              <QualityIcon className={cn('h-3 w-3', qualityConfig.color)} />
              <span className={cn('text-xs font-medium', qualityConfig.color)}>
                {qualityConfig.label}
              </span>
            </div>
          </div>
          <Progress 
            value={qualityConfig.progress} 
            className="h-2"
          />
          <p className="text-xs text-gray-500 mt-1">{qualityConfig.description}</p>
        </div>
      )}

      {/* Strategy Information */}
      {showDetails && (
        <div className="text-xs text-gray-500 space-y-1">
          <div>Метод подключения: {STRATEGY_LABELS[strategy]}</div>
          {attempt > 1 && <div>Попыток подключения: {attempt}</div>}
        </div>
      )}

      {/* Retry Button */}
      {state === ConnectionState.FAILED && onRetry && (
        <div className="mt-3 pt-3 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRetry}
            className="w-full"
          >
            Попробовать снова
          </Button>
        </div>
      )}
    </motion.div>
  )
}

/**
 * Progressive Loading States Component
 * Shows different loading phases during connection
 */
interface ProgressiveLoadingStatesProps {
  currentPhase: 'initializing' | 'diagnostics' | 'connecting' | 'authenticating' | 'syncing'
  attempt: number
  maxAttempts: number
  strategy: ConnectionStrategy
}

const LOADING_PHASES = {
  initializing: {
    label: 'Инициализация...',
    description: 'Подготовка к подключению',
    progress: 10
  },
  diagnostics: {
    label: 'Диагностика сети...',
    description: 'Проверяем качество соединения',
    progress: 25
  },
  connecting: {
    label: 'Подключение к серверу...',
    description: 'Устанавливаем WebSocket соединение',
    progress: 50
  },
  authenticating: {
    label: 'Авторизация...',
    description: 'Проверяем учетные данные',
    progress: 75
  },
  syncing: {
    label: 'Синхронизация...',
    description: 'Загружаем данные чата',
    progress: 90
  }
}

export function ProgressiveLoadingStates({
  currentPhase,
  attempt,
  maxAttempts,
  strategy
}: ProgressiveLoadingStatesProps) {
  const phaseConfig = LOADING_PHASES[currentPhase]

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-lg border bg-white shadow-sm max-w-md mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-500" />
        <h3 className="font-semibold text-lg">{phaseConfig.label}</h3>
        <p className="text-sm text-gray-600">{phaseConfig.description}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress value={phaseConfig.progress} className="h-3" />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{phaseConfig.progress}%</span>
          <span>Попытка {attempt}/{maxAttempts}</span>
        </div>
      </div>

      {/* Strategy Info */}
      <div className="text-center">
        <Badge variant="secondary" className="text-xs">
          {STRATEGY_LABELS[strategy]}
        </Badge>
      </div>

      {/* Phase Steps */}
      <div className="mt-4 space-y-2">
        {Object.entries(LOADING_PHASES).map(([phase, config]) => (
          <div 
            key={phase}
            className={cn(
              'flex items-center gap-2 text-xs',
              phase === currentPhase 
                ? 'text-blue-600 font-medium'
                : config.progress <= phaseConfig.progress 
                  ? 'text-green-600' 
                  : 'text-gray-400'
            )}
          >
            <div className={cn(
              'w-2 h-2 rounded-full',
              phase === currentPhase 
                ? 'bg-blue-600 animate-pulse'
                : config.progress <= phaseConfig.progress 
                  ? 'bg-green-600' 
                  : 'bg-gray-300'
            )} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/**
 * Connection Event Toast
 * Shows temporary notifications for connection events
 */
interface ConnectionEventToastProps {
  event: ConnectionEvent
  onClose: () => void
}

export function ConnectionEventToast({ event, onClose }: ConnectionEventToastProps) {
  const stateConfig = CONNECTION_CONFIGS[event.state]
  const StateIcon = stateConfig.icon

  React.useEffect(() => {
    // Auto-close after 5 seconds for non-critical events
    if (event.type !== 'error' && event.state !== ConnectionState.FAILED) {
      const timer = setTimeout(onClose, 5000)
      return () => clearTimeout(timer)
    }
  }, [event, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-4 right-4 z-50 max-w-sm"
    >
      <div className={cn(
        'p-4 rounded-lg shadow-lg border',
        stateConfig.bgColor,
        'bg-white'
      )}>
        <div className="flex items-start gap-3">
          <StateIcon className={cn('h-5 w-5 mt-0.5', stateConfig.color)} />
          <div className="flex-1">
            <h4 className="font-medium text-sm">{stateConfig.label}</h4>
            <p className="text-xs text-gray-600 mt-1">{stateConfig.description}</p>
            {event.strategy && (
              <p className="text-xs text-gray-500 mt-1">
                Метод: {STRATEGY_LABELS[event.strategy]}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-auto p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
