/**
 * Achievement Data Hook - Integration with achievements API
 * Part of Task 9.1: Achievement Category Grid System
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// Types
interface Achievement {
  id: string
  type: string
  name: string
  description: string
  icon: string
  category: BadgeCategory
  rarity: AchievementRarity
  maxProgress: number
  progressStep: number
  lockedVisible: boolean
  lockedDescVisible: boolean
  isActive: boolean
  unlocked: boolean
  progress: number
  progressPercent: number
  unlockedAt?: Date
}

type BadgeCategory = 
  | 'ACHIEVEMENT' 
  | 'MILESTONE' 
  | 'SPECIAL' 
  | 'SEASONAL'
  | 'FISH_SPECIES' 
  | 'TECHNIQUE' 
  | 'SOCIAL' 
  | 'GEOGRAPHY'

type AchievementRarity = 
  | 'COMMON' 
  | 'UNCOMMON' 
  | 'RARE' 
  | 'EPIC' 
  | 'LEGENDARY' 
  | 'MYTHIC'

interface AchievementStats {
  total: number
  unlocked: number
  progress: number
}

interface FetchUserAchievementsResponse {
  achievements: Achievement[]
  stats: AchievementStats
}

interface UseAchievementsOptions {
  category?: BadgeCategory
  unlockedOnly?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAchievementsReturn {
  achievements: Achievement[]
  stats: AchievementStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateProgress: (achievementType: string, progress: number) => Promise<boolean>
  incrementProgress: (achievementType: string, increment?: number) => Promise<boolean>
}

export function useAchievements(
  userId: string,
  options: UseAchievementsOptions = {}
): UseAchievementsReturn {
  const {
    category,
    unlockedOnly = false,
    autoRefresh = false,
    refreshInterval = 30000
  } = options

  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [stats, setStats] = useState<AchievementStats>({ total: 0, unlocked: 0, progress: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch achievements from API
  const fetchAchievements = useCallback(async () => {
    if (!userId) {
      setError('User ID is required')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        userId,
        unlockedOnly: unlockedOnly.toString()
      })

      if (category) {
        params.append('category', category)
      }

      const response = await fetch(`/api/achievements?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch achievements: ${response.statusText}`)
      }

      const data: FetchUserAchievementsResponse = await response.json()
      
      setAchievements(data.achievements || [])
      setStats(data.stats || { total: 0, unlocked: 0, progress: 0 })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching achievements:', err)
      toast.error('Не удалось загрузить достижения')
    } finally {
      setLoading(false)
    }
  }, [userId, category, unlockedOnly])

  // Update achievement progress
  const updateProgress = useCallback(async (
    achievementType: string, 
    progress: number
  ): Promise<boolean> => {
    if (!userId) {
      toast.error('User ID is required')
      return false
    }

    try {
      const response = await fetch('/api/achievements/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          achievementType,
          progress
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update achievement progress')
      }

      if (data.success) {
        // Update local state
        setAchievements(prev => prev.map(achievement => {
          if (achievement.type === achievementType) {
            return {
              ...achievement,
              progress: data.achievement.progress,
              progressPercent: data.achievement.progressPercent,
              unlocked: data.achievement.unlocked,
              unlockedAt: data.achievement.unlockedAt ? new Date(data.achievement.unlockedAt) : undefined
            }
          }
          return achievement
        }))

        // Update stats if achievement was unlocked
        if (data.achievement.unlocked) {
          setStats(prev => ({
            ...prev,
            unlocked: prev.unlocked + 1,
            progress: Math.round(((prev.unlocked + 1) / prev.total) * 100)
          }))
          
          toast.success(`🏆 Достижение "${data.achievement.name}" получено!`, {
            description: data.achievement.description,
            duration: 5000
          })
        }

        return true
      }

      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error updating achievement progress:', err)
      toast.error(`Ошибка обновления прогресса: ${errorMessage}`)
      return false
    }
  }, [userId])

  // Increment achievement progress
  const incrementProgress = useCallback(async (
    achievementType: string, 
    increment: number = 1
  ): Promise<boolean> => {
    if (!userId) {
      toast.error('User ID is required')
      return false
    }

    try {
      const response = await fetch('/api/achievements/progress', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          achievementType,
          increment
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to increment achievement progress')
      }

      if (data.success) {
        // Update local state
        setAchievements(prev => prev.map(achievement => {
          if (achievement.type === achievementType) {
            return {
              ...achievement,
              progress: data.achievement.progress,
              progressPercent: data.achievement.progressPercent,
              unlocked: data.achievement.unlocked,
              unlockedAt: data.achievement.unlockedAt ? new Date(data.achievement.unlockedAt) : undefined
            }
          }
          return achievement
        }))

        // Update stats if achievement was unlocked
        if (data.achievement.unlocked) {
          setStats(prev => ({
            ...prev,
            unlocked: prev.unlocked + 1,
            progress: Math.round(((prev.unlocked + 1) / prev.total) * 100)
          }))
          
          // Show achievement unlock notification
          toast.success(`🏆 Достижение "${data.achievement.name}" получено!`, {
            description: data.achievement.description,
            duration: 5000
          })
        } else if (increment > 0) {
          // Show progress notification for meaningful increments
          toast.success(`📈 Прогресс в достижении обновлен (+${increment})`)
        }

        return true
      }

      return false
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error incrementing achievement progress:', err)
      toast.error(`Ошибка увеличения прогресса: ${errorMessage}`)
      return false
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    fetchAchievements()
  }, [fetchAchievements])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchAchievements, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchAchievements])

  return {
    achievements,
    stats,
    loading,
    error,
    refetch: fetchAchievements,
    updateProgress,
    incrementProgress
  }
}

// Additional helper hooks

/**
 * Hook for getting achievements by category
 */
export function useAchievementsByCategory(userId: string, category: BadgeCategory) {
  return useAchievements(userId, { category })
}

/**
 * Hook for getting only unlocked achievements
 */
export function useUnlockedAchievements(userId: string) {
  return useAchievements(userId, { unlockedOnly: true })
}

/**
 * Hook for real-time achievement tracking
 */
export function useRealtimeAchievements(userId: string) {
  return useAchievements(userId, { autoRefresh: true, refreshInterval: 15000 })
}

/**
 * Helper function to get achievement icon by type
 */
export function getAchievementIcon(achievementType: string): string {
  const iconMap: Record<string, string> = {
    // Fish species
    'TUNA_MASTER': '🐟',
    'DORADO_HUNTER': '🐠', 
    'SEABASS_EXPERT': '🐟',
    'MARLIN_LEGEND': '🦈',
    'SPECIES_COLLECTOR': '🐠',
    
    // Techniques
    'TROLLING_EXPERT': '🎣',
    'JIGGING_MASTER': '🪝',
    'BOTTOM_FISHING_PRO': '⚓',
    'FLY_FISHING_ARTIST': '🎣',
    'TECHNIQUE_VERSATILE': '🛠️',
    
    // Social
    'NEWBIE_MENTOR': '👨‍🏫',
    'GROUP_ORGANIZER': '👥',
    'COMMUNITY_BUILDER': '🏘️',
    'REVIEW_MASTER': '⭐',
    'RELIABLE_FISHER': '💯',
    
    // Geography  
    'REEF_EXPLORER': '🏝️',
    'DEEP_SEA_ADVENTURER': '🌊',
    'COASTAL_SPECIALIST': '🏖️',
    'WORLD_TRAVELER': '🌍',
    'LOCAL_EXPERT': '📍'
  }

  return iconMap[achievementType] || '🏆'
}

/**
 * Helper function to get category-specific tips
 */
export function getCategoryTips(category: BadgeCategory): string[] {
  const tipsMap: Record<BadgeCategory, string[]> = {
    FISH_SPECIES: [
      'Изучайте повадки разных видов рыб',
      'Используйте подходящие приманки для каждого вида',
      'Рыбачьте в разное время суток'
    ],
    TECHNIQUE: [
      'Практикуйте новые техники рыбалки', 
      'Учитесь у опытных рыболовов',
      'Экспериментируйте с разным снаряжением'
    ],
    SOCIAL: [
      'Помогайте новичкам в сообществе',
      'Делитесь опытом и знаниями',
      'Участвуйте в групповых мероприятиях'
    ],
    GEOGRAPHY: [
      'Исследуйте новые места для рыбалки',
      'Изучайте карты и батиметрию',
      'Делитесь информацией о локациях'
    ],
    ACHIEVEMENT: [
      'Регулярно участвуйте в рыбалке',
      'Ставьте перед собой новые цели',
      'Отмечайте свои успехи'
    ],
    MILESTONE: [
      'Ведите учет своих достижений',
      'Празднуйте важные вехи',
      'Делитесь успехами с друзьями'
    ],
    SPECIAL: [
      'Участвуйте в особых событиях',
      'Ищите уникальные возможности',
      'Будьте активным в сообществе'
    ],
    SEASONAL: [
      'Следите за сезонными событиями',
      'Планируйте рыбалку по сезонам',
      'Участвуйте в тематических мероприятиях'
    ]
  }

  return tipsMap[category] || []
}
