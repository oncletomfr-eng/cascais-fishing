'use client';

/**
 * Stripe Payment Elements Demo Page
 * Task 5.1 & 5.2: Testing the new real Stripe integration
 */

import React, { useState, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle, 
  DollarSign,
  Settings,
  Zap,
  Code2
} from 'lucide-react';
import { PaymentDemo, useCreatePaymentIntent } from '@/components/payment/RealStripeIntegration';
import { StyledPaymentElements, type PaymentFormData } from '@/components/payment/StyledPaymentElements';
import { PaymentMethodSelector } from '@/components/payment/PaymentMethodSelector';
import { PaymentLoading, PaymentSuccess, PaymentError, MobilePaymentHeader } from '@/components/payment/PaymentStateComponents';
import { usePaymentFlow, usePaymentValidation, usePaymentAnalytics, type PaymentMethodType } from '@/hooks/usePaymentFlow';
import { isStripeConfigured } from '@/lib/stripe-config';
import { useSession } from 'next-auth/react';

export default function StripeElementsTestPage() {
  const { data: session, status } = useSession();
  const [selectedAmount, setSelectedAmount] = useState(50);
  const [isConfigured] = useState(isStripeConfigured());
  
  const amounts = [
    { value: 20, label: '€20', description: 'Basic Tour' },
    { value: 50, label: '€50', description: 'Captain Premium' },
    { value: 100, label: '€100', description: 'Premium Tour' },
    { value: 200, label: '€200', description: 'VIP Experience' },
  ];

  if (status === 'loading') {
    return (
      <div className="container mx-auto py-8 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-yellow-500" />
              Authentication Required
            </CardTitle>
            <CardDescription>
              Please log in to test payment functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => window.location.href = '/auth/signin'}
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          🔧 Stripe Payment Elements Demo
        </h1>
        <p className="text-gray-600 mb-4">
          Task 5.1: Stripe SDK Configuration & Setup - Test Integration
        </p>
        
        {/* Configuration Status */}
        <div className="flex justify-center mb-6">
          <Badge 
            variant={isConfigured ? "default" : "destructive"} 
            className="px-3 py-1"
          >
            {isConfigured ? (
              <>
                <CheckCircle className="w-4 h-4 mr-1" />
                Stripe Configured
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 mr-1" />
                Stripe Not Configured
              </>
            )}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="demo" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="demo">
            <CreditCard className="w-4 h-4 mr-2" />
            Payment Demo
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="features">
            <Zap className="w-4 h-4 mr-2" />
            Features
          </TabsTrigger>
          <TabsTrigger value="debug">
            <Code2 className="w-4 h-4 mr-2" />
            Debug Info
          </TabsTrigger>
        </TabsList>

        {/* Payment Demo Tab */}
        <TabsContent value="demo" className="mt-6">
          <AdvancedPaymentDemo 
            selectedAmount={selectedAmount} 
            onAmountChange={setSelectedAmount}
            amounts={amounts}
          />
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ConfigurationStatus />
            <EnvironmentGuide />
          </div>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="mt-6">
          <FeaturesList />
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="mt-6">
          <DebugInformation session={session} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigurationStatus() {
  const isConfigured = isStripeConfigured();
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 
    'STRIPE_WEBHOOK_SECRET',
    'NEXTAUTH_URL',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldCheck className="mr-2 h-5 w-5" />
          Configuration Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requiredVars.map((varName) => {
            const isSet = typeof window === 'undefined' 
              ? Boolean(process.env[varName])
              : varName.startsWith('NEXT_PUBLIC_') 
                ? Boolean(process.env[varName])
                : true; // Can't check server-side vars from client
                
            return (
              <div key={varName} className="flex items-center justify-between">
                <span className="text-sm font-mono">{varName}</span>
                <Badge variant={isSet ? "default" : "destructive"}>
                  {isSet ? 'Set' : 'Missing'}
                </Badge>
              </div>
            );
          })}
        </div>
        
        <Separator className="my-4" />
        
        <div className="text-sm text-gray-600">
          <p className="font-semibold mb-2">Overall Status:</p>
          <p className={isConfigured ? 'text-green-700' : 'text-red-700'}>
            {isConfigured 
              ? '✅ Stripe is properly configured and ready to use'
              : '❌ Stripe configuration is incomplete'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EnvironmentGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Environment Setup Guide</CardTitle>
        <CardDescription>
          Required environment variables for Stripe integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          <div>
            <h4 className="font-semibold mb-2">1. Get your Stripe keys:</h4>
            <p className="text-gray-600 mb-2">
              Visit <a 
                href="https://dashboard.stripe.com/apikeys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Stripe Dashboard → API Keys
              </a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">2. Add to .env:</h4>
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXTAUTH_URL=http://localhost:3000`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">3. Restart development server</h4>
            <p className="text-gray-600">
              After adding the environment variables, restart your development server.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FeaturesList() {
  const features = [
    {
      title: 'Real Stripe Payment Elements',
      description: 'Modern embedded payment form with built-in validation',
      implemented: true,
    },
    {
      title: 'Payment Intent Management',
      description: 'Secure server-side payment intent creation and tracking',
      implemented: true,
    },
    {
      title: 'Customer Management',
      description: 'Automatic Stripe customer creation and association',
      implemented: true,
    },
    {
      title: 'Environment Validation',
      description: 'Comprehensive validation of Stripe configuration',
      implemented: true,
    },
    {
      title: 'Security Headers (CSP)',
      description: 'Content Security Policy headers for Stripe domains',
      implemented: true,
    },
    {
      title: 'Webhook Processing',
      description: 'Real-time webhook handling for payment events',
      implemented: false,
    },
    {
      title: 'Payment Method Storage',
      description: 'Save customer payment methods for future use',
      implemented: false,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {features.map((feature, index) => (
        <Card key={index}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{feature.title}</h3>
              <Badge variant={feature.implemented ? "default" : "secondary"}>
                {feature.implemented ? 'Complete' : 'Pending'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DebugInformation({ session }: { session: any }) {
  const debugInfo = {
    'User ID': session?.user?.id || 'N/A',
    'User Email': session?.user?.email || 'N/A',
    'Stripe Configured': isStripeConfigured() ? 'Yes' : 'No',
    'Environment': process.env.NODE_ENV || 'unknown',
    'Stripe Publishable Key': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...' || 'Not set',
    'Current URL': typeof window !== 'undefined' ? window.location.href : 'Server-side',
    'User Agent': typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug Information</CardTitle>
        <CardDescription>
          Technical details for troubleshooting
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="font-medium">{key}:</span>
              <span className="font-mono text-gray-600 break-all text-right max-w-xs">
                {value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Advanced Payment Demo with Full Integration
 */
function AdvancedPaymentDemo({ 
  selectedAmount, 
  onAmountChange, 
  amounts 
}: {
  selectedAmount: number;
  onAmountChange: (amount: number) => void;
  amounts: any[];
}) {
  const { data: session } = useSession();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [appearance, setAppearance] = useState<'light' | 'dark' | 'auto'>('light');
  const [layout, setLayout] = useState<'tabs' | 'accordion'>('tabs');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { state, actions } = usePaymentFlow({
    onSuccess: (paymentIntent) => {
      console.log('Payment succeeded:', paymentIntent);
      analytics.trackEvent('payment_success', { paymentIntent: paymentIntent.id });
    },
    onError: (error) => {
      console.error('Payment failed:', error);
      analytics.trackEvent('payment_error', { error });
    },
  });

  const validation = usePaymentValidation();
  const analytics = usePaymentAnalytics();

  // Initialize payment when amount or method changes
  const handleInitializePayment = async () => {
    if (!session?.user?.email) return;

    const formData: PaymentFormData = {
      amount: selectedAmount,
      currency: 'eur',
      description: `Test Payment - ${amounts.find(a => a.value === selectedAmount)?.description}`,
      customerEmail: session.user.email,
      metadata: {
        demo: 'true',
        source: 'advanced_payment_demo',
        selectedMethod: selectedMethod || 'not_selected',
      },
      billingRequired: showAdvanced,
      shippingRequired: false,
    };

    analytics.trackEvent('payment_initialized', { amount: selectedAmount, method: selectedMethod });
    await actions.initializePayment(formData);
  };

  if (state.step === 'processing') {
    return (
      <PaymentLoading 
        progress={state.progress}
        message="Processing your test payment..."
        step="Confirming payment with bank"
      />
    );
  }

  if (state.step === 'success') {
    return (
      <PaymentSuccess 
        paymentIntent={state.paymentIntent}
        onNewPayment={() => actions.reset()}
      />
    );
  }

  if (state.step === 'error') {
    return (
      <PaymentError 
        error={state.error!}
        onRetry={() => actions.retry()}
        onCancel={() => actions.reset()}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Header */}
      <div className="md:hidden">
        <MobilePaymentHeader 
          step={state.step}
          title="Payment Elements Demo"
        />
      </div>

      {/* Demo Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Configuration</CardTitle>
          <CardDescription>
            Configure the payment demo settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Selection */}
          <div className="space-y-3">
            <h4 className="font-medium">Payment Amount</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {amounts.map((amount) => (
                <Button
                  key={amount.value}
                  variant={selectedAmount === amount.value ? "default" : "outline"}
                  onClick={() => onAmountChange(amount.value)}
                  className="flex flex-col h-auto p-4"
                >
                  <span className="font-semibold">{amount.label}</span>
                  <span className="text-xs opacity-70">{amount.description}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Appearance & Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-medium">Appearance</h4>
              <div className="flex space-x-2">
                {(['light', 'dark', 'auto'] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={appearance === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAppearance(mode)}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium">Layout</h4>
              <div className="flex space-x-2">
                {(['tabs', 'accordion'] as const).map((layoutMode) => (
                  <Button
                    key={layoutMode}
                    variant={layout === layoutMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setLayout(layoutMode)}
                    className="capitalize"
                  >
                    {layoutMode}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="advanced"
                checked={showAdvanced}
                onChange={(e) => setShowAdvanced(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="advanced" className="text-sm font-medium">
                Advanced options (billing details, etc.)
              </label>
            </div>
          </div>

          {/* Initialize Button */}
          {!state.clientSecret && (
            <Button
              onClick={handleInitializePayment}
              disabled={state.isLoading}
              className="w-full"
              size="lg"
            >
              {state.isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up payment...
                </>
              ) : (
                <>
                  Initialize Payment (€{selectedAmount})
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      {state.step === 'setup' && state.clientSecret && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Method Selection</CardTitle>
            <CardDescription>
              Choose your preferred payment method before proceeding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodSelect={setSelectedMethod}
              layout="grid"
              showDetails={true}
            />
            
            {selectedMethod && (
              <div className="mt-4">
                <Button 
                  onClick={() => actions.setStep('payment')}
                  className="w-full"
                  size="lg"
                >
                  Continue with {selectedMethod.replace('_', ' ')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Styled Payment Elements */}
      {state.step === 'payment' && state.clientSecret && state.formData && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Form</CardTitle>
            <CardDescription>
              Complete your payment using the enhanced Stripe Payment Elements
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <StyledPaymentElements
              clientSecret={state.clientSecret}
              formData={state.formData}
              onSuccess={actions.handleSuccess as any}
              onError={actions.handleError as any}
              onProcessing={actions.handleProcessing as any}
              appearance={appearance}
              layout={layout}
              className="p-6"
            />
          </CardContent>
        </Card>
      )}

      {/* Analytics Debug */}
      {analytics.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Analytics</CardTitle>
            <CardDescription>
              Real-time tracking of payment events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {analytics.events.slice(-5).map((event, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b">
                  <span className="font-medium">{event.event}</span>
                  <span className="text-gray-500">
                    {event.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
