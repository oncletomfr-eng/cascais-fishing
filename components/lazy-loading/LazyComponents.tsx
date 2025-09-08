/**
 * 🚀 BUNDLE OPTIMIZATION: Lazy Loading Components
 * Dynamic imports for heavy components to reduce initial bundle size
 */

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// 📊 Heavy Analytics Components
export const LazyAnalyticsDashboard = lazy(() => 
  import('@/components/analytics/AnalyticsDashboard').then(module => ({
    default: module.AnalyticsDashboard
  }))
);

export const LazyCommissionAnalytics = lazy(() => 
  import('@/components/commission/CommissionAnalytics').then(module => ({
    default: module.CommissionAnalytics
  }))
);

export const LazyPaymentAnalytics = lazy(() => 
  import('@/components/payment/PaymentAnalytics').then(module => ({
    default: module.PaymentAnalytics
  }))
);

// 📈 Heavy Chart Components  
export const LazyPerformanceCharts = lazy(() => 
  import('@/components/charts/PerformanceCharts').then(module => ({
    default: module.PerformanceCharts
  }))
);

export const LazyRevenueCharts = lazy(() => 
  import('@/components/charts/RevenueCharts').then(module => ({
    default: module.RevenueCharts
  }))
);

// 💬 Heavy Chat Components
export const LazyChatInterface = lazy(() => 
  import('@/components/chat/ChatInterface').then(module => ({
    default: module.ChatInterface
  }))
);

export const LazyChatModeration = lazy(() => 
  import('@/components/chat/moderation/ModerationPanel').then(module => ({
    default: module.ModerationPanel
  }))
);

// 🎣 Heavy Fishing Features
export const LazyFishingDiary = lazy(() => 
  import('@/components/fishing-diary/FishingDiary').then(module => ({
    default: module.FishingDiary
  }))
);

export const LazySmartRecommendations = lazy(() => 
  import('@/components/smart-recommendations/SmartRecommendations').then(module => ({
    default: module.SmartRecommendations
  }))
);

// 👤 Heavy Profile Components
export const LazyProfileAnalytics = lazy(() => 
  import('@/components/profiles/analytics/ProfileAnalytics').then(module => ({
    default: module.ProfileAnalytics
  }))
);

export const LazyAchievementComparison = lazy(() => 
  import('@/components/achievements/AchievementComparison').then(module => ({
    default: module.AchievementComparison
  }))
);

// 🛍️ Heavy Transaction Components
export const LazyTransactionHistory = lazy(() => 
  import('@/components/transactions/TransactionHistory').then(module => ({
    default: module.TransactionHistory
  }))
);

export const LazyPaymentMethods = lazy(() => 
  import('@/components/payment/PaymentMethods').then(module => ({
    default: module.PaymentMethods
  }))
);

// ⚙️ Heavy Admin Components
export const LazyAdminDashboard = lazy(() => 
  import('@/components/admin/AdminDashboard').then(module => ({
    default: module.AdminDashboard
  }))
);

export const LazyUserManagement = lazy(() => 
  import('@/components/admin/UserManagement').then(module => ({
    default: module.UserManagement
  }))
);

export const LazySystemSettings = lazy(() => 
  import('@/components/admin/SystemSettings').then(module => ({
    default: module.SystemSettings
  }))
);

/**
 * Higher-order component wrapper for lazy loading with consistent loading state
 */
export function withLazyLoading<T extends Record<string, any>>(
  LazyComponent: React.LazyExoticComponent<React.ComponentType<T>>,
  fallback?: React.ReactNode
) {
  return function WrappedLazyComponent(props: T) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner className="h-8 w-8" />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Preload functions for critical user flows
 */
export const preloadComponents = {
  // Preload chat when user navigates to trips
  chat: () => import('@/components/chat/ChatInterface'),
  
  // Preload analytics when user goes to dashboard
  analytics: () => Promise.all([
    import('@/components/analytics/AnalyticsDashboard'),
    import('@/components/charts/PerformanceCharts')
  ]),
  
  // Preload payment components when user starts booking
  payment: () => Promise.all([
    import('@/components/payment/PaymentMethods'),
    import('@/components/payment/PaymentAnalytics')
  ]),
  
  // Preload admin components for admin users
  admin: () => Promise.all([
    import('@/components/admin/AdminDashboard'),
    import('@/components/admin/UserManagement'),
    import('@/components/admin/SystemSettings')
  ])
};

/**
 * Bundle size tracking - helps identify heavy components
 */
export const bundleMetrics = {
  // Track which lazy components are loaded for analytics
  trackLazyLoad: (componentName: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'lazy_component_load', {
        component_name: componentName,
        timestamp: Date.now()
      });
    }
  }
};
