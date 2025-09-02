/**
 * Typing Indicator Component
 * Task 17.5: Participant Management System - Typing Indicators
 */

'use client'

import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { TypingIndicator as TypingIndicatorType } from '@/lib/chat/participant-types'
import { useTypingIndicators } from '@/lib/chat/participants/useParticipantStatus'
import { Activity, MessageCircle, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// Animated typing dots component
function TypingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex space-x-1', className)}>
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
    </div>
  )
}

// Single typing indicator for one participant
interface SingleTypingIndicatorProps {
  indicator: TypingIndicatorType
  showAvatar?: boolean
  showDuration?: boolean
  compact?: boolean
  className?: string
}

function SingleTypingIndicator({
  indicator,
  showAvatar = true,
  showDuration = false,
  compact = false,
  className
}: SingleTypingIndicatorProps) {
  const [duration, setDuration] = useState('')

  // Update duration every second
  useEffect(() => {
    const updateDuration = () => {
      setDuration(formatDistanceToNow(indicator.startedAt, { 
        addSuffix: false,
        locale: ru 
      }))
    }

    updateDuration()
    const interval = setInterval(updateDuration, 1000)
    
    return () => clearInterval(interval)
  }, [indicator.startedAt])

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 rounded-lg bg-blue-50 border border-blue-200',
      compact && 'p-1 space-x-1',
      className
    )}>
      {showAvatar && (
        <Avatar className={cn(compact ? 'w-6 h-6' : 'w-8 h-8')}>
          <AvatarImage 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(indicator.participantName)}&background=3b82f6&color=fff&size=32`}
            alt={indicator.participantName}
          />
          <AvatarFallback className="bg-blue-500 text-white text-xs">
            {getInitials(indicator.participantName)}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={cn(
            'font-medium text-blue-700 truncate',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {indicator.participantName}
          </span>
          <TypingDots className={compact ? 'scale-75' : ''} />
        </div>
        
        {showDuration && !compact && (
          <div className="text-xs text-blue-600 mt-1">
            печатает {duration}
          </div>
        )}
      </div>

      <Activity className={cn(
        'text-blue-500 animate-pulse',
        compact ? 'w-3 h-3' : 'w-4 h-4'
      )} />
    </div>
  )
}

// Multiple typing indicators with smart grouping
interface MultipleTypingIndicatorProps {
  indicators: TypingIndicatorType[]
  maxVisible?: number
  showAvatars?: boolean
  compact?: boolean
  className?: string
}

function MultipleTypingIndicator({
  indicators,
  maxVisible = 3,
  showAvatars = true,
  compact = false,
  className
}: MultipleTypingIndicatorProps) {
  if (indicators.length === 0) return null

  const visibleIndicators = indicators.slice(0, maxVisible)
  const hiddenCount = indicators.length - maxVisible

  if (indicators.length === 1) {
    return (
      <SingleTypingIndicator
        indicator={indicators[0]}
        showAvatar={showAvatars}
        showDuration={!compact}
        compact={compact}
        className={className}
      />
    )
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 rounded-lg bg-blue-50 border border-blue-200',
      compact && 'p-1 space-x-1',
      className
    )}>
      {/* Avatars */}
      {showAvatars && (
        <div className="flex -space-x-1">
          {visibleIndicators.map((indicator, index) => (
            <Avatar 
              key={indicator.participantId} 
              className={cn(
                'border-2 border-white',
                compact ? 'w-6 h-6' : 'w-8 h-8'
              )}
              style={{ zIndex: visibleIndicators.length - index }}
            >
              <AvatarImage 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(indicator.participantName)}&background=3b82f6&color=fff&size=32`}
                alt={indicator.participantName}
              />
              <AvatarFallback className="bg-blue-500 text-white text-xs">
                {indicator.participantName[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          
          {hiddenCount > 0 && (
            <div className={cn(
              'flex items-center justify-center border-2 border-white bg-blue-600 text-white rounded-full',
              compact ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
            )}>
              +{hiddenCount}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={cn(
            'font-medium text-blue-700',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {indicators.length === 2 
              ? `${indicators[0].participantName} и ${indicators[1].participantName}`
              : indicators.length === 3
              ? `${indicators[0].participantName} и еще ${indicators.length - 1}`
              : `${indicators.length} участников`
            } печатают
          </span>
          <TypingDots className={compact ? 'scale-75' : ''} />
        </div>
      </div>

      <Activity className={cn(
        'text-blue-500 animate-pulse',
        compact ? 'w-3 h-3' : 'w-4 h-4'
      )} />
    </div>
  )
}

// Main typing indicator component for channel
interface ChannelTypingIndicatorProps {
  channelId: string
  maxVisible?: number
  showAvatars?: boolean
  compact?: boolean
  className?: string
  position?: 'top' | 'bottom' | 'inline'
}

export function ChannelTypingIndicator({
  channelId,
  maxVisible = 3,
  showAvatars = true,
  compact = false,
  className,
  position = 'bottom'
}: ChannelTypingIndicatorProps) {
  const indicators = useTypingIndicators(channelId)

  if (indicators.length === 0) return null

  return (
    <div className={cn(
      'transition-all duration-300 ease-in-out',
      position === 'top' && 'mb-2',
      position === 'bottom' && 'mt-2',
      position === 'inline' && 'my-1',
      className
    )}>
      <MultipleTypingIndicator
        indicators={indicators}
        maxVisible={maxVisible}
        showAvatars={showAvatars}
        compact={compact}
      />
    </div>
  )
}

// Floating typing indicator for overlay display
interface FloatingTypingIndicatorProps {
  channelId: string
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'
  className?: string
}

export function FloatingTypingIndicator({
  channelId,
  position = 'bottom-right',
  className
}: FloatingTypingIndicatorProps) {
  const indicators = useTypingIndicators(channelId)

  if (indicators.length === 0) return null

  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4'
  }

  return (
    <div className={cn(
      'fixed z-50 max-w-xs',
      positionClasses[position],
      className
    )}>
      <div className="bg-white shadow-lg rounded-lg border">
        <MultipleTypingIndicator
          indicators={indicators}
          maxVisible={2}
          showAvatars={true}
          compact={true}
        />
      </div>
    </div>
  )
}

// Simple typing status for message input areas
interface TypingStatusProps {
  channelId: string
  className?: string
}

export function TypingStatus({ channelId, className }: TypingStatusProps) {
  const indicators = useTypingIndicators(channelId)

  if (indicators.length === 0) return null

  const getText = () => {
    if (indicators.length === 1) {
      return `${indicators[0].participantName} печатает...`
    } else if (indicators.length === 2) {
      return `${indicators[0].participantName} и ${indicators[1].participantName} печатают...`
    } else {
      return `${indicators.length} участников печатают...`
    }
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 text-sm text-gray-600 animate-pulse',
      className
    )}>
      <TypingDots className="scale-75" />
      <span>{getText()}</span>
    </div>
  )
}

// Compact typing indicator for participant lists
interface CompactTypingIndicatorProps {
  participantId: string
  channelId: string
  className?: string
}

export function CompactTypingIndicator({
  participantId,
  channelId,
  className
}: CompactTypingIndicatorProps) {
  const indicators = useTypingIndicators(channelId)
  const isTyping = indicators.some(indicator => indicator.participantId === participantId)

  if (!isTyping) return null

  return (
    <div className={cn(
      'absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse',
      className
    )}>
      <div className="w-full h-full bg-blue-500 rounded-full" />
    </div>
  )
}

// Typing indicator badge for UI elements
interface TypingBadgeProps {
  channelId: string
  showCount?: boolean
  className?: string
}

export function TypingBadge({ 
  channelId, 
  showCount = true, 
  className 
}: TypingBadgeProps) {
  const indicators = useTypingIndicators(channelId)

  if (indicators.length === 0) return null

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        'flex items-center space-x-1 bg-blue-100 text-blue-700 border-blue-200',
        className
      )}
    >
      <Activity className="w-3 h-3 animate-pulse" />
      {showCount && <span>{indicators.length}</span>}
    </Badge>
  )
}

// Export all components
export default ChannelTypingIndicator
