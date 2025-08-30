import React from 'react';
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  BookingStore, 
  BookingType, 
  TripStatus, 
  TimeSlot, 
  PrivateBooking, 
  GroupTripInfo, 
  BookingParticipant, 
  BookingSummary,
  GroupBookings 
} from '@/lib/types/booking';
import { generateTripId, BOOKING_CONSTANTS } from '@/lib/schemas/booking';

// Дефолтные значения
const defaultPrivateBooking: PrivateBooking = {
  date: '',
  time: '09:00',
  participants: 2,
  contactInfo: {
    name: '',
    phone: '',
    email: '',
  },
};

// Store implementation
const useBookingStoreImpl = create<BookingStore>()(
  devtools(
    // Временно отключаем persist для диагностики
    // persist(
      (set, get) => ({
        // Initial state
        bookingType: 'private',
        privateBooking: defaultPrivateBooking,
        groupBookings: {},

        // Private Booking Actions
        setBookingType: (type: BookingType) => {
          console.log('BookingStore: setBookingType called with:', type);
          const prevState = get();
          console.log('BookingStore: previous bookingType:', prevState.bookingType);
          set({ bookingType: type }, false, 'setBookingType');
          console.log('BookingStore: setBookingType completed, new type should be:', type);
        },

        updatePrivateBooking: (booking: Partial<PrivateBooking>) => {
          set(
            (state) => ({
              privateBooking: { ...state.privateBooking, ...booking },
            }),
            false,
            'updatePrivateBooking'
          );
        },

        resetPrivateBooking: () => {
          set(
            { privateBooking: defaultPrivateBooking },
            false,
            'resetPrivateBooking'
          );
        },

        // Group Booking Actions
        createGroupTrip: (date: string, time: TimeSlot): string => {
          const tripId = generateTripId(date, time);
          
          const newTrip: GroupTripInfo = {
            date,
            time,
            participants: [],
            status: 'forming',
            minRequired: BOOKING_CONSTANTS.GROUP_BOOKING.MIN_PARTICIPANTS_TO_CONFIRM,
            maxCapacity: BOOKING_CONSTANTS.GROUP_BOOKING.MAX_CAPACITY,
            pricePerPerson: BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON,
          };

          set(
            (state) => ({
              groupBookings: {
                ...state.groupBookings,
                [tripId]: newTrip,
              },
            }),
            false,
            'createGroupTrip'
          );

          return tripId;
        },

        addParticipantToGroup: (
          tripId: string, 
          participant: Omit<BookingParticipant, 'id' | 'bookedAt'>
        ): boolean => {
          const state = get();
          const trip = state.groupBookings[tripId];

          if (!trip) {
            console.error('Trip not found:', tripId);
            return false;
          }

          // Проверяем, не превышено ли максимальное количество участников
          const currentParticipants = trip.participants.reduce(
            (total, p) => total + p.participantCount, 
            0
          );

          if (currentParticipants + participant.participantCount > trip.maxCapacity) {
            console.error('Trip capacity exceeded');
            return false;
          }

          const newParticipant: BookingParticipant = {
            ...participant,
            id: `participant_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            bookedAt: new Date(),
          };

          const updatedTrip: GroupTripInfo = {
            ...trip,
            participants: [...trip.participants, newParticipant],
          };

          // Автоматически подтверждаем поездку, если достигнут минимум
          const newTotalParticipants = currentParticipants + participant.participantCount;
          if (newTotalParticipants >= trip.minRequired && trip.status === 'forming') {
            updatedTrip.status = 'confirmed';
          }

          set(
            (state) => ({
              groupBookings: {
                ...state.groupBookings,
                [tripId]: updatedTrip,
              },
            }),
            false,
            'addParticipantToGroup'
          );

          return true;
        },

        removeParticipantFromGroup: (tripId: string, participantId: string) => {
          const state = get();
          const trip = state.groupBookings[tripId];

          if (!trip) return;

          const updatedParticipants = trip.participants.filter(
            (p) => p.id !== participantId
          );

          const updatedTrip: GroupTripInfo = {
            ...trip,
            participants: updatedParticipants,
          };

          // Проверяем, нужно ли изменить статус обратно на "forming"
          const totalParticipants = updatedParticipants.reduce(
            (total, p) => total + p.participantCount,
            0
          );

          if (totalParticipants < trip.minRequired && trip.status === 'confirmed') {
            updatedTrip.status = 'forming';
          }

          set(
            (state) => ({
              groupBookings: {
                ...state.groupBookings,
                [tripId]: updatedTrip,
              },
            }),
            false,
            'removeParticipantFromGroup'
          );
        },

        updateGroupTripStatus: (tripId: string, status: TripStatus) => {
          set(
            (state) => ({
              groupBookings: {
                ...state.groupBookings,
                [tripId]: {
                  ...state.groupBookings[tripId],
                  status,
                },
              },
            }),
            false,
            'updateGroupTripStatus'
          );
        },

        getAvailableGroupTrips: (): Array<{ tripId: string; trip: GroupTripInfo }> => {
          const state = get();
          const trips = Object.entries(state.groupBookings)
            .filter(([_, trip]) => {
              // Фильтруем только активные поездки (не отмененные)
              if (trip.status === 'cancelled') return false;
              
              // Фильтруем поездки в будущем
              const tripDate = new Date(trip.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              if (tripDate < today) return false;

              // Проверяем, есть ли еще места
              const currentParticipants = trip.participants.reduce(
                (total, p) => total + p.participantCount,
                0
              );

              return currentParticipants < trip.maxCapacity;
            })
            .map(([tripId, trip]) => ({ tripId, trip }))
            .sort((a, b) => {
              // Сортируем по дате, затем по времени
              const dateCompare = new Date(a.trip.date).getTime() - new Date(b.trip.date).getTime();
              if (dateCompare !== 0) return dateCompare;
              
              return a.trip.time.localeCompare(b.trip.time);
            });

          return trips;
        },

        getTripProgress: (tripId: string) => {
          const state = get();
          const trip = state.groupBookings[tripId];

          if (!trip) return null;

          const currentParticipants = trip.participants.reduce(
            (total, p) => total + p.participantCount,
            0
          );

          return {
            current: currentParticipants,
            required: trip.minRequired,
            isConfirmed: trip.status === 'confirmed',
          };
        },

        // Utility Actions
        resetStore: () => {
          set(
            {
              bookingType: 'private',
              privateBooking: defaultPrivateBooking,
              groupBookings: {},
            },
            false,
            'resetStore'
          );
        },

        getBookingSummary: (): BookingSummary => {
          const state = get();

          if (state.bookingType === 'private') {
            const booking = state.privateBooking;
            return {
              type: 'private',
              totalPrice: BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE,
              participants: booking.participants,
              date: booking.date || undefined,
              time: booking.time || undefined,
            };
          } else {
            // Для group booking нужно найти текущую выбранную поездку
            // Это будет реализовано в компоненте через selectedTripId
            return {
              type: 'group',
              totalPrice: 0,
              participants: 0,
            };
          }
        },
      }),
      // {
      //   name: 'booking-store',
      //   // Исключаем некоторые поля из персистентности для оптимизации
      //   partialize: (state) => ({
      //     bookingType: state.bookingType,
      //     privateBooking: state.privateBooking,
      //     groupBookings: state.groupBookings,
      //   }),
      // }
    // ),
    {
      name: 'BookingStore',
    }
  )
);

// Utility функции для работы со store
export const calculatePrice = (bookingType: BookingType, participants: number): number => {
  if (bookingType === 'private') {
    return BOOKING_CONSTANTS.PRIVATE_BOOKING.BASE_PRICE;
  } else {
    return participants * BOOKING_CONSTANTS.GROUP_BOOKING.PRICE_PER_PERSON;
  }
};

export const getBookingLimits = (bookingType: BookingType) => {
  if (bookingType === 'private') {
    return {
      min: BOOKING_CONSTANTS.PRIVATE_BOOKING.MIN_PARTICIPANTS,
      max: BOOKING_CONSTANTS.PRIVATE_BOOKING.MAX_PARTICIPANTS,
    };
  } else {
    return {
      min: 1,
      max: BOOKING_CONSTANTS.GROUP_BOOKING.MAX_SLOTS_PER_BOOKING,
    };
  }
};

// Селекторы для оптимизации ререндеров
export const useBookingType = () => useBookingStoreImpl((state) => state.bookingType);
export const usePrivateBooking = () => useBookingStoreImpl((state) => state.privateBooking);
export const useGroupBookings = () => useBookingStoreImpl((state) => state.groupBookings);
export const useBookingSummary = () => useBookingStoreImpl((state) => state.getBookingSummary());

// Экспорт основного store с инициализацией
export const useBookingStore = () => {
  const store = useBookingStoreImpl();
  
  // Принудительно устанавливаем дефолтное состояние если что-то не так
  React.useEffect(() => {
    const currentBookingType = store.bookingType;
    if (!currentBookingType || (currentBookingType !== 'private' && currentBookingType !== 'group')) {
      console.log('BookingStore: Invalid bookingType detected, resetting to private:', currentBookingType);
      store.setBookingType('private');
    }
  }, []);
  
  return store;
};
