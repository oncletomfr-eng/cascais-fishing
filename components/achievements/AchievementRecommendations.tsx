/**
 * Achievement Recommendations Dashboard - Smart recommendations for next achievable goals
 * Part of Task 9.4: Achievement Recommendation System
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Target, TrendingUp, Clock, Users, Star, Lightbulb,
  ChevronRight, Trophy, Zap, Calendar, Settings,
  BookOpen, MapPin, Award, Filter, RotateCcw,
  CheckCircle2, Circle, PlayCircle
} from 'lucide-react'
import {
  useAchievementRecommendations,
  type AchievementRecommendation,
  type UserProfile,
  type RecommendationConfig,
  type DifficultyLevel,
  DEFAULT_USER_PROFILE
} from '@/lib/hooks/useAchievementRecommendations'
import { useAchievements } from '@/lib/hooks/useAchievements'
import { toast } from 'sonner'

// Priority colors
const PRIORITY_COLORS = {
  high: { bg: 'bg-red-500/20', text: 'text-red-600', border: 'border-red-500' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-600', border: 'border-yellow-500' },
  low: { bg: 'bg-green-500/20', text: 'text-green-600', border: 'border-green-500' }
}

// Difficulty colors and icons
const DIFFICULTY_CONFIG = {
  beginner: { color: '#10b981', icon: Circle, label: 'Beginner' },
  easy: { color: '#84cc16', icon: Circle, label: 'Easy' },
  medium: { color: '#f59e0b', icon: Target, label: 'Medium' },
  hard: { color: '#ef4444', icon: Zap, label: 'Hard' },
  expert: { color: '#8b5cf6', icon: Star, label: 'Expert' },
  legendary: { color: '#ec4899', icon: Trophy, label: 'Legendary' }
}

interface RecommendationCardProps {
  recommendation: AchievementRecommendation
  onStartAchievement?: (achievementId: string) => void
  onViewDetails?: (achievementId: string) => void
  compact?: boolean
}

function RecommendationCard({ 
  recommendation, 
  onStartAchievement, 
  onViewDetails,
  compact = false 
}: RecommendationCardProps) {
  const [showCompletionPath, setShowCompletionPath] = useState(false)
  const { achievement, score, reasons, difficulty, estimatedTime, tips, priority, completionPath } = recommendation

  const priorityConfig = PRIORITY_COLORS[priority]
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty]
  const DifficultyIcon = difficultyConfig.icon

  const progressPercentage = (achievement.progress / achievement.maxProgress) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`relative ${compact ? 'mb-3' : 'mb-4'}`}
    >
      <Card className={`relative overflow-hidden border-l-4 ${priorityConfig.border} hover:shadow-md transition-shadow`}>
        {/* Priority indicator */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.bg} ${priorityConfig.text}`}>
          {priority.toUpperCase()}
        </div>

        <CardHeader className={`${compact ? 'pb-3' : 'pb-4'}`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className={`${compact ? 'text-lg' : 'text-xl'} font-semibold flex items-center gap-2`}>
                {achievement.icon ? (
                  <span className="text-2xl">{achievement.icon}</span>
                ) : (
                  <Trophy className="w-6 h-6 text-amber-500" />
                )}
                {achievement.name}
              </CardTitle>
              
              {/* Difficulty and time estimate */}
              <div className="flex items-center gap-3 mt-2">
                <Badge 
                  variant="outline" 
                  className="flex items-center gap-1"
                  style={{ color: difficultyConfig.color, borderColor: difficultyConfig.color }}
                >
                  <DifficultyIcon className="w-3 h-3" />
                  {difficultyConfig.label}
                </Badge>
                
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {estimatedTime}
                </Badge>

                <Badge variant="secondary" className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Score: {score.toFixed(1)}
                </Badge>
              </div>
            </div>
          </div>

          {!compact && (
            <p className="text-muted-foreground mt-2">{achievement.description}</p>
          )}
        </CardHeader>

        <CardContent className={`${compact ? 'pt-0' : ''}`}>
          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{achievement.progress}/{achievement.maxProgress} ({Math.round(progressPercentage)}%)</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Recommendation reasons */}
          {!compact && reasons.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Why recommended:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                {reasons.slice(0, 2).map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-green-500" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tips */}
          {!compact && tips.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <BookOpen className="w-4 h-4 text-blue-500" />
                Tips:
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {tips.slice(0, 2).map((tip, index) => (
                  <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Star className="w-3 h-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                    {tip}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completion path toggle */}
          {!compact && completionPath.length > 0 && (
            <div className="mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompletionPath(!showCompletionPath)}
                className="w-full flex items-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                {showCompletionPath ? 'Hide' : 'Show'} Completion Path
                <ChevronRight className={`w-4 h-4 transition-transform ${showCompletionPath ? 'rotate-90' : ''}`} />
              </Button>

              <AnimatePresence>
                {showCompletionPath && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 space-y-2"
                  >
                    {completionPath.map((step) => (
                      <div key={step.id} className="flex items-start gap-3 p-2 bg-muted/50 rounded-md">
                        {step.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {step.estimatedDuration}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={() => onStartAchievement?.(achievement.id)}
              className="flex-1"
              size={compact ? "sm" : "default"}
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Start Achievement
            </Button>
            
            {!compact && (
              <Button 
                variant="outline"
                onClick={() => onViewDetails?.(achievement.id)}
                size="default"
              >
                <BookOpen className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface RecommendationFiltersProps {
  config: RecommendationConfig
  onConfigChange: (config: RecommendationConfig) => void
}

function RecommendationFilters({ config, onConfigChange }: RecommendationFiltersProps) {
  const difficulties: DifficultyLevel[] = ['beginner', 'easy', 'medium', 'hard', 'expert', 'legendary']
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Recommendation Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Max recommendations */}
        <div>
          <label className="text-sm font-medium">Max Recommendations: {config.maxRecommendations}</label>
          <Slider
            value={[config.maxRecommendations]}
            onValueChange={([value]) => onConfigChange({ ...config, maxRecommendations: value })}
            min={1}
            max={12}
            step={1}
            className="mt-2"
          />
        </div>

        {/* Difficulty preference */}
        <div>
          <label className="text-sm font-medium mb-2 block">Preferred Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {difficulties.map((difficulty) => {
              const difficultyConfig = DIFFICULTY_CONFIG[difficulty]
              const DifficultyIcon = difficultyConfig.icon
              return (
                <Button
                  key={difficulty}
                  variant={config.difficultyPreference === difficulty ? "default" : "outline"}
                  size="sm"
                  onClick={() => onConfigChange({ ...config, difficultyPreference: difficulty })}
                  className="flex items-center gap-1"
                >
                  <DifficultyIcon className="w-3 h-3" />
                  {difficultyConfig.label}
                </Button>
              )
            })}
          </div>
        </div>

        {/* Include completed */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Include Completed</label>
          <Button
            variant={config.includeCompleted ? "default" : "outline"}
            size="sm"
            onClick={() => onConfigChange({ ...config, includeCompleted: !config.includeCompleted })}
          >
            {config.includeCompleted ? "Yes" : "No"}
          </Button>
        </div>

        {/* Reset filters */}
        <Button
          variant="outline"
          onClick={() => onConfigChange({ maxRecommendations: 6, includeCompleted: false })}
          className="w-full flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Filters
        </Button>
      </CardContent>
    </Card>
  )
}

interface AchievementRecommendationsProps {
  userProfile?: UserProfile
  onAchievementStart?: (achievementId: string) => void
  onAchievementDetails?: (achievementId: string) => void
  className?: string
}

export default function AchievementRecommendations({
  userProfile = DEFAULT_USER_PROFILE,
  onAchievementStart,
  onAchievementDetails,
  className = ''
}: AchievementRecommendationsProps) {
  const { achievements, isLoading: achievementsLoading } = useAchievements()
  const [config, setConfig] = useState<RecommendationConfig>({
    maxRecommendations: 6,
    includeCompleted: false
  })

  const {
    recommendations,
    isLoading,
    getRecommendationsByPriority,
    getRecommendationsByDifficulty,
    totalRecommendations
  } = useAchievementRecommendations(achievements, userProfile, config)

  // Group recommendations by priority
  const highPriorityRecs = getRecommendationsByPriority('high')
  const mediumPriorityRecs = getRecommendationsByPriority('medium') 
  const lowPriorityRecs = getRecommendationsByPriority('low')

  const handleStartAchievement = (achievementId: string) => {
    toast.success('Achievement started!', {
      description: 'Track your progress in the achievements tab'
    })
    onAchievementStart?.(achievementId)
  }

  const handleViewDetails = (achievementId: string) => {
    onAchievementDetails?.(achievementId)
  }

  if (achievementsLoading || isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-2 bg-muted rounded mb-4"></div>
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-500" />
            Recommended for You
          </h2>
          <p className="text-muted-foreground">
            {totalRecommendations} personalized recommendations based on your progress and preferences
          </p>
        </div>
      </div>

      {/* Main content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            All ({totalRecommendations})
          </TabsTrigger>
          <TabsTrigger value="priority" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            By Priority
          </TabsTrigger>
          <TabsTrigger value="difficulty" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            By Difficulty
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* All recommendations */}
        <TabsContent value="all" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recommendations available</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or complete more achievements to get personalized recommendations.
                </p>
                <Button onClick={() => setConfig({ ...config, includeCompleted: true })}>
                  Include Completed Achievements
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {recommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.achievement.id}
                  recommendation={recommendation}
                  onStartAchievement={handleStartAchievement}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* By priority */}
        <TabsContent value="priority" className="space-y-6">
          {/* High priority */}
          {highPriorityRecs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                High Priority ({highPriorityRecs.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {highPriorityRecs.map((rec) => (
                  <RecommendationCard
                    key={rec.achievement.id}
                    recommendation={rec}
                    onStartAchievement={handleStartAchievement}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medium priority */}
          {mediumPriorityRecs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                Medium Priority ({mediumPriorityRecs.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {mediumPriorityRecs.map((rec) => (
                  <RecommendationCard
                    key={rec.achievement.id}
                    recommendation={rec}
                    onStartAchievement={handleStartAchievement}
                    onViewDetails={handleViewDetails}
                    compact
                  />
                ))}
              </div>
            </div>
          )}

          {/* Low priority */}
          {lowPriorityRecs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                Low Priority ({lowPriorityRecs.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {lowPriorityRecs.map((rec) => (
                  <RecommendationCard
                    key={rec.achievement.id}
                    recommendation={rec}
                    onStartAchievement={handleStartAchievement}
                    onViewDetails={handleViewDetails}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* By difficulty */}
        <TabsContent value="difficulty" className="space-y-6">
          {(['beginner', 'easy', 'medium', 'hard', 'expert', 'legendary'] as DifficultyLevel[]).map((difficulty) => {
            const difficultyRecs = getRecommendationsByDifficulty(difficulty)
            if (difficultyRecs.length === 0) return null

            const difficultyConfig = DIFFICULTY_CONFIG[difficulty]
            const DifficultyIcon = difficultyConfig.icon

            return (
              <div key={difficulty}>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DifficultyIcon 
                    className="w-5 h-5" 
                    style={{ color: difficultyConfig.color }} 
                  />
                  {difficultyConfig.label} ({difficultyRecs.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {difficultyRecs.map((rec) => (
                    <RecommendationCard
                      key={rec.achievement.id}
                      recommendation={rec}
                      onStartAchievement={handleStartAchievement}
                      onViewDetails={handleViewDetails}
                      compact={difficulty === 'beginner' || difficulty === 'easy'}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecommendationFilters config={config} onConfigChange={setConfig} />
            
            {/* User profile summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Your Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium mb-2">Completed Achievements</div>
                  <div className="text-2xl font-bold text-green-600">
                    {userProfile.completedAchievements.length}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Favorite Categories</div>
                  <div className="flex flex-wrap gap-1">
                    {userProfile.favoriteCategories.map(category => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Completion Rate</div>
                  <Progress 
                    value={userProfile.behaviorMetrics.completionRate * 100} 
                    className="h-2" 
                  />
                  <div className="text-sm text-muted-foreground mt-1">
                    {Math.round(userProfile.behaviorMetrics.completionRate * 100)}%
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium mb-2">Preferred Difficulty</div>
                  <Badge style={{ color: DIFFICULTY_CONFIG[userProfile.preferences.difficulty].color }}>
                    {DIFFICULTY_CONFIG[userProfile.preferences.difficulty].label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
