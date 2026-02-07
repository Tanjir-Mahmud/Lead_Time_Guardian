import { API_CONFIG } from './api_config';

export interface WeatherRisk {
    hasRisk: boolean;
    riskType: 'Rain' | 'Storm' | 'Extreme Winds' | 'None';
    description: string;
    forecastDate: string;
}

export async function getForecast(city: string): Promise<any> {
    try {
        const url = `${API_CONFIG.OPENWEATHER.BASE_URL}/forecast?q=${city}&appid=${API_CONFIG.OPENWEATHER.KEY}&units=metric`;
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Weather API Error: ${response.statusText}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Weather API Fetch Error:', error);
        return null;
    }
}

export function analyzeWeatherRisk(forecastData: any): WeatherRisk {
    if (!forecastData || !forecastData.list) {
        return { hasRisk: false, riskType: 'None', description: 'No data available', forecastDate: '' };
    }

    // Analyze next 72 hours (8 intervals per day * 3 days = 24 intervals)
    const next72Hours = forecastData.list.slice(0, 24);

    for (const interval of next72Hours) {
        const weatherMain = interval.weather?.[0]?.main;
        const weatherDesc = interval.weather?.[0]?.description;
        const windSpeed = interval.wind?.speed;
        const dtTxt = interval.dt_txt;

        if (weatherMain === 'Rain' || weatherDesc?.includes('rain')) {
            return {
                hasRisk: true,
                riskType: 'Rain',
                description: `Heavy rain detected`,
                forecastDate: dtTxt
            };
        }

        if (weatherMain === 'Thunderstorm' || weatherDesc?.includes('storm')) {
            return {
                hasRisk: true,
                riskType: 'Storm',
                description: `Storm warning`,
                forecastDate: dtTxt
            };
        }

        if (windSpeed > 15) { // Assuming > 15 m/s is extreme wind for this context
            return {
                hasRisk: true,
                riskType: 'Extreme Winds',
                description: `High winds (${windSpeed}m/s)`,
                forecastDate: dtTxt
            };
        }
    }

    return { hasRisk: false, riskType: 'None', description: 'Conditions nominal', forecastDate: '' };
}
