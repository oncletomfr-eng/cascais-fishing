'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Gem, 
  Sparkles,
  Calendar,
  Users,
  Award,
  Shield
} from 'lucide-react';

// Types
export interface RewardData {
  id: string;
  name: string;
  description?: string;
  type: 'TROPHY' | 'BADGE' | 'TITLE' | 'DECORATION' | 'FEATURE' | 'VIRTUAL_ITEM';
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND' | 'LEGENDARY';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  icon?: string;
  color?: string;
  imageUrl?: string;
  quantity?: number;
  obtainedAt?: string;
  reason?: string;
  rank?: number;
  season?: {
    name: string;
    displayName: string;
    type: string;
  };
}

interface RewardCardProps {
  reward: RewardData;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showQuantity?: boolean;
  interactive?: boolean;
  onClick?: (reward: RewardData) => void;
  className?: string;
}

// Color schemes for tiers
const TIER_COLORS = {
  BRONZE: 'from-amber-100 to-orange-200 border-amber-300 text-amber-800',
  SILVER: 'from-gray-100 to-slate-200 border-gray-300 text-gray-800',
  GOLD: 'from-yellow-100 to-yellow-200 border-yellow-400 text-yellow-800',
  PLATINUM: 'from-indigo-100 to-purple-200 border-indigo-400 text-indigo-800',
  DIAMOND: 'from-blue-100 to-cyan-200 border-blue-400 text-blue-800',
  LEGENDARY: 'from-purple-100 to-pink-200 border-purple-400 text-purple-800',
};

// Rarity glow effects
const RARITY_EFFECTS = {
  COMMON: '',
  UNCOMMON: 'shadow-sm',
  RARE: 'shadow-md shadow-blue-200',
  EPIC: 'shadow-lg shadow-purple-300',
  LEGENDARY: 'shadow-xl shadow-yellow-400',
  MYTHIC: 'shadow-2xl shadow-pink-500 animate-pulse',
};

// Icons for different reward types
const TYPE_ICONS = {
  TROPHY: Trophy,
  BADGE: Medal,
  TITLE: Crown,
  DECORATION: Star,
  FEATURE: Gem,
  VIRTUAL_ITEM: Sparkles,
};

export const RewardCard: React.FC<RewardCardProps> = ({
  reward,
  size = 'md',
  showDetails = true,
  showQuantity = true,
  interactive = false,
  onClick,
  className = '',
}) => {
  const IconComponent = TYPE_ICONS[reward.type] || Trophy;
  const tierColors = TIER_COLORS[reward.tier] || TIER_COLORS.BRONZE;
  const rarityEffect = RARITY_EFFECTS[reward.rarity] || '';

  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const handleClick = () => {
    if (interactive && onClick) {
      onClick(reward);
    }
  };

  return (
    <motion.div
      className={`${className}`}
      whileHover={interactive ? { scale: 1.05 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`
          relative overflow-hidden bg-gradient-to-br ${tierColors} ${rarityEffect}
          ${interactive ? 'cursor-pointer hover:shadow-lg transition-all duration-300' : ''}
          ${sizeClasses[size]}
        `}
        onClick={handleClick}
      >
        {/* Quantity Badge */}
        {showQuantity && reward.quantity && reward.quantity > 1 && (
          <Badge 
            className="absolute top-1 right-1 z-10 bg-black/70 text-white text-xs"
            variant="secondary"
          >
            x{reward.quantity}
          </Badge>
        )}

        {/* Rarity Sparkle Effect */}
        {(reward.rarity === 'LEGENDARY' || reward.rarity === 'MYTHIC') && (
          <div className="absolute inset-0 pointer-events-none">
            <motion.div
              className="absolute top-2 right-2"
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 180, 360],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </motion.div>
            <motion.div
              className="absolute bottom-2 left-2"
              animate={{ 
                scale: [1.2, 1, 1.2],
                rotate: [360, 180, 0],
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <Star className="w-3 h-3 text-pink-400" />
            </motion.div>
          </div>
        )}

        <CardContent className="p-2 h-full flex flex-col items-center justify-center">
          {/* Reward Icon/Image */}
          <div className="flex-1 flex items-center justify-center mb-2">
            {reward.imageUrl ? (
              <img 
                src={reward.imageUrl} 
                alt={reward.name}
                className={`${iconSizes[size]} object-contain`}
              />
            ) : reward.icon ? (
              <div className={`${iconSizes[size]} flex items-center justify-center text-2xl`}>
                {reward.icon}
              </div>
            ) : (
              <IconComponent className={`${iconSizes[size]} opacity-80`} />
            )}
          </div>

          {/* Reward Name */}
          <div className="text-center">
            <h4 className={`font-semibold ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'} truncate`}>
              {reward.name}
            </h4>
            
            {showDetails && size !== 'sm' && (
              <>
                {/* Tier Badge */}
                <Badge 
                  variant="outline" 
                  className="text-xs mt-1 bg-white/80"
                >
                  {reward.tier}
                </Badge>
                
                {/* Rarity */}
                <p className="text-xs opacity-70 mt-1">
                  {reward.rarity}
                </p>

                {/* Obtained Date */}
                {reward.obtainedAt && (
                  <div className="flex items-center justify-center text-xs opacity-60 mt-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(reward.obtainedAt).toLocaleDateString()}
                  </div>
                )}

                {/* Rank */}
                {reward.rank && (
                  <div className="flex items-center justify-center text-xs opacity-60 mt-1">
                    <Award className="w-3 h-3 mr-1" />
                    #{reward.rank}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Compact horizontal variant
export const RewardCardHorizontal: React.FC<RewardCardProps> = ({
  reward,
  showDetails = true,
  interactive = false,
  onClick,
  className = '',
}) => {
  const IconComponent = TYPE_ICONS[reward.type] || Trophy;
  const tierColors = TIER_COLORS[reward.tier] || TIER_COLORS.BRONZE;
  const rarityEffect = RARITY_EFFECTS[reward.rarity] || '';

  const handleClick = () => {
    if (interactive && onClick) {
      onClick(reward);
    }
  };

  return (
    <motion.div
      className={className}
      whileHover={interactive ? { scale: 1.02 } : undefined}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`
          bg-gradient-to-r ${tierColors} ${rarityEffect}
          ${interactive ? 'cursor-pointer hover:shadow-md transition-all duration-200' : ''}
          h-16 relative overflow-hidden
        `}
        onClick={handleClick}
      >
        <CardContent className="p-3 h-full flex items-center space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            {reward.imageUrl ? (
              <img 
                src={reward.imageUrl} 
                alt={reward.name}
                className="w-10 h-10 object-contain"
              />
            ) : reward.icon ? (
              <div className="w-10 h-10 flex items-center justify-center text-2xl">
                {reward.icon}
              </div>
            ) : (
              <IconComponent className="w-10 h-10 opacity-80" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-semibold text-sm truncate">{reward.name}</h4>
              {reward.quantity && reward.quantity > 1 && (
                <Badge variant="secondary" className="text-xs">
                  x{reward.quantity}
                </Badge>
              )}
            </div>
            
            {showDetails && (
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="text-xs bg-white/80">
                  {reward.tier}
                </Badge>
                <span className="text-xs opacity-70">{reward.rarity}</span>
                {reward.rank && (
                  <span className="text-xs opacity-60">#{reward.rank}</span>
                )}
              </div>
            )}
          </div>

          {/* Rarity Effect */}
          {(reward.rarity === 'LEGENDARY' || reward.rarity === 'MYTHIC') && (
            <motion.div
              className="absolute top-1 right-1"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
              }}
            >
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default RewardCard;
