'use client';

/**
 * Category-Based Leaderboard Component
 * Task 12.1: Category-Based Leaderboard System
 * 
 * Taking the role of Senior Frontend Developer specializing in Gaming UI/UX
 * 
 * Enhanced leaderboard interface with category selection and category-specific rankings
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Tabs,
  Tab,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Military as MilitaryIcon,
  Favorite as HeartIcon,
  School as SchoolIcon,
  Psychology as SkillIcon,
  Category as CategoryIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Star as StarIcon,
  WorkspacePremium as BadgeIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface CategoryLeaderboardPlayer {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  score: number;
  categoryDetails: Record<string, any>;
  level: number;
  badges: number;
  categoryMetrics: {
    rating?: number;
    completedTrips?: number;
    totalFishCaught?: number;
    biggestCatch?: number;
    activeDays?: number;
    mentorRating?: number;
    techniqueCount?: number;
    speciesCount?: number;
  };
}

interface LeaderboardCategory {
  id: string;
  name: string;
  displayName: string;
  category: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface CategoryLeaderboardProps {
  className?: string;
  defaultCategory?: string;
  showCategoryDescription?: boolean;
  limit?: number;
}

// Category icon mapping
const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    'MONTHLY_CHAMPIONS': <TrophyIcon />,
    'BIGGEST_CATCH': <MilitaryIcon />,
    'MOST_ACTIVE': <TimerIcon />,
    'BEST_MENTOR': <SchoolIcon />,
    'TECHNIQUE_MASTER': <SkillIcon />,
    'SPECIES_SPECIALIST': <CategoryIcon />,
    'CONSISTENCY_KING': <TrendingUpIcon />,
    'ROOKIE_OF_MONTH': <PersonIcon />,
    'VETERAN_ANGLER': <StarIcon />,
    'SOCIAL_BUTTERFLY': <GroupsIcon />
  };
  return icons[category] || <TrophyIcon />;
};

// Category color mapping
const getCategoryColor = (category: string, providedColor?: string | null) => {
  if (providedColor) return providedColor;
  
  const colors: Record<string, string> = {
    'MONTHLY_CHAMPIONS': '#FFD700',
    'BIGGEST_CATCH': '#FF6B6B',
    'MOST_ACTIVE': '#4ECDC4',
    'BEST_MENTOR': '#45B7D1',
    'TECHNIQUE_MASTER': '#96CEB4',
    'SPECIES_SPECIALIST': '#FFEAA7',
    'CONSISTENCY_KING': '#DDA0DD',
    'ROOKIE_OF_MONTH': '#98D8C8',
    'VETERAN_ANGLER': '#F7DC6F',
    'SOCIAL_BUTTERFLY': '#BB8FCE'
  };
  return colors[category] || '#4ECDC4';
};

// Position medal component
const PositionMedal = ({ position, size = 24 }: { position: number; size?: number }) => {
  const getMedalColor = () => {
    switch (position) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#666';
    }
  };

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: getMedalColor(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: position <= 3 ? 'white' : 'white',
        fontWeight: 'bold',
        fontSize: size * 0.5
      }}
    >
      {position <= 3 ? (
        <TrophyIcon sx={{ fontSize: size * 0.7, color: 'white' }} />
      ) : (
        position
      )}
    </Box>
  );
};

export function CategoryLeaderboard({
  className = '',
  defaultCategory = 'MONTHLY_CHAMPIONS',
  showCategoryDescription = true,
  limit = 50
}: CategoryLeaderboardProps) {
  const { data: session } = useSession();
  const [categories, setCategories] = useState<LeaderboardCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(defaultCategory);
  const [rankings, setRankings] = useState<Record<string, CategoryLeaderboardPlayer[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get current category data
  const currentCategory = useMemo(
    () => categories.find(cat => cat.category === selectedCategory),
    [categories, selectedCategory]
  );

  const currentRankings = useMemo(
    () => rankings[selectedCategory] || [],
    [rankings, selectedCategory]
  );

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/leaderboard-categories?action=categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data.categories || []);
      
      if (data.categories?.length > 0 && !data.categories.find((cat: any) => cat.category === selectedCategory)) {
        setSelectedCategory(data.categories[0].category);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  }, [selectedCategory]);

  // Fetch rankings for specific category
  const fetchRankings = useCallback(async (category: string, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/leaderboard-categories?action=rankings&category=${category}&limit=${limit}`
      );
      
      if (!response.ok) throw new Error('Failed to fetch rankings');
      
      const data = await response.json();
      setRankings(prev => ({
        ...prev,
        ...data.rankings
      }));
      
    } catch (err) {
      console.error('Error fetching rankings:', err);
      setError('Failed to load rankings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit]);

  // Handle category change
  const handleCategoryChange = useCallback((newCategory: string) => {
    setSelectedCategory(newCategory);
    
    // Fetch rankings if not already loaded
    if (!rankings[newCategory]) {
      fetchRankings(newCategory);
    }
  }, [rankings, fetchRankings]);

  // Refresh current category
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRankings(selectedCategory, false);
  }, [selectedCategory, fetchRankings]);

  // Find current user position
  const currentUserPosition = useMemo(() => {
    if (!session?.user?.id) return null;
    return currentRankings.find(player => player.userId === session.user.id);
  }, [currentRankings, session?.user?.id]);

  // Format score based on category
  const formatScore = useCallback((score: number, category: string) => {
    switch (category) {
      case 'BIGGEST_CATCH':
        return `${score.toFixed(2)} kg`;
      case 'MONTHLY_CHAMPIONS':
        return score.toFixed(1);
      case 'MOST_ACTIVE':
        return `${Math.round(score)} pts`;
      case 'BEST_MENTOR':
        return `${score.toFixed(2)} ⭐`;
      default:
        return score.toFixed(1);
    }
  }, []);

  // Get category details for display
  const getCategoryDetails = useCallback((player: CategoryLeaderboardPlayer, category: string) => {
    const details = player.categoryDetails;
    const metrics = player.categoryMetrics;

    switch (category) {
      case 'MONTHLY_CHAMPIONS':
        return (
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`⭐ ${metrics.rating?.toFixed(1)}`} />
            <Chip size="small" label={`🎣 ${metrics.completedTrips}`} />
            <Chip size="small" label={`🐟 ${metrics.totalFishCaught}`} />
          </Stack>
        );
      case 'BIGGEST_CATCH':
        return (
          <Typography variant="caption" color="text.secondary">
            Biggest: {details.biggestCatchWeight?.toFixed(2) || '0'} kg
          </Typography>
        );
      case 'MOST_ACTIVE':
        return (
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={`🎣 ${metrics.completedTrips} trips`} />
            <Chip size="small" label={`📅 ${metrics.activeDays} days`} />
          </Stack>
        );
      case 'BEST_MENTOR':
        return (
          <Typography variant="caption" color="text.secondary">
            {metrics.mentorRating?.toFixed(1)} ⭐ mentor rating
          </Typography>
        );
      case 'TECHNIQUE_MASTER':
        return (
          <Typography variant="caption" color="text.secondary">
            {metrics.techniqueCount} techniques mastered
          </Typography>
        );
      case 'SPECIES_SPECIALIST':
        return (
          <Typography variant="caption" color="text.secondary">
            {metrics.speciesCount} species caught
          </Typography>
        );
      default:
        return (
          <Typography variant="caption" color="text.secondary">
            Level {player.level}
          </Typography>
        );
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadInitial = async () => {
      await fetchCategories();
      await fetchRankings(selectedCategory);
    };
    loadInitial();
  }, [fetchCategories, fetchRankings, selectedCategory]);

  if (loading && categories.length === 0) {
    return (
      <Box className={className} sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading leaderboards...
        </Typography>
      </Box>
    );
  }

  if (error && categories.length === 0) {
    return (
      <Box className={className}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Category Selection */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Competition Categories"
          subheader="Choose a category to view rankings"
          action={
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
          }
        />
        <CardContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              label="Category"
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.category}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: getCategoryColor(category.category, category.color) }}>
                      {getCategoryIcon(category.category)}
                    </Box>
                    <Typography>{category.displayName}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showCategoryDescription && currentCategory && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>{currentCategory.displayName}:</strong> {currentCategory.description}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Current User Position */}
      {currentUserPosition && (
        <Card sx={{ mb: 3, border: 2, borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Position
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <PositionMedal position={currentUserPosition.position} size={32} />
              <Box>
                <Typography variant="h6">
                  #{currentUserPosition.position}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score: {formatScore(currentUserPosition.score, selectedCategory)}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                {getCategoryDetails(currentUserPosition, selectedCategory)}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Rankings List */}
      <Card>
        <CardHeader
          avatar={
            <Box sx={{ color: getCategoryColor(selectedCategory) }}>
              {getCategoryIcon(selectedCategory)}
            </Box>
          }
          title={currentCategory?.displayName || 'Rankings'}
          subheader={`Top ${currentRankings.length} ${currentCategory?.displayName.toLowerCase() || 'players'}`}
        />
        <CardContent sx={{ pt: 0 }}>
          {loading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
            </Box>
          )}

          <List>
            <AnimatePresence>
              {currentRankings.map((player, index) => (
                <motion.div
                  key={player.userId}
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
                      backgroundColor: player.userId === session?.user?.id ? 'primary.50' : 'background.paper'
                    }}
                  >
                    <ListItemAvatar>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <PositionMedal position={player.position} />
                        <Avatar src={player.avatar || undefined} sx={{ width: 40, height: 40 }}>
                          {player.name.charAt(0).toUpperCase()}
                        </Avatar>
                      </Stack>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="h6">
                            {player.name}
                          </Typography>
                          {player.userId === session?.user?.id && (
                            <Chip label="You" color="primary" size="small" />
                          )}
                          <Badge badgeContent={player.badges} color="secondary">
                            <BadgeIcon fontSize="small" />
                          </Badge>
                        </Stack>
                      }
                      secondary={getCategoryDetails(player, selectedCategory)}
                    />
                    
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" color="primary">
                        {formatScore(player.score, selectedCategory)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Level {player.level}
                      </Typography>
                    </Box>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </List>

          {currentRankings.length === 0 && !loading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No rankings available for this category yet.
            </Alert>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

export default CategoryLeaderboard;
