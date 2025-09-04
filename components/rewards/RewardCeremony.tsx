'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Crown, 
  Star, 
  Sparkles,
  ChevronRight,
  X,
  Volume2,
  VolumeX,
  Share2,
  Download
} from 'lucide-react';
import { RewardCard, type RewardData } from './RewardCard';
import confetti from 'canvas-confetti';

// Types
interface CeremonyReward extends RewardData {
  rank?: number;
  score?: number;
  reason: string;
  sourceType: string;
  sourceName?: string;
}

interface RewardCeremonyProps {
  rewards: CeremonyReward[];
  title?: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onShare?: (rewards: CeremonyReward[]) => void;
  autoPlay?: boolean;
  soundEnabled?: boolean;
  className?: string;
}

// Animation presets
const CEREMONY_ANIMATIONS = {
  trophy: {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: { scale: 1, rotate: 0, opacity: 1 },
    exit: { scale: 0, rotate: 180, opacity: 0 },
    transition: { type: "spring", stiffness: 200, damping: 20 }
  },
  badge: {
    initial: { scale: 0, y: -100, opacity: 0 },
    animate: { scale: 1, y: 0, opacity: 1 },
    exit: { scale: 0, y: 100, opacity: 0 },
    transition: { type: "spring", stiffness: 150, damping: 15 }
  },
  title: {
    initial: { scale: 0, y: -50, opacity: 0 },
    animate: { scale: 1, y: 0, opacity: 1 },
    transition: { type: "spring", stiffness: 100, damping: 10, delay: 0.2 }
  },
  sparkle: {
    initial: { scale: 0, rotate: 0, opacity: 0 },
    animate: { 
      scale: [0, 1.2, 1], 
      rotate: [0, 180, 360], 
      opacity: [0, 1, 0.7] 
    },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

export const RewardCeremony: React.FC<RewardCeremonyProps> = ({
  rewards,
  title = "🎉 Поздравляем!",
  subtitle = "Вы получили новые награды!",
  isOpen,
  onClose,
  onShare,
  autoPlay = true,
  soundEnabled = true,
  className = '',
}) => {
  const [currentRewardIndex, setCurrentRewardIndex] = useState(0);
  const [ceremonyPhase, setCeremonyPhase] = useState<'intro' | 'rewards' | 'celebration' | 'complete'>('intro');
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentReward = rewards[currentRewardIndex];

  // Start ceremony when opened
  useEffect(() => {
    if (isOpen && autoPlay && !isPlaying) {
      startCeremony();
    }
  }, [isOpen, autoPlay]);

  // Confetti effects
  const fireConfetti = (type: 'basic' | 'gold' | 'legendary' = 'basic') => {
    const configs = {
      basic: {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1']
      },
      gold: {
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFFF00', '#FF8C00'],
        gravity: 0.8,
        scalar: 1.2
      },
      legendary: {
        particleCount: 200,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#FF1493', '#9932CC', '#FFD700', '#00CED1'],
        gravity: 0.6,
        scalar: 1.5,
        shapes: ['star']
      }
    };

    const config = configs[type];
    
    // Fire multiple bursts
    const fireCount = type === 'legendary' ? 5 : type === 'gold' ? 3 : 1;
    
    for (let i = 0; i < fireCount; i++) {
      setTimeout(() => {
        confetti(config);
      }, i * 200);
    }
  };

  // Start ceremony sequence
  const startCeremony = async () => {
    if (rewards.length === 0) return;
    
    setIsPlaying(true);
    setCeremonyPhase('intro');
    
    // Intro phase
    setTimeout(() => {
      setCeremonyPhase('rewards');
      setCurrentRewardIndex(0);
    }, 1500);
  };

  // Move to next reward
  const nextReward = () => {
    if (currentRewardIndex < rewards.length - 1) {
      setCurrentRewardIndex(currentRewardIndex + 1);
      
      // Fire confetti based on reward tier
      if (currentReward) {
        if (currentReward.tier === 'LEGENDARY' || currentReward.rarity === 'MYTHIC') {
          fireConfetti('legendary');
        } else if (currentReward.tier === 'GOLD' || currentReward.tier === 'PLATINUM') {
          fireConfetti('gold');
        } else {
          fireConfetti('basic');
        }
      }
    } else {
      setCeremonyPhase('celebration');
      fireConfetti('legendary');
      
      setTimeout(() => {
        setCeremonyPhase('complete');
      }, 3000);
    }
  };

  // Skip to end
  const skipCeremony = () => {
    setCeremonyPhase('complete');
    setCurrentRewardIndex(rewards.length - 1);
  };

  // Handle share
  const handleShare = () => {
    if (onShare) {
      onShare(rewards);
    }
  };

  // Close ceremony
  const handleClose = () => {
    setIsPlaying(false);
    setCeremonyPhase('intro');
    setCurrentRewardIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated sparkles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              {...CEREMONY_ANIMATIONS.sparkle}
              transition={{
                ...CEREMONY_ANIMATIONS.sparkle.transition,
                delay: Math.random() * 2
              }}
            >
              <Star className="w-4 h-4 text-yellow-400" />
            </motion.div>
          ))}
        </div>

        <Card className={`relative w-full max-w-2xl mx-4 ${className}`}>
          {/* Controls */}
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSoundOn(!soundOn)}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <CardContent className="p-8 text-center min-h-[500px] flex flex-col items-center justify-center">
            {/* Intro Phase */}
            {ceremonyPhase === 'intro' && (
              <motion.div
                {...CEREMONY_ANIMATIONS.title}
                className="space-y-4"
              >
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text">
                  {title}
                </h1>
                <p className="text-xl text-gray-600">{subtitle}</p>
                <Badge variant="outline" className="text-lg px-4 py-2">
                  {rewards.length} {rewards.length === 1 ? 'награда' : 'наград'}
                </Badge>
              </motion.div>
            )}

            {/* Rewards Phase */}
            {ceremonyPhase === 'rewards' && currentReward && (
              <motion.div
                key={currentRewardIndex}
                className="space-y-6 w-full"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  {rewards.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index <= currentRewardIndex ? 'bg-yellow-400' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Reward Display */}
                <motion.div
                  className="flex justify-center"
                  {...(currentReward.type === 'TROPHY' 
                    ? CEREMONY_ANIMATIONS.trophy 
                    : CEREMONY_ANIMATIONS.badge
                  )}
                >
                  <RewardCard
                    reward={currentReward}
                    size="lg"
                    showDetails={true}
                    className="mx-auto"
                  />
                </motion.div>

                {/* Reward Details */}
                <motion.div
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-2xl font-bold">{currentReward.name}</h2>
                  {currentReward.description && (
                    <p className="text-gray-600">{currentReward.description}</p>
                  )}
                  
                  <div className="flex justify-center gap-4 mt-4">
                    <Badge variant="outline" className="text-sm">
                      {currentReward.tier}
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {currentReward.rarity}
                    </Badge>
                    {currentReward.rank && (
                      <Badge variant="outline" className="text-sm">
                        #{currentReward.rank} место
                      </Badge>
                    )}
                  </div>

                  <p className="text-lg font-semibold text-blue-600 mt-4">
                    {currentReward.reason}
                  </p>
                </motion.div>

                {/* Navigation */}
                <div className="flex justify-center gap-4 mt-8">
                  {currentRewardIndex < rewards.length - 1 ? (
                    <Button onClick={nextReward} size="lg" className="gap-2">
                      Следующая награда
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button onClick={nextReward} size="lg" className="gap-2">
                      Завершить церемонию
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  )}
                  
                  {rewards.length > 1 && (
                    <Button variant="outline" onClick={skipCeremony}>
                      Пропустить
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {/* Celebration Phase */}
            {ceremonyPhase === 'celebration' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-8xl">🏆</div>
                <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text">
                  Поздравляем!
                </h1>
                <p className="text-xl">
                  Все награды получены! Так держать!
                </p>
              </motion.div>
            )}

            {/* Complete Phase */}
            {ceremonyPhase === 'complete' && (
              <motion.div
                className="space-y-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Trophy className="w-16 h-16 text-yellow-500 mx-auto" />
                <h2 className="text-2xl font-bold">Церемония завершена!</h2>
                <p>Все ваши награды добавлены в инвентарь</p>
                
                <div className="flex justify-center gap-4 mt-6">
                  {onShare && (
                    <Button onClick={handleShare} variant="outline" className="gap-2">
                      <Share2 className="w-4 h-4" />
                      Поделиться
                    </Button>
                  )}
                  <Button onClick={handleClose} className="gap-2">
                    Закрыть
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default RewardCeremony;
