import { z } from 'zod';
import { TimeSlot } from '@/lib/types/booking';

// Базовые схемы
export const timeSlotSchema = z.enum(['09:00', '14:00']);

export const bookingTypeSchema = z.enum(['private', 'group']);

// Utility функция для нормализации номера телефона
const normalizePhone = (phone: string): string => {
  return phone.replace(/[\s\-\(\)]/g, ''); // Убираем пробелы, тире, скобки
};

// Схема для валидации телефона
const phoneSchema = z.string()
  .min(1, 'Введите номер телефона')
  .transform(normalizePhone) // Нормализуем номер
  .refine((phone) => phone.startsWith('+'), 
    'Номер должен начинаться с + (международный формат)')
  .refine((phone) => /^\+\d{1,4}\d{6,14}$/.test(phone), 
    'Введите номер в международном формате (+код страны + номер)')
  .refine((phone) => phone.length >= 10 && phone.length <= 17, 
    'Номер должен содержать от 10 до 17 цифр включая код страны');

// Схема для контактной информации
export const contactInfoSchema = z.object({
  name: z.string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(50, 'Имя не может превышать 50 символов'),
  phone: phoneSchema,
  email: z.string()
    .email('Введите корректный email адрес')
    .optional(),
});

// Схема для Private Booking
export const privateBookingSchema = z.object({
  date: z.string()
    .min(1, 'Выберите дату')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, 'Дата не может быть в прошлом'),
  time: timeSlotSchema,
  participants: z.number()
    .min(1, 'Минимум 1 участник')
    .max(6, 'Максимум 6 участников для приватного фрахта'),
  name: z.string()
    .min(2, 'Имя должно содержать минимум 2 символа'),
  phone: phoneSchema,
  email: z.string()
    .email('Введите корректный email адрес')
    .optional(),
});

// Схема для Group Booking
export const groupBookingSchema = z.object({
  date: z.string()
    .min(1, 'Выберите дату')
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, 'Дата не может быть в прошлом'),
  time: timeSlotSchema,
  participants: z.number()
    .min(1, 'Минимум 1 участник')
    .max(3, 'Максимум 3 места за одно бронирование'),
  name: z.string()
    .min(2, 'Имя должно содержать минимум 2 символа'),
  phone: phoneSchema,
  email: z.string()
    .email('Введите корректный email адрес')
    .optional(),
  selectedTripId: z.string().optional(), // для присоединения к существующей группе
});

// Универсальная схема для выбора типа бронирования
export const bookingFormSchema = z.discriminatedUnion('bookingType', [
  z.object({
    bookingType: z.literal('private'),
    ...privateBookingSchema.shape,
  }),
  z.object({
    bookingType: z.literal('group'),
    ...groupBookingSchema.shape,
  }),
]);

// Схема для обновления группы
export const updateGroupTripSchema = z.object({
  tripId: z.string().min(1, 'Trip ID обязателен'),
  status: z.enum(['forming', 'confirmed', 'cancelled']).optional(),
  participantId: z.string().optional(),
  action: z.enum(['add', 'remove', 'update_status']),
});

// Схема для поиска доступных поездок
export const availableTripsQuerySchema = z.object({
  date: z.string().optional(),
  time: timeSlotSchema.optional(),
});

// Схема для расчета цены
export const pricingCalculationSchema = z.object({
  bookingType: bookingTypeSchema,
  participants: z.number().min(1).max(8),
});

// Функция для динамической валидации в зависимости от типа бронирования
export function getBookingSchema(bookingType: 'private' | 'group') {
  return bookingType === 'private' ? privateBookingSchema : groupBookingSchema;
}

// Типы, выводимые из схем
export type PrivateBookingFormData = z.infer<typeof privateBookingSchema>;
export type GroupBookingFormData = z.infer<typeof groupBookingSchema>;
export type BookingFormData = z.infer<typeof bookingFormSchema>;
export type UpdateGroupTripData = z.infer<typeof updateGroupTripSchema>;
export type AvailableTripsQuery = z.infer<typeof availableTripsQuerySchema>;
export type PricingCalculationData = z.infer<typeof pricingCalculationSchema>;

// Utility функция для валидации даты
export const validateBookingDate = (date: string): boolean => {
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Проверяем, что дата не в прошлом
  if (selectedDate < today) return false;
  
  // Дополнительные бизнес-правила можно добавить здесь
  // Например, проверка на выходные, праздники и т.д.
  
  return true;
};

// Utility функция для генерации trip ID
export const generateTripId = (date: string, time: TimeSlot): string => {
  const dateObj = new Date(date);
  const dateStr = dateObj.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = time.replace(':', '');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  
  return `trip_${dateStr}_${timeStr}_${randomSuffix}`;
};

// Константы для бизнес-логики
export const BOOKING_CONSTANTS = {
  PRIVATE_BOOKING: {
    BASE_PRICE: 400,
    MIN_PARTICIPANTS: 1,
    MAX_PARTICIPANTS: 6,
  },
  GROUP_BOOKING: {
    PRICE_PER_PERSON: 95,
    MIN_PARTICIPANTS_TO_CONFIRM: 6,
    MAX_CAPACITY: 8,
    MAX_SLOTS_PER_BOOKING: 3,
  },
  BUSINESS_RULES: {
    CANCELLATION_DEADLINE_HOURS: 24,
    ADVANCE_BOOKING_DAYS: 30,
  },
} as const;
