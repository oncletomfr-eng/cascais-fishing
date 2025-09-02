'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Circle, Clock, Wifi, WifiOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { UserStatus } from '@/hooks/useChatSSE'

// Online Status Indicator Component
// Part of Task 19: Real-time Integration & SSE

interface OnlineStatusIndicatorProps {
  user: UserStatus
  showAvatar?: boolean
  showName?: boolean
  showLastSeen?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'dot' | 'badge' | 'full'
  className?: string
}

interface OnlineUsersListProps {
  users: Map<string, UserStatus>
  currentUserId?: string
  maxVisible?: number
  className?: string
}

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'
  quality?: 'good' | 'poor' | 'unknown'
  className?: string
}

// Individual user online status indicator
export function OnlineStatusIndicator({
  user,
  showAvatar = false,
  showName = false,
  showLastSeen = false,
  size = 'md',
  variant = 'dot',
  className
}: OnlineStatusIndicatorProps) {
  const statusConfig = {
    online: {
      color: 'bg-green-500',
      label: 'Онлайн',
      icon: Circle
    },
    away: {
      color: 'bg-yellow-500',
      label: 'Отошёл',
      icon: Clock
    },
    offline: {
      color: 'bg-gray-400',
      label: 'Не в сети',
      icon: Circle
    },
    typing: {
      color: 'bg-blue-500',
      label: 'Печатает...',
      icon: Circle
    }
  }

  const config = statusConfig[user.status]
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3', 
    lg: 'h-4 w-4'
  }

  const avatarSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  }

  const formatLastSeen = (lastSeenStr: string) => {
    try {
      const lastSeen = new Date(lastSeenStr)
      return formatDistanceToNow(lastSeen, { 
        addSuffix: true,
        locale: ru 
      })
    } catch {
      return 'недавно'
    }
  }

  if (variant === 'dot') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              className={cn(
                'relative inline-block',
                className
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <div
                className={cn(
                  'rounded-full border-2 border-white dark:border-gray-900',
                  config.color,
                  sizeClasses[size]
                )}
              />
              {user.status === 'typing' && (
                <motion.div
                  className={cn(
                    'absolute inset-0 rounded-full',
                    config.color
                  )}
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                />
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              {showLastSeen && user.status === 'offline' && (
                <p className="text-xs text-muted-foreground">
                  {formatLastSeen(user.lastSeen)}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === 'badge') {
    return (
      <Badge 
        variant={user.status === 'online' ? 'default' : 'secondary'}
        className={cn(
          'flex items-center space-x-1 text-xs',
          className
        )}
      >
        <div
          className={cn(
            'rounded-full',
            config.color,
            sizeClasses[size]
          )}
        />
        <span>{config.label}</span>
      </Badge>
    )
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {showAvatar && (
        <div className="relative">
          <Avatar className={avatarSizeClasses[size]}>
            <AvatarFallback>
              {user.userId.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-gray-900',
              config.color,
              sizeClasses[size]
            )}
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        {showName && (
          <p className="text-sm font-medium truncate">
            User {user.userId}
          </p>
        )}
        
        <div className="flex items-center space-x-1">
          <div
            className={cn(
              'rounded-full',
              config.color,
              sizeClasses[size]
            )}
          />
          <span className="text-xs text-muted-foreground">
            {config.label}
          </span>
          {showLastSeen && user.status === 'offline' && (
            <span className="text-xs text-muted-foreground">
              • {formatLastSeen(user.lastSeen)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// List of online users with avatars and status
export function OnlineUsersList({
  users,
  currentUserId,
  maxVisible = 5,
  className
}: OnlineUsersListProps) {
  // Filter out current user and convert to array
  const onlineUsers = Array.from(users.values())
    .filter(user => user.userId !== currentUserId && user.status === 'online')
    .slice(0, maxVisible)

  const additionalCount = Math.max(0, users.size - maxVisible)

  if (onlineUsers.length === 0) {
    return (
      <div className={cn('flex items-center text-sm text-muted-foreground', className)}>
        <Circle className="h-4 w-4 mr-2 text-gray-400" />
        Никого нет в сети
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center space-x-1">
        <Circle className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium">
          В сети ({onlineUsers.length})
        </span>
      </div>
      
      <div className="space-y-1">
        {onlineUsers.map((user) => (
          <OnlineStatusIndicator
            key={user.userId}
            user={user}
            showAvatar
            showName
            variant="full"
            size="sm"
          />
        ))}
        
        {additionalCount > 0 && (
          <div className="text-xs text-muted-foreground pl-8">
            +{additionalCount} ещё
          </div>
        )}
      </div>
    </div>
  )
}

// Connection status indicator
export function ConnectionStatusIndicator({
  status,
  quality = 'unknown',
  className
}: ConnectionStatusProps) {
  const statusConfig = {
    connecting: {
      color: 'text-yellow-500',
      icon: Wifi,
      label: 'Подключение...',
      animate: true
    },
    connected: {
      color: quality === 'good' ? 'text-green-500' : 'text-yellow-500',
      icon: Wifi,
      label: quality === 'good' ? 'Подключено' : 'Слабое соединение',
      animate: false
    },
    reconnecting: {
      color: 'text-orange-500',
      icon: Wifi,
      label: 'Переподключение...',
      animate: true
    },
    disconnected: {
      color: 'text-gray-400',
      icon: WifiOff,
      label: 'Отключено',
      animate: false
    },
    error: {
      color: 'text-red-500',
      icon: WifiOff,
      label: 'Ошибка соединения',
      animate: false
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            className={cn(
              'flex items-center space-x-1 cursor-help',
              config.color,
              className
            )}
            animate={config.animate ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={config.animate ? {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            } : {}}
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs font-medium">
              {config.label}
            </span>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">Статус соединения</p>
            <p className="text-xs">{config.label}</p>
            {quality !== 'unknown' && (
              <p className="text-xs text-muted-foreground">
                Качество: {quality === 'good' ? 'Хорошее' : 'Плохое'}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
