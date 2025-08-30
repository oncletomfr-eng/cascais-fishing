import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user
  const isOnAdminPage = nextUrl.pathname.startsWith('/admin')
  const isOnLoginPage = nextUrl.pathname === '/admin/login'

  console.log('Middleware - path:', nextUrl.pathname, 'isLoggedIn:', isLoggedIn)

  if (isOnAdminPage) {
    if (isOnLoginPage) {
      // Redirect authenticated users away from login page
      if (isLoggedIn) {
        console.log('Authenticated user on login page, redirecting to /admin')
        return NextResponse.redirect(new URL('/admin', nextUrl))
      }
      // Allow unauthenticated users to access login page
      return NextResponse.next()
    }
    
    // Require authentication for other admin pages
    if (!isLoggedIn) {
      console.log('Unauthenticated user on admin page, redirecting to login')
      return NextResponse.redirect(new URL('/admin/login', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/admin/:path*',
    // Optionally protect API routes
    '/api/admin/:path*'
  ]
}
