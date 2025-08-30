// TypeScript интерфейсы для booking системы
export type BookingType = 'private' | 'group';

export type TripStatus = 'forming' | 'confirmed' | 'cancelled';

export type TimeSlot = '09:00' | '14:00';

export interface ContactForm {
  name: string;
  phone: string;
  email?: string;
}

export interface BookingParticipant {
  id: string;
  contactInfo: ContactForm;
  participantCount: number;
  bookedAt: Date;
}

export interface PrivateBooking {
  date: string;
  time: TimeSlot;
  participants: number; // 1-6 человек
  contactInfo: ContactForm;
}

export interface GroupTripInfo {
  date: string;
  time: TimeSlot;
  participants: BookingParticipant[];
  status: TripStatus;
  minRequired: number; // 6 человек
  maxCapacity: number; // 8 человек
  pricePerPerson: number; // €95
}

export interface GroupBookings {
  [tripId: string]: GroupTripInfo;
}

export interface BookingStore {
  // Текущий тип бронирования
  bookingType: BookingType;
  
  // Private booking (текущая логика)
  privateBooking: PrivateBooking;
  
  // Group bookings (новая логика)
  groupBookings: GroupBookings;
  
  // Actions для Private Booking
  setBookingType: (type: BookingType) => void;
  updatePrivateBooking: (booking: Partial<PrivateBooking>) => void;
  resetPrivateBooking: () => void;
  
  // Actions для Group Booking
  createGroupTrip: (date: string, time: TimeSlot) => string; // returns tripId
  addParticipantToGroup: (tripId: string, participant: Omit<BookingParticipant, 'id' | 'bookedAt'>) => boolean;
  removeParticipantFromGroup: (tripId: string, participantId: string) => void;
  updateGroupTripStatus: (tripId: string, status: TripStatus) => void;
  getAvailableGroupTrips: () => Array<{ tripId: string; trip: GroupTripInfo }>;
  getTripProgress: (tripId: string) => { current: number; required: number; isConfirmed: boolean } | null;
  
  // Utility actions
  resetStore: () => void;
  getBookingSummary: () => BookingSummary;
}

export interface BookingSummary {
  type: BookingType;
  totalPrice: number;
  participants: number;
  date?: string;
  time?: TimeSlot;
  tripId?: string;
  status?: TripStatus;
}

// Pricing logic types
export interface PricingCalculation {
  total: number;
  perPerson: number;
  type: BookingType;
  participants: number;
}

// Form validation types для React Hook Form
export interface PrivateBookingFormData {
  date: string;
  time: TimeSlot;
  participants: number;
  name: string;
  phone: string;
  email?: string;
}

export interface GroupBookingFormData {
  date: string;
  time: TimeSlot;
  participants: number; // максимум 3 места за раз
  name: string;
  phone: string;
  email?: string;
  selectedTripId?: string; // для присоединения к существующей группе
}

// Server Action response types
export interface BookingResponse {
  success: boolean;
  tripId?: string;
  status?: TripStatus;
  message: string;
  data?: {
    bookingId: string;
    confirmationCode: string;
    totalPrice: number;
  };
  errors?: Record<string, string[]>;
}

// Notification types
export interface NotificationData {
  type: 'booking_created' | 'trip_confirmed' | 'trip_cancelled' | 'reminder';
  recipientPhone: string;
  recipientEmail?: string;
  message: string;
  tripId: string;
  bookingData?: BookingSummary;
}
