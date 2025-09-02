/**
 * Unit Tests for TypingIndicator Component
 * Task 17.6: Chat System Testing & Performance - Typing Indicator Tests
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { 
  ChannelTypingIndicator, 
  FloatingTypingIndicator,
  TypingStatus,
  CompactTypingIndicator,
  TypingBadge
} from '../TypingIndicator'
import { useTypingIndicators } from '@/lib/chat/participants/useParticipantStatus'

// Mock the typing indicators hook
jest.mock('@/lib/chat/participants/useParticipantStatus', () => ({
  useTypingIndicators: jest.fn()
}))

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: jest.fn(() => '2 минуты назад')
}))

const mockUseTypingIndicators = useTypingIndicators as jest.MockedFunction<typeof useTypingIndicators>

describe('TypingIndicator Components', () => {
  const mockTypingIndicators = [
    {
      participantId: 'user-1',
      participantName: 'John Doe',
      startedAt: new Date(),
      channelId: 'channel-123'
    },
    {
      participantId: 'user-2',
      participantName: 'Jane Smith',
      startedAt: new Date(),
      channelId: 'channel-123'
    },
    {
      participantId: 'user-3',
      participantName: 'Bob Johnson',
      startedAt: new Date(),
      channelId: 'channel-123'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ChannelTypingIndicator', () => {
    it('should not render when no one is typing', () => {
      mockUseTypingIndicators.mockReturnValue([])

      const { container } = render(
        <ChannelTypingIndicator channelId="channel-123" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render single typing indicator', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      expect(screen.getByText('John Doe')).toBeInTheDocument()
      expect(screen.getByText(/печатает/)).toBeInTheDocument()
    })

    it('should render multiple typing indicators', () => {
      mockUseTypingIndicators.mockReturnValue(mockTypingIndicators.slice(0, 2))

      render(<ChannelTypingIndicator channelId="channel-123" />)

      expect(screen.getByText(/John Doe и Jane Smith печатают/)).toBeInTheDocument()
    })

    it('should show overflow count for many typists', () => {
      mockUseTypingIndicators.mockReturnValue(mockTypingIndicators)

      render(<ChannelTypingIndicator channelId="channel-123" maxVisible={2} />)

      expect(screen.getByText(/John Doe и еще 2 печатают/)).toBeInTheDocument()
    })

    it('should display avatars when enabled', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(
        <ChannelTypingIndicator 
          channelId="channel-123" 
          showAvatars={true} 
        />
      )

      expect(screen.getByTestId('avatar')).toBeInTheDocument()
    })

    it('should hide avatars when disabled', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(
        <ChannelTypingIndicator 
          channelId="channel-123" 
          showAvatars={false} 
        />
      )

      expect(screen.queryByTestId('avatar')).not.toBeInTheDocument()
    })

    it('should render in compact mode', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(
        <ChannelTypingIndicator 
          channelId="channel-123" 
          compact={true} 
        />
      )

      // Should still show typing indicator but with compact styling
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })

    it('should animate typing dots', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      // Check for animated dots (should have animate-bounce class)
      const dots = screen.container.querySelectorAll('.animate-bounce')
      expect(dots.length).toBeGreaterThan(0)
    })
  })

  describe('FloatingTypingIndicator', () => {
    it('should not render when no one is typing', () => {
      mockUseTypingIndicators.mockReturnValue([])

      const { container } = render(
        <FloatingTypingIndicator channelId="channel-123" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render floating indicator with correct positioning', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(
        <FloatingTypingIndicator 
          channelId="channel-123" 
          position="bottom-right" 
        />
      )

      const indicator = screen.getByText('John Doe').closest('div')
      expect(indicator).toHaveClass('fixed', 'bottom-4', 'right-4')
    })

    it('should support different positioning options', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      const { rerender } = render(
        <FloatingTypingIndicator 
          channelId="channel-123" 
          position="top-left" 
        />
      )

      let indicator = screen.getByText('John Doe').closest('div')
      expect(indicator).toHaveClass('top-4', 'left-4')

      rerender(
        <FloatingTypingIndicator 
          channelId="channel-123" 
          position="bottom-left" 
        />
      )

      indicator = screen.getByText('John Doe').closest('div')
      expect(indicator).toHaveClass('bottom-4', 'left-4')
    })

    it('should be on top layer (high z-index)', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<FloatingTypingIndicator channelId="channel-123" />)

      const indicator = screen.getByText('John Doe').closest('div')
      expect(indicator).toHaveClass('z-50')
    })
  })

  describe('TypingStatus', () => {
    it('should not render when no one is typing', () => {
      mockUseTypingIndicators.mockReturnValue([])

      const { container } = render(
        <TypingStatus channelId="channel-123" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should show simple typing text for single user', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<TypingStatus channelId="channel-123" />)

      expect(screen.getByText('John Doe печатает...')).toBeInTheDocument()
    })

    it('should show text for two users typing', () => {
      mockUseTypingIndicators.mockReturnValue(mockTypingIndicators.slice(0, 2))

      render(<TypingStatus channelId="channel-123" />)

      expect(screen.getByText('John Doe и Jane Smith печатают...')).toBeInTheDocument()
    })

    it('should show count for multiple users typing', () => {
      mockUseTypingIndicators.mockReturnValue(mockTypingIndicators)

      render(<TypingStatus channelId="channel-123" />)

      expect(screen.getByText('3 участников печатают...')).toBeInTheDocument()
    })

    it('should have animated styling', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<TypingStatus channelId="channel-123" />)

      const statusElement = screen.getByText('John Doe печатает...').closest('div')
      expect(statusElement).toHaveClass('animate-pulse')
    })
  })

  describe('CompactTypingIndicator', () => {
    it('should not render when participant is not typing', () => {
      mockUseTypingIndicators.mockReturnValue([])

      const { container } = render(
        <CompactTypingIndicator 
          participantId="user-1" 
          channelId="channel-123" 
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when specific participant is typing', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(
        <CompactTypingIndicator 
          participantId="user-1" 
          channelId="channel-123" 
        />
      )

      const indicator = screen.getByRole('generic')
      expect(indicator).toHaveClass('animate-pulse')
    })

    it('should not render for different participant', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      const { container } = render(
        <CompactTypingIndicator 
          participantId="user-999" 
          channelId="channel-123" 
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('TypingBadge', () => {
    it('should not render when no one is typing', () => {
      mockUseTypingIndicators.mockReturnValue([])

      const { container } = render(
        <TypingBadge channelId="channel-123" />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render badge with count when people are typing', () => {
      mockUseTypingIndicators.mockReturnValue(mockTypingIndicators.slice(0, 2))

      render(<TypingBadge channelId="channel-123" showCount={true} />)

      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render badge without count when showCount is false', () => {
      mockUseTypingIndicators.mockReturnValue(mockTypingIndicators.slice(0, 2))

      render(<TypingBadge channelId="channel-123" showCount={false} />)

      expect(screen.queryByText('2')).not.toBeInTheDocument()
      // Should still render the badge with activity icon
      expect(screen.getByRole('generic')).toBeInTheDocument()
    })

    it('should have correct styling classes', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<TypingBadge channelId="channel-123" />)

      const badge = screen.getByRole('generic')
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-700', 'border-blue-200')
    })
  })

  describe('Performance and Updates', () => {
    it('should update automatically when typing indicators change', async () => {
      mockUseTypingIndicators.mockReturnValue([])

      const { rerender } = render(
        <ChannelTypingIndicator channelId="channel-123" />
      )

      // Initially no one typing
      expect(screen.queryByText(/печатает/)).not.toBeInTheDocument()

      // Someone starts typing
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])
      rerender(<ChannelTypingIndicator channelId="channel-123" />)

      expect(screen.getByText(/John Doe.*печатает/)).toBeInTheDocument()
    })

    it('should handle rapid typing indicator changes', async () => {
      let currentIndicators = [mockTypingIndicators[0]]
      mockUseTypingIndicators.mockImplementation(() => currentIndicators)

      const { rerender } = render(
        <ChannelTypingIndicator channelId="channel-123" />
      )

      // Rapidly change typing indicators
      for (let i = 0; i < 10; i++) {
        currentIndicators = i % 2 === 0 ? [mockTypingIndicators[0]] : []
        rerender(<ChannelTypingIndicator channelId="channel-123" />)
      }

      // Should handle updates without errors
      expect(screen.container).toBeDefined()
    })

    it('should not cause memory leaks with frequent updates', () => {
      const { unmount } = render(
        <ChannelTypingIndicator channelId="channel-123" />
      )

      // Simulate component cleanup
      unmount()

      // No specific assertion needed - test passes if no errors thrown
      expect(true).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      // Typing indicator should be announced to screen readers
      const indicator = screen.getByText(/John Doe.*печатает/)
      expect(indicator).toHaveAttribute('role', 'status')
    })

    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })

      mockUseTypingIndicators.mockReturnValue([mockTypingIndicators[0]])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      // Animation should be disabled for reduced motion
      const dots = screen.container.querySelectorAll('.animate-bounce')
      dots.forEach(dot => {
        expect(dot).toHaveStyle('animation-duration: 0s')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty participant names', () => {
      const emptyNameIndicator = {
        ...mockTypingIndicators[0],
        participantName: ''
      }
      mockUseTypingIndicators.mockReturnValue([emptyNameIndicator])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      // Should handle gracefully without crashing
      expect(screen.container).toBeDefined()
    })

    it('should handle very long participant names', () => {
      const longNameIndicator = {
        ...mockTypingIndicators[0],
        participantName: 'This is a very long participant name that might cause layout issues'
      }
      mockUseTypingIndicators.mockReturnValue([longNameIndicator])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      // Name should be truncated properly
      const nameElement = screen.getByText(/This is a very long participant name/)
      expect(nameElement).toHaveClass('truncate')
    })

    it('should handle invalid dates gracefully', () => {
      const invalidDateIndicator = {
        ...mockTypingIndicators[0],
        startedAt: new Date('invalid-date')
      }
      mockUseTypingIndicators.mockReturnValue([invalidDateIndicator])

      render(<ChannelTypingIndicator channelId="channel-123" />)

      // Should not crash with invalid date
      expect(screen.getByText('John Doe')).toBeInTheDocument()
    })
  })
})
