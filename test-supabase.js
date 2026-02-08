/**
 * Supabase Health Check Script
 * Tests database connectivity, tables, and RLS policies
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
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
    console.error('Error loading .env.local:', error.message);
    process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

async function testConnection() {
    try {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            log('ERROR', 'Supabase credentials missing in .env.local');
            return false;
        }

        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.status === 200) {
            log('SUCCESS', 'Supabase Connection', `Connected to: ${SUPABASE_URL}`);
            return true;
        } else {
            log('ERROR', 'Supabase Connection Failed', `Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        log('ERROR', 'Supabase Connection Error', error.message);
        return false;
    }
}

async function checkTable(tableName, expectedColumns = []) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Prefer': 'count=exact'
            }
        });

        if (response.ok) {
            const count = response.headers.get('content-range')?.split('/')[1] || 'unknown';
            log('SUCCESS', `Table: ${tableName}`, `Accessible - ${count} rows`);

            // Check if we can read data
            const data = await response.json();
            if (data.length > 0 && expectedColumns.length > 0) {
                const missingCols = expectedColumns.filter(col => !(col in data[0]));
                if (missingCols.length > 0) {
                    log('WARN', `  Missing columns in ${tableName}`, missingCols.join(', '));
                }
            }
            return true;
        } else if (response.status === 401) {
            log('WARN', `Table: ${tableName}`, 'Access denied - RLS may be active (this is normal)');
            return true; // Table exists but RLS is protecting it
        } else {
            const error = await response.text();
            log('ERROR', `Table: ${tableName}`, `Status ${response.status}: ${error.substring(0, 100)}`);
            return false;
        }
    } catch (error) {
        log('ERROR', `Table: ${tableName}`, error.message);
        return false;
    }
}

async function testRegulatoryRates() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/regulatory_rates?select=*&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                const sample = data[0];
                log('SUCCESS', 'Regulatory Rates Data',
                    `Found ${data.length} rate(s). Sample: ${sample.category || 'unknown'} - Incentive: ${sample.incentive_rate || 'N/A'}`);
                return true;
            } else {
                log('WARN', 'Regulatory Rates Table', 'Table is empty - seed data may be needed');
                return true;
            }
        } else {
            log('ERROR', 'Regulatory Rates Query Failed', `Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        log('ERROR', 'Regulatory Rates Test', error.message);
        return false;
    }
}

async function testWriteOperation() {
    try {
        // Try to fetch shipments - this will test if we can read user data
        const response = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=invoice_no,fob_value&limit=3`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
                log('SUCCESS', 'Shipments Data Access',
                    `Can read ${data.length} shipment(s). Recent: ${data[0].invoice_no || 'N/A'} ($${data[0].fob_value || 0})`);
            } else {
                log('WARN', 'Shipments Table', 'No data found (expected for new installations)');
            }
            return true;
        } else if (response.status === 401) {
            log('WARN', 'Shipments Access', 'RLS is active - authentication required (this is correct behavior)');
            return true;
        } else {
            log('ERROR', 'Shipments Access Failed', `Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        log('ERROR', 'Write Operation Test', error.message);
        return false;
    }
}

async function runSupabaseHealthCheck() {
    console.log(`\n${COLORS.bold}${COLORS.blue}═══════════════════════════════════════════════════════════${COLORS.reset}`);
    console.log(`${COLORS.bold}        Supabase Database Health Check${COLORS.reset}`);
    console.log(`${COLORS.blue}═══════════════════════════════════════════════════════════${COLORS.reset}\n`);

    const tests = [
        { name: 'Connection Test', fn: testConnection },
        { name: 'Users Table', fn: () => checkTable('users', ['id', 'email']) },
        { name: 'Shipments Table', fn: () => checkTable('shipments', ['id', 'invoice_no', 'fob_value', 'user_id']) },
        { name: 'Audit Logs Table', fn: () => checkTable('audit_logs', ['id', 'shipment_id', 'assessable_value']) },
        { name: 'Regulatory Rates Table', fn: () => checkTable('regulatory_rates', ['category', 'incentive_rate']) },
        { name: 'Regulatory Rates Data', fn: testRegulatoryRates },
        { name: 'Data Access Test', fn: testWriteOperation }
    ];

    const results = [];
    for (const test of tests) {
        console.log(`\n${COLORS.bold}Testing: ${test.name}${COLORS.reset}`);
        const result = await test.fn();
        results.push({ name: test.name, success: result });
        await new Promise(resolve => setTimeout(resolve, 300));
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

    console.log(`\n${statusColor}${COLORS.bold}Database Health: ${percentage}% (${successCount}/${totalCount} tests passed)${COLORS.reset}\n`);

    if (successCount === totalCount) {
        console.log(`${COLORS.green}✓ All Supabase tests passed - database is fully operational!${COLORS.reset}\n`);
    } else if (successCount >= totalCount - 1) {
        console.log(`${COLORS.yellow}⚠ Minor issues detected - check warnings above${COLORS.reset}\n`);
    } else {
        console.log(`${COLORS.red}✗ Critical database issues detected - review errors above${COLORS.reset}\n`);
    }

    process.exit(successCount === totalCount ? 0 : 1);
}

runSupabaseHealthCheck().catch(error => {
    console.error(`\n${COLORS.red}${COLORS.bold}Fatal Error:${COLORS.reset}`, error);
    process.exit(1);
});
