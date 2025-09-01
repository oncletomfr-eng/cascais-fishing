/**
 * Badge Awarded Notification Email Component
 * Mock component for development purposes
 */

import React from 'react';

interface BadgeAwardedNotificationProps {
  recipientName?: string;
  badgeName?: string;
  badgeDescription?: string;
}

export default function BadgeAwardedNotification({
  recipientName = 'Angler',
  badgeName = 'Achievement Badge',
  badgeDescription = 'Congratulations on your fishing achievement!'
}: BadgeAwardedNotificationProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h1>🏆 Cascais Fishing - Badge Awarded!</h1>
      <p>Congratulations {recipientName}!</p>
      <p>
        You have been awarded the <strong>"{badgeName}"</strong> badge.
      </p>
      <p>{badgeDescription}</p>
      <p>Keep up the great fishing!</p>
      <p>Best regards,<br />Cascais Fishing Team</p>
    </div>
  );
}
