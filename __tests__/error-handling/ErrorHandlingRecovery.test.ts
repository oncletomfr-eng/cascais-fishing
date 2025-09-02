/**
 * Error Handling and Recovery Tests
 * Task 17.6: Chat System Testing & Performance - Error Handling and Recovery Testing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from '@testing-library/react'
import { ParticipantStatusService } from '@/lib/chat/participants/ParticipantStatusService'
import { PhaseTransitionManager } from '@/lib/transition/PhaseTransitionManager'
import { StreamChatService } from '@/lib/chat/StreamChatService'
import { ParticipantList } from '@/components/chat/participants/ParticipantList'
import { IntegratedMultiPhaseChat } from '@/components/chat/IntegratedMultiPhaseChat'
import { PhaseTransitionContainer } from '@/components/transition/PhaseTransitionContainer'
import { ParticipantStatusProvider } from '@/lib/chat/participants/useParticipantStatus'
import { createChatParticipant } from '@/components/chat/participants'
import React from 'react'

// Mock console methods to capture error logs
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

describe('Error Handling and Recovery Tests', () => {
  let consoleErrors: string[] = []
  let consoleWarnings: string[] = []

  beforeEach(() => {
    consoleErrors = []
    consoleWarnings = []
    
    console.error = jest.fn((...args) => {
      consoleErrors.push(args.join(' '))
      originalConsoleError(...args)
    })
    
    console.warn = jest.fn((...args) => {
      consoleWarnings.push(args.join(' '))
      originalConsoleWarn(...args)
    })
    
    jest.clearAllMocks()
  })

  afterEach(() => {
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
  })

  describe('ParticipantStatusService Error Handling', () => {
    let service: ParticipantStatusService

    beforeEach(() => {
      service = new ParticipantStatusService()
    })

    afterEach(() => {
      service.destroy()
    })

    it('should handle invalid participant data gracefully', () => {
      expect(() => {
        service.addParticipant(null as any)
      }).not.toThrow()

      expect(() => {
        service.addParticipant(undefined as any)
      }).not.toThrow()

      expect(() => {
        service.addParticipant({} as any)
      }).not.toThrow()

      expect(() => {
        service.addParticipant({ id: null } as any)
      }).not.toThrow()

      // Service should remain functional
      const validParticipant = createChatParticipant('user-1', 'User 1', 'participant')
      expect(() => {
        service.addParticipant(validParticipant)
      }).not.toThrow()

      expect(service.getParticipants()).toHaveLength(1)
    })

    it('should handle network connectivity issues', async () => {
      // Mock network failure
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch

      service = new ParticipantStatusService({
        enableRealTimeSync: true,
        heartbeatInterval: 100
      })

      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)

      // Simulate network operations that might fail
      service.updateParticipantStatus('user-1', 'away')

      await waitFor(() => {
        // Service should handle network errors gracefully
        expect(consoleErrors.length).toBeGreaterThan(0)
      }, { timeout: 500 })

      // Service should remain operational
      expect(service.getParticipant('user-1')).toBeDefined()
    })

    it('should recover from corrupted state', () => {
      const participant1 = createChatParticipant('user-1', 'User 1', 'participant')
      const participant2 = createChatParticipant('user-2', 'User 2', 'captain')
      
      service.addParticipant(participant1)
      service.addParticipant(participant2)

      // Simulate state corruption
      try {
        (service as any).participants = null
      } catch (error) {
        // Expected - service should protect its internal state
      }

      // Service should recover and remain functional
      expect(() => {
        service.getParticipants()
      }).not.toThrow()

      // Should be able to add new participants
      const participant3 = createChatParticipant('user-3', 'User 3', 'participant')
      expect(() => {
        service.addParticipant(participant3)
      }).not.toThrow()
    })

    it('should handle event listener errors', () => {
      const faultyHandler = jest.fn(() => {
        throw new Error('Handler error')
      })

      const workingHandler = jest.fn()

      // Add both handlers
      service.on('participant_updated', faultyHandler)
      service.on('participant_updated', workingHandler)

      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      
      expect(() => {
        service.addParticipant(participant)
      }).not.toThrow()

      // Faulty handler should have been called and thrown
      expect(faultyHandler).toHaveBeenCalled()
      
      // Working handler should still have been called
      expect(workingHandler).toHaveBeenCalled()
      
      // Error should have been logged
      expect(consoleErrors.length).toBeGreaterThan(0)
    })

    it('should handle concurrent access gracefully', async () => {
      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)

      // Create many concurrent operations
      const operations = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve().then(() => {
          if (i % 4 === 0) {
            service.updateParticipantStatus('user-1', 'online')
          } else if (i % 4 === 1) {
            service.updateParticipantStatus('user-1', 'away')
          } else if (i % 4 === 2) {
            service.updateTypingStatus('user-1', 'channel-1', true)
          } else {
            service.updateTypingStatus('user-1', 'channel-1', false)
          }
        })
      )

      await expect(Promise.all(operations)).resolves.not.toThrow()
      
      // Service should still be in a valid state
      expect(service.getParticipant('user-1')).toBeDefined()
    })
  })

  describe('PhaseTransitionManager Error Handling', () => {
    let manager: PhaseTransitionManager

    beforeEach(() => {
      manager = new PhaseTransitionManager({
        tripId: 'test-trip',
        initialPhase: 'preparation',
        participants: [
          createChatParticipant('captain-1', 'Captain', 'captain'),
          createChatParticipant('user-1', 'User 1', 'participant')
        ]
      })
    })

    afterEach(() => {
      manager.destroy()
    })

    it('should handle invalid phase transitions', async () => {
      // Try invalid transitions
      await expect(manager.transitionTo('invalid' as any)).rejects.toThrow()
      
      // Manager should remain in current phase
      expect(manager.getCurrentPhase()).toBe('preparation')
      
      // Should still be able to do valid transitions
      await expect(manager.transitionTo('fishing')).resolves.not.toThrow()
      expect(manager.getCurrentPhase()).toBe('fishing')
    })

    it('should handle validation failures gracefully', async () => {
      // Set up a failing validator
      manager.setPhaseValidator('fishing', () => {
        throw new Error('Validation failed')
      })

      await expect(manager.transitionTo('fishing')).rejects.toThrow('Validation failed')
      
      // Manager should remain in preparation phase
      expect(manager.getCurrentPhase()).toBe('preparation')
      
      // Should log the error
      expect(consoleErrors.length).toBeGreaterThan(0)
      
      // Remove the failing validator and try again
      manager.setPhaseValidator('fishing', () => true)
      await expect(manager.transitionTo('fishing')).resolves.not.toThrow()
    })

    it('should handle corrupted phase history', () => {
      // Simulate corrupted history
      try {
        (manager as any).phaseHistory = null
      } catch (error) {
        // Expected - manager should protect its state
      }

      // Manager should still work
      expect(() => {
        manager.getPhaseHistory()
      }).not.toThrow()

      expect(() => {
        manager.getCurrentPhase()
      }).not.toThrow()
    })

    it('should recover from event handler errors', async () => {
      const faultyHandler = jest.fn(() => {
        throw new Error('Handler error')
      })
      const workingHandler = jest.fn()

      manager.on('phase_changed', faultyHandler)
      manager.on('phase_changed', workingHandler)

      // Transition should still work despite handler error
      await expect(manager.transitionTo('fishing')).resolves.not.toThrow()
      
      expect(faultyHandler).toHaveBeenCalled()
      expect(workingHandler).toHaveBeenCalled()
      expect(consoleErrors.length).toBeGreaterThan(0)
    })

    it('should handle concurrent transition attempts', async () => {
      // Start multiple transitions simultaneously
      const transitions = [
        manager.transitionTo('fishing'),
        manager.transitionTo('debrief'),
        manager.transitionTo('fishing')
      ]

      // Some should succeed, others should be rejected
      const results = await Promise.allSettled(transitions)
      
      // At least one should succeed
      expect(results.some(r => r.status === 'fulfilled')).toBe(true)
      
      // Manager should be in a valid final state
      const finalPhase = manager.getCurrentPhase()
      expect(['preparation', 'fishing', 'debrief']).toContain(finalPhase)
    })
  })

  describe('React Component Error Boundaries', () => {
    class ErrorBoundary extends React.Component<
      { children: React.ReactNode; onError?: (error: Error) => void },
      { hasError: boolean; error?: Error }
    > {
      constructor(props: any) {
        super(props)
        this.state = { hasError: false }
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
      }

      componentDidCatch(error: Error, errorInfo: any) {
        this.props.onError?.(error)
      }

      render() {
        if (this.state.hasError) {
          return React.createElement('div', 
            { 'data-testid': 'error-fallback' }, 
            `Something went wrong: ${this.state.error?.message}`
          )
        }

        return this.props.children
      }
    }

    it('should handle ParticipantList rendering errors', () => {
      const onError = jest.fn()
      
      // Create malformed participant data that might cause errors
      const malformedParticipants = [
        null,
        undefined,
        { id: null, name: null },
        createChatParticipant('valid-user', 'Valid User', 'participant')
      ] as any

      expect(() => {
        render(
          <ErrorBoundary onError={onError}>
            <ParticipantList
              participants={malformedParticipants}
              currentUserId="valid-user"
              onAction={jest.fn()}
            />
          </ErrorBoundary>
        )
      }).not.toThrow()

      // Component should either render successfully or show error boundary
      expect(
        screen.queryByTestId('error-fallback') || screen.queryByText('Valid User')
      ).toBeInTheDocument()
    })

    it('should handle PhaseTransitionContainer errors', () => {
      const onError = jest.fn()
      
      // Create a component that will throw during phase transition
      const FaultyPhaseComponent = () => {
        throw new Error('Phase component error')
      }

      expect(() => {
        render(
          <ErrorBoundary onError={onError}>
            <PhaseTransitionContainer
              currentPhase="preparation"
              isTransitioning={false}
              onTransitionComplete={jest.fn()}
            >
              <FaultyPhaseComponent />
            </PhaseTransitionContainer>
          </ErrorBoundary>
        )
      }).not.toThrow()

      // Error boundary should catch the error
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should isolate component errors without crashing parent', () => {
      const onError = jest.fn()
      
      const FaultyComponent = () => {
        throw new Error('Component error')
      }

      render(
        <div>
          <div data-testid="before-error">Before Error</div>
          <ErrorBoundary onError={onError}>
            <FaultyComponent />
          </ErrorBoundary>
          <div data-testid="after-error">After Error</div>
        </div>
      )

      // Parent components should still render
      expect(screen.getByTestId('before-error')).toBeInTheDocument()
      expect(screen.getByTestId('after-error')).toBeInTheDocument()
      expect(screen.getByTestId('error-fallback')).toBeInTheDocument()
    })
  })

  describe('API Integration Error Handling', () => {
    it('should handle API timeouts gracefully', async () => {
      // Mock fetch with timeout
      global.fetch = jest.fn(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      )

      const service = new ParticipantStatusService({
        enableRealTimeSync: true,
        apiTimeout: 50 // Shorter than mock timeout
      })

      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      
      expect(() => {
        service.addParticipant(participant)
      }).not.toThrow()

      // Wait for potential API call
      await waitFor(() => {
        expect(consoleErrors.length).toBeGreaterThan(0)
      }, { timeout: 200 })

      // Service should remain functional
      expect(service.getParticipant('user-1')).toBeDefined()
      
      service.destroy()
    })

    it('should handle malformed API responses', async () => {
      // Mock fetch with malformed response
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve('not valid json object')
      })

      const service = new ParticipantStatusService({
        enableRealTimeSync: true
      })

      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)

      // Trigger API call
      service.updateParticipantStatus('user-1', 'away')

      await waitFor(() => {
        // Should handle malformed response gracefully
        expect(service.getParticipant('user-1')).toBeDefined()
      }, { timeout: 500 })

      service.destroy()
    })

    it('should handle API rate limiting', async () => {
      let callCount = 0
      
      global.fetch = jest.fn(() => {
        callCount++
        if (callCount <= 3) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: 'Rate limited' })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        })
      })

      const service = new ParticipantStatusService({
        enableRealTimeSync: true,
        retryAttempts: 5,
        retryDelay: 50
      })

      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(callCount).toBeGreaterThan(3)
      }, { timeout: 1000 })

      service.destroy()
    })
  })

  describe('State Recovery and Persistence', () => {
    it('should recover from corrupted localStorage data', () => {
      // Corrupt localStorage
      const corruptData = 'invalid json data'
      localStorage.setItem('participantStatus', corruptData)

      const service = new ParticipantStatusService({
        enablePersistence: true,
        storageKey: 'participantStatus'
      })

      // Should start with clean state
      expect(service.getParticipants()).toHaveLength(0)

      // Should be able to add participants normally
      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)
      
      expect(service.getParticipants()).toHaveLength(1)

      service.destroy()
    })

    it('should handle storage quota exceeded errors', () => {
      const service = new ParticipantStatusService({
        enablePersistence: true
      })

      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      
      expect(() => {
        service.addParticipant(participant)
      }).not.toThrow()

      // Service should still function in memory
      expect(service.getParticipants()).toHaveLength(1)

      // Restore localStorage
      localStorage.setItem = originalSetItem
      service.destroy()
    })

    it('should handle version migration failures', () => {
      // Set up old version data that can't be migrated
      const oldData = {
        version: '0.1.0',
        invalidStructure: 'This cannot be migrated'
      }
      localStorage.setItem('participantStatus', JSON.stringify(oldData))

      const service = new ParticipantStatusService({
        enablePersistence: true,
        storageKey: 'participantStatus'
      })

      // Should start fresh if migration fails
      expect(service.getParticipants()).toHaveLength(0)

      // Error should be logged
      expect(consoleWarnings.length).toBeGreaterThan(0)

      service.destroy()
    })
  })

  describe('WebSocket Connection Error Handling', () => {
    it('should handle WebSocket connection failures', () => {
      // Mock WebSocket that fails to connect
      class FailingWebSocket {
        constructor() {
          setTimeout(() => {
            this.onerror?.(new Error('Connection failed'))
          }, 10)
        }
        
        onerror: ((error: Error) => void) | null = null
        onopen: (() => void) | null = null
        onclose: (() => void) | null = null
        close() {}
      }

      (global as any).WebSocket = FailingWebSocket

      const service = new ParticipantStatusService({
        enableRealTimeSync: true
      })

      // Service should handle connection failure gracefully
      expect(() => {
        const participant = createChatParticipant('user-1', 'User 1', 'participant')
        service.addParticipant(participant)
      }).not.toThrow()

      service.destroy()
    })

    it('should handle WebSocket disconnections and reconnect', async () => {
      let connectionCount = 0
      
      class MockWebSocket {
        static instances: MockWebSocket[] = []
        
        constructor() {
          connectionCount++
          MockWebSocket.instances.push(this)
          
          // Simulate connection success, then disconnection
          setTimeout(() => {
            this.onopen?.()
            if (connectionCount === 1) {
              // First connection disconnects
              setTimeout(() => {
                this.onclose?.()
              }, 50)
            }
          }, 10)
        }
        
        onopen: (() => void) | null = null
        onclose: (() => void) | null = null
        onerror: ((error: Error) => void) | null = null
        close() {}
      }

      (global as any).WebSocket = MockWebSocket

      const service = new ParticipantStatusService({
        enableRealTimeSync: true,
        reconnectAttempts: 3,
        reconnectDelay: 100
      })

      // Wait for initial connection and reconnection
      await waitFor(() => {
        expect(connectionCount).toBeGreaterThan(1)
      }, { timeout: 500 })

      service.destroy()
    })
  })

  describe('Performance Under Error Conditions', () => {
    it('should maintain performance when handling many errors', async () => {
      const service = new ParticipantStatusService()
      
      // Add handler that throws errors
      service.on('participant_updated', () => {
        throw new Error('Handler error')
      })

      const startTime = performance.now()

      // Add many participants (each will trigger the faulty handler)
      for (let i = 0; i < 100; i++) {
        const participant = createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
        service.addParticipant(participant)
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time despite errors
      expect(duration).toBeLessThan(500) // 500ms threshold
      
      // All participants should be added successfully
      expect(service.getParticipants()).toHaveLength(100)
      
      // Many errors should be logged
      expect(consoleErrors.length).toBe(100)

      service.destroy()
    })

    it('should not crash under memory pressure with errors', () => {
      const service = new ParticipantStatusService()
      
      // Create memory pressure by creating many objects
      const memoryPressure = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: new Array(1000).fill(`data-${i}`)
      }))

      // Add faulty event handler
      service.on('status_updated', () => {
        throw new Error('Memory pressure error')
      })

      expect(() => {
        // Perform operations under memory pressure
        for (let i = 0; i < 50; i++) {
          const participant = createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
          service.addParticipant(participant)
          service.updateParticipantStatus(`user-${i}`, 'away')
        }
      }).not.toThrow()

      // Service should remain functional
      expect(service.getParticipants()).toHaveLength(50)

      service.destroy()
    })
  })
})
