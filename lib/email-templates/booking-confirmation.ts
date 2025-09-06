import { baseEmailTemplate, formatCurrency, formatDate, companyInfo } from './common';

export interface BookingConfirmationData {
  customerName: string;
  confirmationCode: string;
  date: string;
  time: string;
  participants: number;
  totalPrice: number;
  customerPhone?: string;
  customerEmail?: string;
  tripType?: 'private' | 'group';
  additionalInfo?: string;
}

// Private booking confirmation template
export const privateBookingConfirmationTemplate = (data: BookingConfirmationData): string => {
  const content = `
    <div class="email-header">
      <h1 class="email-title">🎣 Your Private Charter is Confirmed!</h1>
    </div>
    
    <div class="email-content">
      <p>Olá <strong>${data.customerName}</strong>,</p>
      
      <div class="success">
        <strong>🎉 Congratulations!</strong> Your private fishing charter has been confirmed and is ready for an amazing Atlantic adventure!
      </div>
      
      <div class="details-box">
        <div class="details-title">📋 Booking Details</div>
        <div class="detail-item">
          📅 <strong>Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ⏰ <strong>Time:</strong> ${data.time}
        </div>
        <div class="detail-item">
          👥 <strong>Participants:</strong> ${data.participants} ${data.participants === 1 ? 'person' : 'people'}
        </div>
        <div class="detail-item">
          💰 <strong>Total Price:</strong> ${formatCurrency(data.totalPrice)}
        </div>
        <div class="detail-item">
          📋 <strong>Confirmation Code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
        ${data.customerPhone ? `
        <div class="detail-item">
          📞 <strong>Contact:</strong> ${data.customerPhone}
        </div>
        ` : ''}
      </div>
      
      <div class="warning">
        <strong>⚠️ Important:</strong> Please arrive 15 minutes early at Cascais Marina. Bring your confirmation code and a valid ID.
      </div>
      
      <hr class="divider" />
      
      <h3>🎯 What to Expect</h3>
      <ul>
        <li><strong>Duration:</strong> 3-4 hours of Atlantic fishing</li>
        <li><strong>Equipment:</strong> All fishing gear and bait included</li>
        <li><strong>Guide:</strong> Professional captain with 15+ years experience</li>
        <li><strong>Refreshments:</strong> Water and light snacks provided</li>
        <li><strong>Fish Cleaning:</strong> We'll prepare your catch for you</li>
        <li><strong>Photos:</strong> Professional photos of your adventure included</li>
      </ul>
      
      <h3>📍 Meeting Point</h3>
      <div class="details-box">
        <strong>Cascais Marina</strong><br/>
        Marina de Cascais, 2750-800 Cascais<br/>
        Look for Captain João near the fishing boats<br/>
        <span class="highlight">GPS: 38.6967° N, 9.4227° W</span>
      </div>
      
      ${data.additionalInfo ? `
      <div class="warning">
        <strong>📝 Additional Information:</strong><br/>
        ${data.additionalInfo}
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/351934027852" class="email-button">
          💬 Contact via WhatsApp
        </a>
      </div>
      
      <p>We're excited to share this amazing Atlantic fishing experience with you!</p>
      <p><strong>Tight lines!</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '🎣 Private Charter Confirmed - Cascais Fishing');
};

// Group booking confirmation template
export const groupBookingConfirmationTemplate = (data: BookingConfirmationData & {
  currentParticipants: number;
  maxParticipants: number;
  price: number;
}): string => {
  const content = `
    <div class="email-header">
      <h1 class="email-title">🎣 You've Joined the Fishing Crew!</h1>
    </div>
    
    <div class="email-content">
      <p>Olá <strong>${data.customerName}</strong>,</p>
      
      <div class="success">
        <strong>🎉 Welcome aboard!</strong> You've successfully joined a group fishing adventure!
      </div>
      
      <div class="details-box">
        <div class="details-title">🎯 Trip Details</div>
        <div class="detail-item">
          📅 <strong>Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ⏰ <strong>Time:</strong> ${data.time}
        </div>
        <div class="detail-item">
          💰 <strong>Price per person:</strong> ${formatCurrency(data.price)}
        </div>
        <div class="detail-item">
          👥 <strong>Group status:</strong> ${data.currentParticipants}/${data.maxParticipants} participants
        </div>
        <div class="detail-item">
          📋 <strong>Your booking code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
      </div>
      
      <div class="warning">
        <strong>📋 Next Steps:</strong> We'll notify you by email once the minimum group size is reached and the trip is confirmed.
      </div>
      
      <hr class="divider" />
      
      <h3>🎯 What's Included</h3>
      <ul>
        <li>Professional fishing guide</li>
        <li>All equipment and bait</li>
        <li>Safety equipment</li>
        <li>Fish cleaning service</li>
        <li>Group photos</li>
        <li>Light refreshments</li>
      </ul>
      
      <h3>📍 Meeting Point</h3>
      <div class="details-box">
        <strong>Cascais Marina</strong><br/>
        Marina de Cascais, 2750-800 Cascais<br/>
        <span class="highlight">Arrive 15 minutes early</span>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/351934027852" class="email-button">
          💬 Contact via WhatsApp
        </a>
      </div>
      
      <p>Thank you for joining our fishing community! We'll be in touch soon.</p>
      <p><strong>Tight lines!</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '🎣 Group Trip Joined - Cascais Fishing');
};

// Group trip confirmed (when minimum participants reached)
export const groupTripConfirmedTemplate = (data: BookingConfirmationData & {
  finalParticipants: number;
  weatherConditions?: string;
}): string => {
  const content = `
    <div class="email-header">
      <h1 class="email-title">🎉 Great News - Your Group Trip is Confirmed!</h1>
    </div>
    
    <div class="email-content">
      <p>Olá <strong>${data.customerName}</strong>,</p>
      
      <div class="success">
        <strong>🚀 Confirmed!</strong> Your group fishing trip is now confirmed and ready to go!
      </div>
      
      <div class="details-box">
        <div class="details-title">📋 Final Trip Details</div>
        <div class="detail-item">
          📅 <strong>Date:</strong> ${formatDate(data.date)}
        </div>
        <div class="detail-item">
          ⏰ <strong>Time:</strong> ${data.time}
        </div>
        <div class="detail-item">
          👥 <strong>Group size:</strong> ${data.finalParticipants} confirmed participants
        </div>
        <div class="detail-item">
          📋 <strong>Your booking code:</strong> <span class="highlight">${data.confirmationCode}</span>
        </div>
        ${data.weatherConditions ? `
        <div class="detail-item">
          🌤️ <strong>Weather forecast:</strong> ${data.weatherConditions}
        </div>
        ` : ''}
      </div>
      
      <div class="warning">
        <strong>⚠️ Important Reminders:</strong><br/>
        • Arrive 15 minutes early at Cascais Marina<br/>
        • Bring your confirmation code and valid ID<br/>
        • Wear comfortable clothes and bring sunscreen<br/>
        • We provide all fishing equipment
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://wa.me/351934027852" class="email-button">
          💬 WhatsApp for Questions
        </a>
      </div>
      
      <p>Get ready for an incredible Atlantic fishing adventure with your fellow anglers!</p>
      <p><strong>See you at the marina!</strong><br/>Captain João & Team</p>
    </div>
    
    <div class="email-footer">
      <strong>${companyInfo.name}</strong><br/>
      ${companyInfo.address}<br/>
      📞 ${companyInfo.phone} | 📧 ${companyInfo.email}<br/>
      🌐 ${companyInfo.website}
    </div>
  `;
  
  return baseEmailTemplate(content, '🎉 Group Trip Confirmed - Cascais Fishing');
};
