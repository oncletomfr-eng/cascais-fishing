/**
 * Achievement Recommendation System - Intelligent recommendations for next achievable goals
 * Part of Task 9.4: Achievement Recommendation System
 */

'use client'

import { useMemo, useCallback, useEffect, useState } from 'react'
// Re-define types locally to avoid import issues
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: string
  progress: number
  maxProgress: number
  unlocked: boolean
  unlockedAt?: Date
}

// Enhanced recommendation types
export interface AchievementRecommendation {
  achievement: Achievement
  score: number
  reasons: string[]
  difficulty: DifficultyLevel
  estimatedTime: string
  prerequisites: Achievement[]
  tips: string[]
  category: AchievementCategory
  priority: 'high' | 'medium' | 'low'
  completionPath: CompletionStep[]
}

export interface CompletionStep {
  id: string
  title: string
  description: string
  completed: boolean
  order: number
  estimatedDuration: string
}

export interface DifficultyAssessment {
  level: DifficultyLevel
  factors: DifficultyFactor[]
  timeEstimate: string
  requiredSkills: string[]
}

export interface DifficultyFactor {
  name: string
  weight: number
  description: string
}

export type DifficultyLevel = 'beginner' | 'easy' | 'medium' | 'hard' | 'expert' | 'legendary'

export type AchievementCategory = 
  | 'FISH_SPECIES'
  | 'TECHNIQUE' 
  | 'SOCIAL'
  | 'GEOGRAPHY'
  | 'ACHIEVEMENT'
  | 'MILESTONE'
  | 'SPECIAL'
  | 'SEASONAL'

export interface RecommendationConfig {
  maxRecommendations: number
  includeCompleted: boolean
  focusOnCategory?: AchievementCategory
  difficultyPreference?: DifficultyLevel
  timeAvailable?: 'short' | 'medium' | 'long'
  personalityType?: 'explorer' | 'achiever' | 'socializer' | 'competitor'
}

export interface UserProfile {
  completedAchievements: Achievement[]
  favoriteCategories: AchievementCategory[]
  averageCompletionTime: number
  skillLevel: Record<AchievementCategory, number>
  preferences: {
    difficulty: DifficultyLevel
    timeCommitment: 'short' | 'medium' | 'long'
    focus: 'breadth' | 'depth'
    social: boolean
  }
  behaviorMetrics: {
    consistencyScore: number
    challengeSeeking: number
    socialEngagement: number
    completionRate: number
  }
}

// Default user profile for new users
export const DEFAULT_USER_PROFILE: UserProfile = {
  completedAchievements: [],
  favoriteCategories: ['MILESTONE'],
  averageCompletionTime: 30, // minutes
  skillLevel: {
    FISH_SPECIES: 1,
    TECHNIQUE: 1,
    SOCIAL: 1,
    GEOGRAPHY: 1,
    ACHIEVEMENT: 1,
    MILESTONE: 2,
    SPECIAL: 1,
    SEASONAL: 1
  },
  preferences: {
    difficulty: 'easy',
    timeCommitment: 'medium',
    focus: 'breadth',
    social: false
  },
  behaviorMetrics: {
    consistencyScore: 0.5,
    challengeSeeking: 0.3,
    socialEngagement: 0.2,
    completionRate: 0.6
  }
}

// Difficulty assessment weights
const DIFFICULTY_WEIGHTS = {
  progressRequired: 0.3,
  timeEstimate: 0.25,
  prerequisites: 0.2,
  rarity: 0.15,
  complexity: 0.1
}

// Recommendation algorithm weights  
const RECOMMENDATION_WEIGHTS = {
  achievability: 0.35,
  userInterest: 0.25,
  difficulty: 0.2,
  category: 0.15,
  social: 0.05
}

/**
 * Calculate difficulty assessment for an achievement
 */
function assessAchievementDifficulty(achievement: Achievement, userProfile: UserProfile): DifficultyAssessment {
  const factors: DifficultyFactor[] = []
  let totalScore = 0

  // Progress requirement factor
  const progressFactor = achievement.maxProgress / 10 // Normalize to 0-10 scale
  factors.push({
    name: 'Progress Required',
    weight: progressFactor,
    description: `Requires ${achievement.maxProgress} units of progress`
  })
  totalScore += progressFactor * DIFFICULTY_WEIGHTS.progressRequired

  // Rarity factor
  const rarityScores: Record<string, number> = {
    COMMON: 1,
    UNCOMMON: 2,
    RARE: 4,
    EPIC: 6,
    LEGENDARY: 8,
    MYTHIC: 10
  }
  const rarityFactor = rarityScores[achievement.rarity] || 3
  factors.push({
    name: 'Rarity',
    weight: rarityFactor,
    description: `${achievement.rarity} level achievement`
  })
  totalScore += rarityFactor * DIFFICULTY_WEIGHTS.rarity

  // Category skill level factor
  const skillLevel = userProfile.skillLevel[achievement.category as AchievementCategory] || 1
  const skillFactor = Math.max(1, 6 - skillLevel) // Inverse relationship
  factors.push({
    name: 'Skill Level',
    weight: skillFactor,
    description: `Based on your ${achievement.category} skill level (${skillLevel}/5)`
  })
  totalScore += skillFactor * DIFFICULTY_WEIGHTS.complexity

  // Determine difficulty level
  let level: DifficultyLevel = 'medium'
  let timeEstimate = '30-45 minutes'
  let requiredSkills: string[] = []

  if (totalScore <= 2) {
    level = 'beginner'
    timeEstimate = '10-15 minutes'
  } else if (totalScore <= 4) {
    level = 'easy'
    timeEstimate = '15-30 minutes'
  } else if (totalScore <= 6) {
    level = 'medium'
    timeEstimate = '30-60 minutes'
  } else if (totalScore <= 8) {
    level = 'hard'
    timeEstimate = '1-2 hours'
    requiredSkills = ['Experience', 'Patience']
  } else if (totalScore <= 9) {
    level = 'expert'
    timeEstimate = '2-4 hours'
    requiredSkills = ['Advanced Skills', 'Dedication']
  } else {
    level = 'legendary'
    timeEstimate = '4+ hours'
    requiredSkills = ['Master Level', 'Persistence', 'Community']
  }

  return {
    level,
    factors,
    timeEstimate,
    requiredSkills
  }
}

/**
 * Calculate recommendation score for an achievement
 */
function calculateRecommendationScore(
  achievement: Achievement,
  userProfile: UserProfile,
  difficulty: DifficultyAssessment
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0

  // Achievability score (can user complete this now?)
  const achievabilityScore = achievement.unlocked ? 0 : 
    (achievement.progress / achievement.maxProgress) * 5 + 
    (userProfile.skillLevel[achievement.category as AchievementCategory] || 1)
  
  score += achievabilityScore * RECOMMENDATION_WEIGHTS.achievability

  if (achievement.progress > 0) {
    reasons.push(`Already ${Math.round((achievement.progress / achievement.maxProgress) * 100)}% complete`)
  }

  // User interest score (based on favorite categories and past behavior)
  const categoryInterest = userProfile.favoriteCategories.includes(achievement.category as AchievementCategory) ? 2 : 1
  const interestScore = categoryInterest * userProfile.behaviorMetrics.completionRate * 5
  
  score += interestScore * RECOMMENDATION_WEIGHTS.userInterest

  if (categoryInterest > 1) {
    reasons.push(`Matches your favorite category: ${achievement.category}`)
  }

  // Difficulty alignment (prefer achievements matching user preference)
  const difficultyAlignment = difficulty.level === userProfile.preferences.difficulty ? 2 : 
    Math.abs(['beginner', 'easy', 'medium', 'hard', 'expert', 'legendary'].indexOf(difficulty.level) - 
              ['beginner', 'easy', 'medium', 'hard', 'expert', 'legendary'].indexOf(userProfile.preferences.difficulty)) <= 1 ? 1.5 : 1

  score += difficultyAlignment * RECOMMENDATION_WEIGHTS.difficulty * 2

  if (difficultyAlignment > 1.5) {
    reasons.push(`Perfect difficulty match for your ${userProfile.preferences.difficulty} preference`)
  }

  // Category diversification bonus
  const completedInCategory = userProfile.completedAchievements.filter(a => a.category === achievement.category).length
  const categoryBonus = completedInCategory === 0 ? 1.5 : Math.max(0.5, 1 - completedInCategory * 0.1)
  
  score += categoryBonus * RECOMMENDATION_WEIGHTS.category * 3

  if (completedInCategory === 0) {
    reasons.push(`New category to explore: ${achievement.category}`)
  }

  // Social factor
  const socialCategories = ['SOCIAL', 'MILESTONE']
  if (socialCategories.includes(achievement.category as AchievementCategory) && userProfile.preferences.social) {
    score += 1 * RECOMMENDATION_WEIGHTS.social * 5
    reasons.push('Social achievement matching your preferences')
  }

  return { score: Math.min(10, score), reasons }
}

/**
 * Generate completion path for an achievement
 */
function generateCompletionPath(achievement: Achievement, userProfile: UserProfile): CompletionStep[] {
  const steps: CompletionStep[] = []
  const progressNeeded = achievement.maxProgress - achievement.progress

  // Generate contextual steps based on achievement category and progress
  switch (achievement.category) {
    case 'FISH_SPECIES':
      const speciesNeeded = progressNeeded
      steps.push(
        {
          id: '1',
          title: 'Research Target Species',
          description: `Learn about the ${speciesNeeded} fish species you need to catch`,
          completed: false,
          order: 1,
          estimatedDuration: '15 minutes'
        },
        {
          id: '2', 
          title: 'Plan Fishing Locations',
          description: 'Identify the best spots and times for each species',
          completed: false,
          order: 2,
          estimatedDuration: '20 minutes'
        },
        {
          id: '3',
          title: 'Execute Fishing Trips',
          description: `Complete ${speciesNeeded} fishing trips targeting specific species`,
          completed: false,
          order: 3,
          estimatedDuration: '2-4 hours'
        }
      )
      break

    case 'TECHNIQUE':
      steps.push(
        {
          id: '1',
          title: 'Learn New Techniques',
          description: 'Study and practice the required fishing techniques',
          completed: false,
          order: 1,
          estimatedDuration: '30 minutes'
        },
        {
          id: '2',
          title: 'Practice Sessions',
          description: 'Apply techniques in practice sessions or guided trips',
          completed: false,
          order: 2,
          estimatedDuration: '1-2 hours'
        }
      )
      break

    case 'SOCIAL':
      steps.push(
        {
          id: '1',
          title: 'Join Community',
          description: 'Connect with other fishing enthusiasts in the platform',
          completed: false,
          order: 1,
          estimatedDuration: '10 minutes'
        },
        {
          id: '2',
          title: 'Organize or Join Events',
          description: `Participate in ${progressNeeded} social fishing activities`,
          completed: false,
          order: 2,
          estimatedDuration: '2-3 hours'
        }
      )
      break

    default:
      steps.push(
        {
          id: '1',
          title: 'Review Requirements',
          description: `Understand what's needed to complete ${achievement.name}`,
          completed: false,
          order: 1,
          estimatedDuration: '5 minutes'
        },
        {
          id: '2',
          title: 'Take Action',
          description: `Work towards completing ${progressNeeded} more units of progress`,
          completed: false,
          order: 2,
          estimatedDuration: '30-60 minutes'
        }
      )
  }

  return steps
}

/**
 * Generate achievement tips based on category and difficulty
 */
function generateAchievementTips(achievement: Achievement, difficulty: DifficultyAssessment): string[] {
  const tips: string[] = []

  // General tips based on difficulty
  switch (difficulty.level) {
    case 'beginner':
    case 'easy':
      tips.push('Perfect for getting started!', 'Take your time and enjoy the process')
      break
    case 'medium':
      tips.push('Plan your approach carefully', 'Consider doing this with friends for more fun')
      break
    case 'hard':
    case 'expert':
      tips.push('This is challenging - prepare thoroughly', 'Break it down into smaller goals')
      break
    case 'legendary':
      tips.push('Ultimate challenge - requires dedication', 'Join a community for support and tips')
      break
  }

  // Category-specific tips
  switch (achievement.category) {
    case 'FISH_SPECIES':
      tips.push('Research the best seasons and locations', 'Use appropriate bait and techniques for each species')
      break
    case 'TECHNIQUE':
      tips.push('Watch tutorial videos first', 'Practice makes perfect')
      break
    case 'SOCIAL':
      tips.push('Join group events to meet people', 'Share your experiences with others')
      break
    case 'GEOGRAPHY':
      tips.push('Plan your travels in advance', 'Document your locations with photos')
      break
    case 'SEASONAL':
      tips.push('Check the calendar for optimal timing', 'Seasonal achievements have limited windows')
      break
  }

  // Rarity-specific tips
  if (achievement.rarity === 'LEGENDARY' || achievement.rarity === 'MYTHIC') {
    tips.push('This rare achievement shows true mastery', 'The reward will be worth the effort!')
  }

  return tips.slice(0, 4) // Limit to 4 tips
}

/**
 * Main hook for achievement recommendations
 */
export function useAchievementRecommendations(
  achievements: Achievement[],
  userProfile: UserProfile = DEFAULT_USER_PROFILE,
  config: RecommendationConfig = { maxRecommendations: 6, includeCompleted: false }
) {
  const [isLoading, setIsLoading] = useState(false)

  const recommendations = useMemo(() => {
    if (!achievements.length) return []

    setIsLoading(true)

    // Filter achievements based on config
    let filteredAchievements = achievements.filter(achievement => {
      if (!config.includeCompleted && achievement.unlocked) return false
      if (config.focusOnCategory && achievement.category !== config.focusOnCategory) return false
      return true
    })

    // Generate recommendations with scoring
    const scoredRecommendations = filteredAchievements.map(achievement => {
      const difficulty = assessAchievementDifficulty(achievement, userProfile)
      const { score, reasons } = calculateRecommendationScore(achievement, userProfile, difficulty)
      const completionPath = generateCompletionPath(achievement, userProfile)
      const tips = generateAchievementTips(achievement, difficulty)

      // Determine priority
      let priority: 'high' | 'medium' | 'low' = 'medium'
      if (score >= 8) priority = 'high'
      else if (score <= 4) priority = 'low'

      const recommendation: AchievementRecommendation = {
        achievement,
        score,
        reasons,
        difficulty: difficulty.level,
        estimatedTime: difficulty.timeEstimate,
        prerequisites: [], // TODO: Implement prerequisite detection
        tips,
        category: achievement.category as AchievementCategory,
        priority,
        completionPath
      }

      return recommendation
    })

    // Sort by score (highest first) and apply limits
    const sortedRecommendations = scoredRecommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, config.maxRecommendations)

    setTimeout(() => setIsLoading(false), 100)

    return sortedRecommendations
  }, [achievements, userProfile, config])

  const getRecommendationsByPriority = useCallback((priority: 'high' | 'medium' | 'low') => {
    return recommendations.filter(rec => rec.priority === priority)
  }, [recommendations])

  const getRecommendationsByCategory = useCallback((category: AchievementCategory) => {
    return recommendations.filter(rec => rec.category === category)
  }, [recommendations])

  const getRecommendationsByDifficulty = useCallback((difficulty: DifficultyLevel) => {
    return recommendations.filter(rec => rec.difficulty === difficulty)
  }, [recommendations])

  return {
    recommendations,
    isLoading,
    getRecommendationsByPriority,
    getRecommendationsByCategory,
    getRecommendationsByDifficulty,
    totalRecommendations: recommendations.length
  }
}

// Utility function to update user profile based on completed achievements
export function updateUserProfile(
  currentProfile: UserProfile,
  newCompletedAchievement: Achievement
): UserProfile {
  const updatedProfile = { ...currentProfile }
  
  // Add to completed achievements
  updatedProfile.completedAchievements = [
    ...currentProfile.completedAchievements,
    newCompletedAchievement
  ]

  // Update skill level for the category
  const category = newCompletedAchievement.category as AchievementCategory
  updatedProfile.skillLevel[category] = Math.min(5, updatedProfile.skillLevel[category] + 0.2)

  // Update favorite categories based on completion patterns
  const categoryCompletions = updatedProfile.completedAchievements.filter(a => a.category === category).length
  if (categoryCompletions >= 3 && !updatedProfile.favoriteCategories.includes(category)) {
    updatedProfile.favoriteCategories.push(category)
  }

  // Update behavior metrics
  const totalAchievements = updatedProfile.completedAchievements.length
  updatedProfile.behaviorMetrics.completionRate = Math.min(1, totalAchievements * 0.05)
  
  if (newCompletedAchievement.rarity === 'LEGENDARY' || newCompletedAchievement.rarity === 'MYTHIC') {
    updatedProfile.behaviorMetrics.challengeSeeking += 0.1
  }

  if (newCompletedAchievement.category === 'SOCIAL') {
    updatedProfile.behaviorMetrics.socialEngagement += 0.1
  }

  return updatedProfile
}

export default useAchievementRecommendations
