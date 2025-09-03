/**
 * Payment KPI Cards Component
 * Task 6.1: Revenue Overview KPI Cards
 * 
 * Animated KPI cards showing revenue overview, earnings metrics,
 * commission analysis, and growth indicators with real-time updates
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard, 
  Percent, 
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for KPI data
interface KPIOverview {
  totalRevenue: number;
  netRevenue: number;
  totalCommissions: number;
  totalPayments: number;
  successfulPayments: number;
  averagePaymentAmount: number;
  revenueGrowth: number;
  conversionRate: number;
}

interface PaymentKPICardsProps {
  data?: KPIOverview;
  loading?: boolean;
  error?: string | null;
  period?: string;
  onRefresh?: () => void;
  className?: string;
  showAnimations?: boolean;
  compactMode?: boolean;
}

// Individual KPI Card Component
interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: 'default' | 'success' | 'warning' | 'destructive';
  format?: 'currency' | 'number' | 'percentage';
  subtitle?: string;
  loading?: boolean;
  showAnimation?: boolean;
  delay?: number;
}

// Format number based on type
function formatValue(value: number, format: 'currency' | 'number' | 'percentage' = 'number'): string {
  if (isNaN(value) || value === null || value === undefined) return '0';

  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('pt-PT', { 
        style: 'currency', 
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2 
      }).format(value / 100); // Convert from cents

    case 'percentage':
      return `${value.toFixed(1)}%`;

    case 'number':
    default:
      return new Intl.NumberFormat('pt-PT').format(value);
  }
}

// Get trend direction and color
function getTrendInfo(change: number) {
  if (change > 0) {
    return {
      icon: <ArrowUp className="h-3 w-3" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      label: 'positive'
    };
  } else if (change < 0) {
    return {
      icon: <ArrowDown className="h-3 w-3" />,
      color: 'text-red-600', 
      bgColor: 'bg-red-50',
      label: 'negative'
    };
  } else {
    return {
      icon: <Minus className="h-3 w-3" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      label: 'neutral'
    };
  }
}

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000, delay: number = 0) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let startTimestamp: number | null = null;
      const step = (timestamp: number) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        setCount(Math.floor(progress * end));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timer);
  }, [end, duration, delay]);

  return count;
}

// Individual KPI Card
function KPICard({
  title,
  value,
  previousValue,
  change = 0,
  changeLabel,
  icon,
  color = 'default',
  format = 'number',
  subtitle,
  loading = false,
  showAnimation = true,
  delay = 0
}: KPICardProps) {
  const animatedValue = useAnimatedCounter(value, 1200, delay);
  const displayValue = showAnimation ? animatedValue : value;
  const trendInfo = getTrendInfo(change);

  const colorClasses = {
    default: 'border-border',
    success: 'border-green-200 bg-green-50/50',
    warning: 'border-yellow-200 bg-yellow-50/50',
    destructive: 'border-red-200 bg-red-50/50'
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay: delay / 1000,
        ease: 'easeOut'
      }}
    >
      <Card className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-md',
        colorClasses[color]
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted/50">
              {icon}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <motion.div 
              className="text-2xl font-bold"
              key={displayValue} // Re-trigger animation on value change
            >
              {formatValue(displayValue, format)}
            </motion.div>
            
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
            
            {(change !== 0 || changeLabel) && (
              <motion.div 
                className="flex items-center gap-1"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (delay + 800) / 1000 }}
              >
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                  trendInfo.bgColor,
                  trendInfo.color
                )}>
                  {trendInfo.icon}
                  <span>
                    {change !== 0 && `${Math.abs(change).toFixed(1)}%`}
                    {changeLabel && ` ${changeLabel}`}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Main KPI Cards Component
export function PaymentKPICards({
  data,
  loading = false,
  error = null,
  period = 'month',
  onRefresh,
  className,
  showAnimations = true,
  compactMode = false
}: PaymentKPICardsProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to load payment metrics</span>
          </div>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              <span className="text-sm">Retry</span>
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </Card>
    );
  }

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: data?.totalRevenue || 0,
      change: data?.revenueGrowth || 0,
      changeLabel: `vs last ${period}`,
      icon: <DollarSign className="h-4 w-4" />,
      color: 'success' as const,
      format: 'currency' as const,
      subtitle: `€${formatValue((data?.totalRevenue || 0), 'currency').replace('€', '')} total`,
      delay: 0
    },
    {
      title: 'Net Revenue',
      value: data?.netRevenue || 0,
      change: data?.revenueGrowth || 0,
      changeLabel: 'after commissions',
      icon: <Target className="h-4 w-4" />,
      color: 'default' as const,
      format: 'currency' as const,
      subtitle: `${formatValue(data?.totalCommissions || 0, 'currency')} in commissions`,
      delay: 200
    },
    {
      title: 'Conversion Rate',
      value: data?.conversionRate || 0,
      change: data?.conversionRate && data.conversionRate > 80 ? 5 : data?.conversionRate && data.conversionRate < 60 ? -5 : 0,
      changeLabel: 'payment success rate',
      icon: <CheckCircle className="h-4 w-4" />,
      color: (data?.conversionRate || 0) > 80 ? 'success' : (data?.conversionRate || 0) < 60 ? 'warning' : 'default' as const,
      format: 'percentage' as const,
      subtitle: `${data?.successfulPayments || 0}/${data?.totalPayments || 0} successful`,
      delay: 400
    },
    {
      title: 'Avg Payment',
      value: data?.averagePaymentAmount || 0,
      icon: <CreditCard className="h-4 w-4" />,
      color: 'default' as const,
      format: 'currency' as const,
      subtitle: `${data?.totalPayments || 0} payments total`,
      delay: 600
    }
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Revenue Overview</h2>
          <p className="text-sm text-muted-foreground">
            Payment metrics for the current {period}
          </p>
        </div>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={cn('h-4 w-4', (refreshing || loading) && 'animate-spin')} />
            <span className="text-sm">Refresh</span>
          </button>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className={cn(
        'grid gap-4',
        compactMode ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      )}>
        {kpiCards.map((card, index) => (
          <KPICard
            key={card.title}
            {...card}
            loading={loading}
            showAnimation={showAnimations}
          />
        ))}
      </div>

      {/* Quick Stats Summary */}
      {!loading && data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="p-4 rounded-lg bg-muted/30 border-dashed border-2 border-muted"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-yellow-600" />
            <span className="font-medium text-sm">Quick Insights</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-muted-foreground">
            <div>
              <strong>Commission Rate:</strong> {' '}
              {data.totalRevenue > 0 
                ? ((data.totalCommissions / data.totalRevenue) * 100).toFixed(1)
                : 0}%
            </div>
            <div>
              <strong>Success Rate:</strong> {' '}
              {data.totalPayments > 0 
                ? ((data.successfulPayments / data.totalPayments) * 100).toFixed(1)
                : 0}%
            </div>
            <div>
              <strong>Daily Average:</strong> {' '}
              {formatValue((data.totalRevenue || 0) / 30, 'currency')}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default PaymentKPICards;
