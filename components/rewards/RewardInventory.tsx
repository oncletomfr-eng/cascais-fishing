'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star, 
  Filter,
  Search,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  TrendingUp,
  Eye,
  EyeOff,
  Settings,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RewardCard, RewardCardHorizontal, type RewardData } from './RewardCard';

interface RewardInventoryStats {
  totalRewards: number;
  activeRewards: number;
  displayedRewards: number;
  byTier: Record<string, number>;
  byType: Record<string, number>;
  byRarity: Record<string, number>;
}

interface RewardInventoryData {
  inventory: Record<string, any[]>;
  rawInventory: any[];
  stats: RewardInventoryStats;
  total: number;
}

interface RewardInventoryProps {
  userId?: string;
  className?: string;
}

export const RewardInventory: React.FC<RewardInventoryProps> = ({
  userId,
  className = '',
}) => {
  const { toast } = useToast();
  
  // State
  const [data, setData] = useState<RewardInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'tier' | 'rarity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showStatsPanel, setShowStatsPanel] = useState(false);

  // Fetch inventory data
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (userId) params.set('userId', userId);
      if (filterTier !== 'all') params.set('rewardTier', filterTier);
      if (filterType !== 'all') params.set('rewardType', filterType);

      const response = await fetch(`/api/rewards/inventory?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      
      const inventoryData = await response.json();
      setData(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить инвентарь наград',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [userId, filterTier, filterType]);

  // Get filtered and sorted rewards
  const getFilteredRewards = () => {
    if (!data) return [];

    let rewards = data.rawInventory;

    // Apply category filter
    if (selectedCategory !== 'all') {
      rewards = rewards.filter(item => 
        (item.category || 'uncategorized') === selectedCategory
      );
    }

    // Apply search filter
    if (searchTerm) {
      rewards = rewards.filter(item =>
        item.reward.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reward.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort rewards
    rewards.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.obtainedAt).getTime() - new Date(b.obtainedAt).getTime();
          break;
        case 'name':
          comparison = a.reward.name.localeCompare(b.reward.name);
          break;
        case 'tier':
          const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'LEGENDARY'];
          comparison = tierOrder.indexOf(a.reward.tier) - tierOrder.indexOf(b.reward.tier);
          break;
        case 'rarity':
          const rarityOrder = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
          comparison = rarityOrder.indexOf(a.reward.rarity) - rarityOrder.indexOf(b.reward.rarity);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return rewards.map(item => ({
      ...item.reward,
      quantity: item.quantity,
      obtainedAt: item.obtainedAt,
      isDisplayed: item.isDisplayed,
      category: item.category,
    }));
  };

  // Toggle reward visibility
  const toggleRewardVisibility = async (inventoryId: string, currentlyDisplayed: boolean) => {
    try {
      const response = await fetch(`/api/rewards/inventory?id=${inventoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDisplayed: !currentlyDisplayed }),
      });

      if (!response.ok) throw new Error('Failed to update visibility');
      
      toast({
        title: 'Успешно',
        description: `Награда ${!currentlyDisplayed ? 'показана' : 'скрыта'} в профиле`,
      });
      
      fetchInventory(); // Refresh data
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить видимость награды',
        variant: 'destructive',
      });
    }
  };

  const categories = data ? Object.keys(data.inventory) : [];
  const filteredRewards = getFilteredRewards();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Загрузка инвентаря наград...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p>Не удалось загрузить инвентарь наград</p>
          <Button onClick={fetchInventory} className="mt-4">
            Попробовать снова
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Panel */}
      <AnimatePresence>
        {showStatsPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Статистика наград
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{data.stats.totalRewards}</div>
                    <div className="text-sm text-gray-600">Всего наград</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{data.stats.activeRewards}</div>
                    <div className="text-sm text-gray-600">Активных</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{data.stats.displayedRewards}</div>
                    <div className="text-sm text-gray-600">Показываются</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {Object.keys(data.stats.byTier).length}
                    </div>
                    <div className="text-sm text-gray-600">Уровней</div>
                  </div>
                </div>
                
                {/* Tier Distribution */}
                <div className="mt-4">
                  <h4 className="font-semibold mb-2">Распределение по уровням</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.stats.byTier).map(([tier, count]) => (
                      <Badge key={tier} variant="outline" className="text-sm">
                        {tier}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Inventory Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Инвентарь наград
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStatsPanel(!showStatsPanel)}
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Поиск наград..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'uncategorized' ? 'Без категории' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Tier Filter */}
            <Select value={filterTier} onValueChange={setFilterTier}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Уровень" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все уровни</SelectItem>
                <SelectItem value="BRONZE">Бронза</SelectItem>
                <SelectItem value="SILVER">Серебро</SelectItem>
                <SelectItem value="GOLD">Золото</SelectItem>
                <SelectItem value="PLATINUM">Платина</SelectItem>
                <SelectItem value="DIAMOND">Алмаз</SelectItem>
                <SelectItem value="LEGENDARY">Легендарный</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort */}
            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Дата</SelectItem>
                  <SelectItem value="name">Название</SelectItem>
                  <SelectItem value="tier">Уровень</SelectItem>
                  <SelectItem value="rarity">Редкость</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Rewards Display */}
          <ScrollArea className="h-[600px] pr-4">
            {filteredRewards.length === 0 ? (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Нет наград
                </h3>
                <p className="text-gray-500">
                  {searchTerm || selectedCategory !== 'all' || filterTier !== 'all' || filterType !== 'all'
                    ? 'По вашим критериям поиска награды не найдены'
                    : 'У вас пока нет наград. Участвуйте в соревнованиях, чтобы их получить!'
                  }
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredRewards.map((reward, index) => (
                  <motion.div
                    key={`${reward.id}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <RewardCard
                      reward={reward}
                      size="md"
                      showDetails={true}
                      showQuantity={true}
                      interactive={false}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRewards.map((reward, index) => (
                  <motion.div
                    key={`${reward.id}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                  >
                    <RewardCardHorizontal
                      reward={reward}
                      showDetails={true}
                      interactive={false}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RewardInventory;
