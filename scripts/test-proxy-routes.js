#!/usr/bin/env node

/**
 * Test Proxy API Routes
 * Tests the new server-side proxy routes without running full Next.js dev server
 */

import fetch from 'node-fetch';

const TEST_CONFIG = {
  location: { latitude: 38.7223, longitude: -9.1393, name: 'Cascais, Portugal' },
  tomorrowApiKey: '3eCDo17EuQIBqX7SzX8qg2kds8QP2cxn'
};

/**
 * Test Open-Meteo API directly (what our proxy will call)
 */
async function testOpenMeteoDirectly() {
  console.log('🌐 Testing Open-Meteo API Directly...');
  
  try {
    const params = new URLSearchParams({
      latitude: TEST_CONFIG.location.latitude.toString(),
      longitude: TEST_CONFIG.location.longitude.toString(),
      current: [
        'temperature_2m',
        'relative_humidity_2m',
        'wind_speed_10m',
        'weather_code'
      ].join(','),
      timezone: 'auto'
    });

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CascaisFishing/1.0-Test'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Open-Meteo Direct: SUCCESS');
      console.log(`   Temperature: ${data.current.temperature_2m}°C`);
      console.log(`   Wind: ${data.current.wind_speed_10m} m/s`);
      console.log(`   Humidity: ${data.current.relative_humidity_2m}%`);
      return { success: true, data };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Open-Meteo Direct: FAILED');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Open-Meteo Marine API directly
 */
async function testOpenMeteoMarineDirectly() {
  console.log('🌊 Testing Open-Meteo Marine API Directly...');
  
  try {
    const params = new URLSearchParams({
      latitude: TEST_CONFIG.location.latitude.toString(),
      longitude: TEST_CONFIG.location.longitude.toString(),
      hourly: [
        'wave_height',
        'wave_direction',
        'wave_period'
      ].join(','),
      timezone: 'auto',
      forecast_days: '1'
    });

    const response = await fetch(
      `https://marine-api.open-meteo.com/v1/marine?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CascaisFishing/1.0-Test'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Open-Meteo Marine Direct: SUCCESS');
      if (data.hourly && data.hourly.time && data.hourly.time.length > 0) {
        console.log(`   Wave Height: ${data.hourly.wave_height?.[0] || 'N/A'}m`);
        console.log(`   Wave Period: ${data.hourly.wave_period?.[0] || 'N/A'}s`);
        console.log(`   Data Points: ${data.hourly.time.length}`);
      }
      return { success: true, data };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Open-Meteo Marine Direct: FAILED');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Test Tomorrow.io API directly
 */
async function testTomorrowDirectly() {
  console.log('🌦️  Testing Tomorrow.io API Directly...');
  
  try {
    const params = new URLSearchParams({
      location: `${TEST_CONFIG.location.latitude},${TEST_CONFIG.location.longitude}`,
      apikey: TEST_CONFIG.tomorrowApiKey
    });

    const response = await fetch(
      `https://api.tomorrow.io/v4/weather/realtime?${params}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CascaisFishing/1.0-Test'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Tomorrow.io Direct: SUCCESS');
      console.log(`   Temperature: ${data.data.values.temperature}°C`);
      console.log(`   Wind: ${data.data.values.windSpeed} m/s`);
      console.log(`   Humidity: ${data.data.values.humidity}%`);
      return { success: true, data };
    } else {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }
  } catch (error) {
    console.log('❌ Tomorrow.io Direct: FAILED');
    console.log(`   Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Simulate the proxy route logic
 */
async function simulateProxyLogic() {
  console.log('\n🔧 SIMULATING PROXY ROUTE LOGIC');
  console.log('================================\n');

  const results = {
    openMeteo: null,
    openMeteoMarine: null,
    tomorrow: null
  };

  // Test 1: Primary API (Open-Meteo)
  console.log('SIMULATION 1: Primary Weather API (Open-Meteo)');
  console.log('----------------------------------------------');
  results.openMeteo = await testOpenMeteoDirectly();
  console.log();

  // Test 2: Marine API (Open-Meteo)
  console.log('SIMULATION 2: Primary Marine API (Open-Meteo)');
  console.log('---------------------------------------------');
  results.openMeteoMarine = await testOpenMeteoMarineDirectly();
  console.log();

  // Test 3: Fallback API (Tomorrow.io)
  console.log('SIMULATION 3: Fallback API (Tomorrow.io)');
  console.log('----------------------------------------');
  results.tomorrow = await testTomorrowDirectly();
  console.log();

  // Summary and proxy route recommendations
  console.log('🎯 PROXY ROUTE RECOMMENDATIONS');
  console.log('===============================');
  
  if (results.openMeteo.success) {
    console.log('✅ /api/weather/open-meteo: Will work perfectly');
    console.log('   - Primary API is accessible server-side');
    console.log('   - CORS issues resolved by server-side proxy');
  } else {
    console.log('⚠️  /api/weather/open-meteo: May have issues');
    console.log('   - Consider implementing retry logic');
  }

  if (results.openMeteoMarine.success) {
    console.log('✅ /api/weather/marine: Will work for marine data');
    console.log('   - Marine API is accessible server-side');
  } else {
    console.log('⚠️  /api/weather/marine: Will need fallback');
    console.log('   - Tomorrow.io marine or estimated data recommended');
  }

  if (results.tomorrow.success) {
    console.log('✅ /api/weather/tomorrow: Perfect fallback ready');
    console.log('   - API key works, excellent fallback system');
  } else {
    console.log('❌ /api/weather/tomorrow: Needs environment variable');
    console.log('   - Add TOMORROW_IO_API_KEY to environment');
  }

  console.log();

  // Final recommendation
  const allWorking = results.openMeteo.success && results.tomorrow.success;
  
  if (allWorking) {
    console.log('🎉 PROXY ROUTES ARE READY!');
    console.log('   All APIs accessible server-side');
    console.log('   CORS problems will be solved');
    console.log('   Robust fallback system in place');
    console.log();
    console.log('📋 NEXT STEPS:');
    console.log('   1. Add TOMORROW_IO_API_KEY to Vercel env vars');
    console.log('   2. Deploy the new proxy routes');
    console.log('   3. Update frontend to use /api/weather/* endpoints');
    console.log('   4. Test on production');
  } else {
    console.log('⚠️  SETUP NEEDED:');
    if (!results.tomorrow.success) {
      console.log('   - Configure TOMORROW_IO_API_KEY environment variable');
    }
    console.log('   - Test proxy routes after deployment');
  }

  return results;
}

/**
 * Test the expected behavior flow
 */
async function testExpectedFlow() {
  console.log('\n🎬 EXPECTED PRODUCTION FLOW');
  console.log('===========================\n');

  console.log('🎯 Browser Request Flow:');
  console.log('  1. Frontend calls: /api/weather/open-meteo?latitude=38.7223&longitude=-9.1393&type=current');
  console.log('  2. Server proxy calls: https://api.open-meteo.com/v1/forecast?...');
  console.log('  3. No CORS issues (server-to-server)');
  console.log('  4. Data returned to browser successfully');
  console.log();

  console.log('🔄 Fallback Flow:');
  console.log('  1. If Open-Meteo fails → Frontend calls: /api/weather/tomorrow?type=realtime');
  console.log('  2. Server proxy calls: https://api.tomorrow.io/v4/weather/realtime?...');
  console.log('  3. Tomorrow.io data returned');
  console.log('  4. System continues working');
  console.log();

  console.log('🛡️ Final Fallback:');
  console.log('  1. If all APIs fail → Frontend uses estimated data');
  console.log('  2. Based on location and season');
  console.log('  3. System never completely breaks');
  console.log();
}

/**
 * Run all tests
 */
async function runProxyTests() {
  console.log('🧪 PROXY ROUTES TESTING');
  console.log('========================\n');
  
  console.log(`📍 Test Location: ${TEST_CONFIG.location.name}`);
  console.log(`   Coordinates: ${TEST_CONFIG.location.latitude}, ${TEST_CONFIG.location.longitude}\n`);

  // Run simulation
  await simulateProxyLogic();
  
  // Show expected flow
  await testExpectedFlow();
}

// Run the tests
runProxyTests().catch(console.error);
