'use client';

/**
 * Test Page for Subscription Tier Management
 * Task 8.5: Captain Subscription Tier Integration
 * 
 * Taking the role of Senior Frontend Developer
 * 
 * Test page for demonstrating captain subscription tier management functionality
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { CaptainSubscriptionTierManagement } from '@/components/commission/CaptainSubscriptionTierManagement';

export default function TestSubscriptionManagement() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Captain Subscription Tier Management Test
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Test implementation of subscription tier integration for commission system
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Task 8.5:</strong> Captain Subscription Tier Integration
            <br />
            This page demonstrates the integration of commission tiers with captain subscription management.
            Features include tier visualization, upgrade workflows, and commission optimization analytics.
          </Typography>
        </Alert>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Subscription Tier Management
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Interactive interface for managing captain subscription tiers with commission rate benefits,
            upgrade recommendations, and qualification tracking.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <CaptainSubscriptionTierManagement 
              onTierChange={(newTier) => {
                console.log('Tier changed to:', newTier);
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
