/**
 * Payment Method Selector
 * Task 5.2: Payment method selection UI with animations
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Smartphone, 
  Globe, 
  Building,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { PaymentMethodType } from '@/hooks/usePaymentFlow';

export interface PaymentMethodInfo {
  id: PaymentMethodType;
  name: string;
  description: string;
  icon: React.ReactElement;
  processingTime: string;
  availability: 'available' | 'unavailable' | 'beta';
  countries: string[];
  fees?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType | null;
  onMethodSelect: (method: PaymentMethodType) => void;
  availableMethods?: PaymentMethodType[];
  disabled?: boolean;
  className?: string;
  layout?: 'grid' | 'list';
  showDetails?: boolean;
}

export interface PaymentMethodCardProps {
  method: PaymentMethodInfo;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  showDetails?: boolean;
  layout?: 'grid' | 'list';
}

// Payment method configurations
const PAYMENT_METHODS: Record<PaymentMethodType, PaymentMethodInfo> = {
  card: {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    icon: <CreditCard className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Worldwide'],
    fees: 'Standard processing fees',
  },
  sepa_debit: {
    id: 'sepa_debit',
    name: 'SEPA Direct Debit',
    description: 'Bank account debit',
    icon: <Building className="w-5 h-5" />,
    processingTime: '1-3 business days',
    availability: 'available',
    countries: ['EU', 'UK'],
    fees: 'Lower fees',
    minAmount: 1,
    maxAmount: 50000,
  },
  ideal: {
    id: 'ideal',
    name: 'iDEAL',
    description: 'Dutch online banking',
    icon: <Globe className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Netherlands'],
    fees: 'Low fees',
  },
  bancontact: {
    id: 'bancontact',
    name: 'Bancontact',
    description: 'Belgian card payment',
    icon: <CreditCard className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Belgium'],
    fees: 'Standard fees',
  },
  sofort: {
    id: 'sofort',
    name: 'Sofort',
    description: 'Online banking',
    icon: <Globe className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Germany', 'Austria'],
    fees: 'Standard fees',
  },
  eps: {
    id: 'eps',
    name: 'EPS',
    description: 'Austrian online banking',
    icon: <Globe className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Austria'],
    fees: 'Standard fees',
  },
  giropay: {
    id: 'giropay',
    name: 'Giropay',
    description: 'German online banking',
    icon: <Globe className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Germany'],
    fees: 'Standard fees',
  },
  p24: {
    id: 'p24',
    name: 'Przelewy24',
    description: 'Polish online payment',
    icon: <Globe className="w-5 h-5" />,
    processingTime: 'Instant',
    availability: 'available',
    countries: ['Poland'],
    fees: 'Standard fees',
  },
};

/**
 * Individual Payment Method Card
 */
function PaymentMethodCard({ 
  method, 
  isSelected, 
  onSelect, 
  disabled = false, 
  showDetails = true,
  layout = 'grid' 
}: PaymentMethodCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const getAvailabilityIcon = (availability: PaymentMethodInfo['availability']) => {
    switch (availability) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'beta':
        return <Clock className="w-4 h-4 text-orange-500" />;
      case 'unavailable':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getAvailabilityBadge = (availability: PaymentMethodInfo['availability']) => {
    switch (availability) {
      case 'available':
        return null;
      case 'beta':
        return <Badge variant="secondary" className="text-xs">Beta</Badge>;
      case 'unavailable':
        return <Badge variant="destructive" className="text-xs">Unavailable</Badge>;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all duration-200 border-2",
          isSelected 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-200 hover:border-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
          layout === 'list' && "flex-row"
        )}
        onClick={!disabled ? onSelect : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className={cn(
          "p-4",
          layout === 'list' ? "flex items-center space-x-4" : "text-center space-y-3"
        )}>
          {/* Method Icon */}
          <div className={cn(
            "flex items-center justify-center rounded-lg",
            layout === 'grid' ? "w-12 h-12 mx-auto bg-gray-100" : "w-10 h-10 bg-gray-100"
          )}>
            {React.cloneElement(method.icon, {
              className: cn(method.icon.props.className, "text-gray-600")
            })}
          </div>

          <div className={cn(
            layout === 'list' && "flex-1"
          )}>
            {/* Method Name & Badge */}
            <div className={cn(
              "flex items-center justify-center space-x-2",
              layout === 'list' && "justify-start"
            )}>
              <h3 className="font-semibold text-sm text-gray-800">
                {method.name}
              </h3>
              {getAvailabilityBadge(method.availability)}
            </div>

            {/* Method Description */}
            <p className="text-xs text-gray-600 mt-1">
              {method.description}
            </p>

            {/* Additional Details */}
            {showDetails && (
              <AnimatePresence>
                {(isHovered || isSelected || layout === 'list') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-1 text-xs text-gray-500"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{method.processingTime}</span>
                    </div>
                    
                    {method.fees && (
                      <div className="text-center">
                        {method.fees}
                      </div>
                    )}
                    
                    <div className="text-center">
                      {method.countries.join(', ')}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Selection Indicator */}
          <div className={cn(
            layout === 'grid' ? "absolute top-2 right-2" : "ml-auto"
          )}>
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Availability Indicator */}
          <div className={cn(
            "absolute",
            layout === 'grid' ? "top-2 left-2" : "ml-2"
          )}>
            {getAvailabilityIcon(method.availability)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * Payment Method Selector Component
 */
export function PaymentMethodSelector({
  selectedMethod,
  onMethodSelect,
  availableMethods = Object.keys(PAYMENT_METHODS) as PaymentMethodType[],
  disabled = false,
  className,
  layout = 'grid',
  showDetails = true,
}: PaymentMethodSelectorProps) {
  const methods = availableMethods
    .map(id => PAYMENT_METHODS[id])
    .filter(Boolean)
    .sort((a, b) => {
      // Sort by availability (available first), then by name
      if (a.availability === 'available' && b.availability !== 'available') return -1;
      if (a.availability !== 'available' && b.availability === 'available') return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">
          Choose Payment Method
        </h3>
        <p className="text-sm text-gray-600">
          Select your preferred payment method. All methods are secure and encrypted.
        </p>
      </div>

      {/* Method Grid/List */}
      <div className={cn(
        layout === 'grid' 
          ? "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "space-y-3"
      )}>
        <AnimatePresence>
          {methods.map((method) => (
            <PaymentMethodCard
              key={method.id}
              method={method}
              isSelected={selectedMethod === method.id}
              onSelect={() => onMethodSelect(method.id)}
              disabled={disabled || method.availability === 'unavailable'}
              showDetails={showDetails}
              layout={layout}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Selected Method Summary */}
      {selectedMethod && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                {React.cloneElement(PAYMENT_METHODS[selectedMethod].icon, {
                  className: "w-4 h-4 text-blue-600"
                })}
              </div>
              <div>
                <p className="font-medium text-blue-800">
                  {PAYMENT_METHODS[selectedMethod].name}
                </p>
                <p className="text-sm text-blue-600">
                  Processing time: {PAYMENT_METHODS[selectedMethod].processingTime}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMethodSelect(selectedMethod)}
              className="text-blue-600 hover:bg-blue-100"
            >
              Change
            </Button>
          </div>
        </motion.div>
      )}

      {/* Payment Method Information */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• All payment methods are secured with 256-bit SSL encryption</p>
        <p>• Processing times may vary based on your bank and location</p>
        <p>• Some methods may have additional verification requirements</p>
      </div>
    </div>
  );
}

/**
 * Quick Payment Method Buttons (for mobile)
 */
export function QuickPaymentMethods({
  onMethodSelect,
  className,
}: {
  onMethodSelect: (method: PaymentMethodType) => void;
  className?: string;
}) {
  const quickMethods: PaymentMethodType[] = ['card', 'sepa_debit', 'ideal'];

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-sm font-medium text-gray-700">Quick Select:</p>
      <div className="flex space-x-2">
        {quickMethods.map((methodId) => {
          const method = PAYMENT_METHODS[methodId];
          return (
            <Button
              key={methodId}
              variant="outline"
              size="sm"
              onClick={() => onMethodSelect(methodId)}
              className="flex-1 flex items-center space-x-2"
            >
              {method.icon}
              <span className="hidden sm:inline">{method.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

// Export types and configurations
export { PAYMENT_METHODS };
export type { PaymentMethodInfo };

// Default export for compatibility
export default PaymentMethodSelector;