/**
 * Badge Detail Modal - Detailed badge view with sharing functionality  
 * Part of Task 10: Badge System & Collection UI
 */

'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge as UIBadge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Share2, Download, Copy, ExternalLink, Calendar,
  Trophy, Target, Star, Users, Twitter, Facebook,
  Instagram, X, QrCode, Sparkles, Crown, CheckCircle2,
  TrendingUp, Clock, Award, Lightbulb
} from 'lucide-react'
import {
  type Badge,
  getBadgeRarityConfig,
  getBadgeCategoryConfig,
  formatBadgeDate
} from '@/lib/hooks/useBadges'
import { toast } from 'sonner'

interface BadgeDetailModalProps {
  badge: Badge | null
  isOpen: boolean
  onClose: () => void
  currentProgress?: number
  tips?: string[]
  relatedBadges?: Badge[]
  onBadgeClick?: (badge: Badge) => void
}

interface ShareOption {
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  action: (badge: Badge) => void
}

export default function BadgeDetailModal({
  badge,
  isOpen,
  onClose,
  currentProgress = 0,
  tips = [],
  relatedBadges = [],
  onBadgeClick
}: BadgeDetailModalProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  if (!badge) return null

  const isEarned = !!badge.earnedAt && badge.earnedAt !== ''
  const rarityConfig = getBadgeRarityConfig(badge.rarity)
  const categoryConfig = getBadgeCategoryConfig(badge.category)

  const progress = badge.requiredValue && !isEarned 
    ? Math.min(100, (currentProgress / badge.requiredValue) * 100)
    : isEarned ? 100 : 0

  // Generate shareable text
  const getShareText = () => {
    if (isEarned) {
      return `🏆 I just earned the "${badge.name}" badge on Cascais Fishing! ${badge.description} #CascaisFishing #Badge #Achievement`
    } else {
      return `🎯 Working towards the "${badge.name}" badge on Cascais Fishing! ${badge.description} #CascaisFishing #Goal`
    }
  }

  const getShareUrl = () => {
    return `https://cascaisfishing.com/badges/${badge.id}`
  }

  // Share options
  const shareOptions: ShareOption[] = [
    {
      name: 'Twitter',
      icon: Twitter,
      color: '#1DA1F2',
      action: (badge) => {
        const text = getShareText()
        const url = getShareUrl()
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`)
      }
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: '#1877F2',
      action: (badge) => {
        const url = getShareUrl()
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
      }
    },
    {
      name: 'Instagram',
      icon: Instagram,
      color: '#E4405F',
      action: (badge) => {
        // Instagram doesn't support direct sharing, so copy text to clipboard
        navigator.clipboard.writeText(getShareText())
        toast.success('Text copied! Share on Instagram Stories 📸')
      }
    },
    {
      name: 'Copy Link',
      icon: Copy,
      color: '#6B7280',
      action: (badge) => {
        navigator.clipboard.writeText(getShareUrl())
        toast.success('Link copied to clipboard! 📋')
      }
    }
  ]

  // Download badge as image
  const downloadBadgeImage = async () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 400
    canvas.height = 400

    // Clear canvas
    ctx.fillStyle = rarityConfig.color
    ctx.fillRect(0, 0, 400, 400)

    // Add gradient background
    const gradient = ctx.createRadialGradient(200, 200, 0, 200, 200, 200)
    gradient.addColorStop(0, `${rarityConfig.color}20`)
    gradient.addColorStop(1, `${rarityConfig.color}10`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 400)

    // Add badge info (simplified for canvas)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(badge.name, 200, 100)

    ctx.font = '16px Arial'
    ctx.fillText(badge.description || '', 200, 130)

    ctx.font = 'bold 20px Arial'
    ctx.fillText(badge.icon, 200, 200)

    ctx.font = '14px Arial'
    ctx.fillText(`${rarityConfig.label} ${categoryConfig.label}`, 200, 250)

    if (isEarned) {
      ctx.fillText(`Earned: ${formatBadgeDate(badge.earnedAt)}`, 200, 280)
    }

    ctx.fillText('Cascais Fishing', 200, 350)

    // Download
    const link = document.createElement('a')
    link.download = `badge-${badge.name.toLowerCase().replace(/\s+/g, '-')}.png`
    link.href = canvas.toDataURL()
    link.click()

    toast.success('Badge image downloaded! 📥')
  }

  const handleShare = async (option: ShareOption) => {
    setIsSharing(true)
    try {
      option.action(badge)
    } catch (error) {
      toast.error('Failed to share badge')
    } finally {
      setIsSharing(false)
    }
  }

  // Generate mock QR code (in real app, use a QR library)
  const generateQRCode = () => {
    return `data:image/svg+xml;base64,${btoa(`
      <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="120" height="120" fill="white"/>
        <rect x="10" y="10" width="100" height="100" fill="black"/>
        <rect x="20" y="20" width="80" height="80" fill="white"/>
        <text x="60" y="65" text-anchor="middle" fill="black" font-size="8">QR Code</text>
      </svg>
    `)}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Badge Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main badge display */}
          <Card className={`
            relative overflow-hidden border-2
            ${rarityConfig.borderColor} ${rarityConfig.bgColor}
          `}>
            {/* Sparkle animation for earned badges */}
            {isEarned && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                    style={{
                      left: `${15 + (i * 15)}%`,
                      top: `${10 + (i % 3) * 30}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                    }}
                  />
                ))}
              </div>
            )}

            <CardContent className="p-6 text-center relative z-10">
              {/* Badge icon */}
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="mb-4"
              >
                <div className={`
                  text-6xl mb-4 mx-auto inline-block
                  ${isEarned ? '' : 'filter grayscale opacity-60'}
                `}>
                  {badge.icon}
                </div>

                {/* Crown decoration for legendary/mythic */}
                {isEarned && ['LEGENDARY', 'MYTHIC'].includes(badge.rarity) && (
                  <motion.div
                    className="absolute top-4 right-4 text-yellow-400"
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  >
                    <Crown className="w-8 h-8" />
                  </motion.div>
                )}
              </motion.div>

              {/* Badge name and description */}
              <h2 className={`
                text-2xl font-bold mb-2
                ${isEarned ? 'text-foreground' : 'text-muted-foreground'}
              `}>
                {badge.name}
              </h2>

              <p className={`
                text-muted-foreground mb-4 max-w-md mx-auto
                ${isEarned ? '' : 'opacity-70'}
              `}>
                {badge.description}
              </p>

              {/* Category and rarity badges */}
              <div className="flex justify-center gap-3 mb-4">
                <UIBadge 
                  variant="secondary" 
                  className={`${categoryConfig.color} bg-white/20 border-current`}
                >
                  {categoryConfig.icon} {categoryConfig.label}
                </UIBadge>
                
                <UIBadge 
                  variant="outline"
                  className={`${rarityConfig.textColor} ${rarityConfig.borderColor} bg-white/20`}
                  style={{ color: rarityConfig.color, borderColor: rarityConfig.color }}
                >
                  <Star className="w-3 h-3 mr-1" />
                  {rarityConfig.label}
                </UIBadge>
              </div>

              {/* Status and progress */}
              {isEarned ? (
                <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    Earned on {formatBadgeDate(badge.earnedAt)}
                  </span>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Target className="w-5 h-5" />
                    <span>Not earned yet</span>
                  </div>
                  
                  {badge.requiredValue && (
                    <div className="max-w-xs mx-auto">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span>{currentProgress}/{badge.requiredValue}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(progress)}% complete
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {isEarned && (
              <>
                <Button
                  onClick={() => setIsSharing(!isSharing)}
                  className="flex-1 min-w-[120px]"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Badge
                </Button>
                
                <Button
                  variant="outline"
                  onClick={downloadBadgeImage}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowQR(!showQR)}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
              </>
            )}

            <Button
              variant="outline"
              onClick={() => {
                onClose()
                // Navigate to badge collection (would be implemented with router)
                toast.info('Opening badge collection...')
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View in Collection
            </Button>
          </div>

          {/* Sharing options */}
          <AnimatePresence>
            {isSharing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Share Your Badge</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {shareOptions.map((option) => {
                        const Icon = option.icon
                        return (
                          <Button
                            key={option.name}
                            variant="outline"
                            onClick={() => handleShare(option)}
                            disabled={isSharing}
                            className="flex-col h-auto py-3 px-2"
                            style={{ borderColor: option.color + '40' }}
                          >
                            <Icon 
                              className="w-6 h-6 mb-1" 
                              style={{ color: option.color }}
                            />
                            <span className="text-xs">{option.name}</span>
                          </Button>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* QR Code */}
          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">QR Code</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className="inline-block p-4 bg-white rounded-lg mb-4">
                      <img 
                        src={generateQRCode()} 
                        alt="Badge QR Code"
                        className="w-32 h-32"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Scan to share this badge
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips and recommendations */}
          {tips.length > 0 && !isEarned && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Tips to Earn This Badge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Related badges */}
          {relatedBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Related Badges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {relatedBadges.map((relatedBadge) => {
                    const isRelatedEarned = !!relatedBadge.earnedAt && relatedBadge.earnedAt !== ''
                    const relatedRarityConfig = getBadgeRarityConfig(relatedBadge.rarity)
                    
                    return (
                      <motion.div
                        key={relatedBadge.id}
                        className="flex-shrink-0 cursor-pointer group"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onBadgeClick?.(relatedBadge)}
                      >
                        <Card className={`
                          w-24 border-2 transition-all
                          ${isRelatedEarned 
                            ? `${relatedRarityConfig.borderColor} ${relatedRarityConfig.bgColor}` 
                            : 'border-muted bg-muted/20'
                          }
                        `}>
                          <CardContent className="p-3 text-center">
                            <div className={`
                              text-2xl mb-1
                              ${isRelatedEarned ? '' : 'filter grayscale opacity-60'}
                            `}>
                              {relatedBadge.icon}
                            </div>
                            <p className="text-xs font-medium truncate">
                              {relatedBadge.name}
                            </p>
                            {isRelatedEarned && (
                              <CheckCircle2 className="w-3 h-3 text-green-500 mx-auto mt-1" />
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Hidden canvas for image generation */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
