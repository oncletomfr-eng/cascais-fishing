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
    
    const response = await fetch(`${baseUrl}/api/email`, {
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

// 🚨 NEW: Critical error alert email - DIRECT SEND (bypasses API route for critical alerts)
export async function sendCriticalErrorAlert({
  to,
  error,
  context,
  timestamp,
  environment
}: {
  to: string;
  error: { name: string; message: string; stack?: string };
  context: any;
  timestamp: string;
  environment?: string;
}): Promise<EmailResponse> {
  
  // For critical alerts, we bypass the API route and send directly via Resend
  // This ensures alerts get sent even if the API route has issues
  
  if (!isEmailConfigured()) {
    console.error('❌ Cannot send critical alert - email not configured');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `🚨 CRITICAL ERROR - Cascais Fishing ${environment || 'Production'}`;
  
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #dc2626; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🚨 CRITICAL ERROR ALERT</h1>
        <p style="margin: 10px 0 0 0;">Cascais Fishing Platform - ${environment || 'Production'}</p>
      </div>
      
      <div style="padding: 20px; background: #f9fafb;">
        <h2 style="color: #dc2626; margin-top: 0;">Error Details</h2>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Error Type:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${error.name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Message:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${error.message}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Endpoint:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${context.endpoint || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Method:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${context.method || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">User:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${context.userId || 'Anonymous'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Timestamp:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(timestamp).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">IP Address:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${context.ip || 'Unknown'}</td>
          </tr>
        </table>
        
        ${error.stack ? `
        <h3 style="color: #dc2626;">Stack Trace</h3>
        <pre style="background: #1f2937; color: #f9fafb; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px;">${error.stack.substring(0, 1000)}${error.stack.length > 1000 ? '...' : ''}</pre>
        ` : ''}
        
        <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 5px; padding: 15px; margin-top: 20px;">
          <h3 style="color: #92400e; margin-top: 0;">⚡ Immediate Action Required</h3>
          <ul style="color: #92400e; margin: 0;">
            <li>Check Sentry dashboard for detailed context</li>
            <li>Monitor error rate and user impact</li>
            <li>Consider rolling back if this is a new deployment</li>
            <li>Verify health check endpoints: /api/admin/health</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This alert was generated automatically by Cascais Fishing Error Tracking System
          </p>
        </div>
      </div>
    </div>
  `;
  
  const textContent = `
🚨 CRITICAL ERROR ALERT - Cascais Fishing ${environment || 'Production'}

Error Details:
- Type: ${error.name}
- Message: ${error.message}
- Endpoint: ${context.endpoint || 'Unknown'}
- Method: ${context.method || 'Unknown'}
- User: ${context.userId || 'Anonymous'}
- Timestamp: ${new Date(timestamp).toLocaleString()}
- IP: ${context.ip || 'Unknown'}

${error.stack ? `Stack Trace:\n${error.stack.substring(0, 500)}${error.stack.length > 500 ? '...' : ''}` : ''}

⚡ Immediate Action Required:
- Check Sentry dashboard for detailed context
- Monitor error rate and user impact  
- Consider rolling back if this is a new deployment
- Verify health check endpoints: /api/admin/health

This alert was generated automatically by Cascais Fishing Error Tracking System.
  `;

  try {
    // Send directly via Resend for critical alerts
    const emailData = {
      from: getFromAddress(),
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      }
    };

    const result = await resend.emails.send(emailData);
    
    console.log('✅ Critical error alert email sent to:', to);
    logEmailAttempt(to, subject, 'critical-alert', true);
    
    return { success: true, id: result.data?.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Failed to send critical error alert email:', error);
    logEmailAttempt(to, subject, 'critical-alert', false, errorMessage);
    
    return { success: false, error: errorMessage };
  }
}
