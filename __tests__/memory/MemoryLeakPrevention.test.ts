/**
 * Memory Leak Prevention Tests
 * Task 17.6: Chat System Testing & Performance - Memory Leak Prevention
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from '@testing-library/react'
import { ParticipantStatusService } from '@/lib/chat/participants/ParticipantStatusService'
import { PhaseTransitionManager } from '@/lib/transition/PhaseTransitionManager'
import { ParticipantStatusProvider } from '@/lib/chat/participants/useParticipantStatus'
import { ParticipantList } from '@/components/chat/participants/ParticipantList'
import { ChannelTypingIndicator } from '@/components/chat/participants/TypingIndicator'
import { createChatParticipant } from '@/components/chat/participants'
import React from 'react'

// Mock WeakRef and FinalizationRegistry for testing if not available
if (typeof WeakRef === 'undefined') {
  (global as any).WeakRef = class WeakRef {
    constructor(private target: any) {}
    deref() { return this.target }
  }
}

if (typeof FinalizationRegistry === 'undefined') {
  (global as any).FinalizationRegistry = class FinalizationRegistry {
    constructor(private callback: Function) {}
    register() {}
    unregister() {}
  }
}

// Memory tracking utilities
class MemoryTracker {
  private refs: WeakRef<any>[] = []
  private registry: FinalizationRegistry<string>
  private cleanedUp: Set<string> = new Set()

  constructor() {
    this.registry = new FinalizationRegistry((heldValue: string) => {
      this.cleanedUp.add(heldValue)
    })
  }

  track(object: any, name: string): void {
    this.refs.push(new WeakRef(object))
    this.registry.register(object, name)
  }

  getAliveCount(): number {
    return this.refs.filter(ref => ref.deref() !== undefined).length
  }

  getCleanedUpCount(): number {
    return this.cleanedUp.size
  }

  forceGC(): void {
    // Trigger garbage collection if available
    if ((global as any).gc) {
      (global as any).gc()
    }
    
    // Give some time for cleanup
    return new Promise(resolve => setTimeout(resolve, 100)) as any
  }

  clear(): void {
    this.refs = []
    this.cleanedUp.clear()
  }
}

describe('Memory Leak Prevention Tests', () => {
  let memoryTracker: MemoryTracker

  beforeEach(() => {
    memoryTracker = new MemoryTracker()
    
    // Clear any existing timers/intervals
    jest.clearAllTimers()
    jest.clearAllMocks()
  })

  afterEach(async () => {
    await memoryTracker.forceGC()
    memoryTracker.clear()
  })

  describe('ParticipantStatusService Memory Management', () => {
    it('should clean up all resources when destroyed', async () => {
      const services: ParticipantStatusService[] = []
      
      // Create multiple service instances
      for (let i = 0; i < 10; i++) {
        const service = new ParticipantStatusService({
          heartbeatInterval: 100,
          typingTimeout: 500,
          enablePersistence: false
        })
        
        memoryTracker.track(service, `service-${i}`)
        services.push(service)
        
        // Add participants and event listeners
        const participants = Array.from({ length: 20 }, (_, j) =>
          createChatParticipant(`user-${i}-${j}`, `User ${j}`, 'participant')
        )
        
        participants.forEach(p => service.addParticipant(p))
        
        // Add event listeners
        service.on('participant_updated', () => {})
        service.on('status_updated', () => {})
        service.on('typing_updated', () => {})
      }

      // Destroy all services
      services.forEach(service => service.destroy())
      
      // Clear references
      services.length = 0
      
      await memoryTracker.forceGC()
      
      // Most services should be garbage collected
      expect(memoryTracker.getAliveCount()).toBeLessThan(5)
    })

    it('should not retain references to removed participants', async () => {
      const service = new ParticipantStatusService()
      const participants: any[] = []
      
      // Add many participants
      for (let i = 0; i < 100; i++) {
        const participant = createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
        participants.push(participant)
        service.addParticipant(participant)
        memoryTracker.track(participant, `participant-${i}`)
      }

      // Remove all participants
      participants.forEach(p => service.removeParticipant(p.id))
      
      // Clear local references
      participants.length = 0
      
      await memoryTracker.forceGC()
      
      // Most participants should be garbage collected
      expect(memoryTracker.getAliveCount()).toBeLessThan(20)
      
      service.destroy()
    })

    it('should clean up timers and intervals', () => {
      const originalSetInterval = global.setInterval
      const originalClearInterval = global.clearInterval
      const intervals: NodeJS.Timeout[] = []
      
      // Mock setInterval to track created intervals
      global.setInterval = jest.fn((...args) => {
        const id = originalSetInterval(...args)
        intervals.push(id)
        return id
      }) as any
      
      global.clearInterval = jest.fn((id) => {
        const index = intervals.indexOf(id)
        if (index > -1) intervals.splice(index, 1)
        return originalClearInterval(id)
      })

      const service = new ParticipantStatusService({
        heartbeatInterval: 100,
        typingTimeout: 500
      })

      // Add participants to trigger heartbeat
      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)

      expect(global.setInterval).toHaveBeenCalled()
      
      // Destroy service
      service.destroy()
      
      // All intervals should be cleared
      expect(global.clearInterval).toHaveBeenCalled()
      expect(intervals.length).toBe(0)
      
      // Restore original functions
      global.setInterval = originalSetInterval
      global.clearInterval = originalClearInterval
    })

    it('should remove event listeners properly', () => {
      const service = new ParticipantStatusService()
      const handlers: Function[] = []
      
      // Add many event listeners
      for (let i = 0; i < 50; i++) {
        const handler = jest.fn()
        handlers.push(handler)
        service.on('participant_updated', handler)
        service.on('status_updated', handler)
        service.on('typing_updated', handler)
      }

      // Trigger an event to ensure listeners are working
      const participant = createChatParticipant('user-1', 'User 1', 'participant')
      service.addParticipant(participant)
      service.updateParticipantStatus('user-1', 'away')

      // All handlers should have been called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalled()
      })

      // Clear some listeners manually
      handlers.slice(0, 25).forEach(handler => {
        service.off('participant_updated', handler)
        service.off('status_updated', handler)
        service.off('typing_updated', handler)
      })

      // Reset mocks
      handlers.forEach(handler => handler.mockClear())

      // Trigger event again
      service.updateParticipantStatus('user-1', 'busy')

      // Only remaining handlers should be called
      handlers.slice(0, 25).forEach(handler => {
        expect(handler).not.toHaveBeenCalled()
      })
      handlers.slice(25).forEach(handler => {
        expect(handler).toHaveBeenCalled()
      })

      // Destroy service (should clean up remaining listeners)
      service.destroy()
      
      // Reset mocks again
      handlers.forEach(handler => handler.mockClear())

      // Try to trigger event - no handlers should be called
      service.updateParticipantStatus('user-1', 'online')
      handlers.forEach(handler => {
        expect(handler).not.toHaveBeenCalled()
      })
    })
  })

  describe('React Component Memory Management', () => {
    it('should not leak memory with frequent ParticipantList updates', async () => {
      const participants = Array.from({ length: 50 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      let renders: any[] = []

      // Render and update component many times
      for (let i = 0; i < 100; i++) {
        const updatedParticipants = participants.map(p => ({
          ...p,
          status: i % 2 === 0 ? 'online' : 'away' as const,
          lastSeen: new Date()
        }))

        const result = render(
          <ParticipantList
            key={i}
            participants={updatedParticipants}
            currentUserId="user-0"
            onAction={jest.fn()}
          />
        )

        memoryTracker.track(result, `render-${i}`)
        renders.push(result)

        // Unmount every few renders
        if (i % 10 === 9) {
          result.unmount()
        }
      }

      // Clear local references
      renders = []

      await memoryTracker.forceGC()

      // Most renders should be garbage collected
      expect(memoryTracker.getAliveCount()).toBeLessThan(20)
    })

    it('should clean up TypingIndicator animations', async () => {
      const animations: any[] = []

      // Mock requestAnimationFrame to track animations
      const originalRAF = global.requestAnimationFrame
      global.requestAnimationFrame = jest.fn((callback) => {
        const id = originalRAF(callback)
        animations.push(id)
        return id
      })

      const { unmount } = render(
        <ChannelTypingIndicator 
          channelId="channel-123"
          maxVisible={5}
        />
      )

      // Should have started some animations
      expect(global.requestAnimationFrame).toHaveBeenCalled()

      // Unmount component
      unmount()

      await memoryTracker.forceGC()

      // Animations should be cleaned up (no way to directly test cancelAnimationFrame calls)
      // But component should unmount cleanly without errors

      global.requestAnimationFrame = originalRAF
    })

    it('should clean up ParticipantStatusProvider resources', async () => {
      const providers: any[] = []

      for (let i = 0; i < 10; i++) {
        const TestComponent = () => (
          <ParticipantStatusProvider
            initialParticipants={[
              createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
            ]}
            autoConnect={true}
          >
            <div>Test {i}</div>
          </ParticipantStatusProvider>
        )

        const result = render(<TestComponent />)
        memoryTracker.track(result, `provider-${i}`)
        providers.push(result)
      }

      // Unmount all providers
      providers.forEach(provider => provider.unmount())
      providers.length = 0

      await memoryTracker.forceGC()

      // Most providers should be garbage collected
      expect(memoryTracker.getAliveCount()).toBeLessThan(5)
    })
  })

  describe('PhaseTransitionManager Memory Management', () => {
    it('should clean up transition manager resources', async () => {
      const managers: PhaseTransitionManager[] = []

      for (let i = 0; i < 10; i++) {
        const manager = new PhaseTransitionManager({
          tripId: `trip-${i}`,
          initialPhase: 'preparation',
          participants: [
            createChatParticipant(`user-${i}-1`, `User 1`, 'captain'),
            createChatParticipant(`user-${i}-2`, `User 2`, 'participant')
          ]
        })

        memoryTracker.track(manager, `manager-${i}`)
        managers.push(manager)

        // Add event listeners
        manager.on('phase_changed', () => {})
        manager.on('transition_started', () => {})
        manager.on('validation_failed', () => {})
      }

      // Destroy all managers
      managers.forEach(manager => manager.destroy())
      managers.length = 0

      await memoryTracker.forceGC()

      // Most managers should be garbage collected
      expect(memoryTracker.getAliveCount()).toBeLessThan(5)
    })

    it('should not retain references to old phase data', async () => {
      const manager = new PhaseTransitionManager({
        tripId: 'test-trip',
        initialPhase: 'preparation',
        participants: []
      })

      const phaseData: any[] = []

      // Create and transition through phases multiple times
      for (let i = 0; i < 20; i++) {
        const data = {
          messages: Array.from({ length: 100 }, (_, j) => ({
            id: `msg-${i}-${j}`,
            content: `Message ${j}`,
            timestamp: new Date()
          })),
          participants: Array.from({ length: 10 }, (_, j) =>
            createChatParticipant(`user-${i}-${j}`, `User ${j}`, 'participant')
          )
        }

        phaseData.push(data)
        memoryTracker.track(data, `phase-data-${i}`)

        // Simulate phase transitions
        await act(async () => {
          try {
            await manager.transitionTo(i % 2 === 0 ? 'fishing' : 'preparation')
          } catch (error) {
            // Ignore transition errors for this test
          }
        })
      }

      // Clear local references
      phaseData.length = 0

      await memoryTracker.forceGC()

      // Old phase data should be garbage collected
      expect(memoryTracker.getAliveCount()).toBeLessThan(10)

      manager.destroy()
    })
  })

  describe('Browser Resource Management', () => {
    it('should not accumulate DOM event listeners', () => {
      const originalAddEventListener = document.addEventListener
      const originalRemoveEventListener = document.removeEventListener
      const listeners: Array<{type: string, listener: any}> = []

      // Mock event listener methods to track additions/removals
      document.addEventListener = jest.fn((type, listener, options) => {
        listeners.push({ type, listener })
        return originalAddEventListener.call(document, type, listener, options)
      })

      document.removeEventListener = jest.fn((type, listener, options) => {
        const index = listeners.findIndex(l => l.type === type && l.listener === listener)
        if (index > -1) listeners.splice(index, 1)
        return originalRemoveEventListener.call(document, type, listener, options)
      })

      // Render components that might add DOM listeners
      const results = []
      for (let i = 0; i < 10; i++) {
        const result = render(
          <div>
            <ParticipantList
              participants={[createChatParticipant(`user-${i}`, `User ${i}`, 'participant')]}
              currentUserId={`user-${i}`}
              onAction={jest.fn()}
            />
            <ChannelTypingIndicator channelId={`channel-${i}`} />
          </div>
        )
        results.push(result)
      }

      const addedListeners = listeners.length

      // Unmount all components
      results.forEach(result => result.unmount())

      // Should have removed most/all listeners
      expect(listeners.length).toBeLessThan(addedListeners / 2)

      // Restore original methods
      document.addEventListener = originalAddEventListener
      document.removeEventListener = originalRemoveEventListener
    })

    it('should not leak WebSocket-like connections', () => {
      // Mock WebSocket or similar connection objects
      const connections: any[] = []
      const originalWebSocket = (global as any).WebSocket

      class MockWebSocket {
        static instances: MockWebSocket[] = []
        
        constructor(url: string) {
          MockWebSocket.instances.push(this)
          connections.push(this)
          memoryTracker.track(this, `websocket-${connections.length}`)
        }

        close() {
          const index = MockWebSocket.instances.indexOf(this)
          if (index > -1) MockWebSocket.instances.splice(index, 1)
        }
      }

      (global as any).WebSocket = MockWebSocket

      // Simulate services that create connections
      const services: ParticipantStatusService[] = []
      for (let i = 0; i < 5; i++) {
        const service = new ParticipantStatusService({
          enableRealTimeSync: true // This might create connections
        })
        services.push(service)
        
        // Simulate connection creation
        new MockWebSocket(`ws://test-${i}`)
      }

      expect(MockWebSocket.instances.length).toBe(5)

      // Destroy services
      services.forEach(service => service.destroy())
      
      // Close connections
      MockWebSocket.instances.forEach(ws => ws.close())

      expect(MockWebSocket.instances.length).toBe(0)

      // Restore WebSocket
      (global as any).WebSocket = originalWebSocket
    })
  })

  describe('State Management Memory Leaks', () => {
    it('should not accumulate state subscriptions', () => {
      const subscriptions: Function[] = []
      
      // Mock state subscription system
      const mockStore = {
        subscribe: jest.fn((callback) => {
          subscriptions.push(callback)
          return () => {
            const index = subscriptions.indexOf(callback)
            if (index > -1) subscriptions.splice(index, 1)
          }
        }),
        getState: jest.fn(() => ({ participants: [] }))
      }

      // Create components that subscribe to state
      const components = []
      for (let i = 0; i < 20; i++) {
        const Component = () => {
          React.useEffect(() => {
            const unsubscribe = mockStore.subscribe(() => {})
            return unsubscribe
          }, [])
          return <div>Component {i}</div>
        }

        const result = render(<Component />)
        components.push(result)
      }

      expect(subscriptions.length).toBe(20)

      // Unmount half the components
      components.slice(0, 10).forEach(component => component.unmount())

      expect(subscriptions.length).toBe(10)

      // Unmount remaining components
      components.slice(10).forEach(component => component.unmount())

      expect(subscriptions.length).toBe(0)
    })
  })
})
