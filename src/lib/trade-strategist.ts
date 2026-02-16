/**
 * Lead-Time Guardian — Advanced Trade Strategist Engine
 * 
 * Provides Risk & Opportunity Reports with:
 * 1. Dynamic Tariff Engine (19% Reciprocal, 0% Zero-Tariff, Sector Multipliers)
 * 2. Port Congestion Simulation (15-20% lead-time buffer)
 * 3. Financial Impact Analysis & Alternative Routing
 */

// --- Types ---

export type IndustrySector = 'Garments' | 'Electronics' | 'Perishables' | 'Chemicals' | 'Automotive' | 'General';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface ShipmentInput {
    origin_country: string;
    destination_country: string;
    port_of_loading: string;
    port_of_discharge: string;
    sector: IndustrySector;
    fob_value_usd: number;
    uses_destination_raw_materials: boolean; // True = eligible for 0% tariff
    hs_code?: string;
    weight_kg?: number;
    shipment_mode: 'Sea' | 'Air' | 'Multimodal';
}

export interface TariffAnalysis {
    baseline_tariff_pct: number;
    applied_tariff_pct: number;
    zero_tariff_eligible: boolean;
    zero_tariff_reason: string;
    tariff_cost_usd: number;
    tariff_savings_usd: number;
    industry_multiplier: number;
    sector_sensitivity: string;
}

export interface PortRiskProfile {
    port_name: string;
    congestion_index: number;        // 0-100
    base_lead_time_days: number;
    buffer_pct: number;              // 15-20%
    adjusted_lead_time_days: number;
    risk_level: RiskLevel;
    is_critical_delay: boolean;
    zero_tariff_at_risk: boolean;    // True if delay risks losing 0% tariff window
}

export interface AlternativeRoute {
    port_name: string;
    country: string;
    lead_time_days: number;
    risk_score: number;
    savings_vs_primary: string;
    recommendation: string;
}

export interface FinancialImpact {
    total_cost_with_tariff_usd: number;
    total_cost_zero_tariff_usd: number;
    tariff_delta_usd: number;
    delay_penalty_usd: number;
    insurance_buffer_usd: number;
    total_risk_exposure_usd: number;
    net_opportunity_usd: number;
}

export interface RiskOpportunityReport {
    // Header
    report_id: string;
    generated_at: string;
    shipment_summary: string;

    // 1. Tariff Engine
    tariff_analysis: TariffAnalysis;

    // 2. Port & Lead-Time Risk
    primary_port_risk: PortRiskProfile;
    predicted_lead_time: string;     // e.g. "35-42 days"

    // 3. Financial Impact
    financial_impact: FinancialImpact;

    // 4. Alternative Routing
    alternative_routes: AlternativeRoute[];

    // 5. Strategic Advice
    strategic_advice: string[];
    priority_classification: 'Standard' | 'Elevated' | 'Critical Priority';

    // 6. Sector-specific warnings
    sector_warnings: string[];
}

// --- Constants ---

const BASELINE_RECIPROCAL_TARIFF = 0.19; // 19% for 2026

const SECTOR_CONFIG: Record<IndustrySector, { multiplier: number; sensitivity: string; base_lead_buffer: number }> = {
    Garments: { multiplier: 1.4, sensitivity: 'High', base_lead_buffer: 0.18 },
    Electronics: { multiplier: 1.2, sensitivity: 'Medium', base_lead_buffer: 0.15 },
    Perishables: { multiplier: 1.8, sensitivity: 'Critical', base_lead_buffer: 0.20 },
    Chemicals: { multiplier: 1.3, sensitivity: 'High', base_lead_buffer: 0.17 },
    Automotive: { multiplier: 1.1, sensitivity: 'Medium', base_lead_buffer: 0.15 },
    General: { multiplier: 1.0, sensitivity: 'Low', base_lead_buffer: 0.15 },
};

// Port congestion data (2026 simulated — would be live from You.com API when active)
const PORT_DATABASE: Record<string, { base_days: number; congestion: number; country: string }> = {
    'Chittagong': { base_days: 28, congestion: 68, country: 'Bangladesh' },
    'Chattogram': { base_days: 28, congestion: 68, country: 'Bangladesh' },
    'Mongla': { base_days: 32, congestion: 35, country: 'Bangladesh' },
    'Singapore': { base_days: 18, congestion: 45, country: 'Singapore' },
    'Shanghai': { base_days: 22, congestion: 72, country: 'China' },
    'Rotterdam': { base_days: 30, congestion: 40, country: 'Netherlands' },
    'Hamburg': { base_days: 32, congestion: 55, country: 'Germany' },
    'Los Angeles': { base_days: 35, congestion: 62, country: 'USA' },
    'Long Beach': { base_days: 35, congestion: 58, country: 'USA' },
    'New York': { base_days: 38, congestion: 50, country: 'USA' },
    'Savannah': { base_days: 36, congestion: 42, country: 'USA' },
    'Colombo': { base_days: 20, congestion: 38, country: 'Sri Lanka' },
    'Nhava Sheva': { base_days: 24, congestion: 60, country: 'India' },
    'Felixstowe': { base_days: 32, congestion: 48, country: 'UK' },
    'Antwerp': { base_days: 30, congestion: 44, country: 'Belgium' },
    'Dubai': { base_days: 15, congestion: 30, country: 'UAE' },
    'Busan': { base_days: 20, congestion: 35, country: 'South Korea' },
};

// Alternative routing suggestions
const ALTERNATIVE_PORTS: Record<string, AlternativeRoute[]> = {
    'Chittagong': [
        { port_name: 'Mongla', country: 'Bangladesh', lead_time_days: 32, risk_score: 3, savings_vs_primary: '~12% lower congestion', recommendation: 'Use for non-urgent RMG shipments to diversify port risk.' },
        { port_name: 'Colombo', country: 'Sri Lanka', lead_time_days: 22, risk_score: 4, savings_vs_primary: 'Transshipment hub — faster to EU', recommendation: 'Route via Colombo for EU-bound cargo to cut 6-8 days.' },
    ],
    'Chattogram': [
        { port_name: 'Mongla', country: 'Bangladesh', lead_time_days: 32, risk_score: 3, savings_vs_primary: '~12% lower congestion', recommendation: 'Use for non-urgent RMG shipments to diversify port risk.' },
        { port_name: 'Colombo', country: 'Sri Lanka', lead_time_days: 22, risk_score: 4, savings_vs_primary: 'Transshipment hub — faster to EU', recommendation: 'Route via Colombo for EU-bound cargo to cut 6-8 days.' },
    ],
    'Shanghai': [
        { port_name: 'Busan', country: 'South Korea', lead_time_days: 20, risk_score: 3, savings_vs_primary: '~40% lower congestion', recommendation: 'Transship through Busan to avoid Shanghai delays.' },
        { port_name: 'Singapore', country: 'Singapore', lead_time_days: 18, risk_score: 4, savings_vs_primary: 'Major global hub — reliable schedules', recommendation: 'Southern route via Singapore for time-sensitive cargo.' },
    ],
    'Los Angeles': [
        { port_name: 'Savannah', country: 'USA', lead_time_days: 36, risk_score: 4, savings_vs_primary: '~30% lower congestion', recommendation: 'East Coast alternative avoids West Coast congestion.' },
        { port_name: 'Long Beach', country: 'USA', lead_time_days: 35, risk_score: 5, savings_vs_primary: 'Adjacent port — slightly lower wait', recommendation: 'Switch berth to Long Beach if LA queue exceeds 5 days.' },
    ],
};

// --- Core Functions ---

function generateReportId(): string {
    return `GR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function calculateTariff(input: ShipmentInput): TariffAnalysis {
    const sectorConfig = SECTOR_CONFIG[input.sector] || SECTOR_CONFIG.General;

    let appliedTariff = BASELINE_RECIPROCAL_TARIFF;
    let zeroTariffReason = 'Not eligible — no destination-origin raw materials declared.';

    if (input.uses_destination_raw_materials) {
        appliedTariff = 0;
        zeroTariffReason = `Zero-tariff applied: Shipment uses raw materials originating from ${input.destination_country} (e.g., US-origin cotton). Reciprocal tariff waived under 2026 trade provisions.`;
    }

    const tariffCost = Number((input.fob_value_usd * appliedTariff).toFixed(2));
    const tariffSavings = Number((input.fob_value_usd * BASELINE_RECIPROCAL_TARIFF - tariffCost).toFixed(2));

    return {
        baseline_tariff_pct: BASELINE_RECIPROCAL_TARIFF * 100,
        applied_tariff_pct: appliedTariff * 100,
        zero_tariff_eligible: input.uses_destination_raw_materials,
        zero_tariff_reason: zeroTariffReason,
        tariff_cost_usd: tariffCost,
        tariff_savings_usd: tariffSavings,
        industry_multiplier: sectorConfig.multiplier,
        sector_sensitivity: sectorConfig.sensitivity,
    };
}

function assessPortRisk(portName: string, sector: IndustrySector, isZeroTariffEligible: boolean): PortRiskProfile {
    const normalizedPort = Object.keys(PORT_DATABASE).find(
        k => k.toLowerCase() === portName.toLowerCase()
    ) || portName;

    const portData = PORT_DATABASE[normalizedPort] || { base_days: 30, congestion: 50, country: 'Unknown' };
    const sectorConfig = SECTOR_CONFIG[sector] || SECTOR_CONFIG.General;

    const bufferPct = sectorConfig.base_lead_buffer;
    const adjustedDays = Math.ceil(portData.base_days * (1 + bufferPct));

    let riskLevel: RiskLevel = 'Low';
    if (portData.congestion > 70) riskLevel = 'Critical';
    else if (portData.congestion > 55) riskLevel = 'High';
    else if (portData.congestion > 40) riskLevel = 'Moderate';

    const isCriticalDelay = portData.congestion > 60;
    // Zero-tariff at risk if delay could push past compliance window (simulated: 45 days)
    const zeroTariffAtRisk = isZeroTariffEligible && adjustedDays > 42;

    return {
        port_name: normalizedPort,
        congestion_index: portData.congestion,
        base_lead_time_days: portData.base_days,
        buffer_pct: Math.round(bufferPct * 100),
        adjusted_lead_time_days: adjustedDays,
        risk_level: riskLevel,
        is_critical_delay: isCriticalDelay,
        zero_tariff_at_risk: zeroTariffAtRisk,
    };
}

function calculateFinancialImpact(input: ShipmentInput, tariff: TariffAnalysis, portRisk: PortRiskProfile): FinancialImpact {
    const sectorConfig = SECTOR_CONFIG[input.sector] || SECTOR_CONFIG.General;

    const totalWithTariff = Number((input.fob_value_usd * (1 + BASELINE_RECIPROCAL_TARIFF)).toFixed(2));
    const totalZeroTariff = input.fob_value_usd; // No tariff added
    const tariffDelta = Number((totalWithTariff - totalZeroTariff).toFixed(2));

    // Delay penalty: 0.5% per day of delay beyond base time, scaled by sector
    const delayDays = portRisk.adjusted_lead_time_days - portRisk.base_lead_time_days;
    const delayPenalty = Number((input.fob_value_usd * 0.005 * delayDays * sectorConfig.multiplier).toFixed(2));

    // Insurance buffer: 2% of FOB for high-risk ports
    const insuranceBuffer = portRisk.risk_level === 'Critical' || portRisk.risk_level === 'High'
        ? Number((input.fob_value_usd * 0.02).toFixed(2))
        : Number((input.fob_value_usd * 0.01).toFixed(2));

    const totalRiskExposure = Number((tariff.tariff_cost_usd + delayPenalty + insuranceBuffer).toFixed(2));
    const netOpportunity = Number((tariff.tariff_savings_usd - delayPenalty - insuranceBuffer).toFixed(2));

    return {
        total_cost_with_tariff_usd: totalWithTariff,
        total_cost_zero_tariff_usd: totalZeroTariff,
        tariff_delta_usd: tariffDelta,
        delay_penalty_usd: delayPenalty,
        insurance_buffer_usd: insuranceBuffer,
        total_risk_exposure_usd: totalRiskExposure,
        net_opportunity_usd: netOpportunity,
    };
}

function generateStrategicAdvice(
    input: ShipmentInput,
    tariff: TariffAnalysis,
    portRisk: PortRiskProfile,
    financial: FinancialImpact
): string[] {
    const advice: string[] = [];

    // Tariff advice
    if (tariff.zero_tariff_eligible) {
        advice.push(`✅ ZERO-TARIFF ACTIVE: Saving $${tariff.tariff_savings_usd.toLocaleString()} on this shipment by using ${input.destination_country}-origin raw materials.`);
    } else {
        advice.push(`📊 TARIFF IMPACT: $${tariff.tariff_cost_usd.toLocaleString()} in duties at ${tariff.baseline_tariff_pct}% reciprocal rate. Consider sourcing raw materials from ${input.destination_country} to qualify for 0% tariff.`);
    }

    // Port congestion advice
    if (portRisk.risk_level === 'Critical') {
        advice.push(`🚨 PORT CRITICAL: ${portRisk.port_name} congestion at ${portRisk.congestion_index}%. Recommend switching to alternative port immediately.`);
    } else if (portRisk.risk_level === 'High') {
        advice.push(`⚠️ PORT HIGH RISK: ${portRisk.port_name} congestion at ${portRisk.congestion_index}%. Monitor daily and prepare alternative routing.`);
    }

    // Zero-tariff risk
    if (portRisk.zero_tariff_at_risk) {
        advice.push(`🚨 CRITICAL PRIORITY: Delay at ${portRisk.port_name} (${portRisk.adjusted_lead_time_days} days) risks losing Zero-Tariff eligibility! Potential loss: $${tariff.tariff_savings_usd.toLocaleString()}. Ship immediately or switch ports.`);
    }

    // Sector-specific
    if (input.sector === 'Perishables') {
        advice.push(`🧊 PERISHABLE ALERT: ${input.sector} sector requires cold-chain integrity. Add 20% lead-time buffer and confirm reefer container availability at ${portRisk.port_name}.`);
    } else if (input.sector === 'Garments') {
        advice.push(`👕 RMG SECTOR: High sensitivity to delivery windows. Seasonal demand peaks (Q3-Q4) increase congestion risk. Pre-book vessel slots 30 days in advance.`);
    }

    // Financial summary
    if (financial.net_opportunity_usd > 0) {
        advice.push(`💰 NET OPPORTUNITY: $${financial.net_opportunity_usd.toLocaleString()} potential savings after accounting for delays and insurance.`);
    } else {
        advice.push(`⚠️ NET RISK: $${Math.abs(financial.net_opportunity_usd).toLocaleString()} potential loss. Delay costs exceed tariff savings. Expedite shipment or reroute.`);
    }

    // Alternative routing
    if (portRisk.congestion_index > 55) {
        advice.push(`🔄 ALTERNATIVE ROUTING RECOMMENDED: Primary port has ${portRisk.congestion_index}% congestion. See alternative routes below for lower-risk options.`);
    }

    return advice;
}

function getSectorWarnings(sector: IndustrySector, portRisk: PortRiskProfile): string[] {
    const warnings: string[] = [];

    if (sector === 'Perishables' && portRisk.adjusted_lead_time_days > 25) {
        warnings.push('⏰ SHELF-LIFE RISK: Total transit exceeds 25 days — verify product expiry tolerance.');
        warnings.push('🌡️ COLD CHAIN: Ensure reefer monitoring is active for entire transit duration.');
    }

    if (sector === 'Garments' && portRisk.congestion_index > 60) {
        warnings.push('📦 DELIVERY WINDOW: High congestion may cause missed buyer delivery windows. Negotiate buffer clauses in LC terms.');
    }

    if (sector === 'Chemicals' && portRisk.risk_level !== 'Low') {
        warnings.push('☢️ HAZMAT COMPLIANCE: Chemical shipments require additional clearance time at congested ports. Add 3-5 extra days.');
    }

    if (sector === 'Electronics') {
        warnings.push('🔌 HIGH-VALUE CARGO: Consider split shipments to reduce single-point financial exposure.');
    }

    if (portRisk.zero_tariff_at_risk) {
        warnings.push('🚨 TARIFF DEADLINE: Zero-tariff eligibility expires if shipment arrives after compliance window. This is a CRITICAL PRIORITY shipment.');
    }

    return warnings;
}

// --- Main Export ---

export function generateRiskOpportunityReport(input: ShipmentInput): RiskOpportunityReport {
    // 1. Tariff Analysis
    const tariff = calculateTariff(input);

    // 2. Port Risk Assessment
    const portRisk = assessPortRisk(input.port_of_loading, input.sector, tariff.zero_tariff_eligible);

    // 3. Financial Impact
    const financial = calculateFinancialImpact(input, tariff, portRisk);

    // 4. Strategic Advice
    const advice = generateStrategicAdvice(input, tariff, portRisk, financial);

    // 5. Alternative Routes
    const normalizedPort = Object.keys(ALTERNATIVE_PORTS).find(
        k => k.toLowerCase() === input.port_of_loading.toLowerCase()
    ) || input.port_of_loading;
    const alternatives = ALTERNATIVE_PORTS[normalizedPort] || [
        {
            port_name: 'Singapore',
            country: 'Singapore',
            lead_time_days: 18,
            risk_score: 4,
            savings_vs_primary: 'Major transshipment hub',
            recommendation: 'Consider routing via Singapore for reliable scheduling.',
        }
    ];

    // 6. Sector Warnings
    const sectorWarnings = getSectorWarnings(input.sector, portRisk);

    // 7. Priority Classification
    let priority: 'Standard' | 'Elevated' | 'Critical Priority' = 'Standard';
    if (portRisk.zero_tariff_at_risk || portRisk.risk_level === 'Critical') {
        priority = 'Critical Priority';
    } else if (portRisk.risk_level === 'High' || input.sector === 'Perishables') {
        priority = 'Elevated';
    }

    // 8. Lead Time Range
    const minDays = portRisk.base_lead_time_days;
    const maxDays = portRisk.adjusted_lead_time_days;
    const predictedLeadTime = `${minDays}-${maxDays} days`;

    return {
        report_id: generateReportId(),
        generated_at: new Date().toISOString(),
        shipment_summary: `${input.origin_country} → ${input.destination_country} | ${input.sector} | FOB $${input.fob_value_usd.toLocaleString()} | via ${input.port_of_loading} (${input.shipment_mode})`,

        tariff_analysis: tariff,
        primary_port_risk: portRisk,
        predicted_lead_time: predictedLeadTime,
        financial_impact: financial,
        alternative_routes: alternatives,
        strategic_advice: advice,
        priority_classification: priority,
        sector_warnings: sectorWarnings,
    };
}
