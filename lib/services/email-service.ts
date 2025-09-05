import { render } from '@react-email/render';
import { resend, isEmailConfigured, validateEmail, getFromAddress, logEmailAttempt } from '../resend';
import {
  EmailTemplate,
  EmailResponse,
  SendEmailProps,
  PrivateBookingConfirmationEmailProps,
  GroupBookingConfirmationEmailProps,
  GroupTripConfirmedEmailProps,
  ParticipantApprovalNotificationEmailProps,
  BadgeAwardedNotificationEmailProps,
} from '../types/email';

// Import email templates
import {
  PrivateBookingConfirmationEmail,
  GroupBookingConfirmationEmail,
  GroupTripConfirmedEmail,
  ParticipantApprovalNotificationEmail,
  BadgeAwardedNotificationEmail,
} from '../../components/emails';

// Email subjects mapping
const EMAIL_SUBJECTS: Record<EmailTemplate, string> = {
  'private-booking-confirmation': '🎣 Your Private Fishing Charter is Confirmed!',
  'group-booking-confirmation': '🎣 You\'ve Joined the Fishing Crew!',
  'group-trip-confirmed': '🎉 Great News - Your Group Trip is Confirmed!',
  'participant-approval': '📋 Update on Your Trip Application',
  'badge-awarded': '🏆 New Achievement Unlocked!',
  'reminder': '📅 Reminder: Your Fishing Trip Tomorrow',
  'cancellation': '😔 Trip Cancellation Notice',
};

// Template renderer function
const renderEmailTemplate = async (
  template: EmailTemplate,
  data: any
): Promise<{ html: string; subject: string }> => {
  let emailComponent;
  
  switch (template) {
    case 'private-booking-confirmation':
      emailComponent = PrivateBookingConfirmationEmail(data as PrivateBookingConfirmationEmailProps);
      break;
      
    case 'group-booking-confirmation':
      emailComponent = GroupBookingConfirmationEmail(data as GroupBookingConfirmationEmailProps);
      break;
      
    case 'group-trip-confirmed':
      emailComponent = GroupTripConfirmedEmail(data as GroupTripConfirmedEmailProps);
      break;
      
    case 'participant-approval':
      emailComponent = ParticipantApprovalNotificationEmail(data as ParticipantApprovalNotificationEmailProps);
      break;
      
    case 'badge-awarded':
      emailComponent = BadgeAwardedNotificationEmail(data as BadgeAwardedNotificationEmailProps);
      break;
      
    default:
      throw new Error(`Unknown email template: ${template}`);
  }

  const html = await render(emailComponent);
  const subject = EMAIL_SUBJECTS[template];

  return { html, subject };
};

// Main email sending function
export async function sendEmail({
  template,
  to,
  data,
  subject: customSubject,
}: SendEmailProps): Promise<EmailResponse> {
  try {
    // Validate email configuration
    if (!isEmailConfigured()) {
      const error = 'Email service is not configured. Check environment variables.';
      logEmailAttempt(to, customSubject || 'Unknown', template, false, error);
      
      // В development режиме просто логируем, в production это критичная ошибка
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV MODE] Email would be sent:', { template, to, data });
        return { success: true, messageId: 'dev-mode-mock-id' };
      }
      
      return { success: false, error };
    }

    // Validate recipient email
    const emailValidation = validateEmail(to);
    if (!emailValidation.isValid) {
      const error = `Invalid recipient email: ${emailValidation.error}`;
      logEmailAttempt(to, customSubject || 'Unknown', template, false, error);
      return { success: false, error };
    }

    // Render email template
    const { html, subject } = await renderEmailTemplate(template, data);
    const finalSubject = customSubject || subject;

    // Send email via Resend
    if (!resend) {
      const error = 'Resend client is not initialized. Check API key configuration.';
      logEmailAttempt(to, finalSubject, template, false, error);
      return { success: false, error };
    }

    const response = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: finalSubject,
      html,
      replyTo: process.env.RESEND_REPLY_TO || undefined,
    });

    // Check for errors in Resend response
    if (response.error) {
      const error = `Resend API error: ${response.error.message || JSON.stringify(response.error)}`;
      logEmailAttempt(to, finalSubject, template, false, error);
      return { success: false, error };
    }

    // Success
    logEmailAttempt(to, finalSubject, template, true);
    return { 
      success: true, 
      messageId: response.data?.id 
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    logEmailAttempt(to, customSubject || 'Unknown', template, false, errorMessage);
    
    console.error('📧 Email sending failed:', error);
    return { success: false, error: errorMessage };
  }
}

// Convenience functions for specific email types
export async function sendPrivateBookingConfirmation(
  to: string,
  data: PrivateBookingConfirmationEmailProps
): Promise<EmailResponse> {
  return sendEmail({
    template: 'private-booking-confirmation',
    to,
    data,
  });
}

export async function sendGroupBookingConfirmation(
  to: string,
  data: GroupBookingConfirmationEmailProps
): Promise<EmailResponse> {
  return sendEmail({
    template: 'group-booking-confirmation',
    to,
    data,
  });
}

export async function sendGroupTripConfirmed(
  to: string,
  data: GroupTripConfirmedEmailProps
): Promise<EmailResponse> {
  return sendEmail({
    template: 'group-trip-confirmed',
    to,
    data,
  });
}

export async function sendParticipantApprovalNotification(
  to: string,
  data: ParticipantApprovalNotificationEmailProps
): Promise<EmailResponse> {
  return sendEmail({
    template: 'participant-approval',
    to,
    data,
  });
}

export async function sendBadgeAwardedNotification(
  to: string,
  data: BadgeAwardedNotificationEmailProps
): Promise<EmailResponse> {
  return sendEmail({
    template: 'badge-awarded',
    to,
    data,
  });
}

// Bulk email sending (for notifying all participants)
export async function sendBulkEmails(
  emails: SendEmailProps[]
): Promise<EmailResponse[]> {
  const results = await Promise.allSettled(
    emails.map(emailProps => sendEmail(emailProps))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const emailProps = emails[index];
      const error = `Bulk email failed: ${result.reason}`;
      logEmailAttempt(emailProps.to, 'Bulk Email', emailProps.template, false, error);
      return { success: false, error };
    }
  });
}

// Test email function (для проверки настроек)
export async function sendTestEmail(to: string): Promise<EmailResponse> {
  const testData: PrivateBookingConfirmationEmailProps = {
    customerName: 'Test Customer',
    confirmationCode: 'TEST123',
    date: '2024-12-31',
    time: '09:00',
    participants: 2,
    totalPrice: 400,
    customerPhone: '+351934027852',
  };

  return sendEmail({
    template: 'private-booking-confirmation',
    to,
    data: testData,
    subject: '🧪 Test Email - Cascais Fishing',
  });
}
