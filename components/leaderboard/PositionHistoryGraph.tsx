'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, parseISO, subDays, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PositionHistoryPoint {
  position: number;
  timestamp: Date;
  orderBy: string;
  value?: number; // The actual metric value at that time
}

interface PositionHistoryGraphProps {
  userId: string;
  userName: string;
  history: PositionHistoryPoint[];
  currentPosition: number;
  orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount';
  timeRange?: '7d' | '30d' | '90d' | 'all';
  className?: string;
  showMetrics?: boolean;
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-sm text-gray-600 mb-1">
          {format(new Date(label), 'dd MMMM yyyy, HH:mm', { locale: ru })}
        </p>
        <p className="text-sm font-medium">
          Позиция: <span className="text-lg font-bold">#{data.position}</span>
        </p>
        {data.value && (
          <p className="text-xs text-gray-500">
            Значение: {data.value}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Get trend analysis
const getTrendAnalysis = (history: PositionHistoryPoint[]) => {
  if (history.length < 2) {
    return { trend: 'stable', change: 0, message: 'Недостаточно данных' };
  }
  
  const recent = history.slice(-7); // Last 7 points
  const firstPos = recent[0]?.position || 0;
  const lastPos = recent[recent.length - 1]?.position || 0;
  const change = firstPos - lastPos; // Positive means improvement (lower position number)
  
  let trend: 'up' | 'down' | 'stable';
  let message: string;
  
  if (change > 2) {
    trend = 'up';
    message = `Отличная динамика! Вы поднялись на ${change} позиций`;
  } else if (change < -2) {
    trend = 'down';
    message = `Небольшой спад на ${Math.abs(change)} позиций. Время для рывка!`;
  } else {
    trend = 'stable';
    message = 'Стабильная позиция. Держите темп!';
  }
  
  return { trend, change, message };
};

// Get performance metrics
const getPerformanceMetrics = (history: PositionHistoryPoint[]) => {
  if (history.length === 0) return null;
  
  const positions = history.map(h => h.position);
  const bestPosition = Math.min(...positions);
  const worstPosition = Math.max(...positions);
  const averagePosition = positions.reduce((a, b) => a + b, 0) / positions.length;
  
  return {
    best: bestPosition,
    worst: worstPosition,
    average: Math.round(averagePosition),
    consistency: positions.length > 1 ? 
      100 - ((worstPosition - bestPosition) / worstPosition) * 100 : 100
  };
};

export function PositionHistoryGraph({
  userId,
  userName,
  history,
  currentPosition,
  orderBy,
  timeRange = '30d',
  className,
  showMetrics = true
}: PositionHistoryGraphProps) {
  
  // Filter and prepare data based on time range
  const chartData = useMemo(() => {
    let filteredHistory = [...history];
    
    // Filter by time range
    const now = new Date();
    let cutoffDate: Date;
    
    switch (timeRange) {
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      case '90d':
        cutoffDate = subDays(now, 90);
        break;
      default:
        cutoffDate = new Date(0); // All time
    }
    
    filteredHistory = filteredHistory.filter(h => h.timestamp >= cutoffDate);
    
    // Add current position as the latest point if not already present
    const latestHistoryTime = filteredHistory.length > 0 
      ? Math.max(...filteredHistory.map(h => h.timestamp.getTime()))
      : 0;
      
    if (now.getTime() - latestHistoryTime > 1000 * 60 * 60) { // If last update was more than 1 hour ago
      filteredHistory.push({
        position: currentPosition,
        timestamp: now,
        orderBy
      });
    }
    
    // Sort by timestamp and format for chart
    return filteredHistory
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map(point => ({
        ...point,
        timestamp: point.timestamp.toISOString(),
        formattedDate: format(point.timestamp, 'dd.MM', { locale: ru })
      }));
  }, [history, timeRange, currentPosition, orderBy]);
  
  const trendAnalysis = getTrendAnalysis(chartData);
  const performanceMetrics = getPerformanceMetrics(chartData);
  
  if (chartData.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            История позиций
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>История позиций пока недоступна</p>
            <p className="text-sm">Данные будут появляться по мере участия в рейтинге</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Calculate Y-axis domain with some padding
  const positions = chartData.map(d => d.position);
  const minPos = Math.min(...positions);
  const maxPos = Math.max(...positions);
  const padding = Math.max(1, Math.ceil((maxPos - minPos) * 0.1));
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            История позиций
          </div>
          <Badge variant="outline" className="text-xs">
            {timeRange === '7d' && '7 дней'}
            {timeRange === '30d' && '30 дней'}
            {timeRange === '90d' && '90 дней'}
            {timeRange === 'all' && 'Всё время'}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Trend Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg',
            trendAnalysis.trend === 'up' && 'bg-green-50 border border-green-200',
            trendAnalysis.trend === 'down' && 'bg-red-50 border border-red-200',
            trendAnalysis.trend === 'stable' && 'bg-blue-50 border border-blue-200'
          )}
        >
          {trendAnalysis.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-600" />}
          {trendAnalysis.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-600" />}
          {trendAnalysis.trend === 'stable' && <Minus className="w-5 h-5 text-blue-600" />}
          
          <div>
            <p className={cn(
              'font-medium text-sm',
              trendAnalysis.trend === 'up' && 'text-green-700',
              trendAnalysis.trend === 'down' && 'text-red-700',
              trendAnalysis.trend === 'stable' && 'text-blue-700'
            )}>
              {trendAnalysis.message}
            </p>
            <p className="text-xs text-muted-foreground">
              Анализ за последние записи
            </p>
          </div>
        </motion.div>
        
        {/* Performance Metrics */}
        {showMetrics && performanceMetrics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-muted-foreground">Лучшая позиция</p>
              <p className="text-xl font-bold text-yellow-700">#{performanceMetrics.best}</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-xs text-muted-foreground">Худшая позиция</p>
              <p className="text-xl font-bold text-red-700">#{performanceMetrics.worst}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-muted-foreground">Средняя позиция</p>
              <p className="text-xl font-bold text-blue-700">#{performanceMetrics.average}</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-muted-foreground">Стабильность</p>
              <p className="text-xl font-bold text-purple-700">{performanceMetrics.consistency.toFixed(0)}%</p>
            </div>
          </motion.div>
        )}
        
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="h-64 w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="positionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              
              <XAxis 
                dataKey="formattedDate"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
              />
              
              <YAxis 
                domain={[Math.max(1, minPos - padding), maxPos + padding]}
                reversed={true} // Lower positions (1, 2, 3) should be at the top
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                tickFormatter={(value) => `#${value}`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="position"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#positionGradient)"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#1d4ed8' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
        
        {/* Current Position Highlight */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center p-3 bg-primary/5 rounded-lg border border-primary/20"
        >
          <p className="text-sm text-muted-foreground">Текущая позиция</p>
          <p className="text-2xl font-bold text-primary">#{currentPosition}</p>
          <p className="text-xs text-muted-foreground">{userName}</p>
        </motion.div>
      </CardContent>
    </Card>
  );
}
