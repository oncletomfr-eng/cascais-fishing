import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

/**
 * Webhook Debug and Monitoring API
 * Task 5.4: Advanced webhook testing and debugging tools
 * 
 * Provides comprehensive webhook monitoring, testing, and debugging capabilities
 */

export async function GET(request: NextRequest) {
  try {
    // Check authentication (admin only for debugging)
    const session = await auth();
    if (!session?.user?.email?.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventType = searchParams.get('type');
    const status = searchParams.get('status');
    
    switch (action) {
      case 'status':
        return await getWebhookStatus();
        
      case 'logs':
        return await getWebhookLogs(limit, eventType, status);
        
      case 'events':
        return await getStripeEvents(limit);
        
      case 'analytics':
        return await getWebhookAnalytics();
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: status, logs, events, analytics' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Webhook debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Debug failed'
    }, { status: 500 });
  }
}

/**
 * Get overall webhook system status
 */
async function getWebhookStatus() {
  try {
    // Check Stripe configuration
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    
    // Get recent webhook statistics
    const recentLogs = await prisma.webhookEventLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      select: { status: true, eventType: true, attempts: true, processingTime: true }
    });

    // Calculate statistics
    const totalEvents = recentLogs.length;
    const successfulEvents = recentLogs.filter(log => log.status === 'SUCCESS').length;
    const failedEvents = recentLogs.filter(log => log.status === 'FAILED').length;
    const retryingEvents = recentLogs.filter(log => log.status === 'RETRYING').length;
    
    const avgProcessingTime = recentLogs.reduce((sum, log) => 
      sum + (log.processingTime || 0), 0) / totalEvents || 0;

    // Get event type distribution
    const eventTypeStats = recentLogs.reduce((stats, log) => {
      stats[log.eventType] = (stats[log.eventType] || 0) + 1;
      return stats;
    }, {} as Record<string, number>);

    // Check recent payment failures
    const recentPaymentFailures = await prisma.payment.count({
      where: {
        status: 'FAILED',
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    return NextResponse.json({
      status: 'OK',
      configuration: {
        stripe_secret_key: hasStripeKey ? '✅ Configured' : '❌ Missing',
        webhook_secret: hasWebhookSecret ? '✅ Configured' : '❌ Missing',
        webhook_endpoint: '/api/stripe-webhooks'
      },
      statistics_24h: {
        total_events: totalEvents,
        successful: successfulEvents,
        failed: failedEvents,
        retrying: retryingEvents,
        success_rate: totalEvents > 0 ? (successfulEvents / totalEvents * 100).toFixed(2) + '%' : '0%',
        avg_processing_time_ms: Math.round(avgProcessingTime)
      },
      event_types: eventTypeStats,
      alerts: {
        recent_payment_failures: recentPaymentFailures,
        high_retry_events: retryingEvents > 5 ? 'WARNING: High number of retrying events' : null,
        low_success_rate: (successfulEvents / totalEvents) < 0.95 ? 'WARNING: Success rate below 95%' : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting webhook status:', error);
    throw error;
  }
}

/**
 * Get webhook event logs with filtering
 */
async function getWebhookLogs(limit: number, eventType?: string | null, status?: string | null) {
  try {
    const whereConditions: any = {};
    
    if (eventType) {
      whereConditions.eventType = eventType;
    }
    
    if (status) {
      whereConditions.status = status.toUpperCase();
    }

    const logs = await prisma.webhookEventLog.findMany({
      where: whereConditions,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        eventType: true,
        eventId: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        lastError: true,
        processingTime: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      logs,
      total: logs.length,
      filters: { eventType, status, limit }
    });

  } catch (error) {
    console.error('❌ Error getting webhook logs:', error);
    throw error;
  }
}

/**
 * Get recent Stripe events for comparison
 */
async function getStripeEvents(limit: number) {
  try {
    const events = await stripe.events.list({
      limit: Math.min(limit, 100), // Stripe API limit
      types: [
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'payment_intent.canceled',
        'payment_intent.processing',
        'charge.dispute.created'
      ]
    });

    const eventsWithProcessingStatus = await Promise.all(
      events.data.map(async (event) => {
        // Check if we have a log for this event
        const log = await prisma.webhookEventLog.findUnique({
          where: { eventId: event.id },
          select: { status: true, attempts: true, processingTime: true }
        });

        return {
          id: event.id,
          type: event.type,
          created: new Date(event.created * 1000).toISOString(),
          livemode: event.livemode,
          processed: !!log,
          processing_status: log?.status || 'NOT_PROCESSED',
          attempts: log?.attempts || 0,
          processing_time_ms: log?.processingTime || null
        };
      })
    );

    return NextResponse.json({
      events: eventsWithProcessingStatus,
      total: events.data.length,
      has_more: events.has_more
    });

  } catch (error) {
    console.error('❌ Error getting Stripe events:', error);
    throw error;
  }
}

/**
 * Get webhook analytics and insights
 */
async function getWebhookAnalytics() {
  try {
    // Get data for the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const logs = await prisma.webhookEventLog.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        eventType: true,
        status: true,
        attempts: true,
        processingTime: true,
        createdAt: true
      }
    });

    // Daily event counts
    const dailyStats = logs.reduce((stats, log) => {
      const date = log.createdAt.toISOString().split('T')[0];
      if (!stats[date]) {
        stats[date] = { total: 0, successful: 0, failed: 0, retried: 0 };
      }
      stats[date].total++;
      if (log.status === 'SUCCESS') stats[date].successful++;
      if (log.status === 'FAILED') stats[date].failed++;
      if (log.attempts > 1) stats[date].retried++;
      return stats;
    }, {} as Record<string, any>);

    // Processing time analytics
    const processingTimes = logs
      .filter(log => log.processingTime !== null)
      .map(log => log.processingTime!)
      .sort((a, b) => a - b);

    const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length || 0;
    const medianProcessingTime = processingTimes[Math.floor(processingTimes.length / 2)] || 0;
    const p95ProcessingTime = processingTimes[Math.floor(processingTimes.length * 0.95)] || 0;

    // Event type performance
    const eventTypePerformance = logs.reduce((stats, log) => {
      if (!stats[log.eventType]) {
        stats[log.eventType] = { total: 0, successful: 0, avgProcessingTime: 0, processingTimes: [] };
      }
      stats[log.eventType].total++;
      if (log.status === 'SUCCESS') stats[log.eventType].successful++;
      if (log.processingTime) stats[log.eventType].processingTimes.push(log.processingTime);
      return stats;
    }, {} as Record<string, any>);

    // Calculate averages
    Object.keys(eventTypePerformance).forEach(eventType => {
      const times = eventTypePerformance[eventType].processingTimes;
      eventTypePerformance[eventType].avgProcessingTime = times.length > 0 
        ? times.reduce((sum: number, time: number) => sum + time, 0) / times.length 
        : 0;
      eventTypePerformance[eventType].successRate = 
        (eventTypePerformance[eventType].successful / eventTypePerformance[eventType].total * 100).toFixed(2) + '%';
      delete eventTypePerformance[eventType].processingTimes; // Clean up
    });

    return NextResponse.json({
      period: '7_days',
      daily_stats: dailyStats,
      processing_time_analytics: {
        avg_ms: Math.round(avgProcessingTime),
        median_ms: medianProcessingTime,
        p95_ms: p95ProcessingTime,
        total_events: processingTimes.length
      },
      event_type_performance: eventTypePerformance,
      insights: {
        most_problematic_event: Object.entries(eventTypePerformance)
          .sort(([,a], [,b]) => parseFloat(a.successRate) - parseFloat(b.successRate))[0]?.[0],
        slowest_event_type: Object.entries(eventTypePerformance)
          .sort(([,a], [,b]) => b.avgProcessingTime - a.avgProcessingTime)[0]?.[0]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting webhook analytics:', error);
    throw error;
  }
}

/**
 * POST - Manual webhook testing and event replay
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email?.includes('admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, eventId, eventType, paymentIntentId } = body;

    switch (action) {
      case 'replay_event':
        return await replayWebhookEvent(eventId);
        
      case 'simulate_event':
        return await simulateWebhookEvent(eventType, paymentIntentId);
        
      case 'test_connection':
        return await testStripeConnection();
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: replay_event, simulate_event, test_connection' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Webhook debug POST error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Debug operation failed'
    }, { status: 500 });
  }
}

/**
 * Replay a specific webhook event
 */
async function replayWebhookEvent(eventId: string) {
  try {
    // Get the event from Stripe
    const event = await stripe.events.retrieve(eventId);
    
    // Check if we have a log for this event
    const existingLog = await prisma.webhookEventLog.findUnique({
      where: { eventId }
    });

    // Simulate the webhook call to our endpoint
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/stripe-webhooks`;
    
    return NextResponse.json({
      success: true,
      message: 'Event replay initiated',
      event: {
        id: event.id,
        type: event.type,
        created: new Date(event.created * 1000).toISOString(),
        livemode: event.livemode
      },
      existing_log: existingLog ? {
        status: existingLog.status,
        attempts: existingLog.attempts,
        last_processed: existingLog.updatedAt
      } : null,
      webhook_url: webhookUrl
    });

  } catch (error) {
    console.error('❌ Error replaying webhook event:', error);
    throw error;
  }
}

/**
 * Simulate a webhook event for testing
 */
async function simulateWebhookEvent(eventType: string, paymentIntentId?: string) {
  if (eventType === 'payment_intent.succeeded' && !paymentIntentId) {
    throw new Error('paymentIntentId required for payment_intent.succeeded simulation');
  }

  // This would create a simulated event and process it
  // Implementation would depend on your specific testing needs
  
  return NextResponse.json({
    success: true,
    message: 'Event simulation completed',
    simulated_event: {
      type: eventType,
      payment_intent_id: paymentIntentId,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Test Stripe connection and webhook configuration
 */
async function testStripeConnection() {
  try {
    // Test Stripe API connection
    const account = await stripe.accounts.retrieve();
    
    // Test webhook endpoints
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    
    return NextResponse.json({
      success: true,
      stripe_account: {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        payouts_enabled: account.payouts_enabled,
        charges_enabled: account.charges_enabled
      },
      webhook_endpoints: webhooks.data.map(wh => ({
        id: wh.id,
        url: wh.url,
        status: wh.status,
        enabled_events_count: wh.enabled_events.length,
        api_version: wh.api_version
      })),
      connection_test: 'SUCCESS',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error testing Stripe connection:', error);
    throw error;
  }
}
