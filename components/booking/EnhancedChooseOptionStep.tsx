'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowRight,
  Ship,
  UserPlus,
  Crown,
  Users,
  Sparkles
} from 'lucide-react';

// Импорты для новых компонентов
import { TripsFeedComponent } from '@/components/group-trips/TripsFeedComponent';
import { GroupTripDisplay } from '@/lib/types/group-events';
import { generateMockGroupTrips } from '@/lib/utils/group-trips-utils';

// Типы для booking widget
interface BookingOptionChoice {
  type: 'join-group' | 'private-charter' | 'create-group';
  selectedTripId?: string;
}

interface EnhancedChooseOptionStepProps {
  selectedOption: BookingOptionChoice;
  onOptionChange: (option: BookingOptionChoice) => void;
  onNext: () => void;
  trips: GroupTripDisplay[];
  isLoading: boolean;
}

/**
 * Улучшенный компонент выбора опций с интеграцией TripsFeedComponent
 * 
 * Новые функции:
 * - Интерактивная лента групповых поездок
 * - Реал-тайм обновления через WebSocket
 * - Социальные триггеры и urgency индикаторы
 * - Улучшенная UX психология
 */
export default function EnhancedChooseOptionStep({
  selectedOption,
  onOptionChange,
  onNext,
  trips: propTrips,
  isLoading
}: EnhancedChooseOptionStepProps) {
  // Используем mock данные если нет входящих поездок
  const trips = propTrips.length > 0 ? propTrips : generateMockGroupTrips(6);
  
  // Фильтруем активные поездки с доступными местами
  const availableTrips = trips.filter(trip => 
    trip.availableSpots > 0 && trip.status !== 'cancelled'
  );
  
  const [activeTab, setActiveTab] = useState<'group-trips' | 'other-options'>('group-trips');
  
  // Обработчик выбора поездки из ленты
  const handleTripSelect = useCallback((trip: GroupTripDisplay) => {
    onOptionChange({ 
      type: 'join-group', 
      selectedTripId: trip.tripId 
    });
    
    // Подсвечиваем выбранную поездку эффектом
    console.log('🎣 Selected trip:', trip.tripId);
  }, [onOptionChange]);
  
  // Валидация и переход к следующему шагу
  const handleNext = () => {
    if (!selectedOption.type) {
      alert('Пожалуйста, выберите опцию бронирования');
      return;
    }
    
    if (selectedOption.type === 'join-group') {
      if (!selectedOption.selectedTripId && availableTrips.length > 0) {
        alert('Пожалуйста, выберите поездку для присоединения');
        return;
      }
    }
    
    onNext();
  };
  
  // Подсчет статистики для мотивации
  const stats = {
    urgentTrips: availableTrips.filter(trip => trip.urgencyLevel === 'high').length,
    confirmedTrips: availableTrips.filter(trip => trip.status === 'confirmed').length,
    totalParticipants: availableTrips.reduce((sum, trip) => sum + trip.currentParticipants, 0)
  };
  
  return (
    <motion.div 
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header с мотивационным текстом */}
      <div className="text-center space-y-4">
        <motion.h2 
          className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Выберите свое рыболовное приключение
        </motion.h2>
        
        <motion.p 
          className="text-lg text-muted-foreground max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Присоединяйтесь к группе единомышленников или забронируйте эксклюзивную поездку
        </motion.p>
        
        {/* Social Proof Statistics */}
        {stats.totalParticipants > 0 && (
          <motion.div 
            className="flex items-center justify-center gap-6 mt-4 text-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center gap-1 text-blue-600">
              <Users className="h-4 w-4" />
              <span className="font-semibold">{stats.totalParticipants}</span>
              <span>рыболовов уже записались</span>
            </div>
            
            {stats.urgentTrips > 0 && (
              <Badge variant="secondary" className="animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                {stats.urgentTrips} срочных предложений
              </Badge>
            )}
          </motion.div>
        )}
      </div>
      
      {/* Tabbed Interface */}
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="group-trips" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Групповые поездки
            {availableTrips.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {availableTrips.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="other-options" className="flex items-center gap-2">
            <Ship className="h-4 w-4" />
            Другие варианты
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="group-trips" className="space-y-6 mt-6">
          <AnimatePresence mode="wait">
            {availableTrips.length > 0 ? (
              <motion.div
                key="trips-feed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <TripsFeedComponent
                  trips={availableTrips}
                  onTripSelect={handleTripSelect}
                  realTimeUpdates={true}
                  enableSocialProof={true}
                  className="max-h-[600px] overflow-y-auto"
                />
                
                {/* Selection Indicator */}
                {selectedOption.type === 'join-group' && selectedOption.selectedTripId && (
                  <motion.div
                    className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex items-center gap-2 text-blue-800">
                      <Users className="h-4 w-4" />
                      <span className="font-medium">
                        Выбрана поездка: {selectedOption.selectedTripId}
                      </span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="no-trips"
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Групповых поездок пока нет</h3>
                <p className="text-muted-foreground mb-4">
                  Создайте свою группу или забронируйте частную поездку
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('other-options')}
                >
                  Посмотреть другие варианты
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
        
        <TabsContent value="other-options" className="space-y-4 mt-6">
          <motion.div 
            className="grid gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Private Charter Option */}
            <OptionCard
              icon={<Crown className="w-6 h-6 text-orange-600" />}
              title="Частная рыбалка"
              description="Эксклюзивная поездка только для вашей группы"
              price="€400"
              priceSubtext="за всю лодку"
              isSelected={selectedOption.type === 'private-charter'}
              onClick={() => onOptionChange({ type: 'private-charter' })}
              badge="Премиум"
              badgeColor="orange"
            />
            
            {/* Create Group Option */}
            <OptionCard
              icon={<UserPlus className="w-6 h-6 text-blue-600" />}
              title="Создать новую группу"
              description="Начните свою группу, к которой смогут присоединиться другие"
              price="€95"
              priceSubtext="за человека"
              isSelected={selectedOption.type === 'create-group'}
              onClick={() => onOptionChange({ type: 'create-group' })}
              badge="Популярно"
              badgeColor="blue"
            />
          </motion.div>
        </TabsContent>
      </Tabs>
      
      {/* Next Button */}
      <motion.div 
        className="flex justify-end pt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Button 
          onClick={handleNext} 
          className="px-8 py-3 text-lg font-semibold"
          size="lg"
        >
          Продолжить к деталям
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

/**
 * Компонент карточки опции с анимациями
 */
interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: string;
  priceSubtext: string;
  isSelected: boolean;
  onClick: () => void;
  badge?: string;
  badgeColor?: 'orange' | 'blue';
}

function OptionCard({
  icon,
  title,
  description,
  price,
  priceSubtext,
  isSelected,
  onClick,
  badge,
  badgeColor = 'blue'
}: OptionCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={`
          cursor-pointer transition-all duration-300 border-2
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-border hover:border-blue-300 hover:shadow-md'
          }
        `}
        onClick={onClick}
      >
        <CardContent className="p-6 relative overflow-hidden">
          {/* Selection Indicator */}
          {isSelected && (
            <motion.div
              className="absolute top-4 right-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <motion.div
                  className="w-2 h-2 bg-white rounded-full"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                />
              </div>
            </motion.div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className={`p-3 rounded-full ${
                badgeColor === 'orange' ? 'bg-orange-100' : 'bg-blue-100'
              }`}>
                {icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-lg">{title}</h4>
                  {badge && (
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        badgeColor === 'orange' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {badge}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-sm max-w-xs">
                  {description}
                </p>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`text-2xl font-bold ${
                badgeColor === 'orange' ? 'text-orange-600' : 'text-blue-600'
              }`}>
                {price}
              </div>
              <div className="text-sm text-muted-foreground">
                {priceSubtext}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
