'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  Brain,
  CloudRain,
  Users,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Fish,
  Calendar,
  Star,
  Eye,
  MousePointer,
  BookOpen
} from 'lucide-react';

interface SmartRecommendation {
  id: string;
  type: 'HISTORY_BASED' | 'WEATHER_AI' | 'SOCIAL_CAPTAIN' | 'COLLABORATIVE';
  title: string;
  description: string;
  aiGeneratedText?: string;
  priority: number;
  relevanceScore: number;
  confidenceScore: number;
  impressions: number;
  clicks: number;
  conversions: number;
  recommendedTrip?: {
    id: string;
    title: string;
    date: string;
    captain?: {
      name: string;
      image?: string;
    };
    bookings: any[];
  };
  fromCaptain?: {
    name: string;
    image?: string;
  };
  recommendedSpecies: string[];
  recommendedTechniques: string[];
  validUntil?: string;
  createdAt: string;
}

interface WeatherRecommendation {
  recommendation: string;
  recommendedSpecies: string[];
  recommendedTechniques: string[];
  confidenceLevel: number;
  reasoning: string;
}

interface CaptainRecommendation {
  id: string;
  captainName: string;
  title: string;
  content: string;
  category: string;
  helpfulVotes: number;
}

interface SmartRecommendationsProps {
  userId?: string;
  currentWeather?: any;
  limit?: number;
}

export default function SmartRecommendations({ 
  userId, 
  currentWeather, 
  limit = 5 
}: SmartRecommendationsProps) {
  const { data: session } = useSession();
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [weatherRec, setWeatherRec] = useState<WeatherRecommendation | null>(null);
  const [captainRecs, setCaptainRecs] = useState<CaptainRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'weather' | 'history' | 'social'>('all');

  useEffect(() => {
    if (session?.user?.id) {
      loadRecommendations();
    }
  }, [session?.user?.id, activeTab]);

  const loadRecommendations = async () => {
    setLoading(true);
    
    try {
      // Загружаем основные рекомендации
      const response = await fetch(`/api/smart-recommendations?limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }

      // Загружаем рекомендации капитанов
      if (activeTab === 'social' || activeTab === 'all') {
        const captainResponse = await fetch('/api/captain-recommendations?limit=5');
        if (captainResponse.ok) {
          const captainData = await captainResponse.json();
          setCaptainRecs(captainData.recommendations || []);
        }
      }

      // Генерируем погодные рекомендации если есть погодные данные
      if ((activeTab === 'weather' || activeTab === 'all') && currentWeather) {
        const weatherResponse = await fetch('/api/smart-recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'weather_ai',
            weatherData: currentWeather,
          }),
        });
        
        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json();
          setWeatherRec(weatherData.result || null);
        }
      }

    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить рекомендации',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (recommendationId: string, interactionType: string) => {
    try {
      await fetch('/api/smart-recommendations/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId,
          interactionType,
          sessionId: session?.user?.id,
        }),
      });

      // Обновляем счетчики локально
      setRecommendations(prev =>
        prev.map(rec =>
          rec.id === recommendationId
            ? {
                ...rec,
                [interactionType === 'VIEW' ? 'impressions' : 
                 interactionType === 'CLICK' ? 'clicks' : 
                 interactionType === 'BOOK' ? 'conversions' : interactionType]: 
                 rec[interactionType === 'VIEW' ? 'impressions' : 
                    interactionType === 'CLICK' ? 'clicks' : 
                    interactionType === 'BOOK' ? 'conversions' : interactionType] + 1
              }
            : rec
        )
      );
    } catch (error) {
      console.error('Error recording interaction:', error);
    }
  };

  const handleCaptainVote = async (recommendationId: string, voteType: 'helpful' | 'not_helpful') => {
    try {
      const response = await fetch('/api/captain-recommendations/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, voteType }),
      });

      if (response.ok) {
        // Обновляем локальное состояние
        setCaptainRecs(prev =>
          prev.map(rec =>
            rec.id === recommendationId
              ? { ...rec, helpfulVotes: rec.helpfulVotes + (voteType === 'helpful' ? 1 : -1) }
              : rec
          )
        );

        toast({
          title: 'Спасибо!',
          description: `Ваш голос "${voteType === 'helpful' ? 'полезно' : 'не полезно'}" учтен`,
        });
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось записать ваш голос',
        variant: 'destructive',
      });
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'WEATHER_AI': return <CloudRain className="h-5 w-5 text-blue-500" />;
      case 'HISTORY_BASED': return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'SOCIAL_CAPTAIN': return <Users className="h-5 w-5 text-purple-500" />;
      default: return <Brain className="h-5 w-5 text-orange-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WEATHER_AI': return 'Погодный AI';
      case 'HISTORY_BASED': return 'На основе истории';
      case 'SOCIAL_CAPTAIN': return 'Совет капитана';
      case 'COLLABORATIVE': return 'Похожие пользователи';
      default: return 'Умная рекомендация';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center space-x-2">
        <Brain className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Умные рекомендации</h2>
        <Badge variant="secondary" className="ml-2">
          AI-Powered
        </Badge>
      </div>

      {/* Вкладки фильтров */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'Все рекомендации', icon: Brain },
          { key: 'weather', label: 'Погода', icon: CloudRain },
          { key: 'history', label: 'История', icon: TrendingUp },
          { key: 'social', label: 'Капитаны', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(key as any)}
            className="flex items-center space-x-1"
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Погодные рекомендации */}
      {(activeTab === 'all' || activeTab === 'weather') && weatherRec && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CloudRain className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Погодный AI рекомендует</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  Уверенность: {Math.round(weatherRec.confidenceLevel * 100)}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-base font-medium">{weatherRec.recommendation}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {weatherRec.recommendedSpecies.length > 0 && (
                <div>
                  <p className="font-semibold text-sm text-muted-foreground mb-2">Рекомендуемые виды:</p>
                  <div className="flex flex-wrap gap-1">
                    {weatherRec.recommendedSpecies.map(species => (
                      <Badge key={species} variant="outline" className="text-xs">
                        <Fish className="h-3 w-3 mr-1" />
                        {species}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {weatherRec.recommendedTechniques.length > 0 && (
                <div>
                  <p className="font-semibold text-sm text-muted-foreground mb-2">Рекомендуемые техники:</p>
                  <div className="flex flex-wrap gap-1">
                    {weatherRec.recommendedTechniques.map(technique => (
                      <Badge key={technique} variant="outline" className="text-xs">
                        {technique}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Объяснение AI
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{weatherRec.reasoning}</p>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Основные рекомендации */}
      {(activeTab === 'all' || activeTab === 'history') && recommendations.length > 0 && (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card 
              key={rec.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleInteraction(rec.id, 'VIEW')}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getRecommendationIcon(rec.type)}
                    <CardTitle className="text-lg">{rec.title}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {getTypeLabel(rec.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{rec.impressions}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MousePointer className="h-4 w-4" />
                      <span>{rec.clicks}</span>
                    </div>
                    {rec.conversions > 0 && (
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4" />
                        <span>{rec.conversions}</span>
                      </div>
                    )}
                  </div>
                </div>
                {rec.fromCaptain && (
                  <CardDescription>
                    От капитана {rec.fromCaptain.name}
                  </CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p>{rec.description}</p>
                
                {rec.aiGeneratedText && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm italic">{rec.aiGeneratedText}</p>
                  </div>
                )}

                {rec.recommendedTrip && (
                  <div className="border rounded-lg p-4 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{rec.recommendedTrip.title}</h4>
                      <Badge variant="outline">
                        {rec.recommendedTrip.bookings.length} участников
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(rec.recommendedTrip.date).toLocaleDateString()}</span>
                      </div>
                      {rec.recommendedTrip.captain && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>Капитан {rec.recommendedTrip.captain.name}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      className="w-full mt-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInteraction(rec.id, 'CLICK');
                        // Здесь должен быть переход к странице поездки
                        window.location.href = `/trip/${rec.recommendedTrip?.id}`;
                      }}
                    >
                      Посмотреть поездку
                    </Button>
                  </div>
                )}

                {(rec.recommendedSpecies.length > 0 || rec.recommendedTechniques.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rec.recommendedSpecies.length > 0 && (
                      <div>
                        <p className="font-semibold text-sm text-muted-foreground mb-1">Виды рыб:</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.recommendedSpecies.slice(0, 3).map(species => (
                            <Badge key={species} variant="outline" className="text-xs">
                              {species}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {rec.recommendedTechniques.length > 0 && (
                      <div>
                        <p className="font-semibold text-sm text-muted-foreground mb-1">Техники:</p>
                        <div className="flex flex-wrap gap-1">
                          {rec.recommendedTechniques.slice(0, 3).map(technique => (
                            <Badge key={technique} variant="outline" className="text-xs">
                              {technique}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span>Релевантность: {Math.round(rec.relevanceScore * 100)}%</span>
                    <span>Приоритет: {rec.priority}/10</span>
                  </div>
                  {rec.validUntil && (
                    <span className="text-xs text-muted-foreground">
                      До {new Date(rec.validUntil).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Рекомендации капитанов */}
      {(activeTab === 'all' || activeTab === 'social') && captainRecs.length > 0 && (
        <div className="space-y-4">
          <Separator className="my-6" />
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-purple-500" />
            <h3 className="text-xl font-semibold">Советы от опытных капитанов</h3>
          </div>
          
          {captainRecs.map((rec) => (
            <Card key={rec.id} className="border-purple-200 bg-purple-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{rec.title}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {rec.category}
                    </Badge>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <ThumbsUp className="h-4 w-4" />
                      <span>{rec.helpfulVotes}</span>
                    </div>
                  </div>
                </div>
                <CardDescription>От капитана {rec.captainName}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p>{rec.content}</p>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Была ли эта рекомендация полезной?</p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCaptainVote(rec.id, 'helpful')}
                      className="flex items-center space-x-1"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>Полезно</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCaptainVote(rec.id, 'not_helpful')}
                      className="flex items-center space-x-1"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      <span>Не очень</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Сообщение когда нет рекомендаций */}
      {recommendations.length === 0 && captainRecs.length === 0 && !weatherRec && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="mb-2">Рекомендации скоро появятся</CardTitle>
            <CardDescription className="mb-4">
              Система изучает ваши предпочтения для создания персонализированных рекомендаций.
              Забронируйте несколько поездок, чтобы получать умные советы!
            </CardDescription>
            <Button onClick={loadRecommendations} className="mt-4">
              <BookOpen className="h-4 w-4 mr-2" />
              Обновить рекомендации
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
