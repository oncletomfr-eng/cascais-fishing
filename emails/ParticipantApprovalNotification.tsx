/**
 * Participant Approval Notification Email Component
 * Mock component for development purposes
 */

import React from 'react';

interface ParticipantApprovalNotificationProps {
  participantName?: string;
  tripTitle?: string;
  approvalStatus?: 'approved' | 'rejected';
}

export default function ParticipantApprovalNotification({
  participantName = 'Participant',
  tripTitle = 'Fishing Trip',
  approvalStatus = 'approved'
}: ParticipantApprovalNotificationProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>Cascais Fishing - Trip {approvalStatus === 'approved' ? 'Approval' : 'Update'}</h1>
      <p>Dear {participantName},</p>
      <p>
        Your participation request for "{tripTitle}" has been {approvalStatus}.
      </p>
      <p>Best regards,<br />Cascais Fishing Team</p>
    </div>
  );
}
