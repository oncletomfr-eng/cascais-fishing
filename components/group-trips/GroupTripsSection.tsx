'use client';

import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import SimpleGroupTripsList from './SimpleGroupTripsList';
import { GroupTripDisplay } from '@/lib/types/group-events';

interface GroupTripsSectionProps {
  className?: string;
}

// Компонент загрузки
function GroupTripsLoading() {
  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <Skeleton className="h-12 w-3/5 mx-auto mb-2" />
          <Skeleton className="h-6 w-2/5 mx-auto" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="p-6">
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
          ))}
        </div>
      </div>
    </div>
  );
}

// Компонент ошибки
function GroupTripsError({ error }: { error: Error }) {
  return (
    <div className="py-8">
      <div className="max-w-6xl mx-auto">
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <div className="mb-2 font-semibold text-red-800">
              Не удалось загрузить групповые поездки
            </div>
            <div className="text-red-600 text-sm">
              {error.message || 'Произошла неизвестная ошибка. Попробуйте обновить страницу.'}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

export default function GroupTripsSection({ className = '' }: GroupTripsSectionProps) {
  const handleTripSelect = (trip: GroupTripDisplay) => {
    // Прокрутка к виджету бронирования и передача данных о поездке
    const bookingElement = document.getElementById('booking');
    if (bookingElement) {
      bookingElement.scrollIntoView({ behavior: 'smooth' });
      
      // Можно добавить логику для предзаполнения формы данными о поездке
      // Например, установить дату и тип бронирования в booking store
    }
  };

  return (
    <section className={`py-16 px-4 bg-gradient-to-b from-slate-50 to-white ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-sans font-bold text-3xl md:text-4xl lg:text-5xl mb-4 bg-gradient-to-r from-sky-500 to-blue-500 bg-clip-text text-transparent">
            🎣 Присоединяйтесь к групповым поездкам
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Найдите единомышленников и разделите незабываемые моменты рыбалки в Атлантике всего за €95 с человека
          </p>
        </div>

        {/* Group Trips List */}
        <Suspense fallback={<GroupTripsLoading />}>
          <SimpleGroupTripsList 
            onTripSelect={handleTripSelect}
          />
        </Suspense>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6 text-lg">
            Не нашли подходящую группу? 
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 transition-all duration-200"
              onClick={() => {
                const bookingElement = document.getElementById('booking');
                if (bookingElement) {
                  bookingElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Создать свою группу
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-blue-500 text-blue-500 hover:bg-blue-50 font-semibold px-8 py-3 transition-all duration-200"
              onClick={() => {
                window.open('https://wa.me/351934027852?text=Здравствуйте! Интересуют групповые поездки на рыбалку. Можете рассказать подробнее?', '_blank');
              }}
            >
              Связаться с капитаном
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
