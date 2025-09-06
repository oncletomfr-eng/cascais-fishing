// Minimal email endpoint with actual sending capability
import { NextRequest, NextResponse } from 'next/server';
import { resend, isEmailConfigured, getFromAddress, validateEmail, logEmailAttempt } from '@/lib/resend';

// Simple HTML email templates (no React components)
const EMAIL_TEMPLATES = {
  'private-booking-confirmation': (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🎣 Your Private Fishing Charter is Confirmed!</h2>
      <p>Hello ${data.customerName},</p>
      <p>Your private fishing charter has been confirmed!</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <strong>Booking Details:</strong><br/>
        📅 Date: ${data.date}<br/>
        ⏰ Time: ${data.time}<br/>
        👥 Participants: ${data.participants}<br/>
        💰 Total: €${data.totalPrice}<br/>
        📋 Confirmation: ${data.confirmationCode}
      </div>
      <p>For questions, call: ${data.customerPhone || '+351 934 027 852'}</p>
      <p>See you at Cascais Marina!</p>
      <hr/>
      <small>Cascais Premium Fishing | Marina de Cascais</small>
    </div>
  `,
  'group-booking-confirmation': (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">🎣 You've Joined the Fishing Crew!</h2>
      <p>Hello ${data.customerName},</p>
      <p>You've successfully joined a group fishing trip!</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <strong>Trip Details:</strong><br/>
        📅 Date: ${data.date}<br/>
        ⏰ Time: ${data.time}<br/>
        💰 Price: €${data.price} per person<br/>
        👥 Current participants: ${data.currentParticipants}/${data.maxParticipants}
      </div>
      <p>We'll notify you when the trip is confirmed!</p>
      <hr/>
      <small>Cascais Premium Fishing | Marina de Cascais</small>
    </div>
  `,
  'test-email': (data: any) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">🧪 Test Email - Cascais Fishing</h2>
      <p>This is a test email to verify the email system is working.</p>
      <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <strong>✅ Email system is operational!</strong><br/>
        Timestamp: ${new Date().toISOString()}<br/>
        Template: ${data.template || 'test-email'}
      </div>
      <p>If you received this, email configuration is working correctly.</p>
      <hr/>
      <small>Cascais Premium Fishing | Email System Test</small>
    </div>
  `
};

// Email subjects mapping
const EMAIL_SUBJECTS: Record<string, string> = {
  'private-booking-confirmation': '🎣 Your Private Fishing Charter is Confirmed!',
  'group-booking-confirmation': '🎣 You\'ve Joined the Fishing Crew!',
  'group-trip-confirmed': '🎉 Great News - Your Group Trip is Confirmed!',
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

    // Generate HTML content
    const templateFunc = EMAIL_TEMPLATES[template as keyof typeof EMAIL_TEMPLATES];
    if (!templateFunc) {
      logEmailAttempt(to, 'Unknown Template', template, false, `Template '${template}' not found`);
      return NextResponse.json({ 
        success: false, 
        error: `Email template '${template}' not found` 
      }, { status: 400 });
    }

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
