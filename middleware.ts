import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user
  const isOnAdminPage = nextUrl.pathname.startsWith('/admin')
  const isOnLoginPage = nextUrl.pathname === '/admin/login'

  console.log('🔍 Middleware Debug:', {
    path: nextUrl.pathname,
    isLoggedIn,
    user: req.auth?.user ? 'EXISTS' : 'NULL',
    userEmail: req.auth?.user?.email,
    userRole: req.auth?.user?.role
  })

  // Skip middleware for API routes (including NextAuth API routes)
  if (nextUrl.pathname.startsWith('/api/')) {
    console.log('🚀 Skipping middleware for API route')
    return NextResponse.next()
  }

  // Allow access to login page for unauthenticated users
  if (isOnLoginPage) {
    if (isLoggedIn) {
      console.log('✅ Authenticated user on login page, redirecting to /admin')
      return NextResponse.redirect(new URL('/admin', nextUrl))
    }
    console.log('🔓 Allowing unauthenticated access to login page')
    return NextResponse.next()
  }

  // Protect all other admin pages
  if (isOnAdminPage) {
    if (!isLoggedIn) {
      console.log('❌ Unauthenticated user on admin page, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', nextUrl))
    }
    console.log('✅ Authenticated user accessing admin page')
    return NextResponse.next()
  }

  // Allow all other pages
  return NextResponse.next()
})

export const config = {
  matcher: [
    '/admin/:path*',
    // Note: API routes are filtered out in middleware logic, not matcher
  ]
}
