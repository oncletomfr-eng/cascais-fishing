// 🎯 Система репутации рыболова - TypeScript типы
// На основе Context7 документации по Prisma и структурированию данных

export interface CatchRecord {
  id: string;
  species: string;
  weight?: number; // кг
  length?: number; // см
  location: string;
  date: Date;
  technique: string;
  photo?: string;
  verified: boolean;
  verifiedBy?: string;
}

export interface TechniqueSkill {
  technique: string; // "троллинг", "джиг", "спиннинг" и т.д.
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  experience: number; // количество успешных рыбалок с этой техникой
  firstUsed: Date;
  lastUsed: Date;
  successRate: number; // процент успешных рыбалок
  avgCatchWeight?: number;
  specialties: string[]; // виды рыб, для которых особенно эффективен
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string; // организация-выдатель
  dateIssued: Date;
  expiryDate?: Date;
  level?: string;
  category: 'SAFETY' | 'TECHNIQUE' | 'GUIDE' | 'CAPTAIN' | 'MARINE' | 'ECOLOGY';
  verified: boolean;
  certificateNumber?: string;
  description?: string;
}

export interface FishingPreferences {
  preferredTechniques: string[];
  preferredSpecies: string[];
  preferredLocations: string[];
  preferredTimeSlots: ('EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING')[];
  preferredWeather: string[];
  groupSize: 'SOLO' | 'SMALL_GROUP' | 'LARGE_GROUP' | 'ANY';
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  equipment: 'BRING_OWN' | 'RENTAL' | 'PROVIDED' | 'FLEXIBLE';
  budget: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface SocialRatings {
  mentorRating: number; // 1-10, как учит новичков
  teamworkRating: number; // 1-10, работа в команде  
  reliabilityRating: number; // 1-10, не отменяет в последний момент
  respectRating: number; // 1-10, соблюдение правил/экологии
  totalReviews: number;
  reviewBreakdown: {
    excellent: number; // 9-10
    good: number;      // 7-8
    average: number;   // 5-6
    poor: number;      // 3-4
    terrible: number;  // 1-2
  };
}

export interface ExperienceStats {
  totalTrips: number;
  speciesCount: number; // уникальных видов поймано
  biggestCatch: CatchRecord[];
  techniques: TechniqueSkill[];
  totalFishCaught: number;
  totalWeightCaught: number; // кг
  averageTripDuration: number; // часов
  successRate: number; // процент успешных поездок
  favoriteLocations: string[];
  seasonalActivity: {
    spring: number;
    summer: number;
    autumn: number;
    winter: number;
  };
}

// Расширенный профиль рыболова согласно ТЗ пользователя
export interface FisherProfileExtended {
  id: string;
  userId: string;
  
  // Основная информация
  bio?: string;
  experienceLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  specialties: string[]; // области специализации
  
  // 🎯 Experience - опыт рыболова
  experience: ExperienceStats;
  
  // 🤝 Social - социальные рейтинги
  social: SocialRatings;
  
  // 📜 Сертификаты и достижения
  certifications: Certificate[];
  
  // ⚙️ Предпочтения
  preferences: FishingPreferences;
  
  // Статистика и метрики
  rating: number; // общий рейтинг 1-10
  level: number; // уровень опыта
  experiencePoints: number;
  activeDays: number;
  lastActiveAt: Date;
  
  // Геолокация
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  
  // Системные поля
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Вспомогательные типы для API
export interface UpdateReputationRequest {
  userId: string;
  ratings?: Partial<SocialRatings>;
  experience?: Partial<ExperienceStats>;
  newCertificate?: Omit<Certificate, 'id'>;
  preferences?: Partial<FishingPreferences>;
}

export interface ReputationSummary {
  overallRating: number;
  strongPoints: string[];
  improvementAreas: string[];
  recommendationLevel: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'NEUTRAL' | 'CAUTION';
  trustScore: number;
}
