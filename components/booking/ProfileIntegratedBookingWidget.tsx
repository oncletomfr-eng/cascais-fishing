'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Star, 
  Trophy, 
  Shield, 
  Users, 
  MessageSquare, 
  CheckCircle,
  AlertTriangle,
  Fish,
  Calendar,
  Clock,
  MapPin,
  User
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface GroupTrip {
  id: string
  date: string
  timeSlot: string
  maxParticipants: number
  minRequired: number
  currentParticipants: number
  pricePerPerson: number
  description?: string
  meetingPoint?: string
  status: string
  captain?: {
    id: string
    name: string
    image?: string
  }
}

interface UserProfile {
  id: string
  experience: string
  rating: number
  completedTrips: number
  reliability: number
  totalReviews: number
  isActive: boolean
  badges?: Array<{
    name: string
    description: string
    icon: string
    category: string
  }>
  specialties?: string[]
}

interface BookingStep {
  id: string
  title: string
  description: string
  completed: boolean
  current: boolean
}

export default function ProfileIntegratedBookingWidget({ trip }: { trip: GroupTrip }) {
  const { data: session, status } = useSession()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [applicationMessage, setApplicationMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [applicationSent, setApplicationSent] = useState(false)

  const steps: BookingStep[] = [
    {
      id: 'profile',
      title: 'Проверка профиля',
      description: 'Убедимся, что ваш профиль готов к поездке',
      completed: false,
      current: true
    },
    {
      id: 'application',
      title: 'Подача заявки',
      description: 'Отправка заявки на участие в поездке',
      completed: false,
      current: false
    },
    {
      id: 'approval',
      title: 'Ожидание одобрения',
      description: 'Капитан рассматривает вашу заявку',
      completed: false,
      current: false
    },
    {
      id: 'booking',
      title: 'Подтверждение',
      description: 'Завершение бронирования',
      completed: false,
      current: false
    }
  ]

  useEffect(() => {
    if (session?.user) {
      loadUserProfile()
      checkApplicationStatus()
    }
  }, [session])

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`/api/profiles?userId=${session?.user.id}`)
      const data = await response.json()
      
      if (data.success && data.data.length > 0) {
        setUserProfile(data.data[0])
        
        // Определяем, требуется ли одобрение на основе профиля
        const profile = data.data[0]
        const needsApproval = shouldRequireApproval(profile)
        setRequiresApproval(needsApproval)
        
        // Обновляем шаги в зависимости от необходимости одобрения
        updateStepsBasedOnProfile(profile, needsApproval)
        
      } else {
        // Профиль не найден, предлагаем создать
        setRequiresApproval(true)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить профиль',
        variant: 'destructive'
      })
    }
  }

  const checkApplicationStatus = async () => {
    try {
      const response = await fetch(`/api/participant-approvals?tripId=${trip.id}&participantId=${session?.user.id}`)
      const data = await response.json()
      
      if (data.success && data.data.approvals.length > 0) {
        const approval = data.data.approvals[0]
        if (approval.status === 'PENDING') {
          setApplicationSent(true)
          setCurrentStep(2) // Переходим к шагу ожидания одобрения
        } else if (approval.status === 'APPROVED') {
          setCurrentStep(3) // Переходим к финальному шагу
        }
      }
    } catch (error) {
      console.error('Error checking application status:', error)
    }
  }

  const shouldRequireApproval = (profile: UserProfile): boolean => {
    // Новые пользователи всегда требуют одобрения
    if (!profile || profile.completedTrips === 0) {
      return true
    }
    
    // Пользователи с низкой надежностью требуют одобрения
    if (profile.reliability < 80) {
      return true
    }
    
    // Пользователи с низким рейтингом при достаточном количестве отзывов
    if (profile.totalReviews >= 3 && profile.rating < 3.5) {
      return true
    }
    
    // Неактивные пользователи требуют одобрения
    if (!profile.isActive) {
      return true
    }
    
    return false
  }

  const updateStepsBasedOnProfile = (profile: UserProfile | null, needsApproval: boolean) => {
    if (!needsApproval && profile && profile.completedTrips > 0) {
      // Опытные пользователи могут сразу бронировать
      setCurrentStep(3)
      steps[0].completed = true
      steps[1].completed = true
      steps[2].completed = true
      steps[3].current = true
    }
  }

  const handleApplicationSubmit = async () => {
    try {
      setIsSubmitting(true)

      const response = await fetch('/api/participant-approvals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: trip.id,
          message: applicationMessage.trim() || undefined
        })
      })

      const data = await response.json()

      if (data.success) {
        setApplicationSent(true)
        setCurrentStep(2)
        
        toast({
          title: 'Заявка отправлена!',
          description: 'Капитан рассмотрит вашу заявку в ближайшее время',
          variant: 'default'
        })
        
        // Обновляем аналитику профиля
        await fetch('/api/profiles/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: session?.user.id,
            updateBadges: true
          })
        })
        
      } else {
        throw new Error(data.error || 'Failed to submit application')
      }

    } catch (error) {
      console.error('Error submitting application:', error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отправить заявку',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDirectBooking = async () => {
    try {
      setIsSubmitting(true)

      // Прямое бронирование для опытных пользователей
      const response = await fetch('/api/group-trips/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tripId: trip.id,
          participants: 1,
          contactName: session?.user.name || '',
          contactEmail: session?.user.email || '',
          contactPhone: '' // Можно добавить поле для телефона
        })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Бронирование завершено!',
          description: 'Вы успешно забронировали место в поездке',
          variant: 'default'
        })
        
        // Перенаправляем или обновляем состояние
        window.location.reload()
        
      } else {
        throw new Error(data.error || 'Failed to create booking')
      }

    } catch (error) {
      console.error('Error creating booking:', error)
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось создать бронирование',
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderProfileSummary = () => {
    if (!userProfile) {
      return (
        <Alert className="mb-4">
          <User className="h-4 w-4" />
          <AlertDescription>
            Для участия в групповых поездках необходимо создать профиль рыболова.
            <Button variant="link" className="p-0 h-auto ml-2">
              Создать профиль
            </Button>
          </AlertDescription>
        </Alert>
      )
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

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={session?.user.image || ''} />
              <AvatarFallback>
                {session?.user.name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold">{session?.user.name}</h3>
                <Badge className={getExperienceBadgeColor(userProfile.experience)}>
                  {userProfile.experience}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">{userProfile.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">
                    ({userProfile.totalReviews} отзывов)
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Fish className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">{userProfile.completedTrips} поездок</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Надежность */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Надежность</span>
              <span className="text-sm">{userProfile.reliability}%</span>
            </div>
            <Progress value={userProfile.reliability} className="h-2" />
          </div>

          {/* Badges */}
          {userProfile.badges && userProfile.badges.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2">Достижения</h5>
              <div className="flex flex-wrap gap-2">
                {userProfile.badges.slice(0, 3).map((badge, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {badge.icon} {badge.name}
                  </Badge>
                ))}
                {userProfile.badges.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{userProfile.badges.length - 3} ещё
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Специализации */}
          {userProfile.specialties && userProfile.specialties.length > 0 && (
            <div>
              <h5 className="text-sm font-medium mb-2">Специализации</h5>
              <div className="flex flex-wrap gap-1">
                {userProfile.specialties.map((specialty, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Предупреждения */}
          {requiresApproval && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {userProfile.completedTrips === 0 
                  ? 'Как новый участник, ваша заявка требует одобрения капитана'
                  : 'На основе вашего профиля требуется одобрение капитана'
                }
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderStepIndicator = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                ${step.completed 
                  ? 'bg-green-600 text-white' 
                  : step.current 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-600'
                }
              `}>
                {step.completed ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  w-12 h-1 mx-2
                  ${step.completed ? 'bg-green-600' : 'bg-gray-200'}
                `} />
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-2">
          <h3 className="font-semibold">{steps[currentStep]?.title}</h3>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep]?.description}
          </p>
        </div>
      </div>
    )
  }

  const renderCurrentStepContent = () => {
    const step = steps[currentStep]
    
    switch (step?.id) {
      case 'profile':
        return (
          <div className="space-y-4">
            {renderProfileSummary()}
            
            <div className="flex space-x-2">
              <Button 
                onClick={() => setCurrentStep(1)} 
                className="flex-1"
                disabled={!userProfile}
              >
                {requiresApproval ? 'Подать заявку' : 'Забронировать сразу'}
              </Button>
              {!userProfile && (
                <Button variant="outline" className="flex-1">
                  Создать профиль
                </Button>
              )}
            </div>
          </div>
        )

      case 'application':
        return (
          <div className="space-y-4">
            {renderProfileSummary()}
            
            {requiresApproval ? (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Сообщение капитану (необязательно)
                  </label>
                  <Textarea
                    placeholder="Расскажите о своем опыте рыбалки, ожиданиях от поездки или задайте вопросы..."
                    value={applicationMessage}
                    onChange={(e) => setApplicationMessage(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Это поможет капитану лучше оценить вашу заявку
                  </p>
                </div>
                
                <Button 
                  onClick={handleApplicationSubmit}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleDirectBooking}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? 'Бронирование...' : 'Забронировать место'}
              </Button>
            )}
          </div>
        )

      case 'approval':
        return (
          <div className="space-y-4">
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Ваша заявка отправлена капитану {trip.captain?.name}. 
                Обычно рассмотрение занимает до 24 часов.
              </AlertDescription>
            </Alert>

            {applicationMessage && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Ваше сообщение</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{applicationMessage}</p>
                </CardContent>
              </Card>
            )}

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Мы уведомим вас о решении капитана по email
              </p>
              
              <Button 
                variant="outline" 
                onClick={checkApplicationStatus}
                className="mt-2"
              >
                Проверить статус
              </Button>
            </div>
          </div>
        )

      case 'booking':
        return (
          <div className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {requiresApproval 
                  ? 'Ваша заявка одобрена! Теперь вы можете завершить бронирование.'
                  : 'Готово к бронированию!'
                }
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleDirectBooking}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Завершение...' : 'Завершить бронирование'}
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!session) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Необходима авторизация</CardTitle>
          <CardDescription>
            Для бронирования групповой поездки необходимо войти в систему
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            Войти
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>Бронирование места в поездке</span>
        </CardTitle>
        <CardDescription>
          {new Date(trip.date).toLocaleDateString('ru-RU')} в {trip.timeSlot}
          {trip.meetingPoint && (
            <span className="flex items-center mt-1">
              <MapPin className="h-3 w-3 mr-1" />
              {trip.meetingPoint}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {renderStepIndicator()}
        {renderCurrentStepContent()}

        <Separator className="my-4" />
        
        {/* Информация о поездке */}
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Стоимость за человека:</span>
            <span className="font-medium">€{trip.pricePerPerson}</span>
          </div>
          <div className="flex justify-between">
            <span>Участников:</span>
            <span>{trip.currentParticipants} / {trip.maxParticipants}</span>
          </div>
          <div className="flex justify-between">
            <span>Свободных мест:</span>
            <span>{trip.maxParticipants - trip.currentParticipants}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
