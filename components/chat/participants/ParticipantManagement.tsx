/**
 * Participant Management Component with Actions
 * Task 17.5: Participant Management System - Participant Actions and Role Management
 */

'use client'

import React, { useState, useCallback } from 'react'
import {
  ChatParticipant,
  ParticipantRole,
  ParticipantStatus,
  hasPermission,
  getRoleDisplayName,
  getStatusDisplayName,
  getRoleColor,
  getStatusColor,
  DEFAULT_ROLE_PERMISSIONS
} from '@/lib/chat/participant-types'
import { useParticipantStatus, useParticipantActions } from '@/lib/chat/participants/useParticipantStatus'
import {
  Settings,
  UserX,
  Volume2,
  VolumeX,
  Shield,
  Crown,
  User,
  Eye,
  MapPin,
  Clock,
  MessageCircle,
  Phone,
  Video,
  Mail,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  X,
  Save,
  Ban,
  UserMinus,
  UserPlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Role change dialog
interface RoleChangeDialogProps {
  participant: ChatParticipant
  currentUserRole: ParticipantRole
  isOpen: boolean
  onClose: () => void
  onConfirm: (newRole: ParticipantRole, reason?: string) => void
}

function RoleChangeDialog({
  participant,
  currentUserRole,
  isOpen,
  onClose,
  onConfirm
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<ParticipantRole>(participant.role)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const availableRoles: ParticipantRole[] = (() => {
    switch (currentUserRole) {
      case 'captain':
        return ['captain', 'co-captain', 'guide', 'participant', 'observer']
      case 'co-captain':
        return ['participant', 'observer']
      default:
        return []
    }
  })()

  const getRoleIcon = (role: ParticipantRole) => {
    switch (role) {
      case 'captain': return <Crown className="w-4 h-4" />
      case 'co-captain': return <Shield className="w-4 h-4" />
      case 'guide': return <MapPin className="w-4 h-4" />
      case 'observer': return <Eye className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  const handleConfirm = async () => {
    if (selectedRole === participant.role) {
      onClose()
      return
    }

    setIsLoading(true)
    try {
      await onConfirm(selectedRole, reason)
      onClose()
      toast.success(`Роль ${participant.name} изменена на ${getRoleDisplayName(selectedRole)}`)
    } catch (error) {
      toast.error('Ошибка при изменении роли')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить роль участника</DialogTitle>
          <DialogDescription>
            Изменение роли {participant.name} повлияет на их права в чате
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Текущая роль</Label>
            <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
              {getRoleIcon(participant.role)}
              <span>{getRoleDisplayName(participant.role)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Новая роль</Label>
            <Select value={selectedRole} onValueChange={(value: ParticipantRole) => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(role)}
                      <span>{getRoleDisplayName(role)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRole !== participant.role && (
            <div className="space-y-2">
              <Label>Права новой роли</Label>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DEFAULT_ROLE_PERMISSIONS[selectedRole]).map(([permission, allowed]) => (
                    <div key={permission} className="flex items-center space-x-2">
                      {allowed ? (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      ) : (
                        <X className="w-3 h-3 text-red-500" />
                      )}
                      <span className="text-xs">{permission.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Причина изменения (необязательно)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Укажите причину изменения роли..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={isLoading || selectedRole === participant.role}
          >
            {isLoading ? 'Изменение...' : 'Изменить роль'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Mute/Ban dialog
interface ModerationDialogProps {
  participant: ChatParticipant
  action: 'mute' | 'kick' | 'ban'
  isOpen: boolean
  onClose: () => void
  onConfirm: (duration?: number, reason?: string) => void
}

function ModerationDialog({
  participant,
  action,
  isOpen,
  onClose,
  onConfirm
}: ModerationDialogProps) {
  const [duration, setDuration] = useState<number | undefined>(undefined)
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const actionText = {
    mute: 'заглушить',
    kick: 'исключить',
    ban: 'забанить'
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(duration, reason)
      onClose()
      toast.success(`${participant.name} ${actionText[action]}${duration ? ` на ${duration} минут` : ''}`)
    } catch (error) {
      toast.error(`Ошибка при попытке ${actionText[action]} участника`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-red-600">
            {action === 'mute' ? 'Заглушить' : action === 'kick' ? 'Исключить' : 'Забанить'} участника
          </DialogTitle>
          <DialogDescription>
            Вы уверены, что хотите {actionText[action]} {participant.name}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {action === 'mute' && (
            <div className="space-y-2">
              <Label>Длительность (минуты)</Label>
              <Select 
                value={duration?.toString() || 'permanent'} 
                onValueChange={(value) => setDuration(value === 'permanent' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 минут</SelectItem>
                  <SelectItem value="15">15 минут</SelectItem>
                  <SelectItem value="30">30 минут</SelectItem>
                  <SelectItem value="60">1 час</SelectItem>
                  <SelectItem value="180">3 часа</SelectItem>
                  <SelectItem value="permanent">Навсегда</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Причина</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Укажите причину для ${actionText[action]}...`}
              rows={3}
            />
          </div>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Внимание!</p>
                <p>
                  {action === 'kick' && 'Участник будет исключен из чата и не сможет вернуться без нового приглашения.'}
                  {action === 'ban' && 'Участник будет забанен и не сможет присоединиться к чату повторно.'}
                  {action === 'mute' && 'Участник не сможет отправлять сообщения в течение указанного времени.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Выполнение...' : `${action === 'mute' ? 'Заглушить' : action === 'kick' ? 'Исключить' : 'Забанить'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main participant management component
interface ParticipantManagementProps {
  participant: ChatParticipant
  currentUserId: string
  currentUserRole: ParticipantRole
  onAction?: (action: string, participantId: string, data?: any) => Promise<void>
  compact?: boolean
  className?: string
}

export function ParticipantManagement({
  participant,
  currentUserId,
  currentUserRole,
  onAction,
  compact = false,
  className
}: ParticipantManagementProps) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [moderationDialog, setModerationDialog] = useState<{
    open: boolean
    action: 'mute' | 'kick' | 'ban'
  }>({ open: false, action: 'mute' })

  const isCurrentUser = participant.id === currentUserId
  const canManage = hasPermission({ role: currentUserRole } as ChatParticipant, 'canKickMembers') && !isCurrentUser

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleRoleChange = async (newRole: ParticipantRole, reason?: string) => {
    await onAction?.('change_role', participant.id, { newRole, reason })
  }

  const handleModeration = async (action: 'mute' | 'kick' | 'ban', duration?: number, reason?: string) => {
    await onAction?.(action, participant.id, { duration, reason })
  }

  const handleDirectMessage = () => {
    onAction?.('direct_message', participant.id)
  }

  const handleCall = () => {
    onAction?.('call', participant.id)
  }

  const handleVideoCall = () => {
    onAction?.('video_call', participant.id)
  }

  return (
    <>
      <Card className={cn('border-l-4', className)} style={{ borderLeftColor: getRoleColor(participant.role) }}>
        <CardContent className={cn('p-4', compact && 'p-3')}>
          <div className="flex items-center justify-between">
            {/* Participant info */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className={compact ? 'w-10 h-10' : 'w-12 h-12'}>
                  <AvatarImage 
                    src={participant.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&background=random`}
                    alt={participant.name}
                  />
                  <AvatarFallback>
                    {getInitials(participant.name)}
                  </AvatarFallback>
                </Avatar>
                
                {/* Status indicator */}
                <div 
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: getStatusColor(participant.status) }}
                />
              </div>

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
                  
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    style={{ 
                      borderColor: getRoleColor(participant.role),
                      color: getRoleColor(participant.role)
                    }}
                  >
                    {getRoleDisplayName(participant.role)}
                  </Badge>
                </div>

                {!compact && (
                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                    <span>{getStatusDisplayName(participant.status)}</span>
                    {participant.isTyping && (
                      <Badge variant="secondary" className="text-xs">
                        Печатает...
                      </Badge>
                    )}
                    {participant.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {participant.unreadCount} непрочитанных
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Action menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Действия</DropdownMenuLabel>
                
                {/* Communication */}
                <DropdownMenuItem onClick={handleDirectMessage}>
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Личное сообщение
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleCall}>
                  <Phone className="w-4 h-4 mr-2" />
                  Голосовой вызов
                </DropdownMenuItem>
                
                <DropdownMenuItem onClick={handleVideoCall}>
                  <Video className="w-4 h-4 mr-2" />
                  Видео вызов
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Profile */}
                <DropdownMenuItem onClick={() => onAction?.('view_profile', participant.id)}>
                  <User className="w-4 h-4 mr-2" />
                  Профиль
                </DropdownMenuItem>

                {/* Management actions (only for privileged users) */}
                {canManage && (
                  <>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => setRoleDialogOpen(true)}>
                      <Settings className="w-4 h-4 mr-2" />
                      Изменить роль
                    </DropdownMenuItem>
                    
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <VolumeX className="w-4 h-4 mr-2" />
                        Модерация
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem 
                          onClick={() => setModerationDialog({ open: true, action: 'mute' })}
                        >
                          <VolumeX className="w-4 h-4 mr-2" />
                          Заглушить
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setModerationDialog({ open: true, action: 'kick' })}
                          className="text-orange-600 focus:text-orange-600"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Исключить
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setModerationDialog({ open: true, action: 'ban' })}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Забанить
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Extended info for non-compact mode */}
          {!compact && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-500">Присоединился:</span>
                  <br />
                  <span>{new Date(participant.joinedAt).toLocaleDateString('ru')}</span>
                </div>
                <div>
                  <span className="text-gray-500">Последняя активность:</span>
                  <br />
                  <span>{new Date(participant.lastActivity).toLocaleDateString('ru')}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role change dialog */}
      <RoleChangeDialog
        participant={participant}
        currentUserRole={currentUserRole}
        isOpen={roleDialogOpen}
        onClose={() => setRoleDialogOpen(false)}
        onConfirm={handleRoleChange}
      />

      {/* Moderation dialog */}
      <ModerationDialog
        participant={participant}
        action={moderationDialog.action}
        isOpen={moderationDialog.open}
        onClose={() => setModerationDialog({ ...moderationDialog, open: false })}
        onConfirm={(duration, reason) => handleModeration(moderationDialog.action, duration, reason)}
      />
    </>
  )
}

// Bulk participant management
interface BulkParticipantManagementProps {
  selectedParticipants: ChatParticipant[]
  currentUserRole: ParticipantRole
  onBulkAction: (action: string, participantIds: string[], data?: any) => Promise<void>
  onClearSelection: () => void
  className?: string
}

export function BulkParticipantManagement({
  selectedParticipants,
  currentUserRole,
  onBulkAction,
  onClearSelection,
  className
}: BulkParticipantManagementProps) {
  const [isLoading, setIsLoading] = useState(false)

  const canBulkManage = hasPermission({ role: currentUserRole } as ChatParticipant, 'canKickMembers')

  const handleBulkAction = async (action: string, data?: any) => {
    setIsLoading(true)
    try {
      const participantIds = selectedParticipants.map(p => p.id)
      await onBulkAction(action, participantIds, data)
      onClearSelection()
      toast.success(`Действие применено к ${participantIds.length} участникам`)
    } catch (error) {
      toast.error('Ошибка при выполнении группового действия')
    } finally {
      setIsLoading(false)
    }
  }

  if (selectedParticipants.length === 0) return null

  return (
    <Card className={cn('border-blue-200 bg-blue-50', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Badge variant="default" className="bg-blue-600">
              {selectedParticipants.length} выбрано
            </Badge>
            <span className="text-sm text-blue-700">
              Групповые действия
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {canBulkManage && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('mute', { duration: 30 })}
                  disabled={isLoading}
                >
                  <VolumeX className="w-4 h-4 mr-1" />
                  Заглушить
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('change_role', { newRole: 'participant' })}
                  disabled={isLoading}
                >
                  <User className="w-4 h-4 mr-1" />
                  Сделать участниками
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ParticipantManagement
