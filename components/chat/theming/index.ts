/**
 * Chat Theming System - Main Export File
 * Task 20: Stream Chat Theming & Customization
 * 
 * Complete theming system for Cascais Fishing Platform
 */

// Core theming components
export { default as FishingEmojiUtils } from './FishingEmojiSet';
export { 
  FISHING_EMOJI_SET, 
  FISHING_EMOJI_CATEGORIES, 
  FISHING_QUICK_REACTIONS,
  FishingQuickReactions,
  FISHING_REACTIONS_STYLES 
} from './FishingEmojiSet';

export { 
  CustomEmojiPicker, 
  EmojiButton, 
  useEmojiPicker 
} from './CustomEmojiPicker';

export { 
  ThreadView, 
  ThreadPreview, 
  ReplyButton, 
  useThreading 
} from './ThreadingCustomization';

export { 
  FileSharing, 
  FishingFileShortcuts, 
  useFileUpload 
} from './FileSharing';

export { 
  ResponsiveChatLayout, 
  ResponsiveMessageBubble, 
  useResponsive 
} from './ResponsiveChatLayout';

// Types
export type { 
  FishingEmoji, 
  FishingQuickReactionsProps 
} from './FishingEmojiSet';

export type { 
  CustomEmojiPickerProps, 
  EmojiButtonProps 
} from './CustomEmojiPicker';

export type { 
  ThreadMessage, 
  ThreadAttachment, 
  ThreadViewProps, 
  ThreadPreviewProps, 
  ReplyButtonProps 
} from './ThreadingCustomization';

export type { 
  FileAttachment, 
  FileSharingProps, 
  FishingFileShortcutsProps 
} from './FileSharing';

export type { 
  ChatLayoutProps, 
  MobileNavItem, 
  ResponsiveMessageBubbleProps 
} from './ResponsiveChatLayout';

// Theme configuration
export const CHAT_THEME_CONFIG = {
  // Color scheme
  colors: {
    primary: 'oklch(0.5 0.15 240)', // Ocean Blue
    secondary: 'oklch(0.65 0.2 45)', // Sunset Orange
    accent: 'oklch(0.98 0.01 85)', // Light Sand
    background: 'oklch(1 0 0)', // Soft White
    text: 'oklch(0.25 0 0)', // Dark Slate
    textSecondary: 'oklch(0.45 0 0)', // Medium Gray
    border: 'oklch(0.92 0 0)', // Neutral border
    success: 'oklch(0.65 0.15 142)', // Green
    error: 'oklch(0.577 0.245 27.325)', // Red
    warning: 'oklch(0.75 0.2 65)' // Amber
  },

  // Typography
  typography: {
    fontFamily: 'var(--font-sans), Montserrat, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px'
  },

  // Border radius
  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '50%'
  },

  // Shadows
  shadows: {
    sm: '0 2px 4px oklch(0.25 0 0 / 0.05)',
    md: '0 4px 8px oklch(0.25 0 0 / 0.1)',
    lg: '0 8px 16px oklch(0.25 0 0 / 0.15)',
    xl: '0 12px 24px oklch(0.25 0 0 / 0.2)'
  },

  // Responsive breakpoints
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1440px',
    wide: '1920px'
  },

  // Feature flags
  features: {
    fishing_emojis: true,
    custom_reactions: true,
    threading: true,
    file_sharing: true,
    responsive_design: true,
    dark_mode: true,
    reduced_motion: true,
    high_contrast: true
  }
} as const;

// CSS custom properties generator
export function generateChatThemeCSS(): string {
  const { colors, typography, spacing, borderRadius, shadows } = CHAT_THEME_CONFIG;

  return `
    :root {
      /* Chat Theme Colors */
      --chat-primary: ${colors.primary};
      --chat-secondary: ${colors.secondary};
      --chat-accent: ${colors.accent};
      --chat-background: ${colors.background};
      --chat-text: ${colors.text};
      --chat-text-secondary: ${colors.textSecondary};
      --chat-border: ${colors.border};
      --chat-success: ${colors.success};
      --chat-error: ${colors.error};
      --chat-warning: ${colors.warning};

      /* Chat Typography */
      --chat-font-family: ${typography.fontFamily};
      --chat-font-size-xs: ${typography.fontSize.xs};
      --chat-font-size-sm: ${typography.fontSize.sm};
      --chat-font-size-base: ${typography.fontSize.base};
      --chat-font-size-lg: ${typography.fontSize.lg};
      --chat-font-size-xl: ${typography.fontSize.xl};
      --chat-font-weight-normal: ${typography.fontWeight.normal};
      --chat-font-weight-medium: ${typography.fontWeight.medium};
      --chat-font-weight-semibold: ${typography.fontWeight.semibold};
      --chat-font-weight-bold: ${typography.fontWeight.bold};

      /* Chat Spacing */
      --chat-spacing-xs: ${spacing.xs};
      --chat-spacing-sm: ${spacing.sm};
      --chat-spacing-md: ${spacing.md};
      --chat-spacing-lg: ${spacing.lg};
      --chat-spacing-xl: ${spacing.xl};
      --chat-spacing-2xl: ${spacing['2xl']};

      /* Chat Border Radius */
      --chat-radius-sm: ${borderRadius.sm};
      --chat-radius-md: ${borderRadius.md};
      --chat-radius-lg: ${borderRadius.lg};
      --chat-radius-xl: ${borderRadius.xl};
      --chat-radius-full: ${borderRadius.full};

      /* Chat Shadows */
      --chat-shadow-sm: ${shadows.sm};
      --chat-shadow-md: ${shadows.md};
      --chat-shadow-lg: ${shadows.lg};
      --chat-shadow-xl: ${shadows.xl};

      /* Chat Gradients */
      --chat-gradient-primary: linear-gradient(135deg, ${colors.primary} 0%, oklch(0.45 0.12 220) 100%);
      --chat-gradient-secondary: linear-gradient(135deg, ${colors.secondary} 0%, oklch(0.7 0.18 35) 100%);
    }
  `;
}

// Theme utility functions
export const ChatThemeUtils = {
  // Apply theme to Stream Chat
  applyStreamChatTheme: () => {
    if (typeof document !== 'undefined') {
      const existingStyle = document.getElementById('fishing-chat-theme');
      if (existingStyle) {
        existingStyle.remove();
      }

      const style = document.createElement('style');
      style.id = 'fishing-chat-theme';
      style.textContent = generateChatThemeCSS();
      document.head.appendChild(style);
    }
  },

  // Get responsive breakpoint
  getBreakpoint: (width: number): keyof typeof CHAT_THEME_CONFIG.breakpoints => {
    if (width < parseInt(CHAT_THEME_CONFIG.breakpoints.mobile)) return 'mobile';
    if (width < parseInt(CHAT_THEME_CONFIG.breakpoints.tablet)) return 'tablet';
    if (width < parseInt(CHAT_THEME_CONFIG.breakpoints.desktop)) return 'desktop';
    return 'wide';
  },

  // Check if feature is enabled
  isFeatureEnabled: (feature: keyof typeof CHAT_THEME_CONFIG.features): boolean => {
    return CHAT_THEME_CONFIG.features[feature];
  },

  // Get theme color
  getColor: (colorKey: keyof typeof CHAT_THEME_CONFIG.colors): string => {
    return CHAT_THEME_CONFIG.colors[colorKey];
  },

  // Get typography setting
  getTypography: (
    category: keyof typeof CHAT_THEME_CONFIG.typography,
    key?: string
  ): any => {
    const typographyCategory = CHAT_THEME_CONFIG.typography[category];
    return key && typeof typographyCategory === 'object' 
      ? typographyCategory[key as keyof typeof typographyCategory]
      : typographyCategory;
  }
};

// Stream Chat custom theme object
export const STREAM_CHAT_CUSTOM_THEME = {
  '--str-chat__primary-color': CHAT_THEME_CONFIG.colors.primary,
  '--str-chat__secondary-color': CHAT_THEME_CONFIG.colors.secondary,
  '--str-chat__accent-color': CHAT_THEME_CONFIG.colors.accent,
  '--str-chat__background-color': CHAT_THEME_CONFIG.colors.background,
  '--str-chat__text-color': CHAT_THEME_CONFIG.colors.text,
  '--str-chat__border-color': CHAT_THEME_CONFIG.colors.border,
  '--str-chat__border-radius': CHAT_THEME_CONFIG.borderRadius.lg,
  '--str-chat__font-family': CHAT_THEME_CONFIG.typography.fontFamily,
  '--str-chat__font-size': CHAT_THEME_CONFIG.typography.fontSize.base
};

// Export default theme configuration
export default CHAT_THEME_CONFIG;
