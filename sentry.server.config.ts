// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',

  // Disable replay on server side
  integrations: [],

  // Configure error filtering for server-side
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    if (error instanceof Error) {
      // Skip known Prisma connection warnings in development
      if (error.message.includes('already exists in the current state') ||
          error.message.includes('Connection pool timeout')) {
        console.warn('🗄️ Sentry: Skipping database warning:', error.message);
        return null;
      }

      // Skip Vercel function timeout warnings (these are operational, not bugs)
      if (error.message.includes('Function timeout') ||
          error.message.includes('FUNCTION_INVOCATION_TIMEOUT')) {
        console.warn('⏱️ Sentry: Skipping timeout warning:', error.message);
        return null;
      }
    }

    // Add server context
    if (event.tags) {
      event.tags.app = 'cascais-fishing';
      event.tags.component = 'server';
    }

    return event;
  },

  // Add initial server scope
  initialScope: {
    tags: {
      app: 'cascais-fishing',
      component: 'server'
    }
  }
});
