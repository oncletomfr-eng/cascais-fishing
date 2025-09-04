'use client';

/**
 * Seasonal Competition Tracker Component
 * Task 12.2: Seasonal Competition Tracking
 * 
 * Taking the role of Senior Frontend Developer specializing in Temporal Gaming UI
 * 
 * Advanced seasonal competition interface with calendar, progress tracking, and historical data
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Button,
  Chip,
  Avatar,
  Stack,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@mui/material';
import {
  Calendar as CalendarIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  TrendingUp as ProgressIcon,
  Group as GroupIcon,
  PersonAdd as JoinIcon,
  ExitToApp as LeaveIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  Medal as MedalIcon,
  Timeline as TimelineIcon,
  Notifications as NotificationIcon,
  Archive as ArchiveIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Season {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  participantCount: number;
  currentUserParticipating?: boolean;
  currentUserRank?: number;
  timeRemaining?: string;
  progress?: number;
  rewards?: {
    tiers: Array<{
      place: number;
      reward: string;
      value: number;
    }>;
  };
  categories?: string[];
}

interface SeasonParticipant {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  totalScore: number;
  overallRank: number | null;
  categoryRanks: Record<string, number>;
  categoryScores: Record<string, number>;
  achievementsEarned: string[];
  badgesEarned: string[];
  joinedAt: string;
  isActive: boolean;
}

interface SeasonalCompetitionTrackerProps {
  className?: string;
  showArchived?: boolean;
  maxSeasonsDisplay?: number;
}

// Season type colors
const getSeasonTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    'WEEKLY': '#4CAF50',
    'MONTHLY': '#2196F3',
    'QUARTERLY': '#FF9800',
    'YEARLY': '#9C27B0',
    'CUSTOM': '#607D8B'
  };
  return colors[type] || '#4CAF50';
};

// Season status colors
const getSeasonStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'UPCOMING': '#FFC107',
    'ACTIVE': '#4CAF50',
    'COMPLETED': '#9E9E9E',
    'CANCELLED': '#F44336'
  };
  return colors[status] || '#9E9E9E';
};

// Season status icons
const getSeasonStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    'UPCOMING': <CalendarIcon />,
    'ACTIVE': <TrophyIcon />,
    'COMPLETED': <ArchiveIcon />,
    'CANCELLED': <InfoIcon />
  };
  return icons[status] || <CalendarIcon />;
};

export function SeasonalCompetitionTracker({
  className = '',
  showArchived = false,
  maxSeasonsDisplay = 10
}: SeasonalCompetitionTrackerProps) {
  const { data: session } = useSession();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [seasonParticipants, setSeasonParticipants] = useState<SeasonParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [seasonToJoin, setSeasonToJoin] = useState<Season | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Filtered seasons by tab
  const filteredSeasons = useMemo(() => {
    switch (activeTab) {
      case 0: // Active
        return seasons.filter(s => s.status === 'ACTIVE');
      case 1: // Upcoming
        return seasons.filter(s => s.status === 'UPCOMING');
      case 2: // My Seasons
        return seasons.filter(s => s.currentUserParticipating);
      case 3: // Completed
        return seasons.filter(s => s.status === 'COMPLETED');
      default:
        return seasons;
    }
  }, [seasons, activeTab]);

  // User's current season participation
  const userActiveSeasons = useMemo(
    () => seasons.filter(s => s.currentUserParticipating && s.status === 'ACTIVE'),
    [seasons]
  );

  // Fetch seasons
  const fetchSeasons = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        action: 'seasons',
        includeArchived: showArchived.toString(),
        limit: maxSeasonsDisplay.toString()
      });

      if (session?.user?.id) {
        params.append('userId', session.user.id);
      }

      const response = await fetch(`/api/seasonal-competitions?${params}`);
      
      if (!response.ok) throw new Error('Failed to fetch seasons');
      
      const data = await response.json();
      setSeasons(data.seasons || []);

    } catch (err) {
      console.error('Error fetching seasons:', err);
      setError('Failed to load seasonal competitions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id, showArchived, maxSeasonsDisplay]);

  // Fetch season participants
  const fetchSeasonParticipants = useCallback(async (seasonId: string) => {
    try {
      setParticipantsLoading(true);

      const response = await fetch(`/api/seasonal-competitions?action=participants&seasonId=${seasonId}`);
      
      if (!response.ok) throw new Error('Failed to fetch participants');
      
      const data = await response.json();
      setSeasonParticipants(data.participants || []);

    } catch (err) {
      console.error('Error fetching season participants:', err);
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  // Join/leave season
  const toggleSeasonParticipation = useCallback(async (season: Season, join: boolean) => {
    if (!session?.user?.id) return;

    try {
      const action = join ? 'join' : 'leave';
      
      const response = await fetch(`/api/seasonal-competitions?action=${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          seasonId: season.id,
          userId: session.user.id
        })
      });

      if (!response.ok) throw new Error(`Failed to ${action} season`);

      // Refresh seasons data
      await fetchSeasons(false);
      
      // Refresh participants if viewing this season
      if (selectedSeason?.id === season.id) {
        await fetchSeasonParticipants(season.id);
      }

      setJoinDialogOpen(false);
      setSeasonToJoin(null);

    } catch (err) {
      console.error(`Error ${join ? 'joining' : 'leaving'} season:`, err);
    }
  }, [session?.user?.id, fetchSeasons, selectedSeason?.id, fetchSeasonParticipants]);

  // Handle season selection
  const handleSeasonSelect = useCallback((season: Season) => {
    setSelectedSeason(season);
    fetchSeasonParticipants(season.id);
  }, [fetchSeasonParticipants]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSeasons(false);
  }, [fetchSeasons]);

  // Format date display
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  // Initial load
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  if (loading) {
    return (
      <Box className={className} sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading seasonal competitions...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className={className}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={() => fetchSeasons()} variant="outlined">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<CalendarIcon sx={{ fontSize: 32, color: 'primary.main' }} />}
          title="Seasonal Competition Tracker"
          subheader="Participate in time-based fishing competitions and track your progress"
          action={
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          }
        />
      </Card>

      {/* User's Active Seasons Summary */}
      {userActiveSeasons.length > 0 && (
        <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Your Active Competitions
            </Typography>
            <Grid container spacing={2}>
              {userActiveSeasons.map((season) => (
                <Grid item xs={12} md={6} key={season.id}>
                  <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.1)' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <TrophyIcon sx={{ color: 'gold' }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" sx={{ color: 'white' }}>
                          {season.displayName}
                        </Typography>
                        {season.currentUserRank && (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            Current Rank: #{season.currentUserRank}
                          </Typography>
                        )}
                        {season.timeRemaining && (
                          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                            {season.timeRemaining} remaining
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    {season.progress && (
                      <LinearProgress 
                        variant="determinate" 
                        value={season.progress}
                        sx={{ 
                          mt: 1, 
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'white'
                          }
                        }}
                      />
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Grid container spacing={3}>
        {/* Seasons List */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Competitions"
              subheader={`${filteredSeasons.length} competitions available`}
            />
            <CardContent sx={{ pt: 0 }}>
              {/* Tabs */}
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
              >
                <Tab label="Active" />
                <Tab label="Upcoming" />
                <Tab label="My Seasons" />
                {showArchived && <Tab label="Completed" />}
              </Tabs>

              {/* Season List */}
              <List>
                <AnimatePresence>
                  {filteredSeasons.map((season, index) => (
                    <motion.div
                      key={season.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <ListItem
                        sx={{
                          mb: 1,
                          border: 1,
                          borderColor: 'grey.300',
                          borderRadius: 2,
                          backgroundColor: selectedSeason?.id === season.id ? 'primary.50' : 'background.paper',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'grey.50'
                          }
                        }}
                        onClick={() => handleSeasonSelect(season)}
                      >
                        <ListItemAvatar>
                          <Avatar 
                            sx={{ 
                              backgroundColor: getSeasonStatusColor(season.status),
                              color: 'white'
                            }}
                          >
                            {getSeasonStatusIcon(season.status)}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="subtitle1">
                                {season.displayName}
                              </Typography>
                              <Chip
                                label={season.type}
                                size="small"
                                sx={{ backgroundColor: getSeasonTypeColor(season.type), color: 'white' }}
                              />
                              {season.currentUserParticipating && (
                                <Chip label="Joined" color="primary" size="small" />
                              )}
                            </Stack>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(season.startDate)} - {formatDate(season.endDate)}
                              </Typography>
                              {season.timeRemaining && (
                                <Typography variant="body2" color="primary">
                                  {season.timeRemaining} remaining
                                </Typography>
                              )}
                              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                <Chip
                                  label={`${season.participantCount} participants`}
                                  size="small"
                                  icon={<GroupIcon />}
                                />
                                {season.currentUserRank && (
                                  <Chip
                                    label={`Rank #${season.currentUserRank}`}
                                    size="small"
                                    color="secondary"
                                  />
                                )}
                              </Stack>
                            </Box>
                          }
                        />

                        <Stack spacing={1}>
                          {season.status === 'ACTIVE' && !season.currentUserParticipating && (
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<JoinIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSeasonToJoin(season);
                                setJoinDialogOpen(true);
                              }}
                            >
                              Join
                            </Button>
                          )}
                          {season.currentUserParticipating && (
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              startIcon={<LeaveIcon />}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSeasonParticipation(season, false);
                              }}
                            >
                              Leave
                            </Button>
                          )}
                        </Stack>
                      </ListItem>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </List>

              {filteredSeasons.length === 0 && (
                <Alert severity="info">
                  No competitions found for the selected category.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Season Details */}
        <Grid item xs={12} md={6}>
          {selectedSeason ? (
            <Card>
              <CardHeader
                avatar={
                  <Avatar 
                    sx={{ 
                      backgroundColor: getSeasonStatusColor(selectedSeason.status),
                      color: 'white'
                    }}
                  >
                    {getSeasonStatusIcon(selectedSeason.status)}
                  </Avatar>
                }
                title={selectedSeason.displayName}
                subheader={selectedSeason.description}
              />
              <CardContent>
                {/* Season Progress */}
                {selectedSeason.status === 'ACTIVE' && selectedSeason.progress && (
                  <Box sx={{ mb: 3 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="body2">Season Progress</Typography>
                      <Typography variant="body2">{selectedSeason.progress.toFixed(1)}%</Typography>
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedSeason.progress}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {selectedSeason.timeRemaining} remaining
                    </Typography>
                  </Box>
                )}

                {/* Season Info */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>Season Information</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Type</Typography>
                      <Chip 
                        label={selectedSeason.type} 
                        size="small"
                        sx={{ backgroundColor: getSeasonTypeColor(selectedSeason.type), color: 'white' }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Status</Typography>
                      <Chip 
                        label={selectedSeason.status} 
                        size="small"
                        sx={{ backgroundColor: getSeasonStatusColor(selectedSeason.status), color: 'white' }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Start Date</Typography>
                      <Typography variant="body1">{formatDate(selectedSeason.startDate)}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">End Date</Typography>
                      <Typography variant="body1">{formatDate(selectedSeason.endDate)}</Typography>
                    </Grid>
                  </Grid>
                </Box>

                {/* Rewards */}
                {selectedSeason.rewards?.tiers && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>Rewards</Typography>
                    <Stack spacing={1}>
                      {selectedSeason.rewards.tiers.map((tier) => (
                        <Paper key={tier.place} sx={{ p: 2 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ backgroundColor: tier.place === 1 ? 'gold' : tier.place === 2 ? 'silver' : '#CD7F32' }}>
                              {tier.place}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2">{tier.reward}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                Value: {tier.value} points
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Participants */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6">
                      Leaderboard ({seasonParticipants.length})
                    </Typography>
                    {participantsLoading && <CircularProgress size={20} />}
                  </Stack>

                  {seasonParticipants.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Rank</TableCell>
                            <TableCell>Player</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell align="center">Badges</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {seasonParticipants.slice(0, 10).map((participant, index) => (
                            <TableRow 
                              key={participant.id}
                              sx={{
                                backgroundColor: participant.userId === session?.user?.id ? 'primary.50' : 'inherit'
                              }}
                            >
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  {(participant.overallRank || index + 1) <= 3 ? (
                                    <MedalIcon 
                                      sx={{ 
                                        color: (participant.overallRank || index + 1) === 1 ? 'gold' : 
                                               (participant.overallRank || index + 1) === 2 ? 'silver' : '#CD7F32'
                                      }} 
                                    />
                                  ) : (
                                    <Typography variant="body2">
                                      #{participant.overallRank || index + 1}
                                    </Typography>
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Avatar 
                                    src={participant.userAvatar || undefined}
                                    sx={{ width: 32, height: 32 }}
                                  >
                                    {participant.userName.charAt(0)}
                                  </Avatar>
                                  <Typography variant="body2">
                                    {participant.userName}
                                    {participant.userId === session?.user?.id && (
                                      <Chip label="You" size="small" color="primary" sx={{ ml: 1 }} />
                                    )}
                                  </Typography>
                                </Stack>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {participant.totalScore.toFixed(1)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Badge badgeContent={participant.badgesEarned.length} color="secondary">
                                  <StarIcon fontSize="small" />
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">
                      No participants yet. Be the first to join!
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Select a season to view details
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a seasonal competition from the list to see participants and progress
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Join Season Dialog */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
        <DialogTitle>
          Join {seasonToJoin?.displayName}
        </DialogTitle>
        <DialogContent>
          {seasonToJoin && (
            <Box>
              <Typography paragraph>
                {seasonToJoin.description}
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                By joining this season, you'll compete with {seasonToJoin.participantCount} other participants
                in categories: {seasonToJoin.categories?.join(', ')}.
              </Alert>

              {seasonToJoin.rewards?.tiers && (
                <Box>
                  <Typography variant="h6" gutterBottom>Potential Rewards</Typography>
                  <Stack spacing={1}>
                    {seasonToJoin.rewards.tiers.slice(0, 3).map((tier) => (
                      <Typography key={tier.place} variant="body2">
                        🏆 {tier.place === 1 ? '1st' : tier.place === 2 ? '2nd' : '3rd'} Place: {tier.reward}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => seasonToJoin && toggleSeasonParticipation(seasonToJoin, true)}
            startIcon={<JoinIcon />}
          >
            Join Competition
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SeasonalCompetitionTracker;
