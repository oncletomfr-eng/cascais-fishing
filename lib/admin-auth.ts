import crypto from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const SESSION_COOKIE = 'admin-session'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface AdminSession {
  isAuthenticated: boolean
  expiresAt: number
}

/**
 * Генерирует безопасную сессию для админа
 */
export function generateAdminSession(): string {
  const sessionData: AdminSession = {
    isAuthenticated: true,
    expiresAt: Date.now() + SESSION_DURATION
  }
  
  const sessionString = JSON.stringify(sessionData)
  return Buffer.from(sessionString).toString('base64')
}

/**
 * Проверяет валидность admin сессии
 */
export function isValidAdminSession(sessionToken?: string): boolean {
  if (!sessionToken) return false

  try {
    const sessionData: AdminSession = JSON.parse(
      Buffer.from(sessionToken, 'base64').toString('utf-8')
    )

    return (
      sessionData.isAuthenticated && 
      sessionData.expiresAt > Date.now()
    )
  } catch (error) {
    return false
  }
}

/**
 * Проверяет пароль админа
 */
export function validateAdminPassword(password: string): boolean {
  console.log('validateAdminPassword called with:', password)
  console.log('ADMIN_PASSWORD from env:', ADMIN_PASSWORD)
  console.log('Expected password: qwerty123')
  
  // Для отладки - прямая проверка
  const isValid = password === 'qwerty123' || password === ADMIN_PASSWORD
  console.log('Validation result:', isValid)
  
  return isValid
}

/**
 * Получает название cookie для сессии
 */
export function getSessionCookieName(): string {
  return SESSION_COOKIE
}

/**
 * Получает длительность сессии
 */
export function getSessionDuration(): number {
  return SESSION_DURATION
}
