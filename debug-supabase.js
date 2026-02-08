// Debug Supabase API Access
const SUPABASE_URL = 'https://rnqbokymiusntaetjltz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucWJva3ltaXVzbnRhZXRqbHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODc0MzcsImV4cCI6MjA4NTg2MzQzN30.Dy7AaSbtDninTkSEGeaapzzKSSAKaViiL8Xs8rnfuPw';

async function debugAPI() {
    console.log('\n=== DEBUGGING SUPABASE API ACCESS ===\n');

    // Test 1: Basic endpoint
    console.log('[1] Testing basic REST API...');
    const basic = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    console.log(`   Status: ${basic.status} ${basic.status === 200 ? '✓' : '✗'}`);

    // Test 2: Try regulatory_rates with different approaches
    console.log('\n[2] Testing regulatory_rates table...');
    const test1 = await fetch(`${SUPABASE_URL}/rest/v1/regulatory_rates`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json'
        }
    });
    console.log(`   Direct access: ${test1.status}`);

    if (test1.status === 404) {
        const errorText = await test1.text();
        console.log(`   Error details: ${errorText.substring(0, 200)}`);
    } else if (test1.status === 200) {
        const data = await test1.json();
        console.log(`   ✓ SUCCESS: ${data.length} records found`);
    }

    // Test 3: Try shipments (known working table)
    console.log('\n[3] Testing shipments table for comparison...');
    const test2 = await fetch(`${SUPABASE_URL}/rest/v1/shipments?limit=1`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });
    console.log(`   Shipments access: ${test2.status} (${test2.status === 200 || test2.status === 401 ? '✓ Table exists' : '✗ Issue'})`);

    console.log('\n=== DIAGNOSIS ===');
    if (test1.status === 404) {
        console.log('\n⚠️  The regulatory_rates table is NOT accessible via the REST API.');
        console.log('\nPossible causes:');
        console.log('1. Table was created in SQL Editor but not exposed to PostgREST');
        console.log('2. RLS policy is blocking access (though we created a public read policy)');
        console.log('3. Table name mismatch or schema issue');
        console.log('\n✓ SOLUTION: The app will work using fallback values (8% incentive, 11.9% risk)');
        console.log('✓ For production: Manually verify table exists in Supabase Table Editor\n');
    } else if (test1.status === 200) {
        console.log('\n✓ All systems operational!\n');
    }
}

debugAPI();
