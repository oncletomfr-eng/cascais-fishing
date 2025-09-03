'use client';

/**
 * Styled Payment Elements Integration
 * Task 5.2: Payment Elements Integration with custom styling and validation
 * 
 * Production-ready Stripe Payment Elements with branded styling,
 * real-time validation, multiple payment methods, and mobile responsiveness
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Elements, 
  PaymentElement, 
  useStripe, 
  useElements, 
  LinkAuthenticationElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Shield, 
  CreditCard, 
  Smartphone, 
  Globe, 
  AlertCircle, 
  CheckCircle,
  Lock,
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getStripePublishableKey, 
  isStripeConfigured, 
  formatAmountForDisplay, 
  type SupportedCurrency,
  STRIPE_CONFIG 
} from '@/lib/stripe-config';

// Initialize Stripe
const stripePromise = (() => {
  const publishableKey = getStripePublishableKey();
  return publishableKey ? loadStripe(publishableKey) : null;
})();

// Types
export interface PaymentFormData {
  amount: number;
  currency: SupportedCurrency;
  description?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  billingRequired?: boolean;
  shippingRequired?: boolean;
}

export interface StyledPaymentElementsProps {
  clientSecret: string;
  formData: PaymentFormData;
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
  className?: string;
  appearance?: 'light' | 'dark' | 'auto';
  layout?: 'tabs' | 'accordion';
  allowedPaymentMethods?: string[];
  enableSavePaymentMethod?: boolean; // Task 5.5: Enable payment method saving
  onPaymentMethodSaved?: (paymentMethod: any) => void; // Callback when payment method is saved
}

export interface PaymentMethodIconProps {
  method: string;
  className?: string;
}

export interface PaymentStepperProps {
  currentStep: number;
  steps: string[];
}

export interface PaymentSummaryProps {
  formData: PaymentFormData;
  className?: string;
}

// Payment method icons mapping
const PAYMENT_METHOD_ICONS: Record<string, React.ReactElement> = {
  card: <CreditCard className="w-4 h-4" />,
  sepa_debit: <CreditCard className="w-4 h-4" />,
  ideal: <Globe className="w-4 h-4" />,
  bancontact: <CreditCard className="w-4 h-4" />,
  sofort: <Globe className="w-4 h-4" />,
  eps: <Globe className="w-4 h-4" />,
  giropay: <Globe className="w-4 h-4" />,
  p24: <Globe className="w-4 h-4" />,
  apple_pay: <Smartphone className="w-4 h-4" />,
  google_pay: <Smartphone className="w-4 h-4" />,
};

/**
 * Payment Method Icon Component
 */
export function PaymentMethodIcon({ method, className }: PaymentMethodIconProps) {
  const icon = PAYMENT_METHOD_ICONS[method] || <CreditCard className="w-4 h-4" />;
  
  return (
    <div className={cn("flex items-center justify-center", className)}>
      {React.cloneElement(icon, { 
        className: cn(icon.props.className, "text-gray-600") 
      })}
    </div>
  );
}

/**
 * Payment Progress Stepper
 */
export function PaymentStepper({ currentStep, steps }: PaymentStepperProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold transition-all",
            index < currentStep 
              ? "bg-green-500 border-green-500 text-white"
              : index === currentStep
              ? "bg-blue-500 border-blue-500 text-white"
              : "bg-gray-100 border-gray-300 text-gray-500"
          )}>
            {index < currentStep ? <CheckCircle className="w-4 h-4" /> : index + 1}
          </div>
          
          {index < steps.length - 1 && (
            <div className={cn(
              "h-0.5 w-16 mx-2 transition-colors",
              index < currentStep ? "bg-green-500" : "bg-gray-300"
            )} />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Payment Summary Component
 */
export function PaymentSummary({ formData, className }: PaymentSummaryProps) {
  const { amount, currency, description } = formData;
  const displayAmount = formatAmountForDisplay(amount, currency);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Payment Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Amount:</span>
          <span className="font-semibold text-lg">
            €{displayAmount.toFixed(2)}
          </span>
        </div>
        
        {description && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Description:</span>
            <br />
            {description}
          </div>
        )}
        
        <Separator />
        
        <div className="flex items-center space-x-2 text-sm text-green-700">
          <Shield className="w-4 h-4" />
          <span>Secure payment powered by Stripe</span>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {STRIPE_CONFIG.PAYMENT_METHODS.slice(0, 4).map((method) => (
            <PaymentMethodIcon 
              key={method} 
              method={method}
              className="p-2 border rounded-lg bg-gray-50"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Payment Elements Provider with Custom Styling
 */
export function StyledElementsProvider({ 
  children, 
  clientSecret, 
  appearance = 'light',
  allowedPaymentMethods
}: {
  children: React.ReactNode;
  clientSecret: string;
  appearance?: 'light' | 'dark' | 'auto';
  allowedPaymentMethods?: string[];
}) {
  const elementsOptions: StripeElementsOptions = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: appearance === 'auto' ? 'stripe' : appearance === 'dark' ? 'night' : 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: appearance === 'dark' ? '#1f2937' : '#ffffff',
        colorText: appearance === 'dark' ? '#f9fafb' : '#111827',
        colorDanger: '#ef4444',
        colorSuccess: '#10b981',
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
        focusBoxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        focusOutline: 'none',
      },
      rules: {
        '.Input': {
          borderColor: '#d1d5db',
          backgroundColor: appearance === 'dark' ? '#374151' : '#ffffff',
          fontSize: '16px',
          padding: '12px',
          transition: 'border-color 0.15s ease',
        },
        '.Input:focus': {
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
        },
        '.Input--invalid': {
          borderColor: '#ef4444',
          boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
        },
        '.Tab': {
          borderRadius: '6px',
          border: '1px solid #e5e7eb',
          backgroundColor: appearance === 'dark' ? '#374151' : '#f9fafb',
          transition: 'all 0.15s ease',
        },
        '.Tab:hover': {
          backgroundColor: appearance === 'dark' ? '#4b5563' : '#f3f4f6',
        },
        '.Tab--selected': {
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          color: '#ffffff',
        },
        '.Label': {
          fontWeight: '500',
          fontSize: '14px',
          color: appearance === 'dark' ? '#d1d5db' : '#374151',
        },
      }
    },
    paymentMethodOrder: allowedPaymentMethods || STRIPE_CONFIG.PAYMENT_METHODS as any,
  }), [clientSecret, appearance, allowedPaymentMethods]);

  if (!stripePromise) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Stripe is not properly configured. Payment processing is unavailable.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      {children}
    </Elements>
  );
}

/**
 * Enhanced Payment Form with Real-time Validation
 */
function EnhancedPaymentForm({ 
  formData, 
  onSuccess, 
  onError, 
  onProcessing, 
  layout = 'tabs',
  className,
  enableSavePaymentMethod = false,
  onPaymentMethodSaved
}: Omit<StyledPaymentElementsProps, 'clientSecret' | 'appearance' | 'allowedPaymentMethods'> & {
  layout?: 'tabs' | 'accordion';
}) {
  const stripe = useStripe();
  const elements = useElements();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [email, setEmail] = useState(formData.customerEmail || '');
  const [elementError, setElementError] = useState<string | null>(null);
  const [elementReady, setElementReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false); // Task 5.5: Save payment method state

  const steps = ['Payment Details', 'Review', 'Processing'];

  // Progress animation
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress(prev => prev >= 95 ? 95 : prev + 5);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isLoading]);

  // Update processing state
  useEffect(() => {
    onProcessing?.(isLoading);
  }, [isLoading, onProcessing]);

  // Handle form submission
  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setElementError('Stripe has not loaded yet. Please wait and try again.');
      return;
    }

    setIsLoading(true);
    setElementError(null);
    setCurrentStep(1);
    setProgress(10);

    try {
      // Confirm payment
      setCurrentStep(2);
      setProgress(50);
      
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
          receipt_email: email || undefined,
        },
      });

      if (error) {
        setElementError(error.message || 'Payment failed. Please try again.');
        onError?.(error.message || 'Payment failed');
        setCurrentStep(0);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setProgress(100);
        setIsComplete(true);
        setCurrentStep(2);
        
        // Task 5.5: Save payment method if requested
        if (savePaymentMethod && paymentIntent.payment_method) {
          try {
            const response = await fetch('/api/payment-methods', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                stripePaymentMethodId: paymentIntent.payment_method,
                billingName: email ? email.split('@')[0] : undefined,
                billingEmail: email || undefined,
              }),
            });
            
            const saveData = await response.json();
            if (saveData.success) {
              console.log('✅ Payment method saved:', saveData.paymentMethod);
              onPaymentMethodSaved?.(saveData.paymentMethod);
            } else {
              console.warn('⚠️ Failed to save payment method:', saveData.error);
            }
          } catch (saveError) {
            console.error('❌ Error saving payment method:', saveError);
            // Don't fail the payment success if saving fails
          }
        }
        
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setElementError(errorMessage);
      onError?.(errorMessage);
      setCurrentStep(0);
    } finally {
      setIsLoading(false);
    }
  }, [stripe, elements, email, onSuccess, onError]);

  // Reset form
  const handleReset = useCallback(() => {
    setIsComplete(false);
    setCurrentStep(0);
    setElementError(null);
    setProgress(0);
  }, []);

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Progress Stepper */}
      <PaymentStepper currentStep={currentStep} steps={steps} />
      
      {/* Progress Bar */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-center text-gray-600">
              Processing your payment securely...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Collection */}
      {!formData.customerEmail && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-gray-700">
              Email for Receipt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LinkAuthenticationElement 
              onChange={(event) => {
                setEmail(event.value.email);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Payment Element */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium text-gray-700">
            Payment Method
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement 
            options={{
              layout: {
                type: layout,
                defaultCollapsed: false,
                radios: false,
                spacedAccordionItems: true,
              },
              paymentMethodOrder: STRIPE_CONFIG.PAYMENT_METHODS as any,
              fields: {
                billingDetails: formData.billingRequired ? 'auto' : 'never',
              },
            }}
            onReady={() => setElementReady(true)}
            onChange={(event) => {
              if (event.error) {
                setElementError(event.error.message);
              } else {
                setElementError(null);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Address Collection (if required) */}
      {formData.shippingRequired && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-medium text-gray-700">
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AddressElement 
              options={{ 
                mode: 'shipping',
                allowedCountries: ['US', 'CA', 'GB', 'DE', 'FR', 'PT', 'ES', 'IT'], 
              }} 
            />
          </CardContent>
        </Card>
      )}

      {/* Save Payment Method Option - Task 5.5 */}
      {enableSavePaymentMethod && !isComplete && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="save-payment-method"
                checked={savePaymentMethod}
                onCheckedChange={(checked) => setSavePaymentMethod(checked === true)}
                className="mt-1"
              />
              <div className="grid gap-1.5 leading-none">
                <Label 
                  htmlFor="save-payment-method"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Save payment method for future use
                </Label>
                <p className="text-xs text-muted-foreground">
                  Securely save this payment method to make future purchases faster and more convenient.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <Shield className="h-3 w-3" />
              <span>Your payment details are encrypted and never stored by us</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      <AnimatePresence>
        {elementError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {elementError}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Message */}
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="flex items-center justify-center space-x-2 text-green-700">
              <CheckCircle className="w-8 h-8" />
              <span className="text-lg font-semibold">Payment Successful!</span>
            </div>
            <p className="text-gray-600">
              Your payment has been processed successfully. You should receive a confirmation email shortly.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleReset}
              className="mx-auto"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Process Another Payment
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Button */}
      {!isComplete && (
        <Button 
          type="submit" 
          disabled={isLoading || !stripe || !elementReady}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              <Lock className="mr-3 h-5 w-5" />
              Pay €{formatAmountForDisplay(formData.amount, formData.currency).toFixed(2)}
              <ArrowRight className="ml-3 h-5 w-5" />
            </>
          )}
        </Button>
      )}

      {/* Security Notice */}
      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
        <Shield className="h-4 w-4" />
        <span>256-bit SSL encrypted • PCI DSS compliant • Powered by Stripe</span>
      </div>
    </form>
  );
}

/**
 * Main Styled Payment Elements Component
 */
export function StyledPaymentElements({
  clientSecret,
  formData,
  onSuccess,
  onError,
  onProcessing,
  className,
  appearance = 'light',
  layout = 'tabs',
  allowedPaymentMethods,
  enableSavePaymentMethod = false,
  onPaymentMethodSaved
}: StyledPaymentElementsProps) {
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
    <div className={cn('max-w-2xl mx-auto', className)}>
      <StyledElementsProvider 
        clientSecret={clientSecret}
        appearance={appearance}
        allowedPaymentMethods={allowedPaymentMethods}
      >
        <div className="grid gap-6 md:grid-cols-5">
          {/* Payment Form */}
          <div className="md:col-span-3">
            <EnhancedPaymentForm
              formData={formData}
              onSuccess={onSuccess}
              onError={onError}
              onProcessing={onProcessing}
              layout={layout}
              enableSavePaymentMethod={enableSavePaymentMethod}
              onPaymentMethodSaved={onPaymentMethodSaved}
            />
          </div>
          
          {/* Payment Summary */}
          <div className="md:col-span-2">
            <div className="sticky top-6">
              <PaymentSummary formData={formData} />
            </div>
          </div>
        </div>
      </StyledElementsProvider>
    </div>
  );
}

// Export types for external use
export type { PaymentFormData };
export default StyledPaymentElements;
