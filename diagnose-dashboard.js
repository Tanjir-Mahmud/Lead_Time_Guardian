const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function diagnose() {
    console.log('\n🔍 DEEP DIAGNOSTIC - Dashboard Data Issue\n');
    console.log('='.repeat(60));

    try {
        // 1. Check shipments table
        console.log('\n[1] Querying shipments table...');
        const shipmentsRes = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const shipments = await shipmentsRes.json();
        console.log(`   Found ${Array.isArray(shipments) ? shipments.length : 0} shipments`);

        if (Array.isArray(shipments) && shipments.length > 0) {
            console.log('   Latest shipment:');
            console.log('   ', JSON.stringify(shipments[0], null, 2).substring(0, 300));
        } else {
            console.log('   ❌ NO SHIPMENTS FOUND!');
            console.log('   Response:', shipments);
        }

        // 2. Check audit_logs table
        console.log('\n[2] Querying audit_logs table...');
        const auditsRes = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=*&limit=5`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        const audits = await auditsRes.json();
        console.log(`   Found ${Array.isArray(audits) ? audits.length : 0} audit logs`);

        if (Array.isArray(audits) && audits.length > 0) {
            console.log('   Latest audit log columns:');
            console.log('   ', Object.keys(audits[0]));
            console.log('   Sample data:');
            console.log('   ', JSON.stringify(audits[0], null, 2).substring(0, 400));
        } else {
            console.log('   ❌ NO AUDIT LOGS FOUND!');
            console.log('   Response:', audits);
        }

        // 3. Check RLS policies
        console.log('\n[3] Checking if RLS is blocking reads...');
        console.log('   Note: We are using ANON key (no user authentication)');
        console.log('   If RLS requires user_id, queries will return empty even if data exists!');

        // 4. Summary
        console.log('\n' + '='.repeat(60));
        console.log('📊 DIAGNOSIS SUMMARY:');
        console.log('='.repeat(60));

        if ((!Array.isArray(shipments) || shipments.length === 0) &&
            (!Array.isArray(audits) || audits.length === 0)) {
            console.log('❌ ISSUE FOUND: No data visible via API');
            console.log('');
            console.log('POSSIBLE CAUSES:');
            console.log('1. RLS policies blocking reads (most likely)');
            console.log('   - Writes succeeded because user was authenticated');
            console.log('   - Reads fail because we\'re using anon key here');
            console.log('2. Data in different rows than expected');
            console.log('3. Wrong table names');
            console.log('');
            console.log('SOLUTION:');
            console.log('Check Supabase dashboard directly or fix RLS policies');
        } else {
            console.log('✅ Data found! Issue is in dashboard query logic.');
        }

    } catch (error) {
        console.error('\n❌ Diagnostic failed:', error.message);
    }
}

diagnose();
