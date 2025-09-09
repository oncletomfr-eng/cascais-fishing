#!/usr/bin/env node

/**
 * Production Health Monitor Script
 * Monitors the Cascais Fishing platform health and sends alerts
 * Can be run as a cron job for external monitoring
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  healthUrl: process.env.HEALTH_URL || 'https://www.cascaisfishing.com/api/health',
  timeout: parseInt(process.env.MONITOR_TIMEOUT) || 10000, // 10 seconds
  retries: parseInt(process.env.MONITOR_RETRIES) || 3,
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  logFile: process.env.MONITOR_LOG_FILE || path.join(__dirname, '../tmp/health-monitor.log'),
  alertCooldown: parseInt(process.env.ALERT_COOLDOWN) || 300000, // 5 minutes
};

// Alert state tracking
const STATE_FILE = path.join(__dirname, '../tmp/monitor-state.json');

class HealthMonitor {
  constructor() {
    this.state = this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      }
    } catch (error) {
      this.log('ERROR', `Failed to load state: ${error.message}`);
    }
    return { lastAlert: 0, consecutiveFailures: 0 };
  }

  saveState() {
    try {
      const dir = path.dirname(STATE_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.log('ERROR', `Failed to save state: ${error.message}`);
    }
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}`;
    
    console.log(logMessage);
    
    try {
      const dir = path.dirname(CONFIG.logFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.request(url, {
        timeout: CONFIG.timeout,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          try {
            const parsed = JSON.parse(data);
            resolve({
              status: res.statusCode,
              data: parsed,
              responseTime,
              headers: res.headers
            });
          } catch (error) {
            resolve({
              status: res.statusCode,
              data: data,
              responseTime,
              headers: res.headers,
              parseError: error.message
            });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  async checkHealth() {
    let lastError = null;

    for (let attempt = 1; attempt <= CONFIG.retries; attempt++) {
      try {
        this.log('INFO', `Health check attempt ${attempt}/${CONFIG.retries}`);
        
        const response = await this.makeRequest(CONFIG.healthUrl);
        
        this.log('INFO', `Response: Status=${response.status}, Time=${response.responseTime}ms`);
        
        if (response.status === 200) {
          const health = response.data;
          
          if (health.status === 'healthy') {
            // Reset failure count on success
            this.state.consecutiveFailures = 0;
            this.saveState();
            
            this.log('INFO', '✅ System is healthy');
            return { success: true, health, responseTime: response.responseTime };
          } else if (health.status === 'degraded') {
            this.log('WARN', `⚠️ System degraded: ${health.alerts?.join(', ') || 'Unknown issues'}`);
            return { 
              success: true, 
              health, 
              responseTime: response.responseTime,
              degraded: true 
            };
          } else {
            throw new Error(`Unhealthy status: ${health.status} - ${health.alerts?.join(', ')}`);
          }
        } else if (response.status === 503) {
          const health = response.data;
          throw new Error(`Service unavailable: ${health.alerts?.join(', ') || 'System down'}`);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.data}`);
        }
        
      } catch (error) {
        lastError = error;
        this.log('ERROR', `Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < CONFIG.retries) {
          this.log('INFO', 'Waiting 5 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }

    // All attempts failed
    this.state.consecutiveFailures++;
    this.saveState();
    
    return { 
      success: false, 
      error: lastError?.message || 'Unknown error',
      consecutiveFailures: this.state.consecutiveFailures
    };
  }

  shouldSendAlert(result) {
    const now = Date.now();
    
    // Don't send alerts too frequently
    if (now - this.state.lastAlert < CONFIG.alertCooldown) {
      return false;
    }

    // Send alert on first failure or every 5th consecutive failure
    if (!result.success && (this.state.consecutiveFailures === 1 || this.state.consecutiveFailures % 5 === 0)) {
      return true;
    }

    // Send alert for degraded status every 3rd check
    if (result.degraded && this.state.consecutiveFailures % 3 === 0) {
      return true;
    }

    return false;
  }

  async sendSlackAlert(result) {
    if (!CONFIG.slackWebhook) {
      this.log('WARN', 'No Slack webhook configured, skipping alert');
      return;
    }

    const color = result.success ? (result.degraded ? 'warning' : 'good') : 'danger';
    const emoji = result.success ? (result.degraded ? '⚠️' : '✅') : '❌';
    
    let title = `${emoji} Cascais Fishing Health Alert`;
    let message = '';
    
    if (!result.success) {
      title = `❌ CRITICAL: Cascais Fishing System Down`;
      message = `System has failed ${result.consecutiveFailures} consecutive health checks.\nError: ${result.error}`;
    } else if (result.degraded) {
      title = `⚠️ WARNING: Cascais Fishing System Degraded`;
      message = `System is running with issues:\n${result.health.alerts.map(a => `• ${a}`).join('\n')}`;
    }

    const payload = {
      attachments: [{
        color,
        title,
        text: message,
        fields: [
          {
            title: 'Status',
            value: result.success ? (result.degraded ? 'Degraded' : 'Healthy') : 'Down',
            short: true
          },
          {
            title: 'Response Time',
            value: result.responseTime ? `${result.responseTime}ms` : 'N/A',
            short: true
          },
          {
            title: 'Consecutive Failures',
            value: result.consecutiveFailures.toString(),
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true
          }
        ],
        footer: 'Cascais Fishing Monitor',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    try {
      await this.makeRequest(CONFIG.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Note: We need to actually send the payload
      const req = https.request(CONFIG.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      req.write(JSON.stringify(payload));
      req.end();
      
      this.log('INFO', 'Slack alert sent successfully');
      this.state.lastAlert = Date.now();
      this.saveState();
      
    } catch (error) {
      this.log('ERROR', `Failed to send Slack alert: ${error.message}`);
    }
  }

  async run() {
    this.log('INFO', '🏁 Starting health monitor check');
    
    try {
      const result = await this.checkHealth();
      
      if (this.shouldSendAlert(result)) {
        await this.sendSlackAlert(result);
      }
      
      // Exit with appropriate code
      if (!result.success) {
        this.log('ERROR', '💥 Health check failed');
        process.exit(1);
      } else if (result.degraded) {
        this.log('WARN', '⚠️ Health check shows degraded performance');
        process.exit(0); // Still considered success for monitoring purposes
      } else {
        this.log('INFO', '✅ Health check passed');
        process.exit(0);
      }
      
    } catch (error) {
      this.log('ERROR', `Monitor crashed: ${error.message}`);
      this.log('ERROR', error.stack);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new HealthMonitor();
  monitor.run();
}

module.exports = HealthMonitor;
