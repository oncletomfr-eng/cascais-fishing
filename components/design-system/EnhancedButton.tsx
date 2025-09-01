/**
 * Enhanced Button Component - Following Instructure UI patterns
 * Integrated with the Cascais Fishing design system
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useComponentTheme } from './EnhancedThemeProvider'
import { generateButtonComponentTheme } from '@/lib/design-system/component-utils'
import type { BaseTheme } from '@/lib/design-system/types'

// Button variants following design system
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'small' | 'medium' | 'large'

interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  fullWidth?: boolean
  themeOverride?: Partial<ReturnType<typeof generateButtonComponentTheme>>
  children: React.ReactNode
}

// Generate button styles based on theme and props
const generateButtonStyles = (
  theme: ReturnType<typeof generateButtonComponentTheme>,
  variant: ButtonVariant,
  size: ButtonSize,
  disabled: boolean,
  loading: boolean,
  fullWidth: boolean
) => {
  // Base styles
  const baseStyles = {
    fontFamily: 'var(--font-family-ui)',
    fontSize: theme.fontSize,
    fontWeight: theme.fontWeight,
    lineHeight: theme.lineHeight,
    borderRadius: theme.borderRadius,
    borderWidth: theme.borderWidth,
    minHeight: theme.minHeight,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? theme.disabledOpacity : loading ? theme.loadingOpacity : 1,
    width: fullWidth ? '100%' : 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.15s ease',
    outline: 'none',
    position: 'relative' as const
  }

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: theme.primaryBackground,
      color: theme.primaryColor,
      borderColor: theme.primaryBorder,
      '&:hover:not(:disabled)': {
        backgroundColor: theme.primaryHoverBackground,
        color: theme.primaryHoverColor
      },
      '&:active:not(:disabled)': {
        backgroundColor: theme.primaryActiveBackground
      },
      '&:focus-visible': {
        boxShadow: theme.primaryFocusRing
      }
    },
    secondary: {
      backgroundColor: theme.secondaryBackground,
      color: theme.secondaryColor,
      borderColor: theme.secondaryBorder,
      borderStyle: 'solid',
      '&:hover:not(:disabled)': {
        backgroundColor: theme.secondaryHoverBackground,
        color: theme.secondaryHoverColor
      },
      '&:active:not(:disabled)': {
        backgroundColor: theme.secondaryActiveBackground
      },
      '&:focus-visible': {
        boxShadow: theme.primaryFocusRing
      }
    },
    ghost: {
      backgroundColor: theme.ghostBackground,
      color: theme.ghostColor,
      border: 'none',
      '&:hover:not(:disabled)': {
        backgroundColor: theme.ghostHoverBackground,
        color: theme.ghostHoverColor
      },
      '&:focus-visible': {
        boxShadow: theme.primaryFocusRing
      }
    },
    destructive: {
      backgroundColor: theme.destructiveBackground,
      color: theme.destructiveColor,
      borderColor: theme.destructiveBorder,
      '&:hover:not(:disabled)': {
        backgroundColor: theme.destructiveHoverBackground
      },
      '&:focus-visible': {
        boxShadow: `0 0 0 2px ${theme.destructiveBackground}40`
      }
    }
  }

  // Size styles
  const sizeStyles = {
    small: { padding: theme.smallPadding },
    medium: { padding: theme.mediumPadding },
    large: { padding: theme.largePadding }
  }

  return {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size]
  }
}

// Loading spinner component
const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const spinnerSize = {
    small: '16px',
    medium: '20px', 
    large: '24px'
  }[size]

  return (
    <svg
      width={spinnerSize}
      height={spinnerSize}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        className="opacity-25"
      />
      <path
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        className="opacity-75"
      />
    </svg>
  )
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  themeOverride,
  className,
  disabled,
  children,
  style,
  ...props
}) => {
  // Get component theme from design system
  const componentTheme = useComponentTheme(generateButtonComponentTheme, themeOverride)
  
  // Generate styles
  const buttonStyles = generateButtonStyles(
    componentTheme,
    variant,
    size,
    Boolean(disabled),
    loading,
    fullWidth
  )

  // Convert styles to CSS custom properties for CSS-in-JS compatibility
  const cssProperties: React.CSSProperties = {
    ...style,
    backgroundColor: buttonStyles.backgroundColor,
    color: buttonStyles.color,
    borderColor: buttonStyles.borderColor,
    borderWidth: buttonStyles.borderWidth,
    borderStyle: buttonStyles.borderStyle || 'solid',
    borderRadius: buttonStyles.borderRadius,
    padding: buttonStyles.padding,
    fontSize: buttonStyles.fontSize,
    fontWeight: buttonStyles.fontWeight,
    lineHeight: buttonStyles.lineHeight,
    minHeight: buttonStyles.minHeight,
    width: buttonStyles.width,
    opacity: buttonStyles.opacity,
    cursor: buttonStyles.cursor,
    display: buttonStyles.display,
    alignItems: buttonStyles.alignItems,
    justifyContent: buttonStyles.justifyContent,
    gap: buttonStyles.gap,
    transition: buttonStyles.transition,
    outline: buttonStyles.outline,
    position: buttonStyles.position
  }

  // Base CSS classes for hover, focus, and active states
  const baseClasses = cn(
    // Focus styles
    'focus-visible:ring-2 focus-visible:ring-offset-2',
    variant === 'primary' && 'focus-visible:ring-blue-500',
    variant === 'secondary' && 'focus-visible:ring-blue-500',
    variant === 'ghost' && 'focus-visible:ring-blue-500',
    variant === 'destructive' && 'focus-visible:ring-red-500',
    
    // Hover styles
    !disabled && !loading && 'hover:shadow-sm',
    
    // Size-specific classes
    size === 'small' && 'text-sm',
    size === 'medium' && 'text-base',
    size === 'large' && 'text-lg',
    
    // Accessibility
    'select-none',
    
    className
  )

  return (
    <button
      style={cssProperties}
      className={baseClasses}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <LoadingSpinner size={size} />
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span aria-hidden="true">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span aria-hidden="true">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export default EnhancedButton
