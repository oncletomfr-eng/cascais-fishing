/**
 * Phase Transition React Hook
 * Task 17.3: Phase Transition Logic - React Integration
 */

'use client'

import { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  createContext,
  useContext,
  ReactNode 
} from 'react'
import { useSession } from 'next-auth/react'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import { PhaseTransitionManager } from './PhaseTransitionManager'
import {
  TransitionConfig,
  TransitionContext,
  PhaseTransition,
  TransitionResult,
  TransitionValidation,
  PhaseCapabilities,
  TransitionEvents,
  PhaseHistory,
  TransitionAnimation,
  TripStatus
} from './phase-transition-types'
import { ChecklistItem, CatchRecord, TripReview } from '@/components/chat/phases/types'

// Context for PhaseTransitionManager
interface PhaseTransitionContextValue {
  manager: PhaseTransitionManager | null
  currentPhase: ChatPhase
  isTransitioning: boolean
  currentTransition: PhaseTransition | null
  history: PhaseHistory
  capabilities: PhaseCapabilities | null
  
  // Actions
  requestTransition: (toPhase: ChatPhase, trigger?: string) => Promise<TransitionResult>
  validateTransition: (toPhase: ChatPhase) => Promise<TransitionValidation>
  getPhaseCapabilities: (phase: ChatPhase) => PhaseCapabilities
  
  // Configuration
  updateConfig: (updates: Partial<TransitionConfig>) => void
  getConfig: () => TransitionConfig
}

const PhaseTransitionContext = createContext<PhaseTransitionContextValue | null>(null)

// Provider Props
interface PhaseTransitionProviderProps {
  children: ReactNode
  tripId: string
  tripDate: Date
  initialPhase?: ChatPhase
  config?: Partial<TransitionConfig>
  events?: TransitionEvents
  checklistItems?: ChecklistItem[]
  catches?: CatchRecord[]
  reviews?: TripReview[]
  tripStatus?: TripStatus
}

// Default configuration
const DEFAULT_CONFIG: TransitionConfig = {
  enableAutoTransitions: true,
  enableManualOverrides: true,
  enableAnimations: true,
  defaultAnimation: {
    type: 'slide',
    duration: 300,
    easing: 'ease-in-out',
    direction: 'right'
  },
  transitionTimeout: 30000,
  retryAttempts: 3,
  enableHistory: true,
  enableDataMigration: true,
  debugMode: false,
  
  phaseSettings: {
    preparation: {
      minDuration: 60000, // 1 minute minimum
      allowManualExit: true,
      allowManualEntry: true,
      autoTransitionRules: [],
      requiredCompletions: []
    },
    live: {
      minDuration: 300000, // 5 minutes minimum
      allowManualExit: true,
      allowManualEntry: false, // Only through auto-transition
      autoTransitionRules: [],
      requiredCompletions: []
    },
    debrief: {
      allowManualExit: false,
      allowManualEntry: false, // Only through auto-transition
      autoTransitionRules: [],
      requiredCompletions: []
    }
  }
}

// Provider Component
export function PhaseTransitionProvider({
  children,
  tripId,
  tripDate,
  initialPhase = 'preparation',
  config = {},
  events = {},
  checklistItems = [],
  catches = [],
  reviews = [],
  tripStatus = 'planned'
}: PhaseTransitionProviderProps) {
  const { data: session } = useSession()
  const [currentPhase, setCurrentPhase] = useState<ChatPhase>(initialPhase)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [currentTransition, setCurrentTransition] = useState<PhaseTransition | null>(null)
  const [history, setHistory] = useState<PhaseHistory>({
    tripId,
    phases: [],
    totalDuration: 0,
    transitionCount: 0,
    lastUpdated: new Date()
  })
  const [capabilities, setCapabilities] = useState<PhaseCapabilities | null>(null)

  // Merge configurations
  const mergedConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    phaseSettings: {
      ...DEFAULT_CONFIG.phaseSettings,
      ...config.phaseSettings
    }
  }), [config])

  // Create transition manager instance
  const managerRef = useRef<PhaseTransitionManager | null>(null)

  // Initialize manager
  useEffect(() => {
    const initializeManager = async () => {
      if (managerRef.current) {
        managerRef.current.destroy()
      }

      const enhancedEvents: TransitionEvents = {
        ...events,
        onTransitionStart: async (transition) => {
          setIsTransitioning(true)
          setCurrentTransition(transition)
          await events.onTransitionStart?.(transition)
        },
        onTransitionComplete: async (transition) => {
          setCurrentPhase(transition.toPhase)
          setIsTransitioning(false)
          setCurrentTransition(null)
          setHistory(managerRef.current?.getHistory() || history)
          await events.onTransitionComplete?.(transition)
        },
        onTransitionError: async (transition, error) => {
          setIsTransitioning(false)
          setCurrentTransition(null)
          await events.onTransitionError?.(transition, error)
        }
      }

      const manager = new PhaseTransitionManager(mergedConfig, enhancedEvents)
      await manager.initialize(tripId, currentPhase)
      
      managerRef.current = manager
      setHistory(manager.getHistory())
    }

    initializeManager().catch(console.error)

    return () => {
      managerRef.current?.destroy()
    }
  }, [tripId, mergedConfig])

  // Update capabilities when phase or context changes
  useEffect(() => {
    if (managerRef.current && session?.user) {
      const context = createTransitionContext()
      const caps = managerRef.current.getPhaseCapabilities(currentPhase, context)
      setCapabilities(caps)
    }
  }, [currentPhase, session, checklistItems, catches, reviews, tripStatus])

  // Create transition context
  const createTransitionContext = useCallback((): TransitionContext => {
    return {
      tripId,
      tripDate,
      currentPhase,
      targetPhase: currentPhase, // Will be updated when making transition
      userId: session?.user?.id || '',
      userRole: (session?.user as any)?.role === 'captain' ? 'captain' : 'participant',
      tripStatus,
      checklistItems,
      catches,
      reviews,
      lastTransition: currentTransition
    }
  }, [tripId, tripDate, currentPhase, session, tripStatus, checklistItems, catches, reviews, currentTransition])

  // Action functions
  const requestTransition = useCallback(async (
    toPhase: ChatPhase, 
    trigger: string = 'manual'
  ): Promise<TransitionResult> => {
    if (!managerRef.current) {
      return { 
        success: false, 
        error: { 
          code: 'MANAGER_NOT_INITIALIZED', 
          message: 'Transition manager not initialized',
          timestamp: new Date()
        } 
      }
    }

    const context = createTransitionContext()
    context.targetPhase = toPhase

    return await managerRef.current.requestTransition(
      currentPhase, 
      toPhase, 
      context, 
      trigger as any
    )
  }, [currentPhase, createTransitionContext])

  const validateTransition = useCallback(async (toPhase: ChatPhase): Promise<TransitionValidation> => {
    if (!managerRef.current) {
      return { 
        isValid: false, 
        errors: ['Transition manager not initialized'], 
        warnings: [] 
      }
    }

    const context = createTransitionContext()
    return await managerRef.current.validateTransition(currentPhase, toPhase, context)
  }, [currentPhase, createTransitionContext])

  const getPhaseCapabilities = useCallback((phase: ChatPhase): PhaseCapabilities => {
    if (!managerRef.current) {
      return { canEnter: false, canExit: false, reasons: ['Manager not initialized'] }
    }

    const context = createTransitionContext()
    return managerRef.current.getPhaseCapabilities(phase, context)
  }, [createTransitionContext])

  const updateConfig = useCallback((updates: Partial<TransitionConfig>) => {
    if (managerRef.current) {
      managerRef.current.updateConfig(updates)
    }
  }, [])

  const getConfig = useCallback((): TransitionConfig => {
    return managerRef.current?.getConfig() || mergedConfig
  }, [mergedConfig])

  const contextValue: PhaseTransitionContextValue = {
    manager: managerRef.current,
    currentPhase,
    isTransitioning,
    currentTransition,
    history,
    capabilities,
    requestTransition,
    validateTransition,
    getPhaseCapabilities,
    updateConfig,
    getConfig
  }

  return (
    <PhaseTransitionContext.Provider value={contextValue}>
      {children}
    </PhaseTransitionContext.Provider>
  )
}

// Hook to use the transition context
export function usePhaseTransition() {
  const context = useContext(PhaseTransitionContext)
  
  if (!context) {
    throw new Error('usePhaseTransition must be used within a PhaseTransitionProvider')
  }
  
  return context
}

// Additional specialized hooks
export function useTransitionTriggers(tripId: string, tripDate: Date) {
  const { requestTransition, validateTransition } = usePhaseTransition()
  
  // Time-based triggers
  const triggerTimeBasedTransition = useCallback(async () => {
    const now = new Date()
    const tripTime = tripDate.getTime()
    const currentTime = now.getTime()
    
    // Check if trip should start (within 1 hour of trip time)
    if (currentTime >= tripTime - 60 * 60 * 1000 && currentTime < tripTime + 24 * 60 * 60 * 1000) {
      const validation = await validateTransition('live')
      if (validation.isValid) {
        return await requestTransition('live', 'time-based')
      }
    }
    
    // Check if trip should end (24 hours after start)
    if (currentTime >= tripTime + 24 * 60 * 60 * 1000) {
      const validation = await validateTransition('debrief')
      if (validation.isValid) {
        return await requestTransition('debrief', 'time-based')
      }
    }
    
    return { success: false, error: { code: 'NO_TIME_TRIGGER', message: 'No time-based trigger available', timestamp: new Date() } }
  }, [tripDate, requestTransition, validateTransition])
  
  return {
    triggerTimeBasedTransition
  }
}

export function usePhaseCompletion() {
  const { requestTransition, capabilities } = usePhaseTransition()
  
  const triggerCompletionBasedTransition = useCallback(async (fromPhase: ChatPhase) => {
    // Logic to determine if phase is complete enough for transition
    // This would check completion criteria and trigger automatic transition
    
    let toPhase: ChatPhase
    switch (fromPhase) {
      case 'preparation':
        toPhase = 'live'
        break
      case 'live':
        toPhase = 'debrief'
        break
      default:
        return { success: false, error: { code: 'NO_NEXT_PHASE', message: 'No next phase available', timestamp: new Date() } }
    }
    
    return await requestTransition(toPhase, 'completion-based')
  }, [requestTransition])
  
  return {
    triggerCompletionBasedTransition,
    capabilities
  }
}

export function useTransitionHistory() {
  const { history, manager } = usePhaseTransition()
  
  const getPhaseStats = useCallback(() => {
    const stats = {
      totalPhases: history.phases.length,
      totalDuration: history.totalDuration,
      averageDuration: history.phases.length > 0 ? history.totalDuration / history.phases.length : 0,
      currentPhaseDuration: 0
    }
    
    if (history.phases.length > 0) {
      const currentPhaseEntry = history.phases[history.phases.length - 1]
      if (!currentPhaseEntry.exitedAt) {
        stats.currentPhaseDuration = Date.now() - currentPhaseEntry.enteredAt.getTime()
      }
    }
    
    return stats
  }, [history])
  
  return {
    history,
    getPhaseStats
  }
}

// Export types for external use
export type {
  PhaseTransitionContextValue,
  TransitionResult,
  TransitionValidation,
  PhaseCapabilities,
  TransitionConfig,
  TransitionContext
}
