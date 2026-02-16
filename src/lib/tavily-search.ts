/**
 * Tavily Search API Client — Primary Live Search Engine
 * 
 * Uses Tavily to fetch real-time trade intelligence:
 * - Tariff rates, trade agreements, port disruptions, weather events
 * - Search-First approach: always try live data before falling back
 * 
 * Tavily API Docs: https://docs.tavily.com
 * Endpoint: POST https://api.tavily.com/search
 */

const TAVILY_API_URL = 'https://api.tavily.com/search';

export interface TavilyResult {
    url: string;
    title: string;
    content: string;
    score: number;
    raw_content?: string | null;
}

export interface TavilySearchResponse {
    query: string;
    answer: string | null;
    results: TavilyResult[];
    response_time: number;
    request_id: string;
}

export interface LiveTradeIntelligence {
    tariff_data: TavilyResult[];
    port_disruptions: TavilyResult[];
    trade_agreements: TavilyResult[];
    news_headlines: TavilyResult[];
    raw_queries: string[];
    api_status: 'live' | 'partial' | 'fallback';
    response_times: number[];
    error_detail?: string;
}

function getApiKey(): string {
    const key = process.env.TAVILY_API_KEY;
    if (!key) {
        throw new Error('TAVILY_API_KEY is not configured in environment variables.');
    }
    return key;
}

/**
 * Core Tavily search function
 */
async function tavilySearch(
    query: string,
    maxResults: number = 5,
    searchDepth: 'basic' | 'advanced' = 'basic'
): Promise<TavilySearchResponse | null> {
    try {
        const apiKey = getApiKey();

        const response = await fetch(TAVILY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_key: apiKey,
                query,
                max_results: maxResults,
                search_depth: searchDepth,
                include_answer: true,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Tavily] ${response.status}: ${errorBody}`);
            return null;
        }

        return await response.json() as TavilySearchResponse;
    } catch (error) {
        console.error('[Tavily] Network Error:', error);
        return null;
    }
}

/**
 * Search for current tariff rates between two countries for a specific industry
 */
export async function searchTariffRates(
    originCountry: string,
    destinationCountry: string,
    sector: string
): Promise<{ results: TavilyResult[]; answer: string | null; responseTime: number }> {
    const query = `What are the current import tariff rates from ${originCountry} to ${destinationCountry} for ${sector} products in February 2026? Include reciprocal tariffs, GSP, and any preferential trade deals.`;

    const response = await tavilySearch(query, 5, 'advanced');
    return {
        results: response?.results || [],
        answer: response?.answer || null,
        responseTime: response?.response_time || 0,
    };
}

/**
 * Search for active port strikes, weather disruptions, and congestion
 */
export async function searchPortDisruptions(
    portName: string,
    originCountry: string,
    destinationCountry: string
): Promise<{ results: TavilyResult[]; answer: string | null; responseTime: number }> {
    const query = `Current port status ${portName} February 2026: any strikes, congestion, weather disruptions, or shipping delays affecting ${originCountry} to ${destinationCountry} cargo?`;

    const response = await tavilySearch(query, 5, 'basic');
    return {
        results: response?.results || [],
        answer: response?.answer || null,
        responseTime: response?.response_time || 0,
    };
}

/**
 * Search for special trade agreements (reciprocal deals, FTAs, GSP)
 */
export async function searchTradeAgreements(
    originCountry: string,
    destinationCountry: string,
    sector: string
): Promise<{ results: TavilyResult[]; answer: string | null; responseTime: number }> {
    const query = `${originCountry} ${destinationCountry} trade agreement 2026: any reciprocal deal, duty-free, GSP, FTA, or zero-tariff arrangement for ${sector}? Include any recent policy changes.`;

    const response = await tavilySearch(query, 5, 'advanced');
    return {
        results: response?.results || [],
        answer: response?.answer || null,
        responseTime: response?.response_time || 0,
    };
}

/**
 * Search for latest trade news
 */
export async function searchTradeNewsLive(
    originCountry: string,
    destinationCountry: string,
    sector: string
): Promise<{ results: TavilyResult[]; answer: string | null; responseTime: number }> {
    const query = `Latest ${originCountry} ${destinationCountry} ${sector} trade news February 2026: tariffs, sanctions, supply chain, logistics`;

    const response = await tavilySearch(query, 5, 'basic');
    return {
        results: response?.results || [],
        answer: response?.answer || null,
        responseTime: response?.response_time || 0,
    };
}

/**
 * MASTER: Gather ALL trade intelligence — parallel execution for speed
 */
export async function gatherLiveTradeIntelligence(
    originCountry: string,
    destinationCountry: string,
    sector: string,
    portName: string = 'Chittagong'
): Promise<LiveTradeIntelligence> {
    const rawQueries: string[] = [];
    const responseTimes: number[] = [];
    let apiStatus: 'live' | 'partial' | 'fallback' = 'live';
    let errorDetail: string | undefined;

    try {
        // Fire ALL searches in parallel for maximum speed
        const [tariffData, portData, agreementData, newsData] = await Promise.all([
            searchTariffRates(originCountry, destinationCountry, sector),
            searchPortDisruptions(portName, originCountry, destinationCountry),
            searchTradeAgreements(originCountry, destinationCountry, sector),
            searchTradeNewsLive(originCountry, destinationCountry, sector),
        ]);

        rawQueries.push(
            `Tariffs: ${originCountry} → ${destinationCountry} (${sector})`,
            `Port: ${portName} disruptions`,
            `Agreements: ${originCountry} ↔ ${destinationCountry}`,
            `News: ${originCountry} → ${destinationCountry}`
        );

        responseTimes.push(
            tariffData.responseTime,
            portData.responseTime,
            agreementData.responseTime,
            newsData.responseTime
        );

        // Determine API status
        const totalResults = tariffData.results.length + portData.results.length +
            agreementData.results.length + newsData.results.length;

        if (totalResults === 0) {
            apiStatus = 'fallback';
            errorDetail = 'Tavily returned zero results across all queries.';
        } else if (tariffData.results.length === 0 || portData.results.length === 0) {
            apiStatus = 'partial';
            errorDetail = 'Some search queries returned empty results.';
        }

        console.log(`[Tavily] ✅ ${totalResults} total results | Avg response: ${(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length).toFixed(2)}s`);

        return {
            tariff_data: tariffData.results,
            port_disruptions: portData.results,
            trade_agreements: agreementData.results,
            news_headlines: newsData.results,
            raw_queries: rawQueries,
            api_status: apiStatus,
            response_times: responseTimes,
            error_detail: errorDetail,
        };
    } catch (error) {
        console.error('[Tavily] Live intelligence gathering failed:', error);
        return {
            tariff_data: [],
            port_disruptions: [],
            trade_agreements: [],
            news_headlines: [],
            raw_queries: rawQueries,
            api_status: 'fallback',
            response_times: [],
            error_detail: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
