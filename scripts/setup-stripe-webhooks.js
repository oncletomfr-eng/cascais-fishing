#!/usr/bin/env node

/**
 * Automatic Stripe Webhook Setup Script
 * Based on Context7 Stripe Node.js documentation and best practices
 * Creates webhook endpoints programmatically for production deployment
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

console.log(`${colors.blue}${colors.bright}🔗 AUTOMATIC STRIPE WEBHOOK SETUP${colors.reset}\n`);

// Validate environment
if (!process.env.STRIPE_SECRET_KEY) {
  console.error(`${colors.red}❌ STRIPE_SECRET_KEY not found in .env.local${colors.reset}`);
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Webhook events based on Context7 and t3dotgg recommendations
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
  'customer.subscription.pending_update_applied',
  'customer.subscription.pending_update_expired',
  'customer.subscription.trial_will_end',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.upcoming',
  'invoice.marked_uncollectible',
  'invoice.payment_succeeded',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'payment_intent.processing',
  'charge.dispute.created',
];

async function setupWebhook() {
  try {
    // Get webhook URL from environment or use default
    const webhookUrl = process.env.WEBHOOK_URL || 'https://cascaisfishing.com/api/stripe-webhooks';
    
    console.log(`${colors.blue}Setting up webhook for: ${webhookUrl}${colors.reset}\n`);

    // Check if webhook already exists
    console.log('🔍 Checking for existing webhooks...');
    const existingWebhooks = await stripe.webhookEndpoints.list({
      limit: 100
    });

    // Find webhook with matching URL
    const existingWebhook = existingWebhooks.data.find(
      webhook => webhook.url === webhookUrl
    );

    if (existingWebhook) {
      console.log(`${colors.yellow}⚠️ Webhook already exists: ${existingWebhook.id}${colors.reset}`);
      console.log(`   Status: ${existingWebhook.status}`);
      console.log(`   Events: ${existingWebhook.enabled_events.length} events`);
      
      // Update existing webhook
      console.log('\n🔄 Updating existing webhook...');
      const updatedWebhook = await stripe.webhookEndpoints.update(existingWebhook.id, {
        enabled_events: WEBHOOK_EVENTS,
        description: 'Cascais Fishing - Production Webhook (Auto-configured)',
      });

      console.log(`${colors.green}✅ Webhook updated successfully!${colors.reset}`);
      console.log(`   ID: ${updatedWebhook.id}`);
      console.log(`   Events: ${updatedWebhook.enabled_events.length}`);
      
      // Get signing secret
      const webhookSecret = updatedWebhook.secret;
      console.log(`\n${colors.bright}🔐 WEBHOOK SECRET:${colors.reset}`);
      console.log(`${colors.yellow}${webhookSecret}${colors.reset}\n`);
      
      displayEnvInstructions(webhookSecret);
      return updatedWebhook;
    }

    // Create new webhook
    console.log('📋 Creating new webhook endpoint...');
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: WEBHOOK_EVENTS,
      description: 'Cascais Fishing - Production Webhook (Auto-configured)',
      api_version: '2024-12-18.acacia', // Match lib/stripe.ts version
    });

    console.log(`${colors.green}✅ Webhook created successfully!${colors.reset}`);
    console.log(`   ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Events: ${webhook.enabled_events.length}`);
    console.log(`   Status: ${webhook.status}`);

    // Display webhook secret
    console.log(`\n${colors.bright}🔐 WEBHOOK SECRET (SAVE THIS):${colors.reset}`);
    console.log(`${colors.yellow}${webhook.secret}${colors.reset}\n`);

    displayEnvInstructions(webhook.secret);
    displayEventsList(webhook.enabled_events);
    
    return webhook;

  } catch (error) {
    console.error(`${colors.red}❌ Error setting up webhook:${colors.reset}`, error.message);
    
    if (error.code === 'url_invalid') {
      console.error(`\n${colors.yellow}💡 URL Validation Error:${colors.reset}`);
      console.error('   - Make sure your domain is accessible from the internet');
      console.error('   - Webhook URL must be HTTPS in live mode');
      console.error('   - Test connectivity: curl -I https://yourdomain.com/api/stripe-webhooks');
    }
    
    process.exit(1);
  }
}

function displayEnvInstructions(secret) {
  console.log(`${colors.bright}📝 UPDATE YOUR .env.local:${colors.reset}`);
  console.log('Add or update the following line:');
  console.log(`${colors.blue}STRIPE_WEBHOOK_SECRET="${secret}"${colors.reset}\n`);
  
  console.log(`${colors.bright}⚡ QUICK UPDATE COMMAND:${colors.reset}`);
  console.log(`${colors.blue}sed -i '' 's/STRIPE_WEBHOOK_SECRET=.*/STRIPE_WEBHOOK_SECRET="${secret}"/' .env.local${colors.reset}\n`);
}

function displayEventsList(events) {
  console.log(`${colors.bright}📊 CONFIGURED EVENTS (${events.length}):${colors.reset}`);
  events.forEach(event => {
    console.log(`   ✅ ${event}`);
  });
  console.log();
}

async function testWebhookConnection() {
  console.log(`${colors.bright}🧪 TESTING WEBHOOK CONNECTION...${colors.reset}`);
  
  try {
    // Create a test customer to trigger an event
    console.log('Creating test customer...');
    const customer = await stripe.customers.create({
      email: 'webhook-test@cascaisfishing.com',
      name: 'Webhook Test Customer',
      metadata: {
        test: 'webhook_setup_verification'
      }
    });

    console.log(`${colors.green}✅ Test customer created: ${customer.id}${colors.reset}`);
    
    // Clean up test customer
    await stripe.customers.del(customer.id);
    console.log(`${colors.green}✅ Test customer cleaned up${colors.reset}`);
    
    console.log(`\n${colors.yellow}💡 Check your webhook endpoint logs to verify event delivery${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Webhook test failed:${colors.reset}`, error.message);
  }
}

async function main() {
  try {
    // Check if we're in test or live mode
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    
    if (isLiveMode) {
      console.log(`${colors.green}${colors.bright}🚀 LIVE MODE DETECTED${colors.reset}`);
      console.log('This will create a PRODUCTION webhook endpoint.\n');
    } else {
      console.log(`${colors.yellow}${colors.bright}🧪 TEST MODE DETECTED${colors.reset}`);
      console.log('This will create a TEST webhook endpoint.\n');
    }

    // Setup webhook
    const webhook = await setupWebhook();
    
    // Test connection
    if (process.argv.includes('--test')) {
      await testWebhookConnection();
    }

    console.log(`${colors.bright}🎯 NEXT STEPS:${colors.reset}`);
    console.log('1. Update your .env.local with the webhook secret above');
    console.log('2. Restart your Next.js application');
    console.log('3. Test webhook delivery by making a test payment');
    console.log('4. Monitor webhook events in Stripe Dashboard');
    
    if (isLiveMode) {
      console.log(`\n${colors.red}${colors.bright}⚠️ IMPORTANT - PRODUCTION MODE:${colors.reset}`);
      console.log('• All webhook events will be REAL');
      console.log('• Ensure your application is ready for production');
      console.log('• Test thoroughly before going live');
    }

    console.log(`\n${colors.green}${colors.bright}✅ WEBHOOK SETUP COMPLETE!${colors.reset}\n`);

  } catch (error) {
    console.error(`${colors.red}❌ Setup failed:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// CLI argument parsing
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colors.bright}Stripe Webhook Setup Script${colors.reset}

Usage: node scripts/setup-stripe-webhooks.js [options]

Options:
  --test    Run webhook connection test after setup
  --help    Show this help message

Environment Variables:
  STRIPE_SECRET_KEY    Your Stripe secret key (required)
  WEBHOOK_URL         Custom webhook URL (optional)
                      Default: https://cascaisfishing.com/api/stripe-webhooks

Examples:
  node scripts/setup-stripe-webhooks.js
  node scripts/setup-stripe-webhooks.js --test
  WEBHOOK_URL=https://example.com/webhooks node scripts/setup-stripe-webhooks.js
`);
  process.exit(0);
}

// Run the setup
main().catch(console.error);
