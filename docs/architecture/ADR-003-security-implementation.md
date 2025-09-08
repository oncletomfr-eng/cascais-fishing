# ADR-003: Security Implementation Strategy

## Status
Accepted (January 2025)

## Context

The Cascais Fishing platform handles sensitive user data and requires robust security measures to protect:
- User authentication and session management
- Personal information (profiles, email addresses, preferences)
- Payment information (if applicable)
- Real-time communication data
- Trip booking and participant data
- File uploads and media content

### Security Requirements
- **Authentication**: Secure user login with OAuth providers
- **Authorization**: Role-based access control for different user types
- **Data Protection**: Encryption in transit and at rest
- **API Security**: Protection against common web vulnerabilities
- **Rate Limiting**: Prevention of abuse and DoS attacks
- **Input Validation**: Sanitization of all user inputs
- **Session Management**: Secure session handling and expiration
- **Content Security**: Protection against XSS, CSRF, and injection attacks

### Compliance Needs
- GDPR compliance for EU users
- General data protection best practices
- Industry-standard security measures
- Regular security audits and updates

### Technical Constraints
- Next.js App Router architecture
- Vercel serverless deployment model
- Multiple third-party integrations (Stream Chat, OAuth providers)
- Client-side and server-side security considerations

## Decision

We decided to implement a **comprehensive security strategy** with multiple layers of protection:

### 1. Authentication & Authorization Architecture

#### NextAuth.js Integration
```typescript
// auth.ts - Centralized authentication configuration
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  callbacks: {
    jwt: async ({ token, user, account }) => {
      // Add custom claims to JWT
      if (user) {
        token.sub = user.id;
        token.role = user.role || 'user';
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Make token info available in session
      session.user.id = token.sub!;
      session.user.role = token.role as string;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
```

#### Role-Based Access Control (RBAC)
```typescript
// lib/security/auth-middleware.ts
export enum UserRole {
  USER = 'user',
  CAPTAIN = 'captain',
  ADMIN = 'admin',
  MODERATOR = 'moderator'
}

export function withAuth(
  handler: NextApiHandler,
  options: {
    requiredRole?: UserRole;
    allowSelf?: boolean;
  } = {}
) {
  return async (req: NextRequest) => {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Role-based authorization
    if (options.requiredRole && session.user.role !== options.requiredRole) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    return handler(req);
  };
}
```

### 2. API Security Implementation

#### Request Validation with Zod
```typescript
// lib/security/validation.ts
import { z } from 'zod';

export const TripCreateSchema = z.object({
  title: z.string().min(3).max(100).trim(),
  description: z.string().min(10).max(1000).trim(),
  date: z.string().datetime(),
  maxParticipants: z.number().min(1).max(20),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest): Promise<T> => {
    const body = await req.json();
    
    try {
      return schema.parse(body);
    } catch (error) {
      throw new ValidationError('Invalid request data', error);
    }
  };
}
```

#### Rate Limiting System
```typescript
// lib/security/rate-limiting.ts
import { NextRequest } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

export class RateLimit {
  private store = new Map<string, { count: number; resetTime: number }>();
  
  constructor(private config: RateLimitConfig) {}
  
  async check(req: NextRequest): Promise<boolean> {
    const key = this.config.keyGenerator?.(req) || this.getClientIP(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    
    const record = this.store.get(key);
    
    if (!record || record.resetTime < windowStart) {
      this.store.set(key, { count: 1, resetTime: now });
      return true;
    }
    
    if (record.count >= this.config.maxRequests) {
      return false; // Rate limit exceeded
    }
    
    record.count++;
    return true;
  }
  
  private getClientIP(req: NextRequest): string {
    return req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  }
}

// Usage in API routes
const authLimiter = new RateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 requests per window
});

const apiLimiter = new RateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});
```

### 3. Security Headers & Middleware

#### Comprehensive Security Middleware
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: https: blob:;
    connect-src 'self' https://api.getstream.io wss://chat.stream-io-api.com;
    media-src 'self' blob:;
    frame-src 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // HTTPS Redirect in production
  if (process.env.NODE_ENV === 'production' && !request.url.startsWith('https://')) {
    return NextResponse.redirect(`https://${request.headers.get('host')}${request.url}`);
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 4. Input Sanitization & Validation

#### DOMPurify Integration
```typescript
// lib/security/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}
```

#### SQL Injection Prevention
```typescript
// Using Prisma ORM with parameterized queries
export async function getUserTrips(userId: string, limit: number = 10) {
  // Prisma automatically handles parameterization
  return await prisma.trip.findMany({
    where: {
      participants: {
        some: { userId: userId }
      }
    },
    take: limit,
    orderBy: { createdAt: 'desc' }
  });
}
```

### 5. File Upload Security

#### Secure File Upload System
```typescript
// lib/security/file-upload.ts
export class SecureFileUpload {
  private readonly allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf',
  ];
  
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  
  async validateFile(file: File): Promise<boolean> {
    // Type validation
    if (!this.allowedTypes.includes(file.type)) {
      throw new Error('File type not allowed');
    }
    
    // Size validation
    if (file.size > this.maxFileSize) {
      throw new Error('File too large');
    }
    
    // Magic number validation (actual file content check)
    const buffer = await file.arrayBuffer();
    const isValidImage = await this.validateImageMagicNumbers(buffer);
    
    if (!isValidImage && file.type.startsWith('image/')) {
      throw new Error('Invalid image file');
    }
    
    return true;
  }
  
  private async validateImageMagicNumbers(buffer: ArrayBuffer): Promise<boolean> {
    const bytes = new Uint8Array(buffer);
    
    // JPEG magic numbers
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return true;
    }
    
    // PNG magic numbers
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return true;
    }
    
    return false;
  }
}
```

### 6. Session Security

#### Secure Session Configuration
```typescript
// Enhanced session security
export const sessionConfig = {
  strategy: 'jwt' as const,
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60, // Update session every hour
  generateSessionToken: () => {
    // Use crypto.getRandomValues for secure random tokens
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },
};

// Session validation middleware
export async function validateSession(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return null;
  }
  
  // Check session expiration
  const now = Math.floor(Date.now() / 1000);
  if (session.expires && new Date(session.expires).getTime() / 1000 < now) {
    return null;
  }
  
  return session;
}
```

## Consequences

### Positive
- **Comprehensive Protection**: Multiple layers of security defense
- **Industry Standards**: Following established security best practices
- **OAuth Integration**: Secure authentication without password management
- **Automated Validation**: Zod schemas ensure data integrity
- **Rate Limiting**: Protection against abuse and DoS attacks
- **Content Security**: CSP headers prevent XSS and injection attacks
- **File Security**: Safe file upload with validation and sanitization
- **Session Management**: Secure JWT-based session handling

### Negative
- **Implementation Complexity**: Multiple security layers add complexity
- **Performance Impact**: Validation and sanitization add processing overhead
- **Maintenance Overhead**: Security measures require regular updates
- **User Experience**: Some security measures may impact UX (rate limiting)
- **Development Speed**: Security checks slow down development

### Neutral
- **Compliance Requirements**: Ongoing need for security audits and updates
- **Third-party Dependencies**: Reliance on OAuth providers and security libraries
- **Learning Curve**: Team needs to understand security best practices

## Security Monitoring & Alerting

### Error Tracking Integration
```typescript
// lib/security/monitoring.ts
import * as Sentry from '@sentry/nextjs';

export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const logLevel = {
    low: 'info',
    medium: 'warning', 
    high: 'error',
    critical: 'fatal'
  }[severity] as any;
  
  Sentry.addBreadcrumb({
    category: 'security',
    message: event,
    data: details,
    level: logLevel,
  });
  
  if (severity === 'high' || severity === 'critical') {
    Sentry.captureMessage(`Security Event: ${event}`, logLevel);
  }
}

// Usage examples
logSecurityEvent('Failed login attempt', { 
  ip: clientIP, 
  userAgent: req.headers.get('user-agent'),
  timestamp: new Date().toISOString()
}, 'medium');

logSecurityEvent('Rate limit exceeded', {
  ip: clientIP,
  endpoint: req.url,
  attempts: attemptCount
}, 'high');
```

### Security Metrics Dashboard
- Failed authentication attempts
- Rate limiting triggers
- Suspicious activity patterns
- File upload rejections
- CSP violations

## Regular Security Maintenance

### Weekly Tasks
- Review security logs and alerts
- Check for failed authentication patterns
- Monitor rate limiting effectiveness
- Update dependencies with security patches

### Monthly Tasks
- Security vulnerability scan
- Access control review
- Session management audit
- File upload security test

### Quarterly Tasks
- Penetration testing (internal or external)
- Security policy review and updates
- OAuth provider configuration audit
- Complete security documentation review

## Future Security Enhancements

### Planned Improvements
- **Multi-Factor Authentication**: SMS or app-based 2FA
- **Advanced Threat Detection**: ML-based anomaly detection
- **Security Headers Enhancement**: Additional CSP policies
- **API Key Management**: Rotation and monitoring system
- **Audit Logging**: Comprehensive audit trail for all actions

### Compliance Enhancements
- **GDPR Compliance**: Enhanced data protection measures
- **SOC 2 Preparation**: Controls for security and availability
- **Privacy Policy**: Comprehensive user data handling documentation

## Security Testing Strategy

### Automated Testing
```typescript
// __tests__/security/auth.test.ts
describe('Authentication Security', () => {
  test('should reject requests without valid JWT', async () => {
    const response = await request(app)
      .get('/api/protected')
      .expect(401);
      
    expect(response.body.error).toBe('Unauthorized');
  });
  
  test('should enforce rate limiting', async () => {
    // Make requests up to the limit
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/signin').expect(200);
    }
    
    // Next request should be rate limited
    await request(app)
      .post('/api/auth/signin')
      .expect(429);
  });
});
```

### Manual Testing
- OAuth flow testing with various providers
- CSRF protection validation
- XSS injection attempt testing
- File upload malicious file testing
- Session hijacking prevention testing

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NextAuth.js Security Guide](https://next-auth.js.org/security)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Web Security Guidelines](https://web.dev/secure/)
- [GDPR Compliance Guide](https://gdpr.eu/)

---

**Decision Date**: January 10, 2025
**Contributors**: Engineering Team, Security Review
**Review Date**: April 2025 (Quarterly security review)
**Next Audit**: June 2025
