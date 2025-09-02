/**
 * Integration Tests for Stream Chat Service
 * Task 17.6: Chat System Testing & Performance - Stream Chat Integration Tests
 */

import { StreamChatService } from '../StreamChatService'
import { StreamChat } from 'stream-chat'

// Mock Stream Chat SDK
jest.mock('stream-chat', () => ({
  StreamChat: {
    getInstance: jest.fn().mockImplementation(() => ({
      connectUser: jest.fn(),
      disconnectUser: jest.fn(),
      user: null,
      channel: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      queryChannels: jest.fn(),
      queryUsers: jest.fn()
    }))
  }
}))

const MockedStreamChat = StreamChat as jest.Mocked<typeof StreamChat>

describe('StreamChatService Integration Tests', () => {
  let service: StreamChatService
  let mockStreamClient: any

  beforeEach(() => {
    mockStreamClient = {
      connectUser: jest.fn().mockResolvedValue({ users: {}, me: {} }),
      disconnectUser: jest.fn().mockResolvedValue(undefined),
      user: null,
      channel: jest.fn().mockReturnValue({
        watch: jest.fn().mockResolvedValue({}),
        stopWatching: jest.fn().mockResolvedValue({}),
        query: jest.fn().mockResolvedValue({}),
        sendMessage: jest.fn().mockResolvedValue({}),
        on: jest.fn(),
        off: jest.fn(),
        state: { members: {}, messages: [] }
      }),
      on: jest.fn(),
      off: jest.fn(),
      queryChannels: jest.fn().mockResolvedValue([]),
      queryUsers: jest.fn().mockResolvedValue({ users: [] })
    }

    MockedStreamChat.getInstance.mockReturnValue(mockStreamClient)
    service = new StreamChatService('test-api-key')
  })

  afterEach(() => {
    service.disconnect()
    jest.clearAllMocks()
  })

  describe('User Authentication and Connection', () => {
    it('should authenticate user successfully', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const,
        avatar: 'https://example.com/avatar.jpg'
      }

      const token = 'test-token'

      await service.authenticateUser(user, token)

      expect(mockStreamClient.connectUser).toHaveBeenCalledWith(
        expect.objectContaining({
          id: user.id,
          name: user.name,
          role: user.role,
          image: user.avatar
        }),
        token
      )
    })

    it('should handle authentication errors', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      mockStreamClient.connectUser.mockRejectedValueOnce(new Error('Auth failed'))

      await expect(service.authenticateUser(user, 'invalid-token'))
        .rejects.toThrow('Auth failed')
    })

    it('should disconnect user properly', async () => {
      await service.disconnect()

      expect(mockStreamClient.disconnectUser).toHaveBeenCalled()
    })

    it('should handle disconnect errors gracefully', async () => {
      mockStreamClient.disconnectUser.mockRejectedValueOnce(new Error('Disconnect failed'))

      // Should not throw
      await expect(service.disconnect()).resolves.toBeUndefined()
    })
  })

  describe('Channel Management', () => {
    beforeEach(async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')
    })

    it('should create phase channel successfully', async () => {
      const tripId = 'trip-123'
      const phase = 'preparation'

      const channel = await service.createPhaseChannel(tripId, phase)

      expect(mockStreamClient.channel).toHaveBeenCalledWith(
        'preparation',
        expect.stringContaining(tripId),
        expect.objectContaining({
          name: expect.stringContaining('Подготовка'),
          phase: phase,
          tripId: tripId
        })
      )

      expect(channel.watch).toHaveBeenCalled()
    })

    it('should get existing phase channel', async () => {
      const tripId = 'trip-123'
      const phase = 'live'

      const channel1 = await service.getPhaseChannel(tripId, phase)
      const channel2 = await service.getPhaseChannel(tripId, phase)

      // Should return the same channel instance
      expect(channel1).toBe(channel2)
      expect(mockStreamClient.channel).toHaveBeenCalledTimes(1)
    })

    it('should switch between phase channels', async () => {
      const tripId = 'trip-123'

      const prepChannel = await service.switchPhase(tripId, 'preparation')
      const liveChannel = await service.switchPhase(tripId, 'live')

      expect(prepChannel).not.toBe(liveChannel)
      expect(mockStreamClient.channel).toHaveBeenCalledTimes(2)
    })

    it('should configure channel permissions correctly', async () => {
      const tripId = 'trip-123'
      const phase = 'preparation'

      await service.createPhaseChannel(tripId, phase)

      const channelConfig = mockStreamClient.channel.mock.calls[0][2]
      
      expect(channelConfig).toHaveProperty('permissions')
      expect(channelConfig.permissions).toBeDefined()
    })

    it('should handle channel creation errors', async () => {
      mockStreamClient.channel.mockImplementation(() => {
        throw new Error('Channel creation failed')
      })

      await expect(service.createPhaseChannel('trip-123', 'preparation'))
        .rejects.toThrow('Channel creation failed')
    })
  })

  describe('Phase-Specific Features', () => {
    let channel: any

    beforeEach(async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')
      channel = await service.createPhaseChannel('trip-123', 'preparation')
    })

    it('should send phase-specific messages', async () => {
      const messageData = {
        text: 'Test message',
        type: 'preparation_checklist' as const,
        data: { checklistItem: 'Gear check' }
      }

      await service.sendPhaseMessage('trip-123', 'preparation', messageData)

      expect(channel.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          text: messageData.text,
          type: messageData.type,
          custom: messageData.data
        })
      )
    })

    it('should handle auto-messages for phase transitions', async () => {
      const autoMessage = service.getAutoMessage('live', 'phase_started')

      expect(autoMessage).toMatchObject({
        text: expect.stringContaining('Начался активный этап'),
        type: 'system',
        data: expect.objectContaining({
          phase: 'live',
          trigger: 'phase_started'
        })
      })
    })

    it('should add participants to phase channels', async () => {
      const participants = [
        { id: 'user-1', name: 'User 1', role: 'participant' as const },
        { id: 'user-2', name: 'User 2', role: 'observer' as const }
      ]

      await service.addParticipants('trip-123', 'preparation', participants)

      // Verify participants were added with correct roles
      expect(channel.addMembers).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        expect.objectContaining({
          'user-1': expect.objectContaining({ role: 'participant' }),
          'user-2': expect.objectContaining({ role: 'observer' })
        })
      )
    })

    it('should remove participants from phase channels', async () => {
      await service.removeParticipants('trip-123', 'preparation', ['user-1'])

      expect(channel.removeMembers).toHaveBeenCalledWith(['user-1'])
    })
  })

  describe('Real-time Events', () => {
    beforeEach(async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')
    })

    it('should set up event listeners correctly', () => {
      const eventHandler = jest.fn()
      service.on('message.new', eventHandler)

      expect(mockStreamClient.on).toHaveBeenCalledWith('message.new', eventHandler)
    })

    it('should handle typing events', async () => {
      const channel = await service.getPhaseChannel('trip-123', 'preparation')
      
      service.startTyping('trip-123', 'preparation')

      expect(channel.keystroke).toHaveBeenCalled()
    })

    it('should handle stop typing events', async () => {
      const channel = await service.getPhaseChannel('trip-123', 'preparation')
      
      service.stopTyping('trip-123', 'preparation')

      expect(channel.stopTyping).toHaveBeenCalled()
    })

    it('should track read receipts', async () => {
      const channel = await service.getPhaseChannel('trip-123', 'preparation')
      
      await service.markAsRead('trip-123', 'preparation')

      expect(channel.markRead).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle connection drops', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      // Simulate connection drop
      const connectionHandler = mockStreamClient.on.mock.calls
        .find(call => call[0] === 'connection.changed')?.[1]

      if (connectionHandler) {
        connectionHandler({ online: false })
      }

      // Should attempt reconnection
      expect(service.isConnected()).toBe(false)
    })

    it('should retry failed operations', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      // First call fails, second succeeds
      mockStreamClient.connectUser
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ users: {}, me: {} })

      await service.authenticateUser(user, 'test-token')

      expect(mockStreamClient.connectUser).toHaveBeenCalledTimes(2)
    })

    it('should handle message send failures', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')
      const channel = await service.createPhaseChannel('trip-123', 'preparation')

      channel.sendMessage.mockRejectedValueOnce(new Error('Send failed'))

      await expect(
        service.sendPhaseMessage('trip-123', 'preparation', { text: 'Test' })
      ).rejects.toThrow('Send failed')
    })

    it('should handle channel watch failures', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      const mockChannel = mockStreamClient.channel.mockReturnValue({
        watch: jest.fn().mockRejectedValueOnce(new Error('Watch failed')),
        stopWatching: jest.fn(),
        on: jest.fn(),
        off: jest.fn()
      })

      await expect(
        service.createPhaseChannel('trip-123', 'preparation')
      ).rejects.toThrow('Watch failed')
    })
  })

  describe('Performance and Resource Management', () => {
    it('should cache channel instances efficiently', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      // Request same channel multiple times
      await service.getPhaseChannel('trip-123', 'preparation')
      await service.getPhaseChannel('trip-123', 'preparation')
      await service.getPhaseChannel('trip-123', 'preparation')

      // Should only create channel once
      expect(mockStreamClient.channel).toHaveBeenCalledTimes(1)
    })

    it('should clean up resources on disconnect', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')
      await service.createPhaseChannel('trip-123', 'preparation')

      await service.disconnect()

      expect(mockStreamClient.disconnectUser).toHaveBeenCalled()
      expect(service.getChannelCount()).toBe(0)
    })

    it('should handle large numbers of channels', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      // Create many channels
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(service.createPhaseChannel(`trip-${i}`, 'preparation'))
      }

      await Promise.all(promises)

      expect(mockStreamClient.channel).toHaveBeenCalledTimes(100)
    })

    it('should limit channel cache size to prevent memory leaks', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      // Create more channels than cache limit
      for (let i = 0; i < 150; i++) {
        await service.createPhaseChannel(`trip-${i}`, 'preparation')
      }

      // Cache should be limited
      expect(service.getChannelCount()).toBeLessThanOrEqual(100)
    })
  })

  describe('Integration with Multi-Phase System', () => {
    it('should integrate with phase transition events', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      const phaseTransitionHandler = jest.fn()
      service.on('phase.transition', phaseTransitionHandler)

      await service.switchPhase('trip-123', 'live')

      expect(phaseTransitionHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          tripId: 'trip-123',
          fromPhase: 'preparation',
          toPhase: 'live'
        })
      )
    })

    it('should migrate data between phase channels', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      const migrationData = {
        participants: ['user-1', 'user-2'],
        messages: ['msg-1', 'msg-2']
      }

      await service.migratePhaseData('trip-123', 'preparation', 'live', migrationData)

      // Verify data was migrated correctly
      expect(mockStreamClient.channel).toHaveBeenCalledWith(
        'live',
        expect.any(String),
        expect.objectContaining({
          migrated_data: migrationData
        })
      )
    })

    it('should handle concurrent phase operations', async () => {
      const user = {
        id: 'test-user',
        name: 'Test User',
        role: 'captain' as const
      }

      await service.authenticateUser(user, 'test-token')

      // Start multiple phase operations simultaneously
      const operations = [
        service.switchPhase('trip-123', 'live'),
        service.sendPhaseMessage('trip-123', 'preparation', { text: 'Test 1' }),
        service.addParticipants('trip-123', 'preparation', [{ id: 'user-1', name: 'User 1', role: 'participant' }])
      ]

      await Promise.all(operations)

      // All operations should complete successfully
      expect(mockStreamClient.channel).toHaveBeenCalled()
    })
  })
})
