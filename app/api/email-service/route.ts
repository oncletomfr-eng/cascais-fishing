// Isolated Email Service API Route
// This API route handles email sending with dynamic imports to minimize serverless function size

import { NextRequest, NextResponse } from 'next/server';
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

// HTML Email Template Generators - Lightweight, no external dependencies
function generateEmailHTML(template: EmailTemplate, data: any): string {
  // Base styles for all emails
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .email-card { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { text-align: center; margin-bottom: 30px; }
      .logo { font-size: 24px; font-weight: bold; color: #0066cc; margin-bottom: 10px; }
      .title { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 20px; line-height: 1.3; }
      .content { color: #4b5563; line-height: 1.6; margin-bottom: 25px; }
      .highlight { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }
      .button { display: inline-block; background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 0; }
      .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
      .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
      .info-label { font-weight: bold; color: #374151; }
      .info-value { color: #6b7280; }
      @media (max-width: 600px) { .container { padding: 10px; } .email-card { padding: 20px; } }
    </style>
  `;

  switch (template) {
    case 'private-booking-confirmation':
      return `
        <!DOCTYPE html>
        <html>
        <head><title>${EMAIL_SUBJECTS[template]}</title>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <div class="logo">🎣 Cascais Fishing</div>
                <h1 class="title">Your Private Charter is Confirmed!</h1>
              </div>
              
              <div class="content">
                <p>Dear ${data.customerName},</p>
                <p>Great news! Your private fishing charter has been confirmed. Get ready for an amazing Atlantic adventure!</p>
              </div>
              
              <div class="highlight">
                <div class="info-row"><span class="info-label">📅 Date:</span><span class="info-value">${data.date}</span></div>
                <div class="info-row"><span class="info-label">⏰ Time:</span><span class="info-value">${data.time}</span></div>
                <div class="info-row"><span class="info-label">👥 Participants:</span><span class="info-value">${data.participants} people</span></div>
                <div class="info-row"><span class="info-label">💰 Total Price:</span><span class="info-value">€${data.totalPrice}</span></div>
                <div class="info-row"><span class="info-label">🔢 Confirmation:</span><span class="info-value">${data.confirmationCode}</span></div>
              </div>
              
              <div class="content">
                <p><strong>What to Expect:</strong></p>
                <ul>
                  <li>🎣 Professional equipment and fresh bait provided</li>
                  <li>🧑‍✈️ Expert captain with 15+ years experience</li>
                  <li>🥤 Complimentary refreshments on board</li>
                  <li>📸 Professional photos of your catch</li>
                  <li>🐟 Fish cleaning service included</li>
                </ul>
                
                <p><strong>Meeting Point:</strong> Cascais Marina - We'll contact you 24h before with exact location.</p>
                <p>For any questions, contact us at <strong>+351 934 027 852</strong></p>
              </div>
              
              <div class="footer">
                <p>🏆 4.9/5 rating • 200+ Happy Customers • Licensed & Insured</p>
                <p>Cascais Fishing - Premium Atlantic Adventures</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
    case 'group-booking-confirmation':
      return `
        <!DOCTYPE html>
        <html>
        <head><title>${EMAIL_SUBJECTS[template]}</title>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <div class="logo">🎣 Cascais Fishing</div>
                <h1 class="title">Welcome to the Crew!</h1>
              </div>
              
              <div class="content">
                <p>Dear ${data.customerName},</p>
                <p>Awesome! You've successfully joined a group fishing trip. Get ready to meet fellow fishing enthusiasts!</p>
              </div>
              
              <div class="highlight">
                <div class="info-row"><span class="info-label">📅 Date:</span><span class="info-value">${data.date}</span></div>
                <div class="info-row"><span class="info-label">⏰ Time:</span><span class="info-value">${data.time}</span></div>
                <div class="info-row"><span class="info-label">👥 Current Group Size:</span><span class="info-value">${data.currentParticipants}/${data.maxParticipants} people</span></div>
                <div class="info-row"><span class="info-label">💰 Your Contribution:</span><span class="info-value">€${data.price}</span></div>
                <div class="info-row"><span class="info-label">🔢 Booking Reference:</span><span class="info-value">${data.bookingReference}</span></div>
              </div>
              
              <div class="content">
                <p><strong>Trip Status:</strong> ${data.currentParticipants >= data.minParticipants ? '✅ Confirmed - Minimum participants reached!' : '⏳ Pending - Waiting for more participants'}</p>
                
                <p><strong>What's Included:</strong></p>
                <ul>
                  <li>🎣 Share premium boat with great company</li>
                  <li>🧑‍✈️ Professional captain and guidance</li>
                  <li>🎯 Equipment and bait for everyone</li>
                  <li>📱 Group chat to connect before the trip</li>
                  <li>🏆 Friendly competition and prizes</li>
                </ul>
              </div>
              
              <div class="footer">
                <p>We'll notify you when the minimum group size is reached</p>
                <p>Questions? WhatsApp us at <strong>+351 934 027 852</strong></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
    case 'group-trip-confirmed':
      return `
        <!DOCTYPE html>
        <html>
        <head><title>${EMAIL_SUBJECTS[template]}</title>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <div class="logo">🎣 Cascais Fishing</div>
                <h1 class="title">🎉 Trip Confirmed!</h1>
              </div>
              
              <div class="content">
                <p>Fantastic news, ${data.organizerName}!</p>
                <p>Your group trip has reached the minimum participants and is now <strong>CONFIRMED</strong>!</p>
              </div>
              
              <div class="highlight">
                <div class="info-row"><span class="info-label">📅 Date:</span><span class="info-value">${data.date}</span></div>
                <div class="info-row"><span class="info-label">⏰ Time:</span><span class="info-value">${data.time}</span></div>
                <div class="info-row"><span class="info-label">👥 Final Group Size:</span><span class="info-value">${data.finalParticipants} people</span></div>
                <div class="info-row"><span class="info-label">🎯 Trip ID:</span><span class="info-value">${data.tripId}</span></div>
              </div>
              
              <div class="content">
                <p><strong>Next Steps:</strong></p>
                <ul>
                  <li>📱 All participants will be added to the group chat</li>
                  <li>📍 Meeting location details sent 24h before</li>
                  <li>☂️ Weather updates if needed</li>
                  <li>🎣 Gear preferences confirmation</li>
                </ul>
                
                <p>As the trip organizer, you'll receive special recognition and a small discount on future bookings!</p>
              </div>
              
              <a href="#" class="button">View Trip Details</a>
              
              <div class="footer">
                <p>Time to celebrate! Your Atlantic adventure is locked in 🌊</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
    case 'participant-approval':
      return `
        <!DOCTYPE html>
        <html>
        <head><title>${EMAIL_SUBJECTS[template]}</title>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <div class="logo">🎣 Cascais Fishing</div>
                <h1 class="title">${data.status === 'approved' ? '✅ Application Approved!' : '📋 Application Update'}</h1>
              </div>
              
              <div class="content">
                <p>Dear ${data.applicantName},</p>
                <p>We have an update regarding your trip application:</p>
              </div>
              
              <div class="highlight">
                <div class="info-row"><span class="info-label">📅 Trip Date:</span><span class="info-value">${data.tripDate}</span></div>
                <div class="info-row"><span class="info-label">📋 Status:</span><span class="info-value"><strong>${data.status.toUpperCase()}</strong></span></div>
                ${data.message ? `<div style="margin-top: 15px;"><strong>Message:</strong><br/>${data.message}</div>` : ''}
              </div>
              
              <div class="content">
                ${data.status === 'approved' 
                  ? '<p>🎉 Welcome aboard! You\'re officially part of this fishing adventure. Payment details and trip information will follow shortly.</p>'
                  : data.status === 'pending' 
                  ? '<p>⏳ Your application is still under review. We\'ll contact you soon with an update.</p>'
                  : '<p>We appreciate your interest. Unfortunately, this particular trip is not the right fit, but we have other amazing adventures coming up!</p>'
                }
              </div>
              
              <div class="footer">
                <p>Questions? Contact us at <strong>+351 934 027 852</strong></p>
                <p>Check out other available trips on our website!</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
    case 'badge-awarded':
      return `
        <!DOCTYPE html>
        <html>
        <head><title>${EMAIL_SUBJECTS[template]}</title>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <div class="logo">🎣 Cascais Fishing</div>
                <h1 class="title">🏆 Achievement Unlocked!</h1>
              </div>
              
              <div class="content">
                <p>Congratulations, ${data.userName}!</p>
                <p>You've earned a new badge for your fishing prowess:</p>
              </div>
              
              <div class="highlight" style="text-align: center; background: linear-gradient(135deg, #ffd700, #ffed4e); color: #92400e;">
                <div style="font-size: 48px; margin-bottom: 10px;">${data.badgeIcon}</div>
                <h2 style="margin: 0; font-size: 24px;">${data.badgeName}</h2>
                <p style="margin: 10px 0 0 0; font-style: italic;">${data.badgeDescription}</p>
              </div>
              
              <div class="content">
                <p><strong>How you earned it:</strong></p>
                <p>${data.achievementReason}</p>
                
                <p><strong>Badge Stats:</strong></p>
                <ul>
                  <li>🎯 Difficulty: ${data.difficulty || 'Intermediate'}</li>
                  <li>📈 Rarity: ${data.rarity || 'Uncommon'}</li>
                  <li>🏅 Points Earned: ${data.pointsEarned || 100}</li>
                </ul>
                
                <p>Keep up the excellent work! Check your profile to see all your achievements.</p>
              </div>
              
              <a href="#" class="button">View Your Profile</a>
              
              <div class="footer">
                <p>🌟 You're becoming a true fishing legend!</p>
                <p>Share your achievement with the community</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
      
    default:
      return `
        <!DOCTYPE html>
        <html>
        <head><title>Cascais Fishing</title>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="email-card">
              <div class="header">
                <div class="logo">🎣 Cascais Fishing</div>
                <h1 class="title">Thank you for choosing us!</h1>
              </div>
              <div class="content">
                <p>We'll be in touch with you soon about your fishing adventure.</p>
                <p>For immediate assistance, contact us at <strong>+351 934 027 852</strong></p>
              </div>
              <div class="footer">
                <p>🏆 Premium Atlantic Fishing Experiences</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
  }
}

// Isolated email rendering function - now using HTML templates
async function renderEmailTemplate(template: EmailTemplate, data: any) {
  try {
    console.log('📧 Rendering email template:', template);
    
    // Generate HTML using lightweight template system
    const html = generateEmailHTML(template, data);
    const subject = EMAIL_SUBJECTS[template];
    
    console.log('✅ Email template rendered successfully:', template);
    return { html, subject };
    
  } catch (error) {
    console.error('❌ Email template rendering failed:', error);
    
    // Fallback HTML  
    const subject = EMAIL_SUBJECTS[template];
    const fallbackHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${subject}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc; }
            .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .logo { font-size: 24px; font-weight: bold; color: #0066cc; margin-bottom: 20px; text-align: center; }
            h1 { color: #1f2937; }
            .contact { background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🎣 Cascais Fishing</div>
            <h1>${subject}</h1>
            <p>Hello!</p>
            <p>We're processing your request and will be in touch soon.</p>
            <div class="contact">
              <strong>Contact us:</strong><br/>
              📞 Phone: +351 934 027 852<br/>
              📧 Email: Reply to this message
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Template: ${template} • ${new Date().toLocaleDateString()}
            </p>
          </div>
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
