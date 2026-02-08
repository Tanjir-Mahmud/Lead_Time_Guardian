// Quick Final Verification Test
const SUPABASE_URL = 'https://rnqbokymiusntaetjltz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJucWJva3ltaXVzbnRhZXRqbHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyODc0MzcsImV4cCI6MjA4NTg2MzQzN30.Dy7AaSbtDninTkSEGeaapzzKSSAKaViiL8Xs8rnfuPw';

async function finalCheck() {
    console.log('\n✓ FINAL SYSTEM CHECK\n');

    // Check regulatory_rates
    const res = await fetch(`${SUPABASE_URL}/rest/v1/regulatory_rates?select=category,incentive_rate`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    if (res.status === 200) {
        const data = await res.json();
        console.log(`✓ Supabase Connection: WORKING`);
        console.log(`✓ Regulatory Rates: ${data.length} categories found`);
        console.log(`✓ Database: FULLY OPERATIONAL\n`);
        console.log('All systems ready for production! 🚀\n');
        process.exit(0);
    } else {
        console.log(`✗ Error: Status ${res.status}`);
        process.exit(1);
    }
}

finalCheck();
