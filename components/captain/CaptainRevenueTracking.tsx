'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  Euro,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar as CalendarIcon,
  Download,
  FileText,
  Clock,
  Target,
  Users,
  Ship,
  Award,
  CreditCard,
  Banknote,
  Receipt,
  PiggyBank,
  Calculator
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isWithinInterval } from 'date-fns'
import { ru } from 'date-fns/locale'

// Captain Revenue Tracking Component
// Part of Task 16: Captain Dashboard Interface - Subtask 16.2

export interface RevenueData {
  id: string
  date: string
  tripId: string
  tripType: 'private' | 'group' | 'course'
  participants: number
  basePrice: number
  totalRevenue: number
  commissionRate: number
  commissionAmount: number
  netEarnings: number
  payoutStatus: 'pending' | 'processing' | 'paid' | 'failed'
  payoutDate?: string
  fees: {
    platformFee: number
    paymentProcessing: number
    insurance: number
    other: number
  }
  participant?: {
    name: string
    email: string
  }
  weather?: {
    condition: string
    impact: 'positive' | 'neutral' | 'negative'
  }
}

export interface PayoutSchedule {
  id: string
  period: string
  startDate: string
  endDate: string
  totalEarnings: number
  status: 'upcoming' | 'processing' | 'completed' | 'failed'
  payoutDate: string
  bankAccount: string
  transactions: string[]
}

export interface RevenueMetrics {
  currentMonth: {
    totalRevenue: number
    netEarnings: number
    commission: number
    trips: number
    averagePerTrip: number
    growthRate: number
  }
  yearToDate: {
    totalRevenue: number
    netEarnings: number
    commission: number
    trips: number
    averagePerTrip: number
  }
  projections: {
    nextMonth: number
    nextQuarter: number
    yearEnd: number
  }
  breakdown: {
    byTripType: { type: string; revenue: number; count: number }[]
    byMonth: { month: string; revenue: number; trips: number }[]
    byWeather: { condition: string; impact: number }[]
  }
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface CaptainRevenueTrackingProps {
  captainId: string
  className?: string
}

// Mock data generators
const generateRevenueData = (months: number = 12): RevenueData[] => {
  const data: RevenueData[] = []
  const now = new Date()
  
  for (let i = 0; i < months * 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    
    // Skip some days randomly
    if (Math.random() < 0.7) continue
    
    const tripTypes = ['private', 'group', 'course'] as const
    const tripType = tripTypes[Math.floor(Math.random() * tripTypes.length)]
    
    const participants = tripType === 'private' ? Math.floor(Math.random() * 6) + 1 :
                        tripType === 'group' ? Math.floor(Math.random() * 8) + 2 :
                        Math.floor(Math.random() * 12) + 4
    
    const basePrice = tripType === 'private' ? 400 :
                     tripType === 'group' ? 95 :
                     120
    
    const totalRevenue = tripType === 'private' ? basePrice : basePrice * participants
    const commissionRate = tripType === 'private' ? 0.15 : tripType === 'group' ? 0.12 : 0.18
    const commissionAmount = totalRevenue * commissionRate
    
    const fees = {
      platformFee: totalRevenue * 0.03,
      paymentProcessing: totalRevenue * 0.029,
      insurance: totalRevenue * 0.01,
      other: Math.random() * 10
    }
    
    const netEarnings = totalRevenue - commissionAmount - Object.values(fees).reduce((sum, fee) => sum + fee, 0)
    
    data.push({
      id: `revenue-${i}`,
      date: date.toISOString(),
      tripId: `trip-${i}`,
      tripType,
      participants,
      basePrice,
      totalRevenue,
      commissionRate,
      commissionAmount,
      netEarnings,
      payoutStatus: Math.random() < 0.8 ? 'paid' : Math.random() < 0.5 ? 'pending' : 'processing',
      payoutDate: Math.random() < 0.8 ? new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      fees,
      participant: {
        name: `Участник ${i}`,
        email: `participant${i}@example.com`
      },
      weather: {
        condition: ['sunny', 'cloudy', 'rainy', 'windy'][Math.floor(Math.random() * 4)],
        impact: Math.random() < 0.6 ? 'positive' : Math.random() < 0.5 ? 'neutral' : 'negative'
      }
    })
  }
  
  return data.reverse()
}

const generatePayoutSchedule = (): PayoutSchedule[] => {
  const schedules: PayoutSchedule[] = []
  const now = new Date()
  
  for (let i = 0; i < 6; i++) {
    const startDate = startOfMonth(subMonths(now, i))
    const endDate = endOfMonth(subMonths(now, i))
    const payoutDate = new Date(endDate.getTime() + 5 * 24 * 60 * 60 * 1000)
    
    schedules.push({
      id: `payout-${i}`,
      period: format(startDate, 'MMMM yyyy', { locale: ru }),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalEarnings: Math.random() * 3000 + 1000,
      status: i === 0 ? 'upcoming' : i === 1 ? 'processing' : 'completed',
      payoutDate: payoutDate.toISOString(),
      bankAccount: '**** **** **** 1234',
      transactions: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, j) => `txn-${i}-${j}`)
    })
  }
  
  return schedules
}

export default function CaptainRevenueTracking({ captainId, className }: CaptainRevenueTrackingProps) {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [payoutSchedule, setPayoutSchedule] = useState<PayoutSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date())
  })
  const [selectedPeriod, setSelectedPeriod] = useState('3months')

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Simulate API calls
        await new Promise(resolve => setTimeout(resolve, 1000))
        setRevenueData(generateRevenueData(12))
        setPayoutSchedule(generatePayoutSchedule())
      } catch (error) {
        console.error('Error loading revenue data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [captainId])

  // Filter data by date range
  const filteredData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return revenueData
    
    return revenueData.filter(item => {
      const itemDate = new Date(item.date)
      return isWithinInterval(itemDate, { start: dateRange.from!, end: dateRange.to! })
    })
  }, [revenueData, dateRange])

  // Calculate metrics
  const metrics = useMemo((): RevenueMetrics => {
    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))
    
    const currentMonthData = revenueData.filter(item => {
      const date = new Date(item.date)
      return isWithinInterval(date, { start: currentMonthStart, end: currentMonthEnd })
    })
    
    const lastMonthData = revenueData.filter(item => {
      const date = new Date(item.date)
      return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd })
    })
    
    const yearToDateData = revenueData.filter(item => {
      const date = new Date(item.date)
      return date.getFullYear() === now.getFullYear()
    })

    const currentMonthRevenue = currentMonthData.reduce((sum, item) => sum + item.totalRevenue, 0)
    const lastMonthRevenue = lastMonthData.reduce((sum, item) => sum + item.totalRevenue, 0)
    const growthRate = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0

    // Breakdown by trip type
    const byTripType = ['private', 'group', 'course'].map(type => ({
      type,
      revenue: filteredData.filter(item => item.tripType === type).reduce((sum, item) => sum + item.totalRevenue, 0),
      count: filteredData.filter(item => item.tripType === type).length
    }))

    // Monthly breakdown
    const monthlyData: { [key: string]: { revenue: number; trips: number } } = {}
    filteredData.forEach(item => {
      const month = format(new Date(item.date), 'MMM yyyy', { locale: ru })
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, trips: 0 }
      }
      monthlyData[month].revenue += item.totalRevenue
      monthlyData[month].trips += 1
    })

    const byMonth = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      trips: data.trips
    }))

    return {
      currentMonth: {
        totalRevenue: currentMonthRevenue,
        netEarnings: currentMonthData.reduce((sum, item) => sum + item.netEarnings, 0),
        commission: currentMonthData.reduce((sum, item) => sum + item.commissionAmount, 0),
        trips: currentMonthData.length,
        averagePerTrip: currentMonthData.length > 0 ? currentMonthRevenue / currentMonthData.length : 0,
        growthRate
      },
      yearToDate: {
        totalRevenue: yearToDateData.reduce((sum, item) => sum + item.totalRevenue, 0),
        netEarnings: yearToDateData.reduce((sum, item) => sum + item.netEarnings, 0),
        commission: yearToDateData.reduce((sum, item) => sum + item.commissionAmount, 0),
        trips: yearToDateData.length,
        averagePerTrip: yearToDateData.length > 0 ? yearToDateData.reduce((sum, item) => sum + item.totalRevenue, 0) / yearToDateData.length : 0
      },
      projections: {
        nextMonth: currentMonthRevenue * 1.1,
        nextQuarter: currentMonthRevenue * 3.2,
        yearEnd: yearToDateData.reduce((sum, item) => sum + item.totalRevenue, 0) * 1.3
      },
      breakdown: {
        byTripType,
        byMonth,
        byWeather: []
      }
    }
  }, [revenueData, filteredData])

  // Chart data preparation
  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: any } = {}
    
    filteredData.forEach(item => {
      const month = format(new Date(item.date), 'MMM', { locale: ru })
      if (!monthlyData[month]) {
        monthlyData[month] = {
          month,
          revenue: 0,
          earnings: 0,
          commission: 0,
          trips: 0
        }
      }
      monthlyData[month].revenue += item.totalRevenue
      monthlyData[month].earnings += item.netEarnings
      monthlyData[month].commission += item.commissionAmount
      monthlyData[month].trips += 1
    })
    
    return Object.values(monthlyData)
  }, [filteredData])

  const tripTypeData = metrics.breakdown.byTripType.map(item => ({
    name: item.type === 'private' ? 'Частные' : item.type === 'group' ? 'Групповые' : 'Курсы',
    value: item.revenue,
    count: item.count
  }))

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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
          <h2 className="text-2xl font-bold">Доходы и комиссии</h2>
          <p className="text-muted-foreground">
            Отслеживание доходов, выплат и налоговой отчетности
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {dateRange.from && dateRange.to 
                  ? `${format(dateRange.from, 'MMM dd', { locale: ru })} - ${format(dateRange.to, 'MMM dd', { locale: ru })}`
                  : 'Выбрать период'
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Текущий месяц</p>
                <p className="text-2xl font-bold">€{metrics.currentMonth.totalRevenue.toFixed(0)}</p>
                <div className="flex items-center space-x-1 text-xs">
                  {metrics.currentMonth.growthRate >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={metrics.currentMonth.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {Math.abs(metrics.currentMonth.growthRate).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <PiggyBank className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Чистая прибыль</p>
                <p className="text-2xl font-bold">€{metrics.currentMonth.netEarnings.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.currentMonth.trips} поездок
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calculator className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Комиссия платформы</p>
                <p className="text-2xl font-bold">€{metrics.currentMonth.commission.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">
                  {((metrics.currentMonth.commission / metrics.currentMonth.totalRevenue) * 100).toFixed(1)}% от оборота
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Средний чек</p>
                <p className="text-2xl font-bold">€{metrics.currentMonth.averagePerTrip.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">
                  на поездку
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="payouts">Выплаты</TabsTrigger>
          <TabsTrigger value="breakdown">Детализация</TabsTrigger>
          <TabsTrigger value="tax-report">Налоговая отчетность</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Динамика доходов</CardTitle>
              <CardDescription>
                Сравнение доходов, чистой прибыли и комиссий по месяцам
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        `€${(value as number).toFixed(0)}`,
                        name === 'revenue' ? 'Общий доход' :
                        name === 'earnings' ? 'Чистая прибыль' : 'Комиссия'
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Общий доход"
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="#10b981"
                      fill="url(#colorEarnings)"
                      fillOpacity={0.6}
                      name="Чистая прибыль"
                    />
                    <Area
                      type="monotone"
                      dataKey="commission"
                      stroke="#f59e0b"
                      fill="url(#colorCommission)"
                      fillOpacity={0.4}
                      name="Комиссия"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Trip Types Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>По типам поездок</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tripTypeData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {tripTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `€${(value as number).toFixed(0)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Прогнозы</CardTitle>
                <CardDescription>
                  Ожидаемые доходы на основе текущих тенденций
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Следующий месяц</span>
                  <span className="font-semibold">€{metrics.projections.nextMonth.toFixed(0)}</span>
                </div>
                <Progress value={75} className="w-full" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Следующий квартал</span>
                  <span className="font-semibold">€{metrics.projections.nextQuarter.toFixed(0)}</span>
                </div>
                <Progress value={60} className="w-full" />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Конец года</span>
                  <span className="font-semibold">€{metrics.projections.yearEnd.toFixed(0)}</span>
                </div>
                <Progress value={45} className="w-full" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <div className="grid gap-4">
            {payoutSchedule.map((payout) => {
              const getStatusColor = (status: string) => {
                switch (status) {
                  case 'completed': return 'bg-green-100 text-green-800'
                  case 'processing': return 'bg-blue-100 text-blue-800'
                  case 'upcoming': return 'bg-yellow-100 text-yellow-800'
                  case 'failed': return 'bg-red-100 text-red-800'
                  default: return 'bg-gray-100 text-gray-800'
                }
              }

              const getStatusIcon = (status: string) => {
                switch (status) {
                  case 'completed': return <CreditCard className="h-4 w-4 text-green-600" />
                  case 'processing': return <Clock className="h-4 w-4 text-blue-600" />
                  case 'upcoming': return <Calendar className="h-4 w-4 text-yellow-600" />
                  case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />
                  default: return null
                }
              }

              return (
                <Card key={payout.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(payout.status)}
                        <div>
                          <h3 className="font-semibold">{payout.period}</h3>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payout.startDate), 'dd MMM', { locale: ru })} - 
                            {format(new Date(payout.endDate), 'dd MMM yyyy', { locale: ru })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">€{payout.totalEarnings.toFixed(0)}</p>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status === 'completed' ? 'Выплачено' :
                           payout.status === 'processing' ? 'Обрабатывается' :
                           payout.status === 'upcoming' ? 'Ожидается' : 'Ошибка'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Дата выплаты:</span>
                        <span>{format(new Date(payout.payoutDate), 'dd MMM yyyy', { locale: ru })}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Банковский счет:</span>
                        <span>{payout.bankAccount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Транзакций:</span>
                        <span>{payout.transactions.length}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          {/* Detailed Transaction List */}
          <Card>
            <CardHeader>
              <CardTitle>Детализация транзакций</CardTitle>
              <CardDescription>
                Подробная информация по всем поездкам за выбранный период
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Ship className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {item.tripType === 'private' ? 'Частная поездка' :
                           item.tripType === 'group' ? 'Групповая поездка' : 'Курс рыбалки'}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(item.date), 'dd MMM yyyy', { locale: ru })} • {item.participants} участников
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Доход: €{item.totalRevenue.toFixed(0)}</span>
                          <span>Комиссия: €{item.commissionAmount.toFixed(0)}</span>
                          <span>К выплате: €{item.netEarnings.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        item.payoutStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        item.payoutStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                        item.payoutStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {item.payoutStatus === 'paid' ? 'Выплачено' :
                         item.payoutStatus === 'processing' ? 'Обработка' :
                         item.payoutStatus === 'pending' ? 'Ожидает' : 'Ошибка'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax-report" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Налоговая отчетность</CardTitle>
              <CardDescription>
                Данные для подачи налоговых деклараций
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Общий доход за год</Label>
                  <div className="text-2xl font-bold">€{metrics.yearToDate.totalRevenue.toFixed(0)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Расходы (комиссии и сборы)</Label>
                  <div className="text-2xl font-bold">€{metrics.yearToDate.commission.toFixed(0)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Налогооблагаемый доход</Label>
                  <div className="text-2xl font-bold text-green-600">€{metrics.yearToDate.netEarnings.toFixed(0)}</div>
                </div>
                <div className="space-y-2">
                  <Label>Количество транзакций</Label>
                  <div className="text-2xl font-bold">{metrics.yearToDate.trips}</div>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between">
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-1" />
                  Экспорт в PDF
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Экспорт в Excel
                </Button>
                <Button>
                  <Receipt className="h-4 w-4 mr-1" />
                  Сформировать отчет
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
