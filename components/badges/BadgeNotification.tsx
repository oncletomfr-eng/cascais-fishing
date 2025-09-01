/**
 * Badge Notification Components - Animated notifications for badge earning
 * Part of Task 10: Badge System & Collection UI
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge as UIBadge } from '@/components/ui/badge'
import { 
  X, Share2, Trophy, Sparkles, Star, 
  Crown, Award, CheckCircle2 
} from 'lucide-react'
import confetti from 'canvas-confetti'
import {
  type Badge,
  getBadgeRarityConfig,
  getBadgeCategoryConfig
} from '@/lib/hooks/useBadges'
import { toast } from 'sonner'

// Badge notification types
export interface BadgeNotification {
  id: string
  badge: Badge
  timestamp: number
  type: 'earned' | 'progress' | 'milestone'
  message?: string
}

interface BadgeEarnedNotificationProps {
  badge: Badge
  onClose: () => void
  onShare: (badge: Badge) => void
  autoClose?: number
  showConfetti?: boolean
}

export function BadgeEarnedNotification({
  badge,
  onClose,
  onShare,
  autoClose = 8000,
  showConfetti = true
}: BadgeEarnedNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const rarityConfig = getBadgeRarityConfig(badge.rarity)
  const categoryConfig = getBadgeCategoryConfig(badge.category)

  // Auto close notification
  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose])

  // Trigger confetti on mount
  useEffect(() => {
    if (showConfetti) {
      triggerConfetti(badge.rarity)
    }
  }, [showConfetti, badge.rarity])

  const triggerConfetti = useCallback((rarity: Badge['rarity']) => {
    const rarityConfig = getBadgeRarityConfig(rarity)
    
    const configs = {
      COMMON: { particleCount: 50, spread: 50 },
      UNCOMMON: { particleCount: 75, spread: 60 },
      RARE: { particleCount: 100, spread: 70 },
      EPIC: { particleCount: 150, spread: 80 },
      LEGENDARY: { particleCount: 200, spread: 90 },
      MYTHIC: { particleCount: 300, spread: 100 }
    }

    const config = configs[rarity] || configs.COMMON

    // Primary burst
    confetti({
      particleCount: config.particleCount,
      spread: config.spread,
      origin: { y: 0.3 },
      colors: [rarityConfig.color, '#FFD700', '#FF6B35']
    })

    // For higher rarities, add extra effects
    if (['LEGENDARY', 'MYTHIC'].includes(rarity)) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 50,
          origin: { y: 0.4 },
          colors: [rarityConfig.color, '#FFFFFF']
        })
      }, 300)
    }
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const handleShare = () => {
    onShare(badge)
    toast.success('Badge shared! 🎉')
  }

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: -50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.5, y: -50 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 30,
          duration: 0.6
        }}
        className="fixed top-4 right-4 z-50 max-w-sm"
      >
        <Card className={`
          relative overflow-hidden border-2 shadow-2xl
          ${rarityConfig.borderColor} ${rarityConfig.bgColor}
          backdrop-blur-sm
        `}>
          {/* Background glow effect */}
          <div className={`
            absolute inset-0 opacity-30
            bg-gradient-to-br from-transparent via-white/20 to-transparent
            animate-pulse
          `} />

          {/* Sparkle animation overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                style={{
                  left: `${20 + (i * 10)}%`,
                  top: `${15 + (i % 3) * 25}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          <CardContent className="p-4 relative z-10">
            {/* Header with close button */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-bold text-sm text-yellow-600">
                  BADGE EARNED!
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Badge display */}
            <div className="text-center mb-4">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 20,
                  delay: 0.3 
                }}
                className="text-4xl mb-2"
              >
                {badge.icon}
              </motion.div>

              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="font-bold text-lg mb-1"
              >
                {badge.name}
              </motion.h3>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm text-muted-foreground mb-3"
              >
                {badge.description}
              </motion.p>

              {/* Category and rarity badges */}
              <div className="flex justify-center gap-2 mb-3">
                <UIBadge 
                  variant="secondary" 
                  className={`text-xs ${categoryConfig.color} bg-white/20 border-current`}
                >
                  {categoryConfig.icon} {categoryConfig.label}
                </UIBadge>
                
                <UIBadge 
                  variant="outline"
                  className={`text-xs ${rarityConfig.textColor} ${rarityConfig.borderColor} bg-white/20`}
                  style={{ color: rarityConfig.color, borderColor: rarityConfig.color }}
                >
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ✨ {rarityConfig.label}
                  </motion.span>
                </UIBadge>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleShare}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="bg-white/20 border-white/30 hover:bg-white/30"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Got it!
              </Button>
            </div>
          </CardContent>

          {/* Rarity-specific decoration */}
          {['LEGENDARY', 'MYTHIC'].includes(badge.rarity) && (
            <motion.div
              className="absolute -top-2 -right-2 text-yellow-400"
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <Crown className="w-6 h-6" />
            </motion.div>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

interface BadgeProgressNotificationProps {
  badge: Badge
  currentProgress: number
  previousProgress: number
  onClose: () => void
  autoClose?: number
}

export function BadgeProgressNotification({
  badge,
  currentProgress,
  previousProgress,
  onClose,
  autoClose = 5000
}: BadgeProgressNotificationProps) {
  const [isVisible, setIsVisible] = useState(true)
  const rarityConfig = getBadgeRarityConfig(badge.rarity)
  const progress = badge.requiredValue ? (currentProgress / badge.requiredValue) * 100 : 0
  const progressIncrease = currentProgress - previousProgress

  useEffect(() => {
    if (autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, autoClose)
      return () => clearTimeout(timer)
    }
  }, [autoClose])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="fixed bottom-4 right-4 z-50 max-w-xs"
    >
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Progress Update</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-5 w-5 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{badge.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{badge.name}</p>
              <p className="text-xs text-muted-foreground">
                +{progressIncrease} progress
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {badge.requiredValue && (
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span>{currentProgress}/{badge.requiredValue}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <motion.div
                  className={`h-1.5 rounded-full bg-blue-500`}
                  initial={{ width: `${((previousProgress) / badge.requiredValue) * 100}%` }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Context and provider for managing badge notifications
interface BadgeNotificationContextType {
  showBadgeEarned: (badge: Badge) => void
  showBadgeProgress: (badge: Badge, currentProgress: number, previousProgress: number) => void
  clearNotifications: () => void
}

const BadgeNotificationContext = React.createContext<BadgeNotificationContextType | undefined>(undefined)

interface BadgeNotificationProviderProps {
  children: React.ReactNode
  onBadgeShare?: (badge: Badge) => void
}

export function BadgeNotificationProvider({ 
  children, 
  onBadgeShare 
}: BadgeNotificationProviderProps) {
  const [earnedNotifications, setEarnedNotifications] = useState<Badge[]>([])
  const [progressNotifications, setProgressNotifications] = useState<Array<{
    badge: Badge
    currentProgress: number
    previousProgress: number
    id: string
  }>>([])

  const showBadgeEarned = useCallback((badge: Badge) => {
    setEarnedNotifications(prev => [...prev, badge])
  }, [])

  const showBadgeProgress = useCallback((badge: Badge, currentProgress: number, previousProgress: number) => {
    const id = `${badge.id}-${Date.now()}`
    setProgressNotifications(prev => [...prev, {
      badge,
      currentProgress,
      previousProgress,
      id
    }])
  }, [])

  const clearNotifications = useCallback(() => {
    setEarnedNotifications([])
    setProgressNotifications([])
  }, [])

  const removeEarnedNotification = useCallback((badgeId: string) => {
    setEarnedNotifications(prev => prev.filter(badge => badge.id !== badgeId))
  }, [])

  const removeProgressNotification = useCallback((id: string) => {
    setProgressNotifications(prev => prev.filter(item => item.id !== id))
  }, [])

  const handleBadgeShare = useCallback((badge: Badge) => {
    onBadgeShare?.(badge)
  }, [onBadgeShare])

  const contextValue: BadgeNotificationContextType = {
    showBadgeEarned,
    showBadgeProgress,
    clearNotifications
  }

  return (
    <BadgeNotificationContext.Provider value={contextValue}>
      {children}

      {/* Earned badge notifications */}
      <AnimatePresence>
        {earnedNotifications.map((badge, index) => (
          <motion.div 
            key={badge.id} 
            style={{ top: `${4 + index * 16}rem` }}
            className="fixed right-4 z-50"
          >
            <BadgeEarnedNotification
              badge={badge}
              onClose={() => removeEarnedNotification(badge.id)}
              onShare={handleBadgeShare}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Progress notifications */}
      <AnimatePresence>
        {progressNotifications.map((item, index) => (
          <motion.div 
            key={item.id}
            style={{ bottom: `${4 + index * 8}rem` }}
            className="fixed right-4 z-50"
          >
            <BadgeProgressNotification
              badge={item.badge}
              currentProgress={item.currentProgress}
              previousProgress={item.previousProgress}
              onClose={() => removeProgressNotification(item.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </BadgeNotificationContext.Provider>
  )
}

// Hook for using badge notifications
export function useBadgeNotifications() {
  const context = React.useContext(BadgeNotificationContext)
  if (context === undefined) {
    throw new Error('useBadgeNotifications must be used within a BadgeNotificationProvider')
  }
  return context
}

export default BadgeNotificationProvider
