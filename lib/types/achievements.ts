/**
 * Типы для системы достижений рыболова
 * Основано на документации GamePush и лучших практиках геймификации
 */

import { 
  Achievement, 
  UserAchievement, 
  FisherProfile, 
  FisherBadge,
  AchievementType,
  AchievementRarity,
  BadgeCategory,
  FishingExperience
} from '@prisma/client';

// ============================================================================
// ОСНОВНЫЕ ИНТЕРФЕЙСЫ ДЛЯ ДОСТИЖЕНИЙ
// ============================================================================

export interface AchievementWithProgress extends Achievement {
  userProgress?: UserAchievement;
  unlocked: boolean;
  progress: number;
  progressPercent: number;
}

export interface UserAchievementFull extends UserAchievement {
  achievement: Achievement;
}

export interface FisherProfileExtended extends FisherProfile {
  user?: {
    id: string;
    name: string | null;
    image: string | null;
    email: string;
  };
  badges: FisherBadge[];
  achievements?: UserAchievementFull[];
  position?: number; // Для рейтингов
}

// ============================================================================
// КОНФИГУРАЦИЯ ДОСТИЖЕНИЙ ПО КАТЕГОРИЯМ
// ============================================================================

export interface AchievementConfig {
  type: AchievementType;
  name: string;
  description: string;
  category: BadgeCategory;
  rarity: AchievementRarity;
  icon: string;
  maxProgress: number;
  progressStep: number;
  lockedVisible: boolean;
  lockedDescVisible: boolean;
}

// Достижения по видам рыб
export const FISH_SPECIES_ACHIEVEMENTS: Record<string, AchievementConfig> = {
  TUNA_MASTER: {
    type: 'TUNA_MASTER',
    name: 'Мастер Тунца 🐠',
    description: 'Поймай 10 тунцов и стань настоящим мастером этого благородного вида',
    category: 'FISH_SPECIES',
    rarity: 'EPIC',
    icon: '🐠',
    maxProgress: 10,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
  },
  DORADO_HUNTER: {
    type: 'DORADO_HUNTER', 
    name: 'Охотник на Дорадо 🐡',
    description: 'Поймай 5 дорадо и докажи свое мастерство в ловле этой быстрой рыбы',
    category: 'FISH_SPECIES',
    rarity: 'RARE',
    icon: '🐡',
    maxProgress: 5,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
  },
  SEABASS_EXPERT: {
    type: 'SEABASS_EXPERT',
    name: 'Эксперт Морского Окуня 🐟',
    description: 'Поймай 15 морских окуней - это основа рыболовного мастерства',
    category: 'FISH_SPECIES',
    rarity: 'UNCOMMON',
    icon: '🐟',
    maxProgress: 15,
    progressStep: 5,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  MARLIN_LEGEND: {
    type: 'MARLIN_LEGEND',
    name: 'Легенда Марлина 🦈',
    description: 'Поймай марлина - это достижение для истинных профессионалов!',
    category: 'FISH_SPECIES',
    rarity: 'MYTHIC',
    icon: '🦈',
    maxProgress: 1,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
  },
  SPECIES_COLLECTOR: {
    type: 'SPECIES_COLLECTOR',
    name: 'Коллекционер Видов 🌊',
    description: 'Поймай 5 разных видов рыб и стань настоящим коллекционером',
    category: 'FISH_SPECIES',
    rarity: 'LEGENDARY',
    icon: '🌊',
    maxProgress: 5,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
  },
};

// Достижения по техникам
export const TECHNIQUE_ACHIEVEMENTS: Record<string, AchievementConfig> = {
  TROLLING_EXPERT: {
    type: 'TROLLING_EXPERT',
    name: 'Троллинг-Эксперт 🚤',
    description: 'Используй троллинг в 10 поездках и стань мастером этой техники',
    category: 'TECHNIQUE',
    rarity: 'EPIC',
    icon: '🚤',
    maxProgress: 10,
    progressStep: 2,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  JIGGING_MASTER: {
    type: 'JIGGING_MASTER',
    name: 'Джиг-Мастер 🎣',
    description: 'Освой технику джиггинга в 8 поездках',
    category: 'TECHNIQUE',
    rarity: 'RARE',
    icon: '🎣',
    maxProgress: 8,
    progressStep: 2,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  BOTTOM_FISHING_PRO: {
    type: 'BOTTOM_FISHING_PRO',
    name: 'Профи Донной Ловли ⚓',
    description: 'Используй донную ловлю в 12 поездках',
    category: 'TECHNIQUE',
    rarity: 'UNCOMMON',
    icon: '⚓',
    maxProgress: 12,
    progressStep: 3,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  FLY_FISHING_ARTIST: {
    type: 'FLY_FISHING_ARTIST',
    name: 'Художник Нахлыста 🦋',
    description: 'Освой искусство нахлыста в 6 поездках',
    category: 'TECHNIQUE',
    rarity: 'LEGENDARY',
    icon: '🦋',
    maxProgress: 6,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
  },
  TECHNIQUE_VERSATILE: {
    type: 'TECHNIQUE_VERSATILE',
    name: 'Универсал Техник 🎯',
    description: 'Используй 4 разные техники рыбалки',
    category: 'TECHNIQUE',
    rarity: 'EPIC',
    icon: '🎯',
    maxProgress: 4,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
  },
};

// Социальные достижения
export const SOCIAL_ACHIEVEMENTS: Record<string, AchievementConfig> = {
  NEWBIE_MENTOR: {
    type: 'NEWBIE_MENTOR',
    name: 'Наставник Новичков 👨‍🏫',
    description: 'Помоги 5 новичкам в их первых поездках',
    category: 'SOCIAL',
    rarity: 'EPIC',
    icon: '👨‍🏫',
    maxProgress: 5,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  GROUP_ORGANIZER: {
    type: 'GROUP_ORGANIZER',
    name: 'Организатор Групп 👥',
    description: 'Создай 10 групповых рыболовных событий',
    category: 'SOCIAL',
    rarity: 'RARE',
    icon: '👥',
    maxProgress: 10,
    progressStep: 2,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  COMMUNITY_BUILDER: {
    type: 'COMMUNITY_BUILDER',
    name: 'Строитель Сообщества 🏘️',
    description: 'Участвуй в 25 групповых поездках и стань частью сообщества',
    category: 'SOCIAL',
    rarity: 'LEGENDARY',
    icon: '🏘️',
    maxProgress: 25,
    progressStep: 5,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  REVIEW_MASTER: {
    type: 'REVIEW_MASTER',
    name: 'Мастер Отзывов ⭐',
    description: 'Оставь 20 полезных отзывов о поездках',
    category: 'SOCIAL',
    rarity: 'UNCOMMON',
    icon: '⭐',
    maxProgress: 20,
    progressStep: 5,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  RELIABLE_FISHER: {
    type: 'RELIABLE_FISHER',
    name: 'Надежный Рыболов 🤝',
    description: 'Поддерживай 100% посещаемость в 10+ поездках подряд',
    category: 'SOCIAL',
    rarity: 'EPIC',
    icon: '🤝',
    maxProgress: 10,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: false,
  },
};

// Географические достижения
export const GEOGRAPHY_ACHIEVEMENTS: Record<string, AchievementConfig> = {
  REEF_EXPLORER: {
    type: 'REEF_EXPLORER',
    name: 'Исследователь Рифов 🪸',
    description: 'Исследуй рифовые зоны в 8 поездках',
    category: 'GEOGRAPHY',
    rarity: 'RARE',
    icon: '🪸',
    maxProgress: 8,
    progressStep: 2,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  DEEP_SEA_ADVENTURER: {
    type: 'DEEP_SEA_ADVENTURER',
    name: 'Глубоководный Авантюрист 🌊',
    description: 'Соверши 12 глубоководных поездок',
    category: 'GEOGRAPHY',
    rarity: 'EPIC',
    icon: '🌊',
    maxProgress: 12,
    progressStep: 3,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  COASTAL_SPECIALIST: {
    type: 'COASTAL_SPECIALIST',
    name: 'Специалист Прибрежной Ловли 🏖️',
    description: 'Соверши 15 прибрежных рыболовных поездок',
    category: 'GEOGRAPHY',
    rarity: 'UNCOMMON',
    icon: '🏖️',
    maxProgress: 15,
    progressStep: 5,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  WORLD_TRAVELER: {
    type: 'WORLD_TRAVELER',
    name: 'Путешественник 🗺️',
    description: 'Порыбачь в 3 разных локациях',
    category: 'GEOGRAPHY',
    rarity: 'LEGENDARY',
    icon: '🗺️',
    maxProgress: 3,
    progressStep: 1,
    lockedVisible: true,
    lockedDescVisible: true,
  },
  LOCAL_EXPERT: {
    type: 'LOCAL_EXPERT',
    name: 'Местный Эксперт 🎯',
    description: 'Соверши 50 поездок в одной локации и стань местным экспертом',
    category: 'GEOGRAPHY',
    rarity: 'MYTHIC',
    icon: '🎯',
    maxProgress: 50,
    progressStep: 10,
    lockedVisible: true,
    lockedDescVisible: false,
  },
};

// Объединенный список всех достижений
export const ALL_ACHIEVEMENTS = {
  ...FISH_SPECIES_ACHIEVEMENTS,
  ...TECHNIQUE_ACHIEVEMENTS,
  ...SOCIAL_ACHIEVEMENTS,
  ...GEOGRAPHY_ACHIEVEMENTS,
};

// ============================================================================
// ИНТЕРФЕЙСЫ ДЛЯ API
// ============================================================================

export interface AchievementProgress {
  achievementType: AchievementType;
  progress: number;
  unlocked?: boolean;
}

export interface SetAchievementProgressRequest {
  userId: string;
  achievementType: AchievementType;
  progress: number;
}

export interface SetAchievementProgressResponse {
  success: boolean;
  achievement?: AchievementWithProgress;
  error?: 'user_not_found' | 'achievement_not_found' | 'already_unlocked' | 'progress_invalid';
}

export interface FetchUserAchievementsRequest {
  userId: string;
  category?: BadgeCategory;
  unlockedOnly?: boolean;
}

export interface FetchUserAchievementsResponse {
  achievements: AchievementWithProgress[];
  stats: {
    total: number;
    unlocked: number;
    progress: number; // Общий процент прогресса
  };
}

// ============================================================================
// ИНТЕРФЕЙСЫ ДЛЯ LEADERBOARD
// ============================================================================

export interface LeaderboardPlayer {
  position: number;
  userId: string;
  name: string | null;
  avatar: string | null;
  rating: number;
  level: number;
  completedTrips: number;
  totalFishCaught: number;
  achievementsCount: number;
  isAnonymous?: boolean;
}

export interface FetchLeaderboardRequest {
  orderBy: 'rating' | 'level' | 'completedTrips' | 'totalFishCaught' | 'achievementsCount';
  order: 'ASC' | 'DESC';
  limit?: number;
  showNearestTo?: string; // userId
}

export interface FetchLeaderboardResponse {
  players: LeaderboardPlayer[];
  currentUserPosition?: number;
  totalPlayers: number;
}

// ============================================================================
// СОБЫТИЯ ДЛЯ АВТОМАТИЧЕСКОГО ПРИСВОЕНИЯ ДОСТИЖЕНИЙ
// ============================================================================

export interface AchievementTrigger {
  event: 'trip_completed' | 'fish_caught' | 'technique_used' | 'review_left' | 'event_created' | 'user_helped';
  data: Record<string, any>;
  userId: string;
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

export const ACHIEVEMENT_ICONS = {
  COMMON: '🥉',
  UNCOMMON: '🥈',
  RARE: '🥇',
  EPIC: '💎',
  LEGENDARY: '👑',
  MYTHIC: '⭐',
} as const;

export const CATEGORY_ICONS = {
  FISH_SPECIES: '🐟',
  TECHNIQUE: '🎣',
  SOCIAL: '👥',
  GEOGRAPHY: '🗺️',
  ACHIEVEMENT: '🏆',
  MILESTONE: '🎯',
  SPECIAL: '⭐',
  SEASONAL: '🎃',
} as const;

export const EXPERIENCE_LEVELS = {
  BEGINNER: { min: 0, max: 999, name: 'Новичок', icon: '🌱' },
  INTERMEDIATE: { min: 1000, max: 4999, name: 'Опытный', icon: '🎯' },
  EXPERT: { min: 5000, max: Number.MAX_VALUE, name: 'Эксперт', icon: '👑' },
} as const;

// ============================================================================
// КОНФИГУРАЦИЯ КАТЕГОРИЙ И РЕДКОСТИ (ДЛЯ ИМПОРТА В КОМПОНЕНТЫ)
// ============================================================================

export const CATEGORY_CONFIG = {
  FISH_SPECIES: {
    label: 'Виды рыб',
    icon: '🐟',
    color: '#3B82F6',
    description: 'Достижения за ловлю различных видов рыб'
  },
  TECHNIQUE: {
    label: 'Техники',
    icon: '🎣',
    color: '#10B981',
    description: 'Мастерство в различных техниках рыбалки'
  },
  SOCIAL: {
    label: 'Социальные',
    icon: '👥',
    color: '#F59E0B',
    description: 'Взаимодействие с сообществом рыболовов'
  },
  GEOGRAPHY: {
    label: 'География',
    icon: '🗺️',
    color: '#EF4444',
    description: 'Исследование различных рыболовных мест'
  },
  ACHIEVEMENT: {
    label: 'Достижения',
    icon: '🏆',
    color: '#8B5CF6',
    description: 'Общие игровые достижения'
  },
  MILESTONE: {
    label: 'Вехи',
    icon: '🎯',
    color: '#06B6D4',
    description: 'Важные этапы прогресса'
  },
  SPECIAL: {
    label: 'Особые',
    icon: '⭐',
    color: '#F97316',
    description: 'Уникальные и эксклюзивные достижения'
  },
  SEASONAL: {
    label: 'Сезонные',
    icon: '🎃',
    color: '#84CC16',
    description: 'Сезонные события и достижения'
  },
} as const;

export const RARITY_CONFIG = {
  COMMON: {
    label: 'Обычное',
    icon: '🥉',
    color: '#6B7280',
    bgColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    textColor: '#374151',
    order: 1
  },
  UNCOMMON: {
    label: 'Необычное',
    icon: '🥈',
    color: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#D1FAE5',
    textColor: '#065F46',
    order: 2
  },
  RARE: {
    label: 'Редкое',
    icon: '🥇',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    textColor: '#1E40AF',
    order: 3
  },
  EPIC: {
    label: 'Эпическое',
    icon: '💎',
    color: '#8B5CF6',
    bgColor: '#F5F3FF',
    borderColor: '#E9D5FF',
    textColor: '#6B21A8',
    order: 4
  },
  LEGENDARY: {
    label: 'Легендарное',
    icon: '👑',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FED7AA',
    textColor: '#92400E',
    order: 5
  },
  MYTHIC: {
    label: 'Мифическое',
    icon: '⭐',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    textColor: '#991B1B',
    order: 6
  },
} as const;
