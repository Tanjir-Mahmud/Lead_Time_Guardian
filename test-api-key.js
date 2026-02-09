const API_KEY = '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';

async function testOpenRouterKey() {
    console.log('\n🔑 Testing OpenRouter API Key...\n');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Lead Time Guardian'
            }
        });

        const data = await response.json();

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 200) {
            console.log('\n✅ API Key is VALID!');
            console.log('   Credit Balance:', data.data?.label || 'N/A');
        } else {
            console.log('\n❌ API Key is INVALID or EXPIRED!');
            console.log('   Error:', data.error?.message || 'Unknown error');
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testOpenRouterKey();
