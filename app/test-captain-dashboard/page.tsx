'use client';

import React, { useState, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Ship, 
  Users, 
  Euro, 
  BarChart3,
  Cloud,
  Settings,
  RefreshCw,
  Shield,
  TrendingUp,
  Award,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Import captain dashboard components
import {
  ParticipantApprovalQueue,
  CaptainRevenueTracking,
  TripPerformanceAnalytics,
  WeatherIntegrationPlanning,
  type ParticipantApproval
} from '@/components/captain';

// Demo Page for Captain Dashboard Interface
// Part of Task 16: Captain Dashboard Interface

// Mock data for demo purposes
const generateMockApprovals = (): ParticipantApproval[] => {
  const mockData: ParticipantApproval[] = [];
  const names = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Ferreira', 'Carlos Oliveira'];
  const emails = ['joao@email.com', 'maria@email.com', 'pedro@email.com', 'ana@email.com', 'carlos@email.com'];
  const experiences = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;
  const riskLevels = ['low', 'medium', 'high'] as const;

  for (let i = 0; i < 8; i++) {
    const name = names[i % names.length];
    const email = emails[i % emails.length];
    const experience = experiences[Math.floor(Math.random() * experiences.length)];
    const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
    const rating = 3 + Math.random() * 2;
    const completedTrips = Math.floor(Math.random() * 20);
    const reliability = 70 + Math.random() * 30;

    mockData.push({
      id: `approval-${i}`,
      status: i < 4 ? 'PENDING' : i < 6 ? 'APPROVED' : 'REJECTED',
      appliedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      processedAt: i >= 4 ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      message: Math.random() < 0.5 ? 'Очень хочу поучаствовать в рыбалке. Имею опыт.' : undefined,
      rejectedReason: i >= 6 ? 'Недостаточный опыт для данной поездки' : undefined,
      score: Math.floor(Math.random() * 40) + 60,
      autoApprovalEligible: Math.random() < 0.3,
      riskLevel,
      participant: {
        id: `participant-${i}`,
        name: `${name} ${i + 1}`,
        email: `${i + 1}.${email}`,
        image: `https://avatar.vercel.sh/${name.replace(' ', '')}.png`,
        fisherProfile: {
          experience,
          rating,
          completedTrips,
          reliability,
          specialties: Math.random() < 0.6 ? ['Deep Sea', 'Trolling'] : undefined,
          lastActiveDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          averageResponseTime: Math.random() * 48,
          cancellationRate: Math.random() * 20
        }
      },
      trip: {
        id: `trip-${i}`,
        date: new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
        timeSlot: '08:00-12:00',
        maxParticipants: 8,
        minRequired: 4,
        status: 'OPEN',
        currentParticipants: Math.floor(Math.random() * 5) + 2,
        availableSpots: Math.floor(Math.random() * 4) + 1,
        pricePerPerson: 95,
        difficulty: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)] as any
      }
    });
  }

  return mockData;
};

export default function TestCaptainDashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [mockApprovals, setMockApprovals] = useState<ParticipantApproval[]>(generateMockApprovals());

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1);
    // Simulate API call delay
    setTimeout(() => {
      setMockApprovals(generateMockApprovals());
      setIsLoading(false);
      toast({
        title: 'Обновлено',
        description: 'Данные dashboard обновлены',
        variant: 'default'
      });
    }, 1000);
  };

  const handleApprovalAction = async (approvalId: string, action: 'APPROVED' | 'REJECTED', reason?: string) => {
    setMockApprovals(prev => prev.map(approval => 
      approval.id === approvalId 
        ? { 
            ...approval, 
            status: action, 
            processedAt: new Date().toISOString(),
            rejectedReason: reason 
          }
        : approval
    ));

    toast({
      title: action === 'APPROVED' ? 'Участник одобрен!' : 'Заявка отклонена',
      description: `Заявка ${approvalId} обработана`,
      variant: 'default'
    });
  };

  const handleBulkAction = async (approvalIds: string[], action: 'APPROVED' | 'REJECTED', reason?: string) => {
    setMockApprovals(prev => prev.map(approval => 
      approvalIds.includes(approval.id)
        ? { 
            ...approval, 
            status: action, 
            processedAt: new Date().toISOString(),
            rejectedReason: reason 
          }
        : approval
    ));

    toast({
      title: `${action === 'APPROVED' ? 'Заявки одобрены!' : 'Заявки отклонены!'}`,
      description: `Обработано ${approvalIds.length} заявок`,
      variant: 'default'
    });
  };

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">🚢 Captain Dashboard Demo</h1>
            <p className="text-muted-foreground">
              Task 16: Captain Dashboard Interface - Comprehensive captain management system
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Demo Environment
            </Badge>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Заявок на рассмотрении</p>
                <p className="text-2xl font-bold">
                  {mockApprovals.filter(a => a.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Euro className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Доход за месяц</p>
                <p className="text-2xl font-bold">€2,847</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Успешность поездок</p>
                <p className="text-2xl font-bold">92.3%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Award className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-sm text-muted-foreground">Средний рейтинг</p>
                <p className="text-2xl font-bold">4.7</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Ship className="h-4 w-4" />
            <span>Обзор</span>
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Участники</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center space-x-2">
            <Euro className="h-4 w-4" />
            <span>Доходы</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Аналитика</span>
          </TabsTrigger>
          <TabsTrigger value="weather" className="flex items-center space-x-2">
            <Cloud className="h-4 w-4" />
            <span>Погода</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <span>Task 16: Captain Dashboard Interface</span>
                </CardTitle>
                <CardDescription>
                  Specialized captain interface with comprehensive management tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">16.1: Participant Approval Management</span>
                    <Badge className="bg-green-100 text-green-800">✅ Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">16.2: Captain Revenue Tracking</span>
                    <Badge className="bg-green-100 text-green-800">✅ Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">16.3: Trip Performance Analytics</span>
                    <Badge className="bg-green-100 text-green-800">✅ Complete</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">16.4: Weather Integration Planning</span>
                    <Badge className="bg-green-100 text-green-800">✅ Complete</Badge>
                  </div>
                </div>
                <Separator />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Overall Progress</p>
                  <div className="text-2xl font-bold text-green-600">100%</div>
                </div>
              </CardContent>
            </Card>

            {/* Features Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Реализованные функции</CardTitle>
                <CardDescription>
                  Полнофункциональная система управления для капитана
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center space-x-3 p-2 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium">Управление участниками</p>
                      <p className="text-xs text-muted-foreground">Bulk operations, scoring, automation</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                    <Euro className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Отслеживание доходов</p>
                      <p className="text-xs text-muted-foreground">Revenue charts, payouts, tax reports</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2 bg-purple-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium">Аналитика поездок</p>
                      <p className="text-xs text-muted-foreground">Performance metrics, trends, insights</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-2 bg-amber-50 rounded-lg">
                    <Cloud className="h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-sm font-medium">Погодное планирование</p>
                      <p className="text-xs text-muted-foreground">Weather forecasts, trip assessment</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Быстрые действия</CardTitle>
              <CardDescription>
                Основные операции для эффективного управления
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setActiveTab('approvals')}
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm">Заявки ({mockApprovals.filter(a => a.status === 'PENDING').length})</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setActiveTab('revenue')}
                >
                  <Euro className="h-6 w-6" />
                  <span className="text-sm">Доходы</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setActiveTab('analytics')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span className="text-sm">Аналитика</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center space-y-2"
                  onClick={() => setActiveTab('weather')}
                >
                  <Cloud className="h-6 w-6" />
                  <span className="text-sm">Погода</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Система управления участниками</CardTitle>
              <CardDescription>
                Comprehensive participant approval system with advanced features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }>
                <ParticipantApprovalQueue
                  approvals={mockApprovals}
                  onApprovalAction={handleApprovalAction}
                  onBulkAction={handleBulkAction}
                  loading={isLoading}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Отслеживание доходов и комиссий</CardTitle>
              <CardDescription>
                Revenue tracking, payout schedules, and tax reporting features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }>
                <CaptainRevenueTracking
                  captainId="demo-captain-123"
                  key={refreshKey}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Аналитика эффективности поездок</CardTitle>
              <CardDescription>
                Trip performance analysis, success metrics, and competitive insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }>
                <TripPerformanceAnalytics
                  captainId="demo-captain-123"
                  key={refreshKey}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weather" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Планирование по погодным условиям</CardTitle>
              <CardDescription>
                Weather integration for optimal trip planning and safety assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }>
                <WeatherIntegrationPlanning
                  captainId="demo-captain-123"
                  key={refreshKey}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feature Showcase */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>💡 Ключевые возможности Captain Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-blue-600">🎯 Участники и Заявки</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Bulk approval/rejection operations</li>
                <li>• Participant scoring system (0-100)</li>
                <li>• Automated approval rules</li>
                <li>• Advanced filtering and sorting</li>
                <li>• Risk assessment indicators</li>
                <li>• Participant history tracking</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-green-600">💰 Доходы и Финансы</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Revenue tracking with charts</li>
                <li>• Payout schedules and history</li>
                <li>• Commission breakdown analysis</li>
                <li>• Tax reporting features</li>
                <li>• Financial projections</li>
                <li>• Export capabilities (PDF, Excel)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-purple-600">📊 Аналитика и Метрики</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Trip success rate analysis</li>
                <li>• Customer satisfaction tracking</li>
                <li>• Seasonal performance patterns</li>
                <li>• Weather impact correlation</li>
                <li>• Competitive benchmarking</li>
                <li>• Location effectiveness analysis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3 text-amber-600">🌤️ Погода и Планирование</h4>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• 7-day weather forecasting</li>
                <li>• Trip safety assessment (0-100)</li>
                <li>• Alternative time/location suggestions</li>
                <li>• Marine condition monitoring</li>
                <li>• Weather-based recommendations</li>
                <li>• Real-time condition updates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
