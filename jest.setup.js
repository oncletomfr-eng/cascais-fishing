/**
 * Jest Setup Configuration
 * Task 17.6: Chat System Testing & Performance
 */

import '@testing-library/jest-dom'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com'
      }
    },
    status: 'authenticated'
  })),
  SessionProvider: ({ children }) => children,
  signIn: jest.fn(),
  signOut: jest.fn()
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/test',
    query: {},
    asPath: '/test'
  })),
  usePathname: jest.fn(() => '/test'),
  useSearchParams: jest.fn(() => new URLSearchParams())
}))

// Mock Stream Chat
jest.mock('stream-chat', () => ({
  StreamChat: jest.fn().mockImplementation(() => ({
    connectUser: jest.fn(),
    disconnectUser: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    channel: jest.fn(() => ({
      watch: jest.fn(),
      stopWatching: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      sendMessage: jest.fn(),
      markRead: jest.fn(),
      query: jest.fn()
    })),
    user: {
      id: 'test-user',
      name: 'Test User'
    }
  }))
}))

// Mock Stream Chat React
jest.mock('stream-chat-react', () => ({
  Chat: ({ children }) => children,
  Channel: ({ children }) => children,
  MessageList: () => <div data-testid="message-list">Messages</div>,
  MessageInput: () => <div data-testid="message-input">Input</div>,
  ChannelHeader: () => <div data-testid="channel-header">Header</div>,
  Thread: () => <div data-testid="thread">Thread</div>,
  Window: ({ children }) => children,
  LoadingIndicator: () => <div data-testid="loading">Loading...</div>
}))

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn()
  })
}))

// Mock Canvas Confetti
jest.mock('canvas-confetti', () => jest.fn())

// Mock Web Audio API
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    createOscillator: jest.fn(() => ({
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: { value: 0 }
    })),
    createGain: jest.fn(() => ({
      connect: jest.fn(),
      gain: { value: 0 }
    })),
    destination: {}
  }))
})

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: jest.fn(),
    measure: jest.fn(),
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => [])
  }
})

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0))
global.cancelAnimationFrame = jest.fn(id => clearTimeout(id))

// Mock HTMLElement methods
Element.prototype.scrollTo = jest.fn()
Element.prototype.scrollIntoView = jest.fn()

// Silence console warnings in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
  
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('componentWillReceiveProps'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// Global test utilities
global.createMockParticipant = (overrides = {}) => ({
  id: 'test-participant-1',
  name: 'Test Participant',
  role: 'participant',
  status: 'online',
  isOnline: true,
  lastSeen: new Date(),
  isTyping: false,
  lastActivity: new Date(),
  joinedAt: new Date(),
  unreadCount: 0,
  profile: {
    displayName: 'Test Participant',
    preferredLanguage: 'en',
    timezone: 'UTC',
    allowDirectMessages: true,
    allowNotifications: true,
    allowLocationSharing: true
  },
  ...overrides
})

global.createMockChatPhase = (phase = 'preparation') => ({
  current: phase,
  previous: null,
  data: {},
  timestamp: new Date()
})

// Test performance tracking
global.testPerformance = {
  marks: new Map(),
  measures: new Map(),
  
  mark: (name) => {
    global.testPerformance.marks.set(name, performance.now())
  },
  
  measure: (name, start, end) => {
    const startTime = global.testPerformance.marks.get(start) || 0
    const endTime = global.testPerformance.marks.get(end) || performance.now()
    const duration = endTime - startTime
    global.testPerformance.measures.set(name, duration)
    return duration
  },
  
  clear: () => {
    global.testPerformance.marks.clear()
    global.testPerformance.measures.clear()
  }
}
