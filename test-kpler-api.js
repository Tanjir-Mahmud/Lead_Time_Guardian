// Test script for Kpler API
const KPLER_API_KEY = 'NVQ1N3A1c0prdzZ6Y1ZiWExsWUxBNmlvdmJpbndxRmQ6TFlUNENuTldHQWJhdFAwS2FzZS0zLWI1eE91b04taGZldzJTdW0wWnNwSWc2d0haQm5DMnU2UGZaOGd5YWJ0Zw==';

async function testKplerAPI() {
    console.log('\n🔑 Testing Kpler API Key...\n');

    try {
        // Kpler GraphQL query
        const query = `
            query GetVessel($mmsi: String!) {
                vessels(filter: { mmsi: [$mmsi] }) {
                    nodes {
                        mmsi
                        imo
                        name
                        vesselType
                        latestPosition {
                            latitude
                            longitude
                            speedOverGround
                            courseOverGround
                            timestamp
                        }
                    }
                }
            }
        `;

        console.log('Endpoint: https://api.kpler.com/graphql');
        console.log('MMSI: 477164400');
        console.log('Sending request...\n');

        const response = await fetch('https://api.kpler.com/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${KPLER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: query,
                variables: { mmsi: '477164400' }
            })
        });

        console.log('HTTP Status:', response.status);

        const text = await response.text();
        console.log('Raw Response:', text.substring(0, 500)); // First 500 chars

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.log('\n❌ Response is not valid JSON');
            console.log('Full response:', text);
            return;
        }

        if (response.status === 200 && data.data) {
            console.log('\n✅ Kpler API Key is VALID!');

            const vessels = data.data.vessels?.nodes;
            if (vessels && vessels.length > 0) {
                const vessel = vessels[0];
                console.log('\n📍 Vessel Found:');
                console.log('   Name:', vessel.name);
                console.log('   MMSI:', vessel.mmsi);
                console.log('   Type:', vessel.vesselType);
                console.log('   Position:', vessel.latestPosition?.latitude, vessel.latestPosition?.longitude);
                console.log('   Speed:', vessel.latestPosition?.speedOverGround, 'knots');
                console.log('   Timestamp:', vessel.latestPosition?.timestamp);
            } else {
                console.log('\n⚠️  API works, but vessel MMSI 477164400 not found in Kpler database');
                console.log('   This is normal - the vessel may not be in their system');
            }
        } else if (data.errors) {
            console.log('\n❌ Kpler GraphQL Error:');
            console.log('   Message:', data.errors[0].message);
            console.log('   Type:', data.errors[0].extensions?.code);
        } else {
            console.log('\n❌ API Key appears to be INVALID or request failed!');
            console.log('   Error:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('   Stack:', error.stack);
    }
}

testKplerAPI();
