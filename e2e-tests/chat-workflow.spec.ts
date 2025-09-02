/**
 * End-to-End Chat Workflow Tests
 * Task 17.6: Chat System Testing & Performance - End-to-End Tests
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('Multi-Phase Chat System E2E Tests', () => {
  let context: BrowserContext
  let captainPage: Page
  let participantPage: Page

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
  })

  test.beforeEach(async () => {
    captainPage = await context.newPage()
    participantPage = await context.newPage()
  })

  test.afterEach(async () => {
    await captainPage.close()
    await participantPage.close()
  })

  test.afterAll(async () => {
    await context.close()
  })

  test.describe('Basic Chat Functionality', () => {
    test('should load chat interface successfully', async () => {
      await captainPage.goto('/test-stream-chat-integration')
      
      // Wait for chat interface to load
      await expect(captainPage.locator('[data-testid="chat-container"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="participant-list"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="phase-indicator"]')).toBeVisible()
    })

    test('should display participant list correctly', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Wait for participant list to load
      await expect(captainPage.locator('[data-testid="participant-list"]')).toBeVisible()
      
      // Should show captain and participants
      await expect(captainPage.locator('[data-testid="participant-captain"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="participant-user"]')).toBeVisible()
      
      // Should show online status indicators
      await expect(captainPage.locator('[data-testid="status-online"]')).toBeVisible()
    })

    test('should handle participant interactions', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Click on search input
      const searchInput = captainPage.locator('[data-testid="participant-search"]')
      await searchInput.click()
      await searchInput.fill('User 1')
      
      // Should filter participants
      await expect(captainPage.locator('[data-testid="participant-user-1"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="participant-user-2"]')).not.toBeVisible()
      
      // Clear search
      await searchInput.clear()
      await expect(captainPage.locator('[data-testid="participant-user-2"]')).toBeVisible()
    })
  })

  test.describe('Phase Transition Workflow', () => {
    test('should transition through all chat phases', async () => {
      await captainPage.goto('/test-phase-transitions')
      
      // Initial phase should be preparation
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('preparation')
      
      // Transition to fishing phase
      await captainPage.locator('[data-testid="transition-to-fishing"]').click()
      await expect(captainPage.locator('[data-testid="transition-status"]')).toContainText('Transitioning')
      
      // Wait for transition to complete
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('fishing')
      await expect(captainPage.locator('[data-testid="transition-status"]')).toContainText('Ready')
      
      // Transition to debrief phase
      await captainPage.locator('[data-testid="transition-to-debrief"]').click()
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('debrief')
    })

    test('should validate phase transition permissions', async () => {
      await captainPage.goto('/test-phase-transitions')
      
      // Set role to participant (non-captain)
      await captainPage.locator('[data-testid="role-select"]').selectOption('participant')
      
      // Transition buttons should be disabled for participants
      await expect(captainPage.locator('[data-testid="transition-to-fishing"]')).toBeDisabled()
      await expect(captainPage.locator('[data-testid="transition-to-debrief"]')).toBeDisabled()
      
      // Switch back to captain
      await captainPage.locator('[data-testid="role-select"]').selectOption('captain')
      await expect(captainPage.locator('[data-testid="transition-to-fishing"]')).not.toBeDisabled()
    })

    test('should show phase-specific UI components', async () => {
      await captainPage.goto('/test-phase-components')
      
      // Preparation phase components
      await captainPage.locator('[data-testid="phase-selector"]').selectOption('preparation')
      await expect(captainPage.locator('[data-testid="weather-card"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="equipment-checklist"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="safety-briefing"]')).toBeVisible()
      
      // Active trip phase components
      await captainPage.locator('[data-testid="phase-selector"]').selectOption('active-trip')
      await expect(captainPage.locator('[data-testid="current-location"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="catch-logger"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="live-updates"]')).toBeVisible()
      
      // Post trip phase components
      await captainPage.locator('[data-testid="phase-selector"]').selectOption('post-trip')
      await expect(captainPage.locator('[data-testid="trip-summary"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="catch-gallery"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="rating-system"]')).toBeVisible()
    })
  })

  test.describe('Real-time Features', () => {
    test('should show typing indicators', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Simulate typing
      await captainPage.locator('[data-testid="simulate-typing"]').click()
      
      // Should show typing indicator
      await expect(captainPage.locator('[data-testid="typing-indicator"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="typing-indicator"]')).toContainText('печатает')
      
      // Stop typing
      await captainPage.locator('[data-testid="stop-typing"]').click()
      await expect(captainPage.locator('[data-testid="typing-indicator"]')).not.toBeVisible()
    })

    test('should update participant status in real-time', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Change participant status
      await captainPage.locator('[data-testid="status-selector"]').selectOption('away')
      
      // Should update status indicator
      await expect(captainPage.locator('[data-testid="status-away"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="status-online"]')).not.toBeVisible()
      
      // Change back to online
      await captainPage.locator('[data-testid="status-selector"]').selectOption('online')
      await expect(captainPage.locator('[data-testid="status-online"]')).toBeVisible()
    })

    test('should show participant join/leave notifications', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Simulate participant joining
      await captainPage.locator('[data-testid="simulate-join"]').click()
      
      // Should show join notification
      await expect(captainPage.locator('[data-testid="notification-joined"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="notification-joined"]')).toContainText('присоединился')
      
      // Simulate participant leaving
      await captainPage.locator('[data-testid="simulate-leave"]').click()
      await expect(captainPage.locator('[data-testid="notification-left"]')).toBeVisible()
    })
  })

  test.describe('Multi-User Scenarios', () => {
    test('should handle multiple users in same chat', async () => {
      // Captain page
      await captainPage.goto('/test-stream-chat-integration')
      await captainPage.locator('[data-testid="role-select"]').selectOption('captain')
      await captainPage.locator('[data-testid="user-id-input"]').fill('captain-1')
      await captainPage.locator('[data-testid="connect-chat"]').click()
      
      // Participant page
      await participantPage.goto('/test-stream-chat-integration')
      await participantPage.locator('[data-testid="role-select"]').selectOption('participant')
      await participantPage.locator('[data-testid="user-id-input"]').fill('participant-1')
      await participantPage.locator('[data-testid="connect-chat"]').click()
      
      // Both should see each other in participant list
      await expect(captainPage.locator('[data-testid="participant-captain-1"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="participant-participant-1"]')).toBeVisible()
      
      await expect(participantPage.locator('[data-testid="participant-captain-1"]')).toBeVisible()
      await expect(participantPage.locator('[data-testid="participant-participant-1"]')).toBeVisible()
    })

    test('should sync phase transitions across users', async () => {
      // Setup both users
      await captainPage.goto('/test-phase-transitions')
      await captainPage.locator('[data-testid="role-select"]').selectOption('captain')
      
      await participantPage.goto('/test-phase-transitions')
      await participantPage.locator('[data-testid="role-select"]').selectOption('participant')
      
      // Both should start in preparation phase
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('preparation')
      await expect(participantPage.locator('[data-testid="current-phase"]')).toContainText('preparation')
      
      // Captain transitions to fishing
      await captainPage.locator('[data-testid="transition-to-fishing"]').click()
      
      // Both should now be in fishing phase
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('fishing')
      await expect(participantPage.locator('[data-testid="current-phase"]')).toContainText('fishing')
    })

    test('should handle concurrent user actions', async () => {
      await captainPage.goto('/test-participant-management')
      await participantPage.goto('/test-participant-management')
      
      // Both users change status simultaneously
      await Promise.all([
        captainPage.locator('[data-testid="status-selector"]').selectOption('busy'),
        participantPage.locator('[data-testid="status-selector"]').selectOption('away')
      ])
      
      // Both status changes should be reflected
      await expect(captainPage.locator('[data-testid="status-busy"]')).toBeVisible()
      await expect(participantPage.locator('[data-testid="status-away"]')).toBeVisible()
    })
  })

  test.describe('Performance and Responsiveness', () => {
    test('should load quickly under normal conditions', async () => {
      const startTime = Date.now()
      
      await captainPage.goto('/test-stream-chat-integration')
      await expect(captainPage.locator('[data-testid="chat-container"]')).toBeVisible()
      
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // 3 second threshold
    })

    test('should handle rapid user interactions smoothly', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Rapidly change status multiple times
      for (let i = 0; i < 10; i++) {
        const status = i % 2 === 0 ? 'online' : 'away'
        await captainPage.locator('[data-testid="status-selector"]').selectOption(status)
        await captainPage.waitForTimeout(100)
      }
      
      // Should end in expected state
      await expect(captainPage.locator('[data-testid="status-online"]')).toBeVisible()
    })

    test('should maintain responsiveness with many participants', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Add many participants
      await captainPage.locator('[data-testid="add-many-participants"]').click()
      
      // Wait for participants to load
      await expect(captainPage.locator('[data-testid="participant-count"]')).toContainText('100')
      
      // Interface should still be responsive
      const searchInput = captainPage.locator('[data-testid="participant-search"]')
      await searchInput.click()
      await searchInput.fill('User 50')
      
      // Should filter quickly
      await expect(captainPage.locator('[data-testid="participant-user-50"]')).toBeVisible({ timeout: 1000 })
    })
  })

  test.describe('Error Scenarios', () => {
    test('should handle network disconnection gracefully', async () => {
      await captainPage.goto('/test-stream-chat-integration')
      await expect(captainPage.locator('[data-testid="chat-container"]')).toBeVisible()
      
      // Simulate network disconnection
      await captainPage.context().setOffline(true)
      
      // Should show offline indicator
      await expect(captainPage.locator('[data-testid="offline-indicator"]')).toBeVisible()
      
      // Reconnect
      await captainPage.context().setOffline(false)
      await expect(captainPage.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
    })

    test('should recover from page refresh during chat', async () => {
      await captainPage.goto('/test-stream-chat-integration')
      await captainPage.locator('[data-testid="role-select"]').selectOption('captain')
      
      // Transition to fishing phase
      await captainPage.locator('[data-testid="transition-to-fishing"]').click()
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('fishing')
      
      // Refresh page
      await captainPage.reload()
      
      // Should restore state
      await expect(captainPage.locator('[data-testid="chat-container"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('fishing')
    })

    test('should handle invalid phase transitions gracefully', async () => {
      await captainPage.goto('/test-phase-transitions')
      
      // Try to transition to invalid phase
      await captainPage.locator('[data-testid="force-invalid-transition"]').click()
      
      // Should show error message
      await expect(captainPage.locator('[data-testid="error-message"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="error-message"]')).toContainText('Invalid transition')
      
      // Should remain in current phase
      await expect(captainPage.locator('[data-testid="current-phase"]')).toContainText('preparation')
    })
  })

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Tab through interface
      await captainPage.keyboard.press('Tab')
      await captainPage.keyboard.press('Tab')
      
      // Should be able to interact with focused elements
      await captainPage.keyboard.press('Enter')
      
      // Focus should be visible
      await expect(captainPage.locator(':focus')).toBeVisible()
    })

    test('should have proper ARIA labels', async () => {
      await captainPage.goto('/test-stream-chat-integration')
      
      // Check for ARIA labels
      await expect(captainPage.locator('[aria-label="Participant list"]')).toBeVisible()
      await expect(captainPage.locator('[aria-label="Chat messages"]')).toBeVisible()
      await expect(captainPage.locator('[aria-label="Phase indicator"]')).toBeVisible()
    })

    test('should support screen reader navigation', async () => {
      await captainPage.goto('/test-participant-management')
      
      // Check for proper heading structure
      await expect(captainPage.locator('h1')).toBeVisible()
      await expect(captainPage.locator('h2')).toBeVisible()
      
      // Check for proper role attributes
      await expect(captainPage.locator('[role="list"]')).toBeVisible()
      await expect(captainPage.locator('[role="listitem"]')).toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async () => {
      await captainPage.setViewportSize({ width: 375, height: 667 })
      await captainPage.goto('/test-stream-chat-integration')
      
      // Should show mobile-optimized layout
      await expect(captainPage.locator('[data-testid="mobile-chat-container"]')).toBeVisible()
      await expect(captainPage.locator('[data-testid="mobile-participant-toggle"]')).toBeVisible()
    })

    test('should handle touch interactions', async () => {
      await captainPage.setViewportSize({ width: 375, height: 667 })
      await captainPage.goto('/test-participant-management')
      
      // Tap on participant
      await captainPage.locator('[data-testid="participant-user-1"]').tap()
      
      // Should show participant details
      await expect(captainPage.locator('[data-testid="participant-details"]')).toBeVisible()
    })

    test('should support swipe gestures for phase transitions', async () => {
      await captainPage.setViewportSize({ width: 375, height: 667 })
      await captainPage.goto('/test-phase-transitions')
      
      // Swipe to next phase (if supported)
      const phaseContainer = captainPage.locator('[data-testid="phase-container"]')
      await phaseContainer.hover()
      await captainPage.mouse.down()
      await captainPage.mouse.move(100, 0)
      await captainPage.mouse.up()
      
      // Should indicate swipe detection
      await expect(captainPage.locator('[data-testid="swipe-indicator"]')).toBeVisible()
    })
  })
})
