/**
 * 🚀 BUNDLE OPTIMIZATION: Compression Middleware
 * Advanced compression for better performance
 */

import { NextRequest, NextResponse } from 'next/server';

export function compressionMiddleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Check if client accepts compression
  const acceptEncoding = request.headers.get('accept-encoding') || '';
  
  // Skip compression for certain file types
  const skipCompression = [
    '/api/stream',
    '/api/sse',
    '/_next/static',
    '.wasm',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico'
  ];
  
  const shouldSkip = skipCompression.some(pattern => 
    request.nextUrl.pathname.includes(pattern)
  );
  
  if (shouldSkip) {
    return response;
  }
  
  // Add compression headers for compressible content
  if (acceptEncoding.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip');
    response.headers.set('Vary', 'Accept-Encoding');
  } else if (acceptEncoding.includes('br')) {
    response.headers.set('Content-Encoding', 'br');
    response.headers.set('Vary', 'Accept-Encoding');
  }
  
  // Cache control for static assets
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // Performance headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Bundle size optimization utilities
 */
export const bundleOptimizations = {
  // Preload critical resources
  preloadCritical: () => {
    if (typeof window !== 'undefined') {
      // Preload critical CSS
      const criticalCSS = document.createElement('link');
      criticalCSS.rel = 'preload';
      criticalCSS.as = 'style';
      criticalCSS.href = '/_next/static/css/critical.css';
      document.head.appendChild(criticalCSS);
      
      // Preload critical fonts
      const criticalFont = document.createElement('link');
      criticalFont.rel = 'preload';
      criticalFont.as = 'font';
      criticalFont.type = 'font/woff2';
      criticalFont.crossOrigin = 'anonymous';
      criticalFont.href = '/fonts/inter-var.woff2';
      document.head.appendChild(criticalFont);
    }
  },
  
  // Lazy load non-critical resources
  lazyLoadNonCritical: () => {
    if (typeof window !== 'undefined') {
      // Lazy load analytics
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = 'https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID';
        script.async = true;
        document.head.appendChild(script);
      }, 3000);
    }
  },
  
  // Monitor bundle performance
  trackBundleMetrics: () => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        const metrics = {
          domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
          loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
        
        // Send metrics to analytics
        if (window.gtag) {
          window.gtag('event', 'bundle_performance', {
            custom_map: {
              metric1: 'dom_content_loaded',
              metric2: 'load_complete',
              metric3: 'first_paint',
              metric4: 'first_contentful_paint'
            },
            metric1: Math.round(metrics.domContentLoaded),
            metric2: Math.round(metrics.loadComplete),
            metric3: Math.round(metrics.firstPaint),
            metric4: Math.round(metrics.firstContentfulPaint)
          });
        }
        
        console.log('📊 Bundle Performance Metrics:', metrics);
      });
    }
  }
};
