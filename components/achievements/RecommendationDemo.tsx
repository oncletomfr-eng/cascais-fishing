/**
 * Recommendation System Demo - Comprehensive testing interface for achievement recommendations
 * Part of Task 9.4: Achievement Recommendation System
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Users, Target, TrendingUp, BarChart3, Settings,
  User, Zap, Clock, Trophy, Star, Brain,
  Shuffle, RotateCcw, Eye, Filter
} from 'lucide-react'
import AchievementRecommendations from './AchievementRecommendations'
import {
  type UserProfile,
  type DifficultyLevel,
  updateUserProfile
} from '@/lib/hooks/useAchievementRecommendations'
import { useAchievements, type BadgeCategory } from '@/lib/hooks/useAchievements'
import { toast } from 'sonner'

// Demo user profiles representing different player types
const DEMO_USER_PROFILES: Record<string, UserProfile> = {
  beginner: {
    completedAchievements: [],
    favoriteCategories: ['MILESTONE'],
    averageCompletionTime: 45,
    skillLevel: {
      FISH_SPECIES: 1,
      TECHNIQUE: 1,
      SOCIAL: 1,
      GEOGRAPHY: 1,
      ACHIEVEMENT: 1,
      MILESTONE: 1,
      SPECIAL: 1,
      SEASONAL: 1
    },
    preferences: {
      difficulty: 'beginner',
      timeCommitment: 'short',
      focus: 'breadth',
      social: false
    },
    behaviorMetrics: {
      consistencyScore: 0.3,
      challengeSeeking: 0.2,
      socialEngagement: 0.1,
      completionRate: 0.8
    }
  },

  experienced: {
    completedAchievements: [],
    favoriteCategories: ['FISH_SPECIES', 'TECHNIQUE'],
    averageCompletionTime: 25,
    skillLevel: {
      FISH_SPECIES: 4,
      TECHNIQUE: 3,
      SOCIAL: 2,
      GEOGRAPHY: 3,
      ACHIEVEMENT: 3,
      MILESTONE: 5,
      SPECIAL: 2,
      SEASONAL: 3
    },
    preferences: {
      difficulty: 'medium',
      timeCommitment: 'medium',
      focus: 'depth',
      social: true
    },
    behaviorMetrics: {
      consistencyScore: 0.8,
      challengeSeeking: 0.7,
      socialEngagement: 0.6,
      completionRate: 0.85
    }
  },

  expert: {
    completedAchievements: [],
    favoriteCategories: ['SPECIAL', 'ACHIEVEMENT'],
    averageCompletionTime: 15,
    skillLevel: {
      FISH_SPECIES: 5,
      TECHNIQUE: 5,
      SOCIAL: 4,
      GEOGRAPHY: 4,
      ACHIEVEMENT: 5,
      MILESTONE: 5,
      SPECIAL: 4,
      SEASONAL: 3
    },
    preferences: {
      difficulty: 'expert',
      timeCommitment: 'long',
      focus: 'depth',
      social: true
    },
    behaviorMetrics: {
      consistencyScore: 0.9,
      challengeSeeking: 0.95,
      socialEngagement: 0.8,
      completionRate: 0.9
    }
  },

  socializer: {
    completedAchievements: [],
    favoriteCategories: ['SOCIAL', 'MILESTONE'],
    averageCompletionTime: 35,
    skillLevel: {
      FISH_SPECIES: 2,
      TECHNIQUE: 2,
      SOCIAL: 5,
      GEOGRAPHY: 2,
      ACHIEVEMENT: 3,
      MILESTONE: 4,
      SPECIAL: 2,
      SEASONAL: 3
    },
    preferences: {
      difficulty: 'easy',
      timeCommitment: 'medium',
      focus: 'breadth',
      social: true
    },
    behaviorMetrics: {
      consistencyScore: 0.6,
      challengeSeeking: 0.4,
      socialEngagement: 0.95,
      completionRate: 0.7
    }
  },

  completionist: {
    completedAchievements: [],
    favoriteCategories: ['ACHIEVEMENT', 'SPECIAL', 'SEASONAL'],
    averageCompletionTime: 20,
    skillLevel: {
      FISH_SPECIES: 4,
      TECHNIQUE: 4,
      SOCIAL: 3,
      GEOGRAPHY: 5,
      ACHIEVEMENT: 5,
      MILESTONE: 5,
      SPECIAL: 5,
      SEASONAL: 5
    },
    preferences: {
      difficulty: 'legendary',
      timeCommitment: 'long',
      focus: 'breadth',
      social: false
    },
    behaviorMetrics: {
      consistencyScore: 0.95,
      challengeSeeking: 0.9,
      socialEngagement: 0.3,
      completionRate: 0.95
    }
  }
}

// Profile descriptions
const PROFILE_DESCRIPTIONS = {
  beginner: {
    title: 'New Fisher',
    description: 'Just starting their fishing journey, prefers easy achievements',
    icon: '🎣',
    traits: ['New to fishing', 'Prefers short sessions', 'Focuses on basics']
  },
  experienced: {
    title: 'Skilled Angler',
    description: 'Has moderate experience, enjoys medium difficulty challenges',
    icon: '🐟',
    traits: ['Balanced approach', 'Social participant', 'Technique focused']
  },
  expert: {
    title: 'Master Fisher',
    description: 'Highly skilled, seeks challenging achievements',
    icon: '🏆',
    traits: ['Seeks challenges', 'Deep expertise', 'Long sessions']
  },
  socializer: {
    title: 'Community Builder',
    description: 'Loves social aspects, organizes group activities',
    icon: '👥',
    traits: ['Social focused', 'Group organizer', 'Community driven']
  },
  completionist: {
    title: 'Achievement Hunter',
    description: 'Wants to complete everything, including rare achievements',
    icon: '⭐',
    traits: ['100% completion', 'Rare achievements', 'Systematic approach']
  }
}

interface ProfileSelectorProps {
  currentProfile: string
  onProfileChange: (profileKey: string) => void
}

function ProfileSelector({ currentProfile, onProfileChange }: ProfileSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Demo User Profiles
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(PROFILE_DESCRIPTIONS).map(([key, profile]) => (
            <motion.div
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card 
                className={`cursor-pointer transition-all ${
                  currentProfile === key 
                    ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => onProfileChange(key)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="text-2xl mb-2">{profile.icon}</div>
                    <h3 className="font-semibold text-sm mb-1">{profile.title}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{profile.description}</p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {profile.traits.map(trait => (
                        <Badge key={trait} variant="secondary" className="text-xs px-1 py-0">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ProfileAnalyticsProps {
  profile: UserProfile
  profileKey: string
}

function ProfileAnalytics({ profile, profileKey }: ProfileAnalyticsProps) {
  const profileDesc = PROFILE_DESCRIPTIONS[profileKey as keyof typeof PROFILE_DESCRIPTIONS]
  
  // Calculate profile insights
  const topSkills = Object.entries(profile.skillLevel)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  const behaviorInsights = [
    { 
      label: 'Consistency', 
      value: profile.behaviorMetrics.consistencyScore,
      color: 'text-green-600',
      description: 'How regularly they complete achievements'
    },
    { 
      label: 'Challenge Seeking', 
      value: profile.behaviorMetrics.challengeSeeking,
      color: 'text-purple-600',
      description: 'Tendency to take on difficult achievements'
    },
    { 
      label: 'Social Engagement', 
      value: profile.behaviorMetrics.socialEngagement,
      color: 'text-blue-600',
      description: 'Participation in social activities'
    },
    { 
      label: 'Completion Rate', 
      value: profile.behaviorMetrics.completionRate,
      color: 'text-yellow-600',
      description: 'Success rate for started achievements'
    }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Profile overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">{profileDesc?.icon}</div>
            <h3 className="font-semibold text-lg">{profileDesc?.title}</h3>
            <p className="text-sm text-muted-foreground">{profileDesc?.description}</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm">
                <span>Completed Achievements</span>
                <span className="font-semibold">{profile.completedAchievements.length}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Preferred Difficulty</span>
                <Badge variant="secondary">{profile.preferences.difficulty}</Badge>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Time Commitment</span>
                <Badge variant="secondary">{profile.preferences.timeCommitment}</Badge>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Focus Style</span>
                <Badge variant="secondary">{profile.preferences.focus}</Badge>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Social Player</span>
                <Badge variant={profile.preferences.social ? "default" : "secondary"}>
                  {profile.preferences.social ? "Yes" : "No"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills and behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Skills & Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Top skills */}
          <div>
            <h4 className="font-medium text-sm mb-3">Top Skills</h4>
            <div className="space-y-2">
              {topSkills.map(([category, level]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{category.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${
                            i <= level ? 'text-yellow-500 fill-current' : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{level}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Behavior metrics */}
          <div>
            <h4 className="font-medium text-sm mb-3">Behavior Insights</h4>
            <div className="space-y-3">
              {behaviorInsights.map(insight => (
                <div key={insight.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">{insight.label}</span>
                    <span className={`text-sm font-medium ${insight.color}`}>
                      {Math.round(insight.value * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${insight.value * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface RecommendationInsightsProps {
  profileKey: string
  onProfileChange: (profileKey: string) => void
}

function RecommendationInsights({ profileKey, onProfileChange }: RecommendationInsightsProps) {
  // Generate insights comparing different profiles
  const insights = [
    {
      title: 'Profile Comparison',
      description: 'See how different user types get different recommendations',
      action: 'Switch Profiles',
      icon: Shuffle
    },
    {
      title: 'Algorithm Insights',
      description: 'Our recommendation system considers 5+ factors including progress, preferences, and behavior',
      action: 'View Details',
      icon: Brain
    },
    {
      title: 'Personalization',
      description: 'Recommendations adapt based on completed achievements and user behavior patterns',
      action: 'See Examples',
      icon: Target
    }
  ]

  const profileStats = {
    beginner: { avgScore: 6.2, topCategory: 'MILESTONE', recommendedCount: 8 },
    experienced: { avgScore: 7.4, topCategory: 'TECHNIQUE', recommendedCount: 6 },
    expert: { avgScore: 8.1, topCategory: 'SPECIAL', recommendedCount: 4 },
    socializer: { avgScore: 6.8, topCategory: 'SOCIAL', recommendedCount: 7 },
    completionist: { avgScore: 8.9, topCategory: 'ACHIEVEMENT', recommendedCount: 3 }
  }

  const currentStats = profileStats[profileKey as keyof typeof profileStats]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Recommendation Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{currentStats?.avgScore.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Avg Recommendation Score</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{currentStats?.recommendedCount}</div>
              <div className="text-sm text-muted-foreground">Recommended Achievements</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">{currentStats?.topCategory}</div>
              <div className="text-sm text-muted-foreground">Top Recommended Category</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insights.map((insight, index) => {
              const Icon = insight.icon
              return (
                <Card key={index} className="text-center p-4">
                  <Icon className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                  <h3 className="font-medium text-sm mb-2">{insight.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (insight.action === 'Switch Profiles') {
                        const profiles = Object.keys(DEMO_USER_PROFILES)
                        const currentIndex = profiles.indexOf(profileKey)
                        const nextProfile = profiles[(currentIndex + 1) % profiles.length]
                        onProfileChange(nextProfile)
                        toast.info(`Switched to ${PROFILE_DESCRIPTIONS[nextProfile as keyof typeof PROFILE_DESCRIPTIONS].title}`)
                      } else {
                        toast.info(`${insight.action} feature coming soon!`)
                      }
                    }}
                  >
                    {insight.action}
                  </Button>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RecommendationDemo() {
  const [selectedProfile, setSelectedProfile] = useState<string>('beginner')
  const [customProfile, setCustomProfile] = useState<UserProfile | null>(null)
  
  // Get the current user profile (custom or demo)
  const currentUserProfile = useMemo(() => {
    if (customProfile) return customProfile
    return DEMO_USER_PROFILES[selectedProfile] || DEMO_USER_PROFILES.beginner
  }, [selectedProfile, customProfile])

  const handleProfileChange = (profileKey: string) => {
    setSelectedProfile(profileKey)
    setCustomProfile(null) // Clear custom profile when switching to demo profile
    toast.success(`Switched to ${PROFILE_DESCRIPTIONS[profileKey as keyof typeof PROFILE_DESCRIPTIONS].title}`, {
      description: 'Recommendations will update based on the new profile'
    })
  }

  const handleRandomizeProfile = () => {
    const profiles = Object.keys(DEMO_USER_PROFILES)
    const randomProfile = profiles[Math.floor(Math.random() * profiles.length)]
    handleProfileChange(randomProfile)
  }

  const handleResetProfile = () => {
    setSelectedProfile('beginner')
    setCustomProfile(null)
    toast.info('Reset to New Fisher profile')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-blue-500" />
          Achievement Recommendation System Demo
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore how our intelligent recommendation system provides personalized achievement suggestions 
          based on different user profiles, preferences, and behavior patterns.
        </p>
        
        <div className="flex justify-center gap-2 mt-4">
          <Button onClick={handleRandomizeProfile} variant="outline" size="sm">
            <Shuffle className="w-4 h-4 mr-2" />
            Random Profile
          </Button>
          <Button onClick={handleResetProfile} variant="outline" size="sm">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main content */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Profiles
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Recommendations */}
        <TabsContent value="recommendations">
          <div className="space-y-4">
            {/* Current profile indicator */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {PROFILE_DESCRIPTIONS[selectedProfile as keyof typeof PROFILE_DESCRIPTIONS]?.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        Current Profile: {PROFILE_DESCRIPTIONS[selectedProfile as keyof typeof PROFILE_DESCRIPTIONS]?.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {PROFILE_DESCRIPTIONS[selectedProfile as keyof typeof PROFILE_DESCRIPTIONS]?.description}
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => handleProfileChange('experienced')} variant="outline">
                    Switch Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recommendations component */}
            <AchievementRecommendations 
              userProfile={currentUserProfile}
              onAchievementStart={(id) => toast.success(`Started working on achievement: ${id}`)}
              onAchievementDetails={(id) => toast.info(`Viewing details for achievement: ${id}`)}
            />
          </div>
        </TabsContent>

        {/* User Profiles */}
        <TabsContent value="profiles">
          <div className="space-y-4">
            <ProfileSelector 
              currentProfile={selectedProfile}
              onProfileChange={handleProfileChange}
            />
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="space-y-4">
            <ProfileAnalytics 
              profile={currentUserProfile}
              profileKey={selectedProfile}
            />
          </div>
        </TabsContent>

        {/* Insights */}
        <TabsContent value="insights">
          <RecommendationInsights 
            profileKey={selectedProfile}
            onProfileChange={handleProfileChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
