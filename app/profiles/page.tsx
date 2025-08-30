'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Trophy, 
  User, 
  Users,
  Medal,
  MapPin,
  Filter,
  RefreshCw,
  Plus,
  Star,
  Award
} from 'lucide-react';

// 🎯 Компоненты системы репутации
import ReputationCard from '@/components/reputation/ReputationCard';
import RateUserDialog from '@/components/reputation/RateUserDialog';

// Temporary interfaces for profile system
interface LeaderboardPlayer {
  userId: string;
  position: number;
  name: string;
  avatar?: string;
  rating: number;
  level: number;
  completedTrips: number;
  totalFishCaught: number;
  achievementsCount: number;
}

interface ProfileData {
  userId: string;
  user?: {
    id: string;
    name?: string;
    image?: string;
  };
  rating: number | string;
  level: number;
  completedTrips: number;
  experienceLevel?: string;
  country?: string;
  city?: string;
  bio?: string;
}

interface AchievementData {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
  progressPercent?: number;
}
// Temporarily comment out problematic components
// import { FisherProfileCard } from '@/components/profile/FisherProfileCard';
import { AchievementsGrid } from '@/components/profile/AchievementsGrid';
import { LeaderboardTable } from '@/components/profile/LeaderboardTable';
import { 
  FisherProfileExtended,
  AchievementWithProgress,
  LeaderboardPlayer,
  FetchUserAchievementsResponse,
  FetchLeaderboardResponse
} from '@/lib/types/achievements';

export default function ProfilesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('leaderboard');
  
  // Состояние для рейтинга
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [orderBy] = useState<'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount'>('rating');
  
  // Состояние для профилей
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState<string>('ALL');
  const [experienceFilter, setExperienceFilter] = useState<string>('ALL');
  
  // Состояние для достижений текущего пользователя
  const [userAchievements, setUserAchievements] = useState<AchievementData[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<ProfileData | null>(null);

  // Загрузка рейтинга
  useEffect(() => {
    const loadData = async () => {
      setLeaderboardLoading(true);
      try {
        const response = await fetch(`/api/leaderboard?orderBy=${orderBy}&limit=50`);
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data.players || []);
        } else {
          console.error('Failed to load leaderboard');
          setLeaderboard([]);
        }
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        setLeaderboard([]);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    loadData();
  }, [orderBy]);

  // Загрузка достижений пользователя
  useEffect(() => {
    const loadUserData = async () => {
      if (!session?.user?.id || activeTab !== 'achievements') return;
      
      setAchievementsLoading(true);
      try {
        // Загружаем достижения
        const achievementsResponse = await fetch(`/api/achievements?userId=${session.user.id}`);
        if (achievementsResponse.ok) {
          const achievementsData = await achievementsResponse.json();
          setUserAchievements(achievementsData.achievements || []);
        } else {
          console.error('Failed to load user achievements');
          setUserAchievements([]);
        }

        // Загружаем профиль
        const profileResponse = await fetch(`/api/profiles?userId=${session.user.id}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUserProfile(profileData);
        } else if (profileResponse.status === 404) {
          setUserProfile(null);
        } else {
          console.error('Failed to load user profile');
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        setUserAchievements([]);
        setUserProfile(null);
      } finally {
        setAchievementsLoading(false);
      }
    };
    
    loadUserData();
  }, [session?.user?.id, activeTab]);



  const loadProfiles = async () => {
    setProfilesLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '20',
        orderBy: 'rating',
      });
      
      if (countryFilter && countryFilter !== 'ALL') {
        params.append('country', countryFilter);
      }
      
      if (experienceFilter && experienceFilter !== 'ALL') {
        params.append('experienceLevel', experienceFilter);
      }

      const response = await fetch(`/api/profiles?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to load profiles');
        setProfiles([]);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      setProfiles([]);
    } finally {
      setProfilesLoading(false);
    }
  };



  // Фильтрация профилей по поисковому запросу
  const filteredProfiles = profiles.filter(profile => {
    // Поиск по тексту
    const matchesSearch = !searchQuery || 
      profile.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.country?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Фильтр по стране
    const matchesCountry = countryFilter === 'ALL' || 
      profile.country === countryFilter;
    
    // Фильтр по опыту
    const matchesExperience = experienceFilter === 'ALL' || 
      profile.experienceLevel === experienceFilter;
    
    return matchesSearch && matchesCountry && matchesExperience;
  });

  const handleViewProfile = (userId: string) => {
    // Перенаправляем на страницу профиля пользователя
    router.push(`/profiles/${userId}`);
  };

  const handleCreateProfile = async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          bio: '',
          specialties: [],
        }),
      });

      if (response.ok) {
        await loadUserProfile();
        // Также инициализируем достижения
        await fetch('/api/achievements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session.user.id,
          }),
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Сообщество рыболовов</h1>
        <p className="text-muted-foreground">
          Рейтинги, достижения и профили участников сообщества
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="leaderboard" className="gap-2">
            <Trophy className="w-4 h-4" />
            Рейтинг
          </TabsTrigger>
          <TabsTrigger value="profiles" className="gap-2">
            <Users className="w-4 h-4" />
            Профили
          </TabsTrigger>
          <TabsTrigger value="reputation" className="gap-2">
            <Star className="w-4 h-4" />
            Репутация
          </TabsTrigger>
          <TabsTrigger value="achievements" className="gap-2">
            <Medal className="w-4 h-4" />
            Мои достижения
          </TabsTrigger>
        </TabsList>

        {/* Рейтинг игроков */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Рейтинг рыболовов
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Загрузка рейтинга...</span>
                </div>
              ) : leaderboard.length > 0 ? (
                <div className="space-y-3">
                  {leaderboard.slice(0, 10).map((player) => (
                    <div
                      key={player.userId}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {player.position}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Уровень {player.level} • {player.completedTrips} поездок
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{player.rating.toFixed(1)} ★</div>
                        <div className="text-sm text-muted-foreground">
                          {player.totalFishCaught} кг
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Рейтинг пока пуст</h3>
                  <p className="text-muted-foreground">
                    Станьте первым рыболовом в рейтинге!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Профили рыболовов */}
        <TabsContent value="profiles" className="space-y-6">
          {/* Фильтры и поиск */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Поиск и фильтры
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                {/* Поиск */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Поиск по имени, биографии или локации..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Фильтр по стране */}
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Страна" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Все страны</SelectItem>
                    <SelectItem value="Portugal">Португалия</SelectItem>
                    <SelectItem value="Spain">Испания</SelectItem>
                    <SelectItem value="France">Франция</SelectItem>
                    <SelectItem value="Italy">Италия</SelectItem>
                  </SelectContent>
                </Select>

                {/* Фильтр по опыту */}
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Уровень опыта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Любой уровень</SelectItem>
                    <SelectItem value="BEGINNER">Новичок</SelectItem>
                    <SelectItem value="INTERMEDIATE">Опытный</SelectItem>
                    <SelectItem value="EXPERT">Эксперт</SelectItem>
                  </SelectContent>
                </Select>

                {/* Кнопка поиска */}
                <Button onClick={loadProfiles} disabled={profilesLoading}>
                  {profilesLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {/* Активные фильтры */}
              {(countryFilter !== 'ALL' || experienceFilter !== 'ALL' || searchQuery) && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Активные фильтры:</span>
                  {searchQuery && (
                    <Badge variant="secondary" className="gap-1">
                      Поиск: {searchQuery}
                    </Badge>
                  )}
                  {countryFilter !== 'ALL' && (
                    <Badge variant="secondary" className="gap-1">
                      <MapPin className="w-3 h-3" />
                      {countryFilter}
                    </Badge>
                  )}
                  {experienceFilter !== 'ALL' && (
                    <Badge variant="secondary">
                      {experienceFilter}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setCountryFilter('ALL');
                      setExperienceFilter('ALL');
                    }}
                  >
                    Очистить
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Сетка профилей */}
          <Card>
            <CardHeader>
              <CardTitle>Профили рыболовов</CardTitle>
            </CardHeader>
            <CardContent>
              {profilesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Загрузка профилей...</span>
                </div>
              ) : filteredProfiles.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProfiles.map((profile) => (
                    <Card 
                      key={profile.userId}
                      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                      onClick={() => handleViewProfile(profile.userId)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold">
                            {profile.user?.name?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{profile.user?.name || 'Неизвестный пользователь'}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {profile.city && profile.country ? `${profile.city}, ${profile.country}` : 
                               profile.country ? profile.country : 
                               'Локация не указана'}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Рейтинг:</span>
                            <span className="font-medium">{Number(profile.rating).toFixed(1)} ★</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Уровень:</span>
                            <span className="font-medium">{profile.level}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Поездок:</span>
                            <span className="font-medium">{profile.completedTrips}</span>
                          </div>
                          {profile.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                              {profile.bio}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Профили не найдены</h3>
                  <p className="text-muted-foreground">
                    {profiles.length === 0 
                      ? 'Пока никто не создал профиль рыболова'
                      : 'По вашим критериям поиска ничего не найдено'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>


        </TabsContent>

        {/* 🎯 Система репутации */}
        <TabsContent value="reputation" className="space-y-6">
          {!session ? (
            <Card>
              <CardContent className="text-center py-12">
                <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Система репутации рыболова</h3>
                <p className="text-muted-foreground mb-4">
                  Войдите в систему, чтобы увидеть систему репутации и оценки участников
                </p>
                <Button>Войти</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Поиск пользователя для просмотра репутации */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Поиск участника
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Введите имя пользователя для просмотра репутации..."
                        className="pl-10"
                      />
                    </div>
                    <Button>Найти</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Пример карточки репутации (можно показать свою или найденного пользователя) */}
              <div className="text-center py-8">
                <Star className="w-16 h-16 mx-auto mb-4 text-orange-500" />
                <h3 className="text-lg font-medium mb-2">Система репутации в разработке</h3>
                <p className="text-muted-foreground mb-4">
                  Здесь будут отображаться детальные рейтинги и система оценок участников
                </p>
                <div className="flex justify-center gap-2">
                  <Badge className="bg-orange-100 text-orange-800">Наставничество</Badge>
                  <Badge className="bg-blue-100 text-blue-800">Командная работа</Badge>
                  <Badge className="bg-green-100 text-green-800">Надежность</Badge>
                  <Badge className="bg-red-100 text-red-800">Соблюдение правил</Badge>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Достижения пользователя */}
        <TabsContent value="achievements" className="space-y-6">
          {!session ? (
            <Card>
              <CardContent className="text-center py-12">
                <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Войдите в систему</h3>
                <p className="text-muted-foreground">
                  Для просмотра достижений необходимо войти в систему
                </p>
              </CardContent>
            </Card>
          ) : !userProfile ? (
            <Card>
              <CardContent className="text-center py-12">
                <Plus className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">Создайте профиль рыболова</h3>
                <p className="text-muted-foreground mb-4">
                  Для отслеживания достижений создайте профиль рыболова
                </p>
                <Button onClick={handleCreateProfile}>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать профиль
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Профиль пользователя */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Мой профиль рыболова
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {userProfile ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                          {userProfile.user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold">{userProfile.user?.name}</h3>
                          <p className="text-muted-foreground">{userProfile.experienceLevel}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>★ {Number(userProfile.rating).toFixed(1)}</span>
                            <span>Уровень {userProfile.level}</span>
                            <span>{userProfile.completedTrips} поездок</span>
                          </div>
                        </div>
                      </div>
                      {userProfile.bio && (
                        <p className="text-muted-foreground">{userProfile.bio}</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Профиль не найден</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Достижения пользователя */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-yellow-500" />
                    Мои достижения
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {achievementsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-muted-foreground">Загрузка достижений...</span>
                    </div>
                  ) : userAchievements.length > 0 ? (
                    <div className="space-y-3">
                      {userAchievements.slice(0, 10).map((achievement) => (
                        <div
                          key={achievement.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            achievement.unlocked 
                              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                              : 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
                          }`}
                        >
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-1">
                            <div className="font-medium">{achievement.name}</div>
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Прогресс: {achievement.progress}/{achievement.maxProgress} ({achievement.progressPercent?.toFixed(1)}%)
                            </div>
                          </div>
                          {achievement.unlocked && (
                            <Badge variant="secondary" className="text-green-700 bg-green-100">
                              Получено
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Medal className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium mb-2">Достижений пока нет</h3>
                      <p className="text-muted-foreground">
                        Участвуйте в мероприятиях, чтобы получить первые достижения!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
