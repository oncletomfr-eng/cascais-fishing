'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Fish, 
  Star, 
  Target, 
  Award,
  Users,
  Calendar,
  Clock,
  Euro,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MonthlyData {
  month: string;
  bookings: number;
  completed: number;
  cancelled: number;
  rating: number;
}

interface ProfileAnalytics {
  totalBookings: number;
  completedTrips: number;
  averageRating: number;
  reliability: number;
  totalSpent: number;
  favoriteTimeSlots: Array<{ timeSlot: string; count: number }>;
  monthlyTrends: MonthlyData[];
  achievements: {
    totalBadges: number;
    recentBadges: Array<{ name: string; earnedAt: string; icon: string }>;
  };
  socialStats: {
    reviewsGiven: number;
    reviewsReceived: number;
    helpfulVotes: number;
  };
  recommendations: string[];
}

interface ProfileAnalyticsDashboardProps {
  userId?: string;
  className?: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const timeSlotLabels: Record<string, string> = {
  'MORNING_9AM': 'Утро (9:00)',
  'AFTERNOON_2PM': 'День (14:00)', 
  'EVENING_6PM': 'Вечер (18:00)'
};

export function ProfileAnalyticsDashboard({ userId, className }: ProfileAnalyticsDashboardProps) {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [userId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`/api/profile-analytics?${params}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Network error loading analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Загрузка аналитики профиля...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <div className="text-red-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-2" />
            <p className="font-medium">Ошибка загрузки аналитики</p>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
          <Button onClick={loadAnalytics} variant="outline">
            Попробовать снова
          </Button>
        </div>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-400" />
          <p className="text-gray-600">Нет данных для отображения</p>
        </div>
      </Card>
    );
  }

  // Подготовка данных для графиков
  const timeSlotData = analytics.favoriteTimeSlots.map(slot => ({
    name: timeSlotLabels[slot.timeSlot] || slot.timeSlot,
    count: slot.count,
    percentage: Math.round((slot.count / analytics.totalBookings) * 100)
  }));

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Основные метрики */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Fish className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{analytics.totalBookings}</p>
                <p className="text-xs text-gray-600">Всего поездок</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</p>
                <p className="text-xs text-gray-600">Средний рейтинг</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">{analytics.reliability}%</p>
                <p className="text-xs text-gray-600">Надежность</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Euro className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold">€{analytics.totalSpent}</p>
                <p className="text-xs text-gray-600">Потрачено</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trends">Тренды</TabsTrigger>
          <TabsTrigger value="preferences">Предпочтения</TabsTrigger>
          <TabsTrigger value="achievements">Достижения</TabsTrigger>
          <TabsTrigger value="recommendations">Рекомендации</TabsTrigger>
        </TabsList>

        {/* Вкладка: Тренды */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Месячная активность
              </CardTitle>
              <CardDescription>
                История бронирований и рейтингов за последние 12 месяцев
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="bookings" 
                    stroke="#8884d8" 
                    name="Бронирования"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#82ca9d" 
                    name="Завершено"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rating" 
                    stroke="#ffc658" 
                    name="Рейтинг"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Предпочтения */}
        <TabsContent value="preferences" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Любимое время
                </CardTitle>
                <CardDescription>
                  Распределение бронирований по времени
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={timeSlotData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {timeSlotData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Социальная активность
                </CardTitle>
                <CardDescription>
                  Взаимодействие с сообществом
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Отзывы получено:</span>
                  <Badge variant="secondary">{analytics.socialStats.reviewsReceived}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Отзывы оставлено:</span>
                  <Badge variant="secondary">{analytics.socialStats.reviewsGiven}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Полезных голосов:</span>
                  <Badge variant="secondary">{analytics.socialStats.helpfulVotes}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Вкладка: Достижения */}
        <TabsContent value="achievements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                Достижения ({analytics.achievements.totalBadges})
              </CardTitle>
              <CardDescription>
                Последние полученные награды
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {analytics.achievements.recentBadges.map((badge, index) => (
                    <motion.div
                      key={badge.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 border rounded-lg bg-gradient-to-br from-yellow-50 to-orange-50"
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">{badge.icon}</div>
                        <h4 className="font-semibold">{badge.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(badge.earnedAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Рекомендации */}
        <TabsContent value="recommendations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Персональные рекомендации
              </CardTitle>
              <CardDescription>
                Советы для улучшения профиля и опыта
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.recommendations.map((recommendation, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded"
                  >
                    <p className="text-sm text-blue-800">{recommendation}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
