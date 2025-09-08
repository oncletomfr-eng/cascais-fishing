/**
 * API Route Caching System
 * High-impact performance optimization for repeat requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
  etag: string;
  headers?: Record<string, string>;
}

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  staleWhileRevalidate?: number; // Serve stale for N seconds while revalidating
  tags?: string[]; // Cache tags for invalidation
  vary?: string[]; // Headers to include in cache key
  revalidateOnStale?: boolean;
}

/**
 * In-memory cache with LRU eviction
 */
class ApiCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize: number;
  private readonly defaultTtl: number;

  constructor(maxSize = 1000, defaultTtl = 300) { // 5 min default
    this.maxSize = maxSize;
    this.defaultTtl = defaultTtl;
  }

  /**
   * Generate cache key from request
   */
  private generateKey(
    request: NextRequest, 
    options?: CacheOptions
  ): string {
    const url = new URL(request.url);
    const baseKey = `${request.method}:${url.pathname}${url.search}`;
    
    if (!options?.vary?.length) {
      return baseKey;
    }

    // Include vary headers in key
    const varyParts = options.vary
      .map(header => `${header}:${request.headers.get(header) || ''}`)
      .join('|');
    
    return `${baseKey}|${varyParts}`;
  }

  /**
   * Generate ETag for response data
   */
  private generateEtag(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data);
    return `W/"${Buffer.from(content).toString('base64').slice(0, 16)}"`;
  }

  /**
   * Check if cache entry is valid
   */
  private isValid(entry: CacheEntry, options?: CacheOptions): boolean {
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Fresh if within TTL
    if (age < entry.expiry * 1000) {
      return true;
    }

    // Stale-while-revalidate check
    if (options?.staleWhileRevalidate && options.revalidateOnStale) {
      return age < (entry.expiry + options.staleWhileRevalidate) * 1000;
    }

    return false;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictIfNeeded(): void {
    if (this.cache.size >= this.maxSize) {
      // Simple FIFO eviction - could be improved with LRU
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        logger.debug('Cache eviction performed', {
          evictedKey: firstKey,
          cacheSize: this.cache.size
        });
      }
    }
  }

  /**
   * Get cached response
   */
  get(request: NextRequest, options?: CacheOptions): CacheEntry | null {
    const key = this.generateKey(request, options);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (!this.isValid(entry, options)) {
      this.cache.delete(key);
      return null;
    }

    // Move to end for LRU-ish behavior
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry;
  }

  /**
   * Set cached response
   */
  set(
    request: NextRequest,
    data: any,
    options?: CacheOptions
  ): void {
    const key = this.generateKey(request, options);
    const ttl = options?.ttl || this.defaultTtl;
    const etag = this.generateEtag(data);

    this.evictIfNeeded();

    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiry: ttl,
      etag,
      headers: options?.vary ? 
        Object.fromEntries(
          options.vary.map(h => [h, request.headers.get(h) || ''])
        ) : undefined
    };

    this.cache.set(key, entry);

    logger.debug('Response cached', {
      key: key.substring(0, 50) + '...',
      ttl,
      etag,
      cacheSize: this.cache.size
    });
  }

  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag(tag: string): number {
    let removed = 0;
    for (const [key, entry] of this.cache.entries()) {
      // This would require storing tags with entries
      // Implementation depends on tagging strategy
      if (key.includes(tag)) {
        this.cache.delete(key);
        removed++;
      }
    }

    logger.info('Cache invalidated by tag', { tag, removed });
    return removed;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info('Cache cleared', { entriesRemoved: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    entries: Array<{ key: string; age: number; size: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: key.length > 50 ? key.substring(0, 50) + '...' : key,
      age: Math.floor((Date.now() - entry.timestamp) / 1000),
      size: JSON.stringify(entry.data).length
    }));

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries
    };
  }
}

// Global cache instance
const apiCache = new ApiCache(1000, 300); // 1000 entries, 5 min TTL

/**
 * Cache middleware wrapper for API routes
 */
export function withCache(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: CacheOptions
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Skip caching for non-GET requests
    if (request.method !== 'GET') {
      return handler(request);
    }

    // Check for cache hit
    const cached = apiCache.get(request, options);
    if (cached) {
      logger.debug('Cache hit', { 
        url: request.url,
        age: Math.floor((Date.now() - cached.timestamp) / 1000)
      });

      return new NextResponse(JSON.stringify(cached.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${options?.ttl || 300}`,
          'ETag': cached.etag,
          'X-Cache': 'HIT'
        }
      });
    }

    // Cache miss - execute handler
    logger.debug('Cache miss', { url: request.url });
    
    const response = await handler(request);
    
    // Only cache successful responses
    if (response.ok) {
      try {
        const responseData = await response.clone().json();
        apiCache.set(request, responseData, options);
      } catch (error) {
        logger.warn('Failed to cache response', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          url: request.url 
        });
      }
    }

    // Add cache headers to response
    const newHeaders = new Headers(response.headers);
    newHeaders.set('X-Cache', 'MISS');
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  };
}

/**
 * Cache configuration presets for different API types
 */
export const CachePresets = {
  // Static data that rarely changes
  STATIC: { ttl: 3600, staleWhileRevalidate: 86400 }, // 1h / 24h
  
  // User-specific data
  USER_DATA: { ttl: 300, staleWhileRevalidate: 900 }, // 5m / 15m
  
  // Frequently changing data
  DYNAMIC: { ttl: 60, staleWhileRevalidate: 300 }, // 1m / 5m
  
  // Search results or filtered data
  SEARCH: { ttl: 180, vary: ['authorization'] }, // 3m with user context
  
  // Public API responses
  PUBLIC: { ttl: 600, staleWhileRevalidate: 1800 } // 10m / 30m
} as const;

/**
 * Manual cache operations
 */
export const CacheManager = {
  invalidateTag: (tag: string) => apiCache.invalidateByTag(tag),
  clear: () => apiCache.clear(),
  getStats: () => apiCache.getStats()
};

export default apiCache;
