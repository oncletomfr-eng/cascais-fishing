/**
 * Payment State Components
 * Task 5.2: Loading states, animations, and responsive design
 * 
 * Components for different payment states with animations and mobile responsiveness
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ArrowLeft, 
  CreditCard,
  Shield,
  Clock,
  Zap,
  Wifi,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PaymentStep } from '@/hooks/usePaymentFlow';

export interface PaymentLoadingProps {
  progress?: number;
  message?: string;
  step?: string;
  className?: string;
}

export interface PaymentSuccessProps {
  paymentIntent?: any;
  onContinue?: () => void;
  onNewPayment?: () => void;
  className?: string;
}

export interface PaymentErrorProps {
  error: string;
  onRetry?: () => void;
  onCancel?: () => void;
  className?: string;
}

export interface PaymentTimeoutProps {
  onRetry?: () => void;
  onCancel?: () => void;
  remainingTime?: number;
  className?: string;
}

export interface MobilePaymentHeaderProps {
  step: PaymentStep;
  onBack?: () => void;
  title?: string;
  className?: string;
}

export interface PaymentStatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'timeout';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Payment Loading Component with Progress Animation
 */
export function PaymentLoading({ 
  progress = 0, 
  message = "Processing your payment...", 
  step = "Initializing",
  className 
}: PaymentLoadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("flex flex-col items-center justify-center p-8 space-y-6", className)}
    >
      {/* Animated Loading Icon */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-blue-500" />
        </motion.div>
        
        {/* Pulse Effect */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.3, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 w-12 h-12 bg-blue-500 rounded-full"
        />
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-gray-500">
          <span>{progress}%</span>
          <span>{step}</span>
        </div>
      </div>

      {/* Loading Message */}
      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-gray-800">{message}</p>
        <p className="text-sm text-gray-500">
          This may take a few moments. Please don't refresh the page.
        </p>
      </div>

      {/* Security Indicators */}
      <div className="flex items-center space-x-4 text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <Shield className="w-4 h-4 text-green-500" />
          <span>SSL Secured</span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className="w-4 h-4 text-blue-500" />
          <span>Real-time Processing</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Payment Success Component with Celebration Animation
 */
export function PaymentSuccess({ 
  paymentIntent, 
  onContinue, 
  onNewPayment, 
  className 
}: PaymentSuccessProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.6 }}
      className={cn("flex flex-col items-center justify-center p-8 space-y-6", className)}
    >
      {/* Success Animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.2, duration: 0.5 }}
        className="relative"
      >
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        
        {/* Success Ripple Effect */}
        <motion.div
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="absolute inset-0 w-20 h-20 bg-green-200 rounded-full"
        />
      </motion.div>

      {/* Success Message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-center space-y-2"
      >
        <h2 className="text-2xl font-bold text-gray-800">Payment Successful!</h2>
        <p className="text-gray-600">
          Your transaction has been processed successfully.
        </p>
      </motion.div>

      {/* Payment Details */}
      {paymentIntent && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-md"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700">
                Transaction Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-semibold">
                  €{(paymentIntent.amount / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Transaction ID:</span>
                <span className="text-xs font-mono text-gray-800">
                  {paymentIntent.id}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant="default" className="bg-green-100 text-green-800">
                  Completed
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-3 w-full max-w-md"
      >
        {onContinue && (
          <Button 
            onClick={onContinue} 
            className="flex-1"
            size="lg"
          >
            Continue
          </Button>
        )}
        {onNewPayment && (
          <Button 
            onClick={onNewPayment} 
            variant="outline" 
            className="flex-1"
            size="lg"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            New Payment
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * Payment Error Component with Retry Options
 */
export function PaymentError({ 
  error, 
  onRetry, 
  onCancel, 
  className 
}: PaymentErrorProps) {
  const getErrorIcon = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('network')) {
      return <WifiOff className="w-12 h-12 text-red-500" />;
    }
    if (errorMessage.toLowerCase().includes('timeout')) {
      return <Clock className="w-12 h-12 text-orange-500" />;
    }
    return <XCircle className="w-12 h-12 text-red-500" />;
  };

  const getErrorSuggestion = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('network')) {
      return "Please check your internet connection and try again.";
    }
    if (errorMessage.toLowerCase().includes('insufficient')) {
      return "Please check your account balance or try a different payment method.";
    }
    if (errorMessage.toLowerCase().includes('expired')) {
      return "Your card may have expired. Please check the expiration date.";
    }
    return "Please try again or contact support if the problem persists.";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("flex flex-col items-center justify-center p-8 space-y-6", className)}
    >
      {/* Error Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        {getErrorIcon(error)}
      </motion.div>

      {/* Error Message */}
      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-xl font-semibold text-gray-800">Payment Failed</h2>
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
        <p className="text-sm text-gray-600">
          {getErrorSuggestion(error)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {onRetry && (
          <Button 
            onClick={onRetry} 
            className="flex-1"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        {onCancel && (
          <Button 
            onClick={onCancel} 
            variant="outline" 
            className="flex-1"
            size="lg"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Support Info */}
      <div className="text-center text-sm text-gray-500">
        Need help?{' '}
        <a 
          href="/support" 
          className="text-blue-600 hover:underline"
        >
          Contact Support
        </a>
      </div>
    </motion.div>
  );
}

/**
 * Payment Timeout Component
 */
export function PaymentTimeout({ 
  onRetry, 
  onCancel, 
  remainingTime = 0, 
  className 
}: PaymentTimeoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center justify-center p-8 space-y-6", className)}
    >
      {/* Timeout Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
      >
        <Clock className="w-12 h-12 text-orange-500" />
      </motion.div>

      {/* Timeout Message */}
      <div className="text-center space-y-3">
        <h2 className="text-xl font-semibold text-gray-800">Payment Timed Out</h2>
        <p className="text-gray-600 max-w-md">
          The payment process took too long to complete. This is usually due to network issues or bank verification delays.
        </p>
        {remainingTime > 0 && (
          <p className="text-sm text-orange-600">
            Session expires in {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
        {onRetry && (
          <Button 
            onClick={onRetry} 
            className="flex-1"
            size="lg"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Payment
          </Button>
        )}
        {onCancel && (
          <Button 
            onClick={onCancel} 
            variant="outline" 
            className="flex-1"
            size="lg"
          >
            Cancel
          </Button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Mobile Payment Header
 */
export function MobilePaymentHeader({ 
  step, 
  onBack, 
  title, 
  className 
}: MobilePaymentHeaderProps) {
  const getStepTitle = (currentStep: PaymentStep) => {
    switch (currentStep) {
      case 'setup': return 'Payment Setup';
      case 'payment': return 'Payment Details';
      case 'processing': return 'Processing';
      case 'success': return 'Payment Complete';
      case 'error': return 'Payment Error';
      default: return 'Payment';
    }
  };

  return (
    <div className={cn(
      "sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 md:hidden",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {onBack && step !== 'processing' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onBack}
              className="p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="font-semibold text-gray-800">
              {title || getStepTitle(step)}
            </h1>
            <p className="text-xs text-gray-500 capitalize">
              Step: {step}
            </p>
          </div>
        </div>
        
        <PaymentStatusIndicator status={
          step === 'processing' || step === 'setup' ? 'loading' :
          step === 'success' ? 'success' :
          step === 'error' ? 'error' : 'idle'
        } size="sm" />
      </div>
    </div>
  );
}

/**
 * Payment Status Indicator
 */
export function PaymentStatusIndicator({ 
  status, 
  size = 'md', 
  className 
}: PaymentStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const getStatusDisplay = (currentStatus: typeof status) => {
    switch (currentStatus) {
      case 'loading':
        return {
          icon: <Loader2 className={cn(sizeClasses[size], "animate-spin text-blue-500")} />,
          color: 'text-blue-500',
        };
      case 'success':
        return {
          icon: <CheckCircle className={cn(sizeClasses[size], "text-green-500")} />,
          color: 'text-green-500',
        };
      case 'error':
        return {
          icon: <XCircle className={cn(sizeClasses[size], "text-red-500")} />,
          color: 'text-red-500',
        };
      case 'timeout':
        return {
          icon: <Clock className={cn(sizeClasses[size], "text-orange-500")} />,
          color: 'text-orange-500',
        };
      default:
        return {
          icon: <div className={cn(sizeClasses[size], "rounded-full bg-gray-300")} />,
          color: 'text-gray-500',
        };
    }
  };

  const { icon } = getStatusDisplay(status);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      {icon}
    </div>
  );
}

/**
 * Payment Step Indicator for Mobile
 */
export function MobilePaymentSteps({ 
  currentStep, 
  totalSteps = 3, 
  className 
}: {
  currentStep: number;
  totalSteps?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center space-x-2 py-4 md:hidden", className)}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <motion.div
          key={index}
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            index < currentStep 
              ? "bg-green-500 w-8"
              : index === currentStep
              ? "bg-blue-500 w-12"
              : "bg-gray-300 w-8"
          )}
          layoutId={`step-${index}`}
        />
      ))}
    </div>
  );
}
