'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { defineStepper } from '@stepperize/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useBookingStore, calculatePrice } from '@/lib/stores/booking-store';
import { contactInfoSchema, BOOKING_CONSTANTS } from '@/lib/schemas/booking';
import { submitPrivateBooking, submitGroupBooking } from '@/app/actions/booking';
import { useGroupTrips } from '@/lib/hooks/useGroupTrips';
import { GroupTripDisplay } from '@/lib/types/group-trip';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
// Import новой ленты событий с социальными триггерами
import { TripsFeedComponent } from '@/components/group-trips/TripsFeedComponent';

// Stepper definition
const { Stepper } = defineStepper(
  { id: 'choose-option', title: 'Выбор опции' },
  { id: 'trip-details', title: 'Детали поездки' },
  { id: 'contact-info', title: 'Контактная информация' },
  { id: 'confirmation', title: 'Подтверждение' }
);

// Типы для форм
interface BookingOptionChoice {
  type: 'join-group' | 'private-charter' | 'create-group';
  selectedTripId?: string;
}

interface TripDetails {
  date?: string;
  time?: 'morning' | 'afternoon';
  participants?: number;
}

interface ContactInfo {
  name: string;
  phone: string;
  email: string;
}

interface UnifiedBookingData extends BookingOptionChoice, TripDetails, ContactInfo {}

// Компонент выбора опций
function ChooseOptionStep({ trips, isLoading }: { trips: GroupTripDisplay[], isLoading: boolean }) {
  const methods = Stepper.useStepper();
  const [selectedOption, setSelectedOption] = useState<BookingOptionChoice>({ type: 'private-charter' });

  // Filter active trips that have available spots
  const availableTrips = trips.filter(trip => 
    trip.currentParticipants < trip.maxParticipants &&
    trip.status !== 'cancelled'
  );

  const handleOptionChange = (option: BookingOptionChoice) => {
    setSelectedOption(option);
    methods.setMetadata('choose-option', option);
  };

  const handleNext = () => {
    // Validate that an option is selected
    const metadata = methods.getMetadata('choose-option') as BookingOptionChoice;
    if (!metadata || !metadata.type) {
      alert('Пожалуйста, выберите опцию бронирования');
      return;
    }
    
    // For join-group option, validate that a trip is selected
    if (metadata.type === 'join-group' && (!metadata.selectedTripId && availableTrips.length > 0)) {
      alert('Пожалуйста, выберите поездку для присоединения');
      return;
    }

    methods.next();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Как вы хотите отправиться на рыбалку?</h2>
        <p className="text-muted-foreground">
          Выберите наиболее подходящий для вас вариант
        </p>
      </div>

      {/* НОВАЯ ЛЕНТА СОБЫТИЙ - замена статичного блока */}
      {availableTrips.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Присоединиться к группе</h3>
            <Badge variant="secondary">{availableTrips.length} доступно</Badge>
          </div>
          
          {/* TripsFeedComponent с социальными триггерами и реал-тайм */}
          <TripsFeedComponent
            trips={availableTrips.map(trip => ({
              ...trip,
              participants: trip.participantAvatars.map(avatar => ({
                id: avatar.id,
                name: avatar.name,
                avatar: avatar.avatar || '',
                country: avatar.country,
                joinedAt: new Date(),
                isReal: true
              })),
              socialProof: trip.currentParticipants > 2 ? 
                `${trip.currentParticipants} участников уже присоединились!` : undefined,
              recentActivity: trip.participantAvatars.length > 0 ?
                `${trip.participantAvatars[0].name} присоединился недавно` : undefined,
              urgencyLevel: trip.urgencyLevel || 'low',
              spotsRemaining: trip.maxParticipants - trip.currentParticipants,
              meetingPoint: trip.meetingPoint || 'Cascais Marina',
              pricePerPerson: trip.pricePerPerson || 95,
              minRequired: 6,
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 день назад
              updatedAt: new Date()
            }))}
            filters={{
              experience: 'any',
              timeSlot: 'any', 
              status: 'any',
              spotsLeft: 10
            }}
            sortBy="almost_full"
            onTripSelect={(trip) => handleOptionChange({ 
              type: 'join-group', 
              selectedTripId: trip.tripId 
            })}
            realTimeUpdates={true}
            showWeatherInfo={true}
            enableSocialProof={true}
            className="max-h-96 overflow-y-auto"
          />
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
              selectedOption.type === 'private-charter' ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => handleOptionChange({ type: 'private-charter' })}
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
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedOption.type === 'create-group' ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => handleOptionChange({ type: 'create-group' })}
          >
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

// Компонент карточки группы для выбора
function GroupTripOptionCard({ 
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
              <span>{trip.timeSlot === 'morning' ? 'Утром (9:00)' : 'Днём (14:00)'}</span>
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
          <Progress value={trip.progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {remainingSpots} {remainingSpots === 1 ? 'место' : 'мест'} свободно
          </p>
        </div>

        {trip.participantAvatars.length > 0 && (
          <div className="flex items-center gap-1 mt-3">
            {trip.participantAvatars.slice(0, 3).map((participant) => (
              <div 
                key={participant.id}
                className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center"
              >
                {participant.initials}
              </div>
            ))}
            {trip.participantAvatars.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-medium flex items-center justify-center">
                +{trip.participantAvatars.length - 3}
              </div>
            )}
            <span className="text-xs text-muted-foreground ml-2">уже с нами</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Компонент деталей поездки
function TripDetailsStep() {
  const methods = Stepper.useStepper();
  const choiceMetadata = methods.getMetadata('choose-option') as BookingOptionChoice;
  const [details, setDetails] = useState<TripDetails>({
    date: '',
    time: 'morning',
    participants: 1
  });

  const isJoinGroup = choiceMetadata?.type === 'join-group';
  const selectedTrip = choiceMetadata?.selectedTripId;

  useEffect(() => {
    if (isJoinGroup && selectedTrip) {
      // For join group, we already have the trip details
      const { trips } = useGroupTrips();
      const trip = trips.find(t => t.tripId === selectedTrip);
      if (trip) {
        setDetails({
          date: format(trip.date, 'yyyy-MM-dd'),
          time: trip.timeSlot,
          participants: 1
        });
      }
    }
  }, [isJoinGroup, selectedTrip]);

  const handleNext = () => {
    if (!isJoinGroup) {
      // Validate details for private/create-group
      if (!details.date || !details.time || !details.participants) {
        alert('Пожалуйста, заполните все поля');
        return;
      }
    }
    
    methods.setMetadata('trip-details', details);
    methods.next();
  };

  const handlePrev = () => {
    methods.prev();
  };

  if (isJoinGroup && selectedTrip) {
    // We need to access trips data from the parent component
    const parentTrips = methods.getMetadata('trips-data') as GroupTripDisplay[];
    return <JoinGroupDetailsStep onNext={handleNext} onPrev={handlePrev} trips={parentTrips || []} />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Детали поездки</h2>
        <p className="text-muted-foreground">
          {choiceMetadata?.type === 'private-charter' 
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
              value={details.date}
              onChange={(e) => setDetails(prev => ({ ...prev, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]}
              className="mt-1"
            />
          </div>

          {/* Time Selection */}
          <div>
            <Label className="text-sm font-medium">Время отправления</Label>
            <RadioGroup 
              value={details.time} 
              onValueChange={(value) => setDetails(prev => ({ ...prev, time: value as 'morning' | 'afternoon' }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="morning" id="morning" />
                <Label htmlFor="morning">Утром (9:00)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="afternoon" id="afternoon" />
                <Label htmlFor="afternoon">Днём (14:00)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Participants */}
          <div>
            <Label htmlFor="participants" className="text-sm font-medium">
              {choiceMetadata?.type === 'private-charter' ? 'Количество участников' : 'Начальное количество участников'}
            </Label>
            <select
              id="participants"
              value={details.participants}
              onChange={(e) => setDetails(prev => ({ ...prev, participants: parseInt(e.target.value) }))}
              className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md"
            >
              {Array.from(
                { length: choiceMetadata?.type === 'private-charter' ? 6 : 4 }, 
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
                  €{choiceMetadata?.type === 'private-charter' 
                    ? BOOKING_CONSTANTS.PRIVATE_BOOKING.PRICE 
                    : BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON * (details.participants || 1)
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  {choiceMetadata?.type === 'private-charter' 
                    ? 'за всю лодку' 
                    : `€${BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON} × ${details.participants || 1}`
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={handlePrev}>
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

// Компонент для присоединения к группе
function JoinGroupDetailsStep({ onNext, onPrev, trips }: { onNext: () => void; onPrev: () => void; trips: GroupTripDisplay[] }) {
  const methods = Stepper.useStepper();
  const choiceMetadata = methods.getMetadata('choose-option') as BookingOptionChoice;
  const [participants, setParticipants] = useState(1);

  const selectedTrip = trips.find(t => t.tripId === choiceMetadata?.selectedTripId);
  
  if (!selectedTrip) return null;

  const remainingSpots = selectedTrip.maxParticipants - selectedTrip.currentParticipants;
  const maxParticipants = Math.min(remainingSpots, 4);

  const handleNext = () => {
    methods.setMetadata('trip-details', {
      date: format(selectedTrip.date, 'yyyy-MM-dd'),
      time: selectedTrip.timeSlot,
      participants
    });
    onNext();
  };

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
                <span>{selectedTrip.timeSlot === 'morning' ? 'Утром (9:00)' : 'Днём (14:00)'}</span>
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
              value={participants}
              onChange={(e) => setParticipants(parseInt(e.target.value))}
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
                  €{selectedTrip.pricePerPerson * participants}
                </div>
                <div className="text-sm text-muted-foreground">
                  €{selectedTrip.pricePerPerson} × {participants}
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

// Компонент контактной информации
function ContactInfoStep() {
  const methods = Stepper.useStepper();
  const [contact, setContact] = useState<ContactInfo>({
    name: '',
    phone: '',
    email: ''
  });

  const form = useForm<ContactInfo>({
    resolver: zodResolver(contactInfoSchema),
    defaultValues: contact
  });

  const handleNext = () => {
    form.handleSubmit((data) => {
      methods.setMetadata('contact-info', data);
      methods.next();
    })();
  };

  const handlePrev = () => {
    methods.prev();
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
        <Button variant="outline" onClick={handlePrev}>
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

// Компонент подтверждения
function ConfirmationStep({ trips }: { trips: GroupTripDisplay[] }) {
  const methods = Stepper.useStepper();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const choiceMetadata = methods.getMetadata('choose-option') as BookingOptionChoice;
  const tripDetails = methods.getMetadata('trip-details') as TripDetails;
  const contactInfo = methods.getMetadata('contact-info') as ContactInfo;

  const selectedTrip = choiceMetadata?.selectedTripId ? 
    trips.find(t => t.tripId === choiceMetadata.selectedTripId) : null;

  const totalPrice = useMemo(() => {
    if (choiceMetadata?.type === 'private-charter') {
      return BOOKING_CONSTANTS.PRIVATE_BOOKING.PRICE;
    }
    const pricePerPerson = selectedTrip?.pricePerPerson || BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON;
    return pricePerPerson * (tripDetails?.participants || 1);
  }, [choiceMetadata, tripDetails, selectedTrip]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const formData = new FormData();
      
      // Common fields
      if (contactInfo) {
        formData.append('name', contactInfo.name);
        formData.append('phone', contactInfo.phone);
        formData.append('email', contactInfo.email || '');
      }

      if (tripDetails) {
        formData.append('participants', tripDetails.participants?.toString() || '1');
      }

      let result;

      if (choiceMetadata?.type === 'private-charter') {
        // Private booking
        formData.append('date', tripDetails?.date || '');
        formData.append('time', tripDetails?.time === 'morning' ? '09:00' : '14:00');
        
        result = await submitPrivateBooking(formData);
      } else {
        // Group booking (join existing or create new)
        formData.append('date', tripDetails?.date || '');
        formData.append('time', tripDetails?.time === 'morning' ? '09:00' : '14:00');
        
        if (choiceMetadata?.selectedTripId) {
          formData.append('selectedTripId', choiceMetadata.selectedTripId);
        }

        result = await submitGroupBooking(formData);
      }

      setSubmitResult(result);

      if (result.success) {
        // Reset the stepper after successful submission
        setTimeout(() => {
          methods.reset();
          setSubmitResult(null);
        }, 5000);
      }
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

  const handlePrev = () => {
    methods.prev();
  };

  const getBookingTypeTitle = () => {
    switch (choiceMetadata?.type) {
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
                  <p><strong>Время:</strong> {selectedTrip.timeSlot === 'morning' ? 'Утром (9:00)' : 'Днём (14:00)'}</p>
                  <p><strong>Участники:</strong> {tripDetails?.participants || 1} человек</p>
                  <p><strong>Место встречи:</strong> {selectedTrip.meetingPoint}</p>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Детали поездки</h4>
                <div className="space-y-1 text-sm">
                  <p><strong>Дата:</strong> {tripDetails?.date && format(new Date(tripDetails.date), 'd MMMM, EEEE', { locale: ru })}</p>
                  <p><strong>Время:</strong> {tripDetails?.time === 'morning' ? 'Утром (9:00)' : 'Днём (14:00)'}</p>
                  <p><strong>Участники:</strong> {tripDetails?.participants || 1} человек</p>
                  <p><strong>Место встречи:</strong> Cascais Marina</p>
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Контактная информация</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Имя:</strong> {contactInfo?.name}</p>
                <p><strong>Телефон:</strong> {contactInfo?.phone}</p>
                {contactInfo?.email && <p><strong>Email:</strong> {contactInfo.email}</p>}
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Общая стоимость</h4>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">€{totalPrice}</div>
                  {choiceMetadata?.type !== 'private-charter' && (
                    <div className="text-sm text-muted-foreground">
                      €{selectedTrip?.pricePerPerson || BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON} × {tripDetails?.participants || 1}
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
        <Button variant="outline" onClick={handlePrev} disabled={isSubmitting}>
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

// Основной компонент
export function UnifiedBookingWidget() {
  const { trips, isLoading } = useGroupTrips();
  
  return (
    <div id="booking" className="px-4 mb-8 mt-16">
      <Card className="max-w-4xl mx-auto bg-card border-2 border-primary/20">
        <CardContent className="p-8">
          <Stepper.Provider>
            {({ methods }) => {
              // Store trips data in metadata for child components
              React.useEffect(() => {
                methods.setMetadata('trips-data', trips);
              }, [trips, methods]);
              
              return (
                <div className="space-y-8">
                  {/* Progress Indicator */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-4">
                      {methods.all.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-2">
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                              ${methods.current.id === step.id 
                                ? 'bg-blue-600 text-white' 
                                : methods.isAfter(step.id)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-600'
                              }`}
                          >
                            {methods.isAfter(step.id) ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              index + 1
                            )}
                          </div>
                          <span className={`text-sm ${
                            methods.current.id === step.id ? 'font-medium' : 'text-muted-foreground'
                          }`}>
                            {step.title}
                          </span>
                          {index < methods.all.length - 1 && (
                            <div className="w-8 h-px bg-gray-300 mx-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step Content */}
                  {methods.switch({
                    'choose-option': () => <ChooseOptionStep trips={trips} isLoading={isLoading} />,
                    'trip-details': () => <TripDetailsStep />,
                    'contact-info': () => <ContactInfoStep />,
                    'confirmation': () => <ConfirmationStep trips={trips} />
                  })}
                </div>
              );
            }}
          </Stepper.Provider>
        </CardContent>
      </Card>
    </div>
  );
}
