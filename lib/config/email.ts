// Email configuration constants and helpers

export const EMAIL_CONFIG = {
  // Default email addresses
  DEFAULT_FROM_EMAIL: 'booking@cascaisfishing.com',
  DEFAULT_FROM_NAME: 'Cascais Premium Fishing',
  DEFAULT_REPLY_TO: 'captain@cascaisfishing.com',
  
  // Email templates configuration
  TEMPLATES: {
    PRIVATE_CONFIRMATION: {
      subject: '🎣 Your Private Fishing Charter is Confirmed!',
      preview: 'Your exclusive Atlantic fishing adventure awaits',
    },
    GROUP_CONFIRMATION: {
      subject: '🎣 You\'ve Joined the Fishing Crew!',
      preview: 'Welcome to the group fishing adventure',
    },
    GROUP_TRIP_CONFIRMED: {
      subject: '🎉 Great News - Your Group Trip is Confirmed!',
      preview: 'All crew members assembled - your trip is a go!',
    },
    REMINDER: {
      subject: '📅 Reminder: Your Fishing Trip Tomorrow',
      preview: 'Get ready for your Atlantic fishing adventure',
    },
    CANCELLATION: {
      subject: '😔 Trip Cancellation Notice',
      preview: 'Important update about your fishing trip',
    },
  },
  
  // Business information
  BUSINESS: {
    name: 'Cascais Premium Fishing',
    phone: '+351 934 027 852',
    whatsapp: '+351934027852',
    location: 'Cascais Marina, Portugal',
    website: 'https://cascaisfishing.com',
  },
  
  // Email settings
  SETTINGS: {
    // Retry attempts for failed emails
    MAX_RETRY_ATTEMPTS: 3,
    // Delay between retries (in milliseconds)
    RETRY_DELAY: 1000,
    // Maximum email recipients per bulk send
    MAX_BULK_RECIPIENTS: 50,
  },
} as const;

// Environment variables helper
export const getEmailEnvVars = () => {
  return {
    apiKey: process.env.RESEND_API_KEY || '',
    fromEmail: process.env.RESEND_FROM_EMAIL || EMAIL_CONFIG.DEFAULT_FROM_EMAIL,
    fromName: process.env.RESEND_FROM_NAME || EMAIL_CONFIG.DEFAULT_FROM_NAME,
    replyTo: process.env.RESEND_REPLY_TO || EMAIL_CONFIG.DEFAULT_REPLY_TO,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  };
};

// Check if email service is ready to use
export const isEmailServiceReady = (): boolean => {
  const { apiKey } = getEmailEnvVars();
  return Boolean(apiKey && apiKey.startsWith('re_'));
};

// Development mode check
export const isDevelopmentMode = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

// Email validation patterns
export const EMAIL_PATTERNS = {
  // Basic email validation
  BASIC: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // More strict email validation
  STRICT: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
} as const;
