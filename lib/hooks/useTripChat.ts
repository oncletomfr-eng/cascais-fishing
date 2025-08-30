/**
 * Кастомный хук для управления чатом в групповых рыболовных поездках
 * Интеграция с Stream Chat API и специализированные функции для рыбалки
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StreamChat, Channel, User } from 'stream-chat';
import type { 
  UseTripChatProps, 
  UseTripChatReturn, 
  FishingSpotData, 
  GearData, 
  WeatherData, 
  CatchPhotoData, 
  LocationData,
  FishingMessageAttachment 
} from '@/lib/types/chat';

/**
 * Основной хук для управления чатом поездки
 * Предоставляет подключение к Stream Chat и специализированные функции для рыбалки
 */
export function useTripChat({ 
  tripId, 
  userId, 
  userToken // Оставляем для обратной совместимости, но будем получать токен через API
}: UseTripChatProps): UseTripChatReturn {
  const [client, setClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<User[]>([]);

  // Используем ref для предотвращения повторной инициализации
  const initializationRef = useRef(false);
  
  const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY || '';

  // Инициализация Stream Chat клиента
  useEffect(() => {
    if (initializationRef.current || !apiKey || !userId) {
      return;
    }

    initializationRef.current = true;

    const initializeChat = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('🔄 Initializing Stream Chat for trip:', tripId);

        // Получаем токен через API endpoint
        let tokenData;
        try {
          const tokenResponse = await fetch('/api/chat/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
          });

          if (!tokenResponse.ok) {
            throw new Error(`Token API responded with status: ${tokenResponse.status}`);
          }

          tokenData = await tokenResponse.json();
          
          if (!tokenData.success) {
            throw new Error(tokenData.error || 'Failed to get chat token');
          }
          
          console.log('✅ Chat token obtained:', tokenData.isDemo ? 'demo' : 'real');
        } catch (tokenError) {
          console.error('❌ Failed to get chat token:', tokenError);
          
          // Fallback: используем переданный токен если API недоступен
          if (userToken) {
            console.log('🔄 Using fallback userToken');
            tokenData = { token: userToken, userId, userName: userId };
          } else {
            throw new Error('No chat token available');
          }
        }

        // Создаем singleton instance клиента
        const chatClient = StreamChat.getInstance(apiKey);

        // Подключаем пользователя с токеном
        await chatClient.connectUser(
          {
            id: userId,
            name: tokenData.userName || userId,
            image: tokenData.userImage || undefined,
          },
          tokenData.token
        );

        console.log('✅ User connected to Stream Chat');

        // Создаем или получаем канал для поездки
        const tripChannel = chatClient.channel('messaging', `trip-${tripId}`, {
          name: `Поездка ${tripId}`,
          created_by_id: userId,
          members: [userId], // В реальном проекте здесь список всех участников
        });

        // Следим за каналом
        await tripChannel.watch();

        console.log('✅ Trip channel initialized:', tripChannel.id);

        // Получаем участников канала
        const channelState = tripChannel.state;
        const channelParticipants = Object.values(channelState.members).map(member => member.user as User);

        setClient(chatClient);
        setChannel(tripChannel);
        setParticipants(channelParticipants);
        setIsConnected(true);
        setIsLoading(false);

      } catch (err) {
        console.error('❌ Error initializing trip chat:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize chat');
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup функция
    return () => {
      if (client) {
        console.log('🔄 Disconnecting Stream Chat client');
        client.disconnectUser();
      }
    };
  }, [tripId, userId, apiKey]);

  // Отправка рыбацкого места
  const sendFishingSpotMessage = useCallback(async (spotData: FishingSpotData) => {
    if (!channel) {
      throw new Error('Chat channel not initialized');
    }

    const attachment: FishingMessageAttachment = {
      type: 'fishing-spot',
      data: spotData
    };

    await channel.sendMessage({
      text: `🎣 Рекомендует место: ${spotData.name}`,
      attachments: [attachment as any],
      fishing_attachment: attachment,
      is_fishing_related: true,
      fishing_category: 'spot'
    });

    console.log('✅ Fishing spot message sent:', spotData.name);
  }, [channel]);

  // Отправка рекомендации снастей
  const sendGearRecommendation = useCallback(async (gearData: GearData) => {
    if (!channel) {
      throw new Error('Chat channel not initialized');
    }

    const attachment: FishingMessageAttachment = {
      type: 'gear-recommendation',
      data: gearData
    };

    const emoji = {
      'rod': '🎣',
      'reel': '🎣', 
      'bait': '🪱',
      'lures': '🐟',
      'tackle': '🔧',
      'other': '⚙️'
    }[gearData.category] || '⚙️';

    await channel.sendMessage({
      text: `${emoji} Рекомендует снасти: ${gearData.name}`,
      attachments: [attachment as any],
      fishing_attachment: attachment,
      is_fishing_related: true,
      fishing_category: 'gear'
    });

    console.log('✅ Gear recommendation sent:', gearData.name);
  }, [channel]);

  // Отправка обновления погоды
  const sendWeatherUpdate = useCallback(async (weatherData: WeatherData) => {
    if (!channel) {
      throw new Error('Chat channel not initialized');
    }

    const attachment: FishingMessageAttachment = {
      type: 'weather-update',
      data: weatherData
    };

    const favorableEmoji = weatherData.isFavorable ? '✅' : '⚠️';
    const weatherText = `${favorableEmoji} Погода: ${weatherData.conditions}, ${weatherData.temperature}°C, ветер ${weatherData.windSpeed} м/с`;

    await channel.sendMessage({
      text: weatherText,
      attachments: [attachment as any],
      fishing_attachment: attachment,
      is_fishing_related: true,
      fishing_category: 'weather'
    });

    console.log('✅ Weather update sent');
  }, [channel]);

  // Отправка фото улова
  const sendCatchPhoto = useCallback(async (photoData: CatchPhotoData) => {
    if (!channel) {
      throw new Error('Chat channel not initialized');
    }

    const attachment: FishingMessageAttachment = {
      type: 'catch-photo',
      data: photoData
    };

    const fishInfo = photoData.fishSpecies 
      ? ` (${photoData.fishSpecies}${photoData.weight ? `, ${photoData.weight}кг` : ''})`
      : '';

    await channel.sendMessage({
      text: `🐟 Поймал рыбу${fishInfo}!`,
      attachments: [attachment as any],
      fishing_attachment: attachment,
      is_fishing_related: true,
      fishing_category: 'catch'
    });

    console.log('✅ Catch photo sent');
  }, [channel]);

  // Отправка локации
  const sendLocationShare = useCallback(async (locationData: LocationData) => {
    if (!channel) {
      throw new Error('Chat channel not initialized');
    }

    const attachment: FishingMessageAttachment = {
      type: 'location',
      data: locationData
    };

    const locationEmoji = {
      'meeting-point': '📍',
      'fishing-spot': '🎣',
      'harbor': '⚓',
      'landmark': '🗺️'
    }[locationData.type] || '📍';

    await channel.sendMessage({
      text: `${locationEmoji} Поделился локацией: ${locationData.name}`,
      attachments: [attachment as any],
      fishing_attachment: attachment,
      is_fishing_related: true,
      fishing_category: 'location'
    });

    console.log('✅ Location shared:', locationData.name);
  }, [channel]);

  return {
    client,
    channel,
    isConnected,
    isLoading,
    error,
    participants,
    sendFishingSpotMessage,
    sendGearRecommendation,
    sendWeatherUpdate,
    sendCatchPhoto,
    sendLocationShare,
  };
}
