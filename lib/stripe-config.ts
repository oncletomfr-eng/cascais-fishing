/**
 * Stripe Configuration and Environment Validation
 * Task 5.1: Stripe SDK Configuration & Setup
 * 
 * This module handles Stripe environment configuration, validation, and provides
 * type-safe access to Stripe configuration across the application.
 */

import { z } from 'zod';

// Environment validation schema
const StripeConfigSchema = z.object({
  // Server-side Stripe configuration
  STRIPE_SECRET_KEY: z.string()
    .min(1, 'STRIPE_SECRET_KEY is required')
    .startsWith('sk_', 'STRIPE_SECRET_KEY must start with sk_'),
  
  // Client-side Stripe configuration  
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string()
    .min(1, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required')
    .startsWith('pk_', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_'),
  
  // Webhook configuration
  STRIPE_WEBHOOK_SECRET: z.string()
    .min(1, 'STRIPE_WEBHOOK_SECRET is required')
    .startsWith('whsec_', 'STRIPE_WEBHOOK_SECRET must start with whsec_'),
  
  // App configuration for redirects
  NEXTAUTH_URL: z.string()
    .url('NEXTAUTH_URL must be a valid URL')
    .default('http://localhost:3000'),
  
  // Optional: Stripe Connect for marketplace
  STRIPE_CONNECT_CLIENT_ID: z.string()
    .startsWith('ca_', 'STRIPE_CONNECT_CLIENT_ID must start with ca_')
    .optional(),
});

export type StripeConfig = z.infer<typeof StripeConfigSchema>;

/**
 * Validates and returns Stripe configuration from environment variables
 * Throws detailed error messages for missing or invalid configuration
 */
export function validateStripeConfig(): StripeConfig {
  try {
    return StripeConfigSchema.parse({
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `❌ ${err.path.join('.')}: ${err.message}`).join('\n');
      
      // Only log errors in development or runtime, not during build
      const isBuilding = process.env.NEXT_PHASE === 'phase-production-build' || 
                        process.env.VERCEL_ENV === 'production' && process.env.NODE_ENV !== 'production';
      
      if (!isBuilding && process.env.NODE_ENV !== 'test') {
        console.error('🔧 Stripe Configuration Error:');
        console.error(missingVars);
        console.error('\n📝 Required Environment Variables:');
        console.error('STRIPE_SECRET_KEY=sk_test_... (from Stripe Dashboard)');
        console.error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (from Stripe Dashboard)');
        console.error('STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Webhook settings)');
        console.error('NEXTAUTH_URL=http://localhost:3000 (your app URL)');
        console.error('\n🔗 Get your keys from: https://dashboard.stripe.com/apikeys');
      }
      
      throw new Error('Invalid Stripe configuration. Check environment variables.');
    }
    throw error;
  }
}

/**
 * Safe environment variable access with fallbacks for build time
 */
export function getStripeConfig(): StripeConfig | null {
  try {
    return validateStripeConfig();
  } catch (error) {
    // During build time or when not configured, return null to avoid breaking the build
    const isBuilding = process.env.NEXT_PHASE === 'phase-production-build' || 
                      process.env.NODE_ENV === 'development' ||
                      !process.env.STRIPE_SECRET_KEY;
    
    if (isBuilding) {
      return null;
    }
    
    // Re-throw in production runtime if configuration is missing
    throw error;
  }
}

/**
 * Check if Stripe is properly configured
 */
export function isStripeConfigured(): boolean {
  const config = getStripeConfig();
  return config !== null;
}

/**
 * Get the Stripe publishable key for client-side usage
 * Returns null if not configured (for graceful degradation)
 */
export function getStripePublishableKey(): string | null {
  if (typeof window === 'undefined') {
    // Server-side: Use process.env
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
  } else {
    // Client-side: Use window.process if available, or hardcode for static export
    return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || null;
  }
}

/**
 * Environment-specific configuration
 */
export const STRIPE_CONFIG = {
  // API version to pin for consistency
  API_VERSION: '2024-12-18.acacia' as const,
  
  // Timeout configurations
  TIMEOUT: 10000, // 10 seconds
  MAX_NETWORK_RETRIES: 3,
  
  // App identification
  APP_INFO: {
    name: 'Cascais Fishing Platform',
    version: '1.0.0',
    url: 'https://cascaisfishing.com',
  },
  
  // CSP Domains that need to be allowed
  CSP_DOMAINS: [
    'https://js.stripe.com',
    'https://hooks.stripe.com',
    'https://api.stripe.com',
    'https://checkout.stripe.com',
    'https://pay.stripe.com',
    'https://m.stripe.com',
  ],
  
  // Supported payment methods
  PAYMENT_METHODS: [
    'card',
    'sepa_debit',
    'ideal',
    'bancontact',
    'sofort',
    'eps',
    'giropay',
    'p24',
  ] as const,
  
  // Currency configuration
  DEFAULT_CURRENCY: 'eur' as const,
  SUPPORTED_CURRENCIES: ['eur', 'usd', 'gbp'] as const,
  
  // Webhook events we handle
  WEBHOOK_EVENTS: [
    'checkout.session.completed',
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'invoice.payment_succeeded',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'setup_intent.succeeded',
  ] as const,
} as const;

export type SupportedPaymentMethod = typeof STRIPE_CONFIG.PAYMENT_METHODS[number];
export type SupportedCurrency = typeof STRIPE_CONFIG.SUPPORTED_CURRENCIES[number];
export type WebhookEvent = typeof STRIPE_CONFIG.WEBHOOK_EVENTS[number];

/**
 * Development mode detection
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Test mode detection (based on Stripe keys)
 */
export function isTestMode(): boolean {
  const publishableKey = getStripePublishableKey();
  return publishableKey?.startsWith('pk_test_') ?? false;
}

/**
 * Format amount for Stripe (convert euros to cents)
 */
export function formatAmountForStripe(amount: number, currency: SupportedCurrency = 'eur'): number {
  // Stripe expects amounts in cents for EUR
  const zeroDecimalCurrencies = ['jpy', 'krw']; // Add more if needed
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }
  
  return Math.round(amount * 100);
}

/**
 * Format amount for display (convert cents to euros)
 */
export function formatAmountForDisplay(amount: number, currency: SupportedCurrency = 'eur'): number {
  const zeroDecimalCurrencies = ['jpy', 'krw'];
  
  if (zeroDecimalCurrencies.includes(currency.toLowerCase())) {
    return amount;
  }
  
  return amount / 100;
}
