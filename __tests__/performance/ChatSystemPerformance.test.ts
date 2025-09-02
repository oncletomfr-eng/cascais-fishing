/**
 * Performance Tests for Chat System
 * Task 17.6: Chat System Testing & Performance - Performance and Load Testing
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParticipantList } from '@/components/chat/participants/ParticipantList'
import { ChannelTypingIndicator } from '@/components/chat/participants/TypingIndicator'
import { ParticipantStatusService } from '@/lib/chat/participants/ParticipantStatusService'
import { createChatParticipant } from '@/components/chat/participants'

// Performance testing utilities
const measurePerformance = (fn: () => void, name: string) => {
  const startTime = performance.now()
  fn()
  const endTime = performance.now()
  const duration = endTime - startTime
  
  console.log(`${name}: ${duration.toFixed(2)}ms`)
  return duration
}

const measureAsyncPerformance = async (fn: () => Promise<void>, name: string) => {
  const startTime = performance.now()
  await fn()
  const endTime = performance.now()
  const duration = endTime - startTime
  
  console.log(`${name}: ${duration.toFixed(2)}ms`)
  return duration
}

describe('Chat System Performance Tests', () => {
  beforeEach(() => {
    // Clear performance marks and measures
    if (global.testPerformance) {
      global.testPerformance.clear()
    }
  })

  describe('ParticipantList Performance', () => {
    it('should render large participant lists efficiently', () => {
      const largeParticipantList = Array.from({ length: 1000 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant', {
          status: i % 4 === 0 ? 'online' : i % 4 === 1 ? 'away' : i % 4 === 2 ? 'busy' : 'offline'
        })
      )

      const renderTime = measurePerformance(() => {
        render(
          <ParticipantList
            participants={largeParticipantList}
            currentUserId="user-0"
            onAction={jest.fn()}
          />
        )
      }, 'Large ParticipantList Render')

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(500) // 500ms threshold
      expect(screen.getByText('1000')).toBeInTheDocument() // Participant count
    })

    it('should handle search filtering efficiently', async () => {
      const user = userEvent.setup()
      const largeParticipantList = Array.from({ length: 500 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      render(
        <ParticipantList
          participants={largeParticipantList}
          currentUserId="user-0"
          showSearch={true}
          onAction={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText('Поиск участников...')

      const searchTime = await measureAsyncPerformance(async () => {
        await user.type(searchInput, 'User 123')
      }, 'Search Filtering')

      expect(searchTime).toBeLessThan(200) // 200ms threshold
      expect(screen.getByText('User 123')).toBeInTheDocument()
    })

    it('should handle rapid status updates efficiently', async () => {
      const participants = Array.from({ length: 100 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      const { rerender } = render(
        <ParticipantList
          participants={participants}
          currentUserId="user-0"
          onAction={jest.fn()}
        />
      )

      // Simulate rapid status updates
      const updateTime = measurePerformance(() => {
        for (let i = 0; i < 50; i++) {
          const updatedParticipants = participants.map((p, index) => 
            index === i ? { ...p, status: 'away' as const, isOnline: false } : p
          )
          rerender(
            <ParticipantList
              participants={updatedParticipants}
              currentUserId="user-0"
              onAction={jest.fn()}
            />
          )
        }
      }, 'Rapid Status Updates')

      expect(updateTime).toBeLessThan(1000) // 1s threshold for 50 updates
    })

    it('should maintain performance with sorting operations', async () => {
      const user = userEvent.setup()
      const largeParticipantList = Array.from({ length: 300 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${Math.random().toString(36).substring(7)}`, 'participant')
      )

      render(
        <ParticipantList
          participants={largeParticipantList}
          currentUserId="user-0"
          showFilters={true}
          onAction={jest.fn()}
        />
      )

      const sortSelect = screen.getByDisplayValue('По роли')
      
      const sortTime = await measureAsyncPerformance(async () => {
        await user.click(sortSelect)
        const nameOption = screen.getByText('По имени')
        await user.click(nameOption)
      }, 'Sorting Large List')

      expect(sortTime).toBeLessThan(300) // 300ms threshold
    })
  })

  describe('Typing Indicators Performance', () => {
    it('should handle multiple typing indicators efficiently', () => {
      const manyTypingIndicators = Array.from({ length: 50 }, (_, i) => ({
        participantId: `user-${i}`,
        participantName: `User ${i}`,
        startedAt: new Date(),
        channelId: 'channel-123'
      }))

      // Mock the hook to return many indicators
      jest.doMock('@/lib/chat/participants/useParticipantStatus', () => ({
        useTypingIndicators: () => manyTypingIndicators
      }))

      const renderTime = measurePerformance(() => {
        render(<ChannelTypingIndicator channelId="channel-123" maxVisible={10} />)
      }, 'Many Typing Indicators')

      expect(renderTime).toBeLessThan(100) // 100ms threshold
    })

    it('should handle rapid typing updates efficiently', () => {
      let currentIndicators: any[] = []
      
      jest.doMock('@/lib/chat/participants/useParticipantStatus', () => ({
        useTypingIndicators: () => currentIndicators
      }))

      const { rerender } = render(<ChannelTypingIndicator channelId="channel-123" />)

      const updateTime = measurePerformance(() => {
        // Simulate rapid typing start/stop events
        for (let i = 0; i < 100; i++) {
          currentIndicators = i % 2 === 0 ? 
            [{ participantId: 'user-1', participantName: 'User 1', startedAt: new Date(), channelId: 'channel-123' }] :
            []
          
          rerender(<ChannelTypingIndicator channelId="channel-123" />)
        }
      }, 'Rapid Typing Updates')

      expect(updateTime).toBeLessThan(500) // 500ms threshold for 100 updates
    })
  })

  describe('ParticipantStatusService Performance', () => {
    let service: ParticipantStatusService

    beforeEach(() => {
      service = new ParticipantStatusService()
    })

    afterEach(() => {
      service.destroy()
    })

    it('should handle large numbers of participants efficiently', () => {
      const manyParticipants = Array.from({ length: 1000 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      const addTime = measurePerformance(() => {
        manyParticipants.forEach(participant => {
          service.addParticipant(participant)
        })
      }, 'Adding 1000 Participants')

      expect(addTime).toBeLessThan(100) // 100ms threshold
      expect(service.getParticipants()).toHaveLength(1000)
    })

    it('should handle rapid status updates efficiently', () => {
      const participants = Array.from({ length: 100 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      participants.forEach(p => service.addParticipant(p))

      const updateTime = measurePerformance(() => {
        // Update all participants' status rapidly
        participants.forEach((p, i) => {
          const newStatus = i % 4 === 0 ? 'online' : i % 4 === 1 ? 'away' : i % 4 === 2 ? 'busy' : 'offline'
          service.updateParticipantStatus(p.id, newStatus as any)
        })
      }, 'Rapid Status Updates (100 participants)')

      expect(updateTime).toBeLessThan(50) // 50ms threshold
    })

    it('should handle many typing events efficiently', () => {
      const participants = Array.from({ length: 50 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      participants.forEach(p => service.addParticipant(p))

      const typingTime = measurePerformance(() => {
        // Simulate all participants typing
        participants.forEach(p => {
          service.updateTypingStatus(p.id, 'channel-123', true)
        })
      }, 'Many Typing Events')

      expect(typingTime).toBeLessThan(100) // 100ms threshold
    })

    it('should maintain performance with event listeners', () => {
      const participants = Array.from({ length: 100 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      participants.forEach(p => service.addParticipant(p))

      // Add many event listeners
      const handlers = Array.from({ length: 50 }, () => jest.fn())
      handlers.forEach(handler => {
        service.on('participant_updated', handler)
        service.on('status_updated', handler)
        service.on('typing_updated', handler)
      })

      const eventTime = measurePerformance(() => {
        // Trigger events that will call all handlers
        service.updateParticipantStatus('user-0', 'away')
        service.updateTypingStatus('user-1', 'channel-123', true)
      }, 'Event Handler Performance')

      expect(eventTime).toBeLessThan(50) // 50ms threshold
    })
  })

  describe('Memory Usage and Leak Prevention', () => {
    it('should not leak memory with component mount/unmount cycles', () => {
      const participants = Array.from({ length: 100 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      // Measure memory before
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Mount and unmount component many times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <ParticipantList
            participants={participants}
            currentUserId="user-0"
            onAction={jest.fn()}
          />
        )
        unmount()
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc()
      }

      // Measure memory after
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024) // 10MB threshold
    })

    it('should clean up ParticipantStatusService resources', () => {
      const service = new ParticipantStatusService()
      
      // Add many participants and listeners
      Array.from({ length: 100 }, (_, i) => {
        const participant = createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
        service.addParticipant(participant)
      })

      Array.from({ length: 20 }, () => {
        service.on('participant_updated', jest.fn())
      })

      const cleanupTime = measurePerformance(() => {
        service.destroy()
      }, 'Service Cleanup')

      expect(cleanupTime).toBeLessThan(50) // 50ms threshold
      expect(service.getParticipants()).toHaveLength(0)
    })
  })

  describe('Real-world Scenario Performance', () => {
    it('should handle typical chat room scenario efficiently', async () => {
      const user = userEvent.setup()
      
      // Simulate real chat room with 20 participants
      const participants = Array.from({ length: 20 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, i === 0 ? 'captain' : 'participant', {
          status: i < 15 ? 'online' : 'offline' // Most users online
        })
      )

      const service = new ParticipantStatusService()
      participants.forEach(p => service.addParticipant(p))

      const { rerender } = render(
        <div>
          <ParticipantList
            participants={participants}
            currentUserId="user-0"
            showSearch={true}
            showFilters={true}
            onAction={jest.fn()}
          />
          <ChannelTypingIndicator channelId="channel-123" />
        </div>
      )

      const scenarioTime = await measureAsyncPerformance(async () => {
        // Simulate real user interactions
        
        // 1. Some users start typing
        service.updateTypingStatus('user-1', 'channel-123', true)
        service.updateTypingStatus('user-2', 'channel-123', true)
        
        // 2. User searches for someone
        const searchInput = screen.getByPlaceholderText('Поиск участников...')
        await user.type(searchInput, 'User 5')
        
        // 3. Status updates occur
        service.updateParticipantStatus('user-3', 'away')
        service.updateParticipantStatus('user-4', 'busy')
        
        // 4. User clears search
        await user.clear(searchInput)
        
        // 5. Typing stops
        service.updateTypingStatus('user-1', 'channel-123', false)
        service.updateTypingStatus('user-2', 'channel-123', false)
        
        // 6. More status updates
        service.updateParticipantStatus('user-5', 'offline')
        
        // Re-render to reflect all changes
        rerender(
          <div>
            <ParticipantList
              participants={service.getParticipants()}
              currentUserId="user-0"
              showSearch={true}
              showFilters={true}
              onAction={jest.fn()}
            />
            <ChannelTypingIndicator channelId="channel-123" />
          </div>
        )
      }, 'Real-world Chat Scenario')

      expect(scenarioTime).toBeLessThan(1000) // 1s threshold for complex scenario
      
      service.destroy()
    })

    it('should maintain 60fps during animations', () => {
      // This test would ideally measure frame rate during animations
      // For now, we'll test that animation-heavy operations complete quickly
      
      const participants = Array.from({ length: 30 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant', {
          isTyping: i < 5 // 5 users typing (animations)
        })
      )

      const animationTime = measurePerformance(() => {
        render(
          <div>
            <ChannelTypingIndicator channelId="channel-123" />
            {/* Multiple animated typing indicators */}
            {Array.from({ length: 5 }, (_, i) => (
              <ChannelTypingIndicator key={i} channelId={`channel-${i}`} />
            ))}
          </div>
        )
      }, 'Animation Heavy Render')

      // Should complete initial render quickly to maintain 60fps
      expect(animationTime).toBeLessThan(16) // ~16ms for 60fps frame budget
    })
  })

  describe('Stress Testing', () => {
    it('should handle extreme participant counts', () => {
      const extremeParticipantList = Array.from({ length: 5000 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      const stressTime = measurePerformance(() => {
        render(
          <ParticipantList
            participants={extremeParticipantList}
            currentUserId="user-0"
            onAction={jest.fn()}
          />
        )
      }, 'Extreme Participant Count (5000)')

      // Should still render within reasonable time
      expect(stressTime).toBeLessThan(2000) // 2s threshold for extreme case
    })

    it('should handle concurrent operations under load', async () => {
      const service = new ParticipantStatusService()
      const participants = Array.from({ length: 200 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      participants.forEach(p => service.addParticipant(p))

      const concurrentTime = await measureAsyncPerformance(async () => {
        // Run many operations concurrently
        const operations = []
        
        for (let i = 0; i < 100; i++) {
          operations.push(
            Promise.resolve().then(() => {
              service.updateParticipantStatus(`user-${i % 200}`, 'away')
            })
          )
          
          operations.push(
            Promise.resolve().then(() => {
              service.updateTypingStatus(`user-${(i + 50) % 200}`, 'channel-123', true)
            })
          )
        }

        await Promise.all(operations)
      }, 'Concurrent Operations Under Load')

      expect(concurrentTime).toBeLessThan(500) // 500ms threshold
      
      service.destroy()
    })
  })
})
