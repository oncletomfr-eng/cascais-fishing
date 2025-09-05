import { Resend } from 'resend';
import { render } from '@react-email/components';
import ParticipantApprovalNotification from '../emails/ParticipantApprovalNotification.tsx';
import BadgeAwardedNotification from '../emails/BadgeAwardedNotification.tsx';

// Инициализируем Resend только в production или с валидным API ключом
const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_development_key_placeholder' 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface ParticipantApprovalData {
  participantEmail: string;
  participantName: string;
  captainName: string;
  tripTitle: string;
  tripDate: string;
  status: 'APPROVED' | 'REJECTED';
  rejectedReason?: string;
  tripDetailsUrl: string;
}

interface BadgeAwardedData {
  userEmail: string;
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

class EmailService {
  private fromEmail = 'noreply@cascaisfishing.com';
  private fromName = 'Cascais Fishing';

  /**
   * Отправка email уведомления об одобрении/отклонении участника
   */
  async sendParticipantApprovalNotification(data: ParticipantApprovalData): Promise<boolean> {
    try {
      const emailHtml = await render(
        ParticipantApprovalNotification({
          participantName: data.participantName,
          captainName: data.captainName,
          tripTitle: data.tripTitle,
          tripDate: data.tripDate,
          status: data.status,
          rejectedReason: data.rejectedReason,
          tripDetailsUrl: data.tripDetailsUrl
        })
      );

      const subject = data.status === 'APPROVED' 
        ? `✅ Ваша заявка на поездку "${data.tripTitle}" одобрена!`
        : `❌ Ваша заявка на поездку "${data.tripTitle}" отклонена`;

      const result = await this.sendEmail({
        to: data.participantEmail,
        subject,
        html: emailHtml
      });

      console.log(`📧 Participant approval email sent: ${data.participantEmail} (${data.status})`);
      return result;

    } catch (error) {
      console.error('Error sending participant approval email:', error);
      return false;
    }
  }

  /**
   * Отправка уведомления о получении нового достижения
   */
  async sendBadgeAwardedNotification(data: BadgeAwardedData): Promise<boolean> {
    try {
      const emailHtml = await render(
        BadgeAwardedNotification({
          userName: data.userName,
          badge: data.badge,
          totalBadges: data.totalBadges,
          profileUrl: data.profileUrl
        })
      );

      const subject = `🏆 Новое достижение: ${data.badge.name}!`;

      const result = await this.sendEmail({
        to: data.userEmail,
        subject,
        html: emailHtml
      });

      console.log(`📧 Badge awarded email sent: ${data.userEmail} (${data.badge.name})`);
      return result;

    } catch (error) {
      console.error('Error sending badge awarded email:', error);
      return false;
    }
  }

  /**
   * Отправка группового уведомления о подтверждении поездки
   */
  async sendTripConfirmedNotification(
    participants: Array<{ email: string; name: string }>,
    tripData: {
      title: string;
      date: string;
      timeSlot: string;
      meetingPoint: string;
      captainName: string;
      tripDetailsUrl: string;
    }
  ): Promise<boolean> {
    try {
      const emailPromises = participants.map(participant => {
        const subject = `🎉 Поездка "${tripData.title}" подтверждена!`;
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">🎣 Поездка подтверждена!</h2>
            <p>Привет, ${participant.name}!</p>
            <p>Отличные новости! Ваша групповая поездка "<strong>${tripData.title}</strong>" набрала достаточно участников и была подтверждена.</p>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">📅 Детали поездки:</h3>
              <p><strong>Дата:</strong> ${tripData.date}</p>
              <p><strong>Время:</strong> ${tripData.timeSlot}</p>
              <p><strong>Место встречи:</strong> ${tripData.meetingPoint}</p>
              <p><strong>Капитан:</strong> ${tripData.captainName}</p>
            </div>

            <p><strong>Что дальше?</strong></p>
            <ul>
              <li>Подготовьте снаряжение</li>
              <li>Прибудьте вовремя к месту встречи</li>
              <li>Следите за обновлениями в чате</li>
              <li>Не забудьте документы</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="${tripData.tripDetailsUrl}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Детали поездки</a>
            </p>

            <p style="color: #666; font-size: 12px; text-align: center;">
              С уважением,<br>Команда Cascais Fishing
            </p>
          </div>
        `;

        return this.sendEmail({
          to: participant.email,
          subject,
          html
        });
      });

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;

      console.log(`📧 Trip confirmed emails sent: ${successCount}/${participants.length}`);
      return successCount === participants.length;

    } catch (error) {
      console.error('Error sending trip confirmed emails:', error);
      return false;
    }
  }

  /**
   * Базовая функция отправки email через Resend
   */
  private async sendEmail(data: EmailData): Promise<boolean> {
    try {
      // Development режим - если нет API ключа, логируем email вместо отправки
      if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_development_key_placeholder') {
        console.log('📧 [DEVELOPMENT MODE] Email would be sent:');
        console.log({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: data.to,
          subject: data.subject,
          htmlLength: data.html.length,
          environment: process.env.NODE_ENV
        });
        console.log('📧 Email HTML content preview:', data.html.substring(0, 200) + '...');
        
        // В development режиме всегда возвращаем true (успешно "отправлен")
        return true;
      }

      // Production режим - реальная отправка через Resend
      if (!resend) {
        console.error('❌ Resend client not initialized - missing or invalid API key');
        return false;
      }

      const result = await resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: data.to,
        subject: data.subject,
        html: data.html
      });

      if (result.error) {
        console.error('Resend API error:', result.error);
        return false;
      }

      console.log('📧 [PRODUCTION] Email sent successfully:', { 
        to: data.to, 
        subject: data.subject,
        emailId: result.data?.id 
      });

      return true;

    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  /**
   * Отправка welcome email для новых пользователей
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    try {
      const subject = '🎣 Добро пожаловать в Cascais Fishing!';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">🎣 Cascais Fishing</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Добро пожаловать, ${userName}! 🎉</h2>
            
            <p>Рады приветствовать вас в нашем рыболовном сообществе! Теперь у вас есть доступ к лучшим рыболовным поездкам в Кашкайше.</p>
            
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">🚀 Начните прямо сейчас:</h3>
              <ul>
                <li>Заполните свой профиль рыболова</li>
                <li>Просмотрите доступные групповые поездки</li>
                <li>Забронируйте свою первую поездку</li>
                <li>Присоединитесь к нашему сообществу</li>
              </ul>
            </div>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://cascaisfishing.com/profile" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Заполнить профиль</a>
            </p>

            <p>Если у вас есть вопросы, не стесняйтесь обращаться к нам!</p>
          </div>
          
          <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              С уважением, команда Cascais Fishing<br>
              support@cascaisfishing.com
            </p>
          </div>
        </div>
      `;

      const result = await this.sendEmail({
        to: userEmail,
        subject,
        html
      });

      console.log(`📧 Welcome email sent: ${userEmail}`);
      return result;

    } catch (error) {
      console.error('Error sending welcome email:', error);
      return false;
    }
  }
}

// Экспортируем единственный экземпляр
export const emailService = new EmailService();
