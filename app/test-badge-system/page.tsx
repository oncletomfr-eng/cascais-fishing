/**
 * Badge System Test Page - Comprehensive testing interface for badge collection and notifications
 * Part of Task 10: Badge System & Collection UI
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy, Bell, Eye, Users, Settings, Sparkles,
  Crown, Award, Star, Target, Zap, Gift, X, CheckCircle2
} from 'lucide-react'
import BadgeCollection from '@/components/badges/BadgeCollection'
import BadgeDetailModal from '@/components/badges/BadgeDetailModal'
import {
  BadgeNotificationProvider,
  useBadgeNotifications
} from '@/components/badges/BadgeNotification'
import {
  useBadges,
  type Badge,
  BADGE_RARITY_CONFIG,
  BADGE_CATEGORY_CONFIG
} from '@/lib/hooks/useBadges'
import { toast } from 'sonner'

// Props interface would be defined here if needed

function BadgeSystemDemo() {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  
  const { 
    badges, 
    earnedBadges, 
    notEarnedBadges, 
    stats, 
    isLoading, 
    awardBadge,
    getBadgeById
  } = useBadges()
  
  const { 
    showBadgeEarned, 
    showBadgeProgress, 
    clearNotifications 
  } = useBadgeNotifications()

  // Demo functions for testing notifications
  const handleAwardRandomBadge = () => {
    const availableBadges = notEarnedBadges
    if (availableBadges.length === 0) {
      toast.info('All badges already earned! 🎉')
      return
    }

    const randomBadge = availableBadges[Math.floor(Math.random() * availableBadges.length)]
    awardBadge(randomBadge.id)
    showBadgeEarned(randomBadge)
    
    toast.success(`Awarded: ${randomBadge.name}! 🏆`)
  }

  const handleShowProgressUpdate = () => {
    const inProgressBadges = notEarnedBadges.filter(b => b.requiredValue)
    if (inProgressBadges.length === 0) {
      toast.info('No badges with progress requirements available')
      return
    }

    const randomBadge = inProgressBadges[Math.floor(Math.random() * inProgressBadges.length)]
    const currentProgress = randomBadge.requiredValue ? Math.floor(randomBadge.requiredValue * 0.6) : 0
    const previousProgress = Math.max(0, currentProgress - Math.floor(Math.random() * 3) - 1)
    
    showBadgeProgress(randomBadge, currentProgress, previousProgress)
    toast.info(`Progress updated for: ${randomBadge.name}`)
  }

  const handleAwardSpecificRarity = (rarity: Badge['rarity']) => {
    const availableBadges = notEarnedBadges.filter(b => b.rarity === rarity)
    if (availableBadges.length === 0) {
      toast.info(`No ${rarity} badges available to award`)
      return
    }

    const badge = availableBadges[0]
    awardBadge(badge.id)
    showBadgeEarned(badge)
    
    toast.success(`Awarded ${rarity} badge: ${badge.name}! ✨`)
  }

  const handleBadgeClick = (badge: Badge) => {
    setSelectedBadge(badge)
    setIsDetailModalOpen(true)
  }

  const handleBadgeShare = (badge: Badge) => {
    // Mock social sharing
    const shareText = `🏆 Check out my "${badge.name}" badge on Cascais Fishing! ${badge.description}`
    
    if (navigator.share) {
      navigator.share({
        title: `${badge.name} Badge`,
        text: shareText,
        url: window.location.href
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareText)
        toast.success('Shared to clipboard! 📋')
      })
    } else {
      navigator.clipboard.writeText(shareText)
      toast.success('Badge info copied to clipboard! 📋')
    }
  }

  // Generate mock tips for badges
  const getBadgeTips = (badge: Badge): string[] => {
    const tipsByCategory = {
      ACHIEVEMENT: [
        'Complete related fishing activities consistently',
        'Focus on the specific requirements mentioned in the description',
        'Join group events to accelerate progress'
      ],
      MILESTONE: [
        'Track your progress regularly in your profile',
        'Set small daily goals to reach the milestone',
        'Celebrate small wins along the way'
      ],
      SPECIAL: [
        'Look for special events and seasonal opportunities',
        'Engage with the community for unique achievements',
        'Check announcements for limited-time challenges'
      ],
      SEASONAL: [
        'Pay attention to seasonal fishing patterns',
        'Join seasonal events and competitions',
        'Plan your fishing trips around seasonal peaks'
      ]
    }

    return tipsByCategory[badge.category as keyof typeof tipsByCategory] || []
  }

  // Get related badges (mock implementation)
  const getRelatedBadges = (badge: Badge): Badge[] => {
    return badges
      .filter(b => 
        b.id !== badge.id && 
        (b.category === badge.category || b.rarity === badge.rarity)
      )
      .slice(0, 4)
  }

  const demoStats = [
    {
      label: 'Total Badges',
      value: badges.length,
      icon: Trophy,
      color: 'text-yellow-600'
    },
    {
      label: 'Earned Badges', 
      value: earnedBadges.length,
      icon: Award,
      color: 'text-green-600'
    },
    {
      label: 'Completion Rate',
      value: `${Math.round(stats.completionRate)}%`,
      icon: Target,
      color: 'text-blue-600'
    },
    {
      label: 'Rarest Earned',
      value: earnedBadges.length > 0 
        ? BADGE_RARITY_CONFIG[earnedBadges.sort((a, b) => 
            BADGE_RARITY_CONFIG[b.rarity].order - BADGE_RARITY_CONFIG[a.rarity].order
          )[0].rarity]?.label || 'None'
        : 'None',
      icon: Crown,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-4">
              <Trophy className="w-10 h-10 text-yellow-500" />
              Badge System Demo
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive badge collection system with earning notifications, 
              social sharing, and detailed badge management.
            </p>
          </motion.div>
        </div>

        {/* Quick stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {demoStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            )
          })}
        </motion.div>

        {/* Main content */}
        <Tabs defaultValue="collection" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4">
            <TabsTrigger value="collection" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Collection
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Profile View
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Demo Controls
            </TabsTrigger>
          </TabsList>

          {/* Badge Collection Tab */}
          <TabsContent value="collection">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <BadgeCollection
                onBadgeClick={handleBadgeClick}
                onBadgeShare={handleBadgeShare}
                showProgress={true}
              />
            </motion.div>
          </TabsContent>

          {/* Notifications Testing Tab */}
          <TabsContent value="notifications">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-blue-500" />
                    Notification Testing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Button 
                      onClick={handleAwardRandomBadge}
                      className="flex items-center gap-2"
                    >
                      <Gift className="w-4 h-4" />
                      Award Random Badge
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={handleShowProgressUpdate}
                      className="flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Show Progress Update
                    </Button>

                    <Button 
                      variant="outline"
                      onClick={clearNotifications}
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear All Notifications
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Award by Rarity:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(BADGE_RARITY_CONFIG).map(([rarity, config]) => (
                        <Button
                          key={rarity}
                          variant="outline"
                          size="sm"
                          onClick={() => handleAwardSpecificRarity(rarity as Badge['rarity'])}
                          className="text-xs"
                          style={{ 
                            borderColor: config.color + '40',
                            color: config.color 
                          }}
                        >
                          ✨ {config.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">💡 Testing Notes:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Badge earned notifications appear in top-right corner</li>
                      <li>• Progress notifications appear in bottom-right corner</li>
                      <li>• Notifications auto-dismiss after a few seconds</li>
                      <li>• Higher rarity badges have more spectacular effects</li>
                      <li>• Multiple notifications stack vertically</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Profile Integration Tab */}
          <TabsContent value="profile">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-500" />
                    Profile Badge Display
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Recently earned badges showcase */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Recent Achievements</h3>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {stats.recentlyEarned.slice(0, 5).map((badge) => {
                        const rarityConfig = getBadgeRarityConfig(badge.rarity)
                        return (
                          <motion.div
                            key={badge.id}
                            className={`
                              flex-shrink-0 p-3 rounded-lg border-2 cursor-pointer
                              ${rarityConfig.borderColor} ${rarityConfig.bgColor}
                              hover:shadow-lg transition-all
                            `}
                            whileHover={{ scale: 1.05 }}
                            onClick={() => handleBadgeClick(badge)}
                          >
                            <div className="text-center">
                              <div className="text-2xl mb-1">{badge.icon}</div>
                              <div className="text-xs font-medium">{badge.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatBadgeDate(badge.earnedAt)}
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Rarity breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(BADGE_RARITY_CONFIG).map(([rarity, config]) => {
                      const count = stats.byRarity[rarity as Badge['rarity']]
                      return (
                        <Card key={rarity} className="text-center">
                          <CardContent className="p-4">
                            <Star 
                              className="w-6 h-6 mx-auto mb-2" 
                              style={{ color: config.color }}
                            />
                            <div className="text-lg font-bold">{count}</div>
                            <div className="text-sm text-muted-foreground">
                              {config.label}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Demo Controls Tab */}
          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-500" />
                    Demo Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Badge stats summary */}
                    <div>
                      <h4 className="font-medium mb-3">Badge Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Total badges:</span>
                          <span className="font-medium">{badges.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Earned:</span>
                          <span className="font-medium text-green-600">{earnedBadges.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Not earned:</span>
                          <span className="font-medium text-orange-600">{notEarnedBadges.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Completion rate:</span>
                          <span className="font-medium">{Math.round(stats.completionRate)}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div>
                      <h4 className="font-medium mb-3">By Category</h4>
                      <div className="space-y-2">
                        {Object.entries(BADGE_CATEGORY_CONFIG).map(([category, config]) => (
                          <div key={category} className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <span>{config.icon}</span>
                              <span>{config.label}</span>
                            </span>
                            <span className="font-medium">
                              {stats.byCategory[category as Badge['category']]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">🚀 Features Implemented</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Badge collection with rarity indicators</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Real-time earning notifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Progress tracking & updates</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Social sharing integration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Detailed badge modal with QR codes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span>Badge download & image generation</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Badge Detail Modal */}
        <BadgeDetailModal
          badge={selectedBadge}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          currentProgress={selectedBadge?.requiredValue ? Math.floor(selectedBadge.requiredValue * 0.7) : 0}
          tips={selectedBadge ? getBadgeTips(selectedBadge) : []}
          relatedBadges={selectedBadge ? getRelatedBadges(selectedBadge) : []}
          onBadgeClick={handleBadgeClick}
        />
      </div>
    </div>
  )
}

// Format badge date utility (local to avoid import issues)
function formatBadgeDate(dateString: string): string {
  if (!dateString) return 'Not earned'
  
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return 'Invalid date'
  }
}

// Main page component with provider
export default function BadgeSystemTestPage() {
  return (
    <BadgeNotificationProvider
      onBadgeShare={(badge) => {
        console.log('Badge shared:', badge.name)
      }}
    >
      <BadgeSystemDemo />
    </BadgeNotificationProvider>
  )
}
