// Email template props types
export interface BaseEmailTemplateProps {
  preview: string;
  children: React.ReactNode;
}

export interface PrivateBookingConfirmationEmailProps {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  participants: number;
  totalPrice: number;
  customerPhone: string;
}

export interface GroupBookingConfirmationEmailProps {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  participants: number;
  totalPrice: number;
  customerPhone: string;
  tripStatus: 'forming' | 'confirmed';
  currentParticipants: number;
  requiredParticipants: number;
  maxCapacity: number;
}

export interface GroupTripConfirmedEmailProps {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  totalParticipants: number;
  customerPhone: string;
}

// Email service types
export interface EmailOptions {
  to: string | string[];
  from: string;
  subject: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Email template types
export type EmailTemplate = 
  | 'private-booking-confirmation'
  | 'group-booking-confirmation'
  | 'group-trip-confirmed'
  | 'participant-approval'
  | 'badge-awarded'
  | 'reminder'
  | 'cancellation';

// Import new template props
export interface ParticipantApprovalNotificationEmailProps {
  participantName: string;
  captainName: string;
  tripTitle: string;
  tripDate: string;
  status: 'APPROVED' | 'REJECTED';
  rejectedReason?: string;
  tripDetailsUrl: string;
}

export interface BadgeAwardedNotificationEmailProps {
  userName: string;
  badge: {
    name: string;
    description: string;
    icon: string;
    category: string;
  };
  totalBadges: number;
  profileUrl: string;
}

export interface SendEmailProps {
  template: EmailTemplate;
  to: string;
  data: PrivateBookingConfirmationEmailProps 
      | GroupBookingConfirmationEmailProps 
      | GroupTripConfirmedEmailProps
      | ParticipantApprovalNotificationEmailProps
      | BadgeAwardedNotificationEmailProps;
  subject?: string;
}

// Resend configuration
export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

// Email validation
export interface EmailValidation {
  isValid: boolean;
  error?: string;
}

// Email queue types (for future implementation)
export interface EmailQueueItem {
  id: string;
  template: EmailTemplate;
  to: string;
  data: any;
  scheduledAt?: Date;
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
}
