import { baseEmailTemplate, formatCurrency, formatDate, companyInfo } from './common';

export interface PaymentData {
  customerName: string;
  confirmationCode: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  transactionId: string;
  date: string;
  time?: string;
  tripDate: string;
  participants?: number;
}

// Payment confirmation template
export const paymentConfirmationTemplate = (data: PaymentData): string => {
  const content = `
    <div class="email-header" style="background: linear-gradient(135deg, #059669 0%, #047857 100%);">
      <h1 class="email-title">💳 Payment Confirmed!</h1>
    </div>
    
    <div class="email-content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      
      <div class="success">
        <strong>✅ Payment Successful!</strong> Your payment has been processed and your fishing trip is confirmed!
      </div>
      
      <div class="details-box">
        <div class="details-title">💳 Payment Details</div>
        <div class="detail-item">
          💰 <strong>Amount Paid:</strong> ${formatCurrency(data.amount, data.currency)}
        </div>
        <div class="detail-item">
          💳 <strong>Payment Method:</strong> ${data.paymentMethod}
        </div>
        <div class="detail-item">
          📋 <strong>Transaction ID:</strong> <span class="highlight">${data.transactionId}</span>
        </div>
        <div class="detail-item">
          📅 <strong>Payment Date:</strong> ${formatDate(data.date)}
        </div>
        ${data.time ? `
        <div class="detail-item">
          ⏰ <strong>Payment Time:</strong> ${data.time}
        </div>
        ` : ''}
      </div>
      
      <div class="details-box">
        <div class="details-title">🎣 Trip Information</div>
        <div class="detail-item">
          📅 <strong>Trip Date:</strong> ${formatDate(data.tripDate)}
        </div>
        ${data.participants ? `
        <div class="detail-item">
          👥 <strong>Participants:</strong> ${data.participants} ${data.participants === 1 ? 'person' : 'people'}
        </div>
        ` : ''}
        <div class="detail-item">
          📋 <strong>Booking Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>📧 Next Steps:</strong><br/>
        • You'll receive detailed trip information 24-48 hours before departure<br/>
        • Weather updates will be sent if conditions change<br/>
        • Bring your booking code and ID to the marina
      </div>
      
      <hr class="divider" />
      
      <h3>💾 Keep This Receipt</h3>
      <p>This email serves as your official payment receipt. Please save it for your records.</p>
      
      <h3>📞 Need Help?</h3>
      <p>If you have any questions about your payment or upcoming trip, we're here to help!</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/351934027852" class="email-button">
          💬 Contact Support
        </a>
      </div>
      
      <p>Thank you for choosing Cascais Fishing! We can't wait to share an amazing Atlantic adventure with you!</p>
      <p><strong>See you at the marina!</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '💳 Payment Confirmed - Cascais Fishing');
};

// Payment failed template
export const paymentFailedTemplate = (data: PaymentData & {
  errorMessage: string;
  retryLink?: string;
  supportContact?: string;
}): string => {
  const content = `
    <div class="email-header" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
      <h1 class="email-title">❌ Payment Failed</h1>
    </div>
    
    <div class="email-content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      
      <div class="error">
        <strong>❌ Payment Issue:</strong> Unfortunately, we couldn't process your payment for your fishing trip.
      </div>
      
      <div class="details-box">
        <div class="details-title">🔍 Payment Attempt Details</div>
        <div class="detail-item">
          💰 <strong>Amount:</strong> ${formatCurrency(data.amount, data.currency)}
        </div>
        <div class="detail-item">
          💳 <strong>Payment Method:</strong> ${data.paymentMethod}
        </div>
        <div class="detail-item">
          📅 <strong>Attempt Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ❌ <strong>Error:</strong> ${data.errorMessage}
        </div>
        <div class="detail-item">
          📋 <strong>Booking Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Your Booking is On Hold:</strong><br/>
        Don't worry! Your fishing trip reservation is temporarily held while we resolve this payment issue.
      </div>
      
      <h3>🔧 How to Fix This</h3>
      <div class="details-box">
        <div class="detail-item">
          1️⃣ <strong>Check your payment details:</strong> Verify card number, expiry, and CVV
        </div>
        <div class="detail-item">
          2️⃣ <strong>Ensure sufficient funds:</strong> Check your account balance
        </div>
        <div class="detail-item">
          3️⃣ <strong>Try a different card:</strong> Sometimes switching cards resolves the issue
        </div>
        <div class="detail-item">
          4️⃣ <strong>Contact your bank:</strong> They may have blocked the international transaction
        </div>
      </div>
      
      ${data.retryLink ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.retryLink}" class="email-button">
          🔄 Try Payment Again
        </a>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://wa.me/351934027852" class="email-button" style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
          💬 Get Help via WhatsApp
        </a>
      </div>
      
      <hr class="divider" />
      
      <p><strong>We're here to help!</strong> Payment issues are usually quick to resolve. Most of our customers successfully complete their payment within a few minutes of trying again.</p>
      
      <p>Your booking is safely held for <strong>24 hours</strong> while we help you complete the payment process.</p>
      
      <p><strong>Questions? We're here!</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '❌ Payment Failed - Cascais Fishing');
};

// Refund confirmation template
export const refundConfirmationTemplate = (data: PaymentData & {
  refundAmount: number;
  refundReason: string;
  refundMethod: string;
  estimatedDays: number;
}): string => {
  const content = `
    <div class="email-header" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);">
      <h1 class="email-title">💰 Refund Processed</h1>
    </div>
    
    <div class="email-content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      
      <div class="success">
        <strong>✅ Refund Confirmed:</strong> Your refund has been processed successfully!
      </div>
      
      <div class="details-box">
        <div class="details-title">💰 Refund Details</div>
        <div class="detail-item">
          💳 <strong>Refund Amount:</strong> ${formatCurrency(data.refundAmount, data.currency)}
        </div>
        <div class="detail-item">
          📋 <strong>Original Transaction:</strong> ${data.transactionId}
        </div>
        <div class="detail-item">
          💳 <strong>Refund Method:</strong> ${data.refundMethod}
        </div>
        <div class="detail-item">
          📅 <strong>Refund Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          📝 <strong>Reason:</strong> ${data.refundReason}
        </div>
        <div class="detail-item">
          ⏰ <strong>Expected in Account:</strong> ${data.estimatedDays} business days
        </div>
      </div>
      
      <div class="details-box">
        <div class="details-title">📋 Original Booking</div>
        <div class="detail-item">
          📅 <strong>Trip Date:</strong> ${formatDate(data.tripDate)}
        </div>
        <div class="detail-item">
          📋 <strong>Booking Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
        <div class="detail-item">
          💰 <strong>Original Amount:</strong> ${formatCurrency(data.amount, data.currency)}
        </div>
      </div>
      
      <div class="warning">
        <strong>⏰ Bank Processing Time:</strong><br/>
        Please allow ${data.estimatedDays} business days for the refund to appear in your account. Processing times may vary by bank.
      </div>
      
      <hr class="divider" />
      
      <h3>❓ Questions About Your Refund?</h3>
      <p>If you don't see the refund in your account after the expected timeframe, please check with your bank first, as they sometimes take additional processing time.</p>
      
      <h3>🎣 Come Back Soon!</h3>
      <p>We're sorry things didn't work out this time, but we'd love to have you aboard for a future Atlantic adventure! Cascais offers fantastic fishing year-round.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.cascaisfishing.com" class="email-button">
          🎣 Book Future Trip
        </a>
      </div>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://wa.me/351934027852" class="email-button" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%);">
          💬 Contact Support
        </a>
      </div>
      
      <p>Thank you for choosing Cascais Fishing. We hope to see you on the water soon!</p>
      <p><strong>Best regards,</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '💰 Refund Processed - Cascais Fishing');
};
