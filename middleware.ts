import { auth } from "@/auth"
import { NextResponse } from "next/server"

// RESTORED: Middleware for admin route protection
// NextAuth session should now be available in Edge Runtime
export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user
  const userRole = req.auth?.user?.role
  const isAdmin = userRole === 'ADMIN'
  const isOnAdminPage = nextUrl.pathname.startsWith('/admin')
  const isOnLoginPage = nextUrl.pathname === '/admin/login'

  console.log('🔍 Middleware Debug:', {
    path: nextUrl.pathname,
    isLoggedIn,
    user: req.auth?.user ? 'EXISTS' : 'NULL',
    userEmail: req.auth?.user?.email,
    userRole,
    isAdmin
  })

  // Skip middleware for API routes (including NextAuth API routes)
  if (nextUrl.pathname.startsWith('/api/')) {
    console.log('🚀 Skipping middleware for API route')
    return NextResponse.next()
  }

  // Allow access to login page for unauthenticated users
  if (isOnLoginPage) {
    if (isLoggedIn && isAdmin) {
      console.log('✅ Admin user on login page, redirecting to /admin')
      return NextResponse.redirect(new URL('/admin', nextUrl))
    }
    if (isLoggedIn && !isAdmin) {
      console.log('❌ Authenticated non-admin user on login page, access denied')
      return NextResponse.redirect(new URL('/', nextUrl))
    }
    console.log('🔓 Allowing unauthenticated access to login page')
    return NextResponse.next()
  }

  // ✅ ИСПРАВЛЕНИЕ: Protect all admin pages with ADMIN role check
  if (isOnAdminPage) {
    if (!isLoggedIn) {
      console.log('❌ Unauthenticated user on admin page, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', nextUrl))
    }
    if (!isAdmin) {
      console.log('❌ Authenticated non-admin user on admin page, access denied')
      return NextResponse.redirect(new URL('/', nextUrl))
    }
    console.log('✅ Admin user accessing admin page')
    return NextResponse.next()
  }

  // Allow all other pages
  return NextResponse.next()
})

export const config = {
  matcher: [
    // CAREFULLY RESTORED - Only protect admin routes
    '/admin/:path*',
  ]
}
