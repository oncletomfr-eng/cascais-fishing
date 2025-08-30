import { auth } from "@/auth"

/**
 * Проверка авторизации админа с использованием NextAuth.js
 */
export async function checkAdminAuth(): Promise<boolean> {
  try {
    const session = await auth()
    return !!(session?.user?.role === 'ADMIN')
  } catch (error) {
    console.error('Admin auth check failed:', error)
    return false
  }
}

/**
 * Получение текущей сессии администратора
 */
export async function getAdminSession() {
  try {
    const session = await auth()
    if (session?.user?.role === 'ADMIN') {
      return session
    }
    return null
  } catch (error) {
    console.error('Failed to get admin session:', error)
    return null
  }
}
