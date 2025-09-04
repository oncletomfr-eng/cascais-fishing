'use client';

/**
 * Captain Subscription Tier Management Component
 * Task 8.5: Captain Subscription Tier Integration
 * 
 * Taking the role of Senior Frontend Developer specializing in Financial Management UI
 * 
 * Provides interface for captains to manage subscription tiers with commission rate benefits
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Tooltip
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Star as StarIcon,
  Diamond as DiamondIcon,
  Crown as CrownIcon,
  Check as CheckIcon,
  ArrowUpward as ArrowUpwardIcon,
  Info as InfoIcon,
  Timeline as TimelineIcon,
  EuroSymbol as EuroIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

// Types
interface CommissionTier {
  id: string;
  name: string;
  displayName: string;
  commissionRate: number;
  minimumEarnings: number;
  features: string[];
  icon?: React.ReactNode;
  color: string;
  popular?: boolean;
}

interface TierAnalytics {
  currentTier: CommissionTier;
  monthlyEarnings: number;
  tiers: (CommissionTier & {
    isQualified: boolean;
    isCurrent: boolean;
    upgradeRecommendation?: {
      potentialSavings: number;
      requiredIncrease: number;
    };
  })[];
  projectedSavings: number;
  nextTierProgress: number;
}

interface SubscriptionTierManagementProps {
  captainId?: string;
  className?: string;
  onTierChange?: (newTier: CommissionTier) => void;
}

// Commission tier definitions (matches API)
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

export function CaptainSubscriptionTierManagement({ 
  captainId,
  className = '',
  onTierChange 
}: SubscriptionTierManagementProps) {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<TierAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedTierForUpgrade, setSelectedTierForUpgrade] = useState<CommissionTier | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get effective captain ID
  const effectiveCaptainId = captainId || session?.user?.id;

  // Fetch tier analytics
  const fetchTierAnalytics = useCallback(async () => {
    if (!effectiveCaptainId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/commission-tracking?action=tiers&captainId=${effectiveCaptainId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tier analytics');
      }

      const data = await response.json();
      
      // Calculate projected savings and next tier progress
      const currentTier = data.currentTier;
      const monthlyEarnings = data.monthlyEarnings;
      
      // Find next tier
      const nextTier = COMMISSION_TIERS
        .filter(tier => tier.minimumEarnings > monthlyEarnings)
        .sort((a, b) => a.minimumEarnings - b.minimumEarnings)[0];
      
      // Calculate progress to next tier
      const nextTierProgress = nextTier 
        ? Math.min((monthlyEarnings / nextTier.minimumEarnings) * 100, 100)
        : 100;
      
      // Calculate potential savings for each tier
      const tiersWithUpgradeInfo = data.tiers.map((tier: any) => ({
        ...tier,
        upgradeRecommendation: tier.isQualified && !tier.isCurrent ? {
          potentialSavings: calculateMonthlySavings(monthlyEarnings, currentTier.commissionRate, tier.commissionRate),
          requiredIncrease: Math.max(0, tier.minimumEarnings - monthlyEarnings) / 100
        } : undefined
      }));

      setAnalytics({
        currentTier: data.currentTier,
        monthlyEarnings: data.monthlyEarnings,
        tiers: tiersWithUpgradeInfo,
        projectedSavings: calculateMonthlySavings(
          monthlyEarnings, 
          currentTier.commissionRate, 
          nextTier?.commissionRate || currentTier.commissionRate
        ),
        nextTierProgress
      });

    } catch (err) {
      console.error('Error fetching tier analytics:', err);
      setError('Failed to load tier information');
    } finally {
      setLoading(false);
    }
  }, [effectiveCaptainId]);

  // Calculate monthly savings
  const calculateMonthlySavings = (monthlyEarnings: number, currentRate: number, newRate: number) => {
    const currentCommission = monthlyEarnings * (currentRate / 100);
    const newCommission = monthlyEarnings * (newRate / 100);
    return Math.max(0, currentCommission - newCommission) / 100; // Convert cents to euros
  };

  // Handle tier upgrade
  const handleTierUpgrade = async (tier: CommissionTier) => {
    if (!effectiveCaptainId) return;

    try {
      setIsUpgrading(true);
      
      // This would integrate with subscription management API
      // For now, we'll simulate the upgrade process
      
      // In real implementation:
      // 1. Create or upgrade Stripe subscription
      // 2. Update subscription tier in database
      // 3. Notify user of successful upgrade
      
      console.log(`Upgrading to ${tier.displayName} tier`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Refresh analytics
      await fetchTierAnalytics();
      
      if (onTierChange) {
        onTierChange(tier);
      }
      
      setUpgradeDialogOpen(false);
      setSelectedTierForUpgrade(null);
      
    } catch (err) {
      console.error('Error upgrading tier:', err);
      setError('Failed to upgrade subscription tier');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Get tier color
  const getTierColor = (tier: CommissionTier) => {
    return tier.color;
  };

  // Get tier icon
  const getTierIcon = (tier: CommissionTier) => {
    return tier.icon || <StarIcon />;
  };

  // Initial load
  useEffect(() => {
    fetchTierAnalytics();
  }, [fetchTierAnalytics]);

  if (loading) {
    return (
      <Box className={className} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading subscription tiers...
        </Typography>
      </Box>
    );
  }

  if (error || !analytics) {
    return (
      <Box className={className}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Failed to load tier information'}
        </Alert>
        <Button onClick={fetchTierAnalytics} variant="outlined">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Current Tier Overview */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h5" component="h2">
              Subscription Tier Management
            </Typography>
            <Chip
              icon={getTierIcon(analytics.currentTier)}
              label={analytics.currentTier.displayName}
              sx={{ 
                backgroundColor: getTierColor(analytics.currentTier),
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Current Benefits
              </Typography>
              <Typography variant="body1" color="primary" sx={{ fontSize: '1.25rem', fontWeight: 'bold', mb: 1 }}>
                {analytics.currentTier.commissionRate.toFixed(1)}% Commission Rate
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Monthly Earnings: {formatCurrency(analytics.monthlyEarnings / 100)}
              </Typography>
              
              <List dense>
                {analytics.currentTier.features.map((feature, index) => (
                  <ListItem key={index} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon fontSize="small" sx={{ color: getTierColor(analytics.currentTier) }} />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Next Tier Progress
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={analytics.nextTierProgress} 
                sx={{ 
                  height: 10, 
                  borderRadius: 5,
                  mb: 1,
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: getTierColor(analytics.currentTier)
                  }
                }}
              />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {analytics.nextTierProgress.toFixed(1)}% to next tier
              </Typography>
              
              {analytics.projectedSavings > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Potential monthly savings: {formatCurrency(analytics.projectedSavings)}
                </Alert>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Available Tiers */}
      <Typography variant="h6" gutterBottom>
        Available Subscription Tiers
      </Typography>
      
      <Grid container spacing={3}>
        {analytics.tiers.map((tier) => (
          <Grid item xs={12} md={4} key={tier.id}>
            <Card 
              sx={{ 
                height: '100%',
                border: tier.isCurrent ? `2px solid ${getTierColor(tier)}` : '1px solid #e0e0e0',
                position: 'relative',
                opacity: tier.isQualified || tier.isCurrent ? 1 : 0.7
              }}
            >
              {tier.popular && (
                <Chip
                  label="Most Popular"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: -8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#FF5722',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              )}
              
              <CardContent sx={{ pb: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getTierIcon(tier)}
                    <Typography variant="h6">
                      {tier.displayName}
                    </Typography>
                  </Box>
                  
                  {tier.isCurrent && (
                    <Chip label="Current" size="small" color="primary" />
                  )}
                </Box>

                <Typography variant="h4" color="primary" gutterBottom>
                  {tier.commissionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Commission Rate
                </Typography>

                <Typography variant="body2" sx={{ mb: 2 }}>
                  Minimum: {formatCurrency(tier.minimumEarnings / 100)}/month
                </Typography>

                <Divider sx={{ my: 2 }} />

                <List dense>
                  {tier.features.map((feature, index) => (
                    <ListItem key={index} disableGutters>
                      <ListItemIcon sx={{ minWidth: 24 }}>
                        <CheckIcon fontSize="small" sx={{ color: getTierColor(tier) }} />
                      </ListItemIcon>
                      <ListItemText 
                        primary={feature}
                        primaryTypographyProps={{ fontSize: '0.875rem' }}
                      />
                    </ListItem>
                  ))}
                </List>

                {tier.upgradeRecommendation && (
                  <Alert severity="success" sx={{ mt: 2, fontSize: '0.8rem' }}>
                    Save {formatCurrency(tier.upgradeRecommendation.potentialSavings)}/month
                  </Alert>
                )}

                <Box sx={{ mt: 3, display: 'flex', gap: 1 }}>
                  {!tier.isCurrent && tier.isQualified && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ArrowUpwardIcon />}
                      sx={{ backgroundColor: getTierColor(tier) }}
                      onClick={() => {
                        setSelectedTierForUpgrade(tier);
                        setUpgradeDialogOpen(true);
                      }}
                    >
                      Upgrade
                    </Button>
                  )}
                  
                  {!tier.isQualified && (
                    <Tooltip title={`Earn ${formatCurrency((tier.minimumEarnings - analytics.monthlyEarnings) / 100)} more monthly to qualify`}>
                      <Button
                        variant="outlined"
                        fullWidth
                        disabled
                        sx={{ color: '#666' }}
                      >
                        Not Qualified
                      </Button>
                    </Tooltip>
                  )}
                  
                  {tier.isCurrent && (
                    <Button
                      variant="outlined"
                      fullWidth
                      disabled
                      sx={{ color: getTierColor(tier), borderColor: getTierColor(tier) }}
                    >
                      Current Tier
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tier Comparison Dialog */}
      <Dialog
        open={upgradeDialogOpen}
        onClose={() => setUpgradeDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Upgrade to {selectedTierForUpgrade?.displayName} Tier
        </DialogTitle>
        <DialogContent>
          {selectedTierForUpgrade && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Commission Rate Improvement
                </Typography>
                <Typography>
                  From {analytics.currentTier.commissionRate.toFixed(1)}% to {selectedTierForUpgrade.commissionRate.toFixed(1)}%
                </Typography>
                <Typography variant="body2">
                  Monthly savings: {formatCurrency(
                    calculateMonthlySavings(
                      analytics.monthlyEarnings,
                      analytics.currentTier.commissionRate,
                      selectedTierForUpgrade.commissionRate
                    )
                  )}
                </Typography>
              </Alert>

              <Typography variant="h6" gutterBottom>
                New Benefits Include:
              </Typography>
              <List>
                {selectedTierForUpgrade.features.map((feature, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={feature} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => selectedTierForUpgrade && handleTierUpgrade(selectedTierForUpgrade)}
            disabled={isUpgrading}
            startIcon={isUpgrading ? <CircularProgress size={20} /> : <ArrowUpwardIcon />}
          >
            {isUpgrading ? 'Upgrading...' : 'Confirm Upgrade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CaptainSubscriptionTierManagement;
