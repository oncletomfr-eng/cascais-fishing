#!/usr/bin/env node

/**
 * Скрипт проверки готовности Stripe к Production Mode
 * Использует Context7 документацию и Stripe Node.js best practices
 */

require('dotenv').config({ path: '.env.local' });
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

console.log(`${colors.blue}${colors.bright}🔍 ПРОВЕРКА ГОТОВНОСТИ STRIPE К PRODUCTION MODE${colors.reset}\n`);

let allChecks = [];
let errors = [];
let warnings = [];

// Функция для проверки
function check(name, condition, errorMsg, warningMsg = null) {
  const status = condition ? '✅' : '❌';
  const color = condition ? colors.green : colors.red;
  
  console.log(`${status} ${color}${name}${colors.reset}`);
  
  allChecks.push({ name, passed: condition });
  
  if (!condition && errorMsg) {
    errors.push(`❌ ${name}: ${errorMsg}`);
  }
  
  if (!condition && warningMsg) {
    warnings.push(`⚠️ ${name}: ${warningMsg}`);
  }
}

// Функция для информации
function info(message) {
  console.log(`${colors.blue}   ℹ️ ${message}${colors.reset}`);
}

console.log(`${colors.bright}📊 АНАЛИЗ ТЕКУЩИХ API КЛЮЧЕЙ:${colors.reset}`);

// 1. Проверка наличия ключей
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const secretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

check('Publishable Key загружен', !!publishableKey, 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY отсутствует в .env.local');
check('Secret Key загружен', !!secretKey, 'STRIPE_SECRET_KEY отсутствует в .env.local');
check('Webhook Secret загружен', !!webhookSecret, 'STRIPE_WEBHOOK_SECRET отсутствует в .env.local');

// 2. Проверка типов ключей
if (publishableKey) {
  const isLive = publishableKey.startsWith('pk_live_');
  const isTest = publishableKey.startsWith('pk_test_');
  
  if (isLive) {
    info(`LIVE Publishable Key: ${publishableKey.substring(0, 12)}...`);
  } else if (isTest) {
    info(`TEST Publishable Key: ${publishableKey.substring(0, 12)}...`);
  }
  
  check('Publishable Key формат', isLive || isTest, 
    'Publishable key должен начинаться с pk_live_ или pk_test_');
}

if (secretKey) {
  const isLive = secretKey.startsWith('sk_live_');
  const isTest = secretKey.startsWith('sk_test_');
  
  if (isLive) {
    info(`LIVE Secret Key: ${secretKey.substring(0, 12)}...`);
  } else if (isTest) {
    info(`TEST Secret Key: ${secretKey.substring(0, 12)}...`);
  }
  
  check('Secret Key формат', isLive || isTest, 
    'Secret key должен начинаться с sk_live_ или sk_test_');
}

if (webhookSecret) {
  const isValid = webhookSecret.startsWith('whsec_');
  const isPlaceholder = webhookSecret.includes('YOUR_WEBHOOK_SECRET');
  
  if (isPlaceholder) {
    info(`Webhook Secret: PLACEHOLDER (требует замены)`);
  } else if (isValid) {
    info(`Webhook Secret: ${webhookSecret.substring(0, 12)}...`);
  }
  
  check('Webhook Secret формат', isValid && !isPlaceholder, 
    'Webhook secret должен начинаться с whsec_ и не быть placeholder');
}

console.log('\n' + `${colors.bright}🎯 ПРОВЕРКА РЕЖИМА РАБОТЫ:${colors.reset}`);

// 3. Определение режима
const isProductionKeys = publishableKey?.startsWith('pk_live_') && secretKey?.startsWith('sk_live_');
const isTestKeys = publishableKey?.startsWith('pk_test_') && secretKey?.startsWith('sk_test_');
const isMixedKeys = (publishableKey?.startsWith('pk_live_') && secretKey?.startsWith('sk_test_')) ||
                   (publishableKey?.startsWith('pk_test_') && secretKey?.startsWith('sk_live_'));

if (isProductionKeys) {
  console.log(`${colors.green}${colors.bright}🚀 PRODUCTION MODE АКТИВЕН${colors.reset}`);
  info('Все ключи настроены для production');
} else if (isTestKeys) {
  console.log(`${colors.yellow}${colors.bright}🧪 TEST MODE АКТИВЕН${colors.reset}`);
  info('Все ключи настроены для тестирования');
} else if (isMixedKeys) {
  console.log(`${colors.red}${colors.bright}⚠️ СМЕШАННЫЕ КЛЮЧИ - ОШИБКА КОНФИГУРАЦИИ${colors.reset}`);
  errors.push('Обнаружены смешанные live/test ключи - это опасно!');
}

check('Режим определен корректно', !isMixedKeys, 
  'Смешанные live/test ключи недопустимы');

console.log('\n' + `${colors.bright}🔧 ПРОВЕРКА ИНТЕГРАЦИИ:${colors.reset}`);

// 4. Проверка файлов интеграции
const fs = require('fs');
const path = require('path');

const stripeLibExists = fs.existsSync(path.join(process.cwd(), 'lib/stripe.ts'));
const webhookHandlerExists = fs.existsSync(path.join(process.cwd(), 'app/api/stripe-webhooks/route.ts'));
const paymentsHandlerExists = fs.existsSync(path.join(process.cwd(), 'app/api/payments/route.ts'));

check('Stripe Library существует', stripeLibExists, 'Файл lib/stripe.ts не найден');
check('Webhook Handler существует', webhookHandlerExists, 'Файл app/api/stripe-webhooks/route.ts не найден');
check('Payments Handler существует', paymentsHandlerExists, 'Файл app/api/payments/route.ts не найден');

console.log('\n' + `${colors.bright}📈 ИТОГОВАЯ СТАТИСТИКА:${colors.reset}`);

const passedChecks = allChecks.filter(c => c.passed).length;
const totalChecks = allChecks.length;
const percentage = Math.round((passedChecks / totalChecks) * 100);

console.log(`\n${colors.bright}Пройдено проверок: ${passedChecks}/${totalChecks} (${percentage}%)${colors.reset}`);

if (percentage === 100) {
  console.log(`${colors.green}${colors.bright}🎉 ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ!${colors.reset}`);
} else if (percentage >= 80) {
  console.log(`${colors.yellow}${colors.bright}⚠️ БОЛЬШИНСТВО ПРОВЕРОК ПРОЙДЕНО${colors.reset}`);
} else {
  console.log(`${colors.red}${colors.bright}❌ ТРЕБУЕТСЯ ИСПРАВЛЕНИЕ ОШИБОК${colors.reset}`);
}

// Вывод ошибок и предупреждений
if (errors.length > 0) {
  console.log(`\n${colors.red}${colors.bright}🚨 КРИТИЧЕСКИЕ ОШИБКИ:${colors.reset}`);
  errors.forEach(error => console.log(`   ${error}`));
}

if (warnings.length > 0) {
  console.log(`\n${colors.yellow}${colors.bright}⚠️ ПРЕДУПРЕЖДЕНИЯ:${colors.reset}`);
  warnings.forEach(warning => console.log(`   ${warning}`));
}

// Рекомендации
console.log(`\n${colors.bright}💡 РЕКОМЕНДАЦИИ:${colors.reset}`);

if (isTestKeys) {
  console.log('   📋 Для перехода в production:');
  console.log('   1. Завершите бизнес-профиль в Stripe Dashboard');
  console.log('   2. Переключитесь в Live mode');
  console.log('   3. Получите live API keys');
  console.log('   4. Настройте live webhooks');
  console.log('   5. Обновите .env.local с live ключами');
  console.log(`   📖 Подробная инструкция: ${colors.blue}STRIPE_PRODUCTION_MODE_GUIDE.md${colors.reset}`);
}

if (isProductionKeys) {
  console.log('   🔒 Production режим активен:');
  console.log('   • Все платежи будут реальными');
  console.log('   • Обеспечьте безопасность ключей');
  console.log('   • Настройте мониторинг');
  console.log('   • Подготовьте процедуры refund');
}

if (webhookSecret?.includes('YOUR_WEBHOOK_SECRET')) {
  console.log('   🔗 Настройте webhook secret:');
  console.log('   1. Перейдите в Stripe Dashboard → Webhooks');
  console.log('   2. Создайте или откройте webhook endpoint');
  console.log('   3. Скопируйте signing secret');
  console.log('   4. Обновите STRIPE_WEBHOOK_SECRET в .env.local');
}

console.log(`\n${colors.bright}🎯 СЛЕДУЮЩИЕ ШАГИ:${colors.reset}`);
if (percentage < 100) {
  console.log('   1. Исправьте все критические ошибки');
  console.log('   2. Запустите проверку повторно: node scripts/check-stripe-production.js');
  console.log('   3. При 100% готовности переходите к production');
} else {
  if (isTestKeys) {
    console.log('   1. Следуйте инструкции в STRIPE_PRODUCTION_MODE_GUIDE.md');
    console.log('   2. Получите live keys из Stripe Dashboard');
    console.log('   3. Обновите .env.local');
    console.log('   4. Перезапустите этот скрипт для финальной проверки');
  } else {
    console.log('   1. ✅ Система готова к production!');
    console.log('   2. 🚀 Можно запускать коммерческие операции');
    console.log('   3. 📊 Настройте мониторинг и alerts');
  }
}

console.log(`\n${colors.blue}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.blue}${colors.bright}  CASCAIS FISHING - STRIPE PRODUCTION READINESS CHECK COMPLETE  ${colors.reset}`);
console.log(`${colors.blue}${colors.bright}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// Возвращаем код выхода для CI/CD
process.exit(percentage === 100 ? 0 : 1);
