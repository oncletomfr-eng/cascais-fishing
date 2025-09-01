/**
 * Phase Transition System Types
 * Task 17.3: Phase Transition Logic
 */

import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { 
  ChecklistItem, 
  CatchRecord, 
  TripReview, 
  PhaseTransitionData 
} from '@/components/chat/phases/types'

// Core transition interfaces
export interface PhaseTransition {
  id: string
  fromPhase: ChatPhase
  toPhase: ChatPhase
  triggeredBy: TransitionTrigger
  triggeredAt: Date
  completedAt: Date | null
  duration?: number // in milliseconds
  status: TransitionStatus
  data: PhaseTransitionData
  errors?: TransitionError[]
}

export type TransitionStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled'

export type TransitionTrigger = 
  | 'manual' 
  | 'automatic' 
  | 'time-based' 
  | 'status-based' 
  | 'completion-based'
  | 'captain-override'

export interface TransitionError {
  code: string
  message: string
  details?: any
  timestamp: Date
}

// Transition rules and conditions
export interface TransitionRule {
  id: string
  name: string
  fromPhase: ChatPhase
  toPhase: ChatPhase
  conditions: TransitionCondition[]
  priority: number
  isEnabled: boolean
  cooldownMs?: number // minimum time between transitions
}

export interface TransitionCondition {
  type: ConditionType
  description: string
  validator: (context: TransitionContext) => Promise<boolean> | boolean
  errorMessage?: string
}

export type ConditionType = 
  | 'time' 
  | 'trip-status' 
  | 'user-role' 
  | 'checklist-completion'
  | 'custom'

export interface TransitionContext {
  tripId: string
  tripDate: Date
  currentPhase: ChatPhase
  targetPhase: ChatPhase
  userId: string
  userRole: 'captain' | 'participant' | 'observer'
  tripStatus: TripStatus
  checklistItems: ChecklistItem[]
  catches: CatchRecord[]
  reviews: TripReview[]
  lastTransition?: PhaseTransition
  customData?: Record<string, any>
}

export type TripStatus = 
  | 'planned' 
  | 'preparing' 
  | 'in-progress' 
  | 'completed' 
  | 'cancelled'

// Transition animation configuration
export interface TransitionAnimation {
  type: AnimationType
  duration: number
  easing: string
  direction?: 'left' | 'right' | 'up' | 'down'
  stagger?: number
}

export type AnimationType = 
  | 'slide' 
  | 'fade' 
  | 'scale' 
  | 'flip' 
  | 'crossfade'
  | 'none'

// Data migration configuration
export interface DataMigration {
  fromPhase: ChatPhase
  toPhase: ChatPhase
  migrations: DataMigrationRule[]
}

export interface DataMigrationRule {
  id: string
  description: string
  sourceKey: string
  targetKey: string
  transformer?: (data: any, context: TransitionContext) => any
  validator?: (data: any) => boolean
  isRequired: boolean
}

// Phase completion tracking
export interface PhaseCompletion {
  phase: ChatPhase
  isCompleted: boolean
  completionPercentage: number
  requiredTasks: CompletionTask[]
  completedTasks: CompletionTask[]
  blockers: CompletionBlocker[]
}

export interface CompletionTask {
  id: string
  title: string
  description: string
  isRequired: boolean
  isCompleted: boolean
  completedAt?: Date
  data?: any
}

export interface CompletionBlocker {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  canBeOverridden: boolean
  overrideRequiredRole?: 'captain' | 'admin'
}

// Transition history and tracking
export interface PhaseHistory {
  tripId: string
  phases: PhaseHistoryEntry[]
  totalDuration: number
  transitionCount: number
  lastUpdated: Date
}

export interface PhaseHistoryEntry {
  phase: ChatPhase
  enteredAt: Date
  exitedAt: Date | null
  duration: number | null
  trigger: TransitionTrigger
  completionData?: PhaseCompletion
  notes?: string
}

// Transition permissions and overrides
export interface TransitionPermissions {
  userId: string
  role: 'captain' | 'participant' | 'observer' | 'admin'
  canTriggerManual: boolean
  canOverrideRules: boolean
  canCancelTransitions: boolean
  canEditHistory: boolean
  allowedPhases: ChatPhase[]
}

// Transition events and callbacks
export interface TransitionEvents {
  onTransitionStart?: (transition: PhaseTransition) => void | Promise<void>
  onTransitionProgress?: (transition: PhaseTransition, progress: number) => void
  onTransitionComplete?: (transition: PhaseTransition) => void | Promise<void>
  onTransitionError?: (transition: PhaseTransition, error: TransitionError) => void
  onTransitionCancel?: (transition: PhaseTransition) => void
  onDataMigrate?: (migration: DataMigration, data: any) => void | Promise<void>
  onPhaseEnter?: (phase: ChatPhase, context: TransitionContext) => void | Promise<void>
  onPhaseExit?: (phase: ChatPhase, context: TransitionContext) => void | Promise<void>
}

// Transition configuration
export interface TransitionConfig {
  enableAutoTransitions: boolean
  enableManualOverrides: boolean
  enableAnimations: boolean
  defaultAnimation: TransitionAnimation
  transitionTimeout: number // max time for transition in ms
  retryAttempts: number
  enableHistory: boolean
  enableDataMigration: boolean
  debugMode: boolean
  
  // Phase-specific settings
  phaseSettings: Record<ChatPhase, PhaseSettings>
}

export interface PhaseSettings {
  minDuration?: number // minimum time to stay in this phase
  maxDuration?: number // maximum time before auto-transition
  allowManualExit: boolean
  allowManualEntry: boolean
  autoTransitionRules: TransitionRule[]
  requiredCompletions: string[] // task IDs that must be completed
}

// Manager state
export interface TransitionManagerState {
  currentTransition: PhaseTransition | null
  pendingTransitions: PhaseTransition[]
  history: PhaseHistory
  permissions: TransitionPermissions
  config: TransitionConfig
  isInitialized: boolean
  lastError: TransitionError | null
}

// Export utility types
export type TransitionResult = {
  success: boolean
  transition?: PhaseTransition
  error?: TransitionError
}

export type TransitionValidation = {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export type PhaseCapabilities = {
  canEnter: boolean
  canExit: boolean
  reasons: string[]
}
