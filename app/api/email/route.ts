// Minimal email endpoint with React Email components
import { NextRequest, NextResponse } from 'next/server';
import { resend, isEmailConfigured, getFromAddress, validateEmail, logEmailAttempt } from '@/lib/resend';
import { render } from '@react-email/components';
import * as React from 'react';

// Import React Email Templates
import { PrivateBookingConfirmationEmail } from '@/components/emails/PrivateBookingConfirmationEmail';
import { GroupBookingConfirmationEmail } from '@/components/emails/GroupBookingConfirmationEmail'; 
import { GroupTripConfirmedEmail } from '@/components/emails/GroupTripConfirmedEmail';
import { ParticipantApprovalNotificationEmail } from '@/components/emails/ParticipantApprovalNotificationEmail';
import { BadgeAwardedNotificationEmail } from '@/components/emails/BadgeAwardedNotificationEmail';

import type {
  PrivateBookingConfirmationEmailProps,
  GroupBookingConfirmationEmailProps,
  GroupTripConfirmedEmailProps,
  ParticipantApprovalNotificationEmailProps,
  BadgeAwardedNotificationEmailProps,
} from '@/lib/types/email';

// Email subjects mapping
const EMAIL_SUBJECTS: Record<string, string> = {
  // Booking templates
  'private-booking-confirmation': '🎣 Your Private Fishing Charter is Confirmed!',
  'group-booking-confirmation': '🎣 You\'ve Joined the Fishing Crew!',
  'group-trip-confirmed': '🎉 Great News - Your Group Trip is Confirmed!',
  
  // Notification templates  
  'participant-approval': '📋 Update on Your Trip Application',
  'badge-awarded': '🏆 New Achievement Unlocked!',
  
  // Test template
  'test-email': '🧪 Test Email - Cascais Fishing'
};

// React Email Templates mapping
const EMAIL_TEMPLATES: Record<string, (props: any) => React.ReactElement> = {
  'private-booking-confirmation': (props: PrivateBookingConfirmationEmailProps) => PrivateBookingConfirmationEmail(props),
  'group-booking-confirmation': (props: GroupBookingConfirmationEmailProps) => GroupBookingConfirmationEmail(props),
  'group-trip-confirmed': (props: GroupTripConfirmedEmailProps) => GroupTripConfirmedEmail(props),
  'participant-approval': (props: ParticipantApprovalNotificationEmailProps) => ParticipantApprovalNotificationEmail(props),
  'badge-awarded': (props: BadgeAwardedNotificationEmailProps) => BadgeAwardedNotificationEmail(props),
};

// Validate template exists
const isValidTemplateName = (name: string): name is keyof typeof EMAIL_TEMPLATES => {
  return name in EMAIL_TEMPLATES;
};

export async function POST(request: NextRequest) {
  try {
    // DEBUG: Version identifier for deployment verification
    console.log('📧 Email API v3.0 - React Email Components');
    
    const { template, to, data, subject: customSubject } = await request.json();
    
    // Validate email address
    const emailValidation = validateEmail(to);
    if (!emailValidation.isValid) {
      logEmailAttempt(to, 'Invalid Email', template, false, emailValidation.error);
      const validationErrorResponse = NextResponse.json({ 
        success: false, 
        error: emailValidation.error 
      }, { status: 400 });
      validationErrorResponse.headers.set('X-Email-API-Version', 'v3.0-react-email');
      return validationErrorResponse;
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.log('📧 Email not configured - logging attempt only');
      logEmailAttempt(to, customSubject || EMAIL_SUBJECTS[template] || 'Unknown', template, false, 'Email service not configured');
      
      const configErrorResponse = NextResponse.json({ 
        success: false, 
        error: 'Email service not configured. Add RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME to environment variables.',
        code: 'EMAIL_NOT_CONFIGURED'
      }, { status: 503 });
      configErrorResponse.headers.set('X-Email-API-Version', 'v3.0-react-email');
      return configErrorResponse;
    }

    // Generate HTML content using React Email components
    if (!isValidTemplateName(template)) {
      logEmailAttempt(to, 'Unknown Template', template, false, `Template '${template}' not found`);
      const templateErrorResponse = NextResponse.json({ 
        success: false, 
        error: `Email template '${template}' not found. Available: ${Object.keys(EMAIL_TEMPLATES).join(', ')}` 
      }, { status: 400 });
      templateErrorResponse.headers.set('X-Email-API-Version', 'v3.0-react-email');
      return templateErrorResponse;
    }

    // Render React Email component to HTML
    const templateComponent = EMAIL_TEMPLATES[template];
    const emailElement = templateComponent(data);
    const htmlContent = await render(emailElement);
    const subject = customSubject || EMAIL_SUBJECTS[template] || `Cascais Fishing - ${template}`;

    // Send email using Resend
    console.log('📧 Sending email:', { template, to, subject });
    
    const response = await resend!.emails.send({
      from: getFromAddress(),
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    if (response.error) {
      console.error('❌ Resend error:', response.error);
      logEmailAttempt(to, subject, template, false, response.error.message);
      
      // Enhanced handling for domain verification errors
      if (response.error.message?.includes('domain is not verified')) {
        const dkimErrorResponse = NextResponse.json({ 
          success: false, 
          error: 'Domain verification pending: DKIM record missing',
          details: 'MX and SPF records are correctly configured, but DKIM verification is incomplete.',
          resolution: 'Add TXT record: resend._domainkey → p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDJvnK21zdQTQWKaS9ZilGTWGLDC8n2NmtZ97WROvtVrcA+gfznw8k5zygpzZsxMP1hsXB7mx6JzQsiZKO2GYoeZuxtRFY03lPOy8+dfvrSBO+TIZy3kih1ImxzXKeoGBHNOvl1NmQoV4wUjxor52mrl4bLYyb2brlxT4Z+zn1mPwIDAQAB',
          code: 'DOMAIN_VERIFICATION_INCOMPLETE',
          status: {
            mx_record: '✅ Working (feedback-smtp.eu-west-1.amazonses.com)',
            spf_record: '✅ Working (v=spf1 include:amazonses.com ~all)',
            dkim_record: '❌ Missing (resend._domainkey)',
            next_steps: 'Contact DNS provider to add DKIM TXT record'
          }
          }, { status: 403 });
        dkimErrorResponse.headers.set('X-Email-API-Version', 'v3.0-react-email');
        return dkimErrorResponse;
      }
      
      const errorResponse = NextResponse.json({ 
        success: false, 
        error: response.error.message 
      }, { status: 500 });
      errorResponse.headers.set('X-Email-API-Version', 'v3.0-react-email');
      return errorResponse;
    }

    console.log('✅ Email sent successfully:', response.data?.id);
    logEmailAttempt(to, subject, template, true);

    const successResponse = NextResponse.json({ 
      success: true, 
      messageId: response.data?.id,
      message: 'Email sent successfully',
      template: template,
      renderer: 'react-email'
    });
    successResponse.headers.set('X-Email-API-Version', 'v3.0-react-email');
    return successResponse;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Email API error:', error);
    
    const catchErrorResponse = NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
    catchErrorResponse.headers.set('X-Email-API-Version', 'v2.1-enhanced-dkim');
    return catchErrorResponse;
  }
}
