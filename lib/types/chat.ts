/**
 * Типы для системы интегрированного чата в групповых рыболовных поездках
 * Фаза 3: Интегрированный чат
 */

import type { StreamChat, Channel, User, Message } from 'stream-chat';
import type { 
  ChatProps, 
  ChannelHeaderProps, 
  MessageListProps, 
  MessageInputProps,
  ThreadProps 
} from 'stream-chat-react';

// Базовые типы для Stream Chat
export interface StreamChatConfig {
  apiKey: string;
  userId: string;
  userToken: string;
  userName?: string;
  userImage?: string;
}

export interface TripChatChannel {
  channelType: 'trip-chat';
  channelId: string;
  tripId: string;
  participants: string[]; // User IDs
  captain: string; // Captain User ID
  isActive: boolean;
  createdAt: Date;
}

// Специализированные типы сообщений для рыбалки
export interface FishingMessageAttachment {
  type: 'fishing-spot' | 'gear-recommendation' | 'weather-update' | 'catch-photo' | 'location';
  data: FishingSpotData | GearData | WeatherData | CatchPhotoData | LocationData;
}

export interface FishingSpotData {
  name: string;
  coordinates?: { lat: number; lng: number };
  depth?: string;
  fishSpecies: string[];
  bestTime?: string;
  notes?: string;
}

export interface GearData {
  category: 'rod' | 'reel' | 'bait' | 'lures' | 'tackle' | 'other';
  name: string;
  description?: string;
  recommended: boolean;
  price?: number;
  link?: string;
}

export interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  waveHeight?: number;
  visibility: number;
  conditions: string;
  timestamp: Date;
  isFavorable: boolean;
}

export interface CatchPhotoData {
  imageUrl: string;
  fishSpecies?: string;
  weight?: number;
  length?: number;
  location?: string;
  timestamp: Date;
}

export interface LocationData {
  name: string;
  coordinates: { lat: number; lng: number };
  type: 'meeting-point' | 'fishing-spot' | 'harbor' | 'landmark';
}

// Кастомные хуки для компонентов чата
export interface UseTripChatProps {
  tripId: string;
  userId: string;
  userToken: string;
}

export interface UseTripChatReturn {
  client: StreamChat | null;
  channel: Channel | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  participants: User[];
  sendFishingSpotMessage: (spotData: FishingSpotData) => Promise<void>;
  sendGearRecommendation: (gearData: GearData) => Promise<void>;
  sendWeatherUpdate: (weatherData: WeatherData) => Promise<void>;
  sendCatchPhoto: (photoData: CatchPhotoData) => Promise<void>;
  sendLocationShare: (locationData: LocationData) => Promise<void>;
}

// Конфигурация для рыбацких функций
export interface FishingChatFeatures {
  enableSpotSharing: boolean;
  enableGearRecommendations: boolean;
  enableWeatherUpdates: boolean;
  enableCatchPhotos: boolean;
  enableLocationSharing: boolean;
  enableCaptainOnlyFeatures: boolean;
}

export interface TripChatSystemProps {
  tripId: string;
  userId: string;
  userToken: string;
  userName?: string;
  userImage?: string;
  features?: FishingChatFeatures;
  className?: string;
  onChannelReady?: (channel: Channel) => void;
  onError?: (error: Error) => void;
}

// Расширенные типы сообщений
export interface FishingMessage extends Message {
  fishing_attachment?: FishingMessageAttachment;
  is_fishing_related?: boolean;
  fishing_category?: 'spot' | 'gear' | 'weather' | 'catch' | 'location' | 'general';
}

// Типы для кастомных компонентов
export interface FishingMessageInputProps extends MessageInputProps {
  onSendFishingSpot?: (spotData: FishingSpotData) => void;
  onSendGearRecommendation?: (gearData: GearData) => void;
  onSendWeatherUpdate?: (weatherData: WeatherData) => void;
  onSendLocationShare?: (locationData: LocationData) => void;
  features?: FishingChatFeatures;
}

export interface FishingChannelHeaderProps extends ChannelHeaderProps {
  tripTitle?: string;
  captainName?: string;
  participantsCount?: number;
  weatherInfo?: WeatherData;
}

export interface FishingThreadProps extends ThreadProps {
  fishingFeatures?: FishingChatFeatures;
}

// Конфигурация Stream Chat для рыболовных поездок  
export const DEFAULT_FISHING_FEATURES: FishingChatFeatures = {
  enableSpotSharing: true,
  enableGearRecommendations: true,
  enableWeatherUpdates: true,
  enableCatchPhotos: true,
  enableLocationSharing: true,
  enableCaptainOnlyFeatures: true,
};

export const STREAM_CHAT_CONFIG = {
  // Эти значения должны быть получены из переменных окружения
  // В реальном проекте никогда не храните API ключи в коде!
  API_KEY: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY || '',
  // Секрет должен использоваться только на сервере для генерации токенов
  API_SECRET: process.env.STREAM_CHAT_API_SECRET || '',
} as const;
