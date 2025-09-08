/**
 * Core Web Vitals Monitoring System
 * Client-side performance monitoring for LCP, FID, CLS, INP, and TTFB
 */

import { logger } from '@/lib/logging';

export interface WebVitalMetric {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: 'navigate' | 'reload' | 'back_forward' | 'prerender';
  url: string;
  timestamp: number;
}

export interface PerformanceEntry {
  entryType: string;
  name: string;
  startTime: number;
  duration: number;
}

export interface NavigationTiming {
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  interactionToNextPaint: number;
  timeToFirstByte: number;
  totalBlockingTime: number;
}

/**
 * Core Web Vitals thresholds
 */
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 }
} as const;

/**
 * Get performance rating based on value and thresholds
 */
function getRating(name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Core Web Vitals monitoring class
 */
export class CoreWebVitalsMonitor {
  private static instance: CoreWebVitalsMonitor | null = null;
  private observers: PerformanceObserver[] = [];
  private metrics: Map<string, WebVitalMetric> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): CoreWebVitalsMonitor {
    if (!CoreWebVitalsMonitor.instance) {
      CoreWebVitalsMonitor.instance = new CoreWebVitalsMonitor();
    }
    return CoreWebVitalsMonitor.instance;
  }

  /**
   * Initialize Core Web Vitals monitoring
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    this.isInitialized = true;

    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Monitor paint metrics (FCP, LCP)
    this.observePaintMetrics();
    
    // Monitor layout shift (CLS)
    this.observeLayoutShift();
    
    // Monitor first input delay (FID)
    this.observeFirstInputDelay();
    
    // Monitor interaction to next paint (INP)
    this.observeInteractionToNextPaint();

    // Report metrics on page visibility change
    this.setupVisibilityHandler();

    // Report metrics on page unload
    this.setupUnloadHandler();

    console.log('🚀 Core Web Vitals monitoring initialized');
  }

  /**
   * Observe navigation timing metrics
   */
  private observeNavigationTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            
            // Time to First Byte
            const ttfb = navEntry.responseStart - navEntry.requestStart;
            this.recordMetric('TTFB', ttfb, 0);

            // Calculate additional timing metrics
            const timings: NavigationTiming = {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              firstPaint: 0,
              firstContentfulPaint: 0,
              largestContentfulPaint: 0,
              firstInputDelay: 0,
              cumulativeLayoutShift: 0,
              interactionToNextPaint: 0,
              timeToFirstByte: ttfb,
              totalBlockingTime: 0
            };

            this.reportNavigationTimings(timings);
          }
        }
      });

      observer.observe({ type: 'navigation', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe navigation timing:', error);
    }
  }

  /**
   * Observe paint metrics (FCP, LCP)
   */
  private observePaintMetrics(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // First Contentful Paint
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.recordMetric('FCP', entry.startTime, 0);
          }
        }
      });

      paintObserver.observe({ type: 'paint', buffered: true });
      this.observers.push(paintObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.recordMetric('LCP', lastEntry.startTime, 0);
        }
      });

      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('Failed to observe paint metrics:', error);
    }
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeLayoutShift(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      let clsValue = 0;
      let sessionValue = 0;
      let sessionEntries: PerformanceEntry[] = [];
      const maxSessionGap = 1000;
      const maxSessionDuration = 5000;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Only count layout shifts without recent user input
          if (!(entry as any).hadRecentInput) {
            const firstSessionEntry = sessionEntries[0];
            const lastSessionEntry = sessionEntries[sessionEntries.length - 1];

            // If the entry occurred less than 1 second after the previous entry and less than 5 seconds after the first entry, include it in the current session
            if (sessionValue &&
                entry.startTime - lastSessionEntry.startTime < maxSessionGap &&
                entry.startTime - firstSessionEntry.startTime < maxSessionDuration) {
              sessionValue += (entry as any).value;
              sessionEntries.push(entry);
            } else {
              sessionValue = (entry as any).value;
              sessionEntries = [entry];
            }

            // If the current session value is larger than the current CLS value, update CLS
            if (sessionValue > clsValue) {
              clsValue = sessionValue;
              this.recordMetric('CLS', clsValue, (entry as any).value);
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe layout shift:', error);
    }
  }

  /**
   * Observe First Input Delay
   */
  private observeFirstInputDelay(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidValue = (entry as any).processingStart - entry.startTime;
          this.recordMetric('FID', fidValue, fidValue);
        }
      });

      observer.observe({ type: 'first-input', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe first input delay:', error);
    }
  }

  /**
   * Observe Interaction to Next Paint
   */
  private observeInteractionToNextPaint(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        let longestINP = 0;
        
        for (const entry of list.getEntries()) {
          const inp = (entry as any).duration;
          if (inp > longestINP) {
            longestINP = inp;
            this.recordMetric('INP', inp, inp);
          }
        }
      });

      observer.observe({ type: 'event', buffered: true });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe interaction to next paint:', error);
    }
  }

  /**
   * Record a Web Vital metric
   */
  private recordMetric(name: WebVitalMetric['name'], value: number, delta: number): void {
    const metric: WebVitalMetric = {
      name,
      value,
      rating: getRating(name, value),
      delta,
      id: this.generateId(),
      navigationType: this.getNavigationType(),
      url: window.location.href,
      timestamp: Date.now()
    };

    this.metrics.set(name, metric);

    // Send to analytics/logging
    this.reportMetric(metric);
  }

  /**
   * Report metric to logging system
   */
  private reportMetric(metric: WebVitalMetric): void {
    // Log to structured logger
    logger.performanceMetric(metric.name, metric.value, metric.name === 'CLS' ? 'ratio' : 'ms', {
      operation: 'core_web_vitals',
      metadata: {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        url: metric.url,
        timestamp: metric.timestamp
      }
    });

    // Send to analytics service
    this.sendToAnalytics(metric);
  }

  /**
   * Send metric to analytics service
   */
  private sendToAnalytics(metric: WebVitalMetric): void {
    // In production, this would send to your analytics service
    // For now, we'll just use console.log for demonstration
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Core Web Vital: ${metric.name} = ${metric.value.toFixed(2)}ms (${metric.rating})`);
    }

    // Example: Send to Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_rating: metric.rating,
        custom_parameter: {
          navigation_type: metric.navigationType,
          metric_id: metric.id
        }
      });
    }

    // Example: Send to custom analytics endpoint
    if (typeof fetch !== 'undefined') {
      fetch('/api/analytics/web-vitals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metric)
      }).catch(error => {
        console.warn('Failed to send metric to analytics:', error);
      });
    }
  }

  /**
   * Report navigation timings
   */
  private reportNavigationTimings(timings: NavigationTiming): void {
    logger.performanceMetric('navigation_timings', timings.timeToFirstByte, 'ms', {
      operation: 'navigation_performance',
      metadata: {
        domContentLoaded: timings.domContentLoaded,
        timeToFirstByte: timings.timeToFirstByte,
        url: window.location.href,
        timestamp: Date.now()
      }
    });
  }

  /**
   * Setup visibility change handler to report final metrics
   */
  private setupVisibilityHandler(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.reportFinalMetrics();
        }
      });
    }
  }

  /**
   * Setup page unload handler
   */
  private setupUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.reportFinalMetrics();
      });
    }
  }

  /**
   * Report final metrics before page unload
   */
  private reportFinalMetrics(): void {
    // Send any remaining metrics
    for (const metric of this.metrics.values()) {
      this.reportMetric(metric);
    }

    // Use sendBeacon for reliable delivery
    if (typeof navigator !== 'undefined' && navigator.sendBeacon && this.metrics.size > 0) {
      const metricsData = JSON.stringify(Array.from(this.metrics.values()));
      navigator.sendBeacon('/api/analytics/web-vitals/beacon', metricsData);
    }
  }

  /**
   * Generate unique ID for metric
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get navigation type
   */
  private getNavigationType(): WebVitalMetric['navigationType'] {
    if (typeof performance !== 'undefined' && performance.navigation) {
      switch (performance.navigation.type) {
        case 1: return 'reload';
        case 2: return 'back_forward';
        default: return 'navigate';
      }
    }
    return 'navigate';
  }

  /**
   * Get current metrics
   */
  getMetrics(): WebVitalMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric by name
   */
  getMetric(name: WebVitalMetric['name']): WebVitalMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all observers and metrics
   */
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
    this.isInitialized = false;
  }
}

/**
 * Initialize Core Web Vitals monitoring (client-side only)
 */
export function initWebVitalsMonitoring(): void {
  if (typeof window !== 'undefined') {
    const monitor = CoreWebVitalsMonitor.getInstance();
    monitor.init();
  }
}

/**
 * Get current Web Vitals metrics
 */
export function getWebVitalsMetrics(): WebVitalMetric[] {
  if (typeof window !== 'undefined') {
    const monitor = CoreWebVitalsMonitor.getInstance();
    return monitor.getMetrics();
  }
  return [];
}

/**
 * Hook for React components to use Web Vitals
 */
export function useWebVitals() {
  if (typeof window === 'undefined') {
    return { metrics: [], getMetric: () => undefined };
  }

  const monitor = CoreWebVitalsMonitor.getInstance();
  
  return {
    metrics: monitor.getMetrics(),
    getMetric: (name: WebVitalMetric['name']) => monitor.getMetric(name)
  };
}
