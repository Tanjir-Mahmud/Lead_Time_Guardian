/**
 * You.com Search API Client for the Lead-Time Guardian
 * Provides live web intelligence for trade policy, supply chain disruptions, and news.
 * 
 * Endpoint: https://api.ydc-index.io/search
 * Auth: X-API-Key header
 * Docs: https://docs.you.com/api-reference/search/v1-search
 */

const YOU_API_BASE = 'https://api.ydc-index.io';

export interface YouSearchResult {
    url: string;
    title: string;
    description: string;
    snippets: string[];
    page_age?: string;
}

export interface YouNewsResult {
    title: string;
    description: string;
    url: string;
    page_age?: string;
}

export interface YouSearchResponse {
    results: {
        web?: YouSearchResult[];
        news?: YouNewsResult[];
    };
    metadata: {
        query: string;
        search_uuid: string;
        latency: number;
    };
}

export interface TradeIntelligence {
    trade_policies: YouSearchResult[];
    disruptions: YouSearchResult[];
    news: YouNewsResult[];
    raw_queries: string[];
    api_status: 'success' | 'partial' | 'fallback';
    error_detail?: string;
}

function getApiKey(): string {
    const key = process.env.YOU_API_KEY;
    if (!key) {
        throw new Error('YOU_API_KEY is not configured in environment variables.');
    }
    return key;
}

/**
 * Core search function — calls You.com Search API
 */
async function youSearch(query: string, count: number = 5, freshness?: string): Promise<YouSearchResponse | null> {
    try {
        const apiKey = getApiKey();
        const params = new URLSearchParams({ query, count: String(count) });
        if (freshness) params.set('freshness', freshness);

        const response = await fetch(`${YOU_API_BASE}/search?${params.toString()}`, {
            method: 'GET',
            headers: {
                'X-API-Key': apiKey,
            },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[You.com API] ${response.status} ${response.statusText}: ${errorBody}`);
            return null;
        }

        return await response.json() as YouSearchResponse;
    } catch (error) {
        console.error('[You.com API] Network Error:', error);
        return null;
    }
}

/**
 * Search for current trade policies between two countries for a specific sector
 */
export async function searchTradePolicy(
    originCountry: string,
    destinationCountry: string,
    sector: string
): Promise<YouSearchResult[]> {
    const queries = [
        `${originCountry} ${destinationCountry} trade agreement tariff ${sector} 2026`,
        `${originCountry} export ${destinationCountry} preferential trade GSP FTA duty-free ${sector}`,
    ];

    const allResults: YouSearchResult[] = [];

    for (const query of queries) {
        const response = await youSearch(query, 5, 'month');
        if (response?.results?.web) {
            allResults.push(...response.results.web);
        }
    }

    return allResults;
}

/**
 * Search for live supply chain disruptions on the route
 */
export async function searchDisruptions(
    originCountry: string,
    destinationCountry: string
): Promise<YouSearchResult[]> {
    const queries = [
        `${originCountry} ${destinationCountry} shipping port strike logistics disruption 2026`,
        `${originCountry} ${destinationCountry} trade sanctions embargo export ban 2026`,
        `${originCountry} ${destinationCountry} extreme weather shipping route delay`,
    ];

    const allResults: YouSearchResult[] = [];

    for (const query of queries) {
        const response = await youSearch(query, 3, 'week');
        if (response?.results?.web) {
            allResults.push(...response.results.web);
        }
    }

    return allResults;
}

/**
 * Search for live breaking news related to the trade route
 */
export async function searchTradeNews(
    originCountry: string,
    destinationCountry: string,
    sector: string
): Promise<YouNewsResult[]> {
    const query = `${originCountry} ${destinationCountry} ${sector} trade news tariff logistics`;
    const response = await youSearch(query, 10, 'day');
    return response?.results?.news || [];
}

/**
 * Master function: Gather ALL trade intelligence for a route
 */
export async function gatherTradeIntelligence(
    originCountry: string,
    destinationCountry: string,
    sector: string
): Promise<TradeIntelligence> {
    const rawQueries: string[] = [];
    let apiStatus: 'success' | 'partial' | 'fallback' = 'success';
    let errorDetail: string | undefined;

    try {
        // Run all searches in parallel
        const [tradePolicies, disruptions, news] = await Promise.all([
            searchTradePolicy(originCountry, destinationCountry, sector),
            searchDisruptions(originCountry, destinationCountry),
            searchTradeNews(originCountry, destinationCountry, sector),
        ]);

        rawQueries.push(
            `Trade Policy: ${originCountry} → ${destinationCountry} (${sector})`,
            `Disruptions: ${originCountry} → ${destinationCountry}`,
            `News: ${originCountry} → ${destinationCountry} (${sector})`
        );

        // Determine API status
        if (tradePolicies.length === 0 && disruptions.length === 0 && news.length === 0) {
            apiStatus = 'fallback';
            errorDetail = 'No results returned — API key may lack Search permissions (403).';
        } else if (tradePolicies.length === 0 || disruptions.length === 0) {
            apiStatus = 'partial';
        }

        return {
            trade_policies: tradePolicies,
            disruptions,
            news,
            raw_queries: rawQueries,
            api_status: apiStatus,
            error_detail: errorDetail,
        };
    } catch (error) {
        console.error('[TradeIntelligence] Gathering failed:', error);
        return {
            trade_policies: [],
            disruptions: [],
            news: [],
            raw_queries: rawQueries,
            api_status: 'fallback',
            error_detail: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
