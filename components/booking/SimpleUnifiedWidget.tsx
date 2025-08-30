'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  Calendar, 
  Clock, 
  Euro,
  MapPin,
  ArrowRight,
  ArrowLeft,
  Ship,
  UserPlus,
  Crown
} from 'lucide-react';

// Import existing components and utilities
import { contactInfoSchema, BOOKING_CONSTANTS } from '@/lib/schemas/booking';
import { submitPrivateBooking, submitGroupBooking } from '@/app/actions/booking';
import { useGroupTrips } from '@/lib/hooks/useGroupTrips';
import { GroupTripDisplay } from '@/lib/types/group-events';
import { CreateEventDialog } from '@/components/fishing-events/CreateEventDialog';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Types for the unified widget
interface BookingStep {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface BookingOptionChoice {
  type: 'join-group' | 'private-charter' | 'create-group';
  selectedTripId?: string;
}

interface TripDetails {
  date: string;
  time: 'MORNING_9AM' | 'AFTERNOON_2PM';
  participants: number;
}

interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

interface UnifiedBookingState {
  currentStep: number;
  choice?: BookingOptionChoice;
  tripDetails?: TripDetails;
  contactInfo?: ContactInfo;
}

const steps: BookingStep[] = [
  { id: 'choose-option', title: 'Выбор опции', isCompleted: false },
  { id: 'trip-details', title: 'Детали поездки', isCompleted: false },
  { id: 'contact-info', title: 'Контактная информация', isCompleted: false },
  { id: 'confirmation', title: 'Подтверждение', isCompleted: false }
];

// Component for group trip selection card
function GroupTripSelectionCard({ 
  trip, 
  isSelected, 
  onSelect 
}: { 
  trip: GroupTripDisplay; 
  isSelected: boolean; 
  onSelect: () => void; 
}) {
  const remainingSpots = trip.maxParticipants - trip.currentParticipants;
  const isUrgent = trip.urgencyLevel === 'high';
  const isConfirmed = trip.status === 'confirmed';

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-blue-500 bg-blue-50' : ''
      } ${isUrgent ? 'border-red-300' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-grow">
            <h4 className="font-semibold">
              {format(trip.date, 'd MMMM, EEEE', { locale: ru })}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock className="w-4 h-4" />
              <span>{trip.timeSlot === 'MORNING_9AM' ? 'Утром (9:00)' : 'Днём (14:00)'}</span>
            </div>
            
            {/* 🎣 NEW FISHING EVENT ELEMENTS */}
            <div className="flex flex-wrap gap-1 mt-2">
              {trip.eventType && trip.eventType !== 'COMMERCIAL' && (
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
                  ⭐ {trip.difficultyRating}/5
                </Badge>
              )}
              {Array.isArray(trip.targetSpecies) && trip.targetSpecies.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🐟 {trip.targetSpecies.slice(0, 2).join(', ')}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant={isConfirmed ? 'default' : 'outline'} className={isUrgent ? 'animate-pulse' : ''}>
              {isConfirmed && <CheckCircle className="w-3 h-3 mr-1" />}
              {isConfirmed ? 'Подтверждена' : 'Набирается'}
            </Badge>
            <div className="text-right">
              <div className="text-lg font-bold text-green-600">€{trip.pricePerPerson}</div>
              <div className="text-xs text-muted-foreground">за человека</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Участники</span>
            <span className="font-medium">{trip.currentParticipants}/{trip.maxParticipants}</span>
          </div>
          <Progress value={(trip.currentParticipants / trip.maxParticipants) * 100} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {remainingSpots} {remainingSpots === 1 ? 'место' : 'мест'} свободно
          </p>
        </div>

        {Array.isArray(trip.participants) && trip.participants.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {trip.participants.slice(0, 3).map((participant: any) => (
              <div 
                key={participant.id}
                className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center"
              >
                {participant.initials}
              </div>
            ))}
            {Array.isArray(trip.participants) && trip.participants.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
                +{trip.participants.length - 3}
              </div>
            )}
            <span className="text-xs text-muted-foreground ml-2">уже с нами</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Step 1: Choose Option
function ChooseOptionStep({ 
  trips, 
  isLoading, 
  selectedChoice, 
  onChoiceChange, 
  onNext,
  onEventCreated,
  onRefreshEvents
}: { 
  trips: GroupTripDisplay[];
  isLoading: boolean;
  selectedChoice?: BookingOptionChoice;
  onChoiceChange: (choice: BookingOptionChoice) => void;
  onNext: () => void;
  onEventCreated?: (event: any) => void;
  onRefreshEvents?: () => void;
}) {
  const availableTrips = trips.filter(trip => 
    trip.currentParticipants < trip.maxParticipants &&
    trip.status !== 'cancelled'
  );

  const handleNext = () => {
    if (!selectedChoice || !selectedChoice.type) {
      alert('Пожалуйста, выберите опцию бронирования');
      return;
    }
    
    if (selectedChoice.type === 'join-group' && (!selectedChoice.selectedTripId && availableTrips.length > 0)) {
      alert('Пожалуйста, выберите поездку для присоединения');
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Как вы хотите отправиться на рыбалку?</h2>
        <p className="text-muted-foreground">
          Выберите наиболее подходящий для вас вариант
        </p>
      </div>

      {/* Available Group Trips */}
      {availableTrips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Присоединиться к группе</h3>
            <Badge variant="secondary">{availableTrips.length} доступно</Badge>
          </div>
          
          <div className="grid gap-3">
            {availableTrips.map((trip) => (
              <GroupTripSelectionCard
                key={trip.tripId}
                trip={trip}
                isSelected={
                  selectedChoice?.type === 'join-group' && 
                  selectedChoice?.selectedTripId === trip.tripId
                }
                onSelect={() => onChoiceChange({ 
                  type: 'join-group', 
                  selectedTripId: trip.tripId 
                })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Ship className="w-5 h-5 text-green-600" />
          Другие варианты
        </h3>
        
        <div className="space-y-3">
          {/* Private Charter */}
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedChoice?.type === 'private-charter' ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onChoiceChange({ type: 'private-charter' })}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-orange-100">
                    <Crown className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Частная рыбалка</h4>
                    <p className="text-sm text-muted-foreground">
                      Эксклюзивная поездка только для вашей группы
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-orange-600">€400</div>
                  <div className="text-sm text-muted-foreground">за всю лодку</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create New Group */}
          <CreateEventDialog
            onEventCreated={onEventCreated || (() => console.log('Event created'))}
            onRefreshEvents={onRefreshEvents || (() => console.log('Refreshing events'))}
          >
            <Card className="cursor-pointer transition-all hover:shadow-md hover:border-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <UserPlus className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Создать новую группу</h4>
                      <p className="text-sm text-muted-foreground">
                        Начните свою группу, к которой смогут присоединиться другие
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-600">€95</div>
                    <div className="text-sm text-muted-foreground">за человека</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CreateEventDialog>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} className="px-8">
          Продолжить
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 2: Trip Details
function TripDetailsStep({ 
  choice, 
  trips,
  details,
  onDetailsChange,
  onNext, 
  onPrev 
}: { 
  choice: BookingOptionChoice;
  trips: GroupTripDisplay[];
  details?: TripDetails;
  onDetailsChange: (details: TripDetails) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [currentDetails, setCurrentDetails] = useState<TripDetails>({
    date: details?.date || '',
    time: details?.time || 'MORNING_9AM',
    participants: details?.participants || 1
  });

  const isJoinGroup = choice.type === 'join-group';
  const selectedTrip = choice.selectedTripId ? 
    trips.find(t => t.tripId === choice.selectedTripId) : null;

  useEffect(() => {
    if (isJoinGroup && selectedTrip) {
      setCurrentDetails({
        date: format(selectedTrip.date, 'yyyy-MM-dd'),
        time: selectedTrip.timeSlot,
        participants: 1
      });
    }
  }, [isJoinGroup, selectedTrip]);

  const handleNext = () => {
    if (!isJoinGroup) {
      if (!currentDetails.date || !currentDetails.time || !currentDetails.participants) {
        alert('Пожалуйста, заполните все поля');
        return;
      }
    }
    
    onDetailsChange(currentDetails);
    onNext();
  };

  if (isJoinGroup && selectedTrip) {
    const remainingSpots = selectedTrip.maxParticipants - selectedTrip.currentParticipants;
    const maxParticipants = Math.min(remainingSpots, 4);

    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Присоединение к группе</h2>
          <p className="text-muted-foreground">
            Подтвердите детали вашего участия
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Trip Details */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Детали поездки</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(selectedTrip.date, 'd MMMM, EEEE', { locale: ru })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{selectedTrip.timeSlot === 'MORNING_9AM' ? 'Утром (9:00)' : 'Днём (14:00)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedTrip.meetingPoint}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{selectedTrip.currentParticipants}/{selectedTrip.maxParticipants} участников</span>
                </div>
              </div>
            </div>

            {/* Participants Selection */}
            <div>
              <Label htmlFor="join-participants" className="text-sm font-medium">
                Количество мест для бронирования
              </Label>
              <select
                id="join-participants"
                value={currentDetails.participants}
                onChange={(e) => setCurrentDetails(prev => ({ ...prev, participants: parseInt(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                {Array.from({ length: maxParticipants }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'место' : 'мест'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Доступно {remainingSpots} {remainingSpots === 1 ? 'место' : 'мест'}
              </p>
            </div>

            {/* Price Calculation */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Стоимость:</span>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    €{selectedTrip.pricePerPerson * currentDetails.participants}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    €{selectedTrip.pricePerPerson} × {currentDetails.participants}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrev}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
          <Button onClick={handleNext}>
            Продолжить
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Детали поездки</h2>
        <p className="text-muted-foreground">
          {choice.type === 'private-charter' 
            ? 'Выберите дату и время для частной рыбалки'
            : 'Выберите дату и время для новой группы'
          }
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* Date Selection */}
          <div>
            <Label htmlFor="date" className="text-sm font-medium">Дата</Label>
            <Input
              id="date"
              type="date"
              value={currentDetails.date}
              onChange={(e) => setCurrentDetails(prev => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div>
            <Label className="text-sm font-medium">Время отправления</Label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="morning" 
                  name="time" 
                  value="MORNING_9AM" 
                  checked={currentDetails.time === 'MORNING_9AM'}
                  onChange={(e) => setCurrentDetails(prev => ({ ...prev, time: e.target.value as 'MORNING_9AM' | 'AFTERNOON_2PM' }))}
                />
                <Label htmlFor="morning">Утром (9:00)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="afternoon" 
                  name="time" 
                  value="AFTERNOON_2PM" 
                  checked={currentDetails.time === 'AFTERNOON_2PM'}
                  onChange={(e) => setCurrentDetails(prev => ({ ...prev, time: e.target.value as 'MORNING_9AM' | 'AFTERNOON_2PM' }))}
                />
                <Label htmlFor="afternoon">Днём (14:00)</Label>
              </div>
            </div>
          </div>

          {/* Participants */}
          <div>
            <Label htmlFor="participants" className="text-sm font-medium">
              {choice.type === 'private-charter' ? 'Количество участников' : 'Начальное количество участников'}
            </Label>
            <select
              id="participants"
              value={currentDetails.participants}
              onChange={(e) => setCurrentDetails(prev => ({ ...prev, participants: parseInt(e.target.value) }))}
              className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md"
            >
              {Array.from(
                { length: choice.type === 'private-charter' ? 6 : 4 }, 
                (_, i) => i + 1
              ).map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'человек' : 'человек'}
                </option>
              ))}
            </select>
          </div>

          {/* Price Preview */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Стоимость:</span>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  €{choice.type === 'private-charter' 
                    ? BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE 
                    : BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON * currentDetails.participants
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  {choice.type === 'private-charter' 
                    ? 'за всю лодку' 
                    : `€${BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON} × ${currentDetails.participants}`
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <Button onClick={handleNext}>
          Продолжить
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 3: Contact Info
function ContactInfoStep({ 
  contactInfo,
  onContactInfoChange,
  onNext, 
  onPrev 
}: { 
  contactInfo?: ContactInfo;
  onContactInfoChange: (info: ContactInfo) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const form = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: {
      name: contactInfo?.name || '',
      phone: contactInfo?.phone || '',
      email: contactInfo?.email || ''
    }
  });

  const handleNext = () => {
    form.handleSubmit((data) => {
      onContactInfoChange(data);
      onNext();
    })();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Контактная информация</h2>
        <p className="text-muted-foreground">
          Мы свяжемся с вами для подтверждения бронирования
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm font-medium">
                Полное имя *
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Ваше полное имя"
                className="mt-1"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="text-sm font-medium">
                Телефон / WhatsApp *
              </Label>
              <Input
                id="phone"
                type="tel"
                {...form.register('phone')}
                placeholder="+351 912 345 677"
                className="mt-1"
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="your@email.com (необязательно)"
                className="mt-1"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <Button onClick={handleNext}>
          Продолжить к подтверждению
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// Step 4: Confirmation
function ConfirmationStep({ 
  state,
  trips,
  onPrev
}: { 
  state: UnifiedBookingState;
  trips: GroupTripDisplay[];
  onPrev: () => void;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const selectedTrip = state.choice?.selectedTripId ? 
    trips.find(t => t.tripId === state.choice?.selectedTripId) : null;

  const totalPrice = useMemo(() => {
    if (state.choice?.type === 'private-charter') {
      return BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE;
    }
    const pricePerPerson = selectedTrip?.pricePerPerson || BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON;
    return pricePerPerson * (state.tripDetails?.participants || 1);
  }, [state.choice, state.tripDetails, selectedTrip]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const formData = new FormData();
      
      // Common fields
      if (state.contactInfo) {
        formData.append('name', state.contactInfo.name);
        formData.append('phone', state.contactInfo.phone);
        formData.append('email', state.contactInfo.email || '');
      }

      if (state.tripDetails) {
        formData.append('participants', state.tripDetails.participants.toString());
      }

      let result;

      if (state.choice?.type === 'private-charter') {
        // Private booking
        formData.append('date', state.tripDetails?.date || '');
        formData.append('time', state.tripDetails?.time === 'MORNING_9AM' ? '09:00' : '14:00');
        
        result = await submitPrivateBooking(formData);
      } else {
        // Group booking (join existing or create new)
        formData.append('date', state.tripDetails?.date || '');
        formData.append('time', state.tripDetails?.time === 'MORNING_9AM' ? '09:00' : '14:00');
        
        if (state.choice?.selectedTripId) {
          formData.append('selectedTripId', state.choice.selectedTripId);
        }

        result = await submitGroupBooking(formData);
      }

      setSubmitResult(result);
    } catch (error) {
      console.error('Error submitting booking:', error);
      setSubmitResult({
        success: false,
        message: 'Произошла неожиданная ошибка. Попробуйте еще раз.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBookingTypeTitle = () => {
    switch (state.choice?.type) {
      case 'join-group':
        return 'Присоединение к группе';
      case 'private-charter':
        return 'Частная рыбалка';
      case 'create-group':
        return 'Создание новой группы';
      default:
        return 'Бронирование';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Подтверждение бронирования</h2>
        <p className="text-muted-foreground">
          Проверьте детали вашего бронирования перед отправкой
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{getBookingTypeTitle()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Booking Details */}
          <div className="space-y-3">
            {selectedTrip ? (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Детали группы</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Дата:</strong> {format(selectedTrip.date, 'd MMMM, EEEE', { locale: ru })}</p>
                  <p><strong>Время:</strong> {selectedTrip.timeSlot === 'MORNING_9AM' ? 'Утром (9:00)' : 'Днём (14:00)'}</p>
                  <p><strong>Участники:</strong> {state.tripDetails?.participants || 1} человек</p>
                  <p><strong>Место встречи:</strong> {selectedTrip.meetingPoint}</p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Детали поездки</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Дата:</strong> {state.tripDetails?.date && format(new Date(state.tripDetails.date), 'd MMMM, EEEE', { locale: ru })}</p>
                  <p><strong>Время:</strong> {state.tripDetails?.time === 'MORNING_9AM' ? 'Утром (9:00)' : 'Днём (14:00)'}</p>
                  <p><strong>Участники:</strong> {state.tripDetails?.participants || 1} человек</p>
                  <p><strong>Место встречи:</strong> Cascais Marina</p>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Контактная информация</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Имя:</strong> {state.contactInfo?.name}</p>
                <p><strong>Телефон:</strong> {state.contactInfo?.phone}</p>
                {state.contactInfo?.email && <p><strong>Email:</strong> {state.contactInfo.email}</p>}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Общая стоимость</h4>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">€{totalPrice}</div>
                  {state.choice?.type !== 'private-charter' && (
                    <div className="text-sm text-muted-foreground">
                      €{selectedTrip?.pricePerPerson || BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON} × {state.tripDetails?.participants || 1}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Result */}
          {submitResult && (
            <Alert variant={submitResult.success ? "default" : "destructive"}>
              <div className="flex items-center gap-2">
                {submitResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <AlertDescription>
                  {submitResult.message}
                  {submitResult.success && submitResult.data && (
                    <div className="mt-2 text-sm">
                      <strong>Код подтверждения:</strong> {submitResult.data.confirmationCode}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev} disabled={isSubmitting}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Обработка...
            </div>
          ) : (
            `Подтвердить бронирование €${totalPrice}`
          )}
        </Button>
      </div>
    </div>
  );
}

// Main component
export function SimpleUnifiedWidget() {
  const { trips, isLoading, invalidateGroupTrips } = useGroupTrips({
    experience: 'any',
    timeSlot: 'any',
    status: 'any',
    spotsLeft: 0
  }, 'chronological', 10);
  const [state, setState] = useState<UnifiedBookingState>({
    currentStep: 0
  });

  const handleEventCreated = (event: any) => {
    console.log('New fishing event created:', event);
    // Could also navigate to the created event or show confirmation
  };

  const handleRefreshEvents = () => {
    // Refresh the trips list
    invalidateGroupTrips();
  };

  const currentSteps = steps.map((step, index) => ({
    ...step,
    isCompleted: index < state.currentStep
  }));

  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.min(prev.currentStep + 1, steps.length - 1) }));
  };

  const prevStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(prev.currentStep - 1, 0) }));
  };

  const updateChoice = (choice: BookingOptionChoice) => {
    setState(prev => ({ ...prev, choice }));
  };

  const updateTripDetails = (tripDetails: TripDetails) => {
    setState(prev => ({ ...prev, tripDetails }));
  };

  const updateContactInfo = (contactInfo: ContactInfo) => {
    setState(prev => ({ ...prev, contactInfo }));
  };

  return (
    <div id="booking" className="px-4 mb-8 mt-16">
      <Card className="max-w-4xl mx-auto bg-card border-2 border-primary/20">
        <CardContent className="p-8">
          <div className="space-y-8">
            {/* Progress Indicator */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4">
                {currentSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                        ${state.currentStep === index 
                          ? 'bg-blue-600 text-white' 
                          : step.isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                        }`}
                    >
                      {step.isCompleted ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`text-sm ${
                      state.currentStep === index ? 'font-medium' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </span>
                    {index < currentSteps.length - 1 && (
                      <div className="w-8 h-px bg-gray-300 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {state.currentStep === 0 && (
              <ChooseOptionStep 
                trips={trips} 
                isLoading={isLoading}
                selectedChoice={state.choice}
                onChoiceChange={updateChoice}
                onNext={nextStep}
                onEventCreated={handleEventCreated}
                onRefreshEvents={handleRefreshEvents}
              />
            )}
            
            {state.currentStep === 1 && state.choice && (
              <TripDetailsStep 
                choice={state.choice}
                trips={trips}
                details={state.tripDetails}
                onDetailsChange={updateTripDetails}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            
            {state.currentStep === 2 && (
              <ContactInfoStep 
                contactInfo={state.contactInfo}
                onContactInfoChange={updateContactInfo}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}
            
            {state.currentStep === 3 && (
              <ConfirmationStep 
                state={state}
                trips={trips}
                onPrev={prevStep}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
