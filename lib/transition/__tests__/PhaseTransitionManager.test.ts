/**
 * Unit Tests for PhaseTransitionManager
 * Task 17.6: Chat System Testing & Performance - Phase Transition Tests
 */

import { PhaseTransitionManager } from '../PhaseTransitionManager'
import { PhaseTransitionEvent, PhaseTransitionState } from '../phase-transition-types'

// Mock dependencies
jest.mock('../DataMigrationService', () => ({
  DataMigrationService: jest.fn().mockImplementation(() => ({
    migrateData: jest.fn().mockResolvedValue({ success: true }),
    validateMigration: jest.fn().mockReturnValue({ isValid: true })
  }))
}))

describe('PhaseTransitionManager', () => {
  let manager: PhaseTransitionManager
  let mockEventHandler: jest.Mock

  beforeEach(() => {
    manager = new PhaseTransitionManager()
    mockEventHandler = jest.fn()
    
    // Clear any existing listeners
    jest.clearAllMocks()
  })

  afterEach(() => {
    manager.destroy()
  })

  describe('Basic Phase Transitions', () => {
    it('should initialize with default state', () => {
      const state = manager.getCurrentState()
      
      expect(state.currentPhase).toBe('preparation')
      expect(state.isTransitioning).toBe(false)
      expect(state.error).toBeNull()
      expect(state.history).toHaveLength(0)
    })

    it('should transition from preparation to live phase', async () => {
      manager.on('transition_started', mockEventHandler)
      manager.on('transition_completed', mockEventHandler)

      const result = await manager.transitionTo('live', {
        reason: 'manual',
        userId: 'test-user'
      })

      expect(result.success).toBe(true)
      expect(manager.getCurrentState().currentPhase).toBe('live')
      expect(mockEventHandler).toHaveBeenCalledTimes(2)
    })

    it('should transition from live to debrief phase', async () => {
      // First transition to live
      await manager.transitionTo('live')
      
      const result = await manager.transitionTo('debrief', {
        reason: 'automatic',
        trigger: 'time_based'
      })

      expect(result.success).toBe(true)
      expect(manager.getCurrentState().currentPhase).toBe('debrief')
    })

    it('should prevent invalid transitions', async () => {
      // Try to transition directly from preparation to debrief
      const result = await manager.transitionTo('debrief')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid transition')
      expect(manager.getCurrentState().currentPhase).toBe('preparation')
    })
  })

  describe('Transition Rules and Validation', () => {
    it('should validate transition rules', () => {
      const preparationToLive = manager.validateTransition('preparation', 'live')
      const preparationToDebrief = manager.validateTransition('preparation', 'debrief')
      const liveToDebrief = manager.validateTransition('live', 'debrief')

      expect(preparationToLive.isValid).toBe(true)
      expect(preparationToDebrief.isValid).toBe(false)
      expect(liveToDebrief.isValid).toBe(true)
    })

    it('should respect custom validation rules', () => {
      manager.setValidationRule('preparation', 'live', (context) => {
        return context.data?.hasPermission === true
      })

      const validContext = { data: { hasPermission: true } }
      const invalidContext = { data: { hasPermission: false } }

      expect(manager.validateTransition('preparation', 'live', validContext).isValid).toBe(true)
      expect(manager.validateTransition('preparation', 'live', invalidContext).isValid).toBe(false)
    })

    it('should check dependencies before transition', async () => {
      manager.setDependencyCheck('live', async () => {
        throw new Error('Trip not started')
      })

      const result = await manager.transitionTo('live')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Trip not started')
    })
  })

  describe('Event System', () => {
    it('should emit transition events in correct order', async () => {
      const events: string[] = []

      manager.on('transition_started', () => events.push('started'))
      manager.on('transition_validated', () => events.push('validated'))
      manager.on('transition_completed', () => events.push('completed'))

      await manager.transitionTo('live')

      expect(events).toEqual(['started', 'validated', 'completed'])
    })

    it('should emit error events on failed transitions', async () => {
      let errorEvent: PhaseTransitionEvent | null = null

      manager.on('transition_failed', (event) => {
        errorEvent = event
      })

      await manager.transitionTo('debrief') // Invalid transition

      expect(errorEvent).not.toBeNull()
      expect(errorEvent?.error).toContain('Invalid transition')
    })

    it('should handle event listener cleanup', () => {
      const handler = jest.fn()
      manager.on('transition_started', handler)
      
      expect(manager.listenerCount('transition_started')).toBe(1)
      
      manager.off('transition_started', handler)
      expect(manager.listenerCount('transition_started')).toBe(0)
    })
  })

  describe('State Management', () => {
    it('should maintain transition history', async () => {
      await manager.transitionTo('live')
      await manager.transitionTo('debrief')

      const history = manager.getTransitionHistory()

      expect(history).toHaveLength(2)
      expect(history[0].from).toBe('preparation')
      expect(history[0].to).toBe('live')
      expect(history[1].from).toBe('live')
      expect(history[1].to).toBe('debrief')
    })

    it('should track transition timing', async () => {
      const startTime = Date.now()
      await manager.transitionTo('live')
      const endTime = Date.now()

      const history = manager.getTransitionHistory()
      const transition = history[0]

      expect(transition.startedAt.getTime()).toBeGreaterThanOrEqual(startTime)
      expect(transition.completedAt!.getTime()).toBeLessThanOrEqual(endTime)
      expect(transition.duration).toBeGreaterThan(0)
    })

    it('should handle concurrent transitions', async () => {
      // Start two transitions simultaneously
      const promise1 = manager.transitionTo('live')
      const promise2 = manager.transitionTo('live')

      const [result1, result2] = await Promise.all([promise1, promise2])

      // Only one should succeed
      const successCount = [result1.success, result2.success].filter(Boolean).length
      expect(successCount).toBe(1)
    })
  })

  describe('Auto-Transition Features', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should support time-based auto transitions', async () => {
      manager.setAutoTransition('preparation', 'live', {
        trigger: 'time',
        delay: 5000
      })

      const transitionPromise = new Promise(resolve => {
        manager.on('transition_completed', resolve)
      })

      manager.startAutoTransitions()

      // Fast-forward time
      jest.advanceTimersByTime(5000)

      await transitionPromise

      expect(manager.getCurrentState().currentPhase).toBe('live')
    })

    it('should cancel auto transitions when manually transitioning', async () => {
      manager.setAutoTransition('preparation', 'live', {
        trigger: 'time',
        delay: 10000
      })

      manager.startAutoTransitions()

      // Manually transition before auto transition
      await manager.transitionTo('live')

      // Fast-forward past auto transition time
      jest.advanceTimersByTime(15000)

      // Should still be in live phase (not triggered again)
      expect(manager.getCurrentState().currentPhase).toBe('live')
    })
  })

  describe('Data Migration Integration', () => {
    it('should migrate data during transitions', async () => {
      const mockMigrationService = manager.getMigrationService()
      
      await manager.transitionTo('live')

      expect(mockMigrationService.migrateData).toHaveBeenCalledWith(
        'preparation',
        'live',
        expect.any(Object)
      )
    })

    it('should handle migration failures', async () => {
      const mockMigrationService = manager.getMigrationService()
      mockMigrationService.migrateData.mockRejectedValueOnce(
        new Error('Migration failed')
      )

      const result = await manager.transitionTo('live')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Migration failed')
    })
  })

  describe('Performance and Resource Management', () => {
    it('should complete transitions within reasonable time', async () => {
      const startTime = performance.now()
      
      await manager.transitionTo('live')
      
      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('should clean up resources on destroy', () => {
      const eventHandler = jest.fn()
      manager.on('transition_started', eventHandler)
      
      manager.destroy()

      // Verify cleanup
      expect(manager.listenerCount('transition_started')).toBe(0)
      expect(manager.getCurrentState().currentPhase).toBe('preparation')
    })

    it('should handle memory efficiently with large history', async () => {
      // Create many transitions to test memory handling
      for (let i = 0; i < 100; i++) {
        await manager.transitionTo(i % 2 === 0 ? 'live' : 'preparation')
      }

      const history = manager.getTransitionHistory()
      
      // Should limit history size to prevent memory issues
      expect(history.length).toBeLessThanOrEqual(50)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should recover from failed transitions', async () => {
      // Simulate a transition that fails during execution
      manager.setValidationRule('preparation', 'live', () => {
        throw new Error('Validation error')
      })

      const result = await manager.transitionTo('live')

      expect(result.success).toBe(false)
      expect(manager.getCurrentState().currentPhase).toBe('preparation')
      expect(manager.getCurrentState().isTransitioning).toBe(false)
    })

    it('should handle async validation errors', async () => {
      manager.setDependencyCheck('live', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        throw new Error('Async validation failed')
      })

      const result = await manager.transitionTo('live')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Async validation failed')
    })

    it('should maintain state consistency after errors', async () => {
      const initialState = manager.getCurrentState()

      // Attempt invalid transition
      await manager.transitionTo('debrief')

      const finalState = manager.getCurrentState()

      expect(finalState.currentPhase).toBe(initialState.currentPhase)
      expect(finalState.isTransitioning).toBe(false)
      expect(finalState.error).not.toBeNull()
    })
  })
})
