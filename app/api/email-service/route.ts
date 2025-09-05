// Isolated Email Service API Route
// This API route handles email sending with dynamic imports to minimize serverless function size

import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { resend, isEmailConfigured, validateEmail, getFromAddress, logEmailAttempt } from '../../../lib/resend';
import type { EmailTemplate } from '../../../lib/types/email';

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

// Dynamic component loader - using LOCAL components to avoid Vercel path issues
async function loadEmailComponent(template: EmailTemplate) {
  switch (template) {
    case 'private-booking-confirmation':
      const { PrivateBookingConfirmationEmail } = await import('./components/PrivateBookingConfirmationEmail');
      return PrivateBookingConfirmationEmail;
    case 'group-booking-confirmation':
      const { GroupBookingConfirmationEmail } = await import('./components/GroupBookingConfirmationEmail');
      return GroupBookingConfirmationEmail;
    case 'group-trip-confirmed':
      const { GroupTripConfirmedEmail } = await import('./components/GroupTripConfirmedEmail');
      return GroupTripConfirmedEmail;
    case 'participant-approval':
      const { ParticipantApprovalNotificationEmail } = await import('./components/ParticipantApprovalNotificationEmail');
      return ParticipantApprovalNotificationEmail;
    case 'badge-awarded':
      const { BadgeAwardedNotificationEmail } = await import('./components/BadgeAwardedNotificationEmail');
      return BadgeAwardedNotificationEmail;
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

// Isolated email rendering function
async function renderEmailTemplate(template: EmailTemplate, data: any) {
  try {
    const EmailComponent = await loadEmailComponent(template);
    const html = render(EmailComponent(data));
    const subject = EMAIL_SUBJECTS[template];
    return { html, subject };
  } catch (error) {
    console.error('❌ Email template rendering failed:', error);
    
    // Fallback HTML
    const subject = EMAIL_SUBJECTS[template];
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>${subject}</title></head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0066cc;">🎣 Cascais Fishing</h1>
          <h2>${subject}</h2>
          <p>Hello!</p>
          <p>We're processing your request. Due to a temporary technical issue, this email is being sent in simplified format.</p>
          <p>For any questions, please contact us at +351 934 027 852 or reply to this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            Template: ${template}<br>
            Error: ${error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </body>
      </html>
    `;
    return { html: fallbackHtml, subject };
  }
}

// POST endpoint for sending emails
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template, to, data, subject: customSubject } = body;

    // Validate required fields
    if (!template || !to || !data) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: template, to, data' },
        { status: 400 }
      );
    }

    // Validate email configuration
    if (!isEmailConfigured()) {
      const error = 'Email service is not configured. Check environment variables.';
      logEmailAttempt(to, customSubject || 'Unknown', template, false, error);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV MODE] Email would be sent:', { template, to, data });
        return NextResponse.json({ success: true, messageId: 'dev-mode-mock-id' });
      }
      
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    // Validate recipient email
    const emailValidation = validateEmail(to);
    if (!emailValidation.isValid) {
      const error = `Invalid recipient email: ${emailValidation.error}`;
      logEmailAttempt(to, customSubject || 'Unknown', template, false, error);
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // Render email template
    const { html, subject } = await renderEmailTemplate(template, data);
    const finalSubject = customSubject || subject;

    // Send email via Resend
    if (!resend) {
      const error = 'Resend client is not initialized. Check API key configuration.';
      logEmailAttempt(to, finalSubject, template, false, error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    const response = await resend.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: finalSubject,
      html,
      replyTo: process.env.RESEND_REPLY_TO || undefined,
    });

    if (response.error) {
      const error = `Resend API error: ${response.error.message || JSON.stringify(response.error)}`;
      logEmailAttempt(to, finalSubject, template, false, error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    // Success
    logEmailAttempt(to, finalSubject, template, true);
    return NextResponse.json({ 
      success: true, 
      messageId: response.data?.id 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('📧 Email API error:', error);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
