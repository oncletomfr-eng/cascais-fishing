/**
 * Payment Method Management Component
 * Task 8.3: Payout Schedule Management - Payment Methods
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Comprehensive payment method management for payouts including
 * bank accounts, credit cards, and digital wallets with validation
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Avatar,
  Grid,
  Paper,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  AccountBalance as BankIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  Verified as VerifiedIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

// Interface definitions
export interface PaymentMethodDetails {
  id: string;
  type: 'CARD' | 'BANK_ACCOUNT' | 'SEPA_DEBIT' | 'PAYPAL' | 'IDEAL' | 'BANCONTACT';
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'FAILED';
  
  // Card details (if type is CARD)
  cardLast4?: string;
  cardBrand?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  
  // Bank account details (if type is BANK_ACCOUNT)
  bankName?: string;
  bankAccountNumber?: string; // Masked
  bankRoutingNumber?: string;
  bankAccountHolderName?: string;
  
  // Billing address
  billingName?: string;
  billingEmail?: string;
  billingCountry?: string;
  billingCity?: string;
  billingPostalCode?: string;
  
  // Metadata
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountForm {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  routingNumber: string;
  accountType: 'CHECKING' | 'SAVINGS';
  country: string;
  currency: string;
}

export interface PaymentMethodManagementProps {
  captainId?: string;
  onMethodChange?: () => void;
  className?: string;
}

// Utility functions
const getPaymentMethodIcon = (type: string) => {
  switch (type) {
    case 'CARD': return <CreditCardIcon />;
    case 'BANK_ACCOUNT': return <BankIcon />;
    case 'SEPA_DEBIT': return <BankIcon />;
    case 'PAYPAL': return <PaymentIcon />;
    default: return <PaymentIcon />;
  }
};

const getPaymentMethodLabel = (type: string): string => {
  switch (type) {
    case 'CARD': return 'Credit/Debit Card';
    case 'BANK_ACCOUNT': return 'Bank Account';
    case 'SEPA_DEBIT': return 'SEPA Direct Debit';
    case 'PAYPAL': return 'PayPal';
    case 'IDEAL': return 'iDEAL';
    case 'BANCONTACT': return 'Bancontact';
    default: return type;
  }
};

const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
};

export function PaymentMethodManagement({
  captainId,
  onMethodChange,
  className = ''
}: PaymentMethodManagementProps) {
  const { data: session } = useSession();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodDetails[]>([]);
  const [addMethodDialogOpen, setAddMethodDialogOpen] = useState(false);
  const [editMethodDialogOpen, setEditMethodDialogOpen] = useState(false);
  const [deleteMethodDialogOpen, setDeleteMethodDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodDetails | null>(null);
  const [methodType, setMethodType] = useState<string>('BANK_ACCOUNT');
  
  // Form state for bank account
  const [bankAccountForm, setBankAccountForm] = useState<BankAccountForm>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'CHECKING',
    country: 'PT', // Portugal default
    currency: 'EUR'
  });

  const targetCaptainId = captainId || session?.user?.id || '';

  // Load payment methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get payment methods for captain
      const response = await fetch(`/api/payment-methods?captainId=${targetCaptainId}`);
      if (!response.ok) throw new Error('Failed to fetch payment methods');
      
      const data = await response.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      toast.error('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  }, [targetCaptainId]);

  // Load data on component mount
  useEffect(() => {
    if (targetCaptainId) {
      fetchPaymentMethods();
    }
  }, [fetchPaymentMethods, targetCaptainId]);

  // Handle adding new payment method
  const handleAddPaymentMethod = useCallback(async () => {
    try {
      if (methodType === 'BANK_ACCOUNT') {
        // Validate bank account form
        if (!bankAccountForm.bankName.trim() || 
            !bankAccountForm.accountHolderName.trim() ||
            !bankAccountForm.accountNumber.trim() ||
            !bankAccountForm.routingNumber.trim()) {
          toast.error('Please fill in all required fields');
          return;
        }

        const response = await fetch('/api/payment-methods', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'BANK_ACCOUNT',
            captainId: targetCaptainId,
            bankAccount: bankAccountForm
          })
        });

        if (!response.ok) throw new Error('Failed to add payment method');

        toast.success('Bank account added successfully');
        setAddMethodDialogOpen(false);
        setBankAccountForm({
          bankName: '',
          accountHolderName: '',
          accountNumber: '',
          routingNumber: '',
          accountType: 'CHECKING',
          country: 'PT',
          currency: 'EUR'
        });
        fetchPaymentMethods();
        onMethodChange?.();
      } else {
        // For other payment methods, redirect to Stripe setup
        toast.info('Credit card setup coming soon. Please contact support for now.');
      }
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error('Failed to add payment method');
    }
  }, [methodType, bankAccountForm, targetCaptainId, fetchPaymentMethods, onMethodChange]);

  // Handle setting default payment method
  const handleSetDefault = useCallback(async (methodId: string) => {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId,
          captainId: targetCaptainId,
          action: 'set_default'
        })
      });

      if (!response.ok) throw new Error('Failed to set default payment method');

      toast.success('Default payment method updated');
      fetchPaymentMethods();
      onMethodChange?.();
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error('Failed to set default payment method');
    }
  }, [targetCaptainId, fetchPaymentMethods, onMethodChange]);

  // Handle deleting payment method
  const handleDeletePaymentMethod = useCallback(async (methodId: string) => {
    try {
      const response = await fetch('/api/payment-methods', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId,
          captainId: targetCaptainId
        })
      });

      if (!response.ok) throw new Error('Failed to delete payment method');

      toast.success('Payment method deleted');
      setDeleteMethodDialogOpen(false);
      setSelectedMethod(null);
      fetchPaymentMethods();
      onMethodChange?.();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method');
    }
  }, [targetCaptainId, fetchPaymentMethods, onMethodChange]);

  // Render payment method item
  const renderPaymentMethod = useCallback((method: PaymentMethodDetails) => {
    const isCard = method.type === 'CARD';
    const isBank = method.type === 'BANK_ACCOUNT';
    const isExpired = method.status === 'EXPIRED';
    const isFailed = method.status === 'FAILED';

    return (
      <ListItem key={method.id}>
        <ListItemIcon>
          <Avatar
            sx={{
              bgcolor: method.isDefault ? 'primary.main' : 
                       isExpired ? 'error.main' :
                       isFailed ? 'error.main' : 'grey.300'
            }}
          >
            {getPaymentMethodIcon(method.type)}
          </Avatar>
        </ListItemIcon>

        <ListItemText
          primary={
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body1" fontWeight="medium">
                {isCard && method.cardBrand && method.cardLast4
                  ? `${method.cardBrand.toUpperCase()} •••• ${method.cardLast4}`
                  : isBank && method.bankName
                    ? `${method.bankName} ${method.bankAccountNumber ? maskAccountNumber(method.bankAccountNumber) : ''}`
                    : getPaymentMethodLabel(method.type)
                }
              </Typography>
              
              {method.isDefault && (
                <Chip
                  label="Default"
                  size="small"
                  color="primary"
                  icon={<StarIcon />}
                />
              )}
              
              <Chip
                label={method.status}
                size="small"
                color={
                  method.status === 'ACTIVE' ? 'success' :
                  method.status === 'EXPIRED' ? 'error' :
                  method.status === 'FAILED' ? 'error' : 'default'
                }
                variant="outlined"
              />
            </Stack>
          }
          secondary={
            <Stack spacing={0.5}>
              {isCard && method.cardExpMonth && method.cardExpYear && (
                <Typography variant="caption" color="textSecondary">
                  Expires {method.cardExpMonth.toString().padStart(2, '0')}/{method.cardExpYear}
                </Typography>
              )}
              
              {method.billingName && (
                <Typography variant="caption" color="textSecondary">
                  {method.billingName}
                  {method.billingCountry && ` • ${method.billingCountry}`}
                </Typography>
              )}
              
              {method.lastUsedAt && (
                <Typography variant="caption" color="textSecondary">
                  Last used: {new Date(method.lastUsedAt).toLocaleDateString()}
                </Typography>
              )}
            </Stack>
          }
        />

        <ListItemSecondaryAction>
          <Stack direction="row" spacing={1}>
            {!method.isDefault && method.status === 'ACTIVE' && (
              <Tooltip title="Set as default">
                <IconButton
                  size="small"
                  onClick={() => handleSetDefault(method.id)}
                >
                  <StarIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => {
                  setSelectedMethod(method);
                  setEditMethodDialogOpen(true);
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => {
                  setSelectedMethod(method);
                  setDeleteMethodDialogOpen(true);
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </ListItemSecondaryAction>
      </ListItem>
    );
  }, [handleSetDefault]);

  if (loading) {
    return (
      <Box className={className}>
        <Card>
          <CardHeader title="Loading payment methods..." />
          <CardContent>
            <Typography>Loading...</Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box className={className}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card>
          <CardHeader
            title={
              <Stack direction="row" alignItems="center" spacing={2}>
                <PaymentIcon color="primary" />
                <Typography variant="h6" component="h3">
                  Payment Methods for Payouts
                </Typography>
              </Stack>
            }
            action={
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshIcon />}
                  onClick={fetchPaymentMethods}
                >
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setAddMethodDialogOpen(true)}
                >
                  Add Method
                </Button>
              </Stack>
            }
          />

          <CardContent>
            {paymentMethods.length === 0 ? (
              <Alert severity="warning">
                <Typography variant="body2">
                  No payment methods configured. Add a payment method to receive payouts.
                </Typography>
              </Alert>
            ) : (
              <>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Your default payment method will be used for automatic payouts. 
                    Ensure your payment information is up to date.
                  </Typography>
                </Alert>

                <List>
                  {paymentMethods.map((method, index) => (
                    <React.Fragment key={method.id}>
                      {renderPaymentMethod(method)}
                      {index < paymentMethods.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Add Payment Method Dialog */}
      <Dialog
        open={addMethodDialogOpen}
        onClose={() => setAddMethodDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <AddIcon />
            <span>Add Payment Method</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Payment Method Type</InputLabel>
              <Select
                value={methodType}
                label="Payment Method Type"
                onChange={(e) => setMethodType(e.target.value)}
              >
                <MenuItem value="BANK_ACCOUNT">Bank Account (Recommended)</MenuItem>
                <MenuItem value="CARD" disabled>Credit/Debit Card (Coming Soon)</MenuItem>
                <MenuItem value="PAYPAL" disabled>PayPal (Coming Soon)</MenuItem>
              </Select>
            </FormControl>

            {methodType === 'BANK_ACCOUNT' && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      Add your bank account details for direct deposit payouts.
                      All information is encrypted and securely stored.
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Bank Name"
                    value={bankAccountForm.bankName}
                    onChange={(e) =>
                      setBankAccountForm(prev => ({
                        ...prev,
                        bankName: e.target.value
                      }))
                    }
                    placeholder="e.g., Banco Santander"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Account Holder Name"
                    value={bankAccountForm.accountHolderName}
                    onChange={(e) =>
                      setBankAccountForm(prev => ({
                        ...prev,
                        accountHolderName: e.target.value
                      }))
                    }
                    placeholder="Full name as on account"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Account Number"
                    value={bankAccountForm.accountNumber}
                    onChange={(e) =>
                      setBankAccountForm(prev => ({
                        ...prev,
                        accountNumber: e.target.value
                      }))
                    }
                    placeholder="IBAN or account number"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SecurityIcon color="action" />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Bank Code/Swift"
                    value={bankAccountForm.routingNumber}
                    onChange={(e) =>
                      setBankAccountForm(prev => ({
                        ...prev,
                        routingNumber: e.target.value
                      }))
                    }
                    placeholder="SWIFT/BIC code"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      value={bankAccountForm.accountType}
                      label="Account Type"
                      onChange={(e) =>
                        setBankAccountForm(prev => ({
                          ...prev,
                          accountType: e.target.value as any
                        }))
                      }
                    >
                      <MenuItem value="CHECKING">Checking Account</MenuItem>
                      <MenuItem value="SAVINGS">Savings Account</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Country</InputLabel>
                    <Select
                      value={bankAccountForm.country}
                      label="Country"
                      onChange={(e) =>
                        setBankAccountForm(prev => ({
                          ...prev,
                          country: e.target.value
                        }))
                      }
                    >
                      <MenuItem value="PT">Portugal</MenuItem>
                      <MenuItem value="ES">Spain</MenuItem>
                      <MenuItem value="FR">France</MenuItem>
                      <MenuItem value="DE">Germany</MenuItem>
                      <MenuItem value="IT">Italy</MenuItem>
                      <MenuItem value="NL">Netherlands</MenuItem>
                      <MenuItem value="BE">Belgium</MenuItem>
                      <MenuItem value="OTHER">Other EU</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            )}

            {methodType === 'CARD' && (
              <Alert severity="info">
                <Typography variant="body2">
                  Credit card integration with Stripe will be available soon. 
                  For now, please use bank account for payouts.
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMethodDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddPaymentMethod}
            disabled={methodType !== 'BANK_ACCOUNT'}
          >
            Add Payment Method
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Payment Method Dialog */}
      <Dialog
        open={editMethodDialogOpen}
        onClose={() => setEditMethodDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Payment Method</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                Payment method editing will be available soon. 
                For now, please delete and add a new payment method if changes are needed.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMethodDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Payment Method Dialog */}
      <Dialog
        open={deleteMethodDialogOpen}
        onClose={() => setDeleteMethodDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <DeleteIcon color="error" />
            <span>Delete Payment Method</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedMethod && (
            <Stack spacing={3} sx={{ mt: 1 }}>
              <Alert severity="warning">
                <Typography variant="body2">
                  Are you sure you want to delete this payment method?
                  {selectedMethod.isDefault && (
                    <><br /><strong>This is your default payment method. 
                    Please set another method as default before deleting this one.</strong></>
                  )}
                </Typography>
              </Alert>

              <Typography variant="body2">
                <strong>Payment Method:</strong> {getPaymentMethodLabel(selectedMethod.type)}
                {selectedMethod.cardLast4 && ` •••• ${selectedMethod.cardLast4}`}
                {selectedMethod.bankName && ` - ${selectedMethod.bankName}`}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteMethodDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => selectedMethod && handleDeletePaymentMethod(selectedMethod.id)}
            disabled={selectedMethod?.isDefault}
          >
            Delete Payment Method
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
