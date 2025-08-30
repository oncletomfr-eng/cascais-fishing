'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BookingTypeSelector } from './BookingTypeSelector';
import { GroupTripCard } from './GroupTripCard';
import { useBookingStore, calculatePrice, getBookingLimits } from '@/lib/stores/booking-store';
import { privateBookingSchema, groupBookingSchema, BOOKING_CONSTANTS } from '@/lib/schemas/booking';
import { submitPrivateBooking, submitGroupBooking, getAvailableGroupTrips } from '@/app/actions/booking';
import { BookingType, GroupTripInfo } from '@/lib/types/booking';
import { Loader2, AlertCircle, CheckCircle, Users, Calendar, Clock } from 'lucide-react';

interface AvailableTrip {
  tripId: string;
  trip: GroupTripInfo;
}

export function EnhancedBookingWidget() {
  const {
    bookingType,
    privateBooking,
    setBookingType,
    updatePrivateBooking,
    createGroupTrip,
    addParticipantToGroup,
    getTripProgress,
  } = useBookingStore();

  // Debug logging
  console.log('EnhancedBookingWidget: Current bookingType:', bookingType);

  // Wrapped setBookingType with logging
  const handleBookingTypeChange = (type: BookingType) => {
    console.log('EnhancedBookingWidget: handleBookingTypeChange called with:', type);
    console.log('EnhancedBookingWidget: current bookingType before change:', bookingType);
    setBookingType(type);
    console.log('EnhancedBookingWidget: setBookingType called');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);
  const [availableTrips, setAvailableTrips] = useState<AvailableTrip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [loadingTrips, setLoadingTrips] = useState(false);

  // Выбираем схему валидации в зависимости от типа бронирования
  const validationSchema = useMemo(() => 
    bookingType === 'private' ? privateBookingSchema : groupBookingSchema,
    [bookingType]
  );

  // React Hook Form
  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: bookingType === 'private' 
      ? {
          date: privateBooking.date || '',
          time: privateBooking.time || '09:00',
          participants: privateBooking.participants || 2,
          name: privateBooking.contactInfo.name || '',
          phone: privateBooking.contactInfo.phone || '',
          email: privateBooking.contactInfo.email || '',
        }
      : {
          date: '',
          time: '09:00' as const,
          participants: 1,
          name: '',
          phone: '',
          email: '',
          selectedTripId: '',
        },
  });

  const { watch, setValue, reset } = form;
  const watchedDate = watch('date');
  const watchedTime = watch('time');
  const watchedParticipants = watch('participants');

  // Загружаем доступные поездки при изменении даты/времени для group booking
  useEffect(() => {
    if (bookingType === 'group' && watchedDate && watchedTime) {
      loadAvailableTrips(watchedDate, watchedTime);
    }
  }, [bookingType, watchedDate, watchedTime]);

  // Сброс формы при смене типа бронирования
  useEffect(() => {
    setSubmitResult(null);
    setSelectedTripId('');
    reset();
  }, [bookingType, reset]);

  // Синхронизация с Zustand store для private booking
  useEffect(() => {
    if (bookingType === 'private') {
      const subscription = form.watch((value) => {
        updatePrivateBooking({
          date: value.date || '',
          time: (value.time as any) || '09:00',
          participants: value.participants || 2,
          contactInfo: {
            name: value.name || '',
            phone: value.phone || '',
            email: value.email || '',
          },
        });
      });
      return () => subscription.unsubscribe();
    }
  }, [bookingType, form, updatePrivateBooking]);

  const loadAvailableTrips = async (date: string, time: string) => {
    setLoadingTrips(true);
    try {
      const trips = await getAvailableGroupTrips(date, time);
      setAvailableTrips(
        trips.map((trip: any) => ({
          tripId: trip.tripId,
          trip: trip,
        }))
      );
    } catch (error) {
      console.error('Error loading trips:', error);
      setAvailableTrips([]);
    } finally {
      setLoadingTrips(false);
    }
  };

  const handleTripSelect = (tripId: string) => {
    setSelectedTripId(tripId);
    setValue('selectedTripId', tripId);
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      if (bookingType === 'group' && selectedTripId) {
        formData.append('selectedTripId', selectedTripId);
      }

      const result = bookingType === 'private'
        ? await submitPrivateBooking(formData)
        : await submitGroupBooking(formData);

      setSubmitResult(result);

      if (result.success) {
        // Очищаем форму при успехе
        reset();
        setSelectedTripId('');
        
        // Для group booking обновляем список доступных поездок
        if (bookingType === 'group' && watchedDate && watchedTime) {
          setTimeout(() => loadAvailableTrips(watchedDate, watchedTime), 1000);
        }
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

  const currentPrice = useMemo(() => {
    return calculatePrice(bookingType, watchedParticipants || 1);
  }, [bookingType, watchedParticipants]);

  const participantLimits = useMemo(() => {
    return getBookingLimits(bookingType);
  }, [bookingType]);

  return (
    <div id="booking" className="px-4 mb-8 mt-16">
      <Card className="max-w-4xl mx-auto bg-card border-2 border-primary/20">
        <CardContent className="p-6">
          {/* Заголовок */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-center mb-2">
              Забронировать рыбалку
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              Выберите тип бронирования и заполните детали
            </p>
          </div>

          {/* Выбор типа бронирования */}
          <div className="mb-6">
            <BookingTypeSelector
              value={bookingType}
              onChange={handleBookingTypeChange}
            />
          </div>

          {/* Форма */}
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Основные поля формы */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Дата */}
              <div>
                <Label htmlFor="date" className="text-sm font-medium">
                  Выберите дату
                </Label>
                <Input
                  id="date"
                  type="date"
                  {...form.register('date')}
                  min={new Date().toISOString().split('T')[0]}
                  className="mt-1"
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              {/* Время */}
              <div>
                <Label htmlFor="time" className="text-sm font-medium">
                  Время отправления
                </Label>
                <select
                  id="time"
                  {...form.register('time')}
                  className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="09:00">Утром (9:00)</option>
                  <option value="14:00">Днем (14:00)</option>
                </select>
                {form.formState.errors.time && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.time.message}
                  </p>
                )}
              </div>

              {/* Количество участников */}
              <div>
                <Label htmlFor="participants" className="text-sm font-medium">
                  {bookingType === 'private' ? 'Участники' : 'Места для брони'}
                </Label>
                <select
                  id="participants"
                  {...form.register('participants', { valueAsNumber: true })}
                  className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  {Array.from(
                    { length: participantLimits.max - participantLimits.min + 1 },
                    (_, i) => participantLimits.min + i
                  ).map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'человек' : 'человек'}
                    </option>
                  ))}
                </select>
                {form.formState.errors.participants && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.participants.message}
                  </p>
                )}
              </div>
            </div>

            {/* Доступные поездки для group booking */}
            {bookingType === 'group' && watchedDate && watchedTime && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Доступные поездки
                  </Label>
                  {loadingTrips && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Поиск поездок...
                    </div>
                  )}
                </div>

                {!loadingTrips && (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availableTrips.length > 0 ? (
                      availableTrips.map(({ tripId, trip }) => (
                        <GroupTripCard
                          key={tripId}
                          tripId={tripId}
                          trip={trip}
                          onSelect={handleTripSelect}
                          isSelected={selectedTripId === tripId}
                          availableSlots={watchedParticipants}
                          className="cursor-pointer"
                        />
                      ))
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="p-4 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="w-8 h-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              На выбранную дату и время групповых поездок пока нет.
                              <br />
                              Ваша заявка создаст новую группу!
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Контактная информация */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Контактная информация</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-xs text-muted-foreground">
                    Полное имя
                  </Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Ваше имя"
                    className="mt-1"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs text-muted-foreground">
                    Телефон / WhatsApp
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...form.register('phone')}
                    placeholder="+380 97 101 8913, +351 934 027 852, +1 234 567 890"
                    className="mt-1"
                  />
                  {form.formState.errors.phone && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-xs text-muted-foreground">
                  Email (необязательно)
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="your@email.com"
                  className="mt-1"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>

            {/* Результат отправки */}
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
                        <br />
                        <strong>Сумма:</strong> €{submitResult.data.totalPrice}
                      </div>
                    )}
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {/* Кнопка отправки и информация о цене */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="text-center sm:text-left">
                <div className="text-2xl font-bold text-primary">
                  €{currentPrice}
                </div>
                <div className="text-sm text-muted-foreground">
                  {bookingType === 'private' 
                    ? `за всю лодку (${watchedParticipants || 1} чел.)`
                    : `€${BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON} × ${watchedParticipants || 1} = €${currentPrice}`
                  }
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting || (bookingType === 'group' && availableTrips.length > 0 && !selectedTripId)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold px-8"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Обработка...
                  </div>
                ) : (
                  `Забронировать €${currentPrice}`
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
