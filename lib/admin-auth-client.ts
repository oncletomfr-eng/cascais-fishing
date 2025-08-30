import Cookies from 'next-cookies-universal'
import { isValidAdminSession, getSessionCookieName } from './admin-auth'

const SESSION_COOKIE = getSessionCookieName()

/**
 * Получает текущую админ сессию из cookies (только для client components)
 */
export function getClientAdminSession(): string | null {
  try {
    const cookies = Cookies('client')
    return cookies.get(SESSION_COOKIE) || null
  } catch {
    return null
  }
}

/**
 * Проверяет аутентификацию админа (только для client components)
 */
export function checkClientAdminAuth(): boolean {
  const session = getClientAdminSession()
  return isValidAdminSession(session)
}

/**
 * Устанавливает admin сессию на клиенте (только для client components)
 */
export function setClientAdminSession(sessionToken: string) {
  const cookies = Cookies('client')
  cookies.set(SESSION_COOKIE, sessionToken, {
    path: '/'
  })
}

/**
 * Удаляет admin сессию на клиенте (только для client components)
 */
export function clearClientAdminSession() {
  const cookies = Cookies('client')
  cookies.remove(SESSION_COOKIE)
}