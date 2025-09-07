/**
 * API Authentication & Authorization Middleware
 * Production-ready protection for API endpoints
 */

import { auth } from '@/auth';
import { NextRequest } from 'next/server';
import { Session, User } from 'next-auth';

export type UserRole = 'ADMIN' | 'CAPTAIN' | 'PARTICIPANT';

interface AuthContext {
  user: User;
  session: Session;
  isAuthenticated: true;
}

interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
  code?: string;
}

interface AuthOptions {
  requireAuth?: boolean;
  requireRole?: UserRole | UserRole[];
  requireOwnership?: boolean; // User can only access their own resources
  allowAnonymous?: boolean;
}

class APIAuthenticator {
  /**
   * Authenticate API request using NextAuth session
   */
  static async authenticateRequest(request: NextRequest): Promise<AuthResult> {
    try {
      // Get session from NextAuth
      const session = await auth();

      if (!session?.user) {
        return {
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED'
        };
      }

      // Validate session integrity
      if (!session.user.email || !session.user.id) {
        console.error('🚨 Invalid session data:', session.user);
        return {
          success: false,
          error: 'Invalid session',
          code: 'INVALID_SESSION'
        };
      }

      // Check session expiry
      if (session.expires && new Date() > new Date(session.expires)) {
        console.warn('🚨 Expired session attempted:', session.user.email);
        return {
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        };
      }

      return {
        success: true,
        context: {
          user: session.user,
          session,
          isAuthenticated: true
        }
      };

    } catch (error) {
      console.error('🚨 Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  /**
   * Check if user has required role
   */
  static hasRequiredRole(user: User, requiredRole: UserRole | UserRole[]): boolean {
    const userRole = user.role as UserRole;

    if (!userRole) {
      return false;
    }

    // Admin has access to everything
    if (userRole === 'ADMIN') {
      return true;
    }

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }

    return userRole === requiredRole;
  }

  /**
   * Check resource ownership (user can only access their own resources)
   */
  static checkOwnership(
    user: User, 
    resourceUserId: string | undefined,
    allowAdminOverride: boolean = true
  ): boolean {
    // Admin can access any resource (unless explicitly disabled)
    if (allowAdminOverride && user.role === 'ADMIN') {
      return true;
    }

    // User can access their own resources
    return user.id === resourceUserId;
  }

  /**
   * Comprehensive authorization check
   */
  static async authorizeRequest(
    request: NextRequest,
    options: AuthOptions,
    resourceUserId?: string
  ): Promise<AuthResult> {
    // Allow anonymous access if explicitly configured
    if (options.allowAnonymous && !options.requireAuth && !options.requireRole) {
      return { success: true };
    }

    // Authenticate user
    const authResult = await this.authenticateRequest(request);

    if (!authResult.success) {
      // If authentication is not required, allow through
      if (!options.requireAuth && !options.requireRole) {
        return { success: true };
      }
      return authResult;
    }

    const { user } = authResult.context!;

    // Check role requirements
    if (options.requireRole) {
      if (!this.hasRequiredRole(user, options.requireRole)) {
        console.warn(`🚨 Insufficient role: ${user.email} (${user.role}) attempted to access endpoint requiring ${options.requireRole}`);
        return {
          success: false,
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_ROLE'
        };
      }
    }

    // Check ownership requirements
    if (options.requireOwnership && resourceUserId) {
      if (!this.checkOwnership(user, resourceUserId)) {
        console.warn(`🚨 Ownership violation: ${user.email} attempted to access resource owned by ${resourceUserId}`);
        return {
          success: false,
          error: 'Access denied',
          code: 'OWNERSHIP_VIOLATION'
        };
      }
    }

    return authResult;
  }

  /**
   * Get endpoint-specific auth requirements
   */
  static getEndpointAuthOptions(pathname: string): AuthOptions {
    // Define authentication requirements for different API endpoints
    const endpointRules: Record<string, AuthOptions> = {
      // Public endpoints (no auth required)
      '/api/health': { allowAnonymous: true },
      '/api/admin/health': { allowAnonymous: true },

      // Authentication endpoints
      '/api/auth/verify-credentials': { allowAnonymous: true },

      // Admin endpoints (admin role required)
      '/api/admin/': { requireAuth: true, requireRole: 'ADMIN' },
      '/api/admin/users': { requireAuth: true, requireRole: 'ADMIN' },

      // Captain endpoints (captain or admin role)
      '/api/bookings/create': { requireAuth: true, requireRole: ['CAPTAIN', 'ADMIN'] },
      '/api/bookings/manage': { requireAuth: true, requireRole: ['CAPTAIN', 'ADMIN'] },

      // User-specific endpoints (ownership required)
      '/api/users/profile': { requireAuth: true, requireOwnership: true },
      '/api/users/bookings': { requireAuth: true, requireOwnership: true },

      // Email endpoints (admin or system)
      '/api/email': { requireAuth: true, requireRole: ['ADMIN', 'CAPTAIN'] },

      // Protected endpoints (authenticated users)
      '/api/participant-approvals': { requireAuth: true },
      '/api/dashboard': { requireAuth: true },
    };

    // Find matching rule (longest path match first)
    const matchingPaths = Object.keys(endpointRules)
      .filter(path => pathname.startsWith(path))
      .sort((a, b) => b.length - a.length);

    if (matchingPaths.length > 0) {
      return endpointRules[matchingPaths[0]];
    }

    // Default: require authentication for all API endpoints except public ones
    if (pathname.startsWith('/api/')) {
      return { requireAuth: true };
    }

    // Non-API endpoints don't require auth by default
    return { allowAnonymous: true };
  }

  /**
   * Log authentication events for security monitoring
   */
  static logAuthEvent(
    request: NextRequest,
    result: AuthResult,
    options: AuthOptions
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      path: request.nextUrl.pathname,
      method: request.method,
      ip: request.ip || request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
      success: result.success,
      user: result.context?.user?.email,
      role: result.context?.user?.role,
      error: result.error,
      code: result.code,
      authOptions: options,
    };

    if (result.success) {
      // Only log successful auth for sensitive endpoints
      if (options.requireRole === 'ADMIN' || options.requireOwnership) {
        console.log('🔐 API Authentication successful:', {
          user: logData.user,
          path: logData.path,
          role: logData.role
        });
      }
    } else {
      // Always log authentication failures
      console.warn('🚨 API Authentication failed:', logData);
    }
  }
}

/**
 * Higher-order function to add authentication to API handlers
 */
export function withAuth(
  handler: Function,
  options: AuthOptions = {},
  getResourceUserId?: (request: NextRequest, context: any) => string | undefined
) {
  return async (request: NextRequest, context: any) => {
    // Determine resource user ID if ownership check is required
    const resourceUserId = options.requireOwnership && getResourceUserId
      ? getResourceUserId(request, context)
      : undefined;

    // Get auth requirements for this endpoint
    const endpointOptions = APIAuthenticator.getEndpointAuthOptions(request.nextUrl.pathname);
    const finalOptions = { ...endpointOptions, ...options };

    // Perform authorization
    const authResult = await APIAuthenticator.authorizeRequest(
      request,
      finalOptions,
      resourceUserId
    );

    // Log authentication event
    APIAuthenticator.logAuthEvent(request, authResult, finalOptions);

    if (!authResult.success) {
      const statusCode = authResult.code === 'AUTH_REQUIRED' || authResult.code === 'SESSION_EXPIRED' ? 401 : 403;
      
      return new Response(
        JSON.stringify({
          error: 'Authentication Failed',
          message: authResult.error,
          code: authResult.code,
          requiresLogin: authResult.code === 'AUTH_REQUIRED'
        }),
        {
          status: statusCode,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Add authentication context to request
    const enhancedContext = {
      ...context,
      auth: authResult.context,
      user: authResult.context?.user,
      isAuthenticated: !!authResult.context,
    };

    // Continue to actual handler
    return handler(request, enhancedContext);
  };
}

/**
 * Helper to extract user ID from route parameters
 */
export function extractUserIdFromParams(paramName: string = 'userId') {
  return (request: NextRequest, context: any): string | undefined => {
    return context.params?.[paramName];
  };
}

export { APIAuthenticator, AuthContext, AuthResult, AuthOptions, UserRole };
