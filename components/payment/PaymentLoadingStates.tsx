'use client';

import React, { useState, useEffect } from 'react';
import { styled, keyframes } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Button,
  CircularProgress,
  LinearProgress,
  Alert,
  AlertTitle,
  Dialog,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Stack,
  Chip,
  IconButton,
  Collapse,
  Fade,
  useTheme
} from '@mui/material';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  CreditCard,
  Shield,
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight
} from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';

// Payment states
export type PaymentState = 
  | 'idle'
  | 'validating'
  | 'processing'
  | 'authenticating'
  | 'confirming'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'requires_action';

export interface PaymentLoadingProps {
  state: PaymentState;
  progress?: number;
  message?: string;
  errorDetails?: {
    code?: string;
    message: string;
    suggestion?: string;
    retryable?: boolean;
  };
  onRetry?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  showProgress?: boolean;
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
}

export interface PaymentErrorProps {
  error: {
    type: 'card_error' | 'network_error' | 'validation_error' | 'server_error' | 'unknown_error';
    code?: string;
    message: string;
    suggestion?: string;
    retryable?: boolean;
  };
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  className?: string;
}

// Keyframe animations
const spinAnimation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
`;

const slideInAnimation = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// Styled components
const LoadingCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[3],
  animation: `${slideInAnimation} 0.3s ease-out`
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2)
}));

const SpinningIcon = styled(Box)(() => ({
  animation: `${spinAnimation} 2s linear infinite`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const PulsingIcon = styled(Box)(() => ({
  animation: `${pulseAnimation} 2s ease-in-out infinite`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: '0.75rem',
  fontWeight: 500
}));

const ErrorDetails = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.error.light + '10',
  border: `1px solid ${theme.palette.error.light}40`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(2),
  marginTop: theme.spacing(2)
}));

// Payment state configurations
const PAYMENT_STATES = {
  idle: {
    icon: <CreditCard />,
    color: 'info' as const,
    title: 'Ready to Pay',
    message: 'Review your payment details and proceed'
  },
  validating: {
    icon: <SpinningIcon><Loader2 size={20} /></SpinningIcon>,
    color: 'info' as const,
    title: 'Validating Payment',
    message: 'Checking payment details...'
  },
  processing: {
    icon: <SpinningIcon><Loader2 size={20} /></SpinningIcon>,
    color: 'primary' as const,
    title: 'Processing Payment',
    message: 'Your payment is being processed securely'
  },
  authenticating: {
    icon: <PulsingIcon><Shield size={20} /></PulsingIcon>,
    color: 'warning' as const,
    title: '3D Secure Authentication',
    message: 'Complete authentication with your bank'
  },
  confirming: {
    icon: <SpinningIcon><Clock size={20} /></SpinningIcon>,
    color: 'info' as const,
    title: 'Confirming Payment',
    message: 'Finalizing your transaction...'
  },
  success: {
    icon: <CheckCircle size={20} />,
    color: 'success' as const,
    title: 'Payment Successful',
    message: 'Your payment has been processed successfully'
  },
  failed: {
    icon: <XCircle size={20} />,
    color: 'error' as const,
    title: 'Payment Failed',
    message: 'There was an issue processing your payment'
  },
  cancelled: {
    icon: <AlertCircle size={20} />,
    color: 'warning' as const,
    title: 'Payment Cancelled',
    message: 'The payment process was cancelled'
  },
  requires_action: {
    icon: <PulsingIcon><ArrowRight size={20} /></PulsingIcon>,
    color: 'warning' as const,
    title: 'Action Required',
    message: 'Additional verification is required'
  }
};

// Error type configurations
const ERROR_CONFIGS = {
  card_error: {
    icon: <CreditCard />,
    color: 'error' as const,
    title: 'Card Error',
    defaultMessage: 'There was an issue with your card'
  },
  network_error: {
    icon: <WifiOff />,
    color: 'warning' as const,
    title: 'Connection Error',
    defaultMessage: 'Please check your internet connection'
  },
  validation_error: {
    icon: <AlertCircle />,
    color: 'warning' as const,
    title: 'Validation Error',
    defaultMessage: 'Please check your payment details'
  },
  server_error: {
    icon: <XCircle />,
    color: 'error' as const,
    title: 'Server Error',
    defaultMessage: 'A server error occurred. Please try again'
  },
  unknown_error: {
    icon: <AlertCircle />,
    color: 'error' as const,
    title: 'Unknown Error',
    defaultMessage: 'An unexpected error occurred'
  }
};

// Payment loading component
export default function PaymentLoadingStates({
  state,
  progress,
  message,
  errorDetails,
  onRetry,
  onCancel,
  onClose,
  showProgress = true,
  autoClose = false,
  autoCloseDelay = 3000,
  className
}: PaymentLoadingProps) {
  const theme = useTheme();
  const { themes } = useDesignSystem();
  const [showDetails, setShowDetails] = useState(false);
  
  const stateConfig = PAYMENT_STATES[state];
  
  // Auto-close for success state
  useEffect(() => {
    if (autoClose && state === 'success' && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [state, autoClose, autoCloseDelay, onClose]);

  // Calculate progress based on state
  const getProgress = () => {
    if (progress !== undefined) return progress;
    
    switch (state) {
      case 'validating': return 20;
      case 'processing': return 60;
      case 'authenticating': return 80;
      case 'confirming': return 90;
      case 'success': return 100;
      default: return 0;
    }
  };

  const isLoading = ['validating', 'processing', 'authenticating', 'confirming'].includes(state);
  const isComplete = ['success', 'failed', 'cancelled'].includes(state);

  return (
    <LoadingCard className={className}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="flex-start" spacing={3}>
          {/* Icon */}
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: `${theme.palette[stateConfig.color].main}12`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.palette[stateConfig.color].main,
              flexShrink: 0
            }}
          >
            {stateConfig.icon}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                {stateConfig.title}
              </Typography>
              
              <StatusChip
                label={state.replace('_', ' ')}
                color={stateConfig.color}
                variant="outlined"
                size="small"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {message || stateConfig.message}
            </Typography>

            {/* Progress */}
            {showProgress && isLoading && (
              <ProgressContainer>
                <LinearProgress
                  variant="determinate"
                  value={getProgress()}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.palette.divider,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: theme.palette[stateConfig.color].main
                    }
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {getProgress()}%
                </Typography>
              </ProgressContainer>
            )}

            {/* Error details */}
            {state === 'failed' && errorDetails && (
              <Box sx={{ mt: 2 }}>
                <Button
                  size="small"
                  onClick={() => setShowDetails(!showDetails)}
                  startIcon={showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  sx={{ mb: 1, textTransform: 'none' }}
                >
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>

                <Collapse in={showDetails}>
                  <ErrorDetails>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      Error Code: {errorDetails.code || 'UNKNOWN'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {errorDetails.message}
                    </Typography>
                    {errorDetails.suggestion && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        💡 {errorDetails.suggestion}
                      </Typography>
                    )}
                  </ErrorDetails>
                </Collapse>
              </Box>
            )}

            {/* Actions */}
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              {state === 'failed' && errorDetails?.retryable && onRetry && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onRetry}
                  startIcon={<RefreshCw size={16} />}
                >
                  Try Again
                </Button>
              )}

              {isLoading && onCancel && (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}

              {isComplete && onClose && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onClose}
                >
                  {state === 'success' ? 'Continue' : 'Close'}
                </Button>
              )}
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </LoadingCard>
  );
}

// Payment error component
export function PaymentError({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  className
}: PaymentErrorProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(showDetails);
  
  const errorConfig = ERROR_CONFIGS[error.type];

  return (
    <Fade in={true} timeout={300}>
      <Alert 
        severity={errorConfig.color}
        className={className}
        sx={{ 
          '& .MuiAlert-message': { width: '100%' },
          '& .MuiAlert-action': { alignItems: 'flex-start' }
        }}
        action={
          onDismiss && (
            <IconButton size="small" onClick={onDismiss} color="inherit">
              <XCircle size={16} />
            </IconButton>
          )
        }
      >
        <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {errorConfig.icon}
          {errorConfig.title}
        </AlertTitle>
        
        <Typography variant="body2" sx={{ mb: 2 }}>
          {error.message || errorConfig.defaultMessage}
        </Typography>

        {error.code && (
          <Box sx={{ mb: 2 }}>
            <Button
              size="small"
              onClick={() => setExpanded(!expanded)}
              startIcon={<Info size={14} />}
              sx={{ textTransform: 'none', fontSize: '0.75rem' }}
            >
              Error Code: {error.code}
            </Button>
          </Box>
        )}

        <Stack direction="row" spacing={2}>
          {error.retryable && onRetry && (
            <Button
              variant="contained"
              size="small"
              onClick={onRetry}
              startIcon={<RefreshCw size={14} />}
            >
              Retry
            </Button>
          )}
          
          {onDismiss && (
            <Button
              variant="outlined"
              size="small"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
        </Stack>

        {error.suggestion && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            backgroundColor: theme.palette.background.default,
            borderRadius: 1,
            border: `1px solid ${theme.palette.divider}`
          }}>
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
              💡 {error.suggestion}
            </Typography>
          </Box>
        )}
      </Alert>
    </Fade>
  );
}

// Network status component
export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const theme = useTheme();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <Alert 
      severity="warning" 
      sx={{ mb: 2 }}
      icon={<WifiOff />}
    >
      <AlertTitle>Connection Lost</AlertTitle>
      You're currently offline. Payment processing is disabled.
    </Alert>
  );
}

// Export types for external use
export type { PaymentState };
