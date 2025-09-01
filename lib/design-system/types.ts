/**
 * Design System Types - Comprehensive type definitions for the Cascais Fishing design system
 * Inspired by Instructure UI patterns and integrated with Shadcn/Tailwind
 */

// Base theme structure following Instructure UI patterns
export interface BaseTheme {
  key: string
  description: string
  colors: ThemeColors
  typography: Typography
  spacing: Spacing
  borders: Borders
  shadows: Shadows
  transitions: Transitions
  breakpoints: Breakpoints
  zIndex: ZIndex
}

// Color system following Instructure UI color architecture
export interface ThemeColors {
  // Primitive colors (base hex values)
  primitives: {
    blue4570: string
    blue5782: string
    orange4570: string
    orange5782: string
    grey125125: string
    grey240240: string
    white1010: string
    black1010: string
  }
  
  // Semantic colors mapped from primitives
  contrasts: {
    white1010: string
    grey125125: string
    grey240240: string
    black1010: string
    blue4570: string
    blue5782: string
    orange4570: string
    orange5782: string
    green4570: string
    red4570: string
  }
  
  // UI specific colors
  UI: {
    surfaceLight: string
    surfaceDark: string
    surfaceInverse: string
    textPrimary: string
    textSecondary: string
    textSuccess: string
    textWarning: string
    textError: string
    textInfo: string
    borderLight: string
    borderMedium: string
    borderDark: string
  }
  
  // Brand colors for Cascais Fishing
  brand: {
    oceanBlue: string
    sunsetOrange: string
    deepWater: string
    sandyBeach: string
    seaFoam: string
  }
}

// Typography system with accessibility features
export interface Typography {
  fontFamily: {
    primary: string
    secondary: string
    mono: string
  }
  fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
    '5xl': string
    '6xl': string
  }
  lineHeight: {
    none: string
    tight: string
    snug: string
    normal: string
    relaxed: string
    loose: string
  }
  fontWeight: {
    thin: string
    extralight: string
    light: string
    normal: string
    medium: string
    semibold: string
    bold: string
    extrabold: string
    black: string
  }
  letterSpacing: {
    tighter: string
    tight: string
    normal: string
    wide: string
    wider: string
    widest: string
  }
}

// Spacing system following 8px grid
export interface Spacing {
  xxxsmall: string
  xxsmall: string
  xsmall: string
  small: string
  medium: string
  large: string
  xlarge: string
  xxlarge: string
  xxxlarge: string
  
  // Specific spacing for common use cases
  buttons: string
  cards: string
  sections: string
  containers: string
}

// Border system
export interface Borders {
  widthSmall: string
  widthMedium: string
  widthLarge: string
  
  radiusSmall: string
  radiusMedium: string
  radiusLarge: string
  radiusPill: string
  radiusCircle: string
  
  style: {
    solid: string
    dashed: string
    dotted: string
  }
}

// Shadow system for depth
export interface Shadows {
  small: string
  medium: string
  large: string
  xlarge: string
  
  // Semantic shadows
  card: string
  modal: string
  dropdown: string
  tooltip: string
}

// Transition system for animations
export interface Transitions {
  duration: {
    fast: string
    medium: string
    slow: string
  }
  timing: {
    ease: string
    easeIn: string
    easeOut: string
    easeInOut: string
    linear: string
  }
}

// Responsive breakpoints
export interface Breakpoints {
  xs: string
  sm: string
  md: string
  lg: string
  xl: string
  '2xl': string
}

// Z-index scale
export interface ZIndex {
  hide: number
  auto: number
  base: number
  docked: number
  dropdown: number
  sticky: number
  banner: number
  overlay: number
  modal: number
  popover: number
  tooltip: number
}

// Component theme generator function type (following Instructure UI pattern)
export type GenerateComponentTheme<T = Record<string, any>> = (theme: BaseTheme) => T

// Theme override capabilities
export interface ThemeOverride {
  componentOverrides?: {
    [componentName: string]: Record<string, any>
  }
  themeOverrides?: {
    [themeName: string]: Partial<BaseTheme>
  }
}

// Enhanced theme provider props
export interface EnhancedThemeProviderProps {
  theme?: BaseTheme
  themeOverride?: ThemeOverride
  children: React.ReactNode
  enableSystemTheme?: boolean
  enableColorSchemePreference?: boolean
}

// Component styling utilities
export interface ComponentStyleUtils {
  generateStyle: (theme: BaseTheme, props?: any, state?: any) => Record<string, any>
  generateComponentTheme: GenerateComponentTheme
  componentId: string
}

// Accessibility features
export interface AccessibilityFeatures {
  highContrast: boolean
  reducedMotion: boolean
  focusVisible: boolean
  screenReader: boolean
}

// Design system context type
export interface DesignSystemContextType {
  theme: BaseTheme
  setTheme: (theme: BaseTheme) => void
  themeOverride?: ThemeOverride
  setThemeOverride: (override: ThemeOverride) => void
  accessibility: AccessibilityFeatures
  setAccessibility: (features: Partial<AccessibilityFeatures>) => void
}
