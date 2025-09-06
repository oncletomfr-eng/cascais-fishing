import { baseEmailTemplate, formatCurrency, formatDate, companyInfo } from './common';

export interface CancellationData {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  reason: string;
  refundAmount?: number;
  refundMethod?: string;
  refundTimeframe?: string;
  reschedulingOptions?: boolean;
  alternativeDates?: string[];
}

// Trip cancellation template (when we cancel)
export const tripCancellationTemplate = (data: CancellationData): string => {
  const content = `
    <div class="email-header" style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);">
      <h1 class="email-title">😔 Trip Cancellation Notice</h1>
    </div>
    
    <div class="email-content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      
      <div class="error">
        <strong>⚠️ Important Notice:</strong> Unfortunately, we need to cancel your scheduled fishing trip.
      </div>
      
      <div class="details-box">
        <div class="details-title">📋 Cancelled Trip Details</div>
        <div class="detail-item">
          📅 <strong>Original Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ⏰ <strong>Original Time:</strong> ${data.time}
        </div>
        <div class="detail-item">
          📋 <strong>Booking Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
        <div class="detail-item">
          📝 <strong>Reason:</strong> ${data.reason}
        </div>
      </div>
      
      ${data.refundAmount ? `
      <div class="success">
        <strong>💰 Refund Information:</strong><br/>
        Amount: <strong>${formatCurrency(data.refundAmount)}</strong><br/>
        Method: ${data.refundMethod || 'Original payment method'}<br/>
        Timeframe: ${data.refundTimeframe || '3-5 business days'}
      </div>
      ` : ''}
      
      ${data.reschedulingOptions && data.alternativeDates ? `
      <h3>📅 Rescheduling Options</h3>
      <p>We'd love to get you out on the water! Here are some alternative dates available:</p>
      <div class="details-box">
        ${data.alternativeDates.map(date => `
        <div class="detail-item">
          📅 ${formatDate(date)} - Available
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <hr class="divider" />
      
      <p>We sincerely apologize for any inconvenience this cancellation may cause. Your safety and the quality of your fishing experience are our top priorities.</p>
      
      ${data.reschedulingOptions ? `
      <p>If you'd like to reschedule for one of the alternative dates or need assistance with anything else, please don't hesitate to contact us.</p>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/351934027852" class="email-button">
          💬 Contact Us on WhatsApp
        </a>
      </div>
      
      <p>Thank you for your understanding, and we hope to welcome you aboard soon!</p>
      <p><strong>Best regards,</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '😔 Trip Cancellation - Cascais Fishing');
};

// Customer cancellation confirmation template (when customer cancels)
export const customerCancellationConfirmationTemplate = (data: CancellationData & {
  cancellationDate: string;
  policyLink?: string;
}): string => {
  const content = `
    <div class="email-header" style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%);">
      <h1 class="email-title">📋 Cancellation Confirmed</h1>
    </div>
    
    <div class="email-content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      
      <div class="warning">
        <strong>📋 Confirmed:</strong> Your fishing trip cancellation has been processed.
      </div>
      
      <div class="details-box">
        <div class="details-title">📋 Cancelled Trip Details</div>
        <div class="detail-item">
          📅 <strong>Trip Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ⏰ <strong>Trip Time:</strong> ${data.time}
        </div>
        <div class="detail-item">
          📋 <strong>Booking Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
        <div class="detail-item">
          📅 <strong>Cancellation Date:</strong> ${formatDate(data.cancellationDate)}
        </div>
      </div>
      
      ${data.refundAmount && data.refundAmount > 0 ? `
      <div class="success">
        <strong>💰 Refund Information:</strong><br/>
        Amount: <strong>${formatCurrency(data.refundAmount)}</strong><br/>
        Method: ${data.refundMethod || 'Original payment method'}<br/>
        Timeframe: ${data.refundTimeframe || '3-5 business days'}<br/>
        <small>Please allow extra time for your bank to process the refund.</small>
      </div>
      ` : `
      <div class="warning">
        <strong>💰 Refund Policy:</strong><br/>
        Based on our cancellation policy and the timing of your cancellation, no refund is applicable for this booking.
        ${data.policyLink ? `<br/><a href="${data.policyLink}" style="color: #d97706;">View full cancellation policy</a>` : ''}
      </div>
      `}
      
      <hr class="divider" />
      
      <p>We're sorry to see you cancel, but we understand that plans can change. We hope you'll consider booking with us again in the future!</p>
      
      <h3>🎣 Come Back Soon!</h3>
      <p>Atlantic fishing in Cascais is amazing year-round. Here's what you can expect in different seasons:</p>
      <ul>
        <li><strong>Spring (Mar-May):</strong> Perfect weather, active fish</li>
        <li><strong>Summer (Jun-Aug):</strong> Peak season, tuna and dorado</li>
        <li><strong>Autumn (Sep-Nov):</strong> Great conditions, fewer crowds</li>
        <li><strong>Winter (Dec-Feb):</strong> Calm seas, unique species</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.cascaisfishing.com" class="email-button">
          🎣 Book Future Trip
        </a>
      </div>
      
      <p>If you have any questions about your cancellation or refund, please don't hesitate to contact us.</p>
      <p><strong>Thank you for choosing Cascais Fishing!</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '📋 Cancellation Confirmed - Cascais Fishing');
};

// Weather cancellation template (specific for bad weather)
export const weatherCancellationTemplate = (data: CancellationData & {
  weatherConditions: string;
  safetyReason: string;
}): string => {
  const content = `
    <div class="email-header" style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);">
      <h1 class="email-title">🌊 Weather Safety Cancellation</h1>
    </div>
    
    <div class="email-content">
      <p>Dear <strong>${data.customerName}</strong>,</p>
      
      <div class="warning">
        <strong>⛈️ Safety First:</strong> Due to unfavorable weather conditions, we must cancel your fishing trip for safety reasons.
      </div>
      
      <div class="details-box">
        <div class="details-title">🌤️ Weather Information</div>
        <div class="detail-item">
          📅 <strong>Trip Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ⏰ <strong>Trip Time:</strong> ${data.time}
        </div>
        <div class="detail-item">
          🌊 <strong>Weather Conditions:</strong> ${data.weatherConditions}
        </div>
        <div class="detail-item">
          ⚠️ <strong>Safety Concern:</strong> ${data.safetyReason}
        </div>
        <div class="detail-item">
          📋 <strong>Booking Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
      </div>
      
      <div class="success">
        <strong>🔄 Rescheduling Options:</strong><br/>
        • Full refund available<br/>
        • Free rescheduling to any future date<br/>
        • No cancellation fees apply<br/>
        • Your booking priority is maintained
      </div>
      
      ${data.alternativeDates && data.alternativeDates.length > 0 ? `
      <h3>📅 Suggested Alternative Dates</h3>
      <div class="details-box">
        ${data.alternativeDates.map(date => `
        <div class="detail-item">
          📅 ${formatDate(date)} - Good weather forecast
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <hr class="divider" />
      
      <p><strong>Your safety is our absolute priority.</strong> While we're as eager as you are to get out on the water, Atlantic conditions can change quickly, and we never compromise on safety.</p>
      
      <p>The good news? Portuguese waters offer incredible fishing year-round, and postponed trips often result in even better catches as conditions improve!</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/351934027852" class="email-button">
          💬 Reschedule via WhatsApp
        </a>
      </div>
      
      <p>We sincerely apologize for the inconvenience and appreciate your understanding. Let's get you rescheduled for perfect fishing conditions!</p>
      <p><strong>Looking forward to calmer seas,</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '🌊 Weather Cancellation - Cascais Fishing');
};
