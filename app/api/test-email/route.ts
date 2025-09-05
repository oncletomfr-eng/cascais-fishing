import { NextRequest, NextResponse } from 'next/server';
import { 
  sendEmail, 
  sendParticipantApprovalNotification, 
  sendBadgeAwardedNotification,
  sendGroupTripConfirmed
} from '@/lib/services/email-service';

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

    let testType = '';
    let emailResult;
    
    switch (type) {
      case 'welcome':
        testType = 'Welcome Email (using group-trip-confirmed template)';
        emailResult = await sendGroupTripConfirmed(email, {
          customerName: 'Test User',
          confirmationCode: 'WELCOME-TEST',
          date: '2025-01-15',
          time: '09:00',
          totalParticipants: 1,
          customerPhone: '+351934027852',
        });
        break;

      case 'participant-approval':
        testType = 'Participant Approval Email';
        emailResult = await sendParticipantApprovalNotification(email, {
          participantName: 'Test Participant',
          captainName: 'Captain Rodriguez',
          tripTitle: 'Morning Deep Sea Fishing',
          tripDate: '15 февраля 2025',
          status: 'APPROVED',
          tripDetailsUrl: 'http://localhost:3000/trip/test-123'
        });
        break;

      case 'badge-awarded':
        testType = 'Badge Awarded Email';
        emailResult = await sendBadgeAwardedNotification(email, {
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
        emailResult = await sendGroupTripConfirmed(email, {
          customerName: 'Test Participant',
          confirmationCode: 'TRIP-TEST-456',
          date: '20 февраля 2025',
          time: '09:00-17:00',
          totalParticipants: 4,
          customerPhone: '+351934027852',
        });
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid email type. Use: welcome, participant-approval, badge-awarded, trip-confirmed' 
        }, { status: 400 });
    }

    const success = emailResult?.success || false;

    return NextResponse.json({
      success: true,
      message: success ? 
        `${testType} sent successfully (or logged in development mode)` : 
        `Failed to send ${testType}`,
      data: {
        emailSent: success,
        emailError: emailResult?.error,
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

    // Создаем тестовое письмо используя базовую функцию sendEmail
    // Для custom email создадим простейшую реализацию
    const customEmailResult = await sendGroupTripConfirmed(email, {
      customerName: 'Custom Email Test',
      confirmationCode: 'CUSTOM-TEST',
      date: new Date().toLocaleDateString('ru-RU'),
      time: '12:00',
      totalParticipants: 1,
      customerPhone: '+351934027852',
    });

    const success = customEmailResult?.success || false;

    return NextResponse.json({
      success: true,
      message: success ? 
        'Custom email template sent successfully (using group-trip template)' : 
        'Failed to send custom email',
      data: {
        emailSent: success,
        emailError: customEmailResult?.error,
        testType: 'Custom Email (Group Trip Template)',
        recipientEmail: email,
        subject: `Custom test with content: ${content.substring(0, 50)}...`,
        environment: process.env.NODE_ENV,
        hasApiKey: !!process.env.RESEND_API_KEY,
        note: 'Custom HTML emails not yet supported in unified service - using existing template instead'
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