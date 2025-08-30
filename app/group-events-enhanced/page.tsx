'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import ProfileIntegratedBookingWidget from '@/components/booking/ProfileIntegratedBookingWidget'
import EnhancedCaptainDashboard from '@/components/profiles/EnhancedCaptainDashboard'
import { 
  Calendar as CalendarIcon,
  Users, 
  MapPin, 
  Clock, 
  Star,
  Filter,
  Search,
  TrendingUp,
  Award,
  Fish,
  Target,
  Eye,
  ChevronRight
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
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
    rating?: number
  }
  participants?: Array<{
    id: string
    name: string
    image?: string
    profile?: {
      experience: string
      rating: number
      badges?: Array<{
        icon: string
        name: string
      }>
    }
  }>
}

interface FilterOptions {
  dateFrom?: Date
  dateTo?: Date
  timeSlot?: string
  status?: string
  minSpots?: number
  maxPrice?: number
  searchQuery?: string
}

export default function EnhancedGroupEventsPage() {
  const { data: session } = useSession()
  const [trips, setTrips] = useState<GroupTrip[]>([])
  const [filteredTrips, setFilteredTrips] = useState<GroupTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTrip, setSelectedTrip] = useState<GroupTrip | null>(null)
  const [showBookingWidget, setShowBookingWidget] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [activeTab, setActiveTab] = useState('explore')
  const [sortBy, setSortBy] = useState('date')

  useEffect(() => {
    loadTrips()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [trips, filters])

  const loadTrips = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/group-trips?includeParticipants=true')
      const data = await response.json()
      
      if (data.success) {
        setTrips(data.data.trips || [])
      } else {
        throw new Error(data.error || 'Failed to load trips')
      }
    } catch (error) {
      console.error('Error loading trips:', error)
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить поездки',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...trips]

    // Фильтр по дате
    if (filters.dateFrom) {
      filtered = filtered.filter(trip => 
        new Date(trip.date) >= filters.dateFrom!
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(trip => 
        new Date(trip.date) <= filters.dateTo!
      )
    }

    // Фильтр по времени
    if (filters.timeSlot) {
      filtered = filtered.filter(trip => trip.timeSlot === filters.timeSlot)
    }

    // Фильтр по статусу
    if (filters.status) {
      filtered = filtered.filter(trip => trip.status === filters.status)
    }

    // Фильтр по доступным местам
    if (filters.minSpots) {
      filtered = filtered.filter(trip => 
        (trip.maxParticipants - trip.currentParticipants) >= filters.minSpots
      )
    }

    // Фильтр по цене
    if (filters.maxPrice) {
      filtered = filtered.filter(trip => trip.pricePerPerson <= filters.maxPrice!)
    }

    // Поиск по тексту
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(trip => 
        trip.description?.toLowerCase().includes(query) ||
        trip.meetingPoint?.toLowerCase().includes(query) ||
        trip.captain?.name.toLowerCase().includes(query)
      )
    }

    setFilteredTrips(filtered)
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'FORMING': return 'bg-blue-100 text-blue-800'
      case 'CONFIRMED': return 'bg-green-100 text-green-800'
      case 'CANCELLED': return 'bg-red-100 text-red-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'FORMING': return 'Набор группы'
      case 'CONFIRMED': return 'Подтверждена'
      case 'CANCELLED': return 'Отменена'
      case 'COMPLETED': return 'Завершена'
      default: return status
    }
  }

  const renderTripCard = (trip: GroupTrip, showDetails: boolean = false) => {
    const availableSpots = trip.maxParticipants - trip.currentParticipants
    const isFullyBooked = availableSpots <= 0
    const isMinimumReached = trip.currentParticipants >= trip.minRequired

    return (
      <Card 
        key={trip.id} 
        className={`transition-all hover:shadow-md ${
          selectedTrip?.id === trip.id ? 'ring-2 ring-blue-500' : ''
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Badge className={getStatusBadgeColor(trip.status)}>
                  {getStatusLabel(trip.status)}
                </Badge>
                {isMinimumReached && (
                  <Badge variant="outline" className="text-green-600">
                    <Target className="h-3 w-3 mr-1" />
                    Минимум набран
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{new Date(trip.date).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{trip.timeSlot}</span>
                </div>
                {trip.meetingPoint && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{trip.meetingPoint}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                €{trip.pricePerPerson}
              </div>
              <div className="text-xs text-muted-foreground">за человека</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Описание */}
          {trip.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {trip.description}
            </p>
          )}

          {/* Капитан */}
          {trip.captain && (
            <div className="flex items-center space-x-2 text-sm">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {trip.captain.name.charAt(0)}
                </span>
              </div>
              <div>
                <span className="font-medium">Капитан: {trip.captain.name}</span>
                {trip.captain.rating && (
                  <div className="flex items-center space-x-1">
                    <Star className="h-3 w-3 text-amber-500" />
                    <span className="text-xs">{trip.captain.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Участники */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>Участники</span>
              </span>
              <span className={`font-medium ${
                isFullyBooked ? 'text-red-600' : availableSpots <= 2 ? 'text-amber-600' : 'text-green-600'
              }`}>
                {trip.currentParticipants} / {trip.maxParticipants}
              </span>
            </div>

            {/* Прогресс бар */}
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  isMinimumReached ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${(trip.currentParticipants / trip.maxParticipants) * 100}%` }}
              />
            </div>

            {/* Мини-профили участников */}
            {showDetails && trip.participants && trip.participants.length > 0 && (
              <div className="flex items-center space-x-2 mt-2">
                <span className="text-xs text-muted-foreground">Участники:</span>
                <div className="flex -space-x-2">
                  {trip.participants.slice(0, 5).map((participant, index) => (
                    <div 
                      key={participant.id}
                      className="relative group"
                    >
                      <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium">
                        {participant.name.charAt(0)}
                      </div>
                      
                      {/* Tooltip с информацией */}
                      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        {participant.name}
                        {participant.profile && (
                          <>
                            <br />
                            <div className="flex items-center space-x-1">
                              <Star className="h-2 w-2" />
                              <span>{participant.profile.rating.toFixed(1)}</span>
                              <span>• {participant.profile.experience}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {trip.participants.length > 5 && (
                    <div className="h-8 w-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs">
                      +{trip.participants.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Действия */}
          <div className="flex space-x-2 pt-2 border-t">
            <Button
              onClick={() => {
                setSelectedTrip(trip)
                setShowBookingWidget(!showBookingWidget)
              }}
              disabled={isFullyBooked || trip.status !== 'FORMING'}
              className="flex-1"
            >
              {isFullyBooked ? 'Мест нет' : 'Забронировать'}
            </Button>
            
            <Button
              onClick={() => setSelectedTrip(selectedTrip?.id === trip.id ? null : trip)}
              variant="outline"
              size="icon"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderFilters = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Фильтры</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Поиск */}
          <div>
            <label className="text-sm font-medium mb-1 block">Поиск</label>
            <Input
              placeholder="Поиск по описанию, месту, капитану..."
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>

          {/* Дата от */}
          <div>
            <label className="text-sm font-medium mb-1 block">Дата от</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  {filters.dateFrom ? (
                    format(filters.dateFrom, "d MMMM yyyy", { locale: ru })
                  ) : (
                    <span>Выберите дату</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Время */}
          <div>
            <label className="text-sm font-medium mb-1 block">Время</label>
            <Select
              value={filters.timeSlot}
              onValueChange={(value) => setFilters(prev => ({ ...prev, timeSlot: value === "all" ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Любое время" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любое время</SelectItem>
                <SelectItem value="06:00-10:00">Утром (06:00-10:00)</SelectItem>
                <SelectItem value="10:00-14:00">Днем (10:00-14:00)</SelectItem>
                <SelectItem value="14:00-18:00">Вечером (14:00-18:00)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Статус */}
          <div>
            <label className="text-sm font-medium mb-1 block">Статус</label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? undefined : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Любой статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любой статус</SelectItem>
                <SelectItem value="FORMING">Набор группы</SelectItem>
                <SelectItem value="CONFIRMED">Подтверждена</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Минимум свободных мест */}
          <div>
            <label className="text-sm font-medium mb-1 block">Минимум мест</label>
            <Select
              value={filters.minSpots?.toString()}
              onValueChange={(value) => setFilters(prev => ({ 
                ...prev, 
                minSpots: value && value !== "all" ? parseInt(value) : undefined 
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Любое количество" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любое количество</SelectItem>
                <SelectItem value="1">Минимум 1 место</SelectItem>
                <SelectItem value="2">Минимум 2 места</SelectItem>
                <SelectItem value="3">Минимум 3 места</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Максимальная цена */}
          <div>
            <label className="text-sm font-medium mb-1 block">Макс. цена (€)</label>
            <Input
              type="number"
              placeholder="Любая цена"
              value={filters.maxPrice || ''}
              onChange={(e) => setFilters(prev => ({ 
                ...prev, 
                maxPrice: e.target.value ? parseFloat(e.target.value) : undefined 
              }))}
            />
          </div>
        </div>

        {/* Кнопка сброса */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setFilters({})}
          >
            Сбросить фильтры
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Групповые рыболовные поездки
        </h1>
        <p className="text-muted-foreground">
          Присоединяйтесь к другим рыболовам в увлекательных морских приключениях
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="explore" className="flex items-center space-x-2">
            <Search className="h-4 w-4" />
            <span>Поиск поездок</span>
          </TabsTrigger>
          <TabsTrigger value="captain" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Панель капитана</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Статистика</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="space-y-6">
          {renderFilters()}

          {/* Результаты */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Найдено поездок: {filteredTrips.length}
            </h2>
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as any);
                // Реализованная логика сортировки
                const sorted = [...filteredTrips].sort((a, b) => {
                  switch (value) {
                    case 'date-asc':
                      return new Date(a.date).getTime() - new Date(b.date).getTime();
                    case 'date-desc':
                      return new Date(b.date).getTime() - new Date(a.date).getTime();
                    case 'price-asc':
                      return parseFloat(a.pricePerPerson) - parseFloat(b.pricePerPerson);
                    case 'price-desc':
                      return parseFloat(b.pricePerPerson) - parseFloat(a.pricePerPerson);
                    case 'participants':
                      return (b.maxParticipants - b.currentParticipants) - (a.maxParticipants - a.currentParticipants);
                    default:
                      return 0;
                  }
                });
                setFilteredTrips(sorted);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="price">По цене</SelectItem>
                <SelectItem value="participants">По участникам</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Список поездок */}
            <div className="space-y-4">
              {filteredTrips.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Fish className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Поездки не найдены
                    </h3>
                    <p className="text-gray-500">
                      Попробуйте изменить критерии поиска
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredTrips.map(trip => renderTripCard(trip, true))
              )}
            </div>

            {/* Виджет бронирования */}
            <div className="lg:sticky lg:top-6">
              {selectedTrip && showBookingWidget ? (
                <ProfileIntegratedBookingWidget trip={selectedTrip} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Выберите поездку
                    </h3>
                    <p className="text-gray-500">
                      Нажмите "Забронировать" чтобы начать процесс бронирования
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="captain">
          <EnhancedCaptainDashboard />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Статистика платформы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{trips.length}</div>
                  <div className="text-sm text-muted-foreground">Всего поездок</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {trips.filter(t => t.status === 'FORMING').length}
                  </div>
                  <div className="text-sm text-muted-foreground">Набирают группу</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {trips.reduce((sum, trip) => sum + trip.currentParticipants, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Участников</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    €{Math.round(trips.reduce((sum, trip) => sum + trip.pricePerPerson, 0) / trips.length) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Сред. цена</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
