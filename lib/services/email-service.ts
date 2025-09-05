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

// API Route approach - delegate email rendering to isolated serverless function
// This minimizes main bundle size by moving email components to dedicated API route

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

// Email sending via dedicated API route - reduces main serverless function size
async function callEmailAPI(emailData: {
  template: EmailTemplate;
  to: string;
  data: any;
  subject?: string;
}): Promise<EmailResponse> {
  try {
    // Get the base URL for API calls
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_API_URL_PRODUCTION 
      ? process.env.NEXT_PUBLIC_API_URL_PRODUCTION
      : 'http://localhost:3000';

    console.log('📧 Calling email API:', emailData.template);
    
    const response = await fetch(`${baseUrl}/api/email-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Email API error:', result);
      return { success: false, error: result.error || 'Email API call failed' };
    }

    console.log('✅ Email sent via API:', emailData.template);
    return result;
    
  } catch (error) {
    console.error('❌ Email API call failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Email API call failed' 
    };
  }
}

// Main email sending function - now uses dedicated API route
export async function sendEmail({
  template,
  to,
  data,
  subject: customSubject,
}: SendEmailProps): Promise<EmailResponse> {
  try {
    console.log('📧 Sending email via API route:', { template, to });
    
    // Call the isolated email API route
    const result = await callEmailAPI({
      template,
      to,
      data,
      subject: customSubject,
    });

    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('📧 Email sending failed:', error);
    
    // Log the attempt as failed
    logEmailAttempt(to, customSubject || 'Unknown', template, false, errorMessage);
    
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
