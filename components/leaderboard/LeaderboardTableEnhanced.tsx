'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Medal,
  Star,
  Fish,
  Target,
  Users,
  Crown,
  ChevronUp,
  ChevronDown,
  User,
  BarChart3,
  Eye,
  Sparkles
} from 'lucide-react';
import { EnhancedPositionHighlighting } from './EnhancedPositionHighlighting';
import { PositionHistoryGraph } from './PositionHistoryGraph';
import { useEnhancedLeaderboard } from '@/hooks/useEnhancedLeaderboard';
import { LeaderboardPlayer } from '@/lib/types/achievements';

interface LeaderboardTableEnhancedProps {
  players?: LeaderboardPlayer[];
  currentUserId?: string;
  orderBy?: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount';
  onOrderByChange?: (orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount') => void;
  loading?: boolean;
  showPlayerRating?: boolean;
  onViewProfile?: (userId: string) => void;
  // Enhanced features
  enableEnhancedFeatures?: boolean;
  showPositionHistory?: boolean;
  enablePositionTracking?: boolean;
  refreshInterval?: number;
}

export function LeaderboardTableEnhanced({
  players: initialPlayers,
  currentUserId,
  orderBy: initialOrderBy = 'rating',
  onOrderByChange,
  loading: initialLoading = false,
  showPlayerRating = false,
  onViewProfile,
  enableEnhancedFeatures = true,
  showPositionHistory = true,
  enablePositionTracking = true,
  refreshInterval = 30000
}: LeaderboardTableEnhancedProps) {
  const [activeTab, setActiveTab] = useState('leaderboard');
  
  // Use enhanced hook if features are enabled, otherwise use provided data
  const enhancedData = useEnhancedLeaderboard({
    orderBy: initialOrderBy,
    enablePositionTracking,
    refreshInterval: enableEnhancedFeatures ? refreshInterval : 0
  });

  // Choose data source based on enhanced features
  const players = enableEnhancedFeatures ? enhancedData.players : (initialPlayers || []);
  const currentUser = enableEnhancedFeatures ? enhancedData.currentUser : players.find(p => p.userId === currentUserId);
  const isLoading = enableEnhancedFeatures ? enhancedData.isLoading : initialLoading;
  const orderBy = enableEnhancedFeatures ? initialOrderBy : initialOrderBy;
  
  const handleOrderByChange = (newOrderBy: string) => {
    if (enableEnhancedFeatures) {
      enhancedData.updateOrderBy(newOrderBy);
    }
    if (onOrderByChange) {
      onOrderByChange(newOrderBy as any);
    }
  };

  const currentUserPositionHistory = currentUser?.positionHistory || [];

  return (
    <div className="w-full space-y-6">
      {enableEnhancedFeatures ? (
        // Enhanced version with tabs
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Расширенный рейтинг рыболовов
                {enableEnhancedFeatures && (
                  <Sparkles className="w-4 h-4 text-purple-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={orderBy} onValueChange={handleOrderByChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Выберите сортировку" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        По рейтингу
                      </div>
                    </SelectItem>
                    <SelectItem value="level">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        По уровню
                      </div>
                    </SelectItem>
                    <SelectItem value="completedTrips">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        По поездкам
                      </div>
                    </SelectItem>
                    <SelectItem value="totalFishCaught">
                      <div className="flex items-center gap-2">
                        <Fish className="w-4 h-4" />
                        По улову
                      </div>
                    </SelectItem>
                    <SelectItem value="achievementsCount">
                      <div className="flex items-center gap-2">
                        <Medal className="w-4 h-4" />
                        По достижениям
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="leaderboard" className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Рейтинг
                </TabsTrigger>
                {showPositionHistory && currentUser && (
                  <TabsTrigger value="history" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    История позиций
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="leaderboard" className="mt-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <EnhancedPositionHighlighting
                    players={players}
                    currentUserId={currentUserId}
                    orderBy={orderBy}
                    onViewProfile={onViewProfile}
                  />
                )}
              </TabsContent>

              {showPositionHistory && currentUser && (
                <TabsContent value="history" className="mt-6">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <PositionHistoryGraph
                      userId={currentUser.userId}
                      userName={currentUser.name}
                      history={currentUserPositionHistory}
                      currentPosition={currentUser.position}
                      orderBy={orderBy}
                      timeRange="7d"
                      showMetrics={true}
                    />

                    <PositionHistoryGraph
                      userId={currentUser.userId}
                      userName={currentUser.name}
                      history={currentUserPositionHistory}
                      currentPosition={currentUser.position}
                      orderBy={orderBy}
                      timeRange="30d"
                      showMetrics={false}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        // Fallback to basic version
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Рейтинг рыболовов
              </CardTitle>
              <Select value={orderBy} onValueChange={handleOrderByChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Выберите сортировку" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" />
                      По рейтингу
                    </div>
                  </SelectItem>
                  <SelectItem value="level">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      По уровню
                    </div>
                  </SelectItem>
                  <SelectItem value="completedTrips">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      По поездкам
                    </div>
                  </SelectItem>
                  <SelectItem value="totalFishCaught">
                    <div className="flex items-center gap-2">
                      <Fish className="w-4 h-4" />
                      По улову
                    </div>
                  </SelectItem>
                  <SelectItem value="achievementsCount">
                    <div className="flex items-center gap-2">
                      <Medal className="w-4 h-4" />
                      По достижениям
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full w-8 h-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Current user stats */}
                {showPlayerRating && currentUser && (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                            {currentUser.level}
                          </div>
                        </div>

                        <div>
                          <p className="font-medium">Ваша позиция</p>
                          <p className="text-sm text-muted-foreground">{currentUser.name}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {currentUser.position <= 3 && <Trophy className="w-5 h-5 text-yellow-500" />}
                          <span className="text-2xl font-bold">#{currentUser.position}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {orderBy === 'rating' && `${currentUser.rating.toFixed(1)} звезд`}
                          {orderBy === 'level' && `Уровень ${currentUser.level}`}
                          {orderBy === 'completedTrips' && `${currentUser.completedTrips} поездок`}
                          {orderBy === 'totalFishCaught' && `${currentUser.totalFishCaught} рыб`}
                          {orderBy === 'achievementsCount' && `${currentUser.achievementsCount} достижений`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Simple players list */}
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <motion.div
                      key={player.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-muted/50 ${
                        player.userId === currentUserId ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                    >
                      {/* Position */}
                      <div className="w-8 flex justify-center">
                        {player.position <= 3 ? (
                          <div className="flex items-center justify-center w-6 h-6">
                            {player.position === 1 && <Crown className="w-5 h-5 text-yellow-500" />}
                            {player.position === 2 && <Trophy className="w-5 h-5 text-orange-500" />}
                            {player.position === 3 && <Medal className="w-5 h-5 text-amber-600" />}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            {player.position}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium truncate">{player.name}</h4>
                          {player.userId === currentUserId && (
                            <Badge variant="outline" className="text-xs">
                              Вы
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            <span>{player.rating.toFixed(1)}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Fish className="w-3 h-3" />
                            <span>{player.completedTrips}</span>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Medal className="w-3 h-3" />
                            <span>{player.achievementsCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* View Profile Button */}
                      {onViewProfile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewProfile(player.userId)}
                        >
                          Профиль
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
