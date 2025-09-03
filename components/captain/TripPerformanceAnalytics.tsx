'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  Cell
} from 'recharts'
import { 
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Users,
  Calendar,
  Star,
  Fish,
  Sun,
  Cloud,
  Wind,
  Droplets,
  Clock,
  MapPin,
  Activity,
  Zap,
  CheckCircle
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns'
import { ru } from 'date-fns/locale'

// Trip Performance Analytics Component  
// Part of Task 16: Captain Dashboard Interface - Subtask 16.3

export interface TripPerformanceData {
  id: string
  date: string
  tripType: 'private' | 'group' | 'course'
  status: 'completed' | 'cancelled' | 'postponed'
  participants: {
    planned: number
    actual: number
    noShows: number
  }
  duration: {
    planned: number
    actual: number
  }
  revenue: number
  weather: {
    condition: 'sunny' | 'cloudy' | 'rainy' | 'windy' | 'stormy'
    temperature: number
    windSpeed: number
    visibility: number
    waveHeight: number
    impact: 'positive' | 'neutral' | 'negative'
  }
  catch: {
    totalFish: number
    species: string[]
    averageSize: number
    keeperRate: number
  }
  satisfaction: {
    averageRating: number
    reviews: number
    recommendations: number
    complaints: number
  }
  efficiency: {
    fuelConsumption: number
    timeToFishingSpot: number
    activeHours: number
    downtime: number
  }
  location: {
    name: string
    coordinates: [number, number]
    depth: number
    distance: number
  }
  booking: {
    advanceBookingDays: number
    lastMinuteCancellations: number
    repeatCustomers: number
  }
}

export interface PerformanceMetrics {
  successRate: number
  averageSatisfaction: number
  conversionRate: number
  repeatCustomerRate: number
  averageRevenue: number
  weatherImpactScore: number
  seasonalPatterns: {
    month: string
    trips: number
    successRate: number
    avgSatisfaction: number
    avgRevenue: number
  }[]
  competitiveAnalysis: {
    marketPosition: number
    avgIndustryRating: number
    priceCompetitiveness: number
  }
}

interface TripPerformanceAnalyticsProps {
  captainId: string
  className?: string
}

// Mock data generators
const generateTripPerformanceData = (months: number = 12): TripPerformanceData[] => {
  const data: TripPerformanceData[] = []
  const now = new Date()
  const weatherConditions = ['sunny', 'cloudy', 'rainy', 'windy', 'stormy'] as const
  const fishSpecies = ['Tuna', 'Mackerel', 'Sea Bass', 'Bream', 'Sardines', 'Flounder']
  const locations = [
    { name: 'North Banks', coordinates: [38.7223, -9.1393], depth: 45, distance: 12 },
    { name: 'Deep Atlantic', coordinates: [38.6892, -9.2344], depth: 120, distance: 25 },
    { name: 'Coastal Waters', coordinates: [38.7500, -9.1000], depth: 20, distance: 8 },
    { name: 'South Ridge', coordinates: [38.6500, -9.1800], depth: 80, distance: 18 }
  ]

  for (let i = 0; i < months * 25; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    
    if (Math.random() < 0.6) continue
    
    const tripTypes = ['private', 'group', 'course'] as const
    const tripType = tripTypes[Math.floor(Math.random() * tripTypes.length)]
    const weatherCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)]
    const location = locations[Math.floor(Math.random() * locations.length)]
    
    const plannedParticipants = tripType === 'private' ? Math.floor(Math.random() * 6) + 1 :
                              tripType === 'group' ? Math.floor(Math.random() * 8) + 2 :
                              Math.floor(Math.random() * 12) + 4
    
    const status = Math.random() < 0.85 ? 'completed' : Math.random() < 0.7 ? 'cancelled' : 'postponed'
    const actualParticipants = status === 'completed' ? 
      Math.max(1, plannedParticipants - Math.floor(Math.random() * 2)) : 0
    
    const weatherImpact = weatherCondition === 'sunny' ? 1.2 :
                         weatherCondition === 'cloudy' ? 1.0 :
                         weatherCondition === 'rainy' ? 0.7 :
                         weatherCondition === 'windy' ? 0.8 : 0.5

    const baseRevenue = tripType === 'private' ? 400 : 95 * plannedParticipants
    const revenue = status === 'completed' ? baseRevenue * weatherImpact : 0

    data.push({
      id: `trip-${i}`,
      date: date.toISOString(),
      tripType,
      status,
      participants: {
        planned: plannedParticipants,
        actual: actualParticipants,
        noShows: plannedParticipants - actualParticipants
      },
      duration: {
        planned: 4,
        actual: status === 'completed' ? 3.5 + Math.random() * 1.5 : 0
      },
      revenue,
      weather: {
        condition: weatherCondition,
        temperature: 15 + Math.random() * 15,
        windSpeed: Math.random() * 25,
        visibility: 5 + Math.random() * 15,
        waveHeight: Math.random() * 3,
        impact: weatherImpact > 1 ? 'positive' : weatherImpact < 0.8 ? 'negative' : 'neutral'
      },
      catch: {
        totalFish: status === 'completed' ? Math.floor(Math.random() * 20 * weatherImpact) + 5 : 0,
        species: fishSpecies.slice(0, Math.floor(Math.random() * 4) + 1),
        averageSize: 25 + Math.random() * 30,
        keeperRate: 60 + Math.random() * 30
      },
      satisfaction: {
        averageRating: status === 'completed' ? 
          Math.max(3, Math.min(5, 4.2 + (Math.random() - 0.5) * 1.5 * weatherImpact)) : 0,
        reviews: status === 'completed' ? Math.floor(actualParticipants * 0.7) : 0,
        recommendations: status === 'completed' ? Math.floor(actualParticipants * 0.4) : 0,
        complaints: status === 'completed' ? (Math.random() < 0.1 ? 1 : 0) : 0
      },
      efficiency: {
        fuelConsumption: 20 + Math.random() * 15,
        timeToFishingSpot: 30 + Math.random() * 30,
        activeHours: status === 'completed' ? 3 + Math.random() * 2 : 0,
        downtime: Math.random() * 30
      },
      location,
      booking: {
        advanceBookingDays: Math.floor(Math.random() * 30) + 1,
        lastMinuteCancellations: Math.random() < 0.1 ? 1 : 0,
        repeatCustomers: Math.floor(actualParticipants * Math.random() * 0.3)
      }
    })
  }
  
  return data.reverse()
}

export default function TripPerformanceAnalytics({ captainId, className }: TripPerformanceAnalyticsProps) {
  const [performanceData, setPerformanceData] = useState<TripPerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('3months')

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        setPerformanceData(generateTripPerformanceData(12))
      } catch (error) {
        console.error('Error loading performance data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [captainId])

  // Filter data by period
  const filteredData = useMemo(() => {
    const now = new Date()
    let startDate: Date
    
    switch (selectedPeriod) {
      case '1month':
        startDate = startOfMonth(now)
        break
      case '3months':
        startDate = startOfMonth(subMonths(now, 2))
        break
      case '6months':
        startDate = startOfMonth(subMonths(now, 5))
        break
      case '1year':
        startDate = startOfMonth(subMonths(now, 11))
        break
      default:
        startDate = startOfMonth(subMonths(now, 2))
    }
    
    return performanceData.filter(trip => {
      const tripDate = new Date(trip.date)
      return isWithinInterval(tripDate, { start: startDate, end: now })
    })
  }, [performanceData, selectedPeriod])

  // Calculate performance metrics
  const metrics = useMemo((): PerformanceMetrics => {
    const completedTrips = filteredData.filter(trip => trip.status === 'completed')
    const totalTrips = filteredData.length
    
    const successRate = totalTrips > 0 ? (completedTrips.length / totalTrips) * 100 : 0
    
    const avgSatisfaction = completedTrips.length > 0 ? 
      completedTrips.reduce((sum, trip) => sum + trip.satisfaction.averageRating, 0) / completedTrips.length : 0
    
    const totalPlanned = filteredData.reduce((sum, trip) => sum + trip.participants.planned, 0)
    const totalActual = completedTrips.reduce((sum, trip) => sum + trip.participants.actual, 0)
    const conversionRate = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
    
    const totalCustomers = completedTrips.reduce((sum, trip) => sum + trip.participants.actual, 0)
    const repeatCustomers = completedTrips.reduce((sum, trip) => sum + trip.booking.repeatCustomers, 0)
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0
    
    const avgRevenue = completedTrips.length > 0 ? 
      completedTrips.reduce((sum, trip) => sum + trip.revenue, 0) / completedTrips.length : 0
    
    const weatherImpactScore = completedTrips.length > 0 ?
      completedTrips.reduce((sum, trip) => {
        return sum + (trip.weather.impact === 'positive' ? 1 : trip.weather.impact === 'negative' ? -1 : 0)
      }, 0) / completedTrips.length * 50 + 50 : 50

    // Seasonal patterns
    const monthlyData: { [key: string]: any } = {}
    filteredData.forEach(trip => {
      const month = format(new Date(trip.date), 'MMM', { locale: ru })
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          trips: 0,
          completed: 0,
          totalRevenue: 0,
          totalSatisfaction: 0,
          satisfactionCount: 0
        }
      }
      monthlyData[month].trips += 1
      if (trip.status === 'completed') {
        monthlyData[month].completed += 1
        monthlyData[month].totalRevenue += trip.revenue
        monthlyData[month].totalSatisfaction += trip.satisfaction.averageRating
        monthlyData[month].satisfactionCount += 1
      }
    })

    const seasonalPatterns = Object.values(monthlyData).map((month: any) => ({
      month: month.month,
      trips: month.trips,
      successRate: month.trips > 0 ? (month.completed / month.trips) * 100 : 0,
      avgSatisfaction: month.satisfactionCount > 0 ? month.totalSatisfaction / month.satisfactionCount : 0,
      avgRevenue: month.completed > 0 ? month.totalRevenue / month.completed : 0
    }))

    return {
      successRate,
      averageSatisfaction: avgSatisfaction,
      conversionRate,
      repeatCustomerRate,
      averageRevenue: avgRevenue,
      weatherImpactScore,
      seasonalPatterns,
      competitiveAnalysis: {
        marketPosition: 85,
        avgIndustryRating: 4.1,
        priceCompetitiveness: 92
      }
    }
  }, [filteredData])

  // Chart data preparations
  const trendData = useMemo(() => {
    const monthlyData: { [key: string]: any } = {}
    
    filteredData.forEach(trip => {
      const month = format(new Date(trip.date), 'MMM', { locale: ru })
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          successRate: 0,
          satisfaction: 0,
          revenue: 0,
          trips: 0,
          completedTrips: 0,
          totalSatisfaction: 0,
          satisfactionCount: 0
        }
      }
      
      monthlyData[month].trips += 1
      if (trip.status === 'completed') {
        monthlyData[month].completedTrips += 1
        monthlyData[month].revenue += trip.revenue
        monthlyData[month].totalSatisfaction += trip.satisfaction.averageRating
        monthlyData[month].satisfactionCount += 1
      }
    })

    return Object.values(monthlyData).map((month: any) => ({
      month: month.month,
      successRate: month.trips > 0 ? (month.completedTrips / month.trips) * 100 : 0,
      satisfaction: month.satisfactionCount > 0 ? month.totalSatisfaction / month.satisfactionCount : 0,
      revenue: month.completedTrips > 0 ? month.revenue / month.completedTrips : 0,
      trips: month.trips
    }))
  }, [filteredData])

  // Weather impact analysis
  const weatherImpactData = useMemo(() => {
    const weatherData: { [key: string]: any } = {}
    
    filteredData.forEach(trip => {
      if (trip.status === 'completed') {
        if (!weatherData[trip.weather.condition]) {
          weatherData[trip.weather.condition] = {
            condition: trip.weather.condition,
            trips: 0,
            avgSatisfaction: 0,
            avgRevenue: 0,
            totalSatisfaction: 0,
            totalRevenue: 0
          }
        }
        
        weatherData[trip.weather.condition].trips += 1
        weatherData[trip.weather.condition].totalSatisfaction += trip.satisfaction.averageRating
        weatherData[trip.weather.condition].totalRevenue += trip.revenue
      }
    })

    return Object.values(weatherData).map((weather: any) => ({
      condition: weather.condition,
      trips: weather.trips,
      avgSatisfaction: weather.trips > 0 ? weather.totalSatisfaction / weather.trips : 0,
      avgRevenue: weather.trips > 0 ? weather.totalRevenue / weather.trips : 0
    }))
  }, [filteredData])

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Аналитика эффективности поездок</h2>
          <p className="text-muted-foreground">
            Детальный анализ успешности, удовлетворенности клиентов и операционных показателей
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 месяц</SelectItem>
              <SelectItem value="3months">3 месяца</SelectItem>
              <SelectItem value="6months">6 месяцев</SelectItem>
              <SelectItem value="1year">1 год</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Успешность поездок</p>
                <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
                <div className="flex items-center space-x-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+2.3% за месяц</span>
                </div>
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
                <p className="text-2xl font-bold">{metrics.averageSatisfaction.toFixed(1)}</p>
                <div className="flex items-center space-x-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+0.2 за месяц</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Конверсия бронирований</p>
                <p className="text-2xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
                <div className="flex items-center space-x-1 text-xs">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">-1.1% за месяц</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Повторные клиенты</p>
                <p className="text-2xl font-bold">{metrics.repeatCustomerRate.toFixed(1)}%</p>
                <div className="flex items-center space-x-1 text-xs">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+5.7% за месяц</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="trends">Тренды</TabsTrigger>
          <TabsTrigger value="weather">Погода</TabsTrigger>
          <TabsTrigger value="locations">Локации</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Последние поездки</CardTitle>
                <CardDescription>
                  Анализ последних 6 завершенных поездок
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredData.filter(trip => trip.status === 'completed').slice(0, 6).map((trip, index) => (
                    <div key={trip.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          trip.satisfaction.averageRating >= 4.5 ? 'bg-green-500' :
                          trip.satisfaction.averageRating >= 4.0 ? 'bg-blue-500' :
                          trip.satisfaction.averageRating >= 3.5 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(trip.date), 'dd MMM', { locale: ru })} • 
                            {trip.tripType === 'private' ? 'Частная' : 
                             trip.tripType === 'group' ? 'Групповая' : 'Курс'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {trip.participants.actual} участников • {trip.location.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-amber-500" />
                          <span className="text-sm font-medium">
                            {trip.satisfaction.averageRating.toFixed(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          €{trip.revenue.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Операционная эффективность</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Время до места ловли</span>
                  <span className="text-sm font-medium">
                    {(filteredData
                      .filter(t => t.status === 'completed')
                      .reduce((sum, t) => sum + t.efficiency.timeToFishingSpot, 0) / 
                      filteredData.filter(t => t.status === 'completed').length
                    ).toFixed(0)} мин
                  </span>
                </div>
                <Progress value={75} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Активное время рыбалки</span>
                  <span className="text-sm font-medium">
                    {(filteredData
                      .filter(t => t.status === 'completed')
                      .reduce((sum, t) => sum + t.efficiency.activeHours, 0) / 
                      filteredData.filter(t => t.status === 'completed').length
                    ).toFixed(1)} ч
                  </span>
                </div>
                <Progress value={85} className="h-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Расход топлива</span>
                  <span className="text-sm font-medium">
                    {(filteredData
                      .filter(t => t.status === 'completed')
                      .reduce((sum, t) => sum + t.efficiency.fuelConsumption, 0) / 
                      filteredData.filter(t => t.status === 'completed').length
                    ).toFixed(1)} л
                  </span>
                </div>
                <Progress value={60} className="h-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Тренды эффективности</CardTitle>
                  <CardDescription>
                    Динамика ключевых показателей по месяцам
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="satisfaction" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      name="Рейтинг удовлетворенности"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      name="Успешность поездок (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Seasonal Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Сезонные паттерны</CardTitle>
              <CardDescription>
                Анализ эффективности по сезонам и месяцам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {metrics.seasonalPatterns.map((season) => (
                  <div key={season.month} className="text-center p-4 border rounded-lg">
                    <h4 className="font-semibold text-lg">{season.month}</h4>
                    <p className="text-2xl font-bold text-blue-600">{season.trips}</p>
                    <p className="text-sm text-muted-foreground">поездок</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Успешность:</span>
                        <span className="font-medium">{season.successRate.toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Рейтинг:</span>
                        <span className="font-medium">{season.avgSatisfaction.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weather" className="space-y-6">
          {/* Weather Impact Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Влияние погоды на результаты</CardTitle>
                <CardDescription>
                  Анализ успешности поездок в зависимости от погодных условий
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weatherImpactData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="condition" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgSatisfaction" fill="#f59e0b" name="Средний рейтинг" />
                      <Bar dataKey="trips" fill="#3b82f6" name="Количество поездок" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Погодная адаптация</CardTitle>
                <CardDescription>
                  Рекомендации по оптимизации под погодные условия
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Sun className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Солнечно</span>
                    </div>
                    <Badge className="bg-green-100 text-green-800">Отлично</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Cloud className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">Облачно</span>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">Хорошо</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Wind className="h-5 w-5 text-yellow-600" />
                      <span className="text-sm font-medium">Ветрено</span>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800">Осторожно</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Droplets className="h-5 w-5 text-red-600" />
                      <span className="text-sm font-medium">Дождь</span>
                    </div>
                    <Badge className="bg-red-100 text-red-800">Риск</Badge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Рекомендации:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Предлагать альтернативные локации в плохую погоду</li>
                    <li>• Корректировать маршрут в зависимости от ветра</li>
                    <li>• Информировать клиентов о погодных условиях заранее</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          {/* Location Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Эффективность локаций</CardTitle>
              <CardDescription>
                Анализ успешности рыбалки по различным местам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(new Set(filteredData.map(trip => trip.location.name))).map(locationName => {
                  const locationTrips = filteredData.filter(trip => 
                    trip.location.name === locationName && trip.status === 'completed'
                  )
                  
                  const avgSatisfaction = locationTrips.length > 0 ? 
                    locationTrips.reduce((sum, trip) => sum + trip.satisfaction.averageRating, 0) / locationTrips.length : 0
                  
                  const avgCatch = locationTrips.length > 0 ? 
                    locationTrips.reduce((sum, trip) => sum + trip.catch.totalFish, 0) / locationTrips.length : 0

                  return (
                    <div key={locationName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <MapPin className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{locationName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {locationTrips.length} поездок • Средний улов: {avgCatch.toFixed(1)} рыб
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="font-semibold">{avgSatisfaction.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">рейтинг</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
