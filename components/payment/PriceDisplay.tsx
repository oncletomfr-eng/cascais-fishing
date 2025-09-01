'use client';

import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  Divider, 
  Card, 
  CardContent,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  useTheme 
} from '@mui/material';
import { 
  Info, 
  TrendingUp, 
  Shield, 
  Calculator,
  AlertCircle 
} from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';

// Price calculation types
export interface PriceBreakdown {
  subtotal: number;
  tax: number;
  processingFee: number;
  discount?: number;
  total: number;
  currency: string;
}

export interface TaxRate {
  name: string;
  rate: number; // percentage
  description?: string;
  type: 'vat' | 'sales_tax' | 'gst' | 'other';
}

export interface ProcessingFee {
  percentage: number;
  fixed: number;
  minimum?: number;
  maximum?: number;
  currency: string;
}

export interface PriceDisplayProps {
  subtotal: number;
  currency?: string;
  taxRates?: TaxRate[];
  processingFee?: ProcessingFee;
  discount?: {
    amount: number;
    code?: string;
    description?: string;
  };
  showBreakdown?: boolean;
  showEstimated?: boolean;
  variant?: 'compact' | 'detailed' | 'summary';
  onInfoClick?: () => void;
  className?: string;
}

// Styled components
const PriceCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[2],
}));

const PriceRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 0),
  '&:not(:last-child)': {
    borderBottom: `1px solid ${theme.palette.divider}20`
  }
}));

const TotalRow = styled(PriceRow)(({ theme }) => ({
  backgroundColor: `${theme.palette.primary.main}08`,
  margin: theme.spacing(1, -2, -2, -2),
  padding: theme.spacing(2),
  borderRadius: `0 0 ${theme.shape.borderRadius * 2}px ${theme.shape.borderRadius * 2}px`,
  fontWeight: 600
}));

const InfoChip = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: '0.7rem',
  backgroundColor: theme.palette.info.light + '20',
  color: theme.palette.info.dark,
  '& .MuiChip-icon': {
    width: 14,
    height: 14
  }
}));

const DiscountChip = styled(Chip)(({ theme }) => ({
  height: 22,
  fontSize: '0.75rem',
  backgroundColor: theme.palette.success.light + '20',
  color: theme.palette.success.dark,
  '& .MuiChip-icon': {
    width: 16,
    height: 16
  }
}));

// Currency formatting utility
const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Tax calculation utility
const calculateTax = (subtotal: number, taxRates: TaxRate[]): number => {
  return taxRates.reduce((total, rate) => {
    return total + (subtotal * (rate.rate / 100));
  }, 0);
};

// Processing fee calculation utility
const calculateProcessingFee = (amount: number, fee: ProcessingFee): number => {
  const percentageFee = amount * (fee.percentage / 100);
  let totalFee = percentageFee + fee.fixed;
  
  if (fee.minimum && totalFee < fee.minimum) {
    totalFee = fee.minimum;
  }
  
  if (fee.maximum && totalFee > fee.maximum) {
    totalFee = fee.maximum;
  }
  
  return totalFee;
};

export default function PriceDisplay({
  subtotal,
  currency = 'EUR',
  taxRates = [{ name: 'VAT', rate: 21, type: 'vat' }],
  processingFee = { percentage: 2.9, fixed: 0.30, currency: 'EUR' },
  discount,
  showBreakdown = true,
  showEstimated = false,
  variant = 'detailed',
  onInfoClick,
  className
}: PriceDisplayProps) {
  const theme = useTheme();
  const { themes } = useDesignSystem();

  // Calculate all price components
  const priceBreakdown = useMemo((): PriceBreakdown => {
    const discountAmount = discount?.amount || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const tax = calculateTax(subtotalAfterDiscount, taxRates);
    const processingFeeAmount = calculateProcessingFee(subtotalAfterDiscount + tax, processingFee);
    const total = subtotalAfterDiscount + tax + processingFeeAmount;

    return {
      subtotal: subtotalAfterDiscount,
      tax,
      processingFee: processingFeeAmount,
      discount: discountAmount,
      total,
      currency
    };
  }, [subtotal, currency, taxRates, processingFee, discount]);

  // Compact variant
  if (variant === 'compact') {
    return (
      <Box className={className} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          {formatCurrency(priceBreakdown.total, currency)}
        </Typography>
        {showEstimated && (
          <InfoChip
            label="estimated"
            size="small"
            icon={<Calculator />}
          />
        )}
        {onInfoClick && (
          <Tooltip title="View price breakdown">
            <IconButton size="small" onClick={onInfoClick}>
              <Info size={16} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  }

  // Summary variant
  if (variant === 'summary') {
    return (
      <PriceCard className={className}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
              Total Amount
            </Typography>
            {showEstimated && (
              <InfoChip
                label="estimated"
                size="small"
                icon={<Calculator />}
              />
            )}
          </Box>
          
          <Typography variant="h4" component="div" sx={{ 
            color: theme.palette.primary.main,
            fontWeight: 700,
            mb: 1
          }}>
            {formatCurrency(priceBreakdown.total, currency)}
          </Typography>
          
          {discount && (
            <DiscountChip
              label={`Saved ${formatCurrency(discount.amount, currency)}`}
              size="small"
              icon={<TrendingUp />}
              sx={{ mb: 1 }}
            />
          )}
          
          <Typography variant="body2" color="text.secondary">
            Includes taxes and processing fees
          </Typography>
        </CardContent>
      </PriceCard>
    );
  }

  // Detailed variant (default)
  return (
    <PriceCard className={className}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
            Price Breakdown
          </Typography>
          
          <Stack direction="row" spacing={1} alignItems="center">
            {showEstimated && (
              <InfoChip
                label="estimated"
                size="small"
                icon={<Calculator />}
              />
            )}
            
            {onInfoClick && (
              <Tooltip title="Learn about pricing">
                <IconButton size="small" onClick={onInfoClick}>
                  <Info size={16} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Box>

        {showBreakdown && (
          <Box sx={{ mb: 2 }}>
            {/* Subtotal */}
            <PriceRow>
              <Typography variant="body2">
                Subtotal
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatCurrency(subtotal, currency)}
              </Typography>
            </PriceRow>

            {/* Discount */}
            {discount && discount.amount > 0 && (
              <PriceRow>
                <Box>
                  <Typography variant="body2" color="success.main">
                    Discount
                    {discount.code && (
                      <Typography 
                        component="span" 
                        variant="caption" 
                        sx={{ ml: 1, color: 'text.secondary' }}
                      >
                        ({discount.code})
                      </Typography>
                    )}
                  </Typography>
                  {discount.description && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {discount.description}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                  -{formatCurrency(discount.amount, currency)}
                </Typography>
              </PriceRow>
            )}

            {/* Taxes */}
            {taxRates.map((rate, index) => (
              <PriceRow key={index}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2">
                    {rate.name} ({rate.rate}%)
                  </Typography>
                  {rate.description && (
                    <Tooltip title={rate.description}>
                      <Info size={14} color={theme.palette.text.secondary} />
                    </Tooltip>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatCurrency(calculateTax(priceBreakdown.subtotal, [rate]), currency)}
                </Typography>
              </PriceRow>
            ))}

            {/* Processing Fee */}
            <PriceRow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  Processing Fee
                </Typography>
                <Tooltip title={`${processingFee.percentage}% + ${formatCurrency(processingFee.fixed, currency)}`}>
                  <Shield size={14} color={theme.palette.text.secondary} />
                </Tooltip>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {formatCurrency(priceBreakdown.processingFee, currency)}
              </Typography>
            </PriceRow>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Total */}
        <TotalRow>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
            Total
          </Typography>
          <Typography variant="h6" component="div" sx={{ 
            fontWeight: 700,
            color: theme.palette.primary.main 
          }}>
            {formatCurrency(priceBreakdown.total, currency)}
          </Typography>
        </TotalRow>

        {/* Security notice */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          mt: 2,
          p: 1.5,
          backgroundColor: theme.palette.success.light + '10',
          borderRadius: 1,
          border: `1px solid ${theme.palette.success.light}40`
        }}>
          <Shield size={16} color={theme.palette.success.main} />
          <Typography variant="caption" color="success.main">
            Secure payment processing by Stripe
          </Typography>
        </Box>
      </CardContent>
    </PriceCard>
  );
}

// Export types for external use
export type { PriceBreakdown, TaxRate, ProcessingFee };
