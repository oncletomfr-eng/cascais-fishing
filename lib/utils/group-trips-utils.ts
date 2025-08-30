import { GroupTripDisplay, ParticipantDisplay, GroupTripUpdate } from '@/lib/types/group-events';

// Список стран для генерации участников
const COUNTRIES = ['🇵🇹', '🇪🇸', '🇫🇷', '🇮🇹', '🇩🇪', '🇬🇧', '🇳🇱', '🇧🇪'];
const NAMES = [
  'João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Ferreira',
  'Carlos Oliveira', 'Sofia Rodrigues', 'Miguel Pereira', 'Isabel Martins',
  'Antonio Lopez', 'Carmen Garcia', 'José Martinez', 'Lucia Fernandez',
  'Pierre Dubois', 'Marie Leroy', 'Jean Martin', 'Sophie Bernard',
  'Marco Rossi', 'Giulia Ferrari', 'Francesco Romano', 'Elena Marino'
];

/**
 * Трансформация данных поездки из Prisma в UI формат
 */
export function transformTripToDisplay(trip: any): GroupTripDisplay {
  // Подсчитываем участников из подтвержденных бронирований
  const currentParticipants = trip.bookings?.reduce(
    (sum: number, booking: any) => sum + booking.participants, 
    0
  ) || 0;
  
  const spotsRemaining = trip.maxParticipants - currentParticipants;
  
  // Определяем статус поездки
  const status = determineDisplayStatus(
    trip.status,
    currentParticipants,
    trip.minRequired,
    spotsRemaining
  );
  
  // Определяем уровень срочности
  const urgencyLevel = determineUrgencyLevel(
    status,
    spotsRemaining,
    currentParticipants,
    trip.maxParticipants
  );
  
  // Генерируем участников для отображения
  const participants = generateParticipantsDisplay(
    trip.bookings || [],
    currentParticipants
  );
  
  // Форматируем время
  const timeDisplay = formatTimeSlot(trip.timeSlot);
  
  return {
    tripId: trip.id,
    date: typeof trip.date === 'string' ? new Date(trip.date) : trip.date,
    timeSlot: trip.timeSlot,
    timeDisplay,
    currentParticipants,
    maxParticipants: trip.maxParticipants,
    minRequired: trip.minRequired,
    spotsRemaining,
    pricePerPerson: Number(trip.pricePerPerson),
    status,
    urgencyLevel,
    participants,
    description: trip.description || `Рыбалка в море у берегов Кашкайша`,
    meetingPoint: trip.meetingPoint || 'Cascais Marina',
    specialNotes: trip.specialNotes,
    
    // 🎣 FISHING EVENT DATA
    eventType: trip.eventType || 'COMMERCIAL',
    skillLevel: trip.skillLevel || 'ANY',
    socialMode: trip.socialMode || 'COLLABORATIVE',
    fishingTechniques: trip.fishingTechniques || [],
    targetSpecies: trip.targetSpecies || [],
    equipment: trip.equipment || 'PROVIDED',
    weatherDependency: trip.weatherDependency ?? true,
    difficultyRating: trip.difficultyRating || 3,
    estimatedFishCatch: trip.estimatedFishCatch,
    maxGroupSize: trip.maxGroupSize,
    departureLocation: trip.departureLocation || trip.meetingPoint,
    fishingZones: trip.fishingZones || [],
    minimumWeatherScore: trip.minimumWeatherScore || 6,
    recommendedFor: trip.recommendedFor || [],
    approvalMode: trip.approvalMode || 'MANUAL',
    
    // Социальные данные
    socialProof: generateSocialProofText(currentParticipants, participants),
    recentActivity: generateRecentActivityText(trip.bookings || []),
    // Метаданные
    createdAt: typeof trip.createdAt === 'string' ? new Date(trip.createdAt) : trip.createdAt,
    updatedAt: typeof trip.updatedAt === 'string' ? new Date(trip.updatedAt) : trip.updatedAt
  };
}

/**
 * Определение статуса для отображения
 */
function determineDisplayStatus(
  prismaStatus: string,
  currentParticipants: number,
  minRequired: number,
  spotsRemaining: number
): GroupTripDisplay['status'] {
  // Если отменена в базе
  if (prismaStatus === 'CANCELLED') return 'cancelled';
  
  // Если подтверждена в базе  
  if (prismaStatus === 'CONFIRMED') return 'confirmed';
  
  // Если набрали минимум участников
  if (currentParticipants >= minRequired) return 'confirmed';
  
  // Если осталось мало мест
  if (spotsRemaining <= 2) return 'almost_full';
  
  // По умолчанию - формируется
  return 'forming';
}

/**
 * Определение уровня срочности
 */
function determineUrgencyLevel(
  status: GroupTripDisplay['status'],
  spotsRemaining: number,
  currentParticipants: number,
  maxParticipants: number
): GroupTripDisplay['urgencyLevel'] {
  if (status === 'cancelled') return 'low';
  if (status === 'confirmed') return 'medium';
  
  const fillRatio = currentParticipants / maxParticipants;
  
  if (spotsRemaining === 1) return 'critical';
  if (spotsRemaining <= 2) return 'high';
  if (fillRatio >= 0.5) return 'medium';
  
  return 'low';
}

/**
 * Генерация участников для отображения
 */
function generateParticipantsDisplay(
  bookings: any[],
  totalParticipants: number
): ParticipantDisplay[] {
  const participants: ParticipantDisplay[] = [];
  
  // Добавляем реальных участников из бронирований
  bookings.forEach((booking, index) => {
    for (let i = 0; i < booking.participants; i++) {
      const participantIndex = participants.length;
      
      participants.push({
        id: `${booking.id}-${i}`,
        name: i === 0 ? booking.contactName : `${booking.contactName}+${i}`,
        avatar: generateAvatar(booking.contactName),
        country: COUNTRIES[participantIndex % COUNTRIES.length],
        joinedAt: booking.createdAt || new Date(),
        isReal: true
      });
    }
  });
  
  // Дополняем демо-участниками если нужно для UI
  const demoNeeded = Math.max(0, Math.min(3, totalParticipants - participants.length));
  
  for (let i = 0; i < demoNeeded; i++) {
    const nameIndex = (participants.length + i) % NAMES.length;
    const name = NAMES[nameIndex];
    
    participants.push({
      id: `demo-${i}`,
      name,
      avatar: generateAvatar(name),
      country: COUNTRIES[(participants.length + i) % COUNTRIES.length],
      joinedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Последние 24 часа
      isReal: false
    });
  }
  
  return participants.slice(0, 5); // Максимум 5 для отображения
}

/**
 * Генерация аватара из имени
 */
function generateAvatar(name: string): string {
  const initials = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
  
  return initials;
}

/**
 * Форматирование временного слота
 */
function formatTimeSlot(timeSlot: string): string {
  const timeMap: Record<string, string> = {
    'MORNING_9AM': '09:00',
    'AFTERNOON_2PM': '14:00'
  };
  
  return timeMap[timeSlot] || timeSlot;
}

/**
 * Генерация текста социального доказательства
 */
function generateSocialProofText(
  participantCount: number,
  participants: ParticipantDisplay[]
): string {
  if (participantCount === 0) {
    return 'Будьте первым участником этой поездки!';
  }
  
  if (participantCount === 1) {
    const name = participants[0]?.name || 'Участник';
    return `${name} уже присоединился к поездке`;
  }
  
  if (participantCount === 2) {
    const names = participants.slice(0, 2).map(p => p.name.split(' ')[0]);
    return `${names.join(' и ')} уже присоединились`;
  }
  
  const visibleNames = participants.slice(0, 2).map(p => p.name.split(' ')[0]);
  const hiddenCount = participantCount - 2;
  
  return `${visibleNames.join(', ')} и еще ${hiddenCount} присоединились`;
}

/**
 * Генерация текста недавней активности
 */
function generateRecentActivityText(bookings: any[]): string {
  if (bookings.length === 0) return '';
  
  // Сортируем по дате создания
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  
  const recentCount = recentBookings.length;
  
  if (recentCount === 1) {
    return 'Новый участник присоединился недавно';
  }
  
  // Проверяем, есть ли активность за последние 24 часа
  const last24h = recentBookings.filter(booking => {
    const bookingTime = new Date(booking.createdAt).getTime();
    const now = Date.now();
    return now - bookingTime < 24 * 60 * 60 * 1000;
  });
  
  if (last24h.length > 0) {
    return `${last24h.length} участник${last24h.length > 1 ? 'а' : ''} присоединил${last24h.length > 1 ? 'ись' : 'ся'} за последние 24 часа`;
  }
  
  return `${recentCount} участника уже присоединились`;
}

/**
 * Вспомогательная функция для проверки доступности поездки
 */
export function isTripAvailable(trip: GroupTripDisplay): boolean {
  return (
    trip.status !== 'cancelled' &&
    trip.spotsRemaining > 0 &&
    new Date(trip.date) > new Date()
  );
}

/**
 * Вспомогательная функция для фильтрации поездок
 */
export function filterTrips(
  trips: GroupTripDisplay[],
  filters: {
    status?: string;
    timeSlot?: string;
    spotsLeft?: number;
    experience?: string;
  }
): GroupTripDisplay[] {
  return trips.filter(trip => {
    // Фильтр по статусу
    if (filters.status && filters.status !== 'any' && trip.status !== filters.status) {
      return false;
    }
    
    // Фильтр по времени
    if (filters.timeSlot && filters.timeSlot !== 'any') {
      const timeSlotMatch = (
        (filters.timeSlot === 'morning' && trip.timeSlot === 'MORNING_9AM') ||
        (filters.timeSlot === 'afternoon' && trip.timeSlot === 'AFTERNOON_2PM')
      );
      if (!timeSlotMatch) return false;
    }
    
    // Фильтр по количеству свободных мест
    if (filters.spotsLeft && trip.spotsRemaining > filters.spotsLeft) {
      return false;
    }
    
    // Дополнительные фильтры можно добавить здесь
    
    return true;
  });
}

/**
 * Сортировка поездок
 */
export function sortTrips(
  trips: GroupTripDisplay[],
  sortBy: 'chronological' | 'popularity' | 'almost_full'
): GroupTripDisplay[] {
  const sorted = [...trips];
  
  switch (sortBy) {
    case 'chronological':
      return sorted.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
    case 'popularity':
      return sorted.sort((a, b) => {
        const aPopularity = a.currentParticipants / a.maxParticipants;
        const bPopularity = b.currentParticipants / b.maxParticipants;
        return bPopularity - aPopularity;
      });
      
    case 'almost_full':
      return sorted.sort((a, b) => {
        const aProgress = a.currentParticipants / a.maxParticipants;
        const bProgress = b.currentParticipants / b.maxParticipants;
        return bProgress - aProgress;
      });
      
    default:
      return sorted;
  }
}

/**
 * Генерация mock данных для демонстрации
 */
export function generateMockGroupTrips(count: number = 6): GroupTripDisplay[] {
  const mockTrips: GroupTripDisplay[] = [];
  
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + Math.floor(Math.random() * 14) + 1);
    
    const timeSlot = Math.random() > 0.5 ? 'MORNING_9AM' : 'AFTERNOON_2PM';
    const currentParticipants = Math.floor(Math.random() * 7) + 1;
    const maxParticipants = 8;
    const spotsRemaining = maxParticipants - currentParticipants;
    
    let status: GroupTripDisplay['status'] = 'forming';
    if (currentParticipants >= 6) {
      status = 'confirmed';
    } else if (spotsRemaining <= 2) {
      status = 'almost_full';
    }
    
    const participants: ParticipantDisplay[] = [];
    for (let j = 0; j < Math.min(currentParticipants, 3); j++) {
      participants.push({
        id: `mock-${i}-${j}`,
        name: NAMES[j % NAMES.length],
        avatar: NAMES[j % NAMES.length].split(' ').map(n => n[0]).join(''),
        country: COUNTRIES[j % COUNTRIES.length],
        joinedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        isReal: false
      });
    }
    
    // 🎣 Generate random FishingEvent data
    const eventTypes = ['COMMERCIAL', 'TOURNAMENT', 'LEARNING', 'COMMUNITY'];
    const skillLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT', 'ANY'];
    const socialModes = ['COMPETITIVE', 'COLLABORATIVE', 'EDUCATIONAL', 'RECREATIONAL', 'FAMILY'];
    const equipmentTypes = ['PROVIDED', 'BRING_OWN', 'RENTAL_AVAILABLE', 'PARTIALLY_PROVIDED'];
    const techniques = ['TROLLING', 'JIGGING', 'BOTTOM_FISHING', 'SPINNING', 'FLY_FISHING'];
    const species = ['SEABASS', 'DORADO', 'TUNA', 'MACKEREL', 'SARDINE'];
    
    mockTrips.push({
      tripId: `mock-trip-${i}`,
      date,
      timeSlot,
      timeDisplay: timeSlot === 'MORNING_9AM' ? '09:00' : '14:00',
      currentParticipants,
      maxParticipants,
      minRequired: 6,
      spotsRemaining,
      pricePerPerson: 95,
      status,
      urgencyLevel: spotsRemaining <= 1 ? 'critical' : spotsRemaining <= 2 ? 'high' : 'medium',
      participants,
      description: `Морская рыбалка у берегов Кашкайша`,
      meetingPoint: 'Cascais Marina',
      
      // 🎣 FISHING EVENT DATA
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)] as any,
      skillLevel: skillLevels[Math.floor(Math.random() * skillLevels.length)] as any,
      socialMode: socialModes[Math.floor(Math.random() * socialModes.length)] as any,
      fishingTechniques: techniques.slice(0, Math.floor(Math.random() * 3) + 1),
      targetSpecies: species.slice(0, Math.floor(Math.random() * 3) + 1),
      equipment: equipmentTypes[Math.floor(Math.random() * equipmentTypes.length)] as any,
      weatherDependency: Math.random() > 0.3,
      difficultyRating: Math.floor(Math.random() * 5) + 1,
      estimatedFishCatch: Math.floor(Math.random() * 10) + 2,
      maxGroupSize: maxParticipants,
      departureLocation: 'Cascais Marina',
      fishingZones: ['Deep Waters', 'Coastal Area'].slice(0, Math.floor(Math.random() * 2) + 1),
      minimumWeatherScore: Math.floor(Math.random() * 4) + 5,
      recommendedFor: ['Families', 'Beginners', 'Experienced'].slice(0, Math.floor(Math.random() * 2) + 1),
      approvalMode: Math.random() > 0.5 ? 'AUTO' : 'MANUAL' as any,
      
      socialProof: generateSocialProofText(currentParticipants, participants),
      recentActivity: `${Math.floor(Math.random() * 3) + 1} участника присоединились недавно`,
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });
  }
  
  return mockTrips;
}

/**
 * Применение WebSocket обновления к поездке
 */
export function applyWebSocketUpdate(trip: GroupTripDisplay, update: GroupTripUpdate): GroupTripDisplay {
  if (trip.tripId !== update.tripId) return trip;
  
  return {
    ...trip,
    currentParticipants: update.currentParticipants,
    spotsRemaining: update.spotsRemaining || trip.spotsRemaining,
    status: update.status,
    urgencyLevel: determineUrgencyLevel(
      update.status,
      update.spotsRemaining || 0,
      update.currentParticipants,
      update.maxParticipants || trip.maxParticipants
    ),
    updatedAt: update.timestamp,
    // Обновляем social proof если есть новый участник
    socialProof: update.participantName && update.type === 'participant_joined'
      ? `${update.participantName} только что присоединился!`
      : trip.socialProof,
    recentActivity: update.type === 'participant_joined'
      ? 'Новый участник присоединился только что'
      : update.type === 'participant_left'
      ? 'Участник покинул поездку'
      : trip.recentActivity
  };
}

/**
 * Получение цвета для статуса
 */
export function getStatusColor(status: GroupTripDisplay['status']): string {
  const colors = {
    forming: '#2196F3',      // Синий
    almost_full: '#FF9800',  // Оранжевый
    confirmed: '#4CAF50',    // Зеленый
    cancelled: '#F44336'     // Красный
  };
  
  return colors[status] || colors.forming;
}

/**
 * Форматирование даты поездки
 */
export function formatTripDate(date: Date | string): string {
  if (!date) {
    return 'Дата не указана';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Неверная дата';
  }
  
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    weekday: 'short'
  }).format(dateObj);
}

/**
 * Форматирование времени поездки
 */
export function formatTripTime(timeSlot: string): string {
  const timeMap: Record<string, string> = {
    'MORNING_9AM': '09:00',
    'AFTERNOON_2PM': '14:00'
  };
  
  return timeMap[timeSlot] || timeSlot;
}

/**
 * Проверка срочности поездки
 */
export function isTripUrgent(trip: GroupTripDisplay): boolean {
  return trip.urgencyLevel === 'high' || trip.urgencyLevel === 'critical';
}