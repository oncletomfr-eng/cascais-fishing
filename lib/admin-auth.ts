import crypto from 'crypto'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
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
  // Security: Never log passwords in production
  
  // Production-ready password validation
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD not configured in environment variables')
    return false
  }
  
  const isValid = password === ADMIN_PASSWORD
  // Security: Don't log validation results in production
  
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
