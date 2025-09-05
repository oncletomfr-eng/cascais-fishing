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

// TEMPORARY STUB: Email service disabled due to Vercel module resolution issues
// TODO: Fix email components import resolution on Vercel

// Main email sending function - STUB VERSION
export async function sendEmail({
  template,
  to,
  data,
  subject: customSubject,
}: SendEmailProps): Promise<EmailResponse> {
  console.log('📧 [STUB] Email would be sent:', { template, to, subject: customSubject });
  console.log('🚨 [STUB] Email service disabled due to Vercel module resolution issues');
  
  // Return success for now to avoid breaking the build
  return { 
    success: true, 
    messageId: 'stub-email-id-' + Date.now() 
  };
}

// Convenience functions - STUB VERSIONS
export async function sendPrivateBookingConfirmation(
  to: string,
  data: PrivateBookingConfirmationEmailProps
): Promise<EmailResponse> {
  console.log('📧 [STUB] Private booking confirmation would be sent to:', to);
  return { success: true, messageId: 'stub-private-booking-' + Date.now() };
}

export async function sendGroupBookingConfirmation(
  to: string,
  data: GroupBookingConfirmationEmailProps
): Promise<EmailResponse> {
  console.log('📧 [STUB] Group booking confirmation would be sent to:', to);
  return { success: true, messageId: 'stub-group-booking-' + Date.now() };
}

export async function sendGroupTripConfirmed(
  to: string,
  data: GroupTripConfirmedEmailProps
): Promise<EmailResponse> {
  console.log('📧 [STUB] Group trip confirmed would be sent to:', to);
  return { success: true, messageId: 'stub-group-trip-' + Date.now() };
}

export async function sendParticipantApprovalNotification(
  to: string,
  data: ParticipantApprovalNotificationEmailProps
): Promise<EmailResponse> {
  console.log('📧 [STUB] Participant approval notification would be sent to:', to);
  return { success: true, messageId: 'stub-participant-approval-' + Date.now() };
}

export async function sendBadgeAwardedNotification(
  to: string,
  data: BadgeAwardedNotificationEmailProps
): Promise<EmailResponse> {
  console.log('📧 [STUB] Badge awarded notification would be sent to:', to);
  return { success: true, messageId: 'stub-badge-awarded-' + Date.now() };
}

// Bulk email sending - STUB VERSION
export async function sendBulkEmails(
  emails: SendEmailProps[]
): Promise<EmailResponse[]> {
  console.log('📧 [STUB] Bulk emails would be sent:', emails.length, 'emails');
  
  return emails.map((_, index) => ({
    success: true,
    messageId: `stub-bulk-email-${index}-${Date.now()}`
  }));
}

// Test email function - STUB VERSION
export async function sendTestEmail(to: string): Promise<EmailResponse> {
  console.log('📧 [STUB] Test email would be sent to:', to);
  return { success: true, messageId: 'stub-test-email-' + Date.now() };
}
