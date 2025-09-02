/**
 * Participant Join/Leave Notifications Component
 * Task 17.5: Participant Management System - Join/Leave Notifications
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChatParticipant, getRoleDisplayName, getRoleColor } from '@/lib/chat/participant-types'
import { 
  useParticipantStatus,
  StatusUpdateEvent,
  TypingUpdateEvent 
} from '@/lib/chat/participants/useParticipantStatus'
import {
  UserPlus,
  UserMinus,
  Users,
  Bell,
  BellOff,
  X,
  Clock,
  Activity,
  LogIn,
  LogOut,
  Crown,
  Shield,
  User,
  Eye,
  MapPin,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Notification types
export interface ParticipantNotification {
  id: string
  type: 'joined' | 'left' | 'status_change' | 'role_change' | 'typing_start' | 'typing_stop'
  participantId: string
  participantName: string
  avatar?: string
  timestamp: Date
  data?: any
  read: boolean
  channelId?: string
}

// Role icons
const getRoleIcon = (role: string, size = 'w-3 h-3') => {
  const iconClass = cn(size)
  switch (role) {
    case 'captain': return <Crown className={iconClass} />
    case 'co-captain': return <Shield className={iconClass} />
    case 'guide': return <MapPin className={iconClass} />
    case 'observer': return <Eye className={iconClass} />
    default: return <User className={iconClass} />
  }
}

// Single notification item
interface NotificationItemProps {
  notification: ParticipantNotification
  onMarkRead?: (notificationId: string) => void
  onDismiss?: (notificationId: string) => void
  compact?: boolean
  showActions?: boolean
  className?: string
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
  compact = false,
  showActions = true,
  className
}: NotificationItemProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'joined':
        return <UserPlus className="w-4 h-4 text-green-500" />
      case 'left':
        return <UserMinus className="w-4 h-4 text-orange-500" />
      case 'status_change':
        return <Activity className="w-4 h-4 text-blue-500" />
      case 'role_change':
        return <Crown className="w-4 h-4 text-purple-500" />
      case 'typing_start':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'typing_stop':
        return <Activity className="w-4 h-4 text-gray-400" />
      default:
        return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  const getNotificationText = () => {
    switch (notification.type) {
      case 'joined':
        return `присоединился к чату${notification.data?.role ? ` как ${getRoleDisplayName(notification.data.role)}` : ''}`
      case 'left':
        return `покинул чат${notification.data?.reason ? ` (${notification.data.reason})` : ''}`
      case 'status_change':
        return `изменил статус на "${notification.data?.newStatus || 'неизвестно'}"`
      case 'role_change':
        return `получил роль ${getRoleDisplayName(notification.data?.newRole || 'participant')}`
      case 'typing_start':
        return 'начал печатать'
      case 'typing_stop':
        return 'закончил печатать'
      default:
        return 'неизвестное действие'
    }
  }

  const getBorderColor = () => {
    switch (notification.type) {
      case 'joined': return 'border-green-200'
      case 'left': return 'border-orange-200'
      case 'status_change': return 'border-blue-200'
      case 'role_change': return 'border-purple-200'
      default: return 'border-gray-200'
    }
  }

  const getBackgroundColor = () => {
    if (notification.read) return 'bg-white'
    
    switch (notification.type) {
      case 'joined': return 'bg-green-50'
      case 'left': return 'bg-orange-50'
      case 'status_change': return 'bg-blue-50'
      case 'role_change': return 'bg-purple-50'
      default: return 'bg-gray-50'
    }
  }

  return (
    <div className={cn(
      'flex items-start space-x-3 p-3 border rounded-lg transition-colors',
      getBorderColor(),
      getBackgroundColor(),
      !notification.read && 'shadow-sm',
      compact && 'p-2',
      className
    )}>
      {/* Avatar */}
      <div className="relative">
        <Avatar className={compact ? 'w-8 h-8' : 'w-10 h-10'}>
          <AvatarImage 
            src={notification.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notification.participantName)}&background=random`}
            alt={notification.participantName}
          />
          <AvatarFallback>
            {getInitials(notification.participantName)}
          </AvatarFallback>
        </Avatar>
        
        {/* Notification type indicator */}
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 border">
          {getNotificationIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className={cn(
              'font-medium truncate',
              compact ? 'text-sm' : 'text-base'
            )}>
              {notification.participantName}
            </p>
            <p className={cn(
              'text-gray-600 mt-0.5',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {getNotificationText()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(notification.timestamp, { 
                addSuffix: true,
                locale: ru 
              })}
            </p>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center space-x-1 ml-2">
              {!notification.read && onMarkRead && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMarkRead(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <CheckCircle className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Отметить как прочитанное</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {onDismiss && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDismiss(notification.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Скрыть уведомление</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Notification list component
interface ParticipantNotificationListProps {
  notifications: ParticipantNotification[]
  maxVisible?: number
  showUnreadOnly?: boolean
  onMarkRead?: (notificationId: string) => void
  onMarkAllRead?: () => void
  onDismiss?: (notificationId: string) => void
  onClearAll?: () => void
  compact?: boolean
  className?: string
}

export function ParticipantNotificationList({
  notifications,
  maxVisible = 10,
  showUnreadOnly = false,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onClearAll,
  compact = false,
  className
}: ParticipantNotificationListProps) {
  const filteredNotifications = showUnreadOnly 
    ? notifications.filter(n => !n.read)
    : notifications

  const sortedNotifications = [...filteredNotifications]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, maxVisible)

  const unreadCount = notifications.filter(n => !n.read).length

  if (sortedNotifications.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">
          {showUnreadOnly ? 'Нет новых уведомлений' : 'Нет уведомлений'}
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-medium">Уведомления</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {unreadCount > 0 && onMarkAllRead && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onMarkAllRead}
              className="text-xs"
            >
              Прочитать все
            </Button>
          )}
          
          {onClearAll && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearAll}
              className="text-xs"
            >
              Очистить
            </Button>
          )}
        </div>
      </div>

      {/* Notification items */}
      <div className="space-y-2">
        {sortedNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={onMarkRead}
            onDismiss={onDismiss}
            compact={compact}
          />
        ))}
      </div>

      {/* Show more indicator */}
      {filteredNotifications.length > maxVisible && (
        <div className="text-center p-2 text-sm text-gray-500">
          +{filteredNotifications.length - maxVisible} еще
        </div>
      )}
    </div>
  )
}

// Live notification service hook
export function useParticipantNotifications(channelId?: string) {
  const [notifications, setNotifications] = useState<ParticipantNotification[]>([])
  const [settings, setSettings] = useState({
    enableJoinLeave: true,
    enableStatusChange: true,
    enableRoleChange: true,
    enableTyping: false,
    enableSound: true,
    autoMarkRead: true
  })

  const { onStatusUpdate, onTypingUpdate } = useParticipantStatus()

  // Generate notification from status update
  const createNotificationFromStatusUpdate = useCallback((event: StatusUpdateEvent, currentParticipants: ChatParticipant[]): ParticipantNotification | null => {
    const participant = currentParticipants.find(p => p.id === event.participantId)
    
    if (!participant) return null

    // Determine notification type
    let type: ParticipantNotification['type']
    if (event.newStatus === 'online' && event.previousStatus === 'offline') {
      if (!settings.enableJoinLeave) return null
      type = 'joined'
    } else if (event.newStatus === 'offline' && event.previousStatus !== 'offline') {
      if (!settings.enableJoinLeave) return null
      type = 'left'
    } else {
      if (!settings.enableStatusChange) return null
      type = 'status_change'
    }

    return {
      id: `${event.participantId}-${event.timestamp.getTime()}`,
      type,
      participantId: event.participantId,
      participantName: participant.name,
      avatar: participant.avatar,
      timestamp: event.timestamp,
      data: {
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        source: event.source
      },
      read: settings.autoMarkRead,
      channelId
    }
  }, [settings, channelId])

  // Generate notification from typing update
  const createNotificationFromTypingUpdate = useCallback((event: TypingUpdateEvent): ParticipantNotification | null => {
    if (!settings.enableTyping || event.channelId !== channelId) return null

    return {
      id: `${event.participantId}-typing-${event.timestamp.getTime()}`,
      type: event.isTyping ? 'typing_start' : 'typing_stop',
      participantId: event.participantId,
      participantName: event.participantName,
      timestamp: event.timestamp,
      data: {
        isTyping: event.isTyping,
        channelId: event.channelId
      },
      read: settings.autoMarkRead,
      channelId: event.channelId
    }
  }, [settings, channelId])

  const { participants } = useParticipantStatus()

  // Listen to participant events
  useEffect(() => {
    const cleanupStatus = onStatusUpdate((event) => {
      const notification = createNotificationFromStatusUpdate(event, participants)
      if (notification) {
        setNotifications(prev => [notification, ...prev.slice(0, 49)]) // Keep last 50
        
        // Show toast notification
        if (settings.enableSound) {
          switch (notification.type) {
            case 'joined':
              toast.success(`${notification.participantName} присоединился к чату`)
              break
            case 'left':
              toast.info(`${notification.participantName} покинул чат`)
              break
          }
        }
      }
    })

    const cleanupTyping = onTypingUpdate((event) => {
      const notification = createNotificationFromTypingUpdate(event)
      if (notification) {
        setNotifications(prev => [notification, ...prev.slice(0, 49)])
      }
    })

    return () => {
      cleanupStatus()
      cleanupTyping()
    }
  }, [onStatusUpdate, onTypingUpdate, createNotificationFromStatusUpdate, createNotificationFromTypingUpdate, settings, participants])

  // Notification management functions
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }, [])

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }))
  }, [])

  return {
    notifications,
    settings,
    unreadCount: notifications.filter(n => !n.read).length,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    updateSettings
  }
}

// Notification settings component
interface NotificationSettingsProps {
  settings: ReturnType<typeof useParticipantNotifications>['settings']
  onSettingsChange: (settings: any) => void
  className?: string
}

export function NotificationSettings({
  settings,
  onSettingsChange,
  className
}: NotificationSettingsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm">Настройки уведомлений</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="join-leave" className="text-sm">
              Присоединение/выход
            </Label>
            <Switch
              id="join-leave"
              checked={settings.enableJoinLeave}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableJoinLeave: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="status-change" className="text-sm">
              Изменение статуса
            </Label>
            <Switch
              id="status-change"
              checked={settings.enableStatusChange}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableStatusChange: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="role-change" className="text-sm">
              Изменение ролей
            </Label>
            <Switch
              id="role-change"
              checked={settings.enableRoleChange}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableRoleChange: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="typing" className="text-sm">
              Печатание
            </Label>
            <Switch
              id="typing"
              checked={settings.enableTyping}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableTyping: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="sound" className="text-sm">
              Звуковые уведомления
            </Label>
            <Switch
              id="sound"
              checked={settings.enableSound}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, enableSound: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-read" className="text-sm">
              Автоматически читать
            </Label>
            <Switch
              id="auto-read"
              checked={settings.autoMarkRead}
              onCheckedChange={(checked) => 
                onSettingsChange({ ...settings, autoMarkRead: checked })
              }
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ParticipantNotificationList
