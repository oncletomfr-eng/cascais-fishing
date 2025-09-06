// Minimal email endpoint with actual sending capability
import { NextRequest, NextResponse } from 'next/server';
import { resend, isEmailConfigured, getFromAddress, validateEmail, logEmailAttempt } from '@/lib/resend';
import { EMAIL_TEMPLATES, isValidTemplateName } from '@/lib/email-templates';

// Email subjects mapping
const EMAIL_SUBJECTS: Record<string, string> = {
  // Booking templates
  'private-booking-confirmation': '🎣 Your Private Fishing Charter is Confirmed!',
  'group-booking-confirmation': '🎣 You\'ve Joined the Fishing Crew!',
  'group-trip-confirmed': '🎉 Great News - Your Group Trip is Confirmed!',
  
  // Cancellation templates
  'trip-cancellation': '😔 Trip Cancellation Notice',
  'customer-cancellation-confirmation': '📋 Cancellation Confirmed',
  'weather-cancellation': '🌊 Weather Safety Cancellation',
  
  // Payment templates
  'payment-confirmation': '💳 Payment Confirmed!',
  'payment-failed': '❌ Payment Failed',
  'refund-confirmation': '💰 Refund Processed',
  
  // Legacy/other templates
  'participant-approval': '📋 Update on Your Trip Application',
  'badge-awarded': '🏆 New Achievement Unlocked!',
  'reminder': '📅 Reminder: Your Fishing Trip Tomorrow',
  'cancellation': '😔 Trip Cancellation Notice',
  'test-email': '🧪 Test Email - Cascais Fishing'
};

export async function POST(request: NextRequest) {
  try {
    const { template, to, data, subject: customSubject } = await request.json();
    
    // Validate email address
    const emailValidation = validateEmail(to);
    if (!emailValidation.isValid) {
      logEmailAttempt(to, 'Invalid Email', template, false, emailValidation.error);
      return NextResponse.json({ 
        success: false, 
        error: emailValidation.error 
      }, { status: 400 });
    }

    // Check if email is configured
    if (!isEmailConfigured()) {
      console.log('📧 Email not configured - logging attempt only');
      logEmailAttempt(to, customSubject || EMAIL_SUBJECTS[template] || 'Unknown', template, false, 'Email service not configured');
      
      return NextResponse.json({ 
        success: false, 
        error: 'Email service not configured. Add RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME to environment variables.',
        code: 'EMAIL_NOT_CONFIGURED'
      }, { status: 503 });
    }

    // Generate HTML content using new template system
    if (!isValidTemplateName(template)) {
      logEmailAttempt(to, 'Unknown Template', template, false, `Template '${template}' not found`);
      return NextResponse.json({ 
        success: false, 
        error: `Email template '${template}' not found. Available: ${Object.keys(EMAIL_TEMPLATES).join(', ')}` 
      }, { status: 400 });
    }

    const templateFunc = EMAIL_TEMPLATES[template];
    const htmlContent = templateFunc(data);
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
      return NextResponse.json({ 
        success: false, 
        error: response.error.message 
      }, { status: 500 });
    }

    console.log('✅ Email sent successfully:', response.data?.id);
    logEmailAttempt(to, subject, template, true);

    return NextResponse.json({ 
      success: true, 
      messageId: response.data?.id,
      message: 'Email sent successfully'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Email API error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
}
