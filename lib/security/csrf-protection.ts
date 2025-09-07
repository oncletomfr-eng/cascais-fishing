/**
 * Enhanced CSRF Protection for API Endpoints
 * Additional protection beyond NextAuth built-in CSRF
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

interface CSRFValidationResult {
  valid: boolean;
  reason?: string;
  shouldRegenerate?: boolean;
}

class CSRFProtection {
  private static readonly CSRF_TOKEN_LENGTH = 32;
  private static readonly CSRF_HEADER_NAME = 'X-CSRF-Token';
  private static readonly CSRF_COOKIE_NAME = '__Host-csrf-token';

  /**
   * Generate a cryptographically secure CSRF token
   */
  static generateToken(): string {
    return crypto.randomBytes(this.CSRF_TOKEN_LENGTH).toString('hex');
  }

  /**
   * Validate CSRF token from request
   */
  static validateToken(request: NextRequest): CSRFValidationResult {
    const method = request.method.toUpperCase();
    
    // Only validate CSRF for state-changing operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return { valid: true };
    }

    // Get token from header
    const headerToken = request.headers.get(this.CSRF_HEADER_NAME);
    
    // Get token from cookie
    const cookieToken = request.cookies.get(this.CSRF_COOKIE_NAME)?.value;

    if (!headerToken) {
      return {
        valid: false,
        reason: 'Missing CSRF token in headers'
      };
    }

    if (!cookieToken) {
      return {
        valid: false,
        reason: 'Missing CSRF token in cookies',
        shouldRegenerate: true
      };
    }

    // Compare tokens (constant-time comparison)
    const isValid = this.safeCompare(headerToken, cookieToken);

    if (!isValid) {
      return {
        valid: false,
        reason: 'CSRF token mismatch',
        shouldRegenerate: true
      };
    }

    return { valid: true };
  }

  /**
   * Validate Origin header for additional CSRF protection
   */
  static validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    const referer = request.headers.get('referer');

    // For development, be more lenient
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Check Origin header
    if (origin) {
      const originHost = new URL(origin).host;
      if (host && originHost !== host) {
        console.warn(`🚨 Origin mismatch: ${originHost} !== ${host}`);
        return false;
      }
    }

    // Fallback to Referer header check
    if (!origin && referer) {
      const refererHost = new URL(referer).host;
      if (host && refererHost !== host) {
        console.warn(`🚨 Referer mismatch: ${refererHost} !== ${host}`);
        return false;
      }
    }

    // If neither Origin nor Referer is present for state-changing operations
    if (!origin && !referer && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      console.warn(`🚨 Missing Origin and Referer headers for ${request.method} request`);
      return false;
    }

    return true;
  }

  /**
   * Enhanced CSRF validation combining token and origin checks
   */
  static validateRequest(request: NextRequest): CSRFValidationResult {
    // First check origin
    if (!this.validateOrigin(request)) {
      return {
        valid: false,
        reason: 'Origin validation failed'
      };
    }

    // Then check CSRF token
    return this.validateToken(request);
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Check if endpoint requires CSRF protection
   */
  static requiresProtection(pathname: string): boolean {
    const protectedEndpoints = [
      '/api/admin/', // Admin API endpoints
      '/api/email/', // Email sending
      '/api/auth/verify-credentials', // Custom auth endpoint
      '/api/participant-approvals/', // Approval actions
      // Add more protected endpoints as needed
    ];

    return protectedEndpoints.some(endpoint => pathname.startsWith(endpoint));
  }

  /**
   * Generate CSRF protection headers for response
   */
  static generateHeaders(token?: string): Record<string, string> {
    const csrfToken = token || this.generateToken();
    
    return {
      'X-CSRF-Token': csrfToken,
      'Set-Cookie': `${this.CSRF_COOKIE_NAME}=${csrfToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`
    };
  }
}

/**
 * Middleware helper for CSRF protection
 */
export function withCSRFProtection(handler: Function) {
  return async (request: NextRequest, context: any) => {
    // Skip CSRF for NextAuth routes (they have their own protection)
    if (request.nextUrl.pathname.startsWith('/api/auth/')) {
      return handler(request, context);
    }

    // Check if this endpoint requires CSRF protection
    if (!CSRFProtection.requiresProtection(request.nextUrl.pathname)) {
      return handler(request, context);
    }

    // Validate CSRF
    const validation = CSRFProtection.validateRequest(request);
    
    if (!validation.valid) {
      console.warn(`🚨 CSRF validation failed: ${validation.reason} for ${request.nextUrl.pathname}`);
      
      return new Response(
        JSON.stringify({
          error: 'CSRF Validation Failed',
          message: 'Request blocked for security reasons',
          code: 'CSRF_INVALID'
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            ...(validation.shouldRegenerate && CSRFProtection.generateHeaders())
          }
        }
      );
    }

    // Continue to actual handler
    return handler(request, context);
  };
}

export { CSRFProtection };
