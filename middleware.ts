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

  if (isOnAdminPage && !isOnLoginPage) {
    // Only check authentication for non-login admin pages
    if (!isLoggedIn) {
      console.log('❌ Unauthenticated user on admin page, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', nextUrl))
    }
    console.log('✅ Authenticated user accessing admin page')
  }

  if (isOnLoginPage && isLoggedIn) {
    console.log('✅ Authenticated user on login page, redirecting to /admin')
    return NextResponse.redirect(new URL('/admin', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ]
}
