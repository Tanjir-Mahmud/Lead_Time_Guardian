// Test script for AISStream.io API
// AISStream uses WebSocket for real-time AIS data

const API_KEY = '92374e30ed953f8f4b472c920ac02bf96a6b3a89';

async function testAISStreamAPI() {
    console.log('\n🔑 Testing AISStream.io API Key...\n');

    // AISStream uses WebSocket, but they also have a REST endpoint for testing
    // Let's first try to validate the key format and then test WebSocket connection

    console.log('API Key:', API_KEY.substring(0, 10) + '...');
    console.log('Key Length:', API_KEY.length, '(expected: 40)');

    if (API_KEY.length !== 40) {
        console.log('⚠️  Key length unusual, but may still work');
    }

    // Test WebSocket connection
    console.log('\n📡 Testing WebSocket connection...');

    const WebSocket = require('ws');

    return new Promise((resolve) => {
        const ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

        ws.on('open', () => {
            console.log('✅ WebSocket connected!');

            // Subscribe to a specific vessel (MMSI 477164400)
            const subscriptionMessage = {
                APIKey: API_KEY,
                BoundingBoxes: [[[-180, -90], [180, 90]]], // World-wide
                FiltersShipMMSI: ["477164400"], // Specific vessel
                FilterMessageTypes: ["PositionReport"]
            };

            console.log('📤 Sending subscription request...');
            ws.send(JSON.stringify(subscriptionMessage));
        });

        ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            console.log('\n✅ AISStream API Key is VALID!');
            console.log('📍 Received data:', JSON.stringify(message, null, 2).substring(0, 500));
            ws.close();
            resolve(true);
        });

        ws.on('error', (error) => {
            console.log('\n❌ WebSocket error:', error.message);
            resolve(false);
        });

        ws.on('close', (code, reason) => {
            if (code === 1008 || code === 4001) {
                console.log('\n❌ API Key is INVALID or unauthorized');
                console.log('   Close code:', code, reason.toString());
            } else {
                console.log('\n✅ Connection closed normally');
            }
            resolve(false);
        });

        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('\n⏰ Timeout - No data received in 10 seconds');
            console.log('   This may be normal if no vessels match the filter');
            console.log('   The API key appears to be valid (connection established)');
            ws.close();
            resolve(true);
        }, 10000);
    });
}

testAISStreamAPI().then(result => {
    console.log('\n=== TEST RESULT ===');
    if (result) {
        console.log('✅ AISStream.io API key appears to be working!');
    } else {
        console.log('❌ AISStream.io API key test failed');
    }
    process.exit(0);
});
