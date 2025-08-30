import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { isValidAdminSession, getSessionCookieName, getSessionDuration } from './admin-auth'

const SESSION_COOKIE = getSessionCookieName()
const SESSION_DURATION = getSessionDuration()

/**
 * Получает текущую админ сессию из cookies (только для server components)
 */
export async function getAdminSession(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(SESSION_COOKIE)?.value || null
  } catch {
    return null
  }
}

/**
 * Проверяет аутентификацию админа (только для server components)
 */
export async function checkAdminAuth(): Promise<boolean> {
  const session = await getAdminSession()
  return isValidAdminSession(session)
}

/**
 * Устанавливает admin сессию (только для server actions)
 */
export async function setAdminSession(sessionToken: string) {
  console.log('Setting admin session...')
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // в секундах
    path: '/'
  })
  console.log('Admin session set successfully')
}

/**
 * Удаляет admin сессию (только для server actions)
 */
export async function clearAdminSession() {
  console.log('Clearing admin session...')
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  console.log('Admin session cleared')
}

/**
 * Middleware для защиты админ роутов (только для server components)
 */
export async function requireAdminAuth() {
  const isAuthenticated = await checkAdminAuth()
  
  if (!isAuthenticated) {
    redirect('/admin/login')
  }
}