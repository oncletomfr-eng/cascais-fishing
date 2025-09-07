/**
 * Production-Ready Rate Limiter for Vercel Edge Runtime
 * Implements sliding window rate limiting with IP tracking
 */

// Simple in-memory rate limiter (for Edge Runtime compatibility)
// In production, consider using Redis or external rate limiting service

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstAttempt: number;
  suspiciousActivity: boolean;
}

class EdgeRateLimiter {
  private static instance: EdgeRateLimiter;
  private requests: Map<string, RateLimitEntry> = new Map();
  private readonly cleanupInterval: number = 60000; // 1 minute
  private lastCleanup: number = 0;

  private constructor() {}

  static getInstance(): EdgeRateLimiter {
    if (!EdgeRateLimiter.instance) {
      EdgeRateLimiter.instance = new EdgeRateLimiter();
    }
    return EdgeRateLimiter.instance;
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(
    identifier: string, 
    limit: number = 100, 
    windowMs: number = 60000, // 1 minute default
    path?: string
  ): { limited: boolean; remaining: number; resetTime: number; suspicious: boolean } {
    const now = Date.now();
    
    // Clean up old entries periodically
    if (now - this.lastCleanup > this.cleanupInterval) {
      this.cleanup(now);
      this.lastCleanup = now;
    }

    const entry = this.requests.get(identifier);
    
    if (!entry || now > entry.resetTime) {
      // First request or reset window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
        firstAttempt: now,
        suspiciousActivity: false
      };
      this.requests.set(identifier, newEntry);
      
      return {
        limited: false,
        remaining: limit - 1,
        resetTime: newEntry.resetTime,
        suspicious: false
      };
    }

    // Update existing entry
    entry.count++;
    
    // Detect suspicious activity patterns
    if (this.detectSuspiciousActivity(entry, now, path)) {
      entry.suspiciousActivity = true;
      // Reduce limit for suspicious IPs
      limit = Math.floor(limit * 0.5);
    }

    const isLimited = entry.count > limit;
    
    this.requests.set(identifier, entry);

    return {
      limited: isLimited,
      remaining: Math.max(0, limit - entry.count),
      resetTime: entry.resetTime,
      suspicious: entry.suspiciousActivity
    };
  }

  private detectSuspiciousActivity(entry: RateLimitEntry, now: number, path?: string): boolean {
    // Very rapid requests (< 100ms between requests)
    const avgInterval = (now - entry.firstAttempt) / entry.count;
    if (avgInterval < 100 && entry.count > 10) {
      return true;
    }

    // High volume of requests to auth endpoints
    if (path?.includes('/auth/') && entry.count > 20) {
      return true;
    }

    // High volume of requests to admin endpoints
    if (path?.includes('/admin/') && entry.count > 10) {
      return true;
    }

    return false;
  }

  private cleanup(now: number): void {
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): { totalEntries: number; suspiciousIPs: number } {
    let suspiciousCount = 0;
    for (const entry of this.requests.values()) {
      if (entry.suspiciousActivity) {
        suspiciousCount++;
      }
    }

    return {
      totalEntries: this.requests.size,
      suspiciousIPs: suspiciousCount
    };
  }

  /**
   * Manually block an IP (for security incidents)
   */
  blockIP(ip: string, durationMs: number = 3600000): void { // 1 hour default
    const now = Date.now();
    const entry: RateLimitEntry = {
      count: 1000, // High count to trigger rate limiting
      resetTime: now + durationMs,
      firstAttempt: now,
      suspiciousActivity: true
    };
    this.requests.set(ip, entry);
  }
}

/**
 * Rate limiting presets for different types of endpoints
 */
export const RateLimits = {
  // General API endpoints
  api: { limit: 100, windowMs: 60000 }, // 100 requests per minute
  
  // Authentication endpoints (stricter)
  auth: { limit: 10, windowMs: 60000 }, // 10 requests per minute
  
  // Admin endpoints (very strict)
  admin: { limit: 30, windowMs: 300000 }, // 30 requests per 5 minutes
  
  // Health checks (more lenient)
  health: { limit: 200, windowMs: 60000 }, // 200 requests per minute
  
  // Static files (most lenient)
  static: { limit: 1000, windowMs: 60000 }, // 1000 requests per minute
  
  // Email sending (very strict)
  email: { limit: 5, windowMs: 300000 }, // 5 requests per 5 minutes
} as const;

export { EdgeRateLimiter };
