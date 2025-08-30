import { Resend } from 'resend';
import { ResendConfig } from '@/lib/types/email';

// Проверяем наличие переменных окружения
const requiredEnvVars = {
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  RESEND_FROM_NAME: process.env.RESEND_FROM_NAME,
};

// Проверка на отсутствующие переменные
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.warn(
    `Missing email environment variables: ${missingEnvVars.join(', ')}. ` +
    'Email functionality will be disabled.'
  );
}

// Создаем конфигурацию
export const resendConfig: ResendConfig = {
  apiKey: requiredEnvVars.RESEND_API_KEY || '',
  fromEmail: requiredEnvVars.RESEND_FROM_EMAIL || 'noreply@example.com',
  fromName: requiredEnvVars.RESEND_FROM_NAME || 'Cascais Premium Fishing',
};

// Создаем Resend клиент только если есть API ключ
export const resend = resendConfig.apiKey ? new Resend(resendConfig.apiKey) : null;

// Проверка готовности к работе
export const isEmailConfigured = (): boolean => {
  return Boolean(
    resendConfig.apiKey &&
    resendConfig.fromEmail &&
    resendConfig.fromName
  );
};

// Валидация email адреса
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true };
};

// Генерация от кого приходит письмо
export const getFromAddress = (): string => {
  return `${resendConfig.fromName} <${resendConfig.fromEmail}>`;
};

// Логирование отправки email (для development)
export const logEmailAttempt = (
  to: string, 
  subject: string, 
  template: string,
  success: boolean,
  error?: string
): void => {
  const timestamp = new Date().toISOString();
  const status = success ? '✅ SUCCESS' : '❌ FAILED';
  
  console.log(`📧 [${timestamp}] EMAIL ${status}`);
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Template: ${template}`);
  
  if (error) {
    console.log(`   Error: ${error}`);
  }
  
  if (!isEmailConfigured()) {
    console.log('   ⚠️  WARNING: Email not configured - check environment variables');
  }
};

export default resend;
