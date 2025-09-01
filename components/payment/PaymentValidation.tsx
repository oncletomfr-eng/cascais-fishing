'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { 
  TextField, 
  Typography, 
  Box, 
  Alert,
  InputAdornment,
  FormControl,
  FormHelperText,
  Fade,
  Chip,
  Stack,
  useTheme
} from '@mui/material';
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Shield,
  Eye,
  EyeOff,
  User,
  Mail,
  CreditCard,
  Lock
} from 'lucide-react';
import { useDesignSystem } from '@/lib/design-system';

// Validation types
export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

export interface ValidationRule {
  name: string;
  message: string;
  validator: (value: string, allValues?: Record<string, string>) => boolean | Promise<boolean>;
  severity?: 'error' | 'warning' | 'info';
}

export interface FieldValidationState {
  value: string;
  status: ValidationStatus;
  message: string;
  isRequired: boolean;
  touched: boolean;
}

export interface PaymentValidationProps {
  children?: React.ReactNode;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
  debounceMs?: number;
  showSecurityBadges?: boolean;
  className?: string;
}

// Validation rules library
const VALIDATION_RULES = {
  required: (message: string = 'This field is required'): ValidationRule => ({
    name: 'required',
    message,
    validator: (value: string) => value.trim().length > 0
  }),

  email: (message: string = 'Please enter a valid email address'): ValidationRule => ({
    name: 'email',
    message,
    validator: (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    }
  }),

  cardNumber: (message: string = 'Please enter a valid card number'): ValidationRule => ({
    name: 'cardNumber',
    message,
    validator: (value: string) => {
      const cleaned = value.replace(/\s/g, '');
      return cleaned.length >= 13 && cleaned.length <= 19 && /^\d+$/.test(cleaned);
    }
  }),

  expiryDate: (message: string = 'Please enter a valid expiry date'): ValidationRule => ({
    name: 'expiryDate',  
    message,
    validator: (value: string) => {
      const regex = /^(0[1-9]|1[0-2])\/\d{2}$/;
      if (!regex.test(value)) return false;
      
      const [month, year] = value.split('/').map(Number);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return false;
      }
      
      return true;
    }
  }),

  cvv: (message: string = 'Please enter a valid CVV'): ValidationRule => ({
    name: 'cvv',
    message,
    validator: (value: string) => {
      const cleaned = value.replace(/\s/g, '');
      return /^\d{3,4}$/.test(cleaned);
    }
  }),

  fullName: (message: string = 'Please enter your full name'): ValidationRule => ({
    name: 'fullName',
    message,
    validator: (value: string) => {
      const trimmed = value.trim();
      return trimmed.length >= 2 && trimmed.includes(' ');
    }
  }),

  postalCode: (message: string = 'Please enter a valid postal code'): ValidationRule => ({
    name: 'postalCode',
    message,
    validator: (value: string) => {
      // EU postal codes (basic validation)
      const euPostalRegex = /^[0-9]{4,5}(-[0-9]{4})?$|^[A-Z]{1,2}[0-9]{1,2}[A-Z]?\s?[0-9][A-Z]{2}$/i;
      return euPostalRegex.test(value.trim());
    }
  }),

  strongPassword: (message: string = 'Password must be at least 8 characters with numbers and letters'): ValidationRule => ({
    name: 'strongPassword',
    message,
    validator: (value: string) => {
      return value.length >= 8 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
    }
  })
};

// Styled components
const ValidatedTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'validationStatus'
})<{ validationStatus?: ValidationStatus }>(({ theme, validationStatus }) => ({
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused fieldset': {
      borderColor: validationStatus === 'valid' 
        ? theme.palette.success.main 
        : validationStatus === 'invalid' 
        ? theme.palette.error.main 
        : theme.palette.primary.main,
    },
  },
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    marginTop: theme.spacing(0.5),
    fontSize: '0.75rem'
  }
}));

const StatusIcon = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  '& svg': {
    width: 20,
    height: 20
  }
}));

const SecurityBadge = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: '0.7rem',
  backgroundColor: theme.palette.success.light + '20',
  color: theme.palette.success.dark,
  '& .MuiChip-icon': {
    width: 14,
    height: 14
  }
}));

// Custom hook for field validation
export function useFieldValidation(
  initialValue: string = '', 
  rules: ValidationRule[] = [], 
  debounceMs: number = 300
) {
  const [field, setField] = useState<FieldValidationState>({
    value: initialValue,
    status: 'idle',
    message: '',
    isRequired: rules.some(rule => rule.name === 'required'),
    touched: false
  });

  const debouncedValidate = useCallback(
    debounce(async (value: string, validationRules: ValidationRule[]) => {
      if (!field.touched) return;

      setField(prev => ({ ...prev, status: 'validating' }));

      for (const rule of validationRules) {
        try {
          const isValid = await rule.validator(value);
          if (!isValid) {
            setField(prev => ({ 
              ...prev, 
              status: 'invalid', 
              message: rule.message 
            }));
            return;
          }
        } catch (error) {
          setField(prev => ({ 
            ...prev, 
            status: 'invalid', 
            message: 'Validation error occurred' 
          }));
          return;
        }
      }

      setField(prev => ({ 
        ...prev, 
        status: 'valid', 
        message: 'Valid' 
      }));
    }, debounceMs),
    [field.touched, debounceMs]
  );

  const setValue = useCallback((value: string) => {
    setField(prev => ({ 
      ...prev, 
      value, 
      touched: true,
      status: value.trim() === '' ? 'idle' : prev.status
    }));
  }, []);

  const setTouched = useCallback(() => {
    setField(prev => ({ ...prev, touched: true }));
  }, []);

  useEffect(() => {
    if (field.value && field.touched) {
      debouncedValidate(field.value, rules);
    }
  }, [field.value, field.touched, rules, debouncedValidate]);

  return {
    field,
    setValue,
    setTouched,
    isValid: field.status === 'valid',
    isInvalid: field.status === 'invalid',
    isValidating: field.status === 'validating'
  };
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Validation context
const ValidationContext = React.createContext<{
  registerField: (name: string, validation: { isValid: boolean; message: string }) => void;
  unregisterField: (name: string) => void;
}>({
  registerField: () => {},
  unregisterField: () => {}
});

// Validated field component
export interface ValidatedFieldProps {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'tel';
  rules?: ValidationRule[];
  placeholder?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
  autoComplete?: string;
  debounceMs?: number;
  className?: string;
}

export function ValidatedField({
  name,
  label,
  type = 'text',
  rules = [],
  placeholder,
  icon,
  showPasswordToggle = false,
  autoComplete,
  debounceMs = 300,
  className
}: ValidatedFieldProps) {
  const theme = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const { field, setValue, setTouched, isValid, isInvalid, isValidating } = useFieldValidation('', rules, debounceMs);

  const getStatusIcon = () => {
    if (isValidating) {
      return <Clock size={20} color={theme.palette.info.main} className="animate-spin" />;
    }
    if (isValid) {
      return <CheckCircle size={20} color={theme.palette.success.main} />;
    }
    if (isInvalid) {
      return <AlertCircle size={20} color={theme.palette.error.main} />;
    }
    return null;
  };

  const inputType = showPasswordToggle && showPassword ? 'text' : type;

  return (
    <FormControl fullWidth className={className}>
      <ValidatedTextField
        name={name}
        label={label}
        type={inputType}
        value={field.value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={setTouched}
        placeholder={placeholder}
        autoComplete={autoComplete}
        validationStatus={field.status}
        error={isInvalid}
        InputProps={{
          startAdornment: icon && (
            <InputAdornment position="start">
              {icon}
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <Stack direction="row" spacing={1} alignItems="center">
                {showPasswordToggle && (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    sx={{
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={theme.palette.text.secondary} />
                    ) : (
                      <Eye size={20} color={theme.palette.text.secondary} />
                    )}
                  </Box>
                )}
                <StatusIcon>
                  {getStatusIcon()}
                </StatusIcon>
              </Stack>
            </InputAdornment>
          ),
        }}
      />
      
      <Fade in={field.touched && (isValid || isInvalid)} timeout={200}>
        <FormHelperText 
          error={isInvalid}
          sx={{ 
            color: isValid ? theme.palette.success.main : undefined,
            fontSize: '0.75rem'
          }}
        >
          {field.message}
        </FormHelperText>
      </Fade>
    </FormControl>
  );
}

// Payment form validation component
export default function PaymentValidation({
  children,
  onValidationChange,
  debounceMs = 300,
  showSecurityBadges = true,
  className
}: PaymentValidationProps) {
  const theme = useTheme();
  const [fields, setFields] = useState<Record<string, { isValid: boolean; message: string }>>({});

  const registerField = useCallback((name: string, validation: { isValid: boolean; message: string }) => {
    setFields(prev => ({
      ...prev,
      [name]: validation
    }));
  }, []);

  const unregisterField = useCallback((name: string) => {
    setFields(prev => {
      const newFields = { ...prev };
      delete newFields[name];
      return newFields;
    });
  }, []);

  const contextValue = useMemo(() => ({
    registerField,
    unregisterField
  }), [registerField, unregisterField]);

  // Calculate overall validation state
  const isValid = useMemo(() => {
    const fieldValues = Object.values(fields);
    return fieldValues.length > 0 && fieldValues.every(field => field.isValid);
  }, [fields]);

  const errors = useMemo(() => {
    return Object.entries(fields).reduce((acc, [name, field]) => {
      if (!field.isValid && field.message) {
        acc[name] = field.message;
      }
      return acc;
    }, {} as Record<string, string>);
  }, [fields]);

  useEffect(() => {
    onValidationChange?.(isValid, errors);
  }, [isValid, errors, onValidationChange]);

  return (
    <ValidationContext.Provider value={contextValue}>
      <Box className={className}>
        {showSecurityBadges && (
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <SecurityBadge
              label="256-bit SSL encryption"
              size="small"
              icon={<Shield />}
            />
            <SecurityBadge
              label="PCI DSS compliant"
              size="small"
              icon={<Lock />}
            />
          </Stack>
        )}
        
        {children}
        
        {Object.keys(errors).length > 0 && (
          <Fade in={true} timeout={300}>
            <Alert 
              severity="warning" 
              sx={{ mt: 2 }}
              icon={<AlertCircle />}
            >
              <Typography variant="body2">
                Please correct the following errors:
              </Typography>
              <Box component="ul" sx={{ mt: 1, pl: 2, mb: 0 }}>
                {Object.entries(errors).map(([field, message]) => (
                  <li key={field}>
                    <Typography variant="body2" color="text.secondary">
                      {message}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          </Fade>
        )}
      </Box>
    </ValidationContext.Provider>
  );
}

// Export validation rules and utilities
export { VALIDATION_RULES, ValidationContext };
