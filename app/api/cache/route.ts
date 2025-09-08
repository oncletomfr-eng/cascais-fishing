/**
 * Cache Management API
 * Provides cache statistics, invalidation, and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { CacheManager } from '@/lib/cache/api-cache';
import { logger } from '@/lib/logging';

interface CacheStatsResponse {
  success: boolean;
  stats: {
    size: number;
    maxSize: number;
    hitRate?: number;
    entries: Array<{ key: string; age: number; size: number }>;
  };
  timestamp: string;
}

interface CacheInvalidationResponse {
  success: boolean;
  entriesRemoved: number;
  tag?: string;
  timestamp: string;
}

// GET - Cache statistics
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Optional: Add admin authorization for cache stats
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const requireAuth = searchParams.get('auth') === 'true';

    if (requireAuth && (!session || !session.user?.email?.includes('admin'))) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    logger.info('Cache statistics requested', {
      operation: 'cache_stats',
      metadata: {
        requireAuth,
        userEmail: session?.user?.email || 'anonymous'
      }
    });

    const stats = CacheManager.getStats();

    const response: CacheStatsResponse = {
      success: true,
      stats,
      timestamp: new Date().toISOString()
    };

    logger.debug('Cache statistics retrieved', {
      operation: 'cache_stats_success',
      metadata: {
        cacheSize: stats.size,
        maxSize: stats.maxSize,
        entriesCount: stats.entries.length
      }
    });

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    logger.error('Failed to retrieve cache statistics', {
      operation: 'cache_stats_error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve cache statistics'
      },
      { status: 500 }
    );
  }
}

// DELETE - Cache invalidation
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    // Require admin authorization for cache invalidation
    const session = await auth();
    if (!session || !session.user?.email?.includes('admin')) {
      logger.warn('Unauthorized cache invalidation attempt', {
        operation: 'cache_invalidation_unauthorized',
        metadata: {
          userEmail: session?.user?.email || 'anonymous',
          ip: request.headers.get('x-forwarded-for')
        }
      });

      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const clearAll = searchParams.get('clear') === 'all';

    logger.info('Cache invalidation requested', {
      operation: 'cache_invalidation',
      metadata: {
        tag,
        clearAll,
        userEmail: session.user.email
      }
    });

    let entriesRemoved = 0;

    if (clearAll) {
      // Clear entire cache
      CacheManager.clear();
      entriesRemoved = -1; // Indicate full clear
      
      logger.info('Full cache cleared', {
        operation: 'cache_full_clear',
        metadata: {
          userEmail: session.user.email
        }
      });

    } else if (tag) {
      // Invalidate by tag
      entriesRemoved = CacheManager.invalidateTag(tag);
      
      logger.info('Cache invalidated by tag', {
        operation: 'cache_tag_invalidation',
        metadata: {
          tag,
          entriesRemoved,
          userEmail: session.user.email
        }
      });

    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request - specify tag or clear=all parameter' 
        },
        { status: 400 }
      );
    }

    const response: CacheInvalidationResponse = {
      success: true,
      entriesRemoved,
      tag: tag || undefined,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    logger.error('Cache invalidation failed', {
      operation: 'cache_invalidation_error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Cache invalidation failed'
      },
      { status: 500 }
    );
  }
}

// POST - Cache warming (pre-populate cache with common requests)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Require admin authorization
    const session = await auth();
    if (!session || !session.user?.email?.includes('admin')) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { endpoints } = body;

    if (!Array.isArray(endpoints) || endpoints.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request - provide endpoints array' },
        { status: 400 }
      );
    }

    logger.info('Cache warming initiated', {
      operation: 'cache_warming',
      metadata: {
        endpointsCount: endpoints.length,
        userEmail: session.user.email
      }
    });

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint: string) => {
        try {
          // Make internal request to warm cache
          const warmupUrl = new URL(endpoint, request.url).toString();
          const response = await fetch(warmupUrl, {
            method: 'GET',
            headers: {
              'Authorization': request.headers.get('Authorization') || '',
              'User-Agent': 'Cache-Warmer/1.0'
            }
          });

          return {
            endpoint,
            status: response.status,
            cached: response.headers.get('X-Cache') === 'HIT'
          };
        } catch (error) {
          return {
            endpoint,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    logger.info('Cache warming completed', {
      operation: 'cache_warming_complete',
      metadata: {
        successful,
        failed,
        total: results.length
      }
    });

    return NextResponse.json({
      success: true,
      results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason }),
      summary: {
        total: results.length,
        successful,
        failed
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Cache warming failed', {
      operation: 'cache_warming_error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Cache warming failed'
      },
      { status: 500 }
    );
  }
}
