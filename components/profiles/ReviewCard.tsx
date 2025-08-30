'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, ThumbsUp, Calendar, Shield, CheckCircle } from 'lucide-react'
import type { Review } from '@/lib/types/profiles'
import { motion } from 'framer-motion'

interface ReviewCardProps {
  review: Review
  showTripInfo?: boolean
  isCompact?: boolean
  onHelpful?: (reviewId: string) => void
}

const EXPERIENCE_LABELS = {
  BEGINNER: 'Новичок',
  INTERMEDIATE: 'Опытный',
  EXPERT: 'Эксперт'
}

const EXPERIENCE_COLORS = {
  BEGINNER: 'bg-green-100 text-green-700',
  INTERMEDIATE: 'bg-blue-100 text-blue-700',
  EXPERT: 'bg-purple-100 text-purple-700'
}

export function ReviewCard({
  review,
  showTripInfo = true,
  isCompact = false,
  onHelpful
}: ReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [helpfulCount, setHelpfulCount] = useState(review.helpful)
  const [hasVotedHelpful, setHasVotedHelpful] = useState(false)

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

  const handleHelpful = () => {
    if (hasVotedHelpful) return
    
    setHelpfulCount(prev => prev + 1)
    setHasVotedHelpful(true)
    onHelpful?.(review.id)
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const truncateComment = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const shouldShowExpand = review.comment && review.comment.length > 150

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`hover:shadow-md transition-shadow duration-200 ${
        review.verified ? 'border-l-4 border-l-green-500' : ''
      }`}>
        <CardHeader className={`${isCompact ? 'pb-3' : 'pb-4'}`}>
          <div className="flex items-start gap-3">
            {/* Author Avatar */}
            <Avatar className={`${isCompact ? 'h-10 w-10' : 'h-12 w-12'}`}>
              <AvatarImage 
                src={review.fromUser?.image || '/placeholder-user.jpg'} 
                alt={review.fromUser?.name || 'Reviewer'} 
              />
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {review.fromUser?.name?.charAt(0) || '👤'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              {/* Author Name and Badges */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className={`font-medium truncate ${
                  isCompact ? 'text-sm' : 'text-base'
                }`}>
                  {review.fromUser?.name || 'Анонимный рыбак'}
                </h4>
                
                {/* Verified Participant Badge */}
                {review.verified && (
                  <Badge variant="outline" className="bg-green-50 text-green-600 border-green-300 text-xs">
                    <CheckCircle size={12} className="mr-1" />
                    Участник
                  </Badge>
                )}
              </div>
              
              {/* Author Experience (if available) */}
              {review.fromUser?.fisherProfile?.experience && (
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${EXPERIENCE_COLORS[review.fromUser.fisherProfile.experience]}`}
                  >
                    {EXPERIENCE_LABELS[review.fromUser.fisherProfile.experience]}
                  </Badge>
                  
                  {/* Author Stats */}
                  {review.fromUser.fisherProfile.completedTrips > 0 && (
                    <span className="text-xs text-gray-500">
                      {review.fromUser.fisherProfile.completedTrips} поездок, 
                      ⭐ {review.fromUser.fisherProfile.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              )}
              
              {/* Rating and Date */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {renderStars(review.rating)}
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(review.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className={`${isCompact ? 'pt-0' : ''}`}>
          {/* Trip Info */}
          {showTripInfo && review.trip && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={14} className="text-gray-500" />
                <span className="text-sm font-medium">
                  Поездка {formatDate(review.trip.date)}
                </span>
              </div>
              {review.trip.description && (
                <p className="text-sm text-gray-600 truncate">
                  {review.trip.description}
                </p>
              )}
            </div>
          )}

          {/* Review Comment */}
          {review.comment && (
            <div className="mb-4">
              <p className={`text-gray-700 ${isCompact ? 'text-sm' : ''}`}>
                {isExpanded || !shouldShowExpand
                  ? review.comment
                  : truncateComment(review.comment)
                }
              </p>
              
              {/* Expand/Collapse Button */}
              {shouldShowExpand && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-600 mt-1"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Скрыть' : 'Показать полностью'}
                </Button>
              )}
            </div>
          )}

          {/* Helpful Button */}
          {!isCompact && (
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className={`text-sm ${
                  hasVotedHelpful 
                    ? 'text-blue-600 bg-blue-50' 
                    : 'text-gray-600 hover:text-blue-600'
                }`}
                onClick={handleHelpful}
                disabled={hasVotedHelpful}
              >
                <ThumbsUp size={16} className="mr-2" />
                Полезно {helpfulCount > 0 && `(${helpfulCount})`}
              </Button>
              
              {/* Rating Summary */}
              <div className="text-sm text-gray-500">
                {review.rating === 5 && '🌟 Отлично'}
                {review.rating === 4 && '👍 Хорошо'}
                {review.rating === 3 && '👌 Нормально'}
                {review.rating === 2 && '👎 Плохо'}
                {review.rating === 1 && '😞 Ужасно'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
