/**
 * Phase Transition System - Main Export Index
 * Task 17.3: Phase Transition Logic - Complete System Export
 */

// Core transition management
export { PhaseTransitionManager } from './PhaseTransitionManager'
export { DataMigrationService, dataMigrationService } from './DataMigrationService'

// React integration
export {
  PhaseTransitionProvider,
  usePhaseTransition,
  useTransitionTriggers,
  usePhaseCompletion,
  useTransitionHistory
} from './usePhaseTransition'

// UI Components
export { PhaseTransitionContainer, PhaseAnimationWrapper, TransitionControls } from '../../components/transition/PhaseTransitionContainer'
export { IntegratedPhaseSystem } from '../../components/transition/IntegratedPhaseSystem'
export { CaptainOverridePanel } from '../../components/transition/CaptainOverridePanel'
export { PhaseHistoryTracker } from '../../components/transition/PhaseHistoryTracker'

// Types and interfaces
export type {
  PhaseTransition,
  TransitionStatus,
  TransitionTrigger,
  TransitionRule,
  TransitionContext,
  TransitionConfig,
  TransitionManagerState,
  TransitionResult,
  TransitionValidation,
  PhaseCapabilities,
  TransitionError,
  PhaseHistory,
  PhaseHistoryEntry,
  TransitionEvents,
  TransitionAnimation,
  DataMigration,
  DataMigrationRule,
  PhaseCompletion,
  TransitionPermissions,
  TripStatus,
  ConditionType,
  AnimationType
} from './phase-transition-types'

export type {
  MigrationResult,
  RuleExecutionResult,
  MigrationHistoryEntry
} from './DataMigrationService'

export type {
  PhaseTransitionContextValue,
  TransitionConfig as HookTransitionConfig,
  TransitionContext as HookTransitionContext
} from './usePhaseTransition'

// Utility functions and constants
export const PHASE_TRANSITION_EVENTS = {
  TRANSITION_START: 'transitionStart',
  TRANSITION_COMPLETE: 'transitionComplete',
  TRANSITION_ERROR: 'transitionError',
  TRANSITION_CANCEL: 'transitionCancel',
  PHASE_ENTER: 'phaseEnter',
  PHASE_EXIT: 'phaseExit',
  DATA_MIGRATE: 'dataMigrate'
} as const

export const DEFAULT_TRANSITION_CONFIG = {
  enableAutoTransitions: true,
  enableManualOverrides: true,
  enableAnimations: true,
  defaultAnimation: {
    type: 'slide' as const,
    duration: 300,
    easing: 'ease-in-out',
    direction: 'right' as const
  },
  transitionTimeout: 30000,
  retryAttempts: 3,
  enableHistory: true,
  enableDataMigration: true,
  debugMode: false
} as const

// Helper utilities
export const createTransitionId = () => `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

export const isValidPhaseTransition = (fromPhase: string, toPhase: string): boolean => {
  const validPhases = ['preparation', 'live', 'debrief']
  return validPhases.includes(fromPhase) && 
         validPhases.includes(toPhase) && 
         fromPhase !== toPhase
}

export const getPhaseDisplayName = (phase: string): string => {
  const phaseNames = {
    preparation: 'Подготовка',
    live: 'Процесс',
    debrief: 'Итоги'
  }
  return phaseNames[phase as keyof typeof phaseNames] || phase
}

export const getTriggerDisplayName = (trigger: string): string => {
  const triggerNames = {
    manual: 'Ручной',
    automatic: 'Автоматический',
    'time-based': 'По времени',
    'status-based': 'По статусу',
    'completion-based': 'По завершению',
    'captain-override': 'Override капитана'
  }
  return triggerNames[trigger as keyof typeof triggerNames] || trigger
}

export const formatTransitionDuration = (ms: number | null): string => {
  if (ms === null) return 'Активна'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}ч ${minutes % 60}м`
  } else if (minutes > 0) {
    return `${minutes}м ${seconds % 60}с`
  } else {
    return `${seconds}с`
  }
}

// Error classes
export class TransitionSystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'TransitionSystemError'
  }
}

export class ValidationError extends TransitionSystemError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
    this.name = 'ValidationError'
  }
}

export class PermissionError extends TransitionSystemError {
  constructor(message: string, details?: any) {
    super(message, 'PERMISSION_ERROR', details)
    this.name = 'PermissionError'
  }
}

export class MigrationError extends TransitionSystemError {
  constructor(message: string, details?: any) {
    super(message, 'MIGRATION_ERROR', details)
    this.name = 'MigrationError'
  }
}

// Version info
export const PHASE_TRANSITION_VERSION = '1.0.0'
export const PHASE_TRANSITION_BUILD = process.env.NODE_ENV || 'development'

// Development helpers
export const enableDebugMode = () => {
  if (typeof window !== 'undefined') {
    (window as any).__PHASE_TRANSITION_DEBUG__ = true
  }
}

export const disableDebugMode = () => {
  if (typeof window !== 'undefined') {
    (window as any).__PHASE_TRANSITION_DEBUG__ = false
  }
}

export const isDebugMode = (): boolean => {
  if (typeof window !== 'undefined') {
    return !!(window as any).__PHASE_TRANSITION_DEBUG__
  }
  return false
}
