'use client';

/**
 * Test Page for Category-Based Leaderboard System
 * Task 12.1: Category-Based Leaderboard System
 * 
 * Taking the role of Senior Frontend Developer
 * 
 * Test page for demonstrating category-based leaderboard functionality
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Alert,
  Grid,
  Stack,
  Chip
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Category as CategoryIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { CategoryLeaderboard } from '@/components/competition/CategoryLeaderboard';

export default function TestCategoryLeaderboard() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TrophyIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" component="h1">
            Category-Based Leaderboard System
          </Typography>
        </Stack>
        
        <Typography variant="h6" color="text.secondary" paragraph>
          Advanced competitive ranking system with category-based competitions and specialized scoring algorithms
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Task 12.1:</strong> Category-Based Leaderboard System
            <br />
            This system provides specialized ranking categories for different types of competitions and achievements.
            Each category has its own scoring algorithm and recognition system.
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* Feature Overview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <CategoryIcon color="primary" />
                <Typography variant="h6">
                  Competition Categories
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Multiple specialized categories for different types of achievements and competitions.
              </Typography>
              
              <Stack spacing={1}>
                <Chip 
                  label="Monthly Champions" 
                  size="small" 
                  sx={{ backgroundColor: '#FFD700', color: 'black' }}
                />
                <Chip 
                  label="Biggest Catch" 
                  size="small"
                  sx={{ backgroundColor: '#FF6B6B', color: 'white' }}
                />
                <Chip 
                  label="Most Active" 
                  size="small"
                  sx={{ backgroundColor: '#4ECDC4', color: 'white' }}
                />
                <Chip 
                  label="Best Mentor" 
                  size="small"
                  sx={{ backgroundColor: '#45B7D1', color: 'white' }}
                />
                <Chip 
                  label="Technique Master" 
                  size="small"
                  sx={{ backgroundColor: '#96CEB4', color: 'black' }}
                />
                <Chip 
                  label="Species Specialist" 
                  size="small"
                  sx={{ backgroundColor: '#FFEAA7', color: 'black' }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <TimelineIcon color="primary" />
                <Typography variant="h6">
                  Smart Scoring
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Advanced scoring algorithms tailored for each competition category.
              </Typography>
              
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Monthly Champions:</strong> Composite scoring based on rating, trips, catches, and level
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Biggest Catch:</strong> Maximum catch weight with verification
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Best Mentor:</strong> Mentor rating with minimum review threshold
                </Typography>
                <Typography variant="body2">
                  <strong>Technique Master:</strong> Technique diversity + mastery scoring
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <TrophyIcon color="primary" />
                <Typography variant="h6">
                  Features
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Key features of the category-based leaderboard system:
              </Typography>
              
              <Stack spacing={1}>
                <Box>
                  <Typography variant="body2">
                    • <strong>Real-time Rankings:</strong> Live updates with position tracking
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">
                    • <strong>Position Highlighting:</strong> Special highlighting for current user
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">
                    • <strong>Category Details:</strong> Context-specific metrics for each category
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">
                    • <strong>Medal System:</strong> Visual medals for top 3 positions
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2">
                    • <strong>Badge Integration:</strong> Achievement badge display
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Leaderboard Component */}
      <Box sx={{ mt: 4 }}>
        <CategoryLeaderboard
          defaultCategory="MONTHLY_CHAMPIONS"
          showCategoryDescription={true}
          limit={20}
        />
      </Box>
    </Container>
  );
}
