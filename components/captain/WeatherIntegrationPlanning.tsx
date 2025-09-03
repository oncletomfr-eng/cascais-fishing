'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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
  AreaChart
} from 'recharts'
import { 
  Sun,
  Cloud,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Eye,
  Waves,
  Calendar as CalendarIcon,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  MapPin,
  Anchor,
  Clock,
  Zap,
  Shield,
  Activity,
  Navigation
} from 'lucide-react'
import { format, addDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { ru } from 'date-fns/locale'

// Weather Integration Planning Component
// Part of Task 16: Captain Dashboard Interface - Subtask 16.4

export interface WeatherData {
  date: string
  time: string
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDirection: number
  windGust: number
  visibility: number
  pressure: number
  waveHeight: number
  waveDirection: number
  precipitation: number
  precipitationProbability: number
  uvIndex: number
  condition: 'sunny' | 'partly-cloudy' | 'cloudy' | 'overcast' | 'light-rain' | 'heavy-rain' | 'thunderstorm' | 'windy' | 'foggy'
  conditionDescription: string
  icon: string
}

export interface WeatherForecast {
  current: WeatherData
  hourly: WeatherData[]
  daily: WeatherData[]
}

export interface TripWeatherAssessment {
  tripId: string
  date: string
  timeSlot: string
  location: {
    name: string
    coordinates: [number, number]
  }
  weatherConditions: WeatherData
  safetyScore: number
  comfortScore: number
  fishingConditionScore: number
  overallScore: number
  recommendations: string[]
  alerts: {
    type: 'warning' | 'caution' | 'advisory'
    message: string
  }[]
  alternativeTimes: {
    time: string
    score: number
    reason: string
  }[]
  alternativeLocations: {
    name: string
    coordinates: [number, number]
    score: number
    reason: string
  }[]
}

interface WeatherIntegrationPlanningProps {
  captainId: string
  className?: string
}

// Mock weather data generator
const generateWeatherForecast = (): WeatherForecast => {
  const conditions = ['sunny', 'partly-cloudy', 'cloudy', 'overcast', 'light-rain', 'heavy-rain', 'thunderstorm', 'windy', 'foggy'] as const
  const now = new Date()

  const generateWeatherData = (date: Date, hour?: number): WeatherData => {
    const condition = conditions[Math.floor(Math.random() * conditions.length)]
    const baseTemp = 18 + Math.random() * 12
    
    return {
      date: date.toISOString().split('T')[0],
      time: hour !== undefined ? `${hour.toString().padStart(2, '0')}:00` : '12:00',
      temperature: baseTemp,
      feelsLike: baseTemp + (Math.random() - 0.5) * 4,
      humidity: 60 + Math.random() * 30,
      windSpeed: Math.random() * 25,
      windDirection: Math.random() * 360,
      windGust: Math.random() * 35,
      visibility: 10 + Math.random() * 20,
      pressure: 1010 + (Math.random() - 0.5) * 30,
      waveHeight: Math.random() * 3,
      waveDirection: Math.random() * 360,
      precipitation: condition.includes('rain') ? Math.random() * 10 : 0,
      precipitationProbability: condition.includes('rain') ? 60 + Math.random() * 40 : Math.random() * 30,
      uvIndex: Math.floor(Math.random() * 11),
      condition,
      conditionDescription: {
        'sunny': 'Ясно',
        'partly-cloudy': 'Переменная облачность', 
        'cloudy': 'Облачно',
        'overcast': 'Пасмурно',
        'light-rain': 'Небольшой дождь',
        'heavy-rain': 'Сильный дождь',
        'thunderstorm': 'Гроза',
        'windy': 'Ветрено',
        'foggy': 'Туман'
      }[condition],
      icon: condition
    }
  }

  const current = generateWeatherData(now)
  
  const hourly: WeatherData[] = []
  for (let i = 0; i < 24; i++) {
    const hourDate = new Date(now.getTime() + i * 60 * 60 * 1000)
    hourly.push(generateWeatherData(hourDate, hourDate.getHours()))
  }

  const daily: WeatherData[] = []
  for (let i = 0; i < 7; i++) {
    const dayDate = addDays(now, i)
    daily.push(generateWeatherData(dayDate))
  }

  return { current, hourly, daily }
}

// Weather assessment logic
const assessTripWeather = (weatherData: WeatherData, location: { name: string; coordinates: [number, number] }): TripWeatherAssessment => {
  const safetyFactors = {
    windSpeed: weatherData.windSpeed < 15 ? 100 : weatherData.windSpeed < 25 ? 70 : 30,
    waveHeight: weatherData.waveHeight < 1.5 ? 100 : weatherData.waveHeight < 2.5 ? 80 : 40,
    visibility: weatherData.visibility > 15 ? 100 : weatherData.visibility > 10 ? 80 : 50,
    precipitation: weatherData.precipitation < 2 ? 100 : weatherData.precipitation < 5 ? 70 : 30
  }

  const comfortFactors = {
    temperature: Math.abs(weatherData.temperature - 22) < 5 ? 100 : Math.abs(weatherData.temperature - 22) < 10 ? 70 : 50,
    humidity: weatherData.humidity < 70 ? 100 : weatherData.humidity < 85 ? 80 : 60,
    wind: weatherData.windSpeed < 10 ? 100 : weatherData.windSpeed < 20 ? 80 : 60
  }

  const fishingFactors = {
    pressure: Math.abs(weatherData.pressure - 1013) < 10 ? 100 : Math.abs(weatherData.pressure - 1013) < 20 ? 80 : 60,
    cloudCover: ['partly-cloudy', 'cloudy'].includes(weatherData.condition) ? 100 : weatherData.condition === 'sunny' ? 80 : 60,
    stability: weatherData.condition === 'thunderstorm' ? 20 : weatherData.precipitationProbability < 30 ? 100 : 70
  }

  const safetyScore = Math.round(Object.values(safetyFactors).reduce((sum, val) => sum + val, 0) / Object.values(safetyFactors).length)
  const comfortScore = Math.round(Object.values(comfortFactors).reduce((sum, val) => sum + val, 0) / Object.values(comfortFactors).length)
  const fishingConditionScore = Math.round(Object.values(fishingFactors).reduce((sum, val) => sum + val, 0) / Object.values(fishingFactors).length)
  const overallScore = Math.round((safetyScore * 0.4 + comfortScore * 0.3 + fishingConditionScore * 0.3))

  const recommendations: string[] = []
  const alerts: { type: 'warning' | 'caution' | 'advisory'; message: string }[] = []

  if (weatherData.windSpeed > 20) {
    alerts.push({ type: 'warning', message: 'Сильный ветер может создать опасные условия' })
    recommendations.push('Рассмотрите перенос поездки или выбор защищенной локации')
  }

  if (weatherData.waveHeight > 2) {
    alerts.push({ type: 'caution', message: 'Высокие волны могут вызвать дискомфорт у пассажиров' })
    recommendations.push('Предупредите клиентов о возможной качке')
  }

  if (weatherData.precipitationProbability > 70) {
    alerts.push({ type: 'advisory', message: 'Высокая вероятность осадков' })
    recommendations.push('Подготовьте дождевики и укрытие для пассажиров')
  }

  if (overallScore >= 80) {
    recommendations.push('Отличные условия для рыбалки')
  } else if (overallScore >= 60) {
    recommendations.push('Хорошие условия с небольшими ограничениями')
  } else {
    recommendations.push('Рекомендуется рассмотреть альтернативные варианты')
  }

  return {
    tripId: 'trip-assessment',
    date: weatherData.date,
    timeSlot: weatherData.time,
    location,
    weatherConditions: weatherData,
    safetyScore,
    comfortScore,
    fishingConditionScore,
    overallScore,
    recommendations,
    alerts,
    alternativeTimes: [
      { time: '06:00', score: overallScore + 10, reason: 'Более стабильные утренние условия' },
      { time: '07:00', score: overallScore + 5, reason: 'Хорошее время для рыбалки' },
      { time: '16:00', score: overallScore - 5, reason: 'Вечерняя активность рыбы' }
    ],
    alternativeLocations: [
      { name: 'Защищенная бухта', coordinates: [38.7500, -9.1000], score: overallScore + 15, reason: 'Защита от ветра и волн' },
      { name: 'Прибрежные воды', coordinates: [38.7223, -9.1393], score: overallScore + 8, reason: 'Близко к порту, безопасно' }
    ]
  }
}

export default function WeatherIntegrationPlanning({ captainId, className }: WeatherIntegrationPlanningProps) {
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedLocation, setSelectedLocation] = useState('North Banks')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Available fishing locations
  const locations = [
    { name: 'North Banks', coordinates: [38.7223, -9.1393] as [number, number] },
    { name: 'Deep Atlantic', coordinates: [38.6892, -9.2344] as [number, number] },
    { name: 'Coastal Waters', coordinates: [38.7500, -9.1000] as [number, number] },
    { name: 'South Ridge', coordinates: [38.6500, -9.1800] as [number, number] }
  ]

  // Load weather data
  const loadWeatherData = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setWeatherForecast(generateWeatherForecast())
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Error loading weather data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWeatherData()
  }, [captainId])

  // Auto-refresh every 10 minutes
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadWeatherData()
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  // Get weather icon component
  const getWeatherIcon = (condition: string, size: number = 6) => {
    const iconClasses = `h-${size} w-${size}`
    
    switch (condition) {
      case 'sunny':
        return <Sun className={`${iconClasses} text-yellow-500`} />
      case 'partly-cloudy':
        return <Sun className={`${iconClasses} text-yellow-400`} />
      case 'cloudy':
      case 'overcast':
        return <Cloud className={`${iconClasses} text-gray-500`} />
      case 'light-rain':
      case 'heavy-rain':
        return <CloudRain className={`${iconClasses} text-blue-500`} />
      case 'thunderstorm':
        return <Zap className={`${iconClasses} text-purple-500`} />
      case 'windy':
        return <Wind className={`${iconClasses} text-gray-600`} />
      case 'foggy':
        return <Cloud className={`${iconClasses} text-gray-400`} />
      default:
        return <Sun className={`${iconClasses} text-yellow-500`} />
    }
  }

  // Get condition color
  const getConditionColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  // Trip assessment for selected date and location
  const tripAssessment = useMemo(() => {
    if (!weatherForecast || !selectedDate) return null
    
    const selectedLocationData = locations.find(loc => loc.name === selectedLocation)
    if (!selectedLocationData) return null

    const dateStr = format(selectedDate, 'yyyy-MM-dd')
    const dayWeather = weatherForecast.daily.find(day => day.date === dateStr)
    
    if (!dayWeather) return null

    return assessTripWeather(dayWeather, selectedLocationData)
  }, [weatherForecast, selectedDate, selectedLocation])

  // Chart data for hourly forecast
  const chartData = useMemo(() => {
    if (!weatherForecast) return []
    
    return weatherForecast.hourly.slice(0, 12).map(weather => ({
      time: weather.time,
      temperature: weather.temperature,
      windSpeed: weather.windSpeed,
      waveHeight: weather.waveHeight,
      precipitation: weather.precipitationProbability,
      visibility: weather.visibility
    }))
  }, [weatherForecast])

  if (loading || !weatherForecast) {
    return (
      <div className={`space-y-6 ${className}`}>
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

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Планирование по погоде</h2>
          <p className="text-muted-foreground">
            Интеграция погодных данных для оптимального планирования поездок
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Обновлено: {format(lastUpdated, 'HH:mm')}</span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadWeatherData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Current Conditions Overview */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {getWeatherIcon(weatherForecast.current.condition, 12)}
              <div>
                <CardTitle className="text-2xl">
                  {weatherForecast.current.temperature.toFixed(0)}°C
                </CardTitle>
                <CardDescription className="text-lg">
                  {weatherForecast.current.conditionDescription}
                </CardDescription>
                <p className="text-sm text-muted-foreground">
                  Ощущается как {weatherForecast.current.feelsLike.toFixed(0)}°C
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="flex items-center space-x-1 justify-center">
                  <Wind className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">{weatherForecast.current.windSpeed.toFixed(0)}</span>
                  <span className="text-sm">км/ч</span>
                </div>
                <p className="text-xs text-muted-foreground">Ветер</p>
              </div>
              <div>
                <div className="flex items-center space-x-1 justify-center">
                  <Waves className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">{weatherForecast.current.waveHeight.toFixed(1)}</span>
                  <span className="text-sm">м</span>
                </div>
                <p className="text-xs text-muted-foreground">Волны</p>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Planning Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Оценка условий для поездки</CardTitle>
            <CardDescription>
              Выберите дату и локацию для анализа условий
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Дата поездки</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {selectedDate ? format(selectedDate, 'dd MMM', { locale: ru }) : 'Выберите дату'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <label className="text-sm font-medium">Локация</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {locations.map(location => (
                    <option key={location.name} value={location.name}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {tripAssessment && (
              <div className="space-y-4">
                {/* Score Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-3xl font-bold ${getConditionColor(tripAssessment.overallScore)}`}>
                      {tripAssessment.overallScore}
                    </div>
                    <p className="text-sm text-muted-foreground">Общая оценка</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Безопасность</span>
                      <span className="text-sm font-medium">{tripAssessment.safetyScore}%</span>
                    </div>
                    <Progress value={tripAssessment.safetyScore} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Комфорт</span>
                      <span className="text-sm font-medium">{tripAssessment.comfortScore}%</span>
                    </div>
                    <Progress value={tripAssessment.comfortScore} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Условия рыбалки</span>
                      <span className="text-sm font-medium">{tripAssessment.fishingConditionScore}%</span>
                    </div>
                    <Progress value={tripAssessment.fishingConditionScore} className="h-2" />
                  </div>
                </div>

                {/* Alerts */}
                {tripAssessment.alerts.length > 0 && (
                  <div className="space-y-2">
                    {tripAssessment.alerts.map((alert, index) => (
                      <Alert key={index} className={
                        alert.type === 'warning' ? 'border-red-200 bg-red-50' :
                        alert.type === 'caution' ? 'border-yellow-200 bg-yellow-50' :
                        'border-blue-200 bg-blue-50'
                      }>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{alert.message}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                <div>
                  <h4 className="font-medium mb-2">Рекомендации:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {tripAssessment.recommendations.map((rec, index) => (
                      <li key={index}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alternative Options */}
        <Card>
          <CardHeader>
            <CardTitle>Альтернативные варианты</CardTitle>
            <CardDescription>
              Рекомендуемые время и локации при неблагоприятных условиях
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tripAssessment && (
              <>
                {/* Alternative Times */}
                <div>
                  <h4 className="font-medium mb-3">Альтернативное время:</h4>
                  <div className="space-y-2">
                    {tripAssessment.alternativeTimes.map((time, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{time.time}</span>
                        </div>
                        <div className="text-right">
                          <Badge className={getConditionColor(time.score)}>
                            {time.score}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{time.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alternative Locations */}
                <div>
                  <h4 className="font-medium mb-3">Альтернативные локации:</h4>
                  <div className="space-y-2">
                    {tripAssessment.alternativeLocations.map((location, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">{location.name}</span>
                        </div>
                        <div className="text-right">
                          <Badge className={getConditionColor(location.score)}>
                            {location.score}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{location.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Forecast Tabs */}
      <Tabs defaultValue="hourly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="hourly">Почасовой прогноз</TabsTrigger>
          <TabsTrigger value="daily">7-дневный прогноз</TabsTrigger>
          <TabsTrigger value="marine">Морские условия</TabsTrigger>
        </TabsList>

        <TabsContent value="hourly" className="space-y-6">
          {/* Hourly Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Почасовые условия</CardTitle>
              <CardDescription>
                Температура, ветер и волны на ближайшие 12 часов
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="Температура °C"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="windSpeed" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Ветер км/ч"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="waveHeight" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Волны м"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          {/* 7-Day Forecast */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {weatherForecast.daily.slice(0, 7).map((day, index) => (
              <Card key={index} className="text-center">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {index === 0 ? 'Сегодня' : format(new Date(day.date), 'EEE, dd MMM', { locale: ru })}
                    </p>
                    <div className="flex justify-center">
                      {getWeatherIcon(day.condition, 8)}
                    </div>
                    <p className="text-2xl font-bold">{day.temperature.toFixed(0)}°</p>
                    <p className="text-sm text-muted-foreground">{day.conditionDescription}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <Wind className="h-3 w-3" />
                        <span>{day.windSpeed.toFixed(0)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Droplets className="h-3 w-3" />
                        <span>{day.precipitationProbability.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="marine" className="space-y-6">
          {/* Marine Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Waves className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Высота волн</p>
                    <p className="text-2xl font-bold">{weatherForecast.current.waveHeight.toFixed(1)}м</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Eye className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Видимость</p>
                    <p className="text-2xl font-bold">{weatherForecast.current.visibility.toFixed(0)}км</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Navigation className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Направление ветра</p>
                    <p className="text-2xl font-bold">{weatherForecast.current.windDirection.toFixed(0)}°</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Давление</p>
                    <p className="text-2xl font-bold">{weatherForecast.current.pressure.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">мбар</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marine Safety Advisory */}
          <Card>
            <CardHeader>
              <CardTitle>Рекомендации по безопасности</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-green-600">✅ Благоприятные условия:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Ветер менее 15 км/ч</li>
                    <li>• Волны до 1.5 метров</li>
                    <li>• Видимость более 10 км</li>
                    <li>• Стабильное давление</li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-red-600">⚠️ Осторожность при:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Ветре более 25 км/ч</li>
                    <li>• Волнах более 2.5 метров</li>
                    <li>• Видимости менее 5 км</li>
                    <li>• Резких изменениях давления</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
