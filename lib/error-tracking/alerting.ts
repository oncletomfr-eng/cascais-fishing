import * as Sentry from '@sentry/nextjs';

// Error alerting configuration and utilities

export interface AlertConfig {
  email?: string;
  slack?: {
    webhook: string;
    channel: string;
  };
  discord?: {
    webhook: string;
  };
  threshold: {
    errorRate: number;      // Errors per minute
    responseTime: number;   // Milliseconds
    errorCount: number;     // Total errors in time window
    timeWindow: number;     // Minutes
  };
}

// Default alert configuration
export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  threshold: {
    errorRate: 10,        // 10+ errors per minute
    responseTime: 5000,   // 5+ seconds response time
    errorCount: 50,       // 50+ total errors in 15 minutes
    timeWindow: 15,       // 15 minute window
  }
};

/**
 * Critical error patterns that should trigger immediate alerts
 */
const CRITICAL_ERROR_PATTERNS = [
  /database.*connection.*failed/i,
  /authentication.*failed/i,
  /payment.*processing.*error/i,
  /email.*service.*unavailable/i,
  /file.*upload.*failed/i,
  /unauthorized.*access/i,
  /rate.*limit.*exceeded/i,
  /memory.*limit.*exceeded/i,
  /timeout.*exceeded/i,
  /stripe.*webhook.*failed/i,
];

/**
 * Check if error should trigger critical alert
 */
export function isCriticalError(error: Error, context?: any): boolean {
  const errorText = `${error.name} ${error.message} ${error.stack || ''}`;
  
  // Check for critical patterns
  const hasCriticalPattern = CRITICAL_ERROR_PATTERNS.some(pattern => 
    pattern.test(errorText)
  );
  
  if (hasCriticalPattern) {
    return true;
  }
  
  // Check for critical endpoints
  const criticalEndpoints = ['/api/auth/', '/api/payments/', '/api/admin/'];
  const isCriticalEndpoint = criticalEndpoints.some(endpoint => 
    context?.endpoint?.includes(endpoint)
  );
  
  if (isCriticalEndpoint) {
    return true;
  }
  
  // Check for error level
  if (context?.level === 'fatal' || context?.level === 'critical') {
    return true;
  }
  
  return false;
}

/**
 * Send immediate alert for critical errors
 */
export async function sendCriticalAlert(
  error: Error,
  context: any,
  config: AlertConfig = DEFAULT_ALERT_CONFIG
) {
  const alertData = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500), // Limit stack trace
    },
    context: {
      endpoint: context.endpoint,
      method: context.method,
      userId: context.userId,
      userAgent: context.userAgent?.substring(0, 100),
      ip: context.ip,
    },
    severity: 'CRITICAL',
    app: 'cascais-fishing',
  };
  
  // Send to Sentry with high priority
  Sentry.withScope((scope) => {
    scope.setLevel('fatal');
    scope.setTag('alert', 'critical');
    scope.setTag('priority', 'high');
    scope.setContext('alertData', alertData);
    
    Sentry.captureException(error);
  });
  
  // Send notifications
  await Promise.allSettled([
    sendSlackAlert(alertData, config.slack),
    sendDiscordAlert(alertData, config.discord),
    sendEmailAlert(alertData, config.email),
  ]);
  
  console.error('🚨 CRITICAL ALERT SENT:', {
    error: error.message,
    endpoint: context.endpoint,
    timestamp: alertData.timestamp
  });
}

/**
 * Send Slack alert
 */
async function sendSlackAlert(
  alertData: any,
  slackConfig?: AlertConfig['slack']
) {
  if (!slackConfig?.webhook) {
    return;
  }
  
  try {
    const payload = {
      channel: slackConfig.channel || '#alerts',
      username: 'Cascais Fishing Alert',
      icon_emoji: ':rotating_light:',
      attachments: [
        {
          color: 'danger',
          title: `🚨 Critical Error in ${alertData.app}`,
          fields: [
            {
              title: 'Error',
              value: `\`${alertData.error.name}: ${alertData.error.message}\``,
              short: false
            },
            {
              title: 'Endpoint',
              value: alertData.context.endpoint || 'Unknown',
              short: true
            },
            {
              title: 'Environment',
              value: alertData.environment || 'Unknown',
              short: true
            },
            {
              title: 'User',
              value: alertData.context.userId || 'Anonymous',
              short: true
            },
            {
              title: 'Time',
              value: alertData.timestamp,
              short: true
            }
          ],
          footer: 'Sentry Error Tracking'
        }
      ]
    };
    
    await fetch(slackConfig.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('✅ Slack alert sent');
  } catch (error) {
    console.error('❌ Failed to send Slack alert:', error);
  }
}

/**
 * Send Discord alert
 */
async function sendDiscordAlert(
  alertData: any,
  discordConfig?: AlertConfig['discord']
) {
  if (!discordConfig?.webhook) {
    return;
  }
  
  try {
    const payload = {
      embeds: [
        {
          title: '🚨 Critical Error Alert',
          description: `**Error in ${alertData.app}**`,
          color: 15158332, // Red color
          fields: [
            {
              name: 'Error',
              value: `\`\`\`${alertData.error.name}: ${alertData.error.message}\`\`\``,
              inline: false
            },
            {
              name: 'Endpoint',
              value: alertData.context.endpoint || 'Unknown',
              inline: true
            },
            {
              name: 'Environment',
              value: alertData.environment || 'Unknown',
              inline: true
            },
            {
              name: 'User',
              value: alertData.context.userId || 'Anonymous',
              inline: true
            }
          ],
          timestamp: alertData.timestamp,
          footer: {
            text: 'Cascais Fishing Error Tracking'
          }
        }
      ]
    };
    
    await fetch(discordConfig.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('✅ Discord alert sent');
  } catch (error) {
    console.error('❌ Failed to send Discord alert:', error);
  }
}

/**
 * Send email alert (using existing email service)
 */
async function sendEmailAlert(alertData: any, emailConfig?: string) {
  if (!emailConfig) {
    return;
  }
  
  try {
    // Use existing email service
    const emailService = await import('@/lib/services/email-service');
    
    await emailService.sendCriticalErrorAlert({
      to: emailConfig,
      error: alertData.error,
      context: alertData.context,
      timestamp: alertData.timestamp,
      environment: alertData.environment,
    });
    
    console.log('✅ Email alert sent');
  } catch (error) {
    console.error('❌ Failed to send email alert:', error);
  }
}

/**
 * Enhanced error capture with alerting
 */
export function captureErrorWithAlerting(
  error: Error,
  context: any,
  alertConfig?: AlertConfig
) {
  // Always capture to Sentry
  Sentry.captureException(error);
  
  // Check if this is a critical error
  if (isCriticalError(error, context)) {
    // Send immediate alert (non-blocking)
    sendCriticalAlert(error, context, alertConfig).catch(alertError => {
      console.error('Failed to send critical alert:', alertError);
    });
  }
}

/**
 * Error rate monitoring
 */
class ErrorRateMonitor {
  private errorCounts = new Map<string, number>();
  private readonly timeWindow = 15 * 60 * 1000; // 15 minutes
  
  recordError(endpoint: string) {
    const key = `${endpoint}:${Date.now()}`;
    this.errorCounts.set(key, Date.now());
    
    // Clean old entries
    this.cleanup();
    
    // Check if we've exceeded the threshold
    this.checkThreshold(endpoint);
  }
  
  private cleanup() {
    const cutoff = Date.now() - this.timeWindow;
    for (const [key, timestamp] of this.errorCounts) {
      if (timestamp < cutoff) {
        this.errorCounts.delete(key);
      }
    }
  }
  
  private checkThreshold(endpoint: string) {
    const recentErrors = Array.from(this.errorCounts.entries())
      .filter(([key, timestamp]) => {
        return key.includes(endpoint) && 
               timestamp > Date.now() - this.timeWindow;
      });
    
    if (recentErrors.length >= DEFAULT_ALERT_CONFIG.threshold.errorCount) {
      // High error rate detected
      Sentry.captureMessage(
        `High error rate detected: ${recentErrors.length} errors in ${DEFAULT_ALERT_CONFIG.threshold.timeWindow} minutes for ${endpoint}`,
        'warning'
      );
      
      console.warn('⚠️ High error rate detected:', {
        endpoint,
        errorCount: recentErrors.length,
        timeWindow: DEFAULT_ALERT_CONFIG.threshold.timeWindow
      });
    }
  }
}

export const errorRateMonitor = new ErrorRateMonitor();
