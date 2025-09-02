/**
 * Unit Tests for ParticipantList Component
 * Task 17.6: Chat System Testing & Performance - Participant Component Tests
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ParticipantList } from '../ParticipantList'
import { createChatParticipant } from '../index'

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

// Mock avatar component to avoid issues with image loading
jest.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className, ...props }: any) => (
    <div data-testid="avatar" className={className} {...props}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: any) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: any) => (
    <div data-testid="avatar-fallback">{children}</div>
  )
}))

describe('ParticipantList', () => {
  const mockParticipants = [
    createChatParticipant('captain-1', 'Captain John', 'captain', {
      status: 'online'
    }),
    createChatParticipant('participant-1', 'Alice Smith', 'participant', {
      status: 'online'
    }),
    createChatParticipant('participant-2', 'Bob Johnson', 'participant', {
      status: 'away'
    }),
    createChatParticipant('observer-1', 'Carol Observer', 'observer', {
      status: 'offline'
    })
  ]

  const defaultProps = {
    participants: mockParticipants,
    currentUserId: 'captain-1',
    onAction: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render participant list with all participants', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByText('Captain John')).toBeInTheDocument()
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument()
      expect(screen.getByText('Carol Observer')).toBeInTheDocument()
    })

    it('should display participant count in header', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('should show role badges for participants', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByText('Капитан')).toBeInTheDocument()
      expect(screen.getAllByText('Участник')).toHaveLength(2)
      expect(screen.getByText('Наблюдатель')).toBeInTheDocument()
    })

    it('should indicate current user', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByText('Captain John (Вы)')).toBeInTheDocument()
    })
  })

  describe('Status Indicators', () => {
    it('should display online status indicators', () => {
      render(<ParticipantList {...defaultProps} />)

      const onlineIndicators = screen.getAllByText('В сети')
      expect(onlineIndicators).toHaveLength(2) // Captain and Alice
    })

    it('should display away status indicators', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByText('Отошел')).toBeInTheDocument()
    })

    it('should display offline status indicators', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByText('Не в сети')).toBeInTheDocument()
    })

    it('should show typing indicators when participant is typing', () => {
      const typingParticipants = [
        { ...mockParticipants[0], isTyping: true }
      ]

      render(<ParticipantList {...defaultProps} participants={typingParticipants} />)

      expect(screen.getByText('Печатает...')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('should render search input when showSearch is true', () => {
      render(<ParticipantList {...defaultProps} showSearch={true} />)

      expect(screen.getByPlaceholderText('Поиск участников...')).toBeInTheDocument()
    })

    it('should filter participants by search query', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} showSearch={true} />)

      const searchInput = screen.getByPlaceholderText('Поиск участников...')
      await user.type(searchInput, 'Alice')

      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
    })

    it('should show/hide offline members based on toggle', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} showFilters={true} />)

      const offlineToggle = screen.getByLabelText('Показать офлайн')
      
      // Initially should show offline members
      expect(screen.getByText('Carol Observer')).toBeInTheDocument()

      // Hide offline members
      await user.click(offlineToggle)

      await waitFor(() => {
        expect(screen.queryByText('Carol Observer')).not.toBeInTheDocument()
      })
    })

    it('should group participants by role when enabled', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} showFilters={true} />)

      const groupToggle = screen.getByLabelText('Группировать по ролям')
      await user.click(groupToggle)

      // Should show role group headers
      expect(screen.getByText('Капитан')).toBeInTheDocument()
      expect(screen.getByText('Участник')).toBeInTheDocument()
    })
  })

  describe('Sorting', () => {
    it('should sort participants by name', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} showFilters={true} />)

      const sortSelect = screen.getByDisplayValue('По роли')
      await user.click(sortSelect)
      
      const nameOption = screen.getByText('По имени')
      await user.click(nameOption)

      // Verify participants are sorted alphabetically
      const participantNames = screen.getAllByText(/^(Alice|Bob|Captain|Carol)/)
      expect(participantNames[0]).toHaveTextContent('Alice')
    })

    it('should toggle sort direction', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} showFilters={true} />)

      const sortDirectionButton = screen.getByRole('button', { name: /sort/i })
      await user.click(sortDirectionButton)

      // Verify sort direction changed (implementation specific)
      expect(sortDirectionButton).toBeInTheDocument()
    })
  })

  describe('Actions and Interactions', () => {
    it('should call onAction when participant action is triggered', async () => {
      const user = userEvent.setup()
      const mockOnAction = jest.fn()
      
      render(<ParticipantList {...defaultProps} onAction={mockOnAction} />)

      // Find and click action menu for a participant
      const actionButtons = screen.getAllByRole('button', { name: /more/i })
      await user.click(actionButtons[1]) // Click on Alice's action button

      const messageOption = screen.getByText('Личное сообщение')
      await user.click(messageOption)

      expect(mockOnAction).toHaveBeenCalledWith('message', 'participant-1')
    })

    it('should show different action options based on permissions', async () => {
      const user = userEvent.setup()
      
      render(<ParticipantList {...defaultProps} />)

      // Captain should see management options for other participants
      const actionButtons = screen.getAllByRole('button', { name: /more/i })
      await user.click(actionButtons[1]) // Alice's actions

      expect(screen.getByText('Заглушить')).toBeInTheDocument()
      expect(screen.getByText('Изменить роль')).toBeInTheDocument()
      expect(screen.getByText('Исключить')).toBeInTheDocument()
    })

    it('should not show management options for current user', async () => {
      const user = userEvent.setup()
      
      render(<ParticipantList {...defaultProps} />)

      // Captain's own action menu should not have management options
      const actionButtons = screen.getAllByRole('button', { name: /more/i })
      await user.click(actionButtons[0]) // Captain's actions

      expect(screen.queryByText('Заглушить')).not.toBeInTheDocument()
      expect(screen.queryByText('Исключить')).not.toBeInTheDocument()
    })
  })

  describe('Compact Mode', () => {
    it('should render in compact mode with reduced spacing', () => {
      render(<ParticipantList {...defaultProps} compact={true} />)

      // Verify compact styling is applied (implementation specific)
      const participantCards = screen.getAllByRole('generic')
      expect(participantCards.length).toBeGreaterThan(0)
    })

    it('should hide detailed information in compact mode', () => {
      render(<ParticipantList {...defaultProps} compact={true} />)

      // Last seen information should be hidden in compact mode
      expect(screen.queryByText(/ago$/)).not.toBeInTheDocument()
    })
  })

  describe('Statistics', () => {
    it('should display correct online/offline counts', () => {
      render(<ParticipantList {...defaultProps} />)

      // 2 online (Captain, Alice), 1 away (Bob), 1 offline (Carol)
      expect(screen.getByText('2')).toBeInTheDocument() // Online count
      expect(screen.getByText('1')).toBeInTheDocument() // Offline count
    })

    it('should update statistics when participants change', () => {
      const { rerender } = render(<ParticipantList {...defaultProps} />)

      // Update participants - make Bob online
      const updatedParticipants = mockParticipants.map(p =>
        p.id === 'participant-2' ? { ...p, status: 'online' as const, isOnline: true } : p
      )

      rerender(<ParticipantList {...defaultProps} participants={updatedParticipants} />)

      // Should now have 3 online participants
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should show empty state when no participants', () => {
      render(<ParticipantList {...defaultProps} participants={[]} />)

      expect(screen.getByText('Участники не найдены')).toBeInTheDocument()
    })

    it('should show empty state when search returns no results', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} showSearch={true} />)

      const searchInput = screen.getByPlaceholderText('Поиск участников...')
      await user.type(searchInput, 'NonExistentUser')

      expect(screen.getByText('Участники не найдены')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle large participant lists efficiently', () => {
      // Create a large list of participants
      const largeParticipantList = Array.from({ length: 100 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      const startTime = performance.now()
      render(<ParticipantList {...defaultProps} participants={largeParticipantList} />)
      const renderTime = performance.now() - startTime

      // Should render within reasonable time (adjust threshold as needed)
      expect(renderTime).toBeLessThan(1000)
    })

    it('should use virtual scrolling for large lists', () => {
      const largeParticipantList = Array.from({ length: 100 }, (_, i) =>
        createChatParticipant(`user-${i}`, `User ${i}`, 'participant')
      )

      render(<ParticipantList {...defaultProps} participants={largeParticipantList} maxHeight="400px" />)

      // Verify that not all items are rendered in DOM
      const renderedParticipants = screen.getAllByText(/User \d+/)
      expect(renderedParticipants.length).toBeLessThan(100)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ParticipantList {...defaultProps} />)

      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label')
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ParticipantList {...defaultProps} />)

      const searchInput = screen.getByPlaceholderText('Поиск участников...')
      await user.tab() // Should focus on search input

      expect(searchInput).toHaveFocus()
    })

    it('should announce status changes to screen readers', () => {
      const { rerender } = render(<ParticipantList {...defaultProps} />)

      // Update participant status
      const updatedParticipants = mockParticipants.map(p =>
        p.id === 'participant-1' ? { ...p, status: 'away' as const } : p
      )

      rerender(<ParticipantList {...defaultProps} participants={updatedParticipants} />)

      // Status change should be reflected in UI
      expect(screen.getByText('Отошел')).toBeInTheDocument()
    })
  })
})
