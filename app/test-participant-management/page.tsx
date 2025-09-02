/**
 * Demo Page for Participant Management System Testing
 * Task 17.5: Participant Management System - Complete Integration Testing
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  ParticipantList,
  ParticipantManagement,
  BulkParticipantManagement,
  ChannelTypingIndicator,
  MessageReadReceipt,
  ParticipantNotificationList,
  NotificationSettings,
  ParticipantStatusProvider,
  useParticipantStatus,
  useParticipantNotifications,
  createChatParticipant,
  canManageParticipant,
  PARTICIPANT_CONFIG
} from '@/components/chat/participants'
import {
  ChatParticipant,
  ParticipantRole,
  ParticipantStatus
} from '@/lib/chat/participant-types'
import {
  Users,
  Settings,
  TestTube,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Activity,
  MessageCircle,
  Clock,
  Crown,
  Shield,
  User,
  MapPin,
  UserPlus,
  UserMinus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Test data generator
const generateTestParticipants = (): ChatParticipant[] => [
  createChatParticipant('captain-1', 'Капитан Марко', 'captain', {
    avatar: 'https://ui-avatars.com/api/?name=Marco&background=ef4444&color=fff',
    status: 'online',
    profile: { experience: 'expert', fishingExperience: 15 }
  }),
  createChatParticipant('co-captain-1', 'Помощник Анна', 'co-captain', {
    avatar: 'https://ui-avatars.com/api/?name=Anna&background=f97316&color=fff',
    status: 'online',
    profile: { experience: 'advanced', fishingExperience: 8 }
  }),
  createChatParticipant('guide-1', 'Гид Педро', 'guide', {
    avatar: 'https://ui-avatars.com/api/?name=Pedro&background=10b981&color=fff',
    status: 'away',
    profile: { experience: 'expert', fishingExperience: 20 }
  }),
  createChatParticipant('participant-1', 'Участник Александр', 'participant', {
    avatar: 'https://ui-avatars.com/api/?name=Alex&background=3b82f6&color=fff',
    status: 'online',
    profile: { experience: 'intermediate', fishingExperience: 3 }
  }),
  createChatParticipant('participant-2', 'Участник Мария', 'participant', {
    avatar: 'https://ui-avatars.com/api/?name=Maria&background=3b82f6&color=fff',
    status: 'busy',
    profile: { experience: 'beginner', fishingExperience: 1 }
  }),
  createChatParticipant('participant-3', 'Участник Жоао', 'participant', {
    avatar: 'https://ui-avatars.com/api/?name=Joao&background=3b82f6&color=fff',
    status: 'offline',
    profile: { experience: 'intermediate', fishingExperience: 5 }
  }),
  createChatParticipant('observer-1', 'Наблюдатель Елена', 'observer', {
    avatar: 'https://ui-avatars.com/api/?name=Elena&background=6b7280&color=fff',
    status: 'online',
    profile: { experience: 'beginner', fishingExperience: 0 }
  })
]

// Demo control panel
interface DemoControlPanelProps {
  currentUserId: string
  currentUserRole: ParticipantRole
  onUserChange: (userId: string, role: ParticipantRole) => void
  onSimulateActivity: (type: string) => void
  onResetDemo: () => void
}

function DemoControlPanel({
  currentUserId,
  currentUserRole,
  onUserChange,
  onSimulateActivity,
  onResetDemo
}: DemoControlPanelProps) {
  const testUsers = [
    { id: 'captain-1', name: 'Капитан Марко', role: 'captain' as ParticipantRole },
    { id: 'co-captain-1', name: 'Помощник Анна', role: 'co-captain' as ParticipantRole },
    { id: 'participant-1', name: 'Участник Александр', role: 'participant' as ParticipantRole },
    { id: 'observer-1', name: 'Наблюдатель Елена', role: 'observer' as ParticipantRole }
  ]

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <TestTube className="w-4 h-4 mr-2" />
          Панель управления демо
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current user selection */}
        <div className="space-y-2">
          <Label className="text-xs">Текущий пользователь</Label>
          <Select 
            value={currentUserId} 
            onValueChange={(userId) => {
              const user = testUsers.find(u => u.id === userId)
              if (user) onUserChange(userId, user.role)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {testUsers.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Current role info */}
        <div className="p-3 bg-white rounded-lg border text-sm">
          <div className="flex items-center space-x-2 mb-2">
            {currentUserRole === 'captain' && <Crown className="w-4 h-4 text-red-500" />}
            {currentUserRole === 'co-captain' && <Shield className="w-4 h-4 text-orange-500" />}
            {currentUserRole === 'guide' && <MapPin className="w-4 h-4 text-green-500" />}
            {currentUserRole === 'participant' && <User className="w-4 h-4 text-blue-500" />}
            {currentUserRole === 'observer' && <Eye className="w-4 h-4 text-gray-500" />}
            <span className="font-medium">Роль: {currentUserRole}</span>
          </div>
          <div className="text-xs text-gray-600">
            Права: {canManageParticipant(currentUserRole, 'participant') ? 'Может управлять участниками' : 'Ограниченные права'}
          </div>
        </div>

        {/* Simulation buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onSimulateActivity('typing')}
          >
            <Activity className="w-3 h-3 mr-1" />
            Печатание
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onSimulateActivity('join')}
          >
            <UserPlus className="w-3 h-3 mr-1" />
            Присоединение
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onSimulateActivity('leave')}
          >
            <UserMinus className="w-3 h-3 mr-1" />
            Выход
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onResetDemo}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Сброс
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Statistics panel
interface StatisticsPanelProps {
  participants: ChatParticipant[]
}

function StatisticsPanel({ participants }: StatisticsPanelProps) {
  const stats = {
    total: participants.length,
    online: participants.filter(p => p.status === 'online').length,
    away: participants.filter(p => p.status === 'away').length,
    busy: participants.filter(p => p.status === 'busy').length,
    offline: participants.filter(p => p.status === 'offline').length,
    typing: participants.filter(p => p.isTyping).length,
    captains: participants.filter(p => p.role === 'captain').length,
    coCaptains: participants.filter(p => p.role === 'co-captain').length,
    guides: participants.filter(p => p.role === 'guide').length,
    regulars: participants.filter(p => p.role === 'participant').length,
    observers: participants.filter(p => p.role === 'observer').length
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Статистика участников</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {/* Status stats */}
          <div>
            <h4 className="font-medium mb-2">По статусу</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                  В сети
                </span>
                <span>{stats.online}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                  Отошел
                </span>
                <span>{stats.away}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  Занят
                </span>
                <span>{stats.busy}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                  Офлайн
                </span>
                <span>{stats.offline}</span>
              </div>
              {stats.typing > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span className="flex items-center">
                    <Activity className="w-3 h-3 mr-2 animate-pulse" />
                    Печатают
                  </span>
                  <span>{stats.typing}</span>
                </div>
              )}
            </div>
          </div>

          {/* Role stats */}
          <div>
            <h4 className="font-medium mb-2">По ролям</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="flex items-center">
                  <Crown className="w-3 h-3 mr-2 text-red-500" />
                  Капитаны
                </span>
                <span>{stats.captains}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <Shield className="w-3 h-3 mr-2 text-orange-500" />
                  Помощники
                </span>
                <span>{stats.coCaptains}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 mr-2 text-green-500" />
                  Гиды
                </span>
                <span>{stats.guides}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <User className="w-3 h-3 mr-2 text-blue-500" />
                  Участники
                </span>
                <span>{stats.regulars}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  <Eye className="w-3 h-3 mr-2 text-gray-500" />
                  Наблюдатели
                </span>
                <span>{stats.observers}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Core demo component (used within providers)
function ParticipantManagementDemoCore() {
  const [currentUserId, setCurrentUserId] = useState('captain-1')
  const [currentUserRole, setCurrentUserRole] = useState<ParticipantRole>('captain')
  const [selectedParticipants, setSelectedParticipants] = useState<ChatParticipant[]>([])
  const [currentTab, setCurrentTab] = useState('list')
  const [channelId] = useState('demo-channel-123')

  const { 
    participants, 
    statistics,
    addParticipant,
    removeParticipant,
    updateParticipantStatus
  } = useParticipantStatus()

  const {
    notifications,
    settings,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    updateSettings
  } = useParticipantNotifications(channelId)

  // Initialize test participants
  useEffect(() => {
    const testParticipants = generateTestParticipants()
    testParticipants.forEach(participant => {
      addParticipant(participant)
    })
  }, [addParticipant])

  // Handle user change
  const handleUserChange = useCallback((userId: string, role: ParticipantRole) => {
    setCurrentUserId(userId)
    setCurrentUserRole(role)
  }, [])

  // Handle participant actions
  const handleParticipantAction = useCallback(async (action: string, participantId: string, data?: any) => {
    console.log('Participant action:', action, participantId, data)
    
    switch (action) {
      case 'change_role':
        toast.success(`Роль участника изменена на ${data.newRole}`)
        break
      case 'mute':
        toast.success(`Участник заглушен${data.duration ? ` на ${data.duration} минут` : ''}`)
        break
      case 'kick':
        removeParticipant(participantId)
        toast.success('Участник исключен из чата')
        break
      case 'ban':
        removeParticipant(participantId)
        toast.success('Участник забанен')
        break
      case 'direct_message':
        toast.info('Открытие личного чата...')
        break
      case 'call':
        toast.info('Начало голосового вызова...')
        break
      case 'video_call':
        toast.info('Начало видео вызова...')
        break
      case 'view_profile':
        toast.info('Открытие профиля участника...')
        break
      default:
        toast.info(`Действие: ${action}`)
    }
  }, [removeParticipant])

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string, participantIds: string[], data?: any) => {
    console.log('Bulk action:', action, participantIds, data)
    toast.success(`Групповое действие "${action}" применено к ${participantIds.length} участникам`)
  }, [])

  // Simulate activities
  const handleSimulateActivity = useCallback((type: string) => {
    const randomParticipant = participants[Math.floor(Math.random() * participants.length)]
    if (!randomParticipant) return

    switch (type) {
      case 'typing':
        // Simulate typing
        updateParticipantStatus(randomParticipant.id, 'online')
        toast.info(`${randomParticipant.name} начал печатать`)
        break
      case 'join':
        // Simulate new participant joining
        const newParticipant = createChatParticipant(
          `new-${Date.now()}`,
          `Новый участник ${Math.floor(Math.random() * 100)}`,
          'participant'
        )
        addParticipant(newParticipant)
        break
      case 'leave':
        // Simulate participant leaving
        if (participants.length > 1) {
          const leavingParticipant = participants.find(p => p.id !== currentUserId)
          if (leavingParticipant) {
            updateParticipantStatus(leavingParticipant.id, 'offline')
          }
        }
        break
    }
  }, [participants, currentUserId, updateParticipantStatus, addParticipant])

  // Reset demo
  const handleResetDemo = useCallback(() => {
    // Clear all participants
    participants.forEach(p => removeParticipant(p.id))
    
    // Re-add test participants
    setTimeout(() => {
      const testParticipants = generateTestParticipants()
      testParticipants.forEach(participant => {
        addParticipant(participant)
      })
    }, 100)

    clearAllNotifications()
    setSelectedParticipants([])
    toast.success('Демо сброшено')
  }, [participants, removeParticipant, addParticipant, clearAllNotifications])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Демо системы управления участниками
          </h1>
          <p className="text-gray-600">
            Полная система управления участниками чата с ролями, статусами и уведомлениями
          </p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <Badge variant="outline">
              Участников: {statistics.total}
            </Badge>
            <Badge variant="outline">
              Онлайн: {statistics.online}
            </Badge>
            <Badge variant="outline">
              Уведомлений: {unreadCount}
            </Badge>
          </div>
        </div>

        {/* Control Panel */}
        <DemoControlPanel
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          onUserChange={handleUserChange}
          onSimulateActivity={handleSimulateActivity}
          onResetDemo={handleResetDemo}
        />

        {/* Main Demo Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="list">Список участников</TabsTrigger>
            <TabsTrigger value="management">Управление</TabsTrigger>
            <TabsTrigger value="indicators">Индикаторы</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
            <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          </TabsList>

          {/* Participant List Tab */}
          <TabsContent value="list">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <ParticipantList
                  participants={participants}
                  currentUserId={currentUserId}
                  onAction={handleParticipantAction}
                  title="Участники чата"
                  showSearch={true}
                  showFilters={true}
                />
              </div>
              <div className="space-y-4">
                <StatisticsPanel participants={participants} />
                
                {/* Typing indicator demo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Индикатор печатания</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChannelTypingIndicator 
                      channelId={channelId}
                      compact={true}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Management Tab */}
          <TabsContent value="management">
            <div className="space-y-6">
              {selectedParticipants.length > 0 && (
                <BulkParticipantManagement
                  selectedParticipants={selectedParticipants}
                  currentUserRole={currentUserRole}
                  onBulkAction={handleBulkAction}
                  onClearSelection={() => setSelectedParticipants([])}
                />
              )}

              <div className="grid gap-4">
                {participants.map((participant) => (
                  <ParticipantManagement
                    key={participant.id}
                    participant={participant}
                    currentUserId={currentUserId}
                    currentUserRole={currentUserRole}
                    onAction={handleParticipantAction}
                    compact={false}
                  />
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Indicators Tab */}
          <TabsContent value="indicators">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Typing Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ChannelTypingIndicator 
                    channelId={channelId}
                    showAvatars={true}
                  />
                  
                  <Button
                    size="sm"
                    onClick={() => handleSimulateActivity('typing')}
                  >
                    Симулировать печатание
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Read Receipts</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MessageReadReceipt
                    messageId="demo-message-123"
                    channelId={channelId}
                    showDetails={true}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <ParticipantNotificationList
                  notifications={notifications}
                  onMarkRead={markAsRead}
                  onMarkAllRead={markAllAsRead}
                  onDismiss={dismissNotification}
                  onClearAll={clearAllNotifications}
                />
              </div>
              <div>
                <NotificationSettings
                  settings={settings}
                  onSettingsChange={updateSettings}
                />
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-6">
              <StatisticsPanel participants={participants} />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Активность</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span>Всего участников:</span>
                      <span>{statistics.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Онлайн:</span>
                      <span className="text-green-600">{statistics.online}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Печатают:</span>
                      <span className="text-blue-600">{statistics.typing}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Уведомления:</span>
                      <span>{notifications.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Непрочитанные:</span>
                      <span className="text-red-600">{unreadCount}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-center text-sm text-gray-600">
              <p>🚀 <strong>Task 17.5 Complete:</strong> Система управления участниками полностью реализована</p>
              <p className="mt-1">
                Включает: список участников, статусы в реальном времени, ролевую систему, 
                typing indicators, read receipts, уведомления и полное управление участниками
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Main exported component with all providers
export default function TestParticipantManagementPage() {
  return (
    <ParticipantStatusProvider
      autoConnect={true}
      config={{
        heartbeatInterval: 30000,
        typingTimeout: 3000,
        awayTimeout: 300000,
        offlineTimeout: 600000
      }}
    >
      <ParticipantManagementDemoCore />
    </ParticipantStatusProvider>
  )
}
