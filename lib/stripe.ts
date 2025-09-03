import Stripe from 'stripe';
import { getStripeConfig, STRIPE_CONFIG, isStripeConfigured } from './stripe-config';

// Stripe клиент для сервера - Production Ready Configuration
// Task 5.1: Enhanced with proper configuration validation and error handling

// Validate Stripe configuration
const stripeConfig = getStripeConfig();

// Don't throw during build time, only at runtime in production
if (!stripeConfig && process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
  throw new Error('❌ Stripe configuration is required in production');
}

// Use validated configuration or fallback for build
const stripeSecretKey = stripeConfig?.STRIPE_SECRET_KEY || 'sk_test_placeholder_for_build_only';

export const stripe = new Stripe(stripeSecretKey, {
  // Use configuration constants for consistency
  apiVersion: STRIPE_CONFIG.API_VERSION,
  
  // Enable TypeScript support
  typescript: true,
  
  // Production-ready settings from config
  maxNetworkRetries: STRIPE_CONFIG.MAX_NETWORK_RETRIES,
  timeout: STRIPE_CONFIG.TIMEOUT,
  
  // App identification
  appInfo: STRIPE_CONFIG.APP_INFO,
  
  // Enable telemetry for better performance insights
  telemetry: true,
});

// Validated публичные константы
export const STRIPE_PUBLISHABLE_KEY = stripeConfig?.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
export const STRIPE_WEBHOOK_SECRET = stripeConfig?.STRIPE_WEBHOOK_SECRET;

// Configuration status helpers
export { isStripeConfigured, getStripeConfig };

// Re-export configuration utilities
export * from './stripe-config';

// Константы цен согласно ТЗ
export const PRICING = {
  // Premium подписка для капитанов: €50/месяц - REAL STRIPE PRICE ID
  CAPTAIN_PREMIUM_MONTHLY: 'price_1S0sGVFwX7vboUlLvRXgNxmr',
  
  // Комиссии с туров
  COMMISSION_RATES: {
    STANDARD: 0.15, // 15%
    PREMIUM: 0.20,  // 20%
  },
  
  // Сертификационные курсы
  CERTIFICATION_COURSES: {
    BASIC_FISHING: 'price_basic_fishing_course',
    ADVANCED_TECHNIQUES: 'price_advanced_techniques_course',
    CAPTAIN_LICENSE: 'price_captain_license_course',
  },
  
  // Реклама в ленте событий
  ADVERTISING: {
    EQUIPMENT_PROMOTION: 'price_equipment_promotion',
    FEATURED_LISTING: 'price_featured_listing',
  }
} as const;

// Типы для монетизации
export interface MonetizationConfig {
  userId: string;
  subscriptionTier: 'free' | 'premium';
  commissionRate: number;
  features: {
    priorityBooking: boolean;
    premiumFilters: boolean;
    advancedAnalytics: boolean;
    certificateCourses: boolean;
  };
}

// Функция для получения комиссии с тура
export function calculateCommission(
  tourPrice: number, 
  subscriptionTier: 'free' | 'premium'
): number {
  const rate = subscriptionTier === 'premium' 
    ? PRICING.COMMISSION_RATES.PREMIUM 
    : PRICING.COMMISSION_RATES.STANDARD;
  
  return Math.round(tourPrice * rate);
}

// Функция для создания Stripe Customer
export async function createStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  return await stripe.customers.create({
    email,
    name,
    metadata,
  });
}

// Функция для создания подписки капитана
export async function createCaptainSubscription(
  customerId: string,
  priceId: string = PRICING.CAPTAIN_PREMIUM_MONTHLY
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
}

// Функция для создания платежа с комиссией
export async function createPaymentWithCommission(
  amount: number,
  currency: string = 'eur',
  connectedAccountId?: string,
  applicationFeeAmount?: number
): Promise<Stripe.PaymentIntent> {
  const paymentIntentData: Stripe.PaymentIntentCreateParams = {
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
  };

  // Добавляем комиссию если указана
  if (applicationFeeAmount && connectedAccountId) {
    paymentIntentData.application_fee_amount = applicationFeeAmount;
    paymentIntentData.on_behalf_of = connectedAccountId;
    paymentIntentData.transfer_data = {
      destination: connectedAccountId,
    };
  }

  return await stripe.paymentIntents.create(paymentIntentData);
}

export default stripe;
