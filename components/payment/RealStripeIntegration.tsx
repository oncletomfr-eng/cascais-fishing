'use client';

/**
 * Real Stripe Integration with Payment Elements
 * Task 5.1 & 5.2: Production-ready Stripe Payment Elements integration
 * Replaces the mock implementation with real Stripe SDK
 */

import React, { Suspense } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStripePublishableKey, isStripeConfigured, formatAmountForDisplay, type SupportedCurrency } from '@/lib/stripe-config';
import { useState, useEffect } from 'react';

// Initialize Stripe with proper configuration
const stripePromise = (() => {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    console.warn('⚠️ Stripe publishable key not found - payments will not work');
    return null;
  }
  return loadStripe(publishableKey);
})();

// Types for Payment Components
export interface PaymentFormProps {
  clientSecret: string;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  amount?: number;
  currency?: SupportedCurrency;
  description?: string;
  metadata?: Record<string, string>;
  className?: string;
}

export interface StripeProviderWrapperProps {
  children: React.ReactNode;
  clientSecret: string;
  options?: Partial<StripeElementsOptions>;
}

export interface CreatePaymentIntentRequest {
  amount: number; // in euros, will be converted to cents
  currency?: SupportedCurrency;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentIntentResponse {
  clientSecret?: string;
  error?: string;
  paymentIntentId?: string;
}

/**
 * Stripe Elements Provider Wrapper
 * Provides Stripe context to child components
 */
export function StripeProviderWrapper({ 
  children, 
  clientSecret, 
  options = {} 
}: StripeProviderWrapperProps) {
  if (!stripePromise) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Stripe is not configured. Please add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  const stripeElementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
      rules: {
        '.Input': {
          borderColor: '#d1d5db',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        },
        '.Input:focus': {
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
      }
    },
    ...options,
  };

  return (
    <Elements stripe={stripePromise} options={stripeElementsOptions}>
      {children}
    </Elements>
  );
}

/**
 * Payment Form Component
 * Handles the payment submission flow with proper error handling
 */
function PaymentFormInner({ 
  onSuccess, 
  onError, 
  amount, 
  currency = 'eur', 
  description, 
  className 
}: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setMessage('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (error) {
        setMessage(error.message || 'An unexpected error occurred.');
        onError?.(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('Payment succeeded!');
        setIsComplete(true);
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setMessage(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Payment Element */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Payment Details
        </label>
        <div className="border rounded-lg p-4 bg-white">
          <PaymentElement 
            options={{
              layout: 'tabs',
              paymentMethodOrder: ['card', 'ideal', 'sepa_debit'],
            }}
          />
        </div>
      </div>

      {/* Amount Summary */}
      {amount && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Amount:</span>
            <span className="font-semibold">
              €{formatAmountForDisplay(amount, currency).toFixed(2)}
            </span>
          </div>
          {description && (
            <div className="text-sm text-gray-600">
              {description}
            </div>
          )}
        </div>
      )}

      {/* Status Message */}
      {message && (
        <Alert className={cn(
          isComplete 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        )}>
          {isComplete ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription className={isComplete ? 'text-green-800' : 'text-red-800'}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button 
        type="submit" 
        disabled={isLoading || !stripe || !elements || isComplete}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : isComplete ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Payment Complete
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Now
          </>
        )}
      </Button>

      {/* Security Notice */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <Shield className="h-4 w-4" />
        <span>Secured by Stripe</span>
      </div>
    </form>
  );
}

/**
 * Complete Payment Form Component
 * Includes both the Stripe provider and form
 */
export function PaymentForm(props: PaymentFormProps) {
  const { clientSecret, ...formProps } = props;

  if (!isStripeConfigured()) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          Payment processing is not available. Stripe configuration is missing.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <StripeProviderWrapper clientSecret={clientSecret}>
      <PaymentFormInner {...formProps} />
    </StripeProviderWrapper>
  );
}

/**
 * Payment Intent Creation Hook
 * Handles creating payment intents on the client side
 */
export function useCreatePaymentIntent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async (
    request: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'Failed to create payment intent';
        setError(errorMessage);
        return { error: errorMessage };
      }

      return {
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPaymentIntent,
    isLoading,
    error,
  };
}

/**
 * Payment Demo Component
 * For testing and demonstration purposes
 */
export function PaymentDemo() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createPaymentIntent } = useCreatePaymentIntent();

  const initializePayment = async () => {
    setIsLoading(true);
    
    const result = await createPaymentIntent({
      amount: 50, // €50 test payment
      currency: 'eur',
      description: 'Test Payment - Captain Premium Subscription',
      metadata: {
        demo: 'true',
        source: 'payment_demo',
      },
    });

    if (result.clientSecret) {
      setClientSecret(result.clientSecret);
    } else {
      console.error('Failed to create payment intent:', result.error);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (isStripeConfigured()) {
      initializePayment();
    }
  }, []);

  if (!isStripeConfigured()) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />
            Stripe Not Configured
          </CardTitle>
          <CardDescription>
            Payment processing is not available in this environment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            To enable payments, add the following environment variables:
            <ul className="mt-2 space-y-1">
              <li>• STRIPE_SECRET_KEY</li>
              <li>• NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
              <li>• STRIPE_WEBHOOK_SECRET</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment Demo</CardTitle>
        <CardDescription>
          Test the new Stripe Payment Elements integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Setting up payment...</span>
          </div>
        )}
        
        {clientSecret && (
          <Suspense fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          }>
            <PaymentForm
              clientSecret={clientSecret}
              amount={5000} // €50.00 in cents
              currency="eur"
              description="Captain Premium Subscription"
              onSuccess={(paymentIntent) => {
                console.log('Payment succeeded!', paymentIntent);
                alert('Payment successful! Check console for details.');
              }}
              onError={(error) => {
                console.error('Payment failed:', error);
                alert(`Payment failed: ${error}`);
              }}
            />
          </Suspense>
        )}
      </CardContent>
    </Card>
  );
}

// Export types for external use
export type { CreatePaymentIntentRequest, CreatePaymentIntentResponse };
