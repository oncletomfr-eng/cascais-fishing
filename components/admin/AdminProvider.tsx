'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'

interface AdminContextType {
  isAuthenticated: boolean
  isLoading: boolean
  logout: () => void
}

const AdminContext = createContext<AdminContextType | null>(null)

export function useAdminContext() {
  const context = useContext(AdminContext)
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider')
  }
  return context
}

interface AdminProviderProps {
  children: ReactNode
}

export function AdminProvider({ children }: AdminProviderProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated' && session?.user?.role === 'ADMIN'

  useEffect(() => {
    // Don't redirect if we're currently logging out
    if (status === 'loading' || isLoggingOut) return

    const isOnLoginPage = pathname.includes('/admin/login')
    
    if (!isAuthenticated && !isOnLoginPage) {
      console.log('Redirecting to login - not authenticated')
      router.push('/admin/login')
    }
    
    if (isAuthenticated && isOnLoginPage) {
      console.log('Redirecting to admin - already authenticated')
      router.push('/admin')
    }
  }, [isAuthenticated, pathname, router, status, isLoggingOut])

  const logout = async () => {
    console.log('🚪 Logout initiated')
    setIsLoggingOut(true)
    
    try {
      console.log('📡 Calling signOut...')
      await signOut({ 
        redirect: false,
        callbackUrl: '/admin/login'
      })
      
      console.log('✅ SignOut successful, redirecting...')
      // Force redirect to login page
      window.location.href = '/admin/login'
    } catch (error) {
      console.error('❌ Logout failed:', error)
      setIsLoggingOut(false)
      // Fallback redirect
      window.location.href = '/admin/login'
    }
  }

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // Show login page content if not authenticated and on login page
  if (!isAuthenticated && pathname.includes('/admin/login')) {
    return <>{children}</>
  }

  // Show admin panel only if authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <AdminContext.Provider value={{ isAuthenticated, isLoading, logout }}>
      {children}
    </AdminContext.Provider>
  )
}
