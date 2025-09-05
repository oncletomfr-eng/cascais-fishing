'use client'

import { usePathname } from 'next/navigation'
import { SessionProvider } from 'next-auth/react'
import AdminProvider from '@/components/admin/AdminProvider'
import AdminSidebar from '@/components/admin/AdminSidebar'
import Toaster from '@/components/ui/toaster'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Для страницы логина не используем AdminProvider и сайдбар
  if (pathname?.includes('/login')) {
    return (
      <SessionProvider>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          {children}
          <Toaster />
        </div>
      </SessionProvider>
    )
  }

  return (
    <SessionProvider>
      <AdminProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="flex">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-6">
              {children}
            </main>
          </div>
          <Toaster />
        </div>
      </AdminProvider>
    </SessionProvider>
  )
}
