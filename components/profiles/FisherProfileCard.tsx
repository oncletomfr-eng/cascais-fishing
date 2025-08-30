'use client'

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, MapPin, Calendar, Trophy, Users, Shield } from 'lucide-react'
import type { FisherProfile } from '@/lib/types/profiles'
import { motion } from 'framer-motion'

interface FisherProfileCardProps {
  profile: FisherProfile
  showActions?: boolean
  isCompact?: boolean
  onViewProfile?: (userId: string) => void
  onContact?: (userId: string) => void
}

const EXPERIENCE_COLORS = {
  BEGINNER: 'bg-green-100 text-green-800 border-green-300',
  INTERMEDIATE: 'bg-blue-100 text-blue-800 border-blue-300',
  EXPERT: 'bg-purple-100 text-purple-800 border-purple-300'
}

const EXPERIENCE_LABELS = {
  BEGINNER: 'Новичок',
  INTERMEDIATE: 'Опытный',
  EXPERT: 'Эксперт'
}

const SPECIALTY_LABELS = {
  DEEP_SEA: 'Глубоководная рыбалка',
  SHORE: 'Береговая рыбалка',
  FLY_FISHING: 'Нахлыст',
  SPORT_FISHING: 'Спортивная рыбалка'
}

const SPECIALTY_ICONS = {
  DEEP_SEA: '🚤',
  SHORE: '🏖️',
  FLY_FISHING: '🎣',
  SPORT_FISHING: '🏆'
}

export function FisherProfileCard({
  profile,
  showActions = true,
  isCompact = false,
  onViewProfile,
  onContact
}: FisherProfileCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={16}
        className={`${
          i < rating
            ? 'fill-yellow-400 text-yellow-400'
            : 'fill-gray-200 text-gray-200'
        }`}
      />
    ))
  }

  const formatReliability = (reliability: number) => {
    if (reliability >= 95) return { text: `${reliability}%`, color: 'text-green-600', icon: '🥇' }
    if (reliability >= 85) return { text: `${reliability}%`, color: 'text-blue-600', icon: '🥈' }
    if (reliability >= 70) return { text: `${reliability}%`, color: 'text-orange-600', icon: '🥉' }
    return { text: `${reliability}%`, color: 'text-gray-600', icon: '📊' }
  }

  const reliabilityInfo = formatReliability(Math.round(profile.reliability))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`hover:shadow-lg transition-shadow duration-300 ${
        isCompact ? 'max-w-sm' : 'max-w-md'
      }`}>
        <CardHeader className={`${isCompact ? 'pb-4' : 'pb-6'}`}>
          <div className="flex items-start gap-4">
            <Avatar className={`${isCompact ? 'h-12 w-12' : 'h-16 w-16'}`}>
              <AvatarImage 
                src={profile.user?.image || '/placeholder-user.jpg'} 
                alt={profile.user?.name || 'Fisher'} 
              />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {profile.user?.name?.charAt(0) || '👤'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={`font-semibold truncate ${
                  isCompact ? 'text-lg' : 'text-xl'
                }`}>
                  {profile.user?.name || 'Рыбак'}
                </h3>
                {profile.user?.role === 'CAPTAIN' && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-300">
                    <Shield size={12} className="mr-1" />
                    Капитан
                  </Badge>
                )}
              </div>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-1">
                  {renderStars(Math.round(profile.rating))}
                </div>
                <span className="text-sm font-medium">
                  {profile.rating.toFixed(1)}
                </span>
                <span className="text-sm text-gray-500">
                  ({profile.totalReviews} отзыв{profile.totalReviews !== 1 ? 'ов' : ''})
                </span>
              </div>

              {/* Experience Level */}
              <Badge 
                variant="outline" 
                className={`${EXPERIENCE_COLORS[profile.experience]} mb-2`}
              >
                {EXPERIENCE_LABELS[profile.experience]}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`${isCompact ? 'pt-0' : ''}`}>
          {/* Location */}
          {(profile.country || profile.city) && (
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
              <MapPin size={16} />
              <span>
                {[profile.city, profile.country].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar size={16} className="text-blue-500" />
                <span className="font-semibold text-lg">{profile.completedTrips}</span>
              </div>
              <p className="text-sm text-gray-600">Поездок</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg">{reliabilityInfo.icon}</span>
                <span className={`font-semibold text-lg ${reliabilityInfo.color}`}>
                  {reliabilityInfo.text}
                </span>
              </div>
              <p className="text-sm text-gray-600">Надежность</p>
            </div>
          </div>

          {/* Specialties */}
          {profile.specialties.length > 0 && !isCompact && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Специализация:</h4>
              <div className="flex flex-wrap gap-2">
                {profile.specialties.map((specialty) => (
                  <Badge key={specialty} variant="secondary" className="text-xs">
                    <span className="mr-1">{SPECIALTY_ICONS[specialty]}</span>
                    {SPECIALTY_LABELS[specialty]}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {profile.badges && profile.badges.length > 0 && !isCompact && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Достижения:</h4>
              <div className="flex flex-wrap gap-2">
                {profile.badges.slice(0, 3).map((badge) => (
                  <Badge key={badge.id} variant="outline" className="text-xs">
                    <span className="mr-1">{badge.icon}</span>
                    {badge.name}
                  </Badge>
                ))}
                {profile.badges.length > 3 && (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    +{profile.badges.length - 3} еще
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && !isCompact && (
            <div className="mb-4">
              <p className="text-sm text-gray-700 line-clamp-3">{profile.bio}</p>
            </div>
          )}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => onViewProfile?.(profile.userId)}
              >
                Профиль
              </Button>
              <Button 
                size="sm" 
                className="flex-1"
                onClick={() => onContact?.(profile.userId)}
              >
                Связаться
              </Button>
            </div>
          )}

          {/* Last Activity */}
          <div className="text-xs text-gray-500 mt-3 text-center">
            Активен {new Date(profile.lastActiveAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short'
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
