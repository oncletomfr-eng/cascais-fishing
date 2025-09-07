/**
 * Performance Baseline Establishment Script
 * Измеряет cold start, warm response, memory usage, и database timing
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  timestamp: string;
  coldStart: {
    healthCheck: number;
    simpleApi: number;
    average: number;
  };
  warmResponse: {
    healthCheck: number[];
    simpleApi: number[];
    average: number;
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  databaseTiming: {
    connectionTime: number;
    queryTime: number;
    poolStatus: any;
  };
  systemInfo: {
    nodeVersion: string;
    platform: string;
    uptime: number;
  };
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_ITERATIONS = 5;

class PerformanceBenchmark {
  private metrics: PerformanceMetrics = {
    timestamp: new Date().toISOString(),
    coldStart: {
      healthCheck: 0,
      simpleApi: 0,
      average: 0
    },
    warmResponse: {
      healthCheck: [],
      simpleApi: [],
      average: 0
    },
    memoryUsage: {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0
    },
    databaseTiming: {
      connectionTime: 0,
      queryTime: 0,
      poolStatus: null
    },
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: Math.floor(process.uptime())
    }
  };

  private async measureResponseTime(url: string, label: string): Promise<number> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'PerformanceBaseline/1.0'
        }
      });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      console.log(`📊 ${label}: ${Math.round(responseTime)}ms (${response.status})`);
      
      return responseTime;
    } catch (error) {
      console.error(`❌ ${label} failed:`, error);
      return -1;
    }
  }

  private async measureColdStart(): Promise<void> {
    console.log('🧊 Measuring Cold Start Performance...\n');
    
    // Wait for potential warm-up to cool down
    console.log('⏱️  Waiting 30 seconds for functions to cool down...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Measure health check cold start
    const healthTime = await this.measureResponseTime(
      `${BASE_URL}/api/admin/health`,
      'Health Check Cold Start'
    );
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Measure simple API cold start 
    const apiTime = await this.measureResponseTime(
      `${BASE_URL}/api/db-check`,
      'Simple API Cold Start'
    );

    this.metrics.coldStart = {
      healthCheck: healthTime,
      simpleApi: apiTime,
      average: (healthTime + apiTime) / 2
    };
  }

  private async measureWarmResponse(): Promise<void> {
    console.log('\n🔥 Measuring Warm Response Performance...\n');
    
    const healthTimes: number[] = [];
    const apiTimes: number[] = [];

    for (let i = 1; i <= TEST_ITERATIONS; i++) {
      console.log(`--- Iteration ${i}/${TEST_ITERATIONS} ---`);
      
      // Health check warm response
      const healthTime = await this.measureResponseTime(
        `${BASE_URL}/api/admin/health`,
        `Health Check Warm #${i}`
      );
      healthTimes.push(healthTime);
      
      // Wait between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simple API warm response
      const apiTime = await this.measureResponseTime(
        `${BASE_URL}/api/db-check`, 
        `Simple API Warm #${i}`
      );
      apiTimes.push(apiTime);
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const allWarmTimes = [...healthTimes, ...apiTimes];
    const warmAverage = allWarmTimes.reduce((a, b) => a + b, 0) / allWarmTimes.length;

    this.metrics.warmResponse = {
      healthCheck: healthTimes,
      simpleApi: apiTimes,
      average: warmAverage
    };
  }

  private async measureMemoryUsage(): Promise<void> {
    console.log('\n🧠 Analyzing Memory Usage...\n');
    
    const memUsage = process.memoryUsage();
    
    this.metrics.memoryUsage = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB  
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024) // MB
    };

    console.log(`📊 Heap Used: ${this.metrics.memoryUsage.heapUsed}MB`);
    console.log(`📊 Heap Total: ${this.metrics.memoryUsage.heapTotal}MB`);
    console.log(`📊 External: ${this.metrics.memoryUsage.external}MB`);
    console.log(`📊 RSS: ${this.metrics.memoryUsage.rss}MB`);
  }

  private async measureDatabaseTiming(): Promise<void> {
    console.log('\n🗄️  Measuring Database Performance...\n');
    
    try {
      // Measure database timing via health check
      const dbStartTime = performance.now();
      
      const response = await fetch(`${BASE_URL}/api/admin/health`);
      const data = await response.json() as any;
      
      const dbEndTime = performance.now();
      
      if (data.services?.database) {
        this.metrics.databaseTiming = {
          connectionTime: dbEndTime - dbStartTime,
          queryTime: data.services.database.responseTime || 0,
          poolStatus: data.services.database.connectionPool || null
        };
        
        console.log(`📊 Total DB Time: ${Math.round(this.metrics.databaseTiming.connectionTime)}ms`);
        console.log(`📊 Query Time: ${Math.round(this.metrics.databaseTiming.queryTime)}ms`);
        
        if (this.metrics.databaseTiming.poolStatus) {
          const pool = this.metrics.databaseTiming.poolStatus;
          console.log(`📊 Pool: ${pool.active}/${pool.total} active (${pool.idle} idle)`);
        }
      }
      
    } catch (error) {
      console.error('❌ Database timing measurement failed:', error);
    }
  }

  private generateReport(): string {
    const report = `
# 📈 Performance Baseline Report
Generated: ${this.metrics.timestamp}

## 🧊 Cold Start Performance
- Health Check: ${Math.round(this.metrics.coldStart.healthCheck)}ms
- Simple API: ${Math.round(this.metrics.coldStart.simpleApi)}ms
- **Average Cold Start: ${Math.round(this.metrics.coldStart.average)}ms**

## 🔥 Warm Response Performance  
- Health Check Average: ${Math.round(this.metrics.warmResponse.healthCheck.reduce((a, b) => a + b, 0) / this.metrics.warmResponse.healthCheck.length)}ms
- Simple API Average: ${Math.round(this.metrics.warmResponse.simpleApi.reduce((a, b) => a + b, 0) / this.metrics.warmResponse.simpleApi.length)}ms  
- **Overall Warm Average: ${Math.round(this.metrics.warmResponse.average)}ms**

## 🧠 Memory Usage Baseline
- Heap Used: ${this.metrics.memoryUsage.heapUsed}MB
- Heap Total: ${this.metrics.memoryUsage.heapTotal}MB
- External: ${this.metrics.memoryUsage.external}MB
- RSS: ${this.metrics.memoryUsage.rss}MB
- **Memory Efficiency: ${Math.round((this.metrics.memoryUsage.heapUsed / this.metrics.memoryUsage.heapTotal) * 100)}%**

## 🗄️  Database Performance
- Connection + Query: ${Math.round(this.metrics.databaseTiming.connectionTime)}ms
- Query Only: ${Math.round(this.metrics.databaseTiming.queryTime)}ms
${this.metrics.databaseTiming.poolStatus ? 
  `- Pool Status: ${this.metrics.databaseTiming.poolStatus.active}/${this.metrics.databaseTiming.poolStatus.total} active` : 
  '- Pool Status: Not available'}

## 🖥️  System Environment
- Node.js: ${this.metrics.systemInfo.nodeVersion}
- Platform: ${this.metrics.systemInfo.platform}  
- Script Uptime: ${this.metrics.systemInfo.uptime}s

## 🎯 Performance Targets (Based on Baseline)
- Cold Start Target: < ${Math.round(this.metrics.coldStart.average * 1.2)}ms
- Warm Response Target: < ${Math.round(this.metrics.warmResponse.average * 1.1)}ms
- Memory Usage Target: < ${this.metrics.memoryUsage.heapUsed + 50}MB heap
- Database Query Target: < ${Math.round(this.metrics.databaseTiming.queryTime * 1.1)}ms

---
*Baseline established with ${TEST_ITERATIONS} warm iterations*
*Next baseline measurement recommended in 30 days*
`;
    return report;
  }

  public async run(): Promise<void> {
    console.log('🚀 Performance Baseline Establishment Starting...\n');
    
    // Task 6.1 & 6.2 & 6.3 - Combined execution
    await this.measureMemoryUsage();
    await this.measureDatabaseTiming();
    await this.measureColdStart();
    await this.measureWarmResponse();
    
    console.log('\n✅ Baseline measurements complete!\n');
    
    // Generate and save report
    const report = this.generateReport();
    console.log(report);
    
    // Save JSON metrics
    const fs = require('fs');
    const path = require('path');
    
    const reportsDir = path.join(process.cwd(), '.taskmaster', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const jsonPath = path.join(reportsDir, 'performance-baseline.json');
    const reportPath = path.join(reportsDir, 'performance-baseline-report.md');
    
    fs.writeFileSync(jsonPath, JSON.stringify(this.metrics, null, 2));
    fs.writeFileSync(reportPath, report);
    
    console.log(`📄 Detailed metrics saved: ${jsonPath}`);
    console.log(`📊 Report saved: ${reportPath}`);
    console.log('\n🎯 Performance baseline established successfully!');
  }
}

// Execute benchmark
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run().catch(console.error);
}

export { PerformanceBenchmark, PerformanceMetrics };
