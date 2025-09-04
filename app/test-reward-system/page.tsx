'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Gift,
  Sparkles,
  Settings,
  TestTube,
  Zap,
  Award,
  Target,
  Calendar
} from 'lucide-react';
import { RewardCard, RewardCardHorizontal } from '@/components/rewards/RewardCard';
import { RewardInventory } from '@/components/rewards/RewardInventory';
import { RewardCeremony } from '@/components/rewards/RewardCeremony';

// Mock data for testing
const MOCK_REWARDS = [
  {
    id: '1',
    name: 'Золотой Трофей Чемпиона',
    description: 'За первое место в соревновании по рыбной ловле',
    type: 'TROPHY' as const,
    tier: 'GOLD' as const,
    rarity: 'EPIC' as const,
    icon: '🏆',
    color: '#FFD700',
    reason: 'Победа в турнире "Cascais Masters 2024"',
    rank: 1,
    score: 2850,
    sourceType: 'COMPETITION',
    sourceName: 'Cascais Masters 2024'
  },
  {
    id: '2', 
    name: 'Серебряная Медаль',
    description: 'За второе место в соревновании',
    type: 'BADGE' as const,
    tier: 'SILVER' as const,
    rarity: 'RARE' as const,
    icon: '🥈',
    color: '#C0C0C0',
    reason: 'Второе место в региональном чемпионате',
    rank: 2,
    score: 2340,
    sourceType: 'COMPETITION',
    sourceName: 'Regional Championship'
  },
  {
    id: '3',
    name: 'Корона Мастера',
    description: 'За достижение высшего уровня мастерства',
    type: 'TITLE' as const,
    tier: 'LEGENDARY' as const,
    rarity: 'MYTHIC' as const,
    icon: '👑',
    color: '#9F4F96',
    reason: 'Достижение 100 уровня',
    sourceType: 'MILESTONE',
    sourceName: 'Level 100 Achievement'
  },
  {
    id: '4',
    name: 'Звезда Участника',
    description: 'За активное участие в мероприятиях',
    type: 'DECORATION' as const,
    tier: 'BRONZE' as const,
    rarity: 'COMMON' as const,
    icon: '⭐',
    color: '#CD7F32',
    reason: 'Участие в 10 соревнованиях',
    sourceType: 'MILESTONE',
    sourceName: 'Active Participant'
  }
];

export default function TestRewardSystemPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyRewards, setCeremonyRewards] = useState(MOCK_REWARDS);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(false);

  // Test functions
  const testCreateReward = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rewards?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test Reward ${Date.now()}`,
          description: 'Test reward created from UI',
          type: 'TROPHY',
          tier: 'GOLD',
          icon: '🎯',
          rarity: 'RARE',
        }),
      });

      if (!response.ok) throw new Error('Failed to create reward');
      
      const data = await response.json();
      toast({
        title: 'Успешно',
        description: 'Тестовая награда создана',
      });
      
    } catch (error) {
      console.error('Error creating reward:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать награду',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testDistributeReward = async () => {
    if (!session?.user?.id) {
      toast({
        title: 'Ошибка',
        description: 'Необходимо войти в систему',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      // First create a test reward
      const createResponse = await fetch('/api/rewards?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test Distribution ${Date.now()}`,
          description: 'Test reward for distribution',
          type: 'BADGE',
          tier: 'SILVER',
          icon: '🏅',
          rarity: 'UNCOMMON',
        }),
      });

      if (!createResponse.ok) throw new Error('Failed to create reward');
      
      const rewardData = await createResponse.json();
      
      // Then distribute it
      const distributeResponse = await fetch('/api/rewards?action=distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewardId: rewardData.reward.id,
          userId: session.user.id,
          sourceType: 'ADMIN_GRANT',
          reason: 'Test distribution from UI',
        }),
      });

      if (!distributeResponse.ok) throw new Error('Failed to distribute reward');
      
      toast({
        title: 'Успешно',
        description: 'Награда распределена и добавлена в инвентарь',
      });
      
    } catch (error) {
      console.error('Error distributing reward:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось распределить награду',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testAutoDistribute = async (eventType: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/rewards/auto-distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          dryRun: true, // Test run
        }),
      });

      if (!response.ok) throw new Error('Failed to auto-distribute');
      
      const data = await response.json();
      toast({
        title: 'Тест автораспределения',
        description: `${data.distributed} наград было бы распределено`,
      });
      
    } catch (error) {
      console.error('Error auto-distributing:', error);
      toast({
        title: 'Ошибка',
        description: 'Ошибка автораспределения',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const startTestCeremony = () => {
    setCeremonyRewards(MOCK_REWARDS);
    setShowCeremony(true);
  };

  const fetchRewards = async () => {
    try {
      const response = await fetch('/api/rewards');
      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards || []);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8"
        >
          <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-4">
            🏆 Система Наград - Тестирование
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Демонстрация полной системы распределения и управления наградами
          </p>
        </motion.div>

        <Tabs defaultValue="demo" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="demo">Демо</TabsTrigger>
            <TabsTrigger value="cards">Карточки</TabsTrigger>
            <TabsTrigger value="inventory">Инвентарь</TabsTrigger>
            <TabsTrigger value="admin">Админ</TabsTrigger>
            <TabsTrigger value="ceremony">Церемония</TabsTrigger>
          </TabsList>

          {/* Demo Tab */}
          <TabsContent value="demo">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Быстрые Действия
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={testCreateReward} 
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    Создать Тестовую Награду
                  </Button>
                  
                  <Button 
                    onClick={testDistributeReward} 
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Распределить Награду
                  </Button>
                  
                  <Button 
                    onClick={startTestCeremony}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Начать Церемонию
                  </Button>
                </CardContent>
              </Card>

              {/* Auto Distribution Tests */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="w-5 h-5" />
                    Автораспределение
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    onClick={() => testAutoDistribute('COMPETITION_END')} 
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Завершение Соревнования
                  </Button>
                  
                  <Button 
                    onClick={() => testAutoDistribute('SEASON_END')} 
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Завершение Сезона
                  </Button>
                  
                  <Button 
                    onClick={() => testAutoDistribute('MILESTONE_REACHED')} 
                    disabled={loading}
                    className="w-full"
                    variant="outline"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    Достижение Вехи
                  </Button>
                </CardContent>
              </Card>

              {/* System Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Статистика Системы
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Всего наград:</span>
                    <Badge variant="outline">{rewards.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Активных:</span>
                    <Badge variant="outline">
                      {rewards.filter((r: any) => r.isActive).length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Сессия:</span>
                    <Badge variant={session ? 'default' : 'destructive'}>
                      {session ? 'Авторизован' : 'Гость'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Cards Demo */}
          <TabsContent value="cards">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Демонстрация Карточек Наград</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {/* Grid View */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Сетка наград (разные размеры)</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {MOCK_REWARDS.map((reward, index) => (
                          <RewardCard
                            key={reward.id}
                            reward={reward}
                            size={index % 2 === 0 ? 'md' : 'lg'}
                            showDetails={true}
                            interactive={true}
                            onClick={(r) => toast({ title: 'Награда выбрана', description: r.name })}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Horizontal View */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Горизонтальный вид</h3>
                      <div className="space-y-3">
                        {MOCK_REWARDS.map((reward) => (
                          <RewardCardHorizontal
                            key={reward.id}
                            reward={reward}
                            showDetails={true}
                            interactive={true}
                            onClick={(r) => toast({ title: 'Награда выбрана', description: r.name })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <RewardInventory userId={session?.user?.id} />
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Администрирование Наград</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="font-semibold">Создание наград</h3>
                      <div className="space-y-2">
                        <Button onClick={testCreateReward} disabled={loading} className="w-full">
                          Создать Тестовую Награду
                        </Button>
                        <p className="text-sm text-gray-600">
                          Создает новую награду с случайными параметрами
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-semibold">Распределение</h3>
                      <div className="space-y-2">
                        <Select onValueChange={(value) => testAutoDistribute(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите событие" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COMPETITION_END">Завершение соревнования</SelectItem>
                            <SelectItem value="SEASON_END">Завершение сезона</SelectItem>
                            <SelectItem value="MILESTONE_REACHED">Достижение вехи</SelectItem>
                            <SelectItem value="ACHIEVEMENT_UNLOCKED">Разблокировка достижения</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-600">
                          Тестирует автоматическое распределение наград
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Rewards */}
                  <div>
                    <h3 className="font-semibold mb-4">Текущие награды в системе</h3>
                    <div className="max-h-64 overflow-y-auto">
                      {rewards.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Награды не найдены</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {rewards.slice(0, 12).map((reward: any) => (
                            <div key={reward.id} className="p-3 border rounded-lg">
                              <div className="font-medium text-sm truncate">{reward.name}</div>
                              <div className="text-xs text-gray-500 flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {reward.tier}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {reward.type}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Ceremony Tab */}
          <TabsContent value="ceremony">
            <Card>
              <CardHeader>
                <CardTitle>Тестирование Церемонии Награждения</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <p className="text-gray-600">
                    Демонстрация анимированной церемонии награждения с конфетти и звуковыми эффектами
                  </p>
                  
                  <div className="flex justify-center gap-4">
                    <Button onClick={startTestCeremony} size="lg">
                      <Sparkles className="w-5 h-5 mr-2" />
                      Начать Церемонию
                    </Button>
                  </div>
                </div>

                {/* Preview of ceremony rewards */}
                <div>
                  <h3 className="font-semibold mb-4 text-center">Награды для церемонии:</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {MOCK_REWARDS.map((reward) => (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        size="sm"
                        showDetails={false}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reward Ceremony Modal */}
        <RewardCeremony
          rewards={ceremonyRewards}
          isOpen={showCeremony}
          onClose={() => setShowCeremony(false)}
          onShare={(rewards) => {
            toast({
              title: 'Поделиться',
              description: `Поделились ${rewards.length} наградами`,
            });
          }}
          autoPlay={true}
          soundEnabled={true}
        />
      </div>
    </div>
  );
}
