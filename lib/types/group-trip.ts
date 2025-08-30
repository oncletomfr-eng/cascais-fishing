// TypeScript типы для отображения групповых поездок на лендинге

export type UrgencyLevel = 'low' | 'medium' | 'high';
export type GroupTripStatus = 'forming' | 'almost_full' | 'confirmed';

// Основной интерфейс для отображения групповых поездок
export interface GroupTripDisplay {
  // Основная информация
  tripId: string;
  date: Date;
  timeSlot: 'morning' | 'afternoon'; // 09:00 или 14:00
  currentParticipants: number;
  maxParticipants: number;
  pricePerPerson: number;
  confirmationCode?: string;
  
  // Визуальные элементы
  participantAvatars: ParticipantAvatar[]; // Аватары участников
  progress: number; // 0-100% заполненности
  urgencyLevel: UrgencyLevel; // Основано на времени до поездки
  
  // Статусы
  status: GroupTripStatus;
  daysUntilTrip: number;
  
  // Дополнительная информация
  description?: string;
  meetingPoint?: string;
  specialNotes?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Аватар участника для социального доказательства
export interface ParticipantAvatar {
  id: string;
  initials?: string; // Инициалы если нет фото
  countryCode?: string; // Код страны для флага
  joinedAt: Date;
  participantCount: number; // Количество участников от этого booking
}

// Статистика групповых поездок для лендинга
export interface GroupTripStats {
  totalActiveTrips: number;
  totalParticipants: number;
  confirmedTrips: number;
  formingTrips: number;
  averageParticipants: number;
  countriesRepresented: number;
}

// Фильтры для поиска групповых поездок
export interface GroupTripFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  timeSlot?: 'morning' | 'afternoon';
  status?: GroupTripStatus;
  minAvailableSpots?: number;
  maxDaysAhead?: number;
}

// Опции сортировки
export type SortOption = 
  | 'date_asc' 
  | 'date_desc' 
  | 'participants_asc' 
  | 'participants_desc'
  | 'created_desc'
  | 'urgency_desc';

// Конфигурация анимаций для карточек
export interface CardAnimationConfig {
  hover: {
    scale: number;
    translateY: number;
    boxShadow: string;
  };
  entrance: {
    duration: number;
    delay: number;
    ease: string;
  };
  progress: {
    duration: number;
    ease: string;
  };
}

// Конфигурация цветов для статусов
export interface StatusColors {
  forming: string;
  almost_full: string; 
  confirmed: string;
  urgent: string;
}

// Настройки отображения компонента
export interface GroupTripsDisplayConfig {
  // Layout
  columns: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  
  // Анимации
  animations: CardAnimationConfig;
  
  // Цвета
  colors: StatusColors;
  
  // Behavioral
  maxVisibleTrips?: number;
  autoRefreshInterval?: number; // ms для real-time обновлений
  showLoadingSkeletons: boolean;
  enableVirtualization: boolean;
  
  // UX
  showEmptyState: boolean;
  enableFiltering: boolean;
  enableSorting: boolean;
  showStats: boolean;
}

// Данные для компонента загрузки (skeleton)
export interface SkeletonCardProps {
  animate?: boolean;
  className?: string;
}

// Empty state конфигурация
export interface EmptyStateConfig {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  illustration?: React.ComponentType;
}

// Real-time обновления через WebSocket
export interface GroupTripUpdate {
  type: 'participant_joined' | 'participant_left' | 'status_changed' | 'trip_confirmed';
  tripId: string;
  data: Partial<GroupTripDisplay>;
  timestamp: Date;
}

// Hook возвращаемые данные
export interface UseGroupTripsReturn {
  // Данные
  trips: GroupTripDisplay[];
  stats: GroupTripStats;
  
  // Состояние
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isEmpty: boolean;
  
  // Действия
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // Фильтры и сортировка
  filters: GroupTripFilters;
  setFilters: (filters: Partial<GroupTripFilters>) => void;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  
  // Пагинация
  hasMore: boolean;
  isLoadingMore: boolean;
}

// Utility функции
export interface GroupTripUtils {
  calculateUrgency: (daysUntil: number) => UrgencyLevel;
  generateConfirmationCode: (tripId: string) => string;
  formatTimeSlot: (timeSlot: 'morning' | 'afternoon') => string;
  getStatusColor: (status: GroupTripStatus, urgency: UrgencyLevel) => string;
  calculateProgress: (current: number, max: number) => number;
  getParticipantCountries: (participants: ParticipantAvatar[]) => string[];
}

// Props для основных компонентов
export interface GroupTripsListProps {
  config?: Partial<GroupTripsDisplayConfig>;
  filters?: Partial<GroupTripFilters>;
  className?: string;
  onTripSelect?: (trip: GroupTripDisplay) => void;
}

export interface GroupTripCardProps {
  trip: GroupTripDisplay;
  config?: CardAnimationConfig;
  onClick?: (trip: GroupTripDisplay) => void;
  showProgress?: boolean;
  showParticipants?: boolean;
  className?: string;
}

export interface ParticipantAvatarsProps {
  participants: ParticipantAvatar[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  showCountries?: boolean;
  className?: string;
}

export interface ProgressIndicatorProps {
  current: number;
  max: number;
  status: GroupTripStatus;
  urgency: UrgencyLevel;
  animated?: boolean;
  showText?: boolean;
  className?: string;
}

// API endpoints types
export interface GroupTripsAPIResponse {
  success: boolean;
  data: {
    trips: GroupTripDisplay[];
    stats: GroupTripStats;
    hasMore: boolean;
    total: number;
  };
  error?: string;
}

export interface JoinGroupTripRequest {
  tripId: string;
  participants: number;
  contactInfo: {
    name: string;
    phone: string;
    email?: string;
  };
  specialRequests?: string;
}

export interface JoinGroupTripResponse {
  success: boolean;
  data?: {
    bookingId: string;
    confirmationCode: string;
    tripStatus: GroupTripStatus;
    totalPrice: number;
    remainingSpots: number;
  };
  error?: string;
}
