/**
 * Payment Intent Management Hook
 * Task 5.3: Complete Payment Intent lifecycle management
 * 
 * Comprehensive hook for handling payment intent creation, confirmation,
 * status tracking, cancellation, and retry logic with 3D Secure support
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useStripe } from '@stripe/react-stripe-js';

export interface PaymentIntentData {
  id: string;
  status: string;
  amount: number;
  currency: string;
  clientSecret: string;
  created: number;
  confirmationMethod?: string;
  nextAction?: any;
  lastPaymentError?: any;
}

export interface PaymentData {
  id: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  createdAt: string;
  paidAt?: string;
  commissionAmount?: number;
  commissionRate?: number;
}

export interface PaymentIntentState {
  // Core state
  paymentIntent: PaymentIntentData | null;
  payment: PaymentData | null;
  
  // Status flags
  isLoading: boolean;
  isCreating: boolean;
  isConfirming: boolean;
  isCancelling: boolean;
  isRetrying: boolean;
  isStatusPolling: boolean;
  
  // Error handling
  error: string | null;
  lastPaymentError: any;
  
  // Progress tracking
  progress: number;
  currentStep: 'idle' | 'creating' | 'confirming' | 'processing' | 'success' | 'error' | 'cancelled';
  
  // Status analysis
  canConfirm: boolean;
  canCancel: boolean;
  canRetry: boolean;
  requiresAction: boolean;
  isSuccessful: boolean;
  
  // Retry information
  retryCount: number;
  maxRetries: number;
}

export interface CreatePaymentIntentParams {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface ConfirmPaymentParams {
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
  returnUrl?: string;
}

export interface CancelPaymentParams {
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'abandoned';
  cancellationReason?: string;
}

export interface RetryPaymentParams {
  paymentMethodId?: string;
  savePaymentMethod?: boolean;
  returnUrl?: string;
  createNew?: boolean;
}

export interface UsePaymentIntentManagementOptions {
  onSuccess?: (paymentIntent: PaymentIntentData) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: string) => void;
  onStepChange?: (step: PaymentIntentState['currentStep']) => void;
  autoPolling?: boolean; // Auto-poll status for pending payments
  pollingInterval?: number; // Milliseconds
}

const initialState: PaymentIntentState = {
  paymentIntent: null,
  payment: null,
  isLoading: false,
  isCreating: false,
  isConfirming: false,
  isCancelling: false,
  isRetrying: false,
  isStatusPolling: false,
  error: null,
  lastPaymentError: null,
  progress: 0,
  currentStep: 'idle',
  canConfirm: false,
  canCancel: false,
  canRetry: false,
  requiresAction: false,
  isSuccessful: false,
  retryCount: 0,
  maxRetries: 5,
};

export function usePaymentIntentManagement(options: UsePaymentIntentManagementOptions = {}) {
  const {
    onSuccess,
    onError,
    onStatusChange,
    onStepChange,
    autoPolling = false,
    pollingInterval = 5000,
  } = options;

  const stripe = useStripe();
  const [state, setState] = useState<PaymentIntentState>(initialState);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Update state helper
  const updateState = useCallback((updates: Partial<PaymentIntentState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      
      // Trigger callbacks
      if (updates.error && onError) {
        onError(updates.error);
      }
      if (updates.currentStep && onStepChange && updates.currentStep !== prev.currentStep) {
        onStepChange(updates.currentStep);
      }
      if (updates.paymentIntent?.status && onStatusChange && updates.paymentIntent.status !== prev.paymentIntent?.status) {
        onStatusChange(updates.paymentIntent.status);
      }
      if (updates.paymentIntent?.status === 'succeeded' && !prev.isSuccessful && onSuccess) {
        onSuccess(updates.paymentIntent);
      }
      
      return newState;
    });
  }, [onSuccess, onError, onStatusChange, onStepChange]);

  // Analyze payment status
  const analyzeStatus = useCallback((paymentIntent: PaymentIntentData | null, payment: PaymentData | null) => {
    if (!paymentIntent) return {};

    const canConfirm = ['requires_payment_method', 'requires_confirmation'].includes(paymentIntent.status);
    const canCancel = ['requires_payment_method', 'requires_confirmation', 'requires_action'].includes(paymentIntent.status);
    const canRetry = payment ? ['FAILED', 'CANCELLED'].includes(payment.status) : false;
    const requiresAction = paymentIntent.status === 'requires_action';
    const isSuccessful = paymentIntent.status === 'succeeded';

    return {
      canConfirm,
      canCancel,
      canRetry,
      requiresAction,
      isSuccessful,
    };
  }, []);

  // Create Payment Intent
  const createPaymentIntent = useCallback(async (params: CreatePaymentIntentParams) => {
    if (!stripe) {
      throw new Error('Stripe has not been initialized');
    }

    cleanup();
    abortControllerRef.current = new AbortController();

    updateState({
      isLoading: true,
      isCreating: true,
      error: null,
      currentStep: 'creating',
      progress: 10,
    });

    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment intent');
      }

      const data = await response.json();
      
      const paymentIntent: PaymentIntentData = {
        id: data.paymentIntentId,
        status: 'requires_payment_method', // Initial status
        amount: params.amount * 100, // Convert to cents
        currency: params.currency || 'eur',
        clientSecret: data.clientSecret,
        created: Date.now() / 1000,
      };

      const analysisResult = analyzeStatus(paymentIntent, null);

      updateState({
        paymentIntent,
        isLoading: false,
        isCreating: false,
        currentStep: 'idle',
        progress: 30,
        ...analysisResult,
      });

      return {
        success: true,
        paymentIntent,
        clientSecret: data.clientSecret,
      };

    } catch (error: any) {
      if (error.name === 'AbortError') return { success: false, error: 'Request aborted' };

      const errorMessage = error.message || 'Failed to create payment intent';
      updateState({
        isLoading: false,
        isCreating: false,
        error: errorMessage,
        currentStep: 'error',
        progress: 0,
      });

      return { success: false, error: errorMessage };
    }
  }, [stripe, cleanup, updateState, analyzeStatus]);

  // Confirm Payment Intent
  const confirmPaymentIntent = useCallback(async (params: ConfirmPaymentParams = {}) => {
    if (!stripe || !state.paymentIntent) {
      throw new Error('Stripe not initialized or no payment intent available');
    }

    cleanup();
    abortControllerRef.current = new AbortController();

    updateState({
      isLoading: true,
      isConfirming: true,
      error: null,
      currentStep: 'confirming',
      progress: 50,
    });

    try {
      // Option 1: Use Stripe's confirmPayment (recommended for Payment Elements)
      if (stripe.confirmPayment) {
        const result = await stripe.confirmPayment({
          clientSecret: state.paymentIntent.clientSecret,
          confirmParams: {
            return_url: params.returnUrl || `${window.location.origin}/payment/success`,
          },
          redirect: 'if_required', // Handle 3D Secure inline if possible
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        const updatedPaymentIntent: PaymentIntentData = {
          ...state.paymentIntent,
          status: result.paymentIntent.status,
          confirmationMethod: result.paymentIntent.confirmation_method,
          nextAction: result.paymentIntent.next_action,
          lastPaymentError: result.paymentIntent.last_payment_error,
        };

        const analysisResult = analyzeStatus(updatedPaymentIntent, state.payment);

        updateState({
          paymentIntent: updatedPaymentIntent,
          isLoading: false,
          isConfirming: false,
          currentStep: result.paymentIntent.status === 'succeeded' ? 'success' : 'processing',
          progress: result.paymentIntent.status === 'succeeded' ? 100 : 80,
          lastPaymentError: result.paymentIntent.last_payment_error,
          ...analysisResult,
        });

        return { success: true, paymentIntent: updatedPaymentIntent };
      }

      // Option 2: Server-side confirmation API
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId: state.paymentIntent.id,
          ...params,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 3D Secure requirement
        if (response.status === 402 && data.requiresAction) {
          updateState({
            requiresAction: true,
            isLoading: false,
            isConfirming: false,
            currentStep: 'processing',
          });
          
          return { success: true, requiresAction: true, nextAction: data.nextAction };
        }

        throw new Error(data.error || 'Payment confirmation failed');
      }

      const updatedPaymentIntent: PaymentIntentData = data.paymentIntent;
      const analysisResult = analyzeStatus(updatedPaymentIntent, state.payment);

      updateState({
        paymentIntent: updatedPaymentIntent,
        isLoading: false,
        isConfirming: false,
        currentStep: updatedPaymentIntent.status === 'succeeded' ? 'success' : 'processing',
        progress: updatedPaymentIntent.status === 'succeeded' ? 100 : 80,
        ...analysisResult,
      });

      return { success: true, paymentIntent: updatedPaymentIntent };

    } catch (error: any) {
      if (error.name === 'AbortError') return { success: false, error: 'Request aborted' };

      const errorMessage = error.message || 'Payment confirmation failed';
      updateState({
        isLoading: false,
        isConfirming: false,
        error: errorMessage,
        currentStep: 'error',
        progress: 0,
      });

      return { success: false, error: errorMessage };
    }
  }, [stripe, state.paymentIntent, state.payment, cleanup, updateState, analyzeStatus]);

  // Get Payment Status
  const getPaymentStatus = useCallback(async (paymentId?: string) => {
    const targetId = paymentId || state.payment?.id || state.paymentIntent?.id;
    if (!targetId) {
      throw new Error('No payment ID available');
    }

    abortControllerRef.current = new AbortController();

    updateState({
      isStatusPolling: true,
      error: null,
    });

    try {
      const response = await fetch(`/api/payments/${targetId}/status`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get payment status');
      }

      const data = await response.json();
      const analysisResult = analyzeStatus(data.stripePaymentIntent, data.payment);

      updateState({
        paymentIntent: data.stripePaymentIntent,
        payment: data.payment,
        isStatusPolling: false,
        retryCount: ((data.payment?.metadata as any)?.retry_count || 0),
        ...analysisResult,
      });

      return { success: true, ...data };

    } catch (error: any) {
      if (error.name === 'AbortError') return { success: false, error: 'Request aborted' };

      const errorMessage = error.message || 'Failed to get payment status';
      updateState({
        isStatusPolling: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }, [state.payment?.id, state.paymentIntent?.id, updateState, analyzeStatus]);

  // Cancel Payment
  const cancelPayment = useCallback(async (params: CancelPaymentParams = {}) => {
    const targetId = state.payment?.id || state.paymentIntent?.id;
    if (!targetId) {
      throw new Error('No payment ID available');
    }

    abortControllerRef.current = new AbortController();

    updateState({
      isLoading: true,
      isCancelling: true,
      error: null,
      currentStep: 'processing',
    });

    try {
      const response = await fetch(`/api/payments/${targetId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel payment');
      }

      const data = await response.json();

      updateState({
        payment: data.payment ? { ...state.payment, ...data.payment } : state.payment,
        isLoading: false,
        isCancelling: false,
        currentStep: 'cancelled',
        canCancel: false,
        canRetry: true,
      });

      return { success: true, ...data };

    } catch (error: any) {
      if (error.name === 'AbortError') return { success: false, error: 'Request aborted' };

      const errorMessage = error.message || 'Failed to cancel payment';
      updateState({
        isLoading: false,
        isCancelling: false,
        error: errorMessage,
        currentStep: 'error',
      });

      return { success: false, error: errorMessage };
    }
  }, [state.payment, state.paymentIntent?.id, updateState]);

  // Retry Payment
  const retryPayment = useCallback(async (params: RetryPaymentParams = {}) => {
    const targetId = state.payment?.id || state.paymentIntent?.id;
    if (!targetId) {
      throw new Error('No payment ID available');
    }

    cleanup();
    abortControllerRef.current = new AbortController();

    updateState({
      isLoading: true,
      isRetrying: true,
      error: null,
      currentStep: 'creating',
      progress: 10,
    });

    try {
      const response = await fetch(`/api/payments/${targetId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to retry payment');
      }

      const data = await response.json();
      
      const updatedPaymentIntent: PaymentIntentData = data.paymentIntent;
      const analysisResult = analyzeStatus(updatedPaymentIntent, data.payment);

      updateState({
        paymentIntent: updatedPaymentIntent,
        payment: data.payment,
        isLoading: false,
        isRetrying: false,
        currentStep: 'idle',
        progress: 30,
        retryCount: data.payment?.retryCount || 0,
        ...analysisResult,
      });

      return { success: true, ...data };

    } catch (error: any) {
      if (error.name === 'AbortError') return { success: false, error: 'Request aborted' };

      const errorMessage = error.message || 'Failed to retry payment';
      updateState({
        isLoading: false,
        isRetrying: false,
        error: errorMessage,
        currentStep: 'error',
        progress: 0,
      });

      return { success: false, error: errorMessage };
    }
  }, [state.payment, state.paymentIntent?.id, cleanup, updateState, analyzeStatus]);

  // Auto-polling for status updates
  useEffect(() => {
    if (!autoPolling || !state.paymentIntent || state.isSuccessful) {
      return;
    }

    const shouldPoll = ['processing', 'requires_action'].includes(state.paymentIntent.status);
    
    if (shouldPoll) {
      pollingRef.current = setInterval(() => {
        getPaymentStatus();
      }, pollingInterval);

      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [autoPolling, state.paymentIntent, state.isSuccessful, pollingInterval, getPaymentStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Reset function
  const reset = useCallback(() => {
    cleanup();
    setState(initialState);
  }, [cleanup]);

  return {
    // State
    ...state,
    
    // Actions
    createPaymentIntent,
    confirmPaymentIntent,
    getPaymentStatus,
    cancelPayment,
    retryPayment,
    reset,
    
    // Utilities
    cleanup,
  };
}
