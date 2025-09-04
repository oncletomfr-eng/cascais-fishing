/**
 * Commission Dashboard Component
 * Task 8.1: Commission Rate Display & Calculator
 * 
 * Taking the role of Senior Developer specializing in Financial Systems
 * 
 * Comprehensive commission tracking dashboard with rate display, 
 * calculator tools, and tier-based commission management
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
  InputAdornment,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  CircularProgress,
  Skeleton,
  Grid
} from '@mui/material';
import {
  Calculate as CalculateIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as BankIcon,
  Receipt as ReceiptIcon,
  Percent as PercentIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  Diamond as DiamondIcon,
  EmojiEvents as CrownIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { CommissionAnalytics } from './CommissionAnalytics';

// Commission interfaces
export interface CommissionTier {
  id: string;
  name: string;
  displayName: string;
  commissionRate: number; // Percentage (e.g., 15.0 for 15%)
  minimumEarnings: number; // Monthly minimum in cents
  features: string[];
  icon: React.ReactNode;
  color: string;
  popular?: boolean;
}

export interface CommissionCalculation {
  grossAmount: number; // in cents
  commissionRate: number; // percentage
  commissionAmount: number; // in cents
  platformFee: number; // in cents (Stripe + platform)
  netEarnings: number; // in cents
  tier: CommissionTier;
}

export interface CommissionHistory {
  id: string;
  date: Date;
  amount: number; // in cents
  commissionRate: number;
  commissionAmount: number;
  transactionId: string;
  status: 'pending' | 'paid' | 'processing';
}

interface CommissionDashboardProps {
  captainId?: string;
  className?: string;
}

// Commission tier definitions
const COMMISSION_TIERS: CommissionTier[] = [
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    commissionRate: 20.0,
    minimumEarnings: 50000, // €500
    features: ['Basic commission tracking', 'Monthly payouts', 'Standard support'],
    icon: <StarIcon />,
    color: '#9E9E9E'
  },
  {
    id: 'professional',
    name: 'professional',
    displayName: 'Professional',
    commissionRate: 17.5,
    minimumEarnings: 150000, // €1500
    features: ['Advanced analytics', 'Bi-weekly payouts', 'Priority support', 'Tax reporting'],
    icon: <DiamondIcon />,
    color: '#2196F3',
    popular: true
  },
  {
    id: 'premium',
    name: 'premium',
    displayName: 'Premium',
    commissionRate: 15.0,
    minimumEarnings: 300000, // €3000
    features: ['Real-time analytics', 'Weekly payouts', 'Dedicated support', 'Advanced tax tools', 'Custom reporting'],
    icon: <CrownIcon />,
    color: '#FF9800'
  }
];

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`commission-tabpanel-${index}`}
      aria-labelledby={`commission-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export function CommissionDashboard({ captainId, className = '' }: CommissionDashboardProps) {
  const { data: session } = useSession();
  
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  
  // Captain commission data
  const [currentTier, setCurrentTier] = useState<CommissionTier>(COMMISSION_TIERS[0]);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [recentHistory, setRecentHistory] = useState<CommissionHistory[]>([]);
  
  // Calculator state
  const [calculatorAmount, setCalculatorAmount] = useState('100.00');
  const [selectedTierForCalc, setSelectedTierForCalc] = useState(currentTier.id);
  
  // Load commission data
  const fetchCommissionData = useCallback(async () => {
    if (!session?.user) return;
    
    try {
      setLoading(true);
      
      // TODO: Implement actual API calls
      // For now, using mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock current tier determination based on monthly earnings
      const mockMonthlyEarnings = 180000; // €1800
      const determinedTier = COMMISSION_TIERS.find(tier => 
        mockMonthlyEarnings >= tier.minimumEarnings
      ) || COMMISSION_TIERS[0];
      
      setCurrentTier(determinedTier);
      setMonthlyEarnings(mockMonthlyEarnings);
      setTotalCommissions(45000); // €450
      setPendingPayouts(12000); // €120
      
      // Mock recent history
      setRecentHistory([
        {
          id: '1',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          amount: 9500,
          commissionRate: determinedTier.commissionRate,
          commissionAmount: Math.round(9500 * (determinedTier.commissionRate / 100)),
          transactionId: 'pi_1234567890',
          status: 'pending'
        },
        {
          id: '2',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          amount: 12500,
          commissionRate: determinedTier.commissionRate,
          commissionAmount: Math.round(12500 * (determinedTier.commissionRate / 100)),
          transactionId: 'pi_0987654321',
          status: 'paid'
        }
      ]);
      
    } catch (error) {
      console.error('Error fetching commission data:', error);
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchCommissionData();
  }, [fetchCommissionData]);

  // Handle tab change
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  }, []);

  // Commission calculator
  const calculateCommission = useCallback((
    amount: number, 
    tierRate: number
  ): CommissionCalculation => {
    const tier = COMMISSION_TIERS.find(t => t.commissionRate === tierRate) || currentTier;
    const commissionAmount = Math.round(amount * (tierRate / 100));
    const platformFee = Math.round(amount * 0.029 + 30); // Stripe + platform fee
    const netEarnings = amount - platformFee - commissionAmount;
    
    return {
      grossAmount: amount,
      commissionRate: tierRate,
      commissionAmount,
      platformFee,
      netEarnings,
      tier
    };
  }, [currentTier]);

  // Calculate commission for calculator
  const calculatorResult = useMemo(() => {
    const amount = Math.round(parseFloat(calculatorAmount || '0') * 100);
    const tier = COMMISSION_TIERS.find(t => t.id === selectedTierForCalc) || currentTier;
    return calculateCommission(amount, tier.commissionRate);
  }, [calculatorAmount, selectedTierForCalc, currentTier, calculateCommission]);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount / 100);
  }, []);

  // Format percentage
  const formatPercentage = useCallback((rate: number) => {
    return `${rate.toFixed(1)}%`;
  }, []);

  // Get tier color
  const getTierColor = useCallback((tier: CommissionTier) => {
    return tier.color;
  }, []);

  if (loading) {
    return (
      <Box className={className}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} md={6} lg={3} key={item}>
              <Card>
                <CardContent>
                  <Skeleton variant="rectangular" height={120} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Grid container spacing={3}>
        {/* Commission Overview Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: getTierColor(currentTier) + '20',
                    color: getTierColor(currentTier),
                    mr: 2
                  }}
                >
                  {currentTier.icon}
                </Box>
                <Box>
                  <Typography variant="h6" color={getTierColor(currentTier)}>
                    {formatPercentage(currentTier.commissionRate)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Current Rate ({currentTier.displayName})
                  </Typography>
                </Box>
              </Box>
              {currentTier.popular && (
                <Chip 
                  label="Popular" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'success.light',
                    color: 'success.main',
                    mr: 2
                  }}
                >
                  <TrendingUpIcon />
                </Box>
                <Box>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(monthlyEarnings)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Monthly Earnings
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'info.light',
                    color: 'info.main',
                    mr: 2
                  }}
                >
                  <ReceiptIcon />
                </Box>
                <Box>
                  <Typography variant="h6" color="info.main">
                    {formatCurrency(totalCommissions)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Commissions
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box 
                  sx={{ 
                    p: 1, 
                    borderRadius: 1, 
                    backgroundColor: 'warning.light',
                    color: 'warning.main',
                    mr: 2
                  }}
                >
                  <BankIcon />
                </Box>
                <Box>
                  <Typography variant="h6" color="warning.main">
                    {formatCurrency(pendingPayouts)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Payouts
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Commission Interface */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Commission Management"
              action={
                <Button
                  variant="outlined"
                  startIcon={<CalculateIcon />}
                  onClick={() => setCalculatorOpen(true)}
                >
                  Calculator
                </Button>
              }
            />
            <CardContent sx={{ pt: 0 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange}>
                  <Tab label="Current Tier" />
                  <Tab label="All Tiers" />
                  <Tab label="Recent Activity" />
                  <Tab label="Analytics" />
                </Tabs>
              </Box>

              {/* Current Tier Tab */}
              <TabPanel value={activeTab} index={0}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h5" gutterBottom>
                        {currentTier.displayName} Tier
                      </Typography>
                      <Typography variant="body1" color="textSecondary" paragraph>
                        You're currently earning {formatPercentage(currentTier.commissionRate)} commission on all transactions.
                      </Typography>
                      
                      <Alert severity="info" sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          Your monthly earnings of {formatCurrency(monthlyEarnings)} qualify you for the {currentTier.displayName} tier.
                        </Typography>
                      </Alert>

                      <Typography variant="h6" gutterBottom>
                        Features Included:
                      </Typography>
                      <Stack spacing={1}>
                        {currentTier.features.map((feature, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                            <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 20 }} />
                            <Typography variant="body2">{feature}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 2, backgroundColor: 'background.default' }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Commission Breakdown
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                      
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Platform Commission:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatPercentage(currentTier.commissionRate)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Payment Processing:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            2.9% + €0.30
                          </Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight="medium">Your Net Earnings:</Typography>
                          <Typography variant="body2" fontWeight="medium" color="success.main">
                            ~{formatPercentage(100 - currentTier.commissionRate - 3.5)}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </TabPanel>

              {/* All Tiers Tab */}
              <TabPanel value={activeTab} index={1}>
                <Typography variant="h6" gutterBottom>
                  Commission Tier Comparison
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Higher tiers offer lower commission rates and additional benefits.
                </Typography>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tier</TableCell>
                        <TableCell>Commission Rate</TableCell>
                        <TableCell>Monthly Minimum</TableCell>
                        <TableCell>Key Features</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {COMMISSION_TIERS.map((tier) => (
                        <TableRow 
                          key={tier.id}
                          sx={{ 
                            backgroundColor: tier.id === currentTier.id ? 'action.selected' : 'inherit'
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Box sx={{ color: tier.color, mr: 1 }}>
                                {tier.icon}
                              </Box>
                              {tier.displayName}
                              {tier.popular && (
                                <Chip 
                                  label="Popular" 
                                  size="small" 
                                  sx={{ ml: 1 }} 
                                  color="primary"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="medium" color={tier.color}>
                              {formatPercentage(tier.commissionRate)}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatCurrency(tier.minimumEarnings)}</TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {tier.features.slice(0, 2).join(', ')}
                              {tier.features.length > 2 && '...'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {tier.id === currentTier.id ? (
                              <Chip 
                                label="Current" 
                                color="success" 
                                size="small" 
                              />
                            ) : monthlyEarnings >= tier.minimumEarnings ? (
                              <Chip 
                                label="Available" 
                                color="info" 
                                size="small" 
                              />
                            ) : (
                              <Chip 
                                label="Locked" 
                                color="default" 
                                size="small" 
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Recent Activity Tab */}
              <TabPanel value={activeTab} index={2}>
                <Typography variant="h6" gutterBottom>
                  Recent Commission Activity
                </Typography>
                
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Transaction</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Rate</TableCell>
                        <TableCell>Commission</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentHistory.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            {item.date.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {item.transactionId}
                            </Typography>
                          </TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>{formatPercentage(item.commissionRate)}</TableCell>
                          <TableCell>
                            <Typography fontWeight="medium">
                              {formatCurrency(item.commissionAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={item.status} 
                              size="small"
                              color={
                                item.status === 'paid' ? 'success' :
                                item.status === 'processing' ? 'warning' : 'default'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              {/* Analytics Tab */}
              <TabPanel value={activeTab} index={3}>
                <CommissionAnalytics />
              </TabPanel>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Commission Calculator Dialog */}
      <Dialog
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalculateIcon />
            Commission Calculator
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Transaction Amount"
                type="number"
                value={calculatorAmount}
                onChange={(e) => setCalculatorAmount(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: <InputAdornment position="start">€</InputAdornment>
                }}
                sx={{ mb: 2 }}
              />

              <FormControl fullWidth>
                <InputLabel>Commission Tier</InputLabel>
                <Select
                  value={selectedTierForCalc}
                  onChange={(e) => setSelectedTierForCalc(e.target.value)}
                  label="Commission Tier"
                >
                  {COMMISSION_TIERS.map((tier) => (
                    <MenuItem key={tier.id} value={tier.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ color: tier.color, mr: 1 }}>
                          {tier.icon}
                        </Box>
                        {tier.displayName} ({formatPercentage(tier.commissionRate)})
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, backgroundColor: 'background.default' }}>
                <Typography variant="h6" gutterBottom>
                  Commission Breakdown
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Gross Amount:</Typography>
                    <Typography fontWeight="medium">
                      {formatCurrency(calculatorResult.grossAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Platform Commission ({formatPercentage(calculatorResult.commissionRate)}):</Typography>
                    <Typography fontWeight="medium" color="error.main">
                      -{formatCurrency(calculatorResult.commissionAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>Payment Processing:</Typography>
                    <Typography fontWeight="medium" color="error.main">
                      -{formatCurrency(calculatorResult.platformFee)}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6">Your Earnings:</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">
                      {formatCurrency(calculatorResult.netEarnings)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCalculatorOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
}

export default CommissionDashboard;
