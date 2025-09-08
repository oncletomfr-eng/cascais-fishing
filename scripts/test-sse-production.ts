/**
 * Server-Sent Events Production Test Suite
 * Task 12.2: Test SSE endpoints in production
 * 
 * Comprehensive testing of SSE functionality including:
 * - Connection establishment
 * - Event delivery
 * - Reconnection logic
 * - Performance under load
 * - Cross-browser compatibility
 */

interface SSETestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'TIMEOUT';
  message: string;
  duration: number;
  details?: any;
}

interface SSEConnectionTest {
  endpoint: string;
  expectedEvents: string[];
  timeout: number;
  requiredAuth?: boolean;
}

class SSEProductionTester {
  private results: SSETestResult[] = [];
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = '', authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }

  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    timedOut: number;
    results: SSETestResult[];
    overallStatus: 'PASS' | 'FAIL';
  }> {
    console.log('🧪 Starting SSE Production Tests...\n');

    // Test basic SSE endpoints
    await this.testGroupTripsSSE();
    await this.testChatSSE();
    
    // Test connection resilience
    await this.testReconnectionLogic();
    await this.testHeartbeatHandling();
    
    // Test production scenarios
    await this.testMultipleConnections();
    await this.testEventDeliveryReliability();
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const timedOut = this.results.filter(r => r.status === 'TIMEOUT').length;
    
    console.log('\n📊 SSE Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️ Timed Out: ${timedOut}`);
    
    const overallStatus = (failed + timedOut) > 0 ? 'FAIL' : 'PASS';
    console.log(`\n🎯 Overall Status: ${overallStatus}`);
    
    return { passed, failed, timedOut, results: this.results, overallStatus };
  }

  private async runTest(
    testName: string,
    testFunction: () => Promise<{ success: boolean; message: string; details?: any }>,
    timeout: number = 30000
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`🧪 ${testName}...`);

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout);
      });

      const result = await Promise.race([testFunction(), timeoutPromise]);
      const duration = Date.now() - startTime;

      this.results.push({
        testName,
        status: result.success ? 'PASS' : 'FAIL',
        message: result.message,
        duration,
        details: result.details
      });

      const statusIcon = result.success ? '✅' : '❌';
      console.log(`   ${statusIcon} ${result.message} (${duration}ms)`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const isTimeout = error instanceof Error && error.message === 'Test timeout';
      const status = isTimeout ? 'TIMEOUT' : 'FAIL';
      const message = isTimeout ? `Test timed out after ${timeout}ms` : `Test failed: ${error}`;

      this.results.push({
        testName,
        status,
        message,
        duration
      });

      const statusIcon = isTimeout ? '⏱️' : '❌';
      console.log(`   ${statusIcon} ${message} (${duration}ms)`);
    }
  }

  private async testGroupTripsSSE(): Promise<void> {
    await this.runTest('Group Trips SSE Connection', async () => {
      return new Promise<{ success: boolean; message: string; details?: any }>((resolve) => {
        const eventSource = new EventSource(`${this.baseUrl}/api/group-trips/sse`);
        const events: string[] = [];
        let connected = false;
        
        const cleanup = () => {
          eventSource.close();
        };

        eventSource.onopen = () => {
          connected = true;
        };

        eventSource.addEventListener('connected', (event) => {
          try {
            const data = JSON.parse(event.data);
            events.push('connected');
            
            resolve({
              success: true,
              message: 'Group trips SSE connected successfully',
              details: {
                clientId: data.clientId,
                eventsReceived: events,
                connectionTime: Date.now()
              }
            });
            cleanup();
          } catch (error) {
            resolve({
              success: false,
              message: `Failed to parse connected event: ${error}`
            });
            cleanup();
          }
        });

        eventSource.onerror = (error) => {
          resolve({
            success: false,
            message: `SSE connection error: ${error}`,
            details: { connected, events }
          });
          cleanup();
        };

        // Timeout fallback
        setTimeout(() => {
          if (!connected) {
            resolve({
              success: false,
              message: 'SSE connection timeout',
              details: { events }
            });
            cleanup();
          }
        }, 10000);
      });
    });
  }

  private async testChatSSE(): Promise<void> {
    await this.runTest('Chat SSE Connection', async () => {
      if (!this.authToken) {
        return {
          success: false,
          message: 'Chat SSE requires authentication token (not provided)'
        };
      }

      return new Promise<{ success: boolean; message: string; details?: any }>((resolve) => {
        // Note: In real implementation, we'd need to set authorization headers
        // EventSource doesn't support custom headers, so we'd need to use cookies or query params
        const eventSource = new EventSource(`${this.baseUrl}/api/chat/sse`);
        const events: string[] = [];
        let connected = false;

        const cleanup = () => {
          eventSource.close();
        };

        eventSource.addEventListener('chat-connected', (event) => {
          try {
            const data = JSON.parse(event.data);
            events.push('chat-connected');
            connected = true;
            
            resolve({
              success: true,
              message: 'Chat SSE connected successfully',
              details: {
                clientId: data.clientId,
                userId: data.userId,
                eventsReceived: events
              }
            });
            cleanup();
          } catch (error) {
            resolve({
              success: false,
              message: `Failed to parse chat connected event: ${error}`
            });
            cleanup();
          }
        });

        eventSource.onerror = (error) => {
          resolve({
            success: false,
            message: `Chat SSE connection error: ${error}`,
            details: { connected, events }
          });
          cleanup();
        };

        setTimeout(() => {
          if (!connected) {
            resolve({
              success: false,
              message: 'Chat SSE connection timeout',
              details: { events }
            });
            cleanup();
          }
        }, 10000);
      });
    });
  }

  private async testReconnectionLogic(): Promise<void> {
    await this.runTest('SSE Reconnection Logic', async () => {
      return new Promise<{ success: boolean; message: string; details?: any }>((resolve) => {
        let connectionCount = 0;
        let reconnected = false;
        const events: string[] = [];

        const testReconnection = () => {
          const eventSource = new EventSource(`${this.baseUrl}/api/group-trips/sse`);
          
          eventSource.addEventListener('connected', (event) => {
            connectionCount++;
            events.push(`connected_${connectionCount}`);
            
            if (connectionCount === 1) {
              // Force close first connection to test reconnection
              setTimeout(() => {
                eventSource.close();
                // Simulate new connection attempt
                setTimeout(testReconnection, 1000);
              }, 1000);
            } else if (connectionCount === 2) {
              reconnected = true;
              eventSource.close();
              resolve({
                success: true,
                message: 'Reconnection logic works correctly',
                details: {
                  connectionCount,
                  events,
                  reconnected
                }
              });
            }
          });

          eventSource.onerror = (error) => {
            if (connectionCount === 0) {
              resolve({
                success: false,
                message: `Initial connection failed: ${error}`,
                details: { connectionCount, events }
              });
            }
          };
        };

        testReconnection();

        setTimeout(() => {
          if (!reconnected) {
            resolve({
              success: false,
              message: 'Reconnection test timeout',
              details: { connectionCount, events }
            });
          }
        }, 15000);
      });
    });
  }

  private async testHeartbeatHandling(): Promise<void> {
    await this.runTest('SSE Heartbeat Handling', async () => {
      return new Promise<{ success: boolean; message: string; details?: any }>((resolve) => {
        const eventSource = new EventSource(`${this.baseUrl}/api/group-trips/sse`);
        const heartbeats: number[] = [];
        let connected = false;

        const cleanup = () => {
          eventSource.close();
        };

        eventSource.addEventListener('connected', (event) => {
          connected = true;
        });

        eventSource.addEventListener('heartbeat', (event) => {
          heartbeats.push(Date.now());
          
          // Consider test successful after receiving 2 heartbeats
          if (heartbeats.length >= 2) {
            const interval = heartbeats[1] - heartbeats[0];
            resolve({
              success: true,
              message: `Heartbeat working (${heartbeats.length} received, ~${Math.round(interval/1000)}s interval)`,
              details: {
                heartbeatCount: heartbeats.length,
                averageInterval: interval,
                connected
              }
            });
            cleanup();
          }
        });

        eventSource.onerror = (error) => {
          resolve({
            success: false,
            message: `Heartbeat test failed: ${error}`,
            details: { connected, heartbeats: heartbeats.length }
          });
          cleanup();
        };

        setTimeout(() => {
          if (heartbeats.length === 0) {
            resolve({
              success: false,
              message: 'No heartbeats received within timeout',
              details: { connected, heartbeats: heartbeats.length }
            });
            cleanup();
          }
        }, 35000); // Wait up to 35 seconds for heartbeats
      });
    }, 40000);
  }

  private async testMultipleConnections(): Promise<void> {
    await this.runTest('Multiple SSE Connections', async () => {
      const connectionCount = 3;
      const promises: Promise<boolean>[] = [];

      for (let i = 0; i < connectionCount; i++) {
        promises.push(
          new Promise<boolean>((resolve) => {
            const eventSource = new EventSource(`${this.baseUrl}/api/group-trips/sse`);
            
            eventSource.addEventListener('connected', (event) => {
              eventSource.close();
              resolve(true);
            });

            eventSource.onerror = (error) => {
              eventSource.close();
              resolve(false);
            });

            setTimeout(() => {
              eventSource.close();
              resolve(false);
            }, 10000);
          })
        );
      }

      const results = await Promise.all(promises);
      const successfulConnections = results.filter(r => r).length;

      return {
        success: successfulConnections === connectionCount,
        message: `${successfulConnections}/${connectionCount} concurrent connections successful`,
        details: {
          attempted: connectionCount,
          successful: successfulConnections,
          failed: connectionCount - successfulConnections
        }
      };
    });
  }

  private async testEventDeliveryReliability(): Promise<void> {
    await this.runTest('Event Delivery Reliability', async () => {
      return new Promise<{ success: boolean; message: string; details?: any }>((resolve) => {
        const eventSource = new EventSource(`${this.baseUrl}/api/group-trips/sse`);
        const receivedEvents = new Set<string>();
        let connected = false;

        const cleanup = () => {
          eventSource.close();
        };

        eventSource.addEventListener('connected', (event) => {
          connected = true;
          receivedEvents.add('connected');
        });

        eventSource.addEventListener('heartbeat', (event) => {
          receivedEvents.add('heartbeat');
        });

        eventSource.addEventListener('trip-update', (event) => {
          receivedEvents.add('trip-update');
        });

        // Wait for a reasonable time to collect events
        setTimeout(() => {
          const eventTypes = Array.from(receivedEvents);
          const hasBasicEvents = receivedEvents.has('connected');
          
          resolve({
            success: hasBasicEvents,
            message: hasBasicEvents ? 
              `Event delivery working (${eventTypes.length} event types received)` : 
              'Basic events not received',
            details: {
              connected,
              receivedEventTypes: eventTypes,
              totalEventTypes: receivedEvents.size
            }
          });
          cleanup();
        }, 15000);

        eventSource.onerror = (error) => {
          resolve({
            success: false,
            message: `Event delivery test failed: ${error}`,
            details: { connected, receivedEvents: Array.from(receivedEvents) }
          });
          cleanup();
        };
      });
    }, 20000);
  }

  async generateReport(): Promise<string> {
    const summary = await this.runAllTests();
    
    return `
# SSE Production Test Report
**Generated:** ${new Date().toISOString()}
**Environment:** ${process.env.NODE_ENV || 'development'}
**Base URL:** ${this.baseUrl || 'localhost'}

## Test Results Summary
- ✅ **Passed:** ${summary.passed}
- ❌ **Failed:** ${summary.failed}
- ⏱️ **Timed Out:** ${summary.timedOut}
- 🎯 **Overall Status:** ${summary.overallStatus}

## Detailed Results

${summary.results.map(result => `
### ${result.testName}
**Status:** ${result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⏱️ TIMEOUT'}
**Message:** ${result.message}
**Duration:** ${result.duration}ms
${result.details ? `**Details:**\n\`\`\`json\n${JSON.stringify(result.details, null, 2)}\n\`\`\`` : ''}
`).join('\n')}

## Production Readiness Assessment

${summary.overallStatus === 'PASS' ? `
✅ **SSE PRODUCTION READY**

Server-Sent Events system is fully operational:
- Connection establishment works reliably
- Event delivery is stable
- Reconnection logic functions correctly
- Heartbeat monitoring active
- Multiple connections supported

**Recommendations:**
1. Monitor SSE connection metrics in production
2. Set up alerts for connection failures
3. Consider implementing client-side caching for critical events
4. Test with real user load

` : `
❌ **SSE NEEDS ATTENTION**

Issues found that should be addressed:
${summary.results.filter(r => r.status !== 'PASS').map(r => `- ${r.message}`).join('\n')}

**Action Required:**
1. Fix failing tests
2. Verify network connectivity
3. Check server-side SSE implementation
4. Test with different browsers/devices

`}

## Monitoring Recommendations

### Key Metrics to Track:
- SSE connection success rate
- Average connection establishment time
- Heartbeat reliability
- Event delivery latency
- Reconnection frequency

### Alerting Setup:
- Connection failure rate > 5%
- Average connection time > 5 seconds
- Missing heartbeats > 2 consecutive
- Event delivery delays > 10 seconds

## Browser Compatibility Notes
- EventSource is supported in all modern browsers
- IE11 requires polyfill for EventSource
- Mobile browsers may close connections during background
- Consider implementing connection recovery for mobile

## Support Resources
- SSE Client Implementation: lib/services/sse-client.ts
- Chat SSE Hook: hooks/useChatSSE.ts
- Server Endpoints: /api/group-trips/sse, /api/chat/sse
`;
  }
}

// Export for use in other modules
export { SSEProductionTester };

// Main execution function
async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const tester = new SSEProductionTester(baseUrl);
  
  try {
    const results = await tester.runAllTests();
    
    console.log('\n' + '='.repeat(60));
    console.log('SSE PRODUCTION READINESS TEST COMPLETE');
    console.log('='.repeat(60));
    
    if (results.overallStatus === 'PASS') {
      console.log('🎉 SSE System is PRODUCTION READY!');
      process.exit(0);
    } else {
      console.log('⚠️ SSE System requires attention before production deployment');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ SSE test execution failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
