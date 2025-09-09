import { auth } from "@/auth"
import { NextResponse } from "next/server"
import { EdgeRateLimiter, RateLimits } from "@/lib/security/rate-limiter"

// 🛡️  PRODUCTION-READY SECURITY MIDDLEWARE
// Enhanced with rate limiting, security headers, and threat detection

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user
  const userRole = req.auth?.user?.role
  const isAdmin = userRole === 'ADMIN'
  const isOnAdminPage = nextUrl.pathname.startsWith('/admin')
  const isOnLoginPage = nextUrl.pathname === '/admin/login'
  const isApiRoute = nextUrl.pathname.startsWith('/api/')
  
  // 🛡️  SECURITY: Get client IP for rate limiting and logging
  const clientIP = req.ip || 
                   req.headers.get('x-forwarded-for')?.split(',')[0] || 
                   req.headers.get('x-real-ip') || 
                   'unknown';

  // 🛡️  SECURITY: Enhanced request logging (only for sensitive endpoints)
  if (isOnAdminPage || isOnLoginPage || nextUrl.pathname.includes('/auth/')) {
    console.log('🔍 Security Middleware:', {
      path: nextUrl.pathname,
      method: req.method,
      ip: clientIP,
      userAgent: req.headers.get('user-agent')?.substring(0, 100),
      isLoggedIn,
      userEmail: req.auth?.user?.email,
      userRole,
      timestamp: new Date().toISOString()
    })
  }

  // 🛡️  SECURITY: Rate limiting
  const rateLimiter = EdgeRateLimiter.getInstance();
  let rateLimit = RateLimits.api; // Default

  // Choose appropriate rate limit based on endpoint
  if (isOnAdminPage || nextUrl.pathname.includes('/admin')) {
    rateLimit = RateLimits.admin;
  } else if (nextUrl.pathname.includes('/auth/') || nextUrl.pathname.includes('/api/auth/')) {
    rateLimit = RateLimits.auth;
  } else if (nextUrl.pathname === '/api/admin/health') {
    rateLimit = RateLimits.health;
  } else if (nextUrl.pathname.includes('/api/email')) {
    rateLimit = RateLimits.email;
  }

  const rateLimitResult = rateLimiter.isRateLimited(
    clientIP, 
    rateLimit.limit, 
    rateLimit.windowMs,
    nextUrl.pathname
  );

  // Log suspicious activity
  if (rateLimitResult.suspicious) {
    console.warn(`🚨 SUSPICIOUS ACTIVITY detected from IP: ${clientIP} on ${nextUrl.pathname}`);
  }

  // Block if rate limited
  if (rateLimitResult.limited) {
    console.warn(`🚫 RATE LIMITED: IP ${clientIP} exceeded ${rateLimit.limit} requests. Remaining: ${rateLimitResult.remaining}`);
    
    const response = NextResponse.json(
      { 
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
      },
      { status: 429 }
    );
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
    response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString());
    
    return response;
  }

  // 🛡️  SECURITY: Create response with security headers
  let response: NextResponse;

  // Handle API routes (with reduced logging)
  if (isApiRoute) {
    response = NextResponse.next();
  }
  // Handle login page logic
  else if (isOnLoginPage) {
    if (isLoggedIn && isAdmin) {
      console.log('✅ Admin user on login page, redirecting to /admin')
      response = NextResponse.redirect(new URL('/admin', nextUrl));
    } else if (isLoggedIn && !isAdmin) {
      console.log('❌ Authenticated non-admin user on login page, access denied')
      response = NextResponse.redirect(new URL('/', nextUrl));
    } else {
      console.log('🔓 Allowing unauthenticated access to login page')
      response = NextResponse.next();
    }
  }
  // Handle admin page protection
  else if (isOnAdminPage) {
    if (!isLoggedIn) {
      console.log('❌ Unauthenticated user on admin page, redirecting to login')
      response = NextResponse.redirect(new URL('/admin/login', nextUrl));
    } else if (!isAdmin) {
      console.log('❌ Authenticated non-admin user on admin page, access denied')
      response = NextResponse.redirect(new URL('/', nextUrl));
    } else {
      console.log('✅ Admin user accessing admin page')
      response = NextResponse.next();
    }
  }
  // Allow all other pages
  else {
    response = NextResponse.next();
  }

  // 🛡️  SECURITY: Add comprehensive security headers
  const securityHeaders = {
    // 🔒 Content Security Policy (with canvas-confetti blob support)
    'Content-Security-Policy': process.env.NODE_ENV === 'production' 
      ? `default-src 'self' blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self' https://*.supabase.com https://vitals.vercel-insights.com wss://*.supabase.com; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';`
      : `default-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' ws://localhost:* https://*.supabase.com wss://*.supabase.com;`,
    
    // 🔒 Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // 🔒 Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // 🔒 XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // 🔒 Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // 🔒 HTTP Strict Transport Security (HSTS) - только в production
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    
    // 🔒 Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    
    // 🔒 Remove Server header
    'X-Powered-By': '',
    
    // ⚡ Rate limiting headers (informational)
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
    'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
  };

  // Apply security headers to response
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // 🛡️  SECURITY: Add custom security identifier
  response.headers.set('X-Security-Version', 'CascaisFishing-v2.0-Enhanced');

  return response;
})

export const config = {
  matcher: [
    // 🛡️  SECURITY-ENHANCED: Protected routes with rate limiting and security headers
    '/admin/:path*', // Admin panel protection
    '/auth/:path*',  // Authentication routes protection
    '/api/admin/:path*', // Admin API protection  
    '/api/auth/:path*',  // Auth API protection
    '/api/email/:path*', // Email API protection (rate limited)
    
    // 🔍 Apply security headers to all routes (excluding static files)
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ]
}
