/**
 * Design System Index - Main export file for the Cascais Fishing Design System
 * Inspired by Instructure UI architecture and integrated with Shadcn/Tailwind
 */

// Core types
export type {
  BaseTheme,
  ThemeColors,
  Typography,
  Spacing,
  Borders,
  Shadows,
  Transitions,
  Breakpoints,
  ZIndex,
  GenerateComponentTheme,
  ThemeOverride,
  EnhancedThemeProviderProps,
  ComponentStyleUtils,
  AccessibilityFeatures,
  DesignSystemContextType
} from './types'

// Theme exports
export {
  cascaisLightTheme,
  cascaisDarkTheme,
  themes,
  defaultTheme,
  getTheme,
  getThemeNames
} from './themes'
export type { ThemeName } from './themes'

// Component utilities
export {
  generateButtonComponentTheme,
  generateCardComponentTheme,
  generateInputComponentTheme,
  generateNavigationComponentTheme,
  generateBadgeComponentTheme,
  generateComponentStyles,
  createComponentStyles,
  getAccessibleColors,
  componentThemeGenerators
} from './component-utils'
export type { ComponentThemeGeneratorNames } from './component-utils'

// Theme provider and hooks
export {
  EnhancedThemeProvider,
  useDesignSystem,
  useComponentTheme,
  useThemeSwitcher
} from '../../components/design-system/EnhancedThemeProvider'

// Enhanced components
export { EnhancedButton as Button } from '../../components/design-system/EnhancedButton'
export { 
  EnhancedDataGrid, 
  StatusChip, 
  EnhancedToolbar 
} from '../../components/design-system/EnhancedDataGrid'

// DataGrid hooks and utilities
export {
  useServerDataSource,
  useClientData,
  createApiFetcher,
  createMockFetcher
} from './dataGridHooks'
export type {
  DataFetcher,
  ServerResponse,
  ServerError,
  UseServerDataSourceOptions,
  UseClientDataOptions
} from './dataGridHooks'

// Design system utilities and constants
export const DESIGN_SYSTEM_VERSION = '1.0.0'

export const DESIGN_SYSTEM_CONFIG = {
  name: 'Cascais Fishing Design System',
  version: DESIGN_SYSTEM_VERSION,
  description: 'Comprehensive design system for the Cascais Fishing Platform',
  author: 'Cascais Fishing Team',
  license: 'MIT',
  
  // Feature flags
  features: {
    darkMode: true,
    accessibility: true,
    animations: true,
    customProperties: true,
    componentTheming: true
  },
  
  // Supported browsers
  browserslist: [
    '>= 0.5%',
    'last 2 major versions',
    'not dead',
    'Chrome >= 60',
    'Firefox >= 60',
    'Safari >= 12',
    'Edge >= 79'
  ]
}

// Theme tokens for external consumption
export const THEME_TOKENS = {
  // Primitive colors that can be used directly
  colors: {
    oceanBlue: '#1E40AF',
    sunsetOrange: '#EA580C',
    deepWater: '#0F172A',
    sandyBeach: '#F8FAFC',
    seaFoam: '#10B981'
  },
  
  // Typography tokens
  typography: {
    headingFont: 'var(--font-montserrat), system-ui, sans-serif',
    bodyFont: 'var(--font-open-sans), system-ui, sans-serif',
    monoFont: 'ui-monospace, SFMono-Regular, Monaco, Consolas, monospace'
  },
  
  // Spacing tokens (8px grid)
  spacing: {
    '0': '0',
    '1': '0.125rem', // 2px
    '2': '0.25rem',  // 4px
    '3': '0.5rem',   // 8px
    '4': '0.75rem',  // 12px
    '5': '1rem',     // 16px
    '6': '1.5rem',   // 24px
    '7': '2rem',     // 32px
    '8': '3rem',     // 48px
    '9': '4rem'      // 64px
  }
} as const

// CSS Custom Properties mapping
export const CSS_VARIABLES = {
  // Colors
  '--color-brand-ocean-blue': 'var(--color-brand-oceanBlue)',
  '--color-brand-sunset-orange': 'var(--color-brand-sunsetOrange)', 
  '--color-brand-deep-water': 'var(--color-brand-deepWater)',
  '--color-brand-sandy-beach': 'var(--color-brand-sandyBeach)',
  '--color-brand-sea-foam': 'var(--color-brand-seaFoam)',
  
  // Typography
  '--font-family-heading': 'var(--font-family-primary)',
  '--font-family-body': 'var(--font-family-secondary)',
  '--font-family-mono': 'var(--font-family-mono)',
  
  // Spacing
  '--space-1': 'var(--spacing-xxxsmall)',
  '--space-2': 'var(--spacing-xxsmall)',
  '--space-3': 'var(--spacing-xsmall)',
  '--space-4': 'var(--spacing-small)',
  '--space-5': 'var(--spacing-medium)',
  '--space-6': 'var(--spacing-large)',
  '--space-7': 'var(--spacing-xlarge)',
  '--space-8': 'var(--spacing-xxlarge)',
  '--space-9': 'var(--spacing-xxxlarge)'
} as const

// Accessibility utilities
export const ACCESSIBILITY_HELPERS = {
  // WCAG AA contrast ratios
  contrastRatios: {
    normal: 4.5,
    large: 3.0
  },
  
  // Focus ring styles
  focusRing: {
    width: '2px',
    style: 'solid',
    offset: '2px'
  },
  
  // Screen reader only styles
  srOnly: {
    position: 'absolute' as const,
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap' as const,
    border: '0'
  }
}

// Responsive breakpoints
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px', 
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px'
} as const

// Z-index scale
export const Z_INDEX = {
  hide: -1,
  auto: 0,
  base: 1,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600
} as const

// Animation utilities
export const ANIMATIONS = {
  duration: {
    fast: '150ms',
    medium: '300ms',
    slow: '500ms'
  },
  
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear'
  }
} as const

// Component size scales
export const COMPONENT_SIZES = {
  button: {
    small: { height: '32px', padding: '8px 16px', fontSize: '14px' },
    medium: { height: '40px', padding: '12px 24px', fontSize: '16px' },
    large: { height: '48px', padding: '16px 32px', fontSize: '18px' }
  },
  
  input: {
    small: { height: '32px', padding: '6px 12px', fontSize: '14px' },
    medium: { height: '40px', padding: '10px 16px', fontSize: '16px' },
    large: { height: '48px', padding: '14px 20px', fontSize: '18px' }
  }
} as const

// Payment system components
export { default as PaymentMethodSelector } from '../../components/payment/PaymentMethodSelector';
export type { PaymentMethodInfo } from '../../components/payment/PaymentMethodSelector';

export { default as PriceDisplay } from '../../components/payment/PriceDisplay';
export type { 
  PriceBreakdown, 
  TaxRate, 
  ProcessingFee 
} from '../../components/payment/PriceDisplay';

export { 
  default as PaymentValidation,
  ValidatedField,
  VALIDATION_RULES,
  useFieldValidation 
} from '../../components/payment/PaymentValidation';
export type { 
  ValidationStatus,
  ValidationRule,
  FieldValidationState,
  ValidatedFieldProps
} from '../../components/payment/PaymentValidation';

export { 
  default as PaymentLoadingStates,
  PaymentError,
  NetworkStatus 
} from '../../components/payment/PaymentLoadingStates';
export type { PaymentState } from '../../components/payment/PaymentLoadingStates';

export {
  StripeProvider,
  PaymentElement,
  useStripe,
  useElements,
  useStripeState,
  usePaymentConfirmation,
  createPaymentIntent
} from '../../components/payment/StripeIntegration';
export type {
  PaymentElementProps,
  PaymentIntentOptions,
  ConfirmPaymentOptions
} from '../../components/payment/StripeIntegration';

export {
  AccessibilityProvider,
  AccessibilityControls,
  AccessibleFormField,
  VoiceAnnouncer,
  FocusTrap,
  AccessibleScreenReaderOnly,
  useAccessibility,
  checkWCAGCompliance
} from '../../components/payment/PaymentAccessibility';
export type {
  AccessibilitySettings,
  AccessibilityContextValue,
  FocusTrapProps,
  AccessibleFormFieldProps
} from '../../components/payment/PaymentAccessibility';

// Export everything for easy access
export * from './types'
export * from './themes' 
export * from './component-utils'
