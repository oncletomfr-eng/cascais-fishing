'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import BadgeDisplay from '@/components/profiles/BadgeDisplay'
import { 
  CheckCircle,
  XCircle, 
  AlertTriangle,
  Loader2,
  TestTube,
  Users,
  Trophy,
  BarChart,
  Settings,
  Play,
  RefreshCw
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface TestResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'pending'
  message: string
  details?: any
}

export default function TestProfileSystemPage() {
  const { data: session, status } = useSession()
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const runAllTests = async () => {
    setIsRunningTests(true)
    setTestResults([])

    const tests = [
      { name: 'Проверка API участников', test: testParticipantApprovals },
      { name: 'Система badges', test: testBadgeSystem },
      { name: 'Аналитика профилей', test: testProfileAnalytics },
      { name: 'Интеграция в booking', test: testBookingIntegration },
      { name: 'Репутационная система', test: testReputationSystem }
    ]

    for (const { name, test } of tests) {
      try {
        setTestResults(prev => [...prev, {
          name,
          status: 'pending',
          message: 'Выполняется...'
        }])

        const result = await test()
        
        setTestResults(prev => prev.map(r => 
          r.name === name ? { ...result, name } : r
        ))

        // Небольшая пауза между тестами
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        setTestResults(prev => prev.map(r => 
          r.name === name ? {
            name,
            status: 'error' as const,
            message: error instanceof Error ? error.message : 'Неизвестная ошибка'
          } : r
        ))
      }
    }

    setIsRunningTests(false)
  }

  const testParticipantApprovals = async (): Promise<Omit<TestResult, 'name'>> => {
    try {
      // Проверяем API для получения заявок
      const response = await fetch(`/api/participant-approvals?captainId=${session?.user.id}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${data.error || 'Unknown error'}`
        }
      }

      const approvals = data.data?.approvals || []
      
      return {
        status: 'success',
        message: `API работает корректно. Найдено ${approvals.length} заявок`,
        details: {
          totalApprovals: approvals.length,
          pending: approvals.filter((a: any) => a.status === 'PENDING').length,
          approved: approvals.filter((a: any) => a.status === 'APPROVED').length,
          rejected: approvals.filter((a: any) => a.status === 'REJECTED').length
        }
      }

    } catch (error) {
      return {
        status: 'error',
        message: `Ошибка сети: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const testBadgeSystem = async (): Promise<Omit<TestResult, 'name'>> => {
    try {
      // Проверяем API badges
      const response = await fetch(`/api/badges?userId=${session?.user.id}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${data.error || 'Unknown error'}`
        }
      }

      const badges = data.data?.badges || []
      
      // Пытаемся обновить badges (тестируем автоматическое назначение)
      const updateResponse = await fetch('/api/profiles/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: session?.user.id,
          updateBadges: true
        })
      })

      const updateData = await updateResponse.json()
      const newBadges = updateData.success ? (updateData.data?.newBadges || []) : []

      return {
        status: 'success',
        message: `Система badges работает. ${badges.length} значков, ${newBadges.length} новых`,
        details: {
          totalBadges: badges.length,
          newBadges: newBadges.length,
          categories: badges.reduce((acc: any, badge: any) => {
            acc[badge.category] = (acc[badge.category] || 0) + 1
            return acc
          }, {})
        }
      }

    } catch (error) {
      return {
        status: 'error',
        message: `Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const testProfileAnalytics = async (): Promise<Omit<TestResult, 'name'>> => {
    try {
      // Проверяем API аналитики
      const response = await fetch(`/api/profiles/analytics?userId=${session?.user.id}&period=month&includeComparisons=true`)
      const data = await response.json()

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${data.error || 'Unknown error'}`
        }
      }

      const analytics = data.data
      
      if (!analytics) {
        return {
          status: 'warning',
          message: 'Аналитика пуста - возможно, нет данных профиля'
        }
      }

      return {
        status: 'success',
        message: 'Аналитика работает корректно',
        details: {
          hasProfile: !!analytics.profile,
          hasMetrics: !!analytics.metrics,
          hasComparison: !!analytics.comparison,
          bookings: analytics.metrics?.bookings?.total || 0,
          reviews: analytics.metrics?.reviews?.received || 0
        }
      }

    } catch (error) {
      return {
        status: 'error',
        message: `Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const testBookingIntegration = async (): Promise<Omit<TestResult, 'name'>> => {
    try {
      // Проверяем загрузку профиля пользователя
      const profileResponse = await fetch(`/api/profiles?userId=${session?.user.id}`)
      const profileData = await profileResponse.json()

      if (!profileResponse.ok) {
        return {
          status: 'error',
          message: `Ошибка загрузки профиля: ${profileData.error || 'Unknown error'}`
        }
      }

      const profile = profileData.data?.[0]
      
      if (!profile) {
        return {
          status: 'warning',
          message: 'Профиль пользователя не создан - потребуется создание для полной интеграции'
        }
      }

      // Проверяем загрузку групповых поездок
      const tripsResponse = await fetch('/api/group-trips')
      const tripsData = await tripsResponse.json()

      if (!tripsResponse.ok) {
        return {
          status: 'error',
          message: `Ошибка загрузки поездок: ${tripsData.error || 'Unknown error'}`
        }
      }

      const trips = tripsData.data?.trips || []

      return {
        status: 'success',
        message: `Интеграция готова. Профиль: ${profile ? 'есть' : 'нет'}, поездок: ${trips.length}`,
        details: {
          hasProfile: !!profile,
          profileExperience: profile?.experience,
          profileRating: profile?.rating,
          availableTrips: trips.length,
          formingTrips: trips.filter((t: any) => t.status === 'FORMING').length
        }
      }

    } catch (error) {
      return {
        status: 'error',
        message: `Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const testReputationSystem = async (): Promise<Omit<TestResult, 'name'>> => {
    try {
      // Проверяем профиль и его репутационные метрики
      const response = await fetch(`/api/profiles?userId=${session?.user.id}`)
      const data = await response.json()

      if (!response.ok) {
        return {
          status: 'error',
          message: `HTTP ${response.status}: ${data.error || 'Unknown error'}`
        }
      }

      const profile = data.data?.[0]
      
      if (!profile) {
        return {
          status: 'warning',
          message: 'Профиль не создан - репутационная система недоступна'
        }
      }

      // Проверяем наличие ключевых репутационных метрик
      const hasRating = typeof profile.rating === 'number'
      const hasReliability = typeof profile.reliability === 'number'
      const hasCompletedTrips = typeof profile.completedTrips === 'number'
      const hasTotalReviews = typeof profile.totalReviews === 'number'

      if (!hasRating || !hasReliability || !hasCompletedTrips || !hasTotalReviews) {
        return {
          status: 'warning',
          message: 'Некоторые репутационные метрики отсутствуют'
        }
      }

      return {
        status: 'success',
        message: 'Репутационная система работает корректно',
        details: {
          rating: profile.rating,
          reliability: profile.reliability,
          completedTrips: profile.completedTrips,
          totalReviews: profile.totalReviews,
          isActive: profile.isActive,
          experience: profile.experience
        }
      }

    } catch (error) {
      return {
        status: 'error',
        message: `Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const createTestProfile = async () => {
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          experience: 'INTERMEDIATE',
          bio: 'Тестовый профиль для проверки системы',
          specialties: ['Морская рыбалка', 'Спиннинг']
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: 'Профиль создан!',
          description: 'Тестовый профиль успешно создан',
          variant: 'default'
        })
      } else {
        throw new Error(data.error || 'Failed to create profile')
      }

    } catch (error) {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать профиль',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error': return <XCircle className="h-4 w-4 text-red-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-amber-600" />
      case 'pending': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default: return null
    }
  }

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Необходима авторизация</CardTitle>
            <CardDescription>
              Для тестирования системы профилей необходимо войти в систему
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => signIn()}>
              Войти
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center space-x-2">
          <TestTube className="h-8 w-8" />
          <span>Тестирование системы профилей</span>
        </h1>
        <p className="text-muted-foreground">
          Комплексная проверка всех компонентов интеллектуальной системы групповых мероприятий
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <TestTube className="h-4 w-4" />
            <span>Тесты</span>
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Достижения</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart className="h-4 w-4" />
            <span>Аналитика</span>
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Инструменты</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Автоматические тесты</CardTitle>
                  <CardDescription>
                    Проверка работоспособности всех компонентов системы
                  </CardDescription>
                </div>
                <Button
                  onClick={runAllTests}
                  disabled={isRunningTests}
                  className="flex items-center space-x-2"
                >
                  {isRunningTests ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>{isRunningTests ? 'Выполняется...' : 'Запустить тесты'}</span>
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {testResults.length === 0 ? (
                <Alert>
                  <TestTube className="h-4 w-4" />
                  <AlertDescription>
                    Нажмите "Запустить тесты" для проверки системы
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {testResults.map((result, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          {getStatusIcon(result.status)}
                          <div className="flex-1">
                            <h4 className="font-medium">{result.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {result.message}
                            </p>
                            {result.details && (
                              <details className="mt-2">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                  Подробности
                                </summary>
                                <pre className="text-xs mt-2 p-2 bg-gray-50 rounded">
                                  {JSON.stringify(result.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Статистика тестов */}
          {testResults.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResults.filter(r => r.status === 'success').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Успешно</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">
                    {testResults.filter(r => r.status === 'warning').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Предупреждения</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {testResults.filter(r => r.status === 'error').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Ошибки</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {testResults.filter(r => r.status === 'pending').length}
                  </div>
                  <div className="text-sm text-muted-foreground">В процессе</div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="badges">
          <BadgeDisplay 
            userId={session.user.id} 
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Аналитика профиля</CardTitle>
              <CardDescription>
                Детальная статистика активности и достижений
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Здесь будет отображаться детальная аналитика профиля
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Инструменты разработчика</CardTitle>
              <CardDescription>
                Дополнительные инструменты для тестирования и отладки
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={createTestProfile}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Создать тестовый профиль</span>
                </Button>

                <Button
                  onClick={() => window.location.href = '/group-events-enhanced'}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Открыть групповые события</span>
                </Button>

                <Button
                  onClick={() => window.location.href = '/admin/bookings'}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Админ панель</span>
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Перезагрузить страницу</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
