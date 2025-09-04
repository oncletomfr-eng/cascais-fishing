'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { AchievementWithProgress } from '@/lib/types/achievements';

// Types
interface UserAchievementProfile {
  userId: string;
  name: string;
  avatar?: string | null;
  level: number;
  rating: number;
  completedTrips: number;
  achievements: AchievementWithProgress[];
  totalAchievements: number;
  unlockedAchievements: number;
  progressPercent: number;
}

interface AchievementChallenge {
  id: string;
  fromUserId: string;
  toUserId: string;
  achievementId: string;
  message?: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  createdAt: Date;
  completedAt?: Date;
}

interface UseAchievementComparisonOptions {
  enableChallenges?: boolean;
  enableSharing?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseAchievementComparisonReturn {
  // User profiles
  loadUserProfile: (userId: string) => Promise<UserAchievementProfile | null>;
  isLoading: boolean;
  error: string | null;
  
  // Challenges
  sendChallenge: (targetUserId: string, achievementId: string, message?: string) => Promise<boolean>;
  acceptChallenge: (challengeId: string) => Promise<boolean>;
  declineChallenge: (challengeId: string) => Promise<boolean>;
  getUserChallenges: (userId: string) => Promise<AchievementChallenge[]>;
  
  // Sharing
  shareComparison: (user1Id: string, user2Id: string, platformData?: any) => Promise<boolean>;
  generateComparisonUrl: (user1Id: string, user2Id: string) => string;
  
  // Utilities
  calculateComparisonStats: (user1: UserAchievementProfile, user2: UserAchievementProfile) => any;
  generateRecommendations: (user: UserAchievementProfile, comparedUser: UserAchievementProfile) => any[];
}

// Local storage keys
const CHALLENGES_STORAGE_KEY = 'achievement_challenges';
const SHARED_COMPARISONS_KEY = 'shared_comparisons';

// Helper functions
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const getFromLocalStorage = (key: string, defaultValue: any = null) => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn('Failed to read from localStorage:', error);
    return defaultValue;
  }
};

const generateChallengeId = () => {
  return `challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export function useAchievementComparison(
  options: UseAchievementComparisonOptions = {}
): UseAchievementComparisonReturn {
  const {
    enableChallenges = true,
    enableSharing = true,
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user achievement profile
  const loadUserProfile = useCallback(async (userId: string): Promise<UserAchievementProfile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // First get user basic info
      const userResponse = await fetch(`/api/profiles?userId=${userId}`);
      if (!userResponse.ok) {
        throw new Error('Failed to load user profile');
      }
      const userData = await userResponse.json();

      // Get user achievements
      const achievementsResponse = await fetch(`/api/achievements?userId=${userId}`);
      if (!achievementsResponse.ok) {
        throw new Error('Failed to load user achievements');
      }
      const achievementsData = await achievementsResponse.json();

      // Combine data into profile
      const profile: UserAchievementProfile = {
        userId: userData.user.id,
        name: userData.user.name || 'Пользователь',
        avatar: userData.user.image,
        level: userData.level || 1,
        rating: userData.rating || 0,
        completedTrips: userData.completedTrips || 0,
        achievements: achievementsData.achievements || [],
        totalAchievements: achievementsData.stats?.total || 0,
        unlockedAchievements: achievementsData.stats?.unlocked || 0,
        progressPercent: achievementsData.stats?.progress || 0
      };

      return profile;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user profile';
      setError(errorMessage);
      toast({
        title: 'Ошибка загрузки',
        description: errorMessage,
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send achievement challenge
  const sendChallenge = useCallback(async (
    targetUserId: string, 
    achievementId: string, 
    message?: string
  ): Promise<boolean> => {
    if (!enableChallenges) {
      toast({
        title: 'Челленджи отключены',
        description: 'Функция челленджей недоступна',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const challenge: AchievementChallenge = {
        id: generateChallengeId(),
        fromUserId: 'current-user', // This would be replaced with actual current user ID
        toUserId: targetUserId,
        achievementId,
        message,
        status: 'pending',
        createdAt: new Date()
      };

      // Store challenge locally (in real app this would be API call)
      const existingChallenges = getFromLocalStorage(CHALLENGES_STORAGE_KEY, []);
      existingChallenges.push(challenge);
      saveToLocalStorage(CHALLENGES_STORAGE_KEY, existingChallenges);

      toast({
        title: 'Челлендж отправлен!',
        description: `Вызов на достижение отправлен пользователю`,
        variant: 'default'
      });

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send challenge';
      toast({
        title: 'Ошибка отправки',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [enableChallenges]);

  // Accept challenge
  const acceptChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    try {
      const challenges = getFromLocalStorage(CHALLENGES_STORAGE_KEY, []);
      const challengeIndex = challenges.findIndex((c: AchievementChallenge) => c.id === challengeId);
      
      if (challengeIndex === -1) {
        throw new Error('Challenge not found');
      }

      challenges[challengeIndex].status = 'accepted';
      saveToLocalStorage(CHALLENGES_STORAGE_KEY, challenges);

      toast({
        title: 'Челлендж принят!',
        description: 'Вы приняли вызов. Удачи в достижении цели!',
        variant: 'default'
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept challenge';
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, []);

  // Decline challenge
  const declineChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    try {
      const challenges = getFromLocalStorage(CHALLENGES_STORAGE_KEY, []);
      const challengeIndex = challenges.findIndex((c: AchievementChallenge) => c.id === challengeId);
      
      if (challengeIndex === -1) {
        throw new Error('Challenge not found');
      }

      challenges[challengeIndex].status = 'declined';
      saveToLocalStorage(CHALLENGES_STORAGE_KEY, challenges);

      toast({
        title: 'Челлендж отклонен',
        description: 'Вы отклонили вызов',
        variant: 'default'
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decline challenge';
      toast({
        title: 'Ошибка',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, []);

  // Get user challenges
  const getUserChallenges = useCallback(async (userId: string): Promise<AchievementChallenge[]> => {
    try {
      const challenges = getFromLocalStorage(CHALLENGES_STORAGE_KEY, []);
      return challenges.filter((c: AchievementChallenge) => 
        c.fromUserId === userId || c.toUserId === userId
      );
    } catch (err) {
      console.warn('Failed to get user challenges:', err);
      return [];
    }
  }, []);

  // Share comparison
  const shareComparison = useCallback(async (
    user1Id: string, 
    user2Id: string, 
    platformData?: any
  ): Promise<boolean> => {
    if (!enableSharing) {
      toast({
        title: 'Шаринг отключен',
        description: 'Функция обмена недоступна',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const comparisonData = {
        id: `comparison_${Date.now()}`,
        user1Id,
        user2Id,
        createdAt: new Date(),
        platformData
      };

      // Store sharing data locally
      const existingShares = getFromLocalStorage(SHARED_COMPARISONS_KEY, []);
      existingShares.push(comparisonData);
      saveToLocalStorage(SHARED_COMPARISONS_KEY, existingShares);

      // In a real app, this would also generate a shareable link or post to social media
      const shareUrl = generateComparisonUrl(user1Id, user2Id);
      
      // Try to use Web Share API if available
      if (navigator.share && platformData?.useWebShare) {
        await navigator.share({
          title: 'Сравнение достижений в рыбалке',
          text: 'Посмотрите на наши достижения в рыболовстве!',
          url: shareUrl
        });
      } else {
        // Fallback to copying URL
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: 'Ссылка скопирована!',
          description: 'Ссылка на сравнение скопирована в буфер обмена',
          variant: 'default'
        });
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share comparison';
      toast({
        title: 'Ошибка обмена',
        description: errorMessage,
        variant: 'destructive'
      });
      return false;
    }
  }, [enableSharing]);

  // Generate comparison URL
  const generateComparisonUrl = useCallback((user1Id: string, user2Id: string): string => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/achievements/compare?user1=${user1Id}&user2=${user2Id}`;
  }, []);

  // Calculate comparison statistics
  const calculateComparisonStats = useCallback((
    user1: UserAchievementProfile, 
    user2: UserAchievementProfile
  ) => {
    const user1Wins = user1.achievements.filter(a1 => {
      const user2Achievement = user2.achievements.find(a2 => a2.id === a1.id);
      return a1.unlocked && (!user2Achievement || !user2Achievement.unlocked);
    }).length;

    const user2Wins = user2.achievements.filter(a2 => {
      const user1Achievement = user1.achievements.find(a1 => a1.id === a2.id);
      return a2.unlocked && (!user1Achievement || !user1Achievement.unlocked);
    }).length;

    const tied = user1.achievements.filter(a1 => {
      const user2Achievement = user2.achievements.find(a2 => a2.id === a1.id);
      return user2Achievement && a1.unlocked === user2Achievement.unlocked;
    }).length;

    const progressDiff = user1.progressPercent - user2.progressPercent;
    const levelDiff = user1.level - user2.level;
    
    return {
      user1Wins,
      user2Wins,
      tied,
      progressDiff,
      levelDiff,
      totalComparisons: user1Wins + user2Wins + tied,
      winner: progressDiff > 0 ? user1 : progressDiff < 0 ? user2 : null
    };
  }, []);

  // Generate personalized recommendations
  const generateRecommendations = useCallback((
    user: UserAchievementProfile, 
    comparedUser: UserAchievementProfile
  ) => {
    const recommendations = [];

    // Easy wins - achievements close to completion
    const easyWins = user.achievements
      .filter(a => !a.unlocked && a.progress > a.maxProgress * 0.7)
      .slice(0, 5)
      .map(a => ({
        type: 'easy-win',
        achievement: a,
        reason: `Осталось всего ${a.maxProgress - a.progress} шагов до завершения`,
        priority: 'high'
      }));

    recommendations.push(...easyWins);

    // Catch up recommendations - achievements the other user has
    const catchUp = comparedUser.achievements
      .filter(ca => {
        const userAchievement = user.achievements.find(ua => ua.id === ca.id);
        return ca.unlocked && (!userAchievement || !userAchievement.unlocked);
      })
      .slice(0, 3)
      .map(a => ({
        type: 'catch-up',
        achievement: a,
        reason: `У ${comparedUser.name} есть это достижение`,
        priority: 'medium'
      }));

    recommendations.push(...catchUp);

    // Category development - areas where user is lagging
    const categoryRecommendations = Object.entries(['FISH_SPECIES', 'TECHNIQUE', 'SOCIAL', 'GEOGRAPHY'])
      .map(([category]) => {
        const userCategoryAchievements = user.achievements.filter(a => a.category === category);
        const comparedUserCategoryAchievements = comparedUser.achievements.filter(a => a.category === category);
        
        const userProgress = userCategoryAchievements.length > 0 
          ? (userCategoryAchievements.filter(a => a.unlocked).length / userCategoryAchievements.length) * 100 
          : 0;
        const comparedUserProgress = comparedUserCategoryAchievements.length > 0
          ? (comparedUserCategoryAchievements.filter(a => a.unlocked).length / comparedUserCategoryAchievements.length) * 100
          : 0;
        
        if (comparedUserProgress > userProgress && userProgress < 80) {
          return {
            type: 'category-focus',
            category,
            gap: comparedUserProgress - userProgress,
            reason: `Развитие категории ${category.toLowerCase()}`,
            priority: 'low'
          };
        }
        return null;
      })
      .filter(Boolean);

    recommendations.push(...categoryRecommendations);

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        // This could trigger a refresh of comparison data
        // For now, it's just a placeholder
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  return {
    // User profiles
    loadUserProfile,
    isLoading,
    error,
    
    // Challenges
    sendChallenge,
    acceptChallenge,
    declineChallenge,
    getUserChallenges,
    
    // Sharing
    shareComparison,
    generateComparisonUrl,
    
    // Utilities
    calculateComparisonStats,
    generateRecommendations
  };
}
