/**
 * Payment Flow Management Hook
 * Task 5.2: Advanced payment state management and validation
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useCreatePaymentIntent } from '@/components/payment/RealStripeIntegration';
import type { PaymentFormData } from '@/components/payment/StyledPaymentElements';
import type { SupportedCurrency } from '@/lib/stripe-config';

export type PaymentStep = 'setup' | 'payment' | 'processing' | 'success' | 'error';
export type PaymentMethodType = 'card' | 'sepa_debit' | 'ideal' | 'bancontact' | 'sofort' | 'eps' | 'giropay' | 'p24';

export interface PaymentFlowState {
  step: PaymentStep;
  isLoading: boolean;
  clientSecret: string | null;
  paymentIntent: any | null;
  error: string | null;
  progress: number;
  availablePaymentMethods: PaymentMethodType[];
  selectedPaymentMethod: PaymentMethodType | null;
  formData: PaymentFormData | null;
}

export interface PaymentFlowActions {
  initializePayment: (formData: PaymentFormData) => Promise<void>;
  updateFormData: (updates: Partial<PaymentFormData>) => void;
  setSelectedPaymentMethod: (method: PaymentMethodType) => void;
  setStep: (step: PaymentStep) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  reset: () => void;
  retry: () => Promise<void>;
}

export interface UsePaymentFlowOptions {
  onSuccess?: (paymentIntent: any) => void;
  onError?: (error: string) => void;
  onStepChange?: (step: PaymentStep) => void;
  defaultPaymentMethods?: PaymentMethodType[];
}

export interface UsePaymentFlowReturn {
  state: PaymentFlowState;
  actions: PaymentFlowActions;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodType[] = [
  'card', 
  'sepa_debit', 
  'ideal', 
  'bancontact', 
  'sofort'
];

const initialState: PaymentFlowState = {
  step: 'setup',
  isLoading: false,
  clientSecret: null,
  paymentIntent: null,
  error: null,
  progress: 0,
  availablePaymentMethods: DEFAULT_PAYMENT_METHODS,
  selectedPaymentMethod: null,
  formData: null,
};

/**
 * Advanced Payment Flow Management Hook
 * 
 * Manages the complete payment flow including:
 * - Payment intent creation
 * - State management
 * - Error handling
 * - Progress tracking
 * - Payment method selection
 */
export function usePaymentFlow(options: UsePaymentFlowOptions = {}): UsePaymentFlowReturn {
  const {
    onSuccess,
    onError,
    onStepChange,
    defaultPaymentMethods = DEFAULT_PAYMENT_METHODS
  } = options;

  const [state, setState] = useState<PaymentFlowState>({
    ...initialState,
    availablePaymentMethods: defaultPaymentMethods,
  });

  const { createPaymentIntent, isLoading: isCreatingIntent, error: intentError } = useCreatePaymentIntent();

  // Notify step changes
  useEffect(() => {
    onStepChange?.(state.step);
  }, [state.step, onStepChange]);

  // Handle payment intent creation errors
  useEffect(() => {
    if (intentError) {
      setState(prev => ({
        ...prev,
        error: intentError,
        step: 'error',
        isLoading: false,
      }));
      onError?.(intentError);
    }
  }, [intentError, onError]);

  // Actions
  const initializePayment = useCallback(async (formData: PaymentFormData) => {
    setState(prev => ({
      ...prev,
      formData,
      isLoading: true,
      error: null,
      step: 'setup',
      progress: 10,
    }));

    try {
      const result = await createPaymentIntent({
        amount: formData.amount,
        currency: formData.currency,
        description: formData.description,
        metadata: formData.metadata,
      });

      if (result.clientSecret) {
        setState(prev => ({
          ...prev,
          clientSecret: result.clientSecret!,
          step: 'payment',
          isLoading: false,
          progress: 30,
        }));
      } else {
        throw new Error(result.error || 'Failed to initialize payment');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment initialization failed';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        step: 'error',
        isLoading: false,
        progress: 0,
      }));
      onError?.(errorMessage);
    }
  }, [createPaymentIntent, onError]);

  const updateFormData = useCallback((updates: Partial<PaymentFormData>) => {
    setState(prev => ({
      ...prev,
      formData: prev.formData ? { ...prev.formData, ...updates } : null,
    }));
  }, []);

  const setSelectedPaymentMethod = useCallback((method: PaymentMethodType) => {
    setState(prev => ({
      ...prev,
      selectedPaymentMethod: method,
    }));
  }, []);

  const setStep = useCallback((step: PaymentStep) => {
    setState(prev => ({
      ...prev,
      step,
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error,
      step: error ? 'error' : prev.step,
    }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setState(prev => ({
      ...prev,
      progress: Math.max(0, Math.min(100, progress)),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      ...initialState,
      availablePaymentMethods: defaultPaymentMethods,
    });
  }, [defaultPaymentMethods]);

  const retry = useCallback(async () => {
    if (state.formData) {
      await initializePayment(state.formData);
    }
  }, [state.formData, initializePayment]);

  // Handle successful payment
  const handleSuccess = useCallback((paymentIntent: any) => {
    setState(prev => ({
      ...prev,
      paymentIntent,
      step: 'success',
      progress: 100,
      isLoading: false,
    }));
    onSuccess?.(paymentIntent);
  }, [onSuccess]);

  // Handle payment processing state
  const handleProcessing = useCallback((isProcessing: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: isProcessing,
      step: isProcessing ? 'processing' : prev.step,
      progress: isProcessing ? 70 : prev.progress,
    }));
  }, []);

  // Handle payment errors
  const handleError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      error,
      step: 'error',
      isLoading: false,
    }));
    onError?.(error);
  }, [onError]);

  // Combine isLoading states
  const combinedLoading = useMemo(() => 
    state.isLoading || isCreatingIntent,
    [state.isLoading, isCreatingIntent]
  );

  const actions: PaymentFlowActions = useMemo(() => ({
    initializePayment,
    updateFormData,
    setSelectedPaymentMethod,
    setStep,
    setError,
    setProgress,
    reset,
    retry,
  }), [
    initializePayment,
    updateFormData,
    setSelectedPaymentMethod,
    setStep,
    setError,
    setProgress,
    reset,
    retry,
  ]);

  // Enhanced state with additional computed properties
  const enhancedState: PaymentFlowState = useMemo(() => ({
    ...state,
    isLoading: combinedLoading,
  }), [state, combinedLoading]);

  return {
    state: enhancedState,
    actions: {
      ...actions,
      // Add the callback handlers for StyledPaymentElements
      handleSuccess,
      handleProcessing,
      handleError,
    } as any,
  };
}

/**
 * Payment Validation Hook
 * Provides real-time validation for payment forms
 */
export function usePaymentValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  const validateAmount = useCallback((amount: number): string | null => {
    if (amount <= 0) return 'Amount must be greater than zero';
    if (amount > 999999) return 'Amount is too large';
    return null;
  }, []);

  const validateCurrency = useCallback((currency: string): string | null => {
    const supportedCurrencies = ['eur', 'usd', 'gbp'];
    if (!supportedCurrencies.includes(currency.toLowerCase())) {
      return 'Currency not supported';
    }
    return null;
  }, []);

  const validateEmail = useCallback((email: string): string | null => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email';
    return null;
  }, []);

  const validate = useCallback((data: Partial<PaymentFormData> & { email?: string }) => {
    const newErrors: Record<string, string> = {};

    if (data.amount !== undefined) {
      const amountError = validateAmount(data.amount);
      if (amountError) newErrors.amount = amountError;
    }

    if (data.currency) {
      const currencyError = validateCurrency(data.currency);
      if (currencyError) newErrors.currency = currencyError;
    }

    if (data.email !== undefined) {
      const emailError = validateEmail(data.email);
      if (emailError) newErrors.email = emailError;
    }

    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0);

    return newErrors;
  }, [validateAmount, validateCurrency, validateEmail]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setIsValid(true);
  }, []);

  return {
    errors,
    isValid,
    validate,
    clearErrors,
    validateAmount,
    validateCurrency,
    validateEmail,
  };
}

/**
 * Payment Analytics Hook
 * Tracks payment events and analytics
 */
export function usePaymentAnalytics() {
  const [events, setEvents] = useState<Array<{
    timestamp: Date;
    event: string;
    data?: any;
  }>>([]);

  const trackEvent = useCallback((event: string, data?: any) => {
    const timestamp = new Date();
    setEvents(prev => [...prev, { timestamp, event, data }]);
    
    // In a real app, you'd send this to your analytics service
    console.log(`Payment Event: ${event}`, { timestamp, data });
  }, []);

  const getEventHistory = useCallback(() => events, [events]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    trackEvent,
    getEventHistory,
    clearEvents,
    events,
  };
}
