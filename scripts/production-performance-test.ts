#!/usr/bin/env tsx
/**
 * Production Performance Testing Script
 * Task T9.4: Performance & Load Testing
 * 
 * Tests API endpoints and validates Core Web Vitals
 */

import { performance } from 'perf_hooks'

interface PerformanceTestResult {
  endpoint: string
  method: string
  responseTime: number
  status: number
  success: boolean
  error?: string
  payload?: any
}

interface PerformanceTestSuite {
  testName: string
  results: PerformanceTestResult[]
  averageResponseTime: number
  successRate: number
  passedTests: number
  totalTests: number
}

class ProductionPerformanceTest {
  private baseUrl = 'https://cascais-fishing-h8wz7jhtx-victors-projects-1cb47092.vercel.app'
  private results: PerformanceTestResult[] = []

  async runTest(
    endpoint: string, 
    method: 'GET' | 'POST' = 'GET',
    payload?: any
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now()
    
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Production-Performance-Test/1.0'
        }
      }

      if (payload && method === 'POST') {
        options.body = JSON.stringify(payload)
      }

      console.log(`🧪 Testing ${method} ${endpoint}`)
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, options)
      const responseTime = performance.now() - startTime
      
      const result: PerformanceTestResult = {
        endpoint,
        method,
        responseTime: Math.round(responseTime),
        status: response.status,
        success: response.ok,
        payload: method === 'GET' ? null : payload
      }

      if (!response.ok) {
        result.error = `HTTP ${response.status}: ${response.statusText}`
      }

      this.results.push(result)
      return result

    } catch (error) {
      const responseTime = performance.now() - startTime
      const result: PerformanceTestResult = {
        endpoint,
        method,
        responseTime: Math.round(responseTime),
        status: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        payload: method === 'GET' ? null : payload
      }
      
      this.results.push(result)
      return result
    }
  }

  async runAPIEndpointTests(): Promise<PerformanceTestSuite> {
    console.log('\n🚀 Starting Production API Performance Tests...\n')
    
    const testEndpoints = [
      // Core API endpoints
      { endpoint: '/api/health', method: 'GET' as const },
      { endpoint: '/api/fishing-diary', method: 'GET' as const },
      { endpoint: '/api/achievements', method: 'GET' as const },
      { endpoint: '/api/weather/current', method: 'GET' as const },
      { endpoint: '/api/smart-recommendations', method: 'GET' as const },
      
      // Authentication endpoints  
      { endpoint: '/api/auth/session', method: 'GET' as const },
      { endpoint: '/api/auth/providers', method: 'GET' as const },
      
      // Chat endpoints (Stream Chat)
      { endpoint: '/api/chat/health', method: 'GET' as const },
      { endpoint: '/api/chat/token', method: 'POST' as const, payload: { userId: 'test-user' } },
      
      // Performance critical endpoints
      { endpoint: '/api/performance/metrics', method: 'GET' as const },
      { endpoint: '/api/error-reports', method: 'GET' as const },
    ]

    // Run all tests
    for (const { endpoint, method, payload } of testEndpoints) {
      await this.runTest(endpoint, method, payload)
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return this.calculateTestSuite('Production API Endpoints')
  }

  async runPageLoadTests(): Promise<PerformanceTestSuite> {
    console.log('\n🌐 Starting Page Load Performance Tests...\n')
    
    const pages = [
      '/',
      '/fishing-diary', 
      '/smart-recommendations',
      '/auth/signin'
    ]

    for (const page of pages) {
      await this.runTest(page, 'GET')
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    return this.calculateTestSuite('Page Load Performance')
  }

  calculateTestSuite(testName: string): PerformanceTestSuite {
    const relevantResults = this.results.filter(r => 
      testName.includes('API') ? r.endpoint.startsWith('/api') : !r.endpoint.startsWith('/api')
    )
    
    const totalTests = relevantResults.length
    const passedTests = relevantResults.filter(r => r.success).length
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    
    const responseTimes = relevantResults.map(r => r.responseTime)
    const averageResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0

    return {
      testName,
      results: relevantResults,
      averageResponseTime,
      successRate: Math.round(successRate),
      passedTests,
      totalTests
    }
  }

  printResults(suite: PerformanceTestSuite) {
    console.log(`\n📊 ${suite.testName} Results:`)
    console.log('=' .repeat(50))
    console.log(`✅ Success Rate: ${suite.successRate}% (${suite.passedTests}/${suite.totalTests})`)
    console.log(`⚡ Average Response Time: ${suite.averageResponseTime}ms`)
    console.log(`🎯 Performance Target: <200ms API, <2000ms Pages`)
    
    const performanceMet = suite.testName.includes('API') 
      ? suite.averageResponseTime < 200 
      : suite.averageResponseTime < 2000
    
    console.log(`🎉 Performance Target: ${performanceMet ? '✅ MET' : '❌ FAILED'}`)
    
    console.log('\nDetailed Results:')
    suite.results.forEach(result => {
      const status = result.success ? '✅' : '❌'
      const perf = result.responseTime < (result.endpoint.startsWith('/api') ? 200 : 2000) ? '⚡' : '🐌'
      console.log(`${status} ${perf} ${result.method} ${result.endpoint} - ${result.responseTime}ms (HTTP ${result.status})`)
      
      if (result.error) {
        console.log(`   ❌ Error: ${result.error}`)
      }
    })
  }

  async runFullPerformanceTest(): Promise<void> {
    console.log('🎯 Production Performance Testing Suite')
    console.log('=====================================')
    console.log(`Target Application: ${this.baseUrl}`)
    console.log(`Test Time: ${new Date().toISOString()}`)
    
    try {
      // Run API endpoint tests
      const apiSuite = await this.runAPIEndpointTests()
      this.printResults(apiSuite)
      
      // Reset results for page tests
      this.results = []
      
      // Run page load tests  
      const pageSuite = await this.runPageLoadTests()
      this.printResults(pageSuite)
      
      // Overall summary
      const overallSuccess = (apiSuite.successRate + pageSuite.successRate) / 2
      const overallPerformance = (apiSuite.averageResponseTime + pageSuite.averageResponseTime) / 2
      
      console.log('\n🎯 OVERALL PERFORMANCE SUMMARY')
      console.log('==============================')
      console.log(`📈 Overall Success Rate: ${Math.round(overallSuccess)}%`)
      console.log(`⚡ Overall Average Response: ${Math.round(overallPerformance)}ms`)
      
      const passedOverall = overallSuccess >= 80 && 
        apiSuite.averageResponseTime < 200 && 
        pageSuite.averageResponseTime < 2000
      
      console.log(`🏆 Production Ready: ${passedOverall ? '✅ YES' : '❌ NEEDS ATTENTION'}`)
      
      if (!passedOverall) {
        console.log('\n⚠️  Performance Issues Detected:')
        if (overallSuccess < 80) console.log('   • Low success rate - API/page errors need investigation')
        if (apiSuite.averageResponseTime >= 200) console.log('   • Slow API responses - consider optimization')  
        if (pageSuite.averageResponseTime >= 2000) console.log('   • Slow page loads - optimize frontend bundles')
      }
      
    } catch (error) {
      console.error('❌ Performance test failed:', error)
      process.exit(1)
    }
  }
}

// Run the tests
async function main() {
  const tester = new ProductionPerformanceTest()
  await tester.runFullPerformanceTest()
}

if (require.main === module) {
  main().catch(console.error)
}

export default ProductionPerformanceTest
