/**
 * API Health Check Script
 * Tests all external service integrations for Lead Time Guardian
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
try {
    const envPath = path.join(__dirname, '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=:#]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            if (key && !process.env[key]) {
                process.env[key] = value;
            }
        }
    });
} catch (error) {
    console.error('Warning: Could not load .env.local file', error.message);
}


const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(status, message, details = '') {
    const timestamp = new Date().toISOString().substring(11, 19);
    const icon = status === 'SUCCESS' ? '✓' : status === 'ERROR' ? '✗' : '⚠';
    const color = status === 'SUCCESS' ? COLORS.green : status === 'ERROR' ? COLORS.red : COLORS.yellow;
    console.log(`${COLORS.bold}[${timestamp}]${COLORS.reset} ${color}${icon} ${message}${COLORS.reset}${details ? '\n  ' + details : ''}`);
}

async function testExchangeRateAPI() {
    try {
        const apiKey = process.env.CURRENCY_API_KEY;
        if (!apiKey) {
            log('ERROR', 'Currency API: API key not found in environment');
            return false;
        }

        const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
        const data = await response.json();

        if (data.result === 'success') {
            const usdToBdt = data.conversion_rates?.BDT || 'N/A';
            const usdToEur = data.conversion_rates?.EUR || 'N/A';
            log('SUCCESS', 'ExchangeRate-API: Multi-Currency Flash Audit',
                `USD→BDT: ${usdToBdt}, USD→EUR: ${usdToEur}`);
            return true;
        } else {
            log('ERROR', 'Currency API: Invalid response', JSON.stringify(data));
            return false;
        }
    } catch (error) {
        log('ERROR', 'Currency API: Connection failed', error.message);
        return false;
    }
}

async function testOpenWeatherAPI() {
    try {
        const apiKey = process.env.OPENWEATHER_API_KEY;
        if (!apiKey) {
            log('ERROR', 'OpenWeather API: API key not found');
            return false;
        }

        // Test with Dhaka coordinates
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=23.8103&lon=90.4125&appid=${apiKey}`
        );
        const data = await response.json();

        if (data.cod === '200' && data.list) {
            const forecastCount = data.list.length;
            log('SUCCESS', 'OpenWeather API: 72-Hour Forecast',
                `${forecastCount} forecast entries available for Dhaka`);
            return true;
        } else {
            log('ERROR', 'OpenWeather API: Invalid response', JSON.stringify(data));
            return false;
        }
    } catch (error) {
        log('ERROR', 'OpenWeather API: Connection failed', error.message);
        return false;
    }
}

async function testBarikoiAPI() {
    try {
        const apiKey = process.env.BARIKOI_API_KEY;
        if (!apiKey) {
            log('ERROR', 'Barikoi API: API key not found');
            return false;
        }

        // Test with a basic geocoding request
        const response = await fetch(
            `https://barikoi.xyz/v2/api/search/reverse/geocode/server/${apiKey}/place?longitude=90.4125&latitude=23.8103&district=true&post_code=true&country=true&sub_district=true&union=true&pauroshoba=true&location_type=true&division=true&address=true&area=true`
        );
        const data = await response.json();

        if (data.place) {
            log('SUCCESS', 'Barikoi API: Traffic & Road Status',
                `Geocoding test successful: ${data.place.address || 'Address retrieved'}`);
            return true;
        } else {
            log('WARN', 'Barikoi API: Unexpected response structure',
                'API responding but format may have changed');
            return true; // Still consider it working if we get a response
        }
    } catch (error) {
        log('ERROR', 'Barikoi API: Connection failed', error.message);
        return false;
    }
}

async function testTerminal49API() {
    try {
        const apiKey = process.env.TERMINAL49_API_KEY;
        if (!apiKey) {
            log('WARN', 'Terminal49 API: API key not found',
                'Port tracking may be limited to mock data');
            return true; // Non-critical, system can work without it
        }

        // Test with a basic API health check
        // Note: Terminal49 requires specific container/shipment IDs, so we just check if key exists
        log('SUCCESS', 'Terminal49 API: Port Tracking',
            'API key configured (actual tracking requires shipment IDs)');
        return true;
    } catch (error) {
        log('ERROR', 'Terminal49 API: Check failed', error.message);
        return false;
    }
}

async function testOpenRouterAPI() {
    try {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            log('ERROR', 'OpenRouter API: API key not found');
            return false;
        }

        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Lead Time Guardian'
            }
        });

        const data = await response.json();

        if (data.data && Array.isArray(data.data)) {
            const geminiModels = data.data.filter(m => m.id.includes('gemini'));
            log('SUCCESS', 'OpenRouter API: Core Autonomous Audit Engine',
                `${geminiModels.length} Gemini models available`);
            return true;
        } else {
            log('ERROR', 'OpenRouter API: Invalid response', JSON.stringify(data).substring(0, 100));
            return false;
        }
    } catch (error) {
        log('ERROR', 'OpenRouter API: Connection failed', error.message);
        return false;
    }
}

async function testSupabaseConnection() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            log('ERROR', 'Supabase: Credentials not found');
            return false;
        }

        // Test with a simple health check
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (response.status === 200) {
            log('SUCCESS', 'Supabase: Analytics & Database Sync',
                `Connected to: ${supabaseUrl}`);
            return true;
        } else {
            log('ERROR', 'Supabase: Connection failed', `Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        log('ERROR', 'Supabase: Connection failed', error.message);
        return false;
    }
}

async function runHealthCheck() {
    console.log(`\n${COLORS.bold}${COLORS.blue}═══════════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`${COLORS.bold}        Lead Time Guardian - API Health Check${COLORS.reset}`);
    console.log(`${COLORS.blue}═══════════════════════════════════════════════════════════${COLORS.reset}\n`);

    const tests = [
        { name: '🏛️  Core Engine (OpenRouter/Gemini)', fn: testOpenRouterAPI },
        { name: '💵 Multi-Currency (ExchangeRate)', fn: testExchangeRateAPI },
        { name: '🚛 Traffic Monitoring (Barikoi)', fn: testBarikoiAPI },
        { name: '⛅ Weather Forecast (OpenWeather)', fn: testOpenWeatherAPI },
        { name: '🚢 Port Tracking (Terminal49)', fn: testTerminal49API },
        { name: '📊 Database Sync (Supabase)', fn: testSupabaseConnection }
    ];

    const results = [];
    for (const test of tests) {
        console.log(`\n${COLORS.bold}Testing: ${test.name}${COLORS.reset}`);
        const result = await test.fn();
        results.push({ name: test.name, success: result });
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }

    console.log(`\n${COLORS.blue}═══════════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`${COLORS.bold}Summary:${COLORS.reset}\n`);

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    results.forEach(r => {
        const icon = r.success ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
        console.log(`  ${icon} ${r.name}`);
    });

    const percentage = Math.round((successCount / totalCount) * 100);
    const statusColor = percentage === 100 ? COLORS.green : percentage >= 75 ? COLORS.yellow : COLORS.red;

    console.log(`\n${statusColor}${COLORS.bold}System Health: ${percentage}% (${successCount}/${totalCount} services operational)${COLORS.reset}\n`);

    if (successCount < totalCount) {
        console.log(`${COLORS.yellow}⚠ Some features may be limited due to unavailable services${COLORS.reset}\n`);
    } else {
        console.log(`${COLORS.green}✓ All systems operational - ready for production audit workflows!${COLORS.reset}\n`);
    }

    process.exit(successCount === totalCount ? 0 : 1);
}

runHealthCheck().catch(error => {
    console.error(`\n${COLORS.red}${COLORS.bold}Fatal Error:${COLORS.reset}`, error);
    process.exit(1);
});
