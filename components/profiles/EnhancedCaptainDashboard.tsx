'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  MessageSquare, 
  Star, 
  Users, 
  TrendingUp,
  Award,
  Calendar,
  Fish,
  Target,
  AlertCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ParticipantApproval {
  id: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  appliedAt: string
  processedAt?: string
  message?: string
  rejectedReason?: string
  participant: {
    id: string
    name: string
    email: string
    image?: string
    fisherProfile?: {
      experience: string
      rating: number
      completedTrips: number
      reliability: number
      specialties?: string[]
    }
  }
  trip: {
    id: string
    date: string
    timeSlot: string
    maxParticipants: number
    minRequired: number
    status: string
    currentParticipants: number
    availableSpots: number
  }
}

interface ProfileAnalytics {
  metrics: {
    bookings: {
      total: number
      completed: number
      cancelled: number
    }
    reviews: {
      received: number
      averageRating: number
    }
    approvals: {
      applied: number
      approved: number
      rejected: number
      pending: number
    }
    badges: {
      earned: number
      categories: Record<string, number>
    }
  }
  recentActivity: {
    bookings: any[]
    reviews: any[]
    badges: any[]
  }
}

export default function EnhancedCaptainDashboard() {
  const { data: session } = useSession()
  const [approvals, setApprovals] = useState<ParticipantApproval[]>([])
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingApproval, setProcessingApproval] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState('pending')

  useEffect(() => {
    if (session?.user) {
      loadDashboardData()
    }
  }, [session])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Загружаем заявки на одобрение
      const approvalsResponse = await fetch(`/api/participant-approvals?captainId=${session?.user.id}`)
      const approvalsData = await approvalsResponse.json()
      
      if (approvalsData.success) {
        setApprovals(approvalsData.data.approvals)
      }

      // Загружаем аналитику профиля
      const analyticsResponse = await fetch(`/api/profiles/analytics?userId=${session?.user.id}`)
      const analyticsData = await analyticsResponse.json()
      
      if (analyticsData.success) {
        setAnalytics(analyticsData.data)
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить данные дашборда',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApprovalAction = async (approvalId: string, action: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      setProcessingApproval(approvalId)

      const response = await fetch(`/api/participant-approvals/${approvalId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: action,
          rejectedReason: reason
        })
      })

      const data = await response.json()

      if (data.success) {
        // Обновляем локальное состояние
        setApprovals(prev => prev.map(approval => 
          approval.id === approvalId 
            ? { ...approval, status: action, processedAt: new Date().toISOString(), rejectedReason: reason }
            : approval
        ))

        toast({
          title: action === 'APPROVED' ? 'Участник одобрен!' : 'Заявка отклонена',
          description: data.message,
          variant: 'default'
        })

        // Обновляем аналитику
        await updateAnalytics()
        
      } else {
        throw new Error(data.error || 'Failed to process approval')
      }

    } catch (error) {
      console.error('Error processing approval:', error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обработать заявку',
        variant: 'destructive'
      })
    } finally {
      setProcessingApproval(null)
    }
  }

  const updateAnalytics = async () => {
    try {
      const response = await fetch('/api/profiles/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: session?.user.id,
          updateBadges: true
        })
      })

      const data = await response.json()
      if (data.success) {
        setAnalytics(data.data.analytics)
        
        // Показываем уведомления о новых badges
        if (data.data.newBadges.length > 0) {
          toast({
            title: '🏆 Новые достижения!',
            description: `Получено ${data.data.newBadges.length} новых значков`,
            variant: 'default'
          })
        }
      }
    } catch (error) {
      console.error('Error updating analytics:', error)
    }
  }

  const getExperienceBadgeColor = (experience: string) => {
    switch (experience) {
      case 'BEGINNER': return 'bg-green-100 text-green-800'
      case 'INTERMEDIATE': return 'bg-blue-100 text-blue-800'
      case 'ADVANCED': return 'bg-purple-100 text-purple-800'
      case 'EXPERT': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-amber-600" />
      case 'APPROVED': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'REJECTED': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const filterApprovalsByStatus = (status: string) => {
    return approvals.filter(approval => 
      status === 'all' ? true : approval.status === status.toUpperCase()
    )
  }

  const renderParticipantCard = (approval: ParticipantApproval) => {
    const profile = approval.participant.fisherProfile
    const isProcessing = processingApproval === approval.id

    return (
      <Card key={approval.id} className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={approval.participant.image || ''} />
                <AvatarFallback>
                  {approval.participant.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">{approval.participant.name}</h3>
                  {getStatusIcon(approval.status)}
                </div>
                <p className="text-sm text-muted-foreground">{approval.participant.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  {profile && (
                    <>
                      <Badge className={getExperienceBadgeColor(profile.experience)}>
                        {profile.experience}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span className="text-sm">{profile.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Fish className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{profile.completedTrips} поездок</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Подано: {new Date(approval.appliedAt).toLocaleDateString('ru-RU')}
              </div>
              {approval.processedAt && (
                <div className="text-sm text-muted-foreground">
                  Обработано: {new Date(approval.processedAt).toLocaleDateString('ru-RU')}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Информация о поездке */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Поездка</h4>
                <p className="text-sm text-muted-foreground">
                  {new Date(approval.trip.date).toLocaleDateString('ru-RU')} в {approval.trip.timeSlot}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  {approval.trip.currentParticipants} / {approval.trip.maxParticipants} участников
                </p>
                <p className="text-sm text-muted-foreground">
                  Свободно: {approval.trip.availableSpots} мест
                </p>
              </div>
            </div>
          </div>

          {/* Детали профиля участника */}
          {profile && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium mb-1">Надежность</h5>
                  <div className="flex items-center space-x-2">
                    <Progress value={profile.reliability} className="flex-1" />
                    <span className="text-sm">{profile.reliability}%</span>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium mb-1">Опыт</h5>
                  <div className="text-sm">{profile.completedTrips} завершенных поездок</div>
                </div>
              </div>
              
              {profile.specialties && profile.specialties.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-1">Специализации</h5>
                  <div className="flex flex-wrap gap-1">
                    {profile.specialties.map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Сообщение от участника */}
          {approval.message && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-blue-900">Сообщение от участника</h5>
                  <p className="text-sm text-blue-700">{approval.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Причина отклонения */}
          {approval.status === 'REJECTED' && approval.rejectedReason && (
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-start space-x-2">
                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <h5 className="text-sm font-medium text-red-900">Причина отклонения</h5>
                  <p className="text-sm text-red-700">{approval.rejectedReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Действия */}
          {approval.status === 'PENDING' && (
            <div className="flex space-x-2 pt-2 border-t">
              <Button
                onClick={() => handleApprovalAction(approval.id, 'APPROVED')}
                disabled={isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Обработка...' : 'Одобрить'}
              </Button>
              <Button
                onClick={() => {
                  const reason = prompt('Причина отклонения (необязательно):')
                  if (reason !== null) {
                    handleApprovalAction(approval.id, 'REJECTED', reason || undefined)
                  }
                }}
                disabled={isProcessing}
                variant="outline"
                className="flex-1"
              >
                Отклонить
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  const pendingApprovals = filterApprovalsByStatus('pending')
  const approvedApprovals = filterApprovalsByStatus('approved')
  const rejectedApprovals = filterApprovalsByStatus('rejected')

  return (
    <div className="space-y-6">
      {/* Заголовок и статистика */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Панель капитана</h1>
            <p className="text-blue-100">Управление заявками и мониторинг активности</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{pendingApprovals.length}</div>
            <div className="text-sm text-blue-100">заявок на рассмотрении</div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Всего заявок</p>
                  <p className="text-2xl font-bold">{analytics.metrics.approvals.applied}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Одобрено</p>
                  <p className="text-2xl font-bold">{analytics.metrics.approvals.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Средний рейтинг</p>
                  <p className="text-2xl font-bold">{analytics.metrics.reviews.averageRating.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Достижений</p>
                  <p className="text-2xl font-bold">{analytics.metrics.badges.earned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Табы с заявками */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Ожидают ({pendingApprovals.length})</span>
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Одобрены ({approvedApprovals.length})</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center space-x-2">
            <XCircle className="h-4 w-4" />
            <span>Отклонены ({rejectedApprovals.length})</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Аналитика</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Заявки на рассмотрении</h2>
            <Button onClick={loadDashboardData} variant="outline" size="sm">
              Обновить
            </Button>
          </div>
          
          {pendingApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет ожидающих заявок</h3>
                <p className="text-gray-500">Все заявки обработаны или новых заявок пока нет</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map(renderParticipantCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          <h2 className="text-lg font-semibold">Одобренные участники</h2>
          {approvedApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет одобренных заявок</h3>
                <p className="text-gray-500">Одобренные участники появятся здесь</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {approvedApprovals.map(renderParticipantCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="space-y-4">
          <h2 className="text-lg font-semibold">Отклоненные заявки</h2>
          {rejectedApprovals.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <XCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Нет отклоненных заявок</h3>
                <p className="text-gray-500">Отклоненные заявки появятся здесь</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rejectedApprovals.map(renderParticipantCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-lg font-semibold">Аналитика и статистика</h2>
          {analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Недавняя активность */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Недавняя активность</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analytics.recentActivity.badges.map((badge: any, index: number) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="text-2xl">{badge.icon}</div>
                      <div>
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(badge.earnedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {analytics.recentActivity.badges.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Нет недавних достижений
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Статистика по категориям badges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>Достижения по категориям</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(analytics.metrics.badges.categories).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="capitalize">{category.toLowerCase()}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                  
                  {Object.keys(analytics.metrics.badges.categories).length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      Достижения появятся здесь
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Аналитика недоступна</h3>
                <p className="text-gray-500">Данные для аналитики пока не собраны</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
