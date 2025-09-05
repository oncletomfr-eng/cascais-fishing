/**
 * DEBUGGING API ROUTE: Module Resolution Test
 * Purpose: Trigger module imports during build to capture resolution logs
 */

// Test different import patterns that have been problematic
import { NextRequest, NextResponse } from 'next/server';

// CRITICAL TEST: This is the exact import pattern that fails on Vercel
import {
  PrivateBookingConfirmationEmail,
  GroupBookingConfirmationEmail,
  GroupTripConfirmedEmail,
  ParticipantApprovalNotificationEmail,
  BadgeAwardedNotificationEmail,
} from '@/components/emails';

export async function GET(request: NextRequest) {
  console.log('🧪 DEBUG RESOLUTION API CALLED');
  console.log('==============================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`User Agent: ${request.headers.get('user-agent')}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Vercel: ${process.env.VERCEL || 'false'}`);
  console.log(`Vercel Environment: ${process.env.VERCEL_ENV || 'N/A'}`);
  
  // Test that imports were successful
  const importTests = [
    { name: 'PrivateBookingConfirmationEmail', component: PrivateBookingConfirmationEmail },
    { name: 'GroupBookingConfirmationEmail', component: GroupBookingConfirmationEmail },
    { name: 'GroupTripConfirmedEmail', component: GroupTripConfirmedEmail },
    { name: 'ParticipantApprovalNotificationEmail', component: ParticipantApprovalNotificationEmail },
    { name: 'BadgeAwardedNotificationEmail', component: BadgeAwardedNotificationEmail },
  ];
  
  const results = importTests.map(test => ({
    name: test.name,
    imported: typeof test.component !== 'undefined',
    type: typeof test.component,
    isFunction: typeof test.component === 'function',
  }));
  
  // Log results
  console.log('\n📊 IMPORT TEST RESULTS:');
  results.forEach(result => {
    const status = result.imported ? '✅' : '❌';
    console.log(`${status} ${result.name}: ${result.type} (function: ${result.isFunction})`);
  });
  
  // Attempt dynamic import as well (different resolution path)
  let dynamicImportResult = null;
  try {
    const dynamicImports = await import('@/components/emails');
    dynamicImportResult = {
      success: true,
      exports: Object.keys(dynamicImports),
      count: Object.keys(dynamicImports).length
    };
    console.log('\n🔄 DYNAMIC IMPORT SUCCESS:');
    console.log(`   Exports (${dynamicImportResult.count}): ${dynamicImportResult.exports.join(', ')}`);
  } catch (error) {
    dynamicImportResult = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    console.log('\n❌ DYNAMIC IMPORT FAILED:');
    console.log(`   Error: ${error.message}`);
  }
  
  // System information
  const systemInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  };
  
  console.log('\n💻 SYSTEM INFORMATION:');
  Object.entries(systemInfo).forEach(([key, value]) => {
    if (key === 'memory') {
      console.log(`   ${key}:`, {
        rss: `${Math.round(value.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(value.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(value.heapUsed / 1024 / 1024)} MB`,
      });
    } else {
      console.log(`   ${key}: ${value}`);
    }
  });
  
  // File system check
  let fileSystemCheck = null;
  try {
    const fs = require('fs');
    const path = require('path');
    
    const emailsDir = path.join(process.cwd(), 'components', 'emails');
    const indexPath = path.join(emailsDir, 'index.ts');
    
    fileSystemCheck = {
      emailsDirExists: fs.existsSync(emailsDir),
      indexExists: fs.existsSync(indexPath),
      files: fs.existsSync(emailsDir) ? fs.readdirSync(emailsDir) : [],
    };
    
    console.log('\n📁 FILE SYSTEM CHECK:');
    console.log(`   components/emails directory: ${fileSystemCheck.emailsDirExists ? '✅' : '❌'}`);
    console.log(`   index.ts file: ${fileSystemCheck.indexExists ? '✅' : '❌'}`);
    console.log(`   Files found: ${fileSystemCheck.files.join(', ')}`);
    
  } catch (error) {
    fileSystemCheck = {
      error: error.message
    };
    console.log('\n❌ FILE SYSTEM CHECK FAILED:', error.message);
  }
  
  const responseData = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL || 'false',
      vercelEnv: process.env.VERCEL_ENV || 'N/A',
    },
    imports: {
      static: results,
      dynamic: dynamicImportResult,
    },
    system: systemInfo,
    fileSystem: fileSystemCheck,
    message: 'Module resolution debugging completed successfully'
  };
  
  console.log('\n🏁 DEBUG RESOLUTION COMPLETE');
  console.log('=============================');
  
  return NextResponse.json(responseData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Debug-Timestamp': new Date().toISOString(),
    },
  });
}

// Also provide POST endpoint for additional debugging
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 DEBUG RESOLUTION POST REQUEST');
    console.log('=================================');
    console.log('Request body:', body);
    
    // Allow custom import testing
    if (body.testImport && typeof body.testImport === 'string') {
      try {
        const customImport = await import(body.testImport);
        console.log(`✅ Custom import '${body.testImport}' successful:`, Object.keys(customImport));
        
        return NextResponse.json({
          success: true,
          testImport: body.testImport,
          result: Object.keys(customImport),
        });
        
      } catch (error) {
        console.log(`❌ Custom import '${body.testImport}' failed:`, error.message);
        
        return NextResponse.json({
          success: false,
          testImport: body.testImport,
          error: error.message,
          stack: error.stack,
        });
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'POST endpoint active - provide testImport parameter to test custom imports' 
    });
    
  } catch (error) {
    console.log('❌ POST request failed:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
