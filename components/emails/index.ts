// Email Templates
export { BaseEmailTemplate } from './BaseEmailTemplate';
export { PrivateBookingConfirmationEmail } from './PrivateBookingConfirmationEmail';
export { GroupBookingConfirmationEmail } from './GroupBookingConfirmationEmail';
export { GroupTripConfirmedEmail } from './GroupTripConfirmedEmail';
export { ParticipantApprovalNotificationEmail } from './ParticipantApprovalNotificationEmail';
export { BadgeAwardedNotificationEmail } from './BadgeAwardedNotificationEmail';

// Re-export types from lib/types/email
export type {
  BaseEmailTemplateProps,
  PrivateBookingConfirmationEmailProps,
  GroupBookingConfirmationEmailProps,
  GroupTripConfirmedEmailProps,
  EmailTemplate,
  EmailOptions,
  EmailResponse,
  SendEmailProps,
} from '../../lib/types/email';

// Export new template types
export type { ParticipantApprovalNotificationEmailProps } from './ParticipantApprovalNotificationEmail';
export type { BadgeAwardedNotificationEmailProps } from './BadgeAwardedNotificationEmail';
