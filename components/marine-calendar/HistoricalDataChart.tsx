'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoricalDataChartProps {
  location: {
    latitude: number;
    longitude: number;
    name?: string;
  };
  dateRange: {
    start: Date;
    end: Date;
  };
  className?: string;
}

interface HistoricalData {
  analysisType: string;
  data: any;
  metadata: {
    totalRecords: number;
    calculatedAt: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export function HistoricalDataChart({ location, dateRange, className }: HistoricalDataChartProps) {
  const [data, setData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisType, setAnalysisType] = useState<'summary' | 'detailed' | 'correlations' | 'trends'>('summary');
  const [groupBy, setGroupBy] = useState<'date' | 'species' | 'lunar_phase' | 'month' | 'season'>('month');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistoricalData();
  }, [location, analysisType, groupBy]);

  const loadHistoricalData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        analysisType,
        groupBy
      });

      // Добавляем даты если нужны
      if (analysisType === 'trends' || analysisType === 'detailed') {
        params.append('startDate', dateRange.start.toISOString());
        params.append('endDate', dateRange.end.toISOString());
      }

      const response = await fetch(`/api/marine-calendar/historical-data?${params}`);
      
      if (!response.ok) {
        throw new Error('Ошибка загрузки исторических данных');
      }

      const result = await response.json();
      setData(result);

    } catch (err) {
      console.error('Ошибка загрузки исторических данных:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  const renderSummaryAnalysis = () => {
    if (!data?.data) return null;

    const summary = data.data;
    const lunarPhaseData = Object.entries(summary.lunarPhaseAnalysis || {}).map(([phase, stats]: [string, any]) => ({
      phase: getLunarPhaseName(phase),
      avgWeight: Math.round(stats.avgWeight * 100) / 100,
      count: stats.count,
      successRate: Math.round(stats.successRate)
    }));

    return (
      <div className="space-y-6">
        {/* Общая статистика */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.totalRecords || 0}</div>
              <div className="text-sm text-gray-600">Записей об уловах</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{summary.averageWeight || 0}кг</div>
              <div className="text-sm text-gray-600">Средний улов</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{summary.successRate || 0}%</div>
              <div className="text-sm text-gray-600">Успешность</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{summary.totalWeight || 0}кг</div>
              <div className="text-sm text-gray-600">Общий вес</div>
            </CardContent>
          </Card>
        </div>

        {/* График по лунным фазам */}
        {lunarPhaseData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Улов по лунным фазам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lunarPhaseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="phase" 
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        `${value}${name === 'avgWeight' ? 'кг' : name === 'successRate' ? '%' : ''}`, 
                        name === 'avgWeight' ? 'Средний вес' : name === 'successRate' ? 'Успешность' : 'Количество'
                      ]}
                    />
                    <Bar dataKey="avgWeight" fill="#8884d8" name="avgWeight" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {summary.bestLunarPhase && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm">
                    <strong>Лучшая лунная фаза:</strong> {getLunarPhaseName(summary.bestLunarPhase.phase)} 
                    ({summary.bestLunarPhase.avgWeight}кг средний улов, {summary.bestLunarPhase.successRate}% успех)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderDetailedAnalysis = () => {
    if (!data?.data) return null;

    const detailed = data.data;
    
    const monthlyData = Object.entries(detailed.monthlyBreakdown || {}).map(([month, stats]: [string, any]) => ({
      month: getMonthName(parseInt(month)),
      avgWeight: Math.round(stats.avgWeight * 100) / 100,
      count: stats.count
    }));

    const topCatches = detailed.topCatches || [];

    return (
      <div className="space-y-6">
        {/* Месячная статистика */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Уловы по месяцам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value, name) => [`${value}кг`, 'Средний вес']} />
                    <Line 
                      type="monotone" 
                      dataKey="avgWeight" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Топ уловы */}
        {topCatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Лучшие уловы</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCatches.slice(0, 5).map((catch_: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{new Date(catch_.date).toLocaleDateString('ru')}</p>
                      <p className="text-sm text-gray-600">
                        {catch_.lunarPhase ? getLunarPhaseName(catch_.lunarPhase) : 'Неизвестная фаза'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">{catch_.weight}кг</p>
                      <p className="text-sm text-gray-600">{catch_.count} рыб</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCorrelationsAnalysis = () => {
    if (!data?.data) return null;

    const correlations = data.data;
    const lunarCorrelation = correlations.lunarPhaseCorrelation || {};
    const seasonalCorrelation = correlations.seasonalCorrelation || {};

    const lunarData = Object.entries(lunarCorrelation).map(([phase, stats]: [string, any]) => ({
      name: getLunarPhaseName(phase),
      value: Math.round(stats.avgWeight * 100) / 100,
      count: stats.total
    }));

    const seasonalData = Object.entries(seasonalCorrelation).map(([season, stats]: [string, any]) => ({
      name: season,
      value: Math.round(stats.avgWeight * 100) / 100,
      count: stats.total
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Лунные корреляции */}
          {lunarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Корреляция с лунными фазами</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={lunarData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}кг`}
                      >
                        {lunarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}кг`, 'Средний улов']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Сезонные корреляции */}
          {seasonalData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Сезонные корреляции</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={seasonalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => [`${value}кг`, 'Средний улов']} />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Инсайты */}
        {correlations.insights && correlations.insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>💡 Выводы</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {correlations.insights.map((insight: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-500 mr-2">•</span>
                    <span className="text-sm">{insight}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderTrendsAnalysis = () => {
    if (!data?.data) return null;

    const trends = data.data;
    const trendsData = trends.trends || [];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Тренды по периодам ({trends.groupBy})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'avgWeight' ? `${value}кг` : name === 'successRate' ? `${value}%` : value,
                      name === 'avgWeight' ? 'Средний улов' : name === 'successRate' ? 'Успешность' : 'Количество записей'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgWeight" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="avgWeight"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="successRate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Сводка трендов */}
        {trends.summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trends.summary.bestPeriod && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🏆 Лучший период</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{trends.summary.bestPeriod.period}</p>
                  <p className="text-sm text-gray-600">
                    Средний улов: {trends.summary.bestPeriod.avgWeight}кг
                  </p>
                  <p className="text-sm text-gray-600">
                    Успешность: {Math.round(trends.summary.bestPeriod.successRate)}%
                  </p>
                </CardContent>
              </Card>
            )}

            {trends.summary.mostActivePeriod && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">📈 Самый активный период</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{trends.summary.mostActivePeriod.period}</p>
                  <p className="text-sm text-gray-600">
                    Записей: {trends.summary.mostActivePeriod.recordCount}
                  </p>
                  <p className="text-sm text-gray-600">
                    Общий улов: {Math.round(trends.summary.mostActivePeriod.totalWeight)}кг
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const getLunarPhaseName = (phase: string): string => {
    const names: Record<string, string> = {
      NEW_MOON: 'Новолуние',
      WAXING_CRESCENT: 'Растущий месяц',
      FIRST_QUARTER: 'Первая четверть',
      WAXING_GIBBOUS: 'Растущая луна',
      FULL_MOON: 'Полнолуние',
      WANING_GIBBOUS: 'Убывающая луна',
      LAST_QUARTER: 'Последняя четверть',
      WANING_CRESCENT: 'Убывающий месяц'
    };
    return names[phase] || phase;
  };

  const getMonthName = (month: number): string => {
    const names = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return names[month] || `${month + 1}`;
  };

  if (loading) {
    return (
      <Card className={cn("w-full h-96 flex items-center justify-center", className)}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Анализ исторических данных...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full p-6", className)}>
        <div className="text-center">
          <p className="text-red-600 mb-4">❌ {error}</p>
          <Button onClick={loadHistoricalData} variant="outline">
            Попробовать снова
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Заголовок и настройки */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <span>Исторические данные и аналитика</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                📍 {location.name} • Записей: {data?.metadata.totalRecords || 0}
              </p>
            </div>
            <Badge variant="outline">
              Последнее обновление: {data?.metadata.calculatedAt ? new Date(data.metadata.calculatedAt).toLocaleTimeString('ru') : 'Не определено'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Select value={analysisType} onValueChange={(value) => setAnalysisType(value as any)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Тип анализа" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">📊 Сводка</SelectItem>
                <SelectItem value="detailed">📈 Детализация</SelectItem>
                <SelectItem value="correlations">🔗 Корреляции</SelectItem>
                <SelectItem value="trends">📉 Тренды</SelectItem>
              </SelectContent>
            </Select>

            {analysisType === 'trends' && (
              <Select value={groupBy} onValueChange={(value) => setGroupBy(value as any)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Группировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По датам</SelectItem>
                  <SelectItem value="month">По месяцам</SelectItem>
                  <SelectItem value="season">По сезонам</SelectItem>
                  <SelectItem value="lunar_phase">По лунным фазам</SelectItem>
                  <SelectItem value="species">По видам</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button onClick={loadHistoricalData} variant="outline" size="sm">
              Обновить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Основной контент */}
      {analysisType === 'summary' && renderSummaryAnalysis()}
      {analysisType === 'detailed' && renderDetailedAnalysis()}
      {analysisType === 'correlations' && renderCorrelationsAnalysis()}
      {analysisType === 'trends' && renderTrendsAnalysis()}
    </div>
  );
}

export default HistoricalDataChart;
