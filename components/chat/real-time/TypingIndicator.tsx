'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Pencil, Edit3 } from 'lucide-react'

// Typing Indicator Component
// Part of Task 19: Real-time Integration & SSE

interface TypingUser {
  userId: string
  userName: string
  timestamp: Date
}

interface TypingIndicatorProps {
  typingUsers: Map<string, { userName: string; timestamp: Date }>
  currentUserId?: string
  maxVisible?: number
  showAvatars?: boolean
  variant?: 'minimal' | 'detailed' | 'bubble'
  className?: string
}

interface TypingDotsProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

interface TypingBubbleProps {
  userName?: string
  className?: string
}

// Animated typing dots
export function TypingDots({ className, size = 'md' }: TypingDotsProps) {
  const sizeClasses = {
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-2 w-2'
  }

  const containerClasses = {
    sm: 'space-x-0.5',
    md: 'space-x-1',
    lg: 'space-x-1.5'
  }

  return (
    <div className={cn('flex items-center', containerClasses[size], className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn(
            'rounded-full bg-muted-foreground',
            sizeClasses[size]
          )}
          animate={{ 
            scale: [1, 1.2, 1], 
            opacity: [0.7, 1, 0.7] 
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.16
          }}
        />
      ))}
    </div>
  )
}

// Typing bubble (similar to iMessage style)
export function TypingBubble({ userName, className }: TypingBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={cn(
        'flex items-center space-x-2 px-3 py-2 bg-muted rounded-lg',
        'max-w-xs',
        className
      )}
    >
      <div className="flex-shrink-0">
        {userName ? (
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-primary">
                {userName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {userName}
            </span>
          </div>
        ) : (
          <Edit3 className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <TypingDots size="sm" />
    </motion.div>
  )
}

// Main typing indicator component
export function TypingIndicator({
  typingUsers,
  currentUserId,
  maxVisible = 3,
  showAvatars = false,
  variant = 'minimal',
  className
}: TypingIndicatorProps) {
  const [visibleUsers, setVisibleUsers] = useState<TypingUser[]>([])

  // Filter and convert typing users, excluding current user
  useEffect(() => {
    const users = Array.from(typingUsers.entries())
      .filter(([userId]) => userId !== currentUserId)
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        timestamp: data.timestamp
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()) // Oldest first
      .slice(0, maxVisible)

    setVisibleUsers(users)
  }, [typingUsers, currentUserId, maxVisible])

  if (visibleUsers.length === 0) {
    return null
  }

  // Minimal variant - just dots with count
  if (variant === 'minimal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn('flex items-center space-x-2', className)}
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {visibleUsers.length === 1 
              ? `${visibleUsers[0].userName} печатает`
              : `${visibleUsers.length} пользователя печатают`
            }
          </span>
          <TypingDots size="sm" />
        </motion.div>
      </AnimatePresence>
    )
  }

  // Detailed variant - show individual users
  if (variant === 'detailed') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className={cn('space-y-1', className)}
        >
          {visibleUsers.map((user) => (
            <motion.div
              key={user.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center space-x-2"
            >
              {showAvatars && (
                <div className="h-5 w-5 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-primary">
                    {user.userName.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                {user.userName} печатает
              </span>
              <TypingDots size="sm" />
            </motion.div>
          ))}
          
          {typingUsers.size > maxVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground pl-7"
            >
              +{typingUsers.size - maxVisible} ещё печатают
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    )
  }

  // Bubble variant - show as chat bubbles
  if (variant === 'bubble') {
    return (
      <div className={cn('space-y-2', className)}>
        <AnimatePresence mode="popLayout">
          {visibleUsers.map((user) => (
            <TypingBubble
              key={user.userId}
              userName={user.userName}
            />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  return null
}

// Hook for managing typing state
export function useTypingIndicator(
  onSendTyping: (channelId: string) => void,
  channelId: string,
  debounceMs: number = 1000
) {
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const startTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      onSendTyping(channelId)
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      setIsTyping(false)
    }, debounceMs)

    setTypingTimeout(timeout)
  }

  const stopTyping = () => {
    if (typingTimeout) {
      clearTimeout(typingTimeout)
      setTypingTimeout(null)
    }
    setIsTyping(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
    }
  }, [typingTimeout])

  return {
    isTyping,
    startTyping,
    stopTyping
  }
}
