'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAdminContext } from './AdminProvider'
import { 
  LayoutDashboard, 
  Calendar, 
  LogOut, 
  Fish,
  Settings,
  Users 
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    exact: true
  },
  {
    name: 'Bookings',
    href: '/admin/bookings',
    icon: Calendar,
    exact: false
  },
  {
    name: 'Group Trips',
    href: '/admin/trips',
    icon: Users,
    exact: false
  }
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAdminContext()

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center h-16 px-6 border-b">
          <Fish className="h-8 w-8 text-primary" />
          <div className="ml-3">
            <h1 className="text-lg font-semibold text-gray-900">
              Admin Panel
            </h1>
            <p className="text-xs text-gray-500">Cascais Fishing</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href
              : pathname.startsWith(item.href)

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive ? "text-primary-foreground" : "text-gray-400"
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              alert('LOGOUT BUTTON WORKS!')
              console.log('🔴 LOGOUT BUTTON CLICKED!')
              logout()
            }}
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}

export default AdminSidebar
