/**
 * Participant List Component with Avatars and Status
 * Task 17.5: Participant Management System - Core Component
 */

'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ChatParticipant,
  ParticipantRole,
  ParticipantStatus,
  ParticipantListConfig,
  getRoleDisplayName,
  getStatusDisplayName,
  getRoleColor,
  getStatusColor,
  hasPermission
} from '@/lib/chat/participant-types'
import {
  Users,
  Crown,
  Shield,
  User,
  Eye,
  MapPin,
  Settings,
  MoreVertical,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Circle,
  Dot,
  MessageCircle,
  Phone,
  Video,
  Mail,
  UserX,
  Volume2,
  VolumeX,
  UserMinus,
  UserPlus,
  Clock,
  Activity
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// Role icons mapping
const getRoleIcon = (role: ParticipantRole, size = 'w-3 h-3') => {
  const iconClass = cn(size)
  switch (role) {
    case 'captain':
      return <Crown className={iconClass} />
    case 'co-captain':
      return <Shield className={iconClass} />
    case 'guide':
      return <MapPin className={iconClass} />
    case 'observer':
      return <Eye className={iconClass} />
    default:
      return <User className={iconClass} />
  }
}

// Individual participant item component
interface ParticipantItemProps {
  participant: ChatParticipant
  currentUserId?: string
  onAction?: (action: string, participantId: string, data?: any) => void
  showActions?: boolean
  compact?: boolean
  showLastSeen?: boolean
  showUnreadCount?: boolean
}

function ParticipantItem({
  participant,
  currentUserId,
  onAction,
  showActions = true,
  compact = false,
  showLastSeen = true,
  showUnreadCount = false
}: ParticipantItemProps) {
  const isCurrentUser = participant.id === currentUserId
  const canManageParticipant = !isCurrentUser && hasPermission(participant, 'canKickMembers')

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
      'flex items-center justify-between p-3 hover:bg-gray-50 transition-colors',
      compact && 'p-2'
    )}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Avatar with status indicator */}
        <div className="relative">
          <Avatar className={cn(compact ? 'w-8 h-8' : 'w-10 h-10')}>
            <AvatarImage 
              src={participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=random`}
              alt={participant.name}
            />
            <AvatarFallback>
              {getInitials(participant.name)}
            </AvatarFallback>
          </Avatar>
          
          {/* Online status dot */}
          <div 
            className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
              compact && 'w-2.5 h-2.5'
            )}
            style={{ backgroundColor: getStatusColor(participant.status) }}
          />
          
          {/* Typing indicator */}
          {participant.isTyping && (
            <div className="absolute -top-1 -right-1 w-3 h-3">
              <div className="w-full h-full bg-blue-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {/* Participant info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className={cn(
              'font-medium truncate',
              compact ? 'text-sm' : 'text-base',
              isCurrentUser && 'text-blue-600'
            )}>
              {participant.name}
              {isCurrentUser && ' (Вы)'}
            </h4>
            
            {/* Role badge */}
            <Badge 
              variant="outline" 
              className={cn(
                'text-xs flex items-center space-x-1',
                compact && 'text-xs px-1 py-0'
              )}
              style={{ 
                borderColor: getRoleColor(participant.role),
                color: getRoleColor(participant.role)
              }}
            >
              {getRoleIcon(participant.role, compact ? 'w-2.5 h-2.5' : 'w-3 h-3')}
              <span>{getRoleDisplayName(participant.role)}</span>
            </Badge>
          </div>

          {!compact && (
            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
              {/* Status */}
              <div className="flex items-center space-x-1">
                <Circle className="w-2 h-2 fill-current" style={{ color: getStatusColor(participant.status) }} />
                <span>{getStatusDisplayName(participant.status)}</span>
              </div>

              {/* Last seen */}
              {showLastSeen && !participant.isOnline && (
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(participant.lastSeen, { 
                      addSuffix: true,
                      locale: ru 
                    })}
                  </span>
                </div>
              )}

              {/* Unread count */}
              {showUnreadCount && participant.unreadCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {participant.unreadCount}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action menu */}
      {showActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Действия</DropdownMenuLabel>
            
            {/* Communication actions */}
            <DropdownMenuItem onClick={() => onAction?.('message', participant.id)}>
              <MessageCircle className="w-4 h-4 mr-2" />
              Личное сообщение
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => onAction?.('call', participant.id)}>
              <Phone className="w-4 h-4 mr-2" />
              Голосовой вызов
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/* Profile actions */}
            <DropdownMenuItem onClick={() => onAction?.('profile', participant.id)}>
              <User className="w-4 h-4 mr-2" />
              Просмотр профиля
            </DropdownMenuItem>

            {/* Management actions (for privileged users) */}
            {canManageParticipant && (
              <>
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => onAction?.('mute', participant.id)}>
                  <VolumeX className="w-4 h-4 mr-2" />
                  Заглушить
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={() => onAction?.('change_role', participant.id)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Изменить роль
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => onAction?.('kick', participant.id)}
                  className="text-red-600 focus:text-red-600"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Исключить
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

// Main participant list component
interface ParticipantListProps {
  participants: ChatParticipant[]
  currentUserId?: string
  config?: Partial<ParticipantListConfig>
  onAction?: (action: string, participantId: string, data?: any) => void
  onConfigChange?: (config: ParticipantListConfig) => void
  className?: string
  title?: string
  showSearch?: boolean
  showFilters?: boolean
  compact?: boolean
  maxHeight?: string
}

export function ParticipantList({
  participants,
  currentUserId,
  config = {},
  onAction,
  onConfigChange,
  className,
  title = 'Участники чата',
  showSearch = true,
  showFilters = true,
  compact = false,
  maxHeight = '400px'
}: ParticipantListProps) {
  // State for list configuration
  const [listConfig, setListConfig] = useState<ParticipantListConfig>({
    showOfflineMembers: true,
    sortBy: 'role',
    sortDirection: 'asc',
    groupByRole: true,
    showDetailedInfo: true,
    ...config
  })

  const [searchQuery, setSearchQuery] = useState('')

  // Update config
  const updateConfig = useCallback((updates: Partial<ParticipantListConfig>) => {
    const newConfig = { ...listConfig, ...updates }
    setListConfig(newConfig)
    onConfigChange?.(newConfig)
  }, [listConfig, onConfigChange])

  // Filter and sort participants
  const filteredAndSortedParticipants = useMemo(() => {
    let filtered = [...participants]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.role.toLowerCase().includes(query) ||
        p.profile.displayName.toLowerCase().includes(query)
      )
    }

    // Apply role filter
    if (listConfig.filterByRole && listConfig.filterByRole.length > 0) {
      filtered = filtered.filter(p => listConfig.filterByRole!.includes(p.role))
    }

    // Apply status filter
    if (listConfig.filterByStatus && listConfig.filterByStatus.length > 0) {
      filtered = filtered.filter(p => listConfig.filterByStatus!.includes(p.status))
    }

    // Hide offline members if configured
    if (!listConfig.showOfflineMembers) {
      filtered = filtered.filter(p => p.isOnline)
    }

    // Sort participants
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (listConfig.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'role':
          const roleOrder = ['captain', 'co-captain', 'guide', 'participant', 'observer']
          comparison = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
          break
        case 'status':
          const statusOrder = ['online', 'away', 'busy', 'offline']
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
          break
        case 'lastActivity':
          comparison = b.lastActivity.getTime() - a.lastActivity.getTime()
          break
        case 'joinedAt':
          comparison = a.joinedAt.getTime() - b.joinedAt.getTime()
          break
        default:
          comparison = 0
      }

      return listConfig.sortDirection === 'desc' ? -comparison : comparison
    })

    return filtered
  }, [participants, searchQuery, listConfig])

  // Group participants by role if configured
  const groupedParticipants = useMemo(() => {
    if (!listConfig.groupByRole) {
      return [{ role: null, participants: filteredAndSortedParticipants }]
    }

    const groups: { role: ParticipantRole | null; participants: ChatParticipant[] }[] = []
    const roleOrder: ParticipantRole[] = ['captain', 'co-captain', 'guide', 'participant', 'observer']

    for (const role of roleOrder) {
      const roleParticipants = filteredAndSortedParticipants.filter(p => p.role === role)
      if (roleParticipants.length > 0) {
        groups.push({ role, participants: roleParticipants })
      }
    }

    return groups
  }, [filteredAndSortedParticipants, listConfig.groupByRole])

  // Statistics
  const stats = useMemo(() => {
    const total = participants.length
    const online = participants.filter(p => p.isOnline).length
    const offline = total - online
    const typing = participants.filter(p => p.isTyping).length

    return { total, online, offline, typing }
  }, [participants])

  return (
    <Card className={className}>
      <CardHeader className={cn('pb-3', compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('flex items-center space-x-2', compact ? 'text-sm' : 'text-base')}>
            <Users className={cn(compact ? 'w-4 h-4' : 'w-5 h-5')} />
            <span>{title}</span>
            <Badge variant="secondary" className="text-xs">
              {stats.total}
            </Badge>
          </CardTitle>

          {/* Quick stats */}
          <div className="flex items-center space-x-2 text-xs text-gray-600">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>{stats.online}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              <span>{stats.offline}</span>
            </div>
            {stats.typing > 0 && (
              <div className="flex items-center space-x-1">
                <Activity className="w-3 h-3 text-blue-500" />
                <span>{stats.typing}</span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Поиск участников..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-sm"
              />
            </div>
          </div>
        )}

        {/* Filters and sorting */}
        {showFilters && !compact && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-offline"
                  checked={listConfig.showOfflineMembers}
                  onCheckedChange={(checked) => updateConfig({ showOfflineMembers: checked })}
                />
                <Label htmlFor="show-offline" className="text-xs">
                  Показать офлайн
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="group-by-role"
                  checked={listConfig.groupByRole}
                  onCheckedChange={(checked) => updateConfig({ groupByRole: checked })}
                />
                <Label htmlFor="group-by-role" className="text-xs">
                  Группировать по ролям
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Select
                value={listConfig.sortBy}
                onValueChange={(value: any) => updateConfig({ sortBy: value })}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">По имени</SelectItem>
                  <SelectItem value="role">По роли</SelectItem>
                  <SelectItem value="status">По статусу</SelectItem>
                  <SelectItem value="lastActivity">По активности</SelectItem>
                  <SelectItem value="joinedAt">По времени входа</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateConfig({ 
                  sortDirection: listConfig.sortDirection === 'asc' ? 'desc' : 'asc' 
                })}
                className="h-8 w-8 p-0"
              >
                {listConfig.sortDirection === 'asc' ? 
                  <SortAsc className="w-4 h-4" /> : 
                  <SortDesc className="w-4 h-4" />
                }
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <div 
          className="overflow-y-auto"
          style={{ maxHeight }}
        >
          {groupedParticipants.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Участники не найдены</p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedParticipants.map((group, groupIndex) => (
                <div key={group.role || 'ungrouped'}>
                  {/* Group header */}
                  {listConfig.groupByRole && group.role && (
                    <div className="px-3 py-2 bg-gray-100 border-b">
                      <div className="flex items-center space-x-2 text-sm font-medium">
                        {getRoleIcon(group.role)}
                        <span>{getRoleDisplayName(group.role)}</span>
                        <Badge variant="outline" className="text-xs">
                          {group.participants.length}
                        </Badge>
                      </div>
                    </div>
                  )}

                  {/* Participants in group */}
                  {group.participants.map((participant, index) => (
                    <ParticipantItem
                      key={participant.id}
                      participant={participant}
                      currentUserId={currentUserId}
                      onAction={onAction}
                      compact={compact}
                      showLastSeen={listConfig.showDetailedInfo}
                      showUnreadCount={true}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
