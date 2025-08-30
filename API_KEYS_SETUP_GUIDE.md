# 🔑 ПОЛНАЯ ИНСТРУКЦИЯ ПО ПОЛУЧЕНИЮ PRODUCTION API КЛЮЧЕЙ

**Дата:** 28 августа 2025  
**Цель:** Получить все необходимые production API ключи для Cascais Fishing

---

## 📧 **1. RESEND API KEY - ДЛЯ EMAIL** (Приоритет 1)

### **Текущий статус:**
```env
RESEND_API_KEY=your-resend-api-key  # PLACEHOLDER!
```

### **Шаги получения:**

1. **Регистрация на Resend**
   ```
   https://resend.com/
   ```
   - Нажать "Sign Up"
   - Использовать ваш email или GitHub account

2. **Создать API ключ**
   - Войти в Dashboard → Settings → API Keys
   - Нажать "Create API Key"
   - Название: `cascais-fishing-production`
   - Права: Full access
   - **Скопировать ключ** (показывается только один раз!)

3. **Верификация домена (Важно!)**
   - Settings → Domains
   - Добавить ваш домен (например: `cascaisfishing.com`)
   - Добавить DNS записи в домен:
     ```
     TXT record: v=spf1 include:_spf.resend.com ~all
     CNAME record: resend._domainkey → resend._domainkey.resend.com
     ```

4. **Обновить .env.local:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxx  # РЕАЛЬНЫЙ КЛЮЧ
   ```

**💰 Стоимость:** Бесплатно до 3000 emails/месяц, потом $20/месяц

---

## 🌦️ **2. OPENWEATHERMAP API - ДЛЯ ПОГОДЫ** (Приоритет 1)

### **Шаги получения:**

1. **Регистрация**
   ```
   https://openweathermap.org/api
   ```
   - Sign Up → Free plan

2. **Получить API ключ**
   - Dashboard → API keys
   - Default API key уже создан
   - **Скопировать ключ**

3. **Активация ключа**
   - ⚠️ **ВАЖНО:** Ключ активируется 1-2 часа после регистрации
   - Тестировать: `http://api.openweathermap.org/data/2.5/weather?q=Cascais,PT&appid=YOUR_KEY`

4. **Добавить в .env.local:**
   ```env
   OPENWEATHERMAP_API_KEY=xxxxxxxxxxxxxxxxx
   ```

**💰 Стоимость:** Бесплатно до 60 запросов/минуту

---

## 🚀 **3. NASA API - ДЛЯ АСТРОНОМИИ** (Приоритет 2)

### **Шаги получения:**

1. **Регистрация**
   ```
   https://api.nasa.gov/
   ```
   - Generate API Key
   - Указать email и приложение

2. **Получить ключ**
   - API ключ приходит на email
   - Rate limit: 1000 requests/hour

3. **Добавить в .env.local:**
   ```env
   NASA_API_KEY=xxxxxxxxxxxxxxxxx
   ```

**💰 Стоимость:** Бесплатно

---

## 💳 **4. STRIPE PRODUCTION KEYS** (Приоритет 1)

### **Текущий статус:**
```env
# СЕЙЧАС TEST КЛЮЧИ:
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### **Шаги для Production:**

1. **Войти в Stripe Dashboard**
   ```
   https://dashboard.stripe.com/
   ```

2. **Переключиться в Live Mode**
   - Toggle в левом верхнем углу: "Test" → "Live"

3. **Активировать аккаунт**
   - Settings → Account details
   - Заполнить информацию о бизнесе
   - Загрузить документы (может потребоваться)

4. **Получить Live ключи**
   - Developers → API keys (в Live mode)
   - **Скопировать:**
     - Publishable key (`pk_live_...`)
     - Secret key (`sk_live_...`)

5. **Обновить .env.local:**
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
   ```

6. **Настроить Webhooks**
   - Developers → Webhooks
   - Add endpoint: `https://yourdomain.com/api/stripe-webhooks`
   - Events: payment_intent.succeeded, payment_intent.payment_failed
   - **Скопировать Webhook secret**
   
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx
   ```

**💰 Стоимость:** 2.9% + €0.25 за транзакцию

---

## 🌊 **5. ДОПОЛНИТЕЛЬНЫЕ API (Опционально)**

### **NOAA Tides API (Бесплатно)**
```
https://tidesandcurrents.noaa.gov/api/
```
- Регистрация не нужна
- Добавить в .env.local:
  ```env
  NOAA_TIDES_API_URL=https://tidesandcurrents.noaa.gov/api/
  ```

### **Marine Traffic API (Платно)**
```
https://www.marinetraffic.com/en/ais-api-services
```
- Для tracking судов
- $50+/месяц

---

## 🔧 **ИТОГОВЫЙ .env.local ДЛЯ PRODUCTION**

```env
# Database
DATABASE_URL="postgresql://user:password@your-db-host:5432/cascais_fishing_db"

# Stream Chat (УЖЕ НАСТРОЕН)
NEXT_PUBLIC_STREAM_CHAT_API_KEY=8k83mgjc5mtt
STREAM_CHAT_API_SECRET=nx3f8rrnyhv68w9y64yj2k8jrqxrhhrmnchpr2uuxu94nbd7799qxdu95gnv2u4u

# Stripe PRODUCTION KEYS
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx

# Email Service
RESEND_API_KEY=re_xxxxxxxxxx

# Weather APIs
OPENWEATHERMAP_API_KEY=xxxxxxxxxx
NASA_API_KEY=xxxxxxxxxx
NOAA_TIDES_API_URL=https://tidesandcurrents.noaa.gov/api/

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secure-secret-for-production

# Google OAuth (УЖЕ НАСТРОЕН)
GOOGLE_CLIENT_ID=268443624329-0tningcfnejjev0fngg1uh9pct123hpp.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# OpenAI (УЖЕ НАСТРОЕН)
OPENAI_API_KEY=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

# Production URLs
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_ENABLE_DEBUG=false
```

---

## ⏱️ **ПЛАН ДЕЙСТВИЙ**

### **Сегодня (30 минут):**
1. ✅ Зарегистрироваться на Resend
2. ✅ Получить OpenWeatherMap API ключ
3. ✅ Получить NASA API ключ

### **На этой неделе (2 часа):**
4. ✅ Активировать Stripe Live mode
5. ✅ Настроить домен для email
6. ✅ Обновить все .env переменные

### **В течение месяца:**
7. ✅ Настроить production домен
8. ✅ SSL сертификаты
9. ✅ Monitoring системы

---

## 🎯 **РЕЗУЛЬТАТ**

После получения всех ключей проект будет **100% готов к production** с полной функциональностью:
- ✅ Email уведомления работают
- ✅ Погодные данные актуальные  
- ✅ Платежи обрабатываются автоматически
- ✅ Все интеграции активны

**Общая стоимость:** ~$30-50/месяц для небольшого проекта
