/**
 * Component Utilities - Helper functions for creating themed components
 * Following Instructure UI patterns for component theming and styling
 */

import type { BaseTheme, GenerateComponentTheme } from './types'

// Component theme generators for common UI patterns

// Button component theme generator
export const generateButtonComponentTheme: GenerateComponentTheme<{
  // Primary variant
  primaryBackground: string
  primaryColor: string
  primaryBorder: string
  primaryHoverBackground: string
  primaryHoverColor: string
  primaryActiveBackground: string
  primaryFocusRing: string
  
  // Secondary variant
  secondaryBackground: string
  secondaryColor: string
  secondaryBorder: string
  secondaryHoverBackground: string
  secondaryHoverColor: string
  secondaryActiveBackground: string
  
  // Ghost variant
  ghostBackground: string
  ghostColor: string
  ghostHoverBackground: string
  ghostHoverColor: string
  
  // Destructive variant
  destructiveBackground: string
  destructiveColor: string
  destructiveBorder: string
  destructiveHoverBackground: string
  
  // Size variations
  smallPadding: string
  mediumPadding: string
  largePadding: string
  
  // Typography
  fontSize: string
  fontWeight: string
  lineHeight: string
  
  // Layout
  borderRadius: string
  borderWidth: string
  minHeight: string
  
  // States
  disabledOpacity: string
  loadingOpacity: string
}> = (theme: BaseTheme) => {
  const { colors, spacing, borders, typography, shadows } = theme
  
  return {
    // Primary variant
    primaryBackground: colors.brand.oceanBlue,
    primaryColor: colors.contrasts.white1010,
    primaryBorder: colors.brand.oceanBlue,
    primaryHoverBackground: colors.contrasts.blue5782,
    primaryHoverColor: colors.contrasts.white1010,
    primaryActiveBackground: colors.primitives.blue5782,
    primaryFocusRing: `0 0 0 2px ${colors.brand.oceanBlue}40`,
    
    // Secondary variant
    secondaryBackground: 'transparent',
    secondaryColor: colors.brand.oceanBlue,
    secondaryBorder: colors.brand.oceanBlue,
    secondaryHoverBackground: colors.brand.oceanBlue,
    secondaryHoverColor: colors.contrasts.white1010,
    secondaryActiveBackground: colors.contrasts.blue5782,
    
    // Ghost variant
    ghostBackground: 'transparent',
    ghostColor: colors.UI.textPrimary,
    ghostHoverBackground: colors.UI.surfaceDark,
    ghostHoverColor: colors.brand.oceanBlue,
    
    // Destructive variant
    destructiveBackground: colors.contrasts.red4570,
    destructiveColor: colors.contrasts.white1010,
    destructiveBorder: colors.contrasts.red4570,
    destructiveHoverBackground: '#DC2626',
    
    // Size variations
    smallPadding: '0.5rem 1rem',
    mediumPadding: spacing.buttons,
    largePadding: '1rem 2rem',
    
    // Typography
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.normal,
    
    // Layout
    borderRadius: borders.radiusMedium,
    borderWidth: borders.widthSmall,
    minHeight: '2.5rem',
    
    // States
    disabledOpacity: '0.5',
    loadingOpacity: '0.8'
  }
}

// Card component theme generator
export const generateCardComponentTheme: GenerateComponentTheme<{
  background: string
  border: string
  borderRadius: string
  shadow: string
  padding: string
  headerPadding: string
  contentPadding: string
  footerPadding: string
  
  // Variants
  elevatedShadow: string
  outlineBorder: string
  
  // Interactive states
  hoverShadow: string
  focusRing: string
}> = (theme: BaseTheme) => {
  const { colors, spacing, borders, shadows } = theme
  
  return {
    background: colors.UI.surfaceLight,
    border: colors.UI.borderLight,
    borderRadius: borders.radiusLarge,
    shadow: shadows.card,
    padding: spacing.cards,
    headerPadding: `${spacing.large} ${spacing.large} ${spacing.medium}`,
    contentPadding: `0 ${spacing.large}`,
    footerPadding: `${spacing.medium} ${spacing.large} ${spacing.large}`,
    
    // Variants
    elevatedShadow: shadows.medium,
    outlineBorder: colors.UI.borderMedium,
    
    // Interactive states
    hoverShadow: shadows.large,
    focusRing: `0 0 0 2px ${colors.brand.oceanBlue}40`
  }
}

// Input component theme generator
export const generateInputComponentTheme: GenerateComponentTheme<{
  background: string
  border: string
  borderRadius: string
  padding: string
  fontSize: string
  lineHeight: string
  color: string
  placeholderColor: string
  
  // States
  focusBorder: string
  focusRing: string
  errorBorder: string
  errorRing: string
  successBorder: string
  disabledBackground: string
  disabledColor: string
  
  // Label
  labelColor: string
  labelFontSize: string
  labelFontWeight: string
  
  // Helper text
  helperColor: string
  helperFontSize: string
  errorColor: string
  successColor: string
}> = (theme: BaseTheme) => {
  const { colors, spacing, borders, typography } = theme
  
  return {
    background: colors.UI.surfaceLight,
    border: colors.UI.borderMedium,
    borderRadius: borders.radiusMedium,
    padding: `${spacing.small} ${spacing.medium}`,
    fontSize: typography.fontSize.base,
    lineHeight: typography.lineHeight.normal,
    color: colors.UI.textPrimary,
    placeholderColor: colors.UI.textSecondary,
    
    // States
    focusBorder: colors.brand.oceanBlue,
    focusRing: `0 0 0 2px ${colors.brand.oceanBlue}40`,
    errorBorder: colors.contrasts.red4570,
    errorRing: `0 0 0 2px ${colors.contrasts.red4570}40`,
    successBorder: colors.contrasts.green4570,
    disabledBackground: colors.UI.surfaceDark,
    disabledColor: colors.UI.textSecondary,
    
    // Label
    labelColor: colors.UI.textPrimary,
    labelFontSize: typography.fontSize.sm,
    labelFontWeight: typography.fontWeight.medium,
    
    // Helper text
    helperColor: colors.UI.textSecondary,
    helperFontSize: typography.fontSize.sm,
    errorColor: colors.contrasts.red4570,
    successColor: colors.contrasts.green4570
  }
}

// Navigation component theme generator
export const generateNavigationComponentTheme: GenerateComponentTheme<{
  background: string
  border: string
  shadow: string
  
  // Links
  linkColor: string
  linkHoverColor: string
  linkActiveColor: string
  linkActiveBackground: string
  
  // Brand
  brandColor: string
  brandFontSize: string
  brandFontWeight: string
  
  // Mobile menu
  mobileBackdrop: string
  mobileBackground: string
  mobileShadow: string
}> = (theme: BaseTheme) => {
  const { colors, shadows, typography } = theme
  
  return {
    background: colors.UI.surfaceLight,
    border: colors.UI.borderLight,
    shadow: shadows.small,
    
    // Links
    linkColor: colors.UI.textSecondary,
    linkHoverColor: colors.brand.oceanBlue,
    linkActiveColor: colors.brand.oceanBlue,
    linkActiveBackground: `${colors.brand.oceanBlue}10`,
    
    // Brand
    brandColor: colors.brand.oceanBlue,
    brandFontSize: typography.fontSize.xl,
    brandFontWeight: typography.fontWeight.bold,
    
    // Mobile menu
    mobileBackdrop: 'rgba(0, 0, 0, 0.5)',
    mobileBackground: colors.UI.surfaceLight,
    mobileShadow: shadows.xlarge
  }
}

// Badge component theme generator
export const generateBadgeComponentTheme: GenerateComponentTheme<{
  // Default variant
  defaultBackground: string
  defaultColor: string
  
  // Primary variant
  primaryBackground: string
  primaryColor: string
  
  // Secondary variant
  secondaryBackground: string
  secondaryColor: string
  
  // Success variant
  successBackground: string
  successColor: string
  
  // Warning variant
  warningBackground: string
  warningColor: string
  
  // Error variant
  errorBackground: string
  errorColor: string
  
  // Layout
  borderRadius: string
  padding: string
  fontSize: string
  fontWeight: string
  lineHeight: string
}> = (theme: BaseTheme) => {
  const { colors, borders, spacing, typography } = theme
  
  return {
    // Default variant
    defaultBackground: colors.UI.surfaceDark,
    defaultColor: colors.UI.textSecondary,
    
    // Primary variant
    primaryBackground: colors.brand.oceanBlue,
    primaryColor: colors.contrasts.white1010,
    
    // Secondary variant
    secondaryBackground: colors.brand.sunsetOrange,
    secondaryColor: colors.contrasts.white1010,
    
    // Success variant
    successBackground: colors.contrasts.green4570,
    successColor: colors.contrasts.white1010,
    
    // Warning variant
    warningBackground: '#F59E0B',
    warningColor: colors.contrasts.white1010,
    
    // Error variant
    errorBackground: colors.contrasts.red4570,
    errorColor: colors.contrasts.white1010,
    
    // Layout
    borderRadius: borders.radiusPill,
    padding: `${spacing.xxsmall} ${spacing.small}`,
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    lineHeight: typography.lineHeight.none
  }
}

// Utility function to generate component styles
export const generateComponentStyles = (
  componentTheme: Record<string, any>,
  props?: Record<string, any>,
  state?: Record<string, any>
): Record<string, any> => {
  // This function can be extended to handle complex styling logic
  // For now, it returns the theme variables directly
  return componentTheme
}

// CSS-in-JS helper for creating component styles
export const createComponentStyles = (
  styleGenerator: (theme: any, props?: any, state?: any) => Record<string, any>
) => {
  return styleGenerator
}

// Accessibility helper functions
export const getAccessibleColors = (theme: BaseTheme) => {
  return {
    // High contrast pairs for accessibility
    highContrastPairs: [
      { background: theme.colors.contrasts.white1010, text: theme.colors.contrasts.black1010 },
      { background: theme.colors.contrasts.black1010, text: theme.colors.contrasts.white1010 },
      { background: theme.colors.brand.oceanBlue, text: theme.colors.contrasts.white1010 },
      { background: theme.colors.brand.sunsetOrange, text: theme.colors.contrasts.white1010 }
    ],
    
    // Focus ring color
    focusRing: theme.colors.brand.oceanBlue,
    
    // Error colors
    errorBackground: theme.colors.contrasts.red4570,
    errorText: theme.colors.contrasts.white1010,
    
    // Success colors
    successBackground: theme.colors.contrasts.green4570,
    successText: theme.colors.contrasts.white1010
  }
}

// Export all component theme generators
export const componentThemeGenerators = {
  button: generateButtonComponentTheme,
  card: generateCardComponentTheme,
  input: generateInputComponentTheme,
  navigation: generateNavigationComponentTheme,
  badge: generateBadgeComponentTheme
} as const

export type ComponentThemeGeneratorNames = keyof typeof componentThemeGenerators
