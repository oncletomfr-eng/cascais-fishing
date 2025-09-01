'use client';

import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Radio, 
  RadioGroup, 
  FormControlLabel, 
  FormControl,
  Chip,
  Stack,
  useTheme 
} from '@mui/material';
import { 
  CreditCard, 
  Smartphone, 
  Wallet, 
  Building2,
  Globe,
  Shield,
  CheckCircle
} from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';

// Payment Method Types
export type PaymentMethodType = 'card' | 'apple_pay' | 'google_pay' | 'sepa' | 'ideal' | 'paypal';

export interface PaymentMethod {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ReactNode;
  processingFee: number;
  currency: string;
  tags?: string[];
  availability?: 'available' | 'coming_soon' | 'restricted';
  restrictions?: string[];
}

export interface PaymentMethodSelectorProps {
  selectedMethod?: PaymentMethodType;
  onMethodChange?: (method: PaymentMethodType) => void;
  availableMethods?: PaymentMethodType[];
  showProcessingFees?: boolean;
  currency?: string;
  region?: 'EU' | 'US' | 'GLOBAL';
  className?: string;
}

// Styled Components with Design System Integration
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'isSelected' && prop !== 'isDisabled'
})<{ isSelected?: boolean; isDisabled?: boolean }>(({ theme, isSelected, isDisabled }) => ({
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  border: `2px solid ${isSelected ? theme.palette.primary.main : theme.palette.divider}`,
  backgroundColor: isSelected 
    ? `${theme.palette.primary.main}08` 
    : theme.palette.background.paper,
  transition: 'all 0.2s ease-in-out',
  opacity: isDisabled ? 0.6 : 1,
  
  '&:hover': {
    borderColor: isDisabled ? theme.palette.divider : theme.palette.primary.main,
    backgroundColor: isDisabled 
      ? theme.palette.background.paper 
      : `${theme.palette.primary.main}04`,
    transform: isDisabled ? 'none' : 'translateY(-2px)',
    boxShadow: isDisabled ? 'none' : theme.shadows[4]
  },

  // Accessibility improvements
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

const IconContainer = styled(Box)(({ theme }) => ({
  width: 48,
  height: 48,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.primary.main + '12',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.primary.main,
  
  '& svg': {
    width: 24,
    height: 24
  }
}));

const ProcessingFeeChip = styled(Chip)(({ theme }) => ({
  fontSize: '0.75rem',
  height: 20,
  backgroundColor: theme.palette.success.light + '20',
  color: theme.palette.success.dark,
  '& .MuiChip-label': {
    paddingX: 1
  }
}));

// Default payment methods configuration
const DEFAULT_PAYMENT_METHODS: Record<PaymentMethodType, PaymentMethod> = {
  card: {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    icon: <CreditCard />,
    processingFee: 2.9,
    currency: '%',
    tags: ['instant', 'secure'],
    availability: 'available'
  },
  apple_pay: {
    id: 'apple_pay',
    name: 'Apple Pay',
    description: 'Pay with Touch ID or Face ID',
    icon: <Smartphone />,
    processingFee: 2.9,
    currency: '%',
    tags: ['instant', 'mobile'],
    availability: 'available',
    restrictions: ['iOS devices only']
  },
  google_pay: {
    id: 'google_pay',
    name: 'Google Pay',
    description: 'Quick & secure mobile payments',
    icon: <Wallet />,
    processingFee: 2.9,
    currency: '%',
    tags: ['instant', 'mobile'],
    availability: 'available',
    restrictions: ['Android devices only']
  },
  sepa: {
    id: 'sepa',
    name: 'SEPA Direct Debit',
    description: 'Bank transfer (EU only)',
    icon: <Building2 />,
    processingFee: 0.8,
    currency: '%',
    tags: ['low-cost', 'eu-only'],
    availability: 'available',
    restrictions: ['EU bank accounts only']
  },
  ideal: {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Netherlands bank transfer',
    icon: <Building2 />,
    processingFee: 0.5,
    currency: '€',
    tags: ['netherlands', 'instant'],
    availability: 'available',
    restrictions: ['Netherlands banks only']
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with PayPal account',
    icon: <Globe />,
    processingFee: 3.4,
    currency: '%',
    tags: ['popular'],
    availability: 'coming_soon'
  }
};

export default function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  availableMethods = ['card', 'apple_pay', 'google_pay'],
  showProcessingFees = true,
  currency = 'EUR',
  region = 'GLOBAL',
  className
}: PaymentMethodSelectorProps) {
  const theme = useTheme();
  const { themes } = useDesignSystem();
  
  // Filter methods based on availability and region
  const filteredMethods = availableMethods
    .map(id => DEFAULT_PAYMENT_METHODS[id])
    .filter(method => {
      if (method.availability === 'restricted') return false;
      
      // Regional filtering
      if (region === 'EU' && method.restrictions?.includes('EU bank accounts only')) return true;
      if (region === 'US' && method.id === 'sepa') return false;
      
      return true;
    });

  const handleMethodSelect = (methodId: PaymentMethodType) => {
    const method = DEFAULT_PAYMENT_METHODS[methodId];
    if (method.availability === 'available') {
      onMethodChange?.(methodId);
    }
  };

  const formatProcessingFee = (method: PaymentMethod) => {
    if (method.currency === '%') {
      return `${method.processingFee}% + €0.30`;
    }
    return `${method.processingFee}${method.currency}`;
  };

  return (
    <Box className={className}>
      <Typography 
        variant="h6" 
        component="h2" 
        gutterBottom
        sx={{ 
          color: theme.palette.text.primary,
          fontWeight: 600,
          mb: 2
        }}
      >
        Choose Payment Method
      </Typography>
      
      <FormControl component="fieldset" sx={{ width: '100%' }}>
        <RadioGroup 
          value={selectedMethod || ''} 
          onChange={(e) => handleMethodSelect(e.target.value as PaymentMethodType)}
          sx={{ gap: 1.5 }}
        >
          {filteredMethods.map((method) => {
            const isSelected = selectedMethod === method.id;
            const isDisabled = method.availability !== 'available';
            
            return (
              <StyledCard 
                key={method.id} 
                isSelected={isSelected}
                isDisabled={isDisabled}
                onClick={() => handleMethodSelect(method.id)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
              >
                <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                  <FormControlLabel
                    value={method.id}
                    control={
                      <Radio 
                        sx={{ 
                          color: theme.palette.primary.main,
                          '&.Mui-checked': {
                            color: theme.palette.primary.main
                          }
                        }} 
                      />
                    }
                    label=""
                    sx={{ m: 0, position: 'absolute', top: 16, right: 16 }}
                  />
                  
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <IconContainer>
                      {method.icon}
                    </IconContainer>
                    
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography 
                          variant="h6" 
                          component="h3"
                          sx={{ 
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            fontSize: '1.1rem'
                          }}
                        >
                          {method.name}
                        </Typography>
                        
                        {isSelected && (
                          <CheckCircle 
                            size={20} 
                            color={theme.palette.primary.main}
                            aria-label="Selected payment method"
                          />
                        )}
                        
                        {method.availability === 'coming_soon' && (
                          <Chip 
                            label="Coming Soon" 
                            size="small" 
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 20,
                              color: theme.palette.warning.main,
                              borderColor: theme.palette.warning.main
                            }}
                          />
                        )}
                      </Box>
                      
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ mb: 1.5 }}
                      >
                        {method.description}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                        {method.tags?.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 20,
                              textTransform: 'capitalize',
                              borderColor: theme.palette.divider,
                              color: theme.palette.text.secondary
                            }}
                          />
                        ))}
                        
                        {showProcessingFees && (
                          <ProcessingFeeChip
                            label={`${formatProcessingFee(method)} fee`}
                            size="small"
                            icon={<Shield size={12} />}
                          />
                        )}
                      </Stack>
                      
                      {method.restrictions && method.restrictions.length > 0 && (
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: '0.75rem', fontStyle: 'italic' }}
                        >
                          * {method.restrictions.join(', ')}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </StyledCard>
            );
          })}
        </RadioGroup>
      </FormControl>
    </Box>
  );
}
