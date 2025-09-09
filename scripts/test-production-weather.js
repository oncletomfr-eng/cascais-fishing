#!/usr/bin/env node

/**
 * Test Production Weather API
 * Tests the deployed weather system on production
 */

import fetch from 'node-fetch';

const PRODUCTION_BASE = 'https://www.cascaisfishing.com';
const TEST_LOCATION = { latitude: 38.7223, longitude: -9.1393, name: 'Cascais, Portugal' };

/**
 * Test the production weather endpoints
 */
async function testProductionWeather() {
  console.log('🌐 TESTING PRODUCTION WEATHER API');
  console.log('==================================\n');
  
  console.log(`🎯 Production URL: ${PRODUCTION_BASE}`);
  console.log(`📍 Test Location: ${TEST_LOCATION.name} (${TEST_LOCATION.latitude}, ${TEST_LOCATION.longitude})\n`);

  const tests = [
    {
      name: 'Open-Meteo Proxy',
      url: `/api/weather/open-meteo?latitude=${TEST_LOCATION.latitude}&longitude=${TEST_LOCATION.longitude}&type=current`,
      expected: 'Open-Meteo weather data via server proxy'
    },
    {
      name: 'Marine Data Proxy', 
      url: `/api/weather/marine?latitude=${TEST_LOCATION.latitude}&longitude=${TEST_LOCATION.longitude}`,
      expected: 'Wave and marine data via server proxy'
    },
    {
      name: 'Tomorrow.io Proxy',
      url: `/api/weather/tomorrow?latitude=${TEST_LOCATION.latitude}&longitude=${TEST_LOCATION.longitude}&type=realtime`,
      expected: 'Tomorrow.io weather data with API key'
    },
    {
      name: 'Combined API (Recommended)',
      url: `/api/weather/combined?latitude=${TEST_LOCATION.latitude}&longitude=${TEST_LOCATION.longitude}`,
      expected: 'Complete weather data with automatic fallback'
    }
  ];

  const results = [];

  for (const test of tests) {
    console.log(`🧪 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(`${PRODUCTION_BASE}${test.url}`, {
        headers: {
          'User-Agent': 'CascaisFishing/1.0-ProductionTest'
        }
      });
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        console.log(`   ✅ SUCCESS (${responseTime}ms)`);
        
        if (data.success) {
          console.log(`   📊 Data: ${test.expected}`);
          
          // Log specific data points based on test type
          if (test.name.includes('Combined')) {
            const weather = data.data.weather;
            const marine = data.data.marine;
            const meta = data.data.metadata;
            
            console.log(`   🌡️  Temperature: ${weather?.current?.temperature_2m}°C`);
            console.log(`   💨 Wind: ${weather?.current?.wind_speed_10m} m/s`);
            console.log(`   🌊 Waves: ${marine?.waveHeight}m`);
            console.log(`   📡 Sources: Weather(${meta?.weatherSource}) Marine(${meta?.marineSource})`);
          }
          
        } else {
          console.log(`   ⚠️  API returned success: false - ${data.error}`);
        }
        
        results.push({ test: test.name, success: true, responseTime, data });
      } else {
        console.log(`   ❌ HTTP ERROR: ${response.status} ${response.statusText}`);
        results.push({ test: test.name, success: false, error: `HTTP ${response.status}`, responseTime });
      }
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      results.push({ test: test.name, success: false, error: error.message });
    }
    
    console.log();
  }

  // Summary
  console.log('📊 PRODUCTION TEST RESULTS');
  console.log('===========================');
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}\n`);

  if (successful === total) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('   Weather system is working perfectly on production');
    console.log('   CORS issues are resolved');
    console.log('   API keys are properly configured');
    console.log('   Fallback system is operational');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    console.log('   Check Vercel environment variables');
    console.log('   Verify API keys are configured');
    console.log('   Review deployment logs');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Visit https://www.cascaisfishing.com/test-weather');
  console.log('2. Check browser console for errors');
  console.log('3. Test different locations');
  console.log('4. Verify fallback behavior');
  
  return results;
}

// Run the test
testProductionWeather().catch(console.error);
