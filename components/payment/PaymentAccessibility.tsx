'use client';

import React, { 
  useRef, 
  useEffect, 
  useState,
  useCallback,
  createContext,
  useContext 
} from 'react';
import { styled } from '@mui/material/styles';
import { 
  Box, 
  Typography, 
  FormControl,
  FormLabel,
  FormHelperText,
  Alert,
  Button,
  Switch,
  FormControlLabel,
  Tooltip,
  IconButton,
  Paper,
  Stack,
  useTheme
} from '@mui/material';
import { 
  Volume2, 
  VolumeX, 
  Eye, 
  EyeOff,
  Pause,
  Play,
  RotateCcw,
  Zap,
  ZapOff,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';

// Accessibility types
export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  voiceAnnouncements: boolean;
  largeText: boolean;
  focusIndicators: boolean;
}

export interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  updateSetting: (key: keyof AccessibilitySettings, value: boolean) => void;
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  focusTrap: (element: HTMLElement) => () => void;
}

export interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  onEscape?: () => void;
  className?: string;
}

export interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

export interface AccessibleFormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: React.ReactNode;
  className?: string;
}

export interface VoiceAnnouncerProps {
  message: string;
  priority?: 'polite' | 'assertive';
  onComplete?: () => void;
}

export interface AccessibilityControlsProps {
  onSettingsChange?: (settings: AccessibilitySettings) => void;
  className?: string;
}

// Default accessibility settings
const DEFAULT_SETTINGS: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  voiceAnnouncements: true,
  largeText: false,
  focusIndicators: true
};

// Accessibility context
const AccessibilityContext = createContext<AccessibilityContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  announce: () => {},
  focusTrap: () => () => {}
});

// Styled components
const ScreenReaderOnly = styled(Box)(() => ({
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0
}));

const HighContrastContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'highContrast'
})<{ highContrast?: boolean }>(({ theme, highContrast }) => ({
  ...(highContrast && {
    '& .MuiTextField-root, & .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: theme.palette.text.primary,
        borderWidth: '2px'
      },
      '&:hover fieldset': {
        borderColor: theme.palette.text.primary
      },
      '&.Mui-focused fieldset': {
        borderColor: theme.palette.primary.main,
        borderWidth: '3px'
      }
    },
    '& .MuiButton-root': {
      border: `2px solid ${theme.palette.text.primary}`,
      '&:focus': {
        outline: `3px solid ${theme.palette.primary.main}`,
        outlineOffset: '2px'
      }
    }
  })
}));

const FocusIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'enhanced'
})<{ enhanced?: boolean }>(({ theme, enhanced }) => ({
  ...(enhanced && {
    '& *:focus': {
      outline: `3px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px',
      borderRadius: theme.shape.borderRadius
    }
  })
}));

const ReducedMotionContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'reducedMotion'
})<{ reducedMotion?: boolean }>(({ reducedMotion }) => ({
  ...(reducedMotion && {
    '& *, & *::before, & *::after': {
      animationDuration: '0.01ms !important',
      animationIterationCount: '1 !important',
      transitionDuration: '0.01ms !important',
      scrollBehavior: 'auto !important'
    }
  })
}));

// Screen reader only component
export function AccessibleScreenReaderOnly({ 
  children, 
  as: Component = 'span' 
}: ScreenReaderOnlyProps) {
  return (
    <ScreenReaderOnly component={Component}>
      {children}
    </ScreenReaderOnly>
  );
}

// Live region for announcements
function LiveRegion() {
  const [messages, setMessages] = useState<Array<{ id: string; text: string; priority: 'polite' | 'assertive' }>>([]);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const id = Math.random().toString(36).substr(2, 9);
    setMessages(prev => [...prev, { id, text: message, priority }]);

    // Clear message after announcement
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }, 1000);
  }, []);

  // Expose announce function to context
  useEffect(() => {
    (window as any).__accessibilityAnnounce = announce;
    return () => {
      delete (window as any).__accessibilityAnnounce;
    };
  }, [announce]);

  return (
    <>
      {/* Polite announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      >
        {messages
          .filter(msg => msg.priority === 'polite')
          .map(msg => (
            <div key={msg.id}>{msg.text}</div>
          ))
        }
      </div>

      {/* Assertive announcements */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      >
        {messages
          .filter(msg => msg.priority === 'assertive')
          .map(msg => (
            <div key={msg.id}>{msg.text}</div>
          ))
        }
      </div>
    </>
  );
}

// Focus trap component
export function FocusTrap({ 
  children, 
  active = true, 
  onEscape,
  className 
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    );

    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    firstFocusableRef.current = firstFocusable;
    lastFocusableRef.current = lastFocusable;

    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
          }
        } else {
          if (document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, onEscape]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Accessible form field wrapper
export function AccessibleFormField({
  id,
  label,
  required = false,
  error,
  help,
  children,
  className
}: AccessibleFormFieldProps) {
  const theme = useTheme();
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <FormControl fullWidth className={className} error={Boolean(error)}>
      <FormLabel 
        htmlFor={id}
        required={required}
        sx={{ 
          mb: 1,
          fontWeight: 500,
          color: error ? theme.palette.error.main : theme.palette.text.primary
        }}
      >
        {label}
        {required && (
          <AccessibleScreenReaderOnly>
            (required)
          </AccessibleScreenReaderOnly>
        )}
      </FormLabel>
      
      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': [
          error ? errorId : null,
          help ? helpId : null
        ].filter(Boolean).join(' '),
        'aria-invalid': Boolean(error),
        'aria-required': required
      })}
      
      {help && (
        <FormHelperText id={helpId} sx={{ mt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <Info size={14} sx={{ mt: 0.25, flexShrink: 0 }} />
            {help}
          </Box>
        </FormHelperText>
      )}
      
      {error && (
        <FormHelperText id={errorId} error sx={{ mt: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
            <AlertTriangle size={14} sx={{ mt: 0.25, flexShrink: 0 }} />
            {error}
          </Box>
        </FormHelperText>
      )}
    </FormControl>
  );
}

// Voice announcer component
export function VoiceAnnouncer({ 
  message, 
  priority = 'polite', 
  onComplete 
}: VoiceAnnouncerProps) {
  const [isSupported] = useState(() => 'speechSynthesis' in window);
  const [isPlaying, setIsPlaying] = useState(false);

  const speak = useCallback(() => {
    if (!isSupported) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => {
      setIsPlaying(false);
      onComplete?.();
    };
    utterance.onerror = () => setIsPlaying(false);

    speechSynthesis.speak(utterance);
  }, [message, isSupported, onComplete]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  }, []);

  if (!isSupported) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton
        size="small"
        onClick={isPlaying ? stop : speak}
        aria-label={isPlaying ? 'Stop speech' : 'Read aloud'}
      >
        {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </IconButton>
    </Box>
  );
}

// Accessibility controls panel
export function AccessibilityControls({ 
  onSettingsChange,
  className 
}: AccessibilityControlsProps) {
  const theme = useTheme();
  const { settings, updateSetting } = useContext(AccessibilityContext);

  const handleSettingChange = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    updateSetting(key, value);
    onSettingsChange?.({ ...settings, [key]: value });
  }, [settings, updateSetting, onSettingsChange]);

  const controls = [
    {
      key: 'highContrast' as const,
      label: 'High Contrast',
      description: 'Enhance visual contrast for better visibility',
      icon: <Eye size={16} />
    },
    {
      key: 'reducedMotion' as const,
      label: 'Reduce Motion',
      description: 'Minimize animations and transitions',
      icon: <Pause size={16} />
    },
    {
      key: 'voiceAnnouncements' as const,
      label: 'Voice Announcements',
      description: 'Enable spoken feedback for actions',
      icon: <Volume2 size={16} />
    },
    {
      key: 'focusIndicators' as const,
      label: 'Enhanced Focus',
      description: 'Show enhanced focus indicators',
      icon: <Zap size={16} />
    },
    {
      key: 'largeText' as const,
      label: 'Large Text',
      description: 'Increase text size for better readability',
      icon: <Typography component="span" sx={{ fontSize: '16px', fontWeight: 'bold' }}>A</Typography>
    }
  ];

  return (
    <Paper className={className} sx={{ p: 3, border: `1px solid ${theme.palette.divider}` }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Eye size={20} />
        Accessibility Settings
      </Typography>
      
      <Stack spacing={2}>
        {controls.map((control) => (
          <Box key={control.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings[control.key]}
                    onChange={(e) => handleSettingChange(control.key, e.target.checked)}
                    inputProps={{
                      'aria-describedby': `${control.key}-description`
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {control.icon}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {control.label}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        id={`${control.key}-description`}
                      >
                        {control.description}
                      </Typography>
                    </Box>
                  </Box>
                }
              />
            </Box>
          </Box>
        ))}
      </Stack>

      <Alert severity="info" sx={{ mt: 3 }} icon={<Info />}>
        <Typography variant="body2">
          These settings improve accessibility for users with visual, motor, or cognitive disabilities.
        </Typography>
      </Alert>
    </Paper>
  );
}

// Main accessibility provider
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    // Check for system preferences
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    return {
      ...DEFAULT_SETTINGS,
      reducedMotion,
      highContrast
    };
  });

  const updateSetting = useCallback((key: keyof AccessibilitySettings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (settings.voiceAnnouncements && (window as any).__accessibilityAnnounce) {
      (window as any).__accessibilityAnnounce(message, priority);
    }
  }, [settings.voiceAnnouncements]);

  const focusTrap = useCallback((element: HTMLElement) => {
    // Implementation would depend on the specific focus trap logic
    return () => {}; // Cleanup function
  }, []);

  const contextValue: AccessibilityContextValue = {
    settings,
    updateSetting,
    announce,
    focusTrap
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      <HighContrastContainer highContrast={settings.highContrast}>
        <FocusIndicator enhanced={settings.focusIndicators}>
          <ReducedMotionContainer reducedMotion={settings.reducedMotion}>
            <Box sx={{ 
              fontSize: settings.largeText ? '1.2em' : '1em',
              transition: settings.reducedMotion ? 'none' : 'font-size 0.2s ease'
            }}>
              {children}
              <LiveRegion />
            </Box>
          </ReducedMotionContainer>
        </FocusIndicator>
      </HighContrastContainer>
    </AccessibilityContext.Provider>
  );
}

// Hook to use accessibility context
export function useAccessibility() {
  return useContext(AccessibilityContext);
}

// WCAG compliance checker
export function checkWCAGCompliance(element: HTMLElement): { 
  score: number; 
  issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> 
} {
  const issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }> = [];

  // Check for missing alt text on images
  const images = element.querySelectorAll('img');
  images.forEach(img => {
    if (!img.alt && !img.getAttribute('aria-label')) {
      issues.push({
        type: 'missing-alt',
        message: 'Image missing alt text',
        severity: 'high'
      });
    }
  });

  // Check for missing form labels
  const inputs = element.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    const hasLabel = input.id && element.querySelector(`label[for="${input.id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label') || input.getAttribute('aria-labelledby');
    
    if (!hasLabel && !hasAriaLabel) {
      issues.push({
        type: 'missing-label',
        message: 'Form control missing label',
        severity: 'high'
      });
    }
  });

  // Check for sufficient color contrast (simplified check)
  const buttons = element.querySelectorAll('button');
  buttons.forEach(button => {
    const styles = window.getComputedStyle(button);
    const bgColor = styles.backgroundColor;
    const textColor = styles.color;
    
    // This is a simplified check - a real implementation would calculate actual contrast ratios
    if (bgColor === textColor) {
      issues.push({
        type: 'low-contrast',
        message: 'Insufficient color contrast',
        severity: 'medium'
      });
    }
  });

  const score = Math.max(0, 100 - (issues.length * 10));
  return { score, issues };
}

// Export all types and components
export type { 
  AccessibilitySettings, 
  AccessibilityContextValue,
  FocusTrapProps,
  AccessibleFormFieldProps,
  VoiceAnnouncerProps,
  AccessibilityControlsProps
};
