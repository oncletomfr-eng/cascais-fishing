#!/bin/bash

# Setup Production Monitoring Cron Jobs
# Run this script on your monitoring server

set -e

echo "🔧 Setting up Cascais Fishing production monitoring..."

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MONITOR_SCRIPT="$SCRIPT_DIR/monitor-health.js"
LOG_DIR="$PROJECT_DIR/tmp"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Make monitor script executable
chmod +x "$MONITOR_SCRIPT"

# Backup existing crontab
crontab -l > "$LOG_DIR/crontab-backup-$(date +%Y%m%d-%H%M%S).txt" 2>/dev/null || echo "No existing crontab to backup"

# Create new cron entries
TEMP_CRON=$(mktemp)

# Add existing crontab entries (if any)
crontab -l 2>/dev/null | grep -v "cascais-fishing-monitor" > "$TEMP_CRON" || true

# Add Cascais Fishing monitoring jobs
cat >> "$TEMP_CRON" << EOF

# Cascais Fishing Production Monitoring
# Health check every 5 minutes
*/5 * * * * /usr/bin/env node $MONITOR_SCRIPT >> $LOG_DIR/monitor-cron.log 2>&1 # cascais-fishing-monitor

# Daily log rotation at 2 AM
0 2 * * * cd $PROJECT_DIR && find tmp/ -name "*.log" -mtime +7 -delete # cascais-fishing-monitor

# Weekly monitoring report (Sundays at 9 AM)  
0 9 * * 0 cd $PROJECT_DIR && echo "Weekly Monitoring Report - $(date)" >> $LOG_DIR/weekly-report.log # cascais-fishing-monitor

EOF

# Install new crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

echo "✅ Monitoring cron jobs installed successfully!"
echo ""
echo "📋 Installed cron jobs:"
echo "  - Health check every 5 minutes"
echo "  - Daily log cleanup at 2 AM"
echo "  - Weekly monitoring report on Sundays"
echo ""
echo "🔍 To view installed jobs: crontab -l"
echo "📄 Monitor logs will be in: $LOG_DIR/"
echo ""
echo "🚀 Environment variables to configure:"
echo "  HEALTH_URL=https://www.cascaisfishing.com/api/health"
echo "  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
echo "  MONITOR_TIMEOUT=10000"
echo "  ALERT_COOLDOWN=300000"
echo ""
echo "⚠️  Remember to:"
echo "  1. Configure Slack webhook URL in environment"
echo "  2. Test manual run: node $MONITOR_SCRIPT"
echo "  3. Check logs: tail -f $LOG_DIR/monitor-cron.log"
