# 🚨 СРОЧНО: Stream Chat Production Setup

## Статус: КРИТИЧЕСКАЯ БЛОКИРУЮЩАЯ ЗАДАЧА
**Дата**: 7 января 2025  
**Приоритет**: ВЫСОКИЙ  
**Блокирует**: Полноценное использование chat системы в production

## Проблема
Stream Chat НЕ настроен в Vercel production environment. Все chat функции недоступны.

**Диагностика:**
```json
{
  "status": "unhealthy",
  "error": "b.getAppInfo is not a function",
  "configured": false,
  "environment": "production"
}
```

## Решение: Настройка Production API Keys

### 1️⃣ ПОЛУЧИТЬ STREAM CHAT API KEYS

1. **Перейдите на https://getstream.io/chat/**
2. **Создайте аккаунт или войдите в существующий**
3. **Создайте новое приложение:**
   - Name: `Cascais Fishing Platform`
   - Region: `Europe (Dublin)` или `US-East` (рекомендуется для вашего regional setup)
   
4. **Скопируйте ключи:**
   ```
   API Key: xxxxx (публичный ключ)
   API Secret: xxxxx (приватный ключ)
   ```

### 2️⃣ НАСТРОИТЬ В VERCEL

1. **Перейдите в Vercel Dashboard:**
   - https://vercel.com/oncletomfr-eng/cascais-fishing

2. **Settings → Environment Variables**

3. **Добавьте переменные:**
   ```
   NEXT_PUBLIC_STREAM_CHAT_API_KEY = your_api_key_here
   STREAM_CHAT_API_SECRET = your_api_secret_here
   ```

4. **Environment**: All Environments (Production, Preview, Development)

5. **Redeploy**: Trigger new deployment

### 3️⃣ ПРОВЕРИТЬ НАСТРОЙКУ

После redeploy проверить:
```bash
# Health Check
curl https://cascais-fishing.vercel.app/api/chat/health | jq '.status'
# Должно вернуть: "healthy"

# Connection Test  
curl https://cascais-fishing.vercel.app/api/chat/test-connection | jq '.configured'
# Должно вернуть: true
```

## Ожидаемый результат
✅ Stream Chat подключен к production  
✅ Chat система полностью функциональна  
✅ Real-time messaging доступно пользователям

## После настройки
Немедленно сообщите об успешной настройке для продолжения production hardening!

---
**Критичность**: Блокирует production использование платформы  
**ETA**: 30-60 минут на настройку
