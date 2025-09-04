'use client';

/**
 * Test Page for Seasonal Competition Tracking System
 * Task 12.2: Seasonal Competition Tracking
 * 
 * Taking the role of Senior Frontend Developer
 * 
 * Test page for demonstrating seasonal competition functionality
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
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Timeline as TimelineIcon,
  EmojiEvents as TrophyIcon,
  Schedule as ScheduleIcon,
  Archive as ArchiveIcon,
  Notifications as NotificationIcon,
  TrendingUp as ProgressIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { SeasonalCompetitionTracker } from '@/components/competition/SeasonalCompetitionTracker';

export default function TestSeasonalCompetitions() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <CalendarIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h3" component="h1">
            Seasonal Competition Tracking System
          </Typography>
        </Stack>
        
        <Typography variant="h6" color="text.secondary" paragraph>
          Advanced temporal competition system with time-based rankings, historical tracking, and automated season management
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Task 12.2:</strong> Seasonal Competition Tracking
            <br />
            This system provides time-based competitions with seasonal rankings, historical archiving,
            and automated competition scheduling across different time periods.
          </Typography>
        </Alert>
      </Box>

      <Grid container spacing={3}>
        {/* Feature Overview */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <ScheduleIcon color="primary" />
                <Typography variant="h6">
                  Time-Based Competitions
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Multiple temporal competition formats with automated scheduling and rollover functionality.
              </Typography>
              
              <Stack spacing={1}>
                <Chip 
                  label="Weekly Challenges" 
                  size="small" 
                  sx={{ backgroundColor: '#4CAF50', color: 'white' }}
                />
                <Chip 
                  label="Monthly Championships" 
                  size="small"
                  sx={{ backgroundColor: '#2196F3', color: 'white' }}
                />
                <Chip 
                  label="Quarterly Tournaments" 
                  size="small"
                  sx={{ backgroundColor: '#FF9800', color: 'white' }}
                />
                <Chip 
                  label="Annual Grand Prix" 
                  size="small"
                  sx={{ backgroundColor: '#9C27B0', color: 'white' }}
                />
                <Chip 
                  label="Custom Events" 
                  size="small"
                  sx={{ backgroundColor: '#607D8B', color: 'white' }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <ProgressIcon color="primary" />
                <Typography variant="h6">
                  Progress Tracking
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Comprehensive progress tracking with historical data and trend analysis.
              </Typography>
              
              <List dense>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <TimelineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Real-time Rankings"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <ProgressIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Weekly/Monthly Progress"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <TrophyIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Achievement Tracking"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemIcon>
                    <ArchiveIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Historical Archives"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <NotificationIcon color="primary" />
                <Typography variant="h6">
                  System Features
                </Typography>
              </Stack>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                Advanced features for managing seasonal competitions and user engagement.
              </Typography>
              
              <List dense>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="• Auto-Season Creation"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondary="Automatic generation of upcoming seasons"
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="• Season Archival"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondary="Historical data preservation with winner records"
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="• Progress Visualization"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondary="Time-based progress bars and remaining time display"
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="• Reward Systems"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondary="Tiered rewards with seasonal prizes"
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Technical Implementation Details */}
      <Card sx={{ mt: 3, mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Technical Implementation
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>Database Models</Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Season"
                    secondary="Core season definition with time boundaries and configuration"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="SeasonParticipant"
                    secondary="Detailed tracking of user participation and performance"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="SeasonArchive"
                    secondary="Historical preservation of completed seasons"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="CompetitionEvent"
                    secondary="Scheduled events and announcements within seasons"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              </List>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>API Features</Typography>
              <List dense>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Automated Season Creation"
                    secondary="Auto-generates upcoming monthly/quarterly competitions"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disiteGutters>
                  <ListItemText 
                    primary="Time-based Calculations"
                    secondary="Progress tracking and remaining time calculations"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Participation Management"
                    secondary="Join/leave functionality with validation"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem disableGutters>
                  <ListItemText 
                    primary="Historical Archival"
                    secondary="Automatic archiving of completed seasons with rankings"
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Competition Tracker Component */}
      <Box sx={{ mt: 4 }}>
        <SeasonalCompetitionTracker
          showArchived={true}
          maxSeasonsDisplay={20}
        />
      </Box>
    </Container>
  );
}
