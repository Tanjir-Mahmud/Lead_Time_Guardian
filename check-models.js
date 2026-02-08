// Check available Gemini models
const OPENROUTER_KEY = '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';

async function checkModels() {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
            'Authorization': `Bearer ${OPENROUTER_KEY}`
        }
    });

    const data = await response.json();
    const geminiModels = data.data.filter(m => m.id.toLowerCase().includes('gemini') && m.id.toLowerCase().includes('flash'));

    console.log('\n=== AVAILABLE GEMINI FLASH MODELS ===\n');
    geminiModels.forEach(m => {
        console.log(`📌 ${m.id}`);
        console.log(`   Name: ${m.name}`);
        console.log(`   Context: ${m.context_length} tokens\n`);
    });

    console.log(`\nTotal Gemini Flash models: ${geminiModels.length}\n`);
}

checkModels();
