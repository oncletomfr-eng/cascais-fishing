# 📧 Email Setup Guide - Cascais Fishing

## 🚀 Quick Setup

### 1. Получите API ключ Resend

1. Зарегистрируйтесь на [resend.com](https://resend.com)
2. Перейдите в [API Keys](https://resend.com/api-keys)
3. Создайте новый API ключ
4. Скопируйте ключ (начинается с `re_`)

### 2. Настройте переменные окружения

Создайте файл `.env` в корне проекта со следующими переменными:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cascais_fishing"

# Resend Email Service
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="booking@cascaisfishing.com"
RESEND_FROM_NAME="Cascais Premium Fishing"
RESEND_REPLY_TO="captain@cascaisfishing.com"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Development
NODE_ENV="development"
```

### 3. Настройка домена (для продакшена)

1. В Resend добавьте ваш домен в [Domains](https://resend.com/domains)
2. Настройте DNS записи согласно инструкциям Resend
3. Обновите `RESEND_FROM_EMAIL` на реальный email с вашего домена

## 📧 Доступные email шаблоны

### 1. Private Booking Confirmation
- **Когда отправляется**: При подтверждении приватного бронирования
- **Получатель**: Клиент (если указал email)
- **Содержание**: Детали бронирования, код подтверждения, инструкции

### 2. Group Booking Confirmation
- **Когда отправляется**: При присоединении к групповой поездке
- **Получатель**: Новый участник группы
- **Содержание**: Статус группы, детали бронирования, прогресс набора

### 3. Group Trip Confirmed
- **Когда отправляется**: При достижении минимального количества участников
- **Получатели**: Все участники группы
- **Содержание**: Уведомление о подтверждении, инструкции для поездки

## 🔧 Развитие системы

### Режим разработки
- Без API ключа система работает в mock режиме
- Все email логируются в консоль
- Функционал полностью сохраняется

### Тестирование

```typescript
import { sendTestEmail } from '@/lib/services/email-service';

// Отправить тестовый email
await sendTestEmail('your-email@example.com');
```

### Настройка для production

1. **Домен**: Настройте SPF, DKIM записи
2. **Мониторинг**: Добавьте логирование в систему мониторинга
3. **Очереди**: Рассмотрите использование очередей для надежности
4. **Аналитика**: Настройте отслеживание доставляемости

## 📊 Структура Email Service

```
lib/
├── services/
│   └── email-service.ts     # Основной сервис
├── config/
│   └── email.ts            # Конфигурация
├── types/
│   └── email.ts            # TypeScript типы
└── resend.ts               # Resend клиент

components/
└── emails/
    ├── BaseEmailTemplate.tsx
    ├── PrivateBookingConfirmationEmail.tsx
    ├── GroupBookingConfirmationEmail.tsx
    └── GroupTripConfirmedEmail.tsx
```

## 🛠️ Полезные команды

### Проверка конфигурации
```bash
# Запустите Next.js и проверьте логи
npm run dev
```

### Тестирование email шаблонов
```bash
# Установите React Email CLI (опционально)
npm install -g @react-email/cli

# Запустите превью шаблонов
npx react-email preview
```

## 🐛 Troubleshooting

### Email не отправляются
1. Проверьте API ключ в переменных окружения
2. Убедитесь что домен настроен в Resend
3. Проверьте логи в консоли разработчика

### Шаблоны не рендерятся
1. Проверьте импорты компонентов
2. Убедитесь что React Email установлен
3. Проверьте синтаксис JSX в шаблонах

### DNS настройки
1. SPF: `v=spf1 include:_spf.resend.com ~all`
2. DKIM: Добавьте записи из Resend Dashboard
3. DMARC: `v=DMARC1; p=none;` (для начала)

## 💡 Рекомендации

1. **Тестируйте на разных клиентах**: Gmail, Outlook, Apple Mail
2. **Адаптивность**: Шаблоны оптимизированы для мобильных
3. **Fallback**: Система работает без email (только WhatsApp)
4. **Мониторинг**: Отслеживайте bounce rate и deliverability

---

🎣 **Happy fishing!** Если возникнут вопросы - проверьте логи или обратитесь к документации Resend.
