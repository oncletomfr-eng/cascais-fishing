/**
 * Конфигурация Stream Chat для системы рыболовных поездок
 * 
 * ВАЖНО: Для работы чата необходимо зарегистрироваться на https://getstream.io/
 * и получить API ключи. Затем добавить их в .env.local:
 * 
 * NEXT_PUBLIC_STREAM_CHAT_API_KEY=your_api_key_here
 * STREAM_CHAT_API_SECRET=your_api_secret_here (только для сервера!)
 */

import { StreamChat } from 'stream-chat';

// Конфигурация для разработки (demo/test данные)
export const STREAM_CHAT_CONFIG = {
  // В реальном проекте эти значения должны браться из переменных окружения
  API_KEY: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY || 'demo-key',
  API_SECRET: process.env.STREAM_CHAT_API_SECRET || 'demo-secret',
  
  // Настройки по умолчанию для рыболовных чатов
  DEFAULT_CHANNEL_TYPE: 'messaging' as const,
  CHANNEL_PREFIX: 'trip-' as const,
  
  // Таймауты и лимиты
  CONNECTION_TIMEOUT: 10000,
  MESSAGE_LIMIT: 50,
  
  // Настройки для рыболовных функций
  FEATURES: {
    ENABLE_FILE_UPLOADS: true,
    ENABLE_IMAGE_UPLOADS: true,
    ENABLE_REACTIONS: true,
    ENABLE_THREADS: true,
    ENABLE_TYPING_INDICATORS: true,
    ENABLE_READ_RECEIPTS: true,
  }
} as const;

/**
 * Создание singleton instance Stream Chat клиента
 */
export function createStreamChatClient(): StreamChat | null {
  try {
    if (!STREAM_CHAT_CONFIG.API_KEY) {
      console.warn('⚠️ Stream Chat API key not configured');
      return null;
    }

    // Используем singleton pattern для предотвращения множественных подключений
    const client = StreamChat.getInstance(STREAM_CHAT_CONFIG.API_KEY, {
      timeout: STREAM_CHAT_CONFIG.CONNECTION_TIMEOUT,
    });

    console.log('✅ Stream Chat client created');
    return client;
  } catch (error) {
    console.error('❌ Failed to create Stream Chat client:', error);
    return null;
  }
}

/**
 * Генерация ID канала для поездки
 */
export function getTripChannelId(tripId: string): string {
  return `${STREAM_CHAT_CONFIG.CHANNEL_PREFIX}${tripId}`;
}

/**
 * Генерация пользовательского токена для разработки
 * ВНИМАНИЕ: В продакшене токены должны генерироваться на сервере!
 */
export function generateDemoUserToken(userId: string): string {
  // Это заглушка для разработки
  // В реальном проекте токены генерируются на сервере с использованием API_SECRET
  return `demo-token-${userId}-${Date.now()}`;
}

/**
 * Проверка готовности Stream Chat конфигурации
 */
export function isStreamChatConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY && 
    process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY !== 'demo-key'
  );
}

/**
 * Получение инструкций по настройке Stream Chat
 */
export function getStreamChatSetupInstructions(): string {
  return `
📋 Настройка Stream Chat для рыболовных поездок:

1. Регистрация:
   • Зарегистрируйтесь на https://getstream.io/
   • Создайте новое приложение
   • Получите API Key и Secret

2. Конфигурация окружения:
   Добавьте в .env.local:
   
   NEXT_PUBLIC_STREAM_CHAT_API_KEY=your_api_key_here
   STREAM_CHAT_API_SECRET=your_api_secret_here

3. Настройка сервера:
   • API Secret используется только на сервере для генерации токенов
   • Создайте API endpoint для генерации пользовательских токенов
   • Никогда не передавайте API Secret на клиент!

4. Тестирование:
   • После настройки перезапустите сервер разработки
   • Чат система автоматически подключится к Stream Chat
   
✅ После настройки чат будет работать с реальными данными!
`;
}
