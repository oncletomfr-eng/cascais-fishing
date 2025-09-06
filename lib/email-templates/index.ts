// Email templates index - exports all template functions
// Simple HTML templates optimized for email clients

// Common utilities and styles
export { 
  emailStyles, 
  companyInfo, 
  formatCurrency, 
  formatDate, 
  baseEmailTemplate 
} from './common';

// Booking confirmation templates
export { 
  privateBookingConfirmationTemplate,
  groupBookingConfirmationTemplate,
  groupTripConfirmedTemplate,
  type BookingConfirmationData
} from './booking-confirmation';

// Cancellation templates
export { 
  tripCancellationTemplate,
  customerCancellationConfirmationTemplate,
  weatherCancellationTemplate,
  type CancellationData
} from './cancellation';

// Payment templates
export { 
  paymentConfirmationTemplate,
  paymentFailedTemplate,
  refundConfirmationTemplate,
  type PaymentData
} from './payment';

// Import template functions for registry
import { baseEmailTemplate as _baseEmailTemplate, companyInfo as _companyInfo } from './common';
import { 
  privateBookingConfirmationTemplate as _privateBookingConfirmationTemplate,
  groupBookingConfirmationTemplate as _groupBookingConfirmationTemplate,
  groupTripConfirmedTemplate as _groupTripConfirmedTemplate
} from './booking-confirmation';

import {
  tripCancellationTemplate as _tripCancellationTemplate,
  customerCancellationConfirmationTemplate as _customerCancellationConfirmationTemplate,
  weatherCancellationTemplate as _weatherCancellationTemplate
} from './cancellation';

import {
  paymentConfirmationTemplate as _paymentConfirmationTemplate,
  paymentFailedTemplate as _paymentFailedTemplate,
  refundConfirmationTemplate as _refundConfirmationTemplate
} from './payment';

// Template registry for easy lookup
export const EMAIL_TEMPLATES = {
  // Booking templates
  'private-booking-confirmation': _privateBookingConfirmationTemplate,
  'group-booking-confirmation': _groupBookingConfirmationTemplate,
  'group-trip-confirmed': _groupTripConfirmedTemplate,
  
  // Cancellation templates
  'trip-cancellation': _tripCancellationTemplate,
  'customer-cancellation-confirmation': _customerCancellationConfirmationTemplate,
  'weather-cancellation': _weatherCancellationTemplate,
  
  // Payment templates
  'payment-confirmation': _paymentConfirmationTemplate,
  'payment-failed': _paymentFailedTemplate,
  'refund-confirmation': _refundConfirmationTemplate,
  
  // Test template (simple)
  'test-email': (data: any) => _baseEmailTemplate(`
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="margin: 0; font-size: 24px; font-weight: bold;">🧪 Test Email - Cascais Fishing</h1>
    </div>
    <div style="padding: 30px 20px;">
      <p>This is a test email to verify the email system is working.</p>
      <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <strong>✅ Email system is operational!</strong><br/>
        Timestamp: ${new Date().toISOString()}<br/>
        Template: ${data.template || 'test-email'}
      </div>
      <p>If you received this, email configuration is working correctly.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b;">
      <strong>${_companyInfo.name}</strong><br/>
      ${_companyInfo.address}<br/>
      📞 ${_companyInfo.phone} | 📧 ${_companyInfo.email}
    </div>
  `, '🧪 Test Email - Cascais Fishing')
} as const;

// Template type for better type safety
export type EmailTemplateName = keyof typeof EMAIL_TEMPLATES;

// Helper function to get template by name
export const getEmailTemplate = (templateName: EmailTemplateName) => {
  return EMAIL_TEMPLATES[templateName];
};

// Validate template exists
export const isValidTemplateName = (name: string): name is EmailTemplateName => {
  return name in EMAIL_TEMPLATES;
};

// Get all available template names
export const getAvailableTemplates = (): EmailTemplateName[] => {
  return Object.keys(EMAIL_TEMPLATES) as EmailTemplateName[];
};
