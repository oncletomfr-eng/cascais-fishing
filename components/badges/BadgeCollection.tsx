/**
 * Badge Collection Component - Display badge collection with rarity indicators and filters
 * Part of Task 10: Badge System & Collection UI
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge as UIBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search, Filter, Trophy, Clock, Star, Calendar,
  Share2, Eye, Award, Target, Sparkles, Crown,
  Users, MapPin, ChevronDown, RotateCcw
} from 'lucide-react'
import {
  useBadges,
  type Badge,
  type BadgeCategory,
  type BadgeRarity,
  type BadgeFilters,
  BADGE_RARITY_CONFIG,
  BADGE_CATEGORY_CONFIG,
  getBadgeRarityConfig,
  getBadgeCategoryConfig,
  formatBadgeDate
} from '@/lib/hooks/useBadges'
import { toast } from 'sonner'

interface BadgeCardProps {
  badge: Badge
  isEarned: boolean
  onClick?: () => void
  onShare?: () => void
  showProgress?: boolean
  currentProgress?: number
}

function BadgeCard({ 
  badge, 
  isEarned, 
  onClick, 
  onShare, 
  showProgress = false,
  currentProgress = 0 
}: BadgeCardProps) {
  const rarityConfig = getBadgeRarityConfig(badge.rarity)
  const categoryConfig = getBadgeCategoryConfig(badge.category)

  const progress = showProgress && badge.requiredValue 
    ? Math.min(100, (currentProgress / badge.requiredValue) * 100)
    : isEarned ? 100 : 0

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer"
      onClick={onClick}
    >
      <Card 
        className={`
          relative overflow-hidden border-2 transition-all duration-300
          ${isEarned 
            ? `${rarityConfig.borderColor} ${rarityConfig.bgColor} shadow-md` 
            : 'border-muted bg-muted/20 opacity-60'
          }
          ${isEarned && rarityConfig.glow ? `hover:shadow-lg hover:${rarityConfig.glow}` : ''}
          group-hover:transform group-hover:scale-105
        `}
      >
        {/* Rarity glow effect overlay */}
        {isEarned && (
          <div className={`
            absolute inset-0 opacity-20 bg-gradient-to-br 
            from-transparent via-white/30 to-transparent
            group-hover:opacity-40 transition-opacity duration-300
          `} />
        )}

        <CardContent className="p-4">
          {/* Header with category and rarity */}
          <div className="flex justify-between items-start mb-3">
            <UIBadge 
              variant="secondary" 
              className={`text-xs ${categoryConfig.color} bg-transparent border-current`}
            >
              {categoryConfig.icon} {categoryConfig.label}
            </UIBadge>
            
            <UIBadge 
              variant="outline"
              className={`text-xs ${rarityConfig.textColor} ${rarityConfig.borderColor}`}
              style={{ color: rarityConfig.color }}
            >
              {rarityConfig.label}
            </UIBadge>
          </div>

          {/* Badge icon */}
          <div className="text-center mb-3">
            <div className={`
              text-4xl mb-2 transition-all duration-300
              ${isEarned ? 'transform group-hover:scale-110' : 'filter grayscale'}
            `}>
              {badge.icon}
            </div>
          </div>

          {/* Badge name and description */}
          <div className="text-center mb-3">
            <h3 className={`
              font-semibold text-sm mb-1 transition-colors duration-200
              ${isEarned ? 'text-foreground' : 'text-muted-foreground'}
            `}>
              {badge.name}
            </h3>
            <p className={`
              text-xs leading-tight
              ${isEarned ? 'text-muted-foreground' : 'text-muted-foreground/70'}
            `}>
              {isEarned ? badge.description : badge.description || '???'}
            </p>
          </div>

          {/* Progress bar (for unearned badges with requirements) */}
          {!isEarned && badge.requiredValue && showProgress && (
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Progress</span>
                <span>{currentProgress}/{badge.requiredValue}</span>
              </div>
              <Progress 
                value={progress} 
                className="h-1.5"
              />
            </div>
          )}

          {/* Earned date or requirements */}
          <div className="text-center">
            {isEarned ? (
              <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                <Trophy className="w-3 h-3" />
                <span>Earned {formatBadgeDate(badge.earnedAt)}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Target className="w-3 h-3" />
                <span>
                  {badge.requiredValue 
                    ? `Requires ${badge.requiredValue}` 
                    : 'Requirements unknown'
                  }
                </span>
              </div>
            )}
          </div>

          {/* Action buttons (visible on hover for earned badges) */}
          {isEarned && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-3 flex justify-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onShare?.()
                }}
                className="h-8 px-2"
              >
                <Share2 className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onClick?.()
                }}
                className="h-8 px-2"
              >
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface BadgeStatsProps {
  stats: ReturnType<typeof useBadges>['stats']
  isLoading: boolean
}

function BadgeStats({ stats, isLoading }: BadgeStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 text-center">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-6 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statItems = [
    {
      label: 'Total Badges',
      value: stats.total,
      icon: Trophy,
      color: 'text-yellow-600'
    },
    {
      label: 'Earned',
      value: stats.recentlyEarned.length,
      icon: Award,
      color: 'text-green-600'
    },
    {
      label: 'Completion',
      value: `${Math.round(stats.completionRate)}%`,
      icon: Target,
      color: 'text-blue-600'
    },
    {
      label: 'Recent',
      value: stats.recentlyEarned.slice(0, 3).length,
      icon: Clock,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <Icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
                <div className="text-2xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground">{item.label}</div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

interface BadgeFiltersProps {
  filters: BadgeFilters
  onFiltersChange: (filters: BadgeFilters) => void
  stats: ReturnType<typeof useBadges>['stats']
}

function BadgeFiltersPanel({ filters, onFiltersChange, stats }: BadgeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const resetFilters = () => {
    onFiltersChange({})
    toast.info('Filters reset')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search badges..."
                  value={filters.search || ''}
                  onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Category filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select 
                    value={filters.category || 'all'} 
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      category: value === 'all' ? undefined : value as BadgeCategory 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Object.entries(BADGE_CATEGORY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.icon} {config.label} ({stats.byCategory[key as BadgeCategory]})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rarity filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Rarity</label>
                  <Select 
                    value={filters.rarity || 'all'} 
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      rarity: value === 'all' ? undefined : value as BadgeRarity 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All rarities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Rarities</SelectItem>
                      {Object.entries(BADGE_RARITY_CONFIG)
                        .sort((a, b) => a[1].order - b[1].order)
                        .map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span style={{ color: config.color }}>
                              {config.label} ({stats.byRarity[key as BadgeRarity]})
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Earned status filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select 
                    value={filters.earned === undefined ? 'all' : filters.earned ? 'earned' : 'not-earned'} 
                    onValueChange={(value) => onFiltersChange({ 
                      ...filters, 
                      earned: value === 'all' ? undefined : value === 'earned' 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All badges" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Badges</SelectItem>
                      <SelectItem value="earned">✅ Earned</SelectItem>
                      <SelectItem value="not-earned">⏳ Not Earned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Reset button */}
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={resetFilters}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset Filters
                </Button>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

interface BadgeCollectionProps {
  userId?: string
  onBadgeClick?: (badge: Badge) => void
  onBadgeShare?: (badge: Badge) => void
  className?: string
  showProgress?: boolean
}

export default function BadgeCollection({
  userId,
  onBadgeClick,
  onBadgeShare,
  className = '',
  showProgress = false
}: BadgeCollectionProps) {
  const [filters, setFilters] = useState<BadgeFilters>({})
  
  const { 
    badges, 
    earnedBadges, 
    notEarnedBadges, 
    stats, 
    isLoading, 
    error 
  } = useBadges(userId, filters)

  const handleBadgeClick = (badge: Badge) => {
    onBadgeClick?.(badge)
  }

  const handleBadgeShare = (badge: Badge) => {
    onBadgeShare?.(badge)
    toast.success(`Shared ${badge.name} badge! 🏆`)
  }

  if (error) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error loading badges</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2 mb-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Badge Collection
        </h1>
        <p className="text-muted-foreground">
          {earnedBadges.length} of {badges.length} badges earned
        </p>
      </div>

      {/* Statistics */}
      <BadgeStats stats={stats} isLoading={isLoading} />

      {/* Filters */}
      <BadgeFiltersPanel 
        filters={filters} 
        onFiltersChange={setFilters} 
        stats={stats} 
      />

      {/* Badge grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-2"></div>
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No badges found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or start earning badges!
          </p>
          <Button onClick={() => setFilters({})}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <AnimatePresence mode="popLayout">
            {badges.map((badge) => {
              const isEarned = !!badge.earnedAt && badge.earnedAt !== ''
              return (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={isEarned}
                  onClick={() => handleBadgeClick(badge)}
                  onShare={() => handleBadgeShare(badge)}
                  showProgress={showProgress}
                  currentProgress={badge.requiredValue ? Math.floor(badge.requiredValue * 0.7) : 0}
                />
              )
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Recently earned section */}
      {stats.recentlyEarned.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            Recently Earned
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.recentlyEarned.slice(0, 5).map((badge) => (
              <BadgeCard
                key={`recent-${badge.id}`}
                badge={badge}
                isEarned={true}
                onClick={() => handleBadgeClick(badge)}
                onShare={() => handleBadgeShare(badge)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
