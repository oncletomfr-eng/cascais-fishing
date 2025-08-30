'use client';

import React from 'react';
// Временно убираем Radix UI RadioGroup для диагностики
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ship, Users, Euro, Clock, Shield, Star, MapPin, Package } from 'lucide-react';
import { BookingType } from '@/lib/types/booking';
import { BOOKING_CONSTANTS } from '@/lib/schemas/booking';

interface BookingTypeSelectorProps {
  value: BookingType;
  onChange: (type: BookingType) => void;
  className?: string;
}

export function BookingTypeSelector({ 
  value, 
  onChange, 
  className = '' 
}: BookingTypeSelectorProps) {
  
  const handleValueChange = (newValue: string) => {
    console.log('BookingTypeSelector: handleValueChange called with:', newValue);
    console.log('BookingTypeSelector: current value:', value);
    onChange(newValue as BookingType);
  };

  const bookingOptions = [
    {
      id: 'private',
      title: 'Private Charter',
      subtitle: 'Эксклюзивная аренда лодки',
      price: `€${BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE}`,
      priceNote: 'за всю лодку',
      icon: Ship,
      features: [
        'Вся лодка в вашем распоряжении',
        'Гарантированный выход',
        '1-6 участников',
        'Максимальная приватность'
      ],
      badge: 'Популярно',
      badgeVariant: 'default' as const,
    },
    {
      id: 'group',
      title: 'Join Group',
      subtitle: 'Присоединиться к группе',
      price: `€${BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON}`,
      priceNote: 'за человека',
      icon: Users,
      features: [
        'Экономичный вариант',
        'Знакомство с новыми людьми',
        'Минимум 6 человек для выхода',
        'До 8 участников максимум'
      ],
      badge: 'Экономия',
      badgeVariant: 'secondary' as const,
    }
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bookingOptions.map((option) => {
          const IconComponent = option.icon;
          const isSelected = value === option.id;
          
          return (
            <div key={option.id} className="relative">
              <Label htmlFor={option.id} className="cursor-pointer">
                <Card className={`relative transition-all hover:shadow-md ${
                  isSelected 
                    ? 'ring-2 ring-primary border-primary shadow-lg' 
                    : 'hover:border-primary/50'
                }`}>
                  <CardContent className="p-6">
                    {/* Обычный HTML radio button внутри карточки */}
                    <input
                      type="radio"
                      id={option.id}
                      name="bookingType"
                      value={option.id}
                      checked={isSelected}
                      onChange={(e) => handleValueChange(e.target.value)}
                      className="absolute top-4 right-4 z-10 w-4 h-4"
                    />
                    
                    {/* Badge */}
                    {option.badge && (
                      <Badge 
                        variant={option.badgeVariant}
                        className="absolute top-2 left-2 text-xs"
                      >
                        {option.badge}
                      </Badge>
                    )}

                    {/* Icon and Header */}
                    <div className="flex items-start gap-4 mb-4 mt-2">
                      <div className={`p-2 rounded-lg ${
                        isSelected 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {option.subtitle}
                        </p>
                        
                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            {option.price}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {option.priceNote}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="space-y-2">
                      {option.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {option.id === 'private' ? (
                            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                          ) : (
                            <Star className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                          <span className="text-muted-foreground">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Additional info for group booking */}
                    {option.id === 'group' && (
                      <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-muted-foreground">
                            Поездка подтверждается при наборе 6+ участников
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Label>
            </div>
          );
        })}
      </div>
      
      {/* Additional info */}
      <div className="mt-4 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-primary" />
            <span className="font-medium">Продолжительность:</span>
            <span>3-4 часа</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-medium">Отправление:</span>
            <span>Cascais Marina</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4 text-primary" />
            <span className="font-medium">Включено:</span>
            <span>Оборудование, безопасность, закуски</span>
          </div>
        </div>
      </div>
    </div>
  );
}
