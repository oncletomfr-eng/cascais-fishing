import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email-service';

/**
 * API endpoint для тестирования email отправки
 * GET /api/test-email - отправляет тестовый email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'test@example.com';
    const type = searchParams.get('type') || 'welcome';

    console.log(`🧪 Testing email system - Type: ${type}, Email: ${email}`);

    let result = false;
    let testType = '';

    switch (type) {
      case 'welcome':
        testType = 'Welcome Email';
        result = await emailService.sendWelcomeEmail(email, 'Test User');
        break;

      case 'participant-approval':
        testType = 'Participant Approval Email';
        result = await emailService.sendParticipantApprovalNotification({
          participantEmail: email,
          participantName: 'Test Participant',
          captainName: 'Captain Rodriguez',
          tripTitle: 'Morning Deep Sea Fishing',
          tripDate: '2025-02-15',
          status: 'APPROVED',
          tripDetailsUrl: 'http://localhost:3000/trip/test-123'
        });
        break;

      case 'badge-awarded':
        testType = 'Badge Awarded Email';
        result = await emailService.sendBadgeAwardedNotification({
          userEmail: email,
          userName: 'Test User',
          badge: {
            name: 'First Catch',
            description: 'Caught your first fish!',
            icon: '🐟',
            category: 'MILESTONE'
          },
          totalBadges: 1,
          profileUrl: 'http://localhost:3000/profile/test-user'
        });
        break;

      case 'trip-confirmed':
        testType = 'Trip Confirmed Email';
        result = await emailService.sendTripConfirmedNotification(
          [{ email, name: 'Test Participant' }],
          {
            title: 'Test Group Fishing Trip',
            date: '2025-02-20',
            timeSlot: '09:00-17:00',
            meetingPoint: 'Marina do Cascais',
            captainName: 'Captain Silva',
            tripDetailsUrl: 'http://localhost:3000/trip/test-456'
          }
        );
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid email type. Use: welcome, participant-approval, badge-awarded, trip-confirmed' 
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result ? 
        `${testType} sent successfully (or logged in development mode)` : 
        `Failed to send ${testType}`,
      data: {
        emailSent: result,
        testType,
        recipientEmail: email,
        environment: process.env.NODE_ENV,
        hasApiKey: !!process.env.RESEND_API_KEY
      }
    });

  } catch (error) {
    console.error('Error in test-email endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/test-email - отправляет кастомный email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, subject, content, type = 'custom' } = body;

    if (!email || !subject || !content) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: email, subject, content' 
      }, { status: 400 });
    }

    console.log(`🧪 Testing custom email - To: ${email}, Subject: ${subject}`);

    // Создаем простой HTML шаблон для кастомного email
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0066cc; color: white; padding: 20px; text-align: center;">
          <h1>🎣 Cascais Fishing - Test Email</h1>
        </div>
        <div style="padding: 30px;">
          <h2>Custom Test Email</h2>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${content}
          </div>
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is a test email sent from development environment.<br>
            Environment: ${process.env.NODE_ENV}<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      </div>
    `;

    // Используем приватный метод через рефлексию
    const emailServiceInstance = emailService as any;
    const result = await emailServiceInstance.sendEmail({
      to: email,
      subject: `[TEST] ${subject}`,
      html
    });

    return NextResponse.json({
      success: true,
      message: result ? 
        'Custom email sent successfully (or logged in development mode)' : 
        'Failed to send custom email',
      data: {
        emailSent: result,
        testType: 'Custom Email',
        recipientEmail: email,
        subject: `[TEST] ${subject}`,
        environment: process.env.NODE_ENV,
        hasApiKey: !!process.env.RESEND_API_KEY
      }
    });

  } catch (error) {
    console.error('Error in test-email POST endpoint:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}