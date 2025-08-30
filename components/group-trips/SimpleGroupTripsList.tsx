'use client';

import React, { Suspense } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, TrendingUp, Users, CheckCircle, Clock } from 'lucide-react';
import { useGroupTrips } from '@/lib/hooks/useGroupTrips';
import SimpleGroupTripCard from './SimpleGroupTripCard';
import { 
  GroupTripDisplay,
  TripFilters,
} from '@/lib/types/group-events';

// Local interface for SimpleGroupTripsList
interface GroupTripsListProps {
  onTripSelect?: (trip: GroupTripDisplay) => void;
  filters?: TripFilters;
  className?: string;
}

// Компонент скелетона для карточки
function SkeletonCard() {
  return (
    <Card className="p-6">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-7 w-3/5" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-5 w-2/5 mb-4" />
      <Skeleton className="h-2 w-full mb-4" />
      <div className="flex gap-2 mb-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-12 w-full" />
    </Card>
  );
}

// Компонент Empty State
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-100 flex items-center justify-center">
        <TrendingUp className="w-12 h-12 text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold mb-2">Групповых поездок пока нет</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Будьте первым, кто создаст групповую поездку и найдет единомышленников для незабываемой рыбалки!
      </p>
      <Button>
        Создать группу
      </Button>
    </div>
  );
}

// Простая статистика
function SimpleStats({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div className="text-center p-4 bg-blue-50 rounded-lg">
        <div className="text-2xl font-bold text-blue-600 mb-1">{stats.totalActiveTrips}</div>
        <div className="text-sm text-blue-600">Активных поездок</div>
      </div>
      
      <div className="text-center p-4 bg-green-50 rounded-lg">
        <div className="text-2xl font-bold text-green-600 mb-1">{stats.totalParticipants}</div>
        <div className="text-sm text-green-600">Участников</div>
      </div>
      
      <div className="text-center p-4 bg-orange-50 rounded-lg">
        <div className="text-2xl font-bold text-orange-600 mb-1">{stats.confirmedTrips}</div>
        <div className="text-sm text-orange-600">Подтверждено</div>
      </div>
      
      <div className="text-center p-4 bg-purple-50 rounded-lg">
        <div className="text-2xl font-bold text-purple-600 mb-1">{stats.formingTrips}</div>
        <div className="text-sm text-purple-600">Набираются</div>
      </div>
    </div>
  );
}

export default function SimpleGroupTripsList({
  filters,
  className = '',
  onTripSelect,
}: GroupTripsListProps) {
  const {
    trips,
    stats,
    isLoading,
    isError,
    error,
    isEmpty,
    refresh,
    loadMore,
    hasMore,
    isLoadingMore,
  } = useGroupTrips(filters);

  const handleTripSelect = (trip: GroupTripDisplay) => {
    if (onTripSelect) {
      onTripSelect(trip);
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  // Error state
  if (isError) {
    return (
      <div className={className}>
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <div className="mb-2 font-semibold text-red-800">
              Ошибка загрузки групповых поездок
            </div>
            <div className="text-red-600 text-sm">
              {error?.message || 'Произошла ошибка при загрузке данных'}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3" 
              onClick={handleRefresh}
            >
              Попробовать снова
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-3xl font-bold mb-2">
              Доступные групповые поездки
            </h2>
            <p className="text-muted-foreground">
              Присоединяйтесь к существующим группам или создайте свою
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>

        {/* Quick Stats Chips */}
        {!isLoading && !isEmpty && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {stats.totalActiveTrips} активных
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {stats.totalParticipants} участников
            </Badge>
            {stats.confirmedTrips > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3" />
                {stats.confirmedTrips} подтверждено
              </Badge>
            )}
            {stats.formingTrips > 0 && (
              <Badge variant="outline" className="flex items-center gap-1 text-blue-600 border-blue-200">
                <Clock className="w-3 h-3" />
                {stats.formingTrips} набираются
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Stats Section */}
      {!isEmpty && !isLoading && (
        <SimpleStats stats={stats} />
      )}

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={`skeleton-${index}`} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {isEmpty && !isLoading && (
        <EmptyState />
      )}

      {/* Trips Grid */}
      {!isLoading && !isEmpty && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <SimpleGroupTripCard
                key={trip.tripId}
                trip={trip}
                onClick={handleTripSelect}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="min-w-48"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  'Показать ещё'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
