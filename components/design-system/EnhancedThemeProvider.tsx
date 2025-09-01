/**
 * Enhanced Theme Provider - Combines Instructure UI patterns with Next-themes
 * Provides comprehensive theming capabilities for the Cascais Fishing Platform
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { cascaisLightTheme, cascaisDarkTheme, getTheme } from '@/lib/design-system/themes'
import type { 
  BaseTheme, 
  EnhancedThemeProviderProps, 
  DesignSystemContextType,
  AccessibilityFeatures,
  ThemeOverride 
} from '@/lib/design-system/types'

// Design System Context
const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined)

// CSS Variables injection following Instructure UI patterns
const injectThemeVariables = (theme: BaseTheme, themeOverride?: ThemeOverride) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  
  // Apply component overrides if any
  let finalTheme = theme
  if (themeOverride?.themeOverrides?.[theme.key]) {
    finalTheme = {
      ...theme,
      ...themeOverride.themeOverrides[theme.key]
    }
  }

  // Inject primitive colors
  Object.entries(finalTheme.colors.primitives).forEach(([key, value]) => {
    root.style.setProperty(`--color-primitive-${key}`, value)
  })

  // Inject contrast colors
  Object.entries(finalTheme.colors.contrasts).forEach(([key, value]) => {
    root.style.setProperty(`--color-contrast-${key}`, value)
  })

  // Inject UI colors
  Object.entries(finalTheme.colors.UI).forEach(([key, value]) => {
    root.style.setProperty(`--color-ui-${key}`, value)
  })

  // Inject brand colors
  Object.entries(finalTheme.colors.brand).forEach(([key, value]) => {
    root.style.setProperty(`--color-brand-${key}`, value)
  })

  // Inject typography
  Object.entries(finalTheme.typography.fontFamily).forEach(([key, value]) => {
    root.style.setProperty(`--font-family-${key}`, value)
  })
  
  Object.entries(finalTheme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value)
  })

  Object.entries(finalTheme.typography.lineHeight).forEach(([key, value]) => {
    root.style.setProperty(`--line-height-${key}`, value)
  })

  Object.entries(finalTheme.typography.fontWeight).forEach(([key, value]) => {
    root.style.setProperty(`--font-weight-${key}`, value)
  })

  // Inject spacing
  Object.entries(finalTheme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value)
  })

  // Inject borders
  Object.entries(finalTheme.borders).forEach(([key, value]) => {
    if (typeof value === 'object') {
      Object.entries(value).forEach(([subKey, subValue]) => {
        root.style.setProperty(`--border-${key}-${subKey}`, subValue)
      })
    } else {
      root.style.setProperty(`--border-${key}`, value)
    }
  })

  // Inject shadows
  Object.entries(finalTheme.shadows).forEach(([key, value]) => {
    root.style.setProperty(`--shadow-${key}`, value)
  })

  // Inject transitions
  Object.entries(finalTheme.transitions.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value)
  })
  
  Object.entries(finalTheme.transitions.timing).forEach(([key, value]) => {
    root.style.setProperty(`--timing-${key}`, value)
  })

  // Inject z-index values
  Object.entries(finalTheme.zIndex).forEach(([key, value]) => {
    root.style.setProperty(`--z-${key}`, value.toString())
  })
}

// Hook for accessing design system context
export const useDesignSystem = (): DesignSystemContextType => {
  const context = useContext(DesignSystemContext)
  if (!context) {
    throw new Error('useDesignSystem must be used within an EnhancedThemeProvider')
  }
  return context
}

// Component theme generator utility (following Instructure UI pattern)
export const useComponentTheme = <T extends Record<string, any>>(
  generateComponentTheme: (theme: BaseTheme) => T,
  themeOverride?: Partial<T>
): T => {
  const { theme } = useDesignSystem()
  
  return useMemo(() => {
    const componentTheme = generateComponentTheme(theme)
    return themeOverride ? { ...componentTheme, ...themeOverride } : componentTheme
  }, [theme, generateComponentTheme, themeOverride])
}

// Accessibility utilities
const useAccessibilityFeatures = (): [AccessibilityFeatures, (features: Partial<AccessibilityFeatures>) => void] => {
  const [features, setFeatures] = useState<AccessibilityFeatures>({
    highContrast: false,
    reducedMotion: false,
    focusVisible: true,
    screenReader: false
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for prefers-reduced-motion
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setFeatures(prev => ({ ...prev, reducedMotion: mediaQuery.matches }))

      // Check for high contrast preference
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      setFeatures(prev => ({ ...prev, highContrast: highContrastQuery.matches }))

      // Listen for changes
      const handleReducedMotionChange = (e: MediaQueryListEvent) => {
        setFeatures(prev => ({ ...prev, reducedMotion: e.matches }))
      }

      const handleHighContrastChange = (e: MediaQueryListEvent) => {
        setFeatures(prev => ({ ...prev, highContrast: e.matches }))
      }

      mediaQuery.addEventListener('change', handleReducedMotionChange)
      highContrastQuery.addEventListener('change', handleHighContrastChange)

      return () => {
        mediaQuery.removeEventListener('change', handleReducedMotionChange)
        highContrastQuery.removeEventListener('change', handleHighContrastChange)
      }
    }
  }, [])

  const updateFeatures = (newFeatures: Partial<AccessibilityFeatures>) => {
    setFeatures(prev => ({ ...prev, ...newFeatures }))
  }

  return [features, updateFeatures]
}

// Main Enhanced Theme Provider Component
export const EnhancedThemeProvider: React.FC<EnhancedThemeProviderProps> = ({
  children,
  theme: initialTheme,
  themeOverride: initialThemeOverride,
  enableSystemTheme = true,
  enableColorSchemePreference = true
}) => {
  const [currentTheme, setCurrentTheme] = useState<BaseTheme>(initialTheme || cascaisLightTheme)
  const [themeOverride, setThemeOverride] = useState<ThemeOverride | undefined>(initialThemeOverride)
  const [accessibility, setAccessibility] = useAccessibilityFeatures()

  // Theme switching logic
  const handleThemeChange = (theme: BaseTheme) => {
    setCurrentTheme(theme)
    injectThemeVariables(theme, themeOverride)
  }

  // System theme detection
  useEffect(() => {
    if (enableSystemTheme && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleSystemThemeChange = () => {
        const systemTheme = mediaQuery.matches ? cascaisDarkTheme : cascaisLightTheme
        handleThemeChange(systemTheme)
      }

      // Set initial theme based on system preference
      if (!initialTheme) {
        handleSystemThemeChange()
      }

      mediaQuery.addEventListener('change', handleSystemThemeChange)
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange)
    }
  }, [enableSystemTheme, initialTheme])

  // Inject CSS variables when theme or overrides change
  useEffect(() => {
    injectThemeVariables(currentTheme, themeOverride)
  }, [currentTheme, themeOverride])

  // Apply accessibility classes to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const { documentElement } = document
      
      // High contrast
      if (accessibility.highContrast) {
        documentElement.classList.add('high-contrast')
      } else {
        documentElement.classList.remove('high-contrast')
      }

      // Reduced motion
      if (accessibility.reducedMotion) {
        documentElement.classList.add('reduce-motion')
      } else {
        documentElement.classList.remove('reduce-motion')
      }

      // Focus visible
      if (accessibility.focusVisible) {
        documentElement.classList.add('focus-visible')
      } else {
        documentElement.classList.remove('focus-visible')
      }
    }
  }, [accessibility])

  // Context value
  const contextValue: DesignSystemContextType = {
    theme: currentTheme,
    setTheme: handleThemeChange,
    themeOverride,
    setThemeOverride,
    accessibility,
    setAccessibility
  }

  return (
    <NextThemesProvider
      attribute="class"
      enableSystem={enableSystemTheme}
      enableColorScheme={enableColorSchemePreference}
    >
      <DesignSystemContext.Provider value={contextValue}>
        {children}
      </DesignSystemContext.Provider>
    </NextThemesProvider>
  )
}

// Theme switching utilities
export const useThemeSwitcher = () => {
  const { theme, setTheme } = useDesignSystem()
  
  const switchToLight = () => setTheme(cascaisLightTheme)
  const switchToDark = () => setTheme(cascaisDarkTheme)
  const toggleTheme = () => {
    setTheme(theme.key === 'cascais-light' ? cascaisDarkTheme : cascaisLightTheme)
  }

  return {
    currentTheme: theme,
    switchToLight,
    switchToDark,
    toggleTheme,
    isLight: theme.key === 'cascais-light',
    isDark: theme.key === 'cascais-dark'
  }
}

// Export commonly used hooks and utilities
export { useComponentTheme }
export type { DesignSystemContextType, AccessibilityFeatures }
