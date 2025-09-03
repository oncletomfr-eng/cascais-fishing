/**
 * Payment Methods Management Demo Page
 * Task 5.5: Payment Method Storage & Management - Demo
 * 
 * Comprehensive testing interface for payment method management features
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import StyledPaymentElements from '@/components/payment/StyledPaymentElements';
import { SavedPaymentMethods } from '@/components/payment/SavedPaymentMethods';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useToast } from '@/hooks/use-toast';
import {
  CreditCard,
  User,
  TestTube,
  Shield,
  Star,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Lock
} from 'lucide-react';

const TEST_AMOUNTS = [
  { value: 2000, label: '€20.00', description: 'Small test payment' },
  { value: 5000, label: '€50.00', description: 'Medium test payment' },
  { value: 10000, label: '€100.00', description: 'Large test payment' },
];

export default function PaymentMethodsTestPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const paymentMethods = usePaymentMethods({
    autoLoad: true,
    onUpdate: () => {
      toast({
        title: 'Payment methods updated',
        description: 'Your saved payment methods have been refreshed',
      });
    }
  });

  // State for payment demo
  const [selectedAmount, setSelectedAmount] = useState(TEST_AMOUNTS[0].value);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Create payment intent for testing
  const createPaymentIntent = useCallback(async (amount: number) => {
    try {
      setPaymentLoading(true);
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'eur',
          description: `Payment Methods Test - €${(amount / 100).toFixed(2)}`,
          metadata: {
            test: 'payment_methods_demo',
            amount: amount.toString(),
          }
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setClientSecret(data.clientSecret);
        toast({
          title: 'Payment intent created',
          description: 'Ready for payment with save option',
        });
      } else {
        throw new Error(data.error || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast({
        title: 'Error creating payment intent',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setPaymentLoading(false);
    }
  }, [toast]);

  // Handle successful payment
  const handlePaymentSuccess = useCallback((paymentIntent: any) => {
    console.log('Payment successful:', paymentIntent);
    setPaymentSuccess(true);
    setClientSecret(null);
    
    toast({
      title: 'Payment successful!',
      description: `Payment of €${(paymentIntent.amount / 100).toFixed(2)} completed`,
    });
    
    // Refresh payment methods to show newly saved method
    paymentMethods.refresh();
  }, [toast, paymentMethods]);

  // Handle payment method saved
  const handlePaymentMethodSaved = useCallback((paymentMethod: any) => {
    console.log('Payment method saved:', paymentMethod);
    toast({
      title: 'Payment method saved',
      description: `${paymentMethod.cardBrand} •••• ${paymentMethod.cardLast4} has been saved`,
    });
  }, [toast]);

  // Reset payment demo
  const resetPaymentDemo = useCallback(() => {
    setPaymentSuccess(false);
    setClientSecret(null);
  }, []);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="max-w-4xl mx-auto pt-20">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to test payment methods management.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 pt-8">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Payment Methods Management
              </h1>
              <p className="text-muted-foreground">
                Task 5.5 Demo - Test payment method saving, management, and PCI compliant display
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>Testing as: {session.user?.email}</span>
          </div>
        </div>

        <Separator />

        {/* Main Content */}
        <Tabs defaultValue="saved" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Saved Methods
            </TabsTrigger>
            <TabsTrigger value="demo" className="flex items-center gap-2">
              <TestTube className="h-4 w-4" />
              Payment Demo
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Statistics
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Saved Payment Methods Tab */}
          <TabsContent value="saved" className="space-y-6">
            <SavedPaymentMethods 
              onRefresh={paymentMethods.refresh}
              enableAddNew={true}
              onAddNew={() => {
                toast({
                  title: 'Add new payment method',
                  description: 'Use the Payment Demo tab to add a new payment method during checkout',
                });
              }}
            />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>
                  Manage your payment methods
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button 
                    onClick={paymentMethods.refresh}
                    disabled={paymentMethods.loading}
                    variant="outline"
                  >
                    {paymentMethods.loading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const count = paymentMethods.paymentMethods.length;
                      toast({
                        title: 'Payment Methods Summary',
                        description: `You have ${count} saved payment method${count !== 1 ? 's' : ''}`,
                      });
                    }}
                  >
                    Show Summary
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Demo Tab */}
          <TabsContent value="demo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Payment Method Saving Demo
                </CardTitle>
                <CardDescription>
                  Test payment processing with the option to save payment methods for future use
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!clientSecret && !paymentSuccess ? (
                  <div className="space-y-6">
                    {/* Amount Selection */}
                    <div className="space-y-3">
                      <h3 className="font-medium">Select Test Amount</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {TEST_AMOUNTS.map((amount) => (
                          <Button
                            key={amount.value}
                            variant={selectedAmount === amount.value ? "default" : "outline"}
                            onClick={() => setSelectedAmount(amount.value)}
                            className="flex flex-col items-center p-4 h-auto"
                          >
                            <span className="text-lg font-bold">{amount.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {amount.description}
                            </span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <Button 
                      onClick={() => createPaymentIntent(selectedAmount)}
                      disabled={paymentLoading}
                      size="lg"
                      className="w-full"
                    >
                      {paymentLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Creating Payment Intent...
                        </>
                      ) : (
                        <>
                          <Lock className="h-5 w-5 mr-2" />
                          Create Payment Intent for {TEST_AMOUNTS.find(a => a.value === selectedAmount)?.label}
                        </>
                      )}
                    </Button>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This will create a test payment with the option to save the payment method. 
                        Use test card 4242 4242 4242 4242 with any future date and CVV.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : paymentSuccess ? (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center space-x-2 text-green-700">
                      <CheckCircle className="w-8 h-8" />
                      <span className="text-xl font-semibold">Payment Successful!</span>
                    </div>
                    <p className="text-muted-foreground">
                      Your test payment was processed successfully. Check the Saved Methods tab to see if the payment method was saved.
                    </p>
                    <Button onClick={resetPaymentDemo} variant="outline">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Test Another Payment
                    </Button>
                  </div>
                ) : (
                  <StyledPaymentElements
                    clientSecret={clientSecret}
                    formData={{
                      amount: selectedAmount,
                      currency: 'eur',
                      description: `Payment Methods Test - €${(selectedAmount / 100).toFixed(2)}`,
                      customerEmail: session.user?.email || undefined,
                    }}
                    onSuccess={handlePaymentSuccess}
                    onError={(error) => {
                      console.error('Payment error:', error);
                      toast({
                        title: 'Payment failed',
                        description: error,
                        variant: 'destructive',
                      });
                      setClientSecret(null);
                    }}
                    enableSavePaymentMethod={true}
                    onPaymentMethodSaved={handlePaymentMethodSaved}
                    appearance="light"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="statistics" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Methods
                  </CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{paymentMethods.paymentMethods.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Saved payment methods
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Default Method
                  </CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {paymentMethods.defaultPaymentMethod ? '1' : '0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paymentMethods.defaultPaymentMethod 
                      ? paymentMethods.formatCardDisplay(paymentMethods.defaultPaymentMethod)
                      : 'No default set'
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Methods
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {paymentMethods.paymentMethods.filter(pm => pm.status === 'ACTIVE').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ready for use
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Expired Cards
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {paymentMethods.paymentMethods.filter(pm => 
                      paymentMethods.isCardExpired(pm)
                    ).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Need updating
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Compliance
                </CardTitle>
                <CardDescription>
                  How we protect your payment information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      PCI DSS Compliant
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      We never store your full card details. Only the last 4 digits and expiration date are kept for display.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Stripe Secure Vault
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      All sensitive payment data is securely stored by Stripe, a Level 1 PCI-certified provider.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Encrypted Transmission
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      All data is transmitted using 256-bit SSL encryption to prevent interception.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Secure Deletion
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      When you delete a payment method, it's permanently removed from both our system and Stripe.
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">What We Store</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Last 4 digits of card number</li>
                    <li>• Card brand (Visa, MasterCard, etc.)</li>
                    <li>• Expiration month and year</li>
                    <li>• Billing name and address (if provided)</li>
                    <li>• Card fingerprint (unique identifier)</li>
                  </ul>
                  
                  <h4 className="font-medium mb-2 mt-4">What We Never Store</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Full card number</li>
                    <li>• CVV/CVC security code</li>
                    <li>• PIN numbers</li>
                    <li>• Any authentication credentials</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
