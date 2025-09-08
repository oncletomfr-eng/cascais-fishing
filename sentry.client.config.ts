// This file configures the initialization of Sentry on the browser/client side.
// The config you add here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // You can remove this option if you're not planning to use the Sentry session replay feature:
  integrations: [
    new Sentry.Replay({
      // Capture 10% of all sessions on production, 100% in development
      sessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture 100% of sessions with an error on production, 100% in development
      errorSampleRate: 1.0,
    }),
  ],

  // Set sample rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay: captures user interactions for debugging
  // Only in production to avoid privacy issues in development
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0.0,
  replaysOnErrorSampleRate: 1.0,

  // Configure error filtering
  beforeSend(event, hint) {
    // Filter out known, non-critical errors
    const error = hint.originalException;
    
    if (error instanceof Error) {
      // Skip Next.js hydration errors (common and usually non-critical)
      if (error.message.includes('Hydration failed') || 
          error.message.includes('Text content does not match')) {
        console.warn('🔄 Sentry: Skipping hydration error:', error.message);
        return null;
      }

      // Skip network errors that are user-related
      if (error.message.includes('NetworkError') || 
          error.message.includes('Failed to fetch')) {
        console.warn('🌐 Sentry: Skipping network error:', error.message);
        return null;
      }
    }

    // Add additional context for Cascais Fishing errors
    if (event.tags) {
      event.tags.app = 'cascais-fishing';
      event.tags.component = 'client';
    }

    return event;
  },

  // Add user context when available
  initialScope: {
    tags: {
      app: 'cascais-fishing',
      component: 'client'
    }
  }
});
