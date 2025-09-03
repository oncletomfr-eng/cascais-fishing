/**
 * Payment Methods Management Hook
 * Task 5.5: Payment Method Storage & Management
 * 
 * React hook for managing saved payment methods with loading states,
 * error handling, and real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface PaymentMethod {
  id: string;
  stripePaymentMethodId: string;
  type: string;
  isDefault: boolean;
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  billingName?: string;
  billingEmail?: string;
  billingCountry?: string;
  billingCity?: string;
  billingPostalCode?: string;
  status: string;
  createdAt: string;
  lastUsedAt?: string;
  payments?: Array<{
    id: string;
    amount: number;
    currency: string;
    createdAt: string;
    description?: string;
  }>;
}

export interface UsePaymentMethodsOptions {
  autoLoad?: boolean;
  onUpdate?: () => void;
}

export interface UsePaymentMethodsReturn {
  // Data
  paymentMethods: PaymentMethod[];
  defaultPaymentMethod: PaymentMethod | null;
  
  // Loading states
  loading: boolean;
  saving: boolean;
  deleting: string | null;
  settingDefault: string | null;
  
  // Actions
  loadPaymentMethods: () => Promise<void>;
  savePaymentMethod: (stripePaymentMethodId: string, options?: {
    isDefault?: boolean;
    billingName?: string;
    billingEmail?: string;
  }) => Promise<PaymentMethod | null>;
  deletePaymentMethod: (paymentMethodId: string) => Promise<boolean>;
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<boolean>;
  getPaymentMethod: (paymentMethodId: string) => Promise<PaymentMethod | null>;
  
  // Utilities
  isCardExpired: (paymentMethod: PaymentMethod) => boolean;
  formatCardDisplay: (paymentMethod: PaymentMethod) => string;
  refresh: () => Promise<void>;
}

export function usePaymentMethods(options: UsePaymentMethodsOptions = {}): UsePaymentMethodsReturn {
  const { autoLoad = true, onUpdate } = options;
  const { toast } = useToast();
  
  // State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

  // Load payment methods from API
  const loadPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/payment-methods');
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.paymentMethods);
      } else {
        console.error('Failed to load payment methods:', data.error);
        toast({
          title: 'Error loading payment methods',
          description: data.error || 'Failed to load saved payment methods',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
      toast({
        title: 'Error loading payment methods',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Save a new payment method
  const savePaymentMethod = useCallback(async (
    stripePaymentMethodId: string,
    saveOptions: {
      isDefault?: boolean;
      billingName?: string;
      billingEmail?: string;
    } = {}
  ): Promise<PaymentMethod | null> => {
    try {
      setSaving(true);
      const response = await fetch('/api/payment-methods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripePaymentMethodId,
          ...saveOptions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Payment method saved',
          description: 'Your payment method has been saved successfully',
        });
        
        await loadPaymentMethods(); // Refresh the list
        onUpdate?.();
        
        return data.paymentMethod;
      } else {
        console.error('Failed to save payment method:', data.error);
        toast({
          title: 'Failed to save payment method',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
        return null;
      }
    } catch (error) {
      console.error('Error saving payment method:', error);
      toast({
        title: 'Error saving payment method',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [toast, loadPaymentMethods, onUpdate]);

  // Delete a payment method
  const deletePaymentMethod = useCallback(async (paymentMethodId: string): Promise<boolean> => {
    try {
      setDeleting(paymentMethodId);
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Payment method deleted',
          description: 'The payment method has been removed from your account',
        });
        
        await loadPaymentMethods(); // Refresh the list
        onUpdate?.();
        
        return true;
      } else {
        console.error('Failed to delete payment method:', data.error);
        toast({
          title: 'Failed to delete payment method',
          description: data.error || data.details || 'Please try again',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast({
        title: 'Error deleting payment method',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setDeleting(null);
    }
  }, [toast, loadPaymentMethods, onUpdate]);

  // Set a payment method as default
  const setDefaultPaymentMethod = useCallback(async (paymentMethodId: string): Promise<boolean> => {
    try {
      setSettingDefault(paymentMethodId);
      const response = await fetch(`/api/payment-methods/${paymentMethodId}/set-default`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Default payment method updated',
          description: 'Your default payment method has been changed',
        });
        
        await loadPaymentMethods(); // Refresh the list
        onUpdate?.();
        
        return true;
      } else {
        console.error('Failed to set default payment method:', data.error);
        toast({
          title: 'Failed to set default',
          description: data.error || 'Please try again',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast({
        title: 'Error setting default',
        description: 'Please check your connection and try again',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSettingDefault(null);
    }
  }, [toast, loadPaymentMethods, onUpdate]);

  // Get a specific payment method
  const getPaymentMethod = useCallback(async (paymentMethodId: string): Promise<PaymentMethod | null> => {
    try {
      const response = await fetch(`/api/payment-methods/${paymentMethodId}`);
      const data = await response.json();

      if (data.success) {
        return data.paymentMethod;
      } else {
        console.error('Failed to get payment method:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error getting payment method:', error);
      return null;
    }
  }, []);

  // Utility: Check if card is expired
  const isCardExpired = useCallback((paymentMethod: PaymentMethod): boolean => {
    if (!paymentMethod.cardExpMonth || !paymentMethod.cardExpYear) return false;
    
    const now = new Date();
    const expiry = new Date(paymentMethod.cardExpYear, paymentMethod.cardExpMonth - 1);
    return expiry < now;
  }, []);

  // Utility: Format card for display
  const formatCardDisplay = useCallback((paymentMethod: PaymentMethod): string => {
    const brand = paymentMethod.cardBrand 
      ? paymentMethod.cardBrand.charAt(0).toUpperCase() + paymentMethod.cardBrand.slice(1).toLowerCase()
      : 'Card';
    
    const last4 = paymentMethod.cardLast4 || '****';
    
    return `${brand} •••• ${last4}`;
  }, []);

  // Refresh (alias for loadPaymentMethods)
  const refresh = useCallback(() => {
    return loadPaymentMethods();
  }, [loadPaymentMethods]);

  // Computed values
  const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || null;

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadPaymentMethods();
    }
  }, [autoLoad, loadPaymentMethods]);

  return {
    // Data
    paymentMethods,
    defaultPaymentMethod,
    
    // Loading states
    loading,
    saving,
    deleting,
    settingDefault,
    
    // Actions
    loadPaymentMethods,
    savePaymentMethod,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    getPaymentMethod,
    
    // Utilities
    isCardExpired,
    formatCardDisplay,
    refresh,
  };
}
