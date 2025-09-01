/**
 * Badge Management Hook - Integration with badge API and collection management
 * Part of Task 10: Badge System & Collection UI
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Badge types based on Prisma schema
export interface Badge {
  id: string
  profileId: string
  name: string
  description?: string
  icon: string
  category: BadgeCategory
  rarity: BadgeRarity
  requiredValue?: number
  earnedAt: string
}

export type BadgeCategory = 'ACHIEVEMENT' | 'MILESTONE' | 'SPECIAL' | 'SEASONAL'

export type BadgeRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'

export interface BadgeStats {
  total: number
  byCategory: Record<BadgeCategory, number>
  byRarity: Record<BadgeRarity, number>
  recentlyEarned: Badge[]
  nextToEarn: Badge[]
  completionRate: number
}

export interface BadgeFilters {
  category?: BadgeCategory
  rarity?: BadgeRarity
  earned?: boolean
  search?: string
}

// Badge configuration for UI display
export const BADGE_RARITY_CONFIG = {
  COMMON: {
    color: '#10b981',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500',
    textColor: 'text-green-600',
    label: 'Common',
    glow: 'drop-shadow-md',
    order: 1
  },
  UNCOMMON: {
    color: '#3b82f6',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-600',
    label: 'Uncommon',
    glow: 'drop-shadow-lg',
    order: 2
  },
  RARE: {
    color: '#8b5cf6',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-600',
    label: 'Rare',
    glow: 'drop-shadow-lg',
    order: 3
  },
  EPIC: {
    color: '#f59e0b',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-600',
    label: 'Epic',
    glow: 'drop-shadow-xl',
    order: 4
  },
  LEGENDARY: {
    color: '#ef4444',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    textColor: 'text-red-600',
    label: 'Legendary',
    glow: 'drop-shadow-2xl',
    order: 5
  },
  MYTHIC: {
    color: '#ec4899',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500',
    textColor: 'text-pink-600',
    label: 'Mythic',
    glow: 'drop-shadow-2xl',
    order: 6
  }
}

export const BADGE_CATEGORY_CONFIG = {
  ACHIEVEMENT: {
    icon: '🏆',
    label: 'Achievement',
    color: 'text-yellow-600',
    description: 'General achievements and accomplishments'
  },
  MILESTONE: {
    icon: '🎯',
    label: 'Milestone',
    color: 'text-blue-600', 
    description: 'Important milestones and progress markers'
  },
  SPECIAL: {
    icon: '⭐',
    label: 'Special',
    color: 'text-purple-600',
    description: 'Unique and special recognition badges'
  },
  SEASONAL: {
    icon: '🌟',
    label: 'Seasonal',
    color: 'text-green-600',
    description: 'Limited-time seasonal badges and events'
  }
}

// Mock data for development/testing
const MOCK_BADGES: Badge[] = [
  {
    id: '1',
    profileId: 'profile1',
    name: 'First Catch',
    description: 'Caught your very first fish!',
    icon: '🎣',
    category: 'MILESTONE',
    rarity: 'COMMON',
    earnedAt: '2024-08-10T10:00:00Z'
  },
  {
    id: '2', 
    profileId: 'profile1',
    name: 'Species Explorer',
    description: 'Caught 5 different fish species',
    icon: '🐠',
    category: 'ACHIEVEMENT',
    rarity: 'UNCOMMON',
    requiredValue: 5,
    earnedAt: '2024-08-15T14:30:00Z'
  },
  {
    id: '3',
    profileId: 'profile1',
    name: 'Deep Sea Master',
    description: 'Completed 10 deep sea fishing trips',
    icon: '🌊',
    category: 'ACHIEVEMENT',
    rarity: 'RARE',
    requiredValue: 10,
    earnedAt: '2024-08-20T09:15:00Z'
  },
  {
    id: '4',
    profileId: 'profile1',
    name: 'Social Fisher',
    description: 'Organized 5 group fishing events',
    icon: '👥',
    category: 'SPECIAL',
    rarity: 'EPIC',
    requiredValue: 5,
    earnedAt: '2024-08-25T16:45:00Z'
  },
  {
    id: '5',
    profileId: 'profile1',
    name: 'Master Angler',
    description: 'Achieved ultimate mastery in fishing',
    icon: '👑',
    category: 'SPECIAL',
    rarity: 'LEGENDARY',
    earnedAt: '2024-08-30T12:00:00Z'
  },
  {
    id: '6',
    profileId: 'profile1',
    name: 'Ocean Guardian',
    description: 'Protected marine life and achieved perfect conservation score',
    icon: '🌟',
    category: 'SPECIAL',
    rarity: 'MYTHIC',
    earnedAt: '2024-09-01T20:30:00Z'
  },
  // Not earned badges (for demo)
  {
    id: '7',
    profileId: 'profile1',
    name: 'Night Fisher',
    description: 'Complete 5 night fishing expeditions',
    icon: '🌙',
    category: 'ACHIEVEMENT',
    rarity: 'RARE',
    requiredValue: 5,
    earnedAt: '' // Not earned yet
  },
  {
    id: '8',
    profileId: 'profile1',
    name: 'Tournament Winner',
    description: 'Win a fishing tournament',
    icon: '🏅',
    category: 'SPECIAL',
    rarity: 'EPIC',
    earnedAt: '' // Not earned yet
  }
]

/**
 * Main badge management hook
 */
export function useBadges(userId?: string, filters: BadgeFilters = {}) {
  const { data: session } = useSession()
  const [badges, setBadges] = useState<Badge[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch badges from API
  const fetchBadges = useCallback(async () => {
    if (!session?.user && !userId) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      const targetUserId = userId || session?.user?.id
      
      if (targetUserId) params.append('userId', targetUserId)
      if (filters.category) params.append('category', filters.category)

      console.log('🔍 Fetching badges:', targetUserId, filters)

      const response = await fetch(`/api/badges?${params.toString()}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch badges')
      }

      if (result.success && result.data) {
        setBadges(result.data)
        console.log('✅ Badges fetched:', result.data.length)
      } else {
        // Fallback to mock data for demo
        console.log('📝 Using mock badge data for demo')
        setBadges(MOCK_BADGES)
      }
    } catch (err) {
      console.error('❌ Error fetching badges:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch badges')
      // Fallback to mock data for demo
      setBadges(MOCK_BADGES)
    } finally {
      setIsLoading(false)
    }
  }, [session, userId, filters.category])

  // Fetch badges on mount and when dependencies change
  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  // Filter badges based on filters
  const filteredBadges = badges.filter(badge => {
    if (filters.category && badge.category !== filters.category) return false
    if (filters.rarity && badge.rarity !== filters.rarity) return false
    if (filters.earned !== undefined) {
      const isEarned = !!badge.earnedAt && badge.earnedAt !== ''
      if (filters.earned !== isEarned) return false
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      return badge.name.toLowerCase().includes(searchTerm) ||
             badge.description?.toLowerCase().includes(searchTerm)
    }
    return true
  })

  // Calculate badge statistics
  const stats: BadgeStats = {
    total: badges.length,
    byCategory: {
      ACHIEVEMENT: badges.filter(b => b.category === 'ACHIEVEMENT').length,
      MILESTONE: badges.filter(b => b.category === 'MILESTONE').length,
      SPECIAL: badges.filter(b => b.category === 'SPECIAL').length,
      SEASONAL: badges.filter(b => b.category === 'SEASONAL').length
    },
    byRarity: {
      COMMON: badges.filter(b => b.rarity === 'COMMON').length,
      UNCOMMON: badges.filter(b => b.rarity === 'UNCOMMON').length,
      RARE: badges.filter(b => b.rarity === 'RARE').length,
      EPIC: badges.filter(b => b.rarity === 'EPIC').length,
      LEGENDARY: badges.filter(b => b.rarity === 'LEGENDARY').length,
      MYTHIC: badges.filter(b => b.rarity === 'MYTHIC').length
    },
    recentlyEarned: badges
      .filter(b => b.earnedAt && b.earnedAt !== '')
      .sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime())
      .slice(0, 5),
    nextToEarn: badges
      .filter(b => !b.earnedAt || b.earnedAt === '')
      .slice(0, 3),
    completionRate: badges.length > 0 
      ? (badges.filter(b => b.earnedAt && b.earnedAt !== '').length / badges.length) * 100
      : 0
  }

  // Award badge (for notifications/testing)
  const awardBadge = useCallback(async (badgeId: string) => {
    try {
      // In a real implementation, this would call the API to award the badge
      // For now, we'll just simulate it with local state update
      setBadges(prev => prev.map(badge => 
        badge.id === badgeId 
          ? { ...badge, earnedAt: new Date().toISOString() }
          : badge
      ))
      
      const badge = badges.find(b => b.id === badgeId)
      if (badge) {
        toast.success(`🏆 Badge Earned: ${badge.name}!`, {
          description: badge.description,
          duration: 5000
        })
      }
      
      return true
    } catch (err) {
      console.error('❌ Error awarding badge:', err)
      setError(err instanceof Error ? err.message : 'Failed to award badge')
      return false
    }
  }, [badges])

  // Get badge by ID
  const getBadgeById = useCallback((badgeId: string) => {
    return badges.find(badge => badge.id === badgeId)
  }, [badges])

  // Get earned badges
  const earnedBadges = badges.filter(badge => badge.earnedAt && badge.earnedAt !== '')
  
  // Get not earned badges
  const notEarnedBadges = badges.filter(badge => !badge.earnedAt || badge.earnedAt === '')

  // Get badges by category
  const getBadgesByCategory = useCallback((category: BadgeCategory) => {
    return badges.filter(badge => badge.category === category)
  }, [badges])

  // Get badges by rarity
  const getBadgesByRarity = useCallback((rarity: BadgeRarity) => {
    return badges.filter(badge => badge.rarity === rarity)
  }, [badges])

  return {
    badges: filteredBadges,
    allBadges: badges,
    earnedBadges,
    notEarnedBadges,
    stats,
    isLoading,
    error,
    fetchBadges,
    awardBadge,
    getBadgeById,
    getBadgesByCategory,
    getBadgesByRarity
  }
}

// Utility functions
export function getBadgeRarityConfig(rarity: BadgeRarity) {
  return BADGE_RARITY_CONFIG[rarity]
}

export function getBadgeCategoryConfig(category: BadgeCategory) {
  return BADGE_CATEGORY_CONFIG[category]
}

export function formatBadgeDate(dateString: string): string {
  if (!dateString) return 'Not earned'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid date'
  }
}

export function getBadgeProgress(badge: Badge, currentValue: number): number {
  if (!badge.requiredValue) return badge.earnedAt ? 100 : 0
  return Math.min(100, (currentValue / badge.requiredValue) * 100)
}

export default useBadges
