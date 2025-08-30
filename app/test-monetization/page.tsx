'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Euro, BookOpen, Megaphone, TrendingUp, Users, Crown, Target } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface Subscription {
  id: string;
  tier: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

interface Payment {
  id: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  commissionAmount?: number;
  commissionRate?: number;
  description?: string;
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
  category: string;
  price: number;
  difficulty: string;
  published: boolean;
  enrollmentCount: number;
}

const PRICING_INFO = {
  CAPTAIN_PREMIUM: {
    price: '€50',
    period: '/месяц',
    features: [
      'Приоритет в бронировании',
      'Расширенная аналитика',
      'Пониженная комиссия (15% вместо 20%)',
      'Премиум фильтры поиска',
      'Доступ к сертификационным курсам'
    ]
  },
  COMMISSION_RATES: {
    FREE: '20%',
    PREMIUM: '15%'
  }
};

export default function MonetizationTestPage() {
  const { data: session } = useSession();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string>('');

  // Данные для тестовых платежей
  const [testPayment, setTestPayment] = useState({
    type: 'TOUR_BOOKING',
    amount: 9500, // €95.00 в центах
    description: 'Test tour booking payment',
    tripId: ''
  });

  // Данные для тестового курса
  const [testCourse, setTestCourse] = useState({
    title: 'Основы морской рыбалки',
    description: 'Изучите основные техники и безопасность морской рыбалки',
    category: 'BASIC_FISHING',
    price: 49.99,
    duration: 120,
    difficulty: 'BEGINNER'
  });

  // Загрузка данных
  useEffect(() => {
    if (session) {
      loadSubscriptions();
      loadPayments();
      loadCourses();
    }
  }, [session]);

  const loadSubscriptions = async () => {
    try {
      setLoading(prev => ({ ...prev, subscriptions: true }));
      const response = await fetch('/api/subscriptions');
      const data = await response.json();
      
      if (data.success) {
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(prev => ({ ...prev, subscriptions: false }));
    }
  };

  const loadPayments = async () => {
    try {
      setLoading(prev => ({ ...prev, payments: true }));
      const response = await fetch('/api/payments?limit=20');
      const data = await response.json();
      
      if (data.success) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(prev => ({ ...prev, payments: false }));
    }
  };

  const loadCourses = async () => {
    try {
      setLoading(prev => ({ ...prev, courses: true }));
      const response = await fetch('/api/courses');
      const data = await response.json();
      
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(prev => ({ ...prev, courses: false }));
    }
  };

  const createSubscription = async () => {
    try {
      setLoading(prev => ({ ...prev, subscription: true }));
      setError('');

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: 'CAPTAIN_PREMIUM',
          priceId: 'price_1S0sGVFwX7vboUlLvRXgNxmr' // Real Stripe Price ID
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadSubscriptions();
        alert('✅ Подписка капитана создана! ID: ' + data.subscription.id);
      } else {
        setError('Ошибка создания подписки: ' + data.error);
      }
    } catch (error) {
      setError('Ошибка сети: ' + error);
    } finally {
      setLoading(prev => ({ ...prev, subscription: false }));
    }
  };

  const createPayment = async () => {
    try {
      setLoading(prev => ({ ...prev, payment: true }));
      setError('');

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayment)
      });

      const data = await response.json();
      
      if (data.success) {
        await loadPayments();
        alert(`✅ Платеж создан! Комиссия: €${(data.payment.commissionAmount || 0) / 100} (${data.payment.commissionRate * 100}%)`);
      } else {
        setError('Ошибка создания платежа: ' + data.error);
      }
    } catch (error) {
      setError('Ошибка сети: ' + error);
    } finally {
      setLoading(prev => ({ ...prev, payment: false }));
    }
  };

  const createCourse = async () => {
    try {
      setLoading(prev => ({ ...prev, course: true }));
      setError('');

      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCourse)
      });

      const data = await response.json();
      
      if (data.success) {
        await loadCourses();
        alert('✅ Курс создан! ID: ' + data.course.id);
      } else {
        setError('Ошибка создания курса: ' + data.error);
      }
    } catch (error) {
      setError('Ошибка сети: ' + error);
    } finally {
      setLoading(prev => ({ ...prev, course: false }));
    }
  };

  const formatPrice = (amount: number, currency: string = 'EUR') => {
    return `€${(amount / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string, type: 'payment' | 'subscription' = 'payment') => {
    const variants: Record<string, any> = {
      // Payment statuses
      PENDING: { variant: 'secondary', label: 'Ожидает' },
      SUCCEEDED: { variant: 'default', label: 'Успешно' },
      FAILED: { variant: 'destructive', label: 'Ошибка' },
      CANCELED: { variant: 'outline', label: 'Отменен' },
      REFUNDED: { variant: 'outline', label: 'Возврат' },
      
      // Subscription statuses
      ACTIVE: { variant: 'default', label: 'Активна' },
      INACTIVE: { variant: 'secondary', label: 'Неактивна' },
      PAST_DUE: { variant: 'destructive', label: 'Просрочена' },
      CANCELED: { variant: 'outline', label: 'Отменена' },
      UNPAID: { variant: 'destructive', label: 'Не оплачена' }
    };

    const config = variants[status] || { variant: 'secondary', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Тест монетизации
            </CardTitle>
            <CardDescription>
              Войдите в систему для тестирования функций монетизации
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Заголовок */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <CreditCard className="h-8 w-8" />
          Система монетизации
        </h1>
        <p className="text-muted-foreground">
          Тестирование системы подписок, платежей и курсов для Cascais Fishing
        </p>
      </div>

      {/* Модель монетизации */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Модель доходов согласно ТЗ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Euro className="h-4 w-4" />
                Комиссии с туров
              </h4>
              <p className="text-sm text-muted-foreground">
                15-20% с коммерческих туров
              </p>
              <div className="space-y-1 text-xs">
                <div>Бесплатно: {PRICING_INFO.COMMISSION_RATES.FREE}</div>
                <div>Premium: {PRICING_INFO.COMMISSION_RATES.PREMIUM}</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Premium подписка
              </h4>
              <p className="text-sm text-muted-foreground">
                €50/месяц для капитанов
              </p>
              <div className="text-xs text-muted-foreground">
                Расширенные возможности
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Реклама в ленте
              </h4>
              <p className="text-sm text-muted-foreground">
                Снастей и оборудования
              </p>
              <div className="text-xs text-muted-foreground">
                Таргетированная реклама
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Сертификационные курсы
              </h4>
              <p className="text-sm text-muted-foreground">
                Онлайн обучение
              </p>
              <div className="text-xs text-muted-foreground">
                Различные категории
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-red-700 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="subscriptions">Подписки</TabsTrigger>
          <TabsTrigger value="payments">Платежи</TabsTrigger>
          <TabsTrigger value="courses">Курсы</TabsTrigger>
          <TabsTrigger value="testing">Тестирование</TabsTrigger>
        </TabsList>

        {/* Подписки */}
        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Подписки капитанов
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">У вас нет активных подписок</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Создайте подписку капитана для тестирования
                    </p>
                  </div>
                  <Button onClick={createSubscription} disabled={loading.subscription}>
                    {loading.subscription ? 'Создание...' : 'Создать подписку капитана (€50/мес)'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map(subscription => (
                    <Card key={subscription.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{subscription.tier}</Badge>
                              {getStatusBadge(subscription.status, 'subscription')}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ID: {subscription.id}
                            </p>
                            {subscription.currentPeriodStart && subscription.currentPeriodEnd && (
                              <p className="text-xs text-muted-foreground">
                                Период: {new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">€50.00</p>
                            <p className="text-xs text-muted-foreground">в месяц</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Платежи */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                История платежей
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Нет платежей</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map(payment => (
                    <Card key={payment.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{payment.type}</Badge>
                              {getStatusBadge(payment.status)}
                            </div>
                            <p className="text-sm font-medium">
                              {payment.description || 'Платеж без описания'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(payment.createdAt).toLocaleString()}
                            </p>
                            {payment.commissionAmount && (
                              <p className="text-xs text-blue-600">
                                Комиссия: {formatPrice(payment.commissionAmount)} ({(payment.commissionRate || 0) * 100}%)
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatPrice(payment.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {payment.currency}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Курсы */}
        <TabsContent value="courses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Сертификационные курсы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {courses.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Курсы не найдены</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {courses.map(course => (
                    <Card key={course.id}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{course.title}</h4>
                              <Badge variant={course.published ? "default" : "secondary"}>
                                {course.published ? "Опубликован" : "Черновик"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline">{course.category}</Badge>
                              <Badge variant="outline">{course.difficulty}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {course.enrollmentCount} записей
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {formatPrice(course.price)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Тестирование */}
        <TabsContent value="testing" className="space-y-4">
          <div className="grid gap-4">
            {/* Тест подписки */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Тест подписки капитана
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Premium подписка капитана</h4>
                  <div className="text-sm space-y-1">
                    <p>Цена: <strong>€50/месяц</strong></p>
                    <p>Функции:</p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      {PRICING_INFO.CAPTAIN_PREMIUM.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={createSubscription} 
                  disabled={loading.subscription}
                  className="w-full"
                >
                  {loading.subscription ? 'Создание...' : 'Создать подписку капитана'}
                </Button>
              </CardContent>
            </Card>

            {/* Тест платежа с комиссией */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Тест платежа с комиссией
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payment-type">Тип платежа</Label>
                    <Select 
                      value={testPayment.type} 
                      onValueChange={(value) => setTestPayment(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOUR_BOOKING">Бронирование тура</SelectItem>
                        <SelectItem value="COURSE_PURCHASE">Покупка курса</SelectItem>
                        <SelectItem value="ADVERTISING">Реклама</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">Сумма (центы)</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      value={testPayment.amount}
                      onChange={(e) => setTestPayment(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-description">Описание</Label>
                  <Input
                    id="payment-description"
                    value={testPayment.description}
                    onChange={(e) => setTestPayment(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="p-3 bg-muted rounded text-sm">
                  <p>Сумма: <strong>{formatPrice(testPayment.amount)}</strong></p>
                  <p>Комиссия (бесплатно): <strong>{formatPrice(Math.round(testPayment.amount * 0.20))}</strong> (20%)</p>
                  <p>Комиссия (premium): <strong>{formatPrice(Math.round(testPayment.amount * 0.15))}</strong> (15%)</p>
                </div>
                <Button 
                  onClick={createPayment} 
                  disabled={loading.payment}
                  className="w-full"
                >
                  {loading.payment ? 'Создание...' : 'Создать платеж'}
                </Button>
              </CardContent>
            </Card>

            {/* Тест курса */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Тест курса (только для админов)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-title">Название курса</Label>
                    <Input
                      id="course-title"
                      value={testCourse.title}
                      onChange={(e) => setTestCourse(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-category">Категория</Label>
                    <Select 
                      value={testCourse.category} 
                      onValueChange={(value) => setTestCourse(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASIC_FISHING">Основы рыбалки</SelectItem>
                        <SelectItem value="ADVANCED_TECHNIQUES">Продвинутые техники</SelectItem>
                        <SelectItem value="CAPTAIN_LICENSE">Лицензия капитана</SelectItem>
                        <SelectItem value="SAFETY">Безопасность</SelectItem>
                        <SelectItem value="EQUIPMENT">Снаряжение</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course-price">Цена (€)</Label>
                    <Input
                      id="course-price"
                      type="number"
                      step="0.01"
                      value={testCourse.price}
                      onChange={(e) => setTestCourse(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course-duration">Длительность (мин)</Label>
                    <Input
                      id="course-duration"
                      type="number"
                      value={testCourse.duration}
                      onChange={(e) => setTestCourse(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={createCourse} 
                  disabled={loading.course}
                  className="w-full"
                >
                  {loading.course ? 'Создание...' : 'Создать курс'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
