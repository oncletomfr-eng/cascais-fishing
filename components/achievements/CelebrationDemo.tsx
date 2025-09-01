/**
 * Celebration Demo - Comprehensive demonstration of achievement celebration effects
 * Part of Task 9.3: Badge Unlock Celebration Effects
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import {
  Trophy, Star, Crown, Award, Medal, Zap,
  Play, Pause, RotateCcw, Volume2, VolumeX,
  Sparkles, Target, Calendar, Settings
} from 'lucide-react'
import { AchievementCelebration, type Achievement, type CelebrationConfig } from './AchievementCelebration'
import { toast } from 'sonner'

// Demo achievements for testing
const DEMO_ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    name: 'First Catch',
    description: 'Caught your very first fish!',
    icon: '🎣',
    category: 'MILESTONE',
    rarity: 'COMMON',
    unlocked: true,
    progress: 1,
    maxProgress: 1,
    unlockedAt: new Date('2024-08-10')
  },
  {
    id: '2',
    name: 'Species Explorer',
    description: 'Discovered 5 different fish species',
    icon: '🐠',
    category: 'FISH_SPECIES',
    rarity: 'UNCOMMON',
    unlocked: true,
    progress: 5,
    maxProgress: 5,
    unlockedAt: new Date('2024-08-15')
  },
  {
    id: '3',
    name: 'Deep Sea Master',
    description: 'Successfully completed 10 deep sea fishing trips',
    icon: '🌊',
    category: 'TECHNIQUE',
    rarity: 'RARE',
    unlocked: true,
    progress: 10,
    maxProgress: 10,
    unlockedAt: new Date('2024-08-20')
  },
  {
    id: '4',
    name: 'Social Fisherman',
    description: 'Organized 15 community fishing events',
    icon: '👥',
    category: 'SOCIAL',
    rarity: 'EPIC',
    unlocked: true,
    progress: 15,
    maxProgress: 15,
    unlockedAt: new Date('2024-08-25')
  },
  {
    id: '5',
    name: 'Grand Master Angler',
    description: 'Achieved mastery in all fishing techniques',
    icon: '🏆',
    category: 'ACHIEVEMENT',
    rarity: 'LEGENDARY',
    unlocked: true,
    progress: 100,
    maxProgress: 100,
    unlockedAt: new Date('2024-08-30')
  },
  {
    id: '6',
    name: 'Ocean Guardian',
    description: 'Protected marine life and achieved perfect conservation score',
    icon: '🌟',
    category: 'SPECIAL',
    rarity: 'MYTHIC',
    unlocked: true,
    progress: 50,
    maxProgress: 50,
    unlockedAt: new Date('2024-09-01')
  }
]

export default function CelebrationDemo() {
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement>(DEMO_ACHIEVEMENTS[0])
  const [celebrationTriggered, setCelebrationTriggered] = useState(false)
  const [celebrationInProgress, setCelebrationInProgress] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [customConfig, setCustomConfig] = useState<Partial<CelebrationConfig>>({})
  const [autoDemo, setAutoDemo] = useState(false)
  const [autoDemoProgress, setAutoDemoProgress] = useState(0)

  // Auto demo functionality
  useEffect(() => {
    if (!autoDemo) return

    const interval = setInterval(() => {
      if (!celebrationInProgress) {
        const currentIndex = DEMO_ACHIEVEMENTS.findIndex(a => a.id === selectedAchievement.id)
        const nextIndex = (currentIndex + 1) % DEMO_ACHIEVEMENTS.length
        
        setSelectedAchievement(DEMO_ACHIEVEMENTS[nextIndex])
        setAutoDemoProgress(((nextIndex + 1) / DEMO_ACHIEVEMENTS.length) * 100)
        
        // Trigger celebration after brief delay
        setTimeout(() => {
          triggerCelebration()
        }, 500)
      }
    }, 6000) // 6 seconds per achievement

    return () => clearInterval(interval)
  }, [autoDemo, selectedAchievement, celebrationInProgress])

  const triggerCelebration = () => {
    if (celebrationInProgress) return
    
    setCelebrationInProgress(true)
    setCelebrationTriggered(true)
    
    // Reset trigger after brief delay
    setTimeout(() => {
      setCelebrationTriggered(false)
    }, 100)
  }

  const handleCelebrationComplete = () => {
    setCelebrationInProgress(false)
    
    if (!autoDemo) {
      toast.success('Celebration complete! 🎉', {
        description: `${selectedAchievement.name} celebration finished`
      })
    }
  }

  const resetDemo = () => {
    setCelebrationTriggered(false)
    setCelebrationInProgress(false)
    setAutoDemo(false)
    setAutoDemoProgress(0)
    setSelectedAchievement(DEMO_ACHIEVEMENTS[0])
  }

  const getRarityColor = (rarity: Achievement['rarity']) => {
    const colors = {
      COMMON: '#6b7280',
      UNCOMMON: '#10b981', 
      RARE: '#3b82f6',
      EPIC: '#8b5cf6',
      LEGENDARY: '#f59e0b',
      MYTHIC: '#ec4899'
    }
    return colors[rarity]
  }

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

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Achievement Celebration Demo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={triggerCelebration}
                disabled={celebrationInProgress}
                className="flex items-center gap-2"
                variant={celebrationInProgress ? "secondary" : "default"}
              >
                {celebrationInProgress ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Celebrating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Trigger Celebration
                  </>
                )}
              </Button>

              <Button
                onClick={() => setAutoDemo(!autoDemo)}
                variant={autoDemo ? "destructive" : "outline"}
                className="flex items-center gap-2"
              >
                {autoDemo ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoDemo ? 'Stop Auto Demo' : 'Auto Demo'}
              </Button>

              <Button
                onClick={resetDemo}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>

              <Button
                onClick={() => setSoundEnabled(!soundEnabled)}
                variant="ghost"
                className="flex items-center gap-2"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                Sound {soundEnabled ? 'On' : 'Off'}
              </Button>
            </div>

            {/* Auto Demo Progress */}
            {autoDemo && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Auto Demo Progress</span>
                  <span>{Math.round(autoDemoProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${autoDemoProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demo Content */}
      <Tabs defaultValue="achievements" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Achievements
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Info
          </TabsTrigger>
        </TabsList>

        {/* Achievement Selection */}
        <TabsContent value="achievements">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_ACHIEVEMENTS.map((achievement) => {
              const isSelected = achievement.id === selectedAchievement.id
              const RarityIcon = getRarityIcon(achievement.rarity)
              const rarityColor = getRarityColor(achievement.rarity)

              return (
                <motion.div
                  key={achievement.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedAchievement(achievement)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="p-2 rounded-full"
                          style={{ backgroundColor: `${rarityColor}20`, color: rarityColor }}
                        >
                          <RarityIcon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">
                              {achievement.name}
                            </h3>
                            <Badge 
                              variant="secondary" 
                              className="text-xs"
                              style={{ color: rarityColor }}
                            >
                              {achievement.rarity}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {achievement.description}
                          </p>
                          
                          <div className="text-xs text-muted-foreground mt-1">
                            Progress: {achievement.progress}/{achievement.maxProgress}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>

          {/* Selected Achievement Details */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedAchievement.icon}</span>
                Currently Selected: {selectedAchievement.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div><strong>Description:</strong> {selectedAchievement.description}</div>
                  <div><strong>Category:</strong> {selectedAchievement.category}</div>
                  <div><strong>Progress:</strong> {selectedAchievement.progress}/{selectedAchievement.maxProgress}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <strong>Rarity:</strong> 
                    <Badge style={{ color: getRarityColor(selectedAchievement.rarity) }}>
                      {selectedAchievement.rarity}
                    </Badge>
                  </div>
                  <div><strong>Unlocked:</strong> {selectedAchievement.unlockedAt?.toLocaleDateString()}</div>
                  <div><strong>Status:</strong> {selectedAchievement.unlocked ? '✅ Unlocked' : '🔒 Locked'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Settings */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Celebration Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Visual Effects</h4>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.showConfetti !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, showConfetti: e.target.checked }))}
                    />
                    Confetti Animation
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.showScreenShake !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, showScreenShake: e.target.checked }))}
                    />
                    Screen Shake
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.showGlowEffect !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, showGlowEffect: e.target.checked }))}
                    />
                    Glow Effects
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.showParticles !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, showParticles: e.target.checked }))}
                    />
                    Particle Effects
                  </label>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Features</h4>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.playSound !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, playSound: e.target.checked }))}
                    />
                    Sound Effects
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.showShareableScreen !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, showShareableScreen: e.target.checked }))}
                    />
                    Shareable Screen
                  </label>
                  <label className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={customConfig.showNotification !== false}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, showNotification: e.target.checked }))}
                    />
                    Toast Notifications
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Intensity Level</h4>
                <div className="flex gap-2">
                  {(['subtle', 'medium', 'intense', 'legendary'] as const).map((intensity) => (
                    <Button
                      key={intensity}
                      variant={customConfig.intensity === intensity ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCustomConfig(prev => ({ ...prev, intensity }))}
                      className="capitalize"
                    >
                      {intensity}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Information Tab */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Celebration Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">🎊 Visual Effects</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Rarity-specific confetti colors</li>
                      <li>• Particle animations with physics</li>
                      <li>• Screen shake based on achievement rarity</li>
                      <li>• Badge reveal animations with glow</li>
                      <li>• Intensity scaling by rarity level</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">🔊 Audio System</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Web Audio API sound generation</li>
                      <li>• Rarity-specific sound sequences</li>
                      <li>• Chord progressions for epic achievements</li>
                      <li>• Harmonic overlays for mythic unlocks</li>
                      <li>• User-controllable sound toggle</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">📱 Sharing Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Social media integration</li>
                      <li>• Clipboard copying functionality</li>
                      <li>• Image download capability</li>
                      <li>• Custom share screens for rare+ achievements</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  Rarity System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const).map((rarity) => {
                    const RarityIcon = getRarityIcon(rarity)
                    const color = getRarityColor(rarity)
                    return (
                      <div key={rarity} className="flex items-center gap-3 p-2 rounded-lg border">
                        <RarityIcon className="w-5 h-5" style={{ color }} />
                        <div className="flex-1">
                          <Badge variant="secondary" style={{ color }}>
                            {rarity}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {rarity === 'COMMON' && 'Simple celebration'}
                          {rarity === 'UNCOMMON' && 'Enhanced effects'}
                          {rarity === 'RARE' && 'Screen shake + share'}
                          {rarity === 'EPIC' && 'Intense animations'}
                          {rarity === 'LEGENDARY' && 'Maximum impact'}
                          {rarity === 'MYTHIC' && 'Legendary + harmonics'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Achievement Celebration Component */}
      <AchievementCelebration
        achievement={selectedAchievement}
        isTriggered={celebrationTriggered}
        onComplete={handleCelebrationComplete}
        config={{ playSound: soundEnabled, ...customConfig }}
      />
    </div>
  )
}
