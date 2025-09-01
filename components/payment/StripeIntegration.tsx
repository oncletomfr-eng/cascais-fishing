'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useCallback, 
  useEffect,
  useMemo 
} from 'react';
import { styled } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Paper,
  Alert,
  Button,
  Stack,
  useTheme 
} from '@mui/material';
import { 
  CreditCard, 
  Shield, 
  Globe,
  Smartphone,
  AlertCircle
} from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';
import type { PaymentState } from './PaymentLoadingStates';
import type { PaymentMethodType } from './PaymentMethodSelector';

// Stripe types (mock for development - replace with actual Stripe types)
export interface MockStripeElement {
  mount: (element: string | HTMLElement) => void;
  unmount: () => void;
  on: (event: string, handler: (event: any) => void) => void;
  update: (options: any) => void;
  focus: () => void;
  blur: () => void;
  clear: () => void;
}

export interface MockStripe {
  elements: (options?: any) => MockElements;
  createToken: (element: MockStripeElement, data?: any) => Promise<{ token?: any; error?: any }>;
  createPaymentMethod: (data: any) => Promise<{ paymentMethod?: any; error?: any }>;
  confirmCardPayment: (clientSecret: string, data?: any) => Promise<{ paymentIntent?: any; error?: any }>;
  confirmPayment: (options: any) => Promise<{ paymentIntent?: any; error?: any }>;
}

export interface MockElements {
  create: (type: string, options?: any) => MockStripeElement;
  getElement: (type: string) => MockStripeElement | null;
}

// Stripe context types
export interface StripeContextValue {
  stripe: MockStripe | null;
  elements: MockElements | null;
  isLoaded: boolean;
  error: string | null;
}

export interface StripeProviderProps {
  children: React.ReactNode;
  publishableKey: string;
  options?: {
    locale?: string;
    appearance?: any;
    clientSecret?: string;
  };
}

export interface PaymentElementProps {
  onReady?: () => void;
  onChange?: (event: any) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
}

export interface PaymentIntentOptions {
  amount: number;
  currency: string;
  paymentMethodTypes?: string[];
  metadata?: Record<string, string>;
}

export interface ConfirmPaymentOptions {
  elements: MockElements;
  confirmParams?: {
    return_url?: string;
    payment_method_data?: any;
  };
  redirect?: 'always' | 'if_required';
}

// Mock Stripe implementation for development
class MockStripeImplementation implements MockStripe {
  elements(options?: any): MockElements {
    return new MockElementsImplementation();
  }

  async createToken(element: MockStripeElement, data?: any): Promise<{ token?: any; error?: any }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock token creation
    return {
      token: {
        id: 'tok_' + Math.random().toString(36).substr(2, 9),
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025
        }
      }
    };
  }

  async createPaymentMethod(data: any): Promise<{ paymentMethod?: any; error?: any }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return {
      paymentMethod: {
        id: 'pm_' + Math.random().toString(36).substr(2, 9),
        type: 'card',
        card: {
          brand: 'visa',
          last4: '4242'
        }
      }
    };
  }

  async confirmCardPayment(clientSecret: string, data?: any): Promise<{ paymentIntent?: any; error?: any }> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock successful payment
    return {
      paymentIntent: {
        id: 'pi_' + Math.random().toString(36).substr(2, 9),
        status: 'succeeded',
        amount: 2000,
        currency: 'eur'
      }
    };
  }

  async confirmPayment(options: any): Promise<{ paymentIntent?: any; error?: any }> {
    return this.confirmCardPayment('mock_client_secret', options);
  }
}

class MockElementsImplementation implements MockElements {
  private elements: Map<string, MockStripeElement> = new Map();

  create(type: string, options?: any): MockStripeElement {
    const element = new MockStripeElementImplementation(type, options);
    this.elements.set(type, element);
    return element;
  }

  getElement(type: string): MockStripeElement | null {
    return this.elements.get(type) || null;
  }
}

class MockStripeElementImplementation implements MockStripeElement {
  private type: string;
  private options: any;
  private mounted = false;
  private eventHandlers: Map<string, Function[]> = new Map();

  constructor(type: string, options?: any) {
    this.type = type;
    this.options = options || {};
  }

  mount(element: string | HTMLElement): void {
    this.mounted = true;
    // Mock mounting behavior
    console.log(`Mock Stripe ${this.type} element mounted`);
  }

  unmount(): void {
    this.mounted = false;
  }

  on(event: string, handler: (event: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  update(options: any): void {
    this.options = { ...this.options, ...options };
  }

  focus(): void {
    console.log(`${this.type} element focused`);
  }

  blur(): void {
    console.log(`${this.type} element blurred`);
  }

  clear(): void {
    console.log(`${this.type} element cleared`);
  }

  // Mock event triggering
  private triggerEvent(eventName: string, data: any): void {
    const handlers = this.eventHandlers.get(eventName) || [];
    handlers.forEach(handler => handler(data));
  }
}

// Stripe context
const StripeContext = createContext<StripeContextValue>({
  stripe: null,
  elements: null,
  isLoaded: false,
  error: null
});

// Styled components
const ElementContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  border: `2px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  backgroundColor: theme.palette.background.paper,
  '&:focus-within': {
    borderColor: theme.palette.primary.main,
    outline: `2px solid ${theme.palette.primary.main}20`
  }
}));

const SecurityNotice = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.success.light + '10',
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.success.light}40`,
  marginTop: theme.spacing(2)
}));

// Stripe provider component
export function StripeProvider({ children, publishableKey, options }: StripeProviderProps) {
  const [stripe, setStripe] = useState<MockStripe | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock Stripe loading
    const loadStripe = async () => {
      try {
        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For development, use mock implementation
        const mockStripe = new MockStripeImplementation();
        setStripe(mockStripe);
        setIsLoaded(true);
      } catch (err) {
        setError('Failed to load Stripe');
      }
    };

    loadStripe();
  }, [publishableKey]);

  const elements = useMemo(() => {
    return stripe?.elements(options) || null;
  }, [stripe, options]);

  const contextValue: StripeContextValue = {
    stripe,
    elements,
    isLoaded,
    error
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6" component="div" gutterBottom>
          Stripe Loading Error
        </Typography>
        {error}
      </Alert>
    );
  }

  return (
    <StripeContext.Provider value={contextValue}>
      {children}
    </StripeContext.Provider>
  );
}

// Custom hooks
export function useStripe(): MockStripe | null {
  const { stripe } = useContext(StripeContext);
  return stripe;
}

export function useElements(): MockElements | null {
  const { elements } = useContext(StripeContext);
  return elements;
}

export function useStripeState() {
  const context = useContext(StripeContext);
  return context;
}

// Payment element component
export function PaymentElement({
  onReady,
  onChange,
  onFocus,
  onBlur,
  className
}: PaymentElementProps) {
  const theme = useTheme();
  const elements = useElements();
  const [element, setElement] = useState<MockStripeElement | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (elements) {
      const paymentElement = elements.create('payment', {
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: theme.palette.primary.main,
            colorBackground: theme.palette.background.paper,
            colorText: theme.palette.text.primary,
            borderRadius: `${theme.shape.borderRadius * 2}px`
          }
        }
      });

      paymentElement.on('ready', () => {
        setIsReady(true);
        onReady?.();
      });

      paymentElement.on('change', (event) => {
        onChange?.(event);
      });

      paymentElement.on('focus', onFocus || (() => {}));
      paymentElement.on('blur', onBlur || (() => {}));

      setElement(paymentElement);

      // Mount element
      const container = document.getElementById('payment-element-container');
      if (container) {
        paymentElement.mount(container);
      }

      return () => {
        paymentElement.unmount();
      };
    }
  }, [elements, theme, onReady, onChange, onFocus, onBlur]);

  if (!elements) {
    return (
      <Alert severity="info">
        Loading payment form...
      </Alert>
    );
  }

  return (
    <Box className={className}>
      <ElementContainer>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Payment Details
        </Typography>
        
        <Box 
          id="payment-element-container"
          sx={{ 
            minHeight: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.palette.text.secondary,
            fontStyle: 'italic'
          }}
        >
          {!isReady && 'Loading secure payment form...'}
          {isReady && 'Mock Stripe Payment Element (Development)'}
        </Box>
      </ElementContainer>

      <SecurityNotice>
        <Shield size={16} color={theme.palette.success.main} />
        <Typography variant="caption" color="success.main">
          Your payment information is encrypted and secure
        </Typography>
      </SecurityNotice>
    </Box>
  );
}

// Payment method icons
const PAYMENT_METHOD_ICONS = {
  card: <CreditCard />,
  apple_pay: <Smartphone />,
  google_pay: <Smartphone />,
  paypal: <Globe />,
  sepa_debit: <CreditCard />,
  ideal: <CreditCard />
};

// Payment confirmation hook
export function usePaymentConfirmation() {
  const stripe = useStripe();
  const elements = useElements();
  const [state, setState] = useState<PaymentState>('idle');

  const confirmPayment = useCallback(async (clientSecret: string, options?: ConfirmPaymentOptions) => {
    if (!stripe || !elements) {
      throw new Error('Stripe not loaded');
    }

    setState('processing');

    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment/success',
          ...options?.confirmParams
        },
        redirect: options?.redirect || 'if_required'
      });

      if (result.error) {
        setState('failed');
        return { error: result.error };
      }

      setState('success');
      return { paymentIntent: result.paymentIntent };
    } catch (error) {
      setState('failed');
      return { error: { message: 'Payment confirmation failed' } };
    }
  }, [stripe, elements]);

  const reset = useCallback(() => {
    setState('idle');
  }, []);

  return {
    confirmPayment,
    state,
    reset,
    isLoading: ['processing', 'authenticating', 'confirming'].includes(state),
    isSuccess: state === 'success',
    isError: state === 'failed'
  };
}

// Payment intent creation utility
export async function createPaymentIntent(options: PaymentIntentOptions): Promise<{ clientSecret?: string; error?: string }> {
  try {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { error: data.error?.message || 'Failed to create payment intent' };
    }

    return { clientSecret: data.clientSecret };
  } catch (error) {
    return { error: 'Network error occurred' };
  }
}

// Export types
export type { StripeContextValue, PaymentElementProps, PaymentIntentOptions, ConfirmPaymentOptions };
