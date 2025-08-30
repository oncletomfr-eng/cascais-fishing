import { NextResponse } from 'next/server';

/**
 * Mock Email API endpoint для тестирования
 * Имитирует отправку email без реального API ключа
 */

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: "No API key configured",
        data: {
          emailSent: false,
          testType: "Mock Welcome Email",
          recipientEmail: "test@example.com",
          environment: "development",
          hasApiKey: false,
          instruction: "Add RESEND_API_KEY to .env.local"
        }
      });
    }
    
    if (apiKey.includes('REPLACE_WITH_FULL_KEY')) {
      return NextResponse.json({
        success: false,
        message: "API key is placeholder - needs real key",
        data: {
          emailSent: false,
          testType: "Mock Welcome Email", 
          recipientEmail: "test@example.com",
          environment: "development",
          hasApiKey: true,
          currentKey: "re_etqdppGv_REPLACE_WITH_FULL_KEY_FROM_DASHBOARD",
          instruction: "Replace with full API key from Resend Dashboard",
          solution: {
            step1: "Go to https://resend.com/api-keys",
            step2: "Click 'Create API Key' button",
            step3: "Name: 'Cascais Fishing API'",
            step4: "Permission: 'Full access'", 
            step5: "Copy the FULL key starting with re_etqdppGv_",
            step6: "Replace in .env.local: RESEND_API_KEY=re_etqdppGv_YOUR_FULL_KEY"
          }
        }
      });
    }

    // Simulate successful email sending
    const mockEmailResponse = {
      id: "mock-" + Date.now(),
      from: "Cascais Fishing <noreply@cascaisfishing.com>",
      to: ["test@example.com"],
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Mock Email sent successfully",
      data: {
        emailSent: true,
        testType: "Mock Welcome Email",
        recipientEmail: "test@example.com", 
        environment: "development",
        hasApiKey: true,
        mockResponse: mockEmailResponse,
        realKeyAvailable: apiKey.startsWith('re_') && !apiKey.includes('REPLACE')
      }
    });

  } catch (error) {
    console.error('Mock Email API error:', error);
    
    return NextResponse.json({
      success: false,
      message: "Mock email test failed",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
