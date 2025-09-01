/**
 * Design System Themes - Light and Dark themes for Cascais Fishing Platform
 * Following Instructure UI architecture with Tailwind CSS integration
 */

import type { BaseTheme } from './types'

// Base theme following Instructure UI patterns
const baseThemeStructure = {
  // Typography system with web fonts and accessibility
  typography: {
    fontFamily: {
      primary: 'var(--font-montserrat), system-ui, -apple-system, sans-serif',
      secondary: 'var(--font-open-sans), system-ui, -apple-system, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, monospace'
    },
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px  
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
      '6xl': '3.75rem'  // 60px
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2'
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900'
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em'
    }
  },
  
  // Spacing system following 8px grid
  spacing: {
    xxxsmall: '0.125rem',  // 2px
    xxsmall: '0.25rem',    // 4px
    xsmall: '0.5rem',      // 8px
    small: '0.75rem',      // 12px
    medium: '1rem',        // 16px
    large: '1.5rem',       // 24px
    xlarge: '2rem',        // 32px
    xxlarge: '3rem',       // 48px
    xxxlarge: '4rem',      // 64px
    
    // Specific use cases
    buttons: '0.75rem 1.5rem',      // 12px 24px
    cards: '1.5rem',                // 24px
    sections: '3rem 0',             // 48px vertical
    containers: '0 1rem'            // 16px horizontal
  },
  
  // Border system
  borders: {
    widthSmall: '1px',
    widthMedium: '2px',
    widthLarge: '4px',
    
    radiusSmall: '0.25rem',   // 4px
    radiusMedium: '0.5rem',   // 8px
    radiusLarge: '0.75rem',   // 12px
    radiusPill: '50rem',      // pill shape
    radiusCircle: '50%',      // circle
    
    style: {
      solid: 'solid',
      dashed: 'dashed',
      dotted: 'dotted'
    }
  },
  
  // Shadow system for depth
  shadows: {
    small: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    large: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xlarge: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    
    // Semantic shadows
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    modal: '0 20px 25px -5px rgb(0 0 0 / 0.25), 0 8px 10px -6px rgb(0 0 0 / 0.25)',
    dropdown: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    tooltip: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
  },
  
  // Transition system
  transitions: {
    duration: {
      fast: '0.15s',
      medium: '0.3s', 
      slow: '0.5s'
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear'
    }
  },
  
  // Responsive breakpoints
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  },
  
  // Z-index scale
  zIndex: {
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
  }
}

// Light theme for Cascais Fishing Platform
export const cascaisLightTheme: BaseTheme = {
  key: 'cascais-light',
  description: 'Light theme for Cascais Fishing Platform with ocean-inspired colors',
  
  // Primitive colors (base hex values)
  colors: {
    primitives: {
      // Ocean Blues
      blue4570: '#3B82F6',   // Bright Blue
      blue5782: '#1E40AF',   // Deep Blue
      
      // Sunset Oranges  
      orange4570: '#F97316', // Bright Orange
      orange5782: '#EA580C', // Deep Orange
      
      // Neutrals
      grey125125: '#F8FAFC', // Light Grey
      grey240240: '#64748B', // Medium Grey
      white1010: '#FFFFFF',  // Pure White
      black1010: '#0F172A'   // Deep Black
    },
    
    contrasts: {
      white1010: '#FFFFFF',
      grey125125: '#F8FAFC', 
      grey240240: '#64748B',
      black1010: '#0F172A',
      blue4570: '#3B82F6',
      blue5782: '#1E40AF',
      orange4570: '#F97316',
      orange5782: '#EA580C',
      green4570: '#10B981',  // Success Green
      red4570: '#EF4444'     // Error Red
    },
    
    UI: {
      // Surface colors
      surfaceLight: '#FFFFFF',
      surfaceDark: '#F8FAFC',
      surfaceInverse: '#0F172A',
      
      // Text colors
      textPrimary: '#0F172A',
      textSecondary: '#64748B',
      textSuccess: '#059669',
      textWarning: '#D97706', 
      textError: '#DC2626',
      textInfo: '#2563EB',
      
      // Border colors
      borderLight: '#E2E8F0',
      borderMedium: '#CBD5E1', 
      borderDark: '#94A3B8'
    },
    
    brand: {
      oceanBlue: '#1E40AF',    // Primary brand color
      sunsetOrange: '#EA580C', // Secondary brand color
      deepWater: '#0F172A',    // Dark accent
      sandyBeach: '#F8FAFC',   // Light accent
      seaFoam: '#10B981'       // Success/accent color
    }
  },
  
  ...baseThemeStructure
}

// Dark theme for Cascais Fishing Platform
export const cascaisDarkTheme: BaseTheme = {
  key: 'cascais-dark',
  description: 'Dark theme for Cascais Fishing Platform with deep ocean colors',
  
  // Primitive colors adjusted for dark theme
  colors: {
    primitives: {
      // Ocean Blues (adjusted for dark)
      blue4570: '#60A5FA',   // Lighter Blue for dark backgrounds
      blue5782: '#3B82F6',   // Medium Blue
      
      // Sunset Oranges (adjusted for dark)
      orange4570: '#FB923C', // Lighter Orange
      orange5782: '#F97316', // Medium Orange
      
      // Dark neutrals
      grey125125: '#1E293B', // Dark Grey
      grey240240: '#94A3B8', // Light Grey for text
      white1010: '#F8FAFC',  // Off-white for text
      black1010: '#020617'   // Very Dark for surfaces
    },
    
    contrasts: {
      white1010: '#F8FAFC',
      grey125125: '#1E293B',
      grey240240: '#94A3B8',
      black1010: '#020617',
      blue4570: '#60A5FA',
      blue5782: '#3B82F6',
      orange4570: '#FB923C',
      orange5782: '#F97316',
      green4570: '#34D399',  // Brighter Success Green
      red4570: '#F87171'     // Softer Error Red
    },
    
    UI: {
      // Surface colors for dark mode
      surfaceLight: '#0F172A',
      surfaceDark: '#020617',
      surfaceInverse: '#F8FAFC',
      
      // Text colors for dark mode
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      textSuccess: '#34D399',
      textWarning: '#FBBF24',
      textError: '#F87171',
      textInfo: '#60A5FA',
      
      // Border colors for dark mode
      borderLight: '#334155',
      borderMedium: '#475569',
      borderDark: '#64748B'
    },
    
    brand: {
      oceanBlue: '#60A5FA',    // Lighter for dark backgrounds
      sunsetOrange: '#FB923C', // Lighter for dark backgrounds  
      deepWater: '#F8FAFC',    // Light text color
      sandyBeach: '#1E293B',   // Dark accent
      seaFoam: '#34D399'       // Bright success color
    }
  },
  
  ...baseThemeStructure
}

// Theme registry following Instructure UI pattern
export const themes = {
  'cascais-light': cascaisLightTheme,
  'cascais-dark': cascaisDarkTheme
} as const

export type ThemeName = keyof typeof themes

// Default theme
export const defaultTheme = cascaisLightTheme

// Theme utilities
export const getTheme = (themeName: ThemeName): BaseTheme => {
  return themes[themeName] || defaultTheme
}

export const getThemeNames = (): ThemeName[] => {
  return Object.keys(themes) as ThemeName[]
}
