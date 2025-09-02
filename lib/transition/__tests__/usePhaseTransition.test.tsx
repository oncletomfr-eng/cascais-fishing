/**
 * Unit Tests for usePhaseTransition Hook
 * Task 17.6: Chat System Testing & Performance - Phase Transition Hook Tests
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePhaseTransition } from '../usePhaseTransition'
import { PhaseTransitionManager } from '../PhaseTransitionManager'

// Mock the PhaseTransitionManager
jest.mock('../PhaseTransitionManager')

const MockedPhaseTransitionManager = PhaseTransitionManager as jest.MockedClass<typeof PhaseTransitionManager>

describe('usePhaseTransition', () => {
  let mockManager: jest.Mocked<PhaseTransitionManager>

  beforeEach(() => {
    mockManager = {
      getCurrentState: jest.fn().mockReturnValue({
        currentPhase: 'preparation',
        previousPhase: null,
        isTransitioning: false,
        error: null,
        history: []
      }),
      transitionTo: jest.fn().mockResolvedValue({ success: true }),
      validateTransition: jest.fn().mockReturnValue({ isValid: true }),
      getTransitionHistory: jest.fn().mockReturnValue([]),
      canTransitionTo: jest.fn().mockReturnValue(true),
      on: jest.fn(),
      off: jest.fn(),
      startAutoTransitions: jest.fn(),
      stopAutoTransitions: jest.fn(),
      destroy: jest.fn()
    } as any

    MockedPhaseTransitionManager.mockImplementation(() => mockManager)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Hook Functionality', () => {
    it('should return current phase state', () => {
      const { result } = renderHook(() => usePhaseTransition())

      expect(result.current.currentPhase).toBe('preparation')
      expect(result.current.isTransitioning).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should provide transition function', async () => {
      const { result } = renderHook(() => usePhaseTransition())

      await act(async () => {
        await result.current.transitionTo('live')
      })

      expect(mockManager.transitionTo).toHaveBeenCalledWith('live', undefined)
    })

    it('should provide validation function', () => {
      const { result } = renderHook(() => usePhaseTransition())

      const validation = result.current.validateTransition('preparation', 'live')

      expect(mockManager.validateTransition).toHaveBeenCalledWith('preparation', 'live', undefined)
      expect(validation.isValid).toBe(true)
    })
  })

  describe('State Updates', () => {
    it('should update state when phase changes', async () => {
      const { result } = renderHook(() => usePhaseTransition())

      // Simulate phase change
      act(() => {
        mockManager.getCurrentState.mockReturnValue({
          currentPhase: 'live',
          previousPhase: 'preparation',
          isTransitioning: false,
          error: null,
          history: []
        })
      })

      // Trigger state update by calling a function that would cause re-render
      await act(async () => {
        await result.current.transitionTo('debrief')
      })

      expect(result.current.currentPhase).toBe('live')
      expect(result.current.previousPhase).toBe('preparation')
    })

    it('should handle transitioning state', () => {
      mockManager.getCurrentState.mockReturnValue({
        currentPhase: 'preparation',
        previousPhase: null,
        isTransitioning: true,
        error: null,
        history: []
      })

      const { result } = renderHook(() => usePhaseTransition())

      expect(result.current.isTransitioning).toBe(true)
    })

    it('should handle error state', () => {
      const error = new Error('Transition failed')
      mockManager.getCurrentState.mockReturnValue({
        currentPhase: 'preparation',
        previousPhase: null,
        isTransitioning: false,
        error,
        history: []
      })

      const { result } = renderHook(() => usePhaseTransition())

      expect(result.current.error).toBe(error)
    })
  })

  describe('Event Handling', () => {
    it('should set up event listeners on mount', () => {
      renderHook(() => usePhaseTransition())

      expect(mockManager.on).toHaveBeenCalledWith('transition_started', expect.any(Function))
      expect(mockManager.on).toHaveBeenCalledWith('transition_completed', expect.any(Function))
      expect(mockManager.on).toHaveBeenCalledWith('transition_failed', expect.any(Function))
    })

    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => usePhaseTransition())

      unmount()

      expect(mockManager.off).toHaveBeenCalledWith('transition_started', expect.any(Function))
      expect(mockManager.off).toHaveBeenCalledWith('transition_completed', expect.any(Function))
      expect(mockManager.off).toHaveBeenCalledWith('transition_failed', expect.any(Function))
    })

    it('should update state when transition events are fired', () => {
      let transitionStartedCallback: Function
      let transitionCompletedCallback: Function

      mockManager.on.mockImplementation((event, callback) => {
        if (event === 'transition_started') {
          transitionStartedCallback = callback
        } else if (event === 'transition_completed') {
          transitionCompletedCallback = callback
        }
      })

      const { result } = renderHook(() => usePhaseTransition())

      // Simulate transition started
      act(() => {
        mockManager.getCurrentState.mockReturnValue({
          currentPhase: 'preparation',
          previousPhase: null,
          isTransitioning: true,
          error: null,
          history: []
        })
        transitionStartedCallback()
      })

      expect(result.current.isTransitioning).toBe(true)

      // Simulate transition completed
      act(() => {
        mockManager.getCurrentState.mockReturnValue({
          currentPhase: 'live',
          previousPhase: 'preparation',
          isTransitioning: false,
          error: null,
          history: []
        })
        transitionCompletedCallback()
      })

      expect(result.current.isTransitioning).toBe(false)
      expect(result.current.currentPhase).toBe('live')
    })
  })

  describe('Advanced Features', () => {
    it('should provide history access', () => {
      const mockHistory = [
        {
          from: 'preparation',
          to: 'live',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 1000
        }
      ]

      mockManager.getTransitionHistory.mockReturnValue(mockHistory)

      const { result } = renderHook(() => usePhaseTransition())

      expect(result.current.history).toBe(mockHistory)
    })

    it('should provide canTransitionTo check', () => {
      mockManager.canTransitionTo.mockReturnValue(false)

      const { result } = renderHook(() => usePhaseTransition())

      const canTransition = result.current.canTransitionTo('debrief')

      expect(mockManager.canTransitionTo).toHaveBeenCalledWith('debrief')
      expect(canTransition).toBe(false)
    })

    it('should handle auto transitions', () => {
      const { result } = renderHook(() => usePhaseTransition())

      act(() => {
        result.current.startAutoTransitions()
      })

      expect(mockManager.startAutoTransitions).toHaveBeenCalled()

      act(() => {
        result.current.stopAutoTransitions()
      })

      expect(mockManager.stopAutoTransitions).toHaveBeenCalled()
    })
  })

  describe('Performance Optimizations', () => {
    it('should memoize transition functions', () => {
      const { result, rerender } = renderHook(() => usePhaseTransition())

      const firstTransitionTo = result.current.transitionTo
      const firstValidateTransition = result.current.validateTransition

      rerender()

      const secondTransitionTo = result.current.transitionTo
      const secondValidateTransition = result.current.validateTransition

      expect(firstTransitionTo).toBe(secondTransitionTo)
      expect(firstValidateTransition).toBe(secondValidateTransition)
    })

    it('should not cause unnecessary re-renders', () => {
      let renderCount = 0

      const TestComponent = () => {
        renderCount++
        usePhaseTransition()
        return null
      }

      const { rerender } = renderHook(() => <TestComponent />)

      const initialRenderCount = renderCount

      // Re-render without state changes
      rerender()

      expect(renderCount).toBe(initialRenderCount)
    })
  })

  describe('Error Handling', () => {
    it('should handle transition errors gracefully', async () => {
      const error = new Error('Transition error')
      mockManager.transitionTo.mockRejectedValueOnce(error)

      const { result } = renderHook(() => usePhaseTransition())

      let thrownError
      try {
        await act(async () => {
          await result.current.transitionTo('live')
        })
      } catch (e) {
        thrownError = e
      }

      expect(thrownError).toBe(error)
    })

    it('should provide error recovery', async () => {
      mockManager.getCurrentState.mockReturnValue({
        currentPhase: 'preparation',
        previousPhase: null,
        isTransitioning: false,
        error: new Error('Previous error'),
        history: []
      })

      const { result } = renderHook(() => usePhaseTransition())

      expect(result.current.error).not.toBeNull()

      // Clear error by successful transition
      act(() => {
        mockManager.getCurrentState.mockReturnValue({
          currentPhase: 'live',
          previousPhase: 'preparation',
          isTransitioning: false,
          error: null,
          history: []
        })
      })

      await act(async () => {
        await result.current.transitionTo('live')
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should clean up manager on unmount', () => {
      const { unmount } = renderHook(() => usePhaseTransition())

      unmount()

      expect(mockManager.destroy).toHaveBeenCalled()
    })

    it('should handle multiple hook instances', () => {
      const { unmount: unmount1 } = renderHook(() => usePhaseTransition())
      const { unmount: unmount2 } = renderHook(() => usePhaseTransition())

      // Both should have their own manager instances
      expect(MockedPhaseTransitionManager).toHaveBeenCalledTimes(2)

      unmount1()
      unmount2()

      // Both should clean up
      expect(mockManager.destroy).toHaveBeenCalledTimes(2)
    })
  })
})
