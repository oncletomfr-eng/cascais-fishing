/**
 * Achievement Grid System - Main container for displaying categorized achievements
 * Part of Task 9.1: Achievement Category Grid System
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Fish, Target, Users, MapPin, Calendar,
  Star, Sparkles, Search, Filter, ChevronDown,
  Award, Medal, Crown, Zap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'

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

interface CategoryStats {
  total: number
  unlocked: number
  progress: number
}

interface AchievementGridProps {
  userId: string
  achievements?: Achievement[]
  loading?: boolean
  onAchievementClick?: (achievement: Achievement) => void
  showSearch?: boolean
  showFilter?: boolean
  compact?: boolean
}

// Category configuration
const CATEGORY_CONFIG = {
  FISH_SPECIES: {
    label: 'Виды рыб',
    icon: Fish,
    description: 'Достижения за ловлю различных видов рыб',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  TECHNIQUE: {
    label: 'Техники',
    icon: Target,
    description: 'Мастерство в различных техниках рыбалки', 
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  SOCIAL: {
    label: 'Социальные',
    icon: Users,
    description: 'Достижения в сообществе и взаимодействии',
    color: 'bg-purple-500', 
    lightColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  GEOGRAPHY: {
    label: 'География',
    icon: MapPin,
    description: 'Исследование различных локаций для рыбалки',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50', 
    borderColor: 'border-orange-200'
  },
  ACHIEVEMENT: {
    label: 'Общие',
    icon: Trophy,
    description: 'Основные достижения рыболова',
    color: 'bg-yellow-500',
    lightColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200'
  },
  MILESTONE: {
    label: 'Этапы',
    icon: Medal,
    description: 'Важные вехи в развитии рыболова',
    color: 'bg-indigo-500',
    lightColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  SPECIAL: {
    label: 'Особые',
    icon: Crown,
    description: 'Уникальные и редкие достижения',
    color: 'bg-pink-500',
    lightColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  SEASONAL: {
    label: 'Сезонные',
    icon: Calendar,
    description: 'Сезонные события и временные достижения',
    color: 'bg-teal-500',
    lightColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  }
} as const

// Rarity configuration
const RARITY_CONFIG = {
  COMMON: { 
    label: 'Обычное', 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-100',
    icon: Star
  },
  UNCOMMON: { 
    label: 'Необычное', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100',
    icon: Star
  },
  RARE: { 
    label: 'Редкое', 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100',
    icon: Sparkles
  },
  EPIC: { 
    label: 'Эпическое', 
    color: 'text-purple-600', 
    bgColor: 'bg-purple-100',
    icon: Award
  },
  LEGENDARY: { 
    label: 'Легендарное', 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-100',
    icon: Crown
  },
  MYTHIC: { 
    label: 'Мифическое', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100',
    icon: Zap
  }
} as const

export default function AchievementGrid({
  userId,
  achievements = [],
  loading = false,
  onAchievementClick,
  showSearch = true,
  showFilter = true,
  compact = false
}: AchievementGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<BadgeCategory | 'ALL'>('ALL')
  const [selectedRarity, setSelectedRarity] = useState<AchievementRarity | 'ALL'>('ALL')

  // Filter and search achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements

    // Category filter
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(achievement => achievement.category === selectedCategory)
    }

    // Rarity filter  
    if (selectedRarity !== 'ALL') {
      filtered = filtered.filter(achievement => achievement.rarity === selectedRarity)
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(achievement =>
        achievement.name.toLowerCase().includes(term) ||
        achievement.description.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [achievements, selectedCategory, selectedRarity, searchTerm])

  // Group achievements by category
  const achievementsByCategory = useMemo(() => {
    const grouped: Record<BadgeCategory, Achievement[]> = {
      FISH_SPECIES: [],
      TECHNIQUE: [],
      SOCIAL: [],
      GEOGRAPHY: [],
      ACHIEVEMENT: [],
      MILESTONE: [],
      SPECIAL: [],
      SEASONAL: []
    }

    filteredAchievements.forEach(achievement => {
      if (grouped[achievement.category]) {
        grouped[achievement.category].push(achievement)
      }
    })

    return grouped
  }, [filteredAchievements])

  // Calculate stats per category
  const categoryStats = useMemo(() => {
    const stats: Record<BadgeCategory, CategoryStats> = {} as Record<BadgeCategory, CategoryStats>

    Object.keys(CATEGORY_CONFIG).forEach(category => {
      const categoryAchievements = achievements.filter(a => a.category === category as BadgeCategory)
      const unlockedCount = categoryAchievements.filter(a => a.unlocked).length
      
      stats[category as BadgeCategory] = {
        total: categoryAchievements.length,
        unlocked: unlockedCount,
        progress: categoryAchievements.length > 0 
          ? Math.round((unlockedCount / categoryAchievements.length) * 100)
          : 0
      }
    })

    return stats
  }, [achievements])

  // Overall stats
  const overallStats = useMemo(() => {
    const total = achievements.length
    const unlocked = achievements.filter(a => a.unlocked).length
    return {
      total,
      unlocked,
      progress: total > 0 ? Math.round((unlocked / total) * 100) : 0
    }
  }, [achievements])

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-6">
          {/* Loading header */}
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>

          {/* Loading grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              <Trophy className="w-5 h-5 inline mr-2" />Система достижений
            </h1>
            <p className="text-gray-600">
              Прогресс: {overallStats.unlocked} из {overallStats.total} достижений ({overallStats.progress}%)
            </p>
          </div>

          {/* Search and Filters */}
          {(showSearch || showFilter) && (
            <div className="flex flex-col sm:flex-row gap-3">
              {showSearch && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Поиск достижений..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
              )}

              {showFilter && (
                <div className="flex gap-2">
                  {/* Category Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        {selectedCategory === 'ALL' ? 'Все категории' : CATEGORY_CONFIG[selectedCategory]?.label}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedCategory('ALL')}>
                        Все категории
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <DropdownMenuItem key={key} onClick={() => setSelectedCategory(key as BadgeCategory)}>
                          <config.icon className="w-4 h-4 mr-2" />
                          {config.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Rarity Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Star className="w-4 h-4" />
                        {selectedRarity === 'ALL' ? 'Редкость' : RARITY_CONFIG[selectedRarity]?.label}
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setSelectedRarity('ALL')}>
                        Вся редкость
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {Object.entries(RARITY_CONFIG).map(([key, config]) => (
                        <DropdownMenuItem key={key} onClick={() => setSelectedRarity(key as AchievementRarity)}>
                          <config.icon className={`w-4 h-4 mr-2 ${config.color}`} />
                          {config.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Category Overview Cards - Only show when no specific filters applied */}
      {selectedCategory === 'ALL' && selectedRarity === 'ALL' && !searchTerm.trim() && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
            const stats = categoryStats[category as BadgeCategory]
            const CategoryIcon = config.icon

            return (
              <Card 
                key={category}
                className={`cursor-pointer transition-all hover:shadow-lg ${config.borderColor} border-2`}
                onClick={() => setSelectedCategory(category as BadgeCategory)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CategoryIcon className={`w-6 h-6 text-white p-1 rounded ${config.color}`} />
                    <Badge variant="secondary" className="text-xs">
                      {stats?.unlocked || 0}/{stats?.total || 0}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{config.label}</h3>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stats?.progress || 0}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={`h-2 rounded-full ${config.color}`}
                    />
                  </div>
                  <p className="text-xs text-gray-600">{stats?.progress || 0}%</p>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>
      )}

      {/* Achievement Grid by Categories */}
      <div className="space-y-8">
        <AnimatePresence>
          {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => {
            if (categoryAchievements.length === 0) return null

            const config = CATEGORY_CONFIG[category as BadgeCategory]
            const CategoryIcon = config.icon
            const stats = categoryStats[category as BadgeCategory]

            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon className={`w-8 h-8 text-white p-1.5 rounded-lg ${config.color}`} />
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{config.label}</h2>
                      <p className="text-sm text-gray-600">{config.description}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    {stats?.unlocked || 0} / {stats?.total || 0} ({stats?.progress || 0}%)
                  </Badge>
                </div>

                {/* Achievement Cards Grid */}
                <div className={`grid gap-4 ${
                  compact 
                    ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                }`}>
                  <AnimatePresence>
                    {categoryAchievements.map((achievement, index) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        onClick={() => onAchievementClick?.(achievement)}
                        compact={compact}
                        delay={index * 0.1}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* No Results */}
      {filteredAchievements.length === 0 && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Достижения не найдены</h3>
          <p className="text-gray-600">
            {searchTerm.trim() || selectedCategory !== 'ALL' || selectedRarity !== 'ALL'
              ? 'Попробуйте изменить параметры поиска или фильтры'
              : 'Пока нет доступных достижений'}
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Achievement Card Component
interface AchievementCardProps {
  achievement: Achievement
  onClick?: () => void
  compact?: boolean
  delay?: number
}

function AchievementCard({ achievement, onClick, compact = false, delay = 0 }: AchievementCardProps) {
  const rarityConfig = RARITY_CONFIG[achievement.rarity]
  const RarityIcon = rarityConfig.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
          achievement.unlocked 
            ? 'border-green-200 bg-green-50/50' 
            : 'border-gray-200 hover:border-gray-300'
        } ${
          !achievement.unlocked && !achievement.lockedVisible 
            ? 'opacity-60' 
            : ''
        }`}
        onClick={onClick}
      >
        <CardContent className={`${compact ? 'p-3' : 'p-4'}`}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`text-2xl ${compact ? 'text-lg' : ''}`}>
{achievement.icon ? achievement.icon : <Trophy className="w-6 h-6 text-amber-500" />}
              </div>
              {achievement.unlocked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                >
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    ✓ Получено
                  </Badge>
                </motion.div>
              )}
            </div>

            {/* Rarity indicator */}
            <div className={`flex items-center gap-1 ${rarityConfig.bgColor} px-2 py-1 rounded-full`}>
              <RarityIcon className={`w-3 h-3 ${rarityConfig.color}`} />
              {!compact && (
                <span className={`text-xs font-medium ${rarityConfig.color}`}>
                  {rarityConfig.label}
                </span>
              )}
            </div>
          </div>

          {/* Title and Description */}
          <div className="mb-3">
            <h3 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-base'} mb-1`}>
              {achievement.name}
            </h3>
            {(!compact || achievement.unlocked || achievement.lockedDescVisible) && (
              <p className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'} leading-tight`}>
                {achievement.unlocked || achievement.lockedDescVisible 
                  ? achievement.description 
                  : '???'}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          {achievement.maxProgress > 1 && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className={`text-gray-600 ${compact ? 'text-xs' : 'text-sm'}`}>
                  Прогресс
                </span>
                <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'}`}>
                  {achievement.progress}/{achievement.maxProgress}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${achievement.progressPercent}%` }}
                  transition={{ duration: 1, delay: delay + 0.2 }}
                  className={`h-2 rounded-full ${
                    achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Unlock date */}
          {achievement.unlocked && achievement.unlockedAt && !compact && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Получено {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
