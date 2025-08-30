'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Users, 
  Star, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Shield,
  Award,
  Activity
} from 'lucide-react'
import type { 
  CaptainDashboardData, 
  ParticipantApproval, 
  FisherProfile 
} from '@/lib/types/profiles'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface CaptainDashboardProps {
  captainId: string
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

export function CaptainDashboard({ captainId }: CaptainDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const queryClient = useQueryClient()

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['captain-dashboard', captainId],
    queryFn: async (): Promise<CaptainDashboardData> => {
      // Симуляция API вызова
      // В реальном проекте здесь будет настоящий API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return {
        captainProfile: {
          id: 'profile-123',
          userId: captainId,
          experience: 'EXPERT',
          specialties: ['DEEP_SEA', 'SPORT_FISHING'],
          bio: 'Опытный капитан с 15-летним стажем.',
          rating: 4.8,
          completedTrips: 127,
          reliability: 98.5,
          totalReviews: 89,
          isActive: true,
          lastActiveAt: new Date(),
          country: 'Португалия',
          city: 'Кашкайш',
          createdAt: new Date('2020-01-15'),
          updatedAt: new Date(),
          user: {
            id: captainId,
            name: 'Капитан Жоао',
            email: 'joao@example.com',
            image: '/captain-joao-casual.png',
            role: 'CAPTAIN' as const
          }
        },
        myTrips: {
          total: 45,
          upcoming: 8,
          completed: 35,
          cancelled: 2
        },
        pendingApprovals: [], // Будет загружаться отдельно
        recentReviews: [], // Будет загружаться отдельно
        metrics: {
          averageRating: 4.8,
          totalReviews: 89,
          tripCompletionRate: 95.6,
          participantSatisfaction: 96.2
        }
      }
    }
  })

  // Fetch pending approvals
  const { data: approvals = [] } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: async (): Promise<ParticipantApproval[]> => {
      const response = await fetch('/api/participant-approvals?status=PENDING')
      if (!response.ok) throw new Error('Failed to fetch approvals')
      const data = await response.json()
      return data.data || []
    }
  })

  // Process approval mutation
  const processApprovalMutation = useMutation({
    mutationFn: async ({ 
      approvalId, 
      action, 
      reason 
    }: { 
      approvalId: string
      action: 'approve' | 'reject'
      reason?: string 
    }) => {
      const response = await fetch(`/api/participant-approvals/${approvalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason })
      })
      
      if (!response.ok) throw new Error('Failed to process approval')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] })
    }
  })

  const handleApproval = (approvalId: string, action: 'approve' | 'reject', reason?: string) => {
    processApprovalMutation.mutate({ approvalId, action, reason })
  }

  if (isLoading || !dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const { captainProfile, myTrips, metrics } = dashboardData

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-6 bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg"
      >
        <Avatar className="h-20 w-20">
          <AvatarImage src={captainProfile.user?.image} alt={captainProfile.user?.name} />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
            {captainProfile.user?.name?.charAt(0) || '⚓'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-800">
              {captainProfile.user?.name}
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-300">
              <Shield size={16} className="mr-1" />
              Капитан
            </Badge>
          </div>
          
          <div className="flex items-center gap-4 text-gray-600">
            <div className="flex items-center gap-1">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="font-medium">{captainProfile.rating}</span>
              <span className="text-sm">({captainProfile.totalReviews} отзывов)</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={16} />
              <span>{captainProfile.completedTrips} поездок</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={16} />
              <span>{captainProfile.city}</span>
            </div>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{metrics.tripCompletionRate}%</div>
          <div className="text-sm text-gray-600">Успешных поездок</div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            title: 'Всего поездок',
            value: myTrips.total,
            icon: Calendar,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          },
          {
            title: 'Предстоящие',
            value: myTrips.upcoming,
            icon: Clock,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50'
          },
          {
            title: 'Средний рейтинг',
            value: metrics.averageRating,
            icon: Star,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            suffix: '/5'
          },
          {
            title: 'Удовлетворенность',
            value: metrics.participantSatisfaction,
            icon: TrendingUp,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            suffix: '%'
          }
        ].map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon size={24} className={stat.color} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {stat.value}{stat.suffix || ''}
                    </div>
                    <div className="text-sm text-gray-600">{stat.title}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="approvals" className="relative">
            Заявки
            {approvals.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                {approvals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews">Отзывы</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={20} />
                  Недавняя активность
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: 'Подтверждена поездка', time: '2 часа назад', icon: CheckCircle, color: 'text-green-600' },
                    { action: 'Новая заявка получена', time: '4 часа назад', icon: Users, color: 'text-blue-600' },
                    { action: 'Отзыв получен (5 звезд)', time: '1 день назад', icon: Star, color: 'text-yellow-600' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <activity.icon size={16} className={activity.color} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award size={20} />
                  Показатели эффективности
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      label: 'Процент завершения', 
                      value: metrics.tripCompletionRate, 
                      target: 95,
                      color: 'bg-blue-500'
                    },
                    { 
                      label: 'Удовлетворенность клиентов', 
                      value: metrics.participantSatisfaction, 
                      target: 90,
                      color: 'bg-green-500'
                    },
                    { 
                      label: 'Средний рейтинг', 
                      value: (metrics.averageRating / 5) * 100, 
                      target: 80,
                      color: 'bg-yellow-500'
                    }
                  ].map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{metric.label}</span>
                        <span className="font-medium">{metric.value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${metric.color}`}
                          style={{ width: `${Math.min(metric.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="approvals" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Заявки на участие</CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence>
                {approvals.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Нет новых заявок</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {approvals.map((approval) => (
                      <motion.div
                        key={approval.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarImage src={approval.participant?.image} />
                            <AvatarFallback>
                              {approval.participant?.name?.charAt(0) || '👤'}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">
                                {approval.participant?.name || 'Участник'}
                              </h4>
                              {approval.participant?.fisherProfile && (
                                <Badge 
                                  variant="secondary" 
                                  className={`text-xs ${
                                    EXPERIENCE_COLORS[approval.participant.fisherProfile.experience]
                                  }`}
                                >
                                  {EXPERIENCE_LABELS[approval.participant.fisherProfile.experience]}
                                </Badge>
                              )}
                            </div>
                            
                            {approval.participant?.fisherProfile && (
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>⭐ {approval.participant.fisherProfile.rating}</span>
                                <span>🎣 {approval.participant.fisherProfile.completedTrips} поездок</span>
                                <span>✅ {approval.participant.fisherProfile.reliability}% надежность</span>
                              </div>
                            )}
                            
                            {approval.message && (
                              <p className="text-sm text-gray-700 mb-3 italic">
                                "{approval.message}"
                              </p>
                            )}
                            
                            <div className="text-xs text-gray-500">
                              Подана {new Date(approval.appliedAt).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => handleApproval(approval.id, 'approve')}
                              disabled={processApprovalMutation.isPending}
                            >
                              <CheckCircle size={16} className="mr-1" />
                              Одобрить
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => handleApproval(approval.id, 'reject')}
                              disabled={processApprovalMutation.isPending}
                            >
                              <XCircle size={16} className="mr-1" />
                              Отклонить
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Последние отзывы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Star size={48} className="mx-auto mb-4 opacity-50" />
                <p>Отзывы загружаются...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
