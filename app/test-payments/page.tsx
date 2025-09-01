'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Grid,
  Button,
  Step,
  Stepper,
  StepLabel,
  Divider,
  Card,
  CardContent,
  Stack,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  CreditCard, 
  Shield, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Settings,
  Receipt,
  Lock
} from 'lucide-react';

// Import our payment components
import { EnhancedThemeProvider } from '@/components/design-system/EnhancedThemeProvider';
import PaymentMethodSelector, { PaymentMethodType } from '@/components/payment/PaymentMethodSelector';
import PriceDisplay from '@/components/payment/PriceDisplay';
import PaymentValidation, { 
  ValidatedField, 
  VALIDATION_RULES, 
  useFieldValidation 
} from '@/components/payment/PaymentValidation';
import PaymentLoadingStates, { 
  PaymentError, 
  NetworkStatus,
  PaymentState 
} from '@/components/payment/PaymentLoadingStates';
import { 
  StripeProvider, 
  PaymentElement, 
  usePaymentConfirmation 
} from '@/components/payment/StripeIntegration';
import { 
  AccessibilityProvider,
  AccessibilityControls,
  AccessibleFormField,
  VoiceAnnouncer,
  FocusTrap,
  useAccessibility
} from '@/components/payment/PaymentAccessibility';

// Demo configuration
const DEMO_CONFIG = {
  publishableKey: 'pk_test_demo_key', // Mock key for development
  subtotal: 49.99,
  currency: 'EUR',
  taxRates: [
    { name: 'VAT', rate: 21, type: 'vat' as const }
  ],
  processingFee: {
    percentage: 2.9,
    fixed: 0.30,
    currency: 'EUR'
  },
  discount: {
    amount: 5.00,
    code: 'DEMO5',
    description: '5€ off for demo users'
  }
};

const PAYMENT_STEPS = [
  'Payment Method',
  'Billing Details', 
  'Review & Pay',
  'Confirmation'
];

// Payment form component
function PaymentForm() {
  const { announce } = useAccessibility();
  
  // Payment state
  const [activeStep, setActiveStep] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentError, setPaymentError] = useState<any>(null);
  const [formValid, setFormValid] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Payment confirmation hook
  const { confirmPayment, state: confirmationState, isLoading } = usePaymentConfirmation();

  // Form validation
  const billingName = useFieldValidation('', [
    VALIDATION_RULES.required('Full name is required'),
    VALIDATION_RULES.fullName()
  ]);

  const billingEmail = useFieldValidation('demo@cascaisfishing.com', [
    VALIDATION_RULES.required('Email is required'),
    VALIDATION_RULES.email()
  ]);

  const billingAddress = useFieldValidation('123 Demo Street', [
    VALIDATION_RULES.required('Address is required')
  ]);

  const billingPostalCode = useFieldValidation('12345', [
    VALIDATION_RULES.required('Postal code is required'),
    VALIDATION_RULES.postalCode()
  ]);

  // Handle payment method selection
  const handleMethodChange = useCallback((method: PaymentMethodType) => {
    setSelectedMethod(method);
    announce(`Selected payment method: ${method.replace('_', ' ')}`);
  }, [announce]);

  // Handle form validation changes
  const handleValidationChange = useCallback((isValid: boolean, errors: Record<string, string>) => {
    setFormValid(isValid);
    setFormErrors(errors);
  }, []);

  // Navigation functions
  const handleNext = useCallback(() => {
    if (activeStep === PAYMENT_STEPS.length - 1) return;
    
    const nextStep = activeStep + 1;
    setActiveStep(nextStep);
    announce(`Moved to step ${nextStep + 1}: ${PAYMENT_STEPS[nextStep]}`);
  }, [activeStep, announce]);

  const handleBack = useCallback(() => {
    if (activeStep === 0) return;
    
    const prevStep = activeStep - 1;
    setActiveStep(prevStep);
    announce(`Moved to step ${prevStep + 1}: ${PAYMENT_STEPS[prevStep]}`);
  }, [activeStep, announce]);

  // Mock payment processing
  const handlePayment = useCallback(async () => {
    setPaymentState('validating');
    announce('Starting payment validation', 'assertive');

    // Simulate validation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setPaymentState('processing');
    announce('Processing payment securely');

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Mock success/failure
    const shouldFail = Math.random() < 0.2; // 20% failure rate for demo
    
    if (shouldFail) {
      setPaymentState('failed');
      setPaymentError({
        type: 'card_error',
        code: 'card_declined',
        message: 'Your card was declined. Please try a different payment method.',
        suggestion: 'Check your card details or try a different card',
        retryable: true
      });
      announce('Payment failed. Please review the error and try again.', 'assertive');
    } else {
      setPaymentState('success');
      announce('Payment completed successfully!', 'assertive');
      setTimeout(() => {
        setActiveStep(3); // Move to confirmation step
      }, 2000);
    }
  }, [announce]);

  // Retry payment
  const handleRetry = useCallback(() => {
    setPaymentState('idle');
    setPaymentError(null);
    announce('Ready to retry payment');
  }, [announce]);

  // Reset demo
  const resetDemo = useCallback(() => {
    setActiveStep(0);
    setPaymentState('idle');
    setPaymentError(null);
    billingName.setValue('');
    billingEmail.setValue('demo@cascaisfishing.com');
    billingAddress.setValue('123 Demo Street');
    billingPostalCode.setValue('12345');
    announce('Payment demo reset to beginning');
  }, [announce, billingName, billingEmail, billingAddress, billingPostalCode]);

  // Render step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Choose Your Payment Method
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select how you'd like to pay for your fishing trip booking.
            </Typography>
            
            <PaymentMethodSelector
              selectedMethod={selectedMethod}
              onMethodChange={handleMethodChange}
              availableMethods={['card', 'apple_pay', 'google_pay', 'paypal']}
              showProcessingFees={true}
              region="EU"
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Billing Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Enter your billing details for the payment.
            </Typography>

            <PaymentValidation 
              onValidationChange={handleValidationChange}
              showSecurityBadges={true}
            >
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <AccessibleFormField
                    id="billing-name"
                    label="Full Name"
                    required
                    error={!billingName.isValid && billingName.field.touched ? billingName.field.message : ''}
                    help="Enter your name as it appears on your card"
                  >
                    <ValidatedField
                      name="billing-name"
                      label="Full Name"
                      type="text"
                      rules={[VALIDATION_RULES.required(), VALIDATION_RULES.fullName()]}
                      placeholder="John Doe"
                      autoComplete="name"
                      icon={<CreditCard size={20} />}
                    />
                  </AccessibleFormField>
                </Grid>

                <Grid item xs={12}>
                  <AccessibleFormField
                    id="billing-email"
                    label="Email Address"
                    required
                    error={!billingEmail.isValid && billingEmail.field.touched ? billingEmail.field.message : ''}
                  >
                    <ValidatedField
                      name="billing-email"
                      label="Email Address"
                      type="email"
                      rules={[VALIDATION_RULES.required(), VALIDATION_RULES.email()]}
                      placeholder="john@example.com"
                      autoComplete="email"
                    />
                  </AccessibleFormField>
                </Grid>

                <Grid item xs={12} md={8}>
                  <AccessibleFormField
                    id="billing-address"
                    label="Address"
                    required
                    error={!billingAddress.isValid && billingAddress.field.touched ? billingAddress.field.message : ''}
                  >
                    <ValidatedField
                      name="billing-address"
                      label="Address"
                      type="text"
                      rules={[VALIDATION_RULES.required()]}
                      placeholder="123 Main Street"
                      autoComplete="street-address"
                    />
                  </AccessibleFormField>
                </Grid>

                <Grid item xs={12} md={4}>
                  <AccessibleFormField
                    id="billing-postal"
                    label="Postal Code"
                    required
                    error={!billingPostalCode.isValid && billingPostalCode.field.touched ? billingPostalCode.field.message : ''}
                  >
                    <ValidatedField
                      name="billing-postal"
                      label="Postal Code"
                      type="text"
                      rules={[VALIDATION_RULES.required(), VALIDATION_RULES.postalCode()]}
                      placeholder="12345"
                      autoComplete="postal-code"
                    />
                  </AccessibleFormField>
                </Grid>
              </Grid>
            </PaymentValidation>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Pay
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Review your payment details and complete the transaction.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Lock size={16} />
                    Secure Payment Details
                  </Typography>
                  
                  <PaymentElement
                    onReady={() => announce('Payment form loaded and ready')}
                    onChange={(event) => {
                      if (event.complete) {
                        announce('Payment details entered successfully');
                      }
                    }}
                  />
                </Paper>

                {paymentState !== 'idle' && (
                  <PaymentLoadingStates
                    state={paymentState}
                    onRetry={handleRetry}
                    errorDetails={paymentError}
                    showProgress={true}
                  />
                )}

                {paymentError && paymentState === 'failed' && (
                  <PaymentError
                    error={paymentError}
                    onRetry={handleRetry}
                    showDetails={true}
                  />
                )}
              </Grid>

              <Grid item xs={12} md={4}>
                <PriceDisplay
                  subtotal={DEMO_CONFIG.subtotal}
                  currency={DEMO_CONFIG.currency}
                  taxRates={DEMO_CONFIG.taxRates}
                  processingFee={DEMO_CONFIG.processingFee}
                  discount={DEMO_CONFIG.discount}
                  variant="detailed"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircle size={64} color="green" style={{ marginBottom: '16px' }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Payment Successful!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Thank you for your payment. Your fishing trip has been confirmed.
            </Typography>
            
            <Card sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Summary
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Transaction ID:</Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      demo_payment_123
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      €{(DEMO_CONFIG.subtotal * 1.21 + 2.2).toFixed(2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Method:</Typography>
                    <Typography variant="body2">
                      {selectedMethod.replace('_', ' ').toUpperCase()}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            <Button
              variant="contained"
              onClick={resetDemo}
              startIcon={<Receipt />}
              size="large"
            >
              Start New Demo
            </Button>
          </Box>
        );

      default:
        return null;
    }
  };

  const canProceed = useMemo(() => {
    switch (activeStep) {
      case 0: return selectedMethod !== null;
      case 1: return formValid;
      case 2: return paymentState === 'idle';
      default: return false;
    }
  }, [activeStep, selectedMethod, formValid, paymentState]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          Cascais Fishing Payment System
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Comprehensive Payment UI Components Demo
        </Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
          <Chip label="Stripe Integration" icon={<Shield />} color="primary" />
          <Chip label="WCAG 2.1 AA" icon={<CheckCircle />} color="success" />
          <Chip label="Real-time Validation" icon={<CreditCard />} color="info" />
        </Stack>
      </Box>

      {/* Network status */}
      <NetworkStatus />

      <Grid container spacing={4}>
        {/* Main payment flow */}
        <Grid item xs={12} lg={9}>
          <Paper sx={{ p: 4 }}>
            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {PAYMENT_STEPS.map((label, index) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ mb: 4 }} />

            {/* Step content */}
            <FocusTrap active={activeStep < 3}>
              {renderStepContent()}
            </FocusTrap>

            {/* Navigation */}
            {activeStep < 3 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                <Button
                  onClick={handleBack}
                  disabled={activeStep === 0}
                  startIcon={<ArrowLeft />}
                >
                  Back
                </Button>

                {activeStep === 2 ? (
                  <Button
                    variant="contained"
                    onClick={handlePayment}
                    disabled={!canProceed || isLoading}
                    size="large"
                    sx={{ minWidth: 150 }}
                  >
                    {isLoading ? 'Processing...' : 'Pay Now'}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!canProceed}
                    endIcon={<ArrowRight />}
                  >
                    Next
                  </Button>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Accessibility controls */}
        <Grid item xs={12} lg={3}>
          <AccessibilityControls />
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              Demo Features:
            </Typography>
            <Typography variant="body2" component="div">
              • Mock Stripe integration<br/>
              • Real-time form validation<br/>
              • Accessibility compliance<br/>
              • Loading states & error handling<br/>
              • Multi-currency support<br/>
              • Tax calculation<br/>
              • Voice announcements
            </Typography>
          </Alert>
        </Grid>
      </Grid>
    </Container>
  );
}

// Main demo page component
export default function PaymentDemoPage() {
  return (
    <EnhancedThemeProvider>
      <AccessibilityProvider>
        <StripeProvider 
          publishableKey={DEMO_CONFIG.publishableKey}
          options={{ locale: 'en' }}
        >
          <PaymentForm />
        </StripeProvider>
      </AccessibilityProvider>
    </EnhancedThemeProvider>
  );
}
