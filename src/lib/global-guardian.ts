/**
 * Global Guardian Report Generator
 * Orchestrates You.com search → Gemini analysis → Structured Report
 * 
 * Produces: Route Risk Score, Tariff Optimization, Alternative Logistics,
 *           Supply Chain Disruptions, Cross-Sector Impact Analysis
 */

import { gatherTradeIntelligence, TradeIntelligence } from './you-search';
import { getOpenRouter } from './openrouter';

// --- Types ---
export interface GlobalGuardianReport {
    route_risk_score: number; // 1-10
    route_risk_label: string;
    trade_policy: {
        current_tariff_rate: string;
        preferential_conditions: string;
        trade_agreements: string[];
    };
    tariff_optimization: {
        current_rate: string;
        alternative_country: string;
        alternative_rate: string;
        potential_savings_pct: string;
        recommendation: string;
    };
    supply_chain_disruptions: {
        logistics_alerts: string[];
        geopolitical_alerts: string[];
        environmental_alerts: string[];
    };
    alternative_logistics: {
        recommended_port: string;
        recommended_route: string;
        reason: string;
    };
    cross_sector_impact: {
        lead_time_buffer_days: number;
        sector_sensitivity: string;
        financial_risk_usd: number;
        risk_description: string;
    };
    live_news_summary: string[];
    data_source: 'you_api_live' | 'ai_analysis_only';
    intelligence_metadata: {
        queries_run: string[];
        web_sources_found: number;
        news_sources_found: number;
        api_status: string;
    };
}

/**
 * Build a context string from You.com search results for Gemini
 */
function buildSearchContext(intel: TradeIntelligence): string {
    let context = '';

    if (intel.trade_policies.length > 0) {
        context += '\n## TRADE POLICY SEARCH RESULTS:\n';
        intel.trade_policies.slice(0, 8).forEach((r, i) => {
            context += `[${i + 1}] "${r.title}" — ${r.description}\n`;
            if (r.snippets?.length) {
                context += `   Snippet: ${r.snippets[0].substring(0, 300)}\n`;
            }
        });
    }

    if (intel.disruptions.length > 0) {
        context += '\n## SUPPLY CHAIN DISRUPTION SEARCH RESULTS:\n';
        intel.disruptions.slice(0, 6).forEach((r, i) => {
            context += `[${i + 1}] "${r.title}" — ${r.description}\n`;
            if (r.snippets?.length) {
                context += `   Snippet: ${r.snippets[0].substring(0, 300)}\n`;
            }
        });
    }

    if (intel.news.length > 0) {
        context += '\n## BREAKING NEWS:\n';
        intel.news.slice(0, 5).forEach((n, i) => {
            context += `[${i + 1}] "${n.title}" — ${n.description} (${n.page_age || 'recent'})\n`;
        });
    }

    return context || '\n[No live data available — API returned empty results]\n';
}

/**
 * Main: Generate Global Guardian Report
 */
export async function generateGlobalGuardianReport(
    originCountry: string,
    destinationCountry: string,
    sector: string,
    fobValue: number
): Promise<GlobalGuardianReport> {
    // Step 1: Gather live intelligence from You.com
    const intel = await gatherTradeIntelligence(originCountry, destinationCountry, sector);
    const searchContext = buildSearchContext(intel);
    const hasLiveData = intel.api_status !== 'fallback';

    // Step 2: Send context + task to Gemini for structured analysis
    const analysisPrompt = `
You are the **Lead-Time Guardian Global Trade Strategist** — an expert in international trade, logistics, and supply chain risk management.

You have been given LIVE SEARCH RESULTS from the internet (February 2026). Use them to produce a detailed, actionable report.

# INPUT DATA:
- **Origin**: ${originCountry}
- **Destination**: ${destinationCountry}
- **Industry Sector**: ${sector}
- **FOB Value**: $${fobValue.toLocaleString()}
- **Date**: February 2026

# LIVE INTELLIGENCE FROM YOU.COM API:
${searchContext}

# YOUR TASK:
Analyze the above search results and produce a JSON report with EXACTLY this structure:

{
  "route_risk_score": <1-10 integer based on current conditions>,
  "route_risk_label": "<Low Risk | Moderate Risk | High Risk | Critical Risk>",
  "trade_policy": {
    "current_tariff_rate": "<e.g. '12.5%' or 'Duty-Free under GSP'>",
    "preferential_conditions": "<describe any GSP, FTA, or bilateral deal>",
    "trade_agreements": ["<list applicable agreements>"]
  },
  "tariff_optimization": {
    "current_rate": "<rate for this route>",
    "alternative_country": "<country with lower tariff for same product>",
    "alternative_rate": "<that country's rate>",
    "potential_savings_pct": "<savings percentage>",
    "recommendation": "<actionable recommendation>"
  },
  "supply_chain_disruptions": {
    "logistics_alerts": ["<port strikes, fuel surcharges, lane closures>"],
    "geopolitical_alerts": ["<sanctions, embargoes, policy changes in last 24h>"],
    "environmental_alerts": ["<extreme weather affecting transit hubs>"]
  },
  "alternative_logistics": {
    "recommended_port": "<safer port if current is high-risk>",
    "recommended_route": "<alternative shipping route>",
    "reason": "<why this is better>"
  },
  "cross_sector_impact": {
    "lead_time_buffer_days": <integer, higher for perishables>,
    "sector_sensitivity": "<High | Medium | Low>",
    "financial_risk_usd": <number — potential loss if delay causes duty/surcharge breach>,
    "risk_description": "<explain the financial risk>"
  },
  "live_news_summary": ["<top 3-5 relevant news headlines with impact>"]
}

RULES:
- Base ALL analysis on the search results provided. Do not fabricate data.
- If search results are empty, use your expert knowledge but clearly note it.
- route_risk_score: 1-3 = Low, 4-6 = Moderate, 7-8 = High, 9-10 = Critical.
- financial_risk_usd should be calculated relative to the FOB value ($${fobValue}).
- Return ONLY valid JSON, no markdown.
`;

    try {
        const response = await getOpenRouter().chat.completions.create({
            model: 'google/gemini-3-flash-preview',
            messages: [
                { role: 'system', content: 'You are a global trade risk analyst. Return ONLY valid JSON.' },
                { role: 'user', content: analysisPrompt },
            ],
            response_format: { type: 'json_object' },
        });

        let rawContent = response.choices[0]?.message?.content || '{}';
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(rawContent);

        return {
            route_risk_score: analysis.route_risk_score || 5,
            route_risk_label: analysis.route_risk_label || 'Moderate Risk',
            trade_policy: analysis.trade_policy || {
                current_tariff_rate: 'Unknown',
                preferential_conditions: 'None identified',
                trade_agreements: [],
            },
            tariff_optimization: analysis.tariff_optimization || {
                current_rate: 'Unknown',
                alternative_country: 'None',
                alternative_rate: 'N/A',
                potential_savings_pct: '0%',
                recommendation: 'Insufficient data for optimization.',
            },
            supply_chain_disruptions: analysis.supply_chain_disruptions || {
                logistics_alerts: [],
                geopolitical_alerts: [],
                environmental_alerts: [],
            },
            alternative_logistics: analysis.alternative_logistics || {
                recommended_port: 'N/A',
                recommended_route: 'N/A',
                reason: 'No high-risk flags detected.',
            },
            cross_sector_impact: analysis.cross_sector_impact || {
                lead_time_buffer_days: 3,
                sector_sensitivity: 'Medium',
                financial_risk_usd: 0,
                risk_description: 'No significant risk detected.',
            },
            live_news_summary: analysis.live_news_summary || [],
            data_source: hasLiveData ? 'you_api_live' : 'ai_analysis_only',
            intelligence_metadata: {
                queries_run: intel.raw_queries,
                web_sources_found: intel.trade_policies.length + intel.disruptions.length,
                news_sources_found: intel.news.length,
                api_status: intel.api_status,
            },
        };
    } catch (error) {
        console.error('[GlobalGuardian] Gemini analysis failed:', error);
        // Return a safe fallback report
        return {
            route_risk_score: 5,
            route_risk_label: 'Moderate Risk (Analysis Unavailable)',
            trade_policy: {
                current_tariff_rate: 'Unknown',
                preferential_conditions: 'Analysis failed — retry required',
                trade_agreements: [],
            },
            tariff_optimization: {
                current_rate: 'Unknown',
                alternative_country: 'N/A',
                alternative_rate: 'N/A',
                potential_savings_pct: '0%',
                recommendation: 'Analysis unavailable. Please retry.',
            },
            supply_chain_disruptions: {
                logistics_alerts: ['Analysis service temporarily unavailable'],
                geopolitical_alerts: [],
                environmental_alerts: [],
            },
            alternative_logistics: {
                recommended_port: 'N/A',
                recommended_route: 'N/A',
                reason: 'Fallback mode — no live data.',
            },
            cross_sector_impact: {
                lead_time_buffer_days: 5,
                sector_sensitivity: 'Medium',
                financial_risk_usd: 0,
                risk_description: 'Unable to calculate — analysis service unavailable.',
            },
            live_news_summary: [],
            data_source: 'ai_analysis_only',
            intelligence_metadata: {
                queries_run: intel.raw_queries,
                web_sources_found: 0,
                news_sources_found: 0,
                api_status: 'fallback',
            },
        };
    }
}
