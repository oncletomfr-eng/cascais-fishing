# 🛡️ Production Security Guide

## Overview

This document outlines the comprehensive security measures implemented for the Cascais Fishing production environment. All security features are **production-ready** and actively protect against common web application vulnerabilities.

---

## 🔐 1. Authentication Security (NextAuth Hardening)

### JWT Secrets Security
- **Current Issue**: Development secret in use (`AUTH_SECRET`)
- **Security Score**: 35/100 ❌ 
- **Production Requirements**:
  ```bash
  # Generate secure secret (run in project directory)
  npx tsx scripts/security-audit-jwt.ts
  
  # Use generated hex secret (64 chars):
  AUTH_SECRET=71afc73116acc4d97764c3912c13593203e64f9c1c959150fb9d803f899a6e02
  ```

### Session Security Features ✅
- **Session Duration**: 30 days with 24-hour token refresh
- **Secure Cookies**: `__Secure-` prefix in production, `httpOnly`, `sameSite: lax`
- **CSRF Protection**: Built-in NextAuth CSRF tokens
- **Domain Security**: Cookies scoped to `.cascaisfishing.com`

### OAuth Provider Validation ✅
- **Google**: Email verification required
- **GitHub**: Blocks accounts < 7 days old
- **Suspicious Email Blocking**: Temp email services blocked
- **Activity Logging**: All sign-ins/sign-outs logged with metadata

---

## 🛡️ 2. Middleware Security

### Rate Limiting ✅
```typescript
// Automatic rate limiting per endpoint type:
- API endpoints: 100 req/min
- Admin endpoints: 30 req/5min  
- Auth endpoints: 10 req/min
- Email endpoints: 5 req/5min
- Health checks: 200 req/min
```

### Security Headers ✅
All responses include comprehensive security headers:
- **CSP**: Strict Content Security Policy
- **HSTS**: HTTP Strict Transport Security (production only)
- **X-Frame-Options**: DENY (clickjacking protection)
- **X-Content-Type-Options**: nosniff
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Camera/microphone/geolocation disabled

### Threat Detection ✅
- **Suspicious Activity Detection**: Rapid requests, admin flooding
- **IP Blocking**: Manual IP blocking capability
- **Activity Logging**: Security-relevant requests logged

---

## 🔒 3. CSRF Protection

### NextAuth Built-in ✅
- Automatic CSRF token generation and validation
- `sameSite: lax` cookie protection

### Enhanced API Protection ✅
```typescript
// Additional CSRF protection for custom API endpoints
- Origin header validation
- Referer header fallback
- Custom CSRF tokens for non-NextAuth endpoints
- Constant-time token comparison
```

### Protected Endpoints
- `/api/admin/*` - Admin operations
- `/api/email/*` - Email sending
- `/api/participant-approvals/*` - Approval actions

---

## 🛡️ 4. Input Validation & Sanitization

### Comprehensive Validation ✅
```typescript
// Zod schemas for all input types:
- Email: RFC 5321 compliant with security checks
- Passwords: 8+ chars, mixed case, numbers, symbols
- URLs: HTTP/HTTPS only, no localhost
- HTML: DOMPurify sanitization
- IDs: Positive integers, max 32-bit
```

### Malicious Pattern Detection ✅
Automatically detects and blocks:
- **SQL Injection**: `SELECT`, `UNION`, `OR 1=1`, etc.
- **XSS**: `<script>`, `javascript:`, event handlers
- **Command Injection**: `;rm`, `$(...)`, backticks
- **Path Traversal**: `../`, `..\`
- **LDAP Injection**: `(|(`, `)(`

### API Endpoint Validation
- **Body Validation**: POST/PUT/PATCH requests
- **Query Validation**: GET parameters
- **Threat Logging**: All malicious attempts logged

---

## 🔐 5. API Authentication & Authorization

### Role-Based Access Control ✅
```typescript
// User roles with hierarchical permissions:
- ADMIN: Full system access
- CAPTAIN: Booking management, user approvals  
- PARTICIPANT: Own bookings and profile only
```

### Endpoint Protection Rules
```typescript
// Automatic role enforcement:
/api/admin/*      → ADMIN required
/api/bookings/*   → CAPTAIN or ADMIN
/api/users/profile → Ownership required
/api/email        → ADMIN or CAPTAIN
```

### Ownership Validation ✅
- Users can only access their own resources
- Admin override available (configurable)
- Resource ownership checks in URL parameters

---

## 📊 6. Security Monitoring & Logging

### Authentication Events ✅
All auth events logged with metadata:
- Sign-in attempts (success/failure)
- Session durations and suspicious short sessions
- OAuth account validation results
- Password reset attempts

### Security Threat Logging ✅
- Rate limiting violations with IP addresses
- Malicious input attempts with full context
- CSRF validation failures
- Authorization violations

### Health Check Integration ✅
Security metrics included in `/api/admin/health`:
- Memory usage monitoring
- Database connection health
- Response time tracking

---

## 🚀 7. Production Deployment Checklist

### Environment Variables Required
```bash
# Authentication (CRITICAL - update immediately)
AUTH_SECRET=[GENERATE_SECURE_64_CHAR_HEX]
AUTH_TRUST_HOST=true

# OAuth Providers
AUTH_GOOGLE_ID=[YOUR_GOOGLE_OAUTH_CLIENT_ID]  
AUTH_GOOGLE_SECRET=[YOUR_GOOGLE_OAUTH_SECRET]
AUTH_GITHUB_ID=[YOUR_GITHUB_OAUTH_CLIENT_ID]
AUTH_GITHUB_SECRET=[YOUR_GITHUB_OAUTH_SECRET]

# Database
DATABASE_URL=[YOUR_PRODUCTION_DATABASE_URL]

# Additional Services
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET]
STREAM_CHAT_API_SECRET=[YOUR_STREAM_CHAT_SECRET]
```

### Security Headers Verification
Run in production to verify headers:
```bash
curl -I https://yourdomain.com/api/admin/health
# Should include: X-Security-Version: CascaisFishing-v2.0-Enhanced
```

### Rate Limiting Test
```bash
# Should return 429 after rate limit exceeded
for i in {1..101}; do curl https://yourdomain.com/api/admin/health; done
```

---

## 🛡️ 8. Usage Examples

### Protecting API Routes
```typescript
// /api/protected/route.ts
import { withAuth, withValidation, withCSRFProtection } from '@/lib/security';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  message: z.string().min(1).max(1000)
});

export const POST = withAuth(
  withCSRFProtection(
    withValidation(
      async (request, context) => {
        const { validatedBody, user } = context;
        // Your protected API logic here
        return Response.json({ success: true });
      },
      { bodySchema: schema }
    )
  ),
  { requireRole: ['ADMIN', 'CAPTAIN'] }
);
```

### Custom Ownership Validation
```typescript
import { withAuth, extractUserIdFromParams } from '@/lib/security';

export const GET = withAuth(
  async (request, context) => {
    // User can only access their own profile
    return Response.json({ profile: context.user });
  },
  { 
    requireAuth: true, 
    requireOwnership: true 
  },
  extractUserIdFromParams('userId')
);
```

---

## 🚨 9. Security Incident Response

### Immediate Actions
1. **Check logs** for security events in production
2. **Block malicious IPs** using rate limiter
3. **Rotate secrets** if compromise suspected
4. **Monitor** `/api/admin/health` for anomalies

### Log Locations
- **Authentication**: NextAuth events and custom auth logging
- **Security Threats**: Input validation and malicious pattern detection
- **Rate Limiting**: IP blocking and suspicious activity
- **Authorization**: Role violations and ownership breaches

### Emergency Contacts
- Review security logs daily
- Set up alerts for repeated security violations
- Monitor authentication failure rates

---

## ✅ Security Implementation Status

### Completed ✅
- **Task 7**: NextAuth Production Hardening
  - 7.1: JWT Secrets Security Audit
  - 7.2: Session Security Configuration  
  - 7.3: OAuth Provider Validation
  - 7.4: Enhanced Middleware Security
  - 7.5: CSRF Protection

- **Task 8**: API Security Hardening
  - 8.1: API Rate Limiting
  - 8.2: Security Headers
  - 8.3: Input Validation Middleware
  - 8.4: API Authentication Checks

### Production Ready 🎯
The security implementation is **production-ready** and provides enterprise-grade protection against:
- **OWASP Top 10 vulnerabilities**
- **Authentication bypass attempts**
- **Authorization escalation**
- **Input-based attacks (XSS, SQL injection, etc.)**
- **Rate limiting abuse**
- **CSRF attacks**

**Next Steps**: Deploy with updated `AUTH_SECRET` and monitor security logs.
