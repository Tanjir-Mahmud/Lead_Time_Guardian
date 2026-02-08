// Quick OpenRouter API Test
const OPENROUTER_KEY = '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';

async function testOpenRouter() {
    console.log('\n=== OPENROUTER API TEST ===\n');

    try {
        console.log('[1] Testing OpenRouter connection...');
        const response = await fetch('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Lead Time Guardian'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const geminiModels = data.data.filter(m => m.id.includes('gemini'));
            console.log(`   ✓ Connection OK: ${geminiModels.length} Gemini models available`);

            // Test vision capability
            console.log('\n[2] Testing Gemini Vision API...');
            const testResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_KEY}`,
                    'HTTP-Referer': 'http://localhost:3000',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'google/gemini-flash-1.5-8b',
                    messages: [{
                        role: 'user',
                        content: 'Say "Vision API working" if you can read this.'
                    }]
                })
            });

            if (testResponse.ok) {
                const result = await testResponse.json();
                console.log(`   ✓ Vision API Response: ${result.choices[0].message.content}`);
                console.log('\n✅ OpenRouter is working properly!\n');
            } else {
                const error = await testResponse.text();
                console.log(`   ✗ Vision API Error: ${testResponse.status}`);
                console.log(`   Details: ${error.substring(0, 200)}`);
            }
        } else {
            console.log(`   ✗ Connection failed: ${response.status}`);
            const error = await response.text();
            console.log(`   Error: ${error.substring(0, 200)}`);
        }
    } catch (error) {
        console.error('\n✗ ERROR:', error.message);
    }
}

testOpenRouter();
