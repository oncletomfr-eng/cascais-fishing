'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Award, 
  Users, 
  Shield, 
  Heart,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Fish
} from 'lucide-react';

interface SocialRatings {
  mentorRating: number;
  teamworkRating: number; 
  reliabilityRating: number;
  respectRating: number;
  totalReviews: number;
}

interface ReputationSummary {
  overallRating: number;
  strongPoints: string[];
  improvementAreas: string[];
  recommendationLevel: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'CAUTION';
  trustScore: number;
}

interface FisherProfile {
  id: string;
  userId: string;
  experienceLevel: string;
  completedTrips: number;
  totalFishCaught: number;
  level: number;
  experiencePoints: number;
}

interface ReputationCardProps {
  profile: FisherProfile;
  socialRatings: SocialRatings;
  reputation: ReputationSummary;
}

// 🎨 Компонент для отображения рейтинга с звездами
const RatingStars: React.FC<{ rating: number; label: string; icon: React.ReactNode }> = ({ 
  rating, 
  label, 
  icon 
}) => {
  const percentage = (rating / 10) * 100;
  
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={percentage} className="w-20 h-2" />
        <span className="text-sm font-bold min-w-[2rem]">{rating.toFixed(1)}</span>
      </div>
    </div>
  );
};

// 🏅 Компонент для бейджа рекомендации
const RecommendationBadge: React.FC<{ level: string }> = ({ level }) => {
  const config = {
    HIGHLY_RECOMMENDED: { 
      color: 'bg-green-100 text-green-800', 
      icon: <CheckCircle className="w-4 h-4" />,
      text: 'Высоко рекомендуется'
    },
    RECOMMENDED: { 
      color: 'bg-blue-100 text-blue-800', 
      icon: <Star className="w-4 h-4" />,
      text: 'Рекомендуется'
    },
    NEUTRAL: { 
      color: 'bg-gray-100 text-gray-800', 
      icon: <Users className="w-4 h-4" />,
      text: 'Нейтрально'
    },
    CAUTION: { 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: <AlertCircle className="w-4 h-4" />,
      text: 'Осторожно'
    },
  };

  const { color, icon, text } = config[level as keyof typeof config] || config.NEUTRAL;

  return (
    <Badge className={`${color} flex items-center gap-1 px-3 py-1`}>
      {icon}
      <span>{text}</span>
    </Badge>
  );
};

// 📊 Главный компонент карточки репутации
export const ReputationCard: React.FC<ReputationCardProps> = ({
  profile,
  socialRatings,
  reputation,
}) => {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-600" />
            Система репутации рыболова
          </CardTitle>
          <RecommendationBadge level={reputation.recommendationLevel} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 🌟 Общий рейтинг */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
          <div>
            <div className="text-2xl font-bold text-blue-900">
              {reputation.overallRating.toFixed(1)}/10
            </div>
            <div className="text-sm text-blue-700">Общий рейтинг</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-blue-900">
              {reputation.trustScore}/100
            </div>
            <div className="text-sm text-blue-700">Счет доверия</div>
          </div>
        </div>

        {/* 📈 Детальные рейтинги */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Социальные рейтинги
          </h3>
          
          <RatingStars 
            rating={socialRatings.mentorRating}
            label="Наставничество"
            icon={<Award className="w-4 h-4 text-orange-500" />}
          />
          
          <RatingStars 
            rating={socialRatings.teamworkRating}
            label="Командная работа"
            icon={<Users className="w-4 h-4 text-blue-500" />}
          />
          
          <RatingStars 
            rating={socialRatings.reliabilityRating}
            label="Надежность"
            icon={<Shield className="w-4 h-4 text-green-500" />}
          />
          
          <RatingStars 
            rating={socialRatings.respectRating}
            label="Соблюдение правил"
            icon={<Heart className="w-4 h-4 text-red-500" />}
          />
        </div>

        {/* 💪 Сильные стороны */}
        {reputation.strongPoints.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              Сильные стороны
            </h3>
            <div className="flex flex-wrap gap-2">
              {reputation.strongPoints.map((point, index) => (
                <Badge key={index} className="bg-green-100 text-green-800">
                  {point}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* ⚠️ Области для улучшения */}
        {reputation.improvementAreas.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2 text-amber-700">
              <AlertCircle className="w-4 h-4" />
              Области для развития
            </h3>
            <div className="flex flex-wrap gap-2">
              {reputation.improvementAreas.map((area, index) => (
                <Badge key={index} className="bg-amber-100 text-amber-800">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 📊 Статистика опыта */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{profile.completedTrips}</div>
            <div className="text-sm text-gray-600">Завершенных поездок</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{profile.totalFishCaught}</div>
            <div className="text-sm text-gray-600">Поймано рыбы</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{profile.level}</div>
            <div className="text-sm text-gray-600">Уровень</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{socialRatings.totalReviews}</div>
            <div className="text-sm text-gray-600">Отзывов</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReputationCard;
