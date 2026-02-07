import { getForecast, analyzeWeatherRisk } from './src/lib/weather';
import { getRoadStatus, getPortStatus, calculateLogisticsHealth } from './src/lib/logistics';

async function runVerification() {
    console.log("=== STARTING VERIFICATION ===");

    // 1. Test Weather API
    console.log("\n--- Testing OpenWeatherMap ---");
    const city = "Dhaka";
    const forecast = await getForecast(city);
    if (forecast) {
        console.log(`✅ Weather Data Fetched for ${city}`);
        const risk = analyzeWeatherRisk(forecast);
        console.log("Risk Analysis:", risk);
    } else {
        console.error("❌ Weather API Failed");
    }

    // 2. Test Logistics (Mock/Simulated)
    console.log("\n--- Testing Logistics Services ---");
    const road = await getRoadStatus("Dhaka", "Chittagong");
    console.log(`Road Status: ${road}`);

    const port = await getPortStatus("Chittagong");
    console.log(`Port Status: ${port}`);

    console.log("\n=== VERIFICATION COMPLETE ===");
}

runVerification();
