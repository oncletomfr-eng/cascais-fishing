'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { defineStepper } from '@stepperize/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { useGroupTrips } from '@/lib/hooks/useGroupTrips';

// Импортируем новые компоненты
import EnhancedChooseOptionStep from './EnhancedChooseOptionStep';
import QueryProvider from '@/components/providers/QueryProvider';
import { GroupTripDisplay } from '@/lib/types/group-events';

// Stepper definition - безопасное создание
let Stepper = null;
try {
  const stepperResult = defineStepper(
    { id: 'choose-option', title: 'Выбор опции' },
    { id: 'trip-details', title: 'Детали поездки' },
    { id: 'contact-info', title: 'Контактная информация' },
    { id: 'confirmation', title: 'Подтверждение' }
  );
  
  if (stepperResult && stepperResult.Stepper) {
    Stepper = stepperResult.Stepper;
  }
} catch (error) {
  console.error('Error creating stepper:', error);
}

// Types
interface BookingOptionChoice {
  type: 'join-group' | 'private-charter' | 'create-group';
  selectedTripId?: string;
}

/**
 * Внутренний компонент виджета с данными
 */
function EnhancedUnifiedWidgetContent() {
  // Используем useGroupTrips для единообразия с другими компонентами
  const { trips, isLoading } = useGroupTrips();

  // Проверяем, что Stepper доступен, если нет - показываем упрощённую версию
  if (!Stepper) {
    return (
      <div id="enhanced-booking" className="px-4 mb-8 mt-16">
        <Card className="max-w-6xl mx-auto bg-card border-2 border-primary/20 shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-4">🎣 Присоединяйтесь к групповым поездкам</h2>
              <p className="text-muted-foreground">Выберите подходящую поездку из доступных:</p>
            </div>
            
            {/* Показываем доступные поездки напрямую */}
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Загрузка поездок...</p>
              </div>
            ) : trips.length > 0 ? (
              <div className="space-y-4">
                {trips.map((trip: GroupTripDisplay) => (
                  <Card key={trip.tripId} className="p-4 border border-blue-200 hover:border-blue-400 transition-colors">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold">{new Date(trip.date).toLocaleDateString('ru-RU')}</h3>
                        <p className="text-sm text-muted-foreground">{trip.timeDisplay}</p>
                        <div className="flex gap-2 mt-2">
                          {trip.eventType && (
                            <Badge variant="outline" className="text-xs">
                              {trip.eventType.toLowerCase()}
                            </Badge>
                          )}
                          {trip.skillLevel && trip.skillLevel !== 'ANY' && (
                            <Badge variant="secondary" className="text-xs">
                              {trip.skillLevel.toLowerCase()}
                            </Badge>
                          )}
                          {trip.difficultyRating && (
                            <Badge variant="outline" className="text-xs">
                              {trip.difficultyRating}/5
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600">€{trip.pricePerPerson}</div>
                        <div className="text-sm text-muted-foreground">{trip.spotsRemaining} мест</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Нет доступных поездок</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
      <div id="enhanced-booking" className="px-4 mb-8 mt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Card className="max-w-6xl mx-auto bg-card border-2 border-primary/20 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <Stepper.Provider>
                {({ methods }) => (
                  <div className="min-h-[600px]">
                    {/* Progress Indicator */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
                      <div className="flex items-center justify-center py-6">
                        <div className="flex items-center gap-2">
                          {methods.all.map((step, index) => (
                            <div key={step.id} className="flex items-center">
                              <motion.div 
                                className={`
                                  flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold transition-all
                                  ${methods.current.id === step.id 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : methods.isAfter(step.id)
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 text-gray-600'
                                  }
                                `}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 300 }}
                              >
                                {methods.isAfter(step.id) ? (
                                  <CheckCircle className="w-5 h-5" />
                                ) : (
                                  index + 1
                                )}
                              </motion.div>
                              
                              <div className="ml-3 mr-6">
                                <div className={`text-sm font-medium ${
                                  methods.current.id === step.id ? 'text-blue-600' : 'text-muted-foreground'
                                }`}>
                                  {step.title}
                                </div>
                              </div>
                              
                              {index < methods.all.length - 1 && (
                                <div className={`w-16 h-0.5 mr-6 ${
                                  methods.isAfter(step.id) ? 'bg-green-600' : 'bg-gray-300'
                                }`} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Step Content */}
                    <div className="p-8">
                      {methods.switch({
                        'choose-option': () => (
                          <EnhancedChooseOptionStep
                            selectedOption={methods.getMetadata('choose-option') as BookingOptionChoice || { type: 'private-charter' }}
                            onOptionChange={(option) => methods.setMetadata('choose-option', option)}
                            onNext={() => methods.next()}
                            trips={trips}
                            isLoading={isLoading}
                          />
                        ),
                        'trip-details': () => (
                          <PlaceholderStep
                            title="Детали поездки"
                            description="Здесь будут детали выбранной опции"
                            onNext={() => methods.next()}
                            onPrev={() => methods.prev()}
                          />
                        ),
                        'contact-info': () => (
                          <PlaceholderStep
                            title="Контактная информация"
                            description="Форма для ввода контактных данных"
                            onNext={() => methods.next()}
                            onPrev={() => methods.prev()}
                          />
                        ),
                        'confirmation': () => (
                          <PlaceholderStep
                            title="Подтверждение"
                            description="Финальное подтверждение бронирования"
                            onNext={() => methods.reset()}
                            onPrev={() => methods.prev()}
                            nextLabel="Подтвердить бронирование"
                            showConfetti={true}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </Stepper.Provider>
            </CardContent>
          </Card>
        </motion.div>
      </div>
  );
}

/**
 * EnhancedUnifiedWidget - Обновленный виджет бронирования
 * 
 * Новые функции:
 * - Интеграция TripsFeedComponent в первом шаге
 * - Реал-тайм обновления групповых поездок
 * - Улучшенная UX с анимациями Framer Motion
 * - Социальные триггеры и urgency индикаторы
 * - TanStack Query для кеширования данных
 */
export default function EnhancedUnifiedWidget() {
  return (
    <QueryProvider>
      <EnhancedUnifiedWidgetContent />
    </QueryProvider>
  );
}

/**
 * Placeholder компонент для демонстрации остальных шагов
 */
interface PlaceholderStepProps {
  title: string;
  description: string;
  onNext: () => void;
  onPrev: () => void;
  nextLabel?: string;
  showConfetti?: boolean;
}

function PlaceholderStep({
  title,
  description,
  onNext,
  onPrev,
  nextLabel = "Продолжить",
  showConfetti = false
}: PlaceholderStepProps) {
  return (
    <motion.div
      className="space-y-8 text-center py-16"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {showConfetti && <ConfettiOverlay />}
      
      <div>
        <motion.h2 
          className="text-3xl font-bold mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {title}
        </motion.h2>
        
        <motion.p 
          className="text-lg text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {description}
        </motion.p>
      </div>
      
      <motion.div
        className="flex justify-center gap-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          onClick={onPrev}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Назад
        </motion.button>
        
        <motion.button
          className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          onClick={onNext}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {nextLabel}
        </motion.button>
      </motion.div>
      
      {title === "Детали поездки" && (
        <motion.div
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Badge variant="secondary" className="text-sm">
            💡 В этом шаге будут детали выбранной опции из первого шага
          </Badge>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * Конфетти эффект для успешного завершения
 */
function ConfettiOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'][i % 5],
            left: `${Math.random() * 100}%`,
          }}
          initial={{
            y: -20,
            x: Math.random() * 50 - 25,
            rotate: 0,
            scale: 0,
          }}
          animate={{
            y: 600,
            x: Math.random() * 100 - 50,
            rotate: 360,
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: Math.random() * 2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
