# 🚀 Production Setup Guide

## Необходимые переменные окружения для production

### 1. База данных
```env
DATABASE_URL="postgresql://username:password@host:port/database_name"
```

### 2. NextAuth Configuration
```env
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-long-random-secret-key-here"
```

### 3. Google OAuth (если используется)
```env
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4. Stream Chat Configuration
```env
NEXT_PUBLIC_STREAM_CHAT_API_KEY="your-stream-chat-api-key"
STREAM_CHAT_API_SECRET="your-stream-chat-secret"
```

### 5. WebSocket Configuration
```env
NEXT_PUBLIC_WS_URL_PRODUCTION="wss://your-domain.com/api/group-trips/ws"
NEXT_PUBLIC_API_URL_PRODUCTION="https://your-domain.com"
```

### 6. Email Configuration (Resend)
```env
RESEND_API_KEY="re_your-resend-api-key"
FROM_EMAIL="noreply@your-domain.com"
```

### 7. Environment
```env
NODE_ENV="production"
```

## 🔧 Этапы настройки

### 1. Настройка Stream Chat

1. Зарегистрируйтесь на [getstream.io](https://getstream.io/)
2. Создайте новое Chat приложение
3. Получите API Key и Secret
4. Добавьте их в переменные окружения

### 2. Настройка базы данных

1. Разверните PostgreSQL в production
2. Запустите миграции Prisma:
   ```bash
   npx prisma migrate deploy
   ```
3. Сгенерируйте Prisma Client:
   ```bash
   npx prisma generate
   ```

### 3. Настройка домена

1. Обновите все URL с localhost на ваш домен
2. Настройте SSL сертификат
3. Убедитесь что WebSocket поддерживается

### 4. Настройка OAuth

1. Обновите redirect URLs в Google Console
2. Добавьте ваш домен в список разрешенных

## ✅ Проверка конфигурации

Используйте встроенную функцию валидации:

```typescript
import { validateProductionConfig } from '@/lib/config/websocket';

const config = validateProductionConfig();
console.log('Config valid:', config.isValid);
console.log('Errors:', config.errors);
console.log('Warnings:', config.warnings);
```

## 🚨 Критические моменты

1. **Безопасность**: Никогда не коммитьте .env файлы в Git
2. **SSL**: Обязательно используйте HTTPS для WebSocket (wss://)
3. **База данных**: Используйте connection pooling для production
4. **Мониторинг**: Настройте логирование и мониторинг ошибок

## 📱 Тестирование

После настройки обязательно протестируйте:

- ✅ Авторизация через Google
- ✅ WebSocket соединения
- ✅ Stream Chat функционал
- ✅ Создание и присоединение к групповым поездкам
- ✅ Реал-тайм обновления
- ✅ Email уведомления

## 🔍 Отладка

Если что-то не работает:

1. Проверьте логи сервера
2. Убедитесь что все переменные окружения заданы
3. Проверьте Network tab в DevTools для WebSocket соединений
4. Убедитесь что домен правильно настроен для CORS
