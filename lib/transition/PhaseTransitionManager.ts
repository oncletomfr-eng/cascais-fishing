/**
 * Phase Transition Manager
 * Task 17.3: Phase Transition Logic - Core Management System
 */

import { EventEmitter } from 'events'
import { ChatPhase } from '@/lib/types/multi-phase-chat'
import {
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
  PhaseCompletion,
  TransitionPermissions
} from './phase-transition-types'

export class PhaseTransitionManager extends EventEmitter {
  private state: TransitionManagerState
  private rules: Map<string, TransitionRule> = new Map()
  private migrations: Map<string, DataMigration> = new Map()
  private activeTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(
    private config: TransitionConfig,
    private events: TransitionEvents = {}
  ) {
    super()
    
    this.state = {
      currentTransition: null,
      pendingTransitions: [],
      history: this.createEmptyHistory(),
      permissions: this.createDefaultPermissions(),
      config,
      isInitialized: false,
      lastError: null
    }

    this.initializeDefaultRules()
    this.initializeDataMigrations()
  }

  // Initialization
  async initialize(tripId: string, currentPhase: ChatPhase): Promise<void> {
    try {
      this.state.history = await this.loadHistory(tripId) || this.createEmptyHistory()
      this.state.isInitialized = true
      
      // Start auto-transition monitoring if enabled
      if (this.config.enableAutoTransitions) {
        this.startAutoTransitionMonitoring(tripId, currentPhase)
      }

      this.emit('initialized', { tripId, currentPhase })
    } catch (error) {
      const transitionError = this.createError('INITIALIZATION_FAILED', 'Failed to initialize transition manager', error)
      this.state.lastError = transitionError
      throw transitionError
    }
  }

  // Core transition methods
  async requestTransition(
    fromPhase: ChatPhase,
    toPhase: ChatPhase,
    context: TransitionContext,
    trigger: TransitionTrigger = 'manual'
  ): Promise<TransitionResult> {
    try {
      // Validate the transition
      const validation = await this.validateTransition(fromPhase, toPhase, context)
      if (!validation.isValid) {
        return {
          success: false,
          error: this.createError('VALIDATION_FAILED', validation.errors.join(', '))
        }
      }

      // Check permissions
      if (!this.hasPermission(context.userRole, 'canTriggerManual') && trigger === 'manual') {
        return {
          success: false,
          error: this.createError('PERMISSION_DENIED', 'User does not have permission to trigger manual transitions')
        }
      }

      // Create transition
      const transition = this.createTransition(fromPhase, toPhase, trigger, context)
      
      // Execute transition
      return await this.executeTransition(transition, context)

    } catch (error) {
      const transitionError = this.createError('TRANSITION_REQUEST_FAILED', 'Failed to request transition', error)
      this.state.lastError = transitionError
      return { success: false, error: transitionError }
    }
  }

  async executeTransition(
    transition: PhaseTransition,
    context: TransitionContext
  ): Promise<TransitionResult> {
    try {
      // Set transition as current
      this.state.currentTransition = transition
      transition.status = 'in-progress'

      // Emit transition start event
      await this.events.onTransitionStart?.(transition)
      this.emit('transitionStart', transition)

      // Execute phase exit logic
      await this.executePhaseExit(transition.fromPhase, context)

      // Execute data migration
      if (this.config.enableDataMigration) {
        await this.executeDataMigration(transition.fromPhase, transition.toPhase, context)
      }

      // Execute phase enter logic
      await this.executePhaseEnter(transition.toPhase, context)

      // Complete transition
      transition.status = 'completed'
      transition.completedAt = new Date()
      transition.duration = transition.completedAt.getTime() - transition.triggeredAt.getTime()

      // Update history
      this.updateHistory(transition, context)

      // Emit completion events
      await this.events.onTransitionComplete?.(transition)
      this.emit('transitionComplete', transition)

      // Clear current transition
      this.state.currentTransition = null

      // Start monitoring for next auto-transition
      if (this.config.enableAutoTransitions) {
        this.scheduleAutoTransitionCheck(context.tripId, transition.toPhase, context)
      }

      return { success: true, transition }

    } catch (error) {
      // Handle transition failure
      transition.status = 'failed'
      const transitionError = this.createError('TRANSITION_EXECUTION_FAILED', 'Failed to execute transition', error)
      transition.errors = [...(transition.errors || []), transitionError]

      await this.events.onTransitionError?.(transition, transitionError)
      this.emit('transitionError', transition, transitionError)

      this.state.currentTransition = null
      this.state.lastError = transitionError

      return { success: false, error: transitionError }
    }
  }

  // Validation
  async validateTransition(
    fromPhase: ChatPhase,
    toPhase: ChatPhase,
    context: TransitionContext
  ): Promise<TransitionValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check if phases are different
    if (fromPhase === toPhase) {
      errors.push('Cannot transition to the same phase')
    }

    // Check if transition rule exists
    const rule = this.findApplicableRule(fromPhase, toPhase)
    if (!rule) {
      errors.push(`No transition rule found from ${fromPhase} to ${toPhase}`)
    } else if (!rule.isEnabled) {
      errors.push(`Transition rule from ${fromPhase} to ${toPhase} is disabled`)
    }

    // Validate conditions if rule exists
    if (rule) {
      for (const condition of rule.conditions) {
        try {
          const isValid = await condition.validator(context)
          if (!isValid) {
            errors.push(condition.errorMessage || `Condition ${condition.type} failed`)
          }
        } catch (error) {
          errors.push(`Error validating condition ${condition.type}: ${error}`)
        }
      }
    }

    // Check cooldown
    if (rule?.cooldownMs && this.state.history.phases.length > 0) {
      const lastTransition = this.state.history.phases[this.state.history.phases.length - 1]
      const timeSinceLastTransition = Date.now() - lastTransition.enteredAt.getTime()
      if (timeSinceLastTransition < rule.cooldownMs) {
        warnings.push(`Transition is in cooldown for ${rule.cooldownMs - timeSinceLastTransition}ms`)
      }
    }

    // Check if already transitioning
    if (this.state.currentTransition) {
      errors.push('Another transition is already in progress')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  // Auto-transition logic
  private startAutoTransitionMonitoring(tripId: string, currentPhase: ChatPhase): void {
    // Clear existing timers
    this.clearAutoTransitionTimers()

    // Set up monitoring for current phase
    const phaseSettings = this.config.phaseSettings[currentPhase]
    if (phaseSettings?.autoTransitionRules.length > 0) {
      this.scheduleAutoTransitionCheck(tripId, currentPhase, { tripId } as TransitionContext)
    }
  }

  private scheduleAutoTransitionCheck(
    tripId: string, 
    currentPhase: ChatPhase, 
    context: TransitionContext,
    delayMs: number = 30000 // Check every 30 seconds
  ): void {
    const timerId = `auto-check-${currentPhase}`
    
    const timer = setTimeout(async () => {
      await this.checkAutoTransitionRules(tripId, currentPhase, context)
      // Reschedule
      this.scheduleAutoTransitionCheck(tripId, currentPhase, context, delayMs)
    }, delayMs)

    this.activeTimers.set(timerId, timer)
  }

  private async checkAutoTransitionRules(
    tripId: string,
    currentPhase: ChatPhase,
    context: TransitionContext
  ): Promise<void> {
    const phaseSettings = this.config.phaseSettings[currentPhase]
    if (!phaseSettings?.autoTransitionRules.length) return

    for (const rule of phaseSettings.autoTransitionRules) {
      if (!rule.isEnabled) continue

      try {
        const validation = await this.validateTransition(currentPhase, rule.toPhase, context)
        if (validation.isValid) {
          // Trigger automatic transition
          await this.requestTransition(currentPhase, rule.toPhase, context, 'automatic')
          break // Only one auto-transition at a time
        }
      } catch (error) {
        console.error('Error checking auto-transition rule:', error)
      }
    }
  }

  // Phase lifecycle methods
  private async executePhaseExit(phase: ChatPhase, context: TransitionContext): Promise<void> {
    await this.events.onPhaseExit?.(phase, context)
    this.emit('phaseExit', phase, context)
  }

  private async executePhaseEnter(phase: ChatPhase, context: TransitionContext): Promise<void> {
    await this.events.onPhaseEnter?.(phase, context)
    this.emit('phaseEnter', phase, context)
  }

  // Data migration
  private async executeDataMigration(
    fromPhase: ChatPhase,
    toPhase: ChatPhase,
    context: TransitionContext
  ): Promise<void> {
    const migrationKey = `${fromPhase}-${toPhase}`
    const migration = this.migrations.get(migrationKey)
    
    if (!migration) return

    try {
      const migratedData = await this.processMigration(migration, context)
      await this.events.onDataMigrate?.(migration, migratedData)
      this.emit('dataMigrate', migration, migratedData)
    } catch (error) {
      throw new Error(`Data migration failed: ${error}`)
    }
  }

  private async processMigration(migration: DataMigration, context: TransitionContext): Promise<any> {
    const migratedData: any = {}

    for (const rule of migration.migrations) {
      try {
        const sourceData = this.getDataByKey(context, rule.sourceKey)
        let transformedData = sourceData

        if (rule.transformer) {
          transformedData = await rule.transformer(sourceData, context)
        }

        if (rule.validator && !rule.validator(transformedData)) {
          if (rule.isRequired) {
            throw new Error(`Validation failed for required migration rule: ${rule.id}`)
          }
          continue // Skip optional rules that fail validation
        }

        migratedData[rule.targetKey] = transformedData
      } catch (error) {
        if (rule.isRequired) {
          throw error
        }
        console.warn(`Optional migration rule failed: ${rule.id}`, error)
      }
    }

    return migratedData
  }

  // Utility methods
  private createTransition(
    fromPhase: ChatPhase,
    toPhase: ChatPhase,
    trigger: TransitionTrigger,
    context: TransitionContext
  ): PhaseTransition {
    return {
      id: `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromPhase,
      toPhase,
      triggeredBy: trigger,
      triggeredAt: new Date(),
      completedAt: null,
      status: 'pending',
      data: {
        fromPhase,
        toPhase,
        transitionType: trigger,
        preserveMessages: true
      }
    }
  }

  private createError(code: string, message: string, details?: any): TransitionError {
    return {
      code,
      message,
      details,
      timestamp: new Date()
    }
  }

  private createEmptyHistory(): PhaseHistory {
    return {
      tripId: '',
      phases: [],
      totalDuration: 0,
      transitionCount: 0,
      lastUpdated: new Date()
    }
  }

  private createDefaultPermissions(): TransitionPermissions {
    return {
      userId: '',
      role: 'participant',
      canTriggerManual: false,
      canOverrideRules: false,
      canCancelTransitions: false,
      canEditHistory: false,
      allowedPhases: ['preparation', 'live', 'debrief']
    }
  }

  private updateHistory(transition: PhaseTransition, context: TransitionContext): void {
    // Add entry for new phase
    const historyEntry: PhaseHistoryEntry = {
      phase: transition.toPhase,
      enteredAt: transition.completedAt!,
      exitedAt: null,
      duration: null,
      trigger: transition.triggeredBy
    }

    // Update previous phase exit time
    if (this.state.history.phases.length > 0) {
      const lastEntry = this.state.history.phases[this.state.history.phases.length - 1]
      lastEntry.exitedAt = transition.completedAt!
      lastEntry.duration = lastEntry.exitedAt.getTime() - lastEntry.enteredAt.getTime()
    }

    this.state.history.phases.push(historyEntry)
    this.state.history.transitionCount++
    this.state.history.lastUpdated = new Date()
  }

  private findApplicableRule(fromPhase: ChatPhase, toPhase: ChatPhase): TransitionRule | undefined {
    return Array.from(this.rules.values()).find(
      rule => rule.fromPhase === fromPhase && rule.toPhase === toPhase
    )
  }

  private hasPermission(role: string, permission: keyof TransitionPermissions): boolean {
    // Simplified permission check - in real implementation, would check against user permissions
    if (role === 'captain' || role === 'admin') return true
    return this.state.permissions[permission] as boolean
  }

  private getDataByKey(context: TransitionContext, key: string): any {
    // Extract data from context based on key
    const keys = key.split('.')
    let data: any = context
    
    for (const k of keys) {
      data = data?.[k]
    }
    
    return data
  }

  private clearAutoTransitionTimers(): void {
    for (const timer of this.activeTimers.values()) {
      clearTimeout(timer)
    }
    this.activeTimers.clear()
  }

  private async loadHistory(tripId: string): Promise<PhaseHistory | null> {
    // In real implementation, would load from database
    return null
  }

  // Default rules initialization
  private initializeDefaultRules(): void {
    // Preparation -> Live
    this.rules.set('prep-to-live', {
      id: 'prep-to-live',
      name: 'Preparation to Live Transition',
      fromPhase: 'preparation',
      toPhase: 'live',
      conditions: [
        {
          type: 'time',
          description: 'Trip date has arrived',
          validator: (context) => {
            const now = new Date()
            return now >= context.tripDate
          },
          errorMessage: 'Trip has not started yet'
        }
      ],
      priority: 1,
      isEnabled: true
    })

    // Live -> Debrief
    this.rules.set('live-to-debrief', {
      id: 'live-to-debrief',
      name: 'Live to Debrief Transition',
      fromPhase: 'live',
      toPhase: 'debrief',
      conditions: [
        {
          type: 'time',
          description: 'Trip has ended (24h after start)',
          validator: (context) => {
            const now = new Date()
            const tripEndTime = new Date(context.tripDate.getTime() + 24 * 60 * 60 * 1000)
            return now >= tripEndTime
          },
          errorMessage: 'Trip has not ended yet'
        }
      ],
      priority: 1,
      isEnabled: true
    })
  }

  private initializeDataMigrations(): void {
    // Preparation -> Live migration
    this.migrations.set('preparation-live', {
      fromPhase: 'preparation',
      toPhase: 'live',
      migrations: [
        {
          id: 'checklist-to-trip-data',
          description: 'Migrate completed checklist to trip preparation data',
          sourceKey: 'checklistItems',
          targetKey: 'preparationData',
          transformer: (checklist, context) => ({
            completedTasks: checklist.filter((item: any) => item.isCompleted),
            preparationScore: (checklist.filter((item: any) => item.isCompleted).length / checklist.length) * 100
          }),
          isRequired: false
        }
      ]
    })

    // Live -> Debrief migration
    this.migrations.set('live-debrief', {
      fromPhase: 'live',
      toPhase: 'debrief',
      migrations: [
        {
          id: 'catches-to-summary',
          description: 'Migrate catches to trip summary',
          sourceKey: 'catches',
          targetKey: 'tripSummary.catches',
          transformer: (catches) => catches,
          isRequired: true
        }
      ]
    })
  }

  // Public API methods
  getCurrentTransition(): PhaseTransition | null {
    return this.state.currentTransition
  }

  getHistory(): PhaseHistory {
    return this.state.history
  }

  getConfig(): TransitionConfig {
    return this.config
  }

  updateConfig(updates: Partial<TransitionConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  getPhaseCapabilities(phase: ChatPhase, context: TransitionContext): PhaseCapabilities {
    const reasons: string[] = []
    let canEnter = true
    let canExit = true

    // Check phase settings
    const settings = this.config.phaseSettings[phase]
    if (settings) {
      if (!settings.allowManualEntry) {
        canEnter = false
        reasons.push('Manual entry not allowed for this phase')
      }
      if (!settings.allowManualExit) {
        canExit = false
        reasons.push('Manual exit not allowed for this phase')
      }
    }

    // Check permissions
    if (!this.hasPermission(context.userRole, 'canTriggerManual')) {
      canEnter = false
      canExit = false
      reasons.push('User does not have permission to trigger transitions')
    }

    return { canEnter, canExit, reasons }
  }

  // Cleanup
  destroy(): void {
    this.clearAutoTransitionTimers()
    this.removeAllListeners()
    this.state.isInitialized = false
  }
}
