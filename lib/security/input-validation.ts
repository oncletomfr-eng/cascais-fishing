/**
 * Production-Ready Input Validation & Sanitization Middleware
 * Comprehensive protection against malicious inputs, XSS, SQL injection, etc.
 */

import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';
import { NextRequest } from 'next/server';

// 🛡️  SECURITY: Common validation schemas
export const ValidationSchemas = {
  // Email validation with additional security checks
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email too short')
    .max(320, 'Email too long') // RFC 5321 limit
    .refine(
      (email) => !email.includes('..'), 
      'Email contains consecutive dots'
    )
    .refine(
      (email) => !/[<>'"&]/.test(email),
      'Email contains invalid characters'
    ),

  // Password validation with strength requirements
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .refine(
      (password) => /[a-z]/.test(password),
      'Password must contain lowercase letter'
    )
    .refine(
      (password) => /[A-Z]/.test(password),
      'Password must contain uppercase letter'
    )
    .refine(
      (password) => /[0-9]/.test(password),
      'Password must contain number'
    )
    .refine(
      (password) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
      'Password must contain special character'
    ),

  // Safe string (XSS protected)
  safeString: z.string()
    .min(1, 'String cannot be empty')
    .max(1000, 'String too long')
    .transform((str) => DOMPurify.sanitize(str, { ALLOWED_TAGS: [] }))
    .refine(
      (str) => !/[<>'"&]/.test(str),
      'String contains potentially dangerous characters'
    ),

  // HTML content (sanitized)
  htmlContent: z.string()
    .max(10000, 'HTML content too long')
    .transform((html) => DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOWED_URI_REGEXP: /^https?:\/\//,
    })),

  // ID validation (numeric)
  id: z.coerce.number()
    .int('ID must be integer')
    .positive('ID must be positive')
    .max(2147483647, 'ID too large'), // Max 32-bit signed integer

  // UUID validation
  uuid: z.string()
    .uuid('Invalid UUID format'),

  // URL validation
  url: z.string()
    .url('Invalid URL format')
    .refine(
      (url) => /^https?:\/\//.test(url),
      'Only HTTP/HTTPS URLs allowed'
    )
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return !['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname);
        } catch {
          return false;
        }
      },
      'Local URLs not allowed'
    ),

  // Phone number validation
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .min(7, 'Phone number too short')
    .max(15, 'Phone number too long'),

  // Safe filename
  filename: z.string()
    .min(1, 'Filename cannot be empty')
    .max(255, 'Filename too long')
    .regex(/^[a-zA-Z0-9._-]+$/, 'Filename contains invalid characters')
    .refine(
      (filename) => !filename.startsWith('.'),
      'Filename cannot start with dot'
    )
    .refine(
      (filename) => !['CON', 'PRN', 'AUX', 'NUL'].includes(filename.toUpperCase()),
      'Reserved filename'
    ),
};

// 🛡️  SECURITY: Request validation schemas for specific endpoints
export const EndpointSchemas = {
  // Auth endpoints
  '/api/auth/verify-credentials': z.object({
    email: ValidationSchemas.email,
    password: z.string().min(1, 'Password required'), // Don't validate password strength on login
  }),

  // Admin endpoints  
  '/api/admin/users': z.object({
    email: ValidationSchemas.email.optional(),
    role: z.enum(['ADMIN', 'CAPTAIN', 'PARTICIPANT']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    page: z.coerce.number().int().min(1).max(1000).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),

  // Email endpoints
  '/api/email': z.object({
    to: ValidationSchemas.email,
    template: z.enum(['private_booking_confirmation', 'participant_approval_notification', 'badge_awarded_notification']),
    data: z.record(z.any()), // Will be validated by specific template schema
  }),

  // Participant approval
  '/api/participant-approvals/:id': z.object({
    id: ValidationSchemas.id,
    action: z.enum(['approve', 'reject']).optional(),
    reason: ValidationSchemas.safeString.optional(),
  }),
};

interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: string[];
  sanitized?: boolean;
}

class InputValidator {
  /**
   * Validate request body against schema
   */
  static async validateBody(
    request: NextRequest,
    schema: z.ZodSchema
  ): Promise<ValidationResult> {
    try {
      const body = await request.json();
      const result = await schema.safeParseAsync(body);

      if (!result.success) {
        const errors = result.error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        );
        
        console.warn('🚨 Input validation failed:', {
          path: request.nextUrl.pathname,
          errors,
          timestamp: new Date().toISOString()
        });

        return {
          success: false,
          errors
        };
      }

      return {
        success: true,
        data: result.data,
        sanitized: true
      };

    } catch (error) {
      console.error('🚨 Request body parsing error:', error);
      return {
        success: false,
        errors: ['Invalid request body format']
      };
    }
  }

  /**
   * Validate query parameters
   */
  static validateQuery(
    request: NextRequest,
    schema: z.ZodSchema
  ): ValidationResult {
    try {
      const params = Object.fromEntries(request.nextUrl.searchParams.entries());
      const result = schema.safeParse(params);

      if (!result.success) {
        const errors = result.error.errors.map(err =>
          `${err.path.join('.')}: ${err.message}`
        );

        console.warn('🚨 Query validation failed:', {
          path: request.nextUrl.pathname,
          params,
          errors,
          timestamp: new Date().toISOString()
        });

        return {
          success: false,
          errors
        };
      }

      return {
        success: true,
        data: result.data,
        sanitized: true
      };

    } catch (error) {
      console.error('🚨 Query parameter parsing error:', error);
      return {
        success: false,
        errors: ['Invalid query parameters']
      };
    }
  }

  /**
   * Detect and block malicious patterns
   */
  static detectMaliciousPatterns(input: any): string[] {
    const maliciousPatterns = [
      // SQL Injection patterns
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /'.*OR.*'/gi,
      /"\s*(OR|AND)\s*"/gi,
      
      // XSS patterns
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>/gi,
      
      // Command injection patterns
      /;\s*(rm|cat|ls|pwd|whoami|id|uname)/gi,
      /\$\(.*\)/g,
      /`.*`/g,
      
      // Path traversal
      /\.\.\/+/g,
      /\.\.\\+/g,
      
      // LDAP injection
      /\(\|\(/g,
      /\)\(\|/g,
    ];

    const threats: string[] = [];
    const inputString = JSON.stringify(input);

    maliciousPatterns.forEach((pattern, index) => {
      if (pattern.test(inputString)) {
        threats.push(`Malicious pattern detected: ${pattern.source}`);
      }
    });

    return threats;
  }

  /**
   * Comprehensive request validation
   */
  static async validateRequest(
    request: NextRequest,
    options: {
      bodySchema?: z.ZodSchema;
      querySchema?: z.ZodSchema;
      requireAuth?: boolean;
    } = {}
  ): Promise<ValidationResult & { 
    body?: any; 
    query?: any; 
    threats?: string[];
  }> {
    const results: any = { success: true };
    const allThreats: string[] = [];

    // Validate request body if schema provided
    if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyResult = await this.validateBody(request, options.bodySchema);
      if (!bodyResult.success) {
        results.success = false;
        results.errors = [...(results.errors || []), ...(bodyResult.errors || [])];
      } else {
        results.body = bodyResult.data;
        // Check for malicious patterns in body
        const bodyThreats = this.detectMaliciousPatterns(bodyResult.data);
        allThreats.push(...bodyThreats);
      }
    }

    // Validate query parameters if schema provided
    if (options.querySchema) {
      const queryResult = this.validateQuery(request, options.querySchema);
      if (!queryResult.success) {
        results.success = false;
        results.errors = [...(results.errors || []), ...(queryResult.errors || [])];
      } else {
        results.query = queryResult.data;
        // Check for malicious patterns in query
        const queryThreats = this.detectMaliciousPatterns(queryResult.data);
        allThreats.push(...queryThreats);
      }
    }

    // Log security threats
    if (allThreats.length > 0) {
      console.error('🚨 SECURITY THREATS DETECTED:', {
        path: request.nextUrl.pathname,
        ip: request.ip || request.headers.get('x-forwarded-for'),
        threats: allThreats,
        timestamp: new Date().toISOString()
      });
      
      results.success = false;
      results.threats = allThreats;
      results.errors = [...(results.errors || []), 'Malicious input detected'];
    }

    return results;
  }
}

/**
 * Higher-order function to add validation to API handlers
 */
export function withValidation(
  handler: Function,
  options: {
    bodySchema?: z.ZodSchema;
    querySchema?: z.ZodSchema;
    requireAuth?: boolean;
  } = {}
) {
  return async (request: NextRequest, context: any) => {
    // Perform validation
    const validation = await InputValidator.validateRequest(request, options);

    if (!validation.success) {
      console.warn('🚨 API request blocked due to validation failure:', {
        path: request.nextUrl.pathname,
        errors: validation.errors,
        threats: validation.threats
      });

      return new Response(
        JSON.stringify({
          error: 'Validation Failed',
          message: 'Request contains invalid or malicious data',
          details: validation.errors,
          code: validation.threats ? 'MALICIOUS_INPUT' : 'VALIDATION_ERROR'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // Add validated data to request context
    const enhancedContext = {
      ...context,
      validatedBody: validation.body,
      validatedQuery: validation.query,
    };

    // Continue to actual handler
    return handler(request, enhancedContext);
  };
}

export { InputValidator };
