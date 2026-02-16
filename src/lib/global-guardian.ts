/**
 * Global Guardian Report Generator — v3: Global Multi-Sector Engine
 * 
 * Architecture:
 * 1. PRIMARY: Tavily Search API → live trade intelligence for ANY route
 * 2. FALLBACK: Global Trade Strategist → 60+ bilateral tariffs, 40+ ports, 10+ sectors
 * 3. SYNTHESIS: Gemini → merges live data + fallback into actionable report
 */

import { gatherLiveTradeIntelligence, LiveTradeIntelligence, TavilyResult } from './tavily-search';
import { generateRiskOpportunityReport, IndustrySector, RiskOpportunityReport } from './trade-strategist';
import { getOpenRouter } from './openrouter';

// --- Types ---
export interface GlobalGuardianReport {
    report_id: string;
    generated_at: string;
    analysis_status: 'Live API Insights' | 'System Fallback Logic' | 'Hybrid (Live + Fallback)';

    route_risk_score: number;
    route_risk_label: string;

    trade_policy: {
        current_tariff_rate: string;
        preferential_conditions: string;
        trade_agreements: string[];
        source: string;
    };

    tariff_optimization: {
        current_rate: string;
        zero_tariff_eligible: boolean;
        zero_tariff_reason: string;
        potential_savings_usd: number;
        recommendation: string;
    };

    supply_chain_disruptions: {
        logistics_alerts: string[];
        geopolitical_alerts: string[];
        environmental_alerts: string[];
        port_status: string;
    };

    predicted_delay: {
        base_days: number;
        buffer_days: number;
        total_range: string;
        risk_buffer_reason: string;
    };

    financial_impact: {
        fob_value_usd: number;
        standard_cost_usd: number;
        optimized_cost_usd: number;
        delay_penalty_usd: number;
        total_risk_exposure_usd: number;
        net_opportunity: string;
    };

    alternative_logistics: {
        recommended_port: string;
        recommended_route: string;
        reason: string;
    };

    guardian_alert: string;
    live_news_summary: string[];

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
 * Build context from Tavily results for Gemini
 */
function buildTavilyContext(intel: LiveTradeIntelligence): string {
    let context = '';

    if (intel.tariff_data.length > 0) {
        context += '\n## LIVE TARIFF DATA (Tavily — February 2026):\n';
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
        context += '\n## TRADE AGREEMENTS & PREFERENTIAL DEALS:\n';
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

function genId(): string {
    return `GG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

/**
 * Infer the best port of discharge based on destination country
 */
function inferDischargePort(destination: string): string {
    const d = destination.toLowerCase().trim();
    const portMap: Record<string, string> = {
        'usa': 'Los Angeles', 'us': 'Los Angeles', 'united states': 'Los Angeles',
        'germany': 'Hamburg', 'netherlands': 'Rotterdam', 'belgium': 'Antwerp',
        'uk': 'Felixstowe', 'united kingdom': 'Felixstowe',
        'france': 'Le Havre', 'spain': 'Barcelona', 'italy': 'Genoa',
        'greece': 'Piraeus', 'turkey': 'Istanbul',
        'japan': 'Yokohama', 'south korea': 'Busan', 'china': 'Shanghai',
        'singapore': 'Singapore', 'malaysia': 'Port Klang',
        'vietnam': 'Ho Chi Minh', 'india': 'Mumbai',
        'uae': 'Dubai', 'saudi arabia': 'Jeddah',
        'australia': 'Melbourne', 'new zealand': 'Auckland',
        'brazil': 'Santos', 'mexico': 'Manzanillo',
        'canada': 'Vancouver', 'south africa': 'Durban',
        'kenya': 'Mombasa', 'nigeria': 'Lagos',
        'bangladesh': 'Chittagong', 'sri lanka': 'Colombo',
        'eu': 'Rotterdam', 'european union': 'Rotterdam',
    };
    for (const [key, port] of Object.entries(portMap)) {
        if (d.includes(key)) return port;
    }
    return 'Rotterdam'; // Default international hub
}

/**
 * Infer sector from string
 */
function inferSector(sector: string): IndustrySector {
    const validSectors: IndustrySector[] = [
        'Garments', 'Electronics', 'Perishables', 'Chemicals',
        'Automotive', 'Pharmaceuticals', 'Machinery', 'Raw Materials',
        'Agriculture', 'Textiles', 'General'
    ];
    const match = validSectors.find(s => s.toLowerCase() === sector.toLowerCase());
    return match || 'General';
}

/**
 * Main: Generate Global Guardian Report
 * Works for ANY origin → destination pair, ANY sector
 */
export async function generateGlobalGuardianReport(
    originCountry: string,
    destinationCountry: string,
    sector: string,
    fobValue: number,
    portOfLoading: string = 'Chittagong',
    usesDestinationRawMaterials: boolean = false
): Promise<GlobalGuardianReport> {

    // ===== STEP 1: Tavily Live Search =====
    console.log(`[Guardian] Step 1: Tavily live search for ${originCountry} → ${destinationCountry} (${sector})`);
    const liveIntel = await gatherLiveTradeIntelligence(originCountry, destinationCountry, sector, portOfLoading);
    const hasLiveData = liveIntel.api_status === 'live' || liveIntel.api_status === 'partial';
    const tavilyContext = buildTavilyContext(liveIntel);

    // ===== STEP 2: Global Trade Strategist Fallback =====
    console.log(`[Guardian] Step 2: Global Trade Strategist for ${originCountry} → ${destinationCountry}...`);
    const inferredSector = inferSector(sector);
    const dischargePort = inferDischargePort(destinationCountry);

    const fallbackReport = generateRiskOpportunityReport({
        origin_country: originCountry,
        destination_country: destinationCountry,
        port_of_loading: portOfLoading,
        port_of_discharge: dischargePort,
        sector: inferredSector,
        fob_value_usd: fobValue,
        uses_destination_raw_materials: usesDestinationRawMaterials,
        shipment_mode: 'Sea',
    });

    const baselineRate = fallbackReport.tariff_analysis.baseline_tariff_pct;
    const appliedRate = fallbackReport.tariff_analysis.applied_tariff_pct;
    const standardCost = fallbackReport.financial_impact.standard_cost_usd;
    const optimizedCost = fallbackReport.financial_impact.optimized_cost_usd;

    // ===== STEP 3: Gemini Synthesis =====
    console.log(`[Guardian] Step 3: Gemini synthesis (live=${hasLiveData})...`);

    const analysisStatus = hasLiveData
        ? (liveIntel.api_status === 'partial' ? 'Hybrid (Live + Fallback)' : 'Live API Insights')
        : 'System Fallback Logic';

    const synthesisPrompt = `
You are the **Lead-Time Guardian** — a Global Multi-Sector Trade Intelligence Engine.
Date: February 2026.

# ANALYSIS STATUS: ${analysisStatus}

# ROUTE: ${originCountry} → ${destinationCountry}
# SECTOR: ${sector} (${inferredSector})
# FOB VALUE: $${fobValue.toLocaleString()}
# PORT OF LOADING: ${portOfLoading}
# PORT OF DISCHARGE: ${dischargePort}
# USES DESTINATION RAW MATERIALS: ${usesDestinationRawMaterials ? 'YES (eligible for preferential/zero tariff)' : 'NO'}

# LIVE SEARCH RESULTS FROM TAVILY API:
${tavilyContext}

# GLOBAL TRADE STRATEGIST FALLBACK DATA:
- Baseline Tariff: ${baselineRate}% (${fallbackReport.tariff_analysis.tariff_source})
- Applied Tariff: ${appliedRate}%
- Trade Agreements: ${fallbackReport.tariff_analysis.trade_agreements.join(', ') || 'None found'}
- Standard Cost: $${standardCost.toLocaleString()}
- Optimized Cost: $${optimizedCost.toLocaleString()}
- Lead Time: ${fallbackReport.predicted_lead_time}
- Port Congestion: ${fallbackReport.primary_port_risk.congestion_index}%
- Priority: ${fallbackReport.priority_classification}
- Alternative Ports: ${fallbackReport.alternative_routes.map(r => r.port_name).join(', ') || 'None'}

# YOUR TASK:
Synthesize the live search results with the fallback data. Produce a JSON report.
IMPORTANT: This is a GLOBAL engine. Do NOT assume any specific country. Use the actual countries provided.
If live data has more accurate tariff rates, USE THEM over the fallback.

{
  "route_risk_score": <1-10>,
  "route_risk_label": "<Low Risk | Moderate Risk | High Risk | Critical Risk>",
  "trade_policy": {
    "current_tariff_rate": "<exact rate from live data or fallback: ${appliedRate}%>",
    "preferential_conditions": "<any GSP/FTA/bilateral/regional deals found>",
    "trade_agreements": ["<list of applicable agreements>"]
  },
  "tariff_optimization": {
    "current_rate": "<the actual applied rate>",
    "zero_tariff_eligible": ${usesDestinationRawMaterials || appliedRate === 0},
    "zero_tariff_reason": "<explanation — could be FTA, raw materials, or not eligible>",
    "potential_savings_usd": <number>,
    "recommendation": "<ONE actionable sentence — e.g. 'Reroute through Port X' or 'Source materials from Country Y to save Z%'>"
  },
  "supply_chain_disruptions": {
    "logistics_alerts": ["<from live search or fallback>"],
    "geopolitical_alerts": ["<from live search>"],
    "environmental_alerts": ["<from live search>"],
    "port_status": "<status of ${portOfLoading}>"
  },
  "predicted_delay": {
    "base_days": <number>,
    "buffer_days": <number based on sector risk and port congestion>,
    "total_range": "<e.g. 28-35 days>",
    "risk_buffer_reason": "<why this buffer>"
  },
  "financial_impact": {
    "fob_value_usd": ${fobValue},
    "standard_cost_usd": ${standardCost},
    "optimized_cost_usd": ${optimizedCost},
    "delay_penalty_usd": <estimated from port/sector data>,
    "total_risk_exposure_usd": <sum of all costs>,
    "net_opportunity": "<savings vs costs summary>"
  },
  "alternative_logistics": {
    "recommended_port": "<safer or more efficient port>",
    "recommended_route": "<alternative route description>",
    "reason": "<why this is better>"
  },
  "guardian_alert": "<ONE sentence, specific, actionable advice — mention exact country names, port names, or dollar amounts>",
  "live_news_summary": ["<top 3-5 headlines with trade impact>"]
}

RULES:
- Use ACTUAL tariff rates from live data or fallback. Never default to 19%.
- guardian_alert must be ONE SENTENCE with specific numbers and actions.
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

        const report: GlobalGuardianReport = {
            report_id: genId(),
            generated_at: new Date().toISOString(),
            analysis_status: analysisStatus as GlobalGuardianReport['analysis_status'],

            route_risk_score: analysis.route_risk_score || (fallbackReport.primary_port_risk.congestion_index > 60 ? 7 : 5),
            route_risk_label: analysis.route_risk_label || fallbackReport.primary_port_risk.risk_level + ' Risk',

            trade_policy: {
                current_tariff_rate: analysis.trade_policy?.current_tariff_rate || `${appliedRate}%`,
                preferential_conditions: analysis.trade_policy?.preferential_conditions || fallbackReport.tariff_analysis.zero_tariff_reason,
                trade_agreements: analysis.trade_policy?.trade_agreements || fallbackReport.tariff_analysis.trade_agreements,
                source: hasLiveData ? 'Tavily Live Search' : fallbackReport.tariff_analysis.tariff_source,
            },

            tariff_optimization: {
                current_rate: analysis.tariff_optimization?.current_rate || `${appliedRate}%`,
                zero_tariff_eligible: usesDestinationRawMaterials || appliedRate === 0,
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
                buffer_days: analysis.predicted_delay?.buffer_days || fallbackReport.primary_port_risk.congestion_buffer_days + fallbackReport.primary_port_risk.weather_buffer_days,
                total_range: analysis.predicted_delay?.total_range || fallbackReport.predicted_lead_time,
                risk_buffer_reason: analysis.predicted_delay?.risk_buffer_reason || `Buffer for ${sector} sector risk and ${portOfLoading} congestion.`,
            },

            financial_impact: {
                fob_value_usd: fobValue,
                standard_cost_usd: standardCost,
                optimized_cost_usd: optimizedCost,
                delay_penalty_usd: analysis.financial_impact?.delay_penalty_usd || fallbackReport.financial_impact.delay_penalty_usd,
                total_risk_exposure_usd: analysis.financial_impact?.total_risk_exposure_usd || fallbackReport.financial_impact.total_risk_exposure_usd,
                net_opportunity: analysis.financial_impact?.net_opportunity || `$${fallbackReport.financial_impact.net_opportunity_usd.toLocaleString()} potential savings`,
            },

            alternative_logistics: analysis.alternative_logistics || {
                recommended_port: fallbackReport.alternative_routes[0]?.port_name || dischargePort,
                recommended_route: `Via ${fallbackReport.alternative_routes[0]?.port_name || 'alternative port'}`,
                reason: fallbackReport.alternative_routes[0]?.recommendation || 'Consider for risk diversification.',
            },

            guardian_alert: analysis.guardian_alert || (
                usesDestinationRawMaterials
                    ? `Zero-tariff active — saving $${(fobValue * (baselineRate / 100)).toFixed(2)} on ${originCountry} → ${destinationCountry}. Monitor ${portOfLoading} for delays.`
                    : `Source raw materials from ${destinationCountry} to reduce ${baselineRate}% tariff to 0% — potential saving: $${(fobValue * (baselineRate / 100)).toFixed(2)}.`
            ),

            live_news_summary: analysis.live_news_summary || [],

            intelligence_metadata: {
                data_source: hasLiveData ? (liveIntel.api_status === 'partial' ? 'hybrid' : 'tavily_live') : 'system_fallback',
                queries_run: liveIntel.raw_queries,
                total_sources_found: liveIntel.tariff_data.length + liveIntel.port_disruptions.length +
                    liveIntel.trade_agreements.length + liveIntel.news_headlines.length,
                avg_response_time_sec: liveIntel.response_times.length > 0
                    ? Number((liveIntel.response_times.reduce((a, b) => a + b, 0) / liveIntel.response_times.length).toFixed(2))
                    : 0,
                api_status: liveIntel.api_status,
                tavily_answer: null,
            },
        };

        console.log(`[Guardian] ✅ Report complete. Status: ${report.analysis_status} | Risk: ${report.route_risk_score}/10 | Tariff: ${appliedRate}%`);
        return report;

    } catch (error) {
        console.error('[Guardian] Gemini synthesis failed, returning fallback-only report:', error);

        // Pure fallback report
        return {
            report_id: genId(),
            generated_at: new Date().toISOString(),
            analysis_status: 'System Fallback Logic',
            route_risk_score: fallbackReport.primary_port_risk.congestion_index > 60 ? 7 : 5,
            route_risk_label: fallbackReport.primary_port_risk.risk_level + ' Risk',
            trade_policy: {
                current_tariff_rate: `${appliedRate}%`,
                preferential_conditions: fallbackReport.tariff_analysis.zero_tariff_reason,
                trade_agreements: fallbackReport.tariff_analysis.trade_agreements,
                source: fallbackReport.tariff_analysis.tariff_source,
            },
            tariff_optimization: {
                current_rate: `${appliedRate}%`,
                zero_tariff_eligible: usesDestinationRawMaterials || appliedRate === 0,
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
                buffer_days: fallbackReport.primary_port_risk.congestion_buffer_days + fallbackReport.primary_port_risk.weather_buffer_days,
                total_range: fallbackReport.predicted_lead_time,
                risk_buffer_reason: `Buffer for ${sector} sector risk and ${portOfLoading} congestion.`,
            },
            financial_impact: {
                fob_value_usd: fobValue,
                standard_cost_usd: standardCost,
                optimized_cost_usd: optimizedCost,
                delay_penalty_usd: fallbackReport.financial_impact.delay_penalty_usd,
                total_risk_exposure_usd: fallbackReport.financial_impact.total_risk_exposure_usd,
                net_opportunity: `$${fallbackReport.financial_impact.net_opportunity_usd.toLocaleString()} potential savings`,
            },
            alternative_logistics: {
                recommended_port: fallbackReport.alternative_routes[0]?.port_name || dischargePort,
                recommended_route: `Via ${fallbackReport.alternative_routes[0]?.port_name || 'alternative port'}`,
                reason: fallbackReport.alternative_routes[0]?.recommendation || 'Consider for risk diversification.',
            },
            guardian_alert: usesDestinationRawMaterials
                ? `Zero-tariff active — saving $${(fobValue * (baselineRate / 100)).toFixed(2)} on ${originCountry} → ${destinationCountry}.`
                : `Source raw materials from ${destinationCountry} to reduce ${baselineRate}% tariff — potential saving: $${(fobValue * (baselineRate / 100)).toFixed(2)}.`,
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
