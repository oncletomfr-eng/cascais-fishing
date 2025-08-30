'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  Globe,
  BarChart3,
  Fish,
  Trophy,
  GraduationCap,
  Heart
} from 'lucide-react';
import { GroupTripDisplay } from '@/lib/types/group-events';

// Enhanced GroupTripStats interface with FishingEvent support
interface GroupTripStats {
  // Existing fields  
  totalActiveTrips: number;
  totalParticipants: number;
  confirmedTrips: number;
  formingTrips: number;
  averageParticipants: number;
  countriesRepresented: number;
  
  // Legacy compatibility
  total?: number;
  confirmed?: number;
  almostFull?: number;
  averageOccupancy?: number;
  nextTrip?: Date;
  
  // 🎣 NEW FISHING EVENT STATS
  byEventType?: {
    commercial: number;
    tournament: number;
    learning: number;
    community: number;
  };
  bySkillLevel?: {
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
    any: number;
  };
  averageDifficulty?: number;
  weatherDependent?: number;
  equipmentProvided?: number;
}

interface GroupTripsStatsProps {
  stats: GroupTripStats;
  className?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: index * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  index: number;
}

function StatCard({ title, value, subtitle, icon, color, progress, index }: StatCardProps) {
  const colorClasses = {
    '#2196f3': 'bg-blue-50 border-blue-200 text-blue-700',
    '#4caf50': 'bg-green-50 border-green-200 text-green-700', 
    '#ff9800': 'bg-orange-50 border-orange-200 text-orange-700',
    '#9c27b0': 'bg-purple-50 border-purple-200 text-purple-700',
    '#f44336': 'bg-red-50 border-red-200 text-red-700',
    '#00bcd4': 'bg-cyan-50 border-cyan-200 text-cyan-700',
    '#8bc34a': 'bg-lime-50 border-lime-200 text-lime-700',
  };

  const cardColor = colorClasses[color as keyof typeof colorClasses] || 'bg-gray-50 border-gray-200 text-gray-700';

  return (
    <motion.div
      variants={cardVariants}
      custom={index}
      initial="hidden"
      animate="visible"
    >
      <Card className={`h-full ${cardColor} border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}>
        <CardContent className="p-6">
          <div className="flex items-start mb-4">
            <div className="p-3 rounded-lg bg-white/50 mr-4">
              {React.cloneElement(icon as React.ReactElement, {
                className: "h-6 w-6",
              })}
            </div>
            <div className="flex-grow">
              <div className="text-2xl font-bold mb-1">{value}</div>
              <div className="text-sm font-medium">{title}</div>
            </div>
          </div>
          
          {subtitle && (
            <div className="text-xs text-muted-foreground mb-2">
              {subtitle}
            </div>
          )}
          
          {progress !== undefined && (
            <div className="mt-4">
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function GroupTripsStats({
  stats,
  className = '',
}: GroupTripsStatsProps) {
  const confirmedRate = stats.totalActiveTrips > 0 
    ? Math.round((stats.confirmedTrips / stats.totalActiveTrips) * 100)
    : 0;

  const occupancyRate = stats.totalActiveTrips > 0
    ? Math.round((stats.averageParticipants / 8) * 100)
    : 0;

  const formingRate = stats.totalActiveTrips > 0
    ? Math.round((stats.formingTrips / stats.totalActiveTrips) * 100)
    : 0;

  return (
    <div className={`${className} mb-8`}>
      {/* Header */}
      <Card className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">📊 Статистика групповых поездок</h2>
          <p className="text-blue-100">Живые данные о текущей активности</p>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Активных поездок"
          value={stats.totalActiveTrips}
          subtitle="Всего доступных для присоединения"
          icon={<TrendingUp />}
          color="#2196f3"
          index={0}
        />

        <StatCard
          title="Участников"
          value={stats.totalParticipants}
          subtitle={`В среднем ${stats.averageParticipants} на поездку`}
          icon={<Users />}
          color="#4caf50"
          progress={occupancyRate}
          index={1}
        />

        <StatCard
          title="Подтверждённых"
          value={stats.confirmedTrips}
          subtitle="Поездки с гарантией выхода"
          icon={<CheckCircle />}
          color="#ff9800"
          progress={confirmedRate}
          index={2}
        />

        <StatCard
          title="Набираются"
          value={stats.formingTrips}
          subtitle="Ждут новых участников"
          icon={<Clock />}
          color="#9c27b0"
          progress={formingRate}
          index={3}
        />
      </div>

      {/* 🎣 NEW FISHING EVENT STATISTICS */}
      {(stats.byEventType || stats.bySkillLevel || stats.averageDifficulty) && (
        <>
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-blue-600 mb-2">📊 Статистика FishingEvent</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            {stats.byEventType && (
              <>
                <StatCard
                  title="Коммерческие"
                  value={stats.byEventType.commercial}
                  subtitle="Платные поездки"
                  icon={<Fish />}
                  color="#2196f3"
                  index={4}
                />
                
                <StatCard
                  title="Турниры"
                  value={stats.byEventType.tournament}
                  subtitle="Соревновательные"
                  icon={<Trophy />}
                  color="#ff9800"
                  index={5}
                />
                
                <StatCard
                  title="Обучение"
                  value={stats.byEventType.learning}
                  subtitle="Для новичков"
                  icon={<GraduationCap />}
                  color="#4caf50"
                  index={6}
                />
                
                <StatCard
                  title="Сообщество"
                  value={stats.byEventType.community}
                  subtitle="Бесплатные"
                  icon={<Heart />}
                  color="#9c27b0"
                  index={7}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {stats.averageDifficulty && (
              <StatCard
                title="Средняя сложность"
                value={`${stats.averageDifficulty.toFixed(1)}/5`}
                subtitle="Уровень событий"
                icon={<BarChart3 />}
                color="#f44336"
                progress={stats.averageDifficulty * 20}
                index={8}
              />
            )}
            
            {stats.weatherDependent !== undefined && (
              <StatCard
                title="Зависят от погоды"
                value={stats.weatherDependent}
                subtitle="Событий"
                icon={<Globe />}
                color="#00bcd4"
                index={9}
              />
            )}
            
            {stats.equipmentProvided !== undefined && (
              <StatCard
                title="Снаряжение включено"
                value={stats.equipmentProvided}
                subtitle="Событий"
                icon={<CheckCircle />}
                color="#8bc34a"
                index={10}
              />
            )}
          </div>
        </>
      )}

      {/* Additional Insights */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4 text-center">
          <Globe className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-xl font-bold">{stats.countriesRepresented}</div>
          <div className="text-sm text-muted-foreground">
            {stats.countriesRepresented === 1 ? 'страна представлена' : 'стран представлено'}
          </div>
        </Card>
        
        <Card className="p-4 text-center">
          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-xl font-bold">
            {stats.averageParticipants > 0 ? '↗️' : '➖'}
          </div>
          <div className="text-sm text-muted-foreground">Тренд активности</div>
        </Card>
      </div>

      {/* Active Filters Display */}
      {stats.totalActiveTrips > 0 && (
        <div className="mt-6 flex flex-wrap gap-2 justify-center">
          {stats.confirmedTrips > 0 && (
            <Badge variant="default" className="bg-green-100 text-green-800">
              {stats.confirmedTrips} подтверждённых
            </Badge>
          )}
          {stats.formingTrips > 0 && (
            <Badge variant="outline" className="border-purple-200 text-purple-700">
              {stats.formingTrips} набираются
            </Badge>
          )}
          <Badge variant="secondary">
            {stats.totalParticipants} участников
          </Badge>
        </div>
      )}
    </div>
  );
}