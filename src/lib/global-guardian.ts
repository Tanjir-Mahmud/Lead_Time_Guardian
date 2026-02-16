/**
 * Global Guardian Report Generator — v2: Search-First, Logic-Fallback
 * 
 * Architecture:
 * 1. PRIMARY: Tavily Search API → live trade intelligence (tariffs, ports, agreements)
 * 2. FALLBACK: Trade Strategist Engine → deterministic logic (19%/0% tariff rules)
 * 3. ANALYSIS: Gemini → synthesizes live data + fallback into actionable report
 * 
 * Output: GlobalGuardianReport with Analysis Status, Predicted Delay,
 *         Financial Impact, and Guardian Alert
 */

import { gatherLiveTradeIntelligence, LiveTradeIntelligence, TavilyResult } from './tavily-search';
import { generateRiskOpportunityReport, IndustrySector, RiskOpportunityReport } from './trade-strategist';
import { getOpenRouter } from './openrouter';

// --- Types ---
export interface GlobalGuardianReport {
    // Header
    report_id: string;
    generated_at: string;
    analysis_status: 'Live API Insights' | 'System Fallback Logic' | 'Hybrid (Live + Fallback)';

    // Route Risk
    route_risk_score: number; // 1-10
    route_risk_label: string;

    // Trade Policy (from live search)
    trade_policy: {
        current_tariff_rate: string;
        preferential_conditions: string;
        trade_agreements: string[];
        source: string; // 'Tavily Live Search' or 'Guardian Fallback Logic'
    };

    // Tariff Optimization
    tariff_optimization: {
        current_rate: string;
        zero_tariff_eligible: boolean;
        zero_tariff_reason: string;
        potential_savings_usd: number;
        recommendation: string;
    };

    // Supply Chain Disruptions (from live search)
    supply_chain_disruptions: {
        logistics_alerts: string[];
        geopolitical_alerts: string[];
        environmental_alerts: string[];
        port_status: string;
    };

    // Lead Time Prediction
    predicted_delay: {
        base_days: number;
        buffer_days: number;
        total_range: string; // e.g. "35-42 days"
        risk_buffer_reason: string;
    };

    // Financial Impact
    financial_impact: {
        fob_value_usd: number;
        tax_liability_19pct: number;
        potential_savings_0pct: number;
        delay_penalty_usd: number;
        total_risk_exposure_usd: number;
        net_opportunity: string;
    };

    // Alternative Logistics
    alternative_logistics: {
        recommended_port: string;
        recommended_route: string;
        reason: string;
    };

    // Guardian Alert — single actionable sentence
    guardian_alert: string;

    // Live News
    live_news_summary: string[];

    // Intelligence Metadata
    intelligence_metadata: {
        data_source: 'tavily_live' | 'system_fallback' | 'hybrid';
        queries_run: string[];
        total_sources_found: number;
        avg_response_time_sec: number;
        api_status: string;
        tavily_answer: string | null;
    };
}

/**
 * Build context string from Tavily search results for Gemini analysis
 */
function buildTavilyContext(intel: LiveTradeIntelligence): string {
    let context = '';

    if (intel.tariff_data.length > 0) {
        context += '\n## LIVE TARIFF DATA (Tavily Search — February 2026):\n';
        intel.tariff_data.forEach((r, i) => {
            context += `[${i + 1}] "${r.title}" (score: ${r.score.toFixed(2)})\n`;
            context += `   ${r.content.substring(0, 400)}\n`;
            context += `   Source: ${r.url}\n\n`;
        });
    }

    if (intel.port_disruptions.length > 0) {
        context += '\n## LIVE PORT STATUS & DISRUPTIONS:\n';
        intel.port_disruptions.forEach((r, i) => {
            context += `[${i + 1}] "${r.title}" (score: ${r.score.toFixed(2)})\n`;
            context += `   ${r.content.substring(0, 400)}\n\n`;
        });
    }

    if (intel.trade_agreements.length > 0) {
        context += '\n## TRADE AGREEMENTS & SPECIAL DEALS:\n';
        intel.trade_agreements.forEach((r, i) => {
            context += `[${i + 1}] "${r.title}" (score: ${r.score.toFixed(2)})\n`;
            context += `   ${r.content.substring(0, 400)}\n\n`;
        });
    }

    if (intel.news_headlines.length > 0) {
        context += '\n## BREAKING TRADE NEWS:\n';
        intel.news_headlines.forEach((r, i) => {
            context += `[${i + 1}] "${r.title}": ${r.content.substring(0, 200)}\n`;
        });
    }

    return context || '\n[No live data available — using System Fallback Logic]\n';
}

/**
 * Generate Report ID
 */
function genId(): string {
    return `GG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Main: Generate Global Guardian Report (Search-First, Logic-Fallback)
 */
export async function generateGlobalGuardianReport(
    originCountry: string,
    destinationCountry: string,
    sector: string,
    fobValue: number,
    portOfLoading: string = 'Chittagong',
    usesDestinationRawMaterials: boolean = false
): Promise<GlobalGuardianReport> {

    // ===== STEP 1: Live Search Execution (Primary) =====
    console.log(`[Guardian] Step 1: Tavily live search for ${originCountry} → ${destinationCountry} (${sector})`);
    const liveIntel = await gatherLiveTradeIntelligence(originCountry, destinationCountry, sector, portOfLoading);
    const hasLiveData = liveIntel.api_status === 'live' || liveIntel.api_status === 'partial';
    const tavilyContext = buildTavilyContext(liveIntel);

    // ===== STEP 2: Fallback Logic (Always generate as safety net) =====
    console.log(`[Guardian] Step 2: Generating fallback logic report...`);
    const inferredSector: IndustrySector = (['Garments', 'Electronics', 'Perishables', 'Chemicals', 'Automotive'].includes(sector) ? sector : 'General') as IndustrySector;

    const fallbackReport = generateRiskOpportunityReport({
        origin_country: originCountry,
        destination_country: destinationCountry,
        port_of_loading: portOfLoading,
        port_of_discharge: destinationCountry.toLowerCase().includes('us') ? 'Los Angeles' : 'Rotterdam',
        sector: inferredSector,
        fob_value_usd: fobValue,
        uses_destination_raw_materials: usesDestinationRawMaterials,
        shipment_mode: 'Sea',
    });

    // ===== STEP 3: Gemini Synthesis — Merge live data + fallback =====
    console.log(`[Guardian] Step 3: Gemini synthesis (live=${hasLiveData})...`);

    const analysisStatus = hasLiveData ? 'Live API Insights' : 'System Fallback Logic';

    const synthesisPrompt = `
You are the **Lead-Time Guardian** — an AI Global Trade Strategist. 
Date: February 2026.

# ANALYSIS STATUS: ${analysisStatus}

# ROUTE: ${originCountry} → ${destinationCountry}
# SECTOR: ${sector}
# FOB VALUE: $${fobValue.toLocaleString()}
# PORT OF LOADING: ${portOfLoading}
# USES DESTINATION RAW MATERIALS: ${usesDestinationRawMaterials ? 'YES (eligible for 0% tariff)' : 'NO (19% standard tariff applies)'}

# LIVE SEARCH RESULTS FROM TAVILY API:
${tavilyContext}

# FALLBACK SYSTEM DATA:
- Tariff Applied: ${fallbackReport.tariff_analysis.applied_tariff_pct}%
- Lead Time: ${fallbackReport.predicted_lead_time}
- Port Congestion: ${fallbackReport.primary_port_risk.congestion_index}%
- Priority: ${fallbackReport.priority_classification}

# YOUR TASK:
Synthesize the live search results with the fallback data. Produce a JSON report:

{
  "route_risk_score": <1-10>,
  "route_risk_label": "<Low Risk | Moderate Risk | High Risk | Critical Risk>",
  "trade_policy": {
    "current_tariff_rate": "<exact rate found in live data, or fallback 19%>",
    "preferential_conditions": "<any GSP/FTA/bilateral deals found>",
    "trade_agreements": ["<list of agreements>"]
  },
  "tariff_optimization": {
    "current_rate": "<the actual rate>",
    "zero_tariff_eligible": ${usesDestinationRawMaterials},
    "zero_tariff_reason": "<explanation>",
    "potential_savings_usd": <number>,
    "recommendation": "<one actionable sentence>"
  },
  "supply_chain_disruptions": {
    "logistics_alerts": ["<from live search>"],
    "geopolitical_alerts": ["<from live search>"],
    "environmental_alerts": ["<from live search>"],
    "port_status": "<current status of ${portOfLoading}>"
  },
  "predicted_delay": {
    "base_days": <number>,
    "buffer_days": 15,
    "total_range": "<e.g. 35-42 days>",
    "risk_buffer_reason": "<why 15-day buffer is applied>"
  },
  "financial_impact": {
    "fob_value_usd": ${fobValue},
    "tax_liability_19pct": ${Number((fobValue * 0.19).toFixed(2))},
    "potential_savings_0pct": ${Number((fobValue * 0.19).toFixed(2))},
    "delay_penalty_usd": <estimated from port data>,
    "total_risk_exposure_usd": <sum of all risks>,
    "net_opportunity": "<savings vs costs summary>"
  },
  "alternative_logistics": {
    "recommended_port": "<safer port>",
    "recommended_route": "<alternative route>",
    "reason": "<why>"
  },
  "guardian_alert": "<ONE sentence actionable advice, e.g. 'Switch to US Cotton sourcing to save 19% immediately'>",
  "live_news_summary": ["<top 3-5 headlines with impact>"]
}

RULES:
- If live data has specific tariff rates, USE THEM (not the 19% default).
- If live data is missing, clearly state "Based on System Fallback Logic".
- guardian_alert must be ONE SENTENCE, specific, and actionable.
- financial_impact numbers must be precise to 2 decimal places.
- Return ONLY valid JSON.
`;

    try {
        const response = await getOpenRouter().chat.completions.create({
            model: 'google/gemini-3-flash-preview',
            messages: [
                { role: 'system', content: 'You are a global trade risk analyst. Return ONLY valid JSON.' },
                { role: 'user', content: synthesisPrompt },
            ],
            response_format: { type: 'json_object' },
        });

        let rawContent = response.choices[0]?.message?.content || '{}';
        rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysis = JSON.parse(rawContent);

        // Merge Gemini analysis with metadata
        const report: GlobalGuardianReport = {
            report_id: genId(),
            generated_at: new Date().toISOString(),
            analysis_status: hasLiveData
                ? (liveIntel.api_status === 'partial' ? 'Hybrid (Live + Fallback)' : 'Live API Insights')
                : 'System Fallback Logic',

            route_risk_score: analysis.route_risk_score || fallbackReport.primary_port_risk.congestion_index > 60 ? 7 : 5,
            route_risk_label: analysis.route_risk_label || fallbackReport.primary_port_risk.risk_level + ' Risk',

            trade_policy: {
                current_tariff_rate: analysis.trade_policy?.current_tariff_rate || `${fallbackReport.tariff_analysis.applied_tariff_pct}%`,
                preferential_conditions: analysis.trade_policy?.preferential_conditions || fallbackReport.tariff_analysis.zero_tariff_reason,
                trade_agreements: analysis.trade_policy?.trade_agreements || [],
                source: hasLiveData ? 'Tavily Live Search' : 'Guardian Fallback Logic',
            },

            tariff_optimization: {
                current_rate: analysis.tariff_optimization?.current_rate || `${fallbackReport.tariff_analysis.applied_tariff_pct}%`,
                zero_tariff_eligible: usesDestinationRawMaterials,
                zero_tariff_reason: analysis.tariff_optimization?.zero_tariff_reason || fallbackReport.tariff_analysis.zero_tariff_reason,
                potential_savings_usd: analysis.tariff_optimization?.potential_savings_usd || fallbackReport.tariff_analysis.tariff_savings_usd,
                recommendation: analysis.tariff_optimization?.recommendation || fallbackReport.strategic_advice[0] || 'Review tariff eligibility.',
            },

            supply_chain_disruptions: analysis.supply_chain_disruptions || {
                logistics_alerts: fallbackReport.strategic_advice.filter(a => a.includes('PORT')),
                geopolitical_alerts: [],
                environmental_alerts: [],
                port_status: `${portOfLoading}: ${fallbackReport.primary_port_risk.congestion_index}% congestion`,
            },

            predicted_delay: {
                base_days: analysis.predicted_delay?.base_days || fallbackReport.primary_port_risk.base_lead_time_days,
                buffer_days: 15, // Mandatory 15-day buffer for 2026 volatility
                total_range: analysis.predicted_delay?.total_range || fallbackReport.predicted_lead_time,
                risk_buffer_reason: analysis.predicted_delay?.risk_buffer_reason || '15-day mandatory buffer for 2026 global logistics volatility — port congestion, weather, geopolitical risks.',
            },

            financial_impact: {
                fob_value_usd: fobValue,
                tax_liability_19pct: Number((fobValue * 0.19).toFixed(2)),
                potential_savings_0pct: Number((fobValue * 0.19).toFixed(2)),
                delay_penalty_usd: analysis.financial_impact?.delay_penalty_usd || fallbackReport.financial_impact.delay_penalty_usd,
                total_risk_exposure_usd: analysis.financial_impact?.total_risk_exposure_usd || fallbackReport.financial_impact.total_risk_exposure_usd,
                net_opportunity: analysis.financial_impact?.net_opportunity || `$${fallbackReport.financial_impact.net_opportunity_usd.toLocaleString()} potential`,
            },

            alternative_logistics: analysis.alternative_logistics || {
                recommended_port: fallbackReport.alternative_routes[0]?.port_name || 'Singapore',
                recommended_route: `Via ${fallbackReport.alternative_routes[0]?.port_name || 'Singapore'}`,
                reason: fallbackReport.alternative_routes[0]?.recommendation || 'Diversify port risk.',
            },

            guardian_alert: analysis.guardian_alert || (
                usesDestinationRawMaterials
                    ? `Zero-Tariff is active — saving $${(fobValue * 0.19).toFixed(2)} on this shipment. Monitor ${portOfLoading} for delays to maintain eligibility.`
                    : `Switch to ${destinationCountry}-origin raw materials to save 19% ($${(fobValue * 0.19).toFixed(2)}) immediately.`
            ),

            live_news_summary: analysis.live_news_summary || [],

            intelligence_metadata: {
                data_source: hasLiveData ? 'tavily_live' : 'system_fallback',
                queries_run: liveIntel.raw_queries,
                total_sources_found: liveIntel.tariff_data.length + liveIntel.port_disruptions.length +
                    liveIntel.trade_agreements.length + liveIntel.news_headlines.length,
                avg_response_time_sec: liveIntel.response_times.length > 0
                    ? Number((liveIntel.response_times.reduce((a, b) => a + b, 0) / liveIntel.response_times.length).toFixed(2))
                    : 0,
                api_status: liveIntel.api_status,
                tavily_answer: null, // Will be populated from Tavily's built-in answer
            },
        };

        console.log(`[Guardian] ✅ Report complete. Status: ${report.analysis_status} | Risk: ${report.route_risk_score}/10`);
        return report;

    } catch (error) {
        console.error('[Guardian] Gemini synthesis failed, returning fallback-only report:', error);

        // Pure fallback report without Gemini
        return {
            report_id: genId(),
            generated_at: new Date().toISOString(),
            analysis_status: 'System Fallback Logic',
            route_risk_score: fallbackReport.primary_port_risk.congestion_index > 60 ? 7 : 5,
            route_risk_label: fallbackReport.primary_port_risk.risk_level + ' Risk',
            trade_policy: {
                current_tariff_rate: `${fallbackReport.tariff_analysis.applied_tariff_pct}%`,
                preferential_conditions: fallbackReport.tariff_analysis.zero_tariff_reason,
                trade_agreements: [],
                source: 'Guardian Fallback Logic',
            },
            tariff_optimization: {
                current_rate: `${fallbackReport.tariff_analysis.applied_tariff_pct}%`,
                zero_tariff_eligible: usesDestinationRawMaterials,
                zero_tariff_reason: fallbackReport.tariff_analysis.zero_tariff_reason,
                potential_savings_usd: fallbackReport.tariff_analysis.tariff_savings_usd,
                recommendation: fallbackReport.strategic_advice[0] || 'Review tariff eligibility.',
            },
            supply_chain_disruptions: {
                logistics_alerts: fallbackReport.strategic_advice.filter(a => a.includes('PORT')),
                geopolitical_alerts: [],
                environmental_alerts: [],
                port_status: `${portOfLoading}: ${fallbackReport.primary_port_risk.congestion_index}% congestion`,
            },
            predicted_delay: {
                base_days: fallbackReport.primary_port_risk.base_lead_time_days,
                buffer_days: 15,
                total_range: fallbackReport.predicted_lead_time,
                risk_buffer_reason: '15-day mandatory buffer for 2026 global logistics volatility.',
            },
            financial_impact: {
                fob_value_usd: fobValue,
                tax_liability_19pct: Number((fobValue * 0.19).toFixed(2)),
                potential_savings_0pct: Number((fobValue * 0.19).toFixed(2)),
                delay_penalty_usd: fallbackReport.financial_impact.delay_penalty_usd,
                total_risk_exposure_usd: fallbackReport.financial_impact.total_risk_exposure_usd,
                net_opportunity: `$${fallbackReport.financial_impact.net_opportunity_usd.toLocaleString()} potential`,
            },
            alternative_logistics: {
                recommended_port: fallbackReport.alternative_routes[0]?.port_name || 'Singapore',
                recommended_route: `Via ${fallbackReport.alternative_routes[0]?.port_name || 'Singapore'}`,
                reason: fallbackReport.alternative_routes[0]?.recommendation || 'Diversify port risk.',
            },
            guardian_alert: usesDestinationRawMaterials
                ? `Zero-Tariff active — $${(fobValue * 0.19).toFixed(2)} saved. Monitor ${portOfLoading} delays.`
                : `Switch to ${destinationCountry}-origin raw materials to save 19% ($${(fobValue * 0.19).toFixed(2)}) immediately.`,
            live_news_summary: [],
            intelligence_metadata: {
                data_source: 'system_fallback',
                queries_run: liveIntel.raw_queries,
                total_sources_found: 0,
                avg_response_time_sec: 0,
                api_status: 'fallback',
                tavily_answer: null,
            },
        };
    }
}
