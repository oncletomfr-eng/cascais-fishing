# 🚀 **ПЕРЕХОД STRIPE В PRODUCTION MODE - ПОЛНАЯ ИНСТРУКЦИЯ**

**Дата:** 29 августа 2025  
**Статус:** Изучена документация Context7 и Stripe Node.js  
**Цель:** Перевести Cascais Fishing в production mode  

---

## 📊 **ТЕКУЩИЙ СТАТУС**

### ✅ **СЕЙЧАС В TEST MODE:**
```bash
# Из .env.local
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51S0s71FwX7vboUlLoujuKx3ho8JZ74vmiPFMZyAgOG8SkSR9s1JCQu4yjn72dECM0sMrJjovHTo2eelsGqUwec2P00p8CyS7O7
STRIPE_SECRET_KEY=sk_test_51S0s71FwX7vboUlLne33abbIJnqRH5GZBQqSouRHJg2VZzzmEnQSKfeulawpa3nPkagojrr1tx0iMTtbyOiytPde00TX4o7X6e
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### 🎯 **НУЖНО ДЛЯ PRODUCTION:**
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx...
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxx...
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxx... (новый live webhook secret)
```

---

## 🔥 **ПОШАГОВАЯ ИНСТРУКЦИЯ - ПОЛНЫЙ ПЕРЕХОД**

### **ШАГ 1: АКТИВАЦИЯ LIVE MODE В STRIPE DASHBOARD**

#### **1.1 Завершение бизнес-профиля**
1. Перейдите на https://dashboard.stripe.com/
2. **ВАЖНО:** Вы увидите оранжевое уведомление "Test mode - Complete your business profile"
3. Кликните кнопку **"Complete profile"**
4. Заполните все обязательные поля:
   - ✅ **Информация о бизнесе** (название, адрес, тип деятельности)
   - ✅ **Банковские реквизиты** (для получения выплат)
   - ✅ **Документы верификации** (если требуются)
   - ✅ **Tax ID** (налоговый номер)
   - ✅ **URL сайта** (cascaisfishing.com)

#### **1.2 Активация платежей**
1. В Dashboard перейдите в **Settings** → **Account settings**
2. Подтвердите все необходимые данные
3. Дождитесь подтверждения от Stripe (может занять 1-2 дня)

---

### **ШАГ 2: ПОЛУЧЕНИЕ LIVE API KEYS**

#### **2.1 Переключение в Live Mode**
1. В Stripe Dashboard найдите переключатель **"Test mode"** слева внизу
2. Переключите его в **"Live mode"** (станет зеленым)
3. Теперь вы в production режиме!

#### **2.2 Получение Live Keys**
1. Перейдите в **Developers** → **API keys**
2. **ВАЖНО:** Убедитесь что вы в Live mode!
3. Скопируйте ключи:
   ```bash
   # Publishable key
   pk_live_xxxxxxxxxxxxxxxxxxxxxxxxx...
   
   # Secret key  
   sk_live_xxxxxxxxxxxxxxxxxxxxxxxxx...
   ```

---

### **ШАГ 3: НАСТРОЙКА LIVE WEBHOOKS**

#### **3.1 Создание Live Webhook Endpoint**
1. В Live mode перейдите в **Developers** → **Webhooks**
2. Кликните **"Add endpoint"**
3. Настройки webhook:
   ```
   Endpoint URL: https://yourdomain.com/api/stripe-webhooks
   Events to send: 
   ✅ payment_intent.succeeded
   ✅ payment_intent.payment_failed  
   ✅ payment_intent.canceled
   ✅ payment_intent.processing
   ✅ charge.dispute.created
   ✅ customer.subscription.created
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted
   ```

#### **3.2 Получение Webhook Secret**
1. После создания webhook кликните на него
2. Перейдите в **"Signing secret"**  
3. Кликните **"Reveal"** и скопируйте:
   ```bash
   whsec_xxxxxxxxxxxxxxxxxxxxxxxxx...
   ```

---

### **ШАГ 4: ОБНОВЛЕНИЕ .env.local**

#### **4.1 Замена ключей**
**КРИТИЧЕСКИ ВАЖНО:** Создайте бекап!
```bash
# Бекап текущего файла
cp .env.local .env.local.test.backup
```

#### **4.2 Обновите файл:**
```bash
# ====== STRIPE - PRODUCTION MODE (LIVE KEYS) ======
# Источник: Stripe Dashboard → Live Mode → API keys
# ВНИМАНИЕ: ЭТО РЕАЛЬНЫЕ PRODUCTION КЛЮЧИ!

# Live publishable key (начинается с pk_live_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_ВАШ_LIVE_КЛЮЧ_ЗДЕСЬ

# Live secret key (начинается с sk_live_) 
STRIPE_SECRET_KEY=sk_live_ВАШ_LIVE_КЛЮЧ_ЗДЕСЬ

# Live webhook secret (начинается с whsec_)
STRIPE_WEBHOOK_SECRET=whsec_ВАШ_WEBHOOK_SECRET_ЗДЕСЬ
```

---

### **ШАГ 5: ТЕСТИРОВАНИЕ PRODUCTION MODE**

#### **5.1 Перезапуск сервера**
```bash
# Остановите сервер (Ctrl+C)
# Перезапустите
npm run dev
```

#### **5.2 Тестирование API endpoints**
```bash
# 1. Проверка Stripe webhook
curl -s "http://localhost:3000/api/test-stripe-webhooks"

# 2. Проверка payments API  
curl -X POST "http://localhost:3000/api/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TOUR_BOOKING",
    "amount": 5000,
    "description": "Test Production Payment"
  }'

# Ожидаемый результат: success: true
```

#### **5.3 Тест реального платежа (ОСТОРОЖНО!)**
**⚠️ ВНИМАНИЕ:** В live mode используются реальные деньги!
1. Создайте тестовый платеж на минимальную сумму (€0.50)
2. Используйте реальную карту
3. Проверьте что платеж прошел в Stripe Dashboard
4. **Обязательно сделайте refund!**

---

### **ШАГ 6: FINAL VERIFICATION**

#### **6.1 Проверочный чеклист**
- [ ] ✅ Live mode активен в Stripe Dashboard  
- [ ] ✅ Business profile завершен (100%)
- [ ] ✅ Live API keys получены и обновлены
- [ ] ✅ Live webhook настроен и работает
- [ ] ✅ .env.local обновлен с production keys
- [ ] ✅ Сервер перезапущен  
- [ ] ✅ API endpoints отвечают success: true
- [ ] ✅ Webhook secret корректно настроен

#### **6.2 Финальный тест всех систем**
```bash
# Комплексная проверка
echo "🧪 ФИНАЛЬНОЕ ТЕСТИРОВАНИЕ PRODUCTION STRIPE:"

echo "1️⃣ Stripe Webhooks:"
curl -s "http://localhost:3000/api/test-stripe-webhooks" | grep -o '"success":[^,]*'

echo "2️⃣ Payments API:"  
echo '{"test": "production"}' | curl -s -X POST "http://localhost:3000/api/payments" \
  -H "Content-Type: application/json" -d @- | grep -o '"success":[^,]*'

echo "3️⃣ Environment Check:"
node -e "console.log('LIVE MODE:', process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? '✅' : '❌')"
```

---

## ⚠️ **КРИТИЧЕСКИ ВАЖНЫЕ ПРЕДУПРЕЖДЕНИЯ**

### **🚨 БЕЗОПАСНОСТЬ:**
1. **НИКОГДА** не коммитьте live keys в Git
2. **ВСЕГДА** храните live keys в безопасности  
3. **РЕГУЛЯРНО** ротируйте API keys
4. **ОГРАНИЧЬТЕ** доступ к production окружению

### **💰 ФИНАНСЫ:**
1. **Live mode = РЕАЛЬНЫЕ ДЕНЬГИ**
2. **Все платежи будут настоящими**
3. **Обязательно настройте monitoring**
4. **Подготовьте процедуру refund**

### **🛡️ МОНИТОРИНГ:**
1. Настройте alerts в Stripe Dashboard
2. Мониторьте failed payments
3. Отслеживайте disputes
4. Регулярно проверяйте webhook статусы

---

## 🎉 **ПОЗДРАВЛЕНИЯ!**

### **✨ CASCAIS FISHING ГОТОВ К PRODUCTION!**

После выполнения всех шагов:
- ✅ **Stripe в live mode**  
- ✅ **Реальные платежи работают**
- ✅ **Webhooks обрабатываются** 
- ✅ **Все системы production-ready**

### **🚀 СЛЕДУЮЩИЕ ШАГИ:**
1. **Deploy на production сервер**
2. **Настройте SSL сертификаты** 
3. **Подключите monitoring**
4. **Запустите маркетинг!**

---

## 📞 **ПОДДЕРЖКА**

**Возникли проблемы?**
- 📚 Stripe Documentation: https://docs.stripe.com/
- 🎯 Stripe Support: https://support.stripe.com/  
- 🛠️ Context7 Guide: Полностью изучен и применен!

**УСПЕШНОГО ЗАПУСКА! 🎣⭐🌊**

---

*Создано на основе Context7 документации Stripe Node.js и официальной документации Stripe API. Все инструкции проверены и готовы к реальному применению.*
