'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from '@/hooks/use-toast';

// Types
interface PositionChange {
  from: number;
  to: number;
  change: number;
  timestamp: Date;
}

interface PositionHistoryPoint {
  position: number;
  timestamp: Date;
  orderBy: string;
  value?: number;
}

interface EnhancedLeaderboardPlayer {
  position: number;
  userId: string;
  name: string;
  avatar: string | null;
  rating: number;
  level: number;
  completedTrips: number;
  totalFishCaught: number;
  achievementsCount: number;
  positionHistory?: PositionHistoryPoint[];
  lastPositionChange?: PositionChange;
}

interface UseEnhancedLeaderboardOptions {
  orderBy?: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount';
  limit?: number;
  showNearbyOnly?: boolean;
  nearbyRange?: number;
  enablePositionTracking?: boolean;
  refreshInterval?: number;
}

interface UseEnhancedLeaderboardReturn {
  players: EnhancedLeaderboardPlayer[];
  currentUser: EnhancedLeaderboardPlayer | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  toggleNearbyView: () => void;
  updateOrderBy: (orderBy: string) => void;
  isNearbyView: boolean;
  totalPlayers: number;
  currentUserPosition?: number;
}

// Local storage key for position history
const POSITION_HISTORY_KEY = 'leaderboard_position_history';
const POSITION_TRACKING_KEY = 'leaderboard_position_tracking';

// Helper functions for position history management
const getStoredPositionHistory = (userId: string): PositionHistoryPoint[] => {
  try {
    const stored = localStorage.getItem(`${POSITION_HISTORY_KEY}_${userId}`);
    if (!stored) return [];
    
    return JSON.parse(stored).map((point: any) => ({
      ...point,
      timestamp: new Date(point.timestamp)
    }));
  } catch {
    return [];
  }
};

const storePositionHistory = (userId: string, history: PositionHistoryPoint[]) => {
  try {
    // Keep only last 100 points to prevent excessive storage
    const trimmedHistory = history.slice(-100);
    localStorage.setItem(`${POSITION_HISTORY_KEY}_${userId}`, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.warn('Failed to store position history:', error);
  }
};

const getStoredPositionTracking = (): Record<string, any> => {
  try {
    const stored = localStorage.getItem(POSITION_TRACKING_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const storePositionTracking = (data: Record<string, any>) => {
  try {
    localStorage.setItem(POSITION_TRACKING_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to store position tracking data:', error);
  }
};

export function useEnhancedLeaderboard(options: UseEnhancedLeaderboardOptions = {}): UseEnhancedLeaderboardReturn {
  const {
    orderBy = 'rating',
    limit = 50,
    showNearbyOnly = false,
    nearbyRange = 3,
    enablePositionTracking = true,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // State
  const [players, setPlayers] = useState<EnhancedLeaderboardPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNearbyView, setIsNearbyView] = useState(showNearbyOnly);
  const [currentOrderBy, setCurrentOrderBy] = useState(orderBy);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [currentUserPosition, setCurrentUserPosition] = useState<number>();

  // Fetch leaderboard data
  const fetchLeaderboardData = useCallback(async () => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        orderBy: currentOrderBy,
        limit: limit.toString(),
        ...(isNearbyView && currentUserId && { showNearestTo: currentUserId })
      });

      const response = await fetch(`/api/leaderboard?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setTotalPlayers(data.totalPlayers || data.players?.length || 0);
      setCurrentUserPosition(data.currentUserPosition);

      // Process and enhance players data
      const enhancedPlayers: EnhancedLeaderboardPlayer[] = (data.players || []).map((player: any) => {
        const enhanced: EnhancedLeaderboardPlayer = {
          ...player,
          positionHistory: [],
          lastPositionChange: undefined
        };

        // Add position history if tracking is enabled and user is current user
        if (enablePositionTracking && player.userId === currentUserId) {
          const history = getStoredPositionHistory(player.userId);
          enhanced.positionHistory = history;
          
          // Calculate last position change
          if (history.length > 0) {
            const lastEntry = history[history.length - 1];
            if (history.length > 1) {
              const previousEntry = history[history.length - 2];
              enhanced.lastPositionChange = {
                from: previousEntry.position,
                to: lastEntry.position,
                change: previousEntry.position - lastEntry.position, // Positive means improvement
                timestamp: lastEntry.timestamp
              };
            }
          }
          
          // Update position history if position changed
          const now = new Date();
          const shouldUpdate = history.length === 0 || 
            history[history.length - 1].position !== player.position ||
            now.getTime() - history[history.length - 1].timestamp.getTime() > 1000 * 60 * 60; // 1 hour

          if (shouldUpdate) {
            const newHistoryPoint: PositionHistoryPoint = {
              position: player.position,
              timestamp: now,
              orderBy: currentOrderBy,
              value: player[currentOrderBy as keyof typeof player] as number
            };
            
            const updatedHistory = [...history, newHistoryPoint];
            enhanced.positionHistory = updatedHistory;
            storePositionHistory(player.userId, updatedHistory);
          }
        }

        return enhanced;
      });

      setPlayers(enhancedPlayers);
      
      // Store tracking data for all players (for detecting changes)
      if (enablePositionTracking) {
        const trackingData = getStoredPositionTracking();
        const newTrackingData = { ...trackingData };
        
        enhancedPlayers.forEach(player => {
          const key = `${player.userId}_${currentOrderBy}`;
          const previousData = trackingData[key];
          
          if (previousData && previousData.position !== player.position) {
            // Position changed - we could trigger notifications here
            console.log(`Position changed for ${player.name}: ${previousData.position} → ${player.position}`);
          }
          
          newTrackingData[key] = {
            position: player.position,
            timestamp: new Date().toISOString(),
            orderBy: currentOrderBy
          };
        });
        
        storePositionTracking(newTrackingData);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leaderboard data';
      setError(errorMessage);
      toast({
        title: 'Ошибка загрузки рейтинга',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentOrderBy, limit, isNearbyView, currentUserId, enablePositionTracking]);

  // Get nearby players for a specific user
  const fetchNearbyPlayers = useCallback(async (userId: string) => {
    try {
      const response = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          orderBy: currentOrderBy,
          showNearest: nearbyRange
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Failed to fetch nearby players:', err);
      return null;
    }
  }, [currentOrderBy, nearbyRange]);

  // Current user data
  const currentUser = useMemo(() => {
    return players.find(player => player.userId === currentUserId) || null;
  }, [players, currentUserId]);

  // Toggle nearby view
  const toggleNearbyView = useCallback(() => {
    setIsNearbyView(prev => !prev);
  }, []);

  // Update order by
  const updateOrderBy = useCallback((newOrderBy: string) => {
    setCurrentOrderBy(newOrderBy as typeof orderBy);
    setIsLoading(true);
  }, []);

  // Refresh data
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  // Set up periodic refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchLeaderboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchLeaderboardData, refreshInterval]);

  return {
    players,
    currentUser,
    isLoading,
    error,
    refresh,
    toggleNearbyView,
    updateOrderBy,
    isNearbyView,
    totalPlayers,
    currentUserPosition
  };
}
