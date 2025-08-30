'use client';

import React, { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  Typography,
  Grid,
  Button,
  Alert,
  Skeleton,
  Paper,
  Container,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Timeline as StatsIcon,
} from '@mui/icons-material';
import { useGroupTrips } from '@/lib/hooks/useGroupTrips';
import GroupTripCard from './GroupTripCard';
import GroupTripsStats from './GroupTripsStats';
import GroupTripsFilters from './GroupTripsFilters';
import { 
  GroupTripDisplay,
  TripFilters,
  TripSortBy,
} from '@/lib/types/group-events';

// Local interfaces
interface GroupTripsDisplayConfig {
  columns: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  animations: {
    hover: any;
    entrance: any;
    progress: any;
  };
  colors: {
    forming: string;
    almost_full: string;
    confirmed: string;
    urgent: string;
  };
  maxVisibleTrips: number;
  autoRefreshInterval: number;
  showLoadingSkeletons: boolean;
  enableVirtualization: boolean;
  showEmptyState: boolean;
  enableFiltering: boolean;
  enableSorting: boolean;
  showStats: boolean;
}

interface GroupTripsListProps {
  config?: Partial<GroupTripsDisplayConfig>;
  filters?: TripFilters;
  className?: string;
  onTripSelect?: (tripId: string) => void;
}

// Конфигурация по умолчанию
const defaultConfig: GroupTripsDisplayConfig = {
  columns: {
    desktop: 3,
    tablet: 2,
    mobile: 1,
  },
  animations: {
    hover: {
      scale: 1.02,
      translateY: -8,
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    },
    entrance: {
      duration: 0.5,
      delay: 0.1,
      ease: 'easeOut',
    },
    progress: {
      duration: 1.2,
      ease: 'easeOut',
    },
  },
  colors: {
    forming: '#2196f3',
    almost_full: '#ff9800',
    confirmed: '#4caf50',
    urgent: '#f44336',
  },
  maxVisibleTrips: 12,
  autoRefreshInterval: 60000,
  showLoadingSkeletons: true,
  enableVirtualization: false,
  showEmptyState: true,
  enableFiltering: true,
  enableSorting: true,
  showStats: true,
};

// Анимации для списка
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.9,
    transition: {
      duration: 0.3,
    },
  },
};

// Компонент скелетона для карточки
function SkeletonCard() {
  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        height: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton variant="text" width={160} height={28} />
        <Skeleton variant="rounded" width={80} height={24} />
      </Box>
      
      <Skeleton variant="text" width={120} height={20} />
      
      <Box sx={{ flexGrow: 1 }}>
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="rounded" width="100%" height={8} sx={{ mt: 1, mb: 2 }} />
        
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton variant="text" width={80} height={24} />
          <Skeleton variant="text" width={100} height={16} />
        </Box>
      </Box>
      
      <Skeleton variant="rounded" width="100%" height={48} />
    </Paper>
  );
}

// Компонент Empty State
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Paper 
        sx={{ 
          p: 6, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        <StatsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Групповых поездок пока нет
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Будьте первым, кто создаст групповую поездку!
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          sx={{ fontWeight: 600 }}
        >
          Создать группу
        </Button>
      </Paper>
    </motion.div>
  );
}

export default function GroupTripsList({
  config,
  filters,
  className = '',
  onTripSelect,
}: GroupTripsListProps) {
  const [showFilters, setShowFilters] = React.useState(false);
  const [showStats, setShowStats] = React.useState(config?.showStats ?? defaultConfig.showStats);
  
  const mergedConfig = { ...defaultConfig, ...config };
  
  const {
    trips,
    stats,
    isLoading,
    isError,
    error,
    isEmpty,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
    filters: currentFilters,
    setFilters,
    sortBy,
    setSortBy,
  } = useGroupTrips(filters);

  const handleTripSelect = (trip: GroupTripDisplay) => {
    if (onTripSelect) {
      onTripSelect(trip);
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  const toggleFilters = () => {
    setShowFilters(prev => !prev);
  };

  const toggleStats = () => {
    setShowStats(prev => !prev);
  };

  // Error state
  if (isError) {
    return (
      <Box className={className}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Повторить
            </Button>
          }
        >
          Ошибка загрузки групповых поездок: {error?.message}
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={className}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2,
        }}>
          <Box>
            <Typography variant="h4" component="h2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Доступные групповые поездки
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Присоединяйтесь к существующим группам или создайте свою
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Обновить">
              <IconButton onClick={handleRefresh} disabled={isLoading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            {mergedConfig.showStats && (
              <Tooltip title="Статистика">
                <IconButton onClick={toggleStats} color={showStats ? 'primary' : 'default'}>
                  <StatsIcon />
                </IconButton>
              </Tooltip>
            )}
            
            {mergedConfig.enableFiltering && (
              <Tooltip title="Фильтры">
                <IconButton onClick={toggleFilters} color={showFilters ? 'primary' : 'default'}>
                  <FilterIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Quick Stats Chips */}
        {!isLoading && !isEmpty && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip 
              label={`${stats.totalActiveTrips} активных поездок`}
              variant="outlined"
              size="small"
            />
            <Chip 
              label={`${stats.totalParticipants} участников`}
              variant="outlined" 
              size="small"
            />
            <Chip 
              label={`${stats.confirmedTrips} подтверждённых`}
              variant="outlined"
              size="small"
              color="success"
            />
            {stats.formingTrips > 0 && (
              <Chip 
                label={`${stats.formingTrips} набираются`}
                variant="outlined"
                size="small"
                color="primary"
              />
            )}
          </Box>
        )}
      </Box>

      {/* Stats Section */}
      <AnimatePresence>
        {showStats && !isEmpty && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GroupTripsStats stats={stats} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters Section */}
      <AnimatePresence>
        {showFilters && mergedConfig.enableFiltering && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <GroupTripsFilters 
              filters={currentFilters}
              onFiltersChange={setFilters}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Skeletons */}
      {isLoading && mergedConfig.showLoadingSkeletons && (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid 
              key={`skeleton-${index}`}
              item 
              xs={12} 
              sm={12/mergedConfig.columns.mobile}
              md={12/mergedConfig.columns.tablet} 
              lg={12/mergedConfig.columns.desktop}
            >
              <SkeletonCard />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {isEmpty && mergedConfig.showEmptyState && (
        <EmptyState />
      )}

      {/* Trips Grid */}
      {!isLoading && !isEmpty && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3}>
            <AnimatePresence>
              {trips.map((trip) => (
                <Grid 
                  key={trip.tripId}
                  item 
                  xs={12} 
                  sm={12/mergedConfig.columns.mobile}
                  md={12/mergedConfig.columns.tablet} 
                  lg={12/mergedConfig.columns.desktop}
                >
                  <motion.div
                    variants={itemVariants}
                    layout
                  >
                    <GroupTripCard
                      trip={trip}
                      config={mergedConfig.animations}
                      onClick={handleTripSelect}
                    />
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>

          {/* Load More Button */}
          {hasMore && (
            <Box sx={{ textAlign: 'center', mt: 4 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={loadMore}
                disabled={isLoadingMore}
                sx={{ minWidth: 200 }}
              >
                {isLoadingMore ? 'Загрузка...' : 'Показать ещё'}
              </Button>
            </Box>
          )}
        </motion.div>
      )}
    </Box>
  );
}
