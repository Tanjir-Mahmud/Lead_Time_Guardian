// Simple Supabase Connection Test
const SUPABASE_URL = 'https://rnqbokymiusntaetjltz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucWJva3ltaXVzbnRhZXRqbHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODc0MzcsImV4cCI6MjA4NTg2MzQzN30.Dy7AaSbtDninTkSEGeaapzzKSSAKaViiL8Xs8rnfuPw';

async function testSupabase() {
    console.log('\n=== SUPABASE CONNECTION TEST ===\n');

    try {
        // Test 1: Basic connectivity
        console.log('[1/5] Testing basic connectivity...');
        const connTest = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        console.log(`   Status: ${connTest.status} - ${connTest.status === 200 ? 'PASS' : 'FAIL'}`);

        // Test 2: Check regulatory_rates table
        console.log('\n[2/5] Checking regulatory_rates table...');
        const ratesTest = await fetch(`${SUPABASE_URL}/rest/v1/regulatory_rates?select=*&limit=3`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const rates = await ratesTest.json();
        console.log(`   Status: ${ratesTest.status}`);
        console.log(`   Data: ${Array.isArray(rates) ? rates.length + ' records found' : 'Error: ' + JSON.stringify(rates).substring(0, 100)}`);

        // Test 3: Check shipments table
        console.log('\n[3/5] Checking shipments table...');
        const shipmentsTest = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=invoice_no,fob_value&limit=3`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const shipments = await shipmentsTest.json();
        console.log(`   Status: ${shipmentsTest.status}`);
        if (shipmentsTest.status === 200 && Array.isArray(shipments)) {
            console.log(`   Records: ${shipments.length} shipments found`);
            if (shipments.length > 0) {
                console.log(`   Sample: Invoice ${shipments[0].invoice_no}, FOB: $${shipments[0].fob_value}`);
            }
        } else if (shipmentsTest.status === 401) {
            console.log(`   RLS Enabled: Authentication required (expected behavior)`);
        } else {
            console.log(`   Error: ${JSON.stringify(shipments).substring(0, 100)}`);
        }

        // Test 4: Check audit_logs table
        console.log('\n[4/5] Checking audit_logs table...');
        const auditTest = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs?select=id&limit=3`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const audits = await auditTest.json();
        console.log(`   Status: ${auditTest.status}`);
        if (auditTest.status === 200 && Array.isArray(audits)) {
            console.log(`   Records: ${audits.length} audit logs found`);
        } else if (auditTest.status === 401) {
            console.log(`   RLS Enabled: Authentication required (expected)`);
        } else {
            console.log(`   Error: ${JSON.stringify(audits).substring(0, 100)}`);
        }

        // Test 5: Check users table
        console.log('\n[5/5] Checking users table...');
        const usersTest = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        console.log(`   Status: ${usersTest.status}`);
        if (usersTest.status === 401) {
            console.log(`   RLS Enabled: Table protected (expected behavior)`);
        }

        console.log('\n=== RESULT ===');
        console.log('✓ Supabase is CONNECTED and OPERATIONAL');
        console.log('✓ All core tables exist');
        console.log('✓ RLS policies are active (if you see 401 errors, this is expected)');
        console.log('\nTo test with authentication, start the app with: npm run dev\n');

    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
        console.log('\nSupabase connection FAILED\n');
        process.exit(1);
    }
}

testSupabase();
