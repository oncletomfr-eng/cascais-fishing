/**
 * Achievement Celebration Effects - Complete celebration system for achievement unlocks
 * Part of Task 9.3: Badge Unlock Celebration Effects
 */

'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Trophy, Star, Crown, Award, Medal, Zap,
  Share2, Download, Copy, CheckCircle, Sparkles,
  Volume2, VolumeX, Facebook, Twitter, Instagram
} from 'lucide-react'
import { useConfetti, confettiPresets } from '@/lib/hooks/useConfetti'
import { toast } from 'sonner'

// Types
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC'
  unlocked: boolean
  unlockedAt?: Date
  progress: number
  maxProgress: number
}

export interface CelebrationConfig {
  showConfetti: boolean
  showScreenShake: boolean
  showGlowEffect: boolean
  showParticles: boolean
  playSound: boolean
  showShareableScreen: boolean
  showNotification: boolean
  intensity: 'subtle' | 'medium' | 'intense' | 'legendary'
}

interface CelebrationProps {
  achievement: Achievement
  isTriggered: boolean
  onComplete?: () => void
  config?: Partial<CelebrationConfig>
  className?: string
}

// Default celebration configs by rarity
const CELEBRATION_CONFIGS: Record<Achievement['rarity'], CelebrationConfig> = {
  COMMON: {
    showConfetti: true,
    showScreenShake: false,
    showGlowEffect: true,
    showParticles: true,
    playSound: true,
    showShareableScreen: false,
    showNotification: true,
    intensity: 'subtle'
  },
  UNCOMMON: {
    showConfetti: true,
    showScreenShake: false,
    showGlowEffect: true,
    showParticles: true,
    playSound: true,
    showShareableScreen: false,
    showNotification: true,
    intensity: 'medium'
  },
  RARE: {
    showConfetti: true,
    showScreenShake: true,
    showGlowEffect: true,
    showParticles: true,
    playSound: true,
    showShareableScreen: true,
    showNotification: true,
    intensity: 'medium'
  },
  EPIC: {
    showConfetti: true,
    showScreenShake: true,
    showGlowEffect: true,
    showParticles: true,
    playSound: true,
    showShareableScreen: true,
    showNotification: true,
    intensity: 'intense'
  },
  LEGENDARY: {
    showConfetti: true,
    showScreenShake: true,
    showGlowEffect: true,
    showParticles: true,
    playSound: true,
    showShareableScreen: true,
    showNotification: true,
    intensity: 'legendary'
  },
  MYTHIC: {
    showConfetti: true,
    showScreenShake: true,
    showGlowEffect: true,
    showParticles: true,
    playSound: true,
    showShareableScreen: true,
    showNotification: true,
    intensity: 'legendary'
  }
}

// Rarity colors and effects
const RARITY_CONFIG = {
  COMMON: { 
    color: '#6b7280', 
    bgColor: 'bg-gray-500/20', 
    glowColor: '#6b728080',
    confettiColors: ['#6b7280', '#9ca3af', '#d1d5db']
  },
  UNCOMMON: { 
    color: '#10b981', 
    bgColor: 'bg-green-500/20', 
    glowColor: '#10b98180',
    confettiColors: ['#10b981', '#34d399', '#6ee7b7']
  },
  RARE: { 
    color: '#3b82f6', 
    bgColor: 'bg-blue-500/20', 
    glowColor: '#3b82f680',
    confettiColors: ['#3b82f6', '#60a5fa', '#93c5fd']
  },
  EPIC: { 
    color: '#8b5cf6', 
    bgColor: 'bg-purple-500/20', 
    glowColor: '#8b5cf680',
    confettiColors: ['#8b5cf6', '#a78bfa', '#c4b5fd']
  },
  LEGENDARY: { 
    color: '#f59e0b', 
    bgColor: 'bg-amber-500/20', 
    glowColor: '#f59e0b80',
    confettiColors: ['#f59e0b', '#fbbf24', '#fcd34d']
  },
  MYTHIC: { 
    color: '#ec4899', 
    bgColor: 'bg-pink-500/20', 
    glowColor: '#ec489980',
    confettiColors: ['#ec4899', '#f472b6', '#f9a8d4']
  }
}

// Sound effects using Web Audio API
class SoundEffects {
  private audioContext: AudioContext | null = null
  private enabled: boolean = true

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (e) {
        console.warn('Web Audio API not supported')
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.1) {
    if (!this.audioContext || !this.enabled) return

    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime)
    oscillator.type = type
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration)
    
    oscillator.start()
    oscillator.stop(this.audioContext.currentTime + duration)
  }

  playUnlockSound(rarity: Achievement['rarity']) {
    if (!this.enabled) return

    switch (rarity) {
      case 'COMMON':
        this.createTone(440, 0.2, 'sine', 0.05)
        break
      case 'UNCOMMON':
        this.createTone(523.25, 0.3, 'sine', 0.08)
        setTimeout(() => this.createTone(659.25, 0.2, 'sine', 0.06), 100)
        break
      case 'RARE':
        this.createTone(659.25, 0.3, 'square', 0.08)
        setTimeout(() => this.createTone(783.99, 0.3, 'square', 0.08), 150)
        break
      case 'EPIC':
        // Epic chord progression
        this.createTone(523.25, 0.4, 'sawtooth', 0.1)
        setTimeout(() => this.createTone(659.25, 0.4, 'sawtooth', 0.1), 100)
        setTimeout(() => this.createTone(783.99, 0.6, 'sawtooth', 0.1), 200)
        break
      case 'LEGENDARY':
        // Legendary fanfare
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          setTimeout(() => this.createTone(freq, 0.5, 'sawtooth', 0.12), i * 120)
        })
        break
      case 'MYTHIC':
        // Mythic divine sound
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
          setTimeout(() => this.createTone(freq, 0.6, 'sine', 0.15), i * 100)
        })
        // Add harmonic
        setTimeout(() => {
          [1046.5, 1318.5, 1567.98].forEach((freq, i) => {
            setTimeout(() => this.createTone(freq, 0.4, 'triangle', 0.08), i * 80)
          })
        }, 300)
        break
    }
  }
}

const soundEffects = new SoundEffects()

// Screen shake hook
function useScreenShake() {
  const [isShaking, setIsShaking] = useState(false)
  
  const shake = useCallback((intensity: CelebrationConfig['intensity']) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    
    setIsShaking(true)
    document.body.classList.add(`screen-shake-${intensity}`)
    
    const duration = {
      subtle: 300,
      medium: 500,
      intense: 800,
      legendary: 1200
    }[intensity]
    
    setTimeout(() => {
      setIsShaking(false)
      document.body.classList.remove(`screen-shake-${intensity}`)
    }, duration)
  }, [])
  
  return { shake, isShaking }
}

// Particle effects component
function ParticleEffects({ 
  isActive, 
  rarity, 
  intensity = 'medium' 
}: { 
  isActive: boolean
  rarity: Achievement['rarity']
  intensity?: CelebrationConfig['intensity']
}) {
  const particleCount = {
    subtle: 15,
    medium: 25,
    intense: 40,
    legendary: 60
  }[intensity]

  const rarityConfig = RARITY_CONFIG[rarity]

  if (!isActive) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: particleCount }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{ backgroundColor: rarityConfig.confettiColors[i % rarityConfig.confettiColors.length] }}
          initial={{
            x: '50vw',
            y: '50vh',
            scale: 0,
            rotate: 0,
            opacity: 0
          }}
          animate={{
            x: `${50 + (Math.random() - 0.5) * 200}vw`,
            y: `${50 + (Math.random() - 0.5) * 200}vh`,
            scale: [0, Math.random() * 2 + 0.5, 0],
            rotate: Math.random() * 720,
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: Math.random() * 2 + 1.5,
            delay: Math.random() * 0.5,
            ease: "easeOut"
          }}
        />
      ))}
    </div>
  )
}

// Badge reveal animation
function BadgeRevealAnimation({ 
  achievement, 
  isRevealing, 
  onRevealComplete 
}: {
  achievement: Achievement
  isRevealing: boolean
  onRevealComplete?: () => void
}) {
  const controls = useAnimation()
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  useEffect(() => {
    if (isRevealing) {
      const sequence = async () => {
        // Initial scale up with glow
        await controls.start({
          scale: [0, 1.3, 1],
          rotate: [0, 10, -10, 0],
          filter: [
            'brightness(1) drop-shadow(0 0 0px transparent)',
            `brightness(1.5) drop-shadow(0 0 20px ${rarityConfig.glowColor})`,
            `brightness(1.2) drop-shadow(0 0 10px ${rarityConfig.glowColor})`
          ],
          transition: { duration: 1.2, ease: "backOut" }
        })
        
        onRevealComplete?.()
      }
      sequence()
    }
  }, [isRevealing, controls, rarityConfig.glowColor, onRevealComplete])

  const getRarityIcon = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'COMMON': return Medal
      case 'UNCOMMON': return Award
      case 'RARE': return Trophy
      case 'EPIC': return Star
      case 'LEGENDARY': return Crown
      case 'MYTHIC': return Zap
      default: return Medal
    }
  }

  const Icon = getRarityIcon(achievement.rarity)

  return (
    <motion.div
      animate={controls}
      className="relative"
    >
      <div 
        className={`relative p-6 rounded-full ${rarityConfig.bgColor} border-2 border-current`}
        style={{ borderColor: rarityConfig.color }}
      >
        <Icon 
          className="w-12 h-12 mx-auto" 
          style={{ color: rarityConfig.color }}
        />
        <div className="absolute inset-0 rounded-full animate-pulse"
          style={{ 
            boxShadow: `0 0 30px ${rarityConfig.glowColor}`,
            opacity: isRevealing ? 0.6 : 0
          }}
        />
      </div>
    </motion.div>
  )
}

// Shareable celebration screen
function ShareableScreen({ 
  achievement, 
  isVisible, 
  onClose 
}: {
  achievement: Achievement
  isVisible: boolean
  onClose: () => void
}) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  const shareToSocial = (platform: 'twitter' | 'facebook' | 'instagram') => {
    const text = `🏆 Just unlocked "${achievement.name}" achievement in Cascais Fishing! ${achievement.description}`
    const url = window.location.origin
    
    let shareUrl = ''
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
        break
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`
        break
      case 'instagram':
        toast.info('Copy the achievement text and share on Instagram!')
        navigator.clipboard.writeText(text)
        return
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400')
  }

  const copyToClipboard = () => {
    const text = `🏆 Just unlocked "${achievement.name}" achievement! ${achievement.description}`
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Achievement text copied to clipboard!')
    })
  }

  const downloadImage = () => {
    // In a real implementation, this would generate an image
    toast.info('Image download feature would be implemented here')
  }

  useEffect(() => {
    soundEffects.setEnabled(soundEnabled)
  }, [soundEnabled])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0, rotate: -10, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: 10, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative max-w-md w-full mx-4"
        >
          <Card className="relative overflow-hidden border-2" style={{ borderColor: rarityConfig.color }}>
            {/* Background glow */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{ 
                background: `radial-gradient(circle at center, ${rarityConfig.glowColor} 0%, transparent 70%)`
              }}
            />
            
            <CardContent className="p-8 text-center relative z-10">
              {/* Achievement icon */}
              <div className="mb-6">
                <BadgeRevealAnimation 
                  achievement={achievement} 
                  isRevealing={true}
                />
              </div>

              {/* Achievement details */}
              <div className="space-y-4">
                <Badge 
                  variant="secondary" 
                  className="mb-2"
                  style={{ backgroundColor: rarityConfig.bgColor, color: rarityConfig.color }}
                >
                  {achievement.rarity}
                </Badge>
                
                <h2 className="text-2xl font-bold text-foreground">
                  {achievement.name}
                </h2>
                
                <p className="text-muted-foreground">
                  {achievement.description}
                </p>

                {achievement.unlockedAt && (
                  <p className="text-sm text-muted-foreground">
                    Unlocked on {achievement.unlockedAt.toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => shareToSocial('twitter')}
                  className="flex items-center gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => shareToSocial('facebook')}
                  className="flex items-center gap-2"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={downloadImage}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Image
                </Button>
              </div>

              {/* Sound toggle */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="flex items-center gap-2"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Sound {soundEnabled ? 'On' : 'Off'}
                </Button>
              </div>

              {/* Close button */}
              <Button
                onClick={onClose}
                className="mt-6 w-full"
                style={{ backgroundColor: rarityConfig.color }}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// Main celebration component
export function AchievementCelebration({
  achievement,
  isTriggered,
  onComplete,
  config: customConfig,
  className = ''
}: CelebrationProps) {
  const [celebrationPhase, setCelebrationPhase] = useState<'idle' | 'confetti' | 'reveal' | 'share' | 'complete'>('idle')
  const [showShareable, setShowShareable] = useState(false)
  const { fireConfetti, fireFromElement, fireCelebration } = useConfetti()
  const { shake } = useScreenShake()
  const elementRef = useRef<HTMLDivElement>(null)

  const config = { ...CELEBRATION_CONFIGS[achievement.rarity], ...customConfig }
  const rarityConfig = RARITY_CONFIG[achievement.rarity]

  // Main celebration sequence
  useEffect(() => {
    if (isTriggered && celebrationPhase === 'idle') {
      const runCelebration = async () => {
        setCelebrationPhase('confetti')

        // Play sound
        if (config.playSound) {
          soundEffects.playUnlockSound(achievement.rarity)
        }

        // Screen shake
        if (config.showScreenShake) {
          shake(config.intensity)
        }

        // Confetti effects
        if (config.showConfetti) {
          if (config.intensity === 'legendary') {
            fireCelebration()
          } else {
            const confettiConfig = {
              particleCount: {
                subtle: 50,
                medium: 100,
                intense: 200,
                legendary: 300
              }[config.intensity],
              spread: {
                subtle: 45,
                medium: 70,
                intense: 100,
                legendary: 120
              }[config.intensity],
              colors: rarityConfig.confettiColors,
              origin: { y: 0.6 },
              scalar: config.intensity === 'subtle' ? 0.8 : config.intensity === 'intense' ? 1.2 : 1
            }

            await fireConfetti(confettiConfig)

            // Additional burst from element for epic+ achievements
            if (['EPIC', 'LEGENDARY', 'MYTHIC'].includes(achievement.rarity) && elementRef.current) {
              setTimeout(() => {
                fireFromElement(elementRef.current!, confettiConfig)
              }, 500)
            }
          }
        }

        // Move to reveal phase
        setTimeout(() => {
          setCelebrationPhase('reveal')
        }, 800)
      }

      runCelebration()
    }
  }, [isTriggered, celebrationPhase, achievement.rarity, config, fireConfetti, fireFromElement, fireCelebration, shake])

  const handleRevealComplete = () => {
    // Show notification
    if (config.showNotification) {
      toast.success(
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: rarityConfig.color }} />
          <div>
            <div className="font-semibold">{achievement.name} Unlocked!</div>
            <div className="text-sm text-muted-foreground">{achievement.description}</div>
          </div>
        </div>,
        { duration: 4000 }
      )
    }

    // Move to share phase for rare+ achievements
    if (config.showShareableScreen && ['RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'].includes(achievement.rarity)) {
      setTimeout(() => {
        setCelebrationPhase('share')
        setShowShareable(true)
      }, 1000)
    } else {
      // Complete immediately
      setTimeout(() => {
        setCelebrationPhase('complete')
        onComplete?.()
      }, 1500)
    }
  }

  const handleShareClose = () => {
    setShowShareable(false)
    setCelebrationPhase('complete')
    onComplete?.()
  }

  if (celebrationPhase === 'idle') return null

  return (
    <>
      {/* Particle effects */}
      {config.showParticles && (
        <ParticleEffects 
          isActive={celebrationPhase === 'confetti' || celebrationPhase === 'reveal'}
          rarity={achievement.rarity}
          intensity={config.intensity}
        />
      )}

      {/* Celebration display */}
      {(celebrationPhase === 'reveal' || celebrationPhase === 'share') && (
        <div className={`fixed inset-0 z-40 flex items-center justify-center pointer-events-none ${className}`}>
          <motion.div
            ref={elementRef}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-center pointer-events-auto"
          >
            <BadgeRevealAnimation
              achievement={achievement}
              isRevealing={celebrationPhase === 'reveal'}
              onRevealComplete={handleRevealComplete}
            />
            
            {/* Achievement name */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 space-y-2"
            >
              <Badge variant="secondary" style={{ color: rarityConfig.color }}>
                {achievement.rarity}
              </Badge>
              <h3 className="text-xl font-bold text-foreground">
                {achievement.name}
              </h3>
            </motion.div>

            {/* Glow effect */}
            {config.showGlowEffect && (
              <motion.div
                className="absolute inset-0 rounded-full pointer-events-none -z-10"
                animate={{
                  boxShadow: [
                    '0 0 0px transparent',
                    `0 0 40px ${rarityConfig.glowColor}`,
                    `0 0 20px ${rarityConfig.glowColor}`
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              />
            )}
          </motion.div>
        </div>
      )}

      {/* Shareable screen */}
      <ShareableScreen
        achievement={achievement}
        isVisible={showShareable}
        onClose={handleShareClose}
      />
    </>
  )
}

// Enhanced confetti presets for achievements
export const achievementConfettiPresets = {
  common: {
    particleCount: 50,
    spread: 45,
    colors: RARITY_CONFIG.COMMON.confettiColors,
    scalar: 0.8
  },
  uncommon: {
    particleCount: 75,
    spread: 60,
    colors: RARITY_CONFIG.UNCOMMON.confettiColors,
    scalar: 0.9
  },
  rare: {
    particleCount: 100,
    spread: 80,
    colors: RARITY_CONFIG.RARE.confettiColors,
    scalar: 1.0
  },
  epic: {
    particleCount: 150,
    spread: 100,
    colors: RARITY_CONFIG.EPIC.confettiColors,
    scalar: 1.2
  },
  legendary: {
    particleCount: 200,
    spread: 120,
    colors: RARITY_CONFIG.LEGENDARY.confettiColors,
    scalar: 1.5
  },
  mythic: {
    particleCount: 300,
    spread: 140,
    colors: RARITY_CONFIG.MYTHIC.confettiColors,
    scalar: 1.8
  }
}

export default AchievementCelebration
