# 🚀 Stream Chat Setup для Cascais Fishing

## Настройка встроенного чата для групповых поездок

### 📋 Требуемые переменные окружения

Добавьте следующие переменные в файл `.env.local`:

```bash
# Stream Chat Configuration
NEXT_PUBLIC_STREAM_API_KEY="your_stream_api_key_here"
STREAM_SECRET_KEY="your_stream_secret_key_here"
```

### 🔑 Получение Stream Chat ключей

1. **Зарегистрируйтесь на Stream**
   - Перейдите на [Stream.io](https://getstream.io/)
   - Создайте бесплатный аккаунт
   - Подтвердите email

2. **Создайте Chat приложение**
   - В Stream Dashboard создайте новое приложение
   - Выберите тип "Chat"
   - Выберите регион (Europe для Португалии)

3. **Получите API ключи**
   - В настройках приложения найдите:
     - `API Key` → используйте как `NEXT_PUBLIC_STREAM_API_KEY`
     - `Secret Key` → используйте как `STREAM_SECRET_KEY`

4. **Настройте разрешения**
   - Permissions → Allow user creation: ON
   - Permissions → Allow channel creation: ON
   - Authentication → Disable Auth checks: OFF (для продакшена)

### ⚙️ Настройка проекта

1. **Обновите .env.local**
```bash
# Stream Chat Configuration
NEXT_PUBLIC_STREAM_API_KEY="YOUR_ACTUAL_API_KEY"
STREAM_SECRET_KEY="YOUR_ACTUAL_SECRET_KEY"
```

2. **Перезапустите сервер**
```bash
npm run dev
```

3. **Откройте демо страницу**
```
http://localhost:3000/chat-demo
```

### 🎯 Архитектура чата

```
Пользователь → [Авторизация] → [Stream Token API] → [Chat Client]
                                                    ↓
Групповая поездка → [Channel Creation API] → [Trip Channel]
```

### 📝 API Endpoints

- `POST /api/chat/token` - Генерация токена для пользователя
- `POST /api/chat/channels` - Создание/присоединение к каналу поездки
- `GET /api/chat/channels` - Список активных каналов пользователя

### 🔧 Функции чата

#### ✅ Реализованные функции:
- 🔐 **Аутентификация** через NextAuth + Stream tokens
- 👥 **Групповые каналы** для каждой поездки
- 💬 **Реал-тайм сообщения** с типингом и реакциями
- 📱 **Responsive UI** с минимизацией/разворачиванием
- 🔔 **Уведомления** и счетчики непрочитанных
- 🎣 **Trip-специфичные** метаданные (дата, время, место встречи)

#### 🚀 Дополнительные возможности:
- 📷 Отправка изображений улова
- 📍 Геолокация точек рыбалки
- 🌤️ Интеграция погодных данных
- 📊 Статистика активности чата

### 🧪 Тестирование

1. **Войдите в систему** (Google OAuth или демо аккаунт)
2. **Откройте /chat-demo** для просмотра поездок
3. **Нажмите "Чат"** на подтвержденной поездке
4. **Протестируйте** отправку сообщений
5. **Проверьте** работу в нескольких вкладках

### 🔍 Отладка

```bash
# Проверка подключения Stream Chat
console.log('Stream API Key:', process.env.NEXT_PUBLIC_STREAM_API_KEY)

# Логи в браузере DevTools:
# ✅ Stream Chat client initialized successfully
# 🚢 Joining trip channel: demo-trip-1
# 🔑 Generating Stream Chat token for user: user-id
```

### 📊 Мониторинг

- **Stream Dashboard**: Просмотр активных пользователей и каналов
- **Browser DevTools**: Логи инициализации и ошибок
- **Network Tab**: API вызовы токенов и каналов

### 🎨 Кастомизация UI

Stream Chat компоненты легко кастомизируются:

```tsx
// Кастомный компонент сообщения
<WithComponents overrides={{ Message: CustomTripMessage }}>
  <MessageList />
</WithComponents>

// Кастомная тема
import 'stream-chat-react/dist/css/v2/index.css';
```

### 🔒 Безопасность

- ✅ Токены генерируются на сервере
- ✅ Проверка участия в поездке перед доступом к чату
- ✅ Автоматический клиринг токенов при logout
- ✅ Rate limiting на API endpoints

### 📈 Производительность

- ⚡ Lazy loading чат компонентов
- 🔄 Автоматический реконнект при потере соединения
- 💾 Локальное кеширование сообщений
- 🎯 Оптимизированные WebSocket соединения