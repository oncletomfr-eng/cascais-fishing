'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Award, 
  Trophy, 
  Star, 
  Snowflake, 
  Calendar,
  TrendingUp,
  Target,
  Shield
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface BadgeData {
  id: string
  name: string
  description: string
  icon: string
  category: 'ACHIEVEMENT' | 'MILESTONE' | 'SPECIAL' | 'SEASONAL'
  earnedAt: string
  requiredValue?: number
  profile: {
    user: {
      id: string
      name: string
      image?: string
    }
  }
}

interface BadgeDisplayProps {
  userId: string
  showTitle?: boolean
  showActions?: boolean
  compact?: boolean
  maxDisplay?: number
}

export default function BadgeDisplay({ 
  userId, 
  showTitle = true, 
  showActions = false, 
  compact = false,
  maxDisplay 
}: BadgeDisplayProps) {
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadBadges()
  }, [userId])

  const loadBadges = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/badges?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setBadges(data.data.badges || [])
      } else {
        console.error('Failed to load badges:', data.error)
      }
    } catch (error) {
      console.error('Error loading badges:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateBadges = async () => {
    try {
      const response = await fetch('/api/profiles/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          updateBadges: true
        })
      })

      const data = await response.json()
      if (data.success && data.data.newBadges.length > 0) {
        toast({
          title: '🏆 Новые достижения!',
          description: `Получено ${data.data.newBadges.length} новых значков`,
          variant: 'default'
        })
        
        // Перезагружаем badges
        await loadBadges()
      }
    } catch (error) {
      console.error('Error updating badges:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить достижения',
        variant: 'destructive'
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ACHIEVEMENT': return <Award className="h-4 w-4" />
      case 'MILESTONE': return <Target className="h-4 w-4" />
      case 'SPECIAL': return <Trophy className="h-4 w-4" />
      case 'SEASONAL': return <Snowflake className="h-4 w-4" />
      default: return <Star className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ACHIEVEMENT': return 'bg-blue-100 text-blue-800'
      case 'MILESTONE': return 'bg-green-100 text-green-800'
      case 'SPECIAL': return 'bg-purple-100 text-purple-800'
      case 'SEASONAL': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'ACHIEVEMENT': return 'Достижения'
      case 'MILESTONE': return 'Этапы'
      case 'SPECIAL': return 'Особые'
      case 'SEASONAL': return 'Сезонные'
      default: return category
    }
  }

  const filterBadgesByCategory = (category: string) => {
    if (category === 'all') return badges
    return badges.filter(badge => badge.category === category)
  }

  const renderBadgeCard = (badge: BadgeData, isCompact: boolean = false) => {
    if (isCompact) {
      return (
        <div
          key={badge.id}
          className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
          title={badge.description}
        >
          <div className="text-2xl">{badge.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{badge.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {badge.description}
            </div>
          </div>
        </div>
      )
    }

    return (
      <Card key={badge.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{badge.icon}</div>
              <div>
                <CardTitle className="text-base">{badge.name}</CardTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getCategoryColor(badge.category)}>
                    {getCategoryName(badge.category)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">
                {new Date(badge.earnedAt).toLocaleDateString('ru-RU')}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <CardDescription className="text-sm">
            {badge.description}
          </CardDescription>
          
          {badge.requiredValue && (
            <div className="mt-2 text-xs text-muted-foreground">
              Требование: {badge.requiredValue}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {showTitle && <div className="h-6 bg-gray-200 rounded w-1/4"></div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  const displayBadges = maxDisplay ? badges.slice(0, maxDisplay) : badges
  const categoryCounts = badges.reduce((acc, badge) => {
    acc[badge.category] = (acc[badge.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (compact) {
    return (
      <div className="space-y-3">
        {showTitle && (
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center space-x-2">
              <Award className="h-4 w-4" />
              <span>Достижения ({badges.length})</span>
            </h3>
            {showActions && (
              <Button
                onClick={updateBadges}
                size="sm"
                variant="outline"
              >
                Обновить
              </Button>
            )}
          </div>
        )}
        
        {displayBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Достижений пока нет
          </p>
        ) : (
          <div className="space-y-2">
            {displayBadges.map(badge => renderBadgeCard(badge, true))}
            
            {maxDisplay && badges.length > maxDisplay && (
              <div className="text-center pt-2">
                <Button variant="link" size="sm">
                  Показать ещё {badges.length - maxDisplay}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Достижения и награды</span>
          </h2>
          {showActions && (
            <Button
              onClick={updateBadges}
              variant="outline"
            >
              Обновить достижения
            </Button>
          )}
        </div>
      )}

      {badges.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Достижений пока нет
            </h3>
            <p className="text-gray-500 mb-4">
              Участвуйте в поездках, чтобы получить первые достижения!
            </p>
            {showActions && (
              <Button onClick={updateBadges}>
                Проверить достижения
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="all" className="flex items-center space-x-1">
              <Star className="h-3 w-3" />
              <span className="hidden sm:inline">Все ({badges.length})</span>
              <span className="sm:hidden">{badges.length}</span>
            </TabsTrigger>
            <TabsTrigger value="ACHIEVEMENT" className="flex items-center space-x-1">
              <Award className="h-3 w-3" />
              <span className="hidden sm:inline">Достижения ({categoryCounts.ACHIEVEMENT || 0})</span>
              <span className="sm:hidden">{categoryCounts.ACHIEVEMENT || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="MILESTONE" className="flex items-center space-x-1">
              <Target className="h-3 w-3" />
              <span className="hidden sm:inline">Этапы ({categoryCounts.MILESTONE || 0})</span>
              <span className="sm:hidden">{categoryCounts.MILESTONE || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="SPECIAL" className="flex items-center space-x-1">
              <Trophy className="h-3 w-3" />
              <span className="hidden sm:inline">Особые ({categoryCounts.SPECIAL || 0})</span>
              <span className="sm:hidden">{categoryCounts.SPECIAL || 0}</span>
            </TabsTrigger>
            <TabsTrigger value="SEASONAL" className="flex items-center space-x-1">
              <Snowflake className="h-3 w-3" />
              <span className="hidden sm:inline">Сезонные ({categoryCounts.SEASONAL || 0})</span>
              <span className="sm:hidden">{categoryCounts.SEASONAL || 0}</span>
            </TabsTrigger>
          </TabsList>

          {(['all', 'ACHIEVEMENT', 'MILESTONE', 'SPECIAL', 'SEASONAL'] as const).map(category => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterBadgesByCategory(category).map(badge => 
                  renderBadgeCard(badge, false)
                )}
              </div>
              
              {filterBadgesByCategory(category).length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    {getCategoryIcon(category)}
                    <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
                      Нет достижений в категории "{getCategoryName(category)}"
                    </h3>
                    <p className="text-gray-500">
                      Достижения этой категории появятся здесь
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}

export { BadgeDisplay }
